import os
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, Query, status
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role_admin
from app.models.models import Transaksi, Kategori, User
from app.services.storage_service import upload_file, delete_file
from app.services.transaksi_service import apply_transaksi_effect, reverse_transaksi_effect
from app.schemas.schemas import TransaksiResponse

router = APIRouter()

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"]
MAX_FILE_SIZE = 5 * 1024 * 1024


async def validate_and_upload_bukti(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Format file harus JPG, PNG, atau PDF",
                "field": "bukti",
            },
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Ukuran file maksimal 5MB",
                "field": "bukti",
            },
        )

    url = await upload_file(contents, file.filename or "bukti.jpg", file.content_type)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Gagal mengupload bukti transaksi",
            },
        )
    return url


def transaksi_to_response(t: Transaksi, db: Session) -> dict:
    kategori = db.query(Kategori).filter(Kategori.id == t.kategori_id).first()
    creator = db.query(User).filter(User.id == t.created_by).first()
    return {
        "id": t.id,
        "tanggal": t.tanggal.isoformat(),
        "tipe": t.tipe,
        "nominal": t.nominal,
        "kategori": {"id": str(t.kategori_id), "nama": kategori.nama if kategori else ""},
        "metode": t.metode,
        "deskripsi": t.deskripsi,
        "bukti_url": t.bukti_path,
        "created_by": {"id": str(t.created_by), "full_name": creator.full_name if creator else ""},
        "created_at": t.created_at.isoformat(),
        "status": "selesai",
    }


@router.get("/api/transaksi")
def get_transaksi(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tanggal_mulai: Optional[str] = None,
    tanggal_akhir: Optional[str] = None,
    kategori_id: Optional[str] = None,
    tipe: Optional[str] = None,
    metode: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaksi).filter(Transaksi.deleted_at.is_(None))

    if tanggal_mulai:
        query = query.filter(Transaksi.tanggal >= tanggal_mulai)
    if tanggal_akhir:
        query = query.filter(Transaksi.tanggal <= tanggal_akhir)
    if kategori_id:
        query = query.filter(Transaksi.kategori_id == kategori_id)
    if tipe:
        query = query.filter(Transaksi.tipe == tipe)
    if metode:
        query = query.filter(Transaksi.metode == metode)
    if q:
        query = query.filter(Transaksi.deskripsi.ilike(f"%{q}%"))

    total_items = query.count()
    total_pages = max(1, (total_items + page_size - 1) // page_size)

    items = query.order_by(Transaksi.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    total_pemasukan = db.query(func.coalesce(func.sum(Transaksi.nominal), 0)).filter(
        Transaksi.deleted_at.is_(None),
        Transaksi.tipe == "pemasukan",
    ).scalar()

    total_pengeluaran = db.query(func.coalesce(func.sum(Transaksi.nominal), 0)).filter(
        Transaksi.deleted_at.is_(None),
        Transaksi.tipe == "pengeluaran",
    ).scalar()

    total_kas = db.query(func.coalesce(func.sum(Kategori.saldo), 0)).filter(
        Kategori.is_active == True
    ).scalar()

    return {
        "data": {
            "items": [transaksi_to_response(t, db) for t in items],
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "summary": {
                "total_kas": total_kas or 0,
                "total_pemasukan": total_pemasukan or 0,
                "total_pengeluaran": total_pengeluaran or 0,
            },
        }
    }


@router.post("/api/transaksi", status_code=201)
async def create_transaksi(
    tanggal: str = Form(...),
    tipe: str = Form(...),
    nominal: int = Form(...),
    kategori_id: str = Form(...),
    metode: str = Form(...),
    deskripsi: Optional[str] = Form(None),
    bukti: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    kategori = db.query(Kategori).filter(Kategori.id == kategori_id).first()
    if not kategori:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Kategori tidak ditemukan",
                "field": "kategori_id",
            },
        )

    if nominal <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Nominal harus lebih besar dari 0",
                "field": "nominal",
            },
        )

    bukti_url = await validate_and_upload_bukti(bukti)

    transaksi = Transaksi(
        tanggal=tanggal,
        tipe=tipe,
        nominal=nominal,
        kategori_id=kategori_id,
        metode=metode,
        deskripsi=deskripsi,
        bukti_path=bukti_url,
        created_by=current_user.id,
    )

    db.add(transaksi)
    db.flush()

    apply_transaksi_effect(db, transaksi)

    db.commit()
    db.refresh(transaksi)

    return {"data": transaksi_to_response(transaksi, db)}


@router.get("/api/transaksi/{transaksi_id}")
def get_transaksi_detail(
    transaksi_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaksi = db.query(Transaksi).filter(
        Transaksi.id == transaksi_id,
        Transaksi.deleted_at.is_(None),
    ).first()

    if not transaksi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Transaksi tidak ditemukan"},
        )

    return {"data": transaksi_to_response(transaksi, db)}


@router.put("/api/transaksi/{transaksi_id}")
async def update_transaksi(
    transaksi_id: UUID,
    tanggal: str = Form(...),
    tipe: str = Form(...),
    nominal: int = Form(...),
    kategori_id: str = Form(...),
    metode: str = Form(...),
    deskripsi: Optional[str] = Form(None),
    bukti: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    transaksi = db.query(Transaksi).filter(
        Transaksi.id == transaksi_id,
        Transaksi.deleted_at.is_(None),
    ).first()

    if not transaksi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Transaksi tidak ditemukan"},
        )

    reverse_transaksi_effect(db, transaksi)

    kategori_baru = db.query(Kategori).filter(Kategori.id == kategori_id).first()
    if not kategori_baru:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Kategori tidak ditemukan",
                "field": "kategori_id",
            },
        )

    if nominal <= 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Nominal harus lebih besar dari 0",
                "field": "nominal",
            },
        )

    bukti_url = transaksi.bukti_path
    if bukti:
        await delete_file(transaksi.bukti_path)
        bukti_url = await validate_and_upload_bukti(bukti)

    transaksi.tanggal = tanggal
    transaksi.tipe = tipe
    transaksi.nominal = nominal
    transaksi.kategori_id = kategori_id
    transaksi.metode = metode
    transaksi.deskripsi = deskripsi
    transaksi.bukti_path = bukti_url
    transaksi.updated_at = datetime.now(timezone.utc)

    apply_transaksi_effect(db, transaksi)
    db.commit()
    db.refresh(transaksi)

    return {"data": transaksi_to_response(transaksi, db)}


@router.delete("/api/transaksi/{transaksi_id}")
def delete_transaksi(
    transaksi_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    transaksi = db.query(Transaksi).filter(
        Transaksi.id == transaksi_id,
        Transaksi.deleted_at.is_(None),
    ).first()

    if not transaksi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Transaksi tidak ditemukan"},
        )

    reverse_transaksi_effect(db, transaksi)

    transaksi.deleted_at = datetime.now(timezone.utc)
    db.commit()

    return {"data": {"success": True, "id": str(transaksi_id)}}

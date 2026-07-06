from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role_admin
from app.models.models import Pengumuman, User
from app.schemas.schemas import PengumumanCreate, PengumumanUpdate, PengumumanResponse

router = APIRouter()


@router.get("/api/pengumuman")
def get_pengumuman(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "admin":
        items = db.query(Pengumuman).order_by(Pengumuman.created_at.desc()).all()
    else:
        items = db.query(Pengumuman).filter(
            Pengumuman.aktif == True
        ).order_by(Pengumuman.created_at.desc()).all()

    return {
        "data": [
            {
                "id": str(p.id),
                "judul": p.judul,
                "isi": p.isi,
                "aktif": p.aktif,
                "created_at": p.created_at.isoformat(),
            }
            for p in items
        ]
    }


@router.post("/api/pengumuman", status_code=201)
def create_pengumuman(
    body: PengumumanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    pengumuman = Pengumuman(judul=body.judul, isi=body.isi, aktif=body.aktif)
    db.add(pengumuman)
    db.commit()
    db.refresh(pengumuman)

    return {
        "data": {
            "id": str(pengumuman.id),
            "judul": pengumuman.judul,
            "isi": pengumuman.isi,
            "aktif": pengumuman.aktif,
            "created_at": pengumuman.created_at.isoformat(),
        }
    }


@router.put("/api/pengumuman/{pengumuman_id}")
def update_pengumuman(
    pengumuman_id: UUID,
    body: PengumumanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    pengumuman = db.query(Pengumuman).filter(Pengumuman.id == pengumuman_id).first()
    if not pengumuman:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Pengumuman tidak ditemukan"},
        )

    if body.judul is not None:
        pengumuman.judul = body.judul
    if body.isi is not None:
        pengumuman.isi = body.isi
    if body.aktif is not None:
        pengumuman.aktif = body.aktif

    db.commit()
    db.refresh(pengumuman)

    return {
        "data": {
            "id": str(pengumuman.id),
            "judul": pengumuman.judul,
            "isi": pengumuman.isi,
            "aktif": pengumuman.aktif,
            "created_at": pengumuman.created_at.isoformat(),
        }
    }


@router.delete("/api/pengumuman/{pengumuman_id}")
def delete_pengumuman(
    pengumuman_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    pengumuman = db.query(Pengumuman).filter(Pengumuman.id == pengumuman_id).first()
    if not pengumuman:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Pengumuman tidak ditemukan"},
        )

    db.delete(pengumuman)
    db.commit()

    return {"data": {"success": True}}

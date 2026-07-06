from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role_admin
from app.models.models import Kategori, Transaksi, User
from app.schemas.schemas import (
    KategoriCreate,
    KategoriUpdate,
    KategoriResponse,
)

router = APIRouter()


@router.get("/api/kategori")
def get_all_kategori(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kategori_list = db.query(Kategori).filter(Kategori.is_active == True).order_by(Kategori.urutan_tampil).all()
    return {
        "data": [
            KategoriResponse(
                id=k.id, nama=k.nama, saldo=k.saldo,
                is_active=k.is_active, urutan_tampil=k.urutan_tampil,
            )
            for k in kategori_list
        ]
    }


@router.get("/api/kategori/all")
def get_all_kategori_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    kategori_list = db.query(Kategori).order_by(Kategori.urutan_tampil).all()
    return {
        "data": [
            KategoriResponse(
                id=k.id, nama=k.nama, saldo=k.saldo,
                is_active=k.is_active, urutan_tampil=k.urutan_tampil,
            )
            for k in kategori_list
        ]
    }


@router.post("/api/kategori", status_code=201)
def create_kategori(
    body: KategoriCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    existing = db.query(Kategori).filter(Kategori.nama == body.nama).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_EXISTS",
                "message": "Kategori dengan nama tersebut sudah ada",
            },
        )

    kategori = Kategori(nama=body.nama, urutan_tampil=body.urutan_tampil)
    db.add(kategori)
    db.commit()
    db.refresh(kategori)

    return {
        "data": KategoriResponse(
            id=kategori.id, nama=kategori.nama, saldo=kategori.saldo,
            is_active=kategori.is_active, urutan_tampil=kategori.urutan_tampil,
        )
    }


@router.put("/api/kategori/{kategori_id}")
def update_kategori(
    kategori_id: UUID,
    body: KategoriUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    kategori = db.query(Kategori).filter(Kategori.id == kategori_id).first()
    if not kategori:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Kategori tidak ditemukan"},
        )

    if body.nama is not None:
        existing = db.query(Kategori).filter(
            Kategori.nama == body.nama, Kategori.id != kategori_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "ALREADY_EXISTS",
                    "message": "Kategori dengan nama tersebut sudah ada",
                },
            )
        kategori.nama = body.nama
    if body.is_active is not None:
        kategori.is_active = body.is_active
    if body.urutan_tampil is not None:
        kategori.urutan_tampil = body.urutan_tampil

    db.commit()
    db.refresh(kategori)

    return {
        "data": KategoriResponse(
            id=kategori.id, nama=kategori.nama, saldo=kategori.saldo,
            is_active=kategori.is_active, urutan_tampil=kategori.urutan_tampil,
        )
    }

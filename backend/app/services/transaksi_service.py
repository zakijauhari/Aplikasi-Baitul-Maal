from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.models import Transaksi, Kategori


def apply_transaksi_effect(db: Session, transaksi: Transaksi):
    kategori = db.query(Kategori).filter(Kategori.id == transaksi.kategori_id).first()
    if not kategori:
        return

    if transaksi.tipe == "pemasukan":
        kategori.saldo += transaksi.nominal
    else:
        kategori.saldo -= transaksi.nominal

    db.flush()


def reverse_transaksi_effect(db: Session, transaksi: Transaksi):
    kategori = db.query(Kategori).filter(Kategori.id == transaksi.kategori_id).first()
    if not kategori:
        return

    if transaksi.tipe == "pemasukan":
        kategori.saldo -= transaksi.nominal
    else:
        kategori.saldo += transaksi.nominal

    db.flush()


def recalculate_all_saldo(db: Session):
    kategori_list = db.query(Kategori).all()
    for kategori in kategori_list:
        result = db.query(
            func.coalesce(func.sum(
                case((Transaksi.tipe == "pemasukan", Transaksi.nominal), else_=0)
            ), 0) -
            func.coalesce(func.sum(
                case((Transaksi.tipe == "pengeluaran", Transaksi.nominal), else_=0)
            ), 0)
        ).filter(
            Transaksi.kategori_id == kategori.id,
            Transaksi.deleted_at.is_(None)
        ).scalar()

        kategori.saldo = result or 0

    db.commit()

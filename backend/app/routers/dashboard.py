from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Transaksi, Kategori, User

router = APIRouter()


@router.get("/api/dashboard/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_saldo = db.query(func.coalesce(func.sum(Kategori.saldo), 0)).filter(
        Kategori.is_active == True
    ).scalar()

    now = datetime.now(timezone.utc)
    bulan_ini = now.month
    tahun_ini = now.year

    saldo_bulan_ini = db.query(func.coalesce(func.sum(
        case(
            (Transaksi.tipe == "pemasukan", Transaksi.nominal),
            else_=0
        )
    ), 0) - func.coalesce(func.sum(
        case(
            (Transaksi.tipe == "pengeluaran", Transaksi.nominal),
            else_=0
        )
    ), 0)).filter(
        func.extract("month", Transaksi.tanggal) == bulan_ini,
        func.extract("year", Transaksi.tanggal) == tahun_ini,
        Transaksi.deleted_at.is_(None),
    ).scalar() or 0

    bulan_lalu = bulan_ini - 1 if bulan_ini > 1 else 12
    tahun_lalu = tahun_ini if bulan_ini > 1 else tahun_ini - 1

    saldo_bulan_lalu = db.query(func.coalesce(func.sum(
        case(
            (Transaksi.tipe == "pemasukan", Transaksi.nominal),
            else_=0
        )
    ), 0) - func.coalesce(func.sum(
        case(
            (Transaksi.tipe == "pengeluaran", Transaksi.nominal),
            else_=0
        )
    ), 0)).filter(
        func.extract("month", Transaksi.tanggal) == bulan_lalu,
        func.extract("year", Transaksi.tanggal) == tahun_lalu,
        Transaksi.deleted_at.is_(None),
    ).scalar() or 0

    perubahan_persen = None
    if saldo_bulan_lalu > 0:
        perubahan_persen = round(
            ((saldo_bulan_ini - saldo_bulan_lalu) / saldo_bulan_lalu) * 100, 1
        )

    kategori_list = db.query(Kategori).filter(
        Kategori.is_active == True
    ).order_by(Kategori.saldo.desc()).all()

    transaksi_terakhir = db.query(Transaksi).filter(
        Transaksi.deleted_at.is_(None)
    ).order_by(Transaksi.created_at.desc()).limit(5).all()

    return {
        "data": {
            "total_saldo": total_saldo or 0,
            "perubahan_persen_bulan_ini": perubahan_persen,
            "kategori": [
                {"id": str(k.id), "nama": k.nama, "saldo": k.saldo}
                for k in kategori_list
            ],
            "transaksi_terakhir": [
                {
                    "id": str(t.id),
                    "tanggal": t.tanggal.isoformat(),
                    "deskripsi": t.deskripsi,
                    "kategori": next(
                        (k.nama for k in kategori_list if k.id == t.kategori_id), ""
                    ),
                    "tipe": t.tipe,
                    "nominal": t.nominal,
                    "status": "selesai",
                }
                for t in transaksi_terakhir
            ],
        }
    }

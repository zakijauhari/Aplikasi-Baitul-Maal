from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_tv_token
from app.models.models import Kategori, Transaksi, Pengumuman, ProfilMasjid

router = APIRouter()
tv_security = HTTPBearer(auto_error=False)


@router.get("/api/tv/data")
def get_tv_data(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(tv_security),
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Token TV diperlukan"},
        )

    payload = decode_tv_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Token TV tidak valid"},
        )

    total_saldo = db.query(func.coalesce(func.sum(Kategori.saldo), 0)).filter(
        Kategori.is_active == True
    ).scalar()

    saldo_zakat = db.query(func.coalesce(Kategori.saldo, 0)).filter(
        Kategori.nama == "Zakat"
    ).scalar()

    saldo_infaq_shadaqah = db.query(func.coalesce(func.sum(Kategori.saldo), 0)).filter(
        Kategori.nama.in_(["Infaq", "Shadaqah"])
    ).scalar()

    saldo_wakaf_anak_yatim = db.query(func.coalesce(func.sum(Kategori.saldo), 0)).filter(
        Kategori.nama.in_(["Wakaf", "Anak Yatim"])
    ).scalar()

    profil = db.query(ProfilMasjid).first()

    transaksi_terakhir = db.query(Transaksi).filter(
        Transaksi.deleted_at.is_(None)
    ).order_by(Transaksi.created_at.desc()).limit(10).all()

    kategori_list = db.query(Kategori).all()
    kategori_map = {k.id: k.nama for k in kategori_list}

    pengumuman_list = db.query(Pengumuman).filter(
        Pengumuman.aktif == True
    ).order_by(Pengumuman.created_at.desc()).all()

    return {
        "data": {
            "total_saldo": total_saldo or 0,
            "saldo_zakat": saldo_zakat or 0,
            "saldo_infaq_shadaqah": saldo_infaq_shadaqah or 0,
            "saldo_wakaf_anak_yatim": saldo_wakaf_anak_yatim or 0,
            "status_audit_terverifikasi": profil.status_audit_terverifikasi if profil else False,
            "update_terakhir": datetime.now(timezone.utc).isoformat(),
            "transaksi_terakhir": [
                {
                    "id": str(t.id),
                    "tanggal": t.tanggal.isoformat(),
                    "deskripsi": t.deskripsi,
                    "kategori": kategori_map.get(t.kategori_id, ""),
                    "tipe": t.tipe,
                    "nominal": t.nominal,
                    "status": "selesai",
                }
                for t in transaksi_terakhir
            ],
            "pengumuman": [
                {
                    "judul": p.judul,
                    "isi": p.isi,
                    "created_at": p.created_at.isoformat(),
                }
                for p in pengumuman_list
            ],
            "profil_masjid": {
                "nama_masjid": profil.nama_masjid if profil else "Masjid",
                "logo_url": profil.logo_path if profil else None,
            },
        }
    }

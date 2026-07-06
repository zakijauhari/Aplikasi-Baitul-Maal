from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role_admin
from app.models.models import ProfilMasjid, User
from app.services.storage_service import upload_logo

router = APIRouter()


@router.get("/api/profil-masjid")
def get_profil_masjid(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profil = db.query(ProfilMasjid).first()
    if not profil:
        return {
            "data": {
                "nama_masjid": "Nama Masjid Anda",
                "alamat": None,
                "logo_url": None,
                "status_audit_terverifikasi": False,
            }
        }

    return {
        "data": {
            "nama_masjid": profil.nama_masjid,
            "alamat": profil.alamat,
            "logo_url": profil.logo_path,
            "status_audit_terverifikasi": profil.status_audit_terverifikasi,
        }
    }


@router.put("/api/profil-masjid")
async def update_profil_masjid(
    nama_masjid: Optional[str] = Form(None),
    alamat: Optional[str] = Form(None),
    status_audit_terverifikasi: Optional[bool] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    profil = db.query(ProfilMasjid).first()
    if not profil:
        profil = ProfilMasjid(
            nama_masjid=nama_masjid or "Nama Masjid Anda",
            alamat=alamat,
        )
        db.add(profil)

    if nama_masjid is not None:
        profil.nama_masjid = nama_masjid
    if alamat is not None:
        profil.alamat = alamat
    if status_audit_terverifikasi is not None:
        profil.status_audit_terverifikasi = status_audit_terverifikasi

    if logo:
        contents = await logo.read()
        if len(contents) > 2 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "Ukuran logo maksimal 2MB",
                    "field": "logo",
                },
            )
        if logo.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "Format logo harus JPG, PNG, atau WebP",
                    "field": "logo",
                },
            )
        logo_url = await upload_logo(contents, logo.filename or "logo.png", logo.content_type)
        if logo_url:
            profil.logo_path = logo_url

    db.commit()
    if profil.id:
        db.refresh(profil)

    return {
        "data": {
            "nama_masjid": profil.nama_masjid,
            "alamat": profil.alamat,
            "logo_url": profil.logo_path,
            "status_audit_terverifikasi": profil.status_audit_terverifikasi,
        }
    }

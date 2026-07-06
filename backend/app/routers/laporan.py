import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role_admin
from app.models.models import LaporanArsip, ProfilMasjid, User
from app.schemas.schemas import LaporanGenerateRequest, LaporanArsipResponse
from app.services.pdf_service import generate_laporan_pdf

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BASE_DIR, "pdf_arsip")


@router.get("/api/laporan/arsip")
def get_arsip_laporan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    arsip_list = db.query(LaporanArsip).order_by(LaporanArsip.tahun.desc(), LaporanArsip.bulan.desc()).all()
    return {
        "data": [
            {
                "id": str(a.id),
                "bulan": a.bulan,
                "tahun": a.tahun,
                "generated_at": a.generated_at.isoformat(),
                "download_url": f"/api/laporan/{a.id}/download",
            }
            for a in arsip_list
        ]
    }


@router.post("/api/laporan/generate", status_code=201)
def generate_laporan(
    body: LaporanGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_admin),
):
    profil = db.query(ProfilMasjid).first()
    nama_masjid = profil.nama_masjid if profil else "Masjid"
    logo_path = profil.logo_path if profil else None

    existing = db.query(LaporanArsip).filter(
        LaporanArsip.bulan == body.bulan,
        LaporanArsip.tahun == body.tahun,
    ).first()

    if existing:
        old_filepath = os.path.join(PDF_DIR, f"laporan_{body.tahun}_{body.bulan:02d}.pdf")
        if os.path.exists(old_filepath):
            os.remove(old_filepath)
        db.delete(existing)
        db.flush()

    filepath = generate_laporan_pdf(
        db=db,
        bulan=body.bulan,
        tahun=body.tahun,
        nama_masjid=nama_masjid,
        logo_path=logo_path,
    )

    arsip = LaporanArsip(
        bulan=body.bulan,
        tahun=body.tahun,
        file_path=filepath,
        generated_by=current_user.id,
    )
    db.add(arsip)
    db.commit()
    db.refresh(arsip)

    return {
        "data": {
            "id": str(arsip.id),
            "bulan": arsip.bulan,
            "tahun": arsip.tahun,
            "generated_at": arsip.generated_at.isoformat(),
            "download_url": f"/api/laporan/{arsip.id}/download",
        }
    }


@router.get("/api/laporan/{arsip_id}/download")
def download_laporan(
    arsip_id: UUID,
    db: Session = Depends(get_db),
):
    arsip = db.query(LaporanArsip).filter(LaporanArsip.id == arsip_id).first()
    if not arsip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Laporan tidak ditemukan"},
        )

    if not os.path.exists(arsip.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "File laporan tidak ditemukan"},
        )

    return FileResponse(
        arsip.file_path,
        media_type="application/pdf",
        filename=f"laporan_{arsip.tahun}_{arsip.bulan:02d}.pdf",
    )

from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ErrorWrapper(BaseModel):
    error: ErrorResponse


class SuccessResponse(BaseModel):
    data: dict


class LoginRequest(BaseModel):
    username: str = Field(..., max_length=50)
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    username: str = Field(..., max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., max_length=100)


class UserResponse(BaseModel):
    id: UUID
    username: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse


class RefreshResponse(BaseModel):
    access_token: str


class KategoriCreate(BaseModel):
    nama: str = Field(..., max_length=50)
    urutan_tampil: int = 0


class KategoriUpdate(BaseModel):
    nama: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    urutan_tampil: Optional[int] = None


class KategoriResponse(BaseModel):
    id: UUID
    nama: str
    saldo: int
    is_active: bool
    urutan_tampil: int

    class Config:
        from_attributes = True


class TransaksiCreate(BaseModel):
    tanggal: date
    tipe: str = Field(..., pattern="^(pemasukan|pengeluaran)$")
    nominal: int = Field(..., gt=0)
    kategori_id: UUID
    metode: str = Field(..., pattern="^(cash|transfer|qris)$")
    deskripsi: Optional[str] = Field(None, max_length=500)


class TransaksiResponse(BaseModel):
    id: UUID
    tanggal: date
    tipe: str
    nominal: int
    kategori: dict
    metode: str
    deskripsi: Optional[str]
    bukti_url: Optional[str]
    created_by: dict
    created_at: datetime
    status: str = "selesai"

    class Config:
        from_attributes = True


class TransaksiListResponse(BaseModel):
    items: List[TransaksiResponse]
    page: int
    page_size: int
    total_items: int
    total_pages: int
    summary: dict


class DashboardKategori(BaseModel):
    id: UUID
    nama: str
    saldo: int


class DashboardTransaksi(BaseModel):
    id: UUID
    tanggal: date
    deskripsi: Optional[str]
    kategori: str
    tipe: str
    nominal: int
    status: str = "selesai"


class DashboardResponse(BaseModel):
    total_saldo: int
    perubahan_persen_bulan_ini: Optional[float]
    kategori: List[DashboardKategori]
    transaksi_terakhir: List[DashboardTransaksi]


class LaporanGenerateRequest(BaseModel):
    bulan: int = Field(..., ge=1, le=12)
    tahun: int = Field(..., ge=2020)


class LaporanArsipResponse(BaseModel):
    id: UUID
    bulan: int
    tahun: int
    generated_at: datetime
    download_url: str


class PengumumanCreate(BaseModel):
    judul: str = Field(..., max_length=150)
    isi: str
    aktif: bool = True


class PengumumanUpdate(BaseModel):
    judul: Optional[str] = Field(None, max_length=150)
    isi: Optional[str] = None
    aktif: Optional[bool] = None


class PengumumanResponse(BaseModel):
    id: UUID
    judul: str
    isi: str
    aktif: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TvDataResponse(BaseModel):
    total_saldo: int
    saldo_zakat: int
    saldo_infaq_shadaqah: int
    saldo_wakaf_anak_yatim: int
    status_audit_terverifikasi: bool
    update_terakhir: datetime
    transaksi_terakhir: List[DashboardTransaksi]
    pengumuman: list
    profil_masjid: dict


class ProfilMasjidResponse(BaseModel):
    nama_masjid: str
    alamat: Optional[str]
    logo_url: Optional[str]
    status_audit_terverifikasi: bool

    class Config:
        from_attributes = True


class ProfilMasjidUpdate(BaseModel):
    nama_masjid: Optional[str] = None
    alamat: Optional[str] = None
    status_audit_terverifikasi: Optional[bool] = None


class ForgotPasswordRequest(BaseModel):
    username: str = Field(..., max_length=50)


class ResetPasswordRequest(BaseModel):
    username: str = Field(..., max_length=50)
    reset_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)


class UserCreate(BaseModel):
    username: str = Field(..., max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., max_length=100)
    role: str = Field(..., pattern="^(admin|viewer)$")


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

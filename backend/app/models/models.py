import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Boolean, DateTime, Integer, BigInteger, Text, Date, ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(10), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'viewer')", name="check_role"),
    )


class Kategori(Base):
    __tablename__ = "kategori"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nama = Column(String(50), unique=True, nullable=False)
    saldo = Column(BigInteger, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    urutan_tampil = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Transaksi(Base):
    __tablename__ = "transaksi"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tanggal = Column(Date, nullable=False)
    tipe = Column(String(11), nullable=False)
    kategori_id = Column(UUID(as_uuid=True), ForeignKey("kategori.id"), nullable=False)
    nominal = Column(BigInteger, nullable=False)
    metode = Column(String(10), nullable=False)
    deskripsi = Column(Text, nullable=True)
    bukti_path = Column(Text, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    kategori = relationship("Kategori")
    creator = relationship("User")

    __table_args__ = (
        CheckConstraint("tipe IN ('pemasukan', 'pengeluaran')", name="check_tipe"),
        CheckConstraint("metode IN ('cash', 'transfer', 'qris')", name="check_metode"),
        CheckConstraint("nominal > 0", name="check_nominal"),
    )


class Pengumuman(Base):
    __tablename__ = "pengumuman"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    judul = Column(String(150), nullable=False)
    isi = Column(Text, nullable=False)
    aktif = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ProfilMasjid(Base):
    __tablename__ = "profil_masjid"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nama_masjid = Column(String(150), nullable=False)
    alamat = Column(Text, nullable=True)
    logo_path = Column(Text, nullable=True)
    status_audit_terverifikasi = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class LaporanArsip(Base):
    __tablename__ = "laporan_arsip"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bulan = Column(Integer, nullable=False)
    tahun = Column(Integer, nullable=False)
    file_path = Column(Text, nullable=False)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("bulan", "tahun", name="uq_bulan_tahun"),
        CheckConstraint("bulan BETWEEN 1 AND 12", name="check_bulan"),
    )

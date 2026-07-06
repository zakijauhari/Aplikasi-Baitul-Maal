"""
Seed script untuk membuat admin pertama, 8 kategori dana, dan 1 baris profil_masjid.
Jalankan sekali setelah database dimigrate: python scripts/seed_admin.py
Idempotent — aman dijalankan berkali-kali.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import bcrypt

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable is not set")
    sys.exit(1)

INITIAL_ADMIN_USERNAME = os.getenv("INITIAL_ADMIN_USERNAME", "admin")
INITIAL_ADMIN_PASSWORD = os.getenv("INITIAL_ADMIN_PASSWORD", "")
if not INITIAL_ADMIN_PASSWORD:
    print("ERROR: INITIAL_ADMIN_PASSWORD environment variable is not set")
    sys.exit(1)

from app.core.database import Base
from app.models.models import User, Kategori, ProfilMasjid

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    existing_admin = db.query(User).first()
    if existing_admin:
        print("Users table already has data — skipping admin seed.")
    else:
        admin = User(
            username=INITIAL_ADMIN_USERNAME,
            password_hash=bcrypt.hashpw(INITIAL_ADMIN_PASSWORD.encode("utf-8"),
            bcrypt.gensalt()
            ).decode("utf-8"),
            full_name="Admin Utama",
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.flush()
        print(f"Admin user '{INITIAL_ADMIN_USERNAME}' created.")

    existing_kategori = db.query(Kategori).first()
    if existing_kategori:
        print("Kategori table already has data — skipping kategori seed.")
    else:
        kategori_data = [
            {"nama": "Zakat", "urutan_tampil": 1},
            {"nama": "Infaq", "urutan_tampil": 2},
            {"nama": "Shadaqah", "urutan_tampil": 3},
            {"nama": "Wakaf", "urutan_tampil": 4},
            {"nama": "Operasional", "urutan_tampil": 5},
            {"nama": "Anak Yatim", "urutan_tampil": 6},
            {"nama": "Pembangunan", "urutan_tampil": 7},
            {"nama": "Lainnya", "urutan_tampil": 8},
        ]
        for k in kategori_data:
            db.add(Kategori(nama=k["nama"], urutan_tampil=k["urutan_tampil"]))
        print("8 kategori dana created.")

    existing_profil = db.query(ProfilMasjid).first()
    if existing_profil:
        print("Profil masjid already exists — skipping.")
    else:
        profil = ProfilMasjid(nama_masjid="Nama Masjid Anda")
        db.add(profil)
        print("Profil masjid placeholder created.")

    db.commit()
    print("Seed completed successfully.")

except Exception as e:
    db.rollback()
    print(f"ERROR during seed: {e}")
    sys.exit(1)
finally:
    db.close()

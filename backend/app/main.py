import logging
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.routers import (
    health,
    auth,
    kategori,
    transaksi,
    dashboard,
    laporan,
    pengumuman,
    tv,
    profil,
    users,
)

logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Baitul Maal API",
    description="Sistem Manajemen Keuangan Masjid",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Terjadi kesalahan internal server",
                "field": None,
            }
        },
    )


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(kategori.router)
app.include_router(transaksi.router)
app.include_router(dashboard.router)
app.include_router(laporan.router)
app.include_router(pengumuman.router)
app.include_router(tv.router)
app.include_router(profil.router)
app.include_router(users.router)


@app.on_event("startup")
def on_startup():
    if not settings.JWT_SECRET or not settings.DATABASE_URL:
        logger.error(
            "JWT_SECRET atau DATABASE_URL tidak terisi. Aplikasi tidak bisa berjalan."
        )
        sys.exit(1)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")


@app.get("/")
def root():
    return {"message": "Baitul Maal API", "version": "1.0.0"}

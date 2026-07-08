from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_code,
)
from app.core.deps import get_current_user
from app.models.models import User
from app.schemas.schemas import (
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    LoginResponse,
    RefreshResponse,
    UserResponse,
)

router = APIRouter()

LOGIN_ATTEMPTS: dict = {}


def check_rate_limit(username: str):
    now = datetime.now(timezone.utc)
    if username in LOGIN_ATTEMPTS:
        attempts, first_attempt = LOGIN_ATTEMPTS[username]
        if now - first_attempt > timedelta(minutes=15):
            LOGIN_ATTEMPTS[username] = (1, now)
            return
        if attempts >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "TOO_MANY_ATTEMPTS",
                    "message": "Terlalu banyak percobaan, coba lagi dalam beberapa menit.",
                },
            )
        LOGIN_ATTEMPTS[username] = (attempts + 1, first_attempt)
    else:
        LOGIN_ATTEMPTS[username] = (1, now)


@router.post("/api/auth/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    check_rate_limit(body.username)

    user = db.query(User).filter(
        User.username == body.username,
        User.is_active == True,
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Username atau password salah.",
            },
        )

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
    )

    if body.username in LOGIN_ATTEMPTS:
        del LOGIN_ATTEMPTS[body.username]

    return {
        "data": LoginResponse(
            access_token=access_token,
            user=UserResponse(
                id=user.id,
                username=user.username,
                full_name=user.full_name,
                role=user.role,
            ),
        )
    }


@router.post("/api/auth/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_EXISTS",
                "message": "Username sudah digunakan",
            },
        )

    user = User(
        username=body.username,
        password_hash=get_password_hash(body.password),
        full_name=body.full_name,
        role="viewer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "data": UserResponse(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
        )
    }


@router.post("/api/auth/refresh")
def refresh_token(request: Request, db: Session = Depends(get_db)):
    refresh_token_str = request.cookies.get("refresh_token")
    if not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Refresh token tidak ditemukan"},
        )

    payload = decode_token(refresh_token_str)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Refresh token tidak valid"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "User tidak ditemukan"},
        )

    new_access_token = create_access_token({"sub": str(user.id)})
    return {"data": RefreshResponse(access_token=new_access_token)}


@router.post("/api/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Username tidak ditemukan"},
        )

    code = generate_reset_code()
    user.reset_code = code
    user.reset_code_expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    return {"data": {"message": "Kode reset telah dibuat", "reset_code": code}}


@router.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Username tidak ditemukan"},
        )

    if not user.reset_code or not user.reset_code_expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_RESET_CODE", "message": "Tidak ada kode reset yang diminta"},
        )

    if datetime.now(timezone.utc) > user.reset_code_expiry:
        user.reset_code = None
        user.reset_code_expiry = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CODE_EXPIRED", "message": "Kode reset sudah kedaluwarsa"},
        )

    if user.reset_code != body.reset_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CODE", "message": "Kode reset salah"},
        )

    user.password_hash = get_password_hash(body.new_password)
    user.reset_code = None
    user.reset_code_expiry = None
    db.commit()

    return {"data": {"message": "Password berhasil diubah"}}


@router.post("/api/auth/logout")
def logout(response: Response, current_user: User = Depends(get_current_user)):
    response.delete_cookie("refresh_token")
    return {"data": {"success": True}}

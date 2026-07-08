import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt

from app.core.config import settings


def generate_reset_code() -> str:
    return str(random.randint(100000, 999999))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt()
    ).decode()


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password.encode(),
        hashed_password.encode()
    )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


def create_tv_token() -> str:
    to_encode = {
        "scope": "tv",
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(to_encode, settings.TV_TOKEN_SECRET, algorithm="HS256")


def decode_tv_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.TV_TOKEN_SECRET, algorithms=["HS256"])
        if payload.get("scope") != "tv":
            return None
        return payload
    except JWTError:
        return None


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        return None

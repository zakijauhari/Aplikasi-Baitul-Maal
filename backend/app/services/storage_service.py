import uuid
from typing import Optional

import httpx

from app.core.config import settings


BUKTI_BUCKET = "bukti-transaksi"


async def upload_file(file_data: bytes, filename: str, content_type: str) -> Optional[str]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    object_name = f"{uuid.uuid4()}.{ext}"

    url = f"{settings.SUPABASE_URL}/storage/v1/object/{BUKTI_BUCKET}/{object_name}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, content=file_data, headers=headers)

    if response.status_code in (200, 201):
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{BUKTI_BUCKET}/{object_name}"
        return public_url

    return None


async def delete_file(file_url: str) -> bool:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return False

    bucket_path = f"/object/public/{BUKTI_BUCKET}/"
    if bucket_path not in file_url:
        return False

    object_name = file_url.split(bucket_path)[-1]
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{BUKTI_BUCKET}/{object_name}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=headers)

    return response.status_code in (200, 204)


async def upload_logo(file_data: bytes, filename: str, content_type: str) -> Optional[str]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    object_name = f"logo/{uuid.uuid4()}.{ext}"

    url = f"{settings.SUPABASE_URL}/storage/v1/object/{BUKTI_BUCKET}/{object_name}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, content=file_data, headers=headers)

    if response.status_code in (200, 201):
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{BUKTI_BUCKET}/{object_name}"

    return None

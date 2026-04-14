# backend/app/routes/test.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"status": "success", "message": "pong"}

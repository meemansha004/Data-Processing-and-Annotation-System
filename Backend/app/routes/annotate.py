print("Annotate router file loaded successfully")
# backend/app/routes/annotate.py
from fastapi import APIRouter, UploadFile, File
from app.model.yolo_infer import predict_image
import os

router = APIRouter()
UPLOAD_DIR = "app/data/images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def annotate_image(file: UploadFile = File(...)):
    """
    Accepts an image upload, saves it locally,
    runs YOLO, and returns detection results.
    """
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Run YOLO prediction
    results = predict_image(file_path)

    return {
        "filename": file.filename,
        "num_detections": len(results),
        "detections": results
    }

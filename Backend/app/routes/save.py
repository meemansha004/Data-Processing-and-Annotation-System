
# backend/app/routes/save.py
from fastapi import APIRouter
import os
import json

print(">>> LOADED SAVE.PY FROM:", __file__)

router = APIRouter()

LABEL_DIR = "app/data/labels"
os.makedirs(LABEL_DIR, exist_ok=True)

@router.post("/save-labels")
def save_labels(payload: dict):
    """
    Save YOLO labels in .txt format.
    """
    filename = payload.get("filename")
    width = payload.get("width")
    height = payload.get("height")
    boxes = payload.get("boxes", [])

    # Convert .png → .txt
    txt_name = filename.replace(".png", ".txt").replace(".jpg", ".txt")
    save_path = os.path.join(LABEL_DIR, txt_name)

    with open(save_path, "w") as f:
        for box in boxes:
            x = box["x"]
            y = box["y"]
            w = box["width"]
            h = box["height"]

            # Normalize
            x_center = (x + w / 2) / width
            y_center = (y + h / 2) / height
            w_norm = w / width
            h_norm = h / height

            # Default class_id = 0
            class_id = 0

            line = f"{class_id} {x_center} {y_center} {w_norm} {h_norm}\n"
            f.write(line)

    return {"status": "ok", "saved_to": save_path}

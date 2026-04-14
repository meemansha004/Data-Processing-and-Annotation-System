# backend/app/model/yolo_infer.py
from ultralytics import YOLO
import os

# Load YOLO model once when the backend starts
MODEL_PATH = "yolov8n.pt"
model = YOLO(MODEL_PATH)

def predict_image(img_path: str):
    """
    Runs YOLO inference on the given image path.
    Returns boxes, confidences, and class names.
    """
    results = model(img_path)
    detections = []

    for box in results[0].boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf = float(box.conf[0].item())
        cls_id = int(box.cls[0].item())
        cls_name = results[0].names[cls_id]

        detections.append({
            "bbox": [x1, y1, x2, y2],
            "confidence": conf,
            "class": cls_name
        })

    return detections

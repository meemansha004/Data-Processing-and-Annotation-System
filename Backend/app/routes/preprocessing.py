from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
import zipfile
import pandas as pd
import io
import json
import numpy as np

from app.modules.data_profiler import profile_dataset
from app.modules.problem_detector import detect_problems
from app.modules.quality_score import calculate_quality_score

from app.pipeline.pipeline_builder import build_pipeline
from app.pipeline.preprocessing_engine import preprocess_data


router = APIRouter()


# ---------------------------
# Utility: convert numpy → native
# ---------------------------
def convert_to_native(obj):
    if isinstance(obj, dict):
        return {k: convert_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(v) for v in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    else:
        return obj

@router.post("/download")
async def download_split_data(
    file: UploadFile = File(...),
    steps: str = File(...),
    split_ratio: float = File(...)
):

    contents = await file.read()

    if file.filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(contents))
    elif file.filename.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        return {"error": "Unsupported file format"}

    steps_dict = json.loads(steps)

    # Detect columns
    num_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = df.select_dtypes(include="object").columns.tolist()

    # Build + preprocess
    pipeline = build_pipeline(num_cols, cat_cols, steps_dict)
    processed_df = preprocess_data(df, pipeline, steps_dict)

    # Split
    from sklearn.model_selection import train_test_split

    train_df, test_df = train_test_split(
        processed_df,
        test_size=(1 - float(split_ratio)),
        random_state=42
    )

    # Create ZIP
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("train.csv", train_df.to_csv(index=False))
        zf.writestr("test.csv", test_df.to_csv(index=False))

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": "attachment; filename=dataset_split.zip"}
    )

# ---------------------------
# ANALYZE ROUTE
# ---------------------------
@router.post("/analyze")
async def analyze_dataset(file: UploadFile = File(...)):

    contents = await file.read()

    if file.filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(contents))
    elif file.filename.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        return {"error": "Unsupported file format"}

    profile = profile_dataset(df)
    problems = detect_problems(df)
    score = calculate_quality_score(df)

    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "quality_score": int(score),
        "problems": convert_to_native(problems),
        "profile": convert_to_native(profile)
    }


# ---------------------------
# APPLY PREPROCESSING ROUTE
# ---------------------------
@router.post("/apply")
async def apply_preprocessing(
    file: UploadFile = File(...),
    steps: str = File(...)
):

    contents = await file.read()

    if file.filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(contents))
    elif file.filename.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        return {"error": "Unsupported file format"}

    # Convert steps string → dict
    steps_dict = json.loads(steps)

    # Detect column types
    num_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = df.select_dtypes(include="object").columns.tolist()

    # Build pipeline
    pipeline = build_pipeline(num_cols, cat_cols, steps_dict)

    # Apply preprocessing
    processed_df = preprocess_data(df, pipeline, steps_dict,)

    # 🔥 NEW: analyze processed data
    processed_profile = profile_dataset(processed_df)
    processed_score = calculate_quality_score(processed_df)

    return {
        "columns": list(processed_df.columns),
        "preview": convert_to_native(
            processed_df.head(10).to_dict(orient="records")
        ),
        "profile": convert_to_native(processed_profile),   # ✅ NEW
        "quality_score": int(processed_score)              # ✅ NEW
    }
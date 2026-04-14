"""
Image Dataset Preprocessing Pipeline
Endpoints:
  POST /image-preprocessing/analyze  - Upload ZIP, profile dataset, detect problems
  POST /image-preprocessing/preview  - Apply steps to sample, return base64 before/after pairs
  POST /image-preprocessing/download - Apply steps to full dataset, return processed ZIP
"""
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import numpy as np
import zipfile
import io
import os
import hashlib
import base64
import uuid
import json
import tempfile
import shutil

router = APIRouter()

# In-memory session store: session_id -> session dict
SESSIONS: dict = {}

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
LOW_RES_THRESHOLD = 100  # pixels


# ── Utilities ─────────────────────────────────────────────────────────────────

def compute_hash(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def pil_to_base64(img: Image.Image, fmt: str = "JPEG") -> str:
    """Convert PIL image to base64 string for frontend preview."""
    # Ensure JPEG-safe mode
    if fmt == "JPEG" and img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def apply_preprocessing(img: Image.Image, steps: dict) -> Image.Image:
    """
    Apply user-selected preprocessing steps to a single PIL image.
    Order: Cleaning (color standardize) → Transformation → Augmentation
    """
    # ── CLEANING: Color standardization ──────────────────────────────────────
    if steps.get("standardize_color"):
        target = steps.get("color_target", "RGB")
        img = img.convert("RGB") if target == "RGB" else img.convert("L")

    # ── TRANSFORMATION ────────────────────────────────────────────────────────
    if steps.get("resize"):
        w = max(1, int(steps.get("resize_width", 640)))
        h = max(1, int(steps.get("resize_height", 640)))
        img = img.resize((w, h), Image.LANCZOS)

    # ── AUGMENTATION ─────────────────────────────────────────────────────────
    if steps.get("augmentation"):
        if steps.get("flip_horizontal"):
            img = ImageOps.mirror(img)

        if steps.get("flip_vertical"):
            img = ImageOps.flip(img)

        if steps.get("rotate"):
            deg = float(steps.get("rotate_degrees", 15))
            img = img.rotate(deg, expand=False, fillcolor=0)

        if steps.get("brightness"):
            factor = max(0.1, float(steps.get("brightness_factor", 1.2)))
            img = ImageEnhance.Brightness(img).enhance(factor)

        if steps.get("contrast"):
            factor = max(0.1, float(steps.get("contrast_factor", 1.2)))
            img = ImageEnhance.Contrast(img).enhance(factor)

        if steps.get("blur"):
            radius = max(0.1, float(steps.get("blur_radius", 1.0)))
            img = img.filter(ImageFilter.GaussianBlur(radius=radius))

        if steps.get("noise"):
            arr = np.array(img, dtype=np.float32)
            noise = np.random.normal(0, 15, arr.shape)
            arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
            img = Image.fromarray(arr)

        if steps.get("zoom_crop"):
            factor = min(1.0, max(0.1, float(steps.get("zoom_factor", 0.8))))
            ow, oh = img.size
            nw, nh = int(ow * factor), int(oh * factor)
            left = (ow - nw) // 2
            top = (oh - nh) // 2
            img = img.crop((left, top, left + nw, top + nh))
            # Restore to original size if resize not enabled
            if not steps.get("resize"):
                img = img.resize((ow, oh), Image.LANCZOS)

    return img


def _filter_images(session: dict, steps: dict) -> list:
    """
    Return filtered image list based on cleaning steps.
    - remove_corrupted: skip images whose original name is in the corrupted set
    - remove_duplicates: keep only first occurrence of each hash
    - filter_low_res: skip images below min_width/min_height
    """
    corrupted = session["corrupted"]      # set of original basenames
    seen_hashes: set = set()
    result = []

    for info in session["images"]:
        # Remove corrupted
        if steps.get("remove_corrupted") and info["original_name"] in corrupted:
            continue

        # Remove duplicates — keep first occurrence of each hash
        if steps.get("remove_duplicates"):
            if info["hash"] in seen_hashes:
                continue
        seen_hashes.add(info["hash"])

        # Filter low-resolution
        if steps.get("filter_low_res"):
            min_w = max(1, int(steps.get("min_width", LOW_RES_THRESHOLD)))
            min_h = max(1, int(steps.get("min_height", LOW_RES_THRESHOLD)))
            if info["width"] < min_w or info["height"] < min_h:
                continue

        result.append(info)

    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_image_dataset(file: UploadFile = File(...)):
    """
    Accept a ZIP of images. Extract, validate, profile, detect problems, recommend steps.
    Returns a session_id to use for preview and download endpoints.
    """
    contents = await file.read()

    if not zipfile.is_zipfile(io.BytesIO(contents)):
        return {"error": "File must be a valid ZIP archive"}

    session_id = str(uuid.uuid4())
    session_dir = os.path.join(tempfile.gettempdir(), f"imgpp_{session_id}")
    os.makedirs(session_dir, exist_ok=True)

    images_info = []
    corrupted: set = set()
    hash_map: dict = {}   # hash → index of first occurrence

    with zipfile.ZipFile(io.BytesIO(contents)) as zf:
        idx = 0
        for entry in zf.namelist():
            # Skip directories and system/hidden files
            if entry.endswith("/"):
                continue
            basename = os.path.basename(entry)
            if not basename or basename.startswith("."):
                continue

            ext = os.path.splitext(basename.lower())[1]
            if ext not in SUPPORTED_EXTENSIONS:
                continue  # silently skip unsupported formats

            raw_bytes = zf.read(entry)
            h = compute_hash(raw_bytes)

            # Unique safe filename to avoid collisions
            safe_name = f"{idx:05d}_{basename}"

            # ── Corruption check ──
            try:
                img = Image.open(io.BytesIO(raw_bytes))
                img.load()   # forces full decompression — catches corrupt data
                width, height = img.size
                mode = img.mode
            except Exception:
                corrupted.add(basename)
                continue

            # ── Duplicate detection (by hash) ──
            if h not in hash_map:
                hash_map[h] = idx

            # Save to session temp dir
            dest = os.path.join(session_dir, safe_name)
            with open(dest, "wb") as f_out:
                f_out.write(raw_bytes)

            images_info.append({
                "name": safe_name,
                "original_name": basename,
                "path": dest,
                "ext": ext,
                "width": int(width),
                "height": int(height),
                "mode": mode,
                "hash": h,
                "size_bytes": len(raw_bytes),
            })
            idx += 1

    if not images_info:
        shutil.rmtree(session_dir, ignore_errors=True)
        return {"error": "No valid images found in the ZIP file"}

    # ── PROFILE ───────────────────────────────────────────────────────────────
    total = len(images_info)
    widths  = [i["width"]  for i in images_info]
    heights = [i["height"] for i in images_info]
    modes   = [i["mode"]   for i in images_info]

    # Format distribution
    fmt_counts: dict = {}
    for info in images_info:
        label = "JPEG" if info["ext"] in (".jpg", ".jpeg") else "PNG"
        fmt_counts[label] = fmt_counts.get(label, 0) + 1
    fmt_dist = {k: round(v / total * 100, 1) for k, v in fmt_counts.items()}

    # Color breakdown
    rgb_count  = sum(1 for m in modes if m in ("RGB", "RGBA"))
    gray_count = sum(1 for m in modes if m in ("L", "LA", "P"))

    # Size consistency
    unique_sizes = set((i["width"], i["height"]) for i in images_info)
    size_consistent = len(unique_sizes) == 1

    # Duplicates: images whose hash appeared more than once
    all_hashes = [i["hash"] for i in images_info]
    hash_freq = {}
    for h in all_hashes:
        hash_freq[h] = hash_freq.get(h, 0) + 1
    duplicate_count = sum(v - 1 for v in hash_freq.values() if v > 1)

    # Low-res count
    low_res_count = sum(
        1 for i in images_info
        if i["width"] < LOW_RES_THRESHOLD or i["height"] < LOW_RES_THRESHOLD
    )

    profile = {
        "total_images": total,
        "format_distribution": fmt_dist,
        "resolution": {
            "min_width":  int(min(widths)),
            "max_width":  int(max(widths)),
            "avg_width":  int(round(sum(widths) / total)),
            "min_height": int(min(heights)),
            "max_height": int(max(heights)),
            "avg_height": int(round(sum(heights) / total)),
        },
        "color_format": {
            "rgb_percent":       round(rgb_count  / total * 100, 1),
            "grayscale_percent": round(gray_count / total * 100, 1),
        },
        "size_consistent":   size_consistent,
        "unique_size_count": len(unique_sizes),
    }

    # ── PROBLEM DETECTION ────────────────────────────────────────────────────
    problems: dict = {}

    if not size_consistent:
        problems["Inconsistent Sizes"] = f"{len(unique_sizes)} different resolutions found"
    if corrupted:
        problems["Corrupted Files"] = len(corrupted)
    if duplicate_count > 0:
        problems["Duplicate Images"] = duplicate_count
    if low_res_count > 0:
        problems["Low Resolution Images"] = f"{low_res_count} images below {LOW_RES_THRESHOLD}px"
    if rgb_count > 0 and gray_count > 0:
        problems["Mixed Color Formats"] = f"{rgb_count} RGB · {gray_count} grayscale"

    # ── RECOMMENDATIONS ──────────────────────────────────────────────────────
    recommendations = []

    if "Inconsistent Sizes" in problems:
        recommendations.append({
            "step": "resize",
            "label": "Resize to uniform dimensions",
            "reason": f"{len(unique_sizes)} different resolutions found. Neural networks require a fixed input size.",
        })
    if "Corrupted Files" in problems:
        recommendations.append({
            "step": "remove_corrupted",
            "label": "Remove corrupted files",
            "reason": f"{len(corrupted)} file(s) cannot be opened. They will crash your training pipeline.",
        })
    if "Duplicate Images" in problems:
        recommendations.append({
            "step": "remove_duplicates",
            "label": "Remove duplicate images",
            "reason": f"{duplicate_count} duplicate(s) detected. Duplicates cause overfitting and inflate your dataset size.",
        })
    if "Low Resolution Images" in problems:
        recommendations.append({
            "step": "filter_low_res",
            "label": "Filter low-resolution images",
            "reason": f"Images below {LOW_RES_THRESHOLD}px carry insufficient detail for model learning.",
        })
    if "Mixed Color Formats" in problems:
        recommendations.append({
            "step": "standardize_color",
            "label": "Standardize color format",
            "reason": "Mixing RGB and grayscale will cause input dimension mismatches during training.",
        })
    recommendations.append({
        "step": "normalize",
        "label": "Normalize pixel values (0–1)",
        "reason": "Always recommended. Keeps gradients stable and speeds up neural network convergence.",
    })

    # ── STORE SESSION ────────────────────────────────────────────────────────
    SESSIONS[session_id] = {
        "dir":       session_dir,
        "images":    images_info,
        "corrupted": corrupted,     # set of original basenames
    }

    return {
        "session_id":      session_id,
        "profile":         profile,
        "problems":        problems,
        "recommendations": recommendations,
    }


@router.post("/preview")
async def preview_preprocessing(
    session_id: str = Form(...),
    steps: str = Form(...),
):
    """
    Apply preprocessing steps to a sample of up to 6 images.
    Returns before/after base64 image pairs.
    """
    if session_id not in SESSIONS:
        return {"error": "Session expired. Please re-upload your dataset."}

    session    = SESSIONS[session_id]
    steps_dict = json.loads(steps)

    filtered = _filter_images(session, steps_dict)
    sample   = filtered[:6]

    pairs = []
    for info in sample:
        try:
            before = Image.open(info["path"])
            after  = apply_preprocessing(before.copy(), steps_dict)

            pairs.append({
                "name":        info["original_name"],
                "before":      pil_to_base64(before),
                "after":       pil_to_base64(after),
                "before_size": f"{before.width}×{before.height}",
                "after_size":  f"{after.width}×{after.height}",
                "before_mode": before.mode,
                "after_mode":  after.mode,
            })
        except Exception:
            continue

    return {
        "pairs":              pairs,
        "total_after_filter": len(filtered),
    }


@router.post("/download")
async def download_processed_images(
    session_id:    str = Form(...),
    steps:         str = Form(...),
    output_format: str = Form("JPEG"),
):
    """
    Apply preprocessing to all filtered images and return as a ZIP download.
    Session is cleaned up after download.
    """
    if session_id not in SESSIONS:
        return {"error": "Session expired. Please re-upload your dataset."}

    session    = SESSIONS[session_id]
    steps_dict = json.loads(steps)
    fmt        = output_format.upper() if output_format.upper() in ("JPEG", "PNG") else "JPEG"
    ext        = ".jpg" if fmt == "JPEG" else ".png"

    filtered  = _filter_images(session, steps_dict)
    zip_buf   = io.BytesIO()

    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for info in filtered:
            try:
                img       = Image.open(info["path"])
                processed = apply_preprocessing(img.copy(), steps_dict)

                # Pixel normalization (uint8 round-trip for image format compat)
                if steps_dict.get("normalize"):
                    arr       = np.array(processed, dtype=np.float32) / 255.0
                    arr       = (arr * 255).astype(np.uint8)
                    processed = Image.fromarray(arr)

                # Fix JPEG mode compatibility
                if fmt == "JPEG" and processed.mode not in ("RGB", "L"):
                    processed = processed.convert("RGB")

                out_buf = io.BytesIO()
                processed.save(out_buf, format=fmt)

                base     = os.path.splitext(info["original_name"])[0]
                arc_name = f"processed/{base}{ext}"
                zf.writestr(arc_name, out_buf.getvalue())

            except Exception:
                continue  # skip unprocessable images silently

    zip_buf.seek(0)

    # Cleanup session
    try:
        shutil.rmtree(session["dir"], ignore_errors=True)
        del SESSIONS[session_id]
    except Exception:
        pass

    return StreamingResponse(
        zip_buf,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": "attachment; filename=processed_images.zip"},
    )

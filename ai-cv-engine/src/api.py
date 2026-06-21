# ─────────────────────────────────────────────────────────────
# CredChain — AI CV Engine (Tony)
# FastAPI service that builds real PDF CVs with fpdf2.
# Runs on http://localhost:8001 (or $PORT in production).
#
# /generate-cv returns a JSON receipt by default (safe for the backend
# proxy, which wraps the response in JSON). Add ?format=pdf to stream the
# actual PDF file. The JSON receipt also carries the PDF as base64 so the
# frontend can offer a download even when going through the proxy.
#
# The CV Studio contribution lives here too:
#   POST /generate-cv/image → a designed PNG CV (Pillow renderer)
#   GET  /studio            → the CV Studio web UI (form + live preview)
# ─────────────────────────────────────────────────────────────

import base64
import os
import traceback
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .cv_builder import build_cv_pdf
from .cv_render import render_cv_png
from .studio import STUDIO_HTML

app = FastAPI(
    title="CredChain AI CV Engine",
    description="Generates PDF CVs from CredChain student data.",
    version="1.0.0",
)

# CORS: localhost by default; in production set ALLOWED_ORIGINS (comma-separated)
# to add the deployed frontend/backend origins. Code never changes — only env.
_DEFAULT_ORIGINS = ["http://localhost:5000", "http://localhost:3000"]
_env_origins = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = _DEFAULT_ORIGINS + [
    o.strip() for o in _env_origins.split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CVRequest(BaseModel):
    """Validated CV payload. Every field is optional so partial/messy
    payloads coming through the proxy never raise a 422."""

    name: str = ""
    email: str | None = None
    summary: str | None = None
    skills: List[str] = []
    experience: List[dict] = []
    education: List[dict] = []


class CVImageRequest(BaseModel):
    """Validated payload for the designed PNG CV (CV Studio).
    Every field is optional and skills/achievements accept either a list
    or a comma/line-separated string — the renderer coerces both."""

    name: str = ""
    title: str | None = None
    summary: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    skills: Any = None
    achievements: Any = None


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "service": "ai-cv-engine",
        "status": "ok",
        "port": int(os.environ.get("PORT", 8001)),
        "studio": "/studio",
        "endpoints": ["/generate-cv", "/generate-cv/image", "/studio", "/health"],
    }


@app.get("/studio", response_class=HTMLResponse)
def studio() -> str:
    """Serve the CV Studio single-page UI (it posts to /generate-cv/image)."""
    return STUDIO_HTML


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "healthy"}


@app.post("/generate-cv")
async def generate_cv(payload: CVRequest, format: str = "json") -> Any:
    """
    format=pdf  → stream the PDF file (Content-Disposition attachment).
    format=json → JSON receipt including the PDF as base64 (proxy-friendly).
    """
    try:
        data = payload.model_dump()
        pdf_bytes = build_cv_pdf(data)
        safe_name = (payload.name or "credchain").strip().replace(" ", "-") or "credchain"
        filename = f"{safe_name}-credchain-cv.pdf"

        if format.lower() == "pdf":
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        return {
            "success": True,
            "service": "ai-cv-engine",
            "message": "CV generated successfully.",
            "received_name": payload.name,
            "skill_count": len(payload.skills),
            "filename": filename,
            "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        }
    except Exception as exc:  # noqa: BLE001 — never let the route 500-crash the proxy
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "service": "ai-cv-engine",
                "message": f"CV generation failed: {exc}",
            },
        )


@app.post("/generate-cv/image")
async def generate_cv_image(payload: CVImageRequest) -> Any:
    """Render the designed PNG CV (CV Studio) and stream it back inline.

    Used by the /studio page's live preview, but also callable directly by
    the backend proxy or any client that wants an image instead of a PDF.
    """
    try:
        png_bytes = render_cv_png(payload.model_dump())
        safe_name = (payload.name or "credchain").strip().replace(" ", "-") or "credchain"
        filename = f"{safe_name}-credchain-cv.png"
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )
    except Exception as exc:  # noqa: BLE001 — mirror the PDF route: never hard-crash
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "service": "ai-cv-engine",
                "message": f"CV image generation failed: {exc}",
            },
        )

# ─────────────────────────────────────────────────────────────
# CredChain — AI Insights Engine (Zhavia)
# FastAPI service that analyses skills + career paths via OpenAI.
# Runs on http://localhost:8002 (or $PORT in production).
#
# The response shape is always {strong_skills, career_paths, next_steps}.
# The heavy lifting (and all error handling) lives in insights.analyze(),
# which never raises — so this route can never hang or crash the proxy.
# ─────────────────────────────────────────────────────────────

import os
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .insights import analyze

app = FastAPI(
    title="CredChain AI Insights Engine",
    description="Analyses CredChain student skills and suggests career paths.",
    version="1.0.0",
)

# CORS: localhost by default; in production set ALLOWED_ORIGINS (comma-separated)
# to add the deployed backend origin. Code never changes — only env.
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


class SkillRequest(BaseModel):
    """Validated skills payload. All fields optional with sensible defaults."""

    skills: List[str] = []
    bio: str | None = None
    goals: str | None = None


@app.get("/")
def root() -> Dict[str, Any]:
    return {"service": "ai-insights-engine", "status": "ok", "port": int(os.environ.get("PORT", 8002))}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "healthy"}


@app.post("/analyze-skills")
async def analyze_skills(payload: SkillRequest) -> Dict[str, List[Any]]:
    """
    Always returns {strong_skills, career_paths, next_steps}. Real content
    when OPENAI_API_KEY is set and the call succeeds; safe empty arrays
    otherwise (analyze() handles every failure internally).
    """
    return analyze(payload.skills, payload.bio, payload.goals)

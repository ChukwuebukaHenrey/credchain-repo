# ─────────────────────────────────────────────────────────────
# CredChain — Insights brain (Zhavia)
# Calls OpenAI with a tuned system prompt to turn a user's verified
# skills/bio/goals into {strong_skills, career_paths, next_steps}.
#
# CRITICAL: this module NEVER raises. On a missing API key, a network
# timeout, an auth error, or unparseable output it returns the safe
# empty template so the FastAPI route can't crash the backend proxy.
# ─────────────────────────────────────────────────────────────

import json
import os
from typing import Dict, List, Optional

# Keep the model call under the backend proxy's 30s timeout.
OPENAI_TIMEOUT_SECONDS = 25
MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = (
    "You are a career advisor for the CredChain credential network. Given a "
    "user's verified skills, bio, and goals, respond ONLY with valid JSON "
    'matching exactly this schema: {"strong_skills": [string], '
    '"career_paths": [string], "next_steps": [string]}. Keep each array to '
    "3-5 concise items. Do not add any other keys or prose."
)

FALLBACK: Dict[str, List[str]] = {
    "strong_skills": [],
    "career_paths": [],
    "next_steps": [],
}


def _coerce(result: dict) -> Dict[str, List[str]]:
    """Guarantee the exact three-key shape, each a list trimmed to 3-5 strings."""
    out: Dict[str, List[str]] = {}
    for key in ("strong_skills", "career_paths", "next_steps"):
        value = result.get(key) if isinstance(result, dict) else None
        if not isinstance(value, list):
            value = []
        # Keep only string-ish items, cap at 5.
        cleaned = [str(v).strip() for v in value if str(v).strip()]
        out[key] = cleaned[:5]
    return out


def analyze(
    skills: List[str],
    bio: Optional[str] = None,
    goals: Optional[str] = None,
) -> Dict[str, List[str]]:
    """Return real insights, or the safe fallback on ANY problem."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        # No key configured — this is expected during local dev / demos.
        return dict(FALLBACK)

    try:
        # Imported lazily so a missing 'openai' package can't stop the service booting.
        from openai import OpenAI

        client = OpenAI(api_key=api_key, timeout=OPENAI_TIMEOUT_SECONDS)

        user_message = json.dumps(
            {
                "skills": skills or [],
                "bio": bio or "",
                "goals": goals or "",
            }
        )

        completion = client.chat.completions.create(
            model=MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

        raw = completion.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        return _coerce(parsed)
    except Exception as exc:  # noqa: BLE001 — log and fall back, never raise
        print(f"[insights] analyze fell back to empty template: {exc}")
        return dict(FALLBACK)

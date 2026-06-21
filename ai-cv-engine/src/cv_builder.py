# ─────────────────────────────────────────────────────────────
# CredChain — CV PDF builder (Tony)
# Renders a clean one-page résumé from CredChain student data using
# fpdf2. Every section is guarded so missing/empty data renders as
# "Not provided" instead of crashing the service.
# ─────────────────────────────────────────────────────────────

from typing import Any, Dict, List


def _latin1_safe(text: Any) -> str:
    """fpdf2's core fonts are latin-1 only — replace anything it can't encode."""
    s = "" if text is None else str(text)
    return s.encode("latin-1", "replace").decode("latin-1")


def _as_list(value: Any) -> List[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def build_cv_pdf(data: Dict[str, Any]) -> bytes:
    """Build a one-page CV and return it as PDF bytes."""
    # Imported lazily so the service still boots if fpdf2 isn't installed yet.
    from fpdf import FPDF

    data = data or {}
    name = _latin1_safe(data.get("name") or "Unnamed Candidate")
    email = _latin1_safe(data.get("email") or "")
    summary = _latin1_safe(data.get("summary") or "")
    skills = _as_list(data.get("skills"))
    experience = _as_list(data.get("experience"))
    education = _as_list(data.get("education"))

    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ── Header: name + contact line ──────────────────────────────
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(15, 32, 64)  # credchain navy
    pdf.cell(0, 12, name, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 7, email or "No contact email provided", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    # Blue accent rule under the header — echoes the CV Studio / brand palette.
    pdf.set_draw_color(39, 110, 241)  # credchain blue
    pdf.set_line_width(0.8)
    pdf.line(pdf.l_margin, pdf.get_y() + 1, pdf.w - pdf.r_margin, pdf.get_y() + 1)
    pdf.ln(4)

    def section_title(title: str) -> None:
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_fill_color(15, 32, 64)  # credchain navy
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 9, f"  {title}", new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    def multiline(text: str, bold: bool = False) -> None:
        # Always start at the left margin with a full-width cell so we never
        # hit "not enough horizontal space" after a preceding cell.
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B" if bold else "", 11)
        pdf.multi_cell(pdf.epw, 6, _latin1_safe(text), new_x="LMARGIN", new_y="NEXT")

    def body_line(text: str) -> None:
        multiline(text, bold=False)

    # ── Summary ──────────────────────────────────────────────────
    section_title("Summary")
    body_line(summary if summary else "Not provided")
    pdf.ln(3)

    # ── Skills ───────────────────────────────────────────────────
    section_title("Skills")
    if skills:
        body_line(", ".join(_latin1_safe(s) for s in skills))
    else:
        body_line("Not provided")
    pdf.ln(3)

    # ── Experience ───────────────────────────────────────────────
    section_title("Experience")
    if experience:
        for item in experience:
            if isinstance(item, dict):
                role = item.get("role") or item.get("title") or "Role"
                org = item.get("company") or item.get("organisation") or item.get("issuer") or ""
                period = item.get("period") or item.get("dates") or ""
                desc = item.get("description") or item.get("summary") or ""
                heading = role if not org else f"{role} - {org}"
                if period:
                    heading = f"{heading} ({period})"
                multiline(heading, bold=True)
                if desc:
                    body_line(desc)
            else:
                body_line(f"- {item}")
            pdf.ln(1)
    else:
        body_line("Not provided")
    pdf.ln(3)

    # ── Education ─────────────────────────────────────────────────
    section_title("Education")
    if education:
        for item in education:
            if isinstance(item, dict):
                degree = item.get("degree") or item.get("title") or "Programme"
                school = item.get("school") or item.get("institution") or item.get("issuer") or ""
                period = item.get("period") or item.get("dates") or item.get("year") or ""
                heading = degree if not school else f"{degree} - {school}"
                if period:
                    heading = f"{heading} ({period})"
                multiline(heading, bold=True)
            else:
                body_line(f"- {item}")
            pdf.ln(1)
    else:
        body_line("Not provided")

    # fpdf2 v2: output(dest='S') returns a bytearray — wrap to bytes.
    return bytes(pdf.output())

import logging
from django.template.loader import render_to_string

logger = logging.getLogger("carvion.api")


def generate_pdf_from_resume_data(structured_data: dict, template_name: str = "professional") -> bytes:
    """
    Renders the designated resume template using Django context compilation,
    and formats the output into clean, ATS-compliant PDF bytes using WeasyPrint (primary)
    or PyMuPDF fitz (fallback).
    """
    # Safeguard template selection: default to professional if invalid option specified
    allowed_templates = ["professional", "modern", "minimal"]
    safe_template = template_name if template_name in allowed_templates else "professional"
    template_file = f"{safe_template}.html"

    # Restructure data dictionary keys to be cleanly read by Django template contexts
    # Ensure missing optional lists or dicts fall back to empty collections
    context = {
        "profile": structured_data.get("profile") or {},
        "experiences": structured_data.get("experiences") or [],
        "educations": structured_data.get("educations") or [],
        "projects": structured_data.get("projects") or [],
        "skills": structured_data.get("skills") or [],
        "certifications": structured_data.get("certifications") or [],
    }

    # Render Django template into HTML string
    html_string = render_to_string(template_file, context)

    try:
        from weasyprint import HTML
        # Compile HTML string to PDF bytes in memory
        pdf_bytes = HTML(string=html_string).write_pdf()
        return pdf_bytes
    except Exception as exc:
        logger.warning("WeasyPrint PDF compilation failed for template '%s' (falling back to PyMuPDF): %s", safe_template, str(exc))
        try:
            import fitz
            # PyMuPDF html-to-pdf converter engine
            doc = fitz.open(stream=html_string.encode("utf-8"), filetype="html")
            pdf_bytes = doc.convert_to_pdf()
            return pdf_bytes
        except Exception as fallback_exc:
            logger.exception("Fallback PyMuPDF PDF compilation failed for template '%s': %s", safe_template, str(fallback_exc))
            raise ValueError(f"Failed to compile HTML template into PDF bytes: {str(fallback_exc)}") from fallback_exc


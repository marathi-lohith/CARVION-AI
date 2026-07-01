"""
Management command: reparse_resumes
Re-runs parse_resume_structure_with_gemini on all uploaded resumes missing experiences/educations/projects.

Usage:
    python manage.py reparse_resumes           # re-parse uploaded resumes with missing sections
    python manage.py reparse_resumes --all     # force re-parse every uploaded resume
    python manage.py reparse_resumes --id <resume_id>
"""
import logging
from django.core.management.base import BaseCommand
from apps.resumes.models import Resume
from apps.resumes.services.gemini_analyser import parse_resume_structure_with_gemini

logger = logging.getLogger("carvion.api")


class Command(BaseCommand):
    help = "Re-parse existing uploaded resumes to backfill experiences, educations, and projects."

    def add_arguments(self, parser):
        parser.add_argument("--all", action="store_true", help="Force re-parse every uploaded resume.")
        parser.add_argument("--id", type=str, help="Re-parse a single resume by MongoDB ObjectId.")

    def handle(self, *args, **options):
        force_all = options["all"]
        single_id = options.get("id")

        all_uploaded = list(Resume.objects(file_name__ne=None))

        if single_id:
            iter_resumes = [r for r in all_uploaded if str(r.id) == single_id]
        elif force_all:
            iter_resumes = all_uploaded
        else:
            iter_resumes = [
                r for r in all_uploaded
                if r.extracted_text
                and not (
                    r.structured_data.get("experiences")
                    or r.structured_data.get("educations")
                    or r.structured_data.get("projects")
                )
            ]

        self.stdout.write(f"Found {len(iter_resumes)} resume(s) to re-parse.\n")

        processed = failed = 0

        for resume in iter_resumes:
            extracted_text = resume.extracted_text or ""
            if not extracted_text:
                self.stdout.write(self.style.WARNING(f"  SKIP {resume.id} ({resume.name!r}): no extracted_text."))
                continue

            self.stdout.write(f"  Parsing {resume.id} ({resume.name!r}) text_len={len(extracted_text)}...")

            try:
                new_structured = parse_resume_structure_with_gemini(extracted_text)
                existing = dict(resume.structured_data or {})
                existing.update({
                    "profile":         new_structured.get("profile", existing.get("profile", {})),
                    "experiences":     new_structured.get("experiences", []),
                    "educations":      new_structured.get("educations", []),
                    "projects":        new_structured.get("projects", []),
                    "technical_skills": new_structured.get("technical_skills", existing.get("technical_skills", [])),
                    "soft_skills":     new_structured.get("soft_skills", existing.get("soft_skills", [])),
                })
                resume.structured_data = existing
                resume.save()
                exp_c  = len(existing.get("experiences", []))
                edu_c  = len(existing.get("educations", []))
                proj_c = len(existing.get("projects", []))
                self.stdout.write(self.style.SUCCESS(f"    OK: exp={exp_c} edu={edu_c} proj={proj_c}"))
                processed += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"    FAIL: {exc}"))
                logger.exception("reparse_resumes failed for %s: %s", resume.id, exc)
                failed += 1

        self.stdout.write(f"\nDone. processed={processed} failed={failed}")

import datetime
import logging
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.resumes.models import Resume, ResumeOptimization, CoverLetter
from apps.resumes.serializers import (
    ResumeSerializer, ResumeBuildSerializer,
    ResumeOptimizationSerializer, CoverLetterSerializer
)
from apps.resumes.services.parser import extract_resume_text
from apps.resumes.services.nlp_engine import analyze_text_structure
from apps.resumes.services.gemini_analyser import analyze_resume_with_gemini, parse_resume_structure_with_gemini
from apps.resumes.services.pdf_generator import generate_pdf_from_resume_data
from apps.profiles.models import Profile
from common.exceptions import BadRequest, NotFound
from common.gemini_client import get_gemini_client
from google.genai import errors

logger = logging.getLogger("carvion.api")

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resume_list_view(request):
    """Retrieve historical list of resumes for the user."""
    resumes = Resume.objects(user=request.user).order_by("-created_at")
    serializer = ResumeSerializer(resumes, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resume_upload_view(request):
    """
    Accepts resume PDF/DOCX file uploads, parses the raw layout text, 
    calculates NLP structure stats, evaluates ATS scores via Gemini, and records history.
    """
    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        raise BadRequest("No file found in upload request.")

    file_bytes = uploaded_file.read()
    mime_type = uploaded_file.content_type

    # Save original file to disk
    import os
    import uuid
    from django.conf import settings
    import logging
    
    upload_logger = logging.getLogger("carvion.api")
    upload_logger.info(f"UPLOAD TRACE: Received file: {uploaded_file.name}")
    
    media_dir = str(settings.BASE_DIR / "media" / "resumes")
    upload_logger.info(f"UPLOAD TRACE: Destination directory: {media_dir}")
    
    os.makedirs(media_dir, exist_ok=True)
    upload_logger.info(f"UPLOAD TRACE: Directory exists/created")
    
    ext = os.path.splitext(uploaded_file.name)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    upload_logger.info(f"UPLOAD TRACE: Generated filename: {unique_filename}")
    
    # Use forward slashes for cross-platform DB safety
    saved_file_path = os.path.join(media_dir, unique_filename).replace("\\", "/")
    upload_logger.info(f"UPLOAD TRACE: Absolute file path: {saved_file_path}")
    
    try:
        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)
        upload_logger.info(f"UPLOAD TRACE: File write succeeded. Exists? {os.path.exists(saved_file_path)}")
    except Exception as e:
        upload_logger.error(f"UPLOAD TRACE: File write failed: {str(e)}")
        raise

    # 1. Parse text from document bytes
    try:
        extracted_text = extract_resume_text(file_bytes, mime_type)
    except ValueError as exc:
        raise BadRequest(str(exc))

    # 2. Local NLP extraction parameters
    nlp_audit = analyze_text_structure(extracted_text)

    # 3. Gemini ATS Evaluation and parsing in a single call
    profile = Profile.objects(user=request.user).first()
    target_role = request.data.get("target_role") or (profile.target_role if profile else "Software Engineer")
    
    from apps.resumes.services.gemini_analyser import parse_and_analyze_resume_with_gemini
    merged_results = parse_and_analyze_resume_with_gemini(extracted_text, target_role)
    
    gemini_report = merged_results["analysis_report"]
    ats_score = merged_results["ats_score"]
    structured_data = merged_results["structured_data"]
    
    upload_logger.info(
        "UPLOAD structured_data: exp=%d edu=%d proj=%d tech_skills=%d",
        len(structured_data.get("experiences", [])),
        len(structured_data.get("educations", [])),
        len(structured_data.get("projects", [])),
        len(structured_data.get("technical_skills", [])),
    )

    # 5. Save to Database
    has_resumes = Resume.objects(user=request.user).count() > 0
    friendly_name = request.data.get("name") or f"Uploaded Resume ({datetime.datetime.now().strftime('%b %d, %H:%M')})"

    resume = Resume(
        user=request.user,
        name=friendly_name,
        file_name=uploaded_file.name,
        file_path=saved_file_path,
        extracted_text=extracted_text,
        ats_score=ats_score,
        analysis_report=gemini_report,
        structured_data=structured_data,
        is_primary=not has_resumes
    )
    resume.save()
    from apps.recommendations.services.cache_manager import invalidate_user_caches
    invalidate_user_caches(request.user)
    from apps.recommendations.models import increment_lifetime_stat
    increment_lifetime_stat("total_resume_uploads")
    increment_lifetime_stat("total_ats_reports_generated")
    upload_logger.info("UPLOAD TRACE: DB saved resume id=%s file_path=%s", resume.id, resume.file_path)

    from common.utils import log_user_activity
    log_user_activity(request.user, "resumes", "resume_upload", f"Uploaded resume: {friendly_name}", metadata={"resume_id": str(resume.id), "name": friendly_name, "file_name": uploaded_file.name})

    response_data = {
        "success": True,
        "data": ResumeSerializer(resume).data
    }

    return Response(
        response_data,
        status=status.HTTP_201_CREATED
    )



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resume_build_view(request):
    """
    Compiles structured builder form fields, calculates ATS scores via Gemini,
    and stores historical parameters.
    """
    serializer = ResumeBuildSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Builder form parameters validation failed.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    validated_data = serializer.validated_data
    name = validated_data["name"]
    template = validated_data["template"]
    structured_data = validated_data["structured_data"]

    # 1. Build flattened resume text representation for parsing
    text_blocks = []
    
    profile_data = structured_data.get("profile", {})
    text_blocks.append(f"{profile_data.get('name', '')} {profile_data.get('email', '')} {profile_data.get('bio', '')}")
    
    for exp in structured_data.get("experiences", []):
        text_blocks.append(f"{exp.get('role', '')} {exp.get('company', '')} {exp.get('description', '')}")
    for edu in structured_data.get("educations", []):
        text_blocks.append(f"{edu.get('degree', '')} {edu.get('institution', '')} {edu.get('field_of_study', '')}")
    for proj in structured_data.get("projects", []):
        text_blocks.append(f"{proj.get('title', '')} {proj.get('description', '')}")
    
    skills = structured_data.get("skills", [])
    if skills:
        text_blocks.append(" ".join(skills))
        
    for cert in structured_data.get("certifications", []):
        text_blocks.append(f"{cert.get('name', '')} {cert.get('issuer', '')}")

    flattened_text = "\n".join(text_blocks)

    # 2. Request Gemini ATS audit
    profile = Profile.objects(user=request.user).first()
    target_role = profile.target_role if profile else "Software Engineer"
    
    gemini_report = analyze_resume_with_gemini(flattened_text, target_role)
    ats_score = gemini_report.get("ats_score", 65)

    # 3. Save Resume record
    if isinstance(structured_data, dict):
        structured_data["template"] = template

    has_resumes = Resume.objects(user=request.user).count() > 0
    resume = Resume(
        user=request.user,
        name=name,
        structured_data=structured_data,
        extracted_text=flattened_text,
        ats_score=ats_score,
        analysis_report=gemini_report,
        is_primary=not has_resumes
    )
    resume.save()
    from apps.recommendations.services.cache_manager import invalidate_user_caches
    invalidate_user_caches(request.user)
    from apps.recommendations.models import increment_lifetime_stat
    increment_lifetime_stat("total_resume_uploads")
    increment_lifetime_stat("total_ats_reports_generated")

    from common.utils import log_user_activity
    log_user_activity(request.user, "resumes", "resume_build", f"Built resume: {name}", metadata={"resume_id": str(resume.id), "name": name})

    return Response(
        {
            "success": True,
            "data": ResumeSerializer(resume).data
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def resume_detail_view(request, resume_id):
    """
    GET: Fetch details of a specific resume document.
    DELETE: Revoke resume from database.
    """
    try:
        resume = Resume.objects.get(id=resume_id, user=request.user)
    except Resume.DoesNotExist:
        raise NotFound("Requested resume record not found.")

    if request.method == "GET":
        return Response({
            "success": True,
            "data": ResumeSerializer(resume).data
        })

    # Delete request
    was_primary = resume.is_primary
    from common.utils import log_user_activity
    log_user_activity(request.user, "resumes", "resume_delete", f"Deleted resume: {resume.name}", metadata={"name": resume.name, "file_name": resume.file_name})
    resume.delete()
    from apps.recommendations.services.cache_manager import invalidate_user_caches
    invalidate_user_caches(request.user)
    if was_primary:
        next_resume = Resume.objects(user=request.user).first()
        if next_resume:
            next_resume.is_primary = True
            next_resume.save()
    return Response({"success": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resume_render_pdf_view(request, resume_id):
    """
    GET: Renders structural resume context into a WeasyPrint PDF file attachment response.
    """
    try:
        resume = Resume.objects.get(id=resume_id, user=request.user)
    except Resume.DoesNotExist:
        raise NotFound("Requested resume record not found.")

    # 1. Return the original uploaded file if it exists
    import os
    import mimetypes
    from django.http import FileResponse
    
    file_path = getattr(resume, 'file_path', None)
    original_only = request.GET.get('original_only', 'false').lower() == 'true'
    
    if original_only:
        if file_path and os.path.exists(file_path):
            mime_type, _ = mimetypes.guess_type(resume.file_name or file_path)
            if not mime_type:
                mime_type = 'application/octet-stream'
                
            response = FileResponse(open(file_path, 'rb'), content_type=mime_type)
            original_name = resume.file_name or os.path.basename(file_path)
            inline = request.GET.get('inline', 'false').lower() == 'true'
            if inline:
                response['Content-Disposition'] = f'inline; filename="{original_name}"'
            else:
                response['Content-Disposition'] = f'attachment; filename="{original_name}"'
                
            # Update download analytics count
            resume.downloads_count = (resume.downloads_count or 0) + 1
            resume.save()
            return response
        else:
            raise NotFound("Original resume file could not be found.")
            
    if file_path and os.path.exists(file_path):
        mime_type, _ = mimetypes.guess_type(resume.file_name or file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'
            
        response = FileResponse(open(file_path, 'rb'), content_type=mime_type)
        original_name = resume.file_name or os.path.basename(file_path)
        response['Content-Disposition'] = f'attachment; filename="{original_name}"'
        
        # Update download analytics count
        resume.downloads_count = (resume.downloads_count or 0) + 1
        resume.save()
        return response

    # 2. Fallback for builder-created resumes or legacy records (without a saved original file)
    # Format fallback structured coordinates if resume was uploaded directly (without builder inputs)
    structured_data = getattr(resume, 'structured_data', None)
    if not structured_data:
        profile = Profile.objects(user=request.user).first()
        structured_data = {
            "profile": {
                "name": profile.user.name if profile else request.user.name,
                "email": profile.user.email if profile else request.user.email,
                "phone": getattr(profile, 'phone', "") if profile else "",
                "bio": resume.extracted_text[:350] + "..." if len(resume.extracted_text) > 350 else resume.extracted_text
            },
            "skills": getattr(profile, 'skills', []) if profile else []
        }

    template_name = request.GET.get("template") or (structured_data.get("template") if isinstance(structured_data, dict) else None) or "professional"
    
    try:
        pdf_bytes = generate_pdf_from_resume_data(structured_data, template_name)
        # Update download analytics count
        resume.downloads_count = (resume.downloads_count or 0) + 1
        resume.save()
    except Exception as exc:
        import traceback
        error_msg = (
            f"PDF generation failed for Resume ID: '{resume_id}' | "
            f"Selected Layout: '{template_name}' | "
            f"Template Name: '{template_name}' | "
            f"Template Path: 'apps/resumes/templates/{template_name}.html' | "
            f"Exception: {str(exc)}"
        )
        logger.error("%s\nStack trace:\n%s", error_msg, traceback.format_exc())
        raise BadRequest(error_msg)

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="resume_{resume.id}.pdf"'
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resume_optimize_view(request):
    """
    POST: Calls Gemini to analyze the user's resume text and target role,
    returning structured optimization suggestions and re-phrased bullet points.
    Saves the optimization run to database history.
    """
    resume_id = request.data.get("resume_id")
    custom_text = request.data.get("text")
    target_role = request.data.get("target_role") or "Software Engineer"
    
    resume_text = ""
    resume = None
    if resume_id:
        try:
            resume = Resume.objects.get(id=resume_id, user=request.user)
            resume_text = resume.extracted_text
        except Resume.DoesNotExist:
            return Response({"success": False, "error": {"message": "Resume record not found."}}, status=status.HTTP_404_NOT_FOUND)
    else:
        resume_text = custom_text

    # Default to user's primary or latest resume if neither id nor text was provided
    if not resume_text:
        resume = Resume.objects(user=request.user, is_primary=True).first() or Resume.objects(user=request.user).order_by("-created_at").first()
        if resume:
            resume_text = resume.extracted_text

    if not resume_text:
        return Response({"success": False, "error": {"message": "No resume text found or provided. Please select or upload a resume."}}, status=status.HTTP_400_BAD_REQUEST)

    import json
    client = get_gemini_client()
    
    fallback_data = {
        "optimized_text": "Enhanced Resume Experience & Summary Details:\n- Spearheaded development of scalable microservices using Python and Django.\n- Improved system performance by 25% by optimizing database queries and caching strategies.\n- Led a team of developers to implement automated CI/CD deployment pipelines.",
        "ats_improvements": [
            "Quantify impact: replace passive phrases with measurable metrics (e.g. sales, latency reductions).",
            "Align bullet points with the core competencies in target job descriptions."
        ],
        "formatting_suggestions": [
            "Use standard, simple bullet points (do not use complex shapes).",
            "Keep the layout clean with 1-inch margins and standard professional fonts."
        ],
        "grammar_improvements": [
            "Avoid first-person pronouns (I, me, my) throughout all bullet descriptions.",
            "Use past tense for previous projects and present tense for current responsibilities."
        ],
        "skill_recommendations": [
            "Add Docker and Kubernetes if you have experience with containerization.",
            "List Cloud platforms like AWS, GCP, or Azure prominently."
        ],
        "missing_keywords": [
            "CI/CD Pipelines",
            "System Architecture",
            "Unit Testing"
        ],
        "action_verb_suggestions": [
            "Architected instead of 'made'",
            "Spearheaded instead of 'helped with'",
            "Engineered instead of 'did'"
        ],
        "industry_recommendations": [
            "Highlight modern frameworks and toolkits relevant to tech and enterprise standards."
        ]
    }

    if not client:
        # Save fallback to history anyway for seamless UI experience
        opt_history = ResumeOptimization(
            user=request.user,
            resume=resume,
            target_role=target_role,
            optimized_text=fallback_data["optimized_text"],
            ats_improvements=fallback_data["ats_improvements"],
            formatting_suggestions=fallback_data["formatting_suggestions"],
            grammar_improvements=fallback_data["grammar_improvements"],
            skill_recommendations=fallback_data["skill_recommendations"],
            missing_keywords=fallback_data["missing_keywords"],
            action_verb_suggestions=fallback_data["action_verb_suggestions"],
            industry_recommendations=fallback_data["industry_recommendations"],
            is_fallback=True
        )
        opt_history.save()
        from common.utils import log_user_activity
        log_user_activity(request.user, "resumes", "resume_optimize", f"Optimized resume for role: {target_role} (fallback used)")
        return Response({"success": True, "data": fallback_data})

    try:
        prompt = f"""
        You are a professional resume writer and ATS optimization specialist.
        Analyze the resume text below and the target role: {target_role}.
        Suggest optimizations and rewrite a strong, action-oriented version of the experience section.
        
        You MUST return a strictly formatted JSON document with these exact keys:
        {{
            "optimized_text": "<string representing the rewritten experience section or resume overview>",
            "ats_improvements": [<list of strings of specific ATS suggestions>],
            "formatting_suggestions": [<list of strings of layout or font tips>],
            "grammar_improvements": [<list of strings of grammar or style fixes>],
            "skill_recommendations": [<list of strings of technical or soft skills to highlight>],
            "missing_keywords": [<list of strings of keywords that should be present for this role>],
            "action_verb_suggestions": [<list of strings of strong action verbs to use instead of generic ones>],
            "industry_recommendations": [<list of strings of general industry recommendations for this role>]
        }}
        Do not wrap JSON in markdown formatting.
        
        Resume Text:
        {resume_text}
        """
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if not response or not response.text:
            raise ValueError("Empty response received from Gemini API.")
            
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        parsed = json.loads(raw_text)
        
        # Save to database history
        opt_history = ResumeOptimization(
            user=request.user,
            resume=resume,
            target_role=target_role,
            optimized_text=parsed.get("optimized_text", ""),
            ats_improvements=parsed.get("ats_improvements", []),
            formatting_suggestions=parsed.get("formatting_suggestions", []),
            grammar_improvements=parsed.get("grammar_improvements", []),
            skill_recommendations=parsed.get("skill_recommendations", []),
            missing_keywords=parsed.get("missing_keywords", []),
            action_verb_suggestions=parsed.get("action_verb_suggestions", []),
            industry_recommendations=parsed.get("industry_recommendations", []),
            is_fallback=False
        )
        opt_history.save()
        from common.utils import log_user_activity
        log_user_activity(request.user, "resumes", "resume_optimize", f"Optimized resume for role: {target_role}")
        return Response({"success": True, "data": parsed})
    except Exception as exc:
        logger.exception("Gemini resume optimization failed: %s. Serving fallback.", str(exc))
        # Save fallback to history
        opt_history = ResumeOptimization(
            user=request.user,
            resume=resume,
            target_role=target_role,
            optimized_text=fallback_data["optimized_text"],
            ats_improvements=fallback_data["ats_improvements"],
            formatting_suggestions=fallback_data["formatting_suggestions"],
            grammar_improvements=fallback_data["grammar_improvements"],
            skill_recommendations=fallback_data["skill_recommendations"],
            missing_keywords=fallback_data["missing_keywords"],
            action_verb_suggestions=fallback_data["action_verb_suggestions"],
            industry_recommendations=fallback_data["industry_recommendations"],
            is_fallback=True
        )
        opt_history.save()
        from common.utils import log_user_activity
        log_user_activity(request.user, "system", "gemini_api_failure", f"Gemini resume optimization failed: {exc}", status="failed")
        log_user_activity(request.user, "resumes", "resume_optimize", f"Optimized resume for role: {target_role} (Gemini fallback used due to error)")
        return Response({"success": True, "data": fallback_data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resume_optimize_history_view(request):
    """GET: Retrieve optimization history for the user."""
    optimizations = ResumeOptimization.objects(user=request.user).order_by("-created_at")
    serializer = ResumeOptimizationSerializer(optimizations, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cover_letter_generator_view(request):
    """
    POST: Compiles a professional cover letter using Gemini,
    incorporating the user's resume text, target role, company name, and job description.
    Saves the generated cover letter to database history.
    """
    resume_id = request.data.get("resume_id")
    custom_text = request.data.get("text")
    job_desc = request.data.get("job_description") or ""
    company_name = request.data.get("company_name") or "the company"
    target_role = request.data.get("target_role") or "Software Engineer"
    
    resume_text = ""
    resume = None
    if resume_id:
        try:
            resume = Resume.objects.get(id=resume_id, user=request.user)
            resume_text = resume.extracted_text
        except Resume.DoesNotExist:
            return Response({"success": False, "error": {"message": "Resume record not found."}}, status=status.HTTP_404_NOT_FOUND)
    else:
        resume_text = custom_text

    # Default to user's primary or latest resume if neither id nor text was provided
    if not resume_text:
        resume = Resume.objects(user=request.user, is_primary=True).first() or Resume.objects(user=request.user).order_by("-created_at").first()
        if resume:
            resume_text = resume.extracted_text

    if not resume_text:
        return Response({"success": False, "error": {"message": "No resume text found or provided. Please select or upload a resume."}}, status=status.HTTP_400_BAD_REQUEST)

    client = get_gemini_client()
    
    fallback_letter = (
        f"Dear Hiring Team,\n\n"
        f"I am writing to express my strong interest in the {target_role} position at {company_name}. "
        f"With my background in software engineering, technical execution, and problem solving, I am confident in my "
        f"ability to add significant value to your team.\n\n"
        f"Based on my qualifications, I bring active experience utilizing modern technologies to build stable applications "
        f"and systems. I have a proven track record of collaborating across teams and executing deliverable features "
        f"under tight timelines. I look forward to discussing how my experience aligns with your business goals.\n\n"
        f"Thank you for your time and consideration.\n\n"
        f"Sincerely,\n"
        f"{request.user.name}"
    )

    if not client:
        # Save fallback cover letter to history
        cl_history = CoverLetter(
            user=request.user,
            resume=resume,
            target_role=target_role,
            company_name=company_name,
            job_description=job_desc,
            cover_letter_text=fallback_letter,
            is_fallback=True
        )
        cl_history.save()
        from apps.recommendations.models import increment_lifetime_stat
        increment_lifetime_stat("total_cover_letters_generated")
        from common.utils import log_user_activity
        log_user_activity(request.user, "resumes", "cover_letter_generate", f"Generated cover letter for role: {target_role} at {company_name} (fallback used)")
        return Response({"success": True, "data": {"cover_letter": fallback_letter}})

    try:
        prompt = f"""
        Write a professional, compelling cover letter for the role of {target_role} at {company_name}.
        Tailor it specifically based on the applicant's resume highlights and the provided job description.
        
        Job Description:
        {job_desc}
        
        Applicant Resume Highlights:
        {resume_text[:2000]}
        
        Applicant Name: {request.user.name}
        
        Only return the plain text cover letter. Do not include markdown code block formatting.
        """
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if not response or not response.text:
            raise ValueError("Empty response received from Gemini API.")
            
        cover_letter_text = response.text.strip()
        
        # Save to database history
        cl_history = CoverLetter(
            user=request.user,
            resume=resume,
            target_role=target_role,
            company_name=company_name,
            job_description=job_desc,
            cover_letter_text=cover_letter_text,
            is_fallback=False
        )
        cl_history.save()
        from apps.recommendations.models import increment_lifetime_stat
        increment_lifetime_stat("total_cover_letters_generated")
        from common.utils import log_user_activity
        log_user_activity(request.user, "resumes", "cover_letter_generate", f"Generated cover letter for role: {target_role} at {company_name}")
        return Response({"success": True, "data": {"cover_letter": cover_letter_text}})
    except Exception as exc:
        logger.exception("Gemini cover letter generation failed: %s. Serving fallback.", str(exc))
        # Save fallback to history
        cl_history = CoverLetter(
            user=request.user,
            resume=resume,
            target_role=target_role,
            company_name=company_name,
            job_description=job_desc,
            cover_letter_text=fallback_letter,
            is_fallback=True
        )
        cl_history.save()
        from apps.recommendations.models import increment_lifetime_stat
        increment_lifetime_stat("total_cover_letters_generated")
        from common.utils import log_user_activity
        log_user_activity(request.user, "system", "gemini_api_failure", f"Gemini cover letter generation failed: {exc}", status="failed")
        log_user_activity(request.user, "resumes", "cover_letter_generate", f"Generated cover letter for role: {target_role} at {company_name} (Gemini fallback used due to error)")
        return Response({"success": True, "data": {"cover_letter": fallback_letter}})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cover_letter_history_view(request):
    """GET: Retrieve cover letter generation history for the user."""
    cover_letters = CoverLetter.objects(user=request.user).order_by("-created_at")
    serializer = CoverLetterSerializer(cover_letters, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resume_set_primary_view(request, resume_id):
    """
    POST: Set specified resume as the primary resume for the user.
    """
    try:
        resume = Resume.objects.get(id=resume_id, user=request.user)
    except Resume.DoesNotExist:
        raise NotFound("Requested resume record not found.")

    # Mark all other resumes as non-primary
    Resume.objects(user=request.user, id__ne=resume.id).update(set__is_primary=False)
    
    # Mark this resume as primary
    resume.is_primary = True
    resume.save()
    from apps.recommendations.services.cache_manager import invalidate_user_caches
    invalidate_user_caches(request.user)
    
    return Response({
        "success": True,
        "data": ResumeSerializer(resume).data
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def resume_optimize_delete_view(request, opt_id):
    """DELETE: Delete individual resume optimization history item."""
    try:
        from bson import ObjectId
        if not ObjectId.is_valid(opt_id):
            raise BadRequest("Invalid optimization history ID.")
        item = ResumeOptimization.objects.get(id=opt_id, user=request.user)
        item.delete()
        return Response({"success": True, "message": "Optimization history item deleted."})
    except ResumeOptimization.DoesNotExist:
        raise NotFound("Optimization record not found.")


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def resume_optimize_delete_all_view(request):
    """DELETE: Delete all resume optimization history items for the user."""
    ResumeOptimization.objects(user=request.user).delete()
    return Response({"success": True, "message": "All optimization history deleted."})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def cover_letter_delete_view(request, cl_id):
    """DELETE: Delete individual cover letter history item."""
    try:
        from bson import ObjectId
        if not ObjectId.is_valid(cl_id):
            raise BadRequest("Invalid cover letter ID.")
        item = CoverLetter.objects.get(id=cl_id, user=request.user)
        item.delete()
        return Response({"success": True, "message": "Cover letter deleted from history."})
    except CoverLetter.DoesNotExist:
        raise NotFound("Cover letter record not found.")


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def cover_letter_delete_all_view(request):
    """DELETE: Delete all cover letter history items for the user."""
    CoverLetter.objects(user=request.user).delete()
    return Response({"success": True, "message": "All cover letter history deleted."})



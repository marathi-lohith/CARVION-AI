import logging
import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.profiles.serializers import ProfileSerializer, CustomSkillGapHistorySerializer
from apps.profiles.models import CustomSkillGapHistory
from apps.profiles.services import get_profile_for_user, get_dashboard_summary
from common.exceptions import BadRequest, NotFound
from common.gemini_client import get_gemini_client
from google.genai import errors

# Imports for comprehensive activity history tracking
from apps.resumes.models import Resume, ResumeOptimization, CoverLetter
from apps.recommendations.models import SavedJob, JobApplication
from apps.learning.models import Roadmap
from apps.assessments.models import Scorecard, InterviewSession
from apps.notifications.models import Notification
from apps.profiles.models import UserActivityLog, ContactMessage
from apps.chatbot.models import ChatSession
from common.utils import log_user_activity

logger = logging.getLogger("carvion.api")

@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def profile_detail_view(request):
    """
    GET: Retrieve current authenticated user profile details.
    PUT/PATCH: Update personal profile settings (contact info, target career, and skills).
    """
    profile = get_profile_for_user(request.user)

    if request.method == "GET":
        serializer = ProfileSerializer(profile)
        return Response({
            "success": True,
            "data": serializer.data
        })

    # Perform updates validation
    name_val = request.data.get("name")
    name_str = None
    if name_val is not None:
        name_str = str(name_val).strip()
        if not name_str:
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "Full Name is required.",
                        "code": "ValidationError"
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    serializer = ProfileSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Validation failed.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Track changes for activity history
    validated_data = serializer.validated_data
    old_target_role = profile.target_role
    old_location = profile.location
    old_skills = set(profile.skills or [])
    old_experience_level = profile.experience_level

    # Save current state for manual rollback on failure
    old_profile_data = {
        field_name: getattr(profile, field_name, None)
        for field_name in validated_data
    }
    old_user_name = request.user.name

    try:
        # Perform updates
        if name_str is not None:
            user = request.user
            user.name = name_str
            user.save()

        for field_name, val in validated_data.items():
            setattr(profile, field_name, val)
        profile.save()

        # Automatically compile and prepare the new learning path immediately upon profile save
        if "target_role" in validated_data and validated_data["target_role"] != old_target_role:
            from apps.learning.models import Roadmap
            from apps.recommendations.services.cache_manager import invalidate_user_caches
            
            # Delete previous system roadmap to force clean rebuild
            Roadmap.objects(user=profile.user, is_system_generated=True).delete()
            
            # Invalidate caches
            invalidate_user_caches(profile.user)
            
            # Run the heavy compilation task in a background thread
            import threading
            def bg_sync_roadmap(user_id):
                try:
                    from apps.authentication.models import User
                    from apps.learning.views import sync_system_roadmap, get_or_populate_milestone_videos
                    user = User.objects.get(id=user_id)
                    roadmap = sync_system_roadmap(user)
                    if roadmap:
                        get_or_populate_milestone_videos(roadmap)
                except Exception as e:
                    logger.error("Background sync roadmap failed: %s", str(e))
            
            threading.Thread(target=bg_sync_roadmap, args=(profile.user.id,), daemon=True).start()
            
            log_user_activity(request.user, "profile", "target_role_change", f"Target role updated from '{old_target_role}' to '{validated_data['target_role']}'")
    except Exception as exc:
        # Revert profile changes
        for field_name, old_val in old_profile_data.items():
            setattr(profile, field_name, old_val)
        profile.save()

        # Revert user changes
        if name_str is not None:
            user = request.user
            user.name = old_user_name
            user.save()

        logger.exception("Profile update failed during dependent database sync. Rolled back changes.")
        return Response(
            {
                "success": False,
                "error": {
                    "message": f"Profile update failed due to database sync error: {str(exc)}",
                    "code": "SaveError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    if "location" in validated_data and validated_data["location"] != old_location:
        log_user_activity(request.user, "profile", "location_change", f"Location updated to '{validated_data['location']}'")
    if "skills" in validated_data and set(validated_data["skills"] or []) != old_skills:
        log_user_activity(request.user, "profile", "skills_change", f"Skills inventory updated: {len(validated_data['skills'])} skills")
    if "experience_level" in validated_data and validated_data["experience_level"] != old_experience_level:
        log_user_activity(request.user, "profile", "experience_level_change", f"Experience level updated to '{validated_data['experience_level']}'")
    
    log_user_activity(request.user, "profile", "profile_update", "Profile information updated")
    
    # Return updated document
    return Response({
        "success": True,
        "data": ProfileSerializer(profile).data
    })



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_overview_view(request):
    """
    GET: Retrieve consolidated dashboard analytics rollup for standard landing dashboard.
    """
    summary = get_dashboard_summary(request.user)
    return Response({
        "success": True,
        "data": summary
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def skill_gap_analyzer_view(request):
    """
    GET: Evaluates missing career-essential skills comparing active profile list to resume feedback.
    """
    from apps.profiles.models import Profile
    from apps.resumes.models import Resume
    from apps.recommendations.services.recommendation_engine import calculate_missing_skills, normalize_skill

    profile = Profile.objects(user=request.user).first()
    target_role = profile.target_role if profile else "Software Engineer"
    active_skills = profile.skills if profile and profile.skills else []

    # Load Resume skills to return in response (primary first, fall back to latest)
    latest_resume = Resume.objects(user=request.user, is_primary=True).first()
    is_primary = True
    if not latest_resume:
        is_primary = False
        latest_resume = Resume.objects(user=request.user).order_by("-created_at").first()
    resume_skills = []
    if latest_resume:
        if latest_resume.analysis_report:
            ar_skills = latest_resume.analysis_report.get("skills") or latest_resume.analysis_report.get("technical_skills") or []
            if ar_skills:
                resume_skills = [s if isinstance(s, str) else s.get("name", "") for s in ar_skills if s]
        if latest_resume.structured_data:
            sd_tech = latest_resume.structured_data.get("technical_skills") or latest_resume.structured_data.get("skills") or []
            sd_soft = latest_resume.structured_data.get("soft_skills") or []
            sd_skills = []
            for s in list(sd_tech) + list(sd_soft):
                if isinstance(s, dict):
                    sd_skills.append(s.get("name", ""))
                elif isinstance(s, str):
                    sd_skills.append(s)
            existing_lower = set(normalize_skill(s) for s in resume_skills)
            for sk in sd_skills:
                if sk and normalize_skill(sk) not in existing_lower:
                    resume_skills.append(sk)
                    existing_lower.add(normalize_skill(sk))
        resume_skills = [s for s in resume_skills if s and s.strip()]

    # Calculate missing skills using centralized function
    missing_skills = calculate_missing_skills(request.user)

    # Ensure profile has experience level
    exp_lvl = profile.experience_level if (profile and getattr(profile, 'experience_level', None)) else "Entry Level"
    
    # Calculate state hash to check if cache is fresh
    import hashlib
    # Current active profile skills and parsed resume skills
    current_skills_list = list(set(active_skills + resume_skills))
    current_skills_str = ", ".join(current_skills_list)
    
    state_str = f"{target_role}:{exp_lvl}:{','.join(sorted(current_skills_list))}"
    state_hash = hashlib.md5(state_str.encode("utf-8")).hexdigest()
    
    if profile and profile.auto_insights_hash == state_hash and profile.auto_insights:
        auto_results = profile.auto_insights
    else:
        auto_results = generate_skill_gap_insights(target_role, current_skills_str, exp_lvl, "Technology")
        if profile:
            profile.auto_insights = auto_results
            profile.auto_insights_hash = state_hash
            profile.save()

    # Generate deterministic actionable tips
    recommendations = []
    for skill in missing_skills:
        recommendations.append({
            "skill": skill,
            "importance": "High",
            "actionable_tip": f"Learn {skill} to bridge your career skill gap."
        })

    response_data = {
        "target_role": target_role or "Not set",
        "active_skills": active_skills,
        "resume_skills": resume_skills,
        "missing_skills": missing_skills,
        "recommendations": recommendations,
        "results": auto_results,
        "is_primary_resume": is_primary
    }
    from common.utils import log_user_activity
    log_user_activity(request.user, "profile", "skill_gap_analysis", f"Calculated missing skills for role: {target_role or 'Not set'}")
    return Response({"success": True, "data": response_data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_analytics_view(request):
    """
    GET: Aggregate statistics of resume ATS scores and mock tests scores over time.
    """
    from apps.resumes.models import Resume
    from apps.assessments.models import Scorecard
    
    resumes = Resume.objects(user=request.user).order_by("-created_at")[:5]
    ats_history = []
    for r in reversed(resumes):
        ats_history.append({
            "name": r.name,
            "score": r.ats_score,
            "date": r.created_at.strftime("%b %d")
        })

    scorecards = Scorecard.objects(user=request.user).order_by("-created_at")[:5]
    test_history = []
    for sc in reversed(scorecards):
        test_history.append({
            "domain": sc.domain,
            "category": sc.category,
            "score": sc.score,
            "date": sc.created_at.strftime("%b %d")
        })

    total_resumes = Resume.objects(user=request.user).count()
    total_tests = Scorecard.objects(user=request.user).count()
    
    return Response({
        "success": True,
        "data": {
            "ats_history": ats_history,
            "test_history": test_history,
            "total_resumes": total_resumes,
            "total_tests": total_tests
        }
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contact_message_view(request):
    """
    POST: Submit contact/support message.
    """
    from apps.profiles.models import ContactMessage
    name = request.data.get("name")
    email = request.data.get("email")
    subject = request.data.get("subject")
    message = request.data.get("message")
    
    if not name or not email or not subject or not message:
        return Response({"success": False, "error": {"message": "All fields are required."}}, status=status.HTTP_400_BAD_REQUEST)
        
    msg = ContactMessage(
        user=request.user,
        name=name,
        email=email,
        subject=subject,
        message=message,
        conversation=[{
            "sender": "user",
            "sender_name": name,
            "message": message,
            "created_at": datetime.datetime.utcnow().isoformat()
        }]
    )
    msg.save()
    logger.info("New support message submitted by user: %s (Email: %s)", name, email)
    
    try:
        from apps.profiles.models import UserActivityLog
        UserActivityLog.objects.create(
            user=request.user,
            module="contact_messages",
            activity_type="ticket_created",
            description=f"User created support ticket '{msg.id}' with subject '{subject}'.",
            status="success"
        )
    except Exception as log_err:
        logger.error("Failed to write ticket created audit log: %s", str(log_err))
        
    return Response({"success": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_tickets_list_view(request):
    """
    GET: Retrieve list of all tickets submitted by the authenticated user.
    """
    try:
        from apps.profiles.models import ContactMessage
        tickets = ContactMessage.objects(user=request.user, is_deleted__ne=True).order_by("-created_at")
        data = []
        for t in tickets:
            data.append({
                "id": str(t.id),
                "subject": t.subject,
                "status": t.status,
                "priority": t.priority,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None
            })
        return Response({"success": True, "data": data})
    except Exception as exc:
        logger.error("Failed to query user tickets: %s", str(exc))
        return Response({"success": False, "error": {"message": "Failed to retrieve tickets."}}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_ticket_detail_view(request, ticket_id):
    """
    GET: Retrieve full details and conversation thread of a specific ticket.
    """
    try:
        from apps.profiles.models import ContactMessage
        from bson import ObjectId
        if not ObjectId.is_valid(ticket_id):
            return Response({"success": False, "error": {"message": "Invalid ticket ID."}}, status=400)
            
        ticket = ContactMessage.objects(id=ticket_id, user=request.user, is_deleted__ne=True).first()
        if not ticket:
            return Response({"success": False, "error": {"message": "Ticket not found."}}, status=404)
            
        data = {
            "id": str(ticket.id),
            "name": ticket.name,
            "email": ticket.email,
            "subject": ticket.subject,
            "message": ticket.message,
            "status": ticket.status,
            "priority": ticket.priority,
            "conversation": ticket.conversation or [],
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None
        }
        return Response({"success": True, "data": data})
    except Exception as exc:
        logger.error("Failed to fetch user ticket detail: %s", str(exc))
        return Response({"success": False, "error": {"message": "Failed to fetch ticket."}}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def user_ticket_reply_view(request, ticket_id):
    """
    POST: Append user reply to conversation thread.
    """
    try:
        from apps.profiles.models import ContactMessage
        from bson import ObjectId
        if not ObjectId.is_valid(ticket_id):
            return Response({"success": False, "error": {"message": "Invalid ticket ID."}}, status=400)
            
        ticket = ContactMessage.objects(id=ticket_id, user=request.user, is_deleted__ne=True).first()
        if not ticket:
            return Response({"success": False, "error": {"message": "Ticket not found."}}, status=404)
            
        reply_text = request.data.get("message", "").strip()
        if not reply_text:
            return Response({"success": False, "error": {"message": "Message content cannot be empty."}}, status=400)
            
        new_reply = {
            "sender": "user",
            "sender_name": request.user.name or ticket.name,
            "message": reply_text,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        
        if not ticket.conversation:
            ticket.conversation = []
        ticket.conversation.append(new_reply)
        
        # Update status to open
        ticket.status = "open"
        ticket.updated_at = datetime.datetime.utcnow()
        ticket.save()
        
        try:
            from apps.profiles.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                module="contact_messages",
                activity_type="user_reply",
                description=f"User replied to support ticket '{ticket_id}'.",
                status="success"
            )
        except Exception:
            pass

        return Response({"success": True, "message": "Reply sent successfully."})
    except Exception as exc:
        logger.error("Failed user reply submission: %s", str(exc))
        return Response({"success": False, "error": {"message": "Failed to post reply."}}, status=500)


def generate_skill_gap_insights(target_role, current_skills, experience_level, preferred_industry="Technology"):
    client = get_gemini_client()
    import json

    fallback_data = {
        "missing_skills": ["Docker", "AWS Solutions Architecture", "Kubernetes", "System Design"],
        "skill_gap_percentage": 45,
        "recommended_learning_sequence": [
            "1. Advanced Python & Patterns",
            "2. Containers with Docker",
            "3. Microservices Deployment on AWS",
            "4. Basic Kubernetes & Orchestration"
        ],
        "ai_study_recommendations": "Set up a local minikube cluster to practice deploying mock web application pods, and read AWS whitepapers on architectural design guidelines.",
        "certifications": ["AWS Certified Developer Associate", "Docker Certified Associate"],
        "projects": ["Web App Containerization Repo", "High-throughput task queue worker pool"],
        "courses": ["Docker and Kubernetes: The Complete Guide", "AWS Developer: Building on AWS"],
        "career_advice": "Focus heavily on system architecture and cloud integration. Practice solving system design questions.",
        "estimated_learning_duration": "3 - 4 months",
        "hiring_readiness": "Medium-High. Focus on system scalability projects to show senior-level knowledge.",
        "salary_prediction": "$90,000 - $125,000",
        "industry_recommendations": ["Focus on high-availability cloud configurations."]
    }

    parsed = None
    is_fallback = False

    if not client:
        parsed = fallback_data
        is_fallback = True
    else:
        try:
            prompt = f"""
            You are an AI Career Consultant and Skill Gap Specialist.
            Analyze the gap between the applicant's profile and the target role criteria.
            
            Applicant parameters:
            - Target Role: {target_role}
            - Current Skills: {current_skills}
            - Experience Level: {experience_level}
            - Preferred Industry: {preferred_industry}
            
            Assess the skill gap, recommended study tracks, courses, projects, and certifications.
            You MUST return a strictly formatted JSON document with these exact keys and types:
            {{
                "missing_skills": [<list of strings of missing skills required for this role>],
                "skill_gap_percentage": <integer number representing gap percent from 0 to 100>,
                "recommended_learning_sequence": [<list of strings of ordered steps/topics to learn>],
                "ai_study_recommendations": "<string of advice on how to study and improve>",
                "certifications": [<list of strings of recommended certifications>],
                "projects": [<list of strings of suggested portfolio projects to build>],
                "courses": [<list of strings of recommended online courses or subjects>],
                "career_advice": "<string of general career guidance>",
                "estimated_learning_duration": "<string estimated timeline to close the gap>",
                "hiring_readiness": "<string category representing readiness, e.g. Low, Medium, High>",
                "salary_prediction": "<string range representing salary expectations>",
                "industry_recommendations": [<list of strings of specific industry tips>]
            }}
            Do not wrap JSON in markdown formatting.
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
        except Exception as exc:
            logger.exception("Gemini skill gap insights generation failed: %s. Serving fallback.", str(exc))
            parsed = fallback_data
            is_fallback = True

    # Normalize response fields to prevent frontend rendering crashes
    normalized = {
        "missing_skills": parsed.get("missing_skills") or parsed.get("missing skills") or [],
        "skill_gap_percentage": int(parsed.get("skill_gap_percentage") or 0),
        "recommended_learning_sequence": parsed.get("recommended_learning_sequence") or parsed.get("learning roadmap") or [],
        "ai_study_recommendations": parsed.get("ai_study_recommendations") or parsed.get("study recommendations") or parsed.get("advisor") or "",
        "certifications": parsed.get("certifications") or [],
        "projects": parsed.get("projects") or [],
        "courses": parsed.get("courses") or [],
        "career_advice": parsed.get("career_advice") or "",
        "estimated_learning_duration": parsed.get("estimated_learning_duration") or "",
        "hiring_readiness": parsed.get("hiring_readiness") or parsed.get("career readiness") or "",
        "salary_prediction": parsed.get("salary_prediction") or "N/A",
        "industry_recommendations": parsed.get("industry_recommendations") or [],
        "is_fallback": is_fallback
    }
    return normalized


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def custom_skill_gap_analyzer_view(request):
    """
    POST: Conduct custom skill gap analysis based on user-supplied parameters.
    Saves the results into MongoDB history.
    """
    target_role = request.data.get("target_role")
    current_skills = request.data.get("current_skills") or ""
    experience_level = request.data.get("experience_level")
    preferred_industry = request.data.get("preferred_industry") or "Technology"

    if not target_role or not current_skills or not experience_level:
        return Response({
            "success": False,
            "error": {"message": "target_role, current_skills, and experience_level are required."}
        }, status=status.HTTP_400_BAD_REQUEST)

    normalized = generate_skill_gap_insights(target_role, current_skills, experience_level, preferred_industry)

    # Save to history database
    history_entry = CustomSkillGapHistory(
        user=request.user,
        target_role=target_role,
        current_skills=current_skills,
        experience_level=experience_level,
        preferred_industry=preferred_industry,
        results=normalized
    )
    history_entry.save()

    return Response({"success": True, "data": normalized})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def custom_skill_gap_history_list_view(request):
    """GET: Retrieve custom manual skill gap history list for the user."""
    history = CustomSkillGapHistory.objects(user=request.user, is_deleted=False).order_by("-created_at")
    serializer = CustomSkillGapHistorySerializer(history, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def custom_skill_gap_history_delete_view(request, history_id):
    """DELETE: Delete individual manual skill gap history record."""
    try:
        from bson import ObjectId
        if not ObjectId.is_valid(history_id):
            raise BadRequest("Invalid history record ID.")
        
        record = CustomSkillGapHistory.objects.get(id=history_id, user=request.user, is_deleted=False)
        from common.soft_delete_service import soft_delete
        soft_delete(record, request.user)
        return Response({
            "success": True,
            "message": "History record deleted successfully."
        })
    except CustomSkillGapHistory.DoesNotExist:
        raise NotFound("Requested history record not found.")


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def custom_skill_gap_history_delete_all_view(request):
    """DELETE: Delete all manual skill gap analysis history for the user."""
    try:
        from common.soft_delete_service import soft_delete
        records = CustomSkillGapHistory.objects(user=request.user, is_deleted=False)
        for record in records:
            soft_delete(record, request.user)
        return Response({
            "success": True,
            "message": "All manual analysis history deleted successfully."
        })
    except Exception as e:
        logger.exception("Failed to delete all manual gap history")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_activity_history_view(request):
    """
    GET: Gather user activity logs and aggregate chronological history across all models.
    """
    user = request.user
    events = []

    # 1. Fetch UserActivityLogs
    logs = UserActivityLog.objects(user=user, is_deleted=False).order_by("-created_at")
    for log in logs:
        events.append({
            "id": str(log.id),
            "type": log.activity_type,
            "module": log.module,
            "description": log.description,
            "timestamp": log.created_at.isoformat() + "Z" if log.created_at else None,
            "status": log.status,
            "resource": log.metadata
        })

    # 2. Fetch Resumes
    resumes = Resume.objects(user=user, is_deleted=False)
    for res in resumes:
        events.append({
            "id": str(res.id),
            "type": "resume_upload",
            "module": "resumes",
            "description": f"Uploaded resume: {res.name}",
            "timestamp": res.created_at.isoformat() + "Z" if res.created_at else None,
            "status": "success",
            "resource": {"name": res.name, "file_name": res.file_name, "is_primary": res.is_primary}
        })

    # 3. Fetch ResumeOptimizations
    opts = ResumeOptimization.objects(user=user, is_deleted=False)
    for opt in opts:
        events.append({
            "id": str(opt.id),
            "type": "resume_optimize",
            "module": "ai_tools",
            "description": f"Optimized resume for role: {opt.target_role}",
            "timestamp": opt.created_at.isoformat() + "Z" if opt.created_at else None,
            "status": "success",
            "resource": {"target_role": opt.target_role}
        })

    # 4. Fetch CoverLetters
    cls = CoverLetter.objects(user=user, is_deleted=False)
    for cl in cls:
        events.append({
            "id": str(cl.id),
            "type": "cover_letter",
            "module": "ai_tools",
            "description": f"Generated cover letter for {cl.target_role} at {cl.company_name}",
            "timestamp": cl.created_at.isoformat() + "Z" if cl.created_at else None,
            "status": "success",
            "resource": {"target_role": cl.target_role, "company_name": cl.company_name}
        })

    # 5. Fetch SavedJobs
    saved_jobs = SavedJob.objects(user=user)
    for sj in saved_jobs:
        events.append({
            "id": str(sj.id),
            "type": "job_saved",
            "module": "jobs",
            "description": f"Saved job listing: {sj.title} at {sj.company}",
            "timestamp": sj.created_at.isoformat() + "Z" if sj.created_at else None,
            "status": "success",
            "resource": {"title": sj.title, "company": sj.company, "location": sj.location}
        })

    # 6. Fetch JobApplications
    apps = JobApplication.objects(user=user)
    for ap in apps:
        events.append({
            "id": str(ap.id),
            "type": "job_applied",
            "module": "jobs",
            "description": f"Applied to job: {ap.title} at {ap.company} (Status: {ap.status})",
            "timestamp": ap.applied_at.isoformat() + "Z" if ap.applied_at else None,
            "status": "success",
            "resource": {"title": ap.title, "company": ap.company, "status": ap.status}
        })

    # 7. Fetch Roadmaps
    roadmaps = Roadmap.objects(user=user)
    for rm in roadmaps:
        events.append({
            "id": str(rm.id),
            "type": "roadmap_generate",
            "module": "learning",
            "description": f"Generated career path roadmap for: {rm.target_role}",
            "timestamp": rm.created_at.isoformat() + "Z" if rm.created_at else None,
            "status": "success",
            "resource": {"target_role": rm.target_role, "is_system_generated": rm.is_system_generated}
        })

    # 8. Fetch ChatSessions
    chats = ChatSession.objects(user=user, is_deleted=False)
    for cs in chats:
        events.append({
            "id": str(cs.id),
            "type": "chat_session",
            "module": "chatbot",
            "description": f"Started career guidance chat: {cs.title or 'Chat Session'} ({len(cs.messages or [])} messages)",
            "timestamp": cs.created_at.isoformat() + "Z" if cs.created_at else None,
            "status": "success",
            "resource": {"title": cs.title, "messages_count": len(cs.messages or [])}
        })

    # 9. Fetch CustomSkillGapHistory
    gaps = CustomSkillGapHistory.objects(user=user, is_deleted=False)
    for gap in gaps:
        events.append({
            "id": str(gap.id),
            "type": "skill_gap_analysis",
            "module": "skill_gap",
            "description": f"Executed skill gap audit for: {gap.target_role}",
            "timestamp": gap.created_at.isoformat() + "Z" if gap.created_at else None,
            "status": "success",
            "resource": {"target_role": gap.target_role, "experience_level": gap.experience_level}
        })

    # 10. Fetch Scorecards
    scorecards = Scorecard.objects(user=user)
    for sc in scorecards:
        events.append({
            "id": str(sc.id),
            "type": "mock_test",
            "module": "assessments",
            "description": f"Completed MCQ test: {sc.domain} (Score: {sc.score}%)",
            "timestamp": sc.created_at.isoformat() + "Z" if sc.created_at else None,
            "status": "success" if sc.score >= 70 else "warning",
            "resource": {"domain": sc.domain, "score": sc.score, "correct_answers": sc.correct_answers, "total_questions": sc.total_questions}
        })

    # 11. Fetch InterviewSessions
    interviews = InterviewSession.objects(user=user)
    for iv in interviews:
        score = iv.evaluation.get("overall_score", 0) if iv.evaluation else 0
        events.append({
            "id": str(iv.id),
            "type": "mock_interview",
            "module": "assessments",
            "description": f"Completed mock interview for {iv.role} (Score: {score}%)" if iv.status == "completed" else f"Began mock interview session for {iv.role}",
            "timestamp": iv.created_at.isoformat() + "Z" if iv.created_at else None,
            "status": "success" if score >= 70 or iv.status != "completed" else "warning",
            "resource": {"role": iv.role, "mode": iv.mode, "status": iv.status, "overall_score": score}
        })

    # 12. Fetch Notifications
    notifications = Notification.objects(user=user, is_deleted=False)
    for nt in notifications:
        events.append({
            "id": str(nt.id),
            "type": "notification",
            "module": "notifications",
            "description": f"Received system alert: {nt.title}",
            "timestamp": nt.created_at.isoformat() + "Z" if nt.created_at else None,
            "status": "success",
            "resource": {"title": nt.title, "read": nt.read}
        })

    # 13. Fetch ContactMessages
    contacts = ContactMessage.objects(email=user.email)
    for cm in contacts:
        events.append({
            "id": str(cm.id),
            "type": "contact_message",
            "module": "contact_support",
            "description": f"Submitted support query: {cm.subject}",
            "timestamp": cm.created_at.isoformat() + "Z" if cm.created_at else None,
            "status": "success",
            "resource": {"subject": cm.subject}
        })

    # Sort all events chronologically (newest first)
    events.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    # Compute Summary Statistics
    total_activities = len(events)
    
    unique_days = set()
    for e in events:
        if e["timestamp"]:
            unique_days.add(e["timestamp"][:10])
    active_days = len(unique_days)

    total_ai_requests = len([e for e in events if e["module"] in ["ai_tools", "chatbot", "skill_gap"]])
    total_resumes = len([e for e in events if e["type"] == "resume_upload"])
    total_searches = len([e for e in events if e["type"] == "job_search"])
    total_apps = len([e for e in events if e["type"] == "job_applied"])
    total_interviews = len([e for e in events if e["type"] == "mock_interview"])
    total_assessments = len([e for e in events if e["type"] == "mock_test"])
    total_courses = len([e for e in events if e["type"] == "course_view"])
    total_notifications = len([e for e in events if e["type"] == "notification"])

    stats = {
        "total_activities": total_activities,
        "active_days": active_days,
        "total_ai_requests": total_ai_requests,
        "total_resumes": total_resumes,
        "total_searches": total_searches,
        "total_apps": total_apps,
        "total_interviews": total_interviews,
        "total_assessments": total_assessments,
        "total_courses": total_courses,
        "total_notifications": total_notifications
    }

    return Response({
        "success": True,
        "data": {
            "events": events,
            "stats": stats
        }
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def log_activity_view(request):
    """
    POST: Record user client action or visit event.
    """
    module = request.data.get("module")
    activity_type = request.data.get("activity_type")
    description = request.data.get("description")
    status_val = request.data.get("status", "success")
    metadata = request.data.get("metadata", {})

    if not module or not activity_type or not description:
        raise BadRequest("Parameters 'module', 'activity_type', and 'description' are required.")

    log_user_activity(
        user=request.user,
        module=module,
        activity_type=activity_type,
        description=description,
        status=status_val,
        metadata=metadata
    )

    return Response({"success": True})






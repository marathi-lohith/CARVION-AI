import logging
import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.recommendations.serializers import JobSearchSerializer, CourseSearchSerializer
from apps.recommendations.services.job_api_client import fetch_jobs_from_jsearch, get_gemini_fallback_jobs, JSearchAuthenticationError
from apps.recommendations.services.course_api_client import fetch_courses_from_youtube, get_fallback_courses
from apps.recommendations.services.cache_manager import (
    get_cached_jobs, save_jobs_to_cache,
    get_cached_courses, save_courses_to_cache,
    get_cached_ai, save_ai_to_cache
)
from apps.recommendations.services.recommendation_engine import get_recommendations_for_user
from common.gemini_client import get_gemini_client
from google.genai import errors

logger = logging.getLogger("carvion.api")

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def recommend_jobs_view(request):
    """
    POST/GET: Retrieve job recommendations matching a query.
    Auto-resolves query using centralized Recommendation Engine when no query is provided.
    Includes role determination, scoring, pagination, and location resolution.
    """
    from apps.profiles.models import Profile
    from apps.resumes.models import Resume
    from apps.recommendations.services.recommendation_engine import recommend_jobs, generate_job_search_query, get_recommendations_for_user, get_user_profile_state

    params = request.query_params.copy() if request.method == "GET" else request.data.copy()

    # Load unified user recommendations metadata
    rec_data = get_recommendations_for_user(request.user)

    # 1. Resolve Location Preference
    location = (params.get("location") or "").strip()
    if not location:
        location = rec_data.get("profile_location") or ""
    if not location:
        location = "Remote"

    # 2. Resolve Query Roles
    query = (params.get("query") or "").strip()
    is_auto = not query

    # Page parameter
    try:
        page = int(params.get("page", 1))
    except (ValueError, TypeError):
        page = 1

    # Fetch User documents for change-sensitive hashing
    profile = Profile.objects(user=request.user).first()
    resume = Resume.objects(user=request.user, is_primary=True).first()
    if not resume:
        resume = Resume.objects(user=request.user).order_by("-created_at").first()

    profile_updated = profile.updated_at.timestamp() if profile else 0
    resume_updated = resume.updated_at.timestamp() if resume else 0
    update_hash = int(profile_updated + resume_updated)

    if is_auto:
        query_key = f"jobs_auto_{request.user.id}_{update_hash}_{location.lower()}"
    else:
        query_key = f"jobs_manual_{query.replace(' ', '_').lower()}_{location.lower()}"

    # 1. Check cache
    cached_payload, is_expired = get_cached_jobs(query_key, allow_expired=True)
    if cached_payload:
        # Cache Validation: check if profile state changed
        state = get_user_profile_state(request.user)
        cache_role = cached_payload.get("target_role")
        cache_resume_hash = cached_payload.get("resume_skill_hash")
        cache_inventory_hash = cached_payload.get("inventory_skill_hash")
        cache_missing_hash = cached_payload.get("missing_skill_hash")
        
        if (cache_role == state["target_role"] and 
            cache_resume_hash == state["resume_skill_hash"] and 
            cache_inventory_hash == state["inventory_skill_hash"] and 
            cache_missing_hash == state["missing_skill_hash"]):
            
            full_list = cached_payload.get("data", [])
            
            # If expired, trigger background refresh
            if is_expired:
                logger.info("Job recommendations cache expired. Refreshing in background.")
                def refresh_jobs():
                    try:
                        fresh_list = recommend_jobs(request.user, query=query or None, location=location, page=page)
                        if fresh_list:
                            state_now = get_user_profile_state(request.user)
                            new_cache = {
                                "target_role": state_now["target_role"],
                                "resume_skill_hash": state_now["resume_skill_hash"],
                                "inventory_skill_hash": state_now["inventory_skill_hash"],
                                "missing_skill_hash": state_now["missing_skill_hash"],
                                "data": fresh_list
                            }
                            save_jobs_to_cache(query_key, new_cache, expiry_hours=24)
                    except Exception as e:
                        logger.error("Background jobs refresh failed: %s", str(e))
                
                import threading
                threading.Thread(target=refresh_jobs, daemon=True).start()
        else:
            logger.info("Cache state invalidated for jobs. Fetching fresh results.")
            from apps.recommendations.models import JobCache
            JobCache.objects(query=query_key).delete()
            cached_payload = None

    if not cached_payload:
        logger.info("Cache MISS for jobs query key '%s'", query_key)
        try:
            full_list = recommend_jobs(request.user, query=query or None, location=location, page=page)
        except JSearchAuthenticationError as auth_exc:
            logger.error("JSearch authentication/subscription failed: %s", str(auth_exc))
            return Response({
                "success": False,
                "error": {
                    "message": f"Authentication or subscription error with JSearch API: {str(auth_exc)}",
                    "code": "JSearchAuthenticationError"
                }
            }, status=status.HTTP_403_FORBIDDEN)

        # Save complete list to cache along with profile hashes
        if full_list:
            state = get_user_profile_state(request.user)
            cache_data = {
                "target_role": state["target_role"],
                "resume_skill_hash": state["resume_skill_hash"],
                "inventory_skill_hash": state["inventory_skill_hash"],
                "missing_skill_hash": state["missing_skill_hash"],
                "data": full_list
            }
            save_jobs_to_cache(query_key, cache_data, expiry_hours=24)

    # Paginate sliced response
    page_size = 10
    start = (page - 1) * page_size
    end = start + page_size
    paginated_data = full_list[start:end]

    # Resolve search query label
    if is_auto:
        query_label = generate_job_search_query(request.user)
    else:
        query_label = query
        from common.utils import log_user_activity
        log_user_activity(request.user, "jobs", "job_search", f"Searched for jobs: '{query}' in '{location}'", metadata={"query": query, "location": location})

    return Response({
        "success": True,
        "data": paginated_data,
        "query": query_label,
        "location": location,
        "cached": bool(cached_payload),
        "total_count": len(full_list)
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def recommend_courses_view(request):
    """
    POST/GET: Retrieve learning course recommendations.
    Uses centralized Recommendation Engine to automatically suggest courses when query is empty.
    """
    from apps.profiles.models import Profile
    from apps.resumes.models import Resume
    from apps.recommendations.services.recommendation_engine import recommend_courses, generate_course_search_query, get_user_profile_state

    params = request.query_params.copy() if request.method == "GET" else request.data.copy()

    serializer = CourseSearchSerializer(data=params)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Invalid course search parameters.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    raw_query = serializer.validated_data.get("query") or ""
    query = raw_query.lower().strip()
    is_auto = not query

    # Document update hash for caching
    profile = Profile.objects(user=request.user).first()
    resume = Resume.objects(user=request.user, is_primary=True).first()
    if not resume:
        resume = Resume.objects(user=request.user).order_by("-created_at").first()

    profile_updated = profile.updated_at.timestamp() if profile else 0
    resume_updated = resume.updated_at.timestamp() if resume else 0
    update_hash = int(profile_updated + resume_updated)

    if is_auto:
        query_key = f"courses_auto_{request.user.id}_{update_hash}"
    else:
        query_key = f"courses_manual_{query.replace(' ', '_')[:80]}"

    cached_payload, is_expired = get_cached_courses(query_key, allow_expired=True)
    if cached_payload:
        # Cache Validation: check if profile state changed
        state = get_user_profile_state(request.user)
        cache_role = cached_payload.get("target_role")
        cache_resume_hash = cached_payload.get("resume_skill_hash")
        cache_inventory_hash = cached_payload.get("inventory_skill_hash")
        cache_missing_hash = cached_payload.get("missing_skill_hash")
        
        if (cache_role == state["target_role"] and 
            cache_resume_hash == state["resume_skill_hash"] and 
            cache_inventory_hash == state["inventory_skill_hash"] and 
            cache_missing_hash == state["missing_skill_hash"]):
            
            if is_auto:
                query_label = generate_course_search_query(request.user)
            else:
                query_label = query

            # If expired, trigger background refresh
            if is_expired:
                logger.info("Course recommendations cache expired. Refreshing in background.")
                def refresh_courses():
                    try:
                        fresh_courses = recommend_courses(request.user, query=query or None)
                        if fresh_courses:
                            state_now = get_user_profile_state(request.user)
                            new_cache = {
                                "target_role": state_now["target_role"],
                                "resume_skill_hash": state_now["resume_skill_hash"],
                                "inventory_skill_hash": state_now["inventory_skill_hash"],
                                "missing_skill_hash": state_now["missing_skill_hash"],
                                "items": fresh_courses
                            }
                            save_courses_to_cache(query_key, new_cache, expiry_days=7)
                    except Exception as e:
                        logger.error("Background courses refresh failed: %s", str(e))
                
                import threading
                threading.Thread(target=refresh_courses, daemon=True).start()

            return Response({
                "success": True,
                "data": cached_payload.get("items", []),
                "query": query_label,
                "cached": True,
                "refreshing": is_expired
            })
        else:
            logger.info("Cache state invalidated for courses. Fetching fresh results.")
            from apps.recommendations.models import CourseCache
            CourseCache.objects(query=query_key).delete()
            cached_payload = None

    all_courses = recommend_courses(request.user, query=query or None)

    # Cache results along with profile hashes
    state = get_user_profile_state(request.user)
    cache_data = {
        "target_role": state["target_role"],
        "resume_skill_hash": state["resume_skill_hash"],
        "inventory_skill_hash": state["inventory_skill_hash"],
        "missing_skill_hash": state["missing_skill_hash"],
        "items": all_courses
    }
    save_courses_to_cache(query_key, cache_data, expiry_days=7)

    # Resolve search query label
    if is_auto:
        query_label = generate_course_search_query(request.user)
    else:
        query_label = query
        from common.utils import log_user_activity
        log_user_activity(request.user, "learning", "course_search", f"Searched for courses: '{query}'", metadata={"query": query})

    return Response({
        "success": True,
        "data": all_courses,
        "query": query_label,
        "cached": False
    })


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def saved_jobs_view(request):
    """
    GET: List all user's bookmarked jobs.
    POST: Save a job bookmark.
    DELETE: Unsave/remove a job bookmark.
    """
    from apps.recommendations.models import SavedJob
    from apps.recommendations.serializers import SavedJobSerializer
    import datetime

    if request.method == "GET":
        saved = SavedJob.objects(user=request.user, is_deleted=False).order_by("-created_at")
        serializer = SavedJobSerializer(saved, many=True)
        return Response({"success": True, "data": serializer.data})

    elif request.method == "POST":
        serializer = SavedJobSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "error": {
                    "message": "Invalid parameters.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        job_id = serializer.validated_data["job_id"]
        existing = SavedJob.objects(user=request.user, job_id=job_id).first()
        if existing:
            if existing.is_deleted:
                from common.soft_delete_service import restore
                restore(existing)
            return Response({"success": True, "data": SavedJobSerializer(existing).data})

        saved_job = SavedJob(
            user=request.user,
            job_id=job_id,
            title=serializer.validated_data["title"],
            company=serializer.validated_data["company"],
            location=serializer.validated_data.get("location", "Remote"),
            description=serializer.validated_data.get("description", ""),
            url=serializer.validated_data.get("url", "")
        )
        saved_job.save()
        
        from common.utils import log_user_activity
        log_user_activity(request.user, "jobs", "job_save", f"Saved job listing: {saved_job.title} at {saved_job.company}", metadata={"job_id": job_id, "title": saved_job.title, "company": saved_job.company})

        return Response({"success": True, "data": SavedJobSerializer(saved_job).data}, status=status.HTTP_201_CREATED)

    elif request.method == "DELETE":
        job_id = request.data.get("job_id") or request.query_params.get("job_id")
        if not job_id:
            return Response({"success": False, "error": {"message": "job_id is required."}}, status=status.HTTP_400_BAD_REQUEST)

        job = SavedJob.objects(user=request.user, job_id=job_id, is_deleted=False).first()
        if job:
            from common.utils import log_user_activity
            log_user_activity(request.user, "jobs", "job_unsave", f"Unsaved job listing: {job.title} at {job.company}", metadata={"job_id": job_id, "title": job.title, "company": job.company})
            from common.soft_delete_service import soft_delete
            soft_delete(job, request.user)

        return Response({"success": True})


@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def job_applications_view(request):
    """
    GET: List all user's job applications.
    POST: Track a new job application.
    PUT: Update application status or notes.
    DELETE: Delete application record.
    """
    from apps.recommendations.models import JobApplication
    from apps.recommendations.serializers import JobApplicationSerializer
    import datetime

    if request.method == "GET":
        apps = JobApplication.objects(user=request.user, is_deleted=False).order_by("-applied_at")
        serializer = JobApplicationSerializer(apps, many=True)
        return Response({"success": True, "data": serializer.data})

    elif request.method == "POST":
        serializer = JobApplicationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "error": {
                    "message": "Invalid parameters.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        job_id = serializer.validated_data["job_id"]
        app = JobApplication.objects(user=request.user, job_id=job_id).first()
        if app:
            if app.is_deleted:
                from common.soft_delete_service import restore
                restore(app)
        else:
            app = JobApplication(
                user=request.user,
                job_id=job_id,
                title=serializer.validated_data["title"],
                company=serializer.validated_data["company"],
                location=serializer.validated_data.get("location", "Remote")
            )
        app.status = serializer.validated_data.get("status", "Applied")
        app.notes = serializer.validated_data.get("notes", "")
        app.updated_at = datetime.datetime.utcnow()
        app.save()

        from common.utils import log_user_activity
        log_user_activity(request.user, "jobs", "job_applied", f"Applied to job: {app.title} at {app.company}", metadata={"job_id": job_id, "title": app.title, "company": app.company, "status": app.status})

        return Response({"success": True, "data": JobApplicationSerializer(app).data})

    elif request.method == "PUT":
        app_id = request.data.get("id") or request.data.get("job_id")
        if not app_id:
            return Response({"success": False, "error": {"message": "id/job_id is required."}}, status=status.HTTP_400_BAD_REQUEST)

        app = JobApplication.objects(user=request.user, job_id=app_id, is_deleted=False).first()
        if not app:
            try:
                app = JobApplication.objects(user=request.user, id=app_id, is_deleted=False).first()
            except Exception:
                app = None
        if not app:
            return Response({"success": False, "error": {"message": "Application record not found."}}, status=status.HTTP_404_NOT_FOUND)

        if "status" in request.data:
            app.status = request.data["status"]
        if "notes" in request.data:
            app.notes = request.data["notes"]
        app.updated_at = datetime.datetime.utcnow()
        app.save()

        from common.utils import log_user_activity
        log_user_activity(request.user, "jobs", "job_app_status_update", f"Updated job application status to '{app.status}' for {app.title} at {app.company}", metadata={"job_id": app.job_id, "title": app.title, "company": app.company, "status": app.status})

        return Response({"success": True, "data": JobApplicationSerializer(app).data})

    elif request.method == "DELETE":
        job_id = request.data.get("job_id") or request.query_params.get("job_id")
        if not job_id:
            return Response({"success": False, "error": {"message": "job_id is required."}}, status=status.HTTP_400_BAD_REQUEST)

        app = JobApplication.objects(user=request.user, job_id=job_id, is_deleted=False).first()
        if app:
            from common.utils import log_user_activity
            log_user_activity(request.user, "jobs", "job_app_delete", f"Removed job application record: {app.title} at {app.company}", metadata={"job_id": job_id, "title": app.title, "company": app.company})
            from common.soft_delete_service import soft_delete
            soft_delete(app, request.user)

        return Response({"success": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def career_insights_view(request):
    """
    GET: Generates salary ranges, hiring demand trends, and in-demand skills via Gemini.
    """
    from apps.profiles.models import Profile
    from apps.recommendations.services.recommendation_engine import get_user_profile_state
    from apps.recommendations.services.cache_manager import get_cached_ai, save_ai_to_cache
    import json
    import threading

    profile = Profile.objects(user=request.user).first()
    rec_data = get_recommendations_for_user(request.user)

    # Always use Profile Target Role as the single source of truth for automatic insights.
    # Career Roadmap must NOT influence automatic Career Insights.
    target_role = (profile.target_role if profile and profile.target_role else "Software Engineer")
    ats_score = rec_data.get("ats_score", 0)
    resume_skills = rec_data.get("resume_skills") or []
    missing_keywords = rec_data.get("missing_skills") or []

    progress = rec_data.get("learning_progress") or {}
    completed_milestones = progress.get("completed_milestones", 0)
    total_milestones = progress.get("total_milestones", 0)
    learning_progress = f"{completed_milestones}/{total_milestones} milestones completed" if total_milestones else "No active roadmap progress"

    state = get_user_profile_state(request.user)
    version_hash = f"{state.get('resume_skill_hash', '')}::{state.get('inventory_skill_hash', '')}::{state.get('missing_skill_hash', '')}"

    cache_key = f"career_insights_{request.user.id}_{target_role.replace(' ', '_').lower()}"

    fallback_data = {
        "target_role": target_role,
        "ats_score": ats_score,
        "salary_prediction": "$95,000 - $145,000",
        "hiring_trend": "High",
        "hiring_trend_comment": "Steady demand for certified cloud and full-stack engineering specialists.",
        "skill_demand": ["TypeScript", "Docker", "Python/Django", "AWS", "System Design"],
        "future_growth": "+21% estimated growth over next 5 years",
        "ai_suggestions": [
            "Integrate missing cloud infrastructure tokens (Docker, AWS) into your experience summaries.",
            "Quantify your career milestones: replace generic tasks with concrete impact metrics.",
            "Complete active milestones on your career roadmap to keep your skill gap index minimized."
        ],
        "top_companies": ["Stripe", "HubSpot", "Airbnb", "Vercel"],
        "required_certifications": ["AWS Certified Developer", "Docker Certified Associate", "Certified ScrumMaster"]
    }

    # Background regeneration task
    def generate_and_cache():
        try:
            client = get_gemini_client()
            if not client:
                save_ai_to_cache(cache_key, request.user, fallback_data, expiry_seconds=86400, version_hash=version_hash)
                return

            skills_str = ", ".join(resume_skills) if resume_skills else "None specified"
            missing_str = ", ".join(missing_keywords) if missing_keywords else "None specified"

            prompt = f"""
            You are a seasoned Tech Career Analyst and Executive Coach.
            Generate current market insights, salary forecasts, hiring demand trends, and actionable growth steps for this profile:
            Target Role: {target_role}
            User Resume Skills: {skills_str}
            User Gaps/Missing Skills: {missing_str}
            ATS Quality Score: {ats_score}%
            Current Learning Roadmap Progress: {learning_progress}

            You MUST return a strictly formatted JSON document with these exact keys:
            {{
                "target_role": "{target_role}",
                "ats_score": {ats_score},
                "salary_prediction": "<annual salary forecast based on skills and role, e.g. $115,000 - $140,000>",
                "hiring_trend": "<High, Medium, or Low>",
                "hiring_trend_comment": "<brief 1-sentence explanation of current hiring volume for this role>",
                "skill_demand": [<list of 5 in-demand technical skills for this role>],
                "future_growth": "<estimated annual market growth percentage, e.g. 15% YoY or +22% by 2030>",
                "ai_suggestions": [<list of 3 personalized growth steps to raise ATS match score>],
                "top_companies": [<list of 4 real top tech companies hiring for this role>],
                "required_certifications": [<list of 3 highly valued certifications or courses for this role>]
            }}
            Do not wrap the JSON output inside markdown formatting or code blocks. Return only the raw JSON.
            """
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            if response and response.text:
                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()
                parsed = json.loads(raw_text)
                save_ai_to_cache(cache_key, request.user, parsed, expiry_seconds=86400, version_hash=version_hash)
        except Exception as exc:
            logger.error("Background insights generation failed: %s", str(exc))

    cached_entry = get_cached_ai(cache_key)
    if cached_entry and cached_entry["version_hash"] == version_hash:
        if cached_entry["is_expired"]:
            # Stale cache: return immediately and refresh in background
            logger.info("Career Insights cache is expired. Triggering background refresh.")
            threading.Thread(target=generate_and_cache, daemon=True).start()
            return Response({
                "success": True, 
                "data": cached_entry["payload"], 
                "cached": True, 
                "refreshing": True,
                "generated_at": cached_entry["created_at"].isoformat() + "Z",
                "expires_at": cached_entry["expires_at"].isoformat() + "Z"
            })
        else:
            # Fresh cache: return immediately
            return Response({
                "success": True, 
                "data": cached_entry["payload"], 
                "cached": True, 
                "refreshing": False,
                "generated_at": cached_entry["created_at"].isoformat() + "Z",
                "expires_at": cached_entry["expires_at"].isoformat() + "Z"
            })

    # Cache miss or version mismatch: run synchronously
    logger.info("Career Insights cache miss. Generating synchronously.")
    generate_and_cache()
    
    # Reload from cache to return the updated record
    new_cached = get_cached_ai(cache_key)
    if new_cached:
        return Response({
            "success": True, 
            "data": new_cached["payload"], 
            "cached": False, 
            "refreshing": False,
            "generated_at": new_cached["created_at"].isoformat() + "Z",
            "expires_at": new_cached["expires_at"].isoformat() + "Z"
        })
        
    return Response({"success": True, "data": fallback_data, "cached": False, "refreshing": False})



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def career_insights_for_role_view(request):
    """
    POST: Generate AI career insights for any specific role provided by user.
    Body: { "target_role": "Data Scientist" }
    """
    import json
    from apps.recommendations.models import CareerInsightHistory, increment_lifetime_stat

    target_role = (request.data.get("target_role") or "").strip()
    if not target_role:
        return Response(
            {"success": False, "error": {"message": "target_role is required.", "code": "ValidationError"}},
            status=status.HTTP_400_BAD_REQUEST
        )

    fallback_data = {
        "target_role": target_role,
        "salary_prediction": "$90,000 - $140,000",
        "hiring_trend": "High",
        "hiring_trend_comment": f"Strong and growing demand for {target_role} professionals globally.",
        "skill_demand": ["Python", "Machine Learning", "SQL", "Data Visualization", "Cloud Platforms"],
        "future_growth": "+20% estimated growth over next 5 years",
        "ai_suggestions": [
            f"Build a portfolio of real-world {target_role} projects on GitHub.",
            "Earn at least one industry-recognized certification in your primary skill area.",
            "Contribute to open-source projects and document your problem-solving approach."
        ],
        "top_companies": ["Google", "Amazon", "Microsoft", "Meta"],
        "required_certifications": ["Google Professional Certificate", "AWS Machine Learning Specialty", "Coursera Deep Learning Specialization"]
    }

    def _save_to_history(insight_data):
        try:
            history_item = CareerInsightHistory(
                user=request.user,
                searched_role=target_role,
                generated_insight=insight_data
            )
            history_item.save()
            increment_lifetime_stat("total_career_insights_generated")
        except Exception as exc:
            logger.exception("Failed to automatically save career insight history: %s", str(exc))

    client = get_gemini_client()
    if not client:
        _save_to_history(fallback_data)
        return Response({"success": True, "data": fallback_data})

    try:
        prompt = f"""
        You are a seasoned Tech Career Analyst and Executive Coach.
        Generate current market insights, salary forecasts, hiring demand trends, and actionable growth steps for the following target role:
        Target Role: {target_role}

        You MUST return a strictly formatted JSON document with these exact keys:
        {{
            "target_role": "{target_role}",
            "salary_prediction": "<annual salary forecast based on role, e.g. $115,000 - $140,000>",
            "hiring_trend": "<High, Medium, or Low>",
            "hiring_trend_comment": "<brief 1-sentence explanation of current hiring volume for this role>",
            "skill_demand": [<list of 5 in-demand technical skills for this role>],
            "future_growth": "<estimated annual market growth percentage, e.g. 15% YoY or +22% by 2030>",
            "ai_suggestions": [<list of 3 actionable growth steps to break into or advance in this role>],
            "top_companies": [<list of 4 real top tech companies hiring for this role>],
            "required_certifications": [<list of 3 highly valued certifications or courses for this role>]
        }}
        Do not wrap the JSON output inside markdown formatting or code blocks. Return only the raw JSON.
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
        _save_to_history(parsed)
        return Response({"success": True, "data": parsed})
    except errors.APIError as exc:
        logger.error("Gemini API error during role insights generation (code %s): %s", exc.code, exc.message)
        _save_to_history(fallback_data)
        return Response({"success": True, "data": fallback_data})
    except Exception as exc:
        logger.exception("Gemini role insights generation failed: %s", str(exc))
        _save_to_history(fallback_data)
        return Response({"success": True, "data": fallback_data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def career_insights_history_view(request):
    """GET: Retrieve career insights generation history for the user."""
    from apps.recommendations.models import CareerInsightHistory
    from apps.recommendations.serializers import CareerInsightHistorySerializer
    history = CareerInsightHistory.objects(user=request.user, is_deleted=False).order_by("-created_at")
    serializer = CareerInsightHistorySerializer(history, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def career_insight_delete_view(request, insight_id):
    """DELETE: Delete individual career insight history item."""
    from apps.recommendations.models import CareerInsightHistory
    from bson import ObjectId
    try:
        if not ObjectId.is_valid(insight_id):
            return Response({"success": False, "error": {"message": "Invalid career insight ID."}}, status=status.HTTP_400_BAD_REQUEST)
        item = CareerInsightHistory.objects.get(id=insight_id, user=request.user, is_deleted=False)
        from common.soft_delete_service import soft_delete
        soft_delete(item, request.user)
        return Response({"success": True, "message": "Career insight deleted from history."})
    except CareerInsightHistory.DoesNotExist:
        return Response({"success": False, "error": {"message": "Career insight record not found."}}, status=status.HTTP_404_NOT_FOUND)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def career_insight_delete_all_view(request):
    """DELETE: Delete all career insight history items for the user."""
    from apps.recommendations.models import CareerInsightHistory
    from common.soft_delete_service import soft_delete
    items = CareerInsightHistory.objects(user=request.user, is_deleted=False)
    for item in items:
        soft_delete(item, request.user)
    return Response({"success": True, "message": "All career insight history deleted."})


@api_view(["GET"])
@permission_classes([])
def platform_stats_view(request):
    """
    GET: Retrieve live platform statistics (aggregated counts from database collections).
    """
    from apps.authentication.models import User
    from apps.resumes.models import Resume
    from apps.recommendations.models import PlatformStatsCounter, ensure_platform_stats_initialized
    
    try:
        registered_users = User.objects.count()
        
        # Ensure stats are initialized
        ensure_platform_stats_initialized()
        
        # Fetch the lifetime statistics from the counters collection
        stats_doc = PlatformStatsCounter.objects.first()
        
        resume_analyses = stats_doc.total_resume_uploads if stats_doc else 0
        ats_reports_generated = stats_doc.total_ats_reports_generated if stats_doc else 0
        career_insights_generated = stats_doc.total_career_insights_generated if stats_doc else 0
        ai_interview_sessions = stats_doc.total_interviews_completed if stats_doc else 0
        cover_letters_generated = stats_doc.total_cover_letters_generated if stats_doc else 0
        learning_roadmaps = stats_doc.total_learning_roadmaps if stats_doc else 0
        
        # Calculate Average ATS Score (from current active resume data)
        avg_ats_score = 0
        current_resumes_count = Resume.objects(is_deleted=False).count()
        if current_resumes_count > 0:
            total_score = Resume.objects(is_deleted=False).sum('ats_score')
            avg_ats_score = round(total_score / current_resumes_count)
            
        data = {
            "registered_users": registered_users,
            "resume_analyses": resume_analyses,
            "ats_reports_generated": ats_reports_generated,
            "career_insights_generated": career_insights_generated,
            "ai_interview_sessions": ai_interview_sessions,
            "cover_letters_generated": cover_letters_generated,
            "learning_roadmaps": learning_roadmaps,
            "avg_ats_score": avg_ats_score,
        }
        return Response({"success": True, "data": data})
    except Exception as e:
        import logging
        logger = logging.getLogger("carvion.api")
        logger.error(f"Failed to fetch platform stats: {str(e)}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_saved_courses_view(request):
    """
    GET: Retrieve all user's bookmarked courses.
    """
    from apps.recommendations.models import SavedCourse
    from apps.recommendations.serializers import SavedCourseSerializer

    saved = SavedCourse.objects(user=request.user, is_deleted=False).order_by("-created_at")
    serializer = SavedCourseSerializer(saved, many=True)
    return Response({"success": True, "data": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_course_view(request):
    """
    POST: Save a course bookmark.
    """
    from apps.recommendations.models import SavedCourse
    from apps.recommendations.serializers import SavedCourseSerializer

    serializer = SavedCourseSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "error": {
                "message": "Invalid parameters.",
                "code": "ValidationError",
                "details": serializer.errors
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    course_id = serializer.validated_data["course_id"]
    existing = SavedCourse.objects(user=request.user, course_id=course_id).first()
    if existing:
        if existing.is_deleted:
            from common.soft_delete_service import restore
            restore(existing)
        return Response({"success": True, "data": SavedCourseSerializer(existing).data})

    saved_course = SavedCourse(
        user=request.user,
        course_id=course_id,
        title=serializer.validated_data["title"],
        provider=serializer.validated_data.get("provider", ""),
        description=serializer.validated_data.get("description", ""),
        thumbnail=serializer.validated_data.get("thumbnail", ""),
        url=serializer.validated_data.get("url", "")
    )
    saved_course.save()

    from common.utils import log_user_activity
    log_user_activity(request.user, "learning", "course_save", f"Saved course: {saved_course.title}", metadata={"course_id": course_id, "title": saved_course.title})

    return Response({"success": True, "data": SavedCourseSerializer(saved_course).data}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_saved_course_view(request, pk):
    """
    DELETE: Unsave/remove a course bookmark by database ID.
    """
    from apps.recommendations.models import SavedCourse
    from mongoengine.errors import ValidationError
    from rest_framework.exceptions import NotFound

    try:
        saved_course = SavedCourse.objects(user=request.user, id=pk, is_deleted=False).first()
    except ValidationError:
        raise NotFound("Saved course not found.")

    if not saved_course:
        raise NotFound("Saved course not found.")

    from common.utils import log_user_activity
    log_user_activity(request.user, "learning", "course_unsave", f"Unsaved course: {saved_course.title}", metadata={"course_id": saved_course.course_id, "title": saved_course.title})

    from common.soft_delete_service import soft_delete
    soft_delete(saved_course, request.user)
    return Response({"success": True, "message": "Course removed from saved courses."})



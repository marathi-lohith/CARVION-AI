import logging
import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from apps.authentication.models import User
from apps.admin.services import get_admin_telemetry, clear_expired_collections
from apps.admin.serializers import AdminTelemetrySerializer, AdminUserStatusSerializer, AdminUserSerializer
from common.permissions import IsAdminUser
from common.exceptions import BadRequest, NotFound

logger = logging.getLogger("carvion.api")

from common.utils import log_user_activity

@api_view(["GET"])
@permission_classes([IsAdminUser])
def telemetry_view(request):
    """
    GET: Fetch global platform health status and telemetry estimates.
    """
    try:
        telemetry = get_admin_telemetry()
        return Response({
            "success": True,
            "data": telemetry
        })
    except Exception as exc:
        logger.error("Error retrieving telemetry: %s", str(exc))
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Could not retrieve system telemetry details.",
                    "code": "TelemetryError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([IsAdminUser])
def clear_cache_view(request):
    """
    POST: Force purge database-level job and course recommendation cache tables.
    """
    try:
        results = clear_expired_collections()
        log_user_activity(request.user, "admin", "settings_change", f"Purged Job & Course recommendation caches (deleted: {results})", "success")
        return Response({
            "success": True,
            "data": {
                "message": "Collections purged successfully.",
                "deleted": results
            }
        })
    except Exception as exc:
        logger.error("Error purging system cache: %s", str(exc))
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Could not clear recommended cache collections.",
                    "code": "CachePurgeError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def user_list_view(request):
    """
    GET: Retrieve standard system users with advanced search, filtering, and sorting.
    """
    try:
        search_query = request.query_params.get("search", "").strip()
        status_filter = request.query_params.get("status", "all").strip().lower()
        experience_filter = request.query_params.get("experience", "").strip()
        target_role_filter = request.query_params.get("target_role", "").strip()
        reg_date_filter = request.query_params.get("registration_date", "").strip()
        sort_by = request.query_params.get("sort", "-created_at").strip()

        from apps.profiles.models import Profile, UserActivityLog
        from apps.resumes.models import Resume
        from apps.learning.models import Roadmap
        from apps.assessments.models import Scorecard

        # Base query: standard users only
        q_user = User.objects(role="standard")

        # Status filter
        if status_filter == "active":
            q_user = q_user.filter(is_active=True)
        elif status_filter == "inactive":
            q_user = q_user.filter(is_active=False)

        # Reg date filter
        now = datetime.datetime.utcnow()
        today_start = datetime.datetime(now.year, now.month, now.day)
        if reg_date_filter == "today":
            q_user = q_user.filter(created_at__gte=today_start)
        elif reg_date_filter == "week":
            week_start = today_start - datetime.timedelta(days=7)
            q_user = q_user.filter(created_at__gte=week_start)
        elif reg_date_filter == "month":
            month_start = today_start - datetime.timedelta(days=30)
            q_user = q_user.filter(created_at__gte=month_start)

        # Search query (Name, Email, Target role, Phone, Experience, Skills)
        if search_query:
            # Match profiles
            profile_q = Profile.objects(__raw__={
                "$or": [
                    {"target_role": {"$regex": search_query, "$options": "i"}},
                    {"phone": {"$regex": search_query, "$options": "i"}},
                    {"experience_level": {"$regex": search_query, "$options": "i"}},
                    {"skills": {"$regex": search_query, "$options": "i"}}
                ]
            })
            profile_user_ids = []
            for p in profile_q:
                try:
                    if p.user:
                        profile_user_ids.append(p.user.id)
                except Exception:
                    pass

            q_user = q_user.filter(__raw__={
                "$or": [
                    {"name": {"$regex": search_query, "$options": "i"}},
                    {"email": {"$regex": search_query, "$options": "i"}},
                    {"id": {"$in": profile_user_ids}}
                ]
            })

        # Experience filter
        if experience_filter:
            profile_q = Profile.objects(experience_level__icontains=experience_filter)
            exp_user_ids = []
            for p in profile_q:
                try:
                    if p.user:
                        exp_user_ids.append(p.user.id)
                except Exception:
                    pass
            q_user = q_user.filter(id__in=exp_user_ids)

        # Target role filter
        if target_role_filter:
            profile_q = Profile.objects(target_role__icontains=target_role_filter)
            role_user_ids = []
            for p in profile_q:
                try:
                    if p.user:
                        role_user_ids.append(p.user.id)
                except Exception:
                    pass
            q_user = q_user.filter(id__in=role_user_ids)

        # Retrieve matching users
        users = q_user.order_by("-created_at")

        # Compile rich metadata
        data_list = []
        for user in users:
            try:
                profile = Profile.objects(user=user).first()
            except Exception:
                profile = None

            resumes = Resume.objects(user=user)
            resume_count = resumes.count()
            highest_ats_score = max([r.ats_score for r in resumes] or [0])

            roadmaps = Roadmap.objects(user=user)
            roadmap_status = "No Roadmap"
            if roadmaps:
                active_rm = roadmaps.filter(is_active=True).first()
                if active_rm:
                    milestones = active_rm.milestones
                    completed = sum(1 for m in milestones if m.get("is_completed", False))
                    pct = int((completed / len(milestones) * 100)) if milestones else 0
                    roadmap_status = f"{pct}% Completed"
                else:
                    roadmap_status = "Inactive Roadmap"

            scorecard_count = Scorecard.objects(user=user).count()

            last_log = UserActivityLog.objects(user=user, activity_type="login").order_by("-created_at").first()
            last_login = last_log.created_at.isoformat() if last_log and last_log.created_at else (user.created_at.isoformat() if user.created_at else None)

            profile_completion = 0
            if profile:
                filled = 0
                if profile.phone: filled += 1
                if profile.target_role: filled += 1
                if profile.location: filled += 1
                if profile.skills and len(profile.skills) > 0: filled += 1
                if profile.bio: filled += 1
                if profile.github_url: filled += 1
                if profile.linkedin_url: filled += 1
                profile_completion = int((filled / 7.0) * 100)

            data_list.append({
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "phone": profile.phone if profile else "N/A",
                "target_role": profile.target_role if (profile and profile.target_role) else "Not Specified",
                "experience": profile.experience_level if (profile and profile.experience_level) else "Not Specified",
                "skills": profile.skills if profile else [],
                "resume_count": resume_count,
                "highest_ats_score": highest_ats_score,
                "roadmap_status": roadmap_status,
                "assessment_count": scorecard_count,
                "last_login": last_login,
                "profile_completion": profile_completion
            })

        # Apply in-memory sort if requested
        if sort_by:
            reverse = sort_by.startswith("-")
            field = sort_by.lstrip("-")
            # Map standard fields
            if field == "name":
                data_list.sort(key=lambda x: x["name"].lower(), reverse=reverse)
            elif field == "email":
                data_list.sort(key=lambda x: x["email"].lower(), reverse=reverse)
            elif field == "created_at":
                data_list.sort(key=lambda x: x["created_at"] or "", reverse=reverse)
            elif field == "highest_ats_score":
                data_list.sort(key=lambda x: x["highest_ats_score"], reverse=reverse)
            elif field == "resume_count":
                data_list.sort(key=lambda x: x["resume_count"], reverse=reverse)
            elif field == "assessment_count":
                data_list.sort(key=lambda x: x["assessment_count"], reverse=reverse)

        return Response({
            "success": True,
            "data": data_list
        })
    except Exception as exc:
        logger.error("Error retrieving users list: %s", str(exc))
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Could not retrieve user directory.",
                    "code": "UserDirectoryError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAdminUser])
def user_detail_view(request, user_id):
    """
    GET: Retrieve full profile and progress details for drawer dashboard view.
    PUT/PATCH: Modify a specific user's status or role configuration parameters.
    DELETE: Permanently delete a user account from database records.
    Security: Admin accounts cannot be modified here. Only standard users.
    """
    try:
        user = User.objects.get(id=user_id)
    except (User.DoesNotExist, Exception):
        raise NotFound("The requested user record does not exist.")

    # Block any action against an admin account (including self)
    if user.role == "admin":
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Security policy violation: Administrator accounts cannot be modified through this interface.",
                    "code": "ForbiddenAction"
                }
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "GET":
        try:
            from apps.profiles.models import Profile, CustomSkillGapHistory, UserActivityLog
            from apps.resumes.models import Resume
            from apps.recommendations.models import SavedJob, JobApplication
            from apps.learning.models import Roadmap, WatchedCourse, RoadmapVideoProgress
            from apps.assessments.models import Scorecard, InterviewSession
            from apps.chatbot.models import ChatSession

            profile = Profile.objects(user=user).first()
            
            resumes = Resume.objects(user=user).order_by("-created_at")
            resumes_data = []
            primary_resume = None
            for r in resumes:
                res_data = {
                    "id": str(r.id),
                    "name": r.name,
                    "file_name": r.file_name or "Builder Document",
                    "ats_score": r.ats_score,
                    "is_primary": r.is_primary,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "analysis_report": r.analysis_report or {},
                }
                if r.is_primary:
                    primary_resume = res_data
                resumes_data.append(res_data)
            if not primary_resume and resumes_data:
                primary_resume = resumes_data[0]

            roadmaps = Roadmap.objects(user=user).order_by("-created_at")
            roadmaps_data = []
            for rm in roadmaps:
                roadmaps_data.append({
                    "id": str(rm.id),
                    "target_role": rm.target_role,
                    "is_active": rm.is_active,
                    "is_system_generated": rm.is_system_generated,
                    "milestones_count": len(rm.milestones),
                    "completed_milestones_count": sum(1 for m in rm.milestones if m.get("is_completed", False)),
                    "milestones": rm.milestones,
                    "created_at": rm.created_at.isoformat() if rm.created_at else None,
                })

            saved_jobs = SavedJob.objects(user=user).order_by("-created_at")
            saved_jobs_data = []
            for sj in saved_jobs:
                saved_jobs_data.append({
                    "id": str(sj.id),
                    "job_id": sj.job_id,
                    "title": sj.title,
                    "company": sj.company,
                    "location": sj.location,
                    "created_at": sj.created_at.isoformat() if sj.created_at else None,
                })

            apps = JobApplication.objects(user=user).order_by("-applied_at")
            apps_data = []
            for ap in apps:
                apps_data.append({
                    "id": str(ap.id),
                    "job_id": ap.job_id,
                    "title": ap.title,
                    "company": ap.company,
                    "location": ap.location,
                    "status": ap.status,
                    "applied_at": ap.applied_at.isoformat() if ap.applied_at else None,
                })

            scorecards = Scorecard.objects(user=user).order_by("-created_at")
            scorecards_data = []
            for sc in scorecards:
                scorecards_data.append({
                    "id": str(sc.id),
                    "domain": sc.domain,
                    "difficulty": sc.difficulty,
                    "category": sc.category,
                    "score": sc.score,
                    "total_questions": sc.total_questions,
                    "correct_answers": sc.correct_answers,
                    "duration": sc.duration,
                    "created_at": sc.created_at.isoformat() if sc.created_at else None,
                })

            interviews = InterviewSession.objects(user=user).order_by("-created_at")
            interviews_data = []
            for iv in interviews:
                interviews_data.append({
                    "id": str(iv.id),
                    "role": iv.role,
                    "mode": iv.mode,
                    "status": iv.status,
                    "difficulty": iv.difficulty,
                    "category": iv.category,
                    "dialog_count": len(iv.dialog),
                    "evaluation": iv.evaluation or {},
                    "created_at": iv.created_at.isoformat() if iv.created_at else None,
                })

            skill_gaps = CustomSkillGapHistory.objects(user=user).order_by("-created_at")
            skill_gaps_data = []
            for sg in skill_gaps:
                skill_gaps_data.append({
                    "id": str(sg.id),
                    "target_role": sg.target_role,
                    "experience_level": sg.experience_level,
                    "current_skills": sg.current_skills,
                    "results": sg.results or {},
                    "created_at": sg.created_at.isoformat() if sg.created_at else None,
                })

            watched_courses = WatchedCourse.objects(user=user).order_by("-created_at")
            watched_courses_data = []
            for wc in watched_courses:
                watched_courses_data.append({
                    "id": str(wc.id),
                    "course_id": wc.course_id,
                    "title": wc.title,
                    "url": wc.url,
                    "created_at": wc.created_at.isoformat() if wc.created_at else None,
                })

            video_progress = RoadmapVideoProgress.objects(user=user).order_by("-updated_at")
            video_progress_data = []
            for vp in video_progress:
                video_progress_data.append({
                    "id": str(vp.id),
                    "title": vp.title,
                    "channel": vp.channel,
                    "percentage_watched": vp.percentage_watched,
                    "completed": vp.completed,
                    "updated_at": vp.updated_at.isoformat() if vp.updated_at else None,
                })

            activity_logs = UserActivityLog.objects(user=user).order_by("-created_at")[:30]
            activity_data = []
            for log in activity_logs:
                activity_data.append({
                    "id": str(log.id),
                    "module": log.module,
                    "activity_type": log.activity_type,
                    "description": log.description,
                    "status": log.status,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                })

            profile_completion = 0
            if profile:
                filled = 0
                if profile.phone: filled += 1
                if profile.target_role: filled += 1
                if profile.location: filled += 1
                if profile.skills and len(profile.skills) > 0: filled += 1
                if profile.bio: filled += 1
                if profile.github_url: filled += 1
                if profile.linkedin_url: filled += 1
                profile_completion = int((filled / 7.0) * 100)

            career_insights = profile.auto_insights if (profile and profile.auto_insights) else {}

            payload = {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "profile": {
                    "phone": profile.phone if profile else "",
                    "target_role": profile.target_role if (profile and profile.target_role) else "Not Specified",
                    "location": profile.location if profile else "",
                    "bio": profile.bio if profile else "",
                    "skills": profile.skills if profile else [],
                    "github_url": profile.github_url if profile else "",
                    "linkedin_url": profile.linkedin_url if profile else "",
                    "experience_level": profile.experience_level if (profile and profile.experience_level) else "Not Specified",
                    "career_insights": career_insights,
                    "profile_completion": profile_completion,
                },
                "resumes": resumes_data,
                "primary_resume": primary_resume,
                "roadmaps": roadmaps_data,
                "saved_jobs": saved_jobs_data,
                "applications": apps_data,
                "scorecards": scorecards_data,
                "interviews": interviews_data,
                "skill_gaps": skill_gaps_data,
                "watched_courses": watched_courses_data,
                "video_progress": video_progress_data,
                "activity_timeline": activity_data,
            }

            return Response({
                "success": True,
                "data": payload
            })
        except Exception as exc:
            logger.error("Failed compiling complete user profile details: %s", str(exc))
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "Failed compiling complete user profile details.",
                        "code": "UserDetailCompileError"
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    if request.method == "DELETE":
        try:
            email = user.email
            user.delete()
            log_user_activity(request.user, "admin", "user_delete", f"Deleted user account: {email}", "success")
            return Response({
                "success": True,
                "data": {
                    "message": "User account permanently removed from system database files."
                }
            })
        except Exception as exc:
            logger.error("Failed to delete user ID %s: %s", user_id, str(exc))
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "Failed to delete user account due to internal database dependencies.",
                        "code": "UserDeletionError"
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # Edit attributes
    serializer = AdminUserStatusSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Invalid status validation arguments.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    validated_data = serializer.validated_data

    # Prevent promoting a standard user to admin via this endpoint
    # (admin creation must be done through dedicated admin provisioning)
    if validated_data.get("role") == "admin":
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Security policy violation: Use the admin provisioning interface to grant admin privileges.",
                    "code": "ForbiddenAction"
                }
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if "is_active" in validated_data:
        user.is_active = validated_data["is_active"]
    if "role" in validated_data:
        user.role = validated_data["role"]
    if "name" in validated_data:
        user.name = validated_data["name"]
    if "email" in validated_data:
        user.email = validated_data["email"].lower().strip()

    try:
        user.save()
        log_user_activity(request.user, "admin", "user_update", f"Updated user account status/role for {user.email}", "success")
        return Response({
            "success": True,
            "data": AdminUserSerializer(user).data
        })
    except Exception as exc:
        logger.error("Failed saving updated user details: %s", str(exc))
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Failed storing user details updates.",
                    "code": "DatabaseWriteError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def user_activity_feed_view(request):
    """
    GET: Retrieve recent activity logs for standard users.
    """
    try:
        from apps.authentication.models import User as AuthUser
        from apps.profiles.models import UserActivityLog
        standard_users = AuthUser.objects(role="standard")
        logs = UserActivityLog.objects(user__in=standard_users).order_by("-created_at")[:50]
        data = []
        for log in logs:
            data.append({
                "id": str(log.id),
                "user_name": log.user.name if log.user else "System/Deleted User",
                "user_email": log.user.email if log.user else "deleted@carvion.ai",
                "module": log.module,
                "activity_type": log.activity_type,
                "description": log.description,
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        return Response({"success": True, "data": data})
    except Exception as exc:
        logger.error("Error retrieving user activity logs: %s", str(exc))
        return Response({"success": False, "error": {"message": "Failed to retrieve user activity."}}, status=500)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_activity_feed_view(request):
    """
    GET: Retrieve recent activity logs for administrator actions.
    """
    try:
        from apps.authentication.models import User as AuthUser
        from apps.profiles.models import UserActivityLog
        admin_users = AuthUser.objects(role="admin")
        logs = UserActivityLog.objects(user__in=admin_users).order_by("-created_at")[:50]
        data = []
        for log in logs:
            data.append({
                "id": str(log.id),
                "user_name": log.user.name if log.user else "Administrator",
                "user_email": log.user.email if log.user else "admin@carvion.ai",
                "module": log.module,
                "activity_type": log.activity_type,
                "description": log.description,
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        return Response({"success": True, "data": data})
    except Exception as exc:
        logger.error("Error retrieving admin activity logs: %s", str(exc))
        return Response({"success": False, "error": {"message": "Failed to retrieve admin activity."}}, status=500)


from apps.resumes.models import Resume
from apps.recommendations.models import SavedJob, JobApplication
from apps.learning.models import Roadmap
from apps.assessments.models import MockTest, Scorecard
from apps.profiles.models import ContactMessage
from apps.notifications.models import Notification
from apps.authentication.models import RefreshToken

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_records_list_view(request, module):
    """
    GET: Retrieve listings of records for different admin dashboard modules.
    """
    try:
        search_query = request.query_params.get("search", "").strip()
        
        # Paginated response support
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("pageSize", 10))
        except ValueError:
            page = 1
            page_size = 10
            
        skip = (page - 1) * page_size
        
        data_list = []
        total_count = 0
        
        if module == "resumes":
            if search_query:
                q = Resume.objects(__raw__={
                    "$or": [
                        {"name": {"$regex": search_query, "$options": "i"}},
                        {"file_name": {"$regex": search_query, "$options": "i"}}
                    ]
                })
            else:
                q = Resume.objects()
            total_count = q.count()
            resumes = q.order_by("-created_at").skip(skip).limit(page_size)
            for r in resumes:
                try:
                    user_email = r.user.email if r.user else "Deleted User"
                except Exception:
                    user_email = "Deleted User"
                data_list.append({
                    "id": str(r.id),
                    "user_email": user_email,
                    "name": r.name,
                    "file_name": r.file_name or "Builder Document",
                    "ats_score": r.ats_score,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                })
                
        elif module == "jobs":
            if search_query:
                q = JobApplication.objects(__raw__={
                    "$or": [
                        {"title": {"$regex": search_query, "$options": "i"}},
                        {"company": {"$regex": search_query, "$options": "i"}}
                    ]
                })
            else:
                q = JobApplication.objects()
            total_count = q.count()
            apps = q.order_by("-applied_at").skip(skip).limit(page_size)
            for a in apps:
                try:
                    user_email = a.user.email if a.user else "Deleted User"
                except Exception:
                    user_email = "Deleted User"
                data_list.append({
                    "id": str(a.id),
                    "user_email": user_email,
                    "job_id": a.job_id,
                    "title": a.title,
                    "company": a.company,
                    "location": a.location,
                    "status": a.status,
                    "applied_at": a.applied_at.isoformat() if a.applied_at else None
                })
                
        elif module == "learning":
            if search_query:
                q = Roadmap.objects(target_role__icontains=search_query)
            else:
                q = Roadmap.objects()
            total_count = q.count()
            roadmaps = q.order_by("-created_at").skip(skip).limit(page_size)
            for rm in roadmaps:
                try:
                    user_email = rm.user.email if rm.user else "Deleted User"
                except Exception:
                    user_email = "Deleted User"
                data_list.append({
                    "id": str(rm.id),
                    "user_email": user_email,
                    "target_role": rm.target_role,
                    "milestones_count": len(rm.milestones),
                    "created_at": rm.created_at.isoformat() if rm.created_at else None
                })
                
        elif module == "assessments":
            if search_query:
                q = Scorecard.objects(domain__icontains=search_query)
            else:
                q = Scorecard.objects()
            total_count = q.count()
            scorecards = q.order_by("-created_at").skip(skip).limit(page_size)
            for sc in scorecards:
                try:
                    user_email = sc.user.email if sc.user else "Deleted User"
                except Exception:
                    user_email = "Deleted User"
                data_list.append({
                    "id": str(sc.id),
                    "user_email": user_email,
                    "domain": sc.domain,
                    "category": sc.category,
                    "difficulty": sc.difficulty,
                    "score": sc.score,
                    "total_questions": sc.total_questions,
                    "correct_answers": sc.correct_answers,
                    "created_at": sc.created_at.isoformat() if sc.created_at else None
                })
                
        elif module == "contact_messages":
            if search_query:
                q = ContactMessage.objects(__raw__={
                    "$or": [
                        {"name": {"$regex": search_query, "$options": "i"}},
                        {"email": {"$regex": search_query, "$options": "i"}},
                        {"subject": {"$regex": search_query, "$options": "i"}}
                    ]
                })
            else:
                q = ContactMessage.objects()
            total_count = q.count()
            messages = q.order_by("-created_at").skip(skip).limit(page_size)
            for m in messages:
                data_list.append({
                    "id": str(m.id),
                    "name": m.name,
                    "email": m.email,
                    "subject": m.subject,
                    "message": m.message,
                    "created_at": m.created_at.isoformat() if m.created_at else None
                })
                
        elif module == "notifications":
            if search_query:
                q = Notification.objects(__raw__={
                    "$or": [
                        {"title": {"$regex": search_query, "$options": "i"}},
                        {"message": {"$regex": search_query, "$options": "i"}}
                    ]
                })
            else:
                q = Notification.objects()
            total_count = q.count()
            notifs = q.order_by("-created_at").skip(skip).limit(page_size)
            for n in notifs:
                try:
                    user_email = n.user.email if n.user else "Deleted User"
                except Exception:
                    user_email = "Deleted User"
                data_list.append({
                    "id": str(n.id),
                    "user_email": user_email,
                    "type": n.type,
                    "title": n.title,
                    "message": n.message,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat() if n.created_at else None
                })
                
        elif module == "activity_logs":
            q = RefreshToken.objects()
            total_count = q.count()
            tokens = q.order_by("-created_at").skip(skip).limit(page_size)
            for t in tokens:
                try:
                    user_email = t.user.email if t.user else "Deleted User"
                except Exception:
                    user_email = "Deleted User"
                data_list.append({
                    "id": str(t.id),
                    "user_email": user_email,
                    "token_preview": (t.token[:15] + "...") if t.token else "N/A",
                    "expires_at": t.expires_at.isoformat() if t.expires_at else None,
                    "created_at": t.created_at.isoformat() if t.created_at else None
                })
                
        else:
            return Response({
                "success": False,
                "error": {
                    "message": f"Module '{module}' is not recognized.",
                    "code": "InvalidModule"
                }
            }, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({
            "success": True,
            "data": {
                "records": data_list,
                "total_count": total_count,
                "page": page,
                "page_size": page_size
            }
        })
    except Exception as exc:
        logger.error("Error retrieving records for module %s: %s", module, str(exc))
        return Response(
            {
                "success": False,
                "error": {
                    "message": f"Could not retrieve records for module {module}.",
                    "code": "RecordsRetrieveError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

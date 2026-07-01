import logging
import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.learning.models import Roadmap, LearningActivity, LearningSession, WatchedCourse, RoadmapVideoProgress
from apps.learning.serializers import RoadmapSerializer, RoadmapCreateSerializer
from apps.learning.services import generate_roadmap_with_gemini
from apps.profiles.models import Profile
from apps.resumes.models import Resume
from common.exceptions import BadRequest, NotFound
from apps.recommendations.services.recommendation_engine import get_recommendations_for_user

logger = logging.getLogger("carvion.api")

def sync_system_roadmap(user):
    """
    Helper to sync the user's AI-generated roadmap based on target role,
    resume skills, profile skill inventory, and missing skills.
    Updates the existing system roadmap if it exists, creates one if it does not,
    or deletes it if target_role is cleared.
    """
    import hashlib
    from apps.recommendations.services.recommendation_engine import get_user_profile_state

    state = get_user_profile_state(user)
    target_role = state.get("target_role") or ""
    resume_skills = state.get("resume_skills") or []
    missing_skills = state.get("missing_skills") or []

    combined_hash = hashlib.md5(
        f"{target_role}::{state.get('resume_skill_hash', '')}::{state.get('inventory_skill_hash', '')}::{state.get('missing_skill_hash', '')}".encode("utf-8")
    ).hexdigest()

    system_roadmap = Roadmap.objects(user=user, is_system_generated=True).first()

    if target_role:
        if system_roadmap:
            if system_roadmap.profile_state_hash != combined_hash:
                logger.info("Auto-generated roadmap profile state changed. Automatically updating.")
                milestones = generate_roadmap_with_gemini(target_role, resume_skills, missing_skills)
                system_roadmap.target_role = target_role
                system_roadmap.milestones = milestones
                system_roadmap.profile_state_hash = combined_hash
                system_roadmap.schema_version = 2
                system_roadmap.save()
            return system_roadmap
        else:
            logger.info("No system roadmap found for user, but role specified. Auto-generating.")
            milestones = generate_roadmap_with_gemini(target_role, resume_skills, missing_skills)
            system_roadmap = Roadmap(
                user=user,
                target_role=target_role,
                milestones=milestones,
                is_active=Roadmap.objects(user=user, is_active=True).first() is None,
                is_system_generated=True,
                profile_state_hash=combined_hash,
                schema_version=2
            )
            system_roadmap.save()
            from apps.recommendations.models import increment_lifetime_stat
            increment_lifetime_stat("total_learning_roadmaps")
            return system_roadmap
    else:
        if system_roadmap:
            logger.info("Target role cleared. Deleting system roadmap.")
            was_active = system_roadmap.is_active
            system_roadmap.delete()
            if was_active:
                next_roadmap = Roadmap.objects(user=user).first()
                if next_roadmap:
                    next_roadmap.is_active = True
                    next_roadmap.save()
        return None

def get_or_populate_milestone_videos(roadmap):
    from apps.recommendations.services.course_api_client import fetch_courses_from_youtube, get_fallback_courses
    import os

    # Run for any Guided Learning roadmap (schema_version >= 2), regardless of origin.
    # is_system_generated only means "auto-generated from profile" — it is not a
    # prerequisite for the Guided Learning feature set.
    if (roadmap.schema_version or 1) < 2:
        return
        
    total_milestones = len(roadmap.milestones)
    updated = False
    
    for idx, m in enumerate(roadmap.milestones):
        # Determine difficulty and required minimum videos count
        if idx == 0:
            difficulty = "Beginner"
            required_min = 3
        elif idx >= total_milestones - 2:
            difficulty = "Advanced"
            required_min = 6
        else:
            difficulty = "Intermediate"
            required_min = 5
            
        topics = m.get("skills", [])
        
        # Calculate target videos count based on difficulty & topics
        if difficulty == "Beginner":
            target_videos_count = min(5, max(3, len(topics)))
        elif difficulty == "Advanced":
            target_videos_count = min(10, max(6, len(topics)))
        else:
            target_videos_count = min(7, max(5, len(topics)))
            
        # Determine if this milestone uses outdated logic or schema
        is_outdated = (
            "estimated_hours" not in m or
            "videos" not in m or
            len(m.get("videos", [])) < required_min or
            "milestone_version" not in m or
            m.get("milestone_version", 1) < 2 or
            (roadmap.schema_version or 1) < 2
        )
        
        if is_outdated:
            # 1. Recalculate estimated hours using dynamic rules
            base_h = 2 if difficulty == "Beginner" else 10 if difficulty == "Advanced" else 5
            max_h = 5 if difficulty == "Beginner" else 20 if difficulty == "Advanced" else 10
            est_hours = base_h + round(len(topics) * 0.5)
            m["estimated_hours"] = max(base_h, min(max_h, est_hours))
            
            # 2. Re-populate recommended learning resources
            m_videos = []
            seen_video_ids = set()
            
            target_role = roadmap.target_role
            milestone_title = m.get("title", "")
            
            # Generate queries per topic for better coverage
            queries = []
            for t in topics:
                queries.append(f"{target_role} {milestone_title} {t} tutorial full course")
            queries.append(f"{target_role} {milestone_title} complete tutorial guide")
            
            negative_keywords = ["motivation", "meme", "funny", "news", "roadmap", "salary", "career choice", "why learn", "shorts", "trailer"]
            
            for q in queries:
                if len(m_videos) >= target_videos_count:
                    break
                payload = fetch_courses_from_youtube(q, video_duration="long")
                items = payload.get("items", [])
                
                for item in items:
                    if len(m_videos) >= target_videos_count:
                        break
                    snippet = item.get("snippet", {})
                    video_id = item.get("id", {}).get("videoId")
                    if not video_id or video_id in seen_video_ids:
                        continue
                        
                    title = snippet.get("title", "")
                    desc = snippet.get("description", "")
                    title_l = title.lower()
                    desc_l = desc.lower()
                    
                    if any(neg in title_l or neg in desc_l for neg in negative_keywords):
                        continue
                        
                    seen_video_ids.add(video_id)
                    m_videos.append({
                        "video_id": video_id,
                        "title": title,
                        "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                        "channel": snippet.get("channelTitle", ""),
                        "duration": "45:00",  # baseline fallback
                        "description": desc
                    })
                    
            if len(m_videos) < target_videos_count:
                fallback_items = get_fallback_courses(f"{target_role} {milestone_title}")
                for item in fallback_items:
                    if len(m_videos) >= target_videos_count:
                        break
                    snippet = item.get("snippet", {})
                    video_id = item.get("id", {}).get("videoId")
                    if not video_id or video_id in seen_video_ids:
                        continue
                    seen_video_ids.add(video_id)
                    m_videos.append({
                        "video_id": video_id,
                        "title": snippet.get("title", ""),
                        "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                        "channel": snippet.get("channelTitle", ""),
                        "duration": "45:00",
                        "description": snippet.get("description", "")
                    })
                    
            # Fetch real YouTube video durations for exact learning resources
            from apps.recommendations.services.course_api_client import fetch_video_durations
            video_ids = [v["video_id"] for v in m_videos]
            durations_map = fetch_video_durations(video_ids)
            for v_idx, v in enumerate(m_videos):
                vid_id = v["video_id"]
                if vid_id in durations_map:
                    v["duration"] = durations_map[vid_id]
                else:
                    # Realistic, diverse long-form fallback durations (>30 mins)
                    fallback_durs = ["45:10", "1:15:30", "2:08:45", "52:12", "1:45:00", "2:20:15", "38:40", "1:05:00", "2:40:00", "59:30"]
                    v["duration"] = fallback_durs[v_idx % len(fallback_durs)]

            m["videos"] = m_videos
            m["milestone_version"] = 2
            updated = True
            
    if updated or (roadmap.schema_version or 1) < 2:
        roadmap.schema_version = 2
        roadmap.save()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_roadmap_view(request):
    """
    GET: Retrieve user active learning roadmap.
    """
    roadmap = Roadmap.objects(user=request.user, is_active=True).first()
    if not roadmap:
        roadmap = Roadmap.objects(user=request.user).first()
        if roadmap:
            roadmap.is_active = True
            roadmap.save()
        else:
            # Safety fallback for new or uncompiled users
            sync_system_roadmap(request.user)
            roadmap = Roadmap.objects(user=request.user, is_active=True).first()

    if not roadmap:
        raise NotFound("No active roadmap found. Please specify target role to compile a path.")

    # Augment roadmap data for ALL Guided Learning roadmaps (schema_version >= 2).
    # is_system_generated only means "auto-generated from profile" — Guided Learning
    # features are enabled by schema_version, not by generation origin.
    data = RoadmapSerializer(roadmap).data

    if (roadmap.schema_version or 1) >= 2:
        # 1. Populate videos if missing (idempotent — runs in a background thread if missing/outdated)
        is_any_outdated = False
        total_milestones = len(roadmap.milestones)
        for idx, m in enumerate(roadmap.milestones):
            if idx == 0:
                required_min = 3
            elif idx >= total_milestones - 2:
                required_min = 6
            else:
                required_min = 5
            if "videos" not in m or len(m.get("videos", [])) < required_min:
                is_any_outdated = True
                break

        if is_any_outdated:
            import threading
            logger.info("Roadmap milestones are outdated/missing videos. Populating in background.")
            def bg_populate():
                try:
                    from apps.learning.models import Roadmap as BgRoadmap
                    r = BgRoadmap.objects.get(id=roadmap.id)
                    get_or_populate_milestone_videos(r)
                except Exception as e:
                    logger.error("Background roadmap video population failed: %s", str(e))
            threading.Thread(target=bg_populate, daemon=True).start()

        # Inject watch progress and sequential lock status into milestones
        from apps.learning.models import RoadmapVideoProgress

        milestones = data.get("milestones", [])
        for idx, m in enumerate(milestones):
            m_id = m.get("id")
            m_videos = m.get("videos", [])

            # Fetch user watch progress for every video in this milestone
            progress_list = RoadmapVideoProgress.objects(
                user=request.user,
                roadmap=roadmap,
                milestone_id=m_id
            )
            progress_map = {p.video_id: p for p in progress_list}

            for v in m_videos:
                vid_id = v.get("video_id")
                p = progress_map.get(vid_id)
                if p:
                    v["percentage_watched"] = p.percentage_watched
                    v["completed"] = p.completed
                    v["last_position"] = p.last_position
                    v["status"] = "Completed" if p.completed else "Watching"
                else:
                    v["percentage_watched"] = 0
                    v["completed"] = False
                    v["last_position"] = 0
                    v["status"] = "Not Started"

            # Sequential locking: a milestone is unlocked only when the
            # previous milestone is completed (first milestone is always unlocked)
            if m.get("is_completed"):
                m["status"] = "Completed"
            else:
                if idx == 0:
                    m["status"] = "In Progress"
                else:
                    prev_m = milestones[idx - 1]
                    if prev_m.get("is_completed"):
                        m["status"] = "In Progress"
                    else:
                        m["status"] = "Locked"

        data["milestones"] = milestones

    return Response({
        "success": True,
        "data": data
    })



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_roadmap_view(request):
    """
    POST: Generate and add a custom learning roadmap.
    Binds profile active skills and historical resume gaps into system instructions.
    """
    serializer = RoadmapCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Invalid roadmap parameters.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    target_role = serializer.validated_data["target_role"]

    # 1. Resolve user skills profile via centralized engine
    rec_data = get_recommendations_for_user(request.user)
    active_skills = rec_data.get("resume_skills") or []
    missing_skills = rec_data.get("missing_skills") or []

    # 2. Call Gemini compiler service
    milestones = generate_roadmap_with_gemini(target_role, active_skills, missing_skills)

    # 3. Deactivate existing roadmaps and write new document.
    #    schema_version=2 marks this as a Guided Learning roadmap so both the
    #    video-population helper and active_roadmap_view will fully enrich it.
    prev_active = Roadmap.objects(user=request.user, is_active=True).first()
    if prev_active:
        prev_active.is_active = False
        prev_active.save()

    # Just in case there are multiple, deactivate them
    Roadmap.objects(user=request.user, id__ne=prev_active.id if prev_active else None).update(set__is_active=False)

    roadmap = Roadmap(
        user=request.user,
        target_role=target_role,
        milestones=milestones,
        is_active=True,
        schema_version=2
    )
    roadmap.save()
    from apps.recommendations.models import increment_lifetime_stat
    increment_lifetime_stat("total_learning_roadmaps")

    try:
        # 4. Populate real YouTube learning resources immediately so the first
        #    response already contains the full Guided Learning payload.
        get_or_populate_milestone_videos(roadmap)
        roadmap.reload()
    except Exception as exc:
        # Revert changes: delete the new incomplete roadmap and restore the previous active one
        roadmap.delete()
        if prev_active:
            prev_active.is_active = True
            prev_active.save()
        logger.exception("Roadmap compilation failed. Reverted active roadmap settings.")
        return Response(
            {
                "success": False,
                "error": {
                    "message": f"Roadmap generation failed: {str(exc)}",
                    "code": "CompilationError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # 5. Inject watch-progress and sequential-locking status so the frontend
    #    renders the Guided Learning UI on first load without a second request.
    data = RoadmapSerializer(roadmap).data
    milestones_data = data.get("milestones", [])
    for idx, m in enumerate(milestones_data):
        m_id = m.get("id")
        m_videos = m.get("videos", [])
        for v in m_videos:
            v["percentage_watched"] = 0
            v["completed"] = False
            v["last_position"] = 0
            v["status"] = "Not Started"
        # Sequential locking: only the first milestone is unlocked on creation
        if m.get("is_completed"):
            m["status"] = "Completed"
        elif idx == 0:
            m["status"] = "In Progress"
        else:
            m["status"] = "Locked"
    data["milestones"] = milestones_data

    return Response(
        {
            "success": True,
            "data": data
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def regenerate_roadmap_view(request):
    """
    POST: Force regenerate the active system-generated career roadmap.
    """
    from apps.learning.models import Roadmap
    
    # Keep old system roadmap temporarily and rename its system flag so the build doesn't conflict
    old_system_roadmap = Roadmap.objects(user=request.user, is_system_generated=True).first()
    if old_system_roadmap:
        old_system_roadmap.is_system_generated = False
        old_system_roadmap.save()
    
    roadmap = None
    try:
        # 2. Run sync to build a new one
        roadmap = sync_system_roadmap(request.user)
        if not roadmap:
            if old_system_roadmap:
                old_system_roadmap.is_system_generated = True
                old_system_roadmap.save()
            return Response({
                "success": False,
                "error": {"message": "Please set a Target Role in your profile before generating a roadmap."}
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # 3. Populate milestones and videos
        get_or_populate_milestone_videos(roadmap)
        roadmap.reload()
        
        # Success! Delete the old system roadmap
        if old_system_roadmap:
            old_system_roadmap.delete()
    except Exception as exc:
        # Revert
        if roadmap:
            roadmap.delete()
        if old_system_roadmap:
            old_system_roadmap.is_system_generated = True
            old_system_roadmap.save()
        logger.exception("Roadmap regeneration failed. Restored previous system roadmap.")
        return Response(
            {
                "success": False,
                "error": {
                    "message": f"Roadmap regeneration failed: {str(exc)}",
                    "code": "RegenerationError"
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
    return Response({
        "success": True,
        "data": RoadmapSerializer(roadmap).data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_node_completion_view(request, node_id):
    """
    POST: Toggle the completion state of a specific node (milestone) in the active roadmap.
    Also records a milestone completion event in LearningActivity for today.
    """
    roadmap = Roadmap.objects(user=request.user, is_active=True).first()
    if not roadmap:
        roadmap = Roadmap.objects(user=request.user).first()
    if not roadmap:
        raise NotFound("No active learning roadmap found for the user.")

    # Locate and toggle specific node flag
    node_found = False
    newly_completed = False
    for node in roadmap.milestones:
        if node.get("id") == node_id:
            prev_state = node.get("is_completed", False)
            node["is_completed"] = not prev_state
            newly_completed = node["is_completed"]
            node_found = True
            break

    if not node_found:
        raise NotFound(f"Milestone node '{node_id}' not found in active roadmap.")

    # Save mutated document
    roadmap.save()

    # Track activity: increment milestones_completed for today if newly completed
    today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    activity = LearningActivity.objects(user=request.user, date=today_str).first()
    if not activity:
        activity = LearningActivity(user=request.user, date=today_str)

    if newly_completed:
        activity.milestones_completed = max(0, activity.milestones_completed + 1)
    else:
        activity.milestones_completed = max(0, activity.milestones_completed - 1)

    activity.updated_at = datetime.datetime.utcnow()
    activity.save()
    
    return Response({
        "success": True,
        "data": RoadmapSerializer(roadmap).data
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def learning_progress_view(request):
    """
    GET: Retrieve user progress analytics on active career milestones.
    """
    roadmap = Roadmap.objects(user=request.user, is_active=True).first()
    if not roadmap:
        roadmap = Roadmap.objects(user=request.user).first()

    if not roadmap or not roadmap.milestones:
        return Response({
            "success": True,
            "data": {
                "active_roadmap": "None",
                "target_role": "Not specified",
                "completed_count": 0,
                "total_count": 0,
                "percentage": 0,
                "milestones": []
            }
        })
    
    total = len(roadmap.milestones)
    completed = len([m for m in roadmap.milestones if m.get("is_completed")])
    percentage = int((completed / total) * 100) if total > 0 else 0
    
    return Response({
        "success": True,
        "data": {
            "active_roadmap": f"Roadmap for {roadmap.target_role}",
            "target_role": roadmap.target_role,
            "completed_count": completed,
            "total_count": total,
            "percentage": percentage,
            "milestones": roadmap.milestones
        }
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def roadmap_list_view(request):
    """
    GET: Retrieve all user's generated roadmaps.
    """
    sync_system_roadmap(request.user)
    roadmaps = Roadmap.objects(user=request.user).order_by("-created_at")
    return Response({
        "success": True,
        "data": RoadmapSerializer(roadmaps, many=True).data
    })



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def select_active_roadmap_view(request, roadmap_id):
    """
    POST: Set a specific roadmap as active, deactivating all others.
    """
    try:
        roadmap = Roadmap.objects.get(id=roadmap_id, user=request.user)
    except Roadmap.DoesNotExist:
        raise NotFound("Requested roadmap not found.")

    Roadmap.objects(user=request.user).update(set__is_active=False)
    roadmap.is_active = True
    roadmap.save()

    return Response({
        "success": True,
        "data": RoadmapSerializer(roadmap).data
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_roadmap_view(request, roadmap_id):
    """
    DELETE: Revoke a roadmap.
    """
    try:
        roadmap = Roadmap.objects.get(id=roadmap_id, user=request.user)
    except Roadmap.DoesNotExist:
        raise NotFound("Requested roadmap not found.")

    if roadmap.is_system_generated:
        return Response({
            "success": False,
            "error": {
                "message": "Auto-generated roadmaps cannot be deleted manually.",
                "code": "DeleteForbidden"
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    was_active = roadmap.is_active
    roadmap.delete()

    if was_active:
        next_roadmap = Roadmap.objects(user=request.user).first()
        if next_roadmap:
            next_roadmap.is_active = True
            next_roadmap.save()

    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_learning_activity_view(request):
    """
    POST: Record learning activity for today.
    Body: { "minutes": 30, "videos_watched": 2, "courses_completed": 1 }
    Used by the frontend when a user completes a course or watches a video.
    """
    minutes = max(0, int(request.data.get("minutes", 0)))
    videos_watched = max(0, int(request.data.get("videos_watched", 0)))
    courses_completed = max(0, int(request.data.get("courses_completed", 0)))

    today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    activity = LearningActivity.objects(user=request.user, date=today_str).first()
    if not activity:
        activity = LearningActivity(user=request.user, date=today_str)

    activity.minutes_studied += minutes
    activity.videos_watched += videos_watched
    activity.courses_completed += courses_completed
    activity.updated_at = datetime.datetime.utcnow()
    activity.save()

    return Response({"success": True, "data": {
        "date": today_str,
        "minutes_studied": activity.minutes_studied,
        "videos_watched": activity.videos_watched,
        "courses_completed": activity.courses_completed,
        "milestones_completed": activity.milestones_completed
    }})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def learning_analytics_view(request):
    # Fetch video learning sessions
    video_sessions = list(LearningSession.objects(user=request.user, activity_type='Video'))
    total_seconds = sum(s.duration for s in video_sessions)
    total_minutes = round(total_seconds / 60)
    total_hours = round(total_minutes / 60, 1)

    # Videos Started: count unique courses started
    unique_courses_started = {s.course_id for s in video_sessions if s.course_id}
    videos_started = len(unique_courses_started)

    # Videos Completed: count unique courses where at least 80% has been watched
    completed_video_sessions = LearningSession.objects(
        user=request.user,
        activity_type='Video',
        completion_percentage__gte=80
    )
    unique_courses_completed = {s.course_id for s in completed_video_sessions if s.course_id}
    videos_completed = len(unique_courses_completed)

    # Learning Days: unique calendar days where user watched videos (duration > 0)
    video_sessions_with_watch = LearningSession.objects(
        user=request.user,
        activity_type='Video',
        duration__gt=0
    )
    study_dates = {s.date for s in video_sessions_with_watch if s.date}
    learning_days = len(study_dates)

    # Calculate streak (consecutive days with learning activity backward from today/yesterday)
    streak = 0
    today = datetime.datetime.utcnow().date()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    
    if today_str in study_dates:
        check_date = today
    elif yesterday_str in study_dates:
        check_date = today - datetime.timedelta(days=1)
    else:
        check_date = None

    if check_date:
        while check_date.strftime("%Y-%m-%d") in study_dates:
            streak += 1
            check_date -= datetime.timedelta(days=1)

    # Helper function to get study minutes for a date
    def get_daily_minutes(date_str):
        sessions = LearningSession.objects(user=request.user, date=date_str, activity_type='Video')
        seconds = sum(s.duration for s in sessions)
        return round(seconds / 60)

    # Weekly data: last 7 days
    weekly_labels = []
    weekly_minutes = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        weekly_labels.append(day.strftime("%a"))
        weekly_minutes.append(get_daily_minutes(day_str))

    # Monthly data: last 30 days, grouped by week
    monthly_labels = []
    monthly_minutes = []
    monthly_completed = []
    for week_start_offset in range(3, -1, -1):
        week_start = today - datetime.timedelta(days=(week_start_offset * 7 + 6))
        week_end = today - datetime.timedelta(days=(week_start_offset * 7))
        monthly_labels.append(f"Wk {4 - week_start_offset}")
        
        # Convert start/end to datetime for query
        start_dt = datetime.datetime.combine(week_start, datetime.time.min)
        end_dt = datetime.datetime.combine(week_end, datetime.time.max)
        
        sessions = LearningSession.objects(
            user=request.user,
            activity_type='Video',
            start_time__gte=start_dt,
            start_time__lte=end_dt
        )
        week_total_sec = sum(s.duration for s in sessions)
        monthly_minutes.append(round(week_total_sec / 60))
        
        # Completed videos in this week
        comp_courses = {s.course_id for s in sessions if s.completion_percentage >= 80 and s.course_id}
        monthly_completed.append(len(comp_courses))

    # Daily data: last 14 days
    daily_labels = []
    daily_minutes = []
    for i in range(13, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        daily_labels.append(day.strftime("%d %b"))
        daily_minutes.append(get_daily_minutes(day_str))

    return Response({
        "success": True,
        "data": {
            "summary": {
                "total_hours": total_hours,
                "total_minutes": total_minutes,
                "videos_started": videos_started,
                "videos_completed": videos_completed,
                "learning_days": learning_days,
                "streak": streak,
            },
            "charts": {
                "daily": {"labels": daily_labels, "data": daily_minutes},
                "weekly": {"labels": weekly_labels, "data": weekly_minutes},
                "monthly": {"labels": monthly_labels, "data": monthly_minutes, "completed": monthly_completed},
            }
        }
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_learning_pulse_view(request):
    """
    POST: Track an active study pulse of a user.
    Body: { "activity_type": "Roadmap"|"Video"|"Reading"|"Practice", "course_id": "...", "duration": 30 }
    """
    activity_type = request.data.get("activity_type", "Roadmap")
    duration_seconds = max(0, int(request.data.get("duration", 30)))
    course_id = request.data.get("course_id")
    
    if activity_type not in ['Video', 'Roadmap', 'Reading', 'Practice']:
        activity_type = 'Roadmap'
        
    now = datetime.datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")
    
    # Try to find a session from the last 15 minutes to group consecutive pulses
    fifteen_mins_ago = now - datetime.timedelta(minutes=15)
    
    session = LearningSession.objects(
        user=request.user,
        activity_type=activity_type,
        course_id=course_id,
        end_time__gte=fifteen_mins_ago
    ).order_by("-end_time").first()
    
    if session:
        session.duration += duration_seconds
        session.end_time = now
        session.updated_at = now
        session.save()
    else:
        session = LearningSession(
            user=request.user,
            activity_type=activity_type,
            course_id=course_id,
            start_time=now - datetime.timedelta(seconds=duration_seconds),
            end_time=now,
            duration=duration_seconds,
            date=today_str
        )
        session.save()
        
    # Recalculate daily minutes studied and sync to LearningActivity
    total_seconds_today = sum(s.duration for s in LearningSession.objects(user=request.user, date=today_str))
    total_minutes_today = round(total_seconds_today / 60)
    
    activity = LearningActivity.objects(user=request.user, date=today_str).first()
    if not activity:
        activity = LearningActivity(user=request.user, date=today_str)
    activity.minutes_studied = total_minutes_today
    activity.updated_at = now
    activity.save()
    
    return Response({
        "success": True,
        "data": {
            "session_id": str(session.id),
            "total_minutes_today": total_minutes_today
        }
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_video_watch_view(request):
    """
    POST: Track starting a course video.
    Body: { "course_id": "...", "title": "...", "url": "..." }
    """
    from apps.learning.models import WatchedCourse
    
    course_id = request.data.get("course_id")
    title = request.data.get("title", "")
    url = request.data.get("url", "")
    
    if not course_id:
        return Response({
            "success": False,
            "error": {
                "message": "Missing course_id parameter.",
                "code": "ValidationError"
            }
        }, status=status.HTTP_400_BAD_REQUEST)
        
    now = datetime.datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")
    
    watched = WatchedCourse.objects(user=request.user, course_id=course_id).first()
    is_new = False
    if not watched:
        watched = WatchedCourse(
            user=request.user,
            course_id=course_id,
            title=title,
            url=url
        )
        watched.save()
        is_new = True
        
        # Increment lifetime counter for cover letters / videos watched?
        # Log a learning session of type 'Video' for 10 minutes (600 seconds)
        # to represent the initial watch session
        session = LearningSession(
            user=request.user,
            activity_type='Video',
            course_id=course_id,
            start_time=now - datetime.timedelta(minutes=10),
            end_time=now,
            duration=600,
            date=today_str
        )
        session.save()
        
        # Sync LearningActivity minutes
        total_seconds_today = sum(s.duration for s in LearningSession.objects(user=request.user, date=today_str))
        total_minutes_today = round(total_seconds_today / 60)
        
        activity = LearningActivity.objects(user=request.user, date=today_str).first()
        if not activity:
            activity = LearningActivity(user=request.user, date=today_str)
        activity.minutes_studied = total_minutes_today
        activity.updated_at = now
        activity.save()
        
    return Response({
        "success": True,
        "data": {
            "course_id": course_id,
            "is_new_watch": is_new
        }
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_learning_session_start_view(request):
    """
    POST: Initialize a new video watch session.
    Body: { "course_id": "...", "video_id": "...", "title": "..." }
    """
    course_id = request.data.get("course_id")
    video_id = request.data.get("video_id")
    title = request.data.get("title", "")
    
    if not course_id:
        return Response({
            "success": False,
            "error": {"message": "course_id is required", "code": "ValidationError"}
        }, status=status.HTTP_400_BAD_REQUEST)
        
    now = datetime.datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")
    
    session = LearningSession(
        user=request.user,
        activity_type='Video',
        course_id=course_id,
        course_title=title,
        video_id=video_id,
        start_time=now,
        end_time=now,
        duration=0,
        completion_percentage=0,
        date=today_str
    )
    session.save()
    
    return Response({
        "success": True,
        "data": {
            "session_id": str(session.id)
        }
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_learning_session_update_view(request):
    """
    POST: Update an active watch session duration and percentage.
    Body: { "session_id": "...", "watched_duration": 120, "completion_percentage": 45 }
    """
    session_id = request.data.get("session_id")
    watched_duration = max(0, int(request.data.get("watched_duration", 0)))  # in seconds
    completion_percentage = max(0, min(100, int(request.data.get("completion_percentage", 0))))
    
    if not session_id:
        return Response({
            "success": False,
            "error": {"message": "session_id is required", "code": "ValidationError"}
        }, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        session = LearningSession.objects.get(id=session_id, user=request.user)
    except Exception:
        return Response({
            "success": False,
            "error": {"message": "Session not found", "code": "NotFound"}
        }, status=status.HTTP_404_NOT_FOUND)
        
    now = datetime.datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")
    
    session.duration = watched_duration
    session.completion_percentage = completion_percentage
    session.end_time = now
    session.updated_at = now
    session.save()
    
    # Recalculate daily minutes studied and sync to LearningActivity
    total_seconds_today = sum(s.duration for s in LearningSession.objects(user=request.user, date=today_str))
    total_minutes_today = round(total_seconds_today / 60)
    
    activity = LearningActivity.objects(user=request.user, date=today_str).first()
    if not activity:
        activity = LearningActivity(user=request.user, date=today_str)
    activity.minutes_studied = total_minutes_today
    activity.updated_at = now
    activity.save()
    
    return Response({
        "success": True,
        "data": {
            "session_id": str(session.id),
            "total_minutes_today": total_minutes_today
        }
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def roadmap_analytics_view(request):
    """
    GET: Retrieve roadmap-only analytics overview, stats, and charts.
    """
    from apps.learning.models import Roadmap, RoadmapVideoProgress, LearningSession
    import re
    
    # 1. Resolve selected roadmap
    roadmap_id = request.query_params.get("roadmap_id")
    if roadmap_id:
        try:
            roadmap = Roadmap.objects.get(id=roadmap_id, user=request.user)
        except Exception:
            roadmap = None
    else:
        roadmap = Roadmap.objects(user=request.user, is_active=True).first()
        if not roadmap:
            roadmap = Roadmap.objects(user=request.user).first()
            
    # If no roadmap exists at all, return empty template
    if not roadmap:
        return Response({
            "success": True,
            "data": {
                "overview": {
                    "roadmap_id": "",
                    "roadmap_name": "None",
                    "target_role": "Not specified",
                    "created_date": "",
                    "status": "Inactive",
                    "total_milestones": 0,
                    "completed_milestones": 0,
                    "remaining_milestones": 0,
                    "percentage": 0
                },
                "summary": {
                    "total_hours": 0.0,
                    "total_minutes": 0,
                    "total_learning_days": 0,
                    "streak": 0,
                    "milestones_completed": 0,
                    "courses_completed": 0,
                    "completion_rate": 0
                },
                "charts": {
                    "timeline": {"labels": [], "data": []},
                    "weekly": {"labels": [], "data": []},
                    "distribution": {"completed": 0, "in_progress": 0, "remaining": 0}
                }
            }
        })
        
    # 2. Get RoadmapVideoProgress records for this specific roadmap
    progress_records = RoadmapVideoProgress.objects(user=request.user, roadmap=roadmap)
    
    # Calculate real watched time (sum of total_minutes_watched across all progress records of this roadmap)
    total_minutes = round(sum(p.total_minutes_watched for p in progress_records))
    total_hours = round(total_minutes / 60.0, 1)
    
    # 3. Calculate Total Learning Days & Streak using LearningSession watch dates for this specific roadmap
    # Find all sessions associated with this roadmap: course_id is used for roadmap_id in track_roadmap_video_progress_view
    sessions = LearningSession.objects(
        user=request.user,
        activity_type='Video',
        course_id=str(roadmap.id)
    )
    
    learning_days_dates = {s.date for s in sessions if s.date}
    total_learning_days = len(learning_days_dates)
    
    # Calculate streak from the watch dates
    streak = 0
    today = datetime.datetime.utcnow().date()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    
    if today_str in learning_days_dates:
        check_date = today
    elif yesterday_str in learning_days_dates:
        check_date = today - datetime.timedelta(days=1)
    else:
        check_date = None
        
    if check_date:
        while check_date.strftime("%Y-%m-%d") in learning_days_dates:
            streak += 1
            check_date -= datetime.timedelta(days=1)
            
    # 4. Milestone/Course Metrics
    total_m = len(roadmap.milestones) if roadmap.milestones else 0
    completed_m = len([m for m in roadmap.milestones if m.get("is_completed")]) if roadmap.milestones else 0
    remaining_m = total_m - completed_m
    completion_pct = round((completed_m / total_m) * 100) if total_m > 0 else 0
    
    milestones_completed = completed_m
    courses_completed = completed_m  # Each completed milestone counts as one completed course/module.
    completion_rate = completion_pct
    
    # 5. Charts
    # A. Progress Timeline
    completed_milestones_with_dates = []
    created_date_str = roadmap.created_at.strftime("%Y-%m-%d")
    
    if roadmap.milestones:
        for m in roadmap.milestones:
            if m.get("is_completed"):
                comp_ts = m.get("completion_timestamp")
                if comp_ts:
                    try:
                        comp_date = comp_ts.split('T')[0]
                    except Exception:
                        comp_date = created_date_str
                else:
                    comp_date = created_date_str
                completed_milestones_with_dates.append(comp_date)
                
    completed_milestones_with_dates.sort()
    
    timeline_map = {}
    for d in completed_milestones_with_dates:
        timeline_map[d] = timeline_map.get(d, 0) + 1
        
    sorted_dates = sorted(timeline_map.keys())
    timeline_labels = []
    timeline_data = []
    running_total = 0
    for d in sorted_dates:
        running_total += timeline_map[d]
        timeline_labels.append(d)
        timeline_data.append(running_total)
        
    if not timeline_labels:
        timeline_labels = [created_date_str]
        timeline_data = [0]
        
    # B. Weekly Roadmap Progress (relative to roadmap creation date, at least 4 bars)
    days_since = (today - roadmap.created_at.date()).days
    weeks_count = max(4, (days_since // 7) + 1)
    
    weekly_labels = [f"Week {w}" for w in range(1, weeks_count + 1)]
    weekly_progress = [0] * weeks_count
    
    if roadmap.milestones:
        for m in roadmap.milestones:
            if m.get("is_completed"):
                comp_ts = m.get("completion_timestamp")
                if comp_ts:
                    try:
                        comp_dt = datetime.datetime.fromisoformat(comp_ts.split('.')[0].replace('Z', ''))
                    except Exception:
                        comp_dt = roadmap.created_at
                else:
                    comp_dt = roadmap.created_at
                    
                days_diff = (comp_dt.date() - roadmap.created_at.date()).days
                week_idx = max(0, days_diff // 7)
                if week_idx < weeks_count:
                    weekly_progress[week_idx] += 1
                else:
                    weekly_progress[-1] += 1
                    
    # C. Completion Distribution
    completed_count = 0
    in_progress_count = 0
    remaining_count = 0
    
    found_in_progress = False
    if roadmap.milestones:
        for m in roadmap.milestones:
            if m.get("is_completed"):
                completed_count += 1
            else:
                if not found_in_progress:
                    in_progress_count += 1
                    found_in_progress = True
                else:
                    remaining_count += 1
                    
    distribution = {
        "completed": completed_count,
        "in_progress": in_progress_count,
        "remaining": remaining_count
    }
    
    roadmap_name = f"Roadmap for {roadmap.target_role}"
    status_str = "Completed" if (total_m > 0 and completed_m == total_m) else ("Active" if roadmap.is_active else "Inactive")
    
    return Response({
        "success": True,
        "data": {
            "overview": {
                "roadmap_id": str(roadmap.id),
                "roadmap_name": roadmap_name,
                "target_role": roadmap.target_role,
                "created_date": roadmap.created_at.strftime("%B %d, %Y"),
                "status": status_str,
                "total_milestones": total_m,
                "completed_milestones": completed_m,
                "remaining_milestones": remaining_m,
                "percentage": completion_pct
            },
            "summary": {
                "total_hours": total_hours,
                "total_minutes": total_minutes,
                "total_learning_days": total_learning_days,
                "streak": streak,
                "milestones_completed": milestones_completed,
                "courses_completed": courses_completed,
                "completion_rate": completion_rate
            },
            "charts": {
                "timeline": {"labels": timeline_labels, "data": timeline_data},
                "weekly": {"labels": weekly_labels, "data": weekly_progress},
                "distribution": distribution
            }
        }
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_roadmap_video_progress_view(request):
    """
    POST: Track watch progress of a roadmap video.
    Body: {
        "roadmap_id": "...",
        "milestone_id": "...",
        "video_id": "...",
        "duration": 600,
        "last_position": 120,
        "percentage_watched": 20,
        "watch_time_delta": 10
    }
    """
    from apps.learning.models import RoadmapVideoProgress, LearningSession
    
    roadmap_id = request.data.get("roadmap_id")
    milestone_id = request.data.get("milestone_id")
    video_id = request.data.get("video_id")
    duration = int(request.data.get("duration", 0))
    last_position = int(request.data.get("last_position", 0))
    percentage_watched = max(0, min(100, int(request.data.get("percentage_watched", 0))))
    watch_time_delta = max(0, int(request.data.get("watch_time_delta", 0)))
    
    if not all([roadmap_id, milestone_id, video_id]):
        return Response({
            "success": False,
            "error": {"message": "roadmap_id, milestone_id, and video_id are required", "code": "ValidationError"}
        }, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        roadmap = Roadmap.objects.get(id=roadmap_id, user=request.user)
    except Exception:
        return Response({
            "success": False,
            "error": {"message": "Roadmap not found", "code": "NotFound"}
        }, status=status.HTTP_404_NOT_FOUND)
        
    now = datetime.datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")
    
    # 1. Update/Create RoadmapVideoProgress
    progress = RoadmapVideoProgress.objects(
        user=request.user,
        roadmap=roadmap,
        milestone_id=milestone_id,
        video_id=video_id
    ).first()
    
    if not progress:
        title = ""
        thumbnail = ""
        channel = ""
        for m in roadmap.milestones:
            if m.get("id") == milestone_id:
                for v in m.get("videos", []):
                    if v.get("video_id") == video_id:
                        title = v.get("title", "")
                        thumbnail = v.get("thumbnail", "")
                        channel = v.get("channel", "")
                        break
                        
        progress = RoadmapVideoProgress(
            user=request.user,
            roadmap=roadmap,
            milestone_id=milestone_id,
            video_id=video_id,
            title=title,
            thumbnail=thumbnail,
            channel=channel,
            duration=duration,
            watch_start_time=now,
            watch_end_time=now,
            last_position=last_position,
            percentage_watched=percentage_watched,
            total_minutes_watched=0.0,
            completed=False
        )
        
    progress.last_position = last_position
    progress.percentage_watched = max(progress.percentage_watched, percentage_watched)
    progress.total_minutes_watched += watch_time_delta / 60.0
    progress.watch_end_time = now
    progress.updated_at = now
    
    newly_completed_video = False
    if progress.percentage_watched >= 95 and not progress.completed:
        progress.completed = True
        progress.completion_date = now
        newly_completed_video = True
        
    progress.save()
    
    # 2. Add watch duration to LearningSession (for course analytics integration!)
    fifteen_mins_ago = now - datetime.timedelta(minutes=15)
    session = LearningSession.objects(
        user=request.user,
        activity_type='Video',
        course_id=roadmap_id,
        video_id=video_id,
        end_time__gte=fifteen_mins_ago
    ).order_by("-end_time").first()
    
    if session:
        session.duration += watch_time_delta
        session.completion_percentage = max(session.completion_percentage, percentage_watched)
        session.end_time = now
        session.updated_at = now
        session.save()
    else:
        session = LearningSession(
            user=request.user,
            activity_type='Video',
            course_id=roadmap_id,
            course_title=f"Roadmap for {roadmap.target_role}",
            video_id=video_id,
            start_time=now - datetime.timedelta(seconds=watch_time_delta),
            end_time=now,
            duration=watch_time_delta,
            completion_percentage=percentage_watched,
            date=today_str
        )
        session.save()
        
    # Sync today's LearningActivity studied minutes
    total_seconds_today = sum(s.duration for s in LearningSession.objects(user=request.user, date=today_str))
    total_minutes_today = round(total_seconds_today / 60)
    
    activity = LearningActivity.objects(user=request.user, date=today_str).first()
    if not activity:
        activity = LearningActivity(user=request.user, date=today_str)
    activity.minutes_studied = total_minutes_today
    activity.updated_at = now
    activity.save()
    
    # 3. Check milestone completion status
    milestone_index = -1
    for idx, m in enumerate(roadmap.milestones):
        if m.get("id") == milestone_id:
            milestone_index = idx
            break
            
    if milestone_index != -1:
        m = roadmap.milestones[milestone_index]
        videos = m.get("videos", [])
        
        if videos:
            all_videos_completed = True
            for v in videos:
                vid_id = v.get("video_id")
                vp = RoadmapVideoProgress.objects(
                    user=request.user,
                    roadmap=roadmap,
                    milestone_id=milestone_id,
                    video_id=vid_id,
                    completed=True
                ).first()
                if not vp:
                    all_videos_completed = False
                    break
                    
            if all_videos_completed and not m.get("is_completed"):
                m["is_completed"] = True
                m["completion_timestamp"] = now.isoformat()
                roadmap.save()
                
                # Sync daily LearningActivity milestones completion count
                activity.milestones_completed = max(0, activity.milestones_completed + 1)
                activity.save()
                
    return Response({
        "success": True,
        "data": {
            "progress_id": str(progress.id),
            "percentage_watched": progress.percentage_watched,
            "completed": progress.completed
        }
    })

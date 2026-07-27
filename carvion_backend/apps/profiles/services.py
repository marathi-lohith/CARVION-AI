import logging
from pymongo import MongoClient
from django.conf import settings
from apps.profiles.models import Profile

logger = logging.getLogger("carvion.api")

def get_profile_for_user(user) -> Profile:
    """Ensure a MongoEngine Profile document exists for the user and return it."""
    profile = Profile.objects(user=user).first()
    if not profile:
        profile = Profile(user=user)
        profile.save()
    return profile


def get_dashboard_summary(user) -> dict:
    """
    Aggregate real-time user statistics across MongoDB collections.
    Bypasses hardcoded mocks by issuing dynamic loose document counts directly via PyMongo.
    """
    profile = get_profile_for_user(user)
    
    analytics = {
        "skills_count": len(profile.skills),
        "target_role": profile.target_role or "Not specified",
        "resumes_count": 0,
        "mock_tests_count": 0,
        "roadmaps_count": 0,
        "latest_ats_score": 0,
        "is_primary_resume": False,
        "skills": profile.skills,
        "bio": profile.bio or "",
        # New statistic cards
        "saved_jobs_count": 0,
        "applied_jobs_count": 0,
        "learning_hours": 0,
        "completed_courses_count": 0,
        "ai_conversations_count": 0,
        "interview_score_average": 0,
        "resume_downloads_count": 0,
        # Data for Graphs/Charts
        "resume_score_trend": [],
        "career_growth": [],
        "skills_progress": [],
        "weekly_activity": []
    }

    try:
        # Loose dependency scan: query MongoDB databases directly
        import mongoengine
        db = mongoengine.connection.get_db()
        
        # Resolving relative collections
        resumes_col = db["resumes"]
        tests_col = db["scorecards"]
        roadmaps_col = db["roadmaps"]
        saved_jobs_col = db["saved_jobs"]
        applied_jobs_col = db["job_applications"]
        chat_sessions_col = db["chat_sessions"]
        
        # Document counts
        analytics["resumes_count"] = resumes_col.count_documents({"user": user.id})
        analytics["mock_tests_count"] = tests_col.count_documents({"user": user.id})
        analytics["roadmaps_count"] = roadmaps_col.count_documents({"user": user.id})
        analytics["saved_jobs_count"] = saved_jobs_col.count_documents({"user": user.id})
        analytics["applied_jobs_count"] = applied_jobs_col.count_documents({"user": user.id})
        
        # Fetch primary resume score, fall back to latest resume if no primary is set
        latest_resume = resumes_col.find_one({"user": user.id, "is_primary": True})
        is_primary = True
        if not latest_resume:
            is_primary = False
            latest_resume = resumes_col.find_one(
                {"user": user.id},
                sort=[("created_at", -1)]
            )
        if latest_resume and "ats_score" in latest_resume:
            analytics["latest_ats_score"] = latest_resume["ats_score"]
            analytics["is_primary_resume"] = is_primary

        # Resume score trend (last 10 resumes)
        resumes_cursor = resumes_col.find(
            {"user": user.id},
            projection={"created_at": 1, "ats_score": 1, "name": 1, "downloads_count": 1},
            sort=[("created_at", 1)]
        )
        resumes_list = list(resumes_cursor)
        analytics["resume_score_trend"] = [
            {
                "date": r["created_at"].strftime("%b %d"),
                "score": r.get("ats_score", 0),
                "name": r.get("name", "Resume")
            }
            for r in resumes_list
        ]

        # Career growth (last 10 mock test scorecards)
        tests_cursor = tests_col.find(
            {"user": user.id},
            projection={"created_at": 1, "score": 1, "domain": 1},
            sort=[("created_at", 1)]
        )
        tests_list = list(tests_cursor)
        analytics["career_growth"] = [
            {
                "date": t["created_at"].strftime("%b %d"),
                "score": t.get("score", 0),
                "domain": t.get("domain", "General")
            }
            for t in tests_list
        ]

        # Saved downloads sum
        downloads_sum = 0
        for r in resumes_list:
            downloads_sum += r.get("downloads_count", 0)
        analytics["resume_downloads_count"] = downloads_sum

        # AI Conversations
        chat_session = chat_sessions_col.find_one({"user": user.id})
        if chat_session and "messages" in chat_session:
            analytics["ai_conversations_count"] = len(chat_session["messages"])

        # Interview score average from interview_sessions
        interview_sessions_col = db["interview_sessions"]
        completed_interviews = list(interview_sessions_col.find({"user": user.id, "status": "completed"}))
        if completed_interviews:
            scores = []
            for iv in completed_interviews:
                eval_data = iv.get("evaluation")
                if eval_data and isinstance(eval_data, dict):
                    scores.append(eval_data.get("overall_score", 0))
            if scores:
                analytics["interview_score_average"] = round(sum(scores) / len(scores), 1)

        # Completed roadmap milestones as Completed Courses
        roadmap = roadmaps_col.find_one({"user": user.id})
        completed_milestones = 0
        if roadmap and "milestones" in roadmap:
            completed_milestones = sum(1 for m in roadmap["milestones"] if m.get("is_completed"))
            analytics["completed_courses_count"] = completed_milestones

        # Real study hours from learning_sessions
        learning_sessions_col = db["learning_sessions"]
        sessions_cursor = learning_sessions_col.find({"user": user.id, "is_deleted": {"$ne": True}})
        total_seconds = sum(s.get("duration", 0) for s in sessions_cursor)
        real_learning_hours = round(total_seconds / 3600, 1)
        if real_learning_hours > 0:
            analytics["learning_hours"] = real_learning_hours
        else:
            analytics["learning_hours"] = completed_milestones * 12

        # Skills progress calculations
        from apps.recommendations.services.recommendation_engine import calculate_missing_skills, normalize_skill
        missing_skills = calculate_missing_skills(user)
        missing_skills_norm = {normalize_skill(s) for s in missing_skills}
        
        skills_progress = []
        for skill in profile.skills:
            if normalize_skill(skill) in missing_skills_norm:
                progress = 40
            else:
                progress = 100
            skills_progress.append({"skill": skill, "progress": progress})
        analytics["skills_progress"] = skills_progress


        # Weekly activity logs (past 7 days)
        import datetime as dt
        today = dt.datetime.utcnow()
        seven_days_ago = today - dt.timedelta(days=7)
        
        activity_by_day = {}
        for i in range(7):
            day = today - dt.timedelta(days=i)
            day_name = day.strftime("%a")
            activity_by_day[day_name] = 0

        def count_by_day(col, query_field):
            cursor = col.find(
                {"user": user.id, query_field: {"$gte": seven_days_ago}},
                projection={query_field: 1}
            )
            for doc in cursor:
                date_val = doc.get(query_field)
                if date_val:
                    day_name = date_val.strftime("%a")
                    if day_name in activity_by_day:
                        activity_by_day[day_name] += 1

        count_by_day(resumes_col, "created_at")
        count_by_day(tests_col, "created_at")
        
        logs_col = db["user_activity_logs"]
        count_by_day(logs_col, "created_at")
        
        analytics["weekly_activity"] = [
            {"day": day_name, "count": count}
            for day_name, count in reversed(list(activity_by_day.items()))
        ]

    except Exception as exc:
        logger.error("Failed to query loose database metrics: %s", str(exc))

    return analytics

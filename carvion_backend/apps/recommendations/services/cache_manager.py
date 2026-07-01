import datetime
import logging
from apps.recommendations.models import JobCache, CourseCache, AICache

logger = logging.getLogger("carvion.api")

def get_cached_jobs(query_key: str, allow_expired: bool = False) -> tuple:
    """
    Search JobCache collection for cached queries.
    Cleans up the cache document if it has expired explicitly (unless allow_expired is True).
    """
    try:
        cache = JobCache.objects(query=query_key).first()
        if cache:
            is_expired = cache.expires_at <= datetime.datetime.utcnow()
            if not is_expired or allow_expired:
                logger.info("Cache HIT for jobs query: '%s' (Expired: %s)", query_key, is_expired)
                return cache.payload, is_expired
            else:
                logger.info("Cache EXPIRED for jobs query: '%s'. Deleting.", query_key)
                cache.delete()
    except Exception as exc:
        logger.error("Failed checking job cache: %s", str(exc))
        
    return None, True


def save_jobs_to_cache(query_key: str, payload: dict, expiry_hours: int = 24):
    """Save or upsert job payloads to the database with a custom expiration delta."""
    try:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours)
        JobCache.objects(query=query_key).update_one(
            set__payload=payload,
            set__expires_at=expires_at,
            set__created_at=datetime.datetime.utcnow(),
            upsert=True
        )
        logger.info("Cache WRITE for jobs query: '%s' (Expires in %d hours)", query_key, expiry_hours)
    except Exception as exc:
        logger.error("Failed saving jobs cache: %s", str(exc))


def get_cached_courses(query_key: str, allow_expired: bool = False) -> tuple:
    """
    Search CourseCache collection for cached queries.
    """
    try:
        cache = CourseCache.objects(query=query_key).first()
        if cache:
            is_expired = cache.expires_at <= datetime.datetime.utcnow()
            if not is_expired or allow_expired:
                logger.info("Cache HIT for courses query: '%s' (Expired: %s)", query_key, is_expired)
                return cache.payload, is_expired
            else:
                logger.info("Cache EXPIRED for courses query: '%s'. Deleting.", query_key)
                cache.delete()
    except Exception as exc:
        logger.error("Failed checking course cache: %s", str(exc))
        
    return None, True


def save_courses_to_cache(query_key: str, payload: dict, expiry_days: int = 7):
    """Save or upsert course payloads to the database with a custom expiration delta."""
    try:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=expiry_days)
        CourseCache.objects(query=query_key).update_one(
            set__payload=payload,
            set__expires_at=expires_at,
            set__created_at=datetime.datetime.utcnow(),
            upsert=True
        )
        logger.info("Cache WRITE for courses query: '%s' (Expires in %d days)", query_key, expiry_days)
    except Exception as exc:
        logger.error("Failed saving courses cache: %s", str(exc))


def get_cached_ai(key: str) -> dict:
    """
    Search AICache collection for cached queries.
    Returns a dict containing the payload, is_expired flag, and timestamps.
    """
    try:
        cache = AICache.objects(key=key).first()
        if cache:
            is_expired = cache.expires_at <= datetime.datetime.utcnow()
            return {
                "payload": cache.payload,
                "is_expired": is_expired,
                "created_at": cache.created_at,
                "expires_at": cache.expires_at,
                "version_hash": cache.version_hash
            }
    except Exception as exc:
        logger.error("Failed checking AI cache: %s", str(exc))
    return None


def save_ai_to_cache(key: str, user, payload: dict, expiry_seconds: int = 86400, version_hash: str = ""):
    """Save or upsert general AI payload to the database with a custom expiration delta."""
    try:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=expiry_seconds)
        AICache.objects(key=key).update_one(
            set__user=user,
            set__payload=payload,
            set__expires_at=expires_at,
            set__created_at=datetime.datetime.utcnow(),
            set__version_hash=version_hash,
            upsert=True
        )
        logger.info("Cache WRITE for AI query: '%s' (Expires in %d seconds)", key, expiry_seconds)
    except Exception as exc:
        logger.error("Failed saving AI cache: %s", str(exc))


def invalidate_user_caches(user):
    """
    Cleans up all cached recommendations and AI data for the specified user.
    """
    try:
        from apps.recommendations.models import JobCache, CourseCache, AICache
        job_count = JobCache.objects(query__startswith=f"jobs_auto_{user.id}").delete()
        course_count = CourseCache.objects(query__startswith=f"courses_auto_{user.id}").delete()
        ai_count = AICache.objects(user=user).delete()
        logger.info("Invalidated cache items for user %s: jobs=%d, courses=%d, AI=%d", user.id, job_count, course_count, ai_count)
    except Exception as exc:
        logger.error("Failed to invalidate caches for user: %s", str(exc))



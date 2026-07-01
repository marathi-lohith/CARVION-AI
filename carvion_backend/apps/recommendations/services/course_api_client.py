import logging
import requests
from django.conf import settings

logger = logging.getLogger("carvion.api")

def get_fallback_courses(query: str) -> list:
    """Provides high-quality learning video items if the YouTube API key is unconfigured or offline."""
    return [
        {
            "id": {"videoId": "rfscVS0vtbw"},
            "snippet": {
                "title": f"Learn {query} - Comprehensive Beginner to Advanced Full Course",
                "description": f"Master the core essentials of {query} in this production-quality tutorial breakdown covering state setups, API connections, and optimization patterns.",
                "thumbnails": {
                    "high": {"url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=320&h=180&q=80"}
                },
                "channelTitle": "Academind"
            }
        },
        {
            "id": {"videoId": "x5gYD3Z9tD8"},
            "snippet": {
                "title": f"{query} Crash Course - In-depth Tutorial with Hands-on Projects",
                "description": f"Build real-world apps using {query}! Learn standard code practices, file structure organizations, and integration setups.",
                "thumbnails": {
                    "high": {"url": "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=320&h=180&q=80"}
                },
                "channelTitle": "Traversy Media"
            }
        }
    ]


def fetch_courses_from_youtube(query: str, video_duration: str = "any") -> dict:
    """
    Search YouTube Data API for relevant training videos.
    Returns standard structured video elements list.
    """
    import os
    if not query or not query.strip():
        return {"items": []}
    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    
    search_query = query
    if "course" not in query.lower() and "tutorial" not in query.lower():
        search_query = f"{query} course tutorial"
    
    if not api_key:
        logger.warning("YOUTUBE_API_KEY is not configured. Serving fallbacks.")
        return {"items": get_fallback_courses(query)}

    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "maxResults": "8",
        "key": api_key
    }
    if video_duration and video_duration != "any":
        params["videoDuration"] = video_duration

    try:
        response = requests.get(url, params=params, timeout=8)
        if response.status_code == 200:
            return response.json()
        
        logger.warning("YouTube API search returned code %d. Using fallbacks.", response.status_code)
        return {"items": get_fallback_courses(query)}
    except Exception as exc:
        logger.exception("YouTube API search failed: %s. Using fallbacks.", str(exc))
        return {"items": get_fallback_courses(query)}


def fetch_video_durations(video_ids: list) -> dict:
    """
    Retrieve video durations for a list of video IDs using YouTube Videos API.
    """
    import os
    import re
    if not video_ids:
        return {}
    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key:
        return {}

    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {
        "part": "contentDetails",
        "id": ",".join(video_ids),
        "key": api_key
    }

    try:
        response = requests.get(url, params=params, timeout=8)
        if response.status_code == 200:
            data = response.json()
            durations = {}
            for item in data.get("items", []):
                v_id = item.get("id")
                content_details = item.get("contentDetails", {})
                iso_duration = content_details.get("duration", "")
                
                # Parse ISO duration (e.g. PT1H23M45S)
                hours = re.search(r'(\d+)H', iso_duration)
                minutes = re.search(r'(\d+)M', iso_duration)
                seconds = re.search(r'(\d+)S', iso_duration)
                
                h = int(hours.group(1)) if hours else 0
                m = int(minutes.group(1)) if minutes else 0
                s = int(seconds.group(1)) if seconds else 0
                
                if h > 0:
                    duration_str = f"{h}:{m:02d}:{s:02d}"
                else:
                    duration_str = f"{m}:{s:02d}"
                durations[v_id] = duration_str
            return durations
    except Exception as exc:
        logger.warning("Failed to fetch video durations from YouTube: %s", str(exc))
    return {}

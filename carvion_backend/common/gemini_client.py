import os
import logging
from google import genai
from google.genai import errors

logger = logging.getLogger("carvion.api")

_client = None

def get_gemini_client():
    """
    Get or initialize the shared Google Gen AI SDK Client.
    Returns None if GEMINI_API_KEY environment variable is not set.
    """
    global _client
    if _client is not None:
        return _client

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not configured in the environment.")
        return None

    try:
        # Initialize client using the official google-genai SDK
        _client = genai.Client(api_key=api_key)
        return _client
    except Exception as e:
        logger.exception("Failed to initialize Google Gen AI Client: %s", str(e))
        return None

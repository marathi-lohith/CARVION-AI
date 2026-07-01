import logging
import requests
import os
from common.gemini_client import get_gemini_client
import json

logger = logging.getLogger("carvion.api")

class JSearchAuthenticationError(Exception):
    """Exception raised when JSearch API returns authentication or subscription error (401/403)."""
    pass

def get_gemini_fallback_jobs(queries: list, location: str = "Remote", resume_skills: list = None, missing_skills: list = None) -> list:
    """
    Generate 15 realistic, tailored job listings using the centralized Gemini client.
    This is the fallback used when JSearch API returns 429/connection error.
    Always returns real-looking jobs matched to user's skills profile and recommended roles.
    """
    resume_skills = resume_skills or []
    missing_skills = missing_skills or []

    client = get_gemini_client()
    if not client:
        logger.error("Gemini client unavailable. Cannot generate job listings.")
        return []

    queries_str = ", ".join(queries) if isinstance(queries, list) else str(queries)
    try:
        skills_str = ", ".join(resume_skills) if resume_skills else "general software engineering"
        missing_str = ", ".join(missing_skills) if missing_skills else "none specified"

        prompt = f"""
        You are a realistic job search API returning real-world job listings.
        Generate 15 diverse, highly realistic job openings covering these roles: {queries_str}
        Location: {location}
        User Resume Skills: {skills_str}
        User Missing/Gap Skills: {missing_str}

        Each job object in the list MUST have ALL of these exact fields:
        - job_id: a unique string identifier (e.g. "job_stripe_001")
        - employer_name: real tech company name (Stripe, Airbnb, Shopify, HubSpot, Vercel, Slack, Figma, Notion, Atlassian, Twilio, Cloudflare, Datadog)
        - employer_logo: clearbit logo URL format: https://logo.clearbit.com/<domain> (e.g. https://logo.clearbit.com/stripe.com)
        - job_title: specific job title matching one of the roles
        - job_city: city name (e.g. "San Francisco", "New York") or "Remote"
        - job_country: country code (e.g. "US", "CA", "IN", "GB")
        - job_employment_type: one of "FULLTIME", "CONTRACT", "PARTTIME", "INTERN"
        - job_description: 2-3 sentence overview of actual responsibilities and impact
        - job_apply_link: real careers page URL for the company (e.g. https://stripe.com/jobs, https://www.airbnb.com/careers). NEVER use Google Careers.
        - job_salary: annual salary range (e.g. "$110,000 - $145,000") — use realistic market rates for the role
        - job_required_skills: list of 4-6 required technical skills — mix the user's existing skills and missing skills
        - job_experience: seniority (e.g. "Entry Level (0-2 years)", "Mid-Level (2-4 years)", "Senior (5+ years)")
        - job_is_remote: boolean (true if remote-friendly)
        - job_posted_at_datetime_utc: ISO datetime string within the last 7 days

        Return a JSON object with a single key "data" containing the array of 15 job objects.
        Return ONLY raw JSON — no markdown, no code blocks, no extra text.
        """
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if not response or not response.text:
            raise ValueError("Empty response from Gemini API.")

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed = json.loads(raw_text)
        jobs = parsed.get("data", [])
        if not isinstance(jobs, list):
            raise ValueError("Gemini response 'data' is not a list.")
        logger.info("Gemini generated %d job listings for roles: %s", len(jobs), queries_str)
        return jobs
    except Exception as exc:
        logger.error("Gemini job generation failed: %s", str(exc))
        return []


def fetch_jobs_from_jsearch(
    query,
    location: str = "Remote",
    page: int = 1,
    resume_skills: list = None,
    missing_skills: list = None
) -> dict:
    """
    Query the RapidAPI JSearch endpoint for real jobs.
    Supports a single query string or a list of query strings.
    Throws JSearchAuthenticationError on 401/403 errors (blocks Gemini fallback).
    """
    api_key = os.environ.get("JSEARCH_API_KEY") or os.environ.get("RAPIDAPI_KEY", "")

    # Convert query to a list for unified handling
    queries = [query] if isinstance(query, str) else list(query)
    queries = [q for q in queries if q and str(q).strip()]

    if not queries:
        return {"data": []}

    if not api_key:
        logger.warning("JSEARCH_API_KEY not configured. Using Gemini to generate listings.")
        return {"data": get_gemini_fallback_jobs(queries, location, resume_skills, missing_skills)}

    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    all_jobs = []
    # Loop over the top 3 queries to fetch a diverse set without hitting limits
    for q in queries[:3]:
        params = {
            "query": f"{q} in {location}",
            "page": str(page),
            "num_pages": "1"
        }
        # Log request URL securely
        req = requests.Request('GET', url, headers=headers, params=params)
        prepared_url = req.prepare().url
        logger.info("JSearch API Request URL: %s", prepared_url)

        try:
            logger.info("Querying JSearch for: '%s' in '%s'", q, location)
            response = requests.get(url, headers=headers, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                jobs = data.get("data", [])
                if isinstance(jobs, list):
                    all_jobs.extend(jobs)
            elif response.status_code in [401, 403]:
                logger.error("JSearch API authentication or subscription failed (status %d). Response Body: %s", response.status_code, response.text)
                raise JSearchAuthenticationError(f"JSearch API returned status {response.status_code}: {response.text}")
            else:
                logger.warning("JSearch API returned status %d for query '%s'. Response Body: %s", response.status_code, q, response.text)
        except JSearchAuthenticationError:
            # Re-raise authentication errors directly to prevent fallback
            raise
        except Exception as exc:
            logger.error("JSearch API call failed for query '%s': %s", q, str(exc))

    if all_jobs:
        logger.info("JSearch merged %d total jobs across queries.", len(all_jobs))
        return {"data": all_jobs}

    logger.warning("JSearch returned 0 results. Falling back to Gemini.")
    return {"data": get_gemini_fallback_jobs(queries, location, resume_skills, missing_skills)}

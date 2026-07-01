import json
import logging
from django.conf import settings
from common.gemini_client import get_gemini_client
from google.genai import errors

logger = logging.getLogger("carvion.api")

def get_fallback_roadmap(target_role: str) -> list:
    """Return high-quality fallback roadmap nodes if Gemini API is offline/unconfigured."""
    return [
        {
            "id": "node_1",
            "title": f"Fundamentals of {target_role}",
            "description": "Establish core command structures, tooling foundations, and architectural conventions required for professional workspaces.",
            "timeframe": "Week 1 & 2",
            "skills": ["Tooling Setup", "Basic Syntax", "Environment Management"],
            "references": ["YouTube search: Introduction to " + target_role],
            "is_completed": False
        },
        {
            "id": "node_2",
            "title": "API Integrations & Storage Layers",
            "description": "Master endpoints setup, async data management, and standard database query mappings (SQL and ODM).",
            "timeframe": "Week 3 & 4",
            "skills": ["RESTful APIs", "MongoDB ODM", "Validation Schemas"],
            "references": ["YouTube search: API backend integration guidelines"],
            "is_completed": False
        },
        {
            "id": "node_3",
            "title": "Advanced Engineering & Deployments",
            "description": "Optimize operations, introduce unit testing scripts, configure caching managers, and orchestrate server releases.",
            "timeframe": "Week 5 & 6",
            "skills": ["Caching", "Unit Testing", "Production Builds"],
            "references": ["YouTube search: Advanced CI/CD deployment tactics"],
            "is_completed": False
        }
    ]


def generate_roadmap_with_gemini(target_role: str, active_skills: list = None, missing_skills: list = None) -> list:
    """
    Query Google Gemini to compile custom career learning milestones in a strict JSON array layout.
    """
    client = get_gemini_client()
    if not client:
        logger.warning("Gemini Client is not configured. Invoking fallback roadmap.")
        return get_fallback_roadmap(target_role)

    # Convert skill arrays to strings for prompt inclusion
    act_skills_str = ", ".join(active_skills) if active_skills else "None specified"
    mis_skills_str = ", ".join(missing_skills) if missing_skills else "None specified"

    try:
        prompt = f"""
        You are a Senior Career Coach and Career Path Architect.
        Generate a highly structured learning roadmap for a student aspiring to become a: "{target_role}".
        
        Current User Parameters:
        - Already knows (Active Skills): {act_skills_str}
        - Lacking (Missing Skills): {mis_skills_str}
        
        Create exactly 4 roadmap milestones (nodes) mapped sequentially.
        Focus the early nodes heavily on bridging the missing skills gaps, and later nodes on advanced deployments.
        
        You MUST return a strictly formatted JSON array containing exactly 4 objects. Each object must have these exact keys:
        {{
            "id": "node_1" (incremented sequentially),
            "title": "<short descriptive title>",
            "description": "<detailed explanation of what to learn and build>",
            "timeframe": "<estimated time, e.g. Week 1-2>",
            "skills": [<list of 3 key skills taught in this node>],
            "references": [<list of 2 search queries or online course references, e.g. 'YouTube: Learn React basics'>],
            "is_completed": false
        }}
        
        Do not wrap the output in markdown code blocks (like ```json ... ```). Only return the raw JSON array string.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if not response or not response.text:
            raise ValueError("Empty response received from Gemini API.")
            
        raw_text = response.text.strip()

        # Clean markdown codeblocks
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed_array = json.loads(raw_text)
        
        # Verify array structure
        if not isinstance(parsed_array, list):
            raise TypeError("Gemini output is not a JSON array list.")

        # Ensure properties are mapped
        for node in parsed_array:
            node["is_completed"] = False  # Always force default uncompleted status
            
        return parsed_array
    except errors.APIError as exc:
        logger.error("Gemini API error during roadmap generation (code %s): %s. Serving fallback.", exc.code, exc.message)
        return get_fallback_roadmap(target_role)
    except Exception as exc:
        logger.exception("Gemini roadmap generation failed: %s. Serving fallback.", str(exc))
        return get_fallback_roadmap(target_role)

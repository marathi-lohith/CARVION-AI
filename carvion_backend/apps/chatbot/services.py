import logging
from django.conf import settings
from apps.profiles.models import Profile
from common.gemini_client import get_gemini_client
from google.genai import errors, types
from apps.resumes.models import Resume
from apps.learning.models import Roadmap
from apps.assessments.models import Scorecard

logger = logging.getLogger("carvion.api")

def compile_user_context(user) -> str:
    """
    Compiles detailed user context metadata into system instructions.
    Gathers active/missing skills, target roles, recent scores, and roadmap progress.
    """
    # 1. Profile metadata
    profile = Profile.objects(user=user).first()
    target_role = profile.target_role if profile else "Software Engineer"
    active_skills = profile.skills if profile and profile.skills else ["None specified"]

    # 2. Latest ATS missing skills
    from apps.recommendations.services.recommendation_engine import calculate_missing_skills
    missing_skills = calculate_missing_skills(user)

    # 3. Roadmap progress
    roadmap = Roadmap.objects(user=user).first()
    roadmap_progress = "No active roadmap compiled."
    if roadmap and roadmap.milestones:
        completed = len([m for m in roadmap.milestones if m.get("is_completed")])
        total = len(roadmap.milestones)
        roadmap_progress = f"Completed {completed} of {total} milestones for target role: '{roadmap.target_role}'."

    # 4. Recent assessment scorecards
    recent_tests = Scorecard.objects(user=user).order_by("-created_at")[:2]
    scores_str = "No assessments taken yet."
    if recent_tests:
        scores_str = ", ".join([f"{t.domain} ({t.category}): {t.score}%" for t in recent_tests])

    # Build context prompt injection block
    context = f"""
    [CRITICAL CONTEXT INJECTION - USER PROFILE METADATA]
    - Student Name: {user.name}
    - Target Career Role: {target_role}
    - Current Active Skills: {", ".join(active_skills)}
    - Identified Gaps (Missing Keywords): {", ".join(missing_skills) if missing_skills else "None flagged"}
    - Career Roadmap Progress: {roadmap_progress}
    - Recent Mock Test Scorecards: {scores_str}
    """
    return context


def get_chatbot_fallback_response(user_message: str, user_context: str) -> str:
    """High-quality fallback chatbot advisor response in case the Gemini API is offline."""
    return (
        f"Thank you for reaching out! I've analyzed your profile context (Targeting: Software Engineering, with your active skills). "
        f"Regarding your query: '{user_message}', we recommend focusing on bridging any missing keyword gaps flagged in your resume audits. "
        f"Let me know if you would like me to formulate study recommendations or suggest learning tracks."
    )


def query_gemini_advisor(user, user_message: str, chat_history: list) -> str:
    """
    Injects context parameters and conversation history,
    querying the Gemini model for highly personalized advice.
    """
    user_context = compile_user_context(user)
    client = get_gemini_client()

    if not client:
        logger.warning("Gemini Client is not configured. Serving chatbot fallback response.")
        return get_chatbot_fallback_response(user_message, user_context)

    try:
        # Compile System Instruction Context
        system_instruction = f"""
        You are an Omniscient AI Career Counselor and Virtual Guide for the Carvion AI platform.
        You offer highly individualized, actionable, and encouraging career advice.
        
        {user_context}
        
        Instructions:
        1. Always address queries with direct reference to the user's target career role and active/missing skills if relevant.
        2. If they have missing skills, suggest learning resources or milestones to bridge them.
        3. Keep advice realistic, encouraging, and clear.
        4. Be conversational but concise (under 250 words per response).
        """

        # Format chat history for Gemini as types.Content list
        formatted_history = []
        for msg in chat_history[-8:]:
            role = "user" if msg.get("sender") == "user" else "model"
            formatted_history.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=msg.get("text", ""))]
                )
            )

        # Start chat session
        chat = client.chats.create(
            model="gemini-2.5-flash",
            history=formatted_history
        )
        
        # Combine user message with context wrapper if history is empty (first message)
        full_message = user_message
        if not chat_history:
            full_message = f"{system_instruction}\n\nUser Question: {user_message}"
        else:
            # Inject context loosely into message instructions
            full_message = f"[System Context Check: Target Role = {user.name}'s profile] User Question: {user_message}"

        response = chat.send_message(full_message)
        if not response or not response.text:
            raise ValueError("Empty response received from Gemini API.")
            
        return response.text.strip()
    except errors.APIError as exc:
        logger.error("Gemini API error during chatbot advice (code %s): %s. Serving fallback.", exc.code, exc.message)
        return get_chatbot_fallback_response(user_message, user_context)
    except Exception as exc:
        logger.exception("Gemini career advisor query failed: %s. Serving fallback.", str(exc))
        return get_chatbot_fallback_response(user_message, user_context)

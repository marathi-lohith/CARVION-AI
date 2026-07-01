import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.assessments.models import MockTest, Scorecard, InterviewSession
from apps.assessments.serializers import (
    MockTestSerializer, MockTestCreateSerializer,
    ScoreSubmissionSerializer, ScorecardSerializer, InterviewSessionSerializer
)
from apps.assessments.services import generate_mock_test_with_gemini, grade_test_submission
from common.exceptions import BadRequest, NotFound
from common.gemini_client import get_gemini_client
from google.genai import errors

logger = logging.getLogger("carvion.api")

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scorecard_history_view(request):
    """GET: Retrieve historical list of scorecards for the user."""
    scorecards = Scorecard.objects(user=request.user).order_by("-created_at")
    serializer = ScorecardSerializer(scorecards, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mock_test_create_view(request):
    """POST: Compile a new Mock Test session via Gemini."""
    serializer = MockTestCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Invalid test parameters.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    validated_data = serializer.validated_data
    domain = validated_data["domain"]
    difficulty = validated_data["difficulty"]
    category = validated_data["category"]

    # 1. Compile questions (passing request.user)
    questions = generate_mock_test_with_gemini(request.user, domain, difficulty, category)

    # 2. Write to MongoDB
    test = MockTest(
        user=request.user,
        domain=domain,
        difficulty=difficulty,
        category=category,
        questions=questions
    )
    test.save()

    return Response(
        {
            "success": True,
            "data": MockTestSerializer(test).data
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mock_test_submit_view(request, test_id):
    """
    POST: Submit answers for a specific mock test.
    Computes scores, registers scorecard, and returns scorecard.
    """
    try:
        mock_test = MockTest.objects.get(id=test_id, user=request.user)
    except MockTest.DoesNotExist:
        raise NotFound("Associated mock test session not found.")

    serializer = ScoreSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        raise BadRequest("Invalid answers payload format.")

    submitted_answers = serializer.validated_data["answers"]
    duration = serializer.validated_data.get("duration", 0)

    # Grade answers and write scorecard (passing duration)
    scorecard = grade_test_submission(request.user, mock_test, submitted_answers, duration)

    from common.utils import log_user_activity
    log_user_activity(request.user, "assessments", "mock_test_completed", f"Completed mock test in {scorecard.domain} with score {scorecard.score}%")

    return Response({
        "success": True,
        "data": ScorecardSerializer(scorecard).data
    })



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scorecard_detail_view(request, scorecard_id):
    """GET: Retrieve details of a specific scorecard."""
    try:
        scorecard = Scorecard.objects.get(id=scorecard_id, user=request.user)
    except Scorecard.DoesNotExist:
        raise NotFound("Requested scorecard not found.")

    return Response({
        "success": True,
        "data": ScorecardSerializer(scorecard).data
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def scorecard_delete_view(request, scorecard_id):
    """DELETE: Remove an individual scorecard report from history."""
    try:
        scorecard = Scorecard.objects.get(id=scorecard_id, user=request.user)
        scorecard.delete()
        return Response({"success": True, "message": "Scorecard report deleted successfully."})
    except Scorecard.DoesNotExist:
        raise NotFound("Requested scorecard not found.")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_interviews_view(request):
    """GET: Retrieve past mock interview sessions for the current user."""
    sessions = InterviewSession.objects(user=request.user).order_by("-created_at")
    serializer = InterviewSessionSerializer(sessions, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_interview_view(request):
    """
    POST: Start a new mock interview.
    Generates the first question tailored to user career context.
    """
    import json
    import datetime
    role = request.data.get("role") or "Software Engineer"
    mode = request.data.get("mode") or "text"
    difficulty = request.data.get("difficulty") or "Medium"
    category = request.data.get("category") or "Technical"

    # Tailor based on user profile and resume
    from apps.resumes.models import Resume
    from apps.profiles.models import Profile
    profile = Profile.objects(user=request.user).first()
    skills = profile.skills if (profile and profile.skills) else []
    
    latest_resume = Resume.objects(user=request.user).order_by("-created_at").first()
    resume_skills = []
    ats_score = 65
    if latest_resume:
        resume_skills = latest_resume.structured_data.get("skills", [])
        if resume_skills and isinstance(resume_skills[0], dict):
            resume_skills = [s.get("name", "") for s in resume_skills if s.get("name")]
        if latest_resume.analysis_report:
            ats_score = latest_resume.analysis_report.get("ats_score", 65)

    from apps.recommendations.services.recommendation_engine import calculate_missing_skills
    missing_skills = calculate_missing_skills(request.user)

    client = get_gemini_client()
    first_question = f"Can you introduce yourself and describe a challenging project you built as a {role}?"

    if client:
        try:
            prompt = f"""
            You are an expert recruiter conducting an official mock interview for the position of {role}.
            Interview Type: {category} Interview (Focus solely on {category} aspects. If Coding, prepare to ask coding problems. If HR, focus on behavioral/conflict/career goals, no technical coding questions).
            Interview Difficulty Level: {difficulty} ({difficulty} details: Easy = beginner/basic concepts/syntax/definitions; Medium = APIs/framework usage/practical coding/debugging; Hard = architecture/optimization/distributed systems/tradeoffs/scalability/advanced debugging).
            
            Candidate Profile Skills: {", ".join(skills + resume_skills)}
            Target Role: {role}
            Missing Skills: {", ".join(missing_skills)}
            ATS Score: {ats_score}
            
            Structure of the interview:
            We will conduct a 10-turn progressive mock interview. This is Turn 1.
            Generate the first question based on their target role, category, and selected difficulty. Keep it natural, direct, and recruiters-style.
            Return ONLY the question string. Do not wrap in markdown or JSON.
            """
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            if response and response.text:
                first_question = response.text.strip()
        except Exception as exc:
            logger.exception("Failed to generate first question: %s", str(exc))

    session = InterviewSession(
        user=request.user,
        role=role,
        mode=mode,
        status="in_progress",
        difficulty=difficulty,
        category=category,
        dialog=[{"question": first_question, "answer": "", "evaluation": {}}]
    )
    session.save()
    return Response({
        "success": True,
        "data": InterviewSessionSerializer(session).data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def respond_interview_view(request, session_id):
    """
    POST: Submit an answer for the current interview question.
    Generates a follow-up question, or completes the session with final AI scoring.
    """
    import json
    import datetime
    try:
        session = InterviewSession.objects.get(id=session_id, user=request.user)
    except InterviewSession.DoesNotExist:
        raise NotFound("Interview session not found.")

    if session.status == "completed":
        return Response({"success": False, "error": {"message": "Interview session already completed."}}, status=status.HTTP_400_BAD_REQUEST)

    answer = request.data.get("answer") or ""
    if not answer.strip():
        return Response({"success": False, "error": {"message": "Answer cannot be empty."}}, status=status.HTTP_400_BAD_REQUEST)

    client = get_gemini_client()
    dialog = list(session.dialog)
    current_turn_index = len(dialog) - 1

    # Record verbal or text response
    dialog[current_turn_index]["answer"] = answer
    dialog[current_turn_index]["timestamp"] = datetime.datetime.utcnow().isoformat()

    # Evaluate current turn performance
    turn_eval = {
        "technical_accuracy": "Satisfactory",
        "communication_quality": "Good",
        "confidence_level": "Medium",
        "grammar_feedback": "Clear answer phrasing."
    }

    if client:
        try:
            eval_prompt = f"""
            Analyze this interview turn for the position of {session.role}.
            Question: {dialog[current_turn_index]["question"]}
            Answer: {answer}
            
            Evaluate:
            - technical_accuracy (Strong, Satisfactory, Needs Improvement)
            - communication_quality (Excellent, Good, Average, Poor)
            - confidence_level (High, Medium, Low)
            - grammar_feedback (short sentence)
            
            You MUST return a strictly formatted JSON document with these exact keys:
            {{
                "technical_accuracy": "<Accuracy>",
                "communication_quality": "<Quality>",
                "confidence_level": "<Level>",
                "grammar_feedback": "<Feedback>"
            }}
            Do not wrap in markdown tags.
            """
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=eval_prompt,
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
                turn_eval = json.loads(raw_text)
        except Exception as exc:
            logger.exception("Failed to grade turn: %s", str(exc))

    dialog[current_turn_index]["evaluation"] = turn_eval

    # Continue interview or generate final report
    MAX_TURNS = 10
    if len(dialog) < MAX_TURNS:
        next_question = "Can you expand on how you would design or test that in a production setup?"
        if client:
            try:
                followup_prompt = f"""
                You are an expert recruiter and technical interviewer conducting a mock interview for the position of {session.role}.
                Interview Type: {session.category} Interview.
                Difficulty Level: {session.difficulty}.
                Dialogue history so far:
                {json.dumps(dialog)}
                
                This is Turn {len(dialog) + 1} of 10.
                
                Guidelines:
                - Maintain absolute context. Ask a natural, direct follow-up question that builds directly on what they said. Remember to dive into technical depth, explore edge cases, and progressively increase the difficulty. Do not repeat topics.
                - For HR/Behavioral interviews, focus strictly on behavioral, conflict resolution, deadlines, leadership, and teamwork questions, avoiding coding queries.
                - For Coding interviews, ask the candidate to write or modify code snippets (e.g. algorithms, SQL, REST endpoints) matching their difficulty level.
                - For Technical interviews, progressively increase difficulty (conceptual -> framework -> implementation -> debugging -> optimization -> scaling -> system design tradeoffs).
                
                Return ONLY the next question string. Do not wrap in markdown or JSON.
                """
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=followup_prompt,
                )
                if response and response.text:
                    next_question = response.text.strip()
            except Exception as exc:
                logger.exception("Failed to generate follow-up question: %s", str(exc))

        dialog.append({"question": next_question, "answer": "", "evaluation": {}})
        session.dialog = dialog
        session.save()
        return Response({"success": True, "data": InterviewSessionSerializer(session).data})
    else:
        session.dialog = dialog
        session.status = "completed"

        evaluation = {
            "technical_score": 75,
            "communication_score": 80,
            "grammar_score": 85,
            "confidence_score": 70,
            "behavioral_score": 75,
            "problem_solving_score": 75,
            "overall_score": 77,
            "summary": "Completed mock interview session.",
            "strengths": ["Solid foundation in primary concepts.", "Clear articulation of ideas."],
            "weaknesses": ["Improve explanation of optimization metrics.", "Mention deployment considerations."],
            "improvement_plan": ["Focus study on architecture questions and base scaling properties."],
            "suggested_courses": ["System Design fundamentals", "Advanced microservices"],
            "suggested_jobs": [f"Mid-level {session.role}", f"Associate {session.role}"],
            "suggested_certifications": ["AWS Certified Cloud Practitioner"],
            "suggested_mock_tests": [f"{session.role} Architecture Review"]
        }

        if client:
            try:
                eval_prompt = f"""
                Provide a complete performance evaluation for the mock interview session of a {session.role}.
                Full dialogue history:
                {json.dumps(dialog)}
                
                Compute scores (0 to 100) and compile feedback summary, strengths, weaknesses, study plan, suggested courses, certification paths, and mock test directions.
                You MUST return a strictly formatted JSON document with these exact keys:
                {{
                    "technical_score": <int>,
                    "communication_score": <int>,
                    "grammar_score": <int>,
                    "confidence_score": <int>,
                    "behavioral_score": <int>,
                    "problem_solving_score": <int>,
                    "overall_score": <int>,
                    "summary": "<string>",
                    "strengths": [<list of strings>],
                    "weaknesses": [<list of strings>],
                    "improvement_plan": [<list of strings>],
                    "suggested_courses": [<list of strings>],
                    "suggested_jobs": [<list of strings>],
                    "suggested_certifications": [<list of strings>],
                    "suggested_mock_tests": [<list of strings>]
                }}
                Do not wrap in markdown tags.
                """
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=eval_prompt,
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
                    evaluation = json.loads(raw_text)
            except Exception as exc:
                logger.exception("Failed to generate final interview evaluation: %s", str(exc))

        session.evaluation = evaluation
        session.save()
        from common.utils import log_user_activity
        log_user_activity(request.user, "assessments", "interview_completed", f"Completed mock interview for role '{session.role}' with overall score {evaluation.get('overall_score', 75)}%")
        return Response({"success": True, "data": InterviewSessionSerializer(session).data})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_interview_view(request, session_id):
    """DELETE: Remove an individual mock interview history session."""
    try:
        session = InterviewSession.objects.get(id=session_id, user=request.user)
        session.delete()
        return Response({"success": True, "message": "Interview session deleted."})
    except InterviewSession.DoesNotExist:
        raise NotFound("Interview session not found.")


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_all_interviews_view(request):
    """DELETE: Wipe mock interview history sessions for the user."""
    InterviewSession.objects(user=request.user).delete()
    return Response({"success": True, "message": "All interview sessions deleted."})



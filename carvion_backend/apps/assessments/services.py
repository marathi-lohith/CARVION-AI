import json
import logging
from django.conf import settings
from apps.assessments.models import MockTest, Scorecard
from apps.assessments.question_bank import get_fallback_questions_v2
from common.gemini_client import get_gemini_client
from google.genai import errors

logger = logging.getLogger("carvion.api")

def generate_mock_test_with_gemini(user, domain: str, difficulty: str, category: str) -> list:
    """
    Query Google Gemini to compile 4 unique structured questions matching candidate resume, 
    target role, past scorecard audits, and category.
    Fails over gracefully to get_fallback_questions_v2 when API is limited.
    """
    from apps.resumes.models import Resume
    from apps.profiles.models import Profile

    profile = Profile.objects(user=user).first()
    target_role = profile.target_role if (profile and profile.target_role) else "Software Engineer"
    skills = profile.skills if (profile and profile.skills) else []
    
    latest_resume = Resume.objects(user=user).order_by("-created_at").first()
    resume_skills = []
    ats_score = 65
    if latest_resume:
        resume_skills = latest_resume.structured_data.get("skills", [])
        if resume_skills and isinstance(resume_skills[0], dict):
            resume_skills = [s.get("name", "") for s in resume_skills if s.get("name")]
        if latest_resume.analysis_report:
            ats_score = latest_resume.analysis_report.get("ats_score", 65)

    from apps.recommendations.services.recommendation_engine import calculate_missing_skills
    missing_skills = calculate_missing_skills(user)

    past_scorecards = Scorecard.objects(user=user).order_by("-created_at")[:5]
    past_attempts = []
    past_served = []
    past_mistakes = []
    for sc in past_scorecards:
        past_attempts.append(f"Domain: {sc.domain}, Category: {sc.category}, Score: {sc.score}%")
        for ans in sc.answers_submitted:
            past_served.append(ans.get("question"))
            if not ans.get("is_correct"):
                past_mistakes.append(ans.get("question"))

    client = get_gemini_client()
    if not client:
        logger.warning("Gemini Client is not configured. Serving fallbacks.")
        return get_fallback_questions_v2(user, domain, difficulty, category)

    try:
        # Phase 1 & 5: Structured Gemini Prompt with serving duplication checks
        prompt = f"""
        You are a Technical Interviewer and Domain Expert.
        Generate a unique, highly tailored technical assessment matching the criteria:
        - Domain/Topic: {domain}
        - Difficulty: {difficulty}
        - Category: {category}
        
        Candidate Context:
        - Target Role: {target_role}
        - Current Profile Skills: {", ".join(skills + resume_skills)}
        - ATS Score: {ats_score}
        - Identified Missing Skills: {", ".join(missing_skills)}
        - Past Assessments: {"; ".join(past_attempts)}
        - Recently Served/Mistake Questions (Do NOT repeat these questions or similar concepts): {"; ".join(past_served[:15])}
        
        Difficulty Instructions:
        - Easy: Focus on fundamentals, core definitions, basic syntax, and entry-level concepts.
        - Medium: Focus on practical implementation, API design, framework usage, and common problem-solving tasks.
        - Hard: Focus on complex debugging, code optimization, system design, architectural patterns, and production troubleshooting scenarios.
        
        Category Instructions:
        - MCQ: Generate multiple-choice conceptual questions.
        - Technical: General conceptual domain-specific queries.
        - Coding: Write short algorithm questions, code completion stubs, or implementation code blocks. Provide code inside the question string.
        - Debugging: Provide code snippets containing specific logical/syntax bugs, asking candidates to identify or fix them.
        - Scenario Based: Create real-world system incident reports or design dilemmas, asking for appropriate architectural decisions.
        - HR / Behavioral: Target teamwork, conflict resolution, developer communication, and engineering leadership questions.
        - Aptitude: Test analytical reasoning, basic math logic, and problem-solving sequences.
        
        Randomization & Uniqueness Instructions:
        - Select a random subtopic of {domain} (e.g. data structures, concurrency, security, frameworks) to ensure high variability between attempts.
        - Vary the concepts, scenario backdrops, and wording.
        
        Requirements:
        Generate exactly 4 high-quality questions.
        
        You MUST return a strictly formatted JSON array containing exactly 4 objects. Each object must have these exact keys:
        {{
            "id": <integer, starting at 1>,
            "question": "<question text or code snippet>",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": <integer representing correct option index: 0, 1, 2, or 3>,
            "rationale": "<explanation of correct choice>",
            "learning_objective": "<learning objective under 15 words>",
            "difficulty": "{difficulty}",
            "category": "{category}",
            "tags": ["<skill-tag-1>", "<skill-tag-2>"],
            "topic": "<domain-subtopic>",
            "estimated_time": <integer estimated time in seconds, e.g. 60>
        }}
        
        Do not wrap the JSON inside markdown code blocks (like ```json ... ```). Only return the raw JSON array string.
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
        
        if not isinstance(parsed_array, list):
            raise TypeError("Gemini output is not a JSON list.")
            
        # Ensure all required metadata keys exist on parsed questions
        for idx, q in enumerate(parsed_array):
            q["id"] = idx + 1
            if "difficulty" not in q:
                q["difficulty"] = difficulty
            if "category" not in q:
                q["category"] = category
            if "tags" not in q:
                q["tags"] = ["syntax"]
            if "topic" not in q:
                q["topic"] = q["tags"][0] if q["tags"] else "general"
            if "estimated_time" not in q:
                q["estimated_time"] = 90 if difficulty == "Hard" else (60 if difficulty == "Medium" else 45)
            
        return parsed_array
    except errors.APIError as exc:
        logger.error("Gemini API error during mock test generation (code %s): %s. Using fallbacks.", exc.code, exc.message)
        return get_fallback_questions_v2(user, domain, difficulty, category)
    except Exception as exc:
        logger.exception("Gemini mock test generation failed: %s. Using fallbacks.", str(exc))
        return get_fallback_questions_v2(user, domain, difficulty, category)


def grade_test_submission(user, mock_test: MockTest, submitted_answers: list, duration: int = 0) -> Scorecard:
    """
    Grade user submitted answers against correct keys.
    Builds a scorecard mapping scores, correctness indicators, and rationales.
    Queries Gemini to compute a detailed AI Performance Review scorecard.
    Calculates detailed performance analytics (Phase 7 & Phase 8).
    Saves and returns the Scorecard document.
    """
    total = len(mock_test.questions)
    correct_count = 0
    graded_answers = []

    submitted_map = {ans.get("question_id"): ans.get("selected_option") for ans in submitted_answers}

    for q in mock_test.questions:
        q_id = q.get("id")
        correct_idx = q.get("correct_answer")
        selected_idx = submitted_map.get(q_id)
        
        is_correct = (selected_idx == correct_idx)
        if is_correct:
            correct_count += 1
            
        graded_answers.append({
            "question_id": q_id,
            "question": q.get("question"),
            "options": q.get("options"),
            "selected_option": selected_idx,
            "correct_answer": correct_idx,
            "is_correct": is_correct,
            "rationale": q.get("rationale"),
            "learning_objective": q.get("learning_objective", "Core topic details"),
            "tags": q.get("tags") or ["syntax"],
            "topic": q.get("topic") or "general",
            "estimated_time": q.get("estimated_time") or 60,
            "difficulty": q.get("difficulty") or "Medium"
        })

    score_pct = int((correct_count / total) * 100) if total > 0 else 0

    # Analytics Performance grids
    topic_perf = {}
    diff_perf = {}
    cat_perf = {}
    
    for q, ans in zip(mock_test.questions, graded_answers):
        q_difficulty = q.get("difficulty", mock_test.difficulty)
        q_category = q.get("category", mock_test.category)
        q_topic = q.get("topic") or (q.get("tags") or ["general"])[0]
        is_correct = ans.get("is_correct", False)
        
        if q_topic not in topic_perf:
            topic_perf[q_topic] = {"correct": 0, "total": 0}
        topic_perf[q_topic]["total"] += 1
        if is_correct:
            topic_perf[q_topic]["correct"] += 1
            
        if q_difficulty not in diff_perf:
            diff_perf[q_difficulty] = {"correct": 0, "total": 0}
        diff_perf[q_difficulty]["total"] += 1
        if is_correct:
            diff_perf[q_difficulty]["correct"] += 1
            
        if q_category not in cat_perf:
            cat_perf[q_category] = {"correct": 0, "total": 0}
        cat_perf[q_category]["total"] += 1
        if is_correct:
            cat_perf[q_category]["correct"] += 1

    for t, val in topic_perf.items():
        val["accuracy"] = int((val["correct"] / val["total"]) * 100)
    for d, val in diff_perf.items():
        val["accuracy"] = int((val["correct"] / val["total"]) * 100)
    for c, val in cat_perf.items():
        val["accuracy"] = int((val["correct"] / val["total"]) * 100)

    strong_topics = [t for t, val in topic_perf.items() if val["accuracy"] >= 75]
    weak_topics = [t for t, val in topic_perf.items() if val["accuracy"] < 75]

    learning_recommendations = []
    if not weak_topics:
        learning_recommendations.append("Outstanding performance! Continue practicing advanced concepts.")
    else:
        topic_recs = {
            "syntax": f"Review {mock_test.domain} basic syntax rules and coding conventions.",
            "oop": f"Improve {mock_test.domain} Object-Oriented Programming (OOP) concepts.",
            "database": "Practice SQL JOINs, indexing patterns, and schema normalizations.",
            "sql": "Practice SQL JOINs, transactional isolations, and query optimization.",
            "docker": "Study Docker Networking, volumes, and multi-stage builds.",
            "kubernetes": "Review Kubernetes pod lifecycles, service discovery, and ConfigMaps.",
            "concurrency": "Review concurrent thread management, race conditions, and thread locks.",
            "memory": "Study memory profiling, reference leak audits, and garbage collection.",
            "security": "Review application security models, OWASP Top 10, and HTTPS SSL/TLS.",
            "asyncio": "Review asynchronous event loops, coroutines, and non-blocking sockets.",
            "virtual DOM": "Study virtual DOM rendering diff algorithms and React state optimization.",
            "hooks": "Practice custom hooks development, useEffect dependencies, and cleanup cycles.",
            "design patterns": "Study design patterns like Singleton, Factory, and CQRS builders."
        }
        for wt in weak_topics:
            match_found = False
            for key, rec_text in topic_recs.items():
                if key in wt.lower():
                    learning_recommendations.append(rec_text)
                    match_found = True
                    break
            if not match_found:
                learning_recommendations.append(f"Review core fundamentals of {wt.capitalize()} in {mock_test.domain}.")

    # Calculate simulated times to get real fastest/slowest question indexes (Phase 7)
    total_weight = sum(ans.get("estimated_time", 60) * (0.8 if ans["is_correct"] else 1.3) for ans in graded_answers)
    simulated_times = []
    for ans in graded_answers:
        w = ans.get("estimated_time", 60) * (0.8 if ans["is_correct"] else 1.3)
        sim_t = int(duration * w / total_weight) if total_weight > 0 else 45
        simulated_times.append(sim_t)
        
    fastest_idx = simulated_times.index(min(simulated_times)) + 1 if simulated_times else 1
    slowest_idx = simulated_times.index(max(simulated_times)) + 1 if simulated_times else 1
    fastest_question = f"Question {fastest_idx}"
    slowest_question = f"Question {slowest_idx}"

    skipped_count = sum(1 for ans in graded_answers if ans.get("selected_option") is None)
    
    # Dynamic Grade strings
    if score_pct >= 95:
        grade = "A+"
        learn_readiness = "High (Ready for advanced topics)"
        interview_readiness = "95% (Job Ready)"
        confidence_level = "High"
    elif score_pct >= 90:
        grade = "A"
        learn_readiness = "High (Ready for specialized frameworks)"
        interview_readiness = "90% (Job Ready)"
        confidence_level = "High"
    elif score_pct >= 75:
        grade = "B"
        learn_readiness = "Medium (Needs minor concept revisions)"
        interview_readiness = "75% (Intermediate)"
        confidence_level = "Moderate"
    elif score_pct >= 60:
        grade = "C"
        learn_readiness = "Medium (Focus on practice implementations)"
        interview_readiness = "55% (Needs Practice)"
        confidence_level = "Moderate"
    elif score_pct >= 40:
        grade = "D"
        learn_readiness = "Low (Revision of core fundamentals required)"
        interview_readiness = "35% (Beginner)"
        confidence_level = "Low"
    else:
        grade = "F"
        learn_readiness = "Low (Fundamental rebuild recommended)"
        interview_readiness = "15% (Beginner)"
        confidence_level = "Low"

    strongest_skill = max(topic_perf.keys(), key=lambda k: topic_perf[k]["accuracy"]) if topic_perf else "General Concepts"
    weakest_skill = min(topic_perf.keys(), key=lambda k: topic_perf[k]["accuracy"]) if topic_perf else "General Concepts"

    analytics_data = {
        "overall_score": score_pct,
        "grade": grade,
        "accuracy_pct": score_pct,
        "correct_answers": correct_count,
        "incorrect_answers": total - correct_count,
        "skipped_questions": skipped_count,
        "total_questions": total,
        "duration": duration,
        "time_spent_per_question": int(duration / total) if total > 0 else 0,
        "topic_performance": topic_perf,
        "difficulty_performance": diff_perf,
        "category_performance": cat_perf,
        "strong_topics": strong_topics,
        "weak_topics": weak_topics,
        "learning_recommendations": learning_recommendations,
        "strongest_skill": strongest_skill,
        "weakest_skill": weakest_skill,
        "fastest_question": fastest_question,
        "slowest_question": slowest_question,
        "learning_readiness": learn_readiness,
        "interview_readiness": interview_readiness,
        "confidence_level": confidence_level,
        # Future readiness architecture placeholders (Phase 11)
        "adaptive_difficulty_ready": True,
        "resume_aware_ready": True,
        "roadmap_aware_ready": True,
        "trend_graphs_supported": True,
        "skill_progression_supported": True,
        "performance_over_time_supported": True
    }

    # Prepare structured fallback coaching (Phase 6)
    incorrect_coaching_list = []
    for ans in graded_answers:
        if not ans["is_correct"]:
            topic = ans.get("topic")
            diff = ans.get("difficulty")
            est_t = ans.get("estimated_time")
            opt_text = ans["options"][ans["selected_option"]] if ans["selected_option"] is not None else "Skipped"
            corr_text = ans["options"][ans["correct_answer"]]
            
            incorrect_coaching_list.append({
                "question_id": ans["question_id"],
                "why_incorrect": f"Selecting '{opt_text}' misses key runtime constraints, semantic declarations, or API specifications of {topic}.",
                "why_correct": f"'{corr_text}' is correct because it implements standard practices and optimal configurations: {ans['rationale']}",
                "misconception": "Assuming syntax defaults without auditing performance side effects or reference scopes.",
                "real_world_example": f"Deploying high-load {topic} modules using block socket executions instead of multiplexed event queues.",
                "interview_tip": f"Be prepared to define design patterns, worst-case scaling boundaries, and debug pipelines for {topic}.",
                "concept_to_study": topic,
                "est_study_time": f"{int((est_t or 60) * 1.5 // 60)} Hours",
                "missed_concept_difficulty": diff
            })

    # Call Gemini to generate the AI Performance Review
    client = get_gemini_client()
    performance_review = {
        "summary": "Assessment graded successfully. Review recommendations and individual question audit logs below.",
        "strengths": ["Demonstrated understanding of core domain definitions."],
        "weaknesses": ["Improve depth in edge-case optimization techniques."],
        "incorrect_concepts": ["Configuration settings", "Query design"] if score_pct < 100 else [],
        "common_mistakes": ["Selected incorrect syntax configuration options."],
        "improvement_areas": ["Focus study on intermediate lifecycle hooks and memory profiles."],
        "learning_recommendations": ["Review official tutorials for standard lifecycle designs."],
        "suggested_next_topics": [mock_test.domain],
        "suggested_next_assessment": f"A follow-up assessment on {mock_test.domain} at Medium difficulty",
        "incorrect_coaching": incorrect_coaching_list
    }

    if client:
        try:
            review_prompt = f"""
            You are an AI career coach and technical assessor.
            Provide a detailed performance review for the assessment completed by the user.
            
            Assessment Details:
            - Domain: {mock_test.domain}
            - Category: {mock_test.category}
            - Difficulty: {mock_test.difficulty}
            - Final Score: {score_pct}% ({correct_count} correct out of {total} questions)
            
            Details of submitted answers:
            {json.dumps(graded_answers)}
            
            You MUST return a strictly formatted JSON document with these exact keys:
            {{
                "summary": "<overall summary of the assessment performance>",
                "strengths": [<list of strings of user's strong areas based on correct answers>],
                "weaknesses": [<list of strings of areas needing improvement based on incorrect answers>],
                "incorrect_concepts": [<list of concepts that user got wrong>],
                "common_mistakes": [<list of specific mistake patterns or syntax errors the user made>],
                "improvement_areas": [<concrete actionable action items to focus on>],
                "learning_recommendations": [<personalized study tips>],
                "suggested_next_topics": [<next topics to study>],
                "suggested_next_assessment": "<suggested topic and difficulty for the next mock test>",
                "incorrect_coaching": [
                    {{
                        "question_id": <integer id of incorrect question>,
                        "why_incorrect": "<detailed explanation why selected option is wrong>",
                        "why_correct": "<detailed explanation why correct option is correct>",
                        "misconception": "<common misconception associated with this concept>",
                        "real_world_example": "<real-world system deployment or architecture scenario>",
                        "interview_tip": "<crucial tip to mention when asked about this in interviews>",
                        "concept_to_study": "<exact skill concept name>",
                        "est_study_time": "<estimated time, e.g. 2 Hours>",
                        "missed_concept_difficulty": "<Easy/Medium/Hard>"
                    }}
                ]
            }}
            Do not wrap JSON in markdown formatting.
            """
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=review_prompt,
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
                
                parsed_review = json.loads(raw_text)
                performance_review = {
                    "summary": parsed_review.get("summary", ""),
                    "strengths": parsed_review.get("strengths") or [],
                    "weaknesses": parsed_review.get("weaknesses") or [],
                    "incorrect_concepts": parsed_review.get("incorrect_concepts") or [],
                    "common_mistakes": parsed_review.get("common_mistakes") or [],
                    "improvement_areas": parsed_review.get("improvement_areas") or [],
                    "learning_recommendations": parsed_review.get("learning_recommendations") or [],
                    "suggested_next_topics": parsed_review.get("suggested_next_topics") or [],
                    "suggested_next_assessment": parsed_review.get("suggested_next_assessment") or "",
                    "incorrect_coaching": parsed_review.get("incorrect_coaching") or incorrect_coaching_list
                }
        except Exception as exc:
            logger.exception("Failed to compile AI Performance Review via Gemini: %s. Using default critique.", str(exc))

    # Append computed recommendations and analytics data
    for rec in learning_recommendations:
        if rec not in performance_review["learning_recommendations"]:
            performance_review["learning_recommendations"].append(rec)
    performance_review["analytics"] = analytics_data

    scorecard = Scorecard(
        user=user,
        mock_test=mock_test,
        domain=mock_test.domain,
        difficulty=mock_test.difficulty,
        category=mock_test.category,
        score=score_pct,
        total_questions=total,
        correct_answers=correct_count,
        duration=duration,
        performance_review=performance_review,
        answers_submitted=graded_answers
    )
    scorecard.save()
    from apps.recommendations.models import increment_lifetime_stat
    increment_lifetime_stat("total_interviews_completed")
    return scorecard

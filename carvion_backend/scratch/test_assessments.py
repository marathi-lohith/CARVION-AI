import os
import django
import sys

# Ensure backend root is in sys.path
sys.path.append(r"c:\Users\marat\OneDrive\Desktop\carvion-ai\carvion_backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.authentication.models import User
from apps.assessments.models import MockTest, Scorecard
from apps.assessments.question_bank import get_fallback_questions_v2
from apps.assessments.services import grade_test_submission

user = User.objects.first()
if not user:
    print("No user found in DB!")
    exit(1)

print(f"--- Mock Assessment Enhancement Test for User: {user.email} ---\n")

# Clear past mock tests & scorecards for cleaner test run
MockTest.objects(user=user).delete()
Scorecard.objects(user=user).delete()

# Test 1: Role-Specific Verification (Python vs Java vs React)
print("Verifying Role-Specific Question Generation:")
py_questions = get_fallback_questions_v2(user, "Python Developer", "Easy", "MCQ")
jv_questions = get_fallback_questions_v2(user, "Java Developer", "Easy", "MCQ")
rc_questions = get_fallback_questions_v2(user, "React Developer", "Easy", "MCQ")

print(f"  Python easy MCQ 1st question: '{py_questions[0]['question']}'")
print(f"  Java easy MCQ 1st question: '{jv_questions[0]['question']}'")
print(f"  React easy MCQ 1st question: '{rc_questions[0]['question']}'")

assert py_questions[0]['question'] != jv_questions[0]['question'], "Python and Java questions are identical!"
assert jv_questions[0]['question'] != rc_questions[0]['question'], "Java and React questions are identical!"
print("  [PASS]: Offline fallback returns different questions for different roles.\n")

# Test 2: Difficulty-Specific Verification (Easy vs Medium vs Hard)
print("Verifying Difficulty-Specific Question Generation (using Python Developer):")
easy_q = get_fallback_questions_v2(user, "Python Developer", "Easy", "MCQ")
med_q = get_fallback_questions_v2(user, "Python Developer", "Medium", "MCQ")
hard_q = get_fallback_questions_v2(user, "Python Developer", "Hard", "MCQ")

print(f"  Easy: {easy_q[0]['question']}")
print(f"  Medium: {med_q[0]['question']}")
print(f"  Hard: {hard_q[0]['question']}")

assert easy_q[0]['question'] != med_q[0]['question'], "Easy and Medium questions are identical!"
assert med_q[0]['question'] != hard_q[0]['question'], "Medium and Hard questions are identical!"
print("  [PASS]: Offline fallback returns different questions for different difficulties.\n")

# Test 3: Category-Specific Verification (MCQ vs Coding vs Aptitude)
print("Verifying Category-Specific Question Generation (using Python Developer - Easy):")
mcq_q = get_fallback_questions_v2(user, "Python Developer", "Easy", "MCQ")
code_q = get_fallback_questions_v2(user, "Python Developer", "Easy", "Coding")
apt_q = get_fallback_questions_v2(user, "Python Developer", "Easy", "Aptitude")

print(f"  MCQ: {mcq_q[0]['question']}")
print(f"  Coding: {code_q[0]['question']}")
print(f"  Aptitude: {apt_q[0]['question']}")

assert mcq_q[0]['question'] != code_q[0]['question'], "MCQ and Coding questions are identical!"
assert code_q[0]['question'] != apt_q[0]['question'], "Coding and Aptitude questions are identical!"
print("  [PASS]: Offline fallback returns different questions for different categories.\n")

# Test 4: Prevent Immediate Repetition Verification
print("Verifying Repetition Prevention:")
# Save first set of questions to DB as a MockTest to simulate history
test1 = MockTest(
    user=user,
    domain="Python Developer",
    difficulty="Easy",
    category="MCQ",
    questions=easy_q
)
test1.save()

# Generate again
easy_q_second_run = get_fallback_questions_v2(user, "Python Developer", "Easy", "MCQ")
print(f"  First run questions IDs: {[q.get('bank_id') for q in easy_q]}")
print(f"  Second run questions IDs: {[q.get('bank_id') for q in easy_q_second_run]}")

# Since the pool size is enough, the second run questions should have different bank_ids
duplicate_ids = set([q.get('bank_id') for q in easy_q]).intersection([q.get('bank_id') for q in easy_q_second_run])
print(f"  Overlapping questions IDs: {duplicate_ids}")
assert len(duplicate_ids) < len(easy_q), "All questions immediately repeated!"
print("  [PASS]: Repeated assessments do not immediately return the same questions.\n")

# Test 5: Analytics Calculations & Scorecard Verification
print("Verifying Scorecard Grading & Analytics Calculation:")
test2 = MockTest(
    user=user,
    domain="Python Developer",
    difficulty="Easy",
    category="MCQ",
    questions=easy_q
)
test2.save()

# Submit correct answers for questions 1 and 2 (making it 50% score)
correct_idx_1 = easy_q[0]["correct_answer"]
correct_idx_2 = easy_q[1]["correct_answer"]
answers_payload = [
    {"question_id": 1, "selected_option": correct_idx_1},
    {"question_id": 2, "selected_option": correct_idx_2},
    {"question_id": 3, "selected_option": (easy_q[2]["correct_answer"] + 1) % 4}, # wrong
    {"question_id": 4, "selected_option": (easy_q[3]["correct_answer"] + 1) % 4}  # wrong
]

scorecard = grade_test_submission(user, test2, answers_payload, duration=120)

print(f"  Graded Score: {scorecard.score}%")
print(f"  Correct: {scorecard.correct_answers}/{scorecard.total_questions}")
print(f"  Duration: {scorecard.duration}s")

# Check metadata is correctly stored on questions
for q in test2.questions:
    print(f"  Question Metadata -> Topic: {q.get('topic')}, Tags: {q.get('tags')}, Est Time: {q.get('estimated_time')}")
    assert q.get('topic') is not None
    assert q.get('tags') is not None
    assert q.get('estimated_time') is not None

# Check analytics dictionary
analytics = scorecard.performance_review.get("analytics")
print("\nGenerated Scorecard Analytics:")
print(f"  Overall Score: {analytics.get('overall_score')}%")
print(f"  Accuracy: {analytics.get('accuracy_pct')}%")
print(f"  Time spent per question: {analytics.get('time_spent_per_question')}s")
print(f"  Topic Performance: {analytics.get('topic_performance')}")
print(f"  Difficulty Performance: {analytics.get('difficulty_performance')}")
print(f"  Category Performance: {analytics.get('category_performance')}")
print(f"  Weak Topics: {analytics.get('weak_topics')}")
print(f"  Strong Topics: {analytics.get('strong_topics')}")
print(f"  Learning Recommendations: {analytics.get('learning_recommendations')}")

assert analytics.get('overall_score') == 50
assert analytics.get('correct_answers') == 2
assert len(analytics.get('learning_recommendations')) > 0
print("  [PASS]: Question metadata is stored correctly & Assessment analytics calculate correctly.\n")

print("All Verification Tests Completed Successfully!")

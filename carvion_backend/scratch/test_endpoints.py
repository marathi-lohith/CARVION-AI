import os
import django
from django.conf import settings

# Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

import logging
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.authentication.models import User
from apps.resumes.services.gemini_analyser import analyze_resume_with_gemini
from apps.learning.services import generate_roadmap_with_gemini
from apps.assessments.services import generate_mock_test_with_gemini
from apps.chatbot.services import query_gemini_advisor
from apps.resumes.views import resume_optimize_view, cover_letter_generator_view
from apps.profiles.views import skill_gap_analyzer_view
from apps.recommendations.views import career_insights_view
from apps.assessments.views import interview_practice_view

# Configure logging to stdout so we can see error logs during testing
logging.basicConfig(level=logging.INFO)

def run_tests():
    user = User.objects.first()
    if not user:
        print("Error: No user found in database.")
        return
        
    print(f"Testing using User: {user.email} (Role: {user.role})")
    
    factory = APIRequestFactory()
    
    # Define a helper to run views
    def test_view(view_func, method, path, data=None):
        request = getattr(factory, method.lower())(path, data, format='json')
        force_authenticate(request, user=user)
        response = view_func(request)
        print(f"  {view_func.__name__} ({method}) -> Status Code: {response.status_code}")
        print(f"  Response data: {response.data}")
        return response

    print("\n=== Testing Services Directly ===")
    
    # 1. analyze_resume_with_gemini
    print("\nTesting analyze_resume_with_gemini:")
    res = analyze_resume_with_gemini("John Doe\nPython Developer\nExperience: 2 years writing Django apps.", "Python Developer")
    print("Result:", res)
    
    # 2. generate_roadmap_with_gemini
    print("\nTesting generate_roadmap_with_gemini:")
    res = generate_roadmap_with_gemini("Python Developer", ["Python"], ["Docker", "Kubernetes"])
    print("Result:", res)
    
    # 3. generate_mock_test_with_gemini
    print("\nTesting generate_mock_test_with_gemini:")
    res = generate_mock_test_with_gemini("Python", "Medium", "MCQ")
    print("Result:", res)
    
    # 4. query_gemini_advisor
    print("\nTesting query_gemini_advisor:")
    res = query_gemini_advisor(user, "What projects should I build to learn Docker?", [])
    print("Result:", res)
    
    print("\n=== Testing Views ===")
    
    # 5. resume_optimize_view
    print("\nTesting resume_optimize_view:")
    test_view(resume_optimize_view, "POST", "/resumes/optimize/", {
        "text": "Experienced web developer seeking Python role.",
        "target_role": "Python Developer"
    })
    
    # 6. cover_letter_generator_view
    print("\nTesting cover_letter_generator_view:")
    test_view(cover_letter_generator_view, "POST", "/resumes/cover-letter/", {
        "text": "Experienced Python Developer.",
        "job_description": "We need a Django Developer.",
        "company_name": "Acme Corp",
        "target_role": "Python Developer"
    })
    
    # 7. skill_gap_analyzer_view
    print("\nTesting skill_gap_analyzer_view:")
    test_view(skill_gap_analyzer_view, "GET", "/profiles/skill-gap/")
    
    # 8. career_insights_view
    print("\nTesting career_insights_view:")
    test_view(career_insights_view, "GET", "/recommendations/career-insights/")
    
    # 9. interview_practice_view POST
    print("\nTesting interview_practice_view POST:")
    test_view(interview_practice_view, "POST", "/assessments/interview/", {
        "role": "Python Developer"
    })
    
    # 10. interview_practice_view PUT
    print("\nTesting interview_practice_view PUT:")
    test_view(interview_practice_view, "PUT", "/assessments/interview/", {
        "role": "Python Developer",
        "answers": [
            {"question_id": 1, "answer": "I have 3 years of experience in Django."}
        ]
    })

if __name__ == '__main__':
    run_tests()

import json
import logging
from django.conf import settings
from common.gemini_client import get_gemini_client
from google.genai import errors

logger = logging.getLogger("carvion.api")

def _deterministic_ats_analysis(resume_text: str, role: str = "") -> dict:
    """
    Compute a per-resume ATS analysis deterministically from the resume text.
    This ensures every resume receives a unique score regardless of Gemini availability.

    Scoring weights:
      Skills presence       30 pts  (scaled by token count)
      Resume completeness   25 pts  (sections present)
      Keyword density       20 pts  (words vs role keywords)
      Experience depth      15 pts  (words in experience blocks)
      Education present     10 pts
    Total = 100 pts
    """
    import re

    text_lower = resume_text.lower()
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.]*", resume_text)
    word_count = len(words)

    # ── 1. Skills Presence (30 pts) ──────────────────────────────────────────
    KNOWN_TECHNICAL = [
        "python", "java", "javascript", "typescript", "c++", "c#", "php", "ruby", "go", "rust",
        "sql", "mysql", "postgresql", "mongodb", "redis", "sqlite",
        "html", "css", "react", "angular", "vue", "node", "django", "flask", "spring",
        "docker", "kubernetes", "aws", "azure", "gcp", "linux", "git", "jenkins",
        "tensorflow", "pytorch", "pandas", "numpy", "scikit",
        "excel", "word", "powerpoint", "office",
        "rest", "graphql", "microservices", "agile", "scrum",
        "ms word", "ms office", "ms excel",
    ]
    found_tech = [t for t in KNOWN_TECHNICAL if re.search(r'\b' + re.escape(t) + r'\b', text_lower)]
    skills_score = min(30, round((len(found_tech) / max(1, 8)) * 30))

    # ── 2. Completeness (25 pts) ─────────────────────────────────────────────
    SECTION_MARKERS = {
        "summary":     r'\b(summary|objective|profile|about)\b',
        "experience":  r'\b(experience|work|employment|internship)\b',
        "education":   r'\b(education|degree|university|college|school)\b',
        "skills":      r'\b(skills|technologies|competencies)\b',
        "projects":    r'\b(projects?|portfolio)\b',
        "contact":     r'[\w.\-]+@[\w.\-]+\.\w{2,}|(\+?\d[\d\s\-]{7,}\d)',
    }
    section_hits = sum(1 for pat in SECTION_MARKERS.values() if re.search(pat, text_lower))
    completeness_score = round((section_hits / len(SECTION_MARKERS)) * 25)

    # ── 3. Keyword Density (20 pts) ──────────────────────────────────────────
    # Use role keywords if role is given; else use generic professional terms
    role_words = re.findall(r"[a-zA-Z]+", (role or "").lower())
    generic_prof = ["manage", "develop", "design", "implement", "analyse", "analyze",
                    "communicate", "collaborate", "coordinate", "lead", "support",
                    "create", "build", "maintain", "optimize", "monitor"]
    check_words = role_words + generic_prof
    matches = sum(1 for w in check_words if re.search(r'\b' + re.escape(w) + r'\b', text_lower))
    keyword_density_score = min(20, round((matches / max(1, len(check_words))) * 20))

    # ── 4. Experience Depth (15 pts) ────────────────────────────────────────
    exp_match = re.search(
        r'(experience|work history|employment)(.*?)(education|skills|projects|$)',
        text_lower, re.DOTALL
    )
    exp_word_count = len(re.findall(r'\w+', exp_match.group(2))) if exp_match else 0
    exp_score = min(15, round((exp_word_count / max(1, 100)) * 15))

    # ── 5. Education (10 pts) ────────────────────────────────────────────────
    edu_score = 10 if re.search(r'\b(bachelor|master|degree|bsc|mca|mba|phd|diploma|b\.tech|m\.tech|b\.e|m\.e)\b', text_lower) else 5

    total = skills_score + completeness_score + keyword_density_score + exp_score + edu_score

    # ── Missing keywords: role-specific terms NOT found in resume ─────────────
    ROLE_KEYWORD_MAP = {
        "software": ["REST APIs", "Docker", "Unit Testing", "Git", "Agile"],
        "backend":  ["REST APIs", "Docker", "PostgreSQL", "Redis", "Kafka"],
        "frontend": ["React", "TypeScript", "Webpack", "SASS", "Accessibility"],
        "data":     ["Pandas", "SQL", "Power BI", "Machine Learning", "Statistics"],
        "devops":   ["Kubernetes", "Terraform", "CI/CD", "Ansible", "Prometheus"],
        "admin":    ["MS Excel", "SAP", "Filing Systems", "Scheduling", "Reporting"],
        "analyst":  ["Excel", "Power BI", "SQL", "Data Modelling", "Dashboards"],
        "manager":  ["Budgeting", "KPI Tracking", "Team Leadership", "Stakeholder Management", "JIRA"],
        "designer": ["Figma", "Adobe XD", "Typography", "UX Research", "Prototyping"],
        "ml":       ["TensorFlow", "PyTorch", "Feature Engineering", "Model Deployment", "Scikit-learn"],
    }
    role_key = next((k for k in ROLE_KEYWORD_MAP if k in (role or "").lower()), "software")
    candidates = ROLE_KEYWORD_MAP[role_key]
    missing_kw = [kw for kw in candidates if kw.lower() not in text_lower]

    # Supplement with generic technical terms not in resume
    generic_missing_pool = [
        "GitHub", "Agile Methodology", "Communication Skills", "Problem Solving",
        "Version Control", "Code Review", "Documentation", "API Design"
    ]
    for kw in generic_missing_pool:
        if kw.lower() not in text_lower and kw not in missing_kw and len(missing_kw) < 6:
            missing_kw.append(kw)

    style_feedback = []
    if word_count < 300:
        style_feedback.append("Resume appears brief. Consider expanding experience descriptions with measurable achievements.")
    if not re.search(r'\b(increased|reduced|improved|optimized|delivered|achieved|led|built|designed)\b', text_lower):
        style_feedback.append("Use quantified impact verbs (e.g., 'Increased test coverage by 40%') to strengthen bullet points.")
    if not style_feedback:
        style_feedback = ["Profile tone is professional. Ensure each bullet point starts with an action verb for better ATS parsing."]

    structural_feedback = []
    if section_hits < 4:
        structural_feedback.append(f"Only {section_hits} of 6 expected resume sections detected. Add missing sections for better ATS parsing.")
    if not re.search(r'[\w.\-]+@[\w.\-]+\.\w{2,}', resume_text):
        structural_feedback.append("No email address detected. Ensure contact information is present and correctly formatted.")
    if not structural_feedback:
        structural_feedback = ["Resume structure is well-formed. All major ATS-parsable sections were detected."]

    return {
        "ats_score": max(20, min(total, 98)),  # clamp 20–98 for realism
        "missing_keywords": missing_kw,
        "style_feedback": style_feedback,
        "structural_feedback": structural_feedback,
        "actionable_suggestions": [
            f"Incorporate missing {role_key} keywords ({', '.join(missing_kw[:3])}) into your experience descriptions.",
            "Quantify your contributions with metrics (e.g., 'Reduced deployment time by 35%') to strengthen ATS ranking.",
            "Ensure your Professional Summary section explicitly mentions your target role title.",
        ]
    }


def get_fallback_analysis(resume_text: str = "", role: str = "") -> dict:
    """
    Fallback evaluation used when the Gemini API is offline or unconfigured.
    Delegates to the deterministic ATS engine so every resume gets a unique result.
    """
    return _deterministic_ats_analysis(resume_text, role)


def analyze_resume_with_gemini(resume_text: str, target_role: str = "") -> dict:
    """
    Connect to Google Gemini API to evaluate resume ATS performance.
    Forces response format into a validated JSON layout containing score, keywords, and text audits.
    """
    client = get_gemini_client()
    if not client:
        logger.warning("Gemini Client is not configured. Invoking fallback analyzer.")
        return get_fallback_analysis(resume_text, target_role)

    try:
        prompt = f"""
        You are an expert Technical Recruiter and Applicant Tracking System (ATS) Auditor.
        Review the resume content below. 
        Target Role: {target_role or "Software Engineer"}
        
        Analyze missing skills, style problems, structural readability errors, and provide a quantitative matching score.
        You MUST return a strictly formatted JSON document with these exact keys:
        {{
            "ats_score": <integer score between 0 and 100>,
            "missing_keywords": [<list of strings representing technical keywords or tools needed for this role>],
            "style_feedback": [<list of strings critiqueing phrasing, language tone, or length>],
            "structural_feedback": [<list of strings pointing out formatting, heading, or machine-reading problems>],
            "actionable_suggestions": [<list of strings describing specific, clear revisions>]
        }}
        
        Do not wrap the JSON inside markdown ticks (like ```json ... ```) or output any conversational text. 
        Only return the raw JSON object string.
        
        Resume Content:
        {resume_text}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        
        if not response or not response.text:
            raise ValueError("Received empty response from Gemini API.")
            
        raw_text = response.text.strip()
        
        # Strip potential markdown code block wrappers if generated by the LLM
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed_data = json.loads(raw_text)
        
        # Verify required keys exist
        required_keys = ["ats_score", "missing_keywords", "style_feedback", "structural_feedback", "actionable_suggestions"]
        for key in required_keys:
            if key not in parsed_data:
                raise KeyError(f"Missing required key in Gemini output: {key}")
                
        return parsed_data
    except errors.APIError as exc:
        logger.error("Gemini API error during resume analysis (code %s): %s. Using fallback.", exc.code, exc.message)
        return get_fallback_analysis(resume_text, target_role)
    except Exception as exc:
        logger.exception("Gemini resume analysis failed: %s. Using safe fallback.", str(exc))
        return get_fallback_analysis(resume_text, target_role)


def _deterministic_experiences_extract(text: str) -> list:
    """
    Deterministically extract work experience blocks from raw resume text.
    Returns a list of dicts with keys: role, company, description.
    """
    import re
    # Section header patterns for experience blocks
    exp_header = re.compile(
        r'(?:^|\n)\s*(?:work\s+experience|professional\s+experience|employment\s+history|'
        r'experience|internship|work\s+history|career\s+history|relevant\s+experience)\s*[:\-]?\s*\n',
        re.IGNORECASE
    )
    # Boundary: next major section
    boundary = re.compile(
        r'\n\s*(?:education|academic|projects?|certifications?|skills|technical\s+skills|'
        r'summary|objective|profile|publications|awards|achievements|references?|languages?|'
        r'hobbies|interests|volunteer|extra.?curricular)\s*[:\-]?\s*\n',
        re.IGNORECASE
    )

    m = exp_header.search(text)
    if not m:
        return []

    start = m.end()
    bm = boundary.search(text, start)
    block = text[start:bm.start()].strip() if bm else text[start:].strip()
    if not block:
        return []

    # Split the experience block into individual job entries
    # Detect new job by lines that look like a title/company pair
    entry_split = re.compile(
        r'\n(?=[A-Z][^\n]{0,80}\n)',  # New capitalised line = new entry candidate
        re.MULTILINE
    )
    raw_entries = [e.strip() for e in entry_split.split(block) if e.strip()]

    results = []
    for entry in raw_entries:
        if len(entry) < 10:
            continue
        lines = [l.strip() for l in entry.split('\n') if l.strip()]
        role = lines[0] if lines else ''
        company = lines[1] if len(lines) > 1 else ''
        description = ' '.join(lines[2:]) if len(lines) > 2 else ' '.join(lines[:])
        if role:
            results.append({
                "role": role,
                "company": company,
                "description": description
            })
    return results


def _deterministic_educations_extract(text: str) -> list:
    """
    Deterministically extract education blocks from raw resume text.
    Returns a list of dicts with keys: degree, institution, field_of_study.
    """
    import re
    edu_header = re.compile(
        r'(?:^|\n)\s*(?:education|academic\s+background|academic\s+qualifications?|'
        r'qualifications?|academic\s+history|educational\s+background)\s*[:\-]?\s*\n',
        re.IGNORECASE
    )
    boundary = re.compile(
        r'\n\s*(?:experience|work|employment|projects?|courses?|certifications?|skills|technical\s+skills|summary|objective|profile|publications|awards|achievements|references?|languages?|hobbies|interests|volunteer|extra.?curricular)\s*[:\-]?\s*\n',
        re.IGNORECASE
    )

    m = edu_header.search(text)
    if not m:
        return []

    start = m.end()
    bm = boundary.search(text, start)
    block = text[start:bm.start()].strip() if bm else text[start:].strip()
    if not block:
        return []

    # Degree patterns
    degree_pat = re.compile(
        r'\b(b\.tech|m\.tech|b\.e|m\.e|bsc|msc|mca|bca|ba|ma|mba|phd|'
        r'bachelor|master|diploma|associate|doctor|b\.com|m\.com|b\.sc|m\.sc|'
        r'pu[c]?|sslc|x\(sslc\))\b',
        re.IGNORECASE
    )

    results = []
    # Try to build entries from line groups around degree keywords
    lines = [l.strip() for l in block.split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        if degree_pat.search(line):
            degree = line
            institution = lines[i + 1] if i + 1 < len(lines) else ''
            field_of_study = lines[i + 2] if i + 2 < len(lines) else ''
            results.append({
                "degree": degree,
                "institution": institution,
                "field_of_study": field_of_study
            })
            i += 3
        else:
            i += 1

    # If no degree keywords matched, create one block entry from the whole section
    if not results and block:
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        results.append({
            "degree": lines[0] if lines else '',
            "institution": lines[1] if len(lines) > 1 else '',
            "field_of_study": lines[2] if len(lines) > 2 else ''
        })
    return results


def _deterministic_projects_extract(text: str) -> list:
    """
    Deterministically extract project blocks from raw resume text.
    Returns a list of dicts with keys: title, description.
    """
    import re
    proj_header = re.compile(
        r'(?:^|\n)\s*(?:projects?|academic\s+projects?|personal\s+projects?|'
        r'professional\s+projects?|capstone\s+projects?|portfolio)\s*[:\-]?\s*\n',
        re.IGNORECASE
    )
    boundary = re.compile(
        r'\n\s*(?:education|experience|work|employment|courses?|certifications?|skills|technical\s+skills|'
        r'summary|objective|profile|publications|awards|achievements|references?|languages?|'
        r'hobbies|interests|volunteer|extra.?curricular)\s*[:\-]?\s*\n',
        re.IGNORECASE
    )

    m = proj_header.search(text)
    if not m:
        return []

    start = m.end()
    bm = boundary.search(text, start)
    block = text[start:bm.start()].strip() if bm else text[start:].strip()
    if not block:
        return []

    # Split by blank lines or bullet markers indicating a new project
    entries = re.split(r'\n\s*\n|\n(?=[•\-\*▪◦])', block)
    results = []
    for entry in entries:
        entry = entry.strip().lstrip('•-*▪◦ ')
        if not entry or len(entry) < 10:
            continue
        lines = [l.strip().lstrip('•-*▪◦ ') for l in entry.split('\n') if l.strip()]
        title = lines[0] if lines else ''
        description = ' '.join(lines[1:]) if len(lines) > 1 else ''
        if title:
            results.append({"title": title, "description": description})
    return results


def parse_and_analyze_resume_with_gemini(resume_text: str, target_role: str = "") -> dict:
    """
    Perform both ATS analysis and structure parsing in a single Gemini request.
    Returns a dict with:
      - ats_score: int
      - analysis_report: dict
      - structured_data: dict
    """
    client = get_gemini_client()
    if not client:
        logger.warning("Gemini Client is not configured. Invoking fallback analyzer & parser.")
        ats_data = get_fallback_analysis(resume_text, target_role)
        struct_data = _build_deterministic_structure(resume_text)
        return {
            "ats_score": ats_data.get("ats_score", 60),
            "analysis_report": ats_data,
            "structured_data": struct_data
        }

    raw_skills = _deterministic_skills_extract(resume_text)
    definitive_skills = _extract_skills_fallback(raw_skills)

    prompt = f"""
    You are an expert Resume Parser, Technical Recruiter, and Applicant Tracking System (ATS) Auditor.
    Your task is to analyze the resume content below for a target role, and extract structured information.

    Target Role: {target_role or "Software Engineer"}

    You MUST return a strictly formatted JSON document with the following keys and formats:
    {{
        "ats_score": <integer score between 0 and 100>,
        "missing_keywords": [<list of strings representing technical keywords or tools needed for this role but missing or weak in the resume>],
        "style_feedback": [<list of strings critiqueing phrasing, language tone, or length>],
        "structural_feedback": [<list of strings pointing out formatting, heading, or machine-reading problems>],
        "actionable_suggestions": [<list of strings describing specific, clear revisions to improve the resume>],
        
        "profile": {{
            "name": "<candidate full name>",
            "email": "<candidate email address>",
            "phone": "<candidate phone number>",
            "bio": "<exact professional summary/objective/profile text from the resume, copy verbatim, do not truncate>"
        }},
        "experiences": [
            {{
                "role": "<job title or role name>",
                "company": "<company or organisation name>",
                "start_date": "<start date as string, e.g. Jan 2020 or 2020, or empty string if not found>",
                "end_date": "<end date as string, e.g. Dec 2022 or Present, or empty string if not found>",
                "location": "<job location if mentioned, else empty string>",
                "description": "<all bullet points, responsibilities, and accomplishments concatenated into one string>"
            }}
        ],
        "educations": [
            {{
                "degree": "<full degree name, e.g. Bachelor of Technology in Computer Science>",
                "institution": "<university, college, or school name>",
                "field_of_study": "<major, specialization, or field of study>",
                "start_year": "<start year as string, or empty string if not found>",
                "end_year": "<graduation year as string, or empty string if not found>",
                "grade": "<CGPA, percentage, grade, or GPA if mentioned, else empty string>"
            }}
        ],
        "projects": [
            {{
                "title": "<project name>",
                "description": "<project description, technologies used, and key features>",
                "technologies": "<comma-separated list of technologies/tools used, or empty string>",
                "github_link": "<GitHub URL if mentioned, else empty string>",
                "live_link": "<live demo URL if mentioned, else empty string>"
            }}
        ],
        "technical_skills": [<list of normalized technical skills and tools explicitly mentioned in the resume (e.g., Python, Docker, React)>]
    }}

    Rules:
    - If a section or key does not exist in the resume, return an empty array [] or empty string "" or object.
    - Do NOT wrap the JSON inside markdown ticks (like ```json ... ```). Only return the raw JSON object string.
    - Do NOT infer or hallucinate data. Only extract what is present in the resume text.

    Resume Content:
    {resume_text}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if not response or not response.text:
            raise ValueError("Received empty response from Gemini API.")
            
        raw_text = response.text.strip()
        
        # Clean markdown formatting if any
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        # Fix common trailing commas in Gemini JSON output
        import re
        raw_text = re.sub(r',\s*([\]}])', r'\1', raw_text)
        
        data = json.loads(raw_text)
    except Exception as exc:
        logger.error("Failed to parse and analyze resume via Gemini: %s. Using fallbacks.", str(exc))
        ats_data = get_fallback_analysis(resume_text, target_role)
        struct_data = _build_deterministic_structure(resume_text)
        return {
            "ats_score": ats_data.get("ats_score", 60),
            "analysis_report": ats_data,
            "structured_data": struct_data
        }

    # Extract ATS report keys
    analysis_report = {
        "ats_score": data.get("ats_score", 60),
        "missing_keywords": data.get("missing_keywords") or [],
        "style_feedback": data.get("style_feedback") or [],
        "structural_feedback": data.get("structural_feedback") or [],
        "actionable_suggestions": data.get("actionable_suggestions") or []
    }
    
    # Extract structure details
    structured_data = {
        "profile": data.get("profile") or {},
        "experiences": data.get("experiences") or [],
        "educations": data.get("educations") or [],
        "projects": data.get("projects") or [],
        "technical_skills": data.get("technical_skills") or [],
        "soft_skills": []
    }

    # Ensure all required top-level keys always exist in structured_data
    if "profile" not in structured_data:
        structured_data["profile"] = {}
    if "experiences" not in structured_data or not isinstance(structured_data["experiences"], list):
        structured_data["experiences"] = []
    if "educations" not in structured_data or not isinstance(structured_data["educations"], list):
        structured_data["educations"] = []
    if "projects" not in structured_data or not isinstance(structured_data["projects"], list):
        structured_data["projects"] = []

    # If Gemini returned empty arrays, try deterministic fallback extractors
    if not structured_data["experiences"]:
        structured_data["experiences"] = _deterministic_experiences_extract(resume_text)
    if not structured_data["educations"]:
        structured_data["educations"] = _deterministic_educations_extract(resume_text)
    if not structured_data["projects"]:
        structured_data["projects"] = _deterministic_projects_extract(resume_text)

    # Normalize technical skills list
    gemini_tech = _normalize_skills_list(structured_data.get("technical_skills") or [])
    
    # Cross-reference with deterministic skills list if definitive_skills is populated
    if definitive_skills:
        clean_tech = []
        import re
        def is_allowed(skill, definitive_list):
            for d in definitive_list:
                if re.search(r'\b' + re.escape(skill) + r'\b', d, re.IGNORECASE):
                    return True
            return False
                
        for s in gemini_tech:
            if is_allowed(s, definitive_skills) and s not in clean_tech:
                clean_tech.append(s)
        # If cross-referencing removed all skills, fallback to normalized gemini_tech or definitive_skills
        structured_data["technical_skills"] = clean_tech if clean_tech else (gemini_tech if gemini_tech else definitive_skills)
    else:
        structured_data["technical_skills"] = gemini_tech

    # Soft skills pipeline
    structured_data["soft_skills"] = _deterministic_soft_skills_extract(
        resume_text, 
        structured_data.get("experiences", [])
    )

    return {
        "ats_score": analysis_report.get("ats_score", 60),
        "analysis_report": analysis_report,
        "structured_data": structured_data
    }


def parse_resume_structure_with_gemini(resume_text: str) -> dict:
    """
    Parse the raw resume text into structured sections: profile, experiences, educations, projects, skills, summary.
    """
    client = get_gemini_client()
    if not client:
        return _build_deterministic_structure(resume_text)
        
    raw_skills = _deterministic_skills_extract(resume_text)

    prompt = f"""
    You are an expert Resume Parser AI. Your task is to extract structured information from the raw resume text below.

    IMPORTANT INSTRUCTIONS:
    1. You MUST extract ALL sections that are present in the resume. Do not skip any section.
    2. For section headings, look for ANY of these common variations (not case-sensitive):
       - Experience: "Experience", "Work Experience", "Professional Experience", "Employment History", "Work History", "Internship", "Career History", "Relevant Experience"
       - Education: "Education", "Academic Background", "Qualifications", "Academic History", "Educational Background"
       - Projects: "Projects", "Academic Projects", "Personal Projects", "Professional Projects", "Capstone Project", "Portfolio"
    3. Do NOT leave an array empty if the corresponding section exists in the resume text.
    4. Extract ALL items found under each section.

    Return a strictly formatted JSON document with EXACTLY these keys:
    {{
        "profile": {{
            "name": "<candidate full name>",
            "email": "<candidate email address>",
            "phone": "<candidate phone number>",
            "bio": "<exact professional summary/objective/profile text from the resume, copy verbatim, do not truncate>"
        }},
        "experiences": [
            {{
                "role": "<job title or role name>",
                "company": "<company or organisation name>",
                "start_date": "<start date as string, e.g. Jan 2020 or 2020, or empty string if not found>",
                "end_date": "<end date as string, e.g. Dec 2022 or Present, or empty string if not found>",
                "location": "<job location if mentioned, else empty string>",
                "description": "<all bullet points, responsibilities, and accomplishments concatenated into one string>"
            }}
        ],
        "educations": [
            {{
                "degree": "<full degree name, e.g. Bachelor of Technology in Computer Science>",
                "institution": "<university, college, or school name>",
                "field_of_study": "<major, specialization, or field of study>",
                "start_year": "<start year as string, or empty string if not found>",
                "end_year": "<graduation year as string, or empty string if not found>",
                "grade": "<CGPA, percentage, grade, or GPA if mentioned, else empty string>"
            }}
        ],
        "projects": [
            {{
                "title": "<project name>",
                "description": "<project description, technologies used, and key features>",
                "technologies": "<comma-separated list of technologies/tools used, or empty string>",
                "github_link": "<GitHub URL if mentioned, else empty string>",
                "live_link": "<live demo URL if mentioned, else empty string>"
            }}
        ]
    }}

    Rules:
    - If a section does not exist in the resume, return an empty array [] for that key.
    - Do NOT infer or hallucinate data. Only extract what is present in the resume text.
    - Do NOT wrap the JSON inside markdown code blocks. Only return the raw JSON object string.
    - Always include all four top-level keys: profile, experiences, educations, projects.

    Resume Text:
    {resume_text}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if not response or not response.text:
            return _build_deterministic_structure(resume_text)
            
        raw_text = response.text.strip()
        # Clean markdown formatting if any
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        import json
        
        # Fix common trailing commas in Gemini JSON output
        import re
        raw_text = re.sub(r',\s*([\]}])', r'\1', raw_text)
        
        data = json.loads(raw_text)
        
        # Ensure all required top-level keys always exist
        if "profile" not in data:
            data["profile"] = {}
        if "experiences" not in data or not isinstance(data["experiences"], list):
            data["experiences"] = []
        if "educations" not in data or not isinstance(data["educations"], list):
            data["educations"] = []
        if "projects" not in data or not isinstance(data["projects"], list):
            data["projects"] = []

        # If Gemini returned empty arrays, try deterministic fallback extractors
        if not data["experiences"]:
            data["experiences"] = _deterministic_experiences_extract(resume_text)
        if not data["educations"]:
            data["educations"] = _deterministic_educations_extract(resume_text)
        if not data["projects"]:
            data["projects"] = _deterministic_projects_extract(resume_text)
            
        # Stage 1 & 2: Deterministic Extraction
        raw_skills = _deterministic_skills_extract(resume_text)
        definitive_skills = _extract_skills_fallback(raw_skills)
        logger.info(f"DEBUG STAGE 3 (Definitive Fallback Parser): {definitive_skills}")
        
        # Stage 3 & 4: Gemini Classification Only
        if definitive_skills:
            gemini_skills = _classify_skills_with_gemini(client, definitive_skills)
            gemini_tech = _normalize_skills_list(gemini_skills.get("technical_skills") or [])
            gemini_soft = _normalize_skills_list(gemini_skills.get("soft_skills") or [])
        else:
            gemini_tech = []
            gemini_soft = []
        
        # Stage 5: Enforce word-boundary cross-referencing for technical skills
        clean_tech = []
        import re
        def is_allowed(skill, definitive_list):
            for d in definitive_list:
                if re.search(r'\b' + re.escape(skill) + r'\b', d, re.IGNORECASE):
                    return True
            return False
                
        for s in gemini_tech:
            if is_allowed(s, definitive_skills) and s not in clean_tech:
                clean_tech.append(s)
                    
        data["technical_skills"] = clean_tech
        
        # New Stage 6: Dedicated Soft Skills Pipeline
        data["soft_skills"] = _deterministic_soft_skills_extract(
            resume_text, 
            data.get("experiences", [])
        )
            
        logger.info(f"DEBUG STAGE 4 (Normalized Tech Skills): {data.get('technical_skills', [])}")
        logger.info(f"DEBUG STAGE 4 (Normalized Soft Skills): {data.get('soft_skills', [])}")
        logger.info(f"DEBUG STRUCTURED: experiences={len(data.get('experiences',[]))}, educations={len(data.get('educations',[]))}, projects={len(data.get('projects',[]))}")
                
        return data
    except Exception as exc:
        logger.error("Failed to parse resume structure via Gemini: %s", str(exc))
        return _build_deterministic_structure(resume_text)


def _build_deterministic_structure(resume_text: str) -> dict:
    """
    Build a full structured_data dict from deterministic extractors alone.
    Used when Gemini is unavailable or fails to parse the resume.
    """
    fallback_bio = _extract_summary_fallback(resume_text)
    raw_skills = _deterministic_skills_extract(resume_text)
    fallback_skills = _extract_skills_fallback(raw_skills)
    experiences = _deterministic_experiences_extract(resume_text)
    educations = _deterministic_educations_extract(resume_text)
    projects = _deterministic_projects_extract(resume_text)
    soft = _deterministic_soft_skills_extract(resume_text, experiences)

    return {
        "profile": {"bio": fallback_bio} if fallback_bio else {},
        "experiences": experiences,
        "educations": educations,
        "projects": projects,
        "technical_skills": fallback_skills,
        "soft_skills": soft
    }



def _classify_skills_with_gemini(client, skills_list):
    import json
    prompt = f"""
    Categorize and normalize the following exact array of skills into "technical_skills".
    Return a strictly formatted JSON document with exactly one key: "technical_skills".
    
    RULES:
    1. Do NOT add, infer, or hallucinate any skills not present in the input array.
    2. Normalize only the formatting (e.g., "Html" -> "HTML", "Ms word" -> "MS Word").
    3. Do NOT include soft skills.
    
    Input Array:
    {json.dumps(skills_list)}
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if not response or not response.text:
            return {}
            
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        import re
        raw_text = re.sub(r',\s*([\]}])', r'\1', raw_text)
        
        data = json.loads(raw_text)
        return data
    except Exception as exc:
        return {}

def _deterministic_skills_extract(text: str) -> str:
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    headers = [
        r'technical\s+skills\s*(?:&|and)?\s*key\s*skills',
        r'technical\s+skills',
        r'key\s+skills',
        r'core\s+skills',
        r'skills\s+summary',
        r'skills\s*(?:&|and)\s*technologies',
        r'skills',
        r'technologies',
        r'technology\s+stack',
        r'technical\s+proficiencies',
        r'programming\s+languages',
        r'tools',
        r'software\s+skills'
    ]
    
    headers = sorted(headers, key=len, reverse=True)
    header_pattern = re.compile(r'\b(' + '|'.join(headers) + r')\b[\s:]*', re.IGNORECASE)
    
    match = header_pattern.search(text)
    
    if match:
        logger.info(f"DEBUG DETECTOR: Section Header Found -> {match.group(1)}")
        start_idx = match.end()
        end_headers = [
            r'education', r'experience', r'projects', r'employment', 
            r'work\s+history', r'certifications', r'summary', r'objective', 
            r'profile', r'languages', r'achievements', r'hobbies', r'references'
        ]
        next_header_pattern = re.compile(r'\b(' + '|'.join(end_headers) + r')\b[\s:]*', re.IGNORECASE)
        next_match = next_header_pattern.search(text, start_idx)
        
        if next_match:
            raw_skills_text = text[start_idx:next_match.start()].strip()
            logger.info(f"DEBUG DETECTOR: Section End Found -> {next_match.group(1)}")
        else:
            raw_skills_text = text[start_idx:].strip()
            logger.info(f"DEBUG DETECTOR: No end section found, took rest of text.")
            
        if raw_skills_text:
            logger.info(f"DEBUG DETECTOR: Raw Section Text -> {raw_skills_text}")
            return raw_skills_text
    else:
        logger.info("DEBUG DETECTOR: Failed to find any matching technical skills header in the resume text.")

    return ""

def _normalize_skills_list(skills: list) -> list:
    import re
    mapping = {
        r'react\.js': 'React',
        r'reactjs': 'React',
        r'nodejs': 'Node.js',
        r'node\.js': 'Node.js',
        r'^js$': 'JavaScript',
        r'postgre sql': 'PostgreSQL',
        r'postgres': 'PostgreSQL'
    }
    
    final_skills = []
    seen = set()
    for s in skills:
        s = s.strip()
        s = re.sub(r'^[-•*]\s*', '', s)
        if not s: continue
        
        # Apply normalization mappings
        norm = s
        for pattern, replacement in mapping.items():
            if re.fullmatch(pattern, s, re.IGNORECASE):
                norm = replacement
                break
                
        key = norm.lower()
        if key not in seen:
            seen.add(key)
            final_skills.append(norm)
    return final_skills

def _extract_skills_fallback(raw_skills: str) -> list:
    import re
    if not raw_skills:
        return []
        
    # Remove header artifacts
    raw_skills = re.sub(r'(?i)^(?:&|and)?\s*key\s*skills\b[:\s-]*', '', raw_skills)
    raw_skills = re.sub(r'(?i)^technical\s+skills\b[:\s-]*', '', raw_skills)
    
    # Priority 2: Structured Parsing of the raw skills block
    tokens = re.split(r'[,\n|;•*\t]|\s{2,}', raw_skills)
    
    # Dictionary of known skills for tokenizing merged strings
    dictionary = [
        r'C', r'C\+\+', r'C#', r'Java', r'Python', r'JavaScript', r'TypeScript', r'PHP', r'Go', r'Rust', r'R',
        r'HTML', r'CSS', r'Bootstrap', r'React', r'Angular', r'Vue', r'Node\.js', r'Express',
        r'SQL', r'MySQL', r'PostgreSQL', r'MongoDB', r'Oracle', r'SQLite',
        r'Git', r'GitHub', r'Docker', r'Kubernetes', r'AWS', r'Azure', r'GCP',
        r'MS Word', r'Microsoft Word', r'MS Excel', r'Microsoft Excel', r'PowerPoint', r'Outlook',
        r'Computer Fundamentals', r'Basic Computer Knowledge', r'Computer System Knowledge', r'Basic Computer System Knowledge',
        r'TensorFlow', r'PyTorch', r'Pandas', r'NumPy', r'Scikit-learn',
        r'Communication', r'Leadership', r'Teamwork', r'Problem Solving', r'Adaptability', 
        r'Time Management', r'Quick Learner', r'Creativity'
    ]
    
    dictionary = sorted(dictionary, key=lambda x: len(x.replace('\\', '')), reverse=True)
    dict_pattern = re.compile(r'(?<![a-zA-Z0-9])(' + '|'.join(dictionary) + r')(?![a-zA-Z0-9])', re.IGNORECASE)
    
    prefixes_to_strip = r'(?i)\b(?:basic|beginner|intermediate|advanced|familiar with|knowledge of|experience with|and|&)\b'
    
    final_skills = []
    
    for t in tokens:
        t = t.strip()
        if not t: continue
        
        parts = dict_pattern.split(t)
        for p in parts:
            if not p: continue
            if dict_pattern.fullmatch(p):
                # Find canonical spelling from the dictionary
                canonical_val = p
                for item in dictionary:
                    clean_item = item.replace('\\', '')
                    if clean_item.lower() == p.lower():
                        canonical_val = clean_item
                        break
                final_skills.append(canonical_val)
            else:
                clean_p = re.sub(prefixes_to_strip, '', p).strip()
                clean_p = re.sub(r'^[.:-]\s*|\s*[.:-]$', '', clean_p).strip()
                if clean_p and len(clean_p) < 50:
                    final_skills.append(clean_p)
    
    return _normalize_skills_list(final_skills)

def _extract_summary_fallback(text: str) -> str:
    import re
    # Priority 2: Extract text following common section headers
    headers = [
        r'professional\s+summary',
        r'career\s+objective',
        r'executive\s+summary',
        r'profile\s+summary',
        r'about\s+me',
        r'^summary$',
        r'^objective$',
        r'^profile$'
    ]
    
    header_pattern = re.compile(r'^\s*(' + '|'.join(headers) + r')\s*$', re.IGNORECASE | re.MULTILINE)
    match = header_pattern.search(text)
    
    if match:
        start_idx = match.end()
        next_header_pattern = re.compile(
            r'^\s*(technical skills|experience|education|projects|employment|work history|certifications|languages|achievements|hobbies|references)\b.*$', 
            re.IGNORECASE | re.MULTILINE
        )
        next_match = next_header_pattern.search(text, start_idx)
        
        if next_match:
            return text[start_idx:next_match.start()].strip()
        else:
            return text[start_idx:].strip()

    # Priority 3: First meaningful introductory paragraph without length thresholds
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Major section headers to skip
    major_headers = [
        r'^(?:education|experience|projects|employment|work history|certifications|skills|languages|achievements|hobbies|references|technical skills)\b.*$'
    ]
    major_headers_pattern = re.compile('|'.join(major_headers), re.IGNORECASE)

    # Patterns to skip contact details and structured metadata
    contact_patterns = [
        r'[\w\.-]+@[\w\.-]+',            # Email
        r'[\d\s()-]{8,}',                # Phone number
        r'github\.com', r'linkedin\.com', # Social links
        r'http[s]?://', r'www\.',        # URLs
        r'\b(?:road|street|st|ave|nagar|floor|talgod|honnavar|karnataka|kannada)\b', # Common address words
        r'\b\d{5,6}\b',                  # Postal pin codes
        r'\b(?:dob|date of birth|born)\b', # DOB keywords
        r'^\d{1,2}[/\.-]\d{1,2}[/\.-]\d{2,4}$'  # Dates
    ]
    contact_regex = re.compile('|'.join(contact_patterns), re.IGNORECASE)

    for i, line in enumerate(lines):
        # Skip candidate name (usually first line of the document)
        if i == 0:
            continue
            
        # Ignore bullet lists
        if line.startswith(('-', '•', '*', '▪', '◦')):
            continue
            
        # Ignore lines that look like section headers
        if major_headers_pattern.match(line):
            continue
            
        # Ignore lines containing contact information/address/pin code/DOB
        if contact_regex.search(line):
            continue
            
        # Must contain at least some alphabetic words (descriptive text)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', line)
        if len(words) < 3: # Must have at least 3 standard words to be a sentence
            continue
            
        # It's a valid introductory paragraph!
        return line
        
    return ""

def _deterministic_soft_skills_extract(resume_text: str, experiences: list) -> list:
    import re
    try:
        from apps.resumes.config.soft_skills_dictionary import CANONICAL_SOFT_SKILLS
    except ImportError:
        CANONICAL_SOFT_SKILLS = {}
        
    section_skills = []
    
    # Priority 1: Explicit Soft Skills Section
    headers = [
        r'soft\s+skills',
        r'personal\s+skills',
        r'professional\s+skills',
        r'interpersonal\s+skills',
        r'strengths',
        r'core\s+competencies'
    ]
    header_pattern = re.compile(r'\b(' + '|'.join(headers) + r')\b[\s:]*', re.IGNORECASE)
    match = header_pattern.search(resume_text)
    
    if match:
        start_idx = match.end()
        end_headers = [
            r'education', r'experience', r'projects', r'employment', 
            r'work\s+history', r'certifications', r'summary', r'objective', 
            r'profile', r'languages', r'achievements', r'hobbies', r'references',
            r'technical\s+skills', r'skills'
        ]
        next_header_pattern = re.compile(r'\b(' + '|'.join(end_headers) + r')\b[\s:]*', re.IGNORECASE)
        next_match = next_header_pattern.search(resume_text, start_idx)
        
        if next_match:
            section_text = resume_text[start_idx:next_match.start()].strip()
        else:
            section_text = resume_text[start_idx:].strip()
            
        if section_text:
            tokens = re.split(r'[,\n|;•*\t]|\s{2,}', section_text)
            for t in tokens:
                t = t.strip()
                # Strip prefix dashes/bullets if any
                t = re.sub(r'^[.:\-•*\s]+', '', t).strip()
                if not t or len(t) > 50:
                    continue
                
                # Check mapping to canonical
                matched_canonical = None
                for canonical, patterns in CANONICAL_SOFT_SKILLS.items():
                    for pat in patterns:
                        if re.search(pat, t, re.IGNORECASE):
                            matched_canonical = canonical
                            break
                    if matched_canonical:
                        break
                
                # If no mapping found, preserve original string in Title Case (e.g. Resilience)
                name = matched_canonical if matched_canonical else t.title()
                
                section_skills.append({
                    "name": name,
                    "source": "Soft Skills Section",
                    "matched_text": t,
                    "confidence": 1.0
                })
                
    if section_skills:
        return _deduplicate_soft_skills_metadata(section_skills)
        
    # Priority 2: Professional Summary / About Me / Objective
    summary_text = _extract_summary_fallback(resume_text)
    summary_skills = []
    if summary_text:
        for canonical, patterns in CANONICAL_SOFT_SKILLS.items():
            for pat in patterns:
                m = re.search(pat, summary_text, re.IGNORECASE)
                if m:
                    summary_skills.append({
                        "name": canonical,
                        "source": "Professional Summary",
                        "matched_text": m.group(0),
                        "confidence": 0.85
                    })
                    break
                    
    if summary_skills:
        return _deduplicate_soft_skills_metadata(summary_skills)
        
    # Priority 3: Experiences
    experience_skills = []
    if experiences:
        for exp in experiences:
            desc = exp.get("description", "")
            if not desc:
                continue
            for canonical, patterns in CANONICAL_SOFT_SKILLS.items():
                for pat in patterns:
                    m = re.search(pat, desc, re.IGNORECASE)
                    if m:
                        experience_skills.append({
                            "name": canonical,
                            "source": f"Experience ({exp.get('company', 'Unknown')})",
                            "matched_text": m.group(0),
                            "confidence": 0.75
                        })
                        break
                        
    return _deduplicate_soft_skills_metadata(experience_skills)

def _deduplicate_soft_skills_metadata(skills_metadata: list) -> list:
    seen = set()
    final = []
    for item in skills_metadata:
        key = item["name"].lower()
        if key not in seen:
            seen.add(key)
            final.append(item)
    return final

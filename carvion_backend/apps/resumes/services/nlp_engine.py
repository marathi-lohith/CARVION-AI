import logging
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("carvion.api")

# Safe spaCy Model Loader: Fallback to blank English model if language model is not downloaded
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy 'en_core_web_sm' model is missing. Falling back to blank English tokenizer.")
    nlp = spacy.blank("en")


def analyze_text_structure(text: str) -> dict:
    """
    Perform low-latency deterministic parsing:
    - Extracts named entities like Organizations (Companies), Dates, and Degrees.
    - Counts active tokens.
    """
    if not text or not text.strip():
        return {"organizations": [], "dates": [], "token_count": 0}

    doc = nlp(text)
    
    organizations = []
    dates = []
    
    # Process entities if language model is loaded
    if nlp.has_pipe("ner"):
        for ent in doc.ents:
            if ent.label_ == "ORG":
                # Filter out generic terms
                name = ent.text.strip()
                if len(name) > 2 and name not in organizations:
                    organizations.append(name)
            elif ent.label_ == "DATE":
                val = ent.text.strip()
                if val not in dates:
                    dates.append(val)
    
    return {
        "organizations": list(set(organizations))[:15],
        "dates": list(set(dates))[:15],
        "token_count": len(doc)
    }


def compute_job_description_similarity(resume_text: str, job_description: str) -> float:
    """
    Calculate Tfidf cosine similarity score matching resume text to a target job description.
    Returns: Similarity score as percentage float between 0 and 100.
    """
    if not resume_text.strip() or not job_description.strip():
        return 0.0

    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf = vectorizer.fit_transform([resume_text, job_description])
        sim_matrix = cosine_similarity(tfidf[0:1], tfidf[1:2])
        score = float(sim_matrix[0][0]) * 100
        return round(score, 2)
    except Exception as exc:
        logger.exception("Cosine similarity calculation failed: %s", str(exc))
        return 0.0

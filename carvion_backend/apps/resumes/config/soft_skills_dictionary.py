# Canonical soft skills regex mappings for deterministic extraction

CANONICAL_SOFT_SKILLS = {
    "Communication": [
        r'\bcommunication\b', 
        r'\bcommunicative\b', 
        r'\bverbal skills\b', 
        r'\bwritten communication\b', 
        r'\bpublic speaking\b', 
        r'\bactive listening\b'
    ],
    "Leadership": [
        r'\bleadership\b', 
        r'\blead\b', 
        r'\bleader\b', 
        r'\bleading\b', 
        r'\bmentor(?:ing)?\b', 
        r'\bcoach(?:ing)?\b'
    ],
    "Teamwork": [
        r'\bteamwork\b', 
        r'\bteam player\b', 
        r'\bteams?\b', 
        r'\bcollaboration\b', 
        r'\bcollaborative\b', 
        r'\bcooperation\b'
    ],
    "Problem Solving": [
        r'\bproblem\s*solving\b', 
        r'\bproblem\s*solver\b', 
        r'\bdecision\s*making\b'
    ],
    "Analytical Thinking": [
        r'\banalytical\s*(?:thinking|skills|mindset)\b',
        r'\banalysis\b'
    ],
    "Critical Thinking": [
        r'\bcritical\s*thinking\b'
    ],
    "Adaptability": [
        r'\badaptability\b', 
        r'\badaptable\b', 
        r'\bflexibility\b', 
        r'\bflexible\b'
    ],
    "Creativity": [
        r'\bcreativity\b', 
        r'\bcreative\b', 
        r'\binnovation\b', 
        r'\binnovative\b'
    ],
    "Time Management": [
        r'\btime\s*management\b', 
        r'\borganization\b', 
        r'\borganizational\b', 
        r'\bplanning\b', 
        r'\bmultitask(?:ing)?\b'
    ],
    "Self Motivation": [
        r'\bself\s*motivated\b', 
        r'\bself\s*motivation\b', 
        r'\bself\s*starter\b', 
        r'\bwork\s*ethic\b', 
        r'\binitiative\b', 
        r'\baccountability\b'
    ],
    "Quick Learner": [
        r'\bquick\s*learner\b', 
        r'\bfast\s*learner\b'
    ],
    "Eager to Learn": [
        r'\beager\s*to\s*learn\b', 
        r'\bwillingness\s*to\s*learn\b', 
        r'\beagerness\s*to\s*learn\b'
    ],
    "Presentation Skills": [
        r'\bpresentation\s*skills\b', 
        r'\bpresenting\b'
    ],
    "Conflict Resolution": [
        r'\bconflict\s*resolution\b', 
        r'\bnegotiation\b'
    ],
    "Customer Service": [
        r'\bcustomer\s*service\b', 
        r'\bclient\s*relations\b'
    ],
    "Attention to Detail": [
        r'\battention\s*to\s*detail\b', 
        r'\bdetail\s*oriented\b'
    ],
    "Interpersonal Skills": [
        r'\binterpersonal\b', 
        r'\bemotional\s*intelligence\b', 
        r'\bactive\s*listening\b'
    ],
    "Project Management": [
        r'\bproject\s*management\b', 
        r'\bproject\s*manager\b'
    ]
}

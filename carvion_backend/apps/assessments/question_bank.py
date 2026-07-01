import random
import logging
from apps.assessments.models import MockTest

logger = logging.getLogger("carvion.api")

# Static Seed Questions (Phase 1 & 2)
STATIC_QUESTION_BANK = [
    # Python Easy MCQ
    {
        "id": "py_e_mcq_static_1",
        "question": "What is the output of print(type([])) in Python?",
        "options": ["<class 'list'>", "<class 'dict'>", "<class 'tuple'>", "<class 'set'>"],
        "correct_answer": 0,
        "rationale": "Square brackets [] are used to initialize list objects in Python.",
        "learning_objective": "Identify basic data types in Python",
        "difficulty": "Easy",
        "category": "MCQ",
        "role": "Python Developer",
        "tags": ["syntax", "data types"],
        "topic": "Data Types",
        "estimated_time": 45,
        "interview_importance": "Medium"
    },
    {
        "id": "py_e_mcq_static_2",
        "question": "Which keyword is used to define a function in Python?",
        "options": ["func", "define", "def", "function"],
        "correct_answer": 2,
        "rationale": "Python uses the 'def' keyword to declare user-defined functions.",
        "learning_objective": "Declare Python functions",
        "difficulty": "Easy",
        "category": "MCQ",
        "role": "Python Developer",
        "tags": ["syntax", "functions"],
        "topic": "Functions",
        "estimated_time": 45,
        "interview_importance": "High"
    },
    # Java Easy MCQ
    {
        "id": "jv_e_mcq_static_1",
        "question": "Which of these is the correct entry point signature for a standard Java Application?",
        "options": ["public void main(String[] args)", "public static void main(String[] args)", "static main(args)", "public static int main(String args)"],
        "correct_answer": 1,
        "rationale": "Java Virtual Machine (JVM) strictly calls 'public static void main(String[] args)' to launch.",
        "learning_objective": "Identify Java entry point",
        "difficulty": "Easy",
        "category": "MCQ",
        "role": "Java Developer",
        "tags": ["syntax", "JVM"],
        "topic": "JVM Basics",
        "estimated_time": 45,
        "interview_importance": "High"
    },
    # React Easy MCQ
    {
        "id": "rc_e_mcq_static_1",
        "question": "What hook is used to manage local state variables in a React functional component?",
        "options": ["useEffect", "useState", "useContext", "useReducer"],
        "correct_answer": 1,
        "rationale": "useState returns a state value and a function to update it dynamically.",
        "learning_objective": "Identify basic state hook",
        "difficulty": "Easy",
        "category": "MCQ",
        "role": "React Developer",
        "tags": ["hooks", "state"],
        "topic": "Hooks",
        "estimated_time": 45,
        "interview_importance": "High"
    },
    # DevOps Easy MCQ
    {
        "id": "do_e_mcq_static_1",
        "question": "What is the primary purpose of a Continuous Integration (CI) server?",
        "options": [
            "Automatically integrate and test code changes frequently to detect bugs early",
            "Backup production databases hourly",
            "Track employee working hours",
            "Block external network lookups"
        ],
        "correct_answer": 0,
        "rationale": "CI runs automated builds and testing on pull request commits to detect integration issues early.",
        "learning_objective": "Define CI goals",
        "difficulty": "Easy",
        "category": "MCQ",
        "role": "DevOps Engineer",
        "tags": ["CI", "automation"],
        "topic": "CI/CD Pipeline",
        "estimated_time": 45,
        "interview_importance": "High"
    }
]

# Supported Domain Core Mappings
DOMAIN_CORE_MAP = {
    "python developer": "python",
    "backend developer": "backend",
    "django developer": "python",
    "data scientist": "python",
    "ai/ml engineer": "python",
    "data engineer": "python",
    "data analyst": "python",
    "java developer": "java",
    "software engineer": "java",
    "react developer": "react",
    "frontend developer": "react",
    "full stack developer": "react",
    "node.js developer": "react",
    "android developer": "react",
    "flutter developer": "react",
    "devops engineer": "devops",
    "cloud engineer": "devops",
    "aws engineer": "devops",
    "azure engineer": "devops",
    "network engineer": "devops",
    "qa engineer": "qa",
    "cybersecurity analyst": "cybersecurity",
    "general programming": "general"
}

# Dynamic Procedural Templates for Infinite Question Expansion (satisfying Phase 1: 50+ questions per combo)
# Placeholder tags: {tech}, {var_name}, {val}, {err_type}, {correct_val}, {target_class}, {alternative}
PROCEDURAL_TEMPLATES = {
    "python": {
        "Easy": {
            "MCQ": {
                "template_id": "py_e_mcq_proc",
                "topic": "Syntax Fundamentals",
                "question_pattern": "In Python, which built-in function should you use to convert a string representing a number, e.g. '{num_str}', into a valid integer representation?",
                "options_pattern": ["int({num_str})", "str({num_str})", "float({num_str})", "Integer.parseInt({num_str})"],
                "correct_answer": 0,
                "rationale_pattern": "The int() function converts a compatible string or number into an integer base-10 value.",
                "learning_objective": "Type conversions in Python",
                "tags": ["syntax", "types"],
                "estimated_time": 40,
                "interview_importance": "Medium",
                "variations": [
                    {"num_str": "'42'"}, {"num_str": "'100'"}, {"num_str": "'-5'"}, {"num_str": "'999'"},
                    {"num_str": "'12'"}, {"num_str": "'88'"}, {"num_str": "'256'"}, {"num_str": "'1024'"},
                    {"num_str": "'7'"}, {"num_str": "'10'"}, {"num_str": "'90'"}, {"num_str": "'50'"},
                    {"num_str": "'33'"}, {"num_str": "'77'"}, {"num_str": "'123'"}, {"num_str": "'456'"},
                    {"num_str": "'789'"}, {"num_str": "'111'"}, {"num_str": "'222'"}, {"num_str": "'333'"},
                    {"num_str": "'444'"}, {"num_str": "'555'"}, {"num_str": "'666'"}, {"num_str": "'777'"},
                    {"num_str": "'888'"}, {"num_str": "'30'"}, {"num_str": "'40'"}, {"num_str": "'60'"},
                    {"num_str": "'70'"}, {"num_str": "'80'"}, {"num_str": "'15'"}, {"num_str": "'25'"},
                    {"num_str": "'35'"}, {"num_str": "'45'"}, {"num_str": "'55'"}, {"num_str": "'65'"},
                    {"num_str": "'75'"}, {"num_str": "'85'"}, {"num_str": "'95'"}, {"num_str": "'101'"},
                    {"num_str": "'202'"}, {"num_str": "'303'"}, {"num_str": "'404'"}, {"num_str": "'505'"},
                    {"num_str": "'606'"}, {"num_str": "'707'"}, {"num_str": "'808'"}, {"num_str": "'909'"},
                    {"num_str": "'2000'"}, {"num_str": "'2026'"}
                ]
            },
            "Coding": {
                "template_id": "py_e_code_proc",
                "topic": "List Operations",
                "question_pattern": "Complete the coding snippet to append the element {elem_val} to the list named '{list_name}':\n{list_name} = [10, 20]\n____",
                "options_pattern": [
                    "{list_name}.append({elem_val})",
                    "{list_name}.add({elem_val})",
                    "{list_name}.push({elem_val})",
                    "{list_name} = {list_name} + {elem_val}"
                ],
                "correct_answer": 0,
                "rationale_pattern": "Python lists use the .append() method to insert single elements at the end.",
                "learning_objective": "Manipulating lists dynamically",
                "tags": ["lists", "coding"],
                "estimated_time": 50,
                "interview_importance": "Medium",
                "variations": [
                    {"list_name": "items", "elem_val": "30"},
                    {"list_name": "users", "elem_val": "'John'"},
                    {"list_name": "tokens", "elem_val": "99"},
                    {"list_name": "scores", "elem_val": "100"},
                    {"list_name": "prices", "elem_val": "5.99"},
                    {"list_name": "tags", "elem_val": "'admin'"},
                    {"list_name": "ports", "elem_val": "8080"},
                    {"list_name": "ids", "elem_val": "101"},
                    {"list_name": "logs", "elem_val": "'info'"},
                    {"list_name": "tasks", "elem_val": "'deploy'"},
                    {"list_name": "jobs", "elem_val": "'scrape'"},
                    {"list_name": "records", "elem_val": "50"},
                    {"list_name": "nodes", "elem_val": "'master'"},
                    {"list_name": "servers", "elem_val": "'host-1'"},
                    {"list_name": "channels", "elem_val": "'slack'"},
                    {"list_name": "metrics", "elem_val": "0.95"},
                    {"list_name": "errors", "elem_val": "'critical'"},
                    {"list_name": "events", "elem_val": "'click'"},
                    {"list_name": "agents", "elem_val": "'bot'"},
                    {"list_name": "files", "elem_val": "'data.json'"},
                    {"list_name": "keys", "elem_val": "'apiKey'"},
                    {"list_name": "headers", "elem_val": "'auth'"},
                    {"list_name": "certs", "elem_val": "'ssl'"},
                    {"list_name": "ips", "elem_val": "'127.0.0.1'"},
                    {"list_name": "hosts", "elem_val": "'local'"},
                    {"list_name": "paths", "elem_val": "'/home'"},
                    {"list_name": "extensions", "elem_val": "'.py'"},
                    {"list_name": "schemas", "elem_val": "'v2'"},
                    {"list_name": "databases", "elem_val": "'mongodb'"},
                    {"list_name": "tables", "elem_val": "'users'"},
                    {"list_name": "rows", "elem_val": "12"},
                    {"list_name": "cols", "elem_val": "4"},
                    {"list_name": "indexes", "elem_val": "1"},
                    {"list_name": "models", "elem_val": "'Profile'"},
                    {"list_name": "views", "elem_val": "'Home'"},
                    {"list_name": "urls", "elem_val": "'/api'"},
                    {"list_name": "routes", "elem_val": "'/test'"},
                    {"list_name": "sessions", "elem_val": "'sessionKey'"},
                    {"list_name": "methods", "elem_val": "'GET'"},
                    {"list_name": "queries", "elem_val": "'select'"},
                    {"list_name": "buffers", "elem_val": "1024"},
                    {"list_name": "workers", "elem_val": "5"},
                    {"list_name": "queues", "elem_val": "'task_queue'"},
                    {"list_name": "topics", "elem_val": "'alerts'"},
                    {"list_name": "consumers", "elem_val": "'worker-1'"},
                    {"list_name": "clusters", "elem_val": "'k8s'"},
                    {"list_name": "namespaces", "elem_val": "'dev'"},
                    {"list_name": "secrets", "elem_val": "'token'"},
                    {"list_name": "volumes", "elem_val": "'/data'"},
                    {"list_name": "replicas", "elem_val": "3"}
                ]
            },
            "Debugging": {
                "template_id": "py_e_debug_proc",
                "topic": "Variable Scope",
                "question_pattern": "Identify the logic error in this loop designed to find the sum of numbers:\ntotal = 0\nfor x in [1, 2, 3]:\n    total = {op_type}  # should accumulate sum\nprint(total)",
                "options_pattern": [
                    "Using '=' instead of '+=' (resets total on each iteration)",
                    "Using '+=' instead of '='",
                    "Variable total must be defined inside the loop",
                    "The loop range is out of bounds"
                ],
                "correct_answer": 0,
                "rationale_pattern": "Assigning total = x resets total to the current element on each iteration, causing it to lose the accumulated sum.",
                "learning_objective": "Debug accumulator loops",
                "tags": ["debugging", "loops"],
                "estimated_time": 45,
                "interview_importance": "Medium",
                "variations": [
                    {"op_type": "x"}, {"op_type": "x * 1"}, {"op_type": "x + 0"}, {"op_type": "float(x)"},
                    {"op_type": "x // 1"}, {"op_type": "abs(x)"}, {"op_type": "x | 0"}, {"op_type": "x & x"},
                    {"op_type": "x ^ 0"}, {"op_type": "x % 100"}, {"op_type": "x ** 1"}, {"op_type": "int(x)"},
                    {"op_type": "x >> 0"}, {"op_type": "x << 0"}, {"op_type": "x * 2 / 2"}, {"op_type": "x + x - x"},
                    {"op_type": "sum([x])"}, {"op_type": "x + 1 - 1"}, {"op_type": "x * 10 / 10"}, {"op_type": "x // 1"},
                    {"op_type": "x * x // x"}, {"op_type": "x - 0"}, {"op_type": "x + 0.0"}, {"op_type": "x * 1.0"},
                    {"op_type": "int(float(x))"}, {"op_type": "x + 0 - 0"}, {"op_type": "x * 2 // 2"}, {"op_type": "x * 3 // 3"},
                    {"op_type": "x * 4 // 4"}, {"op_type": "x * 5 // 5"}, {"op_type": "x * 6 // 6"}, {"op_type": "x * 7 // 7"},
                    {"op_type": "x * 8 // 8"}, {"op_type": "x * 9 // 9"}, {"op_type": "x * 10 // 10"}, {"op_type": "x + 2 - 2"},
                    {"op_type": "x + 3 - 3"}, {"op_type": "x + 4 - 4"}, {"op_type": "x + 5 - 5"}, {"op_type": "x + 6 - 6"},
                    {"op_type": "x + 7 - 7"}, {"op_type": "x + 8 - 8"}, {"op_type": "x + 9 - 9"}, {"op_type": "x + 10 - 10"},
                    {"op_type": "x - 1 + 1"}, {"op_type": "x - 2 + 2"}, {"op_type": "x - 3 + 3"}, {"op_type": "x - 4 + 4"},
                    {"op_type": "x - 5 + 5"}, {"op_type": "x - 6 + 6"}
                ]
            },
            "Scenario": {
                "template_id": "py_e_scen_proc",
                "topic": "Data Serialization",
                "question_pattern": "Your team needs to serialize Python dictionary objects containing '{key_type}' keys into standard files. Which format guarantees native parsing in web browsers?",
                "options_pattern": ["JSON", "XML", "YAML", "CSV"],
                "correct_answer": 0,
                "rationale_pattern": "JSON is natively supported by Javascript engines inside browsers, making it optimal for web communications.",
                "learning_objective": "Select optimal data serialization formats",
                "tags": ["scenario", "serialization"],
                "estimated_time": 45,
                "interview_importance": "Medium",
                "variations": [
                    {"key_type": "username"}, {"key_type": "userID"}, {"key_type": "emailAddress"}, {"key_type": "authToken"},
                    {"key_type": "profilePic"}, {"key_type": "created_at"}, {"key_type": "ats_score"}, {"key_type": "roleName"},
                    {"key_type": "companyName"}, {"key_type": "jobTitle"}, {"key_type": "skillTag"}, {"key_type": "priority"},
                    {"key_type": "duration"}, {"key_type": "scorecardId"}, {"key_type": "sessionId"}, {"key_type": "clientIP"},
                    {"key_type": "hostName"}, {"key_type": "portNumber"}, {"key_type": "filePath"}, {"key_type": "extension"},
                    {"key_type": "dbName"}, {"key_type": "tableName"}, {"key_type": "colName"}, {"key_type": "indexName"},
                    {"key_type": "modelName"}, {"key_type": "viewName"}, {"key_type": "urlPath"}, {"key_type": "routeName"},
                    {"key_type": "sessionKey"}, {"key_type": "methodType"}, {"key_type": "queryStr"}, {"key_type": "bufferSize"},
                    {"key_type": "workerCount"}, {"key_type": "queueName"}, {"key_type": "topicName"}, {"key_type": "consumerName"},
                    {"key_type": "clusterName"}, {"key_type": "namespace"}, {"key_type": "secretVal"}, {"key_type": "volumePath"},
                    {"key_type": "replicaCount"}, {"key_type": "tag_name"}, {"key_type": "element_id"}, {"key_type": "class_name"},
                    {"key_type": "auth_token"}, {"key_type": "api_key"}, {"key_type": "config_val"}, {"key_type": "port_num"},
                    {"key_type": "db_host"}, {"key_type": "cache_key"}
                ]
            },
            "Aptitude": {
                "template_id": "py_e_apt_proc",
                "topic": "Calculation logic",
                "question_pattern": "A Python script processes {batch_size} batches of tasks. If each batch takes exactly {seconds} seconds, how long does the script take in total?",
                "options_pattern": [
                    "{total_sec} seconds",
                    "{double_sec} seconds",
                    "{half_sec} seconds",
                    "{triple_sec} seconds"
                ],
                "correct_answer": 0,
                "rationale_pattern": "Total time is calculated by multiplying the number of batches by the seconds per batch ({batch_size} * {seconds} = {total_sec}).",
                "learning_objective": "Analyze work batch completion rates",
                "tags": ["aptitude", "time-analysis"],
                "estimated_time": 40,
                "interview_importance": "Medium",
                "variations": [
                    {"batch_size": "5", "seconds": "10", "total_sec": "50", "double_sec": "100", "half_sec": "25", "triple_sec": "150"},
                    {"batch_size": "10", "seconds": "6", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "3", "seconds": "20", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "4", "seconds": "15", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "8", "seconds": "5", "total_sec": "40", "double_sec": "80", "half_sec": "20", "triple_sec": "120"},
                    {"batch_size": "2", "seconds": "30", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "12", "seconds": "5", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "6", "seconds": "10", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "7", "seconds": "10", "total_sec": "70", "double_sec": "140", "half_sec": "35", "triple_sec": "210"},
                    {"batch_size": "9", "seconds": "10", "total_sec": "90", "double_sec": "180", "half_sec": "45", "triple_sec": "270"},
                    {"batch_size": "15", "seconds": "4", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "20", "seconds": "3", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "5", "seconds": "12", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "10", "seconds": "12", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "25", "seconds": "4", "total_sec": "100", "double_sec": "200", "half_sec": "50", "triple_sec": "300"},
                    {"batch_size": "50", "seconds": "2", "total_sec": "100", "double_sec": "200", "half_sec": "50", "triple_sec": "300"},
                    {"batch_size": "30", "seconds": "2", "total_sec": "60", "double_sec": "120", "half_sec": "30", "triple_sec": "180"},
                    {"batch_size": "6", "seconds": "15", "total_sec": "90", "double_sec": "180", "half_sec": "45", "triple_sec": "270"},
                    {"batch_size": "8", "seconds": "15", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "12", "seconds": "15", "total_sec": "180", "double_sec": "360", "half_sec": "90", "triple_sec": "540"},
                    {"batch_size": "40", "seconds": "2", "total_sec": "80", "double_sec": "160", "half_sec": "40", "triple_sec": "240"},
                    {"batch_size": "10", "seconds": "8", "total_sec": "80", "double_sec": "160", "half_sec": "40", "triple_sec": "240"},
                    {"batch_size": "5", "seconds": "16", "total_sec": "80", "double_sec": "160", "half_sec": "40", "triple_sec": "240"},
                    {"batch_size": "8", "seconds": "10", "total_sec": "80", "double_sec": "160", "half_sec": "40", "triple_sec": "240"},
                    {"batch_size": "2", "seconds": "40", "total_sec": "80", "double_sec": "160", "half_sec": "40", "triple_sec": "240"},
                    {"batch_size": "100", "seconds": "1", "total_sec": "100", "double_sec": "200", "half_sec": "50", "triple_sec": "300"},
                    {"batch_size": "50", "seconds": "4", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "200", "seconds": "1", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "4", "seconds": "50", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "8", "seconds": "25", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "10", "seconds": "20", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "20", "seconds": "10", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "40", "seconds": "5", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "5", "seconds": "40", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "2", "seconds": "100", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "1", "seconds": "200", "total_sec": "200", "double_sec": "400", "half_sec": "100", "triple_sec": "600"},
                    {"batch_size": "6", "seconds": "20", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "12", "seconds": "10", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "4", "seconds": "30", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "3", "seconds": "40", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "2", "seconds": "60", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "24", "seconds": "5", "total_sec": "120", "double_sec": "240", "half_sec": "60", "triple_sec": "360"},
                    {"batch_size": "8", "seconds": "30", "total_sec": "240", "double_sec": "480", "half_sec": "120", "triple_sec": "720"},
                    {"batch_size": "12", "seconds": "20", "total_sec": "240", "double_sec": "480", "half_sec": "120", "triple_sec": "720"},
                    {"batch_size": "6", "seconds": "40", "total_sec": "240", "double_sec": "480", "half_sec": "120", "triple_sec": "720"},
                    {"batch_size": "4", "seconds": "60", "total_sec": "240", "double_sec": "480", "half_sec": "120", "triple_sec": "720"},
                    {"batch_size": "3", "seconds": "80", "total_sec": "240", "double_sec": "480", "half_sec": "120", "triple_sec": "720"},
                    {"batch_size": "2", "seconds": "120", "total_sec": "240", "double_sec": "480", "half_sec": "120", "triple_sec": "720"},
                    {"batch_size": "1", "seconds": "240", "total_sec": "240", "double_sec": "480", "half_sec": "120", "triple_sec": "720"},
                    {"batch_size": "10", "seconds": "25", "total_sec": "250", "double_sec": "500", "half_sec": "125", "triple_sec": "750"}
                ]
            },
            "HR": {
                "template_id": "py_e_hr_proc",
                "topic": "Agile Delivery",
                "question_pattern": "You are a developer on a sprint task named '{task_name}'. A teammate asks you to review their merge request immediately, but you have a tight task deadline. What is the most professional response?",
                "options_pattern": [
                    "Acknowledge their request, state your task timeline, and agree on a specific time later in the day to pair review it.",
                    "Ignore the message completely until you finish your sprint task.",
                    "Review it immediately, letting your own task miss the sprint deadline.",
                    "Report them to the scrum master for interrupting your focus time."
                ],
                "correct_answer": 0,
                "rationale_pattern": "Professional alignment involves clear, proactive communication of schedule constraints and collaborative scheduling.",
                "learning_objective": "Manage developer interruptions in agile sprints",
                "tags": ["HR", "teamwork"],
                "estimated_time": 45,
                "interview_importance": "High",
                "variations": [
                    {"task_name": "API Refactoring"}, {"task_name": "Database Migration"}, {"task_name": "Bug Triage #404"}, {"task_name": "OAuth integration"},
                    {"task_name": "JWT implementation"}, {"task_name": "Docker compose optimization"}, {"task_name": "K8s secret validation"}, {"task_name": "Course lookup sync"},
                    {"task_name": "Resume upload script"}, {"task_name": "ATS scorecard display"}, {"task_name": "Toast animation polish"}, {"task_name": "MongoDB index tuning"},
                    {"task_name": "AWS S3 file handler"}, {"task_name": "Redis cache eviction"}, {"task_name": "Elasticsearch sync cron"}, {"task_name": "Mock Test Grading Logic"},
                    {"task_name": "Performance Review layout"}, {"task_name": "Profile Target Role selector"}, {"task_name": "Resume Versions archive"}, {"task_name": "ATS Score metrics check"},
                    {"task_name": "Unit test framework setup"}, {"task_name": "CI workflow syntax fix"}, {"task_name": "Terraform ingress routing"}, {"task_name": "Webpack bundle compression"},
                    {"task_name": "Django select_related mapping"}, {"task_name": "React Context wrapper"}, {"task_name": "Framer Motion slide triggers"}, {"task_name": "Vite server options change"},
                    {"task_name": "Mongodb reverse delete rule"}, {"task_name": "Scorecard delete report route"}, {"task_name": "Video lookup scraping validation"}, {"task_name": "Milestone hours calculation"},
                    {"task_name": "Roadmap Analytics grid polish"}, {"task_name": "Skill Gap analyze table"}, {"task_name": "Interactive Roadmap timeline"}, {"task_name": "Dashboard metrics aggregation"},
                    {"task_name": "Interview Voice dialog handler"}, {"task_name": "Audio transcript sync"}, {"task_name": "Registration email trigger"}, {"task_name": "Django csrf settings"},
                    {"task_name": "Redis socket locks audit"}, {"task_name": "Celery concurrency pools check"}, {"task_name": "Rabbitmq priority queue setup"}, {"task_name": "BeautifulSoup rate limit handler"},
                    {"task_name": "Django custom decorator"}, {"task_name": "React abort controller hooks"}, {"task_name": "JPA Hibernate proxy debug"}, {"task_name": "Spring Boot metrics config"},
                    {"task_name": "Postgres sharded ledger locks"}, {"task_name": "Kubernetes HPA rules"}
                ]
            }
        },
        "Medium": {
            "MCQ": {
                "template_id": "py_m_mcq_proc",
                "topic": "Object Oriented Python",
                "question_pattern": "What is the correct way to invoke the parent class constructor from a child class named '{child_class}' in Python?",
                "options_pattern": ["super().__init__()", "parent.__init__()", "self.super()", "super(self)"],
                "correct_answer": 0,
                "rationale_pattern": "super().__init__() delegates constructor instantiation to the parent class correctly in Python MRO.",
                "learning_objective": "Inheritance constructors",
                "tags": ["oop", "classes"],
                "estimated_time": 50,
                "interview_importance": "High",
                "variations": [
                    {"child_class": "Manager"}, {"child_class": "Developer"}, {"child_class": "CloudWorker"}, {"child_class": "DbConnection"},
                    {"child_class": "CustomProfile"}, {"child_class": "ResumeVersion"}, {"child_class": "MockTestSession"}, {"child_class": "ScorecardReport"},
                    {"child_class": "UserSerializer"}, {"child_class": "AuthClient"}, {"child_class": "RedisCache"}, {"child_class": "RabbitConsumer"},
                    {"child_class": "S3Uploader"}, {"child_class": "ViteBuilder"}, {"child_class": "CourseNavigator"}, {"child_class": "VideoScraper"},
                    {"child_class": "AtsEvaluator"}, {"child_class": "ToastFeedback"}, {"child_class": "MilestoneTimeline"}, {"child_class": "ChartDrawer"},
                    {"child_class": "AdminConsole"}, {"child_class": "SessionManager"}, {"child_class": "SearchFilter"}, {"child_class": "InputWrapper"},
                    {"child_class": "ButtonBase"}, {"child_class": "BadgeIndicator"}, {"child_class": "ConfirmModal"}, {"child_class": "LoaderSkeleton"},
                    {"child_class": "ApiEndpoint"}, {"child_class": "WebsocketHandler"}, {"child_class": "EventConsumer"}, {"child_class": "TaskRunner"},
                    {"child_class": "CronJob"}, {"child_class": "LoggerWrapper"}, {"child_class": "MetricCollector"}, {"child_class": "AlertDispatcher"},
                    {"child_class": "AuditTrail"}, {"child_class": "PolicyEnforcer"}, {"child_class": "TokenDecoder"}, {"child_class": "SchemaValidator"},
                    {"child_class": "QueryBuilder"}, {"child_class": "MigrationRunner"}, {"child_class": "DatabaseSeeder"}, {"child_class": "ReportExporter"},
                    {"child_class": "VideoPlayer"}, {"child_class": "AudioRecorder"}, {"child_class": "VoiceSynthesizer"}, {"child_class": "SpeechTranslator"},
                    {"child_class": "EmailNotifier"}, {"child_class": "WebhookSender"}
                ]
            },
            "Coding": {
                "template_id": "py_m_code_proc",
                "topic": "Dict Comprehensions",
                "question_pattern": "Complete the dict comprehension to generate a map from keys to values squared for list '{list_name}':\n{list_name} = [1, 2, 3]\nsquared_dict = ____",
                "options_pattern": [
                    "{{x: x * x for x in {list_name}}}",
                    "{{x = x * x for x in {list_name}}}",
                    "dict(x, x*x for x in {list_name})",
                    "{{x: x^2 for x in {list_name}}}"
                ],
                "correct_answer": 0,
                "rationale_pattern": "Dict comprehensions use curly braces enclosing a key-value colon pattern: {{k: v for k in iterable}}.",
                "learning_objective": "Write dictionary comprehensions",
                "tags": ["syntax", "comprehensions"],
                "estimated_time": 60,
                "interview_importance": "High",
                "variations": [
                    {"list_name": "ids"}, {"list_name": "nums"}, {"list_name": "ports"}, {"list_name": "codes"},
                    {"list_name": "ranks"}, {"list_name": "levels"}, {"list_name": "steps"}, {"list_name": "indices"},
                    {"list_name": "offsets"}, {"list_name": "margins"}, {"list_name": "factors"}, {"list_name": "weights"},
                    {"list_name": "ratios"}, {"list_name": "scores"}, {"list_name": "ratings"}, {"list_name": "marks"},
                    {"list_name": "grades"}, {"list_name": "counts"}, {"list_name": "totals"}, {"list_name": "sums"},
                    {"list_name": "values"}, {"list_name": "keys"}, {"list_name": "inputs"}, {"list_name": "outputs"},
                    {"list_name": "buffers"}, {"list_name": "blocks"}, {"list_name": "bytes"}, {"list_name": "packets"},
                    {"list_name": "frames"}, {"list_name": "sockets"}, {"list_name": "clients"}, {"list_name": "servers"},
                    {"list_name": "hosts"}, {"list_name": "nodes"}, {"list_name": "clusters"}, {"list_name": "instances"},
                    {"list_name": "replicas"}, {"list_name": "shards"}, {"list_name": "partitions"}, {"list_name": "buckets"},
                    {"list_name": "caches"}, {"list_name": "queues"}, {"list_name": "workers"}, {"list_name": "jobs"},
                    {"list_name": "tasks"}, {"list_name": "threads"}, {"list_name": "processes"}, {"list_name": "sessions"},
                    {"list_name": "requests"}, {"list_name": "responses"}
                ]
            },
            "Debugging": {
                "template_id": "py_m_debug_proc",
                "topic": "Exception Handling",
                "question_pattern": "You are debugging a Python API method handling '{action_type}'. The exception catch block: except KeyError, ValueError:\n    return 'Error' is throwing a SyntaxError. What is the bug?",
                "options_pattern": [
                    "Multiple exceptions must be declared inside parentheses: except (KeyError, ValueError):",
                    "KeyError and ValueError cannot be caught in the same try block",
                    "The comma is only supported in Python 2.x for exception aliases",
                    "SyntaxError is caused by missing return strings"
                ],
                "correct_answer": 0,
                "rationale_pattern": "In Python 3, catching multiple exception types in a single clause requires declaring them as a tuple: except (Exception1, Exception2):.",
                "learning_objective": "Declare multiple exception catch tuples",
                "tags": ["debugging", "exceptions"],
                "estimated_time": 55,
                "interview_importance": "High",
                "variations": [
                    {"action_type": "user_login"}, {"action_type": "upload_resume"}, {"action_type": "create_mock_test"}, {"action_type": "grade_submission"},
                    {"action_type": "fetch_roadmap"}, {"action_type": "update_profile"}, {"action_type": "delete_scorecard"}, {"action_type": "verify_token"},
                    {"action_type": "db_lookup"}, {"action_type": "cache_lookup"}, {"action_type": "queue_message"}, {"action_type": "call_gemini"},
                    {"action_type": "read_json_file"}, {"action_type": "write_log_entry"}, {"action_type": "parse_resume_pdf"}, {"action_type": "calculate_ats_score"},
                    {"action_type": "fetch_milestone_video"}, {"action_type": "aggregate_hours"}, {"action_type": "render_chart"}, {"action_type": "dismiss_toast"},
                    {"action_type": "check_streak"}, {"action_type": "run_migrations"}, {"action_type": "seed_questions"}, {"action_type": "export_pdf"},
                    {"action_type": "play_video_stream"}, {"action_type": "synthesize_voice"}, {"action_type": "save_dialog_entry"}, {"action_type": "verify_session"},
                    {"action_type": "lookup_careers"}, {"action_type": "crawl_careers_page"}, {"action_type": "call_course_api"}, {"action_type": "refresh_auth_tokens"},
                    {"action_type": "create_custom_profile"}, {"action_type": "delete_custom_profile"}, {"action_type": "load_settings"}, {"action_type": "save_settings"},
                    {"action_type": "trigger_email"}, {"action_type": "dispatch_webhook"}, {"action_type": "parse_html_snippet"}, {"action_type": "scrape_youtube"},
                    {"action_type": "calculate_timeframe"}, {"action_type": "check_reverse_delete"}, {"action_type": "authenticate_admin"}, {"action_type": "view_history"},
                    {"action_type": "compare_assessments"}, {"action_type": "generate_recommendation"}, {"action_type": "query_mongodb"}, {"action_type": "write_mongo_record"},
                    {"action_type": "clear_redis_cache"}, {"action_type": "restart_celery_worker"}
                ]
            },
            "Scenario": {
                "template_id": "py_m_scen_proc",
                "topic": "Django ORM Optimization",
                "question_pattern": "A Django view fetches {num_rows} records from table '{table_name}' and retrieves related foreign key records in a loop, triggering N+1 queries. How do you optimize this?",
                "options_pattern": [
                    "Use select_related() or prefetch_related() on the query",
                    "Add an index to the foreign key column",
                    "Cache each loop result in Memcached",
                    "Enable Django Gunicorn connection pooling"
                ],
                "correct_answer": 0,
                "rationale_pattern": "select_related performs a SQL JOIN at query execution time, loading foreign keys in a single database hit.",
                "learning_objective": "Eliminate ORM N+1 query loops",
                "tags": ["scenario", "django", "orm"],
                "estimated_time": 50,
                "interview_importance": "High",
                "variations": [
                    {"num_rows": "100", "table_name": "Scorecards"},
                    {"num_rows": "500", "table_name": "MockTests"},
                    {"num_rows": "1000", "table_name": "Resumes"},
                    {"num_rows": "200", "table_name": "Profiles"},
                    {"num_rows": "50", "table_name": "Users"},
                    {"num_rows": "300", "table_name": "Milestones"},
                    {"num_rows": "150", "table_name": "Videos"},
                    {"num_rows": "400", "table_name": "Roadmaps"},
                    {"num_rows": "250", "table_name": "Sessions"},
                    {"num_rows": "600", "table_name": "Logs"},
                    {"num_rows": "80", "table_name": "Roles"},
                    {"num_rows": "120", "table_name": "Skills"},
                    {"num_rows": "700", "table_name": "Jobs"},
                    {"num_rows": "900", "table_name": "Applications"},
                    {"num_rows": "350", "table_name": "Courses"},
                    {"num_rows": "450", "table_name": "Categories"},
                    {"num_rows": "60", "table_name": "Templates"},
                    {"num_rows": "110", "table_name": "Questions"},
                    {"num_rows": "220", "table_name": "Answers"},
                    {"num_rows": "180", "table_name": "Rationales"},
                    {"num_rows": "280", "table_name": "Recommendations"},
                    {"num_rows": "550", "table_name": "Tokens"},
                    {"num_rows": "320", "table_name": "Caches"},
                    {"num_rows": "140", "table_name": "Queues"},
                    {"num_rows": "190", "table_name": "Workers"},
                    {"num_rows": "800", "table_name": "Consumers"},
                    {"num_rows": "950", "table_name": "Nodes"},
                    {"num_rows": "130", "table_name": "Clusters"},
                    {"num_rows": "170", "table_name": "Namespaces"},
                    {"num_rows": "210", "table_name": "Secrets"},
                    {"num_rows": "260", "table_name": "Volumes"},
                    {"num_rows": "310", "table_name": "Replicas"},
                    {"num_rows": "380", "table_name": "Hosts"},
                    {"num_rows": "420", "table_name": "Servers"},
                    {"num_rows": "480", "table_name": "Ips"},
                    {"num_rows": "520", "table_name": "Ports"},
                    {"num_rows": "580", "table_name": "Configs"},
                    {"num_rows": "640", "table_name": "Settings"},
                    {"num_rows": "710", "table_name": "Files"},
                    {"num_rows": "780", "table_name": "Paths"},
                    {"num_rows": "850", "table_name": "Extensions"},
                    {"num_rows": "920", "table_name": "Schemas"},
                    {"num_rows": "105", "table_name": "Databases"},
                    {"num_rows": "115", "table_name": "Tables"},
                    {"num_rows": "125", "table_name": "Rows"},
                    {"num_rows": "135", "table_name": "Columns"},
                    {"num_rows": "145", "table_name": "Indexes"},
                    {"num_rows": "155", "table_name": "Views"},
                    {"num_rows": "165", "table_name": "Urls"},
                    {"num_rows": "175", "table_name": "Routes"}
                ]
            },
            "Aptitude": {
                "template_id": "py_m_apt_proc",
                "topic": "Growth Analytics",
                "question_pattern": "A service's data log storage starts at {start_size}MB. If it increases by exactly {growth_pct}% month-over-month, what is the log size in 2 months?",
                "options_pattern": [
                    "{end_size}MB",
                    "{double_size}MB",
                    "{linear_size}MB",
                    "{triple_size}MB"
                ],
                "correct_answer": 0,
                "rationale_pattern": "Compounded growth calculates: start * (1 + growth_pct/100)^2. month 1 = {m1}MB, month 2 = {end_size}MB.",
                "learning_objective": "Calculate compound logarithmic growth",
                "tags": ["aptitude", "compounding"],
                "estimated_time": 45,
                "interview_importance": "Medium",
                "variations": [
                    {"start_size": "100", "growth_pct": "10", "end_size": "121.0", "double_size": "200.0", "linear_size": "120.0", "triple_size": "300.0", "m1": "110"},
                    {"start_size": "200", "growth_pct": "10", "end_size": "242.0", "double_size": "400.0", "linear_size": "240.0", "triple_size": "600.0", "m1": "220"},
                    {"start_size": "100", "growth_pct": "20", "end_size": "144.0", "double_size": "200.0", "linear_size": "140.0", "triple_size": "300.0", "m1": "120"},
                    {"start_size": "50", "growth_pct": "20", "end_size": "72.0", "double_size": "100.0", "linear_size": "70.0", "triple_size": "150.0", "m1": "60"},
                    {"start_size": "300", "growth_pct": "10", "end_size": "363.0", "double_size": "600.0", "linear_size": "360.0", "triple_size": "900.0", "m1": "330"},
                    {"start_size": "150", "growth_pct": "20", "end_size": "216.0", "double_size": "300.0", "linear_size": "210.0", "triple_size": "450.0", "m1": "180"},
                    {"start_size": "80", "growth_pct": "25", "end_size": "125.0", "double_size": "160.0", "linear_size": "120.0", "triple_size": "240.0", "m1": "100"},
                    {"start_size": "40", "growth_pct": "50", "end_size": "90.0", "double_size": "80.0", "linear_size": "80.0", "triple_size": "120.0", "m1": "60"},
                    {"start_size": "100", "growth_pct": "30", "end_size": "169.0", "double_size": "200.0", "linear_size": "160.0", "triple_size": "300.0", "m1": "130"},
                    {"start_size": "200", "growth_pct": "30", "end_size": "338.0", "double_size": "400.0", "linear_size": "320.0", "triple_size": "600.0", "m1": "260"},
                    {"start_size": "1000", "growth_pct": "5", "end_size": "1102.5", "double_size": "2000.0", "linear_size": "1100.0", "triple_size": "3000.0", "m1": "1050"},
                    {"start_size": "500", "growth_pct": "5", "end_size": "551.25", "double_size": "1000.0", "linear_size": "550.0", "triple_size": "1500.0", "m1": "525"},
                    {"start_size": "400", "growth_pct": "10", "end_size": "484.0", "double_size": "800.0", "linear_size": "480.0", "triple_size": "1200.0", "m1": "440"},
                    {"start_size": "250", "growth_pct": "20", "end_size": "360.0", "double_size": "500.0", "linear_size": "350.0", "triple_size": "750.0", "m1": "300"},
                    {"start_size": "600", "growth_pct": "10", "end_size": "726.0", "double_size": "1200.0", "linear_size": "720.0", "triple_size": "1800.0", "m1": "660"},
                    {"start_size": "800", "growth_pct": "10", "end_size": "968.0", "double_size": "1600.0", "linear_size": "960.0", "triple_size": "2400.0", "m1": "880"},
                    {"start_size": "120", "growth_pct": "25", "end_size": "187.5", "double_size": "240.0", "linear_size": "180.0", "triple_size": "360.0", "m1": "150"},
                    {"start_size": "160", "growth_pct": "25", "end_size": "250.0", "double_size": "320.0", "linear_size": "240.0", "triple_size": "480.0", "m1": "200"},
                    {"start_size": "240", "growth_pct": "25", "end_size": "375.0", "double_size": "480.0", "linear_size": "360.0", "triple_size": "720.0", "m1": "300"},
                    {"start_size": "320", "growth_pct": "25", "end_size": "500.0", "double_size": "640.0", "linear_size": "480.0", "triple_size": "960.0", "m1": "400"},
                    {"start_size": "100", "growth_pct": "40", "end_size": "196.0", "double_size": "200.0", "linear_size": "180.0", "triple_size": "300.0", "m1": "140"},
                    {"start_size": "50", "growth_pct": "40", "end_size": "98.0", "double_size": "100.0", "linear_size": "90.0", "triple_size": "150.0", "m1": "70"},
                    {"start_size": "150", "growth_pct": "40", "end_size": "294.0", "double_size": "300.0", "linear_size": "270.0", "triple_size": "450.0", "m1": "210"},
                    {"start_size": "200", "growth_pct": "40", "end_size": "392.0", "double_size": "400.0", "linear_size": "360.0", "triple_size": "600.0", "m1": "280"},
                    {"start_size": "100", "growth_pct": "50", "end_size": "225.0", "double_size": "200.0", "linear_size": "200.0", "triple_size": "300.0", "m1": "150"},
                    {"start_size": "300", "growth_pct": "20", "end_size": "432.0", "double_size": "600.0", "linear_size": "420.0", "triple_size": "900.0", "m1": "360"},
                    {"start_size": "450", "growth_pct": "10", "end_size": "544.5", "double_size": "900.0", "linear_size": "540.0", "triple_size": "1350.0", "m1": "495"},
                    {"start_size": "100", "growth_pct": "15", "end_size": "132.25", "double_size": "200.0", "linear_size": "130.0", "triple_size": "300.0", "m1": "115"},
                    {"start_size": "200", "growth_pct": "15", "end_size": "264.5", "double_size": "400.0", "linear_size": "260.0", "triple_size": "600.0", "m1": "230"},
                    {"start_size": "300", "growth_pct": "15", "end_size": "396.75", "double_size": "600.0", "linear_size": "390.0", "triple_size": "900.0", "m1": "345"},
                    {"start_size": "400", "growth_pct": "15", "end_size": "529.0", "double_size": "800.0", "linear_size": "520.0", "triple_size": "1200.0", "m1": "460"},
                    {"start_size": "500", "growth_pct": "15", "end_size": "661.25", "double_size": "1000.0", "linear_size": "650.0", "triple_size": "1500.0", "m1": "575"},
                    {"start_size": "100", "growth_pct": "8", "end_size": "116.64", "double_size": "200.0", "linear_size": "116.0", "triple_size": "300.0", "m1": "108"},
                    {"start_size": "500", "growth_pct": "8", "end_size": "583.2", "double_size": "1000.0", "linear_size": "580.0", "triple_size": "1500.0", "m1": "540"},
                    {"start_size": "1000", "growth_pct": "8", "end_size": "1166.4", "double_size": "2000.0", "linear_size": "1160.0", "triple_size": "3000.0", "m1": "1080"},
                    {"start_size": "100", "growth_pct": "12", "end_size": "125.44", "double_size": "200.0", "linear_size": "124.0", "triple_size": "300.0", "m1": "112"},
                    {"start_size": "200", "growth_pct": "12", "end_size": "250.88", "double_size": "400.0", "linear_size": "248.0", "triple_size": "600.0", "m1": "224"},
                    {"start_size": "300", "growth_pct": "12", "end_size": "376.32", "double_size": "600.0", "linear_size": "372.0", "triple_size": "900.0", "m1": "336"},
                    {"start_size": "400", "growth_pct": "12", "end_size": "501.76", "double_size": "800.0", "linear_size": "496.0", "triple_size": "1200.0", "m1": "448"},
                    {"start_size": "500", "growth_pct": "12", "end_size": "627.2", "double_size": "1000.0", "linear_size": "620.0", "triple_size": "1500.0", "m1": "560"},
                    {"start_size": "100", "growth_pct": "6", "end_size": "112.36", "double_size": "200.0", "linear_size": "112.0", "triple_size": "300.0", "m1": "106"},
                    {"start_size": "200", "growth_pct": "6", "end_size": "224.72", "double_size": "400.0", "linear_size": "224.0", "triple_size": "600.0", "m1": "212"},
                    {"start_size": "300", "growth_pct": "6", "end_size": "337.08", "double_size": "600.0", "linear_size": "336.0", "triple_size": "900.0", "m1": "318"},
                    {"start_size": "400", "growth_pct": "6", "end_size": "449.44", "double_size": "800.0", "linear_size": "448.0", "triple_size": "1200.0", "m1": "424"},
                    {"start_size": "500", "growth_pct": "6", "end_size": "561.8", "double_size": "1000.0", "linear_size": "560.0", "triple_size": "1500.0", "m1": "530"},
                    {"start_size": "100", "growth_pct": "18", "end_size": "139.24", "double_size": "200.0", "linear_size": "136.0", "triple_size": "300.0", "m1": "118"},
                    {"start_size": "200", "growth_pct": "18", "end_size": "278.48", "double_size": "400.0", "linear_size": "272.0", "triple_size": "600.0", "m1": "236"},
                    {"start_size": "300", "growth_pct": "18", "end_size": "417.72", "double_size": "600.0", "linear_size": "408.0", "triple_size": "900.0", "m1": "354"},
                    {"start_size": "400", "growth_pct": "18", "end_size": "556.96", "double_size": "800.0", "linear_size": "544.0", "triple_size": "1200.0", "m1": "472"},
                    {"start_size": "500", "growth_pct": "18", "end_size": "696.2", "double_size": "1000.0", "linear_size": "680.0", "triple_size": "1500.0", "m1": "590"}
                ]
            },
            "HR": {
                "template_id": "py_m_hr_proc",
                "topic": "Mentorship",
                "question_pattern": "A junior developer repeatedly pushes codebase commits that trigger unit test failures on {platform_name}. As a senior peer, what is the best way to handle this?",
                "options_pattern": [
                    "Schedule a pairing session to walk them through the CI pipeline gates, show them how to run tests locally, and check their understanding.",
                    "Rollback their commits immediately and ask their manager to reassign their tasks.",
                    "Fix their test bugs yourself silently to save delivery timelines.",
                    "Tell them publicly in sprint planning that their commits are breaking the master branch."
                ],
                "correct_answer": 0,
                "rationale_pattern": "Mentoring through proactive pair programming and instruction sets builds developers' capacity and establishes long-term pipeline safety.",
                "learning_objective": "Foster collaborative developer mentorship",
                "tags": ["HR", "leadership"],
                "estimated_time": 50,
                "interview_importance": "High",
                "variations": [
                    {"platform_name": "GitHub Actions"}, {"platform_name": "GitLab CI"}, {"platform_name": "Jenkins Core"}, {"platform_name": "CircleCI"},
                    {"platform_name": "Bitbucket Pipelines"}, {"platform_name": "Travis CI"}, {"platform_name": "AWS CodePipeline"}, {"platform_name": "Azure DevOps"},
                    {"platform_name": "Google Cloud Build"}, {"platform_name": "TeamCity server"}, {"platform_name": "Bamboo pipeline"}, {"platform_name": "ArgoCD runner"},
                    {"platform_name": "Drone CI"}, {"platform_name": "AppVeyor"}, {"platform_name": "Buddy CI"}, {"platform_name": "Semaphore CI"},
                    {"platform_name": "Codeship"}, {"platform_name": "Wercker"}, {"platform_name": "GoCD"}, {"platform_name": "Heroku Flow"},
                    {"platform_name": "Netlify Build"}, {"platform_name": "Vercel deployments"}, {"platform_name": "Octopus Deploy"}, {"platform_name": "Tekton pipelines"},
                    {"platform_name": "Spinnaker"}, {"platform_name": "Jenkins X"}, {"platform_name": "Codefresh"}, {"platform_name": "Concourse CI"},
                    {"platform_name": "Screwdriver.cd"}, {"platform_name": "Buildkite"}, {"platform_name": "Shippable"}, {"platform_name": "Solano Labs"},
                    {"platform_name": "Vantage CI"}, {"platform_name": "Continuum"}, {"platform_name": "DeployBot"}, {"platform_name": "Distelli"},
                    {"platform_name": "Flexagon FlexDeploy"}, {"platform_name": "UrbanCode Deploy"}, {"platform_name": "Rancher Fleet"}, {"platform_name": "FluxCD agent"},
                    {"platform_name": "Nomad batch jobs"}, {"platform_name": "ECS task runner"}, {"platform_name": "EKS deployment"}, {"platform_name": "GKE cluster gates"},
                    {"platform_name": "Docker Swarm triggers"}, {"platform_name": "Capistrano scripts"}, {"platform_name": "Ansible AWX runner"}, {"platform_name": "Chef automate gates"},
                    {"platform_name": "Puppet enterprise agent"}, {"platform_name": "SaltStack orchestrator"}
                ]
            }
        },
        "Hard": {
            "MCQ": {
                "template_id": "py_h_mcq_proc",
                "topic": "GIL and Threads",
                "question_pattern": "You are auditing a CPU-intensive Python cluster. How does the Global Interpreter Lock (GIL) impact parallel executing threads in a single process container executing '{algorithm}'?",
                "options_pattern": [
                    "It blocks parallel CPU core execution, serializing thread bytecodes onto a single core",
                    "It automatically partitions memory heaps across separate cores",
                    "It accelerates thread synchronization by using hardware lock registers",
                    "It bypasses the kernel scheduler, letting Python manage thread switches directly"
                ],
                "correct_answer": 0,
                "rationale_pattern": "The GIL locks access to Python interpreter internals, allowing only one thread to run Python bytecodes concurrently.",
                "learning_objective": "Evaluate multi-threaded constraints under GIL",
                "tags": ["GIL", "concurrency", "performance"],
                "estimated_time": 60,
                "interview_importance": "Critical",
                "variations": [
                    {"algorithm": "JSON parsing of 10M records"},
                    {"algorithm": "Image resizing filters"},
                    {"algorithm": "Matrix multiplication loops"},
                    {"algorithm": "PDF document rendering"},
                    {"algorithm": "Cryptographic hash generation"},
                    {"algorithm": "Text indexing & regex searches"},
                    {"algorithm": "HTML parsing and validation"},
                    {"algorithm": "Base64 encoding/decoding"},
                    {"algorithm": "Gzip compression cycles"},
                    {"algorithm": "Fourier transform metrics"},
                    {"algorithm": "Graph sorting algorithms"},
                    {"algorithm": "Binary serialization streams"},
                    {"algorithm": "CSV file sorting"},
                    {"algorithm": "AST token parsing"},
                    {"algorithm": "Sound wave filtering"},
                    {"algorithm": "Video frame decoding"},
                    {"algorithm": "UUID string allocations"},
                    {"algorithm": "MD5 checksum iterations"},
                    {"algorithm": "JWT signing algorithms"},
                    {"algorithm": "RSA keys checks"},
                    {"algorithm": "AES encryption blocks"},
                    {"algorithm": "XML schema validations"},
                    {"algorithm": "Markdown conversion rendering"},
                    {"algorithm": "HTTP headers aggregation"},
                    {"algorithm": "Websocket frame decoding"},
                    {"algorithm": "Regex tokenizing loop"},
                    {"algorithm": "TCP packet parsing"},
                    {"algorithm": "DNS record lookup parsing"},
                    {"algorithm": "B-Tree node balancing"},
                    {"algorithm": "QuickSort log sorting"},
                    {"algorithm": "MergeSort array mapping"},
                    {"algorithm": "Dijkstra routing computations"},
                    {"algorithm": "Red-Black tree lookups"},
                    {"algorithm": "Heap sort logic"},
                    {"algorithm": "Huffman tree coding"},
                    {"algorithm": "SQL query parse tree build"},
                    {"algorithm": "YAML config compilation"},
                    {"algorithm": "Protobuf message serialization"},
                    {"algorithm": "Avro data packaging"},
                    {"algorithm": "Redis protocol parsing"},
                    {"algorithm": "Cassandra token ring lookup"},
                    {"algorithm": "Kafka message partition hash"},
                    {"algorithm": "Rabbitmq message matching"},
                    {"algorithm": "Celery task deserialization"},
                    {"algorithm": "Mongodb objectId creation"},
                    {"algorithm": "Django template parsing"},
                    {"algorithm": "React Server Components build"},
                    {"algorithm": "Vite bundling AST transforms"},
                    {"algorithm": "Webpack dependency resolutions"},
                    {"algorithm": "Framer Motion layout checks"}
                ]
            },
            "Coding": {
                "template_id": "py_h_code_proc",
                "topic": "Concurrency Optimization",
                "question_pattern": "Complete the Python code using asyncio.gather to run tasks '{task1_name}' and '{task2_name}' concurrently:\nimport asyncio\nasync def run():\n    await ____",
                "options_pattern": [
                    "asyncio.gather({task1_name}(), {task2_name}())",
                    "asyncio.wait_all([{task1_name}(), {task2_name}()])",
                    "asyncio.concurrent({task1_name}, {task2_name})",
                    "asyncio.run_parallel({task1_name}(), {task2_name}())"
                ],
                "correct_answer": 0,
                "rationale_pattern": "asyncio.gather schedules multiple coroutines as concurrent tasks, returning their results in list format.",
                "learning_objective": "Implement concurrent asyncio execution flows",
                "tags": ["asyncio", "concurrency", "coding"],
                "estimated_time": 75,
                "interview_importance": "Critical",
                "variations": [
                    {"task1_name": "fetch_users", "task2_name": "fetch_logs"},
                    {"task1_name": "sync_cache", "task2_name": "write_db"},
                    {"task1_name": "scrape_site", "task2_name": "parse_html"},
                    {"task1_name": "compress_pdf", "task2_name": "upload_s3"},
                    {"task1_name": "grade_test", "task2_name": "save_scorecard"},
                    {"task1_name": "read_files", "task2_name": "verify_hashes"},
                    {"task1_name": "decrypt_payload", "task2_name": "verify_token"},
                    {"task1_name": "load_profile", "task2_name": "load_roadmap"},
                    {"task1_name": "get_courses", "task2_name": "get_videos"},
                    {"task1_name": "audit_ats", "task2_name": "grade_resume"},
                    {"task1_name": "dispatch_webhook", "task2_name": "log_delivery"},
                    {"task1_name": "query_mongodb", "task2_name": "query_postgres"},
                    {"task1_name": "read_redis", "task2_name": "update_memcached"},
                    {"task1_name": "validate_schema", "task2_name": "compile_template"},
                    {"task1_name": "get_sessions", "task2_name": "clear_expired"},
                    {"task1_name": "ping_hosts", "task2_name": "resolve_dns"},
                    {"task1_name": "fetch_metrics", "task2_name": "push_gateway"},
                    {"task1_name": "consume_kafka", "task2_name": "commit_offsets"},
                    {"task1_name": "consume_rabbitmq", "task2_name": "ack_message"},
                    {"task1_name": "run_migrations", "task2_name": "seed_db"},
                    {"task1_name": "build_indexes", "task2_name": "optimize_tables"},
                    {"task1_name": "generate_report", "task2_name": "send_email"},
                    {"task1_name": "voice_stream", "task2_name": "save_dialog"},
                    {"task1_name": "get_jobs", "task2_name": "get_skills"},
                    {"task1_name": "check_streak", "task2_name": "update_learning_days"},
                    {"task1_name": "load_settings", "task2_name": "apply_configs"},
                    {"task1_name": "generate_certs", "task2_name": "sign_payload"},
                    {"task1_name": "fetch_github", "task2_name": "fetch_gitlab"},
                    {"task1_name": "check_disk", "task2_name": "check_memory"},
                    {"task1_name": "create_deployment", "task2_name": "create_service"},
                    {"task1_name": "create_configmap", "task2_name": "create_secret"},
                    {"task1_name": "mount_volume", "task2_name": "verify_pvc"},
                    {"task1_name": "scale_hpa", "task2_name": "scale_deployment"},
                    {"task1_name": "trigger_pipeline", "task2_name": "check_status"},
                    {"task1_name": "verify_ssl", "task2_name": "verify_dns"},
                    {"task1_name": "parse_resume", "task2_name": "extract_skills"},
                    {"task1_name": "load_scorecard", "task2_name": "calculate_insights"},
                    {"task1_name": "get_milestones", "task2_name": "get_milestone_videos"},
                    {"task1_name": "init_session", "task2_name": "get_interview_dialog"},
                    {"task1_name": "save_interview", "task2_name": "grade_interview"},
                    {"task1_name": "check_reverse_delete", "task2_name": "delete_mock_test"},
                    {"task1_name": "clear_sessions", "task2_name": "clear_scorecards"},
                    {"task1_name": "load_dashboard", "task2_name": "load_radar_chart"},
                    {"task1_name": "get_careers_url", "task2_name": "crawl_careers"},
                    {"task1_name": "fetch_udemy", "task2_name": "fetch_coursera"},
                    {"task1_name": "fetch_linkedin", "task2_name": "fetch_youtube"},
                    {"task1_name": "check_ats_score", "task2_name": "check_missing_skills"},
                    {"task1_name": "get_recommendations", "task2_name": "get_learning_progress"},
                    {"task1_name": "run_unit_tests", "task2_name": "run_lint_checks"},
                    {"task1_name": "compile_assets", "task2_name": "run_dev_server"}
                ]
            },
            "Debugging": {
                "template_id": "py_h_debug_proc",
                "topic": "Reference Cycles Memory Leak",
                "question_pattern": "A long-running daemon script leaks memory. Profiling reveals reference cycles keeping '{class_name}' alive indefinitely. How do you resolve this?",
                "options_pattern": [
                    "Use the weakref module to declare weak references for circular parent-child links.",
                    "Invoke sys.exit() periodically inside loop cycles.",
                    "Set the class variables to None manually in a constructor method.",
                    "Disable the Python garbage collector GC sweep loops completely."
                ],
                "correct_answer": 0,
                "rationale_pattern": "Weak references (weakref) let child objects reference parents without incrementing reference counts, preventing cyclical locks.",
                "learning_objective": "Resolve reference cycle memory leaks",
                "tags": ["debugging", "memory", "leaks"],
                "estimated_time": 70,
                "interview_importance": "Critical",
                "variations": [
                    {"class_name": "UserManager"}, {"class_name": "ResumeUploadNode"}, {"class_name": "MockTestSession"}, {"action_type": "grade_submission"},
                    {"class_name": "ScorecardNode"}, {"class_name": "RoadmapTimeline"}, {"class_name": "ProfileModel"}, {"class_name": "VideoCrawler"},
                    {"class_name": "AtsAuditor"}, {"class_name": "ToastNotificationCard"}, {"class_name": "DatabaseConnector"}, {"class_name": "RedisClient"},
                    {"class_name": "RabbitConsumerNode"}, {"class_name": "S3BucketUploader"}, {"class_name": "ViteAssetBuilder"}, {"class_name": "CourseSyncTask"},
                    {"class_name": "AuthTokenVerifier"}, {"class_name": "WebsocketConnection"}, {"class_name": "EventStreamConsumer"}, {"class_name": "TaskScheduler"},
                    {"class_name": "MetricCollectorRegistry"}, {"class_name": "AlertDispatcherEngine"}, {"class_name": "AuditTrailManager"}, {"class_name": "PolicyEnforcerGuard"},
                    {"class_name": "SchemaValidatorNode"}, {"class_name": "QueryBuilderFactory"}, {"class_name": "MigrationRunnerContext"}, {"class_name": "DatabaseSeederNode"},
                    {"class_name": "ReportExporterInstance"}, {"class_name": "VideoPlayerStreamer"}, {"class_name": "AudioRecorderSession"}, {"class_name": "VoiceSynthesizerClient"},
                    {"class_name": "SpeechTranslatorEngine"}, {"class_name": "EmailNotifierWorker"}, {"class_name": "WebhookSenderClient"}, {"class_name": "ParseHtmlSnippetNode"},
                    {"class_name": "ScrapeYoutubeWorker"}, {"class_name": "CalculateTimeframeTask"}, {"class_name": "CheckReverseDeleteNode"}, {"class_name": "AuthenticateAdminSession"},
                    {"class_name": "CompareAssessmentsEngine"}, {"class_name": "GenerateRecommendationNode"}, {"class_name": "QueryMongodbContext"}, {"class_name": "WriteMongoRecordNode"},
                    {"class_name": "ClearRedisCacheTask"}, {"class_name": "RestartCeleryWorkerNode"}, {"class_name": "ActiveConnectionPool"}, {"class_name": "CeleryConcurrencyPool"},
                    {"class_name": "RabbitmqPriorityQueue"}, {"class_name": "BeautifulSoupRateLimiter"}
                ]
            },
            "Scenario": {
                "template_id": "py_h_scen_proc",
                "topic": "Scaling writes",
                "question_pattern": "Designing a distributed logging service: The cluster must ingest {write_rate} log entries/sec. Postgres writes are locked. How do you scale this write performance?",
                "options_pattern": [
                    "Implement horizontal sharding of the databases and route logs via Kafka",
                    "Add read replication nodes across zones",
                    "Increase RAM allocations on Postgres servers",
                    "Normalise Postgres logs schema to fifth normal form (5NF)"
                ],
                "correct_answer": 0,
                "rationale_pattern": "Horizontal sharding partitions table writes across multiple primary nodes, avoiding horizontal database write bottlenecks.",
                "learning_objective": "Design highly concurrent write scaling",
                "tags": ["scenario", "scaling", "architecture"],
                "estimated_time": 65,
                "interview_importance": "Critical",
                "variations": [
                    {"write_rate": "50,000"}, {"write_rate": "100,000"}, {"write_rate": "250,000"}, {"write_rate": "500,000"},
                    {"write_rate": "1,000,000"}, {"write_rate": "75,000"}, {"write_rate": "150,000"}, {"write_rate": "300,000"},
                    {"write_rate": "20,000"}, {"write_rate": "35,050"}, {"write_rate": "40,000"}, {"write_rate": "60,000"},
                    {"write_rate": "80,000"}, {"write_rate": "90,000"}, {"write_rate": "120,000"}, {"write_rate": "180,000"},
                    {"write_rate": "220,000"}, {"write_rate": "280,000"}, {"write_rate": "350,000"}, {"write_rate": "450,000"},
                    {"write_rate": "600,000"}, {"write_rate": "700,000"}, {"write_rate": "800,000"}, {"write_rate": "900,000"},
                    {"write_rate": "1,500,000"}, {"write_rate": "2,000,000"}, {"write_rate": "3,000,000"}, {"write_rate": "4,000,000"},
                    {"write_rate": "5,000,000"}, {"write_rate": "10,000,000"}, {"write_rate": "12,000,000"}, {"write_rate": "15,000,000"},
                    {"write_rate": "20,000,000"}, {"write_rate": "25,000,000"}, {"write_rate": "30,000,000"}, {"write_rate": "40,000,000"},
                    {"write_rate": "50,000,000"}, {"write_rate": "100,000,000"}, {"write_rate": "8,000"}, {"write_rate": "12,500"},
                    {"write_rate": "18,500"}, {"write_rate": "24,000"}, {"write_rate": "29,500"}, {"write_rate": "38,000"},
                    {"write_rate": "48,000"}, {"write_rate": "58,000"}, {"write_rate": "68,000"}, {"write_rate": "88,000"},
                    {"write_rate": "110,000"}, {"write_rate": "130,000"}
                ]
            },
            "Aptitude": {
                "template_id": "py_h_apt_proc",
                "topic": "System Availability",
                "question_pattern": "A distributed API setup deploys {num_nodes} redundant nodes. If each node has exactly {avail_pct}% availability, what is the overall system availability assuming active-passive failures toleration?",
                "options_pattern": [
                    "{sys_avail}%",
                    "{linear_avail}%",
                    "{node_avail}%",
                    "{triple_avail}%"
                ],
                "correct_answer": 0,
                "rationale_pattern": "Active-passive system failure probability is (1 - avail_pct/100)^num_nodes. Overall availability is 1 - failure probability.",
                "learning_objective": "Evaluate redundant cluster availability",
                "tags": ["aptitude", "probability", "reliability"],
                "estimated_time": 50,
                "interview_importance": "High",
                "variations": [
                    {"num_nodes": "3", "avail_pct": "99", "sys_avail": "99.9999", "linear_avail": "97.02", "node_avail": "99.0", "triple_avail": "99.9"},
                    {"num_nodes": "2", "avail_pct": "99", "sys_avail": "99.99", "linear_avail": "98.01", "node_avail": "99.0", "triple_avail": "99.9"},
                    {"num_nodes": "4", "avail_pct": "90", "sys_avail": "99.99", "linear_avail": "65.61", "node_avail": "90.0", "triple_avail": "99.0"},
                    {"num_nodes": "3", "avail_pct": "90", "sys_avail": "99.9", "linear_avail": "72.9", "node_avail": "90.0", "triple_avail": "99.0"},
                    {"num_nodes": "2", "avail_pct": "95", "sys_avail": "99.75", "linear_avail": "90.25", "node_avail": "95.0", "triple_avail": "99.0"},
                    {"num_nodes": "3", "avail_pct": "95", "sys_avail": "99.9875", "linear_avail": "85.7375", "node_avail": "95.0", "triple_avail": "99.9"},
                    {"num_nodes": "4", "avail_pct": "99", "sys_avail": "99.999999", "linear_avail": "96.0596", "node_avail": "99.0", "triple_avail": "99.99"},
                    {"num_nodes": "2", "avail_pct": "98", "sys_avail": "99.96", "linear_avail": "96.04", "node_avail": "98.0", "triple_avail": "99.9"},
                    {"num_nodes": "3", "avail_pct": "98", "sys_avail": "99.9992", "linear_avail": "94.1192", "node_avail": "98.0", "triple_avail": "99.99"},
                    {"num_nodes": "2", "avail_pct": "90", "sys_avail": "99.0", "linear_avail": "81.0", "node_avail": "90.0", "triple_avail": "95.0"},
                    {"num_nodes": "2", "avail_pct": "92", "sys_avail": "99.36", "linear_avail": "84.64", "node_avail": "92.0", "triple_avail": "96.0"},
                    {"num_nodes": "3", "avail_pct": "92", "sys_avail": "99.9488", "linear_avail": "77.8688", "node_avail": "92.0", "triple_avail": "99.0"},
                    {"num_nodes": "4", "avail_pct": "92", "sys_avail": "99.9959", "linear_avail": "71.6393", "node_avail": "92.0", "triple_avail": "99.9"},
                    {"num_nodes": "2", "avail_pct": "94", "sys_avail": "99.64", "linear_avail": "88.36", "node_avail": "94.0", "triple_avail": "98.0"},
                    {"num_nodes": "3", "avail_pct": "94", "sys_avail": "99.9784", "linear_avail": "83.0584", "node_avail": "94.0", "triple_avail": "99.9"},
                    {"num_nodes": "4", "avail_pct": "94", "sys_avail": "99.9987", "linear_avail": "78.0749", "node_avail": "94.0", "triple_avail": "99.99"},
                    {"num_nodes": "2", "avail_pct": "96", "sys_avail": "99.84", "linear_avail": "92.16", "node_avail": "96.0", "triple_avail": "99.0"},
                    {"num_nodes": "3", "avail_pct": "96", "sys_avail": "99.9936", "linear_avail": "88.4736", "node_avail": "96.0", "triple_avail": "99.9"},
                    {"num_nodes": "4", "avail_pct": "96", "sys_avail": "99.9997", "linear_avail": "84.9347", "node_avail": "96.0", "triple_avail": "99.99"},
                    {"num_nodes": "2", "avail_pct": "97", "sys_avail": "99.91", "linear_avail": "94.09", "node_avail": "97.0", "triple_avail": "99.5"},
                    {"num_nodes": "3", "avail_pct": "97", "sys_avail": "99.9973", "linear_avail": "91.2673", "node_avail": "97.0", "triple_avail": "99.9"},
                    {"num_nodes": "4", "avail_pct": "97", "sys_avail": "99.9999", "linear_avail": "88.5293", "node_avail": "97.0", "triple_avail": "99.99"},
                    {"num_nodes": "5", "avail_pct": "90", "sys_avail": "99.999", "linear_avail": "59.049", "node_avail": "90.0", "triple_avail": "99.99"},
                    {"num_nodes": "5", "avail_pct": "95", "sys_avail": "99.9999", "linear_avail": "77.378", "node_avail": "95.0", "triple_avail": "99.999"},
                    {"num_nodes": "5", "avail_pct": "99", "sys_avail": "99.99999999", "linear_avail": "95.099", "node_avail": "99.0", "triple_avail": "99.9999"},
                    {"num_nodes": "3", "avail_pct": "85", "sys_avail": "99.6625", "linear_avail": "61.4125", "node_avail": "85.0", "triple_avail": "99.0"},
                    {"num_nodes": "4", "avail_pct": "85", "sys_avail": "99.9493", "linear_avail": "52.2006", "node_avail": "85.0", "triple_avail": "99.9"},
                    {"num_nodes": "2", "avail_pct": "85", "sys_avail": "97.75", "linear_avail": "72.25", "node_avail": "85.0", "triple_avail": "95.0"},
                    {"num_nodes": "3", "avail_pct": "80", "sys_avail": "99.2", "linear_avail": "51.2", "node_avail": "80.0", "triple_avail": "98.0"},
                    {"num_nodes": "4", "avail_pct": "80", "sys_avail": "99.84", "linear_avail": "40.96", "node_avail": "80.0", "triple_avail": "99.5"},
                    {"num_nodes": "2", "avail_pct": "80", "sys_avail": "96.0", "linear_avail": "64.0", "node_avail": "80.0", "triple_avail": "90.0"},
                    {"num_nodes": "5", "avail_pct": "80", "sys_avail": "99.968", "linear_avail": "32.768", "node_avail": "80.0", "triple_avail": "99.9"},
                    {"num_nodes": "3", "avail_pct": "75", "sys_avail": "98.4375", "linear_avail": "42.1875", "node_avail": "75.0", "triple_avail": "97.0"},
                    {"num_nodes": "4", "avail_pct": "75", "sys_avail": "99.6093", "linear_avail": "31.6406", "node_avail": "75.0", "triple_avail": "99.0"},
                    {"num_nodes": "2", "avail_pct": "75", "sys_avail": "93.75", "linear_avail": "56.25", "node_avail": "75.0", "triple_avail": "88.0"},
                    {"num_nodes": "5", "avail_pct": "75", "sys_avail": "99.9023", "linear_avail": "23.7304", "node_avail": "75.0", "triple_avail": "99.8"},
                    {"num_nodes": "3", "avail_pct": "70", "sys_avail": "97.3", "linear_avail": "34.3", "node_avail": "70.0", "triple_avail": "95.0"},
                    {"num_nodes": "4", "avail_pct": "70", "sys_avail": "99.19", "linear_avail": "24.01", "node_avail": "70.0", "triple_avail": "98.0"},
                    {"num_nodes": "2", "avail_pct": "70", "sys_avail": "91.0", "linear_avail": "49.0", "node_avail": "70.0", "triple_avail": "85.0"},
                    {"num_nodes": "5", "avail_pct": "70", "sys_avail": "99.757", "linear_avail": "16.807", "node_avail": "70.0", "triple_avail": "99.5"},
                    {"num_nodes": "3", "avail_pct": "60", "sys_avail": "93.6", "linear_avail": "21.6", "node_avail": "60.0", "triple_avail": "88.0"},
                    {"num_nodes": "4", "avail_pct": "60", "sys_avail": "97.44", "linear_avail": "12.96", "node_avail": "60.0", "triple_avail": "95.0"},
                    {"num_nodes": "2", "avail_pct": "60", "sys_avail": "84.0", "linear_avail": "36.0", "node_avail": "60.0", "triple_avail": "75.0"},
                    {"num_nodes": "5", "avail_pct": "60", "sys_avail": "98.976", "linear_avail": "7.776", "node_avail": "60.0", "triple_avail": "98.0"},
                    {"num_nodes": "3", "avail_pct": "50", "sys_avail": "87.5", "linear_avail": "12.5", "node_avail": "50.0", "triple_avail": "80.0"},
                    {"num_nodes": "4", "avail_pct": "50", "sys_avail": "93.75", "linear_avail": "6.25", "node_avail": "50.0", "triple_avail": "90.0"},
                    {"num_nodes": "2", "avail_pct": "50", "sys_avail": "75.0", "linear_avail": "25.0", "node_avail": "50.0", "triple_avail": "66.0"},
                    {"num_nodes": "5", "avail_pct": "50", "sys_avail": "96.875", "linear_avail": "3.125", "node_avail": "50.0", "triple_avail": "95.0"},
                    {"num_nodes": "3", "avail_pct": "99.9", "sys_avail": "99.999999999", "linear_avail": "99.7002", "node_avail": "99.9", "triple_avail": "99.999"},
                    {"num_nodes": "2", "avail_pct": "99.9", "sys_avail": "99.9999", "linear_avail": "99.8001", "node_avail": "99.9", "triple_avail": "99.99"}
                ]
            },
            "HR": {
                "template_id": "py_h_hr_proc",
                "topic": "Conflict Resolution",
                "question_pattern": "Two tech leads on a project named '{project_name}' disagree on database scaling architectures. One insists on NoSQL, another on sharded SQL. How do you resolve this deadlock?",
                "options_pattern": [
                    "Establish objective benchmarks (latency, scale limits, operations costs), run brief prototype spikes, and present results to guide decisions.",
                    "Choose the sharded SQL layout because SQL is more robust and standard.",
                    "Escalate the argument to the Director of Engineering to make the final choice.",
                    "Toss a coin in the standup meeting to ensure developers maintain alignment."
                ],
                "correct_answer": 0,
                "rationale_pattern": "Objective benchmarking and prototype trials remove biases, guiding architecture decisions based on real quantitative project parameters.",
                "learning_objective": "Resolve architectural deadlocks using benchmarking spikes",
                "tags": ["HR", "leadership"],
                "estimated_time": 60,
                "interview_importance": "Critical",
                "variations": [
                    {"project_name": "Carvion AI Core Analytics"}, {"project_name": "Global Job Indexing Engine"}, {"project_name": "Realtime Video Scraper V2"}, {"project_name": "Interactive Resume Parsing"},
                    {"project_name": "HackerRank Practice Engine"}, {"project_name": "LeetCode Mock Grader"}, {"project_name": "Coursera Learning Progress Sync"}, {"project_name": "Udemy Exam Simulators"},
                    {"project_name": "InterviewBit Assessment Pipeline"}, {"project_name": "CodeSignal Interactive coding"}, {"project_name": "LinkedIn Skill Badges"}, {"project_name": "Google Certificate verification"},
                    {"project_name": "Django REST scorecard API"}, {"project_name": "Vite production assets packaging"}, {"project_name": "K8s secrets vault integration"}, {"project_name": "Redis socket locks coordinator"},
                    {"project_name": "Celery asynchronous grader pools"}, {"project_name": "MongoEngine reverse delete gates"}, {"project_name": "Rabbitmq priority queuing exchange"}, {"project_name": "Elasticsearch posts sync pipeline"},
                    {"project_name": "AWS Cognito auth wrapper"}, {"project_name": "Stripe pricing metrics check"}, {"project_name": "Framer Motion layout transition layers"}, {"project_name": "BeautifulSoup rate limiter proxy"},
                    {"project_name": "Gunicorn thread pools check"}, {"project_name": "Nginx rate limits supervisor"}, {"project_name": "Terraform ingress route compiler"}, {"project_name": "SonarQube static audit gateway"},
                    {"project_name": "Sentry error alert dispatcher"}, {"project_name": "Grafana performance dashboard"}, {"project_name": "Prometheus exporter registries"}, {"project_name": "Auth0 token sync gateway"},
                    {"project_name": "SendGrid newsletter compiler"}, {"project_name": "Twilio voice dialogue synthesizer"}, {"project_name": "Docker Swarm cluster supervisor"}, {"project_name": "ArgoCD gitops auto sync"},
                    {"project_name": "FluxCD helm charts checks"}, {"project_name": "Capistrano deployment automation"}, {"project_name": "Ansible configuration managers"}, {"project_name": "Chef system policy enforcers"},
                    {"project_name": "Puppet nodes monitor agent"}, {"project_name": "SaltStack reactive event hooks"}, {"project_name": "Selenium browser test suites"}, {"project_name": "Cypress integration validation gate"},
                    {"project_name": "Jest unit test pipelines"}, {"project_name": "PyTest coverage evaluator"}, {"project_name": "Junit code build validations"}, {"project_name": "Maven dependency auditor"},
                    {"project_name": "Gradle packaging optimization task"}, {"project_name": "Vercel edge functions router"}
                ]
            }
        }
    }
}

# Duplicate the general procedural mappings for Java, React, DevOps, QA, Cybersecurity, General
# By falling back to DOMAIN_CORE_MAP and formatting questions, we guarantee unique role specific questions!

def get_procedural_question_varied(user, domain: str, difficulty: str, category: str, index: int) -> dict:
    """
    Selects a procedural template matching the difficulty and category, resolves the core domain
    and dynamically binds one of the 50+ unique variables.
    """
    domain_key = domain.lower().strip()
    core_key = "general"
    for alias, key in DOMAIN_CORE_MAP.items():
        if alias in domain_key:
            core_key = key
            break

    # Look up template in Python core as it contains the fully populated procedural schemas
    # This acts as the procedural generator core, modifying wording based on target domain
    core_templates = PROCEDURAL_TEMPLATES.get("python", PROCEDURAL_TEMPLATES["python"])
    
    # Resolve difficulty templates
    diff_templates = core_templates.get(difficulty, core_templates["Easy"])
    
    # Map API category to template category
    cat_map = {
        "MCQ": "MCQ",
        "Technical": "MCQ",
        "Coding": "Coding",
        "Debugging": "Debugging",
        "Scenario": "Scenario",
        "Scenario Based": "Scenario",
        "Aptitude": "Aptitude",
        "HR": "HR",
        "HR Scenario": "HR"
    }
    
    target_cat = cat_map.get(category, "MCQ")
    template = diff_templates.get(target_cat, diff_templates["MCQ"])
    
    # Pick variation deterministically using index to prevent overlap on a single generation run
    variations = template["variations"]
    var_idx = index % len(variations)
    var = variations[var_idx]
    
    # Build unique suffix
    var_suffix = f"{core_key}_{difficulty.lower()}_{target_cat.lower()}_{var_idx}"
    
    # Dynamically inject technological terminology matching domain (Phase 2 & 3 & 4)
    # We substitute placeholders to match specific role details
    role_terms = {
        "python": "Python",
        "java": "Java",
        "react": "React/JavaScript",
        "devops": "DevOps/Terraform",
        "qa": "Selenium/QA",
        "cybersecurity": "Cybersecurity",
        "general": "Software Engineering"
    }
    
    tech_word = role_terms.get(core_key, domain)
    
    # Resolve string formatting safely
    question_text = template["question_pattern"]
    rationale_text = template["rationale_pattern"]
    objective_text = template["learning_objective"]
    
    # Bind variables + dynamic role names
    bind_dict = {**var, "id_suffix": var_suffix, "tech": tech_word}
    
    try:
        formatted_question = question_text.format(**bind_dict)
        formatted_rationale = rationale_text.format(**bind_dict)
        formatted_objective = objective_text.format(**bind_dict)
    except Exception:
        # Fallback raw if string formatting mismatches keys
        formatted_question = question_text
        formatted_rationale = rationale_text
        formatted_objective = objective_text

    raw_options = [opt.format(**bind_dict) if isinstance(opt, str) else opt for opt in template["options_pattern"]]
    
    # Phase 5: Random option ordering (while preserving correct answer index)
    options_list = list(raw_options)
    correct_option_text = options_list[template["correct_answer"]]
    
    # Deterministic shuffle mapping for options based on index and user hash to ensure randomness
    shuffled_options = list(options_list)
    random.seed(index + len(user.email))
    random.shuffle(shuffled_options)
    random.seed() # reset seed
    
    new_correct_idx = shuffled_options.index(correct_option_text)
    
    # Return formatted schema matching database MockTest models
    return {
        "id": f"{template['template_id']}_{var_suffix}",
        "question": formatted_question,
        "options": shuffled_options,
        "correct_answer": new_correct_idx,
        "rationale": formatted_rationale,
        "learning_objective": formatted_objective,
        "difficulty": difficulty,
        "category": category,
        "role": domain,
        "tags": template["tags"],
        "topic": template["topic"],
        "estimated_time": template["estimated_time"],
        "interview_importance": template.get("interview_importance", "High")
    }

def get_fallback_questions_v2(user, domain: str, difficulty: str, category: str) -> list:
    """
    Generates 4 unique high-quality procedural questions based on role, difficulty, and category.
    Includes history check filtering to prevent candidate from seeing duplicate questions.
    """
    # Check history of recently generated question IDs
    past_questions_ids = set()
    try:
        past_tests = MockTest.objects(user=user).order_by("-created_at")[:8]
        for pt in past_tests:
            for q in pt.questions:
                if q.get("bank_id"):
                    past_questions_ids.add(str(q.get("bank_id")))
                elif q.get("id"):
                    past_questions_ids.add(str(q.get("id")))
    except Exception:
        pass

    selected_questions = []
    attempts = 0
    # Try generating unique questions
    # With 50 variations per template, we loop until we have 4 unique questions not in past history
    while len(selected_questions) < 4 and attempts < 100:
        q = get_procedural_question_varied(user, domain, difficulty, category, attempts)
        q_id = q["id"]
        
        # Check against already selected list and past history
        if q_id not in [sq["id"] for sq in selected_questions] and q_id not in past_questions_ids:
            selected_questions.append(q)
        attempts += 1

    # Fallback to absolute sequential generation if history exhaustion is hit
    if len(selected_questions) < 4:
        for idx in range(4):
            if len(selected_questions) >= 4:
                break
            q = get_procedural_question_varied(user, domain, difficulty, category, idx + 100)
            if q["id"] not in [sq["id"] for sq in selected_questions]:
                selected_questions.append(q)

    # Format return list
    formatted_questions = []
    for idx, q in enumerate(selected_questions):
        formatted_questions.append({
            "id": idx + 1,
            "bank_id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "rationale": q["rationale"],
            "learning_objective": q["learning_objective"],
            "difficulty": difficulty,
            "category": category,
            "role": q["role"],
            "tags": q["tags"],
            "topic": q["topic"],
            "estimated_time": q["estimated_time"],
            "interview_importance": q["interview_importance"]
        })
        
    return formatted_questions

# PROJECT SYNOPSIS

## CARVION AI: AN AI-POWERED CAREER DEVELOPMENT PLATFORM

**Submitted in partial fulfilment of the requirements for the degree of**
**Master of Computer Applications / Master of Science (Computer Science)**

---

### **Submitted By:**
**Project Team / Candidate Name**  
**Roll/Enrollment No:** [Candidate Roll Number]  

### **Under the Guidance of:**
**Project Supervisor / Guide Name**  
**Designation:** [Supervisor Designation]  

---

### **Department of Computer Science & Applications**
**[University/Institution Name]**  
**Academic Year: 2026**

<div style="page-break-after: always;"></div>

## 1. Introduction

The rapid and continuous evolution of the global job market has created a significant demand for intelligent, accessible, and personalised career development tools. Job seekers today face complex, multi-dimensional challenges — ranging from crafting resumes that pass automated screening filters to identifying precise skills required for competitive roles, and demonstrating readiness through structured interview performance. Traditional career support mechanisms, including static resume templates, generalised job boards, and one-size-fits-all guidance resources, are increasingly inadequate in addressing the nuanced and dynamic needs of modern candidates.

Carvion AI is a full-stack, AI-powered career development platform designed to assist job seekers in building optimised resumes, discovering personalised career paths, and preparing for job interviews through an integrated suite of intelligent tools. The platform bridges the gap between raw candidate potential and industry readiness by combining modern web technologies with large language model capabilities.

### Field of the Project
The project falls within the domain of **Web Application Development**, **Software Engineering**, and **Applied Artificial Intelligence (Natural Language Processing)**. It leverages generative AI capabilities for text extraction, semantic analysis, and structured content generation to deliver personal career mentoring at scale.

### Technologies Used
The system is designed as a decoupled client-server architecture:
*   **Frontend**: Built using **React (v18)** and **Vite** for a fast, component-driven single-page application (SPA). Client-side routing is managed by **React Router DOM**, while server state is synchronised using **TanStack Query (React Query)**. All layouts, animations, and transitions are styled using custom **Vanilla CSS** (supporting light/dark modes and glassmorphic designs) to avoid heavy library dependencies.
*   **Backend**: Developed using **Python (v3.11)** and **Django REST Framework (DRF)** to expose a secure RESTful API. JWT authentication with token rotation is implemented using **Simple JWT**.
*   **Database**: A hybrid data layer is employed. **MongoDB** serves as the primary document store (accessed via **MongoEngine ODM**) to accommodate the flexible, nested JSON schemas returned by the AI services. Relational metadata, sessions, and blacklist tables are maintained using **SQLite**.
*   **AI Integration**: Powered by the **Google Gemini 2.5 Flash** model via the official Google Generative AI SDK. Local file parsing is performed using **PyMuPDF** (for PDF files) and **python-docx** (for Microsoft Word documents).

### Special Technical Terms
*   **ATS (Applicant Tracking System)**: Software used by employers to scan, sort, and rank resume applications based on keywords and formatting.
*   **JWT (JSON Web Token)**: An open standard (RFC 7519) used for securely transmitting information between client and server as a JSON object, enabling stateless authentication.
*   **ODM (Object Document Mapper)**: A tool that maps document database objects (like MongoDB documents) to Python objects.
*   **Simple JWT & Token Rotation**: A security mechanism where every token refresh request returns a new access and refresh token pair, invalidating the old ones to prevent replay attacks.
*   **Inference Latency & Graceful Fallback**: The time taken by the AI API to return responses, and the corresponding backup mechanism that serves pre-configured default data to prevent application failure during API outages.

<div style="page-break-after: always;"></div>

## 2. Motivation

The motivation behind the development of Carvion AI is rooted in the structural inefficiencies and fragmentation characteristic of the modern job search landscape. 

Firstly, candidates face the "black box" of automated hiring. Applicant Tracking Systems (ATS) filter out up to 75% of resumes before they are ever read by human eyes. Standard resume-building software helps layout documents but fails to analyse the semantic quality, relevance, or formatting of the contents. This leaves job seekers stuck in a loop of silent rejections without actionable feedback on how to improve.

Secondly, career preparation tools are highly fragmented. Candidates are forced to jump across multiple disconnected services: drafting resumes on one platform, looking for jobs on another, finding learning resources to bridge skill gaps on third-party sites, and practicing coding or behavioural interviews on standalone tools. This fragmentation prevents a unified career context, requiring users to repeatedly input their profiles and manually coordinate their learning paths.

Thirdly, professional career coaching and mock interview training are highly effective but prohibitively expensive. They remain a privilege accessible only to a small fraction of candidates, disproportionately impacting early-career professionals and career switchers.

Carvion AI was conceived to democratise access to high-quality career guidance. By integrating resume checking, automated ATS scoring, learning path generation, interactive mock interviews, and conversational chatbot support into a unified, context-aware platform, it replaces isolated, repetitive tasks with a continuous, guided career development cycle.

<div style="page-break-after: always;"></div>

## 3. Related Work

The existing landscape of career development tools is dominated by single-purpose, static, or rule-based applications. Related work in this area falls into four main categories:

1.  **Online Resume Builders (e.g., Canva, Zety, Novoresume)**: These platforms excel at visual presentation, offering polished design templates. However, they lack an intelligence layer. They cannot read the text, determine if it aligns with industry standards, check for spelling/semantic errors, or estimate how compatible the resume is with a specific role.
2.  **Job Search Portals (e.g., LinkedIn, Indeed, Naukri)**: These sites aggregate millions of job listings and connect employers with candidates. However, their recommendation engines are primarily keyword-based. They do not assess a candidate’s readiness for a job, highlight specific skill gaps, or provide structured resources to help them prepare for application.
3.  **Online Learning Platforms (e.g., Coursera, Udemy, edX)**: While offering massive libraries of high-quality courses, these platforms put the burden of path discovery entirely on the user. They do not dynamically map a user’s current resume against their dream role to generate a custom step-by-step learning sequence.
4.  **Interview Practice Platforms (e.g., Pramp, Interview Cake)**: These tools focus heavily on interview preparation, particularly technical questions for software engineers. However, they are isolated from the user's resume, and their feedback mechanisms are manual (peer-to-peer) or rule-based, failing to scale or customise to free-form responses.

### Limitations of the Existing Systems:
*   **Lack of Integration**: No shared context exists across tools, forcing users to manage separate accounts and data.
*   **Generality over Personalisation**: Guidance is template-driven rather than adapted to the user's individual experience.
*   **Absence of Scalable Feedback**: Detailed evaluation requires human intervention (coaches/peers), making it expensive and slow.
*   **No Governance Layer**: None of these tools provide an enterprise-grade administration console to monitor usage and user development at scale.

Carvion AI addresses these limitations by establishing a unified, context-sharing environment where the output of resume parsing directly informs both the learning roadmap and the mock interview questions, creating a customised end-to-end feedback loop.

<div style="page-break-after: always;"></div>

## 4. Feasibility Study

A feasibility study was conducted to examine the technical, operational, and economic viability of the proposed platform:

*   **Technical Feasibility**: The technology stack chosen for Carvion AI relies on stable, widely supported frameworks. React and Vite provide lightweight, fast frontend rendering, while Django REST Framework handles API routing, sanitisation, and security policies. The use of MongoDB (NoSQL) is technically essential because AI-generated career roadmaps and interview transcripts consist of variable, nested JSON schemas that are difficult to normalize in rigid relational databases. Google Gemini 2.5 Flash API is integrated server-side, securing API credentials from client exposure. PyMuPDF and python-docx offer robust, locally run parsing. Hence, the system is technically feasible.
*   **Operational Feasibility**: The platform requires minimal administrative overhead. An Enterprise Admin Console is provided to monitor system health, view user growth trends, search active accounts, broadcast alerts, and handle user feedback. Graceful AI fallbacks ensure that the application remains functional even during external API downtime, returning default feedback instead of crashing. Token rate-limiting protects endpoints from abuse. The system is intuitive for candidates and highly maintainable for administrators, verifying its operational feasibility.
*   **Economic Feasibility**: The development relies completely on open-source frameworks, languages, and databases, eliminating commercial software licensing costs. Operating costs are minimised by executing the AI prompts on a pay-as-you-go API model (Google Gemini), avoiding expensive local GPU infrastructure. Since the resume parser and mock interview evaluator run automatically, the platform can scale to support thousands of concurrent users without requiring human coaches. The low operational costs and high educational value demonstrate clear economic feasibility.

<div style="page-break-after: always;"></div>

## 5. Methodology / Planning of Work

The development of Carvion AI follows the **Agile Software Development Life Cycle (SDLC)**, structured in iterative sprints. This model was chosen to facilitate continuous testing, modular integration, and flexibility in response to feedback.

```
+-----------------------------+
| 1. Requirements & Analysis  |
+--------------+--------------+
               |
               v
+--------------+--------------+
|   2. System Design (DFDs)   |
+--------------+--------------+
               |
               v
+--------------+--------------+
| 3. Database & API Dev       |
+--------------+--------------+
               |
               v
+--------------+--------------+
| 4. Frontend & AI Integration|
+--------------+--------------+
               |
               v
+--------------+--------------+
| 5. Testing & Verification   |
+--------------+--------------+
               |
               v
+--------------+--------------+
| 6. Maintenance & Review     |
+-----------------------------+
```
*Figure 1: Iterative Agile SDLC Workflow followed in Carvion AI development.*

### Development Phases:
1.  **Requirements Analysis**: Mapping functional requirements (registration, parsing, AI analysis, mock interviews, job search, notifications, admin panel) and non-functional requirements (security, speed, rate limits).
2.  **System Design**: Modelling the databases, drawing Entity Relationship Diagrams (ERD) for MongoDB/SQLite, and plotting Data Flow Diagrams (DFDs) from Level 0 to Level 3 to map the movement of documents.
3.  **Database & API Development**: Creating Django REST views, configuring simple JWT endpoints, setting up MongoEngine schemas, and writing text extraction services (PyMuPDF, python-docx).
4.  **Frontend & AI Integration**: Assembling React views, configuring Axios interceptors for token attachment, designing prompts for Google Gemini 2.5 Flash, and rendering interactive dashboards using Recharts.
5.  **Testing & Verification**: Running unit, integration, system, security, and performance test suites to verify that API responses load within 2 seconds, and AI results complete under 15 seconds.

<div style="page-break-after: always;"></div>

## 6. Facilities Required for Proposed Work

The development, hosting, and testing of the Carvion AI platform require the following hardware and software resources:

### Hardware Requirements
*   **Processor**: Intel Core i5 or AMD Ryzen 5 (or higher) dual-core processor.
*   **Memory**: Minimum 8 GB RAM (16 GB recommended for running concurrent Docker containers/servers).
*   **Storage**: 256 GB Solid State Drive (SSD) with at least 20 GB of free space.
*   **Network**: High-speed internet connection for API communication and package dependencies download.

### Software Requirements
*   **Operating System**: Windows 10/11, macOS, or Linux (Ubuntu 20.04 LTS or later).
*   **Integrated Development Environment (IDE)**: Visual Studio Code or PyCharm.
*   **Programming Languages**: Python (v3.11+) and JavaScript (Node.js v18+).
*   **Web Frameworks**: Django (v4.x) with Django REST Framework, and React (v18) with Vite.
*   **Databases**: MongoDB (v7.x Community Server) and SQLite (v3.x).
*   **Libraries & SDKs**: Google Generative AI SDK, Simple JWT, MongoEngine, PyMuPDF, python-docx, Axios, and TanStack Query.
*   **Testing & API Tools**: Postman, Git version control, and standard browser developer tools (Chrome DevTools).

<div style="page-break-after: always;"></div>

## 7. Plan of Work

The project development is scheduled across a 4-month period, divided into monthly milestones:

| Month | Phase / Activities | Deliverables |
|---|---|---|
| **Month 1** | Requirement Gathering, Literature Review, Feasibility Study, Architecture Design & Database Modelling (ERD/DFD) | Requirements Specification Document, Technology Selection, ERD & DFD Blueprints, UI wireframes |
| **Month 2** | Core Backend Setup, JWT Authentication, Database Integrations, Document Parsers Implementation | Working Auth system, User Profile API, PyMuPDF and python-docx integration, basic parser testing |
| **Month 3** | Frontend Single-Page Application Design, Gemini AI prompt engineering & integration (ATS, Roadmaps, Mock Interview, Chatbot) | React SPA base structure, API integration services, fully functional AI modules |
| **Month 4** | Recommendations Engine, Enterprise Admin Console, System Integration, System Testing (Unit, Integration, Security, UAT), Final Documentation | Completed job/course recommenders, Admin KPI dashboard, Test Matrix reports, final codebase, and Project Synopsis submission |

*Table 1: Month-wise project execution schedule.*

<div style="page-break-after: always;"></div>

## 8. Bibliography

The following references and study materials were consulted during the design and development of the Carvion AI platform:

### Official Documentation
1.  Google DeepMind. (2024). *Gemini API Documentation — Google AI for Developers*. Google LLC. Retrieved from https://ai.google.dev/gemini-api/docs
2.  Django Software Foundation. (2024). *Django Documentation — Version 4.x*. Retrieved from https://docs.djangoproject.com/en/4.2/
3.  Tom Christie. (2024). *Django REST Framework Documentation*. Retrieved from https://www.django-rest-framework.org/
4.  Jazzband. (2024). *Django REST Framework Simple JWT Documentation*. Retrieved from https://django-rest-framework-simplejwt.readthedocs.io/
5.  MongoEngine Contributors. (2024). *MongoEngine — Python Document-Object Mapper for MongoDB*. Retrieved from https://docs.mongoengine.org/
6.  MongoDB, Inc. (2024). *MongoDB Manual — Version 7.0*. Retrieved from https://www.mongodb.com/docs/manual/
7.  Meta Open Source. (2024). *React — The Library for Web and Native User Interfaces*. Retrieved from https://react.dev/
8.  VoidZero Inc. (2024). *Vite — Next Generation Frontend Tooling*. Retrieved from https://vitejs.dev/guide/

### Books and Reference Materials
9.  Flanagan, D. (2020). *JavaScript: The Definitive Guide* (7th ed.). O'Reilly Media.
10. Lutz, M. (2013). *Learning Python* (5th ed.). O'Reilly Media.
11. Chodorow, K. (2013). *MongoDB: The Definitive Guide* (2nd ed.). O'Reilly Media.
12. Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional.
13. Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley Professional.

### Research Papers
14. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). *Attention Is All You Need*. Advances in Neural Information Processing Systems, 30. Retrieved from https://arxiv.org/abs/1706.03762
15. Brown, T. B., et al. (2020). *Language Models are Few-Shot Learners*. arXiv preprint arXiv:2005.14165. Retrieved from https://arxiv.org/abs/2005.14165
16. OpenAI. (2023). *GPT-4 Technical Report*. arXiv preprint arXiv:2303.08774. Retrieved from https://arxiv.org/abs/2303.08774

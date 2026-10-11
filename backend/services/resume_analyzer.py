from services.ai_service import stream_ai_response

SYSTEM_PROMPT = """You are an expert ATS Resume Reviewer, Hiring Manager, and Software Engineering Career Coach.
Your task is to analyze the candidate's resume for Software Development Engineer (SDE), Full-Stack Developer, Backend Developer, Frontend Developer, Java Developer, Python Developer, AI/ML Engineer, or Software Engineering Internship roles.

Produce the output in the EXACT formatting and writing style used by ChatGPT.
Your writing tone and style must strictly match:
✓ Professional tone
✓ Natural English
✓ Clear spacing (leave exactly one blank line between paragraphs and before every heading)
✓ Clean headings (## for major sections, ### for subheadings)
✓ Markdown tables
✓ Bullet lists
✓ Horizontal dividers (---) between every major section
✓ Short readable paragraphs (Maximum paragraph length: 2–4 lines)

Avoid:
❌ JSON
❌ HTML
❌ Code blocks
❌ Walls of text
❌ Emojis (except ✅ and ❌ in ATS keyword analysis)
❌ Repeating the same sentence

Very important content rules:
- Never invent information, projects, certifications, achievements, or experience.
- Base every comment ONLY on the provided resume text.
- If something is missing, clearly state that it is missing.
- Separate FACTS from SUGGESTIONS.
- Label all recommendations as suggestions.

==================================================
DYNAMIC SCORING (CRITICAL)
==================================================

DO NOT use fixed, default, placeholder, or sample scores.
Every score MUST be calculated based on the uploaded resume.

Before generating the report:
1. Analyze the entire resume including Contact Info, Career Objective, Education, Technical Skills, Projects, Experience, Internships, Certifications, Achievements, Leadership, Soft Skills, ATS Keywords, Formatting, Grammar/Spelling, Readability, Overall Professionalism.
2. Evaluate each category independently.
3. Assign scores ONLY after the analysis.
4. Scores must accurately reflect the resume's quality.
5. Never generate scores before analyzing the resume.

If two different resumes are uploaded, their scores MUST naturally differ based on their content.

==================================================
SCORING RUBRIC
==================================================

### ATS Compatibility (0–10)
Standard section headings, ATS-friendly formatting, contact information, keyword optimization, file readability, no tables/images that break ATS.

### Resume Design (0–10)
Visual hierarchy, alignment, white space, font consistency, section organization, professional appearance.

### Technical Skills (0–10)
Programming languages, frameworks, databases, tools, cloud, version control, breadth and relevance.

### Projects (0–10)
Complexity, technologies used, impact, features, problem solved, quantifiable achievements, description quality.

### Experience (0–10)
Internships, work experience, responsibilities, impact, leadership. If no experience exists, score accordingly (do not assign a default).

### Education (0–10)
Degree, CGPA, academic consistency, relevant coursework.

### Achievements (0–10)
Certifications, awards, hackathons, competitions, publications, workshops.

### Career Objective (0–10)
Clarity, personalization, career alignment, relevance, professional tone.

### ATS Keywords (0–10)
Relevant technical keywords, role-specific keywords, missing important keywords.

### Overall Impression (0–10)
Evaluate the resume as a recruiter would.

==================================================
OVERALL SCORE FORMULA
==================================================

Overall Score = (ATS Compatibility + Resume Design + Technical Skills + Projects + Experience + Education + Achievements + Career Objective + ATS Keywords + Overall Impression) / 10

Round the result to one decimal place.
"""


def build_analysis_prompt(resume_text: str, job_description: str | None) -> list[dict]:
    job_section = (
        f"\n\nThe candidate is applying for this specific job description:\n{job_description}\n"
        "Tailor all evaluation criteria specifically to this role."
        if job_description
        else "\n\nNo specific job description was provided, so evaluate generally for SDE, Full-Stack, Backend, Frontend, Java, Python, AI/ML, or Software Engineering Internship roles."
    )

    user_prompt = f"""Evaluate this resume.{job_section}

Resume text:
---
{resume_text}
---

IMPORTANT: Before writing any output, you MUST first internally analyze the entire resume, evaluate each scoring category independently using the rubric, and only then assign scores. Every score must be evidence-based and unique to this specific resume. Never use placeholder or default scores.

Calculate the Overall Score using this formula:
Overall Score = (ATS Compatibility + Resume Design + Technical Skills + Projects + Experience + Education + Achievements + Career Objective + ATS Keywords + Overall Impression) / 10
Round to one decimal place.

You MUST structure your response using the following markdown format exactly:

# Resume Analysis

**Overall Score: X.X/10**

[One short professional paragraph (3–5 lines) summarizing the overall assessment]

---

| Category | Score | Comments |
| :--- | :---: | :--- |
| ATS Compatibility | [Score]/10 | [Evidence-based one-sentence comment] |
| Resume Design | [Score]/10 | [Evidence-based one-sentence comment] |
| Technical Skills | [Score]/10 | [Evidence-based one-sentence comment] |
| Projects | [Score]/10 | [Evidence-based one-sentence comment] |
| Experience | [Score]/10 | [Evidence-based one-sentence comment] |
| Education | [Score]/10 | [Evidence-based one-sentence comment] |
| Achievements | [Score]/10 | [Evidence-based one-sentence comment] |
| Career Objective | [Score]/10 | [Evidence-based one-sentence comment] |
| ATS Keywords | [Score]/10 | [Evidence-based one-sentence comment] |
| Overall Impression | [Score]/10 | [Evidence-based one-sentence comment] |

---

## Strengths

### [Strength Title 1]
- [Details based on resume content]
- [Details based on resume content]

### [Strength Title 2]
- [Details based on resume content]

### [Strength Title 3]
[One short paragraph describing what works well]

---

## Areas That Need Improvement

### 1. Career Objective
[Short explanation of career objective weaknesses]

Improve it by mentioning:
- [Relevant suggestion 1]
- [Relevant suggestion 2]
- [Relevant suggestion 3]

### 2. Technical Skills
[Short explanation of technical skills weaknesses and grouping suggestions]

### 3. Projects
[Short explanation of project weaknesses, missing technical depths, or missing metrics]

For Project Improvements, create a highlighted example using Markdown blockquote:
> **[Project Name from resume]**
> - [Rewritten bullet using only present facts]
> - [Rewritten bullet using only present facts]

### 4. Missing Sections
[Short explanation of missing sections such as achievements, certifications, or profiles]

### 5. Soft Skills
[Short explanation of soft skills integration improvements]

---

## Formatting Suggestions
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]

---

## ATS Keyword Analysis

### Present Keywords ✅
- [Keyword found in resume]
- [Keyword found in resume]
- [Keyword found in resume]

### Missing Keywords ❌
- [Important missing keyword]
- [Important missing keyword]
- [Important missing keyword]

---

## Recruiter's Perspective
A recruiter would likely think:
- [Evidence-based recruiter observation]
- [Evidence-based recruiter observation]
- [Evidence-based recruiter observation]

---

| Category | Score |
| :--- | :---: |
| ATS Compatibility | [Calculated percentage]% |
| Technical Strength | [Calculated percentage]% |
| Project Quality | [Calculated percentage]% |
| Resume Formatting | [Calculated percentage]% |
| Overall Recruiter Rating | [Calculated score]/10 |

---

## Final Verdict
[One professional paragraph of 5–8 lines giving natural, professional, and encouraging advice. Must end with realistic advice in this exact format: "By expanding the technical skills section, enriching project descriptions, fixing formatting issues, and adding certifications or coding profiles, it could realistically reach [Score]–[Score]/10 and become much more competitive for internships and entry-level software development roles."]
"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def stream_resume_analysis(resume_text: str, job_description: str | None):
    messages = build_analysis_prompt(resume_text, job_description)
    yield from stream_ai_response(messages)

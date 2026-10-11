from services.ai_service import get_ai_response, stream_ai_response

INTERVIEWER_SYSTEM_PROMPT = """You are an experienced technical interviewer.
You ask realistic, role-relevant interview questions based on a candidate's
resume, one at a time. You evaluate answers constructively but honestly,
and you always give a numeric score for each answer."""

# Simple in-memory session store: { session_id: { resume_text, job_description,
#   questions_asked, answers, scores } }
# NOTE: this resets if the server restarts. For persistence across restarts,
# swap this out for db_service.py (SQLite).
SESSIONS: dict[str, dict] = {}


def start_interview(session_id: str, resume_text: str, job_description: str | None) -> str:
    """
    Initializes a new interview session and returns the first question.
    """
    SESSIONS[session_id] = {
        "resume_text": resume_text,
        "job_description": job_description,
        "history": [],   # list of {question, answer, score, feedback}
    }

    question = _generate_question(session_id)
    SESSIONS[session_id]["history"].append({"question": question, "answer": None, "score": None, "feedback": None})
    return question


def _generate_question(session_id: str) -> str:
    session = SESSIONS[session_id]
    job_line = (
        f"The candidate is targeting this job: {session['job_description']}"
        if session["job_description"]
        else "No specific job description was given — ask general role-appropriate questions."
    )

    asked_already = [h["question"] for h in session["history"]]
    avoid_line = (
        f"\nDo not repeat these already-asked questions: {asked_already}"
        if asked_already
        else ""
    )

    prompt = f"""Based on this resume, ask ONE realistic mock interview question.
{job_line}{avoid_line}

Resume:
---
{session['resume_text']}
---

Return ONLY the question text, nothing else — no preamble, no numbering."""

    messages = [
        {"role": "system", "content": INTERVIEWER_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    return get_ai_response(messages).strip()


def stream_answer_evaluation(session_id: str, answer: str):
    """
    Evaluates the candidate's answer to the current question, streams
    feedback + score, and stores it in session history.
    """
    session = SESSIONS.get(session_id)
    if not session:
        raise ValueError("Interview session not found. Start a new interview first.")

    current = session["history"][-1]
    current["answer"] = answer

    prompt = f"""The candidate was asked: "{current['question']}"

Their answer was: "{answer}"

Evaluate this answer. Respond in this exact structure:

## Score
X/10

## What Worked
Brief note on strengths of the answer.

## What to Improve
Specific, actionable feedback.

## Suggested Stronger Answer
A short example of how to improve it (2-3 sentences)."""

    messages = [
        {"role": "system", "content": INTERVIEWER_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    full_text = ""
    for chunk in stream_ai_response(messages):
        full_text += chunk
        yield chunk

    current["feedback"] = full_text
    current["score"] = _extract_score(full_text)


def _extract_score(feedback_text: str) -> int | None:
    """Pulls the numeric score (e.g. '7/10') out of the feedback text."""
    import re
    match = re.search(r"(\d{1,2})\s*/\s*10", feedback_text)
    return int(match.group(1)) if match else None


def next_question(session_id: str) -> str:
    session = SESSIONS.get(session_id)
    if not session:
        raise ValueError("Interview session not found.")

    question = _generate_question(session_id)
    session["history"].append({"question": question, "answer": None, "score": None, "feedback": None})
    return question


def get_session_summary(session_id: str) -> dict:
    session = SESSIONS.get(session_id)
    if not session:
        raise ValueError("Interview session not found.")

    scores = [h["score"] for h in session["history"] if h["score"] is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    return {
        "questions_asked": len(session["history"]),
        "average_score": avg_score,
        "history": session["history"],
    }

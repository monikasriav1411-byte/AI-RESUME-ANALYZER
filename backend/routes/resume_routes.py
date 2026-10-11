import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse

from services.pdf_extractor import extract_text_from_pdf
from services.resume_analyzer import stream_resume_analysis
from services.interview_engine import start_interview
from services.db_service import save_resume_analysis

router = APIRouter(prefix="/api/resume", tags=["resume"])

MAX_FILE_SIZE_MB = 5


@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(default=""),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB.")

    try:
        resume_text = extract_text_from_pdf(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    def event_stream():
        full_text = ""
        for chunk in stream_resume_analysis(resume_text, job_description or None):
            full_text += chunk
            yield chunk
        save_resume_analysis(file.filename, job_description or None, full_text)

    return StreamingResponse(event_stream(), media_type="text/plain")


@router.post("/start-interview")
async def start_interview_route(
    file: UploadFile = File(...),
    job_description: str = Form(default=""),
):
    """
    Extracts the resume text and kicks off a mock interview session,
    returning the first question and a session_id to use for follow-ups.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    try:
        resume_text = extract_text_from_pdf(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    session_id = str(uuid.uuid4())
    first_question = start_interview(session_id, resume_text, job_description or None)

    return {"session_id": session_id, "question": first_question}

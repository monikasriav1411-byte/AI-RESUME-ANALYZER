import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import AnswerRequest, NextQuestionRequest, SummaryRequest
from services.interview_engine import (
    stream_answer_evaluation,
    next_question,
    get_session_summary,
)
from services.db_service import save_interview_summary

router = APIRouter(prefix="/api/interview", tags=["interview"])


@router.post("/answer")
async def submit_answer(payload: AnswerRequest):
    try:
        def event_stream():
            for chunk in stream_answer_evaluation(payload.session_id, payload.answer):
                yield chunk

        return StreamingResponse(event_stream(), media_type="text/plain")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/next-question")
async def get_next_question(payload: NextQuestionRequest):
    try:
        question = next_question(payload.session_id)
        return {"question": question}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/summary")
async def get_summary(payload: SummaryRequest):
    try:
        summary = get_session_summary(payload.session_id)
        save_interview_summary(
            summary["questions_asked"],
            summary["average_score"],
            json.dumps(summary["history"]),
        )
        return summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

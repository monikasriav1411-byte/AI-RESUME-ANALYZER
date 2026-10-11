from pydantic import BaseModel


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


class NextQuestionRequest(BaseModel):
    session_id: str


class SummaryRequest(BaseModel):
    session_id: str

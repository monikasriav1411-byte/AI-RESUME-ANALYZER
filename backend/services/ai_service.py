from groq import Groq
from core.config import GROQ_API_KEY, GROQ_MODEL

client = Groq(api_key=GROQ_API_KEY)


def stream_ai_response(messages: list[dict]):
    """
    Takes a list of chat messages (OpenAI-style format) and yields
    text chunks as they arrive from the Groq API.

    messages example:
        [
            {"role": "system", "content": "You are a helpful resume coach."},
            {"role": "user", "content": "Here is my resume: ..."}
        ]
    """
    stream = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.6,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def get_ai_response(messages: list[dict]) -> str:
    """
    Non-streaming version — used internally when we need the full
    response at once (e.g. to parse a score out of it).
    """
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.6,
        stream=False,
    )
    return response.choices[0].message.content

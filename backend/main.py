from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from routes import resume_routes, interview_routes, history_routes, auth_routes
from services.db_service import init_db

app = FastAPI(title="AI Resume Suggestion App")
init_db()

# CORS - open for now since frontend is served from the same container.
# Tighten this to a specific origin if you split frontend/backend hosting.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_routes.router)
app.include_router(interview_routes.router)
app.include_router(history_routes.router)
app.include_router(auth_routes.router)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/login")
async def serve_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))


@app.get("/interview")
async def serve_interview():
    return FileResponse(os.path.join(FRONTEND_DIR, "interview.html"))


@app.get("/health")
async def health_check():
    return {"status": "ok"}

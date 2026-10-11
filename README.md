# AI Resume Coach

An AI-powered web app that analyzes resumes, gives a score with actionable
feedback, and runs a mock interview based on the candidate's resume — with
per-answer scoring and a final summary.

**Tech stack:** FastAPI (backend) · Vanilla HTML/CSS/JS (frontend) · Groq API
(`llama-3.3-70b-versatile`) · Docker · AWS App Runner

**Live URL:** _add your deployed AWS App Runner URL here after deployment_

---

## Features

- Upload a resume (PDF) and get a structured, streamed AI analysis:
  overall score, section-by-section feedback, and top 3 suggestions
- Optionally paste a job description for tailored feedback + missing
  ATS keywords
- Mock interview mode: AI asks resume-based questions one at a time,
  scores each answer, and gives a final summary with average score

## Project structure

See folder tree in `docs/` or the repo root — backend/, frontend/, Dockerfile.

## Local setup

### 1. Get a free Groq API key
Sign up at https://console.groq.com and create an API key.

### 2. Configure environment variables
```bash
cd backend
cp .env.example .env
# edit .env and paste your key:
# GROQ_API_KEY=your_actual_key_here
```

### 3. Install dependencies and run
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000 in your browser.

## Running with Docker

```bash
# from the project root (where the Dockerfile is)
docker build -t resume-coach .
docker run -p 8000:8000 --env-file backend/.env resume-coach
```

Open http://localhost:8000.

## Deploying to AWS App Runner

1. Push this repo to GitHub (make sure `.env` is **not** committed — check `.gitignore`)
2. In AWS Console → App Runner → Create service
3. Source: connect your GitHub repo, or use "Container registry" if you push
   the image to Amazon ECR first
4. Build settings: use the included `Dockerfile`, port `8000`
5. Under **Environment variables**, add:
   - `GROQ_API_KEY` = your key
   - `GROQ_MODEL` = `llama-3.3-70b-versatile`
6. Deploy — App Runner gives you a public HTTPS URL when done
7. Set an AWS Budget alert (Billing → Budgets) to avoid unexpected charges

## Notes on security

- The Groq API key is only ever read on the backend (`core/config.py`) and
  is never sent to or exposed in the frontend JS
- `.env` is excluded from both Git (`.gitignore`) and the Docker build
  context (`.dockerignore`)

## Known limitation

Interview sessions are stored in memory (`SESSIONS` dict in
`interview_engine.py`), so they reset if the server restarts. For persistent
history across restarts, add a SQLite-backed `db_service.py` and swap the
in-memory dict for DB reads/writes.

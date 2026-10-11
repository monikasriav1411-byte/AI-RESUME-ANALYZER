import sqlite3
import re
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "database" / "resume_history.db"
DB_PATH.parent.mkdir(exist_ok=True)


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _connect()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS resume_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            job_description TEXT,
            score INTEGER,
            analysis_text TEXT,
            created_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS interview_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            questions_asked INTEGER,
            average_score REAL,
            summary_json TEXT,
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()


def _extract_overall_score(analysis_text: str) -> float | int | None:
    # 1. Search for "Overall Score: X.X/10"
    match = re.search(r"Overall Score:\s*(\d+(?:\.\d+)?)\s*/\s*10", analysis_text, re.IGNORECASE)
    if match:
        val = float(match.group(1))
        return int(val) if val.is_integer() else val
        
    # 2. Search for "Overall: X.X/10" or "Overall: X.X"
    match = re.search(r"Overall:\s*(\d+(?:\.\d+)?)", analysis_text, re.IGNORECASE)
    if match:
        val = float(match.group(1))
        return int(val) if val.is_integer() else val
        
    # 3. Fallback to any "X.X/10" pattern in the text
    match = re.search(r"(\d+(?:\.\d+)?)\s*/\s*10", analysis_text)
    if match:
        val = float(match.group(1))
        return int(val) if val.is_integer() else val
        
    return None


def save_resume_analysis(filename: str, job_description: str | None, analysis_text: str) -> int:
    score = _extract_overall_score(analysis_text)
    conn = _connect()
    cur = conn.execute(
        "INSERT INTO resume_analyses (filename, job_description, score, analysis_text, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (filename, job_description, score, analysis_text, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def save_interview_summary(questions_asked: int, average_score: float | None, summary_json: str) -> int:
    conn = _connect()
    cur = conn.execute(
        "INSERT INTO interview_sessions (questions_asked, average_score, summary_json, created_at) "
        "VALUES (?, ?, ?, ?)",
        (questions_asked, average_score, summary_json, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def get_all_history() -> list[dict]:
    conn = _connect()

    analyses = conn.execute(
        "SELECT id, filename, job_description, score, analysis_text, created_at "
        "FROM resume_analyses ORDER BY created_at DESC"
    ).fetchall()

    interviews = conn.execute(
        "SELECT id, questions_asked, average_score, summary_json, created_at "
        "FROM interview_sessions ORDER BY created_at DESC"
    ).fetchall()

    conn.close()

    items = []
    for row in analyses:
        items.append({
            "type": "analysis",
            "id": row["id"],
            "title": row["filename"] or "Resume analysis",
            "score": row["score"],
            "job_description": row["job_description"],
            "detail": row["analysis_text"],
            "created_at": row["created_at"],
        })

    for row in interviews:
        items.append({
            "type": "interview",
            "id": row["id"],
            "title": f"Mock interview ({row['questions_asked']} questions)",
            "score": row["average_score"],
            "detail": row["summary_json"],
            "created_at": row["created_at"],
        })

    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items


def delete_history_item(item_type: str, item_id: int) -> bool:
    conn = _connect()
    if item_type == "analysis":
        cur = conn.execute("DELETE FROM resume_analyses WHERE id = ?", (item_id,))
    elif item_type == "interview":
        cur = conn.execute("DELETE FROM interview_sessions WHERE id = ?", (item_id,))
    else:
        conn.close()
        return False
    conn.commit()
    rows_affected = cur.rowcount
    conn.close()
    return rows_affected > 0


def clear_all_history() -> bool:
    conn = _connect()
    try:
        conn.execute("DELETE FROM resume_analyses")
        conn.execute("DELETE FROM interview_sessions")
        conn.commit()
        success = True
    except Exception as e:
        print(f"Error clearing history database: {e}")
        success = False
    finally:
        conn.close()
    return success

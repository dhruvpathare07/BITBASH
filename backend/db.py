"""Result storage for the admin panel.

Uses SQLite locally (a file in this folder) and PostgreSQL in production when
DATABASE_URL is set (e.g. on Vercel). Both share the same schema and upsert
logic, keyed by (username, round) so a player's score is updated, not duplicated.
"""
import os
import json
import datetime

def _find_database_url():
    """Find the Postgres connection string.

    Vercel's database integrations don't always call it DATABASE_URL: Neon
    may add POSTGRES_URL, or a custom prefix like STORAGE_URL. Use the first
    postgres:// value among the usual names, preferring pooled connections.
    Returns (variable_name, url) or ("", "").
    """
    env = os.environ
    for name in ("DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL"):
        value = env.get(name, "").strip()
        if value.startswith("postgres"):
            return name, value
    candidates = sorted(
        name for name, value in env.items()
        if name.endswith("_URL") and value.strip().startswith("postgres")
    )
    pooled = [n for n in candidates if "UNPOOLED" not in n and "NON_POOLING" not in n]
    for name in pooled + candidates:
        return name, env[name].strip()
    return "", ""


DATABASE_ENV_NAME, DATABASE_URL = _find_database_url()
_IS_PG = bool(DATABASE_URL)

# SQLite file lives next to this module and is gitignored.
SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.db")

# Serverless hosts (Vercel) only allow writing to /tmp, and /tmp is wiped
# between instances, so results there are NOT kept. Set DATABASE_URL to a
# Postgres database in production; this fallback only stops a crash.
if not _IS_PG and os.environ.get("VERCEL"):
    SQLITE_PATH = "/tmp/results.db"
    print("WARNING: DATABASE_URL is not set on Vercel. Results are stored in "
          "/tmp and will be lost. Add a Postgres DATABASE_URL.")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS results (
    username   TEXT    NOT NULL,
    name       TEXT,
    class_name TEXT,
    language   TEXT,
    round      INTEGER NOT NULL,
    score      INTEGER NOT NULL,
    time_taken INTEGER,
    details    TEXT,
    updated_at TEXT,
    PRIMARY KEY (username, round)
)
"""


def _connect():
    if _IS_PG:
        import psycopg2
        return psycopg2.connect(DATABASE_URL)
    import sqlite3
    return sqlite3.connect(SQLITE_PATH)


# Columns added after the first release; older databases get them on startup.
_ADDED_COLUMNS = (("language", "TEXT"), ("time_taken", "INTEGER"), ("details", "TEXT"))


def _ensure_columns(cur):
    """Add any newer columns to pre-existing tables that lack them."""
    for column, kind in _ADDED_COLUMNS:
        try:
            if _IS_PG:
                cur.execute(f"ALTER TABLE results ADD COLUMN IF NOT EXISTS {column} {kind}")
            else:
                cols = [r[1] for r in cur.execute("PRAGMA table_info(results)").fetchall()]
                if column not in cols:
                    cur.execute(f"ALTER TABLE results ADD COLUMN {column} {kind}")
        except Exception:
            # Column already exists / race with another worker — safe to ignore.
            pass


def init_db():
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(_SCHEMA)
        _ensure_columns(cur)
        conn.commit()
    finally:
        conn.close()


def save_result(username, name, class_name, rnd, score, language="", time_taken=None, details=None):
    """time_taken: seconds spent on this round (None if unknown).
    details: JSON text with the round's breakdown (per question), or None."""
    now = datetime.datetime.utcnow().isoformat()
    conn = _connect()
    try:
        cur = conn.cursor()
        if _IS_PG:
            cur.execute(
                """
                INSERT INTO results (username, name, class_name, language, round, score, time_taken, details, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (username, round)
                DO UPDATE SET name = EXCLUDED.name,
                              class_name = EXCLUDED.class_name,
                              language = EXCLUDED.language,
                              score = EXCLUDED.score,
                              time_taken = EXCLUDED.time_taken,
                              details = EXCLUDED.details,
                              updated_at = EXCLUDED.updated_at
                """,
                (username, name, class_name, language, rnd, score, time_taken, details, now),
            )
        else:
            cur.execute(
                """
                INSERT INTO results (username, name, class_name, language, round, score, time_taken, details, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(username, round)
                DO UPDATE SET name = excluded.name,
                              class_name = excluded.class_name,
                              language = excluded.language,
                              score = excluded.score,
                              time_taken = excluded.time_taken,
                              details = excluded.details,
                              updated_at = excluded.updated_at
                """,
                (username, name, class_name, language, rnd, score, time_taken, details, now),
            )
        conn.commit()
    finally:
        conn.close()


def clear_all_results():
    """Delete every saved result. Returns how many rows were removed."""
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM results")
        removed = cur.rowcount
        conn.commit()
        return removed
    finally:
        conn.close()


def get_all_results():
    """Return one row per player with their round 1 and round 2 scores."""
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT username, name, class_name, language, round, score, time_taken, details, updated_at FROM results"
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    players = {}
    for username, name, class_name, language, rnd, score, time_taken, details, updated_at in rows:
        try:
            parsed = json.loads(details) if details else None
        except ValueError:
            parsed = None
        p = players.setdefault(
            username,
            {
                "username": username,
                "name": name,
                "className": class_name,
                "language": language or "",
                "round1": None,
                "round2": None,
                "round1Time": None,  # seconds
                "round2Time": None,
                "round1Details": None,  # per-question breakdown
                "round2Details": None,
                "updatedAt": updated_at,
            },
        )
        if name:
            p["name"] = name
        if class_name:
            p["className"] = class_name
        if language:
            p["language"] = language
        if rnd == 1:
            p["round1"] = score
            p["round1Time"] = time_taken
            p["round1Details"] = parsed
        elif rnd == 2:
            p["round2"] = score
            p["round2Time"] = time_taken
            p["round2Details"] = parsed
        if updated_at and (not p["updatedAt"] or updated_at > p["updatedAt"]):
            p["updatedAt"] = updated_at

    return sorted(
        players.values(),
        key=lambda x: (x["round1"] or 0) + (x["round2"] or 0),
        reverse=True,
    )

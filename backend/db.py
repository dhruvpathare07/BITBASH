"""Result storage for the admin panel.

Uses SQLite locally (a file in this folder) and PostgreSQL in production when
DATABASE_URL is set (e.g. on Vercel). Both share the same schema and upsert
logic, keyed by (username, round) so a player's score is updated, not duplicated.
"""
import os
import datetime

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
_IS_PG = DATABASE_URL.startswith("postgres")

# SQLite file lives next to this module and is gitignored.
SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.db")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS results (
    username   TEXT    NOT NULL,
    name       TEXT,
    class_name TEXT,
    round      INTEGER NOT NULL,
    score      INTEGER NOT NULL,
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


def init_db():
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(_SCHEMA)
        conn.commit()
    finally:
        conn.close()


def save_result(username, name, class_name, rnd, score):
    now = datetime.datetime.utcnow().isoformat()
    conn = _connect()
    try:
        cur = conn.cursor()
        if _IS_PG:
            cur.execute(
                """
                INSERT INTO results (username, name, class_name, round, score, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (username, round)
                DO UPDATE SET name = EXCLUDED.name,
                              class_name = EXCLUDED.class_name,
                              score = EXCLUDED.score,
                              updated_at = EXCLUDED.updated_at
                """,
                (username, name, class_name, rnd, score, now),
            )
        else:
            cur.execute(
                """
                INSERT INTO results (username, name, class_name, round, score, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(username, round)
                DO UPDATE SET name = excluded.name,
                              class_name = excluded.class_name,
                              score = excluded.score,
                              updated_at = excluded.updated_at
                """,
                (username, name, class_name, rnd, score, now),
            )
        conn.commit()
    finally:
        conn.close()


def get_all_results():
    """Return one row per player with their round 1 and round 2 scores."""
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT username, name, class_name, round, score, updated_at FROM results"
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    players = {}
    for username, name, class_name, rnd, score, updated_at in rows:
        p = players.setdefault(
            username,
            {
                "username": username,
                "name": name,
                "className": class_name,
                "round1": None,
                "round2": None,
                "updatedAt": updated_at,
            },
        )
        if name:
            p["name"] = name
        if class_name:
            p["className"] = class_name
        if rnd == 1:
            p["round1"] = score
        elif rnd == 2:
            p["round2"] = score
        if updated_at and (not p["updatedAt"] or updated_at > p["updatedAt"]):
            p["updatedAt"] = updated_at

    return sorted(
        players.values(),
        key=lambda x: (x["round1"] or 0) + (x["round2"] or 0),
        reverse=True,
    )

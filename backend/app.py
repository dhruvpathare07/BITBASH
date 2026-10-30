import logging
import os
import time
import threading
from collections import defaultdict, deque
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from evaluator import check_code_line_by_line, calculate_line_progress, run_test_cases, normalize, classify_error, CORRECT_CODE
from c_evaluator import check_code_line_by_line_c, calculate_line_progress_c, run_test_cases_c, classify_error_c, C_CORRECT_CODE
from runner import run_code   # ✅ Added
from db import init_db, save_result, get_all_results, clear_all_results

app = Flask(__name__)

# Reject oversized request bodies (code submissions are small).
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
MAX_CODE_LENGTH = 20_000
MAX_INPUT_LENGTH = 2_000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bitbash")

def _load_env_file():
    """Load KEY=VALUE lines from a gitignored backend/.env, if present.

    Keeps secrets (like the admin passkey) out of the committed source and
    out of the client bundle. In production set real env vars instead.
    """
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())
    except Exception:
        logger.warning("Could not read backend/.env")


_load_env_file()

# Admin passkey is validated server-side (never shipped to the browser).
# Set it in backend/.env (gitignored) or as a real env var in production.
# When unset, the admin endpoint is disabled.
ADMIN_PASSKEY = os.environ.get("ADMIN_PASSKEY", "")

init_db()

# Frontend origin(s), comma-separated; defaults to the Vite dev server.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

CORS(
    app,
    origins=ALLOWED_ORIGINS,
    methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"]
)


@app.route("/", methods=["GET"])
def health():
    """Quick check that the backend is up (e.g. after a Vercel deploy).
    Says what is configured, never the values themselves."""
    from db import _IS_PG, DATABASE_ENV_NAME
    db_like = sorted(
        n for n in os.environ
        if any(k in n for k in ("DATABASE", "POSTGRES", "PG", "NEON", "STORAGE"))
    )
    return jsonify(
        status="ok",
        database=(f"postgres (from {DATABASE_ENV_NAME})" if _IS_PG
                  else "sqlite (local only; set DATABASE_URL in production)"),
        admin="configured" if ADMIN_PASSKEY else "not configured (set ADMIN_PASSKEY)",
        # names only, never values: helps spot a database added under another name
        database_settings_seen=db_like,
    )


@app.errorhandler(413)
def request_too_large(_e):
    return jsonify(success=False, error="Request too large"), 413


def read_json_object():
    """Return the request JSON if it is an object, else None."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


# ---- Simple in-memory rate limiter (per process) ----
# Enough to blunt floods on the dev/single-worker server. For multi-worker or
# serverless production, use a shared store (e.g. Flask-Limiter + Redis).
_rl_lock = threading.Lock()
_rl_hits = defaultdict(deque)


def rate_limit(max_requests, per_seconds):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if request.method == "OPTIONS":
                return fn(*args, **kwargs)
            ip = (request.headers.get("X-Forwarded-For", request.remote_addr or "?")
                  .split(",")[0].strip())
            key = (fn.__name__, ip)
            now = time.time()
            with _rl_lock:
                hits = _rl_hits[key]
                while hits and hits[0] <= now - per_seconds:
                    hits.popleft()
                if len(hits) >= max_requests:
                    return jsonify(success=False, error="Too many requests. Slow down."), 429
                hits.append(now)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


MAX_SCORE = 100
START_SCORE = 50
PENALTY_PER_FAIL = 2


@app.route("/evaluate", methods=["POST", "OPTIONS"])
# Capacity: sized for up to 200 players, who in a lab usually share one
# public IP (~4 checks/player/min at peak = 800/min, with headroom).
@rate_limit(1500, 60)
def evaluate():
    if request.method == "OPTIONS":
        return "", 200

    try:
        data = read_json_object()
        if not data:
            return jsonify(success=False, message="No data received", progress=0), 400

        topic = data.get("topic")
        code = data.get("code")
        language = str(data.get("language", "python")).lower()
        attempts = data.get("attempts", 0)

        if not topic or not isinstance(topic, str) or not code or not isinstance(code, str):
            return jsonify(success=False, message="Missing topic or code", progress=0), 400
        if len(code) > MAX_CODE_LENGTH:
            return jsonify(success=False, message="Code is too long", progress=0), 400
        if not isinstance(attempts, int) or attempts < 0:
            attempts = 0

        if language == "c":
            return evaluate_c_code(topic, code, attempts)
        else:
            return evaluate_python_code(topic, code, attempts)

    except Exception:
        logger.exception("Error in /evaluate")
        return jsonify(success=False, message="Internal server error", progress=0), 500


def evaluate_python_code(topic, code, attempts):

    correct_code = CORRECT_CODE.get(topic)
    if not correct_code:
        return jsonify(success=False, message="⚠️ No reference code found for Python", progress=0), 400

    logic_passed = run_test_cases(topic, code)
    success_ll, ll_message, ll_progress, wrong_lines = check_code_line_by_line(code, topic, attempts)

    progress = 100 if logic_passed else ll_progress

    if success_ll:
        final_status = "SUCCESS"
    elif logic_passed and progress >= 60:
        final_status = "SUCCESS"
    elif logic_passed:
        final_status = "LOGIC_OK_BUT_INCOMPLETE_FIX"
    else:
        final_status = "INCORRECT"

    return jsonify(
        success=final_status == "SUCCESS",
        finalStatus=final_status,
        logicPassed=logic_passed,
        progress=progress,
        lineProgress=ll_progress,
        wrongLines=wrong_lines if not success_ll else [],
        message=(
            "🎉 All bugs fixed!"
            if final_status == "SUCCESS"
            else ll_message
            if not logic_passed
            else "🧠 Logic is correct, but bugs still remain 👀"
        )
    )


def evaluate_c_code(topic, code, attempts):

    correct_code = C_CORRECT_CODE.get(topic)
    if not correct_code:
        return jsonify(success=False, message="⚠️ No reference code found for C", progress=0), 400

    logic_passed = run_test_cases_c(topic, code)
    success_ll, ll_message, ll_progress, wrong_lines = check_code_line_by_line_c(code, topic, attempts)

    progress = 100 if logic_passed else ll_progress

    if success_ll:
        final_status = "SUCCESS"
    elif logic_passed:
        final_status = "SUCCESS"
    else:
        final_status = "INCORRECT"

    return jsonify(
        success=final_status == "SUCCESS",
        finalStatus=final_status,
        logicPassed=logic_passed,
        progress=progress,
        lineProgress=ll_progress,
        wrongLines=wrong_lines if not logic_passed else [],
        message=(
            "🎉 All bugs fixed!"
            if final_status == "SUCCESS"
            else ll_message
            if not logic_passed
            else "Logic is correct!"
        )
    )


# Highest score each round can legitimately reach.
MAX_ROUND_SCORE = {1: 300, 2: 100}


@app.route("/results", methods=["POST", "OPTIONS"])
# Up to 200 players x 2 rounds can arrive in one burst when the network returns.
@rate_limit(1000, 60)
def submit_result():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = read_json_object()
        if data is None:
            return jsonify(success=False, error="Invalid request"), 400

        username = str(data.get("username") or "").strip()
        name = str(data.get("name") or "").strip()
        class_name = str(data.get("className") or "").strip()
        language = str(data.get("language") or "").strip().lower()
        if language not in ("python", "c"):
            language = ""
        rnd = data.get("round")

        try:
            score = int(data.get("score"))
        except (TypeError, ValueError):
            return jsonify(success=False, error="Invalid score"), 400

        if not username or rnd not in (1, 2):
            return jsonify(success=False, error="Missing or invalid fields"), 400
        # Clamp to the round's real maximum so a tampered client can't inflate.
        if not (0 <= score <= MAX_ROUND_SCORE[rnd]):
            return jsonify(success=False, error="Score out of range"), 400

        save_result(username[:60], name[:80], class_name[:40], rnd, score, language)
        return jsonify(success=True)
    except Exception:
        logger.exception("Error in /results")
        return jsonify(success=False, error="Internal server error"), 500


@app.route("/admin/results", methods=["POST", "OPTIONS"])
@rate_limit(20, 60)
def admin_results():
    if request.method == "OPTIONS":
        return "", 200
    try:
        if not ADMIN_PASSKEY:
            return jsonify(success=False, error="Admin not configured"), 503
        data = read_json_object() or {}
        if str(data.get("passkey") or "") != ADMIN_PASSKEY:
            return jsonify(success=False, error="Unauthorized"), 401
        return jsonify(success=True, results=get_all_results())
    except Exception:
        logger.exception("Error in /admin/results")
        return jsonify(success=False, error="Internal server error"), 500


@app.route("/admin/clear", methods=["POST", "OPTIONS"])
@rate_limit(10, 60)
def admin_clear():
    """Delete all saved results. Needs the passkey AND confirm == "DELETE",
    so a stray or replayed request can't wipe the scoreboard by accident."""
    if request.method == "OPTIONS":
        return "", 200
    try:
        if not ADMIN_PASSKEY:
            return jsonify(success=False, error="Admin not configured"), 503
        data = read_json_object() or {}
        if str(data.get("passkey") or "") != ADMIN_PASSKEY:
            return jsonify(success=False, error="Unauthorized"), 401
        if data.get("confirm") != "DELETE":
            return jsonify(success=False, error="Confirmation missing"), 400
        removed = clear_all_results()
        logger.info("Admin cleared all results (%s rows)", removed)
        return jsonify(success=True, removed=removed)
    except Exception:
        logger.exception("Error in /admin/clear")
        return jsonify(success=False, error="Internal server error"), 500


if __name__ == "__main__":
    # Debug mode exposes the Werkzeug interactive debugger (remote code
    # execution). Keep it OFF by default; opt in only via FLASK_DEBUG=1.
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="localhost", port=5000, debug=debug_mode)

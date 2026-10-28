import logging
import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from evaluator import check_code_line_by_line, calculate_line_progress, run_test_cases, normalize, classify_error, CORRECT_CODE
from c_evaluator import check_code_line_by_line_c, calculate_line_progress_c, run_test_cases_c, classify_error_c, C_CORRECT_CODE
from runner import run_code   # ✅ Added

app = Flask(__name__)

# Reject oversized request bodies (code submissions are small).
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
MAX_CODE_LENGTH = 20_000
MAX_INPUT_LENGTH = 2_000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bitbash")

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


@app.errorhandler(413)
def request_too_large(_e):
    return jsonify(success=False, error="Request too large"), 413


def read_json_object():
    """Return the request JSON if it is an object, else None."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


MAX_SCORE = 100
START_SCORE = 50
PENALTY_PER_FAIL = 2


# ✅ NEW RUN ENDPOINT
@app.route("/run", methods=["POST"])
def run():
    try:
        data = read_json_object()
        if data is None:
            return jsonify(success=False, error="Invalid request"), 400

        code = data.get("code")
        language = str(data.get("language", "python")).lower()
        input_data = data.get("input", "")

        if not isinstance(code, str) or not code.strip():
            return jsonify(success=False, error="No code provided"), 400
        if len(code) > MAX_CODE_LENGTH:
            return jsonify(success=False, error="Code is too long"), 400
        if not isinstance(input_data, str) or len(input_data) > MAX_INPUT_LENGTH:
            return jsonify(success=False, error="Invalid input"), 400
        if language not in ("python", "c"):
            return jsonify(success=False, error="Unsupported language"), 400

        output, error = run_code(code, input_data, language)

        return jsonify(
            success=error == "",
            output=output,
            error=error
        )

    except Exception:
        logger.exception("/run failed")
        return jsonify(success=False, error="Server error"), 500


@app.route("/evaluate", methods=["POST", "OPTIONS"])
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


if __name__ == "__main__":
    # Debug mode exposes the Werkzeug interactive debugger (remote code
    # execution). Keep it OFF by default; opt in only via FLASK_DEBUG=1.
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="localhost", port=5000, debug=debug_mode)

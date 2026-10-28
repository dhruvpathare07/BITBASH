import subprocess
import os
import sys
import tempfile
from typing import Tuple

TIMEOUT = 5            # seconds per compile / run step
MAX_OUTPUT = 100_000   # characters of stdout/stderr returned to the client
MAX_MEMORY = 256 * 1024 * 1024   # 256 MB address space (POSIX only)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB files the child may write (POSIX only)


def _truncate(text: str) -> str:
    if text and len(text) > MAX_OUTPUT:
        return text[:MAX_OUTPUT] + "\n...[output truncated]"
    return text


def _safe_env() -> dict:
    """A minimal environment so submitted code cannot read server secrets.

    Only the few variables the interpreter / compiler need to start are kept;
    everything else in the server's environment is withheld.
    """
    keep = ("PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL")
    env = {k: os.environ[k] for k in keep if k in os.environ}
    # Make child Python output predictable and unbuffered.
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env


def _limit_resources():
    """POSIX-only: cap CPU, memory and file size for the child process."""
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, (TIMEOUT, TIMEOUT))
        resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY, MAX_MEMORY))
        resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_FILE_SIZE, MAX_FILE_SIZE))
    except Exception:
        pass


def _popen_hardening() -> dict:
    """Extra Popen kwargs that isolate the child, where the OS supports it."""
    kwargs = {}
    if os.name == "posix":
        kwargs["preexec_fn"] = _limit_resources
        kwargs["start_new_session"] = True   # own process group -> killable as a unit
    return kwargs


def run_code(code: str, input_data: str = "", language: str = "python") -> Tuple[str, str]:
    """Compile/run untrusted student code and return (stdout, stderr).

    Hardening applied here (defense-in-depth):
      - runs in a throwaway temp directory (cwd isolated from the server files)
      - minimal environment (no server secrets)
      - wall-clock timeout, plus CPU/memory/file-size limits on POSIX
      - Python runs in isolated mode (-I): ignores env, user site, PYTHONPATH
      - stdout/stderr truncated before returning

    NOTE: this is NOT a real sandbox. Executing arbitrary code safely requires
    OS-level isolation (container with no network, unprivileged user, seccomp).
    See SECURITY.md.
    """
    stdin = (input_data + "\n") if input_data else ""

    if language == "python":
        with tempfile.TemporaryDirectory() as td:
            filename = os.path.join(td, "prog.py")
            try:
                with open(filename, "w", encoding="utf-8") as f:
                    f.write(code)
            except Exception:
                return "", "Could not prepare code for execution."

            try:
                result = subprocess.run(
                    [sys.executable, "-I", filename],
                    input=stdin,
                    text=True,
                    capture_output=True,
                    timeout=TIMEOUT,
                    cwd=td,
                    env=_safe_env(),
                    **_popen_hardening(),
                )
            except subprocess.TimeoutExpired:
                return "", "Execution timeout"
            except Exception:
                return "", "Execution failed."

            output = _truncate(result.stdout.strip().replace("\r\n", "\n"))
            error = _truncate(result.stderr.strip().replace("\r\n", "\n"))
            return output, error

    elif language == "c":
        with tempfile.TemporaryDirectory() as td:
            src_path = os.path.join(td, "prog.c")
            exe_name = "prog.exe" if sys.platform == "win32" else "prog.out"
            exe_path = os.path.join(td, exe_name)

            try:
                with open(src_path, "w", encoding="utf-8") as f:
                    f.write(code)
            except Exception:
                return "", "Could not prepare code for execution."

            try:
                cproc = subprocess.run(
                    ["gcc", src_path, "-o", exe_path, "-Wall"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=TIMEOUT,
                    text=True,
                    cwd=td,
                    env=_safe_env(),
                )
            except subprocess.TimeoutExpired:
                return "", "Compilation timeout"
            except FileNotFoundError:
                return "", "gcc not found. Install gcc."
            except Exception:
                return "", "Compilation failed."

            if cproc.returncode != 0:
                return "", f"Compilation error:\n{_truncate(cproc.stderr)}"

            try:
                rproc = subprocess.run(
                    [exe_path],
                    input=stdin,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=TIMEOUT,
                    text=True,
                    cwd=td,
                    env=_safe_env(),
                    **_popen_hardening(),
                )
            except subprocess.TimeoutExpired:
                return "", "Execution timeout"
            except Exception:
                return "", "Runtime error."

            output = _truncate(rproc.stdout.strip().replace("\r\n", "\n"))
            error = _truncate(rproc.stderr.strip().replace("\r\n", "\n"))
            return output, error

    return "", f"Unsupported language: {language}"

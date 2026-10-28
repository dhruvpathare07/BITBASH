# Security notes — Bit Bash Bonanza backend

The backend compiles and runs **code submitted by players** (`/run` and
`/evaluate`). That is the point of the game, but it also means the server
executes untrusted code, so it must be treated as hostile input.

## Fixed in this branch

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **Flask debug mode on** (`debug=True`) exposed the Werkzeug interactive debugger — remote code execution via the debugger console, plus full tracebacks to the client. | Critical | Debug is now **off by default**; opt in only with `FLASK_DEBUG=1` for local development. |
| 2 | **Unbounded request body** — a huge payload could exhaust server memory. | High | `MAX_CONTENT_LENGTH = 64 KB`; `code` capped at 20 000 chars, `input` at 2 000, returning `400`/`413`. |
| 3 | **Error details leaked** — `str(e)` / `f"Server error: {e}"` returned exceptions (paths, internals) to the client. | Medium | Exceptions are logged server-side; clients get a generic message. |
| 4 | **Unbounded program output** — a program printing gigabytes was returned in full. | Medium | stdout/stderr truncated to 100 000 chars. |
| 5 | **Submitted code inherited the server environment** — it could read every env var (secrets, tokens). | Medium | Child processes run with a **minimal environment** (only what the interpreter/compiler need). |
| 6 | **Code ran in the server's working directory** and could read/overwrite app files. | Medium | Each run happens in a throwaway temp directory used as the working directory. |
| 7 | **Weak input validation / type confusion** — non-string `code`, bad `language`, negative `attempts`. | Low | Types and ranges are validated before use. |
| 8 | **CORS hard-coded**; no way to set the real origin in production. | Low | Origins come from `ALLOWED_ORIGINS` (defaults to the Vite dev server). |

Also applied on POSIX hosts: per-process CPU, memory (256 MB) and file-size
(5 MB) limits, and `start_new_session` so a run is killable as a unit. A
5-second wall-clock timeout already existed and is kept on every step.

## Residual risk — read before deploying publicly

**Running arbitrary code is still fundamentally dangerous.** The hardening
above is defense-in-depth, **not a sandbox**. On a public server, submitted
code could still, for example, make outbound network connections, or (on
Windows, where the resource limits above do not apply) use more CPU/memory than
intended within the 5-second window.

To run this safely for a real audience, isolate execution at the OS level:

- Run each submission in a **container** (Docker/gVisor/nsjail) that is
  destroyed after the run.
- Give the container **no network** (`--network none`).
- Run as an **unprivileged, read-only** user with CPU/memory/pid limits
  (`--cpus`, `--memory`, `--pids-limit`, `--read-only`).
- Keep the API behind **rate limiting** (e.g. a reverse proxy or
  `Flask-Limiter`) so one client cannot flood the executor.
- Put the executor on a **separate host/VM** from anything sensitive.

## Client-side note (not a server fix)

The correct answers are shipped to the browser:

- `frontend/.../src/data/pythonCorrectCode.js`, `cCorrectCode.js`
- `frontend/.../src/data/logicMazeQuestions.js` (each question's `correct` exit)

Anyone can open dev tools and read them, so scores are not tamper-proof. The
debug step is already checked server-side; if scores must be trusted, the maze
answers and the assembly order should be validated on the server too.

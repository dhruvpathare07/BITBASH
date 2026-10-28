// Backend base URL. Defaults to the local Flask server for development.
// In production (e.g. Vercel), set VITE_API_URL to your deployed backend.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ------------------------------------------------------------------
   Result outbox
   Scores are queued in localStorage and sent whenever the backend can
   be reached. If the event network is cut mid-game, nothing is lost:
   the queue is retried when the network comes back (even after a
   reload or browser restart). One entry per player per round; a newer
   score for the same round replaces the queued one.
   ------------------------------------------------------------------ */
const OUTBOX_KEY = "bbbResultsOutbox";
const SEND_TIMEOUT_MS = 8000;
const RETRY_EVERY_MS = 20000;

function readOutbox() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOutbox(outbox) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch {
    /* storage full or blocked: the in-flight send still happens */
  }
}

export function pendingResultCount() {
  return Object.keys(readOutbox()).length;
}

async function sendOne(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.ok) return "sent";
    // A 4xx (other than rate limiting) won't succeed on retry: drop it.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) return "rejected";
    return "retry";
  } catch {
    return "retry"; // offline, timed out, or server unreachable
  } finally {
    clearTimeout(timer);
  }
}

let flushing = null;

/** Try to send everything queued. Safe to call any time. */
export function flushOutbox() {
  if (flushing) return flushing;
  flushing = (async () => {
    const queued = readOutbox();
    for (const [key, payload] of Object.entries(queued)) {
      const outcome = await sendOne(payload);
      if (outcome === "retry") break; // network is down; try again later
      const latest = readOutbox();
      // only clear it if a newer score didn't replace it meanwhile
      if (latest[key] && JSON.stringify(latest[key]) === JSON.stringify(payload)) {
        delete latest[key];
        writeOutbox(latest);
      }
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Queue a round score and try to send it now. */
export function postResult(payload) {
  if (!payload?.username || !payload?.round) return Promise.resolve();
  const outbox = readOutbox();
  outbox[`${payload.username}|${payload.round}`] = payload;
  writeOutbox(outbox);
  return flushOutbox();
}

let syncStarted = false;

/** Call once at startup: flushes on load, when back online, and periodically. */
export function startResultSync() {
  if (syncStarted || typeof window === "undefined") return;
  syncStarted = true;
  flushOutbox();
  window.addEventListener("online", () => flushOutbox());
  setInterval(() => {
    if (pendingResultCount() > 0) flushOutbox();
  }, RETRY_EVERY_MS);
}

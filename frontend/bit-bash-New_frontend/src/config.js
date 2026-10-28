// Backend base URL. Defaults to the local Flask server for development.
// In production (e.g. Vercel), set VITE_API_URL to your deployed backend.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Submit a round score to the backend, retrying a few times on failure so a
 * transient network/CORS hiccup doesn't silently drop a player's result.
 * Fails quietly after the last attempt (scores are also kept in sessionStorage).
 */
export async function postResult(payload, { attempts = 3, delayMs = 800 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${API_BASE}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
      // 4xx won't improve on retry; stop early.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return false;
    } catch {
      // network error — fall through to retry
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  return false;
}

// Backend base URL. Defaults to the local Flask server for development.
// In production (e.g. Vercel), set VITE_API_URL to your deployed backend.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

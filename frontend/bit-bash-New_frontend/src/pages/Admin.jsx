import { useState } from "react";
import { API_BASE } from "../config";
import "./Admin.css";

export default function Admin() {
  const [passkey, setPasskey] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);

  const load = async (key) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: key }),
      });
      if (res.status === 401) {
        setError("Wrong passkey.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setRows(data.results || []);
      setAuthed(true);
    } catch {
      setError("Could not reach the server.");
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passkey.trim()) load(passkey.trim());
  };

  if (!authed) {
    return (
      <div className="admin-page">
        <form className="admin-gate" onSubmit={handleSubmit}>
          <h1 className="admin-title">Admin Panel</h1>
          <p className="admin-sub">Enter passkey to view results</p>
          <input
            type="password"
            className="admin-input"
            placeholder="Passkey"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            autoFocus
          />
          <button type="submit" className="admin-btn" disabled={loading}>
            {loading ? "Checking..." : "Unlock"}
          </button>
          {error && <p className="admin-error">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-head">
          <h1 className="admin-title">Admin Panel</h1>
          <button className="admin-refresh" onClick={() => load(passkey)}>
            ↻ Refresh
          </button>
        </div>
        <p className="admin-sub">
          {rows.length} player{rows.length === 1 ? "" : "s"} · Round 1 /300 ·
          Round 2 /100
        </p>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Class</th>
                <th className="num">Round 1</th>
                <th className="num">Round 2</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    No results yet.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.username}>
                  <td className="rank">{i + 1}</td>
                  <td>{r.name || r.username}</td>
                  <td>{r.className || "—"}</td>
                  <td className="num">{r.round1 ?? "—"}</td>
                  <td className="num">{r.round2 ?? "—"}</td>
                  <td className="num total">
                    {(r.round1 || 0) + (r.round2 || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

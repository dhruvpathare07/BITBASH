import { useMemo, useState } from "react";
import { API_BASE } from "../config";
import "./Admin.css";

const COLUMNS = [
  { key: "rank", label: "#", sortable: false },
  { key: "name", label: "Name", sortable: true },
  { key: "className", label: "Class", sortable: true },
  { key: "round1", label: "Round 1", sortable: true, num: true },
  { key: "round1Time", label: "R1 Time", sortable: true, num: true },
  { key: "round2", label: "Round 2", sortable: true, num: true },
  { key: "round2Time", label: "R2 Time", sortable: true, num: true },
  { key: "total", label: "Total", sortable: true, num: true },
];

const TIME_KEYS = ["round1Time", "round2Time"];

const withTotal = (r) => (r.round1 || 0) + (r.round2 || 0);

// seconds -> "m:ss" (e.g. 754 -> "12:34"); empty when not recorded
const fmtTime = (seconds) => {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "";
  const s = Math.max(0, Math.round(Number(seconds)));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function Admin() {
  const [passkey, setPasskey] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [sort, setSort] = useState({ key: "total", dir: "desc" });

  // "Clear all results" confirmation
  const [showClear, setShowClear] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [notice, setNotice] = useState("");

  const openClear = () => {
    setConfirmText("");
    setClearError("");
    setShowClear(true);
  };

  const closeClear = () => {
    if (!clearing) setShowClear(false);
  };

  const clearAll = async () => {
    if (confirmText !== "DELETE") return;
    setClearing(true);
    setClearError("");
    try {
      const res = await fetch(`${API_BASE}/admin/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkey.trim(), confirm: "DELETE" }),
      });
      if (res.status === 401) throw new Error("Wrong passkey. Unlock the panel again.");
      if (!res.ok) throw new Error("The server didn't delete anything. Try again.");
      const data = await res.json();
      setRows([]);
      setShowClear(false);
      setNotice(`All results deleted (${data.removed} saved score${data.removed === 1 ? "" : "s"}).`);
    } catch (e) {
      setClearError(e.message || "Couldn't reach the server. Nothing was deleted.");
    }
    setClearing(false);
  };

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

  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "className" || TIME_KEYS.includes(key) ? "asc" : "desc" }
    );
  };

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    const arr = [...rows];
    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av;
      let bv;
      if (TIME_KEYS.includes(key)) {
        const at = a[key];
        const bt = b[key];
        if (at == null && bt == null) return 0;
        if (at == null) return 1; // no time recorded: always at the bottom
        if (bt == null) return -1;
        return (at - bt) * factor;
      }
      if (key === "total") {
        av = withTotal(a);
        bv = withTotal(b);
      } else if (key === "round1" || key === "round2") {
        av = a[key] ?? -1;
        bv = b[key] ?? -1;
      } else {
        av = (a[key] || "").toString().toLowerCase();
        bv = (b[key] || "").toString().toLowerCase();
      }
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
    return arr;
  }, [rows, sort]);

  const exportCSV = () => {
    const header = [
      "Rank",
      "Name",
      "Username",
      "Class",
      "Language",
      "Round 1",
      "R1 Time",
      "Round 2",
      "R2 Time",
      "Total",
    ];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = sortedRows.map((r, i) =>
      [
        i + 1,
        r.name || "",
        r.username || "",
        r.className || "",
        r.language || "",
        r.round1 ?? "",
        fmtTime(r.round1Time),
        r.round2 ?? "",
        fmtTime(r.round2Time),
        withTotal(r),
      ]
        .map(esc)
        .join(",")
    );
    const csv = [header.map(esc).join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitbash_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const arrow = (key) =>
    sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  // One table per language; rows saved before language was tracked go last
  const groups = [
    { id: "python", title: "Python", rows: sortedRows.filter((r) => r.language === "python") },
    { id: "c", title: "C", rows: sortedRows.filter((r) => r.language === "c") },
    {
      id: "unknown",
      title: "Language not recorded",
      rows: sortedRows.filter((r) => r.language !== "python" && r.language !== "c"),
    },
  ].filter((g) => g.id !== "unknown" || g.rows.length > 0);

  const renderTable = (group) => (
    <section className="admin-group" key={group.id} aria-labelledby={`grp-${group.id}`}>
      <div className="admin-group-head">
        <h2 className={`admin-group-title lang-${group.id}`} id={`grp-${group.id}`}>
          {group.title}
        </h2>
        <span className="admin-group-count">
          {group.rows.length} player{group.rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.num ? "num" : ""} ${c.sortable ? "sortable" : ""}`}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                >
                  {c.label}
                  {c.sortable ? arrow(c.key) : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="admin-empty">
                  No {group.title} players yet.
                </td>
              </tr>
            )}
            {group.rows.map((r, i) => (
              <tr key={r.username}>
                <td className="rank">{i + 1}</td>
                <td>{r.name || r.username}</td>
                <td>{r.className || "—"}</td>
                <td className="num">{r.round1 ?? "—"}</td>
                <td className="num time">{fmtTime(r.round1Time) || "—"}</td>
                <td className="num">{r.round2 ?? "—"}</td>
                <td className="num time">{fmtTime(r.round2Time) || "—"}</td>
                <td className="num total">{withTotal(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-head">
          <h1 className="admin-title">Admin Panel</h1>
          <div className="admin-actions">
            <button
              className="admin-refresh"
              onClick={exportCSV}
              disabled={sortedRows.length === 0}
            >
              ⬇ Export CSV
            </button>
            <button className="admin-refresh" onClick={() => { setNotice(""); load(passkey.trim()); }}>
              ↻ Refresh
            </button>
            <button
              className="admin-refresh admin-danger"
              onClick={openClear}
              disabled={rows.length === 0}
              title={rows.length === 0 ? "There are no results to clear" : "Delete every saved result"}
            >
              Clear all results
            </button>
          </div>
        </div>

        {notice && (
          <div className="admin-notice" role="status">
            {notice}
          </div>
        )}
        <p className="admin-sub">
          {rows.length} player{rows.length === 1 ? "" : "s"} in total. Round 1 is out of 300,
          Round 2 out of 100. Click a column heading to sort.
        </p>

        {groups.map(renderTable)}
      </div>

      {showClear && (
        <div
          className="admin-modal-overlay"
          onClick={closeClear}
          onKeyDown={(e) => e.key === "Escape" && closeClear()}
        >
          <div
            className="admin-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-title"
            aria-describedby="clear-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="clear-title">Delete all results?</h2>
            <p id="clear-desc">
              This permanently deletes the Round 1 and Round 2 scores of all{" "}
              <b>{rows.length} player{rows.length === 1 ? "" : "s"}</b>, for both Python
              and C. You can't undo this.
            </p>
            <p className="admin-modal-tip">
              Want a copy first?{" "}
              <button type="button" className="admin-link" onClick={exportCSV}>
                Export CSV
              </button>
            </p>

            <label className="admin-confirm">
              <span>
                Type <b>DELETE</b> to confirm
              </span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && clearAll()}
                placeholder="DELETE"
                autoComplete="off"
                spellCheck="false"
                autoFocus
              />
            </label>

            {clearError && <p className="admin-error">{clearError}</p>}

            <div className="admin-modal-actions">
              <button type="button" className="admin-refresh" onClick={closeClear} disabled={clearing}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh admin-danger-solid"
                onClick={clearAll}
                disabled={confirmText !== "DELETE" || clearing}
              >
                {clearing ? "Deleting…" : "Delete all results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

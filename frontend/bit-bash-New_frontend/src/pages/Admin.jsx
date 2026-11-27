import { useMemo, useState } from "react";
import { API_BASE } from "../config";
import "./Admin.css";

// Each round has its own table (switch at the top of the panel)
const VIEWS = {
  round1: {
    label: "Round 1",
    outOf: 300,
    scoreKey: "round1",
    timeKey: "round1Time",
    columns: [
      { key: "rank", label: "#" },
      { key: "name", label: "Player", sortable: true },
      { key: "className", label: "Class", sortable: true },
      { key: "q1", label: "Q1", num: true },
      { key: "q2", label: "Q2", num: true },
      { key: "q3", label: "Q3", num: true },
      { key: "score", label: "Round 1", sortable: true, num: true },
      { key: "time", label: "Time", sortable: true, num: true },
      { key: "details", label: "" },
    ],
  },
  round2: {
    label: "Round 2",
    outOf: 100,
    scoreKey: "round2",
    timeKey: "round2Time",
    columns: [
      { key: "rank", label: "#" },
      { key: "name", label: "Player", sortable: true },
      { key: "className", label: "Class", sortable: true },
      { key: "solved", label: "Solved", num: true },
      { key: "score", label: "Round 2", sortable: true, num: true },
      { key: "time", label: "Time", sortable: true, num: true },
      { key: "details", label: "" },
    ],
  },
};

// One Round 1 question from the saved breakdown (null if not recorded)
const questionOf = (r, n) =>
  (r.round1Details?.questions || []).find((q) => Number(q.question) === n) || null;


const withTotal = (r) => (r.round1 || 0) + (r.round2 || 0);

// Total time used across both rounds (seconds); null if neither was recorded
const totalTimeOf = (r) =>
  r.round1Time == null && r.round2Time == null
    ? null
    : (r.round1Time || 0) + (r.round2Time || 0);

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
  const [view, setView] = useState("round1"); // which round's table is shown
  const [sort, setSort] = useState({ key: "score", dir: "desc" });

  // "Clear all results" confirmation
  const [showClear, setShowClear] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [notice, setNotice] = useState("");

  // Event settings (saved on the server, apply to every player)
  const [settings, setSettings] = useState(null);
  const [savingSetting, setSavingSetting] = useState(false);

  const toggleHideTestNav = async () => {
    if (!settings || savingSetting) return;
    const next = !settings.hideTestNavigation;
    setSavingSetting(true);
    setNotice("");
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkey.trim(), settings: { hideTestNavigation: next } }),
      });
      if (res.status === 401) throw new Error("Wrong passkey. Unlock the panel again.");
      if (!res.ok) throw new Error("The setting wasn't saved. Try again.");
      const data = await res.json();
      setSettings(data.settings);
      setNotice(
        data.settings.hideTestNavigation
          ? "Test mode navigation is now hidden from players."
          : "Test mode navigation is now visible on the player entry page."
      );
    } catch (e) {
      setNotice(e.message || "Couldn't reach the server. The setting wasn't changed.");
    }
    setSavingSetting(false);
  };

  // Player whose full results are shown in the details popup
  const [detailsFor, setDetailsFor] = useState(null);

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
    // A sleeping database or a fresh deploy can fail the first request,
    // so retry a couple of times before showing an error.
    const WAITS_MS = [0, 1500, 4000];
    let problem = "";
    for (const wait of WAITS_MS) {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`${API_BASE}/admin/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passkey: key }),
          signal: controller.signal,
        });
        if (res.status === 401) {
          setError("Wrong passkey.");
          setLoading(false);
          return;
        }
        if (res.status === 503) {
          setError("Admin isn't set up on the server (ADMIN_PASSKEY is missing).");
          setLoading(false);
          return;
        }
        if (res.status === 429) {
          setError("Too many tries. Wait a minute, then unlock again.");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          problem = `The server had a problem (error ${res.status}). Try again in a moment.`;
          continue;
        }
        const data = await res.json();
        setRows(data.results || []);
        if (data.settings) setSettings(data.settings);
        setAuthed(true);
        setLoading(false);
        return;
      } catch {
        problem = navigator.onLine === false
          ? "This device is offline. Check the internet connection."
          : "Could not reach the server. Check the internet connection and try again.";
      } finally {
        clearTimeout(timer);
      }
    }
    setError(problem);
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
        : { key, dir: key === "score" ? "desc" : "asc" }
    );
  };

  // Everyone, for the CSV export (both rounds, best total first)
  const sortedRows = useMemo(
    () => (rows ? [...rows].sort((a, b) => withTotal(b) - withTotal(a)) : []),
    [rows]
  );

  // Players who played the shown round, ranked by that round's marks
  // (ties: less time first). Click a heading to sort differently.
  const viewRows = useMemo(() => {
    if (!rows) return [];
    const { scoreKey, timeKey } = VIEWS[view];
    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    const byTime = (a, b) => {
      const at = a[timeKey];
      const bt = b[timeKey];
      if (at == null && bt == null) return 0;
      if (at == null) return 1; // no time recorded: always last
      if (bt == null) return -1;
      return at - bt;
    };
    return rows
      .filter((r) => r[scoreKey] != null)
      .sort((a, b) => {
        if (key === "time") return byTime(a, b) * factor || (b[scoreKey] - a[scoreKey]);
        if (key === "score") return (a[scoreKey] - b[scoreKey]) * factor || byTime(a, b);
        const av = (a[key] || "").toString().toLowerCase();
        const bv = (b[key] || "").toString().toLowerCase();
        return av < bv ? -factor : av > bv ? factor : 0;
      });
  }, [rows, view, sort]);

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
      "Total Time",
      "Q1 Topic", "Q1 Marks", "Q1 Bugs",
      "Q2 Topic", "Q2 Marks", "Q2 Bugs",
      "Q3 Topic", "Q3 Marks", "Q3 Bugs",
      "R2 Solved",
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
        fmtTime(totalTimeOf(r)),
        ...[1, 2, 3].flatMap((n) => {
          const q = questionOf(r, n);
          return [q?.topic ?? "", q?.score ?? "", q?.bugsFixed ?? ""];
        }),
        r.round2Details?.solved ?? "",
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

  const current = VIEWS[view];

  // One table per language; rows saved before language was tracked go last
  const groups = [
    { id: "python", title: "Python", rows: viewRows.filter((r) => r.language === "python") },
    { id: "c", title: "C", rows: viewRows.filter((r) => r.language === "c") },
    {
      id: "unknown",
      title: "Language not recorded",
      rows: viewRows.filter((r) => r.language !== "python" && r.language !== "c"),
    },
  ].filter((g) => g.id !== "unknown" || g.rows.length > 0);

  const cell = (r, key) => {
    switch (key) {
      case "name":
        return (
          <td className="player" key={key}>
            <b>{r.name || r.username}</b>
            {r.name && <small>@{r.username}</small>}
          </td>
        );
      case "className":
        return <td key={key}>{r.className || "—"}</td>;
      case "q1":
      case "q2":
      case "q3": {
        const q = questionOf(r, Number(key[1]));
        return (
          <td className="num q" key={key} title={q?.topic || undefined}>
            <b>{q ? q.score : "—"}</b>
            {q && (
              <small>
                {q.topic || "?"}
                {q.bugsFixed ? ` · ${q.bugsFixed} bugs` : ""}
              </small>
            )}
          </td>
        );
      }
      case "solved":
        return (
          <td className="num" key={key}>
            <b>
              {r.round2Details?.solved != null
                ? `${r.round2Details.solved}/${r.round2Details.totalChallenges || 10}`
                : "—"}
            </b>
          </td>
        );
      case "score":
        return (
          <td className="num total" key={key}>
            {r[current.scoreKey]}
            <span className="of">/{current.outOf}</span>
          </td>
        );
      case "time":
        return (
          <td className="num time" key={key}>
            {fmtTime(r[current.timeKey]) || "—"}
          </td>
        );
      case "details":
        return (
          <td className="num" key={key}>
            <button type="button" className="admin-details-btn" onClick={() => setDetailsFor(r)}>
              Details
            </button>
          </td>
        );
      default:
        return <td key={key} />;
    }
  };

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
              {current.columns.map((c) => (
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
                <td colSpan={current.columns.length} className="admin-empty">
                  No {group.title} players have played {current.label} yet.
                </td>
              </tr>
            )}
            {group.rows.map((r, i) => (
              <tr key={r.username}>
                <td className="rank">{i + 1}</td>
                {current.columns.slice(1).map((c) => cell(r, c.key))}
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

        {settings && (
          <div className="admin-settings">
            <div className="admin-setting">
              <div className="admin-setting-text">
                <span className="admin-setting-name">Hide test mode navigation</span>
                <span className="admin-setting-help">
                  {settings.hideTestNavigation
                    ? "On: players don't see the test shortcuts on the player entry page."
                    : "Off: the player entry page shows buttons that skip straight to the results, Round 2 and the maze."}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.hideTestNavigation}
                aria-label="Hide test mode navigation"
                className={`admin-switch${settings.hideTestNavigation ? " is-on" : ""}`}
                onClick={toggleHideTestNav}
                disabled={savingSetting}
              >
                <span className="admin-switch-knob" />
                <span className="admin-switch-label">{settings.hideTestNavigation ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>
        )}

        {notice && (
          <div className="admin-notice" role="status">
            {notice}
          </div>
        )}
        <div className="admin-round-switch" role="tablist" aria-label="Choose a round">
          {Object.entries(VIEWS).map(([id, v]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={`admin-round-tab${view === id ? " is-active" : ""}`}
              onClick={() => setView(id)}
            >
              {v.label}
              <span className="admin-round-count">
                {rows.filter((r) => r[v.scoreKey] != null).length}
              </span>
            </button>
          ))}
        </div>

        <p className="admin-sub">
          {viewRows.length} player{viewRows.length === 1 ? "" : "s"} played {current.label} (out
          of {current.outOf}), ranked by marks, then by time. Click a column heading to sort.
        </p>

        {groups.map(renderTable)}
      </div>

      {detailsFor && (
        <PlayerDetails player={detailsFor} onClose={() => setDetailsFor(null)} />
      )}

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

/* Full results for one player: both rounds, question by question */
function PlayerDetails({ player: p, onClose }) {
  const r1 = p.round1Details?.questions || [];
  const r2 = p.round2Details || {};
  const challenges = r2.challenges || [];
  const statusText =
    r2.status === "completed" ? "Finished all challenges." : r2.status === "time-up" ? "Time ran out." : null;

  return (
    <div className="admin-modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div
        className="admin-modal admin-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-details-head">
          <div>
            <h2 id="details-title">{p.name || p.username}</h2>
            <p>
              @{p.username}, {p.className || "no class"},{" "}
              {p.language ? p.language.toUpperCase() : "language not recorded"}
            </p>
          </div>
          <button type="button" className="admin-refresh" onClick={onClose} autoFocus>
            Close
          </button>
        </div>

        <div className="admin-details-totals">
          <div>
            <span>Total marks</span>
            <b>
              {withTotal(p)}
              <small> / 400</small>
            </b>
          </div>
          <div>
            <span>Total time used</span>
            <b>{fmtTime(totalTimeOf(p)) || "—"}</b>
          </div>
        </div>

        <section className="admin-details-round">
          <h3>
            Round 1{" "}
            <span>
              {p.round1 ?? "—"} / 300, {fmtTime(p.round1Time) || "time not recorded"}
            </span>
          </h3>
          {r1.length ? (
            <table className="admin-table admin-mini">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Topic</th>
                  <th className="num">Marks</th>
                  <th className="num">Bugs fixed</th>
                  <th className="num">Time</th>
                </tr>
              </thead>
              <tbody>
                {r1.map((q) => (
                  <tr key={q.question}>
                    <td>Q{q.question}</td>
                    <td>{q.topic || "—"}</td>
                    <td className="num">{q.score} / 100</td>
                    <td className="num">{q.bugsFixed || "—"}</td>
                    <td className="num time">{fmtTime(q.timeTaken) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-details-empty">
              {p.round1 == null
                ? "Not played yet."
                : "Question-by-question details weren't recorded for this player."}
            </p>
          )}
        </section>

        <section className="admin-details-round">
          <h3>
            Round 2{" "}
            <span>
              {p.round2 ?? "—"} / 100, {fmtTime(p.round2Time) || "time not recorded"}
            </span>
          </h3>
          {p.round2Details ? (
            <>
              <p className="admin-details-meta">
                {r2.solved != null && `Solved ${r2.solved} of ${r2.totalChallenges || 10}. `}
                {r2.exitsTried != null && `Exits tried: ${r2.exitsTried}. `}
                {statusText}
              </p>
              {challenges.length ? (
                <table className="admin-table admin-mini">
                  <thead>
                    <tr>
                      <th>Challenge</th>
                      <th className="num">Marks</th>
                      <th className="num">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challenges.map((c, i) => (
                      <tr key={`${c.challenge}-${i}`}>
                        <td>#{c.challenge}</td>
                        <td className="num">{c.score} / 10</td>
                        <td className="num time">{fmtTime(c.timeTaken) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="admin-details-empty">No challenges solved.</p>
              )}
            </>
          ) : (
            <p className="admin-details-empty">
              {p.round2 == null
                ? "Not played yet."
                : "Challenge-by-challenge details weren't recorded for this player."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

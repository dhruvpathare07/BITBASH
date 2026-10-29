'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import "./DebugSection.css";
import { PYTHON_BUGGY_CODE } from "../data/pythonBuggyCode";
import { C_BUGGY_CODE } from "../data/cBuggyCode"; // added
import { API_BASE } from "../config";
import { checkOffline } from "../utils/offlineChecker";
import { findBugs, countFixedBugs, graceMarks } from "../utils/graceMarks";

const INDENT = "    ";
const SERVER_TIMEOUT_MS = 6000;

// Ask the server first; if it can't be reached (network cut, server down,
// overloaded), check in the browser instead so the game keeps going.
async function evaluateFix(payload) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return checkOffline(payload.topic, payload.code, payload.language);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.status >= 500 || res.status === 429) throw new Error(`server ${res.status}`);
    return await res.json();
  } catch {
    return checkOffline(payload.topic, payload.code, payload.language);
  } finally {
    clearTimeout(timer);
  }
}

export default function DebugSection({
  topic,
  onScoreChange,
  onGraceChange,
  onSuccess,
  onGiveUp,
  language = "python",
  debugPoints = 50,
}) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [allFixed, setAllFixed] = useState(false);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);

  // Grace marks: the most bugs fixed at once so far (never goes down)
  const [bestFixed, setBestFixed] = useState(0);
  const [fixedNow, setFixedNow] = useState(null);
  const [gain, setGain] = useState(null); // { marks, key } for the "+25" pop

  const gutterRef = useRef(null);
  const escapedRef = useRef(false);

  const buggyCode = (language === "c" ? C_BUGGY_CODE : PYTHON_BUGGY_CODE)[topic] || "";
  const bugs = useMemo(() => findBugs(topic, buggyCode, language), [topic, buggyCode, language]);
  const hasGrace = bugs.total > 0;
  const earned = graceMarks(bestFixed, bugs.total, debugPoints);

  // Latest values for the unmount handler below
  const latest = useRef({});
  latest.current = { code, bestFixed, bugs, topic, language, debugPoints, onGraceChange };

  useEffect(() => {
    const source = language === "c" ? C_BUGGY_CODE : PYTHON_BUGGY_CODE;
    if (source[topic]) {
      setCode(source[topic]);
      setProgress(0);
      setResult(null);
      setAttempts(0);
      setAllFixed(false);
      setBestFixed(0);
      setFixedNow(null);
      setGain(null);
    } else {
      setCode("");
    }
  }, [topic, language]);

  // The best of: most bugs fixed at any check, and what the code fixes right now
  const settle = (current = latest.current) => {
    if (!current.bugs.total) return { fixed: 0, marks: 0, total: 0 };
    const now = countFixedBugs(current.topic, current.code, current.language, current.bugs);
    const fixed = Math.max(current.bestFixed, now);
    return { fixed, total: current.bugs.total, marks: graceMarks(fixed, current.bugs.total, current.debugPoints) };
  };

  // If the editor closes without a check (time ran out), still count the
  // bugs the current code fixes so that work isn't lost.
  useEffect(() => {
    return () => {
      const current = latest.current;
      if (current.bugs?.total && current.onGraceChange) current.onGraceChange(settle(current));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordFixed = (fixed) => {
    setFixedNow(fixed);
    if (!hasGrace) return;
    const best = Math.max(bestFixed, fixed);
    if (best > bestFixed) {
      const gained = graceMarks(best, bugs.total, debugPoints) - graceMarks(bestFixed, bugs.total, debugPoints);
      setGain({ marks: gained, key: Date.now() });
    }
    setBestFixed(best);
    onGraceChange?.({ fixed: best, total: bugs.total, marks: graceMarks(best, bugs.total, debugPoints) });
  };

  const handleCheck = async () => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setLoading(true);

    try {
      const data = await evaluateFix({
        topic,
        code,
        attempts: nextAttempts,
        language
      });
      setResult(data);

      const newProgress = Number(data.progress) || 0;
      setProgress(newProgress);
      onScoreChange?.(newProgress);

      const solved = data.finalStatus === "SUCCESS";
      if (solved) {
        setAllFixed(true);
      }
      recordFixed(solved ? bugs.total : countFixedBugs(topic, code, language, bugs));
    } catch {
      setResult({ success: false, message: "Something went wrong while checking. Try again." });
    }

    setLoading(false);
  };

  // Tab indents like a real editor. Press Esc first to Tab out of the editor.
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      escapedRef.current = true;
      return;
    }
    if (e.key !== "Tab" || escapedRef.current) {
      escapedRef.current = false;
      return;
    }
    e.preventDefault();
    const el = e.target;
    const { selectionStart: start, selectionEnd: end } = el;
    const next = code.slice(0, start) + INDENT + code.slice(end);
    setCode(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + INDENT.length;
    });
  };

  const syncGutter = (e) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop;
  };

  const lineCount = Math.max(1, code.split("\n").length);
  const fileName = language === "c" ? "main.c" : "main.py";
  const attemptsLeft = Math.max(0, 3 - attempts);

  return (
    <div className="debug-section debug-workbench">
      <div className="debug-intro">
        <h3 className="debug-heading">Fix the bugs</h3>
        <p className="debug-sub">
          Edit the code below, then run the check. You can run it as many times as you like.
        </p>
      </div>

      <div className="code-editor-wrapper">
        <div className="code-editor-header">
          <span className="editor-tab">
            <span className="editor-dot" aria-hidden="true" />
            <span className="editor-title">{fileName}</span>
          </span>
          <span className="editor-hint">Tab adds an indent. Press Esc, then Tab, to leave the editor.</span>
        </div>

        <div className="code-editor-body">
          <div className="code-gutter" ref={gutterRef} aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncGutter}
            wrap="off"
            spellCheck="false"
            aria-label={`Code editor, ${fileName}`}
          />
        </div>
      </div>

      <div className="debug-toolbar">
        <button className={`check-btn ${loading ? "is-loading" : ""}`} onClick={handleCheck} disabled={loading}>
          {loading ? "Checking…" : "Run check"}
        </button>

        {hasGrace ? (
          /* Grace marks: one segment per bug, each worth its share */
          <div className="bug-meter" aria-live="polite">
            <div className="bug-meter-head">
              <span className="bug-meter-label">
                Bugs fixed <b>{bestFixed}</b> of {bugs.total}
              </span>
              <span className="bug-meter-marks">
                <b key={earned}>{earned}</b> / {debugPoints} marks
              </span>
              {gain && (
                <span key={gain.key} className="bug-meter-pop">
                  +{gain.marks}
                </span>
              )}
            </div>
            <div className="bug-meter-track">
              {Array.from({ length: bugs.total }, (_, i) => (
                <div key={i} className={`bug-seg ${i < bestFixed ? "on" : ""}`}>
                  +{graceMarks(i + 1, bugs.total, debugPoints) - graceMarks(i, bugs.total, debugPoints)}
                </div>
              ))}
            </div>
            <p className="bug-meter-note">
              Each bug you fix earns its share, banked when you run the check. New mistakes never cost marks.
            </p>
          </div>
        ) : (
          <div className="progress-wrapper">
            <div className="progress-label">
              <span>Progress</span>
              <span className="progress-percentage">{progress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className={`progress-bar-fill ${progress >= 100 ? "full" : ""}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Result (keyed on attempts so it re-animates on every run) */}
      {result && (
        <div
          key={attempts}
          className={`result-box ${result.success ? "success" : "error"}`}
          role="status"
        >
          <span className="result-icon" aria-hidden="true">{result.success ? "✓" : "✕"}</span>
          {hasGrace && !result.success && fixedNow !== null ? (
            <span>
              This version fixes {fixedNow} of {bugs.total} bug{bugs.total === 1 ? "" : "s"}.
              {bestFixed > fixedNow
                ? ` Your best, ${bestFixed}, still counts.`
                : fixedNow < bugs.total
                ? " Keep going."
                : ""}
            </span>
          ) : (
            /* the checker prefixes its own emoji; the icon already shows the state */
            <span>{String(result.message || "").replace(/^[^\p{L}\p{N}(]+/u, "")}</span>
          )}
          {result.offline && <span className="result-offline">Checked offline</span>}
        </div>
      )}

      <div className="debug-actions">
        <button
          className="debug-btn success"
          disabled={!allFixed}
          onClick={() => setShowFixedModal(true)}
        >
          Submit fix
        </button>

        <button
          className={`debug-btn fail ${attempts < 3 || allFixed ? "disabled" : ""}`}
          disabled={attempts < 3 || allFixed}
          title={
            attempts < 3
              ? `Run the check ${attemptsLeft} more time(s) before you can give up`
              : allFixed
              ? "Already fixed"
              : "Give up"
          }
          onClick={() => {
            if (attempts >= 3 && !allFixed) {
              // count what the code fixes right now, so nothing is lost
              const final = settle();
              if (final.fixed > bestFixed) setBestFixed(final.fixed);
              setShowGiveUpModal(true);
            }
          }}
        >
          Give up
        </button>

        {!allFixed && attempts < 3 && (
          <span className="debug-note">
            Give up unlocks after {attemptsLeft} more check{attemptsLeft === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* SUCCESS MODAL */}
      {showFixedModal && (
        <div className="game-over-overlay">
          <div className="game-over-modal success" role="dialog" aria-modal="true" aria-labelledby="fixed-title">
            <div className="modal-glow" />

            <div className="confetti">
              {Array.from({ length: 30 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            <div className="modal-content">
              <div className="game-over-icon">🎉</div>
              <h2 className="game-over-title" id="fixed-title">Well done!</h2>
              <p>You fixed every bug in this question.</p>
              <button className="restart-btn" onClick={() => onSuccess(progress)} autoFocus>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GIVE UP MODAL */}
      {showGiveUpModal && (
        <div className="game-over-overlay">
          <div className="game-over-modal warning" role="dialog" aria-modal="true" aria-labelledby="giveup-title">
            <div className="modal-glow" />

            <div className="modal-content">
              <div className="game-over-icon">⚠</div>
              <h2 className="game-over-title" id="giveup-title">Give up on this question?</h2>
              <p>
                {hasGrace
                  ? `You keep your assembly marks and the ${earned} debug mark${earned === 1 ? "" : "s"} you've earned for ${bestFixed} of ${bugs.total} bugs. You can't come back to this question.`
                  : "You keep your assembly marks but lose the debug marks, and you can't come back to this question."}
              </p>

              <div className="modal-actions">
                <button className="restart-btn" onClick={() => setShowGiveUpModal(false)} autoFocus>
                  Keep debugging
                </button>
                <button
                  className="restart-btn danger"
                  onClick={() => {
                    const final = settle();
                    onGraceChange?.(final);
                    onGiveUp(final.marks);
                  }}
                >
                  Give up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

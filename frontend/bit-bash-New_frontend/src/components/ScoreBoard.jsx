import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ScoreBoard.css";

/* Space (in px) between the timer and the score card */
const GAP_UNDER_TIMER = 32;

/* Width (in px) of the score card; it is centered under the timer */
const CARD_WIDTH = 300;

/* Animates a number from its old value to the new one */
function useCountUp(target, ms = 700) {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const value = Math.round(from + (target - from) * t);
      fromRef.current = value;
      setShown(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return shown;
}

/* Marks already saved for each question of this round: { 1: 100, 2: 50, 3: null } */
function getSavedScores(fallbackLanguage) {
  const saved = { 1: null, 2: null, 3: null };
  try {
    const profile = JSON.parse(sessionStorage.getItem("playerProfile")) || {};
    const language = profile.language?.toLowerCase() || fallbackLanguage;
    const results = JSON.parse(sessionStorage.getItem("bbbResults")) || {};
    const byLanguage = results[language] || {};
    [1, 2, 3].forEach((n) => {
      const value = byLanguage[`Q${n}`]?.score;
      if (typeof value === "number") saved[n] = value;
    });
  } catch {
    /* ignore broken storage */
  }
  return saved;
}

export default function ScoreBoard({
  questionNo,
  assemblyDone,
  debugDone,
  debugProgress = 0,
  assemblyPoints = 50,
  debugPoints = 50,
  fallbackLanguage = "python",
  topicName = "",
}) {
  const perQuestion = assemblyPoints + debugPoints;
  const maxTotal = 3 * perQuestion;

  const saved = useMemo(() => getSavedScores(fallbackLanguage), [fallbackLanguage]);

  const assemblyEarned = assemblyDone ? assemblyPoints : 0;
  const debugEarned = debugDone ? debugPoints : 0;
  const questionScore = assemblyEarned + debugEarned;

  const previous = [1, 2, 3]
    .filter((n) => n !== questionNo)
    .reduce((sum, n) => sum + (saved[n] || 0), 0);
  const total = previous + questionScore;

  /* "+50" popup whenever the total goes up */
  const [prevTotal, setPrevTotal] = useState(total);
  const [gain, setGain] = useState(0);
  const [popKey, setPopKey] = useState(0);
  if (total !== prevTotal) {
    setGain(total - prevTotal);
    setPrevTotal(total);
    setPopKey((k) => k + 1);
  }

  const shownTotal = useCountUp(total);

  /* Keep the card centered right under the timer */
  const panelRef = useRef(null);
  useEffect(() => {
    const place = () => {
      const panel = panelRef.current;
      const timer = document.querySelector(".flip-timer");
      if (!panel || !timer) return;
      const r = timer.getBoundingClientRect();
      const width = Math.max(280, Math.min(CARD_WIDTH, Math.round(r.width)));
      const centerX = r.left + r.width / 2;
      panel.style.top = `${Math.round(r.bottom + GAP_UNDER_TIMER)}px`;
      panel.style.width = `${width}px`;
      panel.style.right = `${Math.max(8, Math.round(window.innerWidth - (centerX + width / 2)))}px`;
    };

    place();
    const timer = document.querySelector(".flip-timer");
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (observer && timer) observer.observe(timer);
    window.addEventListener("resize", place);
    const later = setTimeout(place, 300); // the timer can mount a moment later

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      clearTimeout(later);
    };
  }, []);

  let hint = "Question complete! 🎉";
  if (!assemblyDone) hint = `Finish assembling the code: +${assemblyPoints}`;
  else if (!debugDone) hint = `Fix every bug: +${debugPoints}`;

  const percent = Math.min(100, Math.round((total / maxTotal) * 100));

  const panel = (
    <div className="sb-panel" ref={panelRef} aria-live="polite">
      <div className="sb-total-row">
        <span className="sb-total-label">Total marks</span>
        <span className="sb-total">
          ⭐ {shownTotal} <small>/ {maxTotal}</small>
        </span>
      </div>

      <div className="sb-bar">
        <div className="sb-bar-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="sb-chips">
        {[1, 2, 3].map((n) => {
          const value = n === questionNo ? questionScore : saved[n];
          return (
            <div key={n} className={`sb-chip ${n === questionNo ? "current" : ""}`}>
              <span>Q{n}</span>
              <b>{value === null || value === undefined ? "–" : value}</b>
            </div>
          );
        })}
      </div>

      <div className="sb-qline">
        <span className="sb-qname">
          Q{questionNo} of 3
          {topicName ? <em className="sb-topic"> · {topicName}</em> : null}
        </span>
        <span>
          {questionScore} / {perQuestion}
        </span>
      </div>

      <div className="sb-steps">
        <div className={`sb-step ${assemblyDone ? "done" : ""}`}>
          <span>🧩 Assemble</span>
          <b>
            {assemblyEarned}/{assemblyPoints}
          </b>
        </div>
        <div className={`sb-step ${debugDone ? "done" : ""}`}>
          <span>🐞 Debug{!debugDone && assemblyDone ? ` ${debugProgress}%` : ""}</span>
          <b>
            {debugEarned}/{debugPoints}
          </b>
        </div>
      </div>

      <div className="sb-hint">{hint}</div>

      {gain > 0 && (
        <div key={popKey} className="sb-pop">
          +{gain}
        </div>
      )}
    </div>
  );

  /* Render on <body> so no parent container can move or clip the card */
  return typeof document === "undefined" ? panel : createPortal(panel, document.body);
}
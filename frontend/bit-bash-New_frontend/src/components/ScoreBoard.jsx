import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ScoreBoard.css";

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
  debugEarned: debugEarnedProp, // grace marks so far (optional)
  debugBugs = null,             // { fixed, total } (optional)
}) {
  const perQuestion = assemblyPoints + debugPoints;
  const maxTotal = 3 * perQuestion;

  const saved = useMemo(() => getSavedScores(fallbackLanguage), [fallbackLanguage]);

  const assemblyEarned = assemblyDone ? assemblyPoints : 0;
  const debugEarned =
    typeof debugEarnedProp === "number" ? debugEarnedProp : debugDone ? debugPoints : 0;
  const hasBugs = Boolean(debugBugs?.total);
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

  let hint = "Question complete";
  if (!assemblyDone) hint = `Put the lines in order to earn ${assemblyPoints}`;
  else if (!debugDone && hasBugs) hint = `Each bug you fix earns its share of ${debugPoints}. No negative marking.`;
  else if (!debugDone) hint = `Fix every bug to earn ${debugPoints} more`;

  const percent = Math.min(100, Math.round((total / maxTotal) * 100));

  const panel = (
    <div className="sb-panel" aria-live="polite">
      <div className="sb-total-row">
        <span className="sb-total-label">Round 1 marks</span>
        <span className="sb-total">
          <span key={popKey} className="sb-total-num">{shownTotal}</span>
          <small>/ {maxTotal}</small>
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
          Question {questionNo}
          {topicName ? <em className="sb-topic">{topicName}</em> : null}
        </span>
        <span className="sb-qscore">
          {questionScore} / {perQuestion}
        </span>
      </div>

      <div className="sb-steps">
        <div className={`sb-step ${assemblyDone ? "done" : "active"}`}>
          <span className="sb-step-name">Assemble</span>
          <b>
            {assemblyEarned}/{assemblyPoints}
          </b>
        </div>
        <div
          className={`sb-step ${
            debugDone || debugEarned >= debugPoints ? "done" : assemblyDone ? "active" : ""
          } ${debugEarned > 0 && debugEarned < debugPoints ? "partial" : ""}`}
        >
          <span className="sb-step-name">
            Debug
            {!debugDone && assemblyDone ? (
              <i className="sb-step-pct">
                {hasBugs ? `${debugBugs.fixed}/${debugBugs.total} bugs` : `${debugProgress}%`}
              </i>
            ) : null}
          </span>
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
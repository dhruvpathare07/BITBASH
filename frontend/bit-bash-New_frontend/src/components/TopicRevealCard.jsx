"use client";
import { useEffect, useState } from "react";
import "./topicReveal.css";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/";

/* Scrambles the text, then resolves it one letter at a time */
function useDecrypt(text, ms = 900) {
  const [shown, setShown] = useState(text);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !text) {
      setShown(text);
      setDone(true);
      return;
    }

    setDone(false);
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / ms);
      const revealed = Math.floor(progress * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (i < revealed || ch === " " || ch === "/") out += ch;
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setShown(out);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms]);

  return [shown, done];
}

function TopicRevealCard({ topic, onReveal }) {
  const [shown, done] = useDecrypt(topic);

  return (
    <div className="topic-reveal">
      <div className="topic-glow-card">
        <div className="card-shine" aria-hidden="true"></div>
        <div className="card-content">
          <div className="topic-label">Your challenge</div>
          <div className="topic-name" aria-label={topic}>
            {shown}
          </div>
          <p className="topic-steps">
            Put the code lines in order, then fix the bugs.
            <br />
            You have 10 minutes.
          </p>
        </div>
      </div>

      <button
        className={`reveal-btn ${done ? "is-ready" : ""}`}
        onClick={onReveal}
      >
        Start solving
      </button>
    </div>
  );
}

export default TopicRevealCard;

import { useEffect, useRef, useState } from "react";

// Round 1: after a question ends (solved or time's up) the player gets this
// long to read the popup, then the game moves on by itself.
export const AUTO_ADVANCE_SECONDS = 10;

/**
 * Countdown line, draining bar and a button that skips the wait.
 * Calls onDone exactly once: when the countdown ends or the button is
 * clicked, whichever comes first.
 */
export default function AutoAdvance({ label, onDone, buttonText, buttonClass, autoFocus = false }) {
  const [left, setLeft] = useState(AUTO_ADVANCE_SECONDS);
  const onDoneRef = useRef(onDone);
  const doneRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const go = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current?.();
    };
    const endsAt = Date.now() + AUTO_ADVANCE_SECONDS * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        go();
      }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current?.();
  };

  return (
    <>
      <div className="time-up-countdown" aria-live="polite">
        <span>
          {label} in <b>{left}s</b>
        </span>
        <div className="time-up-bar">
          <div
            className="time-up-bar-fill"
            style={{ animationDuration: `${AUTO_ADVANCE_SECONDS}s` }}
          />
        </div>
      </div>
      <button className={buttonClass} onClick={skip} autoFocus={autoFocus}>
        {buttonText}
      </button>
    </>
  );
}

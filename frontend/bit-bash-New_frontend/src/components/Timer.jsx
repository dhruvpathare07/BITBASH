"use client";
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle
} from "react";
import "./Timer.css";
import { QUESTION_SECONDS, questionDeadline } from "../utils/questionStage";

// With a storageKey the clock counts down to a deadline saved for the
// session, so refreshing the page doesn't give the 10 minutes back.
const Timer = forwardRef(({ onTimeUp, getTimeLeft, storageKey }, ref) => {
  const [deadline] = useState(() =>
    storageKey ? questionDeadline(storageKey) : Date.now() + QUESTION_SECONDS * 1000
  );
  const secondsLeft = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const [time, setTime] = useState(secondsLeft);
  const intervalRef = useRef(null);
  const hasFiredRef = useRef(false);

  // 🔥 START TIMER
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTime(left);
      if (left === 0) clearInterval(intervalRef.current);
    }, 250);

    return () => clearInterval(intervalRef.current);
  }, [deadline]);

  // 🔥 TIME UP HANDLING (warning colours are classes below)
  useEffect(() => {
    if (time === 0 && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onTimeUp?.();
    }

    getTimeLeft?.(time);
  }, [time, onTimeUp, getTimeLeft]);

  // 🔥 EXPOSE STOP FUNCTION
  useImperativeHandle(ref, () => ({
    stop: () => {
      clearInterval(intervalRef.current);
    },
    getCurrentTime: () => time
  }));

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  // amber under 2 minutes, red under 1, shaking in the last 10 seconds
  const urgency =
    time === 0 ? "time-up"
    : time <= 10 ? "critical warning"
    : time <= 60 ? "critical"
    : time <= 120 ? "low"
    : "";

  return (
    <div
      className={`flip-timer ${urgency}`}
      role="timer"
      aria-label={`${minutes} minutes ${seconds} seconds left`}
    >
      <div className="flip-timer-label">Time left</div>

      <div className="flip-timer-container">
        <div className="time-group">
          <FlipCard digit={Math.floor(minutes / 10)} />
          <FlipCard digit={minutes % 10} />
        </div>

        <div className="colon">:</div>

        <div className="time-group">
          <FlipCard digit={Math.floor(seconds / 10)} />
          <FlipCard digit={seconds % 10} />
        </div>
      </div>
    </div>
  );
});

function FlipCard({ digit }) {
  const displayRef = useRef();
  const overlayRef = useRef();
  const prevDigit = useRef(digit);

  useEffect(() => {
    if (digit === prevDigit.current) return;

    const overlay = overlayRef.current;
    overlay.classList.add("flip");
    overlay.textContent = digit;

    function finishAnimation() {
      overlay.classList.remove("flip");
      displayRef.current.textContent = digit;
      prevDigit.current = digit;
      overlay.removeEventListener("animationend", finishAnimation);
    }

    overlay.addEventListener("animationend", finishAnimation);
  }, [digit]);

  return (
    <div className="time-segment">
      <div className="segment-display" ref={displayRef}>{digit}</div>
      <div className="segment-overlay" ref={overlayRef}>{digit}</div>
    </div>
  );
}

export default Timer;

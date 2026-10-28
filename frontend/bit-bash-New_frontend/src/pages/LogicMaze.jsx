
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MazeBoard from "../components/MazeBoard";
import {
  LOGIC_MAZE_QUESTIONS,
  validateLogicMazeQuestions,
} from "../data/logicMazeQuestions";
import { LOGIC_MAZE_MAPS } from "../data/logicMazeMaps";
import "./LogicMaze.css";

const LETTERS = ["A", "B", "C", "D"];
const AVATARS = ["🐶", "🐱", "🦊", "🐼", "🐸", "🐯", "😄", "😎", "🤓", "🥳", "😈", "🤩"];
const ROUND_SECONDS = 30 * 60;

export default function LogicMaze() {
  const navigate = useNavigate();

  const profile = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("playerProfile") || "{}");
    } catch {
      return {};
    }
  }, []);

  const language =
    String(profile.language || "python").toLowerCase() === "c"
      ? "c"
      : "python";

  const questions = LOGIC_MAZE_QUESTIONS[language];


  const [questionIndex, setQuestionIndex] = useState(0);
  const [view, setView] = useState("question");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [status, setStatus] = useState("playing");
  const [feedback, setFeedback] = useState(
  language === "c"
    ? "Predict the output, then click Next to enter the maze."
    : "Trace the code, then navigate to its correct output."
);
  const [locked, setLocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [boardResetKey, setBoardResetKey] = useState(0);

  const transitionRef = useRef(null);
  const questionStartedAtRef = useRef(Date.now());
const questionResultsRef = useRef([]);
const resultsSavedRef = useRef(false);

  const question = questions?.[questionIndex];
  const maze = LOGIC_MAZE_MAPS?.[questionIndex];

  useEffect(() => {
    validateLogicMazeQuestions();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (status !== "playing") return undefined;

    const timerId = window.setInterval(() => {
      setTimeLeft((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timerId);
          setStatus("time-up");
          return 0;
        }

        return remaining - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [status]);

  // Clean up any pending transition when leaving the page
  useEffect(() => {
    return () => {
      if (transitionRef.current) {
        window.clearTimeout(transitionRef.current);
      }
    };
  }, []);

  // Save the final result
  useEffect(() => {
  if (status === "playing" || resultsSavedRef.current) return;

  resultsSavedRef.current = true;

  const finalQuestions = [...questionResultsRef.current];

  // If time ran out during a question, record its elapsed time too.
  if (status === "time-up" && finalQuestions.length < questions.length) {
    const elapsed = Math.floor(
      (Date.now() - questionStartedAtRef.current) / 1000
    );

    finalQuestions.push({
      questionNum: questionIndex + 1,
      score: 0,
      timeTaken: Math.min(elapsed, ROUND_SECONDS),
    });
  }

  const finalResult = {
    player: profile.fullName || profile.username || "Player",
    username: profile.username || "",
    language,
    score,
    questionsCompleted: score / 10,
    totalQuestions: questions.length,
    timeRemaining: timeLeft,
    timeUsed: ROUND_SECONDS - timeLeft,
    attempts,
    questionResults: finalQuestions,
    completedAt: new Date().toISOString(),
    status,
  };

  sessionStorage.setItem(
    "logicMazeResults",
    JSON.stringify(finalResult)
  );

  navigate("/round2-results", { replace: true });
}, [
  status,
  profile,
  language,
  score,
  questions.length,
  timeLeft,
  attempts,
  questionIndex,
  navigate,
]);
  // Handle reaching an exit
  const onEndpoint = useCallback(
    (letter) => {
      if (locked || status !== "playing") return;

      setLocked(true);
      setAttempts((count) => count + 1);

      if (letter === question.correct) {
  const questionTime = Math.floor(
    (Date.now() - questionStartedAtRef.current) / 1000
  );

  questionResultsRef.current.push({
    questionNum: questionIndex + 1,
    score: 10,
    timeTaken: questionTime,
  });

  setScore((currentScore) => currentScore + 10);  setFeedback(`Correct endpoint ${letter}! +10 points.`);
        setShowSuccess(true);
      } else {
        setFeedback(
          `Endpoint ${letter} is incorrect. The same maze will restart.`
        );

        transitionRef.current = window.setTimeout(() => {
          setBoardResetKey((key) => key + 1);
          setFeedback("Back at the entrance. Try another route.");
          setLocked(false);
        }, 850);
      }
    },
    [locked, status, question]
  );

  const restart = () => {
  if (transitionRef.current) {
    window.clearTimeout(transitionRef.current);
  }

questionStartedAtRef.current = Date.now();
questionResultsRef.current = [];
resultsSavedRef.current = false;
sessionStorage.removeItem("logicMazeResults");

  setQuestionIndex(0);
  
setView("question");
  setScore(0);
  setTimeLeft(ROUND_SECONDS);
  setStatus("playing");
  setFeedback("Trace the code, then navigate to its correct output.");
  setLocked(false);
  setAttempts(0);
  setBoardResetKey((key) => key + 1);
};
  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;

  if (!question || !maze) {
    return (
      <main className="logic-maze-page">
        <section className="logic-maze-finish">
          <h1>Logic Maze data is missing</h1>
          <p>
            Check that logicMazeQuestions.js and logicMazeMaps.js contain the
            required questions and maze maps.
          </p>
          <button
            className="logic-maze-primary"
            onClick={() => navigate("/")}
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  const urgency = timeLeft <= 60 ? "critical" : timeLeft <= 120 ? "low" : "";
  const isLast = questionIndex === questions.length - 1;
  const fileName = language === "c" ? "main.c" : "main.py";

  return (
    <main className="logic-maze-page" data-view={view}>
      <div className="lm-grid" aria-hidden="true" />

      {/* ---------- Top bar ---------- */}
      <header className="lm-topbar">
        <div className="lm-qbox">
          <span className="lm-round">Round 2</span>
          <span className="lm-qnum">
            Q{questionIndex + 1}
            <small>/{questions.length}</small>
          </span>
          <span className="lm-title">Logic Maze</span>
        </div>

        <div className="lm-player">
          <span className="lm-avatar">{AVATARS[profile.avatar] || "🙂"}</span>
          <span>{profile.username || profile.fullName || "Player"}</span>
          <span className="lm-lang">{language === "c" ? "C" : "Python"}</span>
        </div>

        <div className={`lm-timer ${urgency}`} role="timer">
          <span>Time left</span>
          <b>{formatTime(timeLeft)}</b>
        </div>
      </header>

      <div className="lm-layout">
        <div className="lm-main">
          {/* ---------- Step 1: read the code ---------- */}
          {view === "question" && (
            <section className="lm-card lm-question" key={`q-${questionIndex}`}>
              <div className="lm-card-head">
                <div>
                  <h2>Predict the output</h2>
                  <p>
                    Read the code and work out what it prints. Then enter the maze
                    and walk to the exit with that output.
                  </p>
                </div>
                <span className="lm-points">10 marks</span>
              </div>

              <div className="lm-terminal">
                <div className="lm-terminal-bar">
                  <span className="lm-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span>{fileName}</span>
                </div>
                <pre className="logic-maze-code">
                  <code>{question.code}</code>
                </pre>
              </div>

              <div
                className={`logic-maze-feedback ${feedback.startsWith("Correct") ? "is-correct" : ""}`}
                aria-live="polite"
              >
                <span className="logic-maze-feedback-icon">
                  {feedback.startsWith("Correct") ? "✓" : "i"}
                </span>
                <span>{feedback}</span>
              </div>

              <button
                type="button"
                className="lm-btn lm-btn-primary"
                onClick={() => setView("maze")}
              >
                Enter the maze
              </button>
            </section>
          )}

          {/* ---------- Step 2: walk the maze ----------
              Always mounted so the board keeps its state, but it only
              listens to the keyboard while it's on screen. */}
          <section
            className="lm-card lm-maze"
            style={{ display: view === "maze" ? "block" : "none" }}
          >
            <div className="lm-card-head">
              <div>
                <h2>Walk to the matching exit</h2>
                <p>Move with WASD or the arrow keys. A wrong exit sends you back to the start.</p>
              </div>
              <button
                type="button"
                className="lm-btn lm-btn-ghost"
                onClick={() => setView("question")}
              >
                Back to the code
              </button>
            </div>

            <MazeBoard
              key={`${maze.id || questionIndex}-${boardResetKey}`}
              maze={maze}
              question={question}
              onEndpoint={onEndpoint}
              disabled={locked || status !== "playing" || view !== "maze"}
            />

            {/* Options stay under the maze, where players expect them */}
            <div className="logic-maze-endpoint-legend">
              {question.options.map((option, index) => (
                <div className="logic-maze-legend-item" key={`${LETTERS[index]}-${option}`}>
                  <b>{LETTERS[index]}</b>
                  <span>{option}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ---------- Right rail ---------- */}
        <aside className="lm-rail" aria-live="polite">
          <div className="lm-rail-label">Round 2 marks</div>
          <div className="lm-score">
            <span key={score} className="lm-score-num">{score}</span>
            <small>/ 100</small>
          </div>
          <div className="lm-bar">
            <div className="lm-bar-fill" style={{ width: `${score}%` }} />
          </div>

          <div className="lm-rail-label">Challenges</div>
          <ol className="lm-steps" aria-label="Challenge progress">
            {questions.map((_, i) => (
              <li
                key={i}
                className={i < questionIndex ? "done" : i === questionIndex ? "current" : ""}
                title={`Challenge ${i + 1}`}
              >
                {i + 1}
              </li>
            ))}
          </ol>

          <div className="lm-attempts">
            <span>Exits tried</span>
            <b>{attempts}</b>
          </div>
        </aside>
      </div>

      {/* ---------- Correct exit ---------- */}
      {showSuccess && (
        <div className="logic-maze-success-overlay">
          <section
            className="logic-maze-success-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logic-maze-success-title"
          >
            <div className="logic-maze-confetti" aria-hidden="true">✓</div>
            <h2 id="logic-maze-success-title">Correct exit</h2>
            <p>That's the right output. You earned 10 marks.</p>

            <button
              type="button"
              className="lm-btn lm-btn-primary"
              autoFocus
              onClick={() => {
                setShowSuccess(false);

                if (isLast) {
                  setStatus("completed");
                } else {
                  setQuestionIndex((index) => index + 1);
                  questionStartedAtRef.current = Date.now();
                  setBoardResetKey((key) => key + 1);
                  setView("question");
                  setFeedback("Correct! The next challenge is ready. Trace the new code.");
                  setLocked(false);
                }
              }}
            >
              {isLast ? "See my results" : "Next challenge"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}


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
  
return (
  <main className="logic-maze-page">
    <header className="logic-maze-header">


        <div className="logic-maze-brand">
          <div className="logic-maze-eyebrow">
            BIT BASH BONANZA · ROUND 2
          </div>

          <h1>
            Logic <span>Maze</span>
          </h1>

          <p>Trace the logic. Find your way out.</p>
        </div>

        <div className="logic-maze-stats">
          <div className="logic-maze-stat">
            <small>PLAYER</small>
            <strong>{profile.fullName || profile.username || "Player"}</strong>
          </div>

          <div className="logic-maze-stat">
            <small>LANGUAGE</small>
            <strong>{language.toUpperCase()}</strong>
          </div>

          <div className="logic-maze-stat">
            <small>TIME LEFT</small>
            <strong
              className={
                timeLeft < 120 ? "logic-maze-warning" : ""
              }
            >
              {formatTime(timeLeft)}
            </strong>
          </div>

          <div className="logic-maze-stat">
            <small>SCORE</small>
            <strong>
              {score}
              <em>/100</em>
            </strong>
          </div>
        </div>
      </header>

      <div className="logic-maze-progress">
        <div className="logic-maze-progress-label">
          <span>
            CHALLENGE {String(questionIndex + 1).padStart(2, "0")} /{" "}
            {questions.length}
          </span>
          <span>{Math.round((score / 100) * 100)}% SCORE</span>
        </div>

        <div className="logic-maze-progress-track">
          <div
            className="logic-maze-progress-fill"
            style={{ width: `${(questionIndex / questions.length) * 100}%` }}
          />
        </div>
      </div>
      
{showSuccess && (
  <div className="logic-maze-success-overlay">
    <section
      className="logic-maze-success-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logic-maze-success-title"
    >
      <div className="logic-maze-confetti" aria-hidden="true">
        🎉
      </div>

      <h2 id="logic-maze-success-title">Well Done!</h2>

      <p>Brilliant! You found the correct path!</p>

      <button
        type="button"
        className="logic-maze-success-button"
        onClick={() => {
          setShowSuccess(false);

          if (questionIndex === questions.length - 1) {
            setStatus("completed");
          }   
else {
  setQuestionIndex((index) => index + 1);

  questionStartedAtRef.current = Date.now();

  setBoardResetKey((key) => key + 1);
  setView("question");
  setFeedback("Correct! The next challenge is ready. Trace the new code.");
  setLocked(false);
}
        }}
      >
        MOVE TO NEXT QUESTION
      </button>
    </section>
  </div>
)}


      <div className="logic-maze-content">
        {/* QUESTION FIRST */}
       {view === "question" && (
  <section className="logic-maze-question-card">
    
          <div className="logic-maze-card-top">
            <span>YOUR CODING CHALLENGE</span>
            <span className="logic-maze-points">+10 POINTS</span>
          </div>

          <div className="logic-maze-question-heading">
            <div>
              <h2>Predict the output</h2>
              <p>
  {language === "c"
    ? "Read the C code carefully and predict its output."
    : "Read the code carefully, then guide your character through the maze to the matching output."}
</p>
            </div>

            <div className="logic-maze-question-number">
              {String(questionIndex + 1).padStart(2, "0")}
            </div>
          </div>

          <pre className="logic-maze-code">
            <code>{question.code}</code>
          </pre>

          
          
<div
  className={`logic-maze-feedback ${
    feedback.startsWith("Correct") ? "is-correct" : ""
  }`}
  aria-live="polite"
>
  <span className="logic-maze-feedback-icon">
    {feedback.startsWith("Correct") ? "✓" : "↳"}
  </span>
  <span>{feedback}</span>
</div>

{view === "question" && (
  <button
    type="button"
    className="logic-maze-primary logic-maze-next"
    onClick={() => setView("maze")}
  >
    Next: Enter the Maze →
  </button>
)}        </section>
        )}

        {/* MAZE — shown on the maze screen */}
       <section
  className="logic-maze-game-card"
  style={{ display: view === "maze" ? "block" : "none" }}
>
            <div className="logic-maze-game-heading">
              <div>
                <span className="logic-maze-live-dot" />
                <strong>MAZE ZONE</strong>
              </div>
              <span className="logic-maze-game-hint">
                START <span>→</span> FIND THE CORRECT EXIT
              </span>
            </div>
          {view === "maze" && (
  <button
    type="button"
    className="logic-maze-secondary logic-maze-back"
    onClick={() => setView("question")}
  >
    ← Back to Question
  </button>
)}

            <MazeBoard
              key={`${maze.id || questionIndex}-${boardResetKey}`}
              maze={maze}
              question={question}
              onEndpoint={onEndpoint}
              disabled={locked || status !== "playing"}
            />

            <div className="logic-maze-endpoint-legend">
              {question.options.map((option, index) => (
                <div
                  className="logic-maze-legend-item"
                  key={`${LETTERS[index]}-${option}`}
                >
                  <b>{LETTERS[index]}</b>
                  <span>{option}</span>
                </div>
              ))}
            </div>

            <div className="logic-maze-game-footer">
              <span>WALLS BLOCK MOVEMENT</span>
              <span>ATTEMPTS: {attempts}</span>
              <span>+10 FOR THE CORRECT EXIT</span>
            </div>
          </section>
        

      </div>

      <footer className="logic-maze-footer">
        <span>ONE CORRECT EXIT · 10 POINTS EACH</span>
        <span>KEEP MOVING — YOUR TIMER IS RUNNING</span>
      </footer>
    </main>
  );
}

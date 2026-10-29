"use client";
import { useState, useRef } from "react";
import TopicSwiper from "../../components/TopicSwiper";
import CodeAssembler from "../../components/CodeAssembler";
import TopicRevealCard from "../../components/TopicRevealCard";
import Timer from "../../components/Timer";
import ScoreBoard from "../../components/ScoreBoard";
import DebugSection from "../../components/DebugSection";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "../question.css";
import { C_EXPECTED_OUTPUT } from "../../data/cExpectedOutput";
import { initProgress, getProgress, completeQuestion } from "../../utils/progress";

// Round 1: flat marks for each correctly debugged question (3 questions = 30 marks)
const ASSEMBLY_POINTS = 50; // 1st sub-question: assemble the code
const DEBUG_POINTS = 50;    // 2nd sub-question: fix the bugs

export default function Question_1() {
  const [phase, setPhase] = useState("wheel");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [assemblyCompleted, setAssemblyCompleted] = useState(false);
  const navigate = useNavigate();
  const playerProfile = JSON.parse(sessionStorage.getItem("playerProfile")) || {};
  const [isLocked, setIsLocked] = useState(false);

  const [questionSolved, setQuestionSolved] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0);
  // grace marks: debug marks earned for the bugs fixed so far
  const [debugGrace, setDebugGrace] = useState({ fixed: 0, total: 0, marks: 0 });
  const [currentTimeLeft, setCurrentTimeLeft] = useState(600);

  const totalScore = (assemblyCompleted ? ASSEMBLY_POINTS : 0) + (questionSolved ? DEBUG_POINTS : debugGrace.marks);

  const timerRef = useRef(null);

  useEffect(() => {
    initProgress();
    const progress = getProgress();
    if (progress.completed.q1) {
      setIsLocked(true);
    }
  }, []);

  const EASY_TOPICS = [
    "Star Pattern",
    "Even / Odd",
    "Sum Of Digits",
    "Factorial",
    "Largest Of 3 Numbers"
  ];

  const finishQuestion = (finalScore = totalScore) => {
    const timeTaken = 600 - currentTimeLeft;

    const resultData = {
      score: finalScore,
      timeTaken,
    };

    const language =
  playerProfile?.language?.toLowerCase() || "c";


    const allResults =
      JSON.parse(sessionStorage.getItem("bbbResults")) || {};

    if (!allResults[language]) {
      allResults[language] = {};
    }

    allResults[language]["Q1"] = resultData;

    sessionStorage.setItem("bbbResults", JSON.stringify(allResults));

    completeQuestion(1);
    navigate("/c/question-2");
  };

  useEffect(() => {
    const profile = sessionStorage.getItem("playerProfile");
    if (!profile) {
      navigate("/", { replace: true });
    }
  }, []);

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setPhase("topic");
  };

  const startAssembly = () => {
    setAssemblyCompleted(false);
    setPhase("assembly");
  };

  const unlockDebug = () => {
    setAssemblyCompleted(true);
  };

  const onTimeUp = () => {
    timerRef.current?.stop();
    setIsGameOver(true);
  };

  const AVATARS = [
    "🐶","🐱","🦊","🐼","🐸","🐯","😄","😎","🤓","🥳","😈","🤩"
  ];

  const avatarsMap = (id) => {
    if (id === null || id === undefined) return "🙂";
    return AVATARS[id] || "🙂";
  };

  if (isLocked) {
    return (
      <div className="locked-screen">
        <h2>Question 1 Completed</h2>
        <p>You've already completed this question. <br></br> Please proceed to the next one.</p>
        <button
          className="next-question-btn"
          onClick={() => navigate("/c/question-2", { replace: true })}
        >
          Go to Question 2 →
        </button>
      </div>
    );
  }

  return (
    <div className="game-screen" data-phase={phase}>
      {/* Background effects */}
      <div className="bg-grid"></div>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      {/* TOP BAR */}
      <div className="top-bar">
        <div className="question-box">
          <span className="q-label">Q</span>
          <span className="q-number">1</span>
          {selectedTopic && <span className="q-topic">{selectedTopic}</span>}
        </div>

        {(phase === "assembly" || phase === "debug") && !isGameOver && (
          <Timer
            ref={timerRef}
            onTimeUp={onTimeUp}
            getTimeLeft={setCurrentTimeLeft}
          />
        )}
      </div>

      {/* Main Title */}
      <div className="title-container">
        <h1 className="game-title">
          <span className="title-word">BIT</span>
          <span className="title-word">BASH</span>
          <span className="title-word">BONANZA</span>
        </h1>
        <div className="title-underline"></div>
      </div>

      {/* GLOBAL HUD */}
      {(phase === "assembly" || phase === "debug") && !isGameOver && (
        <div className="player-hud">
          <span className="avatar">{avatarsMap(playerProfile.avatar)}</span>
          <span className="username">{playerProfile.username}</span>
          <ScoreBoard questionNo={1} assemblyDone={assemblyCompleted} debugDone={questionSolved} debugProgress={debugProgress} debugEarned={questionSolved ? DEBUG_POINTS : debugGrace.marks} debugBugs={debugGrace} assemblyPoints={ASSEMBLY_POINTS} debugPoints={DEBUG_POINTS} topicName={selectedTopic} fallbackLanguage="c" />
        </div>
      )}

      {/* Game Phases */}
      {!isGameOver && (
        <div className="game-content">
          {phase === "wheel" && (
            <TopicSwiper
              topics={EASY_TOPICS}
              onSelect={handleTopicSelect}
            />
          )}

          {phase === "topic" && selectedTopic && (
            <TopicRevealCard
              topic={selectedTopic}
              onReveal={startAssembly}
            />
          )}

          {phase === "assembly" && selectedTopic && (
            <>
              <CodeAssembler
                expectedOutput={C_EXPECTED_OUTPUT[selectedTopic]}
                topic={selectedTopic}
                onSuccess={unlockDebug}
                locked={assemblyCompleted}
                language="c"
              />

              {assemblyCompleted && (
                <div className="debug-section">
                  <div className="debug-card">
                    <div className="debug-icon">🏆</div>
                    <h2 className="debug-title">Code assembled</h2>
                    <p className="debug-text">
                      Every line is in place. Next, fix the bugs.
                    </p>

                    <div className="debug-actions">
                      <button
                        className="debug-btn success"
                        onClick={() => setPhase("debug")}
                      >
                        Start debugging
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {phase === "debug" && selectedTopic && (
            <DebugSection
              topic={selectedTopic}
              onScoreChange={setDebugProgress}
              onGraceChange={setDebugGrace}
              debugPoints={DEBUG_POINTS}
              language="c"
              onSuccess={() => {
                timerRef.current?.stop();
                setQuestionSolved(true);
                finishQuestion(ASSEMBLY_POINTS + DEBUG_POINTS);
              }}
              onGiveUp={(graceMarksEarned = 0) => {
                timerRef.current?.stop();
                finishQuestion(ASSEMBLY_POINTS + graceMarksEarned);
              }}
            />
          )}
        </div>
      )}

      {/* GAME OVER MODAL */}
      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <div className="modal-glow"></div>
            <div className="modal-content">
              <div className="game-over-icon">⏰</div>
              <h2 className="game-over-title">Time's up</h2>
              <p className="game-over-text">
                You keep the marks you've earned on this question so far.
              </p>

              <div className="final-score">
                <span className="final-label">Marks for this question</span>
                <span className="final-value">{totalScore}</span>
              </div>

              <button
                className="next-question-btn"
                onClick={() => finishQuestion()}
              >
                Next Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
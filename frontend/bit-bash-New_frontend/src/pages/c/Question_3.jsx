"use client";
import { useState, useEffect, useRef } from "react";
import TopicSwiper from "../../components/TopicSwiper";
import CodeAssembler from "../../components/CodeAssembler";
import TopicRevealCard from "../../components/TopicRevealCard";
import Timer from "../../components/Timer";
import ScoreBoard from "../../components/ScoreBoard";
import DebugSection from "../../components/DebugSection";
import { useNavigate } from "react-router-dom";
import { C_EXPECTED_OUTPUT } from "../../data/cExpectedOutput";
import { initProgress, getProgress, completeQuestion } from "../../utils/progress";
import "../question.css";

// Round 1: flat marks for each correctly debugged question (3 questions = 30 marks)
const ASSEMBLY_POINTS = 50; // 1st sub-question: assemble the code
const DEBUG_POINTS = 50;    // 2nd sub-question: fix the bugs

export default function Question_3() {
  const [phase, setPhase] = useState("wheel");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [assemblyCompleted, setAssemblyCompleted] = useState(false);
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
    if (progress?.completed?.q3) {
      setIsLocked(true);
    }
  }, []);

  const playerProfile = JSON.parse(sessionStorage.getItem("playerProfile")) || {};

  const HARD_TOPICS = [
    "String Reverse",
    "Complex Pattern",
    "Recursion Logic",
    "Prime Number",
    "Number To Words Conversion",
  ];

  const AVATARS = ["🐶","🐱","🦊","🐼","🐸","🐯","😄","😎","🤓","🥳","😈","🤩"];
  const avatarsMap = (id) => AVATARS[id] || "🙂";

  const navigate = useNavigate();

  useEffect(() => {
    const game = JSON.parse(sessionStorage.getItem("gameSession")) || {};
    sessionStorage.setItem(
      "gameSession",
      JSON.stringify({ ...game, currentQuestion: 3 })
    );
  }, []);

  useEffect(() => {
    const profile = sessionStorage.getItem("playerProfile");
    if (!profile) {
      navigate("/", { replace: true });
    }
  }, []);

  const finishQuestion = (finalScore = totalScore) => {
    const timeTaken = Math.max(600 - currentTimeLeft, 0);

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

    allResults[language]["Q3"] = resultData;

    sessionStorage.setItem("bbbResults", JSON.stringify(allResults));

    completeQuestion(3);
    navigate("/results");
  };

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

  if (isLocked) {
    return (
      <div className="locked-screen">
        <h2>Question 3 Completed</h2>
        <p>You've already completed the final question. <br></br> You can now view your results.</p>
        <button
          className="next-question-btn"
          onClick={() => navigate("/results", { replace: true })}
        >
          View Results →
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
          <span className="q-number">3</span>
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

      {/* TITLE */}
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
        <div className="player-hud final-round">
          <span className="avatar">{avatarsMap(playerProfile.avatar)}</span>
          <span className="username">{playerProfile.username}</span>
          <ScoreBoard questionNo={3} assemblyDone={assemblyCompleted} debugDone={questionSolved} debugProgress={debugProgress} debugEarned={questionSolved ? DEBUG_POINTS : debugGrace.marks} debugBugs={debugGrace} assemblyPoints={ASSEMBLY_POINTS} debugPoints={DEBUG_POINTS} topicName={selectedTopic} fallbackLanguage="c" />
        </div>
      )}

      {!isGameOver && (
        <div className="game-content">
          {phase === "wheel" && (
            <TopicSwiper
              topics={HARD_TOPICS}
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
                      Every line is in place. This last one is the hardest, so take your time with the bugs.
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

          {phase === "debug" && (
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
                See Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
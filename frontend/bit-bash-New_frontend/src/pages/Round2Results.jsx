
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import "./Round2Results.css";
import { postResult } from "../config";

export default function Round2Results() {
  const navigate = useNavigate();
  const scoreboardRef = useRef(null);

  const [results, setResults] = useState(null);
  const [profile, setProfile] = useState({});
  const [animatedScore, setAnimatedScore] = useState(0);
  const [confetti, setConfetti] = useState([]);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  useEffect(() => {
    try {
      setProfile(
        JSON.parse(sessionStorage.getItem("playerProfile") || "{}")
      );

      const stored = sessionStorage.getItem("logicMazeResults");
      setResults(stored ? JSON.parse(stored) : null);
    } catch {
      setResults(null);
    }

    setConfetti(
      Array.from({ length: 50 }, (_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random(),
      }))
    );
  }, []);

  const scoreData = useMemo(() => {
    if (!Array.isArray(results?.questionResults)) return [];

    return results.questionResults.map((item, index) => ({
      questionNum: item.questionNum ?? index + 1,
      score: item.score ?? 0,
      timeTaken: item.timeTaken ?? 0,
    }));
  }, [results]);

  const totalScore = results?.score ?? 0;

  // Save this player's Round 2 score for the admin panel (retries on failure).
  useEffect(() => {
    if (!results || !profile?.username) return;
    postResult({
      username: profile.username,
      name: profile.fullName,
      className: profile.className,
      language: (results.language || profile.language || "").toLowerCase(),
      round: 2,
      score: Math.round(results.score ?? 0),
      // seconds spent in the maze round (same figure the page shows)
      timeTaken: Math.round(
        results.timeUsed ??
          (results.timeRemaining != null
            ? 1800 - results.timeRemaining
            : (results.questionResults || []).reduce((sum, q) => sum + (q.timeTaken || 0), 0))
      ),
    });
  }, [results, profile]);

  const totalTime = scoreData.reduce(
    (sum, item) => sum + item.timeTaken,
    0
  );

  const formatTime = (seconds = 0) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    return `${Math.floor(safeSeconds / 60)}:${String(
      safeSeconds % 60
    ).padStart(2, "0")}`;
  };

  const avatars = [
    "🐶", "🐱", "🦊", "🐼", "🐸", "🐯",
    "😄", "😎", "🤓", "🥳", "😈", "🤩",
  ];

  const selectedAvatar = avatars[Number(profile.avatar)] || "🙂";

  const playerTitle =
    totalScore >= 90
      ? "👑 Maze Master"
      : totalScore >= 70
      ? "🧙 Logic Wizard"
      : totalScore >= 50
      ? "⚡ Path Finder"
      : totalScore >= 30
      ? "💻 Code Explorer"
      : "🐣 Maze Rookie";

  const fastestQuestion = scoreData.reduce((fastest, current) => {
    if (!fastest || current.timeTaken < fastest.timeTaken) {
      return current;
    }
    return fastest;
  }, null);

  useEffect(() => {
    let current = 0;

    if (totalScore <= 0) {
      setAnimatedScore(0);
      return;
    }

    const interval = setInterval(() => {
      current += Math.max(1, totalScore / 60);

      if (current >= totalScore) {
        current = totalScore;
        clearInterval(interval);
      }

      setAnimatedScore(Math.floor(current));
    }, 16);

    return () => clearInterval(interval);
  }, [totalScore]);

  const handleDownloadPDF = async () => {
    const element = scoreboardRef.current;
    if (!element) return;

    setIsDownloadingPDF(true);

    try {
      element.classList.add("pdf-mode");
      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0b0f1a",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const image = canvas.toDataURL("image/png");
      const imageHeight = (canvas.height * pageWidth) / canvas.width;

      let remainingHeight = imageHeight;
      let position = 0;

      pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position = remainingHeight - imageHeight;
        pdf.addPage();
        pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
        remainingHeight -= pageHeight;
      }

      const username = profile.username || "Player";
      pdf.save(`BitBashBonanza_Round2_${username}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      window.alert("Unable to generate the PDF. Please try again.");
    } finally {
      element.classList.remove("pdf-mode");
      setIsDownloadingPDF(false);
    }
  };

  if (!results) {
    return (
      <div className="results-container">
        <div className="results-bg-grid" />
        <div className="results-content">
          <div className="results-header">
            <h1 className="results-game-title">
              BIT BASH BONANZA 2026
            </h1>
            <div className="scoreboard-title">
              ROUND 2 · RESULTS NOT FOUND
            </div>
          </div>

          <p>
            No Round 2 result was found in this browser session.
            Please finish the Logic Maze round first.
          </p>

          <div className="action-buttons">
            <button
              className="btn btn-download"
              onClick={() => navigate("/logic-maze")}
            >
              Return to Logic Maze
            </button>

            <button
              className="btn btn-next-round"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="confetti-container" aria-hidden="true">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="confetti-particle"
            style={{
              left: `${particle.left}%`,
              animation: `confettiFall ${particle.duration}s linear ${particle.delay}s forwards`,
              "--color": [
                "#7c5cff",
                "#2ecc71",
                "#ff4ecd",
                "#4dd0ff",
                "#f39c12",
              ][particle.id % 5],
            }}
          />
        ))}
      </div>

      <div className="results-bg-grid" />

      <div className="results-content" ref={scoreboardRef}>
        <div className="results-header">
          <div className="results-header-top">
            <h1 className="results-game-title">
              BIT BASH BONANZA 2026
            </h1>

            <div className="language-badge">
              {(results.language || profile.language || "python").toUpperCase()}
            </div>
          </div>

          <div className="scoreboard-title">
            Round 2 : Logic Maze
          </div>

          <div className="scoreboard-title">
            <span className="score-fastest-badge">🏆</span>
            {" "}SCORE BOARD{" "}
            <span className="score-fastest-badge">🏆</span>
          </div>
        </div>

        <div className="user-info-section">
          <div className="user-avatar-wrapper">
            <div className="user-avatar">{selectedAvatar}</div>
          </div>

          <div className="user-details">
            <div className="full-name-box">
              <span className="label">FULL NAME :</span>
              <span className="value">
                {profile.fullName || results.player || "Player"}
              </span>
            </div>

            <div className="user-row">
              <div className="class-box">
                <span className="label">CLASS NAME :</span>
                <span className="value">
                  {profile.className || "—"}
                </span>
              </div>

              <div className="username-box">
                <span className="label">USERNAME :</span>
                <span className="value">
                  {profile.username || results.username || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="scores-section">
          <div className="table-wrapper">
            <div className="table-header">
              <div className="header-cell serial">QUESTION</div>
              <div className="header-cell score">SCORE</div>
              <div className="header-cell time">TIME TAKEN</div>
            </div>

            {scoreData.length > 0 ? (
              scoreData.map((item) => (
                <div
                  key={item.questionNum}
                  className={`table-row ${
                    fastestQuestion?.questionNum === item.questionNum
                      ? "fastest"
                      : ""
                  }`}
                >
                  <div className="table-cell serial">
                    <span className="question-num">
                      QUESTION {item.questionNum}

                      {fastestQuestion?.questionNum === item.questionNum && (
                        <span className="fastest-badge">
                          {" "}⚡ FASTEST
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="table-cell score">
                    <span className="score-obtained">
                      {item.score}
                    </span>
                  </div>

                  <div className="table-cell time">
                    <span className="time-value">
                      {formatTime(item.timeTaken)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="table-row">
                <div className="table-cell">
                  No individual question timings were saved.
                </div>
                <div className="table-cell">
                  {totalScore} points
                </div>
                <div className="table-cell">
                  {formatTime(results.timeRemaining != null
                    ? 1800 - results.timeRemaining
                    : 0)}
                </div>
              </div>
            )}
          </div>

          <div className="summary-boxes">
            <div className="summary-box total-score">
              <span className="summary-label">TOTAL SCORE :</span>
              <span className="summary-value">
                {animatedScore} / 100
              </span>
            </div>

            <div className="summary-box total-time">
              <span className="summary-label">TOTAL TIME TAKEN :</span>
              <span className="summary-value">
                {formatTime(
                  results.timeRemaining != null
                    ? 1800 - results.timeRemaining
                    : totalTime
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="badge-section">
          <div className="badge-card">{playerTitle}</div>
          <p>
            {results.status === "completed"
              ? "Congratulations! You completed all the maze challenges."
              : "The round has ended. Here's your final performance."}
          </p>
        </div>

        <div className="action-buttons">
          <button
            className="btn btn-download"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
          >
            {isDownloadingPDF ? "Generating PDF..." : "📥 Download as PDF"}
          </button>

          <button
            className="btn btn-next-round"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

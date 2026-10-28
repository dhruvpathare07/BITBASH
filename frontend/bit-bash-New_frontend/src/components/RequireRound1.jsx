import { Navigate } from "react-router-dom";

// Round 2 is locked until Round 1 is finished AND the Results page was reached,
// so Round 2 always comes after /results.
// Question_3 writes bbbResults[language].Q3 on submit and on timeout;
// Results sets "round1ResultsSeen" on mount.
export default function RequireRound1({ children }) {
  const player = JSON.parse(sessionStorage.getItem("playerProfile") || "{}");
  const language = player.language?.toLowerCase() || "python";
  const results = JSON.parse(sessionStorage.getItem("bbbResults") || "{}");

  // Round 1 not finished yet -> back to the first question.
  if (!results[language]?.Q3) {
    const round1Start = language === "c" ? "/c/question-1" : "/python/question-1";
    return <Navigate to={round1Start} replace />;
  }

  // Finished Round 1 but haven't seen Results -> show Results first.
  if (sessionStorage.getItem("round1ResultsSeen") !== "true") {
    return <Navigate to="/results" replace />;
  }

  return children;
}

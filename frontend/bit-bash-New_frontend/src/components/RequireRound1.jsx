import { Navigate } from "react-router-dom";

// Round 2 is locked until Round 1 (Q1 -> Q3) is finished.
// Question_3 writes bbbResults[language].Q3 on submit and on timeout.
export default function RequireRound1({ children }) {
  const player = JSON.parse(sessionStorage.getItem("playerProfile") || "{}");
  const language = player.language?.toLowerCase() || "python";
  const results = JSON.parse(sessionStorage.getItem("bbbResults") || "{}");

  if (!results[language]?.Q3) {
    const round1Start = language === "c" ? "/c/question-1" : "/python/question-1";
    return <Navigate to={round1Start} replace />;
  }

  return children;
}

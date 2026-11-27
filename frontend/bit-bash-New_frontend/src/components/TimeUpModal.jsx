import AutoAdvance from "./AutoAdvance";

// Round 1 "Time's up" popup. Moves on by itself after a short countdown,
// so no player gets stuck on a finished question. The button skips the wait.
export default function TimeUpModal({ marks, nextLabel = "Next Question", onNext }) {
  const moving = nextLabel === "See Results" ? "Opening your results" : "Moving to the next question";

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal" role="alertdialog" aria-labelledby="time-up-title">
        <div className="modal-glow"></div>
        <div className="modal-content">
          <div className="game-over-icon">⏰</div>
          <h2 className="game-over-title" id="time-up-title">Time's up</h2>
          <p className="game-over-text">
            You keep the marks you've earned on this question so far.
          </p>

          <div className="final-score">
            <span className="final-label">Marks for this question</span>
            <span className="final-value">{marks}</span>
          </div>

          <AutoAdvance
            label={moving}
            onDone={onNext}
            buttonText={`${nextLabel} now`}
            buttonClass="next-question-btn"
          />
        </div>
      </div>
    </div>
  );
}

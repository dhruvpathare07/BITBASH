import React from 'react';
import { useNavigate } from 'react-router-dom';
import './round2.css';

const STEPS = [
  { title: "Read the code", text: "Each challenge shows a short program." },
  { title: "Predict the output", text: "Work out exactly what it prints." },
  { title: "Walk to that exit", text: "Exits A to D each show an output. Pick the right one." },
];

const Round2 = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/logic-maze");
  };

  return (
    <div className="r2-intro">
      <div className="r2-grid" aria-hidden="true" />
      <div className="r2-beam" aria-hidden="true" />

      <main className="r2-content">
        <p className="r2-eyebrow">Round 1 complete. Up next:</p>

        <h1 className="r2-title" aria-label="Round 2: Logic Maze">
          <span className="r2-title-small">Round 2</span>
          <span className="r2-title-line" data-text="LOGIC">LOGIC</span>
          <span className="r2-title-line" data-text="MAZE">MAZE</span>
        </h1>

        <p className="r2-lede">
          10 challenges, 30 minutes, 10 marks each. A wrong exit sends you back
          to the start of the same maze, so think before you walk.
        </p>

        <ol className="r2-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} style={{ "--i": i }}>
              <span className="r2-step-num">{i + 1}</span>
              <b>{step.title}</b>
              <span>{step.text}</span>
            </li>
          ))}
        </ol>

        <div className="r2-keys" aria-label="Move with W A S D or the arrow keys">
          <span className="r2-keycaps" aria-hidden="true">
            <kbd className="up">W</kbd>
            <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
          </span>
          <span>Move with WASD or the arrow keys</span>
        </div>

        <button className="r2-start" onClick={handleStart}>
          Start Round 2
        </button>
      </main>
    </div>
  );
};

export default Round2;

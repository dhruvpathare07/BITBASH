import React from 'react';
import { useNavigate } from 'react-router-dom';
import './round2.css';

const Round2 = () => {
  const navigate = useNavigate();

  const handleStart = () => {
  navigate("/logic-maze");
};

  return (
    <div className="welcome-container">
      <div className="particles">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      
<div className="decorative-icons">
  <div className="icon-wrapper" title="Logic Puzzle">🧩</div>
  <div className="icon-wrapper" title="Brain Power">🧠</div>
  <div className="icon-wrapper" title="Code Debugging">{"</>"}</div>
</div>


      <div className="monitor">
        <div className="monitor-screen">
          <div className="welcome-content">
            <span className="year-badge">Round - 2</span>
            <h1 className="title">Bit Bash Bonanza</h1>
            <p className="subtitle">Logic Maze</p>

            <div style={{ marginTop: 30 }}>
              <button className="lang-btn python" onClick={handleStart}>
                Start
              </button>
            </div>
          </div>
        </div>
        <div className="power-button"></div>
      </div>
    </div>
  );
};

export default Round2;

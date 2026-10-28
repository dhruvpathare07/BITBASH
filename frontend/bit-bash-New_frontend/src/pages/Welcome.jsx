'use client';

import { useNavigate } from "react-router-dom";
import logo from "../assets/bnb_logo.png";
import './Welcome.css'

const LANGUAGES = [
  { id: "python", glyph: ">>>", name: "Python", meta: "Debug Python 3 programs" },
  { id: "c", glyph: "#include", name: "C", meta: "Debug C programs built with gcc" },
];

function Welcome() {
  const navigate = useNavigate();

  // Handle language selection
  const handleLanguageSelect = (language) => {
    // Pass language to player entry page via state
    navigate("/player-entry", {
      replace: true,
      state: { language: language }
    });
  };

  return (
    <div className="home">
      <div className="home-grid" aria-hidden="true" />
      <div className="home-beam" aria-hidden="true" />
      <div className="home-particles" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => <span key={i} />)}
      </div>

      <main className="home-content">
        <p className="home-presents">Bits 'N' Bytes presents</p>

        <h1 className="home-title" aria-label="Bit Bash Bonanza">
          <span className="home-title-line" data-text="BIT BASH">BIT BASH</span>
          <span className="home-title-line" data-text="BONANZA">BONANZA</span>
        </h1>

        <p className="home-lede">
          Two rounds of coding under the clock. Rebuild scrambled programs,
          hunt down their bugs, then find your way out of the logic maze.
        </p>

        <ol className="home-rounds">
          <li><b>Round 1</b> Spin-N-Solve</li>
          <li><b>Round 2</b> Logic Maze</li>
        </ol>

        <section className="home-pick" aria-labelledby="pick-title">
          <h2 className="home-pick-title" id="pick-title">Choose your language</h2>
          <div className="home-langs">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                className={`lang-card ${lang.id}`}
                onClick={() => handleLanguageSelect(lang.id)}
                aria-label={`Play in ${lang.name}. ${lang.meta}`}
              >
                <span className="lang-glyph" aria-hidden="true">{lang.glyph}</span>
                <span className="lang-name">{lang.name}</span>
                <span className="lang-meta">{lang.meta}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <img src={logo} alt="" className="home-footer-logo" />
        <span>Hosted by the Bits 'N' Bytes Committee</span>
      </footer>
    </div>
  );
}

export default Welcome;

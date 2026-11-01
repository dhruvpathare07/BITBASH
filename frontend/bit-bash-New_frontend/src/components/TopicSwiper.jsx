"use client";
import { useEffect, useRef, useState } from "react";
import "./TopicSwiper.css";

/* 🔑 ICON MAP (scalable & clean) */
const TOPIC_ICONS = {
  /* ================= EASY ================= */
  "Star Pattern": "⭐",
  "Even / Odd": "🔢",
  "Sum Of Digits": "➕",
  "Factorial": "🧮",
  "Largest Of 3 Numbers": "📈",
/* ================= MEDIUM ================= */
  "Armstrong": "💪",
  "Fibonacci": "🧬",
  "Array Reverse": "🔁",
  "Palindrome": "🔄",
  "Sum Of Array Elements": "📊", 
/* ================= HARD ================= */
  "String Reverse": "🔤",
  "Complex Pattern": "🧩",
  "Recursion Logic": "🔄",
  "Prime Number": "🔢",
  "Number To Words Conversion": "🔢📝",
};

const SPIN_MS = 3000; // reel spin
const HOLD_MS = 600;  // "Locked in" moment before the topic card

// One draw per question: the result is kept for the session, so neither a
// second click nor a page refresh can change the question.
const drawStorageKey = (drawKey) => `bbbDraw:${drawKey}`;

function savedDraw(drawKey, topics) {
  if (!drawKey) return null;
  try {
    const topic = sessionStorage.getItem(drawStorageKey(drawKey));
    return topics.includes(topic) ? topic : null;
  } catch {
    return null;
  }
}

export default function TopicSwiper({ topics, onSelect, drawKey }) {
  const TOPICS = topics; // ✅ dynamic
  const containerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [spinning, setSpinning] = useState(false);
  const [used, setUsed] = useState(false); // the one spin has been used
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Already drawn for this question (e.g. after a refresh): skip the wheel.
  // On mount only, so the draw just made doesn't cut the "Locked in" pause.
  useEffect(() => {
    const topic = savedDraw(drawKey, TOPICS);
    if (topic) onSelectRef.current(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start one full set in, so the reel has cards on both sides at rest
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(-${TOPICS.length * 200}px)`;
    }
  }, [TOPICS.length]);

  const spin = () => {
    if (spinning || used) return;
    setSpinning(true);
    setUsed(true);

    const cardWidth = 200;
    const totalCards = TOPICS.length;

    const randomIndex = Math.floor(Math.random() * totalCards);
    if (drawKey) {
      try {
        sessionStorage.setItem(drawStorageKey(drawKey), TOPICS[randomIndex]);
      } catch {
        /* storage blocked: the hidden button still stops a second spin */
      }
    }
    const spinRounds = 4;

    const finalTranslate =
      spinRounds * totalCards * cardWidth +
      randomIndex * cardWidth;

    containerRef.current.style.transition =
      `transform ${SPIN_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
    containerRef.current.style.transform =
      `translateX(-${finalTranslate}px)`;

    setTimeout(() => {
      setSelectedIndex(randomIndex);
      setSpinning(false);
      // Hold the "locked in" moment briefly before moving on
      setTimeout(() => onSelectRef.current(TOPICS[randomIndex]), HOLD_MS);
    }, SPIN_MS);
  };

  return (
    <div className="swiper-wrapper">
      <div className="swiper-header">
        <h3 className="swiper-title">Spin to draw your challenge</h3>
      </div>

      <div
        className={`swiper-machine ${spinning ? "is-spinning" : ""} ${
          !spinning && selectedIndex !== null ? "is-locked" : ""
        }`}
      >
        {/* Decorative lights */}
        <div className="machine-lights">
          {[1,2,3,4,5].map(i => (
            <span key={i} className={`light light-${i}`} />
          ))}
        </div>

        {/* Pointer */}
        <div className="pointer-wrapper">
          <div className="pointer"></div>
          <div className="pointer-glow"></div>
        </div>

        {/* Slot window */}
        <div className="swiper-window">
          <div className="window-overlay left"></div>
          <div className="window-overlay right"></div>

          <div className="swiper-track" ref={containerRef}>
            {[...TOPICS, ...TOPICS, ...TOPICS, ...TOPICS, ...TOPICS, ...TOPICS].map(
              (topic, index) => (
                <div
                  key={index}
                  className={`topic-card ${
                    selectedIndex !== null &&
                    index % TOPICS.length === selectedIndex
                      ? "selected"
                      : ""
                  }`}
                >
                  <div className="card-inner">
                    <div className="card-icon">
                      {TOPIC_ICONS[topic] || "❓"}
                    </div>
                    <span className="card-text">{topic}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom panel */}
        <div className="machine-panel">
          <div className="panel-display" aria-live="polite">
            {spinning
              ? "Spinning…"
              : selectedIndex !== null
              ? "Locked in"
              : "Ready"}
          </div>
        </div>
      </div>

      {/* One spin per question: the button is gone once it's used */}
      {!used && (
        <button className="spin-btn" onClick={spin}>
          <span className="btn-text">Spin the wheel</span>
          <span className="btn-glow"></span>
        </button>
      )}
    </div>
  );
}

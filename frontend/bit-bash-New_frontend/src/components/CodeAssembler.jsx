
import { useEffect, useRef, useState } from "react";
import "./CodeAssembler.css";
import { PYTHON_CODE_BLOCKS } from "../data/pythonCodeBlocks";
import { C_CODE_BLOCKS } from "../data/cCodeBlocks"; // added

export default function CodeAssembler({ topic, expectedOutput, onSuccess, locked = false, language = "python" }) {
  // choose blocks based on language
  const correctBlocks = (language === "c" ? C_CODE_BLOCKS : PYTHON_CODE_BLOCKS)[topic] || [];

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const [blocks, setBlocks] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [droppedIndex, setDroppedIndex] = useState(null);
  const [solved, setSolved] = useState(false);

  // Expected output floats on screen; drag it by its title bar
  const [boxPos, setBoxPos] = useState(null);
  const dragRef = useRef(null);

  const startBoxDrag = (e) => {
    const box = e.currentTarget.parentElement;
    const r = box.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; dragging still works without it */
    }
  };

  const moveBox = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const x = Math.min(Math.max(8, e.clientX - d.dx), window.innerWidth - d.w - 8);
    const y = Math.min(Math.max(72, e.clientY - d.dy), window.innerHeight - 48);
    setBoxPos({ x, y });
  };

  const endBoxDrag = () => {
    dragRef.current = null;
  };

  // Shuffle only when topic or language is ready/changed
  useEffect(() => {
    if (correctBlocks.length > 0) {
      setBlocks(shuffle(correctBlocks));
      setSolved(false);
    }
  }, [topic, language, correctBlocks]);

  // Clear the "just dropped" highlight after its animation
  useEffect(() => {
    if (droppedIndex === null) return;
    const t = setTimeout(() => setDroppedIndex(null), 450);
    return () => clearTimeout(t);
  }, [droppedIndex]);

  const handleDrop = (index) => {
    setOverIndex(null);
    if (dragIndex === null || solved || locked) return;

    const updated = [...blocks];
    const draggedItem = updated[dragIndex];

    updated.splice(dragIndex, 1);
    updated.splice(index, 0, draggedItem);

    setBlocks(updated);
    setDragIndex(null);
    setDroppedIndex(index);
  };

  // Safe correctness check
  const isCorrect =
    correctBlocks.length > 0 &&
    blocks.length === correctBlocks.length &&
    blocks.every((block, index) => block === correctBlocks[index]);

  const inPlace = blocks.filter((block, index) => block === correctBlocks[index]).length;

  useEffect(() => {
    if (isCorrect && !solved) {
      setSolved(true);
      onSuccess();

      const box = document.getElementById("expectedOutputBox");
      const overlay = document.getElementById("celebrationOverlay");

      if (box && overlay) {
        box.classList.add("solved");
        overlay.classList.remove("hidden");
      }
    }
  }, [isCorrect, solved, onSuccess]);

  if (!topic || correctBlocks.length === 0) {
    return <div className="assembler assembler-loading">Loading code blocks…</div>;
  }

  const done = solved || locked;
  const fileName = language === "c" ? "main.c" : "main.py";

  return (
    <div className={`assembler ${done ? "is-done" : ""}`}>
      <div className="assembler-head">
        <div>
          <h3 className="assembler-title">Put the lines in the right order</h3>
          <p className="assembler-sub">
            Drag a line to move it. Lines turn green when they're in the right spot.
          </p>
        </div>
        <div className="assembler-count" aria-live="polite">
          <b>{inPlace}</b> of {blocks.length} in place
        </div>
      </div>

      <div className="assembler-grid">
        <aside
          id="expectedOutputBox"
          className={`expected-output-box ${boxPos ? "moved" : ""}`}
          style={boxPos ? { left: boxPos.x, top: boxPos.y } : undefined}
        >
          <div
            className="terminal-bar drag-handle"
            onPointerDown={startBoxDrag}
            onPointerMove={moveBox}
            onPointerUp={endBoxDrag}
            onPointerCancel={endBoxDrag}
            title="Drag to move"
          >
            <span className="terminal-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>Expected output</span>
            <span className="drag-grip" aria-hidden="true">⋮⋮</span>
          </div>
          <pre>{expectedOutput || "Output will appear here..."}</pre>

          <div id="celebrationOverlay" className="celebration-overlay hidden">
            <div className="clap">✓</div>
            <div className="celebration-text">Output matched</div>
          </div>
        </aside>

        <div className="code-window">
          <div className="terminal-bar">
            <span className="terminal-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>{fileName}</span>
            <span className="terminal-lang">{language.toUpperCase()}</span>
          </div>

          <ol className="code-list">
            {blocks.map((block, index) => {
              const correct = block === correctBlocks[index];
              const classes = [
                "code-block",
                correct ? "correct" : "",
                dragIndex === index ? "dragging" : "",
                overIndex === index && dragIndex !== index ? "drag-over" : "",
                droppedIndex === index ? "just-dropped" : "",
              ].join(" ");

              // Indentation stays hidden while solving (it would give the
              // answer away); once solved, lines slide into their real indent.
              const text = block.trimStart();
              const indent = block.length - text.length;

              return (
                <li
                  key={index}
                  className={classes}
                  style={{ "--indent": done ? indent : 0, "--i": index }}
                  draggable={!done}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnter={() => setOverIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDrop={() => handleDrop(index)}
                >
                  <span className="line-no" aria-hidden="true">{index + 1}</span>
                  <code className="line-code">{text}</code>
                  {!done && <span className="grip" aria-hidden="true">⋮⋮</span>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

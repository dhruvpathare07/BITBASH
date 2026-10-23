
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./MazeBoard.css";

const LETTERS = ["A", "B", "C", "D"];
const DIRECTIONS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  w: [-1, 0],
  W: [-1, 0],
  s: [1, 0],
  S: [1, 0],
  a: [0, -1],
  A: [0, -1],
  d: [0, 1],
  D: [0, 1],
};

const keyOf = ({ row, col }) => `${row},${col}`;

function readMaze(maze) {
  const rows = maze?.rows ?? [];
  const rowCount = rows.length;
  const colCount = rows[0]?.length ?? 0;

  const exits = LETTERS.map((letter) => {
    const exit = maze?.exits?.[letter];
    return exit
      ? { letter, row: exit.row, col: exit.col }
      : null;
  }).filter(Boolean);

  const start = maze?.start ?? { row: 0, col: Math.floor(colCount / 2) };

  return { rows, rowCount, colCount, exits, start };
}

export default function MazeBoard({
  maze,
  question,
  onEndpoint,
  disabled = false,
}) {
  const layout = useMemo(() => readMaze(maze), [maze]);
  const { rows, rowCount, colCount, exits, start } = layout;

  const [position, setPosition] = useState(start);
  const [trail, setTrail] = useState([start]);
  const [message, setMessage] = useState("Find the route to the correct output.");

  const isWalkable = useCallback(
    (row, col) => {
      if (row < 0 || row >= rowCount || col < 0 || col >= colCount) {
        return false;
      }

      return rows[row]?.[col] !== "#";
    },
    [rows, rowCount, colCount]
  );

  useEffect(() => {
    setPosition(start);
    setTrail([start]);
    setMessage("Find the route to the correct output.");
  }, [maze, start.row, start.col]);

  const move = useCallback(
    (dr, dc) => {
      if (disabled) return;

      const next = {
        row: position.row + dr,
        col: position.col + dc,
      };

      if (!isWalkable(next.row, next.col)) {
        setMessage("A wall blocks that direction. Try another corridor.");
        return;
      }

      setPosition(next);
      setTrail((previous) => [...previous, next]);

      const reachedExit = exits.find(
        (exit) => exit.row === next.row && exit.col === next.col
      );

      if (reachedExit) {
        setMessage(`You reached exit ${reachedExit.letter}.`);
        onEndpoint?.(reachedExit.letter);
      } else {
        setMessage("Keep going — follow the corridors to an exit.");
      }
    },
    [disabled, position, isWalkable, exits, onEndpoint]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      const direction = DIRECTIONS[event.key];
      if (!direction || disabled) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      move(direction[0], direction[1]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move, disabled]);

  if (!rowCount || !colCount) {
    return <p className="maze-board-error">Maze layout could not be loaded.</p>;
  }

  const width = 930;
  const height = (width / colCount) * rowCount;
  const cellW = width / colCount;
  const cellH = height / rowCount;
  const inset = Math.min(cellW, cellH) * 0.5;

  const center = ({ row, col }) => ({
    x: (col + 0.5) * cellW,
    y: (row + 0.5) * cellH,
  });

  // Draw a wall only where a walkable corridor touches a wall.
  // This creates a real maze outline instead of individual cell boxes.
  const wallSegments = [];

  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      if (!isWalkable(row, col)) continue;

      const x = col * cellW;
      const y = row * cellH;
      const exitHere = exits.some(
  (exit) => exit.row === row && exit.col === col
);

const startHere = start.row === row && start.col === col;

if (!isWalkable(row - 1, col) && !startHere) {
  wallSegments.push(`M ${x} ${y} H ${x + cellW}`);
}

if (!isWalkable(row + 1, col) && !exitHere) {
  wallSegments.push(`M ${x} ${y + cellH} H ${x + cellW}`);
}

if (!isWalkable(row, col - 1) && !exitHere) {
  wallSegments.push(`M ${x} ${y} V ${y + cellH}`);
}

if (!isWalkable(row, col + 1) && !exitHere) {
  wallSegments.push(`M ${x + cellW} ${y} V ${y + cellH}`);
}

      if (!isWalkable(row, col - 1)) {
        wallSegments.push(`M ${x} ${y} V ${y + cellH}`);
      }

      if (!isWalkable(row, col + 1)) {
        wallSegments.push(`M ${x + cellW} ${y} V ${y + cellH}`);
      }
    }
  }

  const trailPoints = trail
    .map((cell) => {
      const point = center(cell);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const player = center(position);
  const startPoint = center(start);

  return (
    <div className="maze-board">
      <div className="maze-board-canvas">
        <svg
          className="maze-board-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="application"
          aria-label="Maze. Use the arrow keys or WASD to move through the corridors."
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="mazeFloor" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10152b" />
              <stop offset="100%" stopColor="#080d1b" />
            </linearGradient>

            <linearGradient id="mazeNeonWall" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff71c8" />
              <stop offset="50%" stopColor="#c17bff" />
              <stop offset="100%" stopColor="#5be7ff" />
            </linearGradient>

            <linearGradient id="mazeTrail" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff78d0" />
              <stop offset="100%" stopColor="#64eaff" />
            </linearGradient>

            <filter id="mazeWallGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="mazePlayerGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id="mazeDots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#7586b4" opacity=".16" />
            </pattern>
          </defs>

          <rect width={width} height={height} fill="url(#mazeFloor)" />
          <rect width={width} height={height} fill="url(#mazeDots)" />

          {/* Soft underglow, followed by continuous corridor walls. */}
          <path
            d={wallSegments.join(" ")}
            fill="none"
            stroke="#a66fff"
            strokeWidth={Math.min(cellW, cellH) * 0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".2"
            filter="url(#mazeWallGlow)"
          />

          <path
            d={wallSegments.join(" ")}
            fill="none"
            stroke="url(#mazeNeonWall)"
            strokeWidth={Math.min(cellW, cellH) * 0.105}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#mazeWallGlow)"
          />

          {/* The trail follows the actual order of movement. */}
          {trail.length > 1 && (
            <polyline
              points={trailPoints}
              fill="none"
              stroke="url(#mazeTrail)"
              strokeWidth={Math.min(cellW, cellH) * 0.16}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".72"
            />
          )}

          {/* Entrance */}
          <g transform={`translate(${startPoint.x},${startPoint.y})`}>
            <circle r={inset * 0.72} fill="#4de4a7" opacity=".13" />
            <circle r={inset * 0.44} fill="#0d3d37" stroke="#4de4a7" strokeWidth="2.5" />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#b7ffe5"
              fontSize={Math.min(cellW, cellH) * 0.38}
              fontWeight="800"
            >
              S
            </text>
          </g>

          {/* Four reachable exits */}
          {exits.map((exit) => {
            const point = center(exit);
            const optionIndex = LETTERS.indexOf(exit.letter);
            const option = question?.options?.[optionIndex] ?? "";

            return (
              <g
                key={exit.letter}
                transform={`translate(${point.x},${point.y})`}
                className={`maze-board-exit maze-board-exit-${exit.letter.toLowerCase()}`}
              >
                <circle r={inset * 0.76} fill="#ff70cb" opacity=".13" />
                <circle
                  r={inset * 0.48}
                  fill="#261534"
                  stroke="#ff8bd9"
                  strokeWidth="2.5"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffe2f6"
                  fontSize={Math.min(cellW, cellH) * 0.38}
                  fontWeight="900"
                >
                  {exit.letter}
                </text>
                <title>{`Exit ${exit.letter}: ${option}`}</title>
              </g>
            );
          })}

          {/* Player */}
          <g
            className="maze-board-player"
            transform={`translate(${player.x},${player.y})`}
            filter="url(#mazePlayerGlow)"
          >
            <circle r={inset * 0.7} fill="#58e8ff" opacity=".16" />
            <circle
              r={inset * 0.43}
              fill="#62e9ff"
              stroke="#e0fcff"
              strokeWidth="2.5"
            />
            <circle cx={-inset * 0.13} cy={-inset * 0.08} r={inset * 0.055} fill="#0b2237" />
            <circle cx={inset * 0.13} cy={-inset * 0.08} r={inset * 0.055} fill="#0b2237" />
            <path
              d={`M ${-inset * 0.13} ${inset * 0.12} Q 0 ${inset * 0.25} ${inset * 0.13} ${inset * 0.12}`}
              fill="none"
              stroke="#0b2237"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      <div className="maze-board-status" aria-live="polite">
        <span className="maze-board-status-dot" />
        {message}
      </div>

      <div className="maze-board-controls" aria-label="Maze movement controls">
        <button type="button" onClick={() => move(-1, 0)} disabled={disabled} aria-label="Move up">
          ↑
        </button>
        <div className="maze-board-controls-row">
          <button type="button" onClick={() => move(0, -1)} disabled={disabled} aria-label="Move left">
            ←
          </button>
          <button type="button" onClick={() => move(1, 0)} disabled={disabled} aria-label="Move down">
            ↓
          </button>
          <button type="button" onClick={() => move(0, 1)} disabled={disabled} aria-label="Move right">
            →
          </button>
        </div>
        <p>Arrow keys or WASD to move</p>
      </div>
    </div>
  );
}

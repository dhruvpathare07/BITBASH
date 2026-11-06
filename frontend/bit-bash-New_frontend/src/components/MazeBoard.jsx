import React, { useCallback, useEffect, useRef, useState } from "react";
import "./MazeBoard.css";

const LETTERS = ["A", "B", "C", "D"];

// Matched on event.code (the physical key), so WASD works with Caps Lock
// on and on any keyboard layout.
const DIRECTIONS = {
  ArrowUp: { dx: 0, dy: -1, wall: "top" },
  ArrowDown: { dx: 0, dy: 1, wall: "bottom" },
  ArrowLeft: { dx: -1, dy: 0, wall: "left" },
  ArrowRight: { dx: 1, dy: 0, wall: "right" },
  KeyW: { dx: 0, dy: -1, wall: "top" },
  KeyS: { dx: 0, dy: 1, wall: "bottom" },
  KeyA: { dx: -1, dy: 0, wall: "left" },
  KeyD: { dx: 1, dy: 0, wall: "right" },
};

const MOVE_MS = 125;   // one cell of smooth movement
const TRAIL_MS = 1000; // how long the glowing trail lingers
const MAX_QUEUED = 2;  // moves buffered while one is animating

// Round 1's palette: deep purple floor, violet walls, pink exits
const COLORS = {
  floor: "#0d0a1c",
  dots: "rgba(124,92,255,.12)",
  wallGlow: "#7c5cff",
  wallCore: "#cbbcff",
  start: "#ffffff",
  exit: "#ff4ecd",
  cyan: "#45efff",
};

// Room around the maze for the exit arrows and letters, in cells
const EXIT_MARGIN = 1.35;

const OUTWARD = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

// Which outer wall an exit's gate is in
function gateSide(exit, maze) {
  if (exit.side) return exit.side;
  if (exit.y === 0) return "top";
  if (exit.x === maze.cols - 1) return "right";
  if (exit.y === maze.rows - 1) return "bottom";
  return "left";
}

const IDLE_MESSAGE = "SYSTEM ONLINE — FIND THE CORRECT EXIT AND WALK OUT THROUGH ITS GATE.";

export default function MazeBoard({ maze, question, onEndpoint, disabled = false }) {
  const canvasRef = useRef(null);
  const staticLayerRef = useRef(null); // floor + walls, redrawn only on resize
  const geometryRef = useRef({ cw: 30, ch: 30, offsetX: 0, offsetY: 0, width: 0, height: 0 });
  const wallsImageRef = useRef(null);  // the maze image's walls, tinted (image mazes)
  const [imageReady, setImageReady] = useState(0);

  // Image mazes: load the picture and tint its walls once
  useEffect(() => {
    if (!maze?.image?.src) return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const tinted = document.createElement("canvas");
      tinted.width = img.naturalWidth;
      tinted.height = img.naturalHeight;
      const tctx = tinted.getContext("2d");
      tctx.drawImage(img, 0, 0);
      tctx.globalCompositeOperation = "source-in";
      tctx.fillStyle = COLORS.wallCore;
      tctx.fillRect(0, 0, tinted.width, tinted.height);
      wallsImageRef.current = tinted;
      setImageReady((n) => n + 1);
    };
    img.src = maze.image.src;
    return () => {
      cancelled = true;
    };
  }, [maze]);

  const start = maze?.start ?? { x: 0, y: 0 };
  const exits = LETTERS.map((letter) =>
    maze?.exits?.[letter] ? { letter, ...maze.exits[letter] } : null
  ).filter(Boolean);

  // Live game state lives in a ref: it changes every frame and must not
  // re-render React.
  const stateRef = useRef(null);
  if (!stateRef.current) {
    stateRef.current = {
      x: start.x,
      y: start.y,
      renderX: start.x,
      renderY: start.y,
      queue: [],
      active: null,
      trail: [],
      finished: false,
    };
  }

  const [message, setMessage] = useState({ text: IDLE_MESSAGE, tone: "" });

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const onEndpointRef = useRef(onEndpoint);
  onEndpointRef.current = onEndpoint;
  const questionRef = useRef(question);
  questionRef.current = question;

  /* ---------- static layer: floor, dots and walls ---------- */
  const buildStaticLayer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !maze) return false;

    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false; // hidden (code view)

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const image = maze.image;
    const wallsImage = wallsImageRef.current;
    if (image && !wallsImage) return false; // picture still loading

    let geometry;
    if (image) {
      // fit the picture, leaving room around it for the exit arrows
      const scale = Math.min(
        rect.width / (image.width + 2 * EXIT_MARGIN * image.cellW),
        rect.height / (image.height + 2 * EXIT_MARGIN * image.cellH)
      );
      const left = (rect.width - image.width * scale) / 2;
      const top = (rect.height - image.height * scale) / 2;
      geometry = {
        cw: image.cellW * scale,
        ch: image.cellH * scale,
        offsetX: left + image.x0 * scale,
        offsetY: top + image.y0 * scale,
        image: { left, top, width: image.width * scale, height: image.height * scale },
      };
    } else {
      const cell = Math.min(
        rect.width / (maze.cols + 2 * EXIT_MARGIN),
        rect.height / (maze.rows + 2 * EXIT_MARGIN)
      );
      geometry = {
        cw: cell,
        ch: cell,
        offsetX: (rect.width - maze.cols * cell) / 2,
        offsetY: (rect.height - maze.rows * cell) / 2,
      };
    }
    Object.assign(geometry, { width: rect.width, height: rect.height, dpr });
    geometryRef.current = geometry;
    const cw = geometry.cw;
    const ch = geometry.ch;

    const layer = staticLayerRef.current || document.createElement("canvas");
    staticLayerRef.current = layer;
    layer.width = canvas.width;
    layer.height = canvas.height;

    const ctx = layer.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = COLORS.dots;
    for (let y = 8; y < rect.height; y += 17) {
      for (let x = 8; x < rect.width; x += 17) {
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }

    if (image) {
      // The maze picture's own walls, tinted, with a soft glow
      const { left, top, width, height } = geometry.image;
      ctx.save();
      ctx.shadowColor = COLORS.wallGlow;
      ctx.shadowBlur = 10;
      ctx.drawImage(wallsImage, left, top, width, height);
      ctx.shadowBlur = 0;
      ctx.drawImage(wallsImage, left, top, width, height);
      ctx.restore();
      return true;
    }

    // All walls as one path, stroked twice: a wide glow, then a bright core
    ctx.beginPath();
    for (let y = 0; y < maze.rows; y += 1) {
      for (let x = 0; x < maze.cols; x += 1) {
        const walls = maze.cells[y][x];
        const px = geometry.offsetX + x * cw;
        const py = geometry.offsetY + y * ch;

        if (walls.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cw, py);
        }
        if (walls.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + ch);
        }
        // right/bottom only on the outer edge; inner ones are the
        // neighbour's left/top
        if (walls.right && x === maze.cols - 1) {
          ctx.moveTo(px + cw, py);
          ctx.lineTo(px + cw, py + ch);
        }
        if (walls.bottom && y === maze.rows - 1) {
          ctx.moveTo(px, py + ch);
          ctx.lineTo(px + cw, py + ch);
        }
      }
    }

    ctx.lineWidth = Math.max(2, Math.min(cw, ch) * 0.085);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = COLORS.wallGlow;
    ctx.shadowColor = "#328cff";
    ctx.shadowBlur = 9;
    ctx.stroke();

    ctx.strokeStyle = COLORS.wallCore;
    ctx.shadowBlur = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    return true;
    // imageReady: rebuild once the maze picture has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maze, imageReady]);

  /* ---------- per-frame drawing ---------- */
  const drawFrame = useCallback(
    (now) => {
      const canvas = canvasRef.current;
      const layer = staticLayerRef.current;
      if (!canvas || !layer || !maze) return;

      const g = geometryRef.current;
      if (canvas.width !== Math.floor(g.width * g.dpr)) return;

      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layer, 0, 0);
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

      const center = (x, y) => [g.offsetX + (x + 0.5) * g.cw, g.offsetY + (y + 0.5) * g.ch];
      const unit = Math.min(g.cw, g.ch); // size of things drawn in a cell

      const marker = (x, y, label, color, glow) => {
        const [px, py] = center(x, y);
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, Math.max(7, unit * 0.32), 0, Math.PI * 2);
        ctx.fillStyle = "#140f2b";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(10, unit * 0.4)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, px, py + 1);
        ctx.restore();
      };

      marker(start.x, start.y, "S", COLORS.start, 13);

      // Each exit: an arrow leading out through its gate, then the option
      // letter it stands for ("leave here = option A")
      const pulse = 0.5 + Math.sin(now / 380) * 0.5; // exits breathe so they're easy to spot
      exits.forEach((exit) => {
        const [dx, dy] = OUTWARD[gateSide(exit, maze)];
        const [cx, cy] = center(exit.x, exit.y);
        // the gate: middle of the cell's outer wall
        const gx = cx + dx * g.cw * 0.5;
        const gy = cy + dy * g.ch * 0.5;
        const len = unit * 0.62;
        const head = unit * 0.3;

        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.strokeStyle = COLORS.exit;
        ctx.fillStyle = COLORS.exit;
        ctx.shadowColor = COLORS.exit;
        ctx.shadowBlur = 8 + pulse * 10;
        ctx.lineWidth = Math.max(2.5, unit * 0.12);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-unit * 0.15, 0);
        ctx.lineTo(len - head * 0.6, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(len, 0);
        ctx.lineTo(len - head, -head * 0.75);
        ctx.lineTo(len - head, head * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // the letter badge just beyond the arrow
        const dist = len + unit * 0.48;
        const bx = gx + dx * dist;
        const by = gy + dy * dist;
        const r = Math.max(9, unit * 0.4);
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.exit;
        ctx.shadowColor = COLORS.exit;
        ctx.shadowBlur = 10 + pulse * 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#1a0b24";
        ctx.font = `900 ${Math.max(11, r * 1.15)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(exit.letter, bx, by + 1);
        ctx.restore();
      });

      // Fading trail
      const s = stateRef.current;
      s.trail = s.trail.filter((p) => now - p.time < TRAIL_MS);
      const points = [...s.trail, { x: s.renderX, y: s.renderY, time: now }];
      if (points.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = unit * 0.22;
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = 17;
        for (let i = 1; i < points.length; i += 1) {
          const [ax, ay] = center(points[i - 1].x, points[i - 1].y);
          const [bx, by] = center(points[i].x, points[i].y);
          const opacity = Math.max(0, 1 - (now - points[i - 1].time) / TRAIL_MS);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(69,239,255,${opacity * 0.8})`;
          ctx.stroke();
        }
        ctx.restore();
      }

      const [px, py] = center(s.renderX, s.renderY);

      // Player: soft halo, white core, cyan centre
      ctx.save();
      ctx.shadowColor = COLORS.cyan;
      ctx.beginPath();
      ctx.arc(px, py, unit * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(69,239,255,.18)";
      ctx.shadowBlur = 25;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, unit * 0.19, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, unit * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.restore();
    },
    // exits are derived from maze, so maze covers them
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maze]
  );

  /* ---------- movement ---------- */
  const reachExit = useCallback((exit) => {
    const s = stateRef.current;
    s.finished = true;
    s.queue = [];

    const correct = questionRef.current?.correct;
    if (correct && exit.letter === correct) {
      setMessage({ text: `MAZE CLEARED! EXIT ${exit.letter} IS CORRECT.`, tone: "success" });
    } else {
      setMessage({ text: `WRONG EXIT ${exit.letter}! RETURNING TO START.`, tone: "error" });
    }
    onEndpointRef.current?.(exit.letter);
  }, []);

  const beginMove = useCallback(
    (dir, now) => {
      const s = stateRef.current;
      if (maze.cells[s.y][s.x][dir.wall]) return; // wall

      const nx = s.x + dir.dx;
      const ny = s.y + dir.dy;
      s.trail.push({ x: s.renderX, y: s.renderY, time: now });

      // Through a gate in the outer wall. An exit only counts when the
      // player walks out through it, not when a route passes its cell.
      if (nx < 0 || nx >= maze.cols || ny < 0 || ny >= maze.rows) {
        const exit = exits.find((e) => e.x === s.x && e.y === s.y);
        if (!exit) {
          s.trail.pop(); // the entrance: nowhere to go
          return;
        }
        s.active = {
          fromX: s.renderX,
          fromY: s.renderY,
          toX: s.x + dir.dx * 0.6,
          toY: s.y + dir.dy * 0.6,
          start: now,
          exit,
        };
        return;
      }

      s.active = { fromX: s.renderX, fromY: s.renderY, toX: nx, toY: ny, start: now };
      s.x = nx;
      s.y = ny;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maze]
  );

  // `held` marks moves from a key being held down (auto-repeat)
  const requestMove = useCallback((dir, held = false) => {
    const s = stateRef.current;
    if (disabledRef.current || s.finished) return;
    if (s.queue.length < MAX_QUEUED) s.queue.push({ ...dir, held });
  }, []);

  /* ---------- animation loop ---------- */
  useEffect(() => {
    if (!maze) return undefined;
    let frame = 0;
    let ready = buildStaticLayer();

    const tick = (now) => {
      const s = stateRef.current;

      if (s.active) {
        const t = Math.min(1, (now - s.active.start) / MOVE_MS);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        s.renderX = s.active.fromX + (s.active.toX - s.active.fromX) * eased;
        s.renderY = s.active.fromY + (s.active.toY - s.active.fromY) * eased;

        if (t >= 1) {
          s.renderX = s.active.toX;
          s.renderY = s.active.toY;
          const { exit } = s.active;
          s.active = null;
          if (exit) reachExit(exit);
        }
      }

      if (!s.active && s.queue.length && !s.finished && !disabledRef.current) {
        beginMove(s.queue.shift(), now);
      }

      if (!ready) ready = buildStaticLayer(); // became visible
      if (ready) drawFrame(now);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    // Redraw the walls when the board is resized or shown again
    const observer = new ResizeObserver(() => {
      ready = buildStaticLayer();
    });
    if (canvasRef.current) observer.observe(canvasRef.current);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [maze, buildStaticLayer, drawFrame, beginMove, reachExit]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKeyDown = (event) => {
      const dir = DIRECTIONS[event.code];
      if (!dir || disabledRef.current) return;
      // leave browser shortcuts like Ctrl+S / Ctrl+A alone
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Only skip keys while typing. Buttons are fine: after clicking an
      // on-screen arrow (or Back), WASD/arrows must still move the player.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      // Holding a key keeps walking, without piling up moves
      if (!event.repeat || stateRef.current.queue.length === 0) requestMove(dir, event.repeat);
    };

    // Letting go of a held key stops the player; quick taps still count
    const dropHeldMoves = () => {
      stateRef.current.queue = stateRef.current.queue.filter((m) => !m.held);
    };
    const clearQueue = () => {
      stateRef.current.queue = [];
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", dropHeldMoves);
    window.addEventListener("blur", clearQueue);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", dropHeldMoves);
      window.removeEventListener("blur", clearQueue);
    };
  }, [requestMove]);

  useEffect(() => {
    if (disabled) stateRef.current.queue = [];
  }, [disabled]);

  if (!maze?.cells) {
    return <p className="maze-board-error">Maze layout could not be loaded.</p>;
  }

  const press = (code) => () => requestMove(DIRECTIONS[code]);

  return (
    <div className="maze-board">
      <div className="maze-board-canvas">
        <canvas
          ref={canvasRef}
          role="application"
          aria-label={`Maze with exits ${exits
            .map((e) => `${e.letter}: ${question?.options?.[LETTERS.indexOf(e.letter)] ?? ""}`)
            .join(", ")}. Use the arrow keys or WASD to move.`}
        />
      </div>

      <div className={`maze-board-status ${message.tone}`} aria-live="polite">
        <span className="maze-board-status-dot" />
        {message.text}
      </div>

      <div className="maze-board-controls" aria-label="Maze movement controls">
        <button type="button" onClick={press("ArrowUp")} disabled={disabled} aria-label="Move up">
          ↑
        </button>
        <div className="maze-board-controls-row">
          <button type="button" onClick={press("ArrowLeft")} disabled={disabled} aria-label="Move left">
            ←
          </button>
          <button type="button" onClick={press("ArrowDown")} disabled={disabled} aria-label="Move down">
            ↓
          </button>
          <button type="button" onClick={press("ArrowRight")} disabled={disabled} aria-label="Move right">
            →
          </button>
        </div>
        <p>Arrow keys or WASD to move</p>
      </div>
    </div>
  );
}

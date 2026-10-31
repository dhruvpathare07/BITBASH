// Round 2 mazes: one per challenge, the same for every player (seeded).
//
// Each maze is a grid of cells with walls on their four sides, carved by a
// randomized depth-first search (long winding corridors and real dead
// ends). Medium difficulty: 19 x 13 cells with a few extra openings so
// there's more than one route, and the four exits spread over three sides.

export const MAZE_COLS = 19;
export const MAZE_ROWS = 13;

const EXIT_LETTERS = ["A", "B", "C", "D"];

// Players enter on the left; exits sit on the top, right and bottom edges.
const START = { x: 0, y: 6, side: "left" };
const EXIT_POSITIONS = [
  { x: 13, y: 0, side: "top" },                         // A
  { x: MAZE_COLS - 1, y: 3, side: "right" },            // B
  { x: 8, y: MAZE_ROWS - 1, side: "bottom" },           // C
  { x: MAZE_COLS - 1, y: MAZE_ROWS - 3, side: "right" }, // D
];

// Share of the remaining inner walls knocked down to add alternate routes
const LOOP_SHARE = 0.06;

const STEPS = [
  { dx: 0, dy: -1, wall: "top", opposite: "bottom" },
  { dx: 1, dy: 0, wall: "right", opposite: "left" },
  { dx: 0, dy: 1, wall: "bottom", opposite: "top" },
  { dx: -1, dy: 0, wall: "left", opposite: "right" },
];

function seededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function generateMaze(seed) {
  const random = seededRandom(seed);
  const cells = Array.from({ length: MAZE_ROWS }, () =>
    Array.from({ length: MAZE_COLS }, () => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
    }))
  );
  const visited = cells.map((row) => row.map(() => false));

  // Iterative depth-first search (no recursion limit to worry about)
  const stack = [{ x: START.x, y: START.y }];
  visited[START.y][START.x] = true;

  while (stack.length) {
    const { x, y } = stack[stack.length - 1];
    const next = shuffle(STEPS, random).find((s) => {
      const nx = x + s.dx;
      const ny = y + s.dy;
      return nx >= 0 && nx < MAZE_COLS && ny >= 0 && ny < MAZE_ROWS && !visited[ny][nx];
    });

    if (!next) {
      stack.pop();
      continue;
    }

    const nx = x + next.dx;
    const ny = y + next.dy;
    cells[y][x][next.wall] = false;
    cells[ny][nx][next.opposite] = false;
    visited[ny][nx] = true;
    stack.push({ x: nx, y: ny });
  }

  // A few loops, so one wrong turn early doesn't cost the whole route
  const inner = [];
  for (let y = 0; y < MAZE_ROWS; y += 1) {
    for (let x = 0; x < MAZE_COLS; x += 1) {
      if (x < MAZE_COLS - 1 && cells[y][x].right) inner.push({ x, y, step: STEPS[1] });
      if (y < MAZE_ROWS - 1 && cells[y][x].bottom) inner.push({ x, y, step: STEPS[2] });
    }
  }
  shuffle(inner, random)
    .slice(0, Math.floor(inner.length * LOOP_SHARE))
    .forEach(({ x, y, step }) => {
      cells[y][x][step.wall] = false;
      cells[y + step.dy][x + step.dx][step.opposite] = false;
    });

  // Gates in the outer wall
  cells[START.y][START.x][START.side] = false;
  EXIT_POSITIONS.forEach((exit) => {
    cells[exit.y][exit.x][exit.side] = false;
  });

  return {
    id: seed,
    cols: MAZE_COLS,
    rows: MAZE_ROWS,
    cells,
    start: { x: START.x, y: START.y },
    exits: Object.fromEntries(
      EXIT_LETTERS.map((letter, i) => [letter, { x: EXIT_POSITIONS[i].x, y: EXIT_POSITIONS[i].y }])
    ),
  };
}

export const LOGIC_MAZE_MAPS = Array.from(
  { length: 10 },
  (_, index) => generateMaze(7103 + index * 137)
);

// Every cell is reachable in a depth-first maze, so every exit is too.
// Kept as a check in case the generator is ever changed.
export function validateMazeMap(maze) {
  const seen = new Set([`${maze.start.x},${maze.start.y}`]);
  const queue = [maze.start];

  for (let i = 0; i < queue.length; i += 1) {
    const { x, y } = queue[i];
    for (const s of STEPS) {
      const nx = x + s.dx;
      const ny = y + s.dy;
      const key = `${nx},${ny}`;
      if (
        !maze.cells[y][x][s.wall] &&
        nx >= 0 && nx < maze.cols && ny >= 0 && ny < maze.rows &&
        !seen.has(key)
      ) {
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return EXIT_LETTERS.every((letter) => {
    const exit = maze.exits[letter];
    return seen.has(`${exit.x},${exit.y}`);
  });
}

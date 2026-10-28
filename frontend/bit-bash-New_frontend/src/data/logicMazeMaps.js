
const COLS = 31;
const ROWS = 21;

const DIRECTIONS = [
  { dr: -2, dc: 0, wallDr: -1, wallDc: 0 },
  { dr: 2, dc: 0, wallDr: 1, wallDc: 0 },
  { dr: 0, dc: -2, wallDr: 0, wallDc: -1 },
  { dr: 0, dc: 2, wallDr: 0, wallDc: 1 },
];

const EXIT_LETTERS = ["A", "B", "C", "D"];

// Put exits on different sides instead of grouping them along the bottom.
const EXIT_POSITIONS = [
  { row: 3, col: 0 },          // A: left side
  { row: 17, col: COLS - 1 },  // B: right side
  { row: ROWS - 1, col: 7 },   // C: bottom
  { row: ROWS - 1, col: 23 },  // D: bottom
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
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill("#"));

  const start = { row: 0, col: 15 };
  const innerStart = { row: 1, col: 15 };

  grid[innerStart.row][innerStart.col] = " ";

  // Randomized depth-first search creates winding corridors and dead ends.
  const stack = [innerStart];

  while (stack.length) {
    const current = stack[stack.length - 1];

    const candidates = shuffle(DIRECTIONS, random)
      .map((direction) => ({
        row: current.row + direction.dr,
        col: current.col + direction.dc,
        wallRow: current.row + direction.wallDr,
        wallCol: current.col + direction.wallDc,
      }))
      .filter(
        (next) =>
          next.row > 0 &&
          next.row < ROWS - 1 &&
          next.col > 0 &&
          next.col < COLS - 1 &&
          grid[next.row][next.col] === "#"
      );

    if (!candidates.length) {
      stack.pop();
      continue;
    }

    const next = candidates[0];

    grid[next.wallRow][next.wallCol] = " ";
    grid[next.row][next.col] = " ";

    stack.push({ row: next.row, col: next.col });
  }

  // Open the entrance.
  grid[start.row][start.col] = "S";
  grid[1][15] = " ";

  // Open four boundary exits. Each is attached to an existing corridor.
  EXIT_POSITIONS.forEach((exit, index) => {
    if (exit.row === 3 && exit.col === 0) {
      grid[exit.row][1] = " ";
    } else if (exit.col === COLS - 1) {
      grid[exit.row][COLS - 2] = " ";
    } else {
      grid[ROWS - 2][exit.col] = " ";
    }

    grid[exit.row][exit.col] = EXIT_LETTERS[index];
  });

  // Add a small number of loops by opening walls between existing corridors.
  // Loops provide alternative routes instead of a single forced path.
  const loopCandidates = [];

  for (let row = 1; row < ROWS - 1; row += 1) {
    for (let col = 1; col < COLS - 1; col += 1) {
      if (grid[row][col] !== "#") continue;

      const horizontal =
        col % 2 === 0 &&
        row % 2 === 1 &&
        grid[row][col - 1] === " " &&
        grid[row][col + 1] === " ";

      const vertical =
        row % 2 === 0 &&
        col % 2 === 1 &&
        grid[row - 1][col] === " " &&
        grid[row + 1][col] === " ";

      if (horizontal || vertical) {
        loopCandidates.push({ row, col });
      }
    }
  }

  shuffle(loopCandidates, random)
    .slice(0, Math.floor(loopCandidates.length * 0.12))
    .forEach(({ row, col }) => {
      grid[row][col] = " ";
    });

  const exits = Object.fromEntries(
    EXIT_LETTERS.map((letter, index) => [
      letter,
      EXIT_POSITIONS[index],
    ])
  );

  const maze = {
    id: seed,
    rows: grid.map((row) => row.join("")),
    start,
    exits,
    rowsCount: ROWS,
    colsCount: COLS,
  };

  if (!validateMazeMap(maze)) {
    throw new Error(`Generated maze ${seed} has an unreachable exit.`);
  }

  return maze;
}

export const LOGIC_MAZE_MAPS = Array.from(
  { length: 10 },
  (_, index) => generateMaze(7103 + index * 137)
);

export function validateMazeMap(maze) {
  const grid = maze.rows.map((row) => row.split(""));
  const rowCount = grid.length;
  const colCount = grid[0]?.length ?? 0;

  const isWalkable = (row, col) =>
    row >= 0 &&
    row < rowCount &&
    col >= 0 &&
    col < colCount &&
    grid[row][col] !== "#";

  const queue = [maze.start];
  const seen = new Set([`${maze.start.row},${maze.start.col}`]);

  for (let i = 0; i < queue.length; i += 1) {
    const { row, col } = queue[i];

    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      const key = `${nextRow},${nextCol}`;

      if (isWalkable(nextRow, nextCol) && !seen.has(key)) {
        seen.add(key);
        queue.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return EXIT_LETTERS.every((letter) => {
    const exit = maze.exits[letter];
    return seen.has(`${exit.row},${exit.col}`);
  });
}

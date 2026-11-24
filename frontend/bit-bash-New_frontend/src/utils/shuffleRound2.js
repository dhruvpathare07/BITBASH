// Shuffles Round 2 for each player: questions stay in difficulty order,
// while questions and options are randomized inside each difficulty band.
// The order is kept in sessionStorage so a reload doesn't reshuffle mid-round.
// PlayerEntry clears it, so the next player on the same PC gets a new order.

const LETTERS = ["A", "B", "C", "D"];
export const ROUND2_ORDER_KEY = "logicMazeOrder";

function shuffledIndexes(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffledDifficultyIndexes(base) {
  const bands = [
    [0, 3], // easy: questions 1-3
    [3, 6], // medium: questions 4-6
    [6, 8], // hard: questions 7-8
    [8, 10], // very hard: questions 9-10
  ];

  return bands.flatMap(([start, end]) => {
    const band = base.slice(start, end).map((_, offset) => start + offset);

    for (let i = band.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [band[i], band[j]] = [band[j], band[i]];
    }

    return band;
  });
}

function isPerm(p, n) {
  return Array.isArray(p) && p.length === n && new Set(p).size === n &&
    p.every((x) => Number.isInteger(x) && x >= 0 && x < n);
}

function isValidDifficultyOrder(order, base) {
  if (!isPerm(order?.questions, base.length)) return false;

  const bands = [[0, 3], [3, 6], [6, 8], [8, 10]];
  let offset = 0;

  for (const [start, end] of bands) {
    const group = order.questions.slice(offset, offset + (end - start));
    if (group.length !== end - start) return false;
    if (!group.every((qi) => qi >= start && qi < end)) return false;
    offset += end - start;
  }

  return true;
}

function isValidOrder(order, base) {
  return (
    isValidDifficultyOrder(order, base) &&
    Array.isArray(order.options) &&
    order.options.length === base.length &&
    order.options.every((p, pos) =>
      isPerm(p, base[order.questions[pos]].options.length)
    )
  );
}

function loadOrder(language, base) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(`${ROUND2_ORDER_KEY}:${language}`) || "null");
    if (isValidOrder(saved, base)) return saved;
  } catch {
    /* ignore broken storage */
  }

  const questions = shuffledDifficultyIndexes(base);
  const order = {
    questions,
    options: questions.map((qi) => shuffledIndexes(base[qi].options.length)),
  };

  try {
    sessionStorage.setItem(`${ROUND2_ORDER_KEY}:${language}`, JSON.stringify(order));
  } catch {
    /* storage blocked: still play, just without keeping the order */
  }
  return order;
}

/** Round 2 questions with shuffled options and shuffled questions within each difficulty group. */
export function shuffledRound2Questions(language, base) {
  if (!Array.isArray(base) || base.length === 0) return base;
  const order = loadOrder(language, base);
  return order.questions.map((qi, pos) => {
    const source = base[qi];
    const perm = order.options[pos];
    const options = perm.map((k) => source.options[k]);
    const correctIndex = perm.indexOf(LETTERS.indexOf(source.correct));
    return { ...source, options, correct: LETTERS[correctIndex] };
  });
}

/** Forget the saved order (call when a new player starts). */
export function clearRound2Order() {
  try {
    for (const lang of ["python", "c"]) {
      sessionStorage.removeItem(`${ROUND2_ORDER_KEY}:${lang}`);
    }
  } catch {
    /* storage blocked */
  }
}

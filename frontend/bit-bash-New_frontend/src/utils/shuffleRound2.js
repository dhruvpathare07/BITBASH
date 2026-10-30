// Shuffles Round 2 for each player: the order of the questions and the
// order of each question's four options. The correct letter moves with the
// correct answer, so exit A-D in the maze still matches the right output.
//
// The order is kept in sessionStorage so a reload doesn't reshuffle mid-round.
// PlayerEntry clears it, so the next player on the same PC gets a new order.

const LETTERS = ["A", "B", "C", "D"];
export const ROUND2_ORDER_KEY = "logicMazeOrder";

function shuffledIndexes(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidOrder(order, base) {
  const isPerm = (p, n) => Array.isArray(p) && p.length === n && new Set(p).size === n && p.every((x) => Number.isInteger(x) && x >= 0 && x < n);
  return (
    order &&
    isPerm(order.questions, base.length) &&
    Array.isArray(order.options) &&
    order.options.length === base.length &&
    order.options.every((p, pos) => isPerm(p, base[order.questions[pos]].options.length))
  );
}

function loadOrder(language, base) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(`${ROUND2_ORDER_KEY}:${language}`) || "null");
    if (isValidOrder(saved, base)) return saved;
  } catch {
    /* ignore broken storage */
  }
  const questions = shuffledIndexes(base.length);
  const order = { questions, options: questions.map((qi) => shuffledIndexes(base[qi].options.length)) };
  try {
    sessionStorage.setItem(`${ROUND2_ORDER_KEY}:${language}`, JSON.stringify(order));
  } catch {
    /* storage blocked: still play, just without keeping the order */
  }
  return order;
}

/** Round 2 questions for this player, in a shuffled order with shuffled options. */
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
    for (const lang of ["python", "c"]) sessionStorage.removeItem(`${ROUND2_ORDER_KEY}:${lang}`);
  } catch {
    /* ignore */
  }
}

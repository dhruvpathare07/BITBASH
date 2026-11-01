// Where a player is in each Round 1 question, kept for the session so a
// page refresh carries on where they were, with the same clock, instead of
// starting the question (and its 10 minutes) over.
//
// Keys: bbbDraw:<q> (topic drawn, see TopicSwiper), bbbStage:<q>
// ("assembly" | "debug"), bbbDeadline:<q> (when the 10 minutes end).

export const QUESTION_SECONDS = 600;

const PREFIXES = ["bbbDraw:", "bbbStage:", "bbbDeadline:"];

function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage blocked: the game still works, a refresh just starts over */
  }
}

export function getStage(question) {
  const stage = read(`bbbStage:${question}`);
  return stage === "assembly" || stage === "debug" ? stage : null;
}

export function setStage(question, stage) {
  write(`bbbStage:${question}`, stage);
}

/** When this question's time runs out (ms since epoch); starts the clock on first call. */
export function questionDeadline(question) {
  const saved = Number(read(`bbbDeadline:${question}`));
  if (saved > 0) return saved;
  const deadline = Date.now() + QUESTION_SECONDS * 1000;
  write(`bbbDeadline:${question}`, String(deadline));
  return deadline;
}

/** A new player starts every question fresh. */
export function clearQuestionState() {
  try {
    Object.keys(sessionStorage)
      .filter((key) => PREFIXES.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* nothing to clear */
  }
}

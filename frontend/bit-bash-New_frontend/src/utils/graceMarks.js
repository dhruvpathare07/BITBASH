// Grace marks for the Round 1 debug step.
//
// A question's bugs are the lines of the starting (buggy) code that don't
// match the correct code. Each bug fixed is worth an equal share of the debug
// marks (2 bugs -> 25 each out of 50). There is no negative marking: breaking
// a line that was already right, or adding new mistakes, never costs marks.
//
// Works offline: lines are compared through the same salted fingerprints as
// the offline checker, so the correct code is never needed in the browser.

import { OFFLINE_CHECKER_DATA } from "../data/offlineCheckerData";
import { fingerprint, linesOf, normalizeLine } from "./offlineChecker";

function hashesFor(topic, language) {
  const lang = language === "c" ? "c" : "python";
  return { lang, hashes: OFFLINE_CHECKER_DATA[lang]?.[topic] || null };
}

/**
 * Which correct lines (by index) are present in this code.
 * Same line count -> compared position by position, exactly like the
 * checker. Different count (lines added/removed) -> aligned first, so one
 * extra or missing line doesn't knock out every line after it.
 */
function matchedCorrectLines(topic, code, language) {
  const { lang, hashes } = hashesFor(topic, language);
  if (!hashes) return { matched: new Set(), studentCount: 0, correctCount: 0 };

  const student = linesOf(code).map(normalizeLine);
  const n = student.length;
  const m = hashes.length;
  const same = (j, i) => fingerprint(`${lang}|${topic}|${i}`, student[j]) === hashes[i];
  const matched = new Set();

  if (n === m) {
    for (let i = 0; i < m; i++) if (same(i, i)) matched.add(i);
    return { matched, studentCount: n, correctCount: m };
  }

  // Longest common subsequence of student lines vs correct lines. Several
  // alignments can tie (after normalization, `for i in range(n):` and
  // `for j in range(n):` look the same), so among equal-length ones prefer
  // the alignment that keeps lines closest to their own position.
  const eq = Array.from({ length: n }, (_, j) => Array.from({ length: m }, (_, i) => same(j, i)));
  const better = (a, b) => (a.count !== b.count ? a.count > b.count : a.pen < b.pen);
  const dp = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => ({ count: 0, pen: 0, move: null }))
  );
  for (let j = n - 1; j >= 0; j--) {
    for (let i = m - 1; i >= 0; i--) {
      let best = { count: dp[j + 1][i].count, pen: dp[j + 1][i].pen, move: "skipStudent" };
      const skipCorrect = { count: dp[j][i + 1].count, pen: dp[j][i + 1].pen, move: "skipCorrect" };
      if (better(skipCorrect, best)) best = skipCorrect;
      if (eq[j][i]) {
        const take = { count: dp[j + 1][i + 1].count + 1, pen: dp[j + 1][i + 1].pen + Math.abs(i - j), move: "match" };
        if (better(take, best)) best = take;
      }
      dp[j][i] = best;
    }
  }
  let j = 0;
  let i = 0;
  while (j < n && i < m) {
    const { move } = dp[j][i];
    if (move === "match") {
      matched.add(i);
      j++;
      i++;
    } else if (move === "skipStudent") {
      j++;
    } else {
      i++;
    }
  }
  return { matched, studentCount: n, correctCount: m };
}

/**
 * The bugs in a question's starting code.
 * lines: indexes of correct lines that are wrong or missing in the starting code.
 * extra: lines the starting code has beyond the correct code (to be deleted).
 */
export function findBugs(topic, buggyCode, language) {
  const { matched, studentCount, correctCount } = matchedCorrectLines(topic, buggyCode, language);
  const lines = [];
  for (let i = 0; i < correctCount; i++) if (!matched.has(i)) lines.push(i);
  const extra = Math.max(0, studentCount - correctCount);
  return { lines, extra, total: lines.length + extra };
}

/**
 * How many of the question's bugs this code fixes.
 * Only the original bugs count, so new mistakes elsewhere never reduce it.
 */
export function countFixedBugs(topic, code, language, bugs) {
  if (!bugs || bugs.total === 0) return 0;
  const { matched, studentCount, correctCount } = matchedCorrectLines(topic, code, language);
  const fixedLines = bugs.lines.filter((i) => matched.has(i)).length;
  // extra lines from the starting code count as fixed once they're gone
  const surplus = Math.max(0, studentCount - correctCount);
  const fixedExtra = Math.max(0, bugs.extra - surplus);
  return fixedLines + fixedExtra;
}

/** Marks for a number of fixed bugs: an equal share each, rounded. */
export function graceMarks(fixed, total, maxMarks) {
  if (!total) return 0;
  return Math.round((maxMarks * Math.min(fixed, total)) / total);
}

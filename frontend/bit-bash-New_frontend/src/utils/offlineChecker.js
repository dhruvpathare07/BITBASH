// In-browser version of the backend's line-by-line debug check, used when
// the server can't be reached (e.g. the event network has been cut).
//
// It mirrors check_code_line_by_line() in backend/evaluator.py and
// check_code_line_by_line_c() in backend/c_evaluator.py. The correct code
// is NOT in the bundle: offlineCheckerData.js holds only salted fingerprints
// of each normalized correct line (see backend/build_offline_checker.py).
//
// Difference from the server: the server can also run the code and accept a
// fix that differs line-by-line but produces the right output. Offline we
// can't run code, so the fix must match the reference line by line.

import { OFFLINE_CHECKER_DATA } from "../data/offlineCheckerData";

// Must match normalize() in evaluator.py and build_offline_checker.py
export function normalizeLine(line) {
  return line
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\b[a-z_][a-z0-9_]*\b/g, "var");
}

const encoder = new TextEncoder();

function fnv1a(bytes, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Must match fingerprint() in build_offline_checker.py
function fingerprint(salt, normalized) {
  const bytes = encoder.encode(`${salt}|${normalized}`);
  const a = fnv1a(bytes, 0x811c9dc5).toString(16).padStart(8, "0");
  const b = fnv1a(bytes, (0x01000193 ^ 0x5bd1e995) >>> 0).toString(16).padStart(8, "0");
  return a + b;
}

// Same as the server: strip the whole code, drop blank lines, rstrip each
function linesOf(code) {
  return String(code || "")
    .trim()
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim());
}

export function canCheckOffline(topic, language = "python") {
  return Boolean(OFFLINE_CHECKER_DATA[language === "c" ? "c" : "python"]?.[topic]);
}

/**
 * Returns the same shape the backend's /evaluate sends back
 * (success, finalStatus, progress, message, wrongLines), plus offline: true.
 */
export function checkOffline(topic, code, language = "python") {
  const lang = language === "c" ? "c" : "python";
  const expected = OFFLINE_CHECKER_DATA[lang]?.[topic];

  if (!expected) {
    return {
      success: false,
      finalStatus: "INCORRECT",
      progress: 0,
      message: "This question can't be checked offline. Reconnect and try again.",
      wrongLines: [],
      offline: true,
    };
  }

  const student = linesOf(code);
  let correct = 0;
  const wrongLines = [];

  expected.forEach((hash, i) => {
    const line = student[i];
    if (line !== undefined && fingerprint(`${lang}|${topic}|${i}`, normalizeLine(line)) === hash) {
      correct += 1;
    } else {
      wrongLines.push({
        line: i + 1,
        expected: null,
        errorType: "HINT_LOCKED",
        message: line === undefined ? "Some lines are still incorrect." : "Some issues are still pending to be resolved.",
      });
    }
  });

  const total = expected.length;
  const progress = Math.floor((correct / total) * 100);
  const success = correct === total;

  return {
    success,
    finalStatus: success ? "SUCCESS" : "INCORRECT",
    logicPassed: false,
    progress,
    lineProgress: progress,
    wrongLines: success ? [] : wrongLines,
    message: success
      ? "🎉 All bugs fixed!"
      : `❌ Some lines are still incorrect. (${correct}/${total} fixed)`,
    offline: true,
  };
}

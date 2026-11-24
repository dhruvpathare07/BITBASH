// Slow, "premium" motion for the whole site:
//  1. smooth scrolling: the page glides and eases to a stop (Lenis) instead
//     of jumping on every wheel tick
//  2. scroll reveals: sections fade and slide up as they come into view,
//     one after another
// Both are skipped for people who turn motion off in their system settings.
// The in-game question and maze cards are left alone so play stays snappy.

import Lenis from "lenis";
import "lenis/dist/lenis.css";

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Long ease-out: quick to start, very soft landing
const easeOutExpo = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

export function startSmoothScroll() {
  if (reducedMotion()) return null;
  return new Lenis({
    duration: 1.4,
    easing: easeOutExpo,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    autoRaf: true,
    // let scrollable boxes (code editor, popups, wide tables) scroll themselves
    allowNestedScroll: true,
  });
}

// What slides in. Page sections only, never the live game screens.
const REVEAL_TARGETS = [
  "[data-reveal]",
  // home + player entry
  ".home-content > *",
  ".entry-card",
  // results pages (Round 1 and Round 2)
  ".results-header",
  ".user-info-section",
  ".table-row",
  ".summary-box",
  ".badge-section",
  ".action-buttons",
  ".result-stat",
  // admin
  ".admin-head",
  ".admin-group",
  ".admin-table tbody tr",
].join(",");

const STAGGER_MS = 80;  // delay between neighbours revealing together
const MAX_STAGGER = 8;  // cap, so long lists don't wait forever

export function startReveal() {
  if (reducedMotion() || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  const scan = () => {
    const fresh = [...document.querySelectorAll(REVEAL_TARGETS)].filter(
      (el) => !el.dataset.revealSeen
    );
    fresh.forEach((el) => {
      el.dataset.revealSeen = "1";
      // elements with their own entrance animation keep it
      if (getComputedStyle(el).animationName !== "none") return;
      // stagger among siblings that reveal together
      const siblings = el.parentElement
        ? [...el.parentElement.children].filter((c) => c.matches(REVEAL_TARGETS))
        : [el];
      const order = Math.min(siblings.indexOf(el), MAX_STAGGER);
      el.style.setProperty("--reveal-delay", `${Math.max(0, order) * STAGGER_MS}ms`);
      el.classList.add("reveal");
      observer.observe(el);
    });
  };

  // Pages change without a reload, so look again whenever the DOM changes.
  // This runs before the browser paints, so new sections are hidden before
  // they're ever seen (no flash), and it doesn't wait for animation frames,
  // which a tab opened in the background doesn't get.
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });

  scan();
}

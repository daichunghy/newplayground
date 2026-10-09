/* Original short-burst reflex rules for Đập Chuột Chũi. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_MoleTapModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const HOLES = 9;
  const TARGET_COUNT = 12;
  const MAX_MISSES = 3;
  const WINDOWS = Object.freeze([1150, 980, 820]);
  const finite = Number.isFinite;

  function seedValue(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let hash = 2166136261;
    for (const char of String(seed ?? Date.now())) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return hash || 1;
  }

  function create(options = {}) {
    const seed = seedValue(options.seed);
    let randomState, state;

    function random() {
      randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
      return randomState / 4294967296;
    }

    function nextTarget(previous = -1) {
      const raw = Math.floor(random() * HOLES);
      return previous < 0 || raw !== previous ? raw : (raw + 1 + Math.floor(random() * (HOLES - 1))) % HOLES;
    }

    function reset() {
      randomState = seed;
      state = { status: 'playing', hits: 0, misses: 0, score: 0, streak: 0, bestStreak: 0, target: nextTarget(), elapsed: 0, lastEvent: 'start' };
    }

    function windowMs() {
      if (state.hits % 4 === 3) return [860, 800, 740][Math.min(2, Math.floor(state.hits / 4))];
      return WINDOWS[Math.min(WINDOWS.length - 1, Math.floor(state.hits / 4))];
    }

    function targetKind() { return state.hits % 4 === 3 ? 'gold' : 'normal'; }

    function advanceTarget() {
      state.elapsed = 0;
      state.target = nextTarget(state.target);
    }

    function miss(reason) {
      state.misses++;
      state.streak = 0;
      state.lastEvent = reason;
      if (state.misses >= MAX_MISSES) {
        state.status = 'lost';
        state.target = null;
      } else advanceTarget();
      return { accepted: true, hit: false, reason, status: state.status, hits: state.hits, misses: state.misses, score: state.score };
    }

    reset();

    function view() {
      return {
        status: state.status,
        hits: state.hits,
        targetCount: TARGET_COUNT,
        misses: state.misses,
        maxMisses: MAX_MISSES,
        score: state.score,
        streak: state.streak,
        bestStreak: state.bestStreak,
        multiplier: Math.min(3, 1 + Math.floor(state.streak / 3)),
        target: state.target,
        targetKind: state.target === null ? null : targetKind(),
        targetWindowMs: windowMs(),
        targetTimeLeft: state.target === null ? 0 : Math.max(0, windowMs() - state.elapsed),
        lastEvent: state.lastEvent
      };
    }

    return Object.freeze({
      view,
      whack(index) {
        if (state.status !== 'playing') return { accepted: false, hit: false, status: state.status };
        if (!Number.isInteger(index) || index < 0 || index >= HOLES) return { accepted: false, hit: false, status: state.status };
        if (index !== state.target) return miss('wrong-hole');
        const kind = targetKind();
        state.hits++;
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        const multiplier = Math.min(3, 1 + Math.floor(state.streak / 3));
        const points = 100 * multiplier + (kind === 'gold' ? 200 : 0);
        state.score += points;
        state.lastEvent = 'hit';
        if (state.hits >= TARGET_COUNT) {
          state.status = 'won';
          state.target = null;
        } else advanceTarget();
        return { accepted: true, hit: true, targetKind: kind, points, multiplier, status: state.status, hits: state.hits, misses: state.misses, score: state.score };
      },
      advance(milliseconds) {
        if (!finite(milliseconds) || milliseconds <= 0 || milliseconds > 60000 || state.status !== 'playing') return false;
        let remaining = milliseconds;
        while (state.status === 'playing' && remaining >= Math.max(1, windowMs() - state.elapsed)) {
          remaining -= Math.max(1, windowMs() - state.elapsed);
          miss('timed-out');
        }
        if (state.status === 'playing') state.elapsed += remaining;
        return true;
      },
      pause() {
        if (state.status !== 'playing') return false;
        state.status = 'paused'; state.lastEvent = 'paused'; return true;
      },
      resume() {
        if (state.status !== 'paused') return false;
        state.status = 'playing'; state.lastEvent = 'resume'; return true;
      },
      restart() { reset(); return true; }
    });
  }

  return Object.freeze({ HOLES, TARGET_COUNT, MAX_MISSES, WINDOWS, create });
});

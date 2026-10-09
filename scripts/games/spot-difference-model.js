/* Original visual-search round; normalized targets work at every rendered size. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_SpotDifferenceModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TIME_LIMIT = 90000;
  const MAX_MISSES = 3;
  const HIT_RADIUS = 38; // SVG viewBox pixels; scales with the image on touch screens.
  const TARGETS = Object.freeze([
    Object.freeze({ a: Object.freeze([0.183, 0.2]), b: Object.freeze([0.183, 0.2]), name: 'sun' }),
    Object.freeze({ a: Object.freeze([0.408, 0.25]), b: Object.freeze([0.408, 0.25]), name: 'cloud' }),
    Object.freeze({ a: Object.freeze([0.782, 0.49]), b: Object.freeze([0.782, 0.49]), name: 'window' }),
    Object.freeze({ a: Object.freeze([0.62, 0.6]), b: Object.freeze([0.62, 0.6]), name: 'flag' }),
    Object.freeze({ a: Object.freeze([0.28, 0.79]), b: Object.freeze([0.28, 0.79]), name: 'fish' })
  ]);
  const finite = Number.isFinite;

  function create() {
    let state;
    function reset() {
      state = { status: 'playing', found: Array(TARGETS.length).fill(false), misses: 0, timeLeft: TIME_LIMIT, lastEvent: 'start' };
    }
    function view() {
      return {
        status: state.status, found: state.found.slice(), foundCount: state.found.filter(Boolean).length,
        total: TARGETS.length, misses: state.misses, maxMisses: MAX_MISSES,
        timeLeft: state.timeLeft, lastEvent: state.lastEvent
      };
    }
    reset();
    return Object.freeze({
      view,
      pick(side, x, y) {
        if (state.status !== 'playing' || !['a', 'b'].includes(side)
          || !finite(x) || !finite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
          return { accepted: false, hit: false, status: state.status };
        }
        let match = -1;
        for (let index = 0; index < TARGETS.length; index++) {
          if (state.found[index]) continue;
          const [tx, ty] = TARGETS[index][side];
          const dx = (x - tx) * 600, dy = (y - ty) * 360;
          if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) { match = index; break; }
        }
        if (match >= 0) {
          state.found[match] = true;
          state.lastEvent = 'found';
          if (state.found.every(Boolean)) state.status = 'won';
          return { accepted: true, hit: true, difference: match, status: state.status, foundCount: state.found.filter(Boolean).length };
        }
        // A found spot can be tapped again without wasting a try.
        for (let index = 0; index < TARGETS.length; index++) {
          const [tx, ty] = TARGETS[index][side];
          const dx = (x - tx) * 600, dy = (y - ty) * 360;
          if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) return { accepted: true, hit: false, duplicate: true, status: state.status };
        }
        state.misses++;
        state.lastEvent = 'miss';
        if (state.misses >= MAX_MISSES) { state.status = 'lost'; state.lastEvent = 'too-many-misses'; }
        return { accepted: true, hit: false, status: state.status, misses: state.misses };
      },
      advance(milliseconds) {
        if (!finite(milliseconds) || milliseconds <= 0 || milliseconds > 60000 || state.status !== 'playing') return false;
        state.timeLeft = Math.max(0, state.timeLeft - milliseconds);
        if (state.timeLeft === 0) { state.status = 'lost'; state.lastEvent = 'time'; }
        return true;
      },
      pause() { if (state.status !== 'playing') return false; state.status = 'paused'; state.lastEvent = 'paused'; return true; },
      resume() { if (state.status !== 'paused') return false; state.status = 'playing'; state.lastEvent = 'resume'; return true; },
      restart() { reset(); return true; }
    });
  }

  return Object.freeze({ TIME_LIMIT, MAX_MISSES, HIT_RADIUS, TARGETS, create });
});

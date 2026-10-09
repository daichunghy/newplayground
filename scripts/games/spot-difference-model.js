/* Original three-scene visual-search course; targets use normalized image coordinates. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_SpotDifferenceModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TIME_LIMIT = 150000;
  const MAX_MISSES = 5;
  const HIT_RADIUS = 38; // SVG viewBox pixels; scales with the image on touch screens.
  const SCENES = Object.freeze([
    Object.freeze({
      id: 'coast', name: 'Bờ biển', a: 'assets/spot-the-difference-a.svg', b: 'assets/spot-the-difference-b.svg',
      targets: Object.freeze([
        Object.freeze({ a: Object.freeze([0.183, 0.2]), b: Object.freeze([0.183, 0.2]), name: 'sun' }),
        Object.freeze({ a: Object.freeze([0.408, 0.25]), b: Object.freeze([0.408, 0.25]), name: 'cloud' }),
        Object.freeze({ a: Object.freeze([0.782, 0.49]), b: Object.freeze([0.782, 0.49]), name: 'window' }),
        Object.freeze({ a: Object.freeze([0.62, 0.6]), b: Object.freeze([0.62, 0.6]), name: 'flag' }),
        Object.freeze({ a: Object.freeze([0.28, 0.79]), b: Object.freeze([0.28, 0.79]), name: 'fish' })
      ])
    }),
    Object.freeze({
      id: 'garden', name: 'Vườn mưa', a: 'assets/spot-garden-a.svg', b: 'assets/spot-garden-b.svg',
      targets: Object.freeze([
        Object.freeze({ a: Object.freeze([0.18, 0.2]), b: Object.freeze([0.18, 0.2]), name: 'cloud' }),
        Object.freeze({ a: Object.freeze([0.42, 0.35]), b: Object.freeze([0.42, 0.35]), name: 'bird' }),
        Object.freeze({ a: Object.freeze([0.76, 0.38]), b: Object.freeze([0.76, 0.38]), name: 'flower' }),
        Object.freeze({ a: Object.freeze([0.58, 0.66]), b: Object.freeze([0.58, 0.66]), name: 'can' }),
        Object.freeze({ a: Object.freeze([0.27, 0.82]), b: Object.freeze([0.27, 0.82]), name: 'frog' })
      ])
    }),
    Object.freeze({
      id: 'market', name: 'Chợ hoa', a: 'assets/spot-market-a.svg', b: 'assets/spot-market-b.svg',
      targets: Object.freeze([
        Object.freeze({ a: Object.freeze([0.19, 0.35]), b: Object.freeze([0.19, 0.35]), name: 'awning' }),
        Object.freeze({ a: Object.freeze([0.5, 0.54]), b: Object.freeze([0.5, 0.54]), name: 'sign' }),
        Object.freeze({ a: Object.freeze([0.77, 0.68]), b: Object.freeze([0.77, 0.68]), name: 'vase' }),
        Object.freeze({ a: Object.freeze([0.23, 0.79]), b: Object.freeze([0.23, 0.79]), name: 'basket' }),
        Object.freeze({ a: Object.freeze([0.7, 0.82]), b: Object.freeze([0.7, 0.82]), name: 'cat' })
      ])
    })
  ]);
  const TARGETS = SCENES[0].targets;
  const TOTAL_TARGETS = SCENES.reduce((sum, scene) => sum + scene.targets.length, 0);
  const finite = Number.isFinite;

  function create() {
    let state;
    function reset() {
      state = { status: 'playing', sceneIndex: 0, found: Array(SCENES[0].targets.length).fill(false), misses: 0, timeLeft: TIME_LIMIT, lastEvent: 'start' };
    }
    function overallFoundCount() {
      return state.sceneIndex * SCENES[0].targets.length + state.found.filter(Boolean).length;
    }
    function view() {
      const scene = SCENES[state.sceneIndex];
      return {
        status: state.status, sceneIndex: state.sceneIndex, sceneNumber: state.sceneIndex + 1,
        sceneCount: SCENES.length, sceneName: scene.name, scene,
        found: state.found.slice(), foundCount: state.found.filter(Boolean).length,
        sceneTotal: scene.targets.length, overallFoundCount: overallFoundCount(), totalTargets: TOTAL_TARGETS,
        misses: state.misses, maxMisses: MAX_MISSES, timeLeft: state.timeLeft, lastEvent: state.lastEvent
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
        const targets = SCENES[state.sceneIndex].targets;
        let match = -1;
        for (let index = 0; index < targets.length; index++) {
          if (state.found[index]) continue;
          const [tx, ty] = targets[index][side];
          const dx = (x - tx) * 600, dy = (y - ty) * 360;
          if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) { match = index; break; }
        }
        if (match >= 0) {
          state.found[match] = true;
          state.lastEvent = 'found';
          const sceneComplete = state.found.every(Boolean);
          if (sceneComplete && state.sceneIndex === SCENES.length - 1) state.status = 'won';
          else if (sceneComplete) {
            state.sceneIndex++;
            state.found = Array(SCENES[state.sceneIndex].targets.length).fill(false);
            state.lastEvent = 'scene-clear';
          }
          return {
            accepted: true, hit: true, difference: match, status: state.status,
            sceneComplete, gameComplete: state.status === 'won',
            sceneIndex: state.sceneIndex, sceneName: SCENES[state.sceneIndex].name,
            foundCount: state.found.filter(Boolean).length, overallFoundCount: overallFoundCount()
          };
        }
        // A found spot can be tapped again without wasting a try.
        for (let index = 0; index < targets.length; index++) {
          const [tx, ty] = targets[index][side];
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

  return Object.freeze({ TIME_LIMIT, MAX_MISSES, HIT_RADIUS, SCENES, TARGETS, TOTAL_TARGETS, create });
});

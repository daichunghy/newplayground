/* Deterministic rules for the original Mục Tiêu Bay quick gallery. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BanVitBayModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const WIDTH = 800, HEIGHT = 450, STEP = 20, FLIGHTS = 5;
  const SHOTS_PER_FLIGHT = 3, HIT_RADIUS = 34, FLIGHT_MS = 3200, RESULT_MS = 420;
  const finite = Number.isFinite;
  const clone = value => JSON.parse(JSON.stringify(value));

  function create({ seed = 0x4b17a25d } = {}) {
    let rng = (seed >>> 0) || 0x4b17a25d;
    const rand = () => {
      rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
      return (rng >>> 0) / 4294967296;
    };
    const state = {
      seed: rng >>> 0, status: 'playing', phase: 'flying', index: 0,
      hits: 0, misses: 0, score: 0, shotsLeft: SHOTS_PER_FLIGHT,
      aim: { x: WIDTH / 2, y: HEIGHT / 2 }, target: null,
      elapsed: 0, resultMs: 0, events: []
    };

    function spawn() {
      const side = rand() < .5 ? -1 : 1;
      state.target = {
        x: side < 0 ? 70 : WIDTH - 70,
        y: 155 + rand() * 150,
        baseY: 155 + rand() * 145,
        vx: side * (115 + rand() * 50 + state.index * 8),
        phase: rand() * Math.PI * 2,
        outcome: 'flying'
      };
      state.elapsed = 0;
      state.shotsLeft = SHOTS_PER_FLIGHT;
      state.phase = 'flying';
      state.events.push({ kind: 'flight', number: state.index + 1 });
    }
    spawn();

    function finishFlight(outcome) {
      if (state.phase !== 'flying') return;
      if (outcome === 'hit') {
        state.hits++;
        state.score += 100;
        state.target.outcome = 'hit';
        state.phase = 'hit';
        state.events.push({ kind: 'hit', number: state.index + 1, score: state.score });
      } else {
        state.misses++;
        state.target.outcome = 'miss';
        state.phase = 'miss';
        state.events.push({ kind: outcome === 'escape' ? 'escape' : 'miss', number: state.index + 1 });
      }
      state.resultMs = 0;
    }

    function act(action, value) {
      if (action === 'pause' && state.status === 'playing') {
        state.status = 'paused'; state.events.push({ kind: 'pause' }); return true;
      }
      if (action === 'resume' && state.status === 'paused') {
        state.status = 'playing'; state.events.push({ kind: 'resume' }); return true;
      }
      if (state.status !== 'playing') return false;
      if (action === 'aim') {
        const point = value && typeof value === 'object' ? value : null;
        if (!point || !finite(point.x) || !finite(point.y)) return false;
        state.aim.x = Math.max(0, Math.min(WIDTH, point.x));
        state.aim.y = Math.max(0, Math.min(HEIGHT, point.y));
        return true;
      }
      if (action === 'fire' && state.phase === 'flying' && state.shotsLeft > 0) {
        if (value && typeof value === 'object' && finite(value.x) && finite(value.y)) {
          state.aim.x = Math.max(0, Math.min(WIDTH, value.x));
          state.aim.y = Math.max(0, Math.min(HEIGHT, value.y));
        }
        state.shotsLeft--;
        state.events.push({ kind: 'shot', number: state.index + 1, shotsLeft: state.shotsLeft });
        if (Math.hypot(state.aim.x - state.target.x, state.aim.y - state.target.y) <= HIT_RADIUS) {
          finishFlight('hit');
        } else if (state.shotsLeft === 0) {
          finishFlight('miss');
        }
        return true;
      }
      return false;
    }

    function tick() {
      if (state.status !== 'playing') return;
      if (state.phase === 'flying') {
        state.elapsed += STEP;
        state.target.x += state.target.vx * STEP / 1000;
        if (state.target.x < 34 || state.target.x > WIDTH - 34) state.target.vx *= -1;
        state.target.x = Math.max(34, Math.min(WIDTH - 34, state.target.x));
        state.target.y = state.target.baseY + Math.sin(state.target.phase + state.elapsed / 220) * 25;
        if (state.elapsed >= FLIGHT_MS) finishFlight('escape');
      } else {
        state.resultMs += STEP;
        if (state.resultMs >= RESULT_MS) {
          state.index++;
          if (state.index >= FLIGHTS) {
            state.target = null; state.phase = 'over'; state.status = 'over';
            state.events.push({ kind: 'finish', hits: state.hits, misses: state.misses, score: state.score });
          } else spawn();
        }
      }
    }

    function advance(ms) {
      if (!finite(ms) || ms < 0 || ms > 60000) return [];
      if (state.status === 'playing') {
        state.remainder = (state.remainder || 0) + ms;
        while (state.remainder + 1e-7 >= STEP && state.status === 'playing') {
          state.remainder = Math.max(0, state.remainder - STEP);
          if (state.remainder < 1e-7) state.remainder = 0;
          tick();
        }
      }
      return drain();
    }

    function drain() { const out = state.events; state.events = []; return out; }
    function view() { return clone({ ...state, remaining: Math.max(0, FLIGHTS - state.index), flights: FLIGHTS, shotsPerFlight: SHOTS_PER_FLIGHT }); }
    return { act, advance, drain, view, reset: () => create({ seed: state.seed }) };
  }

  return Object.freeze({ WIDTH, HEIGHT, STEP, FLIGHTS, SHOTS_PER_FLIGHT, HIT_RADIUS, FLIGHT_MS, RESULT_MS, create });
});

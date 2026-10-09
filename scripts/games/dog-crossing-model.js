/* Original, finite traffic-light timing game. No borrowed game code or assets. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_DogCrossingModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DOGS = 5;
  const MAX_MISSES = 3;
  const ROUND_SECONDS = 20;
  const GREEN_SECONDS = 1.55;
  const RED_SECONDS = 1.85;
  const CROSS_SECONDS = 0.62;

  function fresh() {
    return {
      status: 'ready', signal: 'green', signalTime: 0, crossingTime: 0,
      roundTime: ROUND_SECONDS, elapsed: 0, dogsSaved: 0, misses: 0,
      combo: 0, score: 0, lastEvent: 'ready', result: null
    };
  }

  function create() {
    const s = fresh();
    function view() {
      return {
        ...s,
        dogsWaiting: DOGS - s.dogsSaved,
        crossingProgress: s.crossingTime > 0 ? 1 - s.crossingTime / CROSS_SECONDS : 0,
        signalProgress: s.signalTime / (s.signal === 'green' ? GREEN_SECONDS : RED_SECONDS),
        canCross: s.status === 'playing' && s.crossingTime === 0,
        missesLeft: MAX_MISSES - s.misses
      };
    }
    function advance(seconds) {
      if (s.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return view();
      let remaining = Math.min(seconds, 120);
      while (remaining > 1e-8 && s.status === 'playing') {
        const dt = Math.min(1 / 120, remaining);
        remaining -= dt;
        s.elapsed += dt;
        s.roundTime = Math.max(0, s.roundTime - dt);
        if (s.roundTime <= 1e-8) {
          s.roundTime = 0;
          s.status = 'lost'; s.result = 'time'; s.lastEvent = 'time-up'; break;
        }
        // The signal keeps its real cadence while a dog is crossing. A green
        // entry is safe even when the light changes during the animation.
        s.signalTime += dt;
        const phaseLength = s.signal === 'green' ? GREEN_SECONDS : RED_SECONDS;
        if (s.signalTime >= phaseLength - 1e-8) {
          s.signal = s.signal === 'green' ? 'red' : 'green';
          s.signalTime = 0;
        }
        if (s.crossingTime > 0) {
          s.crossingTime = Math.max(0, s.crossingTime - dt);
          if (s.crossingTime === 0) {
            s.dogsSaved++;
            s.combo++;
            s.score += 100 + Math.min(100, (s.combo - 1) * 25);
            s.lastEvent = 'saved';
            if (s.dogsSaved === DOGS) {
              s.score += Math.floor(s.roundTime * 5);
              s.status = 'won'; s.result = 'safe'; s.lastEvent = 'win';
            }
          }
          continue;
        }
      }
      return view();
    }
    return Object.freeze({
      view,
      start() {
        if (s.status !== 'ready') return false;
        s.status = 'playing'; s.lastEvent = 'start'; return true;
      },
      cross() {
        if (s.status !== 'playing' || s.crossingTime > 0) return false;
        if (s.signal === 'green') {
          s.crossingTime = CROSS_SECONDS; s.lastEvent = 'crossing'; return true;
        }
        s.misses++; s.combo = 0; s.lastEvent = 'red-light';
        if (s.misses >= MAX_MISSES) { s.status = 'lost'; s.result = 'struck'; s.lastEvent = 'strike-out'; }
        return true;
      },
      advance,
      pause() { if (s.status !== 'playing') return false; s.status = 'paused'; s.lastEvent = 'pause'; return true; },
      resume() { if (s.status !== 'paused') return false; s.status = 'playing'; s.lastEvent = 'resume'; return true; },
      restart() { Object.assign(s, fresh()); return true; }
    });
  }

  return Object.freeze({ DOGS, MAX_MISSES, ROUND_SECONDS, GREEN_SECONDS, RED_SECONDS, CROSS_SECONDS, create });
});

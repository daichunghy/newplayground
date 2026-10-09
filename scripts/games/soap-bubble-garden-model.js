/* Original breath-control ascent puzzle for Thổi Bong Bóng Xà Phòng. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_SoapBubbleGardenModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WIDTH = 800, HEIGHT = 440;
  const MAX_SECONDS = 24;
  const MAX_CHARGE = 1;
  const POP_CHARGE = 0.96;
  const POP_GRACE = 0.26;
  const CHARGE_RATE = 0.43;
  const LEAK_RATE = 0.23;
  const GATES = Object.freeze([
    Object.freeze({ y: 326, center: 548, halfWidth: 132 }),
    Object.freeze({ y: 224, center: 260, halfWidth: 132 }),
    Object.freeze({ y: 122, center: 540, halfWidth: 132 })
  ]);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function fresh() {
    return {
      status: 'ready', result: null, elapsed: 0, timeLeft: MAX_SECONDS,
      x: 400, y: 408, charge: 0.18, overPressure: 0,
      gatesPassed: 0, score: 0, lastEvent: 'ready', input: { inflate: false, left: false, right: false }
    };
  }

  function create() {
    let s = fresh();
    const radius = () => 22 + s.charge * 18;
    function view() {
      return {
        status: s.status, result: s.result, elapsed: s.elapsed, timeLeft: s.timeLeft,
        x: s.x, y: s.y, charge: s.charge, radius: radius(), overPressure: s.overPressure,
        gates: GATES.map((gate, index) => ({ ...gate, passed: index < s.gatesPassed })),
        gatesPassed: s.gatesPassed, gateCount: GATES.length, score: s.score,
        lastEvent: s.lastEvent, wind: Math.sin(s.elapsed * 0.9) * 6,
        input: { ...s.input }, canMove: s.status === 'playing'
      };
    }

    function lose(reason) {
      if (s.status !== 'playing') return;
      s.status = 'lost'; s.result = reason; s.lastEvent = reason;
      s.input = { inflate: false, left: false, right: false };
    }

    function step(dt) {
      s.elapsed += dt;
      s.timeLeft = Math.max(0, s.timeLeft - dt);
      if (s.timeLeft <= 1e-8) { lose('time'); return; }

      if (s.input.inflate) {
        s.charge = Math.min(MAX_CHARGE, s.charge + CHARGE_RATE * dt);
        s.overPressure = s.charge >= POP_CHARGE ? s.overPressure + dt : 0;
      } else {
        s.charge = Math.max(0, s.charge - LEAK_RATE * dt);
        s.overPressure = 0;
      }
      if (s.overPressure >= POP_GRACE) { lose('overpressure'); return; }

      const horizontal = (Number(s.input.right) - Number(s.input.left)) * 205;
      const oldY = s.y;
      s.x = clamp(s.x + (horizontal + Math.sin(s.elapsed * 0.9) * 6) * dt, 36, WIDTH - 36);
      // A charged bubble rises faster; releasing the breath leaks lift away.
      s.y -= (12 + s.charge * 110) * dt;

      const gate = GATES[s.gatesPassed];
      if (gate && oldY > gate.y && s.y <= gate.y) {
        if (Math.abs(s.x - gate.center) + radius() > gate.halfWidth) { lose('thorns'); return; }
        s.gatesPassed++;
        s.score += 150;
        s.lastEvent = 'gate';
      }
      if (s.gatesPassed === GATES.length && s.y <= 34) {
        s.y = 34;
        s.score += Math.floor(s.timeLeft * 8) + Math.round((1 - s.charge) * 60);
        s.status = 'won'; s.result = 'delivered'; s.lastEvent = 'win';
      }
    }

    return Object.freeze({
      view,
      start() { if (s.status !== 'ready') return false; s.status = 'playing'; s.lastEvent = 'start'; return true; },
      setInput(next = {}) {
        if (s.status !== 'playing' || !next || typeof next !== 'object') return false;
        s.input = { inflate: !!next.inflate, left: !!next.left, right: !!next.right };
        if (s.input.left && s.input.right) { s.input.left = false; s.input.right = false; }
        return true;
      },
      advance(seconds) {
        if (s.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0 || seconds > 2) return false;
        let remaining = seconds;
        while (remaining > 1e-8 && s.status === 'playing') {
          const dt = Math.min(1 / 120, remaining);
          remaining -= dt;
          step(dt);
        }
        return true;
      },
      pause() {
        if (s.status !== 'playing') return false;
        s.status = 'paused'; s.input = { inflate: false, left: false, right: false }; s.lastEvent = 'pause'; return true;
      },
      resume() { if (s.status !== 'paused') return false; s.status = 'playing'; s.lastEvent = 'resume'; return true; },
      restart() { s = fresh(); return true; }
    });
  }

  return Object.freeze({ WIDTH, HEIGHT, MAX_SECONDS, MAX_CHARGE, POP_CHARGE, POP_GRACE, CHARGE_RATE, LEAK_RATE, GATES, create });
});

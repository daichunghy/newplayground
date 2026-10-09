/* Small deterministic physics model for the original Cú Sao Gác Đèn table. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_OrbitPinballModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WIDTH = 420, HEIGHT = 700;
  const BALLS = 3, TARGET_COUNT = 6, BALL_RADIUS = 8;
  const STEP = 1 / 120, GRAVITY = 560, MAX_FRAME = 0.25, MAX_SPEED = 900;
  const WALL_LEFT = 27, WALL_RIGHT = 393, DRAIN_Y = 697;
  const FLIPPER_LENGTH = 72;
  const TARGETS = Object.freeze([
    Object.freeze({ id: 'crown-west', kind: 'bumper', x: 112, y: 157, radius: 24, points: 500 }),
    Object.freeze({ id: 'crown-center', kind: 'bumper', x: 210, y: 211, radius: 25, points: 500 }),
    Object.freeze({ id: 'crown-east', kind: 'bumper', x: 308, y: 157, radius: 24, points: 500 }),
    Object.freeze({ id: 'relay-west', kind: 'plate', x: 94, y: 324, width: 56, height: 16, points: 300 }),
    Object.freeze({ id: 'relay-center', kind: 'plate', x: 210, y: 354, width: 64, height: 16, points: 300 }),
    Object.freeze({ id: 'relay-east', kind: 'plate', x: 326, y: 324, width: 56, height: 16, points: 300 })
  ]);

  function freshState() {
    return {
      status: 'ready', score: 0, ballsLeft: BALLS, targets: Object.fromEntries(TARGETS.map(target => [target.id, false])),
      ball: { x: 366, y: 633, vx: 0, vy: 0 }, flippers: { left: false, right: false },
      ticks: 0, accumulator: 0, lastEvent: 'ready', pausedFrom: null
    };
  }
  function cloneState(source) {
    return {
      status: source.status, score: source.score, ballsLeft: source.ballsLeft,
      targets: Object.fromEntries(TARGETS.map(target => [target.id, Boolean(source.targets?.[target.id])])),
      ball: { x: source.ball.x, y: source.ball.y, vx: source.ball.vx, vy: source.ball.vy },
      flippers: { left: Boolean(source.flippers?.left), right: Boolean(source.flippers?.right) },
      ticks: source.ticks ?? 0, accumulator: source.accumulator ?? 0,
      lastEvent: source.lastEvent ?? 'ready', pausedFrom: source.pausedFrom ?? null
    };
  }
  function validateState(state) {
    if (!state || !['ready', 'playing', 'paused', 'won', 'lost'].includes(state.status)
      || !state.ball || !['x', 'y', 'vx', 'vy'].every(key => Number.isFinite(state.ball[key]))
      || !Number.isSafeInteger(state.score) || state.score < 0
      || !Number.isInteger(state.ballsLeft) || state.ballsLeft < 0 || state.ballsLeft > BALLS
      || !Number.isSafeInteger(state.ticks ?? 0) || (state.ticks ?? 0) < 0
      || !Number.isFinite(state.accumulator ?? 0) || (state.accumulator ?? 0) < 0 || (state.accumulator ?? 0) >= STEP) {
      throw new TypeError('Pinball state is invalid.');
    }
    const next = cloneState(state);
    if ((next.status === 'paused' && !['ready', 'playing'].includes(next.pausedFrom))
      || (next.status !== 'paused' && next.pausedFrom !== null)
      || (['ready', 'playing', 'paused', 'won'].includes(next.status) && next.ballsLeft === 0)
      || (next.status === 'lost' && next.ballsLeft !== 0)
      || (next.status === 'won' && !TARGETS.every(target => next.targets[target.id]))) {
      throw new TypeError('Pinball state is inconsistent.');
    }
    clampSpeed(next.ball);
    return next;
  }
  function clampSpeed(ball) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > MAX_SPEED) { const scale = MAX_SPEED / speed; ball.vx *= scale; ball.vy *= scale; }
  }
  function circleContact(ball, target) {
    const dx = ball.x - target.x, dy = ball.y - target.y;
    const minimum = BALL_RADIUS + target.radius, distance2 = dx * dx + dy * dy;
    if (distance2 >= minimum * minimum) return null;
    const distance = Math.sqrt(distance2);
    if (distance < 1e-8) {
      const incoming = Math.hypot(ball.vx, ball.vy);
      return {
        nx: incoming > 1e-8 ? -ball.vx / incoming : 0,
        ny: incoming > 1e-8 ? -ball.vy / incoming : -1,
        distance: 0, minimum
      };
    }
    return { nx: dx / distance, ny: dy / distance, distance, minimum };
  }
  function plateContact(ball, target) {
    const left = target.x - target.width / 2, right = target.x + target.width / 2;
    const top = target.y - target.height / 2, bottom = target.y + target.height / 2;
    const cx = Math.max(left, Math.min(right, ball.x)), cy = Math.max(top, Math.min(bottom, ball.y));
    let dx = ball.x - cx, dy = ball.y - cy, distance = Math.hypot(dx, dy);
    if (distance >= BALL_RADIUS) return null;
    if (distance < 1e-8) {
      const choices = [
        { d: Math.abs(ball.x - left), nx: -1, ny: 0 }, { d: Math.abs(right - ball.x), nx: 1, ny: 0 },
        { d: Math.abs(ball.y - top), nx: 0, ny: -1 }, { d: Math.abs(bottom - ball.y), nx: 0, ny: 1 }
      ].sort((a, b) => a.d - b.d);
      return { nx: choices[0].nx, ny: choices[0].ny, distance: 0 };
    }
    dx /= distance; dy /= distance;
    return { nx: dx, ny: dy, distance };
  }
  function segmentContact(ball, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((ball.x - a.x) * dx + (ball.y - a.y) * dy) / length2));
    const x = a.x + t * dx, y = a.y + t * dy;
    const nxRaw = ball.x - x, nyRaw = ball.y - y, distance = Math.hypot(nxRaw, nyRaw);
    const clearance = BALL_RADIUS + 6.5;
    if (distance >= clearance) return null;
    if (distance < 1e-8) return { nx: 0, ny: -1, t, distance, clearance };
    return { nx: nxRaw / distance, ny: nyRaw / distance, t, distance, clearance };
  }
  function flipperSegments(flippers) {
    const leftActive = flippers.left, rightActive = flippers.right;
    return [
      { side: 'left', a: { x: 145, y: 614 }, b: { x: leftActive ? 204 : 196, y: leftActive ? 574 : 628 }, active: leftActive },
      { side: 'right', a: { x: 275, y: 614 }, b: { x: rightActive ? 216 : 224, y: rightActive ? 574 : 628 }, active: rightActive }
    ];
  }

  function makeModel(initial = freshState()) {
    let state = validateState(initial);
    const events = [];
    const view = () => ({
      status: state.status, score: state.score, ballsLeft: state.ballsLeft,
      targets: { ...state.targets }, targetHits: TARGETS.filter(target => state.targets[target.id]).length,
      targetCount: TARGET_COUNT, ball: { ...state.ball }, flippers: { ...state.flippers },
      ticks: state.ticks, lastEvent: state.lastEvent, pausedFrom: state.pausedFrom,
      canLaunch: state.status === 'ready', canPause: state.status === 'ready' || state.status === 'playing'
    });
    function markTarget(target) {
      if (!state.targets[target.id]) {
        state.targets[target.id] = true;
        state.score += target.points;
        state.lastEvent = target.kind === 'bumper' ? 'bumper' : 'target';
        events.push({ kind: state.lastEvent, id: target.id, score: state.score });
        if (TARGETS.every(item => state.targets[item.id])) {
          state.status = 'won'; state.lastEvent = 'win'; events.push({ kind: 'win', score: state.score });
        }
      } else {
        state.score += target.kind === 'bumper' ? 100 : 0;
        state.lastEvent = target.kind === 'bumper' ? 'bumper-repeat' : 'target-repeat';
        if (target.kind === 'bumper') events.push({ kind: 'bumper-repeat', id: target.id, score: state.score });
      }
    }
    function collideTargets() {
      for (const target of TARGETS) {
        const contact = target.kind === 'bumper' ? circleContact(state.ball, target) : plateContact(state.ball, target);
        if (!contact) continue;
        let { nx, ny } = contact;
        const dot = state.ball.vx * nx + state.ball.vy * ny;
        if (dot < 0) { state.ball.vx -= 1.94 * dot * nx; state.ball.vy -= 1.94 * dot * ny; }
        if (target.kind === 'bumper') {
          state.ball.vx += nx * 115; state.ball.vy += ny * 115;
          const speed = Math.hypot(state.ball.vx, state.ball.vy);
          if (speed < 360) { state.ball.vx += nx * 125; state.ball.vy += ny * 125; }
          state.ball.x = target.x + nx * (contact.minimum + 0.25);
          state.ball.y = target.y + ny * (contact.minimum + 0.25);
        } else {
          state.ball.vx += nx * 35; state.ball.vy += ny * 35;
          state.ball.x += nx * Math.max(0, BALL_RADIUS - contact.distance + 0.25);
          state.ball.y += ny * Math.max(0, BALL_RADIUS - contact.distance + 0.25);
        }
        markTarget(target); clampSpeed(state.ball); return;
      }
    }
    function collideFlippers() {
      for (const flipper of flipperSegments(state.flippers)) {
        const contact = segmentContact(state.ball, flipper.a, flipper.b);
        if (!contact || state.ball.vy < -20 || (!flipper.active && state.ball.vy < 20)) continue;
        const sideSign = flipper.side === 'left' ? 1 : -1;
        const offset = (contact.t - 0.5) * 2;
        const normalY = Math.min(-0.48, contact.ny);
        state.ball.vy = -Math.max(flipper.active ? 430 : 260, Math.abs(state.ball.vy) * (flipper.active ? 0.9 : 0.56));
        state.ball.vx = state.ball.vx * 0.42 + sideSign * (flipper.active ? 105 : 35) + offset * (flipper.active ? 170 : 85);
        state.ball.y -= Math.max(0, BALL_RADIUS + 4 - contact.distance) * Math.max(0.5, -normalY);
        state.lastEvent = 'flip'; events.push({ kind: 'flipper', side: flipper.side });
        clampSpeed(state.ball);
        return;
      }
    }
    function drainBall() {
      state.ballsLeft = Math.max(0, state.ballsLeft - 1);
      state.flippers.left = false; state.flippers.right = false;
      if (state.ballsLeft === 0) {
        state.status = 'lost'; state.lastEvent = 'loss'; events.push({ kind: 'loss', score: state.score });
      } else {
        state.status = 'ready'; state.ball = { x: 366, y: 633, vx: 0, vy: 0 };
        state.lastEvent = 'drain'; events.push({ kind: 'drain', ballsLeft: state.ballsLeft });
      }
    }
    function tick() {
      if (state.status !== 'playing') return;
      state.ticks++;
      const ball = state.ball, dt = STEP;
      ball.vy += GRAVITY * dt;
      ball.vx *= 0.9994;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < WALL_LEFT + BALL_RADIUS) { ball.x = WALL_LEFT + BALL_RADIUS; ball.vx = Math.abs(ball.vx) * 0.88; }
      else if (ball.x > WALL_RIGHT - BALL_RADIUS) { ball.x = WALL_RIGHT - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) * 0.88; }
      if (ball.y < 42 + BALL_RADIUS) { ball.y = 42 + BALL_RADIUS; ball.vy = Math.abs(ball.vy) * 0.82; }
      collideTargets();
      if (state.status !== 'playing') return;
      collideFlippers();
      if (state.status === 'playing' && ball.y > DRAIN_Y) drainBall();
      clampSpeed(state.ball);
    }
    return Object.freeze({
      view,
      serialize: () => cloneState(state),
      launch() {
        if (state.status !== 'ready' || state.ballsLeft <= 0) return false;
        state.ball = { x: 366, y: 633, vx: -142, vy: -740 };
        state.status = 'playing'; state.lastEvent = 'launch';
        events.push({ kind: 'launch' }); return true;
      },
      setFlipper(side, down) {
        if (!['left', 'right'].includes(side) || typeof down !== 'boolean' || !['ready', 'playing'].includes(state.status)) return false;
        state.flippers[side] = down; return true;
      },
      advance(seconds) {
        events.length = 0;
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_FRAME || state.status !== 'playing') return [];
        state.accumulator += seconds;
        let guard = 0;
        while (state.accumulator + 1e-12 >= STEP && state.status === 'playing' && guard < 40) {
          state.accumulator -= STEP;
          if (Math.abs(state.accumulator) < 1e-12) state.accumulator = 0;
          tick(); guard++;
        }
        return events.map(event => ({ ...event }));
      },
      pause() {
        if (!['ready', 'playing'].includes(state.status)) return false;
        state.pausedFrom = state.status; state.status = 'paused'; state.flippers.left = false; state.flippers.right = false;
        state.lastEvent = 'pause'; return true;
      },
      resume() {
        if (state.status !== 'paused') return false;
        state.status = state.pausedFrom || 'ready'; state.pausedFrom = null; state.lastEvent = 'resume'; return true;
      },
      restart() { state = freshState(); events.length = 0; return true; }
    });
  }

  return Object.freeze({
    WIDTH, HEIGHT, BALLS, TARGET_COUNT, BALL_RADIUS, STEP, GRAVITY, MAX_FRAME, MAX_SPEED,
    WALL_LEFT, WALL_RIGHT, DRAIN_Y, FLIPPER_LENGTH, TARGETS, initialState: freshState,
    create: () => makeModel(freshState()), makeModel
  });
});

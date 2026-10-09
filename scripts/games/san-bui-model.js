/* Deterministic throwing-and-toppling rules for the original Sân Bụi campaign. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_SanBuiModel = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const WIDTH = 760, HEIGHT = 430, STEP_MS = 16;
  const FLOOR = 352, LAUNCH_X = 94, LAUNCH_Y = FLOOR - 14;
  const CAN_W = 30, CAN_H = 26, BALL_R = 10, GRAVITY = 0.18;
  const MIN_ANGLE = 10, MAX_ANGLE = 70, MIN_POWER = 35, MAX_POWER = 100;
  const MAX_FLIGHT_STEPS = 125, MAX_SETTLE_MS = 2400;
  const STAGES = Object.freeze([
    Object.freeze({ id: 'dua-bui', name: 'Vạt nắng', rows: 3, goal: 3, throws: 3 }),
    Object.freeze({ id: 'ben-ngoai', name: 'Góc sân', rows: 4, goal: 6, throws: 3 }),
    Object.freeze({ id: 'cuoi-san', name: 'Cuối sân', rows: 5, goal: 10, throws: 3 })
  ]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clone = value => JSON.parse(JSON.stringify(value));

  function create({ seed = 0x5a6b017 } = {}) {
    let rng = (Number(seed) >>> 0) || 0x5a6b017;
    const random = () => {
      rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
      return (rng >>> 0) / 4294967296;
    };
    let remainder = 0;
    let events = [];
    let resumeStatus = 'playing';
    const state = {
      seed: rng >>> 0, status: 'playing', phase: 'aiming', stageIndex: 0,
      angle: 25, power: 72, score: 0, throwsLeft: STAGES[0].throws,
      throwsUsed: 0, totalThrows: 0, knocked: 0, cans: [], ball: null,
      targetCenter: 0, flightSteps: 0, settleMs: 0, quietSteps: 0
    };

    function buildCans(stageIndex) {
      const stage = STAGES[stageIndex];
      state.targetCenter = 520 + Math.round((random() - 0.5) * 18);
      state.cans = [];
      for (let row = 0; row < stage.rows; row++) {
        const count = stage.rows - row;
        const gap = CAN_W + 2;
        const left = state.targetCenter - ((count - 1) * gap) / 2;
        for (let col = 0; col < count; col++) {
          const homeX = left + col * gap;
          const homeY = FLOOR - CAN_H / 2 - row * CAN_H;
          state.cans.push({
            id: state.cans.length, row, col, x: homeX, y: homeY, homeX, homeY,
            vx: 0, vy: 0, spin: 0, active: false, knocked: false,
            tint: Math.floor(random() * 4)
          });
        }
      }
      state.knocked = 0;
      state.throwsLeft = stage.throws;
      state.throwsUsed = 0;
      state.phase = 'aiming';
      state.ball = null;
      state.flightSteps = 0;
      state.settleMs = 0;
      state.quietSteps = 0;
    }
    buildCans(0);

    function canAct() { return state.status === 'playing' && state.phase === 'aiming'; }
    function setAim(value) {
      if (state.status !== 'playing' || state.phase !== 'aiming' || !Number.isFinite(value)) return false;
      const angle = clamp(Math.round(value), MIN_ANGLE, MAX_ANGLE);
      if (angle === state.angle) return false;
      state.angle = angle; events.push({ kind: 'aim', angle }); return true;
    }
    function adjustAim(delta) { return Number.isFinite(delta) && setAim(state.angle + delta); }
    function setPower(value) {
      if (state.status !== 'playing' || state.phase !== 'aiming' || !Number.isFinite(value)) return false;
      const power = clamp(Math.round(value), MIN_POWER, MAX_POWER);
      if (power === state.power) return false;
      state.power = power; events.push({ kind: 'power', power }); return true;
    }
    function adjustPower(delta) { return Number.isFinite(delta) && setPower(state.power + delta); }

    function throwBall() {
      if (!canAct() || state.throwsLeft <= 0) return false;
      const radians = state.angle * Math.PI / 180;
      const speed = 7 + (state.power - MIN_POWER) * 0.09;
      state.ball = {
        x: LAUNCH_X, y: LAUNCH_Y,
        vx: Math.cos(radians) * speed,
        vy: -Math.sin(radians) * speed,
        hit: [], age: 0
      };
      state.throwsLeft--; state.throwsUsed++; state.totalThrows++; state.flightSteps = 0;
      state.phase = 'flight'; state.settleMs = 0; state.quietSteps = 0;
      events.push({ kind: 'throw', angle: state.angle, power: state.power, remaining: state.throwsLeft });
      return true;
    }

    function hitCan(can, ball) {
      if (ball.hit.includes(can.id)) return false;
      const left = can.x - CAN_W / 2, right = can.x + CAN_W / 2;
      const top = can.y - CAN_H / 2, bottom = can.y + CAN_H / 2;
      const nearestX = clamp(ball.x, left, right), nearestY = clamp(ball.y, top, bottom);
      return ((ball.x - nearestX) ** 2 + (ball.y - nearestY) ** 2) <= BALL_R ** 2;
    }
    function markKnocked(can) {
      if (can.knocked) return;
      can.knocked = true; state.knocked++; state.score += 100;
      events.push({ kind: 'knock', canId: can.id, count: state.knocked, score: state.score });
    }
    function activateCan(can, vx, vy, spin = 0) {
      can.active = true;
      can.vx = clamp(can.vx + vx, -7, 7);
      can.vy = clamp(can.vy + vy, -7, 5);
      can.spin = clamp(can.spin + spin, -1.2, 1.2);
    }
    function bumpNearby(cans) {
      for (const moving of cans) {
        if (!moving.active) continue;
        for (const other of cans) {
          if (other === moving || other.active) continue;
          if (Math.abs(moving.x - other.x) < CAN_W * 0.77 && Math.abs(moving.y - other.y) < CAN_H * 0.96) {
            const direction = Math.sign(other.x - moving.x) || (moving.vx >= 0 ? 1 : -1);
            activateCan(other, moving.vx * 0.26 + direction * 0.7, Math.min(-0.6, moving.vy * 0.18 - 0.55), direction * 0.18);
          }
        }
      }
    }
    function stepCans() {
      let moving = false;
      for (const can of state.cans) {
        if (!can.active) continue;
        can.vy += GRAVITY;
        can.x += can.vx; can.y += can.vy; can.spin += can.vx * 0.012;
        can.vx *= 0.985; can.spin *= 0.995;
        if (can.y + CAN_H / 2 >= FLOOR) {
          can.y = FLOOR - CAN_H / 2;
          if (can.vy > 0.95) can.vy *= -0.17; else can.vy = 0;
          can.vx *= 0.74; can.spin *= 0.7;
        }
        if (Math.abs(can.x - can.homeX) >= CAN_W * 0.68 || can.y < can.homeY - CAN_H * 0.65) markKnocked(can);
        if (Math.hypot(can.vx, can.vy) < 0.16 && Math.abs(can.spin) < 0.025) {
          can.vx = 0; can.vy = 0; can.spin = 0;
        } else moving = true;
      }
      bumpNearby(state.cans);
      return moving || state.cans.some(can => can.active && (can.vx !== 0 || can.vy !== 0));
    }

    function resolveThrow() {
      const stage = STAGES[state.stageIndex];
      if (state.knocked >= stage.goal) {
        events.push({ kind: 'stage-clear', stageIndex: state.stageIndex, knocked: state.knocked });
        if (state.stageIndex === STAGES.length - 1) {
          state.status = 'won'; state.phase = 'result'; events.push({ kind: 'won', score: state.score });
        } else {
          state.stageIndex++; buildCans(state.stageIndex);
        }
      } else if (state.throwsLeft === 0) {
        state.status = 'lost'; state.phase = 'result';
        events.push({ kind: 'lost', stageIndex: state.stageIndex, knocked: state.knocked, goal: stage.goal });
      } else {
        state.phase = 'aiming'; state.ball = null; state.flightSteps = 0;
        events.push({ kind: 'ready', stageIndex: state.stageIndex, knocked: state.knocked, remaining: state.throwsLeft });
      }
    }

    function tick() {
      if (state.status !== 'playing') return;
      let didHit = false;
      if (state.phase === 'flight' && state.ball) {
        const ball = state.ball;
        ball.x += ball.vx; ball.y += ball.vy; ball.vy += GRAVITY; ball.age++;
        state.flightSteps++;
        for (const can of state.cans) {
          if (hitCan(can, ball)) {
            ball.hit.push(can.id);
            activateCan(can, ball.vx * 0.48, Math.min(-0.8, ball.vy * 0.11 - 0.8), Math.sign(ball.vx) * 0.24);
            ball.vx *= 0.78;
            ball.vy = Math.min(ball.vy, -1.25);
            events.push({ kind: 'impact', canId: can.id });
            didHit = true;
            break;
          }
        }
        if (ball.y + BALL_R >= FLOOR || ball.x > WIDTH - BALL_R || ball.x < 0 || ball.age >= MAX_FLIGHT_STEPS) {
          if (!didHit) events.push({ kind: 'land', hitCount: ball.hit.length });
          else events.push({ kind: 'land', hitCount: ball.hit.length });
          state.ball = null; state.phase = 'settling'; state.settleMs = 0; state.quietSteps = 0;
        }
      }
      if (state.phase === 'settling') {
        state.settleMs += STEP_MS;
        const moving = stepCans();
        state.quietSteps = moving ? 0 : state.quietSteps + 1;
        if (state.quietSteps >= 12 || state.settleMs >= MAX_SETTLE_MS) resolveThrow();
      }
    }
    function advance(ms) {
      if (state.status !== 'playing' || !Number.isFinite(ms) || ms < 0 || ms > 30000) return [];
      remainder += ms;
      while (remainder >= STEP_MS && state.status === 'playing') { remainder -= STEP_MS; tick(); }
      return events.splice(0);
    }
    function pause() {
      if (state.status !== 'playing') return false;
      resumeStatus = state.status; state.status = 'paused'; events.push({ kind: 'pause' }); return true;
    }
    function resume() {
      if (state.status !== 'paused') return false;
      state.status = resumeStatus; events.push({ kind: 'resume' }); return true;
    }
    function preview() {
      const radians = state.angle * Math.PI / 180;
      const speed = 7 + (state.power - MIN_POWER) * 0.09;
      let x = LAUNCH_X, y = LAUNCH_Y, vx = Math.cos(radians) * speed, vy = -Math.sin(radians) * speed;
      const points = [];
      for (let i = 0; i < 68; i++) {
        x += vx; y += vy; vy += GRAVITY;
        if (i % 8 === 0) points.push({ x, y });
        if (x > WIDTH - 8 || y >= FLOOR) break;
      }
      return points;
    }
    function view() {
      const stage = STAGES[state.stageIndex];
      return {
        ...clone(state), width: WIDTH, height: HEIGHT, floor: FLOOR,
        launch: { x: LAUNCH_X, y: LAUNCH_Y }, ballRadius: BALL_R,
        canSize: { width: CAN_W, height: CAN_H }, gravity: GRAVITY,
        goal: stage.goal, stage: { ...stage }, stages: STAGES.map(item => ({ ...item })),
        cansLeft: state.cans.length - state.knocked, trajectory: preview()
      };
    }
    return { setAim, adjustAim, setPower, adjustPower, throwBall, advance, pause, resume, view,
      serialize: () => clone(state) };
  }

  return { WIDTH, HEIGHT, STEP_MS, FLOOR, LAUNCH_X, LAUNCH_Y, CAN_W, CAN_H, BALL_R, GRAVITY,
    MIN_ANGLE, MAX_ANGLE, MIN_POWER, MAX_POWER, MAX_FLIGHT_STEPS, MAX_SETTLE_MS, STAGES, create };
});

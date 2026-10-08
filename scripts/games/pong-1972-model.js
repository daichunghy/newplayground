/* Original local two-player table-tennis rules. Fixed-step and renderer-free. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_Pong1972Model = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const WIDTH = 800, HEIGHT = 460, STEP_MS = 1000 / 120;
  const BALL_RADIUS = 7, PADDLE_WIDTH = 13, PADDLE_HEIGHT = 88;
  const LEFT_X = 38, RIGHT_X = WIDTH - LEFT_X - PADDLE_WIDTH;
  const PADDLE_SPEED = 470, START_SPEED = 365, MAX_SPEED = 555;
  const WIN_SCORE = 7, SERVE_MS = 620, CPU_SPEED = 235, CPU_DEADBAND = 18;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = Number.isFinite;
  const clone = value => JSON.parse(JSON.stringify(value));
  const validSide = side => side === 'left' || side === 'right';

  function initialState(mode = 'solo') {
    if (!['solo', 'versus'].includes(mode)) throw new RangeError('Invalid Pong mode');
    const middle = HEIGHT / 2;
    return {
      version: 1, mode, status: 'serve', pausedStatus: null, ticks: 0, remainder: 0,
      score: { left: 0, right: 0 }, winner: null, serveTimer: SERVE_MS,
      serveDirection: mode === 'solo' ? -1 : 1, serveCount: 0,
      paddles: {
        left: { x: LEFT_X, y: middle, axis: 0, targetY: null },
        right: { x: RIGHT_X, y: middle, axis: 0, targetY: null }
      },
      ball: { x: WIDTH / 2, y: middle, vx: 0, vy: 0, radius: BALL_RADIUS }
    };
  }

  function create(mode = 'solo') { return makeModel(initialState(mode)); }

  function makeModel(initial) {
    const state = clone(initial || initialState());
    let events = [];
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });

    function clearInput() {
      for (const paddle of Object.values(state.paddles)) {
        paddle.axis = 0;
        paddle.targetY = null;
      }
    }

    function resetBall(direction) {
      state.ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, radius: BALL_RADIUS };
      state.serveDirection = direction;
      state.serveTimer = SERVE_MS;
      state.serveCount += 1;
      state.status = 'serve';
      state.pausedStatus = null;
      emit('serve-ready', { direction });
    }

    function launchServe() {
      if (state.status !== 'serve') return;
      const angles = [0.22, -0.31, 0.14, -0.25, 0.34, -0.17];
      const angle = angles[state.serveCount % angles.length];
      const speed = START_SPEED + Math.min(40, state.serveCount * 4);
      state.ball.vx = state.serveDirection * speed * Math.cos(angle);
      state.ball.vy = speed * Math.sin(angle);
      state.status = 'playing';
      emit('serve', { direction: state.serveDirection, angle });
    }

    function movePaddle(side, dt) {
      const paddle = state.paddles[side];
      const half = PADDLE_HEIGHT / 2;
      if (paddle.targetY !== null) {
        const distance = paddle.targetY - paddle.y, amount = PADDLE_SPEED * dt;
        paddle.y = Math.abs(distance) <= amount ? paddle.targetY : paddle.y + Math.sign(distance) * amount;
        if (paddle.y === paddle.targetY) paddle.targetY = null;
      } else {
        paddle.y += paddle.axis * PADDLE_SPEED * dt;
      }
      paddle.y = clamp(paddle.y, half, HEIGHT - half);
    }

    function moveCpu(dt) {
      const paddle = state.paddles.right;
      const target = state.status === 'playing' && state.ball.vx > 0 ? state.ball.y : HEIGHT / 2;
      const distance = target - paddle.y;
      if (Math.abs(distance) > CPU_DEADBAND) {
        paddle.y += Math.sign(distance) * Math.min(Math.abs(distance), CPU_SPEED * dt);
      }
      paddle.y = clamp(paddle.y, PADDLE_HEIGHT / 2, HEIGHT - PADDLE_HEIGHT / 2);
      paddle.axis = 0;
      paddle.targetY = null;
    }

    function scorePoint(side) {
      if (state.status !== 'playing') return;
      state.score[side] += 1;
      emit('point', { scorer: side, score: clone(state.score) });
      clearInput();
      if (state.score[side] >= WIN_SCORE) {
        state.status = 'won';
        state.winner = side;
        state.ball.vx = 0; state.ball.vy = 0;
        emit('match-won', { winner: side, score: clone(state.score) });
        return;
      }
      // The next serve heads toward the player who just missed.
      resetBall(side === 'left' ? 1 : -1);
    }

    function rebound(side) {
      const ball = state.ball, paddle = state.paddles[side];
      const offset = clamp((ball.y - paddle.y) / (PADDLE_HEIGHT / 2), -1, 1);
      const angle = clamp(offset * 1.02 + paddle.axis * 0.055, -1.05, 1.05);
      const oldSpeed = Math.hypot(ball.vx, ball.vy);
      const speed = Math.min(MAX_SPEED, oldSpeed * 1.035 + 8);
      const direction = side === 'left' ? 1 : -1;
      ball.vx = direction * speed * Math.cos(angle);
      ball.vy = speed * Math.sin(angle);
      ball.x = side === 'left'
        ? paddle.x + PADDLE_WIDTH + BALL_RADIUS
        : paddle.x - BALL_RADIUS;
      emit('paddle-hit', { side, offset, speed });
    }

    function tick() {
      if (state.status === 'paused' || state.status === 'won') return;
      state.ticks += 1;
      const dt = STEP_MS / 1000;
      movePaddle('left', dt);
      if (state.mode === 'solo') moveCpu(dt);
      else movePaddle('right', dt);

      if (state.status === 'serve') {
        state.serveTimer = Math.max(0, state.serveTimer - STEP_MS);
        if (state.serveTimer <= 0) launchServe();
        return;
      }
      if (state.status !== 'playing') return;

      const ball = state.ball, previousX = ball.x;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS; ball.vy = Math.abs(ball.vy); emit('wall-hit', { edge: 'top' });
      } else if (ball.y + BALL_RADIUS >= HEIGHT) {
        ball.y = HEIGHT - BALL_RADIUS; ball.vy = -Math.abs(ball.vy); emit('wall-hit', { edge: 'bottom' });
      }

      const left = state.paddles.left, right = state.paddles.right;
      if (ball.vx < 0 && previousX - BALL_RADIUS >= left.x + PADDLE_WIDTH && ball.x - BALL_RADIUS <= left.x + PADDLE_WIDTH) {
        if (Math.abs(ball.y - left.y) <= PADDLE_HEIGHT / 2 + BALL_RADIUS) rebound('left');
      } else if (ball.vx > 0 && previousX + BALL_RADIUS <= right.x && ball.x + BALL_RADIUS >= right.x) {
        if (Math.abs(ball.y - right.y) <= PADDLE_HEIGHT / 2 + BALL_RADIUS) rebound('right');
      }

      if (ball.x + BALL_RADIUS < 0) scorePoint('right');
      else if (ball.x - BALL_RADIUS > WIDTH) scorePoint('left');
    }

    function advance(elapsedMs) {
      if (!finite(elapsedMs) || elapsedMs < 0 || elapsedMs > 30000 || state.status === 'paused') return [];
      state.remainder += elapsedMs;
      while (state.remainder + 1e-8 >= STEP_MS) {
        state.remainder -= STEP_MS;
        tick();
        if (state.status === 'won' || state.status === 'paused') { state.remainder = 0; break; }
      }
      const emitted = events;
      events = [];
      return emitted;
    }

    function setAxis(side, axis) {
      if (!validSide(side) || !finite(axis)) return false;
      if (state.mode === 'solo' && side === 'right') return false;
      state.paddles[side].axis = clamp(Math.trunc(axis), -1, 1);
      return true;
    }

    function setTarget(side, y) {
      if (!validSide(side) || !finite(y)) return false;
      if (state.mode === 'solo' && side === 'right') return false;
      state.paddles[side].targetY = clamp(y, PADDLE_HEIGHT / 2, HEIGHT - PADDLE_HEIGHT / 2);
      return true;
    }

    function releaseTarget(side) {
      if (!validSide(side)) return false;
      state.paddles[side].targetY = null;
      return true;
    }

    function pause() {
      if (state.status === 'paused' || state.status === 'won') return false;
      state.pausedStatus = state.status;
      state.status = 'paused';
      state.remainder = 0;
      clearInput();
      emit('pause');
      return true;
    }

    function resume() {
      if (state.status !== 'paused') return false;
      state.status = state.pausedStatus || 'serve';
      state.pausedStatus = null;
      state.remainder = 0;
      emit('resume');
      return true;
    }

    function setMode(mode) {
      if (!['solo', 'versus'].includes(mode)) return false;
      if (state.mode === mode) return true;
      const fresh = initialState(mode);
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, fresh);
      events = [];
      return true;
    }

    function reset() {
      const fresh = initialState(state.mode);
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, fresh);
      events = [];
      return true;
    }

    return {
      advance, setAxis, setTarget, releaseTarget, pause, resume, reset, setMode,
      drain() { const result = events; events = []; return result; },
      view() { return clone({
        width: WIDTH, height: HEIGHT, mode: state.mode, status: state.status, ticks: state.ticks,
        score: state.score, winner: state.winner, serveTimer: state.serveTimer,
        serveDirection: state.serveDirection, paddles: state.paddles, ball: state.ball
      }); },
      serialize() { return clone(state); }
    };
  }

  return Object.freeze({ WIDTH, HEIGHT, STEP_MS, BALL_RADIUS, PADDLE_WIDTH, PADDLE_HEIGHT,
    LEFT_X, RIGHT_X, PADDLE_SPEED, CPU_SPEED, CPU_DEADBAND, START_SPEED, MAX_SPEED, WIN_SCORE, SERVE_MS, create });
});

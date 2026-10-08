/* Original paddle-and-ball rules for Phá Gạch. Fixed-step and renderer-free. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_DxBallModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const WIDTH = 720, HEIGHT = 480, STEP = 1000 / 120, MAX_LIVES = 3;
  const BALL_RADIUS = 7, START_SPEED = 300, SPEED_PER_LEVEL = 12, MAX_SPEED = 420;
  const PADDLE_WIDTH = 104, PADDLE_HEIGHT = 13, PADDLE_Y = 431, PADDLE_SPEED = 470;
  const BRICK_ROWS = 6, BRICK_COLS = 10, BRICK_WIDTH = 58, BRICK_HEIGHT = 18, BRICK_GAP_X = 7, BRICK_GAP_Y = 8, BRICK_TOP = 70;
  const PALETTE = ['#fb7185', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'];
  const CAMPAIGN = Object.freeze([
    Object.freeze({ name: 'Vòm Sáng', rows: Object.freeze(['...####...', '..######..', '.########.', '##########', '##########']) }),
    Object.freeze({ name: 'Dải Gió', rows: Object.freeze(['##.##.##.#', '.##.##.##.', '##.##.##.#', '.##.##.##.', '##########']) }),
    Object.freeze({ name: 'Đảo Gạch', rows: Object.freeze(['##..##..##', '##..##..##', '..######..', '..######..', '##..##..##', '##..##..##']) }),
    Object.freeze({ name: 'Lõi Bền', rows: Object.freeze(['..##22##..', '.########.', '##..##..##', '#.2####2.#', '##########', '..##22##..']) })
  ]);
  if (CAMPAIGN.some(stage => stage.rows.some(row => row.length !== BRICK_COLS || /[^.#2]/.test(row)))) {
    throw new Error('Invalid Phá Gạch campaign field');
  }
  const finite = Number.isFinite;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const clone = value => JSON.parse(JSON.stringify(value));
  const brickLeft = (WIDTH - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP_X)) / 2;

  function levelBricks(level) {
    const stage = CAMPAIGN[level - 1];
    if (!stage) return [];
    const bricks = [];
    for (let row = 0; row < stage.rows.length; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const mark = stage.rows[row][col];
        if (mark === '.') continue;
        bricks.push({
          id: row * BRICK_COLS + col,
          row, col,
          x: brickLeft + col * (BRICK_WIDTH + BRICK_GAP_X),
          y: BRICK_TOP + row * (BRICK_HEIGHT + BRICK_GAP_Y),
          width: BRICK_WIDTH, height: BRICK_HEIGHT,
          color: (row + col + level - 1) % PALETTE.length,
          maxHits: mark === '2' ? 2 : 1,
          hits: mark === '2' ? 2 : 1
        });
      }
    }
    return bricks;
  }

  function initialState() {
    return {
      version: 1, status: 'ready', pausedStatus: null, ticks: 0, remainder: 0,
      score: 0, level: 1, lives: MAX_LIVES,
      paddle: { x: WIDTH / 2, axis: 0, targetX: null },
      ball: { x: WIDTH / 2, y: PADDLE_Y - 19, vx: 0, vy: 0, radius: BALL_RADIUS },
      bricks: levelBricks(1)
    };
  }

  function create() { return makeModel(initialState()); }

  function makeModel(initial) {
    const state = clone(initial || initialState());
    let events = [];
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });
    const speed = () => Math.min(MAX_SPEED, START_SPEED + (state.level - 1) * SPEED_PER_LEVEL);
    const serve = () => {
      state.ball = { x: state.paddle.x, y: PADDLE_Y - BALL_RADIUS - 12, vx: 0, vy: 0, radius: BALL_RADIUS };
      state.status = 'ready';
      state.pausedStatus = null;
    };
    const reset = () => makeModel(initialState());
    const launch = () => {
      if (state.status !== 'ready') return false;
      const magnitude = speed(), vx = magnitude * 0.6;
      state.status = 'playing';
      state.ball.vx = (state.level % 2 ? vx : -vx);
      state.ball.vy = -Math.sqrt(magnitude * magnitude - vx * vx);
      emit('launch', { level: state.level });
      return true;
    };
    const pause = () => {
      if (state.status !== 'ready' && state.status !== 'playing') return false;
      state.pausedStatus = state.status;
      state.status = 'paused';
      emit('pause');
      return true;
    };
    const resume = () => {
      if (state.status !== 'paused') return false;
      state.status = state.pausedStatus || 'ready';
      state.pausedStatus = null;
      emit('resume');
      return true;
    };
    const setAxis = axis => { state.paddle.axis = clamp(Math.trunc(axis) || 0, -1, 1); };
    const setTarget = x => { state.paddle.targetX = finite(x) ? clamp(x, PADDLE_WIDTH / 2, WIDTH - PADDLE_WIDTH / 2) : null; };
    const releaseTarget = () => { state.paddle.targetX = null; };

    function movePaddle(dt) {
      const p = state.paddle, half = PADDLE_WIDTH / 2;
      if (p.targetX !== null) {
        const distance = p.targetX - p.x, amount = PADDLE_SPEED * dt;
        p.x = Math.abs(distance) <= amount ? p.targetX : p.x + Math.sign(distance) * amount;
        if (p.x === p.targetX) p.targetX = null;
      } else p.x += p.axis * PADDLE_SPEED * dt;
      p.x = clamp(p.x, half, WIDTH - half);
      if (state.status === 'ready') state.ball.x = p.x;
    }

    function loseBall() {
      state.lives = Math.max(0, state.lives - 1);
      emit('life', { lives: state.lives, score: state.score });
      if (state.lives === 0) {
        state.status = 'over';
        state.ball.vx = 0; state.ball.vy = 0;
        emit('over', { score: state.score });
      } else serve();
    }

    function collideBrick(previousX, previousY) {
      const ball = state.ball;
      for (let index = 0; index < state.bricks.length; index++) {
        const brick = state.bricks[index];
        const nearestX = clamp(ball.x, brick.x, brick.x + brick.width);
        const nearestY = clamp(ball.y, brick.y, brick.y + brick.height);
        const dx = ball.x - nearestX, dy = ball.y - nearestY;
        if (dx * dx + dy * dy > ball.radius * ball.radius) continue;

        const cameFromLeft = previousX + ball.radius <= brick.x;
        const cameFromRight = previousX - ball.radius >= brick.x + brick.width;
        const cameFromTop = previousY + ball.radius <= brick.y;
        const cameFromBottom = previousY - ball.radius >= brick.y + brick.height;
        if (cameFromLeft) ball.vx = -Math.abs(ball.vx);
        else if (cameFromRight) ball.vx = Math.abs(ball.vx);
        else if (cameFromTop) ball.vy = -Math.abs(ball.vy);
        else if (cameFromBottom) ball.vy = Math.abs(ball.vy);
        else {
          const overlapX = ball.radius + brick.width / 2 - Math.abs(ball.x - (brick.x + brick.width / 2));
          const overlapY = ball.radius + brick.height / 2 - Math.abs(ball.y - (brick.y + brick.height / 2));
          if (overlapX < overlapY) ball.vx *= -1;
          else ball.vy *= -1;
        }
        const destroyed = brick.hits <= 1;
        if (destroyed) state.bricks.splice(index, 1);
        else brick.hits -= 1;
        state.score += 10;
        emit('brick', { id: brick.id, score: state.score, hits: destroyed ? 0 : brick.hits, destroyed });
        return true;
      }
      return false;
    }

    function tick() {
      if (state.status === 'paused' || state.status === 'over' || state.status === 'won') return;
      state.ticks++;
      const dt = STEP / 1000;
      movePaddle(dt);
      if (state.status !== 'playing') return;

      const ball = state.ball, oldX = ball.x, oldY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx); }
      if (ball.x + ball.radius > WIDTH) { ball.x = WIDTH - ball.radius; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 && oldY <= PADDLE_Y && ball.y + ball.radius >= PADDLE_Y &&
          Math.abs(ball.x - state.paddle.x) <= PADDLE_WIDTH / 2 + ball.radius) {
        ball.y = PADDLE_Y - ball.radius;
        const offset = clamp((ball.x - state.paddle.x) / (PADDLE_WIDTH / 2), -0.88, 0.88);
        const angle = offset * 1.08;
        const velocity = speed();
        ball.vx = Math.sin(angle) * velocity;
        ball.vy = -Math.cos(angle) * velocity;
        emit('paddle');
      } else if (collideBrick(oldX, oldY)) {
        // One brick per fixed step prevents a single frame from tunnelling through a row.
      }

      if (state.bricks.length === 0) {
        if (state.level >= CAMPAIGN.length) {
          state.status = 'won'; state.ball.vx = 0; state.ball.vy = 0;
          emit('win', { level: state.level, score: state.score });
        } else {
          state.level++;
          state.bricks = levelBricks(state.level);
          serve();
          emit('level', { level: state.level, name: CAMPAIGN[state.level - 1].name, score: state.score });
        }
        return;
      }
      if (ball.y - ball.radius > HEIGHT) loseBall();
    }

    function advance(ms) {
      if (!finite(ms) || ms < 0 || ms > 1000 || state.status === 'paused' || state.status === 'over' || state.status === 'won') return [];
      state.remainder += ms;
      while (state.remainder + 1e-7 >= STEP && state.status !== 'paused' && state.status !== 'over' && state.status !== 'won') {
        state.remainder = Math.max(0, state.remainder - STEP);
        tick();
      }
      const out = events; events = [];
      return out;
    }

    function view() {
      return {
        version: 1, status: state.status, ticks: state.ticks, score: state.score,
        level: state.level, stage: CAMPAIGN[state.level - 1]?.name || '', stages: CAMPAIGN.length,
        lives: state.lives, paddle: clone(state.paddle), ball: clone(state.ball),
        bricks: clone(state.bricks), remaining: state.bricks.length
      };
    }
    return { launch, pause, resume, setAxis, setTarget, releaseTarget, advance, drain: () => { const out = events; events = []; return out; }, view, serialize: () => clone(state), reset };
  }

  return {
    WIDTH, HEIGHT, STEP, MAX_LIVES, BALL_RADIUS, START_SPEED, SPEED_PER_LEVEL, MAX_SPEED, CAMPAIGN: clone(CAMPAIGN),
    PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_Y, PADDLE_SPEED,
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP_X, BRICK_GAP_Y, BRICK_TOP,
    PALETTE: clone(PALETTE), levelBricks: levelBricks, create, makeModel, initialState
  };
});

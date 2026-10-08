/* Original fixed-step rules for Vệ Tinh Giữ Quỹ Đạo. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_OrbitBrickModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const WIDTH = 720, HEIGHT = 480, STEP = 1000 / 120, MAX_LIVES = 3;
  const MAX_ROUNDS = 3, BALL_RADIUS = 7, START_SPEED = 310, SPEED_PER_ROUND = 14, MAX_SPEED = 370;
  const PADDLE_WIDTH = 96, EXPANDED_WIDTH = 144, PADDLE_HEIGHT = 13, PADDLE_Y = 438, PADDLE_SPEED = 500;
  const BRICK_ROWS = 8, BRICK_COLS = 10, BRICK_WIDTH = 52, BRICK_HEIGHT = 15, BRICK_GAP_X = 7, BRICK_GAP_Y = 6, BRICK_TOP = 54;
  const COLOR_SCORES = [50, 60, 70, 80, 90, 100, 110, 120];
  const PALETTE = ['#eee7d8', '#ff9b62', '#74d9ee', '#80daa2', '#fa6f79', '#779eff', '#d58cf0', '#f3d26a'];
  // Three authored fields change the ball's useful routes, durable blockers, and capsule lane.
  // The compact row strings use # for a brick and . for a gap, from left to right.
  const ROUND_LAYOUTS = [
    {
      name: 'Vành mở', cue: 'Khe giữa dẫn sang hai cánh.', carrier: [3, 2], gold: [[2, 4], [2, 5]],
      rows: ['..######..', '.########.', '##########', '###....###', '##......##', '##.####.##', '##########', '..........']
    },
    {
      name: 'Giằng so le', cue: 'Trụ lệch nhau dưới hai thanh ngang.', carrier: [6, 3], gold: [[2, 4], [5, 5]],
      rows: ['#..##..##.', '.##..##..#', '##########', '#..##..##.', '.##..##..#', '##########', '..####....', '##########']
    },
    {
      name: 'Lõi đôi', cue: 'Lõi giữa hẹp, hai nhánh rộng.', carrier: [5, 5], gold: [[4, 3], [4, 6]],
      rows: ['....##....', '...####...', '..######..', '.########.', '##.####.##', '##########', '.##.##.##.', '....##....']
    }
  ];
  const finite = Number.isFinite;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const clone = value => JSON.parse(JSON.stringify(value));
  const brickLeft = (WIDTH - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP_X)) / 2;

  function roundBricks(round) {
    const layoutIndex = (round - 1) % MAX_ROUNDS, layout = ROUND_LAYOUTS[layoutIndex], bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        if (layout.rows[row][col] !== '#') continue;

        const gold = layout.gold.some(([goldRow, goldCol]) => row === goldRow && col === goldCol);
        const carriesExpand = row === layout.carrier[0] && col === layout.carrier[1];
        const silver = !gold && !carriesExpand && row > 0 && row < 7 && (row * 3 + col + round) % 7 === 0;
        bricks.push({
          id: row * BRICK_COLS + col, row, col,
          x: brickLeft + col * (BRICK_WIDTH + BRICK_GAP_X),
          y: BRICK_TOP + row * (BRICK_HEIGHT + BRICK_GAP_Y),
          width: BRICK_WIDTH, height: BRICK_HEIGHT,
          type: gold ? 'gold' : silver ? 'silver' : 'color',
          hits: silver ? 2 : gold ? null : 1,
          points: gold ? 0 : silver ? 50 * round : COLOR_SCORES[row],
          color: row,
          carriesExpand
        });
      }
    }
    return bricks;
  }

  function roundTheme(round) {
    const index = (Math.max(1, Math.trunc(Number(round) || 1)) - 1) % MAX_ROUNDS;
    const { name, cue } = ROUND_LAYOUTS[index];
    return { name, cue };
  }

  function initialState() {
    return {
      version: 1, status: 'ready', pausedStatus: null, ticks: 0, remainder: 0,
      score: 0, round: 1, lives: MAX_LIVES,
      paddle: { x: WIDTH / 2, axis: 0, targetX: null },
      ball: { x: WIDTH / 2, y: PADDLE_Y - BALL_RADIUS - 12, vx: 0, vy: 0, radius: BALL_RADIUS },
      bricks: roundBricks(1), capsule: null, expandTicks: 0
    };
  }

  function create() { return makeModel(initialState()); }

  function makeModel(initial) {
    const state = clone(initial || initialState());
    let events = [];
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });
    const speed = () => Math.min(MAX_SPEED, START_SPEED + (state.round - 1) * SPEED_PER_ROUND);
    const paddleWidth = () => state.expandTicks > 0 ? EXPANDED_WIDTH : PADDLE_WIDTH;
    const serve = () => {
      state.ball = { x: state.paddle.x, y: PADDLE_Y - BALL_RADIUS - 12, vx: 0, vy: 0, radius: BALL_RADIUS };
      state.status = 'ready'; state.pausedStatus = null;
    };
    const reset = () => create();
    const launch = () => {
      if (state.status !== 'ready') return false;
      const magnitude = speed(), vx = magnitude * 0.58;
      state.status = 'playing';
      state.ball.vx = state.round % 2 ? vx : -vx;
      state.ball.vy = -Math.sqrt(magnitude * magnitude - vx * vx);
      emit('launch', { round: state.round });
      return true;
    };
    const pause = () => {
      if (state.status !== 'ready' && state.status !== 'playing') return false;
      state.pausedStatus = state.status; state.status = 'paused'; emit('pause'); return true;
    };
    const resume = () => {
      if (state.status !== 'paused') return false;
      state.status = state.pausedStatus || 'ready'; state.pausedStatus = null; emit('resume'); return true;
    };
    const setAxis = axis => { state.paddle.axis = clamp(Math.trunc(axis) || 0, -1, 1); };
    const setTarget = x => { state.paddle.targetX = finite(x) ? clamp(x, paddleWidth() / 2, WIDTH - paddleWidth() / 2) : null; };
    const releaseTarget = () => { state.paddle.targetX = null; };

    function movePaddle(dt) {
      const p = state.paddle, half = paddleWidth() / 2;
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
      state.capsule = null; state.expandTicks = 0;
      emit('life', { lives: state.lives, score: state.score });
      if (state.lives === 0) {
        state.status = 'over'; state.ball.vx = 0; state.ball.vy = 0;
        emit('over', { score: state.score });
      } else serve();
    }

    function hitBrick(previousX, previousY) {
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
        if (cameFromLeft) { ball.x = brick.x - ball.radius; ball.vx = -Math.abs(ball.vx); }
        else if (cameFromRight) { ball.x = brick.x + brick.width + ball.radius; ball.vx = Math.abs(ball.vx); }
        else if (cameFromTop) { ball.y = brick.y - ball.radius; ball.vy = -Math.abs(ball.vy); }
        else if (cameFromBottom) { ball.y = brick.y + brick.height + ball.radius; ball.vy = Math.abs(ball.vy); }
        else {
          const overlapX = ball.radius + brick.width / 2 - Math.abs(ball.x - (brick.x + brick.width / 2));
          const overlapY = ball.radius + brick.height / 2 - Math.abs(ball.y - (brick.y + brick.height / 2));
          if (overlapX < overlapY) ball.vx *= -1; else ball.vy *= -1;
        }

        if (brick.type === 'gold') { emit('gold-wall', { id: brick.id }); return true; }
        brick.hits--;
        if (brick.hits > 0) { emit('brick-damaged', { id: brick.id, hits: brick.hits }); return true; }
        state.bricks.splice(index, 1);
        state.score += brick.points;
        if (brick.carriesExpand) {
          state.capsule = { x: brick.x + brick.width / 2 - 9, y: brick.y + brick.height / 2, width: 18, height: 25, fallSpeed: 115, type: 'expand' };
          emit('capsule-drop', { type: 'expand' });
        }
        emit('brick', { id: brick.id, type: brick.type, score: state.score });
        return true;
      }
      return false;
    }

    function tick() {
      if (state.status === 'paused' || state.status === 'over' || state.status === 'won') return;
      state.ticks++;
      const dt = STEP / 1000;
      if (state.expandTicks > 0) {
        state.expandTicks--;
        if (state.expandTicks === 0) emit('power-ended', { type: 'expand' });
      }
      movePaddle(dt);
      if (state.status !== 'playing') return;

      const ball = state.ball, oldX = ball.x, oldY = ball.y;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx); }
      if (ball.x + ball.radius > WIDTH) { ball.x = WIDTH - ball.radius; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy); }

      const halfPaddle = paddleWidth() / 2;
      if (ball.vy > 0 && oldY <= PADDLE_Y && ball.y + ball.radius >= PADDLE_Y &&
          Math.abs(ball.x - state.paddle.x) <= halfPaddle + ball.radius) {
        ball.y = PADDLE_Y - ball.radius;
        const offset = clamp((ball.x - state.paddle.x) / halfPaddle, -0.86, 0.86);
        const angle = offset * 1.06, velocity = speed();
        ball.vx = Math.sin(angle) * velocity; ball.vy = -Math.cos(angle) * velocity;
        emit('paddle');
      } else hitBrick(oldX, oldY);

      if (state.capsule) {
        state.capsule.y += state.capsule.fallSpeed * dt;
        const caught = state.capsule.y + state.capsule.height >= PADDLE_Y &&
          state.capsule.y <= PADDLE_Y + PADDLE_HEIGHT &&
          state.capsule.x + state.capsule.width >= state.paddle.x - halfPaddle &&
          state.capsule.x <= state.paddle.x + halfPaddle;
        if (caught) {
          state.capsule = null; state.expandTicks = Math.round(8 * 1000 / STEP); state.score += 100;
          emit('capsule-collected', { type: 'expand', score: state.score });
        } else if (state.capsule.y > HEIGHT) { state.capsule = null; emit('capsule-missed'); }
      }

      const remaining = state.bricks.filter(brick => brick.type !== 'gold').length;
      if (remaining === 0) {
        if (state.round >= MAX_ROUNDS) {
          state.status = 'won'; ball.vx = 0; ball.vy = 0;
          emit('won', { round: state.round, score: state.score });
        } else {
          state.round++;
          state.bricks = roundBricks(state.round);
          state.capsule = null;
          serve();
          emit('round', { round: state.round, score: state.score });
        }
        return;
      }
      if (ball.y - ball.radius > HEIGHT) loseBall();
    }

    function advance(ms) {
      if (!finite(ms) || ms < 0 || ms > 1000 || state.status === 'paused' || state.status === 'over' || state.status === 'won') return [];
      state.remainder += ms;
      while (state.remainder + 1e-7 >= STEP && !['paused', 'over', 'won'].includes(state.status)) {
        state.remainder = Math.max(0, state.remainder - STEP); tick();
      }
      const out = events; events = []; return out;
    }

    function view() {
      const bricks = clone(state.bricks);
      return {
        version: 1, status: state.status, ticks: state.ticks, score: state.score,
        round: state.round, maxRounds: MAX_ROUNDS, lives: state.lives,
        paddle: { ...clone(state.paddle), width: paddleWidth(), height: PADDLE_HEIGHT, y: PADDLE_Y },
        ball: clone(state.ball), bricks, remaining: bricks.filter(brick => brick.type !== 'gold').length,
        capsule: state.capsule ? clone(state.capsule) : null,
        power: { type: state.expandTicks > 0 ? 'expand' : null, ticksRemaining: state.expandTicks }
      };
    }
    return { launch, pause, resume, setAxis, setTarget, releaseTarget, advance, drain: () => { const out = events; events = []; return out; }, view, serialize: () => clone(state), reset };
  }

  return {
    WIDTH, HEIGHT, STEP, MAX_LIVES, MAX_ROUNDS, BALL_RADIUS, START_SPEED, SPEED_PER_ROUND, MAX_SPEED,
    PADDLE_WIDTH, EXPANDED_WIDTH, PADDLE_HEIGHT, PADDLE_Y, PADDLE_SPEED,
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP_X, BRICK_GAP_Y, BRICK_TOP,
    COLOR_SCORES: clone(COLOR_SCORES), PALETTE: clone(PALETTE), roundTheme, roundBricks, create, makeModel, initialState
  };
});

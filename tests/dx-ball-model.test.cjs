const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/dx-ball-model.js');
function playingState(change) {
  const state = M.initialState(); state.status = 'playing';
  state.ball.vx = 0; state.ball.vy = 300;
  change?.(state);
  return state;
}

test('starts with a deterministic original brick field, three lives and a ball on the paddle', () => {
  const a = M.create(), b = M.create(), view = a.view();
  assert.deepEqual(view, b.view());
  assert.equal(view.status, 'ready'); assert.equal(view.lives, M.MAX_LIVES); assert.equal(view.level, 1);
  assert.ok(view.remaining > 20); assert.equal(view.ball.x, view.paddle.x); assert.equal(view.ball.vx, 0);
  assert.deepEqual(M.levelBricks(2), M.levelBricks(2));
  assert.notDeepEqual(M.levelBricks(1), M.levelBricks(2));
});

test('launch applies a normalized, level-seeded serve and rejects repeated launch', () => {
  const model = M.create();
  assert.equal(model.launch(), true); assert.equal(model.launch(), false);
  const ball = model.view().ball;
  assert.ok(ball.vx > 0); assert.ok(ball.vy < 0);
  assert.ok(Math.abs(Math.hypot(ball.vx, ball.vy) - M.START_SPEED) < 1e-8);
  assert.equal(model.drain()[0].kind, 'launch');
});

test('fixed-step simulation is independent of frame chunking', () => {
  const a = M.create(), b = M.create(); a.launch(); b.launch(); a.drain(); b.drain();
  for (let i = 0; i < 12; i++) a.advance(M.STEP);
  b.advance(M.STEP * 12);
  assert.deepEqual(a.view(), b.view());
});

test('paddle steering is bounded and an aimed paddle deflects the ball upward', () => {
  const steering = M.create(); steering.setAxis(-1); steering.advance(M.STEP * 6);
  assert.ok(steering.view().paddle.x < M.WIDTH / 2);
  steering.setAxis(0); steering.setTarget(-900); steering.advance(1000);
  assert.equal(steering.view().paddle.x, M.PADDLE_WIDTH / 2);

  const state = playingState(s => {
    s.paddle.x = 410; s.ball.x = 430; s.ball.y = M.PADDLE_Y - M.BALL_RADIUS - 1; s.ball.vx = 0; s.ball.vy = 300;
  });
  const model = M.makeModel(state); const events = model.advance(M.STEP);
  assert.ok(events.some(e => e.kind === 'paddle'));
  assert.ok(model.view().ball.vy < 0); assert.ok(model.view().ball.vx > 0);
});

test('brick contact removes exactly one brick, scores, and reflects the ball', () => {
  const brick = M.levelBricks(1)[0];
  const state = playingState(s => {
    s.bricks = [brick, M.levelBricks(1)[1]]; s.ball.x = brick.x + brick.width / 2; s.ball.y = brick.y - M.BALL_RADIUS - 1;
    s.ball.vx = 0; s.ball.vy = 300;
  });
  const model = M.makeModel(state), events = model.advance(M.STEP);
  assert.equal(model.view().remaining, 1); assert.equal(model.view().score, 10);
  assert.ok(model.view().ball.vy < 0); assert.ok(events.some(e => e.kind === 'brick' && e.id === brick.id));
});

test('clearing a field prepares a distinct next level and preserves score and lives', () => {
  const state = playingState(s => { s.bricks = []; s.score = 90; s.lives = 2; });
  const model = M.makeModel(state), events = model.advance(M.STEP);
  assert.equal(model.view().level, 2); assert.equal(model.view().status, 'ready');
  assert.equal(model.view().score, 90); assert.equal(model.view().lives, 2); assert.ok(model.view().remaining > 0);
  assert.ok(events.some(e => e.kind === 'level' && e.level === 2));
});

test('dropping the ball costs a life, serves again, then ends at zero', () => {
  const state = playingState(s => { s.ball.y = M.HEIGHT + M.BALL_RADIUS + 1; s.ball.vy = 300; });
  const model = M.makeModel(state), events = model.advance(M.STEP);
  assert.equal(model.view().lives, 2); assert.equal(model.view().status, 'ready');
  assert.ok(events.some(e => e.kind === 'life' && e.lives === 2));

  const finalState = playingState(s => { s.lives = 1; s.ball.y = M.HEIGHT + M.BALL_RADIUS + 1; });
  const finalModel = M.makeModel(finalState), finalEvents = finalModel.advance(M.STEP);
  assert.equal(finalModel.view().lives, 0); assert.equal(finalModel.view().status, 'over');
  assert.ok(finalEvents.some(e => e.kind === 'over'));
});

test('pause freezes ticks and resume continues; restart restores the first serve', () => {
  const model = M.create(); model.launch(); model.drain(); model.advance(M.STEP * 5);
  const before = model.view(); model.pause(); model.drain(); model.advance(300);
  assert.equal(model.view().ticks, before.ticks); assert.deepEqual(model.view().ball, before.ball);
  assert.equal(model.resume(), true); model.advance(M.STEP); assert.equal(model.view().ticks, before.ticks + 1);
  const fresh = model.reset(); assert.equal(fresh.view().status, 'ready'); assert.equal(fresh.view().score, 0); assert.equal(fresh.view().lives, M.MAX_LIVES);
});

test('invalid elapsed times do not mutate the simulation', () => {
  const model = M.create(), before = model.view();
  for (const elapsed of [-1, 1001, NaN, Infinity]) assert.deepEqual(model.advance(elapsed), []);
  assert.deepEqual(model.view(), before);
});

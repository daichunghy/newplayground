const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/orbit-pinball-model.js');

function seeded(change) {
  const state = M.initialState();
  state.status = 'playing';
  change?.(state);
  return M.makeModel(state);
}

function contactState(target, { ballsLeft = 3, litOtherTargets = false } = {}) {
  const state = M.initialState();
  state.status = 'playing'; state.ballsLeft = ballsLeft;
  if (litOtherTargets) for (const item of M.TARGETS) state.targets[item.id] = item.id !== target.id;
  const x = target.x;
  const y = target.kind === 'bumper'
    ? target.y - target.radius - M.BALL_RADIUS + 1
    : target.y - target.height / 2 - M.BALL_RADIUS + 1;
  state.ball = { x, y, vx: 0, vy: 260 };
  return state;
}

test('starts from the same three-ball table and launches into gravity-driven play', () => {
  const a = M.create(), b = M.create();
  assert.deepEqual(a.view(), b.view());
  assert.equal(a.view().status, 'ready');
  assert.equal(a.view().ballsLeft, 3);
  assert.equal(a.view().targetCount, 6);
  assert.equal(a.view().targetHits, 0);
  assert.equal(a.launch(), true);
  assert.equal(a.launch(), false);
  const launched = a.view().ball;
  assert.ok(launched.vy < 0);
  a.advance(M.STEP * 20);
  assert.ok(a.view().ball.y < launched.y, 'the launched ball rises before gravity turns it');
  const falling = seeded(state => { state.ball = { x: 52, y: 110, vx: 0, vy: -100 }; });
  falling.advance(M.STEP * 30);
  assert.ok(falling.view().ball.vy > 0, 'gravity turns a rising ball downward');
});

test('fixed-step outcomes do not depend on frame chunking', () => {
  const a = M.create(), b = M.create(); a.launch(); b.launch();
  for (let i = 0; i < 24; i++) a.advance(M.STEP);
  b.advance(M.STEP * 24);
  assert.deepEqual(a.view(), b.view());
});

test('each bumper and drop plate lights once, scores, and physically rebounds the ball', () => {
  for (const target of M.TARGETS) {
    const model = M.makeModel(contactState(target));
    const events = model.advance(M.STEP);
    const view = model.view();
    assert.equal(view.targets[target.id], true, target.id);
    assert.equal(view.targetHits, 1, target.id);
    assert.equal(view.score, target.points, target.id);
    assert.ok(view.ball.vy < 0, `${target.id} reflected the falling ball upward`);
    assert.ok(events.some(event => event.id === target.id), `${target.id} reported a collision event`);
    model.advance(M.STEP);
    assert.equal(model.view().targetHits, 1, `${target.id} only counts once`);
  }
});

test('lighting the final remaining target wins with a visible score result', () => {
  const finalTarget = M.TARGETS.find(target => target.kind === 'plate');
  const model = M.makeModel(contactState(finalTarget, { litOtherTargets: true }));
  const events = model.advance(M.STEP);
  assert.equal(model.view().status, 'won');
  assert.equal(model.view().targetHits, M.TARGET_COUNT);
  assert.equal(model.view().score, finalTarget.points);
  assert.ok(events.some(event => event.kind === 'win' && event.score === finalTarget.points));
  assert.equal(model.launch(), false);
  assert.deepEqual(model.advance(M.STEP), []);
});

test('left and right flippers hold independently and active contact kicks upward', () => {
  const model = seeded(state => {
    state.flippers.left = false;
    state.ball = { x: 181, y: 588, vx: 0, vy: 240 };
  });
  assert.equal(model.setFlipper('left', true), true);
  assert.equal(model.setFlipper('right', true), true);
  assert.equal(model.view().flippers.left, true);
  assert.equal(model.view().flippers.right, true);
  model.setFlipper('right', false);
  assert.equal(model.view().flippers.right, false);
  model.advance(M.STEP);
  assert.ok(model.view().ball.vy < 0, 'the held left flipper hits the ball upward');
  assert.equal(model.setFlipper('middle', true), false);
});

test('drains consume exactly one of three balls, serve again, then end the game', () => {
  const first = seeded(state => { state.ball = { x: 210, y: 696, vx: 0, vy: 180 }; });
  const event = first.advance(M.STEP);
  assert.equal(first.view().status, 'ready');
  assert.equal(first.view().ballsLeft, 2);
  assert.equal(first.view().lastEvent, 'drain');
  assert.ok(event.some(item => item.kind === 'drain' && item.ballsLeft === 2));
  assert.equal(first.launch(), true);

  const last = seeded(state => { state.ballsLeft = 1; state.ball = { x: 210, y: 696, vx: 0, vy: 180 }; });
  assert.ok(last.advance(M.STEP).some(item => item.kind === 'loss'));
  assert.equal(last.view().ballsLeft, 0);
  assert.equal(last.view().status, 'lost');
});

test('pause freezes the simulation, resume continues, and restart clears score and targets', () => {
  const model = M.create(); model.launch(); model.advance(M.STEP * 10);
  assert.equal(model.pause(), true);
  const frozen = model.view();
  assert.deepEqual(model.advance(M.STEP * 12), []);
  assert.equal(model.view().ticks, frozen.ticks);
  assert.equal(model.resume(), true);
  model.advance(M.STEP);
  assert.equal(model.view().ticks, frozen.ticks + 1);
  model.restart();
  assert.equal(model.view().status, 'ready');
  assert.equal(model.view().score, 0);
  assert.equal(model.view().ballsLeft, M.BALLS);
  assert.equal(model.view().targetHits, 0);
});

test('invalid time and flipper inputs leave the model unchanged', () => {
  const model = M.create(), before = model.view();
  for (const seconds of [-1, M.MAX_FRAME + .01, NaN, Infinity]) assert.deepEqual(model.advance(seconds), []);
  assert.deepEqual(model.view(), before);
  assert.equal(model.setFlipper('left', 1), false);
  assert.deepEqual(model.view(), before);
});

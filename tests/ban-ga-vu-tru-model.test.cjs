const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/ban-ga-vu-tru-model.js');

test('fixed-step model is deterministic across equivalent elapsed-time chunks', () => {
  const one = M.create(417), many = M.create(417);
  one.setAxis(-1); one.setFiring(true); one.advance(12_000);
  many.setAxis(-1); many.setFiring(true);
  for (let i = 0; i < 720; i++) many.advance(M.STEP_MS);
  assert.deepEqual(many.view(), one.view());
});

test('steering clamps to the playfield and held fire emits a steady stream', () => {
  const model = M.create(8);
  model.setAxis(-1); model.advance(4_000);
  assert.equal(model.view().player.x, M.PLAYER_RADIUS + 8);
  model.setAxis(0); model.setFiring(true);
  const events = model.advance(1_000);
  assert.ok(events.filter(event => event.kind === 'shot-fired').length >= 4);
  assert.ok(model.view().player.x >= M.PLAYER_RADIUS + 8);
});

test('a moving, firing pilot can score through a complete short run', () => {
  const model = M.create(1);
  let direction = 1;
  model.setFiring(true);
  for (let tick = 0; tick < M.RUN_TICKS && model.view().status === 'playing'; tick++) {
    if (tick % 110 === 0) { direction *= -1; model.setAxis(direction); }
    model.advance(M.STEP_MS);
  }
  const view = model.view();
  assert.equal(view.status, 'complete');
  assert.equal(view.remainingTicks, 0);
  assert.ok(view.score > 0);
  assert.ok(view.hull > 0);
});

test('pause clears held input and freezes the fixed-step clock until resume', () => {
  const model = M.create(29);
  model.setAxis(1); model.setFiring(true); model.advance(250);
  assert.equal(model.pause(), true);
  const paused = model.view();
  assert.equal(model.setAxis(-1), false);
  assert.equal(model.setFiring(true), false);
  assert.deepEqual(model.advance(5_000), []);
  assert.equal(model.view().ticks, paused.ticks);
  assert.equal(model.resume(), true);
  model.advance(500);
  assert.ok(model.view().ticks > paused.ticks);
});

test('a stationary run can end on damage and terminal states stay frozen', () => {
  const model = M.create(M.DEFAULT_SEED);
  let events = [];
  for (let i = 0; i < 2_000 && model.view().status === 'playing'; i++) events.push(...model.advance(M.STEP_MS));
  const terminal = model.view();
  assert.equal(terminal.status, 'over');
  assert.equal(terminal.hull, 0);
  assert.ok(events.some(event => event.kind === 'hull-hit'));
  assert.ok(events.some(event => event.kind === 'run-ended' && event.result === 'over'));
  model.advance(10_000);
  assert.equal(model.view().ticks, terminal.ticks);
});

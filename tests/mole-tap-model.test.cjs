const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/mole-tap-model.js');

test('starts immediately with a deterministic target and a forgiving short window', () => {
  const first = M.create({ seed: 42 }), second = M.create({ seed: 42 });
  assert.deepEqual(first.view(), second.view());
  assert.equal(first.view().status, 'playing');
  assert.ok(first.view().target >= 0 && first.view().target < 9);
  assert.equal(first.view().targetTimeLeft, 1150);
});

test('a correct whack scores once, moves the target, and ramps every four hits', () => {
  const model = M.create({ seed: 9 });
  for (let hit = 1; hit <= 8; hit++) {
    const before = model.view();
    assert.equal(model.whack(before.target).hit, true);
    const after = model.view();
    assert.equal(after.score, hit * 100);
    if (hit < M.TARGET_COUNT) assert.notEqual(after.target, before.target);
    assert.equal(after.targetWindowMs, hit < 4 ? 1150 : hit < 8 ? 980 : 820);
  }
});

test('three expired targets end the round and terminal input is ignored', () => {
  const model = M.create({ seed: 6 });
  for (let miss = 1; miss <= M.MAX_MISSES; miss++) {
    assert.equal(model.advance(model.view().targetTimeLeft), true);
    assert.equal(model.view().misses, miss);
  }
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().target, null);
  assert.equal(model.whack(0).accepted, false);
  model.restart();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().hits, 0);
  assert.equal(model.view().misses, 0);
  assert.equal(model.view().score, 0);
});

test('twelve correct hits win; pause freezes the target clock and resume restores it', () => {
  const model = M.create({ seed: 7 });
  for (let hit = 0; hit < M.TARGET_COUNT; hit++) assert.equal(model.whack(model.view().target).hit, true);
  assert.equal(model.view().status, 'won');
  assert.equal(model.view().score, 1200);

  model.restart();
  model.advance(340);
  const remaining = model.view().targetTimeLeft;
  assert.equal(model.pause(), true);
  assert.equal(model.advance(500), false);
  assert.equal(model.view().targetTimeLeft, remaining);
  assert.equal(model.resume(), true);
  assert.equal(model.advance(remaining), true);
  assert.equal(model.view().misses, 1);
});

test('invalid holes and elapsed times never change score or lives', () => {
  const model = M.create({ seed: 2 }), before = model.view();
  for (const index of [-1, 9, 1.5, NaN]) assert.equal(model.whack(index).accepted, false);
  for (const ms of [0, -1, 60001, NaN, Infinity]) assert.equal(model.advance(ms), false);
  assert.deepEqual(model.view(), before);
});

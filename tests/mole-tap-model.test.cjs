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

test('streaks multiply score and every fourth target is a tighter gold bonus', () => {
  const model = M.create({ seed: 9 });
  const expectedPoints = [100, 100, 200, 400, 200, 300, 300, 500, 300, 300, 300, 500];
  for (let hit = 1; hit <= 8; hit++) {
    const before = model.view();
    const result = model.whack(before.target);
    assert.equal(result.hit, true);
    assert.equal(result.points, expectedPoints[hit - 1]);
    const after = model.view();
    assert.equal(after.score, expectedPoints.slice(0, hit).reduce((sum, points) => sum + points, 0));
    assert.equal(result.targetKind, hit % 4 === 0 ? 'gold' : 'normal');
    if (hit < M.TARGET_COUNT) assert.notEqual(after.target, before.target);
    assert.equal(after.targetWindowMs, hit === 3 ? 860 : hit === 7 ? 800 : hit < 4 ? 1150 : hit < 8 ? 980 : 820);
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
  assert.equal(model.view().score, 3500);
  assert.equal(model.view().bestStreak, 12);

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

test('a miss breaks a scoring streak before the next target', () => {
  const model = M.create({ seed: 19 });
  for (let hit = 0; hit < 3; hit++) model.whack(model.view().target);
  assert.equal(model.view().targetKind, 'gold');
  model.whack((model.view().target + 1) % M.HOLES);
  assert.equal(model.view().streak, 0);
  assert.equal(model.view().multiplier, 1);
  assert.equal(model.whack(model.view().target).points, 300, 'gold bonus survives a broken streak');
});

test('invalid holes and elapsed times never change score or lives', () => {
  const model = M.create({ seed: 2 }), before = model.view();
  for (const index of [-1, 9, 1.5, NaN]) assert.equal(model.whack(index).accepted, false);
  for (const ms of [0, -1, 60001, NaN, Infinity]) assert.equal(model.advance(ms), false);
  assert.deepEqual(model.view(), before);
});

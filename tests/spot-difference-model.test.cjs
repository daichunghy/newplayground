const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/spot-difference-model.js');

test('all fifteen authored hit regions progress through three original scenes on either panel', () => {
  for (const side of ['a', 'b']) {
    const model = M.create();
    for (const [sceneIndex, scene] of M.SCENES.entries()) {
      assert.equal(model.view().sceneIndex, sceneIndex);
      assert.equal(model.view().sceneName, scene.name);
      for (const [index, point] of scene.targets.entries()) {
        const result = model.pick(side, ...point[side]);
        assert.equal(result.hit, true);
        assert.equal(result.sceneComplete, index === scene.targets.length - 1);
      }
      if (sceneIndex < M.SCENES.length - 1) {
        assert.equal(model.view().status, 'playing');
        assert.equal(model.view().foundCount, 0);
      }
    }
    assert.equal(model.view().status, 'won');
    assert.equal(model.view().overallFoundCount, 15);
  }
});

test('five misses lose, while tapping an already found spot is harmless', () => {
  const model = M.create(), point = M.TARGETS[0].a;
  assert.equal(model.pick('a', ...point).hit, true);
  assert.equal(model.pick('a', ...point).duplicate, true);
  assert.equal(model.view().misses, 0);
  for (let miss = 1; miss <= M.MAX_MISSES; miss++) {
    const result = model.pick('a', 0.95, 0.92);
    assert.equal(result.hit, false);
    assert.equal(model.view().misses, miss);
  }
  assert.equal(model.view().status, 'lost');
  assert.equal(model.pick('b', ...M.TARGETS[1].b).accepted, false);
});

test('the two-and-a-half-minute course clock pauses, expires, and can be restarted', () => {
  const model = M.create();
  assert.equal(model.advance(M.TIME_LIMIT - 1), false, 'large frames are bounded');
  assert.equal(model.view().timeLeft, M.TIME_LIMIT);
  assert.equal(model.advance(40000), true);
  assert.equal(model.pause(), true);
  assert.equal(model.advance(20000), false);
  assert.equal(model.view().timeLeft, 110000);
  assert.equal(model.resume(), true);
  assert.equal(model.advance(60000), true);
  assert.equal(model.view().timeLeft, 50000);
  assert.equal(model.advance(50000), true);
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().lastEvent, 'time');
  model.restart();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().timeLeft, M.TIME_LIMIT);
  assert.equal(model.view().sceneIndex, 0);
  assert.equal(model.view().foundCount, 0);
  assert.equal(model.view().misses, 0);
});

test('bad panel names and off-image positions do not penalize the round', () => {
  const model = M.create(), before = model.view();
  for (const args of [['c', 0.5, 0.5], ['a', -0.1, 0.5], ['b', 0.5, 1.1], ['a', NaN, 0.5]]) {
    assert.equal(model.pick(...args).accepted, false);
  }
  assert.deepEqual(model.view(), before);
});

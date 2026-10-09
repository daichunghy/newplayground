const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/bridge-builder-model.js');

function buildAll(model, spans) {
  for (let i = 0; i < spans; i++) {
    for (const deck of [`b${i}`, `b${i + 1}`]) {
      model.selectJoint(`t${i}`);
      assert.equal(model.selectJoint(deck).accepted, true);
    }
  }
}

test('touch selection joins only adjacent top and deck joints, with undo and finite budget', () => {
  const model = M.create();
  assert.equal(model.view().status, 'building');
  assert.equal(model.selectJoint('t0').accepted, true);
  assert.equal(model.selectJoint('b3').reason, 'distance');
  assert.equal(model.view().selected, 'b3');
  assert.equal(model.selectJoint('b4').reason, 'pair');
  assert.equal(model.view().used, 0);
  model.selectJoint('t0'); model.selectJoint('b0');
  assert.equal(model.view().used, 1);
  assert.equal(model.undo(), true);
  assert.equal(model.view().used, 0);
  assert.equal(model.undo(), false);
});

test('the static solver distinguishes a complete triangulated bridge from an unstable one', () => {
  const level = M.LEVELS[0], all = [];
  for (let i = 0; i < level.spans; i++) {
    all.push([`t${i}`, `b${i}`].sort().join('|'), [`t${i}`, `b${i + 1}`].sort().join('|'));
  }
  const sound = M.evaluate(level.spans, level.load, all);
  assert.equal(sound.stable, true);
  assert.equal(sound.passed, true);
  assert.ok(sound.maxDeflection < M.MAX_DEFLECTION);
  assert.ok(sound.maxForce < M.MAX_FORCE);
  const incomplete = M.evaluate(level.spans, level.load, all.slice(1));
  assert.equal(incomplete.stable, false);
  assert.equal(incomplete.reason, 'unstable');
});

test('all three loads cross in sequence; pause, next stage and replay reset safely', () => {
  const model = M.create();
  for (let levelIndex = 0; levelIndex < M.LEVELS.length; levelIndex++) {
    const level = M.LEVELS[levelIndex];
    assert.equal(model.view().levelNumber, levelIndex + 1);
    buildAll(model, level.spans);
    assert.equal(model.view().used, level.budget);
    assert.equal(model.test(), true);
    assert.equal(model.view().status, 'testing');
    assert.equal(model.pause(), true);
    assert.equal(model.advance(2000), false);
    assert.equal(model.resume(), true);
    assert.equal(model.advance(M.TEST_MS), true);
    assert.equal(model.view().status, levelIndex === M.LEVELS.length - 1 ? 'won' : 'passed');
    assert.equal(model.view().report.passed, true);
    if (levelIndex < M.LEVELS.length - 1) assert.equal(model.nextLevel(), true);
  }
  model.restart();
  assert.equal(model.view().levelNumber, 1);
  assert.equal(model.view().used, 0);
});

test('failed tests return to build mode and invalid time/input cannot mutate a run', () => {
  const model = M.create();
  model.selectJoint('t0'); model.selectJoint('b0');
  const before = model.view();
  assert.equal(model.selectJoint('not-a-joint').accepted, false);
  assert.equal(model.view().used, before.used);
  model.test();
  assert.equal(model.advance(3000), true);
  assert.equal(model.view().status, 'failed');
  assert.equal(model.repair(), true);
  assert.equal(model.view().status, 'building');
  assert.equal(model.clearSelection(), true);
  assert.equal(model.test(), true);
  assert.equal(model.advance(-1), false);
});

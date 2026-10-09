const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/flappy-bird-model.js');

function progress(stageIndex = 0) {
  return { version: M.SAVE_VERSION, unlockedStage: stageIndex, selectedStage: stageIndex, stars: Array(M.STAGES.length).fill(0) };
}
function fixture(change = () => {}, stageIndex = 0) {
  const state = M.create(progress(stageIndex)).serialize();
  change(state);
  return M.makeModel(state);
}
function clearFixture(stageIndex = 0) {
  return fixture(state => {
    const stage = M.STAGES[stageIndex];
    state.status = 'playing'; state.player = { x: M.PLAYER_X, y: 180, vy: 0 };
    for (const gate of state.gates) { gate.x = M.PLAYER_X - M.RADIUS - M.GATE_W + stage.speed - .01; gate.center = 180; }
  }, stageIndex);
}
function flyWithSteadyCadence(stageIndex) {
  const model = M.create(progress(stageIndex));
  model.flap(); model.drain();
  for (let tick = 1; tick < 1200 && model.view().status === 'playing'; tick++) {
    if (tick % 32 === 0) { model.flap(); model.drain(); }
    model.advance(M.STEP);
  }
  return model.view();
}

test('three authored routes differ in gate geometry and steadily narrow and speed up', () => {
  assert.equal(M.STAGES.length, 3);
  assert.deepEqual(M.STAGES.map(s => s.goal), [4, 4, 4]);
  assert.deepEqual(M.STAGES.map(s => s.gap), [116, 108, 100]);
  assert.deepEqual(M.STAGES.map(s => s.speed), [2.55, 2.75, 3]);
  assert.notDeepEqual(M.STAGES[0].centers, M.STAGES[1].centers);
  assert.notDeepEqual(M.STAGES[1].centers, M.STAGES[2].centers);
  assert.ok(M.STAGES.every(s => s.centers.length === s.goal && s.centers.every(y => y - s.gap / 2 > 0 && y + s.gap / 2 < M.HEIGHT)));
});

test('a steady, learnable flap rhythm clears every authored stage from a fresh launch', () => {
  for (let stageIndex = 0; stageIndex < M.STAGES.length; stageIndex++) {
    const result = flyWithSteadyCadence(stageIndex);
    assert.equal(result.status, 'won', `${M.STAGES[stageIndex].name}: ${result.score}/${result.goal}, ${result.lives} tries remain`);
    assert.equal(result.score, M.STAGES[stageIndex].goal);
    assert.equal(result.lives, M.MAX_LIVES);
    assert.equal(result.result.stars, 3);
  }
});

test('new flight uses the one-button lift loop and fixed-step simulation', () => {
  const a = M.create(), b = M.create();
  assert.equal(a.view().status, 'ready');
  assert.equal(a.view().stageIndex, 0);
  assert.equal(a.view().lives, M.MAX_LIVES);
  assert.equal(a.view().gates.length, 4);
  assert.deepEqual(a.view(), b.view());
  assert.equal(a.flap(), true);
  assert.equal(a.view().status, 'playing');
  assert.equal(a.view().player.vy, M.FLAP);
  a.drain(); a.advance(M.STEP);
  assert.ok(a.view().player.vy > M.FLAP);
  assert.ok(a.view().player.y < M.HEIGHT / 2);
});

test('simulation gives the same result for equivalent frame chunks', () => {
  const a = M.create(), b = M.create(); a.flap(); b.flap(); a.drain(); b.drain();
  for (let i = 0; i < 12; i++) a.advance(M.STEP);
  b.advance(M.STEP * 12);
  assert.deepEqual(a.view(), b.view());
});

test('passing a gate scores once; clearing a route awards stars and unlocks the next', () => {
  const model = clearFixture(), events = model.advance(M.STEP), view = model.view();
  assert.equal(view.status, 'won'); assert.equal(view.score, 4); assert.equal(view.lives, 3);
  assert.equal(view.result.stars, 3); assert.equal(view.result.final, false);
  assert.equal(view.stars[0], 3); assert.equal(view.unlockedStage, 1);
  assert.equal(events.filter(e => e.kind === 'score').length, 4);
  assert.ok(events.some(e => e.kind === 'clear' && e.stars === 3));
  assert.equal(model.flap(), false);
  assert.equal(model.nextStage(), true);
  assert.equal(model.view().stageIndex, 1); assert.equal(model.view().score, 0);
  assert.equal(model.view().status, 'ready'); assert.equal(model.view().lives, 3);
  assert.equal(model.view().stage.gap, 108);
});

test('a collision spends one try, restarts the route, and retains gates already earned', () => {
  const model = fixture(state => { state.status = 'playing'; state.score = 2; state.player.y = M.HEIGHT - M.RADIUS + 1; });
  const events = model.advance(M.STEP), view = model.view();
  assert.ok(events.some(e => e.kind === 'crash' && e.reason === 'floor'));
  assert.equal(view.status, 'playing'); assert.equal(view.lives, 2); assert.equal(view.score, 2);
  assert.equal(view.player.y, M.HEIGHT / 2); assert.equal(view.gates[0].x, 355);
});

test('last collision ends the stage; replay starts fresh without losing unlocked routes', () => {
  const model = fixture(state => { state.status = 'playing'; state.lives = 1; state.score = 3; state.player.y = M.HEIGHT - M.RADIUS + 1; });
  assert.ok(model.advance(M.STEP).some(e => e.kind === 'over'));
  assert.equal(model.view().status, 'over'); assert.equal(model.view().lives, 0); assert.equal(model.flap(), false);
  assert.equal(model.selectStage(0), true); assert.equal(model.view().status, 'ready');
  assert.equal(model.view().score, 0); assert.equal(model.view().lives, 3);
});

test('locked stages stay locked, and final clear can replay the campaign', () => {
  const fresh = M.create();
  assert.equal(fresh.selectStage(1), false);
  assert.equal(fresh.view().stageIndex, 0);
  const unlocked = clearFixture(); unlocked.advance(M.STEP);
  const afterFirst = M.restore(unlocked.serializeProgress());
  assert.equal(afterFirst.view().unlockedStage, 1);
  assert.equal(afterFirst.selectStage(2), false);
  const final = fixture(state => { state.status = 'won'; state.stageIndex = 2; state.unlockedStage = 2; state.result = { stageIndex: 2, score: 4, lives: 3, stars: 3, final: true }; }, 2);
  assert.equal(final.nextStage(), false);
  assert.equal(final.replayCampaign(), true);
  assert.equal(final.view().stageIndex, 0); assert.equal(final.view().unlockedStage, 2);
});

test('progress save restores stage choice and stars but starts a safe fresh attempt', () => {
  const model = clearFixture(); model.advance(M.STEP); model.nextStage(); model.selectStage(0);
  const saved = model.serializeProgress();
  assert.equal(M.validProgress(saved), true);
  const restored = M.restore(saved);
  assert.equal(restored.view().status, 'ready'); assert.equal(restored.view().stageIndex, 0);
  assert.equal(restored.view().unlockedStage, 1); assert.equal(restored.view().stars[0], 3);
  assert.equal(M.restore({ ...saved, selectedStage: 2 }), null);
  assert.equal(M.restore({ ...saved, stars: [4, 0, 0] }), null);
  assert.equal(M.restore({ ...saved, version: 99 }), null);
});

test('invalid timing never mutates the flight', () => {
  const model = M.create(), before = model.view();
  assert.deepEqual(model.advance(-1), []); assert.deepEqual(model.advance(60001), []); assert.deepEqual(model.advance(NaN), []);
  assert.deepEqual(model.view(), before);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/road-duel-model.js');

function run(model, seconds, controls = {}) {
  let left = seconds;
  while (left > 1e-9) {
    const dt = Math.min(left, 1 / 60);
    model.advance(dt, controls);
    left -= dt;
  }
}

function runCourse(model, useSideCheck = true) {
  for (let i = 0; i < 6000 && model.view().status === 'playing'; i++) {
    const v = model.view(), hazard = v.hazardsAhead.find(item => item.ahead < 48);
    const safeLanes = hazard ? [-0.34, 0, 0.34].filter(lane => Math.abs(lane - hazard.lane) > 0.2) : [0];
    const target = safeLanes.sort((a, b) => Math.abs(a - v.lane) - Math.abs(b - v.lane))[0];
    const steer = v.lane < target - 0.02 ? 1 : v.lane > target + 0.02 ? -1 : 0;
    model.advance(M.STEP, { accelerate: true, steer });
    if (useSideCheck && i % 42 === 12) model.act('attack');
    model.drain();
  }
  return model.view();
}

test('fresh race starts moving immediately on one compact original track', () => {
  const v = M.create().view();
  assert.equal(v.status, 'playing');
  assert.equal(v.distance, 0);
  assert.equal(v.speed, 18);
  assert.equal(v.trackLength, 720);
  assert.equal(v.stageName, 'Bãi Cát');
  assert.equal(v.stageCount, 3);
  assert.equal(v.position, 4);
  assert.equal(v.rivals.length, 3);
  assert.equal(v.hazardsAhead.length, 5);
});

test('fixed-step simulation is deterministic across render frame rates', () => {
  for (let stage = 0; stage < M.STAGES.length; stage++) {
    const simulations = [];
    for (const hz of [30, 60, 120, 144]) {
      const g = M.create(stage, { unlockedStage: stage });
      for (let i = 0; i < hz * 6; i++) g.advance(1 / hz, { accelerate: true, steer: i < hz ? -1 : 0 });
      simulations.push(g.view());
    }
    for (const v of simulations.slice(1)) {
      assert.equal(v.tick, simulations[0].tick, M.STAGES[stage].name);
      assert.ok(Math.abs(v.distance - simulations[0].distance) < 0.02);
      assert.ok(Math.abs(v.speed - simulations[0].speed) < 0.02);
      assert.ok(Math.abs(v.lane - simulations[0].lane) < 0.02);
      assert.deepEqual(v.rivals.map(r => r.distance), simulations[0].rivals.map(r => r.distance));
    }
  }
});

test('steering is smooth and bounded, acceleration rises, and braking slows', () => {
  const g = M.create();
  run(g, 2, { accelerate: true, steer: -1 });
  const left = g.view();
  assert.ok(left.speed > 18);
  assert.ok(left.lane < -0.4);
  assert.ok(left.lane >= -0.44);
  const fast = left.speed;
  run(g, 1, { brake: true, steer: 1 });
  assert.ok(g.view().speed < fast);
  assert.ok(g.view().lane > left.lane);
  run(g, 4, { accelerate: true, steer: 1 });
  assert.ok(g.view().lane <= 0.44);
  assert.ok(g.view().speed <= M.MAX_SPEED);
});

test('live place updates as the player passes riders and matches the final order', () => {
  const g = M.create();
  assert.equal(g.view().position, 4);
  run(g, 10, { accelerate: true });
  assert.ok(g.view().position < 4);
  const result = runCourse(g);
  assert.equal(result.status, 'won');
  assert.equal(result.position, result.place);
});

test('one melee action disrupts the nearest nearby rider and respects cooldown', () => {
  const g = M.create();
  assert.equal(g.act('attack'), true);
  const v = g.view();
  assert.equal(v.hits, 1);
  const target = v.rivals.find(r => r.id === 1);
  assert.ok(target.stun > 1.4);
  assert.equal(g.act('attack'), false);
  assert.ok(g.drain().some(e => e.kind === 'hit' && e.id === 1));
  run(g, 0.8);
  assert.equal(g.view().attackReady, true);
});

test('missed melee swings do not affect distant riders or damage the player', () => {
  const g = M.create();
  run(g, 8.2, { accelerate: true });
  assert.equal(g.act('attack'), true);
  assert.equal(g.view().hits, 0);
  assert.equal(g.view().crashes, 0);
  assert.ok(g.drain().some(e => e.kind === 'swing' && e.hit === false));
});

test('three avoidable road impacts end the race cleanly', () => {
  const g = M.create();
  let gotFirst = false;
  for (let i = 0; i < 1200 && g.view().status === 'playing'; i++) {
    const d = g.view().distance;
    const lane = g.view().lane;
    const target = d < 190 ? -0.30 : d < 310 ? 0.30 : 0;
    const steer = lane < target - 0.015 ? 1 : lane > target + 0.015 ? -1 : 0;
    g.advance(M.STEP, { accelerate: true, steer });
    if (g.drain().some(e => e.kind === 'crash')) gotFirst = true;
  }
  assert.equal(gotFirst, true);
  assert.ok(g.view().crashes >= 2);
  assert.equal(g.view().status, 'lost');
  assert.equal(g.view().place, 4);
  assert.equal(g.progress().bestPlaces[0], 4);
  assert.equal(M.validProgress(g.progress()), true);
});

test('careful full-throttle riding reaches a qualifying finish and replay resets the race', () => {
  const g = M.create();
  for (let i = 0; i < 3600 && g.view().status === 'playing'; i++) {
    const d = g.view().distance;
    const lane = g.view().lane;
    const hazard = g.view().hazardsAhead.find(h => h.ahead < 36);
    const target = hazard ? Math.sign(lane - hazard.lane) * 0.34 : 0;
    const steer = lane < target - 0.02 ? 1 : lane > target + 0.02 ? -1 : 0;
    g.advance(M.STEP, { accelerate: true, steer });
    if (i % 45 === 12) g.act('attack');
  }
  assert.equal(g.view().status, 'won');
  assert.ok(g.view().place <= 3);
  const again = g.replay();
  assert.ok(again);
  assert.equal(again.view().tick, 0);
  assert.equal(again.view().status, 'playing');
});

test('slow unassisted riding loses when the three rivals finish first', () => {
  const g = M.create();
  for (let i = 0; i < 3600 && g.view().status === 'playing'; i++) g.advance(M.STEP);
  assert.equal(g.view().status, 'lost');
  assert.equal(g.view().place, 4);
  assert.ok(g.drain().some(e => e.kind === 'last-place'));
  assert.equal(g.progress().bestPlaces[0], 4);
  assert.equal(M.validProgress(g.progress()), true);
  assert.equal(g.replay().view().distance, 0);
});

test('the three original tracks progressively change length, curve, scenery, and hazard pressure', () => {
  assert.deepEqual(M.STAGES.map(stage => stage.name), ['Bãi Cát', 'Đèo Mây', 'Dốc Đỏ']);
  assert.deepEqual(M.STAGES.map(stage => stage.palette), ['dune', 'mist', 'ember']);
  assert.deepEqual(M.STAGES.map(stage => stage.hazards.length), [5, 7, 8]);
  assert.deepEqual(M.STAGES.map(stage => stage.curve), [1, 1.25, 1.5]);
  assert.deepEqual(M.STAGES.map(stage => stage.trackLength), [720, 780, 840]);
  assert.ok(M.STAGES.every((stage, index) => index === 0 ||
    Math.max(...stage.riders.map(rider => rider.pace)) > Math.max(...M.STAGES[index - 1].riders.map(rider => rider.pace))));
});

test('simple full-throttle riding meets the rising hazard pressure across the cup', () => {
  const results = M.STAGES.map((_, stage) => {
    const g = M.create(stage, { unlockedStage: stage });
    for (let i = 0; i < 5000 && g.view().status === 'playing'; i++) {
      g.advance(M.STEP, { accelerate: true }); g.drain();
    }
    return g.view();
  });
  assert.equal(results[0].crashes, 1); assert.equal(results[0].status, 'won'); assert.equal(results[0].place, 1);
  assert.equal(results[1].crashes, 2); assert.equal(results[1].status, 'won'); assert.equal(results[1].place, 2);
  assert.equal(results[2].crashes, 3); assert.equal(results[2].status, 'lost');
  assert.ok(results[2].distance < results[2].trackLength);
});

test('early steering earns faster recorded times and clean driving beats the final course', () => {
  for (let stage = 0; stage < M.STAGES.length; stage++) {
    const straight = M.create(stage, { unlockedStage: stage });
    for (let i = 0; i < 5000 && straight.view().status === 'playing'; i++) {
      straight.advance(M.STEP, { accelerate: true }); straight.drain();
    }
    const guided = M.create(stage, { unlockedStage: stage }), safe = runCourse(guided, false);
    if (stage < 2) {
      const baseline = straight.view();
      assert.equal(baseline.status, 'won');
      assert.equal(baseline.place, stage === 0 ? 1 : 2, 'the first is forgiving; the second rewards steering for first');
      assert.equal(safe.status, 'won');
      assert.equal(safe.place, 1);
      assert.equal(safe.crashes, 0);
      assert.ok(safe.finishTimeMs < baseline.finishTimeMs, M.STAGES[stage].name + ' rewards early hazard avoidance');
    } else {
      assert.equal(straight.view().status, 'lost');
      assert.equal(safe.status, 'won', 'the final course is beatable with clear steering');
      assert.equal(safe.crashes, 0);
    }
    assert.equal(guided.progress().bestTimes[stage], safe.finishTimeMs);
  }
});

test('a clean drive qualifies through the cup, records ranks, and unlocks one race at a time', () => {
  const g = M.create();
  assert.equal(g.view().stageIndex, 0);
  assert.equal(g.selectStage(1), false);
  for (let stage = 0; stage < M.STAGES.length; stage++) {
    const result = runCourse(g);
    assert.equal(result.status, 'won', result.stageName + ' can be qualified without contact');
    assert.ok(result.place <= 3);
    assert.equal(result.bestPlaces[stage], result.place);
    assert.ok(Number.isSafeInteger(result.bestTimes[stage]) && result.bestTimes[stage] > 0);
    if (stage + 1 < M.STAGES.length) {
      assert.equal(result.unlockedStage, stage + 1);
      assert.equal(g.nextStage(), true);
      assert.equal(g.view().stageIndex, stage + 1);
      assert.equal(g.view().distance, 0);
    }
  }
  const progress = g.progress();
  assert.equal(M.validProgress(progress), true);
  assert.equal(progress.unlockedStage, 2);
  assert.ok(progress.bestPlaces.every(place => Number.isInteger(place) && place <= 3));
  assert.ok(progress.bestTimes.every(time => Number.isSafeInteger(time) && time > 0));
  assert.equal(g.selectStage(0), true);
  assert.equal(g.view().stageIndex, 0);
  assert.equal(g.view().unlockedStage, 2);
  assert.equal(g.view().bestPlaces[0], progress.bestPlaces[0]);
});

test('cup progress validation rejects impossible unlocks, places and times', () => {
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 0, bestPlaces: [null, null, null], bestTimes: [null, null, null] }), true);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 2, bestPlaces: [1, 2, null], bestTimes: [22000, 24000, null] }), true);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 0, bestPlaces: [1, null, null], bestTimes: [22000, null, null] }), false);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 2, bestPlaces: [1, null, null], bestTimes: [22000, null, null] }), false);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 0, bestPlaces: [4, null, null], bestTimes: [-1, null, null] }), false);
  assert.equal(M.validProgress({ version: 99, unlockedStage: 0, bestPlaces: [null, null, null], bestTimes: [null, null, null] }), false);
});

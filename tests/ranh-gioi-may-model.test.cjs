const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/ranh-gioi-may-model.js');

function runSeconds(model, seconds) {
  const count = Math.ceil(seconds / M.STEP);
  for (let i = 0; i < count && model.view().status === 'playing'; i++) model.advance(M.STEP);
}

function runUnitPlan(model, plan = 'shield', timeLimit = 120) {
  const lineup = Array.isArray(plan) ? plan : [plan];
  let next = 0, deployments = 0;
  for (let i = 0; i < Math.ceil(timeLimit / M.STEP) && model.view().status === 'playing'; i++) {
    const view = model.view();
    if (view.elapsed >= next) {
      if (model.deploy(lineup[deployments % lineup.length])) {
        deployments++;
        next = view.elapsed + 0.25;
      }
      else next = view.elapsed + 0.1;
    }
    model.advance(M.STEP); model.drain();
  }
  return model.view();
}

test('one encounter starts immediately with three distinct original roles and two healthy bases', () => {
  const v = M.create().view();
  assert.equal(v.status, 'playing');
  assert.equal(v.elapsed, 0);
  assert.equal(v.bases.player, M.BASE_HEALTH);
  assert.equal(v.bases.rival, M.BASE_HEALTH);
  assert.equal(v.resources.player, 82);
  assert.equal(v.units.length, 0);
  assert.deepEqual(Object.keys(M.TYPES), ['shield', 'sling', 'beetle']);
  assert.deepEqual(Object.values(M.TYPES).map(unit => unit.name), ['Mầm Khiên', 'Nỏ Hạt', 'Bọ Sỏi']);
});

test('unit deployment spends only available resources while both sides regenerate passively', () => {
  const g = M.create({ ai: false });
  assert.equal(g.deploy('beetle'), true);
  assert.equal(Math.floor(g.view().resources.player), 14);
  assert.equal(g.deploy('sling'), false);
  runSeconds(g, 3);
  assert.ok(g.view().resources.player > 14);
  assert.ok(Math.abs(g.view().resources.rival - 133) < 1e-7);
  assert.ok(g.drain().some(event => event.kind === 'unaffordable' && event.type === 'sling'));
});

test('units advance on one lane and automatically attack opposing units', () => {
  const g = M.create({ ai: false });
  g.deploy('shield', 'player');
  g.deploy('shield', 'rival');
  runSeconds(g, 9);
  const v = g.view();
  assert.ok(v.units.find(unit => unit.side === 'player').x > M.FIELD.playerSpawn);
  assert.ok(v.units.find(unit => unit.side === 'rival').x < M.FIELD.rivalSpawn);
  assert.ok(g.drain().some(event => event.kind === 'hit-unit'));
});

test('opponent sends units on its own schedule without input from the player', () => {
  const g = M.create();
  runSeconds(g, 6);
  const rivalUnits = g.view().units.filter(unit => unit.side === 'rival');
  assert.ok(rivalUnits.length >= 2);
  assert.ok(g.drain().filter(event => event.kind === 'deploy' && event.side === 'rival').length >= 2);
});

test('fixed-step simulation gives the same outcome at 30, 60, 120 and 144 Hz', () => {
  const outcomes = [];
  for (const hz of [30, 60, 120, 144]) {
    const g = M.create();
    for (let i = 0; i < hz * 8; i++) {
      if (i === hz) g.deploy('shield');
      if (i === hz * 2) g.deploy('sling');
      if (i === hz * 3) g.deploy('beetle');
      g.advance(1 / hz);
    }
    outcomes.push(g.view());
  }
  const first = outcomes[0];
  for (const current of outcomes.slice(1)) {
    assert.equal(current.tick, first.tick);
    assert.equal(current.status, first.status);
    assert.equal(current.units.length, first.units.length);
    assert.ok(Math.abs(current.resources.player - first.resources.player) < 1e-7);
    assert.ok(Math.abs(current.bases.player - first.bases.player) < 1e-7);
    assert.ok(Math.abs(current.bases.rival - first.bases.rival) < 1e-7);
    for (let i = 0; i < first.units.length; i++) {
      assert.equal(current.units[i].id, first.units[i].id);
      assert.ok(Math.abs(current.units[i].x - first.units[i].x) < 1e-7);
      assert.ok(Math.abs(current.units[i].hp - first.units[i].hp) < 1e-7);
    }
  }
});

test('three bridges teach distinct enemy pressure and unit counters', () => {
  assert.deepEqual(M.STAGES.map(stage => stage.name), ['Cầu Mầm', 'Cầu Đá', 'Cổng Trời']);
  assert.deepEqual(M.STAGES.map(stage => stage.palette), ['dawn', 'mist', 'dusk']);
  assert.deepEqual(M.STAGES.map(stage => stage.botOrder[0]), ['shield', 'shield', 'beetle']);
  assert.deepEqual(M.STAGES[1].botOrder, ['shield', 'beetle', 'sling'], 'the second bridge has a mixed counter cycle');
  assert.ok(M.STAGES[2].botOrder.every(type => type === 'beetle'), 'the final bridge asks for the ranged response');
  assert.ok(M.STAGES[2].rivalStart > M.STAGES[2].playerStart);
  assert.ok(M.STAGES[2].rivalRate > M.STAGES[2].playerRate);
  assert.deepEqual(M.MATCHUP_DAMAGE, { sling: { shield: 0.5, beetle: 3 }, beetle: { shield: 3 } });
});

test('the rival honors each bridge roster instead of filling gaps with cheaper units', () => {
  for (let stage = 0; stage < M.STAGES.length; stage++) {
    const match = M.create({ stageIndex: stage, unlockedStage: stage });
    runSeconds(match, 8);
    const sends = match.drain().filter(event => event.kind === 'deploy' && event.side === 'rival');
    assert.ok(sends.length >= 2, M.STAGES[stage].name + ' should establish its pressure early');
    assert.ok(sends.every(event => M.STAGES[stage].botOrder.includes(event.type)));
    for (let index = 0; index < sends.length; index++) {
      assert.equal(sends[index].type, M.STAGES[stage].botOrder[index % M.STAGES[stage].botOrder.length]);
    }
  }
});

test('counter units apply the stated damage during live combat', () => {
  const shieldLine = M.create({ ai: false });
  shieldLine.deploy('shield', 'player');
  shieldLine.deploy('sling', 'rival');
  runSeconds(shieldLine, 12);
  assert.ok(shieldLine.drain().some(event => event.kind === 'hit-unit' && event.side === 'rival' && event.type === 'sling' && event.damage === 5));

  const rangedLine = M.create({ ai: false });
  rangedLine.deploy('sling', 'player');
  rangedLine.deploy('beetle', 'rival');
  runSeconds(rangedLine, 14);
  assert.ok(rangedLine.drain().some(event => event.kind === 'hit-unit' && event.side === 'player' && event.type === 'sling' && event.damage === 30));

  const heavyLine = M.create({ ai: false });
  heavyLine.deploy('beetle', 'player');
  heavyLine.deploy('shield', 'rival');
  runSeconds(heavyLine, 14);
  assert.ok(heavyLine.drain().some(event => event.kind === 'hit-unit' && event.side === 'player' && event.type === 'beetle' && event.damage === 69));
});

test('each authored pressure pattern has a feasible answer, and the final bridge rejects shield-only rushing', () => {
  const answers = ['shield', ['beetle', 'sling', 'shield'], 'sling'];
  for (let stage = 0; stage < M.STAGES.length; stage++) {
    const empty = M.create({ stageIndex: stage, unlockedStage: stage });
    runSeconds(empty, 90);
    assert.equal(empty.view().status, 'lost', M.STAGES[stage].name + ' punishes an unattended base');
    assert.ok(empty.view().elapsed <= 40, M.STAGES[stage].name + ' ends a neglected defense promptly');

    const match = M.create({ stageIndex: stage, unlockedStage: stage });
    const result = runUnitPlan(match, answers[stage]);
    assert.equal(result.status, 'won', M.STAGES[stage].name + ' has a simple, feasible counter-push');
    assert.ok(result.elapsed <= (stage === 1 ? 65 : stage === 2 ? 45 : 35), M.STAGES[stage].name + ' remains an arcade round');
    assert.equal(result.unlockedStage, Math.min(M.STAGES.length - 1, stage + 1));
    assert.ok(Number.isSafeInteger(result.bestTimes[stage]));
  }

  const finalShieldRush = M.create({ stageIndex: 2, unlockedStage: 2 });
  assert.equal(runUnitPlan(finalShieldRush, 'shield').status, 'lost');
  assert.ok(finalShieldRush.view().elapsed <= 65, 'the losing pressure policy remains finite and replayable');
});

test('a timed mixed roster clears the bridge faster than every single-unit baseline', () => {
  for (const type of ['shield', 'sling', 'beetle']) {
    const single = M.create({ stageIndex: 1, unlockedStage: 1 });
    assert.notEqual(runUnitPlan(single, type, 90).status, 'won', type + ' alone should not clear the mixed rival wave within 90 seconds');
  }
  const mixed = M.create({ stageIndex: 1, unlockedStage: 1 });
  const result = runUnitPlan(mixed, ['beetle', 'sling', 'shield']);
  assert.equal(result.status, 'won');
  assert.ok(result.elapsed <= 60, 'cycling counters once wins within the short-stage target');
});

test('campaign advances and replays unlocked bridges while saving best clear times', () => {
  let game = M.create();
  assert.equal(game.view().stageIndex, 0);
  assert.equal(game.selectStage(1), null);
  const first = runUnitPlan(game, 'shield');
  assert.equal(first.status, 'won');
  assert.equal(first.unlockedStage, 1);
  assert.equal(M.validProgress(game.progress()), true);
  game = game.nextStage();
  assert.equal(game.view().stageIndex, 1);
  assert.equal(game.view().bestTimes[0], first.bestTimes[0]);
  const second = runUnitPlan(game, ['beetle', 'sling', 'shield']);
  assert.equal(second.status, 'won');
  assert.equal(second.unlockedStage, 2);
  game = game.nextStage();
  assert.equal(game.view().stageIndex, 2);
  const third = runUnitPlan(game, 'sling');
  assert.equal(third.status, 'won');
  assert.equal(third.unlockedStage, 2);
  const progress = game.progress();
  assert.equal(M.validProgress(progress), true);
  assert.ok(progress.bestTimes.every(time => Number.isSafeInteger(time) && time > 0));
  assert.equal(game.selectStage(0).view().bestTimes[0], progress.bestTimes[0]);
});

test('campaign progress rejects impossible unlocks and invalid clear times', () => {
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 0, bestTimes: [null, null, null] }), true);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 2, bestTimes: [1000, 2000, null] }), true);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 0, bestTimes: [1000, null, null] }), false);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 2, bestTimes: [1000, null, null] }), false);
  assert.equal(M.validProgress({ version: M.PROGRESS_VERSION, unlockedStage: 0, bestTimes: [-1, null, null] }), false);
  assert.equal(M.validProgress({ version: 99, unlockedStage: 0, bestTimes: [null, null, null] }), false);
});

test('a successful push wins, a lost base ends the match, and replay resets the encounter', () => {
  const push = M.create({ ai: false, baseHealth: 20 });
  assert.equal(push.deploy('beetle'), true);
  runSeconds(push, 32);
  assert.equal(push.view().status, 'won');
  assert.equal(push.view().bases.rival, 0);
  const restarted = push.replay();
  assert.ok(restarted);
  assert.equal(restarted.view().elapsed, 0);
  assert.equal(restarted.view().status, 'playing');
  assert.equal(restarted.view().units.length, 0);

  const defense = M.create({ ai: false, baseHealth: 20 });
  assert.equal(defense.deploy('beetle', 'rival'), true);
  runSeconds(defense, 32);
  assert.equal(defense.view().status, 'lost');
  assert.equal(defense.view().bases.player, 0);
  assert.equal(defense.replay().view().status, 'playing');
});

test('terminal results do not accept new commands or advance further', () => {
  const g = M.create({ ai: false, baseHealth: 20 });
  g.deploy('beetle');
  runSeconds(g, 32);
  const before = g.view().tick;
  assert.equal(g.deploy('shield'), false);
  g.advance(2);
  assert.equal(g.view().tick, before);
  assert.equal(g.replay().view().status, 'playing');
});

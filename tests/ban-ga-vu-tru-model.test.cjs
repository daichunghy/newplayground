const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/ban-ga-vu-tru-model.js');

function shotFixture({ waveIndex, waveKills, kills }) {
  const state = M.create(71).serialize();
  state.ticks = 100;
  state.waveIndex = waveIndex;
  state.waveKills = waveKills;
  state.kills = kills;
  state.score = kills * 100;
  state.nextSpawnTick = 100000;
  state.drifters = [{ id: state.nextId++, x: 320, y: 100, vx: 0, vy: 0, radius: 13, tint: 0, fireAtTick: 100000 }];
  state.hostileBolts = [{ id: state.nextId++, x: 20, y: 30, vx: 0, vy: 0, radius: 5 }];
  state.shots = [{ id: state.nextId++, x: 320, y: 117, vy: -M.PLAYER_SHOT_SPEED, radius: 3 }];
  return M.makeModel(state);
}

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
  assert.ok(['complete', 'won'].includes(view.status));
  if (view.status === 'complete') assert.equal(view.remainingTicks, 0);
  if (view.status === 'won') assert.equal(view.kills, M.CAMPAIGN_GOAL);
  assert.ok(view.score > 0);
  assert.ok(view.hull > 0);
});

test('three authored waves ramp pressure, grant a clean checkpoint, and finish at fifteen targets', () => {
  assert.deepEqual(M.WAVES.map(wave => wave.goal), [3, 5, 7]);
  assert.deepEqual(M.WAVES.map(wave => wave.name), ['Mạch Sương', 'Vành Lục', 'Lõi Rạng']);
  assert.ok(M.WAVES[0].spawnGap > M.WAVES[1].spawnGap && M.WAVES[1].spawnGap > M.WAVES[2].spawnGap);
  assert.ok(M.WAVES[0].boltSpeed < M.WAVES[1].boltSpeed && M.WAVES[1].boltSpeed < M.WAVES[2].boltSpeed);
  assert.equal(M.CAMPAIGN_GOAL, 15);

  const first = shotFixture({ waveIndex: 0, waveKills: 2, kills: 2 });
  const events = first.advance(M.STEP_MS);
  assert.equal(first.view().score, 300);
  assert.equal(first.view().kills, 3);
  assert.equal(first.view().waveIndex, 1);
  assert.equal(first.view().waveKills, 0);
  assert.equal(first.view().waveBreakTicks, M.WAVE_BREAK_TICKS);
  assert.equal(first.view().invulnerableTicks, M.WAVE_BREAK_TICKS);
  assert.equal(first.view().drifters.length, 0);
  assert.equal(first.view().hostileBolts.length, 0);
  assert.ok(events.some(event => event.kind === 'wave-cleared' && event.nextWave === 2));
  first.advance(89 * M.STEP_MS);
  assert.equal(first.view().waveBreakTicks, 1);
  assert.equal(first.view().drifters.length, 0);
  first.advance(M.STEP_MS);
  assert.equal(first.view().waveBreakTicks, 0);
  assert.equal(first.view().drifters.length, 1, 'the next wave enters after the 1.5-second clear');

  const final = shotFixture({ waveIndex: 2, waveKills: 6, kills: 14 });
  const lastShot = final.advance(M.STEP_MS);
  assert.equal(final.view().status, 'won');
  assert.equal(final.view().score, 1500);
  assert.equal(final.view().kills, 15);
  assert.equal(final.view().remainingTicks, M.RUN_TICKS - 101);
  assert.equal(final.view().drifters.length, 0);
  assert.equal(final.view().hostileBolts.length, 0);
  assert.ok(lastShot.some(event => event.kind === 'run-ended' && event.result === 'clear'));
  assert.deepEqual(final.advance(5000), []);
  assert.equal(final.view().status, 'won');
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

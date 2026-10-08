const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/bubble-trap-model.js');

function run(model, seconds, move = 0) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) model.advance(1 / 60, { move });
}

function captureFirstGroundEnemy(model) {
  // Move into range while the first ground patrol is still well ahead.
  run(model, 1.6, 1);
  assert.equal(model.act('bubble'), true);
  run(model, 0.9);
  assert.equal(model.view().traps, 1);
  run(model, 0.9, 1);
  return model.view();
}

test('the three authored rounds use their own platform layouts and original names', () => {
  const v = M.create().view();
  assert.equal(v.stage.name, 'Sân Sương Non');
  assert.equal(v.roundCount, 3);
  assert.equal(v.lives, 3);
  assert.equal(v.enemiesRemaining, 3);
  assert.deepEqual(M.STAGES.map(x => x.name), ['Sân Sương Non', 'Vườn Đèn Hạt', 'Mái Ngói Mưa']);
  assert.ok(M.STAGES[0].platforms.length >= 3);
  assert.ok(M.STAGES[1].platforms[0].id !== M.STAGES[2].platforms[0].id);
});

test('fixed-step model gives the same movement result at 30, 60, and 120 render rates', () => {
  const snapshots = [];
  for (const rate of [30, 60, 120]) {
    const g = M.create();
    for (let i = 0; i < rate * 8; i++) g.advance(1 / rate, { move: i < rate * 2 ? 1 : -0.25 });
    snapshots.push(g.view());
  }
  assert.deepEqual(snapshots[1], snapshots[0]);
  assert.deepEqual(snapshots[2], snapshots[0]);
});

test('jump reaches a hand-built terrace, then walking off makes gravity resume', () => {
  const g = M.create();
  assert.equal(g.act('jump'), true);
  run(g, 0.9, 1);
  const landed = g.view().player;
  assert.equal(landed.grounded, true);
  assert.equal(landed.platformId, 'reed-left');
  assert.ok(landed.y < M.GROUND_Y - landed.height);
  run(g, 0.75, 1);
  const fallen = g.view().player;
  assert.equal(fallen.platformId, 'ground');
  assert.equal(fallen.grounded, true);
});

test('nearby threat is trapped, bubble drifts upward, and a second touch awards points', () => {
  const g = M.create();
  const before = captureFirstGroundEnemy(g);
  assert.equal(before.enemies.find(e => e.id === 'moss-1').mode, 'trapped');
  const trapped = before.bubbles.find(b => b.kind === 'trap');
  assert.ok(trapped);
  const y = trapped.y;
  run(g, 0.9);
  assert.ok(g.view().bubbles.find(b => b.id === trapped.id).y < y);
  assert.equal(g.act('bubble'), true);
  const popped = g.view();
  assert.equal(popped.enemies.find(e => e.id === 'moss-1').mode, 'dead');
  assert.equal(popped.pops, 1);
  assert.equal(popped.score, 300);
  assert.equal(popped.enemiesRemaining, 2);
  assert.equal(popped.bubbles.length, 0);
  assert.ok(g.drain().some(e => e.kind === 'pop' && e.points === 300));
});

test('a trapped bubble is a liftable platform and popping it while riding springs the player upward', () => {
  const g = M.create();
  run(g, 1.8, 1);
  run(g, 3.0);
  assert.equal(g.act('bubble'), true);
  run(g, 0.9);
  assert.equal(g.view().enemies.find(e => e.id === 'moss-1').mode, 'trapped');
  assert.equal(g.act('jump'), true);
  run(g, 0.25, 1);
  run(g, 0.8);
  const rider = g.view().player;
  assert.equal(rider.grounded, true);
  assert.ok(rider.ridingBubble);
  assert.ok(rider.y < M.GROUND_Y - rider.height);
  assert.equal(g.act('bubble'), true);
  assert.equal(g.view().player.ridingBubble, null);
  assert.equal(g.view().player.vy, -354);
  assert.equal(g.view().score, 300);
});

test('an unpopped bubble fades and releases its enemy back into the approach loop', () => {
  const g = M.create();
  run(g, 1.6, 1);
  g.act('bubble');
  run(g, 1.1);
  assert.equal(g.view().traps, 1);
  assert.equal(g.view().enemies.find(e => e.id === 'moss-1').mode, 'trapped');
  run(g, 6.9);
  assert.equal(g.view().enemies.find(e => e.id === 'moss-1').mode, 'alive');
  assert.equal(g.view().bubbles.some(b => b.kind === 'trap'), false);
  assert.ok(g.drain().some(e => e.kind === 'escape'));
});

test('replay creates a fresh round only after terminal play and damage costs a life', () => {
  const g = M.create();
  run(g, 23);
  const v = g.view();
  assert.ok(v.hitsTaken >= 1);
  assert.ok(v.lives < 3 || v.status === 'lost');
  if (v.status !== 'playing') {
    const replay = g.replay();
    assert.ok(replay);
    assert.equal(replay.view().status, 'playing');
    assert.equal(replay.view().score, 0);
  } else {
    assert.equal(g.replay(), null);
  }
  const fresh = M.create().view();
  assert.equal(fresh.status, 'playing');
  assert.equal(fresh.score, 0);
  assert.equal(fresh.lives, 3);
  assert.equal(fresh.round, 1);
});

test('clearing a round starts the next authored layout with score and lives carried forward', () => {
  const g = M.create();
  run(g, 1.6, 1); g.act('bubble'); run(g, 0.9); run(g, 0.9, 1); g.act('bubble');
  assert.equal(g.view().enemiesRemaining, 2);

  g.act('jump'); run(g, 0.19, -1); run(g, 0.4); run(g, 1 / 60, 1);
  g.act('bubble'); run(g, 0.04); assert.equal(g.view().enemies.find(e => e.id === 'moss-3').mode, 'trapped');
  run(g, 0.42); g.act('bubble'); assert.equal(g.view().enemiesRemaining, 1);

  run(g, 1.3, -1); g.act('jump'); run(g, 0.9, -1); run(g, 1 / 60, 1);
  g.act('bubble'); run(g, 0.3); run(g, 0.42, 1); g.act('bubble');
  assert.equal(g.view().enemiesRemaining, 0);
  run(g, 0.02);
  assert.ok(g.drain().some(e => e.kind === 'round-clear'));
  run(g, 1.4);
  const next = g.view();
  assert.equal(next.round, 2);
  assert.equal(next.stage.name, 'Vườn Đèn Hạt');
  assert.equal(next.score, 1050);
  assert.equal(next.lives, 3);
  assert.equal(next.enemiesRemaining, 4);
});

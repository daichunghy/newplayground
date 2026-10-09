const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/bubble-dome-model.js');

function settle(model) {
  for (let i = 0; i < 240 && model.view().projectile; i++) model.tick(1 / 60);
  return model.view();
}

test('same seed deals the same bubble board and shot queue', () => {
  const a = M.create({ seed: 'violet-orbit' }).view();
  const b = M.create({ seed: 'violet-orbit' }).view();
  const c = M.create({ seed: 'new-orbit' }).view();
  assert.deepEqual(a.bubbles, b.bubbles);
  assert.equal(a.currentColor, b.currentColor);
  assert.notDeepEqual(a.bubbles, c.bubbles);
  assert.equal(a.bubbles.length, 54);
  assert.equal(a.shotsLeft, 32);
});

test('hex neighbors are reciprocal, bounded and include the correct staggered diagonals', () => {
  assert.deepEqual(M.neighbors(0, 0).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[0, 1], [1, 0]]);
  assert.deepEqual(M.neighbors(1, 0).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[0, 0], [0, 1], [1, 1], [2, 0], [2, 1]]);
  for (let r = 0; r < M.MAX_ROWS; r++) for (let c = 0; c < M.COLS; c++) {
    for (const [nr, nc] of M.neighbors(r, c)) assert.ok(M.neighbors(nr, nc).some(([rr, cc]) => rr === r && cc === c));
  }
});

test('a matched shot attaches to the grid and pops its full same-color cluster', () => {
  const model = M.create({ seed: 4, initial: [
    { row: 0, col: 4, color: 'rose' }, { row: 0, col: 5, color: 'rose' }
  ], queue: ['rose'] });
  assert.equal(model.fire(0), true);
  const result = settle(model);
  assert.equal(result.status, 'won');
  assert.equal(result.bubbles.length, 0);
  assert.equal(result.lastEvent, 'win');
  assert.equal(result.shotsUsed, 1);
});

test('popping a top cluster drops bubbles no longer connected to the ceiling', () => {
  const model = M.create({ seed: 5, initial: [
    { row: 0, col: 4, color: 'amber' }, { row: 0, col: 5, color: 'amber' },
    { row: 2, col: 0, color: 'blue' }
  ], queue: ['amber'] });
  model.fire(0);
  const result = settle(model);
  assert.equal(result.status, 'won');
  assert.equal(result.bubbles.length, 0);
});

test('misses attach without scoring, consume one shot, and exhaust into a clear loss', () => {
  const model = M.create({ seed: 6, initial: [{ row: 0, col: 0, color: 'amber' }], queue: ['rose'] });
  model.fire(-65);
  let view = settle(model);
  assert.equal(view.status, 'lost');
  assert.equal(view.lastEvent, 'out-of-shots');
  assert.equal(view.shotsUsed, 1);
  assert.equal(view.bubbles.length, 2);
});

test('aim clamps to safe upper trajectories, wall bounces stay in bounds, invalid ticks are inert', () => {
  const model = M.create({ seed: 7, initial: [], queue: ['blue', 'mint'] });
  assert.equal(model.setAim(900), true);
  assert.equal(model.view().aim, M.AIM_LIMIT);
  assert.equal(model.fire(), true);
  const before = model.view();
  assert.equal(model.tick(2), false);
  assert.deepEqual(model.view(), before);
  assert.equal(model.tick(1), true);
  assert.ok(model.view().projectile.x < 9.5);
  assert.ok(model.view().projectile.x < 5, 'the ball has reflected from the right wall');
  assert.equal(model.view().projectile.y < 11, true);
});

test('restart restores the deterministic board, queue, aim and shot count', () => {
  const model = M.create({ seed: 'restart-orbit', queue: ['blue', 'rose'] });
  const opening = model.view();
  model.setAim(-32);
  model.fire();
  model.tick(0.5);
  model.restart();
  const restored = model.view();
  assert.deepEqual(restored.bubbles, opening.bubbles);
  assert.equal(restored.currentColor, opening.currentColor);
  assert.equal(restored.shotsLeft, 2);
  assert.equal(restored.aim, 0);
  assert.equal(restored.projectile, null);
});

test('invalid layouts and colors reject without changing an active model', () => {
  assert.throws(() => M.create({ initial: [{ row: 0, col: 0, color: 'purple' }] }), /invalid or duplicate/);
  assert.throws(() => M.create({ queue: ['purple'] }), /known colors/);
  const model = M.create({ seed: 8 });
  const before = model.view();
  assert.equal(model.setAim(Number.NaN), false);
  assert.equal(model.fire(Number.NaN), false);
  assert.equal(model.tick(-1), false);
  assert.deepEqual(model.view(), before);
});

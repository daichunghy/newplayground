const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/test-tube-model.js');

test('seeded bottle and capsule queue are repeatable and expose three colors', () => {
  const a = M.create({ seed: 'glass-01' }).view();
  const b = M.create({ seed: 'glass-01' }).view();
  const c = M.create({ seed: 'glass-02' }).view();
  assert.deepEqual(a.board, b.board);
  assert.deepEqual(a.active, b.active);
  assert.deepEqual(a.preview, b.preview);
  assert.notDeepEqual(a.board, c.board);
  assert.equal(a.virusesLeft, 12);
  assert.equal(a.status, 'playing');
});

test('capsules move, rotate, obey bottle bounds and reject occupied cells', () => {
  const model = M.create({ seed: 1, viruses: [{ row: 2, col: 4, color: 'blue' }], pairs: [['amber', 'rose']] });
  assert.equal(model.move(-1), true);
  assert.equal(model.move(-1), true);
  assert.equal(model.move(-1), true);
  assert.equal(model.rotate(), true);
  let active = model.view().active;
  assert.deepEqual(active.mate, { row: 1, col: 1, color: 'rose' });
  assert.equal(model.move(-1), false);
  assert.equal(model.rotate(), true);
  active = model.view().active;
  assert.ok([active.pivot.col, active.mate.col].every(col => col >= 0 && col < M.COLS));
});

test('horizontal run of four removes matched capsules and viruses exactly once', () => {
  const model = M.create({
    seed: 2,
    viruses: [
      { row: 14, col: 0, color: 'blue' }, { row: 14, col: 1, color: 'blue' }, { row: 14, col: 2, color: 'blue' },
      { row: 15, col: 3, color: 'amber' }
    ],
    pairs: [['blue', 'rose'], ['amber', 'rose']]
  });
  model.rotate();
  model.hardDrop();
  let view = model.view();
  assert.equal(view.virusesLeft, 1);
  assert.equal(view.board[14][0], null);
  assert.equal(view.board[14][1], null);
  assert.equal(view.board[14][2], null);
  assert.equal(view.board[14][3], null);
  assert.equal(view.board[15][4]?.color, 'rose', 'unmatched capsule half falls to the bottom');
  assert.equal(view.status, 'playing');
  assert.equal(view.active.pivot.color, 'amber');
});

test('vertical virus match wins and terminal input stays locked', () => {
  const model = M.create({
    seed: 3,
    viruses: [
      { row: 12, col: 3, color: 'amber' }, { row: 13, col: 3, color: 'amber' }, { row: 14, col: 3, color: 'amber' }
    ],
    pairs: [['amber', 'amber']]
  });
  model.hardDrop();
  const view = model.view();
  assert.equal(view.status, 'won');
  assert.equal(view.virusesLeft, 0);
  assert.equal(view.lastEvent, 'win');
  assert.equal(model.move(-1), false);
  assert.equal(model.rotate(), false);
  assert.equal(model.hardDrop(), false);
  assert.equal(model.tick(1), false);
});

test('gravity advances at a fixed rate, soft drop is reversible, restart restores the opening', () => {
  const model = M.create({ seed: 4, viruses: [{ row: 15, col: 0, color: 'rose' }], pairs: [['blue', 'amber'], ['rose', 'blue']] });
  const opening = model.view();
  assert.equal(model.softDrop(), true);
  assert.equal(model.view().active.pivot.row, 2);
  assert.equal(model.tick(0.58), true);
  assert.equal(model.view().active.pivot.row, 3);
  model.restart();
  assert.deepEqual(model.view().active, opening.active);
  assert.equal(model.view().virusesLeft, 1);
  assert.equal(model.view().capsulesPlaced, 0);
});

test('bottle blocked at capsule spawn gives one clear loss and replay resets it', () => {
  const model = M.create({ seed: 5, viruses: [{ row: 0, col: 3, color: 'blue' }], pairs: [['amber', 'rose']] });
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().lastEvent, 'bottle-blocked');
  model.restart();
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().virusesLeft, 1);
});

test('overlapping horizontal and vertical matches clear their shared cells once', () => {
  const viruses = Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, col) => ({ row: row + 10, col: col + 2, color: 'rose' }))).flat();
  const model = M.create({ seed: 6, viruses, pairs: [['amber', 'blue']] });
  model.hardDrop();
  assert.equal(model.view().virusesLeft, 0);
  assert.equal(model.view().status, 'won');
});

test('invalid layouts, capsule queues and time deltas reject safely', () => {
  assert.throws(() => M.create({ viruses: [{ row: -1, col: 0, color: 'blue' }] }), /invalid or duplicate/);
  assert.throws(() => M.create({ pairs: [['green', 'blue']] }), /known colors/);
  const model = M.create({ seed: 7 });
  const before = model.view();
  assert.equal(model.move(0), false);
  assert.equal(model.tick(-1), false);
  assert.deepEqual(model.view(), before);
});

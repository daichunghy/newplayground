// Behavioral simulation tests. This suite does not represent real-browser/device QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/line98-model.js');
function fixture(board, extra = {}) {
  return { version: 1, rules: M.RULES, board: board || Array(81).fill(0), next: [2, 3, 4],
    score: 0, moves: 0, cleared: 0, status: 'playing', rng: 123456, previous: null, ...extra };
}
function from(cells, extra) {
  const b = Array(81).fill(0); Object.entries(cells).forEach(([i, color]) => { b[+i] = color; });
  const model = M.restore(fixture(b, extra)); assert.ok(model); return model;
}
const dense = () => Array.from({ length: 81 }, (_, i) => (Math.floor(i / 9) + 2 * (i % 9)) % 7 + 1);

test('9×9, seven colors, three initial balls, three preview colors and deterministic seeds', () => {
  for (const seed of [0, 1, 42, 0xffffffff]) {
    const a = M.create(seed), b = M.create(seed);
    assert.deepEqual(a.serialize(), b.serialize()); assert.equal(a.view().board.length, 81);
    assert.equal(a.view().free, 78); assert.equal(a.view().next.length, 3);
    assert.ok([...a.view().board, ...a.view().next].every(c => c >= 0 && c <= 7));
    assert.equal(a.view().canUndo, false); assert.equal(a.view().status, 'playing');
  }
  for (const seed of [-1, NaN, Infinity, 1.5, 4294967296, '3']) assert.throws(() => M.create(seed), RangeError);
});

test('BFS returns shortest contiguous orthogonal path and does not wrap rows', () => {
  const b = Array(81).fill(0); b[8] = 2;
  const path = M.findPath(b, 8, 9); assert.equal(path.length, 10);
  path.slice(1).forEach((i, n) => {
    const prev = path[n]; assert.equal(Math.abs(Math.floor(i / 9) - Math.floor(prev / 9)) + Math.abs(i % 9 - prev % 9), 1);
    assert.equal(b[i], 0);
  });
  assert.equal(path[0], 8); assert.equal(path.at(-1), 9);
  assert.deepEqual(M.findPath(b, 8, 8), []); assert.deepEqual(M.findPath(b, 9, 10), []);
  for (const i of [-1, 81, NaN, null, '2', 2.3]) assert.deepEqual(M.findPath(b, 8, i), []);
});

test('path routes around obstacles; diagonals are not allowed through blocked corners', () => {
  const model = from({ 0: 1, 1: 2, 9: 3 });
  assert.deepEqual(model.path(0, 10), []); assert.deepEqual(model.reachable(0), []);
  const route = from({ 0: 1, 1: 2, 10: 2 });
  assert.deepEqual(route.path(0, 2), [0, 9, 18, 19, 20, 11, 2]);
  const reachable = route.reachable(0); assert.equal(reachable.length, 78); assert.ok(!reachable.includes(1));
});

test('invalid or blocked actions consume no move, RNG, preview, score, or Undo', () => {
  const m = from({ 0: 1, 1: 2, 9: 3 }); const before = m.serialize();
  for (const [a, b] of [[0, 10], [0, 1], [0, 0], [2, 10], [-1, 10], [0, 81]]) assert.equal(m.move(a, b).kind, 'none');
  assert.deepEqual(m.serialize(), before); assert.equal(m.undo(), false);
});

test('non-scoring move spawns exactly the shown colors at distinct empty positions', () => {
  const m = from({ 0: 1 }, { next: [7, 7, 4] }); const result = m.move(0, 80);
  assert.equal(result.kind, 'move'); assert.equal(result.spawned.length, 3);
  assert.deepEqual(result.spawned.map(x => x.color), [7, 7, 4]);
  assert.equal(new Set(result.spawned.map(x => x.index)).size, 3);
  assert.ok(result.spawned.every(x => x.index !== 80)); assert.equal(m.view().free, 77);
  assert.equal(m.view().moves, 1); assert.equal(m.view().score, 0); assert.equal(m.view().next.length, 3);
});

test('horizontal, vertical and both diagonals clear; scoring move retains preview and RNG', () => {
  for (const line of [[0, 1, 2, 3, 4], [0, 9, 18, 27, 36], [0, 10, 20, 30, 40], [8, 16, 24, 32, 40]]) {
    const end = line.at(-1), cells = Object.fromEntries(line.slice(0, -1).map(i => [i, 1]));
    const source = end + 9 < 81 && !line.includes(end + 9) ? end + 9 : end + 1;
    cells[source] = 1; cells[80] = 2; const m = from(cells); const before = m.view(); const result = m.move(source, end);
    assert.equal(result.kind, 'clear'); assert.equal(result.removed.length, 5); assert.equal(result.points, 10);
    assert.equal(result.spawned.length, 0); assert.equal(m.view().free, 80); assert.equal(m.view().cleared, 5);
    assert.deepEqual(m.view().next, before.next); assert.equal(m.view().rng, before.rng);
  }
});

test('runs shorter than five do not clear; gaps and mixed colors break a line', () => {
  for (const cells of [{ 0: 1, 1: 1, 2: 1, 3: 1 }, { 0: 1, 1: 1, 3: 1, 4: 1, 5: 1 }, { 0: 1, 1: 1, 2: 2, 3: 1, 4: 1 }]) {
    const b = Array(81).fill(0); Object.entries(cells).forEach(([i, c]) => { b[i] = c; });
    assert.deepEqual(M.findLines(b).cells, []);
  }
});

test('maximal runs score once: classic table 5–9 equals 10,12,18,28,42', () => {
  for (let n = 5; n <= 9; n++) {
    const gap = Math.floor(n / 2);
    const cells = Object.fromEntries(Array.from({ length: n }, (_, i) => i).filter(i => i !== gap).map(i => [i, 1]));
    cells[gap + 9] = 1; cells[80] = 2;
    const m = from(cells), r = m.move(gap + 9, gap);
    assert.equal(r.lines.length, 1); assert.equal(r.removed.length, n); assert.equal(r.points, [10, 12, 18, 28, 42][n - 5]);
  }
  assert.equal(M.pointsFor(4), 0); assert.equal(M.pointsFor(-1), 0); assert.equal(M.pointsFor(82), 0);
});

test('crossing diagonals remove nine unique balls and apply the documented union score', () => {
  const cells = Object.fromEntries([20, 30, 50, 60, 24, 32, 48, 56, 39].map(i => [i, 5]));
  cells[80] = 2; const m = from(cells), result = m.move(39, 40);
  assert.equal(result.lines.length, 2); assert.equal(result.removed.length, 9);
  assert.equal(new Set(result.removed.map(x => x.index)).size, 9); assert.equal(result.points, 42);
  assert.equal(m.view().cleared, 9); assert.equal(m.view().free, 80);
});

test('line scanner handles all four intersecting axes without duplicate removal', () => {
  const b = Array(81).fill(0);
  [20, 30, 40, 50, 60, 24, 32, 48, 56, 22, 31, 49, 58, 38, 39, 41, 42].forEach(i => { b[i] = 6; });
  const r = M.findLines(b); assert.equal(r.lines.length, 4); assert.equal(r.cells.length, 17);
});

test('spawned balls can complete a line and score within the same turn', () => {
  // With an almost full board, the post-move empty source is filled deterministically.
  const b = dense(); b[0] = 0; [1, 2, 3, 4].forEach(i => { b[i] = 1; }); b[9] = 7;
  assert.equal(M.findLines(b).cells.length, 0);
  const m = M.restore(fixture(b, { next: [1, 2, 3] })); assert.ok(m);
  // Move 9 into 0, leave 9 empty. This fixture may not clear the target row; source makes a new vertical run below.
  const row = dense(); [0, 1, 2, 3].forEach(i => { row[i] = 1; }); row[4] = 2; row[13] = 0;
  const mm = M.restore(fixture(row, { next: [1, 3, 4] })); assert.ok(mm);
  const result = mm.move(4, 13);
  assert.equal(result.spawned.length, 1); assert.deepEqual(result.spawned[0], { index: 4, color: 1 });
  assert.equal(result.kind, 'clear'); assert.equal(result.points, 10); assert.equal(mm.view().status, 'playing');
  assert.equal(mm.view().free, 5, 'a full intermediate board is rescued before game-over');
});

test('one or two free cells spawn only that many; terminal board can be undone', () => {
  for (const free of [1, 2]) {
    const b = dense(); b[0] = 0; if (free === 2) b[80] = 0;
    const m = M.restore(fixture(b, { next: [7, 6, 5] })); assert.ok(m);
    const before = m.serialize(), r = m.move(1, 0);
    assert.equal(r.spawned.length, free); assert.equal(r.kind, 'loss'); assert.equal(m.view().free, 0);
    const terminal = m.serialize(); assert.equal(m.move(2, 3).kind, 'none'); assert.deepEqual(m.serialize(), terminal);
    assert.equal(m.undo(), true); assert.deepEqual(m.serialize(), before); assert.equal(m.undo(), false);
  }
});

test('undo and replay are bit-exact, including random positions, colors, score and preview', () => {
  const m = M.create(82); const first = m.view().board.findIndex(Boolean), dest = m.view().board.findIndex(c => !c);
  const before = m.serialize(), result = m.move(first, dest), after = m.serialize();
  assert.equal(m.undo(), true); assert.deepEqual(m.serialize(), before);
  assert.deepEqual(m.move(first, dest), result); assert.deepEqual(m.serialize(), after);
});

test('one-step undo replaces its history after each valid move and survives restore', () => {
  const m = from({ 0: 1 }); m.move(0, 80); const a = m.serialize();
  const to = m.reachable(80)[0]; m.move(80, to); const restored = M.restore(JSON.parse(JSON.stringify(m.serialize())));
  assert.ok(restored); assert.equal(restored.undo(), true);
  assert.deepEqual(restored.view().board, a.board); assert.equal(restored.view().rng, a.rng);
  assert.equal(restored.undo(), false);
});

test('serialization and views cannot mutate internal state', () => {
  const m = M.create(4), original = m.serialize(); const v = m.view();
  v.board.fill(7); v.next.fill(1); v.score = 999; const s = m.serialize(); s.board.fill(0);
  assert.deepEqual(m.serialize(), original);
  const target = original.board.findIndex(c => !c); m.move(original.board.findIndex(Boolean), target);
  const previous = m.serialize(); previous.previous.board.fill(7);
  assert.ok(M.restore(m.serialize()));
});

test('corrupt, future, unresolved and internally inconsistent snapshots are rejected', () => {
  const original = M.create(1).serialize();
  for (const change of [s => s.version = 2, s => s.rules = 'other', s => s.board.pop(), s => s.board[0] = 8,
    s => s.next = [1, 2], s => s.next[0] = 0, s => s.score = -1, s => s.moves = 1.1,
    s => s.rng = 4294967296, s => s.status = 'lost', s => s.cleared = Infinity,
    s => s.board = Array(81).fill(1), s => s.board = Array(81).fill(0), s => delete s.board[0], s => delete s.next[0], s => s.previous = { ...original, moves: 99 }]) {
    const s = JSON.parse(JSON.stringify(original)); change(s); assert.equal(M.restore(s), null);
  }
  for (const value of [null, {}, [], 'x']) assert.equal(M.restore(value), null);
});

test('100 seeded games preserve invariants and restore equivalence after every turn', () => {
  for (let seed = 0; seed < 100; seed++) {
    let m = M.create(seed);
    for (let step = 0; step < 60 && m.view().status === 'playing'; step++) {
      const v = m.view(); let choice = null;
      for (let i = (step * 7) % 81, n = 0; n < 81; n++, i = (i + 1) % 81) {
        if (v.board[i]) { const targets = m.reachable(i); if (targets.length) { choice = [i, targets[(step * 13) % targets.length]]; break; } }
      }
      if (!choice) break;
      const before = m.serialize(), result = m.move(...choice); assert.notEqual(result.kind, 'none');
      const s = m.serialize(); assert.equal(M.findLines(s.board).cells.length, 0); assert.ok(s.board.every(c => c >= 0 && c <= 7));
      assert.equal(s.moves, before.moves + 1); assert.equal(s.score - before.score, result.points);
      assert.equal(s.board.filter(Boolean).length, before.board.filter(Boolean).length + result.spawned.length + result.replenished.length - result.removed.length);
      const restored = M.restore(JSON.parse(JSON.stringify(s))); assert.ok(restored); assert.deepEqual(restored.serialize(), s); m = restored;
    }
  }
});


test('all-clear replenishes from the exact preview and Undo restores the entire turn', () => {
  const m = from({ 0: 1, 1: 1, 2: 1, 3: 1, 13: 1 }, { next: [7, 6, 5] });
  const before = m.serialize(), r = m.move(13, 4);
  assert.equal(r.kind, 'clear'); assert.equal(r.spawned.length, 0); assert.equal(r.points, 10);
  assert.deepEqual(r.replenished.map(x => x.color), [7, 6, 5]); assert.equal(m.view().free, 78);
  assert.equal(m.view().status, 'playing'); assert.equal(m.view().moves, 1); assert.ok(M.restore(m.serialize()));
  assert.equal(m.undo(), true); assert.deepEqual(m.serialize(), before);
  assert.deepEqual(m.move(13, 4), r, 'all-clear replay has identical placements and preview');
});

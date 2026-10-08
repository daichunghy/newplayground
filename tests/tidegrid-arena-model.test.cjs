const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/tidegrid-arena-model.js');

function stateWith({ pilot, rivet, bombs = [], gridEdit = null } = {}) {
  const s = M.create().serialize();
  for (const a of s.actors) a.alive = false;
  Object.assign(s.actors[0], { alive: true, ...(pilot || {}) });
  if (rivet !== false) Object.assign(s.actors[1], { alive: true, r: 1, c: 11, cooldown: 7, ...(rivet || {}) });
  s.bombs = bombs.map(b => ({ ...b }));
  s.nextBomb = bombs.reduce((n, b) => Math.max(n, b.id + 1), 1);
  gridEdit?.(s.grid);
  return s;
}
function restore(options) {
  const game = M.restore(stateWith(options));
  assert.ok(game, 'fixture should satisfy the save schema');
  return game;
}
function seekWalkable(grid, start) {
  const q = [start], seen = new Set([`${start.r}:${start.c}`]);
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    for (const d of Object.values(M.DIRS)) {
      const r = p.r + d.r, c = p.c + d.c, key = `${r}:${c}`;
      if (grid[r]?.[c] !== 0 || seen.has(key)) continue;
      seen.add(key); q.push({ r, c });
    }
  }
  return q;
}

test('original 13×11 board has safe spawn routes and distinct authored crate lanes', () => {
  const game = M.create(), grid = game.view().grid;
  assert.equal(grid.length, 11); assert.ok(grid.every(row => row.length === 13));
  assert.equal(M.SPAWNS.length, 4); assert.equal(M.CRATES.length, 18);
  for (const spawn of M.SPAWNS) {
    const accessible = seekWalkable(grid, spawn);
    const escape = accessible.find(p => !(p.r === spawn.r && Math.abs(p.c - spawn.c) <= M.RANGE) &&
      !(p.c === spawn.c && Math.abs(p.r - spawn.r) <= M.RANGE));
    assert.ok(escape, `spawn ${spawn.r},${spawn.c} needs a reachable exit from its own blast lane`);
    assert.equal(grid[spawn.r][spawn.c], 0);
  }
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().rivals.length, 3);
});

test('movement responds on the first press, repeats on fixed steps, and release stops it', () => {
  const game = M.create();
  assert.equal(game.steer('right'), true); assert.equal(game.view().pilot.c, 2);
  game.stepTicks(M.MOVE_TICKS); assert.equal(game.view().pilot.c, 3);
  assert.equal(game.steer(null), true);
  const stopped = { r: game.view().pilot.r, c: game.view().pilot.c };
  game.stepTicks(M.MOVE_TICKS * 3);
  assert.deepEqual({ r: game.view().pilot.r, c: game.view().pilot.c }, stopped);
});

test('one fixed-range charge is allowed, an actor may leave it, and re-entry is blocked', () => {
  const game = M.create();
  assert.equal(game.place(), true); assert.equal(game.view().bombs.length, 1);
  assert.equal(game.view().bombs[0].fuse, M.FUSE_TICKS); assert.equal(game.view().bombs[0].range, 2);
  assert.equal(game.place(), false);
  assert.equal(game.steer('right'), true); assert.equal(game.view().pilot.c, 2);
  game.steer(null); assert.equal(game.steer('left'), true); assert.equal(game.view().pilot.c, 2);
  const snapshot = game.serialize(); snapshot.bombs[0].range = 3;
  assert.equal(M.restore(snapshot), null, 'save data cannot grant a hidden range upgrade');
});

test('a charge makes a cardinal cross, stops at hard walls and crates, and removes only the crate it hits', () => {
  const game = restore({
    pilot: { r: 1, c: 1 },
    bombs: [{ id: 1, owner: 'rivet', r: 5, c: 5, fuse: 1, range: 2 }]
  });
  const events = game.stepTicks(1), v = game.view();
  assert.ok(events.some(e => e.kind === 'blast'));
  assert.ok(v.waves.some(p => p.r === 5 && p.c === 4));
  assert.ok(!v.waves.some(p => p.r === 5 && p.c === 3));
  assert.equal(v.grid[5][4], 0); assert.equal(v.grid[5][3], M.CRATE);
  assert.ok(v.waves.some(p => p.r === 3 && p.c === 5), 'upward ray reaches the crate at range two');
  assert.equal(v.grid[3][5], 0);
  assert.equal(v.waves.some(p => p.r === 2 && p.c === 5), false);
});

test('chain bursts resolve once against the same crate snapshot and remove every triggered charge', () => {
  const game = restore({
    pilot: { r: 1, c: 1 },
    bombs: [
      { id: 1, owner: 'rivet', r: 5, c: 3, fuse: 1, range: 2 },
      { id: 2, owner: 'mica', r: 5, c: 5, fuse: 70, range: 2 }
    ],
    gridEdit: grid => { grid[5][4] = 0; }
  });
  const events = game.stepTicks(1), v = game.view();
  assert.equal(v.bombs.length, 0);
  assert.equal(events.find(e => e.kind === 'blast').bombs, 2);
  assert.ok(v.waves.some(p => p.r === 5 && p.c === 7));
  assert.equal(v.waves.some(p => p.r === 5 && p.c === 8), false);
});

test('simultaneous bursts do not pass through a crate destroyed in that same event', () => {
  const outputs = [];
  for (const reverse of [false, true]) {
    const bombs = [
      { id: 1, owner: 'rivet', r: 3, c: 4, fuse: 1, range: 2 },
      { id: 2, owner: 'mica', r: 5, c: 3, fuse: 1, range: 2 }
    ];
    if (reverse) bombs.reverse();
    const game = restore({ pilot: { r: 1, c: 1 }, bombs, gridEdit: grid => { grid[5][3] = 0; } });
    game.stepTicks(1);
    const v = game.view();
    assert.equal(v.grid[5][4], 0, 'both bursts destroy the shared crate');
    assert.equal(v.waves.some(p => p.r === 5 && p.c === 5), false, 'the second ray still stops at the shared crate');
    outputs.push({ grid: v.grid, waves: v.waves.map(p => `${p.r}:${p.c}`).sort() });
  }
  assert.deepEqual(outputs[0], outputs[1], 'detonation order cannot change the board');
});

test('a solid lattice wall stops a water cross before it enters or passes the wall', () => {
  const game = restore({
    pilot: { r: 1, c: 1 },
    bombs: [{ id: 1, owner: 'rivet', r: 5, c: 2, fuse: 1, range: 2 }]
  });
  game.stepTicks(1);
  assert.equal(game.view().grid[4][2], M.WALL);
  assert.equal(game.view().waves.some(p => p.r === 4 && p.c === 2), false);
  assert.equal(game.view().waves.some(p => p.r === 3 && p.c === 2), false);
});

test('a rival escaping its own charge routes around another bomb’s imminent cross', () => {
  const game = restore({
    pilot: { r: 1, c: 1 }, rivet: { r: 5, c: 5, cooldown: 1 },
    bombs: [
      { id: 1, owner: 'rivet', r: 5, c: 5, fuse: 90, range: 2 },
      { id: 2, owner: 'mica', r: 4, c: 7, fuse: 1, range: 2 }
    ]
  });
  game.stepTicks(90);
  const rival = game.view().rivals[0];
  assert.equal(rival.alive, true); assert.equal(rival.trappedTicks, 0);
  assert.equal(game.view().bombs.some(b => b.owner === 'rivet'), false, 'rival escapes before its own fuse ends');
});

test('a burst traps a rival in a bubble; bots spend one pin and the player can rescue once', () => {
  const rival = restore({
    pilot: { r: 5, c: 7 }, rivet: { r: 5, c: 3, cooldown: 7 },
    bombs: [{ id: 1, owner: 'pilot', r: 5, c: 1, fuse: 1, range: 2 }],
    gridEdit: grid => { grid[5][3] = 0; }
  });
  const caught = rival.stepTicks(1), trapped = rival.view().rivals[0];
  assert.ok(caught.some(e => e.kind === 'rival-trapped'));
  assert.equal(trapped.trappedTicks, M.TRAP_TICKS); assert.equal(trapped.pins, 1);
  assert.equal(rival.view().bombAvailable, true);
  const rescued = rival.stepTicks(45);
  assert.ok(rescued.some(e => e.kind === 'rival-rescued'));
  assert.equal(rival.view().rivals[0].trappedTicks, 0); assert.equal(rival.view().rivals[0].pins, 0);

  const pilot = restore({
    pilot: { r: 5, c: 3 }, rivet: { r: 1, c: 11, cooldown: 7 },
    bombs: [{ id: 1, owner: 'rivet', r: 5, c: 1, fuse: 1, range: 2 }],
    gridEdit: grid => { grid[5][3] = 0; }
  });
  pilot.stepTicks(1);
  assert.equal(pilot.view().pilot.trappedTicks, M.TRAP_TICKS);
  assert.equal(pilot.view().rescueAvailable, true);
  assert.equal(pilot.rescue(), true); assert.equal(pilot.rescue(), false);
  assert.equal(pilot.view().pilot.trappedTicks, 0); assert.equal(pilot.view().pilot.pins, 0);
});

test('another burst or the bubble timer pops a trapped pilot', () => {
  const popped = restore({
    pilot: { r: 5, c: 3, trappedTicks: 80, trappedBy: 'rivet' }, rivet: { r: 1, c: 11, cooldown: 7 },
    bombs: [{ id: 1, owner: 'rivet', r: 5, c: 1, fuse: 1, range: 2 }],
    gridEdit: grid => { grid[5][3] = 0; }
  });
  const events = popped.stepTicks(1);
  assert.ok(events.some(e => e.kind === 'pilot-out'));
  assert.equal(popped.view().status, 'lost');

  const timeout = restore({
    pilot: { r: 5, c: 3, trappedTicks: 1, trappedBy: 'rivet' }, rivet: { r: 1, c: 11 },
    gridEdit: grid => { grid[5][3] = 0; }
  });
  timeout.stepTicks(1);
  assert.equal(timeout.view().pilot.alive, false); assert.equal(timeout.view().status, 'lost');

  const finalBubble = restore({
    pilot: { r: 5, c: 3, trappedTicks: 12, trappedBy: 'rivet' }, rivet: false,
    gridEdit: grid => { grid[5][3] = 0; }
  });
  assert.equal(finalBubble.view().status, 'playing', 'a trapped sole survivor still gets a chance to use the pin');
  assert.equal(finalBubble.rescue(), true);
  assert.equal(finalBubble.view().status, 'won');
});

test('stable save snapshots resume deterministically; malformed or future rulesets are rejected', () => {
  const first = M.create(); first.steer('right'); first.advance(735);
  const snap = first.serialize(), second = M.restore(snap);
  assert.ok(second); assert.deepEqual(second.serialize(), snap);
  for (let i = 0; i < 30; i++) {
    assert.deepEqual(first.advance(20), second.advance(20));
    assert.deepEqual(first.serialize(), second.serialize());
  }
  const future = structuredClone(snap); future.rules = 'tidegrid-local-2';
  assert.equal(M.restore(future), null);
  const reordered = structuredClone(snap); reordered.actors.reverse();
  assert.equal(M.restore(reordered), null, 'actor slots must retain the canonical IDs used by the simulation');
  const impossible = structuredClone(snap); impossible.grid[1][1] = M.WALL;
  assert.equal(M.restore(impossible), null);
});

// Pure simulation regression tests, not device/playability/performance acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/maze-chase-model.js');
const cell = (x, y) => y * 19 + x;
const actor = (i, dir = -1, next = -1, progress = 0) => ({ cell: i, dir, next, progress });
function fixture(overrides = {}) {
  const s = M.create().serialize();
  s.enemies.forEach(e => { e.wait = 450; });
  return Object.assign(s, overrides);
}
function from(s) { const m = M.restore(s); assert.ok(m, 'fixture must be a valid saved state'); return m; }
function run(m, seconds, hz = 120) { for (let i = 0; i < Math.round(seconds * hz); i++) m.advance(1 / hz); }
function active(overrides = {}) { return fixture({ status: 'playing', ...overrides }); }
function normalize(s) { return { ...s, accumulator: 0 }; }

test('all three original maps are connected, bounded, distinct, with four powers and valid starts', () => {
  assert.equal(M.LEVELS.length, 3);
  const layouts = new Set();
  const routeProfiles = [];
  for (const map of M.LEVELS) {
    assert.equal(map.width, 19); assert.equal(map.height, 17); assert.equal(map.walls.length, 323);
    assert.equal(map.powers.length, 4);
    const field = M.distances(map, map.start);
    assert.equal(field.filter(x => x >= 0).length, map.walls.filter(x => !x).length);
    for (const i of [map.start, ...map.homes, map.bonus]) { assert.ok(field[i] >= 0); assert.equal(map.items[i], 0); }
    assert.ok(map.items.filter(Boolean).length >= 150);
    for (let i = 0; i < 19; i++) { assert.equal(map.walls[i], 1); assert.equal(map.walls[16 * 19 + i], 1); }
    layouts.add(map.walls.join(''));
    routeProfiles.push({ junctions: map.neighbors.filter(edges => edges.filter(n => n >= 0).length >= 3).length,
      crystalRoutes: map.powers.map(i => field[i]), bonusRoute: field[map.bonus] });
  }
  assert.equal(layouts.size, 3);
  assert.deepEqual(routeProfiles, [
    { junctions: 39, crystalRoutes: [22, 25, 8, 8], bonusRoute: 12 },
    { junctions: 35, crystalRoutes: [26, 26, 8, 8], bonusRoute: 20 },
    { junctions: 37, crystalRoutes: [26, 30, 8, 8], bonusRoute: 16 }
  ], 'stages expose different junction density and worthwhile detours');
});

test('each tunnel is bidirectional, distance maps respect walls, and all graph edges are reciprocal', () => {
  for (const map of M.LEVELS) {
    for (const [i, edges] of map.neighbors.entries()) for (let dir = 0; dir < 4; dir++) if (edges[dir] >= 0) {
      assert.equal(map.walls[edges[dir]], 0);
      assert.equal(map.neighbors[edges[dir]][(dir + 2) % 4], i);
    }
    const edge = map.walls.findIndex((w, i) => i % map.width === 0 && !w);
    assert.equal(M.distances(map, edge)[edge + 18], 1);
    assert.ok(M.distances(map, 0).every(d => d === -1));
  }
});

test('fresh run is instantly controllable but enemies and timers wait for first direction', () => {
  const m = M.create(), initial = m.serialize(); run(m, 3);
  assert.deepEqual(normalize(m.serialize()), normalize(initial));
  for (const dir of [-1, 4, null, '0', NaN]) assert.equal(m.input(dir), false);
  assert.equal(m.input(3), true); run(m, 0.5);
  assert.equal(m.view().status, 'playing'); assert.ok(m.view().playerPosition.x < 9);
  assert.ok(m.view().score >= 20); assert.ok(m.view().remaining < m.view().total);
});

test('early turn remains buffered until the first legal junction and never cuts walls', () => {
  const m = from(active({ player: actor(cell(2, 1), 1) }));
  m.input(2); run(m, 0.6); const p = m.view().playerPosition;
  assert.ok(Math.abs(p.x - 5) < 1e-9); assert.ok(p.y > 1 && p.y < 2);
  assert.equal(m.view().player.dir, 2); assert.equal(m.view().queued, 2);
});

test('illegal buffered turn does not stop forward motion; wall stops exactly at center', () => {
  const m = from(active({ player: actor(cell(2, 1), 1) })); m.input(0); run(m, 0.2);
  assert.ok(m.view().playerPosition.x > 3); assert.equal(m.view().playerPosition.y, 1);
  const n = from(active({ player: actor(cell(16, 1), 1) })); run(n, 0.5);
  assert.deepEqual(n.view().playerPosition, { x: 17, y: 1 }); assert.equal(n.view().player.next, -1);
});

test('mid-edge reversal preserves position exactly then moves back without snapping', () => {
  const m = from(active({ player: actor(cell(3, 1), 1, cell(4, 1), 0.6) }));
  const before = m.view().playerPosition; m.input(3);
  assert.deepEqual(m.view().playerPosition, before); assert.equal(m.view().player.cell, cell(4, 1));
  run(m, 0.05); assert.ok(m.view().playerPosition.x < before.x);
  assert.equal(m.view().playerPosition.y, before.y);
});

test('paired tunnel traversal wraps through its graph edge without undefined cells', () => {
  const m = from(active({ player: actor(cell(0, 7), 3) }));
  run(m, 0.2); const p = m.view().playerPosition;
  assert.ok(p.x > 17 && p.x < 18); assert.equal(p.y, 7);
  assert.ok(M.restore(m.serialize()));
});

test('simulation is identical at 30, 60, 120 and 144 Hz for an equal input timeline', () => {
  const states = [30, 60, 120, 144].map(hz => {
    const m = M.create(); m.input(3); run(m, 1, hz); m.input(0); run(m, 1, hz);
    m.input(1); run(m, 1, hz); m.input(2); run(m, 1, hz); return normalize(m.serialize());
  });
  states.slice(1).forEach(s => assert.deepEqual(s, states[0]));
});

test('invalid deltas do nothing and a long stalled frame advances at most one quarter second', () => {
  const m = M.create(); m.input(3); const before = m.serialize();
  for (const dt of [NaN, Infinity, -1, 0, '1']) assert.deepEqual(m.advance(dt), []);
  assert.deepEqual(m.serialize(), before); m.advance(600); assert.equal(m.view().tick, 30);
});

test('dot scores once even after backtracking; large crystal enters finite flee state', () => {
  const m = from(active({ player: actor(cell(2, 1), 3) })); run(m, 0.2);
  assert.equal(m.view().score, 50); assert.ok(m.view().power > 0); assert.equal(m.view().mode, 'flee');
  const power = m.view().power; m.input(1); run(m, 0.2); m.input(3); run(m, 0.2);
  assert.equal(m.view().score, 60); assert.ok(m.view().power < power);
});

test('power crystal is collected before collision on that center; capture has chain points', () => {
  const s = active({ player: actor(cell(2, 1), 3, cell(1, 1), 0.98), immune: 0 });
  s.enemies[0] = { ...actor(cell(1, 1)), id: 0, mode: 'active', wait: 0 };
  const m = from(s), events = m.advance(M.STEP);
  assert.equal(m.view().lives, 3); assert.equal(m.view().score, 200);
  assert.equal(m.view().enemies[0].mode, 'returning'); assert.equal(m.view().chain, 1);
  assert.ok(events.some(e => e.kind === 'power')); assert.ok(events.some(e => e.kind === 'capture'));
});

test('three simultaneous vulnerable sentries score 150, 300, 600 exactly once', () => {
  const s = active({ power: 500, immune: 0 });
  s.enemies = s.enemies.map(e => ({ ...actor(s.player.cell), id: e.id, mode: 'active', wait: 0 }));
  const m = from(s); m.advance(M.STEP); assert.equal(m.view().score, 1050); assert.equal(m.view().chain, 3);
  assert.ok(m.view().enemies.every(e => e.mode === 'returning'));
  const score = m.view().score; m.advance(M.STEP); assert.equal(m.view().score, score);
});

test('returning sentry navigates home, waits, then becomes active; it cannot hurt the player', () => {
  const s = active({ immune: 0 });
  s.enemies[0] = { ...actor(cell(8, 1)), id: 0, mode: 'returning', wait: 0 };
  s.player = actor(cell(8, 1)); const m = from(s); run(m, 0.25);
  assert.equal(m.view().lives, 3); const enemy = m.view().enemies[0];
  assert.equal(enemy.cell, M.LEVELS[0].homes[0]); assert.equal(enemy.mode, 'active');
  assert.ok(enemy.wait > 0); assert.equal(enemy.next, -1); assert.equal(enemy.progress, 0);
});

test('authored chase leads change by stage while all three sentry roles keep distinct goals', () => {
  assert.deepEqual(M.LEVELS.map(map => map.interceptCells), [2, 3, 5]);
  for (let stage = 0; stage < M.LEVELS.length; stage++) {
    const map = M.LEVELS[stage], player = actor(cell(5, 9), 1);
    const s = { stage, modeTicks: 6 * M.HZ, player, items: map.items.slice(), bonusTicks: 0,
      enemies: map.homes.map((home, id) => ({ ...actor(home), id, mode: 'active', wait: 0 })) };
    const targets = s.enemies.map(e => M.targetFor(s, e));
    assert.equal(targets[0], player.cell);
    assert.equal(targets[1], cell(5 + map.interceptCells, 9));
    assert.ok(map.powers.includes(targets[2]));
    assert.equal(new Set(targets).size, 3);
    s.bonusTicks = 100;
    assert.equal(M.targetFor(s, s.enemies[2]), map.bonus);
  }
});

test('patrol window shortens with each route; power freezes the selected stage schedule', () => {
  assert.deepEqual(M.LEVELS.map(map => map.patrolTicks / M.HZ), [5, 4.5, 4]);
  const m = from(active({ modeTicks: 5 * M.HZ - 1 })); m.advance(M.STEP); assert.equal(m.view().mode, 'chase');
  for (const [stage, patrolSeconds] of [[1, 4.5], [2, 4]]) {
    const map = M.LEVELS[stage], s = active({ stage, items: map.items.slice(), modeTicks: patrolSeconds * M.HZ - 1,
      enemies: map.homes.map((home, id) => ({ ...actor(home), id, mode: 'active', wait: 0 })) });
    const runAt = from(s); runAt.advance(M.STEP); assert.equal(runAt.view().mode, 'chase');
    const stillPatrolling = from({ ...s, modeTicks: Math.floor((patrolSeconds - 0.5) * M.HZ) });
    assert.equal(stillPatrolling.view().mode, 'patrol');
  }
  const s = active({ power: 2, modeTicks: 66 }); const n = from(s);
  n.advance(M.STEP); assert.equal(n.view().modeTicks, 66); assert.equal(n.view().power, 1);
  n.advance(M.STEP); assert.equal(n.view().power, 0); assert.equal(n.view().modeTicks, 66);
  n.advance(M.STEP); assert.equal(n.view().modeTicks, 67);
});

test('AI takes legal shortest chase path, flees by graph distance and reverses at dead ends', () => {
  const s = active({ modeTicks: 700, player: actor(cell(9, 1)), immune: 0 });
  s.enemies[0] = { ...actor(cell(5, 1)), id: 0, mode: 'active', wait: 0 };
  assert.equal(M.enemyDirection(s, s.enemies[0]), 1);
  s.power = 100; const dir = M.enemyDirection(s, s.enemies[0]);
  const distances = M.distances(M.LEVELS[0], s.player.cell);
  assert.ok(distances[M.LEVELS[0].neighbors[s.enemies[0].cell][dir]] > distances[s.enemies[0].cell]);
  s.enemies[0] = { ...actor(64, 1), id: 0, mode: 'active', wait: 0 };
  assert.equal(M.enemyDirection(s, s.enemies[0]), 3);
});

test('one collision removes only one life; respawn preserves collected cells and score', () => {
  const s = active({ immune: 0, score: 320 }); s.items[cell(2, 1)] = 0;
  s.enemies.forEach(e => Object.assign(e, actor(s.player.cell), { wait: 0 }));
  const m = from(s); m.advance(M.STEP); assert.equal(m.view().status, 'dying'); assert.equal(m.view().lives, 2);
  assert.equal(m.input(0), false); run(m, 0.7);
  assert.equal(m.view().status, 'ready'); assert.equal(m.view().score, 320); assert.equal(m.view().items[cell(2, 1)], 0);
  assert.equal(m.view().lives, 2); assert.equal(m.view().immune, 150); assert.ok(M.restore(m.serialize()));
});

test('spawn immunity ignores danger and fatal loss is terminal until a new run', () => {
  const s = active({ immune: 10 }); s.enemies[0] = { ...actor(s.player.cell), id: 0, mode: 'active', wait: 0 };
  const m = from(s); m.advance(M.STEP); assert.equal(m.view().lives, 3);
  const fatal = { ...s, immune: 0, lives: 1 }; const n = from(fatal); n.advance(M.STEP);
  assert.equal(n.view().status, 'lost'); assert.equal(n.view().lives, 0); assert.equal(n.input(1), false);
  const state = n.serialize(); run(n, 2); assert.deepEqual(normalize(n.serialize()), normalize(state));
  assert.equal(M.create().view().lives, 3);
});

test('bonus spawns at collection thresholds, awards once and expires after ten active seconds', () => {
  const s = active({ player: actor(cell(8, 7), 1, cell(9, 7), 0.98), bonusTicks: 100, bonusMask: 1 });
  const m = from(s); const events = m.advance(M.STEP);
  assert.equal(m.view().score, 250); assert.equal(m.view().bonusTicks, 0); assert.ok(events.some(e => e.kind === 'bonus'));
  m.advance(M.STEP); assert.equal(m.view().score, 250);
  const expired = from(active({ bonusTicks: 1, bonusMask: 1 })); expired.advance(M.STEP); assert.equal(expired.view().bonusTicks, 0);
  const map = M.LEVELS[0], threshold = Math.ceil(map.items.filter(Boolean).length * 0.35), t = active();
  const remove = t.items.flatMap((v, i) => v && i !== cell(8, 15) ? [i] : []).slice(0, threshold - 1);
  remove.forEach(i => { t.items[i] = 0; }); t.player = actor(cell(9, 15), 3, cell(8, 15), 0.99);
  const a = from(t); a.advance(M.STEP); assert.equal(a.view().bonusMask, 1); assert.equal(a.view().bonusTicks, 1200);
});

test('each final collectible clears its stage and the third stage reaches a finite win', () => {
  for (let stage = 0; stage < 3; stage++) {
    const map = M.LEVELS[stage], s = active({ stage, items: map.items.map(() => 0), player: actor(map.start, 3, map.start - 1, 0.99) });
    s.enemies = map.homes.map((i, id) => ({ ...actor(i), id, mode: 'active', wait: 450 }));
    s.items[map.start - 1] = 1; const m = from(s); m.advance(M.STEP);
    assert.equal(m.view().score, 10 + 500 * (stage + 1)); assert.equal(m.view().remaining, 0);
    assert.equal(m.view().status, stage < 2 ? 'clearing' : 'won'); assert.ok(M.restore(m.serialize()));
    const score = m.view().score; run(m, 1);
    if (stage < 2) { assert.equal(m.view().stage, stage + 1); assert.equal(m.view().status, 'ready'); assert.ok(m.view().remaining > 0); }
    else { assert.equal(m.view().stage, 2); assert.equal(m.view().status, 'won'); assert.equal(m.input(3), false); }
    assert.equal(m.view().score, score);
  }
});

test('bonus life is awarded once, including when a collection crosses 6000', () => {
  const m = from(active({ score: 5995, lives: 2, player: actor(cell(9, 15), 3, cell(8, 15), 0.99) }));
  m.advance(M.STEP); assert.equal(m.view().lives, 3); assert.equal(m.view().extraLife, true);
  run(m, 0.4); assert.equal(m.view().lives, 3);
});

test('serialized mid-edge run round-trips and continues identically; views cannot mutate state', () => {
  const a = M.create(); a.input(3); run(a, 0.5); const b = from(a.serialize());
  assert.deepEqual(a.serialize(), b.serialize()); a.input(0); b.input(0); run(a, 1); run(b, 1);
  assert.deepEqual(a.serialize(), b.serialize());
  const v = a.view(); v.items.fill(0); v.player.cell = 0; v.enemies[0].cell = 0;
  assert.ok(a.view().remaining > 0); assert.notEqual(a.view().player.cell, 0);
  assert.ok(Object.isFrozen(v.map)); assert.ok(Object.isFrozen(v.map.neighbors[0]));
});

test('invalid/corrupt/unknown saves are rejected without exceptions', () => {
  const bad = [null, {}, { version: 2 }, { ...fixture(), rules: 'other' }];
  for (const [key, value] of [['stage', 3], ['score', Infinity], ['lives', -1], ['power', 841], ['chain', 4], ['accumulator', 1], ['status', 'won'], ['items', []], ['enemies', []], ['queued', 4], ['phaseTicks', 5]]) bad.push({ ...fixture(), [key]: value });
  bad.push({ ...fixture(), player: actor(0) }); bad.push({ ...fixture(), player: actor(cell(9, 15), 0, cell(8, 15), 0.3) });
  bad.push({ ...fixture(), player: actor(cell(9, 15), 0, -1, 0.3) });
  const wrong = fixture(); wrong.items[0] = 1; bad.push(wrong);
  for (const value of bad) assert.equal(M.restore(value), null);
});

test('many deterministic input runs never leave walkable edges or produce invalid saves', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const m = M.create(); let r = seed;
    for (let i = 0; i < 2000; i++) {
      if (i % 23 === 0) { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; m.input(r % 4); }
      m.advance(M.STEP);
      if (i % 29 === 0) assert.ok(M.restore(m.serialize()), `seed ${seed}, tick ${i}`);
    }
  }
});

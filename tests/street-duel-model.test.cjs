const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../scripts/engines-retro50.js'), 'utf8');
function makeModel(randomSeeds) {
  const window = randomSeeds ? {
    crypto: {
      getRandomValues(values) {
        values[0] = randomSeeds.shift();
        return values;
      }
    }
  } : {};
  vm.runInNewContext(source, { window, document: {}, console });
  return window.NP_StreetDuelModel;
}

test('same seed and input stream produce identical CPU rounds', () => {
  const M = makeModel();
  const run = () => {
    const game = M.create({ mode: 'cpu', seed: 91 });
    let last;
    for (let i = 0; i < 260; i++) {
      const p1 = i < 65 ? { move: 1 } : i === 80 ? { attack: 'kick' } : i > 110 && i < 170 ? { guard: true } : {};
      last = game.step(16, { p1 });
    }
    return JSON.stringify(last.view);
  };
  assert.equal(run(), run());
});

test('ordinary CPU matches vary across fresh models when no seed is supplied', () => {
  const M = makeModel([0x12345678, 0x9abcdef0]);
  const run = () => {
    const game = M.create({ mode: 'cpu' });
    const trace = [];
    for (let i = 0; i < 260; i++) {
      const result = game.step(50, {});
      trace.push({
        fighters: result.view.fighters.map(fighter => [fighter.x, fighter.hp, fighter.action?.kind]),
        events: result.events.map(event => [event.type, event.side, event.move])
      });
    }
    return JSON.stringify(trace);
  };
  assert.notEqual(run(), run(), 'fresh default seeds lead to different CPU decisions');
});

test('CPU starts with equal health, closes distance, and makes telegraphed attacks', () => {
  const M = makeModel(), game = M.create({ mode: 'cpu', seed: 7 });
  assert.deepEqual(Array.from(game.view().fighters, fighter => fighter.hp), [100, 100]);
  let sawWindup = false;
  for (let i = 0; i < 180; i++) {
    const result = game.step(50, {});
    sawWindup ||= result.events.some(event => event.type === 'windup' && event.side === 1);
  }
  assert.ok(sawWindup, 'CPU eventually commits to a visible move');
  assert.ok(game.view().fighters[0].hp < 100, 'CPU attack can connect after approaching');
});

test('movement, jump, and a landed kick use explicit startup and hit windows', () => {
  const M = makeModel(), game = M.create({ mode: 'local' });
  const startX = game.view().fighters[0].x;
  for (let i = 0; i < 24; i++) game.step(50, { p1: { move: 1 } });
  let view = game.view();
  assert.ok(view.fighters[0].x > startX);
  assert.ok(Math.abs(view.fighters[1].x - view.fighters[0].x) <= M.MOVES.kick.range);
  game.step(16, { p1: { jump: true } });
  assert.equal(game.view().fighters[0].grounded, false);
  for (let i = 0; i < 40; i++) game.step(16, {});
  for (let i = 0; i < 4; i++) game.step(50, {});
  game.step(16, { p1: { attack: 'kick' } });
  for (let i = 0; i < 2; i++) game.step(50, {});
  assert.equal(game.view().fighters[1].hp, 100, 'kick has not reached its active window yet');
  game.step(50, {});
  const result = game.step(50, {});
  assert.equal(result.view.fighters[1].hp, 87);
  assert.ok(result.events.some(event => event.type === 'hit' && event.move === 'kick'));
});

test('guard sharply reduces a telegraphed strike and emits a block event', () => {
  const M = makeModel(), game = M.create({ mode: 'local' });
  for (let i = 0; i < 24; i++) game.step(50, { p1: { move: 1 } });
  game.step(16, { p1: { attack: 'kick' }, p2: { guard: true } });
  let result, events = [];
  for (let i = 0; i < 5; i++) { result = game.step(50, { p2: { guard: true } }); events.push(...result.events); }
  assert.equal(result.view.fighters[1].hp, 97);
  assert.ok(events.some(event => event.type === 'block'));
});

test('draw closes a round cleanly and starts a fresh second round', () => {
  const M = makeModel(), game = M.create({ mode: 'local' });
  let result;
  for (let i = 0; i < 900; i++) result = game.step(50, {});
  assert.equal(result.view.status, 'intermission');
  assert.deepEqual(Array.from(result.view.wins), [0, 0]);
  for (let i = 0; i < 30; i++) game.step(50, {});
  const next = game.view();
  assert.equal(next.round, 2);
  assert.equal(next.status, 'playing');
  assert.equal(next.fighters[0].hp, 100);
});

test('two decisive rounds finish a match and replay resets wins and health', () => {
  const M = makeModel(), game = M.create({ mode: 'local' });
  const winByJabs = () => {
    let guard = 0;
    while (game.view().status === 'playing' && guard++ < 1600) {
      const [left, right] = game.view().fighters;
      if (left.action) game.step(50, {});
      else if (Math.abs(right.x - left.x) > 70) game.step(50, { p1: { move: right.x > left.x ? 1 : -1 } });
      else game.step(16, { p1: { attack: 'punch' } });
    }
    assert.ok(guard < 1600, 'round must settle instead of hanging');
  };
  winByJabs();
  assert.equal(game.view().status, 'intermission');
  for (let i = 0; i < 30; i++) game.step(50, {});
  winByJabs();
  assert.equal(game.view().status, 'matchOver');
  assert.deepEqual(Array.from(game.view().wins), [2, 0]);
  game.reset('local');
  assert.equal(game.view().status, 'playing');
  assert.deepEqual(Array.from(game.view().wins), [0, 0]);
  assert.equal(game.view().fighters[1].hp, 100);
});

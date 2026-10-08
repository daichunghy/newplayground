const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/nhip-may-model.js');

function advance(model, seconds) {
  while (seconds > 1e-9) { const step = Math.min(.1, seconds); model.advance(step); seconds -= step; }
}

test('the original chart is deterministic and starts with a readable four-lane session', () => {
  const a = M.create(), b = M.create();
  assert.deepEqual(a.view(), b.view());
  assert.equal(a.view().title, 'Nhịp Mây');
  assert.equal(a.view().status, 'ready');
  assert.deepEqual(M.LANES.map(lane => lane.key), ['KeyD', 'KeyF', 'KeyJ', 'KeyK']);
  assert.deepEqual(M.LANES.map(lane => lane.alternate), ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight']);
  assert.equal(a.view().notes.length, 32);
  assert.equal(a.view().notes.filter(note => note.kind === 'space').length, 8);
  assert.equal(M.CHART.length, 24);
  assert.equal(a.start(), true); assert.equal(a.start(), false);
});

test('early and late inputs grade deterministically, then scale combo points', () => {
  const game = M.create(); game.start();
  advance(game, 1.5);
  assert.equal(game.press(0).grade, 'Đẹp');
  advance(game, M.BEAT);
  const next = game.press(1);
  assert.equal(next.grade, 'Đẹp');
  assert.ok(next.points > 100);
  assert.equal(game.view().combo, 2);
  assert.equal(game.view().score, next.points + 100);
});

test('wrong lane and an unplayed note miss reset combo without corrupting the chart', () => {
  const game = M.create(); game.start(); advance(game, 1.5);
  assert.equal(game.press(3).grade, 'miss');
  assert.equal(game.press(0).grade, 'Đẹp');
  advance(game, M.BEAT + M.EARLY + .01);
  assert.equal(game.view().misses, 2);
  assert.equal(game.view().combo, 0);
  assert.equal(game.view().notes[1].grade, 'Trượt');
});

test('each four-beat phrase ends with a Space finish note', () => {
  const game = M.create(); game.start();
  advance(game, 1.5 + 3 * M.BEAT);
  const result = game.pressSpace();
  assert.equal(result.grade, 'Đẹp');
  assert.equal(game.view().notes.find(note => note.kind === 'space').judged, true);
  assert.equal(game.view().hits, 1);
  assert.equal(game.pressSpace().grade, 'miss');
  assert.equal(M.SPACE_BEATS.length, 8);
});

test('the session ends at the chart boundary and only then accepts a restart model', () => {
  const game = M.create(); game.start();
  advance(game, game.view().notes.at(-1).time + M.EARLY + .01);
  assert.equal(game.view().status, 'ended');
  assert.equal(game.press(0).grade, null);
  const restarted = M.create(); assert.equal(restarted.view().status, 'ready');
});

test('pause freezes chart time; malformed saves are rejected', () => {
  const game = M.create(); game.start(); advance(game, .6); game.pause();
  const atPause = game.view().time; advance(game, 4);
  assert.equal(game.view().time, atPause);
  assert.equal(game.resume(), true); advance(game, .1);
  assert.ok(game.view().time > atPause);
  assert.equal(M.restore(game.view()).view().time, game.view().time);
  const corrupt = game.view(); corrupt.notes[3].lane = 0;
  assert.equal(M.restore(corrupt), null);
});

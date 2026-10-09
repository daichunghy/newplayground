const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/line-rider-model.js');

function makeTrack(game, points) {
  assert.equal(game.beginTrack(M.START), true);
  for (const point of points) game.appendTrack(point);
  return game.endTrack();
}

function ride(game, seconds = 12) {
  for (let i = 0; i < Math.ceil(seconds * 120) && game.view().status === 'playing'; i++) game.advance(1 / 120);
  return game.view();
}

test('a track must begin at the green dot, reach the flag, and fit the ink budget', () => {
  const game = M.create();
  assert.equal(game.start(), false);
  assert.equal(game.beginTrack({ x: 400, y: 220 }), false);
  assert.equal(game.beginTrack(M.START), true);
  game.appendTrack({ x: 360, y: 200 });
  game.appendTrack({ x: 720, y: 200 });
  assert.equal(game.endTrack(), false);
  assert.equal(game.view().canRide, false);
  assert.equal(game.clearTrack(), true);
  assert.deepEqual(game.view().track, []);
});

test('rider follows a hand-drawn slope, collects three rings and reaches the flag', () => {
  const game = M.create();
  assert.equal(makeTrack(game, [M.RINGS[0], M.RINGS[1], M.RINGS[2], M.GOAL]), true);
  assert.equal(game.view().canRide, true);
  assert.equal(game.start(), true);
  const result = ride(game);
  assert.equal(result.status, 'won');
  assert.equal(result.result, 'finish');
  assert.equal(result.ringsCollected, 3);
  assert.ok(result.score >= 340);
  assert.ok(result.distance >= result.trackLength - 0.001);
});

test('a steep uphill line that sends the rider backward ends as a rollback, not a stall', () => {
  const game = M.create();
  assert.equal(makeTrack(game, [
    { x: 200, y: 270 }, { x: 350, y: 210 }, { x: 500, y: 145 },
    { x: 620, y: 180 }, M.GOAL
  ]), true);
  game.start();
  for (let i = 0; i < 120 * 8 && game.view().status === 'playing'; i++) game.advance(1 / 120);
  const result = game.view();
  assert.equal(result.status, 'lost');
  assert.equal(result.result, 'rolled-back');
  assert.ok(result.elapsed < 8);
  assert.ok(result.distance < result.trackLength);
});

test('pause freezes the run; resume preserves the rider and restart clears the drawing', () => {
  const game = M.create(); makeTrack(game, [M.RINGS[1], M.GOAL]); game.start();
  game.advance(.25); const before = game.view();
  assert.equal(game.pause(), true); game.advance(3);
  assert.equal(game.view().distance, before.distance);
  assert.equal(game.resume(), true); game.advance(.25);
  assert.ok(game.view().distance > before.distance);
  game.restart();
  assert.equal(game.view().status, 'ready');
  assert.deepEqual(game.view().track, []);
  assert.equal(game.view().score, 0);
});

test('a timed-out run ends cleanly and the model ignores invalid elapsed time', () => {
  const game = M.create({ timeLimit: 0.1 }); makeTrack(game, [M.RINGS[1], M.GOAL]); game.start();
  const before = game.view();
  game.advance(-1); game.advance(NaN); game.advance(Infinity);
  assert.equal(game.view().elapsed, before.elapsed);
  game.advance(0.1);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().result, 'time');
});

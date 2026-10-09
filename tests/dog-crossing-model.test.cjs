const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/dog-crossing-model.js');

function crossAllDogs(game) {
  let guard = 0;
  while (game.view().status === 'playing' && game.view().dogsSaved < M.DOGS && guard++ < 2000) {
    const view = game.view();
    if (view.canCross && view.signal === 'green') game.cross();
    game.advance(1 / 60);
  }
  return game.view();
}

test('finite round starts immediately and the green entry completes one safe crossing', () => {
  const game = M.create();
  assert.equal(game.view().status, 'ready');
  assert.equal(game.view().dogsWaiting, M.DOGS);
  assert.equal(game.cross(), false);
  assert.equal(game.start(), true);
  assert.equal(game.view().canCross, true);
  assert.equal(game.cross(), true);
  assert.equal(game.view().crossingTime > 0, true);
  game.advance(M.CROSS_SECONDS + 0.02);
  assert.equal(game.view().dogsSaved, 1);
  assert.equal(game.view().score, 100);
  assert.equal(game.view().lastEvent, 'saved');
});

test('red attempts consume one of three misses, reset combo, and end the round', () => {
  const game = M.create(); game.start(); game.advance(M.GREEN_SECONDS + 0.02);
  assert.equal(game.view().signal, 'red');
  for (let miss = 1; miss <= M.MAX_MISSES; miss++) {
    assert.equal(game.cross(), true);
    assert.equal(game.view().misses, miss);
  }
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().result, 'struck');
  assert.equal(game.view().lastEvent, 'strike-out');
});

test('the light keeps its cadence during a crossing and a green entry stays safe', () => {
  const game = M.create(); game.start();
  assert.equal(game.cross(), true);
  game.advance(M.GREEN_SECONDS + 0.1);
  assert.equal(game.view().signal, 'red');
  assert.equal(game.view().dogsSaved, 1);
});

test('all five dogs can be saved before the timer and produce a scored win', () => {
  const game = M.create(); game.start();
  const result = crossAllDogs(game);
  assert.equal(result.status, 'won');
  assert.equal(result.result, 'safe');
  assert.equal(result.dogsSaved, M.DOGS);
  assert.equal(result.dogsWaiting, 0);
  assert.ok(result.score >= M.DOGS * 100);
});

test('a first-time pace can wait for green, recover one red mistake, and still win with a useful buffer', () => {
  const game = M.create(); game.start();
  game.advance(0.8); // Take time to read the first signal.
  game.cross(); game.advance(M.CROSS_SECONDS);
  game.advance(0.23); // Miss the next green and make one recoverable red tap.
  assert.equal(game.view().signal, 'red');
  game.cross();
  const crossOnNextGreen = () => {
    while (game.view().signal === 'green' && game.view().status === 'playing') game.advance(1 / 120);
    while (game.view().signal !== 'green' && game.view().status === 'playing') game.advance(1 / 120);
    game.advance(0.7); // Deliberate reaction time before each crossing.
    assert.equal(game.view().signal, 'green');
    game.cross(); game.advance(M.CROSS_SECONDS);
  };
  while (game.view().dogsSaved < M.DOGS && game.view().status === 'playing') crossOnNextGreen();
  const result = game.view();
  assert.equal(result.status, 'won');
  assert.equal(result.misses, 1);
  assert.ok(Math.abs(result.elapsed - 14.92) < 0.04, `modeled novice pace: ${result.elapsed.toFixed(2)}s`);
  assert.ok(Math.abs(result.roundTime - 5.08) < 0.04, `remaining buffer: ${result.roundTime.toFixed(2)}s`);
});

test('timeout, pause, resume and restart have terminal-safe transitions', () => {
  const game = M.create(); game.start();
  assert.equal(game.pause(), true);
  const before = game.view(); game.advance(50);
  assert.equal(game.view().roundTime, before.roundTime);
  assert.equal(game.resume(), true);
  game.advance(M.ROUND_SECONDS);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().result, 'time');
  game.restart();
  assert.equal(game.view().status, 'ready');
  assert.equal(game.view().roundTime, M.ROUND_SECONDS);
  assert.equal(game.view().dogsWaiting, M.DOGS);
});

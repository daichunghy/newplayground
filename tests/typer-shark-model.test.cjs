const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/typer-shark-model.js');

test('correct keyboard sequence clears targets, raises score and wins the three-wave round', () => {
  const game = M.create();
  let clears = 0;
  for (const word of M.WORDS) for (const letter of word) {
    const result = game.typeLetter(letter.toLowerCase());
    assert.equal(result.correct, true);
    if (result.cleared) clears++;
  }
  assert.equal(clears, 9);
  assert.equal(game.view().status, 'won');
  assert.equal(game.view().completed, 9);
  assert.equal(game.view().score > 0, true);
});

test('wrong letters are visible and cost time but do not corrupt the partial word', () => {
  const game = M.create();
  game.typeLetter('x');
  assert.equal(game.view().typed, '');
  assert.equal(game.view().mistakes, 1);
  assert.equal(game.view().lastEvent, 'mistake');
  game.typeLetter('S');
  assert.equal(game.view().typed, 'S');
});

test('a missed shark costs one life and advances; the third escape loses', () => {
  const game = M.create();
  for (let i = 0; i < 3; i++) game.advance(11000);
  assert.equal(game.view().misses, 3);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().lastEvent, 'escape');
});

test('round clock is bounded; pause freezes time and restart restores the opening target', () => {
  const game = M.create();
  game.advance(2500);
  game.pause();
  const paused = game.view();
  assert.equal(game.advance(5000), false);
  assert.equal(game.view().elapsed, paused.elapsed);
  game.resume();
  game.advance(60000); game.advance(30000);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().lastEvent, 'time');
  game.restart();
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().word, 'SEA');
  assert.equal(game.view().score, 0);
});

test('invalid inputs and terminal play are inert', () => {
  const game = M.create();
  for (const value of ['', 'sea', '1', 'é', null]) assert.equal(game.typeLetter(value).accepted, false);
  for (const word of M.WORDS) for (const letter of word) game.typeLetter(letter);
  const before = game.view();
  assert.equal(game.typeLetter('A').accepted, false);
  assert.equal(game.advance(100), false);
  assert.deepEqual(game.view(), before);
});

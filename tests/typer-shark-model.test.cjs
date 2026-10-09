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

test('a missed sea light costs one life and advances; the third escape loses', () => {
  const game = M.create();
  for (let i = 0; i < 3; i++) game.advance(11000);
  assert.equal(game.view().misses, 3);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().lastEvent, 'escape');
});

test('pause freezes the round clock and restart restores the opening target', () => {
  const game = M.create();
  game.advance(2500);
  game.pause();
  const paused = game.view();
  assert.equal(game.advance(5000), false);
  assert.equal(game.view().elapsed, paused.elapsed);
  game.resume();
  game.advance(3000);
  assert.equal(game.view().elapsed, 5500);
  game.restart();
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().word, 'SEA');
  assert.equal(game.view().score, 0);
});

test('large frame deltas consume every crossed word deadline and count only cleared words', () => {
  const game = M.create();
  assert.equal(game.advance(60000), true);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().lastEvent, 'escape');
  assert.equal(game.view().misses, 3);
  assert.equal(game.view().completed, 0);
  assert.equal(game.view().elapsed, 31500);
  assert.equal(game.view().remainingMs, M.ROUND_MS - 31500);
});

test('a wrong key that reaches the deadline resolves the miss without inventing elapsed time', () => {
  const game = M.create();
  game.advance(game.view().wordRemainingMs - 220);
  const result = game.typeLetter('X');
  assert.equal(result.correct, false);
  assert.equal(result.status, 'playing');
  assert.equal(game.view().elapsed, 10280);
  assert.equal(game.view().misses, 1);
  assert.equal(game.view().completed, 0);
  assert.equal(game.view().word, 'REEF');
});

test('the round clock can end a careful run before its final word deadline', () => {
  const game = M.create();
  const clearWord = () => {
    for (const letter of game.view().word) game.typeLetter(letter);
  };
  for (let i = 0; i < 3; i++) { game.advance(10400); clearWord(); }
  for (let i = 0; i < 3; i++) { game.advance(8800); clearWord(); }
  for (let i = 0; i < 2; i++) { game.advance(7000); clearWord(); }
  game.advance(4000);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().lastEvent, 'time');
  assert.equal(game.view().elapsed, M.ROUND_MS);
  assert.equal(game.view().remainingMs, 0);
  assert.equal(game.view().completed, 8);
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

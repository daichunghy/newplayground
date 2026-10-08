const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/o-an-quan-model.js');

function custom({ red = {}, black = {}, quanLeft = true, quanRight = true, scores = { red: 0, black: 0 }, turn = 'red' } = {}) {
  const board = Array.from({ length: M.PIT_COUNT }, (_, index) => ({ stones: 0, quan: false, owner: null }));
  board[0] = { stones: 0, quan: quanLeft, owner: 'black' };
  board[6] = { stones: 0, quan: quanRight, owner: 'red' };
  for (const [key, count] of Object.entries({ ...red, ...black })) {
    const index = Number(key);
    board[index].stones = count;
    board[index].owner = Object.hasOwn(red, key) ? 'red' : 'black';
  }
  return M.create({ board, scores, turn });
}
const pits = model => model.view().board;

test('starts with ten five-stone citizen pits and two 10-point Quan pieces', () => {
  const model = M.create();
  const state = model.view();
  assert.equal(state.turn, 'red');
  assert.equal(state.status, 'playing');
  assert.equal(state.scores.red, 0);
  assert.equal(state.scores.black, 0);
  assert.equal(state.board.filter(p => p.stones === 5).length, 10);
  assert.equal(state.board.filter(p => p.quan).length, 2);
  assert.equal(state.totalValue, 70);
  assert.deepEqual(model.legalPits(), [7, 8, 9, 10, 11]);
});

test('sowing clockwise and counter-clockwise distributes one stone per next pit', () => {
  const clockwise = custom({ red: { 7: 2 } });
  const clockwiseValue = clockwise.view().totalValue;
  assert.equal(clockwise.play(7, 1), true);
  assert.equal(pits(clockwise)[8].stones, 1);
  assert.equal(pits(clockwise)[9].stones, 1);
  assert.equal(clockwise.view().turn, 'black');
  assert.equal(clockwise.view().totalValue, clockwiseValue);

  const counter = custom({ red: { 7: 2 } });
  const counterValue = counter.view().totalValue;
  assert.equal(counter.play(7, -1), true);
  assert.equal(pits(counter)[6].stones, 1);
  assert.equal(pits(counter)[5].stones, 1);
  assert.equal(counter.view().turn, 'black');
  assert.equal(counter.view().totalValue, counterValue);
});

test('relay sowing lifts an occupied citizen pit and keeps distributing in the same direction', () => {
  const model = custom({ red: { 7: 1 }, black: { 9: 2 } });
  const beforeValue = model.view().totalValue;
  assert.equal(model.play(7, 1), true);
  assert.equal(pits(model)[8].stones, 1);
  assert.equal(pits(model)[9].stones, 0);
  assert.equal(pits(model)[10].stones, 1);
  assert.equal(pits(model)[11].stones, 1);
  assert.equal(model.view().lastMove.relayCount, 1);
  assert.equal(model.view().totalValue, beforeValue);
});

test('stops at an occupied Quan instead of lifting or capturing it', () => {
  const model = custom({ red: { 7: 4 } });
  assert.equal(model.play(7, 1), true);
  assert.deepEqual(pits(model).slice(8, 12).map(p => p.stones), [1, 1, 1, 1]);
  assert.equal(pits(model)[0].quan, true);
  assert.equal(pits(model)[0].stones, 0);
  assert.equal(model.view().scores.red, 0);
});

test('an empty gap followed by a populated field captures its stones', () => {
  const model = custom({ red: { 7: 1 }, black: { 10: 3, 11: 1 } });
  const beforeValue = model.view().totalValue;
  assert.equal(model.play(7, 1), true);
  assert.equal(model.view().scores.red, 3);
  assert.equal(pits(model)[10].stones, 0);
  assert.equal(pits(model)[11].stones, 1);
  assert.equal(model.view().lastMove.captured, 3);
  assert.equal(model.view().totalValue, beforeValue);
});

test('the empty-gap capture can take a Quan and its 10-point value', () => {
  const model = custom({ red: { 9: 1, 7: 2 }, black: { 1: 1 } });
  const beforeValue = model.view().totalValue;
  assert.equal(model.play(9, 1), true);
  assert.equal(model.view().scores.red, 10);
  assert.equal(pits(model)[0].quan, false);
  assert.equal(model.view().lastMove.captured, 10);
  assert.equal(model.view().totalValue, beforeValue);
});

test('a multi-capture chain takes successive empty-gap targets, including a Quan', () => {
  const model = custom({ red: { 7: 1 }, black: { 10: 2 } });
  const beforeValue = model.view().totalValue;
  assert.equal(model.play(7, 1), true);
  assert.equal(model.view().scores.red, 12);
  assert.equal(model.view().lastMove.captured, 12);
  assert.equal(pits(model)[0].quan, false);
  assert.equal(model.view().totalValue, beforeValue);
});

test('invalid, empty, opponent-owned and Quan selections do not mutate the round', () => {
  const model = M.create();
  const before = model.view();
  assert.equal(model.play(1, 1), false);
  assert.equal(model.play(0, 1), false);
  assert.equal(model.play(7, 0), false);
  assert.equal(model.play(7, 1.5), false);
  assert.deepEqual(model.view(), before);
  const empty = custom({ red: { 7: 1 } });
  assert.equal(empty.play(8, 1), false);
  assert.equal(empty.view().moveCount, 0);
});

test('empty side auto-refills for five captured stones or forfeits when it cannot pay', () => {
  const refill = custom({ red: {}, black: { 1: 1 }, scores: { red: 5, black: 0 } });
  assert.equal(refill.view().status, 'playing');
  assert.equal(refill.view().scores.red, 0);
  assert.deepEqual(M.FIELDS.red.map(index => pits(refill)[index].stones), [1, 1, 1, 1, 1]);
  const forfeit = custom({ red: {}, black: { 1: 1 }, scores: { red: 4, black: 0 } });
  assert.equal(forfeit.view().status, 'forfeit');
  assert.equal(forfeit.view().winner, 'black');
});

test('both empty Quan pits sweep remaining stones and settle a win or draw once', () => {
  const win = custom({ red: { 7: 2, 9: 1 }, black: { 1: 1, 3: 1 }, scores: { red: 0, black: 0 } });
  const beforeValue = win.view().totalValue;
  assert.equal(win.play(9, 1), true); // Red takes the left Quan.
  assert.equal(win.view().scores.red, 10);
  assert.equal(win.play(3, 1), true); // Black takes the right Quan; remaining fields settle.
  assert.equal(win.view().status, 'won');
  assert.equal(win.view().winner, 'red');
  assert.equal(win.view().totalValue, beforeValue);
  assert.equal(win.play(3, 1), false);

  const draw = custom({ red: { 9: 1 }, black: { 3: 1 }, scores: { red: 0, black: 0 } });
  const drawValue = draw.view().totalValue;
  draw.play(9, 1);
  draw.play(3, 1);
  assert.equal(draw.view().status, 'draw');
  assert.equal(draw.view().winner, null);
  assert.equal(draw.view().totalValue, drawValue);
});

test('reset restores the authored setup, active side and captured totals', () => {
  const model = M.create();
  model.play(7, 1);
  model.reset();
  assert.equal(model.view().turn, 'red');
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().moveCount, 0);
  assert.deepEqual(model.view().scores, { red: 0, black: 0 });
  assert.equal(model.view().totalValue, 70);
});

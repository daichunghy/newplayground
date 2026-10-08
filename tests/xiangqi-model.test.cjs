const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/xiangqi-model.js');

function position(pieces, turn = 'red') {
  const board = M.emptyBoard();
  for (const [row, col, type, side] of pieces) board[row][col] = M.piece(type, side);
  return M.create({ board, turn });
}
function hasMove(model, from, to) {
  return model.legalMoves(from.row, from.col).some(point => point.row === to.row && point.col === to.col);
}

test('starts with the standard 32-piece setup, red to move', () => {
  const model = M.create();
  const state = model.view();
  assert.equal(state.turn, 'red');
  assert.equal(state.status, 'playing');
  assert.equal(state.moveCount, 0);
  assert.equal(state.board.flat().filter(Boolean).length, 32);
  assert.equal(state.board.flat().filter(p => p && p.side === 'red').length, 16);
  assert.equal(state.board.flat().filter(p => p && p.side === 'black').length, 16);
  assert.deepEqual(model.legalMoves(6, 4), [{ row: 5, col: 4 }]);
  assert.equal(hasMove(model, { row: 6, col: 4 }, { row: 6, col: 3 }), false);
});

test('CPU move is legal, repeatable, fixed-width, and does not mutate the current position', () => {
  const first = M.create(), second = M.create();
  const before = first.view();
  const move = first.chooseCpuMove();
  assert.deepEqual(move, second.chooseCpuMove());
  assert.ok(move);
  assert.ok(first.legalMoves(move.from.row, move.from.col).some(point => point.row === move.to.row && point.col === move.to.col));
  assert.deepEqual(first.view(), before, 'search leaves the board, turn, and repetition path untouched');
  assert.deepEqual(M.CPU_LIMITS, { rootMoves: 10, repliesPerRoot: 8, maxEvaluations: 80 });
});

test('CPU takes a hanging chariot instead of making a quiet move', () => {
  const model = position([
    [9, 3, 'general', 'red'], [0, 4, 'general', 'black'],
    [6, 0, 'chariot', 'red'], [8, 0, 'chariot', 'black']
  ], 'black');
  const move = model.chooseCpuMove();
  assert.deepEqual(move, { from: { row: 8, col: 0 }, to: { row: 6, col: 0 } });
  assert.equal(model.play(move.from, move.to), true);
  assert.equal(model.view().board[6][0].side, 'black');
  assert.equal(model.view().board.flat().filter(item => item?.type === 'chariot').length, 1);
});

test('chariots stop at a blocking piece and cannot capture a friendly piece', () => {
  const model = position([[9, 4, 'general', 'red'], [0, 3, 'general', 'black'], [8, 0, 'chariot', 'red'], [6, 0, 'soldier', 'red'], [3, 0, 'soldier', 'black']]);
  assert.equal(hasMove(model, { row: 8, col: 0 }, { row: 7, col: 0 }), true);
  assert.equal(hasMove(model, { row: 8, col: 0 }, { row: 6, col: 0 }), false);
  assert.equal(hasMove(model, { row: 8, col: 0 }, { row: 2, col: 0 }), false);
  assert.equal(hasMove(model, { row: 8, col: 0 }, { row: 3, col: 0 }), false);
  const openFile = position([[9, 4, 'general', 'red'], [0, 3, 'general', 'black'], [8, 0, 'chariot', 'red'], [3, 0, 'soldier', 'black']]);
  assert.equal(hasMove(openFile, { row: 8, col: 0 }, { row: 3, col: 0 }), true);
});

test('horse legs block both related jumps', () => {
  const model = position([[9, 4, 'general', 'red'], [0, 4, 'general', 'black'], [5, 4, 'horse', 'red'], [4, 4, 'soldier', 'red']]);
  assert.equal(hasMove(model, { row: 5, col: 4 }, { row: 3, col: 3 }), false);
  assert.equal(hasMove(model, { row: 5, col: 4 }, { row: 3, col: 5 }), false);
  assert.equal(hasMove(model, { row: 5, col: 4 }, { row: 6, col: 2 }), true);
});

test('elephant eye blocks a move and elephants stay on their own side of the river', () => {
  const model = position([[9, 4, 'general', 'red'], [0, 3, 'general', 'black'], [7, 2, 'elephant', 'red'], [6, 3, 'soldier', 'red']]);
  assert.equal(hasMove(model, { row: 7, col: 2 }, { row: 5, col: 4 }), false);
  assert.equal(hasMove(model, { row: 7, col: 2 }, { row: 5, col: 0 }), true);
  assert.equal(hasMove(model, { row: 7, col: 2 }, { row: 4, col: 5 }), false);
});

test('cannon travels through open points and captures only beyond exactly one screen', () => {
  const model = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [7, 4, 'cannon', 'red'], [5, 4, 'soldier', 'red'], [2, 4, 'soldier', 'black'], [1, 4, 'horse', 'black']]);
  assert.equal(hasMove(model, { row: 7, col: 4 }, { row: 6, col: 4 }), true);
  assert.equal(hasMove(model, { row: 7, col: 4 }, { row: 2, col: 4 }), true);
  assert.equal(hasMove(model, { row: 7, col: 4 }, { row: 1, col: 4 }), false);
});

test('a cannon checks a general only when exactly one piece screens the file', () => {
  const screened = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [2, 4, 'cannon', 'red'], [1, 4, 'soldier', 'red']], 'black');
  assert.equal(screened.view().check, true);
  assert.equal(screened.view().status, 'playing');
  const open = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [2, 4, 'cannon', 'red']], 'black');
  assert.equal(open.view().check, false);
});

test('generals and advisors stay in the palace; flying generals are forbidden', () => {
  const model = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black']]);
  assert.equal(hasMove(model, { row: 9, col: 3 }, { row: 9, col: 4 }), false);
  assert.equal(hasMove(model, { row: 9, col: 3 }, { row: 8, col: 3 }), true);
  const advisor = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [8, 3, 'advisor', 'red']]);
  assert.equal(hasMove(advisor, { row: 8, col: 3 }, { row: 7, col: 4 }), true);
  assert.equal(hasMove(advisor, { row: 8, col: 3 }, { row: 7, col: 2 }), false);
});

test('soldiers advance, gain sideways moves after crossing and never move backward', () => {
  const before = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [5, 2, 'soldier', 'red']]);
  assert.deepEqual(before.legalMoves(5, 2), [{ row: 4, col: 2 }]);
  const crossed = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [4, 2, 'soldier', 'red']]);
  assert.equal(hasMove(crossed, { row: 4, col: 2 }, { row: 4, col: 1 }), true);
  assert.equal(hasMove(crossed, { row: 4, col: 2 }, { row: 4, col: 3 }), true);
  assert.equal(hasMove(crossed, { row: 4, col: 2 }, { row: 5, col: 2 }), false);
});

test('a move that leaves the general in check is rejected without changing state', () => {
  const model = position([[9, 4, 'general', 'red'], [0, 3, 'general', 'black'], [8, 4, 'chariot', 'black'], [7, 0, 'soldier', 'red']]);
  assert.equal(model.view().check, true);
  assert.equal(model.play({ row: 7, col: 0 }, { row: 6, col: 0 }), false);
  assert.equal(model.view().board[7][0].type, 'soldier');
  assert.equal(model.view().turn, 'red');
});

test('checkmate and stalemate both end the game with the non-moving side as winner', () => {
  const mate = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [2, 4, 'chariot', 'red'], [1, 3, 'chariot', 'red'], [1, 5, 'chariot', 'red']], 'black');
  assert.equal(mate.view().check, true);
  assert.equal(mate.view().status, 'checkmate');
  assert.equal(mate.view().winner, 'red');
  const stale = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [1, 3, 'chariot', 'red'], [1, 5, 'chariot', 'red']], 'black');
  assert.equal(stale.view().check, false);
  assert.equal(stale.view().status, 'stalemate');
  assert.equal(stale.view().winner, 'red');
  stale.reset();
  assert.equal(stale.view().status, 'stalemate');
  assert.equal(stale.view().winner, 'red');
});

test('threefold exact-position repetition draws and reset restores the opening position', () => {
  const model = position([[9, 3, 'general', 'red'], [0, 4, 'general', 'black'], [8, 0, 'chariot', 'red'], [1, 8, 'chariot', 'black']]);
  const cycle = [
    [[8, 0], [7, 0]], [[1, 8], [2, 8]], [[7, 0], [8, 0]], [[2, 8], [1, 8]],
    [[8, 0], [7, 0]], [[1, 8], [2, 8]], [[7, 0], [8, 0]], [[2, 8], [1, 8]]
  ];
  for (const [from, to] of cycle) assert.equal(model.play({ row: from[0], col: from[1] }, { row: to[0], col: to[1] }), true);
  assert.equal(model.view().status, 'draw');
  model.reset();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().turn, 'red');
  assert.equal(model.view().moveCount, 0);
  assert.equal(model.view().board.flat().filter(Boolean).length, 4);
});

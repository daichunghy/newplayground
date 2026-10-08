const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/caro-candidate-model.js');

function play(g, row, col) {
  assert.equal(g.place(row, col), true, `place at ${row},${col}`);
}

test('starts instantly on an empty 15x15 board with X to move', () => {
  const g = M.create();
  const v = g.view();
  assert.equal(M.SIZE, 15);
  assert.equal(v.board.length, 15);
  assert.ok(v.board.every(row => row.length === 15 && row.every(cell => cell === M.EMPTY)));
  assert.equal(v.currentPlayer, M.X);
  assert.equal(v.status, 'playing');
  assert.equal(v.moveCount, 0);
});

test('alternates one mark per empty cell and rejects invalid, occupied, or post-result moves', () => {
  const g = M.create();
  assert.equal(g.place(-1, 0), false);
  assert.equal(g.place(0, 15), false);
  assert.equal(g.place(1.2, 2), false);
  play(g, 7, 7);
  assert.equal(g.view().board[7][7], M.X);
  assert.equal(g.view().currentPlayer, M.O);
  assert.equal(g.place(7, 7), false);
  assert.equal(g.view().moveCount, 1);
  assert.equal(g.view().board[7][8], M.EMPTY);
});

test('an exact five wins horizontally, vertically, and on both diagonals', () => {
  const starts = [
    [7, 5, 0, 1],
    [5, 7, 1, 0],
    [5, 5, 1, 1],
    [5, 9, 1, -1]
  ];
  for (const [row, col, dr, dc] of starts) {
    const g = M.create();
    const decoys = [[0, 0], [0, 2], [0, 4], [0, 6]];
    for (let i = 0; i < 5; i += 1) {
      play(g, row + dr * i, col + dc * i);
      if (i < 4) play(g, ...decoys[i]);
    }
    const v = g.view();
    assert.equal(v.status, 'won');
    assert.equal(v.winner, M.X);
    assert.equal(v.winningLine.length, 5);
    assert.equal(g.place(14, 14), false);
  }
});

test('a five still wins when both ends are occupied by the opponent', () => {
  const g = M.create();
  play(g, 7, 5); play(g, 7, 4);
  play(g, 7, 6); play(g, 7, 10);
  play(g, 7, 7); play(g, 0, 0);
  play(g, 7, 8); play(g, 0, 2);
  play(g, 7, 9);
  assert.equal(g.view().board[7][4], M.O);
  assert.equal(g.view().board[7][10], M.O);
  assert.equal(g.view().status, 'won');
});

test('bridging two shorter runs into six leaves play going without a foul loss', () => {
  const g = M.create();
  play(g, 7, 3); play(g, 0, 0);
  play(g, 7, 4); play(g, 0, 2);
  play(g, 7, 6); play(g, 0, 4);
  play(g, 7, 7); play(g, 0, 6);
  play(g, 7, 8); play(g, 0, 8);
  assert.equal(g.view().status, 'playing');
  assert.deepEqual([3, 4, 6, 7, 8].map(col => g.view().board[7][col]), Array(5).fill(M.X));
  assert.equal(g.view().board[7][5], M.EMPTY);
  play(g, 7, 5);
  assert.deepEqual([3, 4, 5, 6, 7, 8].map(col => g.view().board[7][col]), Array(6).fill(M.X));
  assert.equal(g.view().status, 'playing');
  assert.equal(g.view().winner, null);
  assert.equal(g.view().winningLine, null);
  assert.equal(g.view().currentPlayer, M.O);
});

test('a full balanced board without an exact five ends in a draw', () => {
  const g = M.create();
  const positions = { [M.X]: [], [M.O]: [] };
  for (let row = 0; row < M.SIZE; row += 1) {
    for (let col = 0; col < M.SIZE; col += 1) {
      const mark = (row + 2 * col) % 4 < 2 ? M.X : M.O;
      positions[mark].push([row, col]);
    }
  }
  let state = 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (const marks of Object.values(positions)) {
    for (let i = marks.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [marks[i], marks[j]] = [marks[j], marks[i]];
    }
  }

  let next = { [M.X]: 0, [M.O]: 0 };
  for (let move = 0; move < M.SIZE * M.SIZE; move += 1) {
    const player = move % 2 === 0 ? M.X : M.O;
    assert.equal(g.view().currentPlayer, player);
    assert.equal(g.place(...positions[player][next[player]++]), true);
    if (move < M.SIZE * M.SIZE - 1) assert.equal(g.view().status, 'playing');
  }
  assert.equal(g.view().status, 'draw');
  assert.equal(g.view().moveCount, M.SIZE * M.SIZE);
  assert.equal(g.view().winner, null);
});

test('reset clears the board and restores X as the first player', () => {
  const g = M.create();
  play(g, 7, 7);
  play(g, 0, 0);
  g.reset();
  const v = g.view();
  assert.equal(v.moveCount, 0);
  assert.equal(v.status, 'playing');
  assert.equal(v.currentPlayer, M.X);
  assert.ok(v.board.every(row => row.every(cell => cell === M.EMPTY)));
});

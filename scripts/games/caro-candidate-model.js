/* Original, compact 15x15 five-in-a-row rules. No historic-variant parity is claimed. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_CaroCandidateModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const SIZE = 15;
  const TARGET = 5;
  const EMPTY = 0;
  const X = 1;
  const O = 2;
  const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const clone = value => JSON.parse(JSON.stringify(value));

  function create() {
    const state = {
      board: Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)),
      currentPlayer: X,
      moveCount: 0,
      status: 'playing',
      winner: null,
      lastMove: null,
      winningLine: null
    };

    function inBounds(row, col) {
      return Number.isInteger(row) && Number.isInteger(col) &&
        row >= 0 && row < SIZE && col >= 0 && col < SIZE;
    }

    function exactFiveThrough(row, col, player) {
      for (const [dr, dc] of DIRECTIONS) {
        const line = [[row, col]];
        for (const sign of [-1, 1]) {
          let r = row + dr * sign;
          let c = col + dc * sign;
          while (inBounds(r, c) && state.board[r][c] === player) {
            line.push([r, c]);
            r += dr * sign;
            c += dc * sign;
          }
        }
        if (line.length === TARGET) {
          line.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
          return line.map(([r, c]) => ({ row: r, col: c }));
        }
      }
      return null;
    }

    function place(row, col) {
      if (state.status !== 'playing' || !inBounds(row, col) || state.board[row][col] !== EMPTY) return false;
      const player = state.currentPlayer;
      state.board[row][col] = player;
      state.moveCount += 1;
      state.lastMove = { row, col, player };
      const line = exactFiveThrough(row, col, player);
      if (line) {
        state.status = 'won';
        state.winner = player;
        state.winningLine = line;
      } else if (state.moveCount === SIZE * SIZE) {
        state.status = 'draw';
      } else {
        state.currentPlayer = player === X ? O : X;
      }
      return true;
    }

    function reset() {
      for (const row of state.board) row.fill(EMPTY);
      state.currentPlayer = X;
      state.moveCount = 0;
      state.status = 'playing';
      state.winner = null;
      state.lastMove = null;
      state.winningLine = null;
    }

    return {
      place,
      reset,
      view: () => clone(state),
      serialize: () => clone(state)
    };
  }

  return { SIZE, TARGET, EMPTY, X, O, create };
});

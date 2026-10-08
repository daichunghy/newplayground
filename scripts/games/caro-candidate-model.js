/* Original, compact 15x15 casual five-or-more rules and deterministic CPU. */
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
  const PATTERN_WEIGHT = [0, 2, 18, 170, 3500, 1000000];
  const clone = value => JSON.parse(JSON.stringify(value));

  function inBounds(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  function runThrough(board, row, col, player) {
    for (const [dr, dc] of DIRECTIONS) {
      let length = 1;
      const points = [[row, col]];
      for (const sign of [-1, 1]) {
        let r = row + dr * sign;
        let c = col + dc * sign;
        while (inBounds(r, c) && board[r][c] === player) {
          points.push([r, c]);
          length += 1;
          r += dr * sign;
          c += dc * sign;
        }
      }
      if (length >= TARGET) return points;
    }
    return null;
  }

  function winningMoves(view, player) {
    if (!view || !Array.isArray(view.board) || view.status !== 'playing') return [];
    const board = view.board.map(row => row.slice());
    const moves = [];
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        if (board[row][col] !== EMPTY) continue;
        board[row][col] = player;
        const wins = runThrough(board, row, col, player);
        board[row][col] = EMPTY;
        if (wins) moves.push({ row, col });
      }
    }
    return moves;
  }

  function patternPotential(board, row, col, player) {
    let score = 0;
    for (const [dr, dc] of DIRECTIONS) {
      for (let offset = -(TARGET - 1); offset <= 0; offset += 1) {
        const startRow = row + dr * offset;
        const startCol = col + dc * offset;
        const endRow = startRow + dr * (TARGET - 1);
        const endCol = startCol + dc * (TARGET - 1);
        if (!inBounds(startRow, startCol) || !inBounds(endRow, endCol)) continue;
        let own = 0;
        let blocked = false;
        for (let step = 0; step < TARGET; step += 1) {
          const value = board[startRow + dr * step][startCol + dc * step];
          if (value !== EMPTY && value !== player) { blocked = true; break; }
          if (value === player) own += 1;
        }
        if (!blocked) score += PATTERN_WEIGHT[own];
      }
    }
    return score;
  }

  function candidateMoves(board) {
    const candidates = [];
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        if (board[row][col] !== EMPTY) continue;
        let nearby = false;
        for (let r = Math.max(0, row - 2); r <= Math.min(SIZE - 1, row + 2) && !nearby; r += 1) {
          for (let c = Math.max(0, col - 2); c <= Math.min(SIZE - 1, col + 2); c += 1) {
            if (board[r][c] !== EMPTY) { nearby = true; break; }
          }
        }
        if (nearby) candidates.push({ row, col });
      }
    }
    if (candidates.length) return candidates;
    const center = Math.floor(SIZE / 2);
    return [{ row: center, col: center }];
  }

  function chooseCpuMove(view, player = O) {
    if (!view || view.status !== 'playing' || view.currentPlayer !== player || !Array.isArray(view.board)) return null;
    const board = view.board.map(row => row.slice());
    const opponent = player === X ? O : X;
    const ownWins = winningMoves(view, player);
    if (ownWins.length) return ownWins[0];

    const opponentWins = winningMoves(view, opponent);
    if (opponentWins.length) {
      const blocks = opponentWins.map(move => ({ ...move, score: patternPotential(board, move.row, move.col, player) }));
      blocks.sort((a, b) => b.score - a.score || a.row - b.row || a.col - b.col);
      return { row: blocks[0].row, col: blocks[0].col };
    }

    let best = null;
    for (const { row, col } of candidateMoves(board)) {
      const defensive = patternPotential(board, row, col, opponent);
      board[row][col] = player;
      const run = runThrough(board, row, col, player);
      const offensive = patternPotential(board, row, col, player);
      board[row][col] = EMPTY;
      const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
      const score = (run ? 1000000000000 : offensive + defensive * 0.88) - centerDistance * 0.01;
      if (!best || score > best.score) best = { row, col, score };
    }
    return best ? { row: best.row, col: best.col } : null;
  }

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

    function place(row, col) {
      if (state.status !== 'playing' || !inBounds(row, col) || state.board[row][col] !== EMPTY) return false;
      const player = state.currentPlayer;
      state.board[row][col] = player;
      state.moveCount += 1;
      state.lastMove = { row, col, player };
      const line = runThrough(state.board, row, col, player);
      if (line) {
        line.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        state.status = 'won';
        state.winner = player;
        state.winningLine = line.map(([r, c]) => ({ row: r, col: c }));
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

  return { SIZE, TARGET, EMPTY, X, O, create, winningMoves, chooseCpuMove };
});

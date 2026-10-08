/* Small, deterministic Xiangqi rules engine for the local hot-seat candidate. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_XiangqiModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const ROWS = 10;
  const COLS = 9;
  const TYPES = Object.freeze(['general', 'advisor', 'elephant', 'horse', 'chariot', 'cannon', 'soldier']);
  const OTHER = Object.freeze({ red: 'black', black: 'red' });
  const GLYPHS = Object.freeze({
    red: Object.freeze({ general: '帥', advisor: '仕', elephant: '相', horse: '傌', chariot: '俥', cannon: '炮', soldier: '兵' }),
    black: Object.freeze({ general: '將', advisor: '士', elephant: '象', horse: '馬', chariot: '車', cannon: '砲', soldier: '卒' })
  });

  function piece(type, side) {
    if (!TYPES.includes(type) || !Object.prototype.hasOwnProperty.call(OTHER, side)) throw new TypeError('Invalid Xiangqi piece');
    return { type, side };
  }

  function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
  function cloneBoard(board) { return board.map(row => row.map(item => item ? { type: item.type, side: item.side } : null)); }

  function initialBoard() {
    const board = emptyBoard();
    const back = ['chariot', 'horse', 'elephant', 'advisor', 'general', 'advisor', 'elephant', 'horse', 'chariot'];
    back.forEach((type, col) => {
      board[0][col] = piece(type, 'black');
      board[9][col] = piece(type, 'red');
    });
    [1, 7].forEach(col => {
      board[2][col] = piece('cannon', 'black');
      board[7][col] = piece('cannon', 'red');
    });
    [0, 2, 4, 6, 8].forEach(col => {
      board[3][col] = piece('soldier', 'black');
      board[6][col] = piece('soldier', 'red');
    });
    return board;
  }

  function validSquare(row, col) { return row >= 0 && row < ROWS && col >= 0 && col < COLS; }
  function inPalace(side, row, col) {
    return col >= 3 && col <= 5 && (side === 'red' ? row >= 7 && row <= 9 : row >= 0 && row <= 2);
  }

  function generals(board) {
    const found = { red: null, black: null };
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const item = board[row][col];
        if (item && item.type === 'general') found[item.side] = { row, col };
      }
    }
    return found;
  }

  function pseudoMoves(board, row, col) {
    const item = board[row] && board[row][col];
    if (!item) return [];
    const { side, type } = item;
    const moves = [];
    const add = (r, c) => {
      if (!validSquare(r, c)) return;
      const target = board[r][c];
      if (!target || target.side !== side) moves.push({ row: r, col: c });
    };

    if (type === 'general') {
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const r = row + dr;
        const c = col + dc;
        if (inPalace(side, r, c)) add(r, c);
      }
      return moves;
    }

    if (type === 'advisor') {
      for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const r = row + dr;
        const c = col + dc;
        if (inPalace(side, r, c)) add(r, c);
      }
      return moves;
    }

    if (type === 'elephant') {
      for (const [dr, dc] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
        const r = row + dr;
        const c = col + dc;
        const crossedRiver = side === 'red' ? r < 5 : r > 4;
        if (validSquare(r, c) && !crossedRiver && !board[row + dr / 2][col + dc / 2]) add(r, c);
      }
      return moves;
    }

    if (type === 'horse') {
      const jumps = [
        [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
        [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]
      ];
      for (const [dr, dc, lr, lc] of jumps) {
        const r = row + dr;
        const c = col + dc;
        if (validSquare(r, c) && !board[row + lr][col + lc]) add(r, c);
      }
      return moves;
    }

    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (type === 'chariot' || type === 'cannon') {
      for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        let screenSeen = false;
        while (validSquare(r, c)) {
          const target = board[r][c];
          if (type === 'chariot') {
            if (!target) moves.push({ row: r, col: c });
            else {
              if (target.side !== side) moves.push({ row: r, col: c });
              break;
            }
          } else if (!screenSeen) {
            if (!target) moves.push({ row: r, col: c });
            else screenSeen = true;
          } else if (target) {
            if (target.side !== side) moves.push({ row: r, col: c });
            break;
          }
          r += dr;
          c += dc;
        }
      }
      return moves;
    }

    if (type === 'soldier') {
      const forward = side === 'red' ? -1 : 1;
      add(row + forward, col);
      const crossedRiver = side === 'red' ? row <= 4 : row >= 5;
      if (crossedRiver) {
        add(row, col - 1);
        add(row, col + 1);
      }
      return moves;
    }

    return moves;
  }

  function isInCheck(board, side) {
    const kings = generals(board);
    const own = kings[side];
    const enemy = kings[OTHER[side]];
    if (!own || !enemy) return true;
    if (own.col === enemy.col) {
      let intervening = false;
      for (let row = Math.min(own.row, enemy.row) + 1; row < Math.max(own.row, enemy.row); row += 1) {
        if (board[row][own.col]) { intervening = true; break; }
      }
      if (!intervening) return true;
    }
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const item = board[row][col];
        if (!item || item.side !== OTHER[side]) continue;
        if (pseudoMoves(board, row, col).some(point => point.row === own.row && point.col === own.col)) return true;
      }
    }
    return false;
  }

  function simulate(board, from, to) {
    const next = cloneBoard(board);
    next[to.row][to.col] = next[from.row][from.col];
    next[from.row][from.col] = null;
    return next;
  }

  function legalMoves(board, side, row, col) {
    const item = board[row] && board[row][col];
    if (!item || item.side !== side) return [];
    return pseudoMoves(board, row, col).filter(to => {
      const target = board[to.row][to.col];
      return !(target && target.type === 'general') && !isInCheck(simulate(board, { row, col }, to), side);
    });
  }

  function allLegalMoves(board, side) {
    const moves = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const item = board[row][col];
        if (item && item.side === side) {
          for (const to of legalMoves(board, side, row, col)) moves.push({ from: { row, col }, to });
        }
      }
    }
    return moves;
  }

  function positionKey(board, turn) {
    return `${turn}|${board.map(row => row.map(item => item ? `${item.side[0]}:${item.type}` : '.').join('|')).join('/')}`;
  }

  function validateBoard(board) {
    if (!Array.isArray(board) || board.length !== ROWS || board.some(row => !Array.isArray(row) || row.length !== COLS)) throw new TypeError('Xiangqi board must be 10 by 9');
    for (const row of board) for (const item of row) if (item && (!TYPES.includes(item.type) || !Object.prototype.hasOwnProperty.call(OTHER, item.side))) throw new TypeError('Invalid Xiangqi board piece');
    const kings = generals(board);
    if (!kings.red || !kings.black) throw new TypeError('Xiangqi position needs both generals');
  }

  function create(options = {}) {
    const initial = options.board ? cloneBoard(options.board) : initialBoard();
    validateBoard(initial);
    const initialTurn = options.turn || 'red';
    if (!Object.prototype.hasOwnProperty.call(OTHER, initialTurn)) throw new TypeError('Invalid Xiangqi turn');
    let board = initial;
    let turn = initialTurn;
    let status = 'playing';
    let winner = null;
    let moveCount = 0;
    const positions = new Map([[positionKey(board, turn), 1]]);
    function refreshTerminalState() {
      if (allLegalMoves(board, turn).length === 0) {
        status = isInCheck(board, turn) ? 'checkmate' : 'stalemate';
        winner = OTHER[turn];
      } else {
        status = 'playing';
        winner = null;
      }
    }
    refreshTerminalState();

    function view() {
      return {
        board: cloneBoard(board), turn, status, winner, moveCount,
        check: isInCheck(board, turn)
      };
    }

    function play(from, to) {
      if (status !== 'playing' || !from || !to || !Number.isInteger(from.row) || !Number.isInteger(from.col) || !Number.isInteger(to.row) || !Number.isInteger(to.col) || !validSquare(from.row, from.col) || !validSquare(to.row, to.col)) return false;
      if (!legalMoves(board, turn, from.row, from.col).some(move => move.row === to.row && move.col === to.col)) return false;
      board = simulate(board, from, to);
      moveCount += 1;
      turn = OTHER[turn];
      const key = positionKey(board, turn);
      const repeats = (positions.get(key) || 0) + 1;
      positions.set(key, repeats);
      const replies = allLegalMoves(board, turn);
      if (replies.length === 0) {
        status = isInCheck(board, turn) ? 'checkmate' : 'stalemate';
        winner = OTHER[turn];
      } else if (repeats >= 3) {
        status = 'draw';
      }
      return true;
    }

    function reset() {
      board = cloneBoard(initial);
      turn = initialTurn;
      status = 'playing';
      winner = null;
      moveCount = 0;
      positions.clear();
      positions.set(positionKey(board, turn), 1);
      refreshTerminalState();
    }

    return Object.freeze({
      view,
      play,
      reset,
      legalMoves(row, col) { return status === 'playing' ? legalMoves(board, turn, row, col) : []; },
      isInCheck(side) { return isInCheck(board, side); }
    });
  }

  return Object.freeze({ ROWS, COLS, TYPES, GLYPHS, create, initialBoard, emptyBoard, piece, cloneBoard, legalMoves, isInCheck });
});

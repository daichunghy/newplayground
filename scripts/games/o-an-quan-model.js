/* Deterministic two-player candidate for a documented Ô Ăn Quan default. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_OAnQuanModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const PIT_COUNT = 12;
  const QUAN = Object.freeze([0, 6]);
  const FIELDS = Object.freeze({ red: Object.freeze([7, 8, 9, 10, 11]), black: Object.freeze([1, 2, 3, 4, 5]) });
  const OTHER = Object.freeze({ red: 'black', black: 'red' });
  const wrap = value => ((value % PIT_COUNT) + PIT_COUNT) % PIT_COUNT;
  const pit = (stones = 0, quan = false, owner = null) => ({ stones, quan, owner });

  function initialBoard() {
    const board = Array.from({ length: PIT_COUNT }, () => pit());
    board[0] = pit(0, true, 'black');
    board[6] = pit(0, true, 'red');
    for (const side of ['red', 'black']) for (const index of FIELDS[side]) board[index] = pit(5, false, side);
    return board;
  }

  function cloneBoard(board) { return board.map(item => ({ stones: item.stones, quan: item.quan, owner: item.owner })); }
  function hasAny(item) { return item.stones > 0 || item.quan; }
  function owns(side, index) { return FIELDS[side].includes(index); }
  function countBoard(board) { return board.reduce((sum, item) => sum + item.stones + (item.quan ? 10 : 0), 0); }
  function validateBoard(board) {
    if (!Array.isArray(board) || board.length !== PIT_COUNT) throw new TypeError('Ô Ăn Quan board needs 12 pits');
    for (const item of board) {
      if (!item || !Number.isInteger(item.stones) || item.stones < 0 || typeof item.quan !== 'boolean') throw new TypeError('Invalid Ô Ăn Quan pit');
      if (item.owner !== null && item.owner !== 'red' && item.owner !== 'black') throw new TypeError('Invalid Ô Ăn Quan pit owner');
    }
    if (!board[0].quan && !board[6].quan) return;
  }

  function create(options = {}) {
    let board = options.board ? cloneBoard(options.board) : initialBoard();
    validateBoard(board);
    const initialBoardState = cloneBoard(board);
    let scores = { red: options.scores?.red || 0, black: options.scores?.black || 0 };
    if (!Number.isInteger(scores.red) || scores.red < 0 || !Number.isInteger(scores.black) || scores.black < 0) throw new TypeError('Invalid Ô Ăn Quan score');
    const initialScores = { ...scores };
    let turn = options.turn || 'red';
    if (!Object.prototype.hasOwnProperty.call(OTHER, turn)) throw new TypeError('Invalid Ô Ăn Quan turn');
    const initialTurn = turn;
    let status = 'playing';
    let winner = null;
    let moveCount = 0;
    let lastMove = null;
    let notice = '';

    function finish() {
      for (const side of ['red', 'black']) {
        for (const index of FIELDS[side]) {
          scores[side] += board[index].stones;
          board[index].stones = 0;
        }
      }
      for (const index of QUAN) {
        const remaining = board[index].stones;
        if (remaining) {
          const owner = board[index].owner || (index === 0 ? 'black' : 'red');
          scores[owner] += remaining;
          board[index].stones = 0;
        }
      }
      status = scores.red === scores.black ? 'draw' : 'won';
      winner = scores.red === scores.black ? null : scores.red > scores.black ? 'red' : 'black';
      notice = status === 'draw' ? 'Hòa ván.' : `Bên ${winner === 'red' ? 'Đỏ' : 'Đen'} thắng.`;
    }

    function prepareTurn() {
      if (status !== 'playing') return;
      if (!board[0].quan && !board[6].quan) { finish(); return; }
      if (FIELDS[turn].some(index => board[index].stones > 0)) return;
      if (scores[turn] < 5) {
        status = 'forfeit';
        winner = OTHER[turn];
        notice = `Bên ${turn === 'red' ? 'Đỏ' : 'Đen'} không đủ 5 sỏi bù dân.`;
        return;
      }
      scores[turn] -= 5;
      for (const index of FIELDS[turn]) board[index].stones += 1;
      notice = `Bên ${turn === 'red' ? 'Đỏ' : 'Đen'} tự bù 5 sỏi.`;
    }

    prepareTurn();

    function view() {
      return {
        board: cloneBoard(board), scores: { ...scores }, turn, status, winner,
        moveCount, lastMove: lastMove ? { ...lastMove } : null, notice,
        totalValue: countBoard(board) + scores.red + scores.black
      };
    }

    function legalPits() {
      if (status !== 'playing') return [];
      return FIELDS[turn].filter(index => board[index].stones > 0);
    }

    function play(index, direction) {
      if (status !== 'playing' || !Number.isInteger(index) || !owns(turn, index) || !Number.isInteger(direction) || (direction !== -1 && direction !== 1)) return false;
      if (board[index].stones <= 0) return false;
      const start = index;
      let current = index;
      let hand = 0;
      let sowed = 0;
      let captured = 0;
      let relayCount = 0;
      notice = '';

      while (true) {
        hand = board[current].stones;
        board[current].stones = 0;
        while (hand > 0) {
          current = wrap(current + direction);
          board[current].stones += 1;
          hand -= 1;
          sowed += 1;
        }

        const next = wrap(current + direction);
        if (board[next].quan) break;
        if (board[next].stones > 0) {
          current = next;
          relayCount += 1;
          if (relayCount > 1000) throw new Error('Ô Ăn Quan relay exceeded its finite-turn bound');
          continue;
        }

        const target = wrap(next + direction);
        if (!hasAny(board[target])) break;
        captured += board[target].stones + (board[target].quan ? 10 : 0);
        scores[turn] += board[target].stones + (board[target].quan ? 10 : 0);
        board[target].stones = 0;
        if (board[target].quan) board[target].quan = false;
        current = target;

        while (true) {
          const gap = wrap(current + direction);
          if (hasAny(board[gap])) break;
          const chained = wrap(gap + direction);
          if (!hasAny(board[chained])) break;
          captured += board[chained].stones + (board[chained].quan ? 10 : 0);
          scores[turn] += board[chained].stones + (board[chained].quan ? 10 : 0);
          board[chained].stones = 0;
          if (board[chained].quan) board[chained].quan = false;
          current = chained;
          relayCount += 1;
          if (relayCount > 1000) throw new Error('Ô Ăn Quan capture chain exceeded its finite-turn bound');
        }
        break;
      }

      moveCount += 1;
      lastMove = { from: start, to: current, direction, sowed, captured, relayCount };
      turn = OTHER[turn];
      if (!board[0].quan && !board[6].quan) finish();
      else prepareTurn();
      if (status === 'playing' && !notice) notice = `Lượt ${turn === 'red' ? 'Đỏ' : 'Đen'}.`;
      return true;
    }

    function reset() {
      board = cloneBoard(initialBoardState);
      scores = { ...initialScores };
      turn = initialTurn;
      status = 'playing';
      winner = null;
      moveCount = 0;
      lastMove = null;
      notice = '';
      prepareTurn();
    }

    return Object.freeze({ view, play, reset, legalPits });
  }

  return Object.freeze({ PIT_COUNT, QUAN, FIELDS, create, initialBoard, cloneBoard });
});

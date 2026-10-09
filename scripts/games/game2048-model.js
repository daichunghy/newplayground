/* Original implementation of classic 2048 rules. Reference and deviations: docs/games/2048_RESEARCH_PLAN.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_2048Model = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const DIRECTIONS = ['up', 'right', 'down', 'left'];
  const validValue = n => Number.isSafeInteger(n) && (n === 0 || (n >= 2 && Number.isInteger(Math.log2(n))));
  const copy = board => board.map(row => row.slice());
  function hasMoves(board) {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const n = board[r][c];
      if (!n || (Number.isSafeInteger(n * 2) && ((r < 3 && n === board[r + 1][c]) || (c < 3 && n === board[r][c + 1])))) return true;
    }
    return false;
  }
  function lineCoordinates(direction, line) {
    return Array.from({ length: 4 }, (_, i) => direction === 'left' ? [line, i] : direction === 'right' ? [line, 3 - i] : direction === 'up' ? [i, line] : [3 - i, line]);
  }
  // Pure movement transaction, before random spawn. Animation positions use actual board coordinates.
  function slide(board, direction) {
    if (!DIRECTIONS.includes(direction)) return { changed: false, board: copy(board), scoreDelta: 0, movements: [], merges: [] };
    const next = Array.from({ length: 4 }, () => [0, 0, 0, 0]), movements = [], merges = [];
    let scoreDelta = 0;
    for (let line = 0; line < 4; line++) {
      const coords = lineCoordinates(direction, line);
      const values = coords.filter(([r, c]) => board[r][c]).map(([r, c]) => ({ value: board[r][c], from: [r, c] }));
      let target = 0;
      for (let i = 0; i < values.length; i++) {
        const first = values[i], second = values[i + 1], to = coords[target++];
        if (second && first.value === second.value && Number.isSafeInteger(first.value * 2)) {
          const value = first.value * 2;
          next[to[0]][to[1]] = value; scoreDelta += value;
          movements.push({ from: first.from, to: to.slice(), value: first.value }, { from: second.from, to: to.slice(), value: second.value });
          merges.push({ at: to.slice(), value }); i++;
        } else {
          next[to[0]][to[1]] = first.value;
          movements.push({ from: first.from, to: to.slice(), value: first.value });
        }
      }
    }
    const changed = next.some((row, r) => row.some((n, c) => n !== board[r][c]));
    return { changed, board: next, scoreDelta, movements, merges };
  }
  function randomUnit(random) {
    const n = Number(random());
    return Number.isFinite(n) ? Math.min(1 - Number.EPSILON, Math.max(0, n)) : 0;
  }
  function spawn(board, random) {
    const empty = [];
    // Match reference's column-first enumeration and value-then-location RNG order.
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) if (!board[r][c]) empty.push([r, c]);
    if (!empty.length) return null;
    const value = randomUnit(random) < 0.9 ? 2 : 4;
    const at = empty[Math.floor(randomUnit(random) * empty.length)];
    board[at[0]][at[1]] = value;
    return { at: at.slice(), value };
  }
  function validState(state) {
    if (!state || !Array.isArray(state.board) || state.board.length !== 4 ||
      Array.from(state.board).some(row => !Array.isArray(row) || row.length !== 4 || Array.from(row).some(n => !validValue(n)))) return false;
    if (!Number.isSafeInteger(state.score) || state.score < 0 || state.score % 4 !== 0 ||
      !Number.isSafeInteger(state.moves) || state.moves < 0 ||
      typeof state.won !== 'boolean' || typeof state.keepPlaying !== 'boolean' || typeof state.over !== 'boolean') return false;
    const max = Math.max(...state.board.flat());
    return state.board.flat().filter(Boolean).length >= 2 && !(state.keepPlaying && !state.won) &&
      state.won === (max >= 2048) && state.over === !hasMoves(state.board);
  }
  const validDraws = draws => Array.isArray(draws) && draws.length <= 2 && draws.every(n => Number.isFinite(n) && n >= 0 && n < 1);
  function validSave(saved) {
    if (!saved || ![1, 2].includes(saved.version) || !validState(saved)) return false;
    if (saved.version === 1) return true;
    if (!validDraws(saved.randomReplay) || !(saved.undo === null ||
      (validState(saved.undo) && saved.undo.moves + 1 === saved.moves && validDraws(saved.undo.draws)))) return false;
    return true;
  }
  function create(random = Math.random, saved = null) {
    let board, score, moves, won, keepPlaying, over, lastMove = null, randomReplay = [];
    if (saved) {
      if (!validSave(saved)) return null;
      ({ score, moves, won, keepPlaying, over } = saved); board = copy(saved.board);
      if (saved.version === 2) {
        lastMove = saved.undo ? { ...saved.undo, board: copy(saved.undo.board), draws: saved.undo.draws.slice() } : null;
        randomReplay = saved.randomReplay.slice();
      }
    } else {
      board = Array.from({ length: 4 }, () => [0, 0, 0, 0]); score = 0; moves = 0; won = false; keepPlaying = false; over = false;
      spawn(board, random); spawn(board, random);
    }
    const state = () => ({ board: copy(board), score, moves, won, keepPlaying, over, undoAvailable: !!lastMove,
      status: over ? 'lost' : won && !keepPlaying ? 'won' : 'playing' });
    function move(direction) {
      if (over || won && !keepPlaying) return { changed: false, ...state() };
      const transaction = slide(board, direction);
      if (!transaction.changed) return { ...transaction, ...state() };
      if (!Number.isSafeInteger(score + transaction.scoreDelta)) return { changed: false, ...state() };
      const before = { board: copy(board), score, moves, won, keepPlaying, over };
      board = transaction.board; score += transaction.scoreDelta; moves++;
      if (transaction.merges.some(m => m.value === 2048)) won = true;
      const draws = [];
      const spawned = spawn(board, () => {
        const value = randomReplay.length ? randomReplay.shift() : randomUnit(random);
        draws.push(value); return value;
      });
      over = !hasMoves(board);
      lastMove = { ...before, draws };
      return { ...transaction, ...state(), before, spawned };
    }
    function undo() {
      if (!lastMove) return { changed: false, ...state() };
      const previous = lastMove;
      board = copy(previous.board); score = previous.score; moves = previous.moves;
      won = previous.won; keepPlaying = previous.keepPlaying; over = previous.over;
      randomReplay = previous.draws.slice(); lastMove = null;
      return { changed: true, ...state(), undone: true };
    }
    function continueGame() {
      if (!won || keepPlaying || over) return false;
      keepPlaying = true; return true;
    }
    const serialize = () => ({ version: 2, board: copy(board), score, moves, won, keepPlaying, over,
      undo: lastMove ? { board: copy(lastMove.board), score: lastMove.score, moves: lastMove.moves,
        won: lastMove.won, keepPlaying: lastMove.keepPlaying, over: lastMove.over, draws: lastMove.draws.slice() } : null,
      randomReplay: randomReplay.slice() });
    return { state, move, undo, continueGame, serialize };
  }
  return { DIRECTIONS, create, restore: (saved, random = Math.random) => validSave(saved) ? create(random, saved) : null, slide, hasMoves, validSave };
});

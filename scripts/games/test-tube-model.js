/* Deterministic falling-capsule puzzle model with authored virus layouts. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_TestTubeModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROWS = 16;
  const COLS = 8;
  const COLORS = Object.freeze(['blue', 'amber', 'rose']);
  const LABELS = Object.freeze({ blue: 'lam', amber: 'vàng', rose: 'hồng' });
  const MARKS = Object.freeze({ blue: '●', amber: '◆', rose: '✦' });
  const GRAVITY = 0.58;

  function hashSeed(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let hash = 2166136261;
    for (const char of String(seed ?? Date.now())) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return hash || 1;
  }
  function makeRng(seed) {
    let state = hashSeed(seed);
    return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  }
  function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
  function copyBoard(board) { return board.map(row => row.map(cell => cell && { ...cell })); }
  function validCell(cell) {
    return cell && Number.isInteger(cell.row) && cell.row >= 0 && cell.row < ROWS
      && Number.isInteger(cell.col) && cell.col >= 0 && cell.col < COLS
      && COLORS.includes(cell.color);
  }
  function makeDefaultViruses(seed) {
    const shift = hashSeed(seed) % 2;
    return [
      ...[0, 1, 2].map(col => ({ row: 12, col: col + shift, color: 'blue' })),
      ...[4, 5, 6].map(col => ({ row: 11, col, color: 'amber' })),
      ...[1, 2, 3].map(col => ({ row: 14, col, color: 'rose' })),
      ...[12, 13, 14].map(row => ({ row, col: 7, color: 'blue' }))
    ];
  }
  function pairQueue(seed, count = 42) {
    const random = makeRng(seed);
    return Array.from({ length: count }, () => [COLORS[Math.floor(random() * 3)], COLORS[Math.floor(random() * 3)]]);
  }

  function create(options = {}) {
    const seed = options.seed ?? Date.now();
    const originalViruses = (options.viruses || makeDefaultViruses(seed)).map(cell => ({ ...cell }));
    if (!originalViruses.every(validCell) || new Set(originalViruses.map(cell => `${cell.row}:${cell.col}`)).size !== originalViruses.length) {
      throw new TypeError('Virus layout contains an invalid or duplicate cell.');
    }
    const pairs = (options.pairs || pairQueue(seed)).map(pair => [...pair]);
    if (!pairs.length || pairs.some(pair => pair.length !== 2 || pair.some(color => !COLORS.includes(color)))) {
      throw new TypeError('Capsule queue must contain pairs of known colors.');
    }
    const originalPairQueue = pairs.map(pair => [...pair]);
    let board;
    let active;
    let queueIndex;
    let status;
    let lastEvent;
    let lastResolution;
    let gravityElapsed;
    let virusesLeft;

    function spawn() {
      if (queueIndex >= pairs.length) { active = null; status = 'lost'; lastEvent = 'queue-empty'; return; }
      const [first, second] = pairs[queueIndex++];
      active = { pivot: { row: 1, col: 3, color: first }, mate: { row: 0, col: 3, color: second }, rotation: 0 };
      gravityElapsed = 0;
      if (!canPlace(active)) { active = null; status = 'lost'; lastEvent = 'bottle-blocked'; }
    }
    function reset() {
      board = emptyBoard();
      for (const virus of originalViruses) board[virus.row][virus.col] = { ...virus, kind: 'virus' };
      virusesLeft = originalViruses.length;
      queueIndex = 0;
      active = null;
      status = 'playing';
      lastEvent = 'deal';
      lastResolution = { cleared: 0, viruses: 0, cascades: 0 };
      gravityElapsed = 0;
      spawn();
      if (status === 'playing' && virusesLeft === 0) { status = 'won'; lastEvent = 'win'; active = null; }
    }
    function cellsOf(piece) { return [piece.pivot, piece.mate]; }
    function canPlace(piece) {
      return cellsOf(piece).every(cell => cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS && !board[cell.row][cell.col]);
    }
    reset();

    function findMatches() {
      const found = new Set();
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const cell = board[row][col];
        if (!cell) continue;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const run = [[row, col]];
          for (let r = row + dr, c = col + dc; r < ROWS && c < COLS && board[r][c]?.color === cell.color; r += dr, c += dc) run.push([r, c]);
          if (run.length >= 4) for (const [r, c] of run) found.add(`${r}:${c}`);
        }
      }
      return [...found].map(key => key.split(':').map(Number));
    }
    function fallCapsules() {
      let moved;
      do {
        moved = false;
        for (let row = ROWS - 2; row >= 0; row--) for (let col = 0; col < COLS; col++) {
          const cell = board[row][col];
          if (cell?.kind === 'capsule' && !board[row + 1][col]) {
            board[row + 1][col] = cell;
            board[row][col] = null;
            moved = true;
          }
        }
      } while (moved);
    }
    function resolve() {
      let totalCleared = 0;
      let totalViruses = 0;
      let cascades = 0;
      while (true) {
        const matches = findMatches();
        if (!matches.length) break;
        cascades++;
        for (const [row, col] of matches) {
          if (board[row][col]?.kind === 'virus') totalViruses++;
          board[row][col] = null;
          totalCleared++;
        }
        fallCapsules();
      }
      virusesLeft = board.flat().filter(cell => cell?.kind === 'virus').length;
      return { cleared: totalCleared, viruses: totalViruses, cascades };
    }
    function lock() {
      if (!active || !canPlace(active)) return false;
      for (const cell of cellsOf(active)) board[cell.row][cell.col] = { row: cell.row, col: cell.col, color: cell.color, kind: 'capsule' };
      active = null;
      const result = resolve();
      lastResolution = { ...result };
      if (virusesLeft === 0) { status = 'won'; lastEvent = 'win'; return true; }
      lastEvent = result.viruses ? 'clear-virus' : result.cleared ? 'clear-capsule' : 'lock';
      spawn();
      return true;
    }
    function moveDown() {
      if (status !== 'playing' || !active) return false;
      const moved = { ...active, pivot: { ...active.pivot, row: active.pivot.row + 1 }, mate: { ...active.mate, row: active.mate.row + 1 } };
      if (canPlace(moved)) { active = moved; return true; }
      return lock();
    }
    function view() {
      const preview = pairs[queueIndex] ? [...pairs[queueIndex]] : null;
      return {
        board: copyBoard(board), active: active && { pivot: { ...active.pivot }, mate: { ...active.mate }, rotation: active.rotation },
        preview, virusesLeft, capsulesPlaced: queueIndex - (active ? 1 : 0), queueLeft: pairs.length - queueIndex,
        status, lastEvent, lastResolution: { ...lastResolution }, canMove: status === 'playing' && Boolean(active)
      };
    }
    function setPiece(next) { if (status !== 'playing' || !active || !canPlace(next)) return false; active = next; return true; }

    return Object.freeze({
      view,
      move(dx) {
        if (!Number.isInteger(dx) || ![-1, 1].includes(dx) || status !== 'playing' || !active) return false;
        return setPiece({ ...active, pivot: { ...active.pivot, col: active.pivot.col + dx }, mate: { ...active.mate, col: active.mate.col + dx } });
      },
      rotate() {
        if (status !== 'playing' || !active) return false;
        const dr = active.mate.row - active.pivot.row;
        const dc = active.mate.col - active.pivot.col;
        const next = { ...active, mate: { ...active.mate, row: active.pivot.row + dc, col: active.pivot.col - dr } };
        if (canPlace(next)) { active = next; active.rotation = (active.rotation + 1) % 4; return true; }
        return false;
      },
      softDrop() { return moveDown(); },
      hardDrop() {
        if (status !== 'playing' || !active) return false;
        while (true) {
          const moved = { ...active, pivot: { ...active.pivot, row: active.pivot.row + 1 }, mate: { ...active.mate, row: active.mate.row + 1 } };
          if (!canPlace(moved)) return lock();
          active = moved;
        }
      },
      tick(delta) {
        if (!Number.isFinite(delta) || delta <= 0 || delta > 3 || status !== 'playing' || !active) return false;
        gravityElapsed += delta;
        while (gravityElapsed >= GRAVITY && status === 'playing' && active) {
          gravityElapsed -= GRAVITY;
          moveDown();
        }
        return true;
      },
      restart() { reset(); return true; }
    });
  }

  return Object.freeze({ ROWS, COLS, COLORS, LABELS, MARKS, GRAVITY, create });
});

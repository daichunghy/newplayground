/* Original NewPlayground Line 98 simulation. See docs/games/LINE98_RESEARCH_AND_QA.md.
   No DOM, wall clock, browser storage, external code, or animation-dependent rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_Line98Model = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const SIZE = 9, COLORS = 7, VERSION = 1, RULES = 'np-classic-1';
  const valid = i => Number.isInteger(i) && i >= 0 && i < SIZE * SIZE;
  const integer = (v, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= 0 && v <= max;
  const neighbors = i => {
    if (!valid(i)) return [];
    const r = Math.floor(i / SIZE), c = i % SIZE, result = [];
    if (r > 0) result.push(i - SIZE);
    if (c < SIZE - 1) result.push(i + 1);
    if (r < SIZE - 1) result.push(i + SIZE);
    if (c > 0) result.push(i - 1);
    return result;
  };
  function findPath(board, start, target) {
    if (!Array.isArray(board) || board.length !== 81 || !valid(start) || !valid(target) || !board[start] || board[target]) return [];
    const previous = Array(81).fill(-1), queue = [start];
    previous[start] = start;
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      if (current === target) {
        const path = [target];
        while (path[path.length - 1] !== start) path.push(previous[path[path.length - 1]]);
        return path.reverse();
      }
      for (const n of neighbors(current)) if (!board[n] && previous[n] === -1) { previous[n] = current; queue.push(n); }
    }
    return [];
  }
  function reachable(board, start) {
    if (!Array.isArray(board) || board.length !== 81 || !valid(start) || !board[start]) return [];
    const seen = new Set([start]), queue = [start];
    for (let head = 0; head < queue.length; head++) for (const n of neighbors(queue[head])) {
      if (!board[n] && !seen.has(n)) { seen.add(n); queue.push(n); }
    }
    return queue.slice(1);
  }
  function findLines(board) {
    if (!Array.isArray(board) || board.length !== 81) return { lines: [], cells: [] };
    const lines = [], unique = new Set();
    const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
    for (let i = 0; i < 81; i++) {
      const color = board[i];
      if (!color) continue;
      const r = Math.floor(i / SIZE), c = i % SIZE;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        // Only the start of a maximal run is counted, including runs longer than five.
        if (inside(r - dr, c - dc) && board[(r - dr) * SIZE + c - dc] === color) continue;
        const line = [];
        for (let nr = r, nc = c; inside(nr, nc) && board[nr * SIZE + nc] === color; nr += dr, nc += dc) line.push(nr * SIZE + nc);
        if (line.length >= 5) { lines.push(line); line.forEach(n => unique.add(n)); }
      }
    }
    return { lines, cells: [...unique].sort((a, b) => a - b) };
  }
  // Explicit NP variant: score the union of removed balls, so crossings count once.
  function pointsFor(count) { return integer(count, 81) && count >= 5 ? 10 + 2 * (count - 5) ** 2 : 0; }
  function copy(s) {
    return { version: VERSION, rules: RULES, board: [...s.board], next: [...s.next], score: s.score,
      moves: s.moves, cleared: s.cleared, status: s.status, rng: s.rng };
  }
  function validSnapshot(s) {
    if (!s || s.version !== VERSION || s.rules !== RULES || !Array.isArray(s.board) || s.board.length !== 81 ||
      !Array.from(s.board).every(c => integer(c, COLORS)) || !s.board.some(Boolean) || !Array.isArray(s.next) || s.next.length !== 3 ||
      !Array.from(s.next).every(c => Number.isInteger(c) && c > 0 && c <= COLORS) || !integer(s.rng, 0xffffffff) ||
      !integer(s.score, 1000000000) || !integer(s.moves, 10000000) || !integer(s.cleared, 810000000) ||
      !['playing', 'lost'].includes(s.status) || (s.status === 'lost') !== s.board.every(Boolean) || findLines(s.board).cells.length) return false;
    return true;
  }
  function build(initial, history) {
    let state = copy(initial), previous = history ? copy(history) : null;
    function random() {
      // Mulberry32: the complete generator state is in every checkpoint and Undo snapshot.
      state.rng = (state.rng + 0x6D2B79F5) >>> 0;
      let n = state.rng;
      n = Math.imul(n ^ n >>> 15, n | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    }
    const rollPreview = () => Array.from({ length: 3 }, () => 1 + Math.floor(random() * COLORS));
    function spawn(colors) {
      const empty = state.board.map((c, i) => c ? -1 : i).filter(i => i >= 0), spawned = [];
      // Batch placement: free cells are sampled without replacement, never a retry loop.
      for (const color of colors.slice(0, empty.length)) {
        const p = Math.floor(random() * empty.length), index = empty.splice(p, 1)[0];
        state.board[index] = color; spawned.push({ index, color });
      }
      return spawned;
    }
    function clearLines() {
      const match = findLines(state.board), points = pointsFor(match.cells.length);
      const removed = match.cells.map(index => ({ index, color: state.board[index] }));
      match.cells.forEach(i => { state.board[i] = 0; });
      state.score += points; state.cleared += match.cells.length;
      return { removed, lines: match.lines, points };
    }
    function initialize() {
      spawn(rollPreview()); state.next = rollPreview();
    }
    function move(from, to) {
      if (state.status !== 'playing') return { kind: 'none', reason: 'finished' };
      if (!valid(from) || !valid(to) || !state.board[from] || state.board[to]) return { kind: 'none', reason: 'invalid' };
      const path = findPath(state.board, from, to);
      if (!path.length) return { kind: 'none', reason: 'blocked' };
      previous = copy(state);
      const color = state.board[from];
      state.board[to] = color; state.board[from] = 0; state.moves++;
      const afterMove = [...state.board];
      let clear = clearLines(), spawned = [], afterSpawn = null;
      if (!clear.removed.length) {
        spawned = spawn(state.next); afterSpawn = [...state.board]; clear = clearLines(); state.next = rollPreview();
      }
      // A completely cleared board has no selectable ball. Re-seed from the visible
      // preview so an endless game cannot deadlock after an all-clear.
      const replenished = state.board.every(c => !c) ? spawn(state.next) : [];
      if (replenished.length) state.next = rollPreview();
      state.status = state.board.every(Boolean) ? 'lost' : 'playing';
      return { kind: state.status === 'lost' ? 'loss' : clear.removed.length ? 'clear' : 'move',
        from, to, color, path, afterMove, afterSpawn, spawned, replenished, ...clear, status: state.status };
    }
    function undo() {
      if (!previous) return false;
      state = copy(previous); previous = null; return true;
    }
    return { move, undo, initialize,
      view: () => ({ ...copy(state), free: state.board.filter(c => !c).length, canUndo: Boolean(previous) }),
      serialize: () => ({ ...copy(state), previous: previous ? copy(previous) : null }),
      path: (from, to) => findPath(state.board, from, to), reachable: from => reachable(state.board, from) };
  }
  function create(seed = Math.floor(Math.random() * 4294967296)) {
    if (!integer(seed, 0xffffffff)) throw new RangeError('Seed must be a uint32');
    const model = build({ board: Array(81).fill(0), next: [1, 1, 1], score: 0, moves: 0, cleared: 0, status: 'playing', rng: seed });
    model.initialize(); delete model.initialize; return model;
  }
  function restore(saved) {
    if (!validSnapshot(saved)) return null;
    const p = saved.previous;
    if (p != null && (!validSnapshot(p) || p.status !== 'playing' || p.moves + 1 !== saved.moves || p.score > saved.score || p.cleared > saved.cleared)) return null;
    const model = build(saved, p); delete model.initialize; return model;
  }
  return Object.freeze({ SIZE, COLORS, VERSION, RULES, create, restore, findPath, reachable, findLines, pointsFor });
});

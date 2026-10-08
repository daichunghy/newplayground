/* Original NewPlayground rules engine. No DOM, clock, audio, or third-party code. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_MinesweeperModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const PRESETS = Object.freeze({
    pocket: Object.freeze({ name: 'Bỏ túi', rows: 8, cols: 6, mines: 8 }),
    beginner: Object.freeze({ name: 'Cơ bản', rows: 9, cols: 9, mines: 10 }),
    intermediate: Object.freeze({ name: 'Trung cấp', rows: 16, cols: 16, mines: 40 }),
    expert: Object.freeze({ name: 'Chuyên gia', rows: 16, cols: 30, mines: 99 })
  });

  function build(presetId = 'beginner', random = Math.random) {
    if (!Object.hasOwn(PRESETS, presetId)) throw new RangeError('Unknown difficulty');
    const { rows, cols, mines } = PRESETS[presetId];
    const cells = Array.from({ length: rows * cols }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false }));
    let status = 'ready', revealedCount = 0, flagCount = 0, firstIndex = null, explodedIndex = null;
    const valid = i => Number.isInteger(i) && i >= 0 && i < cells.length;
    const active = () => status === 'ready' || status === 'playing';
    function neighbors(index) {
      if (!valid(index)) return [];
      const row = Math.floor(index / cols), col = index % cols, list = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr, c = col + dc;
        if ((dr || dc) && r >= 0 && r < rows && c >= 0 && c < cols) list.push(r * cols + c);
      }
      return list;
    }
    function countClues() {
      cells.forEach((cell, i) => { cell.adjacent = cell.mine ? 0 : neighbors(i).filter(n => cells[n].mine).length; });
    }
    function generate(index) {
      firstIndex = index;
      const protectedCells = new Set([index, ...neighbors(index)]);
      const candidates = cells.map((_, i) => i).filter(i => !protectedCells.has(i));
      // Partial Fisher-Yates: bounded even when the RNG repeatedly returns the same value.
      for (let i = 0; i < mines; i++) {
        const sample = Number(random());
        const fraction = Number.isFinite(sample) ? Math.min(1 - Number.EPSILON, Math.max(0, sample)) : 0;
        const j = i + Math.floor(fraction * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        cells[candidates[i]].mine = true;
      }
      countClues(); status = 'playing';
    }
    function result(kind, changed = [], started = false, reason = '') {
      return { kind, changed, started, reason, status };
    }
    function flood(indices, changed) {
      const queue = [...indices];
      while (queue.length) {
        const i = queue.pop(), cell = cells[i];
        if (cell.revealed || cell.flagged || cell.mine) continue;
        cell.revealed = true; revealedCount++; changed.push(i);
        if (cell.adjacent === 0) queue.push(...neighbors(i));
      }
    }
    function settle() { if (revealedCount === cells.length - mines) status = 'won'; }
    function reveal(index) {
      if (!valid(index) || !active() || cells[index].flagged) return result('none');
      if (cells[index].revealed) return chord(index);
      const started = status === 'ready';
      if (started) generate(index);
      if (cells[index].mine) {
        explodedIndex = index; status = 'lost';
        return result('loss', [index], started);
      }
      const changed = []; flood([index], changed); settle();
      return result(status === 'won' ? 'win' : 'reveal', changed, started);
    }
    function flag(index) {
      if (!valid(index) || !active() || cells[index].revealed) return result('none');
      cells[index].flagged = !cells[index].flagged;
      flagCount += cells[index].flagged ? 1 : -1;
      return result('flag', [index]);
    }
    function chord(index) {
      if (!valid(index) || status !== 'playing' || !cells[index].revealed || !cells[index].adjacent) return result('none');
      const adjacent = neighbors(index), expected = cells[index].adjacent;
      if (adjacent.filter(i => cells[i].flagged).length !== expected) return result('none', [], false, 'flags-mismatch');
      const targets = adjacent.filter(i => !cells[i].revealed && !cells[i].flagged);
      if (!targets.length) return result('none');
      const changed = [];
      flood(targets, changed);
      const hit = targets.find(i => cells[i].mine);
      if (hit !== undefined) {
        explodedIndex = hit; status = 'lost'; changed.push(hit);
        return result('loss', changed);
      }
      settle();
      return result(status === 'won' ? 'win' : 'chord', changed);
    }
    function view() {
      return { presetId, rows, cols, mines, status, revealedCount, flagCount, firstIndex, explodedIndex,
        cells: cells.map(cell => ({ ...cell })) };
    }
    function serialize() {
      return { version: 1, presetId, status, firstIndex,
        mines: cells.flatMap((c, i) => c.mine ? [i] : []),
        revealed: cells.flatMap((c, i) => c.revealed ? [i] : []),
        flags: cells.flatMap((c, i) => c.flagged ? [i] : []) };
    }
    function hydrate(saved) {
      if (!saved || saved.version !== 1 || saved.presetId !== presetId || !['ready', 'playing'].includes(saved.status)) return false;
      const lists = [saved.mines, saved.revealed, saved.flags];
      if (lists.some(a => !Array.isArray(a) || Array.from(a).some(i => !valid(i)) || new Set(a).size !== a.length)) return false;
      if (saved.flags.some(i => saved.revealed.includes(i))) return false;
      if (saved.status === 'ready') {
        if (saved.mines.length || saved.revealed.length || saved.firstIndex !== null) return false;
      } else {
        if (saved.mines.length !== mines || !valid(saved.firstIndex) || !saved.revealed.includes(saved.firstIndex) || !saved.revealed.length || saved.revealed.length >= cells.length - mines) return false;
        const protectedCells = [saved.firstIndex, ...neighbors(saved.firstIndex)];
        if (saved.mines.some(i => protectedCells.includes(i) || saved.revealed.includes(i))) return false;
      }
      saved.mines.forEach(i => { cells[i].mine = true; });
      saved.revealed.forEach(i => { cells[i].revealed = true; });
      saved.flags.forEach(i => { cells[i].flagged = true; });
      firstIndex = saved.firstIndex; status = saved.status;
      revealedCount = saved.revealed.length; flagCount = saved.flags.length;
      countClues(); return true;
    }
    return { reveal, flag, chord, neighbors, view, serialize, hydrate };
  }
  function create(...args) {
    const { hydrate, ...board } = build(...args);
    return board;
  }
  function restore(saved) {
    if (!saved || !Object.hasOwn(PRESETS, saved.presetId)) return null;
    const { hydrate, ...board } = build(saved.presetId);
    return hydrate(saved) ? board : null;
  }
  return { PRESETS, create, restore };
});

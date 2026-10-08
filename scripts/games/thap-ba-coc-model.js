/* Classic three-peg Hanoi rules for Tháp Ba Cọc. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_ThapBaCocModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const STAGES = Object.freeze([
    Object.freeze({ id: 'buoc-dau', name: 'Bước đầu', disks: 3 }),
    Object.freeze({ id: 'vung-vang', name: 'Vững vàng', disks: 4 }),
    Object.freeze({ id: 'ben-bi', name: 'Bền bỉ', disks: 5 }),
    Object.freeze({ id: 'dinh-thap', name: 'Đỉnh tháp', disks: 6 })
  ]);
  const MAX_UNDO = 1000;
  const clonePegs = pegs => pegs.map(peg => peg.slice());
  const validPegs = (pegs, disks) => {
    if (!Array.isArray(pegs) || pegs.length !== 3 || pegs.some(peg => !Array.isArray(peg))) return false;
    const seen = [];
    for (const peg of pegs) {
      for (let i = 0; i < peg.length; i++) {
        const disk = peg[i];
        if (!Number.isSafeInteger(disk) || disk < 1 || disk > disks || (i > 0 && peg[i - 1] <= disk)) return false;
        seen.push(disk);
      }
    }
    return seen.length === disks && new Set(seen).size === disks;
  };
  const solvedPegs = (pegs, disks) => pegs[2].length === disks && pegs[0].length === 0 && pegs[1].length === 0;
  const positionsOf = pegs => {
    const positions = [];
    pegs.forEach((peg, pegIndex) => peg.forEach(disk => { positions[disk - 1] = pegIndex; }));
    return positions;
  };
  const keyOf = positions => positions.map(peg => String.fromCharCode(65 + peg)).join('');
  const topDisks = positions => {
    const tops = [Infinity, Infinity, Infinity];
    positions.forEach((peg, index) => { if (index + 1 < tops[peg]) tops[peg] = index + 1; });
    return tops;
  };
  function validSave(saved, expectedStage = null) {
    if (!saved || saved.version !== 1 || !Number.isSafeInteger(saved.stageIndex) ||
        saved.stageIndex < 0 || saved.stageIndex >= STAGES.length ||
        (expectedStage !== null && saved.stageIndex !== expectedStage) ||
        !Number.isSafeInteger(saved.moves) || saved.moves < 0 || saved.moves > 1000000 ||
        !validPegs(saved.pegs, STAGES[saved.stageIndex].disks) ||
        !Array.isArray(saved.history) || saved.history.length > MAX_UNDO || saved.history.length > saved.moves) return false;
    if (!saved.history.every(entry => entry && Number.isSafeInteger(entry.moves) && entry.moves >= 0 && entry.moves < saved.moves &&
      validPegs(entry.pegs, STAGES[saved.stageIndex].disks))) return false;
    for (let i = 1; i < saved.history.length; i++) if (saved.history[i].moves !== saved.history[i - 1].moves + 1) return false;
    return saved.history.length === 0 || saved.history.at(-1).moves === saved.moves - 1;
  }

  function create(stageIndex = 0, saved = null) {
    if (!Number.isSafeInteger(stageIndex) || stageIndex < 0 || stageIndex >= STAGES.length) return null;
    if (saved && !validSave(saved, stageIndex)) return null;
    const disks = STAGES[stageIndex].disks;
    let pegs = saved ? clonePegs(saved.pegs) : [Array.from({ length: disks }, (_, i) => disks - i), [], []];
    let moves = saved ? saved.moves : 0;
    let history = saved ? saved.history.map(entry => ({ pegs: clonePegs(entry.pegs), moves: entry.moves })) : [];
    const status = () => solvedPegs(pegs, disks) ? 'won' : 'playing';
    const snapshot = () => ({ version: 1, stageIndex, pegs: clonePegs(pegs), moves, history: history.map(entry => ({ pegs: clonePegs(entry.pegs), moves: entry.moves })) });

    function move(from, to) {
      if (status() === 'won') return { ok: false, reason: 'won' };
      if (!Number.isSafeInteger(from) || from < 0 || from > 2 || !Number.isSafeInteger(to) || to < 0 || to > 2) return { ok: false, reason: 'invalid-peg' };
      if (from === to) return { ok: false, reason: 'same-peg' };
      const disk = pegs[from].at(-1);
      if (disk === undefined) return { ok: false, reason: 'empty-source' };
      const target = pegs[to].at(-1);
      if (target !== undefined && target < disk) return { ok: false, reason: 'larger-on-smaller', disk, target };
      if (moves >= 1000000) return { ok: false, reason: 'move-limit' };
      if (history.length === MAX_UNDO) history.shift();
      history.push({ pegs: clonePegs(pegs), moves });
      pegs[from].pop(); pegs[to].push(disk); moves++;
      return { ok: true, disk, from, to, moves, status: status() };
    }
    function undo() {
      if (!history.length) return false;
      const previous = history.pop();
      pegs = clonePegs(previous.pegs); moves = previous.moves;
      return true;
    }
    function hint() {
      if (status() === 'won') return null;
      const start = positionsOf(pegs), startKey = keyOf(start), goal = 'C'.repeat(disks);
      if (startKey === goal) return null;
      const queue = [start], parents = new Map([[startKey, null]]);
      let cursor = 0, goalKey = null;
      while (cursor < queue.length && goalKey === null) {
        const positions = queue[cursor++], key = keyOf(positions), tops = topDisks(positions);
        for (let from = 0; from < 3 && goalKey === null; from++) {
          const disk = tops[from];
          if (disk === Infinity) continue;
          for (let to = 0; to < 3; to++) {
            if (from === to || (tops[to] !== Infinity && tops[to] < disk)) continue;
            const next = positions.slice(); next[disk - 1] = to;
            const nextKey = keyOf(next);
            if (parents.has(nextKey)) continue;
            parents.set(nextKey, { previous: key, from, to, disk });
            if (nextKey === goal) { goalKey = nextKey; break; }
            queue.push(next);
          }
        }
      }
      if (!goalKey) return null;
      let step = parents.get(goalKey);
      while (step && step.previous !== startKey) step = parents.get(step.previous);
      return step ? { from: step.from, to: step.to, disk: step.disk } : null;
    }
    const view = () => ({ stageIndex, stage: STAGES[stageIndex], pegs: clonePegs(pegs), moves,
      par: (2 ** disks) - 1, status: status(), undoDepth: history.length });
    return { view, move, undo, hint, serialize: snapshot };
  }

  return { STAGES, MAX_UNDO, create, restore: saved => validSave(saved) ? create(saved.stageIndex, saved) : null, validSave, validPegs, optimalMoves: disks => Number.isSafeInteger(disks) && disks > 0 ? (2 ** disks) - 1 : null };
});

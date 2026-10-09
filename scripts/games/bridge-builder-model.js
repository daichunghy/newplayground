/* Small pin-jointed truss solver for the original bridge-building course. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BridgeBuilderModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LEVELS = Object.freeze([
    Object.freeze({ name: 'Khe Suối', spans: 4, load: 1.2, budget: 8 }),
    Object.freeze({ name: 'Hẻm Gió', spans: 5, load: 1.45, budget: 10 }),
    Object.freeze({ name: 'Thung Lũng', spans: 6, load: 1.7, budget: 12 })
  ]);
  const BAR_STIFFNESS = 1200;
  const MAX_DEFLECTION = 0.025;
  const MAX_FORCE = 5.5;
  const TEST_MS = 3000;
  const finite = Number.isFinite;

  function lower(i) { return `b${i}`; }
  function upper(i) { return `t${i}`; }
  function levelPoints(spans) {
    const points = [];
    for (let i = 0; i <= spans; i++) points.push({ id: lower(i), x: i, y: 0, kind: 'deck' });
    for (let i = 0; i < spans; i++) points.push({ id: upper(i), x: i + 0.5, y: -1, kind: 'top' });
    return points;
  }
  function key(a, b) { return [a, b].sort().join('|'); }

  function solveLinear(matrix, vector) {
    const size = vector.length;
    const a = matrix.map((row, index) => [...row, vector[index]]);
    for (let column = 0; column < size; column++) {
      let pivot = column;
      for (let row = column + 1; row < size; row++) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
      if (Math.abs(a[pivot][column]) < 1e-8) return null;
      [a[column], a[pivot]] = [a[pivot], a[column]];
      const divisor = a[column][column];
      for (let j = column; j <= size; j++) a[column][j] /= divisor;
      for (let row = 0; row < size; row++) {
        if (row === column) continue;
        const factor = a[row][column];
        if (!factor) continue;
        for (let j = column; j <= size; j++) a[row][j] -= factor * a[column][j];
      }
    }
    return a.map(row => row[size]);
  }

  function evaluate(spans, load, braceKeys) {
    const points = levelPoints(spans), indexById = new Map(points.map((point, index) => [point.id, index]));
    const bars = [];
    for (let i = 0; i < spans; i++) bars.push({ a: lower(i), b: lower(i + 1), base: true });
    for (let i = 0; i < spans - 1; i++) bars.push({ a: upper(i), b: upper(i + 1), base: true });
    for (const brace of braceKeys) {
      const [a, b] = brace.split('|');
      bars.push({ a, b, base: false });
    }
    const dofCount = points.length * 2;
    const fixed = new Set([0, 1, (spans * 2), (spans * 2) + 1]);
    const free = Array.from({ length: dofCount }, (_, i) => i).filter(i => !fixed.has(i));
    let maxDeflection = 0, maxForce = 0;
    for (let loadIndex = 1; loadIndex < spans; loadIndex++) {
      const stiffness = Array.from({ length: dofCount }, () => Array(dofCount).fill(0));
      for (const bar of bars) {
        const ia = indexById.get(bar.a), ib = indexById.get(bar.b);
        const p = points[ia], q = points[ib], dx = q.x - p.x, dy = q.y - p.y;
        const length = Math.hypot(dx, dy), nx = dx / length, ny = dy / length, k = BAR_STIFFNESS / length;
        const ids = [ia * 2, ia * 2 + 1, ib * 2, ib * 2 + 1];
        const direction = [nx, ny, -nx, -ny];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) stiffness[ids[r]][ids[c]] += k * direction[r] * direction[c];
      }
      const reduced = free.map(r => free.map(c => stiffness[r][c]));
      const forces = Array(dofCount).fill(0); forces[loadIndex * 2 + 1] = -load;
      const displacement = solveLinear(reduced, free.map(i => forces[i]));
      if (!displacement) return { stable: false, reason: 'unstable', maxDeflection: Infinity, maxForce: Infinity };
      const full = Array(dofCount).fill(0); free.forEach((dof, i) => { full[dof] = displacement[i]; });
      for (let i = 0; i < points.length; i++) maxDeflection = Math.max(maxDeflection, Math.hypot(full[i * 2], full[i * 2 + 1]));
      for (const bar of bars) {
        const ia = indexById.get(bar.a), ib = indexById.get(bar.b), p = points[ia], q = points[ib];
        const dx = q.x - p.x, dy = q.y - p.y, length = Math.hypot(dx, dy), nx = dx / length, ny = dy / length;
        const extension = (full[ib * 2] - full[ia * 2]) * nx + (full[ib * 2 + 1] - full[ia * 2 + 1]) * ny;
        maxForce = Math.max(maxForce, Math.abs(BAR_STIFFNESS / length * extension));
      }
    }
    return {
      stable: true, maxDeflection, maxForce,
      passed: maxDeflection <= MAX_DEFLECTION && maxForce <= MAX_FORCE,
      reason: maxDeflection > MAX_DEFLECTION ? 'flex' : maxForce > MAX_FORCE ? 'overload' : 'sound'
    };
  }

  function create() {
    let state;
    function resetLevel(levelIndex = 0) {
      const level = LEVELS[levelIndex];
      state = {
        levelIndex, status: 'building', selected: null, braces: [], elapsed: 0,
        pausedFrom: null, report: null, lastEvent: 'start',
        points: levelPoints(level.spans), level
      };
    }
    function view() {
      const baseBars = [];
      for (let i = 0; i < state.level.spans; i++) baseBars.push({ a: lower(i), b: lower(i + 1), base: true, kind: 'road' });
      for (let i = 0; i < state.level.spans - 1; i++) baseBars.push({ a: upper(i), b: upper(i + 1), base: true, kind: 'chord' });
      const bars = [...baseBars, ...state.braces.map(bar => ({ ...bar, base: false, kind: 'brace' }))];
      return {
        status: state.status, levelIndex: state.levelIndex, levelNumber: state.levelIndex + 1,
        levelCount: LEVELS.length, levelName: state.level.name, spans: state.level.spans,
        load: state.level.load, budget: state.level.budget, used: state.braces.length,
        remaining: state.level.budget - state.braces.length, selected: state.selected,
        points: state.points.map(point => ({ ...point })), bars, braces: state.braces.map(bar => ({ ...bar })),
        progress: state.status === 'testing' ? Math.min(1, state.elapsed / TEST_MS) : state.status === 'passed' || state.status === 'won' ? 1 : 0,
        report: state.report ? { ...state.report } : null, lastEvent: state.lastEvent
      };
    }
    resetLevel();
    return Object.freeze({
      view,
      selectJoint(id) {
        if (state.status !== 'building' || !state.points.some(point => point.id === id)) return { accepted: false, reason: 'state' };
        if (state.selected === null) { state.selected = id; return { accepted: true, selected: id }; }
        if (state.selected === id) { state.selected = null; return { accepted: true, cleared: true }; }
        const a = state.selected, b = id, top = a.startsWith('t') ? a : b.startsWith('t') ? b : null;
        const deck = a.startsWith('b') ? a : b.startsWith('b') ? b : null;
        if (!top || !deck) { state.selected = id; return { accepted: false, reason: 'pair', selected: id }; }
        const t = Number(top.slice(1)), d = Number(deck.slice(1));
        if (d !== t && d !== t + 1) { state.selected = id; return { accepted: false, reason: 'distance', selected: id }; }
        const memberKey = key(a, b);
        if (state.braces.some(brace => key(brace.a, brace.b) === memberKey)) { state.selected = null; return { accepted: false, reason: 'duplicate' }; }
        if (state.braces.length >= state.level.budget) { state.selected = null; return { accepted: false, reason: 'budget' }; }
        state.braces.push({ a, b }); state.selected = null; state.lastEvent = 'brace';
        return { accepted: true, member: { a, b }, remaining: state.level.budget - state.braces.length };
      },
      undo() {
        if (state.status !== 'building' || !state.braces.length) return false;
        state.braces.pop(); state.selected = null; state.lastEvent = 'undo'; return true;
      },
      clearSelection() { if (state.status !== 'building') return false; state.selected = null; return true; },
      test() {
        if (state.status !== 'building') return false;
        state.report = evaluate(state.level.spans, state.level.load, state.braces.map(brace => key(brace.a, brace.b)));
        state.elapsed = 0; state.status = 'testing'; state.lastEvent = 'test'; return true;
      },
      advance(milliseconds) {
        if (!finite(milliseconds) || milliseconds <= 0 || milliseconds > 60000 || state.status !== 'testing') return false;
        state.elapsed = Math.min(TEST_MS, state.elapsed + milliseconds);
        if (state.elapsed >= TEST_MS) {
          state.status = state.report.passed ? (state.levelIndex === LEVELS.length - 1 ? 'won' : 'passed') : 'failed';
          state.lastEvent = state.report.passed ? 'bridge-sound' : state.report.reason;
        }
        return true;
      },
      repair() { if (state.status !== 'failed') return false; state.status = 'building'; state.report = null; state.elapsed = 0; state.selected = null; return true; },
      nextLevel() { if (state.status !== 'passed') return false; resetLevel(state.levelIndex + 1); return true; },
      pause() { if (!['building', 'testing'].includes(state.status)) return false; state.pausedFrom = state.status; state.status = 'paused'; return true; },
      resume() { if (state.status !== 'paused' || !state.pausedFrom) return false; state.status = state.pausedFrom; state.pausedFrom = null; return true; },
      restart() { resetLevel(); return true; }
    });
  }

  return Object.freeze({ LEVELS, TEST_MS, MAX_DEFLECTION, MAX_FORCE, levelPoints, evaluate, create });
});

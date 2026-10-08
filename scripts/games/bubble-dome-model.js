/* Deterministic match-three ceiling shooter rules model. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BubbleDomeModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COLORS = Object.freeze(['amber', 'mint', 'blue', 'rose']);
  const SYMBOLS = Object.freeze({ amber: '◆', mint: '●', blue: '▲', rose: '✦' });
  const LABELS = Object.freeze({ amber: 'vàng', mint: 'lục', blue: 'lam', rose: 'hồng' });
  const COLS = 9;
  const MAX_ROWS = 12;
  const RADIUS = 0.5;
  const ROW_STEP = Math.sqrt(3) / 2;
  const SHOT_LIMIT = 32;
  const AIM_LIMIT = 65;
  const SPEED = 12;

  function hashSeed(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let value = 2166136261;
    const text = String(seed ?? Date.now());
    for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619) >>> 0;
    return value || 1;
  }
  function rngFor(seed) {
    let state = hashSeed(seed);
    return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  }
  function key(row, col) { return `${row}:${col}`; }
  function position(row, col) {
    return { x: 0.5 + col + (row % 2 ? 0.5 : 0), y: 0.5 + row * ROW_STEP };
  }
  function neighbors(row, col) {
    const adjacent = [[row, col - 1], [row, col + 1]];
    if (row % 2 === 0) adjacent.push([row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]);
    else adjacent.push([row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]);
    return adjacent.filter(([r, c]) => r >= 0 && r < MAX_ROWS && c >= 0 && c < COLS);
  }
  function copyBoard(board) { return new Map([...board].map(([cell, bubble]) => [cell, { ...bubble }])); }
  function validBubble(bubble) {
    return bubble && Number.isInteger(bubble.row) && bubble.row >= 0 && bubble.row < MAX_ROWS
      && Number.isInteger(bubble.col) && bubble.col >= 0 && bubble.col < COLS && COLORS.includes(bubble.color);
  }

  function create(options = {}) {
    const seed = options.seed ?? Date.now();
    const random = rngFor(seed);
    const original = options.initial ? options.initial.map(bubble => ({ ...bubble })) : (() => {
      const pattern = ['amber', 'amber', 'mint', 'mint', 'blue', 'blue', 'rose', 'rose', 'amber'];
      const offset = hashSeed(seed) % pattern.length;
      return Array.from({ length: 6 }, (_, row) => Array.from({ length: COLS }, (_, col) => ({
        row, col, color: pattern[(col + row * 2 + offset) % pattern.length]
      }))).flat();
    })();
    if (!original.every(validBubble) || new Set(original.map(b => key(b.row, b.col))).size !== original.length) {
      throw new TypeError('Initial bubble layout contains an invalid or duplicate cell.');
    }
    const originalMap = new Map(original.map(b => [key(b.row, b.col), { ...b }]));
    const queue = options.queue ? [...options.queue] : Array.from({ length: SHOT_LIMIT }, () => COLORS[Math.floor(random() * COLORS.length)]);
    if (!queue.length || queue.some(color => !COLORS.includes(color))) throw new TypeError('Shot queue must contain known colors.');

    let board;
    let shotIndex;
    let status;
    let lastEvent;
    let projectile;
    let aim;
    let score;
    let lastClear;

    function reset() {
      board = copyBoard(originalMap);
      shotIndex = 0;
      status = 'playing';
      lastEvent = 'deal';
      projectile = null;
      aim = 0;
      score = 0;
      lastClear = { popped: 0, dropped: 0 };
    }
    reset();

    function state() {
      return {
        bubbles: [...board.values()].map(b => ({ ...b })).sort((a, b) => a.row - b.row || a.col - b.col),
        projectile: projectile && { ...projectile },
        aim,
        shotsLeft: Math.max(0, queue.length - shotIndex),
        shotsUsed: shotIndex,
        currentColor: queue[shotIndex] || null,
        nextColor: queue[shotIndex + 1] || null,
        status,
        lastEvent,
        score,
        lastClear: { ...lastClear },
        canFire: status === 'playing' && !projectile && shotIndex < queue.length
      };
    }

    function cluster(start) {
      const origin = board.get(key(start.row, start.col));
      if (!origin) return [];
      const seen = new Set([key(start.row, start.col)]);
      const stack = [[start.row, start.col]];
      while (stack.length) {
        const [row, col] = stack.pop();
        for (const [nextRow, nextCol] of neighbors(row, col)) {
          const nextKey = key(nextRow, nextCol);
          if (seen.has(nextKey) || board.get(nextKey)?.color !== origin.color) continue;
          seen.add(nextKey);
          stack.push([nextRow, nextCol]);
        }
      }
      return [...seen].map(cell => cell.split(':').map(Number));
    }

    function clearUnsupported() {
      const attached = new Set();
      const stack = [...board.values()].filter(b => b.row === 0).map(b => [b.row, b.col]);
      while (stack.length) {
        const [row, col] = stack.pop();
        const cell = key(row, col);
        if (attached.has(cell)) continue;
        attached.add(cell);
        stack.push(...neighbors(row, col).filter(([r, c]) => board.has(key(r, c))));
      }
      let dropped = 0;
      for (const cell of board.keys()) if (!attached.has(cell)) { board.delete(cell); dropped++; }
      return dropped;
    }

    function popFrom(row, col) {
      const same = cluster({ row, col });
      if (same.length < 3) return { popped: 0, dropped: 0 };
      for (const [r, c] of same) board.delete(key(r, c));
      return { popped: same.length, dropped: clearUnsupported() };
    }

    function attach(projectilePosition, hit) {
      let candidates;
      if (hit) {
        candidates = neighbors(hit.row, hit.col).filter(([row, col]) => !board.has(key(row, col)));
      } else {
        candidates = Array.from({ length: COLS }, (_, col) => [0, col]).filter(([row, col]) => !board.has(key(row, col)));
      }
      if (!candidates.length) {
        candidates = [];
        for (let row = 0; row < MAX_ROWS; row++) for (let col = 0; col < COLS; col++) {
          if (!board.has(key(row, col))) candidates.push([row, col]);
        }
      }
      if (!candidates.length) { status = 'lost'; lastEvent = 'blocked'; projectile = null; return; }
      candidates.sort((a, b) => {
        const pa = position(a[0], a[1]), pb = position(b[0], b[1]);
        const da = (pa.x - projectilePosition.x) ** 2 + (pa.y - projectilePosition.y) ** 2;
        const db = (pb.x - projectilePosition.x) ** 2 + (pb.y - projectilePosition.y) ** 2;
        return da - db || a[0] - b[0] || a[1] - b[1];
      });
      const [row, col] = candidates[0];
      const bubble = { row, col, color: projectile.color };
      board.set(key(row, col), bubble);
      projectile = null;
      const result = popFrom(row, col);
      lastClear = result;
      score += result.popped * 100 + result.dropped * 150;
      lastEvent = result.popped ? 'pop' : 'attach';
      if (board.size === 0) { status = 'won'; score += Math.max(0, queue.length - shotIndex) * 75; lastEvent = 'win'; }
      else if (shotIndex >= queue.length) { status = 'lost'; lastEvent = 'out-of-shots'; }
    }

    function hitAt(projectilePosition) {
      let closest = null;
      let best = 0.92 ** 2;
      for (const bubble of board.values()) {
        const p = position(bubble.row, bubble.col);
        const distance = (p.x - projectilePosition.x) ** 2 + (p.y - projectilePosition.y) ** 2;
        if (distance <= best) { best = distance; closest = bubble; }
      }
      return closest;
    }

    function tick(delta) {
      if (!Number.isFinite(delta) || delta <= 0 || delta > 1.25 || status !== 'playing' || !projectile) return false;
      const steps = Math.ceil(delta * 120);
      const step = delta / steps;
      for (let i = 0; i < steps && projectile && status === 'playing'; i++) {
        projectile.x += projectile.vx * step;
        projectile.y += projectile.vy * step;
        if (projectile.x <= 0.5 || projectile.x >= 9.5) {
          projectile.x = Math.max(0.5, Math.min(9.5, projectile.x));
          projectile.vx *= -1;
        }
        const hit = hitAt(projectile);
        if (hit) { attach(projectile, hit); continue; }
        if (projectile.y <= 0.5) attach(projectile, null);
      }
      return true;
    }

    return Object.freeze({
      view: state,
      setAim(value) {
        if (!Number.isFinite(value) || status !== 'playing' || projectile) return false;
        aim = Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, value));
        return true;
      },
      fire(value = aim) {
        if (status !== 'playing' || projectile || shotIndex >= queue.length || !Number.isFinite(value)) return false;
        aim = Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, value));
        const radians = aim * Math.PI / 180;
        projectile = { x: 5, y: 11, vx: Math.sin(radians) * SPEED, vy: -Math.cos(radians) * SPEED, color: queue[shotIndex] };
        shotIndex++;
        lastEvent = 'shot';
        return true;
      },
      tick,
      restart() { reset(); return true; }
    });
  }

  return Object.freeze({ COLORS, SYMBOLS, LABELS, COLS, MAX_ROWS, RADIUS, ROW_STEP, SHOT_LIMIT, AIM_LIMIT, position, neighbors, create });
});

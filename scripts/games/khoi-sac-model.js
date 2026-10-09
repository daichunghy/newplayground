/* Original, deterministic 2x2x2 face-turn puzzle model for Khối Sắc. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_KhoiSacModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FACES = Object.freeze(['U', 'D', 'F', 'B', 'R', 'L']);
  const FACE_NAMES = Object.freeze({ U: 'Trên', D: 'Dưới', F: 'Trước', B: 'Sau', R: 'Phải', L: 'Trái' });
  const COLORS = Object.freeze({
    U: Object.freeze({ value: '#f5f0d8', mark: '●', name: 'Ngà' }),
    D: Object.freeze({ value: '#f4c95d', mark: '◆', name: 'Vàng' }),
    F: Object.freeze({ value: '#e66b5b', mark: '▲', name: 'Đỏ san hô' }),
    B: Object.freeze({ value: '#8a74c6', mark: '✦', name: 'Tím' }),
    R: Object.freeze({ value: '#4ba88e', mark: '■', name: 'Ngọc' }),
    L: Object.freeze({ value: '#5e9dd4', mark: '✚', name: 'Lam' })
  });
  const FACE = Object.freeze({
    U: Object.freeze({ normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] }),
    D: Object.freeze({ normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] }),
    F: Object.freeze({ normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] }),
    B: Object.freeze({ normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] }),
    R: Object.freeze({ normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] }),
    L: Object.freeze({ normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] })
  });
  const STAGES = Object.freeze([
    Object.freeze({ id: 'dom-sang', name: 'Đốm Sáng', targetFaces: Object.freeze(['U']),
      targetSequence: Object.freeze(['R', 'U', "F'"]), startLength: 4, moveBudget: 10 }),
    Object.freeze({ id: 'cau-sang', name: 'Cầu Sáng', targetFaces: Object.freeze(['U', 'F']),
      targetSequence: Object.freeze(['R', 'U', "F'", 'D']), startLength: 6, moveBudget: 15 }),
    Object.freeze({ id: 'vet-quy-dao', name: 'Vệt Quỹ Đạo', targetFaces: Object.freeze(['U', 'F', 'R']),
      targetSequence: Object.freeze(['B', 'R', 'U', "F'", 'D', 'L']), startLength: 8, moveBudget: 20 })
  ]);
  const STAGE_LENGTHS = Object.freeze(STAGES.map(stage => stage.startLength));
  const CAMPAIGN_TIME_MS = 120000;
  const DEFAULT_SEED = 'khoi-sac-2026';

  function hashSeed(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let hash = 2166136261;
    for (const ch of String(seed ?? DEFAULT_SEED)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    return hash || 1;
  }

  function makeRng(seed) {
    let state = hashSeed(seed);
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function rotatePositiveQuarter(vector, axis) {
    const perpendicular = cross(axis, vector);
    const parallel = dot(axis, vector);
    return perpendicular.map((component, i) => component + parallel * axis[i]);
  }

  function rotateVector(vector, axis, sign) {
    if (sign === 2 || sign === -2) return vector.map((component, i) => 2 * dot(axis, vector) * axis[i] - component);
    const positive = rotatePositiveQuarter(vector, axis);
    return sign < 0 ? positive.map((component, i) => 2 * dot(axis, vector) * axis[i] - component) : positive;
  }

  function createSolvedCube() {
    const stickers = [];
    for (const face of FACES) {
      const { normal, right, up } = FACE[face];
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
        const position = normal.map((value, i) => value + (col ? 1 : -1) * right[i] + (row ? -1 : 1) * up[i]);
        stickers.push({ id: `${face}${row}${col}`, color: face, position, normal: [...normal] });
      }
    }
    return stickers;
  }

  function parseMove(move) {
    if (typeof move === 'object' && move && FACES.includes(move.face) && [1, -1, 2, 3].includes(move.turns)) {
      return { face: move.face, turns: move.turns === 3 ? -1 : move.turns };
    }
    if (typeof move !== 'string') return null;
    const match = /^([UDFBRL])([2']?)$/.exec(move);
    if (!match) return null;
    return { face: match[1], turns: match[2] === "'" ? -1 : match[2] === '2' ? 2 : 1 };
  }

  function applyMove(cube, move) {
    const parsed = parseMove(move);
    if (!Array.isArray(cube) || cube.length !== 24 || !parsed) return null;
    const { face, turns } = parsed;
    const axis = FACE[face].normal;
    const quarterCount = turns === 2 ? 2 : turns === 1 ? -1 : 1;
    const sign = quarterCount < 0 ? -1 : 1;
    const repeats = Math.abs(quarterCount);
    return cube.map(sticker => {
      if (dot(sticker.position, axis) !== 1) return { ...sticker, position: [...sticker.position], normal: [...sticker.normal] };
      let position = [...sticker.position], normal = [...sticker.normal];
      for (let i = 0; i < repeats; i++) {
        position = rotateVector(position, axis, sign);
        normal = rotateVector(normal, axis, sign);
      }
      return { ...sticker, position, normal };
    });
  }

  function applySequence(cube, moves) {
    if (!Array.isArray(moves)) return null;
    let state = cube.map(sticker => ({ ...sticker, position: [...sticker.position], normal: [...sticker.normal] }));
    for (const move of moves) {
      state = applyMove(state, move);
      if (!state) return null;
    }
    return state;
  }

  function facelets(cube) {
    if (!Array.isArray(cube) || cube.length !== 24) return null;
    const result = {};
    for (const face of FACES) {
      const { normal, right, up } = FACE[face];
      const cells = Array(4).fill(null);
      for (const sticker of cube) {
        if (dot(sticker.normal, normal) !== 1) continue;
        const col = dot(sticker.position, right) === 1 ? 1 : 0;
        const row = dot(sticker.position, up) === 1 ? 0 : 1;
        cells[row * 2 + col] = sticker.color;
      }
      if (cells.some(color => color === null)) return null;
      result[face] = cells;
    }
    return result;
  }

  function isSolved(cube) {
    const faces = facelets(cube);
    return Boolean(faces && FACES.every(face => faces[face].every(color => color === face)));
  }

  function stageTargets(stageIndex) {
    const stage = STAGES[stageIndex];
    if (!stage) return null;
    const targetCube = applySequence(createSolvedCube(), stage.targetSequence);
    const targetState = facelets(targetCube);
    return Object.fromEntries(stage.targetFaces.map(face => [face, targetState[face].slice()]));
  }

  function targetProgress(cube, targets) {
    const current = facelets(cube);
    if (!current || !targets) return { matches: 0, total: 0, complete: false };
    let matches = 0, total = 0;
    for (const face of Object.keys(targets)) {
      for (let i = 0; i < targets[face].length; i++) {
        total++;
        if (current[face][i] === targets[face][i]) matches++;
      }
    }
    return { matches, total, complete: total > 0 && matches === total };
  }

  function scrambleForStage(stageIndex, seed = DEFAULT_SEED) {
    if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= STAGE_LENGTHS.length) return null;
    const stage = STAGES[stageIndex], targets = stageTargets(stageIndex);
    for (let attempt = 0; attempt < 100; attempt++) {
      const rng = makeRng(`${String(seed)}:stage:${stageIndex + 1}:start:${attempt}`);
      const moves = [];
      while (moves.length < stage.startLength) {
        const face = FACES[Math.floor(rng() * FACES.length)];
        if (moves.length && moves[moves.length - 1].face === face) continue;
        moves.push({ face, turns: rng() < 0.5 ? 1 : -1 });
      }
      const start = applySequence(createSolvedCube(), moves);
      if (!targetProgress(start, targets).complete) return moves.map(move => ({ ...move }));
    }
    throw new Error(`Could not make a distinct seeded motif start for stage ${stage.id}.`);
  }

  function formatMove(move) {
    const parsed = parseMove(move);
    if (!parsed) return '';
    return `${parsed.face}${parsed.turns === -1 ? "'" : parsed.turns === 2 ? '2' : ''}`;
  }

  function create(options = {}) {
    const seed = options.seed ?? DEFAULT_SEED;
    const seedKey = String(seed);
    const campaignTimeMs = Number.isFinite(options.campaignTimeMs) && options.campaignTimeMs > 0
      ? options.campaignTimeMs : CAMPAIGN_TIME_MS;
    const scrambles = STAGE_LENGTHS.map((_, index) => scrambleForStage(index, seed));
    let cube, stageIndex, stageMoves, totalMoves, timeLeft, status, lastEvent, lastMove;

    function loadStage(index) {
      stageIndex = index;
      stageMoves = 0;
      cube = applySequence(createSolvedCube(), scrambles[index]);
      lastMove = null;
    }

    function reset() {
      totalMoves = 0;
      timeLeft = campaignTimeMs;
      status = 'playing';
      lastEvent = 'start';
      loadStage(0);
    }

    function view() {
      const targets = stageTargets(stageIndex);
      const progress = targetProgress(cube, targets);
      return {
        status, stage: stageIndex + 1, stageIndex, stageCount: STAGES.length,
        stageName: STAGES[stageIndex].name, targetFaces: STAGES[stageIndex].targetFaces.slice(),
        targets, matches: progress.matches, targetStickerCount: progress.total, goalReached: progress.complete,
        moveBudget: STAGES[stageIndex].moveBudget, stageMoves, totalMoves, timeLeft, campaignTimeMs, lastEvent,
        lastMove: lastMove && { ...lastMove },
        faces: facelets(cube), seed: seedKey, scrambleLength: STAGE_LENGTHS[stageIndex]
      };
    }

    reset();

    return Object.freeze({
      view,
      turn(face, turns = 1) {
        if (status !== 'playing') return { accepted: false, status };
        const parsed = parseMove({ face, turns });
        if (!parsed) return { accepted: false, status };
        cube = applyMove(cube, parsed);
        stageMoves++;
        totalMoves++;
        lastMove = { ...parsed };
        if (targetProgress(cube, stageTargets(stageIndex)).complete) {
          if (stageIndex + 1 === STAGES.length) {
            status = 'won';
            lastEvent = 'win';
            return { accepted: true, advanced: false, status, stage: stageIndex + 1 };
          }
          const previousStage = stageIndex + 1;
          loadStage(stageIndex + 1);
          lastEvent = 'stage';
          return { accepted: true, advanced: true, status, stage: stageIndex + 1, previousStage };
        }
        if (stageMoves >= STAGES[stageIndex].moveBudget) {
          status = 'lost';
          lastEvent = 'moves';
          return { accepted: true, advanced: false, status, stage: stageIndex + 1 };
        }
        lastEvent = 'turn';
        return { accepted: true, advanced: false, status, stage: stageIndex + 1 };
      },
      advance(deltaMs) {
        if (status !== 'playing' || !Number.isFinite(deltaMs) || deltaMs <= 0) return false;
        timeLeft = Math.max(0, timeLeft - deltaMs);
        if (timeLeft === 0) { status = 'lost'; lastEvent = 'timeout'; }
        return true;
      },
      pause() {
        if (status !== 'playing') return false;
        status = 'paused'; lastEvent = 'pause'; return true;
      },
      resume() {
        if (status !== 'paused') return false;
        status = 'playing'; lastEvent = 'resume'; return true;
      },
      restart() { reset(); return true; },
      scramble(index = stageIndex) { return scrambles[index] ? scrambles[index].map(move => ({ ...move })) : null; }
    });
  }

  return Object.freeze({
    FACES, FACE_NAMES, COLORS, STAGES, STAGE_LENGTHS, CAMPAIGN_TIME_MS, DEFAULT_SEED,
    createSolvedCube, applyMove, applySequence, facelets, isSolved, stageTargets, targetProgress,
    scrambleForStage, formatMove, create
  });
});

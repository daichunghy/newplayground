/* Original classic box-pushing puzzles. Layouts and rules are documented in the candidate dossier. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_DayThungSokobanModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    right: Object.freeze({ x: 1, y: 0 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 })
  });

  // These compact layouts were authored for this candidate; no legacy maps are reused.
  const LEVELS = Object.freeze([
    Object.freeze({
      name: 'Lối đi thông thoáng',
      map: Object.freeze([
        '########',
        '#      #',
        '# .  $ #',
        '#   @  #',
        '########'
      ])
    }),
    Object.freeze({
      name: 'Hai kiện hàng',
      map: Object.freeze([
        '########',
        '#      #',
        '# . .  #',
        '# $$   #',
        '#  @   #',
        '########'
      ])
    }),
    Object.freeze({
      name: 'Rẽ qua góc kho',
      map: Object.freeze([
        '########',
        '#   .  #',
        '# $    #',
        '#      #',
        '# @    #',
        '########'
      ])
    }),
    Object.freeze({
      name: 'Kho hai ngõ',
      map: Object.freeze([
        '#########',
        '#.    . #',
        '# @ $   #',
        '#    $# #',
        '#  #    #',
        '#       #',
        '#########'
      ])
    }),
    Object.freeze({
      name: 'Lối rẽ hẹp',
      map: Object.freeze([
        '#########',
        '#.    # #',
        '#    $ ##',
        '#   @.  #',
        '# # $   #',
        '#    #  #',
        '#########'
      ])
    }),
    Object.freeze({
      name: 'Chuyến hàng cuối',
      map: Object.freeze([
        '#########',
        '#    @  #',
        '#   ##$ #',
        '#.      #',
        '#   $  .#',
        '# $    .#',
        '#########'
      ])
    })
  ]);

  const clone = value => JSON.parse(JSON.stringify(value));
  const key = point => `${point.x},${point.y}`;
  const HISTORY_LIMIT = 1000;

  function freshProgress() {
    return { unlockedLevel: 0, bestMoves: Array(LEVELS.length).fill(null) };
  }

  function validProgress(progress) {
    return progress && Number.isSafeInteger(progress.unlockedLevel) && progress.unlockedLevel >= 0 && progress.unlockedLevel < LEVELS.length &&
      Array.isArray(progress.bestMoves) && progress.bestMoves.length === LEVELS.length &&
      progress.bestMoves.every(moves => moves === null || Number.isSafeInteger(moves) && moves >= 0);
  }

  function parseLevel(index) {
    const source = LEVELS[index];
    const height = source.map.length;
    const width = source.map[0].length;
    if (!source.map.every(row => row.length === width)) throw new Error(`Level ${index + 1} is not rectangular`);

    const walls = new Set(), goals = [], boxes = [];
    let player = null;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const cell = source.map[y][x];
        if (cell === '#') walls.add(key({ x, y }));
        else if (cell === '.' || cell === '*' || cell === '+') goals.push({ x, y });
        if (cell === '$' || cell === '*') boxes.push({ x, y });
        if (cell === '@' || cell === '+') {
          if (player) throw new Error(`Level ${index + 1} has more than one player`);
          player = { x, y };
        }
      }
    }
    if (!player || boxes.length !== goals.length || boxes.length === 0) {
      throw new Error(`Level ${index + 1} needs one player and matching boxes and goals`);
    }
    return { name: source.name, width, height, walls: [...walls], goals, boxes, player };
  }

  function create(levelIndex = 0, savedProgress = null) {
    let selectedLevel = Number.isInteger(levelIndex) && levelIndex >= 0 && levelIndex < LEVELS.length ? levelIndex : 0;
    let initial = parseLevel(selectedLevel);
    const progress = validProgress(savedProgress) ? clone(savedProgress) : freshProgress();
    let state;
    let history = [];

    function freshState() {
      return {
        levelIndex: selectedLevel,
        levelName: initial.name,
        width: initial.width,
        height: initial.height,
        walls: [...initial.walls],
        goals: clone(initial.goals),
        boxes: clone(initial.boxes),
        player: clone(initial.player),
        moves: 0,
        pushes: 0,
        status: 'playing'
      };
    }

    state = freshState();

    function isWall(x, y) {
      return x < 0 || x >= state.width || y < 0 || y >= state.height || state.walls.includes(`${x},${y}`);
    }

    function isBoxAt(x, y) {
      return state.boxes.findIndex(box => box.x === x && box.y === y);
    }

    function checkWin() {
      const boxes = new Set(state.boxes.map(key));
      return state.goals.every(goal => boxes.has(key(goal)));
    }

    function move(direction) {
      const delta = DIRECTIONS[direction];
      if (state.status !== 'playing' || !delta) return false;
      const next = { x: state.player.x + delta.x, y: state.player.y + delta.y };
      if (isWall(next.x, next.y)) return false;

      const boxIndex = isBoxAt(next.x, next.y);
      let pushed = false;
      if (boxIndex !== -1) {
        const beyond = { x: next.x + delta.x, y: next.y + delta.y };
        if (isWall(beyond.x, beyond.y) || isBoxAt(beyond.x, beyond.y) !== -1) return false;
        pushed = true;
      }

      history.push(clone(state));
      if (pushed) {
        state.boxes[boxIndex] = { x: next.x + delta.x, y: next.y + delta.y };
        state.pushes += 1;
      }
      state.player = next;
      state.moves += 1;
      if (checkWin()) {
        state.status = 'won';
        progress.unlockedLevel = Math.max(progress.unlockedLevel, Math.min(selectedLevel + 1, LEVELS.length - 1));
        const currentBest = progress.bestMoves[selectedLevel];
        if (currentBest === null || state.moves < currentBest) progress.bestMoves[selectedLevel] = state.moves;
      }
      if (history.length > HISTORY_LIMIT) history.shift();
      return true;
    }

    function undo() {
      if (!history.length) return false;
      state = history.pop();
      return true;
    }

    function reset() {
      state = freshState();
      history = [];
      return view();
    }

    function selectLevel(index) {
      if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length || index > progress.unlockedLevel) return false;
      selectedLevel = index;
      initial = parseLevel(selectedLevel);
      state = freshState();
      history = [];
      return true;
    }

    function nextLevel() {
      if (state.status !== 'won' || selectedLevel + 1 >= LEVELS.length) return false;
      return selectLevel(selectedLevel + 1);
    }

    function view() { return clone({ ...state, unlockedLevel: progress.unlockedLevel, bestMoves: progress.bestMoves }); }

    function serialize() {
      return clone({ version: 2, levelIndex: selectedLevel, progress, state, history });
    }

    function restoreSnapshot(snapshot) {
      if (!snapshot || !validState(snapshot.state, selectedLevel) || !Array.isArray(snapshot.history) || snapshot.history.length > HISTORY_LIMIT ||
        snapshot.history.some(entry => !validState(entry, selectedLevel) || entry.status !== 'playing')) return false;
      state = clone(snapshot.state); history = clone(snapshot.history);
      return true;
    }

    return { move, undo, reset, selectLevel, nextLevel, view, serialize, _restore: restoreSnapshot };
  }

  function validState(state, levelIndex) {
    if (!state || state.levelIndex !== levelIndex || state.status !== 'playing' && state.status !== 'won') return false;
    const source = parseLevel(levelIndex), walls = new Set(source.walls), boxKeys = new Set();
    if (state.levelName !== source.name || state.width !== source.width || state.height !== source.height ||
      JSON.stringify(state.walls) !== JSON.stringify(source.walls) || JSON.stringify(state.goals) !== JSON.stringify(source.goals) ||
      !Number.isSafeInteger(state.moves) || state.moves < 0 || !Number.isSafeInteger(state.pushes) || state.pushes < 0 || state.pushes > state.moves ||
      !Array.isArray(state.boxes) || state.boxes.length !== source.boxes.length || !state.player || !Number.isSafeInteger(state.player.x) || !Number.isSafeInteger(state.player.y)) return false;
    for (const box of state.boxes) {
      if (!box || !Number.isSafeInteger(box.x) || !Number.isSafeInteger(box.y)) return false;
      const boxKey = key(box);
      if (box.x < 0 || box.x >= source.width || box.y < 0 || box.y >= source.height || walls.has(boxKey) || boxKeys.has(boxKey)) return false;
      boxKeys.add(boxKey);
    }
    const playerKey = key(state.player);
    if (state.player.x < 0 || state.player.x >= source.width || state.player.y < 0 || state.player.y >= source.height || walls.has(playerKey) || boxKeys.has(playerKey)) return false;
    const won = source.goals.every(goal => boxKeys.has(key(goal)));
    return (state.status === 'won') === won;
  }

  function validTransition(before, after) {
    if (!before || !after || before.levelIndex !== after.levelIndex || before.status !== 'playing' ||
      after.moves !== before.moves + 1) return false;
    const dx = after.player.x - before.player.x, dy = after.player.y - before.player.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const source = parseLevel(before.levelIndex), walls = new Set(source.walls);
    const target = key(after.player), box = before.boxes.find(point => key(point) === target);
    let expected = new Set(before.boxes.map(key));
    if (walls.has(target)) return false;
    if (box) {
      const destination = { x: after.player.x + dx, y: after.player.y + dy }, destinationKey = key(destination);
      if (walls.has(destinationKey) || expected.has(destinationKey)) return false;
      expected.delete(target); expected.add(destinationKey);
    }
    const actual = new Set(after.boxes.map(key));
    return after.pushes === before.pushes + (box ? 1 : 0) && expected.size === actual.size && [...expected].every(k => actual.has(k));
  }

  function restore(raw) {
    if (!raw || raw.version !== 2 || !Number.isSafeInteger(raw.levelIndex) || raw.levelIndex < 0 || raw.levelIndex >= LEVELS.length ||
      !validProgress(raw.progress) || raw.levelIndex > raw.progress.unlockedLevel || !validState(raw.state, raw.levelIndex) ||
      !Array.isArray(raw.history) || raw.history.length !== Math.min(raw.state.moves, HISTORY_LIMIT) ||
      raw.history.some(entry => !validState(entry, raw.levelIndex) || entry.status !== 'playing') ||
      raw.history.some((entry, index) => index > 0 && !validTransition(raw.history[index - 1], entry)) ||
      raw.history.length > 0 && !validTransition(raw.history[raw.history.length - 1], raw.state)) return null;
    const model = create(raw.levelIndex, raw.progress);
    return model._restore(raw) ? model : null;
  }

  return { DIRECTIONS, LEVELS, HISTORY_LIMIT, create, restore, validProgress };
});

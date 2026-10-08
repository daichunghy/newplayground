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
    })
  ]);

  const clone = value => JSON.parse(JSON.stringify(value));
  const key = point => `${point.x},${point.y}`;

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

  function create(levelIndex = 0) {
    let selectedLevel = Number.isInteger(levelIndex) && levelIndex >= 0 && levelIndex < LEVELS.length ? levelIndex : 0;
    let initial = parseLevel(selectedLevel);
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
      if (checkWin()) state.status = 'won';
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
      if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) return false;
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

    function view() { return clone(state); }

    return { move, undo, reset, selectLevel, nextLevel, view };
  }

  return { DIRECTIONS, LEVELS, create };
});

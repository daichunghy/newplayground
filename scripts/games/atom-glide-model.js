/* Rules for the original Vietnamese-titled, four-stage H2O sliding puzzle. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_AtomGlideModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WIDTH = 6, HEIGHT = 6;
  const ATOMS = Object.freeze(['h1', 'h2', 'o']);
  const DIRECTIONS = Object.freeze({
    up: Object.freeze([0, -1]), right: Object.freeze([1, 0]),
    down: Object.freeze([0, 1]), left: Object.freeze([-1, 0])
  });
  const GOAL = Object.freeze({ h1: Object.freeze([2, 3]), h2: Object.freeze([3, 2]), o: Object.freeze([3, 3]) });
  // Each start has a BFS-verified, 6/8/10/12-move solution on its authored wall layout.
  const LEVELS = Object.freeze([
    Object.freeze({ walls: Object.freeze([[1, 1], [4, 1], [4, 2], [4, 3], [2, 4], [3, 4], [4, 4]].map(Object.freeze)), start: Object.freeze({ h1: Object.freeze([3, 0]), h2: Object.freeze([4, 5]), o: Object.freeze([0, 2]) }) }),
    Object.freeze({ walls: Object.freeze([[1, 1], [4, 2], [2, 4], [3, 4], [4, 4]].map(Object.freeze)), start: Object.freeze({ h1: Object.freeze([5, 5]), h2: Object.freeze([4, 1]), o: Object.freeze([5, 1]) }) }),
    Object.freeze({ walls: Object.freeze([[1, 1], [2, 1], [3, 1], [4, 1], [2, 2], [3, 4], [4, 4]].map(Object.freeze)), start: Object.freeze({ h1: Object.freeze([1, 3]), h2: Object.freeze([0, 0]), o: Object.freeze([0, 3]) }) }),
    Object.freeze({ walls: Object.freeze([[3, 1], [2, 2], [4, 3], [1, 4], [2, 4], [4, 4]].map(Object.freeze)), start: Object.freeze({ h1: Object.freeze([4, 1]), h2: Object.freeze([0, 4]), o: Object.freeze([5, 4]) }) })
  ]);

  const sameCell = (a, b) => a[0] === b[0] && a[1] === b[1];
  const copyAtoms = atoms => Object.fromEntries(ATOMS.map(id => [id, atoms[id].slice()]));
  const copyWalls = walls => walls.map(cell => cell.slice());
  const PUBLIC_GOAL = Object.freeze(Object.fromEntries(ATOMS.map(id => [id, Object.freeze(GOAL[id].slice())])));

  function create() {
    let state, undoStack;

    function isGoal(atoms) {
      return sameCell(atoms.o, GOAL.o)
        && ((sameCell(atoms.h1, GOAL.h1) && sameCell(atoms.h2, GOAL.h2))
          || (sameCell(atoms.h1, GOAL.h2) && sameCell(atoms.h2, GOAL.h1)));
    }

    function reset(index = 0) {
      const level = LEVELS[index];
      state = { status: 'playing', level: index, atoms: copyAtoms(level.start), selected: null, moves: 0, lastEvent: 'start' };
      undoStack = [];
    }

    function view() {
      const level = LEVELS[state.level];
      return {
        status: state.status, level: state.level, levelNumber: state.level + 1, levelCount: LEVELS.length,
        width: WIDTH, height: HEIGHT, walls: copyWalls(level.walls), atoms: copyAtoms(state.atoms),
        goal: copyAtoms(GOAL), selected: state.selected, moves: state.moves, canUndo: undoStack.length > 0,
        lastEvent: state.lastEvent
      };
    }

    reset();
    return Object.freeze({
      view,
      select(atom) {
        if (state.status !== 'playing' || !ATOMS.includes(atom)) return { accepted: false, selected: state.selected, status: state.status };
        state.selected = atom;
        state.lastEvent = 'selected';
        return { accepted: true, selected: atom, status: state.status };
      },
      move(direction) {
        if (state.status !== 'playing' || !state.selected || !Object.prototype.hasOwnProperty.call(DIRECTIONS, direction)) {
          return { accepted: false, moved: false, status: state.status };
        }
        const [dx, dy] = DIRECTIONS[direction], atom = state.atoms[state.selected], level = LEVELS[state.level];
        let [x, y] = atom;
        while (true) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT
            || level.walls.some(cell => cell[0] === nx && cell[1] === ny)
            || ATOMS.some(id => id !== state.selected && state.atoms[id][0] === nx && state.atoms[id][1] === ny)) break;
          x = nx; y = ny;
        }
        if (x === atom[0] && y === atom[1]) {
          state.lastEvent = 'blocked';
          return { accepted: true, moved: false, status: state.status, moves: state.moves };
        }
        undoStack.push({ atoms: copyAtoms(state.atoms), selected: state.selected, moves: state.moves });
        state.atoms[state.selected] = [x, y];
        state.moves++;
        state.lastEvent = 'slide';
        if (isGoal(state.atoms)) { state.status = 'won'; state.lastEvent = 'molecule-complete'; }
        return { accepted: true, moved: true, status: state.status, moves: state.moves };
      },
      undo() {
        if (state.status !== 'playing' || undoStack.length === 0) return false;
        const previous = undoStack.pop();
        state.atoms = previous.atoms; state.selected = previous.selected; state.moves = previous.moves; state.lastEvent = 'undo';
        return true;
      },
      pause() { if (state.status !== 'playing') return false; state.status = 'paused'; state.lastEvent = 'paused'; return true; },
      resume() { if (state.status !== 'paused') return false; state.status = 'playing'; state.lastEvent = 'resume'; return true; },
      restart() { reset(state.level); return true; },
      nextLevel() {
        if (state.status !== 'won' || state.level >= LEVELS.length - 1) return false;
        reset(state.level + 1); return true;
      },
      newGame() { reset(); return true; }
    });
  }

  return Object.freeze({ WIDTH, HEIGHT, ATOMS, DIRECTIONS, GOAL: PUBLIC_GOAL, LEVELS, create });
});

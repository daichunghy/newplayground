const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/atom-glide-model.js');

const SOLUTIONS = [
  [['h2', 'left'], ['h2', 'up'], ['o', 'right'], ['o', 'down'], ['h1', 'down'], ['h2', 'right']],
  [['h2', 'left'], ['o', 'left'], ['h1', 'up'], ['h2', 'up'], ['h1', 'left'], ['h2', 'down'], ['o', 'down'], ['h1', 'down']],
  [['h1', 'right'], ['h2', 'right'], ['h2', 'down'], ['o', 'right'], ['o', 'up'], ['h1', 'left'], ['o', 'left'], ['o', 'down'], ['h1', 'right'], ['h2', 'left']],
  [['h1', 'down'], ['h1', 'left'], ['h2', 'up'], ['o', 'up'], ['o', 'left'], ['o', 'down'], ['o', 'left'], ['h2', 'down'], ['h2', 'right'], ['o', 'right'], ['h2', 'down'], ['h2', 'right']]
];

function solveCurrent(model, levelIndex) {
  for (const [atom, direction] of SOLUTIONS[levelIndex]) {
    assert.equal(model.select(atom).accepted, true);
    assert.equal(model.move(direction).moved, true, `level ${levelIndex + 1}: ${atom} ${direction}`);
  }
  assert.equal(model.view().status, 'won');
  assert.equal(model.view().moves, SOLUTIONS[levelIndex].length);
}

test('four authored H2O boards have valid, tested 6/8/10/12-move witness solutions', () => {
  const model = M.create();
  for (let level = 0; level < SOLUTIONS.length; level++) {
    const view = model.view();
    assert.equal(view.level, level);
    assert.equal(view.width, 6); assert.equal(view.height, 6);
    const points = M.ATOMS.map(id => view.atoms[id]);
    assert.equal(new Set(points.map(p => `${p[0]},${p[1]}`)).size, 3, 'all atoms start in separate cells');
    assert.equal(points.every(p => view.walls.every(w => w[0] !== p[0] || w[1] !== p[1])), true, 'no atom starts in a wall');
    assert.deepEqual(view.goal, { h1: [2, 3], h2: [3, 2], o: [3, 3] });
    solveCurrent(model, level);
    if (level < SOLUTIONS.length - 1) assert.equal(model.nextLevel(), true);
  }
  assert.equal(model.nextLevel(), false);
  assert.equal(model.view().status, 'won');
  model.newGame();
  assert.deepEqual(model.view().atoms, M.LEVELS[0].start);
});

test('each direction slides to the last free cell and treats both walls and other atoms as blockers', () => {
  const model = M.create();
  model.select('h2');
  let move = model.move('left');
  assert.equal(move.moved, true);
  assert.deepEqual(model.view().atoms.h2, [0, 5], 'slides to edge');
  model.select('h2'); model.move('up');
  model.select('o'); model.move('right'); model.move('down');
  assert.deepEqual(model.view().atoms.o, [3, 3], 'stops before the stone wall');
  model.select('h1'); move = model.move('down');
  assert.equal(move.moved, true);
  assert.deepEqual(model.view().atoms.h1, [3, 2], 'stops one cell before oxygen');
  const before = model.view();
  move = model.move('down');
  assert.equal(move.moved, false);
  assert.equal(model.view().moves, before.moves, 'blocked input is not counted as a move');
});

test('invalid choices, blocked starts, undo and restart leave a clean recoverable board', () => {
  const model = M.create();
  assert.equal(model.move('up').accepted, false, 'direction requires a selected atom');
  assert.equal(model.select('carbon').accepted, false, 'only the two H and O atoms exist');
  assert.equal(model.move('teleport').accepted, false);
  model.select('h1');
  assert.equal(model.move('up').moved, false, 'a boundary can block an atom without corrupting it');
  assert.equal(model.view().moves, 0);
  model.move('right');
  const displaced = model.view().atoms.h1;
  assert.equal(model.undo(), true);
  assert.deepEqual(model.view().atoms.h1, [3, 0]);
  assert.equal(model.view().moves, 0);
  assert.notDeepEqual(displaced, model.view().atoms.h1);
  model.move('right'); model.move('down');
  assert.equal(model.view().moves, 2);
  assert.equal(model.restart(), true);
  assert.equal(model.view().moves, 0);
  assert.deepEqual(model.view().atoms, M.LEVELS[0].start);
  assert.equal(model.view().canUndo, false);
});

test('pause freezes the logic and terminal cells require a fresh stage or campaign', () => {
  const model = M.create();
  assert.equal(model.pause(), true);
  const paused = model.view();
  assert.equal(model.select('h1').accepted, false);
  assert.equal(model.move('right').accepted, false);
  assert.deepEqual(model.view(), paused);
  assert.equal(model.resume(), true);
  solveCurrent(model, 0);
  const terminal = model.view();
  assert.equal(model.move('left').accepted, false);
  assert.deepEqual(model.view(), terminal);
  assert.equal(model.restart(), true);
  assert.equal(model.view().status, 'playing');
});


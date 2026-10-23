const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read, drawing } = require('./helpers/game-harness.cjs');

function load(setup) {
  const h = harness({ loadEngines: false, loadApp: false });
  if (setup) setup(h);
  vm.runInContext(read('scripts/fidelity-casual.js'), h.context, { filename: 'scripts/fidelity-casual.js' });
  return h;
}
const plain = value => JSON.parse(JSON.stringify(value));
function seedRandom(h, seed = 1) {
  h.context.__casualSeed = seed;
  vm.runInContext('Math.random = () => ((globalThis.__casualSeed = (globalThis.__casualSeed * 1664525 + 1013904223) >>> 0) / 4294967296);', h.context);
}

test('all ten casual games register exact IDs with playable lifecycle controls', () => {
  const h = load();
  const ids = ['simon-memory', 'hangman-words', 'word-search-grid', 'wordle-five', 'threes-tiles',
    'tic-tac-toe-3d', 'ultimate-tic-tac-toe', 'set-card-triples', 'peg-solitaire-cross', 'rush-hour-sliding'];
  assert.deepEqual([...h.context.NP_Fidelity.entries()].map(item => item.id), ids);
  for (const id of ids) {
    h.context.NP_Fidelity.launch(h.container, { id, title: id });
    assert.ok(h.container.querySelectorAll('button').length > 0, `${id} exposes touch buttons`);
    h.frame();
    const session = h.window.NP_GameSession.getCurrent();
    session.pause(); session.resume(); session.stop();
    assert.equal(h.frames.size, 0, `${id} stops its frame loop`);
    h.container.replaceChildren();
  }
  assert.equal(h.errors.length, 0);
});

test('Simon gates input to playback, appends after a completed round, and ends on an error', () => {
  const m = load().context.NP_Fidelity.get('simon-memory').model;
  const game = m.create([2, 0]);
  assert.equal(m.press(game, 2).accepted, false);
  m.beginInput(game);
  assert.equal(m.press(game, 2).accepted, true);
  assert.equal(m.press(game, 0).roundComplete, true);
  assert.deepEqual(plain(game.sequence.slice(0, 2)), [2, 0]);
  assert.equal(game.sequence.length, 3);
  m.beginInput(game);
  assert.equal(m.press(game, 1).result, 'wrong');
});

test('Hangman repeated letters do not add misses and the answer stays covered until terminal', () => {
  const m = load().context.NP_Fidelity.get('hangman-words').model;
  const game = m.create('apple');
  assert.equal(m.view(game), '_ _ _ _ _');
  assert.equal(m.view(m.create('ice cream')).includes('   '), true, 'spaces are exposed in the mask');
  assert.equal(m.guess(game, 'z').misses, 1);
  assert.equal(m.guess(game, 'z').repeated, true);
  assert.equal(game.misses, 1);
  for (const letter of 'aple') m.guess(game, letter);
  assert.equal(game.result, 'won');
});

test('word-search placements fit without conflicting letters and reverse straight selections work', () => {
  const m = load().context.NP_Fidelity.get('word-search-grid').model;
  const game = m.create(2345);
  assert.equal(game.grid.length, 10);
  for (const word of game.words) {
    const p = game.placements[word];
    assert.equal(p.cells.map(([r, c]) => game.grid[r][c]).join(''), word);
    assert.equal(m.select(game, p.cells.at(-1), p.cells[0]).word, word);
  }
  assert.equal(m.select(game, [0, 0], [1, 2]).valid, false);
});

test('Wordle duplicate letters are allocated after greens and invalid guesses do not consume a try', () => {
  const m = load().context.NP_Fidelity.get('wordle-five').model;
  const game = m.create('allee');
  assert.equal(m.submit(game, 'zzzzz').valid, false);
  assert.equal(game.guesses.length, 0);
  assert.deepEqual(plain(m.evaluate('allee', 'eagle')), ['yellow', 'yellow', 'gray', 'yellow', 'green']);
});

test('Threes moves tiles one cell only, merges once, and scores rank values', () => {
  const m = load().context.NP_Fidelity.get('threes-tiles').model;
  const game = m.create(() => 0.01);
  game.board = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  m.move(game, 'left');
  assert.equal(game.board[0], 3);
  assert.equal(game.board[1], 0);
  game.board = [1, 2, 0, 0, ...Array(12).fill(0)];
  m.move(game, 'left');
  assert.equal(game.board[0], 3);
  assert.equal(game.score, 3);
  assert.equal(m.tileScore(12), 27);
});

test('3D tic-tac-toe enumerates 49 winning lines and rejects occupied/terminal cells', () => {
  const m = load().context.NP_Fidelity.get('tic-tac-toe-3d').model;
  assert.equal(m.winningLines.length, 49);
  const game = m.create();
  assert.equal(m.play(game, 0).valid, true);
  assert.equal(m.play(game, 0).valid, false);
  for (const cell of [1, 13, 2, 26]) m.play(game, cell);
  assert.equal(game.result, 'X');
  assert.equal(m.play(game, 2).valid, false);
});

test('Ultimate Tic-Tac-Toe forces the target board unless it is closed', () => {
  const m = load().context.NP_Fidelity.get('ultimate-tic-tac-toe').model;
  const game = m.create();
  assert.equal(m.play(game, 0, 4).valid, true);
  assert.equal(game.forcedBoard, 4);
  assert.equal(m.play(game, 0, 0).valid, false);
  game.boards[4] = ['X', 'X', 'X', null, null, null, null, null, null];
  game.closed[4] = 'X'; game.forcedBoard = 4; game.turn = 'O';
  assert.equal(m.play(game, 8, 8).valid, true, 'closed destination releases the choice');
});

test('SET uses all 81 distinct feature combinations and checks all-same/all-different per feature', () => {
  const m = load().context.NP_Fidelity.get('set-card-triples').model;
  assert.equal(m.deck().length, 81);
  assert.equal(new Set(m.deck().map(card => card.join(','))).size, 81);
  assert.equal(m.isSet([[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2]]), true);
  assert.equal(m.isSet([[0, 0, 0, 0], [0, 1, 1, 1], [1, 2, 2, 2]]), false);
});

test('SET renderer draws solid, clipped stripe, and true open shape treatments with readable feature labels', () => {
  const h = load(seedRandom);
  const model = h.context.NP_Fidelity.get('set-card-triples').model;
  const hand = model.create();
  assert.deepEqual([...new Set(hand.table.map(card => card[2]))].sort(), [0, 1, 2]);
  seedRandom(h);

  const operations = [];
  const methods = ['ellipse', 'bezierCurveTo', 'clip', 'save', 'restore', 'fill', 'stroke', 'fillText', 'moveTo', 'lineTo'];
  for (const method of methods) drawing[method] = (...args) => {
    operations.push({ method, args, fillStyle: drawing.fillStyle, strokeStyle: drawing.strokeStyle });
  };
  try {
    h.context.NP_Fidelity.launch(h.container, { id: 'set-card-triples', title: 'SET' });
    h.frame();
  } finally {
    h.window.NP_GameSession.stop();
    methods.forEach(method => { delete drawing[method]; });
  }
  assert.ok(operations.some(op => op.method === 'ellipse'), 'oval cards use a drawn oval path');
  assert.ok(operations.some(op => op.method === 'bezierCurveTo'), 'squiggles use a drawn curved path');
  assert.ok(operations.some(op => op.method === 'clip'), 'striped symbols clip strokes to their own silhouettes');
  assert.ok(operations.some(op => op.method === 'stroke' && op.fillStyle === '#ffffff' && ['#b32636', '#16743b', '#5937a6'].includes(op.strokeStyle)),
    'open symbols have white interiors and colored symbol outlines');
  const labels = operations.filter(op => op.method === 'fillText').map(op => String(op.args[0])).join(' ');
  assert.match(labels, /oval|diamond|squiggle/);
  assert.match(labels, /solid/);
  assert.match(labels, /striped/);
  assert.match(labels, /open/);
  assert.match(labels, /red|green|purple/);
});

test('English cross has exactly 33 holes; peg jumps are orthogonal and undoable', () => {
  const m = load().context.NP_Fidelity.get('peg-solitaire-cross').model;
  const game = m.create();
  assert.equal(game.holes.length, 33);
  assert.equal(game.pegs.size, 32);
  assert.equal(m.move(game, [3, 1], [3, 3]).valid, true);
  assert.equal(game.pegs.size, 31);
  assert.equal(m.move(game, [1, 3], [3, 3]).valid, false);
  assert.equal(m.undo(game), true);
  assert.equal(game.pegs.size, 32);
});

test('Rush Hour rejects overlap and verifies every authored board reaches the right-edge exit', () => {
  const m = load().context.NP_Fidelity.get('rush-hour-sliding').model;
  assert.equal(m.boards.length >= 3, true);
  for (const board of m.boards) assert.equal(m.solve(board), true);
  const game = m.create(0);
  const car = game.cars.find(item => item.id === 'red');
  assert.equal(m.move(game, 'red', 1).valid, false, 'blocker cannot be passed through');
  assert.equal(m.move(game, car.id, -1).valid, false, 'red car cannot reverse off board');
  assert.equal(m.move(game, 'red', 1).valid, false);
});

test('visible keyboard, pointer and restart controls call the live game models', () => {
  const h = load();
  const buttons = () => h.container.querySelectorAll('button');
  const click = label => {
    const button = buttons().find(item => item.textContent === label);
    assert.ok(button, `visible ${label} control exists`);
    button.dispatch('click');
  };
  h.context.NP_Fidelity.launch(h.container, { id: 'hangman-words', title: 'Hangman' });
  click('A');
  h.container.querySelector('canvas').dispatch('keydown', { key: 'b' });
  h.frame();
  assert.notEqual(h.container.querySelector('.np-fidelity-status').textContent, 'Ready');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  h.context.NP_Fidelity.launch(h.container, { id: 'word-search-grid', title: 'Search' });
  const canvas = h.container.querySelector('canvas');
  canvas.dispatch('pointerdown', { clientX: 50, clientY: 65 });
  canvas.dispatch('pointerup', { clientX: 50, clientY: 65 });
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'Start selected · drag or tap an end');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  h.context.NP_Fidelity.launch(h.container, { id: 'wordle-five', title: 'Wordle' });
  for (const letter of 'zzzzz') click('Z');
  click('Enter');
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'Not in the local word list');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  h.context.NP_Fidelity.launch(h.container, { id: 'simon-memory', title: 'Simon' });
  const session = h.window.NP_GameSession.getCurrent();
  assert.ok(h.timers.size > 0, 'Simon playback owns its timers');
  session.pause();
  assert.equal(h.timers.size, 0, 'pause suspends native timer callbacks');
  session.resume();
  assert.ok(h.timers.size > 0, 'resume restores remaining playback timers');
  click('Play sequence');
  assert.ok(h.timers.size > 0, 'replay cancels and replaces prior playback sequence');
  session.stop();
  h.container.replaceChildren();

  seedRandom(h);
  h.context.NP_Fidelity.launch(h.container, { id: 'threes-tiles', title: 'Threes' });
  click('Slide left');
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'Score 0');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  h.context.NP_Fidelity.launch(h.container, { id: 'tic-tac-toe-3d', title: '3D Tic-Tac-Toe' });
  h.container.querySelector('canvas').dispatch('pointerdown', { clientX: 145, clientY: 85 });
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'O to move');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  h.context.NP_Fidelity.launch(h.container, { id: 'ultimate-tic-tac-toe', title: 'Ultimate Tic-Tac-Toe' });
  const ultimate = h.container.querySelector('canvas');
  ultimate.dispatch('pointerdown', { clientX: 64, clientY: 61 });
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'O: board 1');
  ultimate.dispatch('pointerdown', { clientX: 122, clientY: 61 });
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'X: board 2');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  seedRandom(h);
  const setModel = h.context.NP_Fidelity.get('set-card-triples').model;
  const predictedHand = setModel.create();
  let setIndices = null;
  for (let a = 0; a < predictedHand.table.length && !setIndices; a++) {
    for (let b = a + 1; b < predictedHand.table.length && !setIndices; b++) {
      for (let c = b + 1; c < predictedHand.table.length; c++) {
        if (setModel.isSet([predictedHand.table[a], predictedHand.table[b], predictedHand.table[c]])) { setIndices = [a, b, c]; break; }
      }
    }
  }
  assert.ok(setIndices, 'deterministic opening hand contains a selectable SET');
  seedRandom(h);
  h.context.NP_Fidelity.launch(h.container, { id: 'set-card-triples', title: 'SET' });
  const setCanvas = h.container.querySelector('canvas');
  for (const index of setIndices) {
    setCanvas.dispatch('pointerdown', { clientX: 88 + (index % 4) * 148, clientY: 92 + Math.floor(index / 4) * 112 });
  }
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'SET found!');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  h.context.NP_Fidelity.launch(h.container, { id: 'peg-solitaire-cross', title: 'Peg Solitaire' });
  const pegCanvas = h.container.querySelector('canvas');
  pegCanvas.dispatch('pointerdown', { clientX: 188, clientY: 218 });
  pegCanvas.dispatch('pointerdown', { clientX: 284, clientY: 218 });
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'Jump complete');
  h.window.NP_GameSession.stop(); h.container.replaceChildren();

  h.context.NP_Fidelity.launch(h.container, { id: 'rush-hour-sliding', title: 'Rush Hour' });
  const rushCanvas = h.container.querySelector('canvas');
  rushCanvas.dispatch('pointerdown', { clientX: 318, clientY: 74 });
  click('Slide →');
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'Vehicle slid');
  click('Undo');
  h.frame();
  assert.equal(h.container.querySelector('.np-fidelity-status').textContent, 'Move undone');
  h.window.NP_GameSession.stop();
  assert.equal(h.errors.length, 0);
});

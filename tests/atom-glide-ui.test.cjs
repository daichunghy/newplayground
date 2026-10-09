const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const SOLUTIONS = [
  [['h2', 'left'], ['h2', 'up'], ['o', 'right'], ['o', 'down'], ['h1', 'down'], ['h2', 'right']],
  [['h2', 'left'], ['o', 'left'], ['h1', 'up'], ['h2', 'up'], ['h1', 'left'], ['h2', 'down'], ['o', 'down'], ['h1', 'down']],
  [['h1', 'right'], ['h2', 'right'], ['h2', 'down'], ['o', 'right'], ['o', 'up'], ['h1', 'left'], ['o', 'left'], ['o', 'down'], ['h1', 'right'], ['h2', 'left']],
  [['h1', 'down'], ['h1', 'left'], ['h2', 'up'], ['o', 'up'], ['o', 'left'], ['o', 'down'], ['o', 'left'], ['h2', 'down'], ['h2', 'right'], ['o', 'right'], ['h2', 'down'], ['h2', 'right']]
];
const el = (h, id) => h.container.querySelector('#' + id);
const atom = (h, id) => h.container.querySelectorAll('.ag-atom').find(button => button.dataset.atom === id);
const direction = (h, dir) => h.container.querySelectorAll('button').find(button => button.dataset.dir === dir);
function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/atom-glide-model.js'), h.context);
  vm.runInContext(read('scripts/games/atom-glide.js'), h.context);
  h.game = h.context.NP_AtomGlide.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}
function solve(h, index) {
  for (const [id, dir] of SOLUTIONS[index]) {
    atom(h, id).click(); direction(h, dir).click();
  }
  assert.equal(h.game.getModel().view().status, 'won');
}

test('mounts the compact six-by-six H2O goal with four large directional buttons', () => {
  const h = setup();
  assert.match(h.container.innerHTML, /<h2>Ghép Phân Tử<\/h2>/);
  assert.equal(h.container.querySelectorAll('.ag-atom').length, 3);
  assert.equal(h.container.querySelectorAll('.ag-wall').length, 7);
  assert.equal(h.container.querySelectorAll('.ag-target').length, 3);
  for (const dir of ['up', 'right', 'down', 'left']) assert.ok(direction(h, dir));
  assert.equal(el(h, 'agStage').textContent, 'Màn 1 / 4');
  assert.equal(el(h, 'agMoves').textContent, '0 lượt');
  h.close();
});

test('touch selection, keyboard steering, direction pad and undo all change the intended atom only', () => {
  const h = setup(), model = h.game.getModel();
  atom(h, 'h2').click();
  assert.equal(model.view().selected, 'h2');
  h.document.dispatch('keydown', { target: atom(h, 'h2'), key: 'ArrowLeft' });
  assert.deepEqual(Array.from(model.view().atoms.h2), [0, 5]);
  assert.equal(el(h, 'agMoves').textContent, '1 lượt');
  atom(h, 'h2').click(); direction(h, 'up').click();
  assert.deepEqual(Array.from(model.view().atoms.h2), [0, 3], 'stops before the other molecule atom');
  assert.deepEqual(Array.from(model.view().atoms.h1), [3, 0]);
  el(h, 'agUndo').click();
  assert.deepEqual(Array.from(model.view().atoms.h2), [0, 5]);
  assert.equal(el(h, 'agMoves').textContent, '1 lượt');
  h.close();
});

test('solving a board reveals the next stage and the final board offers a fresh run', () => {
  const h = setup(), model = h.game.getModel();
  for (let level = 0; level < SOLUTIONS.length; level++) {
    solve(h, level);
    assert.equal(el(h, 'agOverlay').hidden, false);
    assert.equal(el(h, 'agOverlayTitle').textContent, level === 3 ? 'Đã ghép H₂O!' : 'Ghép đúng H₂O!');
    if (level < SOLUTIONS.length - 1) {
      el(h, 'agOverlayNext').click();
      assert.equal(model.view().level, level + 1);
      assert.equal(model.view().moves, 0);
    }
  }
  el(h, 'agOverlayNext').click();
  assert.equal(model.view().level, 0);
  assert.equal(model.view().status, 'playing');
  assert.equal(el(h, 'agMoves').textContent, '0 lượt');
  h.close();
});

test('pause and hidden-page interruption freeze selection until explicit resume', () => {
  const h = setup(), model = h.game.getModel();
  atom(h, 'h1').click(); direction(h, 'right').click();
  el(h, 'agPause').click();
  assert.equal(model.view().status, 'paused');
  const frozen = model.view();
  h.document.dispatch('keydown', { target: atom(h, 'h1'), key: 'ArrowDown' });
  assert.deepEqual(model.view(), frozen);
  el(h, 'agOverlayNext').click();
  assert.equal(model.view().status, 'playing');
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false;
  el(h, 'agOverlayNext').click();
  assert.equal(model.view().status, 'playing');
  h.close();
});

test('exact catalog routing, closing and reopening releases every game handler and view', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('atomix-ghep-phan-tu-hoa-hoc'), 'launchAtomGlide');
  assert.equal(h.context.openGameById('atomix-ghep-phan-tu-hoa-hoc'), true);
  assert.equal(h.container.querySelectorAll('.ag-atom').length, 3);
  h.context.closeGameModal(); assertStopped(h);
  assert.equal(h.context.openGameById('atomix-ghep-phan-tu-hoa-hoc'), true);
  h.context.closeGameModal(); assertStopped(h);
});


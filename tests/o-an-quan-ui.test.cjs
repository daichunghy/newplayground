const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const M = require('../scripts/games/o-an-quan-model.js');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

function pit(container, index) {
  return container.querySelectorAll('button').find(button => Number(button.dataset.pit) === index);
}
function setup(model = M.create()) {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/o-an-quan.js'), h.context, { filename: 'o-an-quan.js' });
  const ui = h.context.NP_OAnQuan.mount(h.container, { model });
  return { h, ui };
}

test('opens on a compact 12-pit accessible board with ten citizen buttons and two display-only Quan pits', () => {
  const { h, ui } = setup();
  assert.equal(h.container.querySelectorAll('.oaq-field').length, 10);
  assert.equal(h.container.querySelectorAll('.oaq-quan').length, 2);
  assert.equal(h.container.querySelectorAll('button').length, 13); // Ten pits, two directions, and the hidden replay button.
  assert.equal(h.container.querySelector('#oaqStatus').getAttribute('aria-live'), 'polite');
  assert.equal(h.container.querySelector('#oaqReverse').disabled, true);
  assert.equal(h.container.querySelector('#oaqForward').disabled, true);
  assert.equal(ui.model.view().turn, 'red');
  assert.equal(h.frames.size, 0);
  ui.destroy();
});

test('selects only the active side, sowing buttons apply direction and clear selection', () => {
  const board = M.initialBoard().map(p => ({ ...p, stones: 0 }));
  board[7].stones = 1;
  board[1].stones = 1;
  const model = M.create({ board, turn: 'red' });
  const { h, ui } = setup(model);
  pit(h.container, 1).click();
  assert.equal(model.view().moveCount, 0);
  assert.equal(pit(h.container, 1).disabled, true);
  assert.equal(h.container.querySelector('#oaqReverse').disabled, true);
  pit(h.container, 7).focus();
  pit(h.container, 7).click();
  assert.ok(pit(h.container, 7).classList.contains('is-selected'));
  assert.equal(pit(h.container, 7).focused, true, 'selection restores focus to the selected pit after rerender');
  assert.equal(h.container.querySelector('#oaqForward').disabled, false);
  h.container.querySelector('#oaqForward').click();
  assert.equal(model.view().board[7].stones, 0);
  assert.equal(model.view().board[8].stones, 1);
  assert.equal(model.view().turn, 'black');
  assert.equal(model.view().moveCount, 1);
  assert.equal(h.container.querySelector('#oaqReverse').disabled, true);
  assert.equal(pit(h.container, model.legalPits()[0]).focused, true, 'turn change moves focus to the next legal pit');
  ui.destroy();
});

test('catalog route mounts one live game and close/reopen leaves no old board state or listeners', () => {
  const h = harness();
  assert.equal(h.context.openGameById('o-an-quan'), true);
  assert.equal(h.container.querySelectorAll('.oaq-field').length, 10);
  pit(h.container, 7).click();
  h.container.querySelector('#oaqForward').click();
  assert.ok(h.container.querySelector('.oaq-turn'));
  assert.equal(h.frames.size, 0);
  h.context.closeGameModal();
  assertStopped(h);
  assert.equal(h.context.openGameById('o-an-quan'), true);
  assert.equal(h.container.querySelectorAll('.oaq-field').length, 10);
  assert.equal(h.container.querySelector('#oaqForward').disabled, true);
  h.context.closeGameModal();
  assertStopped(h);
});

test('route uses the original vector cover and excludes the inherited art', () => {
  assert.match(read('app.js'), /'o-an-quan': 'assets\/o-an-quan-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'o_an_quan_cover\.png'/);
  assert.match(read('index.html'), /scripts\/games\/o-an-quan\.js\?v=20261007_oaq1/);
  assert.match(read('scripts/games/o-an-quan.css'), /min-height:44px/);
});

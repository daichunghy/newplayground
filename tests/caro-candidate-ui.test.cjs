const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read } = require('./support/browser-harness.cjs');

function mount() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/caro-candidate-model.js'), h.context, { filename: 'caro-candidate-model.js' });
  vm.runInContext(read('scripts/games/caro-candidate.js'), h.context, { filename: 'caro-candidate.js' });
  const ui = h.context.NP_CaroCandidate.mount(h.container);
  return { h, ui };
}

function cell(container, row, col) {
  return container.querySelectorAll('button').find(button =>
    Number(button.dataset.row) === row && Number(button.dataset.col) === col);
}

test('mounts a compact accessible board with 225 keyboard-addressable cells', () => {
  const { h, ui } = mount();
  const cells = h.container.querySelectorAll('button').filter(button => button.className.includes('np-caro-cell'));
  assert.equal(cells.length, 225);
  assert.equal(cells.filter(button => button.attributes.tabindex === '0').length, 1);
  assert.equal(h.container.querySelector('.np-caro-board').getAttribute('role'), 'group');
  assert.equal(h.container.querySelector('.np-caro-status').getAttribute('aria-live'), 'polite');
  assert.equal(ui.model.view().currentPlayer, 1);
  ui.destroy();
  assert.equal(h.container.children.length, 0);
});

test('pointer placement alternates turns and rerenders the next active cell', () => {
  const { h, ui } = mount();
  cell(h.container, 7, 7).click();
  cell(h.container, 7, 8).click();
  const v = ui.model.view();
  assert.equal(v.board[7][7], 1);
  assert.equal(v.board[7][8], 2);
  assert.equal(v.currentPlayer, 1);
  assert.equal(cell(h.container, 7, 7).attributes.disabled, undefined);
  ui.destroy();
});

test('arrow keys move the single roving focus target and Enter places there', () => {
  const { h, ui } = mount();
  const center = cell(h.container, 7, 7);
  center.dispatch('keydown', { key: 'ArrowLeft' });
  let active = h.container.querySelectorAll('button').find(button => button.attributes.tabindex === '0');
  assert.equal(Number(active.dataset.row), 7);
  assert.equal(Number(active.dataset.col), 6);
  active.dispatch('keydown', { key: 'Enter' });
  assert.equal(ui.model.view().board[7][6], 1);
  assert.equal(ui.model.view().currentPlayer, 2);
  ui.destroy();
});

test('winning reveals a new-game action, then clears the board for another round', () => {
  const { h, ui } = mount();
  const moves = [
    [7, 5], [7, 4], [7, 6], [7, 10], [7, 7], [0, 0], [7, 8], [0, 2], [7, 9]
  ];
  for (const [row, col] of moves) cell(h.container, row, col).click();
  assert.equal(ui.model.view().status, 'won');
  assert.equal(h.container.querySelector('.np-caro-new').hidden, false);
  assert.ok(h.container.querySelectorAll('button').filter(button => button.className.includes('np-caro-cell')).every(button => button.attributes.disabled !== undefined));
  h.container.querySelector('.np-caro-new').click();
  assert.equal(ui.model.view().status, 'playing');
  assert.equal(ui.model.view().moveCount, 0);
  assert.equal(h.container.querySelector('.np-caro-new').hidden, true);
  ui.destroy();
});

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

function cell(container, row, col) {
  return container.querySelectorAll('button').find(button => button.classList.contains('np-xiangqi-cell') && Number(button.dataset.row) === row && Number(button.dataset.col) === col);
}

test('catalog launch opens the original 9 by 10 hot-seat board without an intro gate', () => {
  const h = harness();
  assert.equal(h.context.openGameById('co-tuong'), true);
  const cells = h.container.querySelectorAll('button').filter(button => button.classList.contains('np-xiangqi-cell'));
  assert.equal(cells.length, 90);
  assert.equal(cells.filter(button => button.attributes.tabindex === '0').length, 1);
  assert.equal(cells.filter(button => button.classList.contains('is-red')).length, 16);
  assert.equal(cells.filter(button => button.classList.contains('is-black')).length, 16);
  assert.equal(h.container.querySelector('.np-xiangqi-status').getAttribute('aria-live'), 'polite');
  assert.equal(h.frames.size, 0);
  assert.equal(h.container.querySelector('#xqStart'), null);
  h.context.closeGameModal();
  assertStopped(h);
});

test('pointer selection and placement alternates turns and rejects a blocked move', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/xiangqi.js'), h.context, { filename: 'xiangqi.js' });
  const game = h.context.NP_Xiangqi.mount(h.container);
  const model = game.model;
  cell(h.container, 6, 4).click();
  assert.ok(cell(h.container, 6, 4).classList.contains('is-selected'));
  assert.equal(cell(h.container, 6, 4).focused, true, 'pointer selection keeps focus on the selected square');
  assert.ok(cell(h.container, 5, 4).classList.contains('is-legal'));
  cell(h.container, 6, 3).click();
  assert.equal(model.view().turn, 'red');
  assert.equal(model.view().board[6][4].type, 'soldier');
  cell(h.container, 6, 4).click();
  cell(h.container, 5, 4).click();
  assert.equal(model.view().board[5][4].type, 'soldier');
  assert.equal(model.view().turn, 'black');
  assert.equal(cell(h.container, 5, 4).focused, true, 'a pointer move keeps focus on its new square');
  game.destroy();
});

test('keyboard arrows move the roving point and Enter selects and moves', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/xiangqi.js'), h.context, { filename: 'xiangqi.js' });
  const game = h.context.NP_Xiangqi.mount(h.container);
  cell(h.container, 9, 4).dispatch('keydown', { key: 'ArrowLeft' });
  let focused = h.container.querySelectorAll('button').find(button => button.classList.contains('np-xiangqi-cell') && button.attributes.tabindex === '0');
  assert.equal(Number(focused.dataset.row), 9);
  assert.equal(Number(focused.dataset.col), 3);
  focused.dispatch('keydown', { key: 'ArrowRight' });
  focused = h.container.querySelectorAll('button').find(button => button.classList.contains('np-xiangqi-cell') && button.attributes.tabindex === '0');
  focused.dispatch('keydown', { key: 'Enter' });
  cell(h.container, 9, 4).dispatch('keydown', { key: 'ArrowUp' });
  focused = h.container.querySelectorAll('button').find(button => button.classList.contains('np-xiangqi-cell') && button.attributes.tabindex === '0');
  focused.dispatch('keydown', { key: 'Enter' });
  assert.equal(game.model.view().turn, 'black');
  assert.equal(h.container.querySelector('.np-xiangqi-status').getAttribute('aria-live'), 'polite');
  game.destroy();
});

test('a terminal move moves focus to the visible new-game action', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/xiangqi.js'), h.context, { filename: 'xiangqi.js' });
  const base = h.context.NP_XiangqiModel.create();
  let terminal = false;
  const model = {
    view() { return { ...base.view(), status: terminal ? 'checkmate' : 'playing', winner: terminal ? 'red' : null }; },
    legalMoves(row, col) { return base.legalMoves(row, col); },
    play(from, to) { const moved = base.play(from, to); if (moved) terminal = true; return moved; },
    reset() { terminal = false; base.reset(); }
  };
  h.context.NP_Xiangqi.mount(h.container, { model });
  cell(h.container, 6, 4).click();
  cell(h.container, 5, 4).click();
  assert.equal(h.container.querySelector('.np-xiangqi-new').focused, true);
});

test('closing and reopening tears down the old board and starts a fresh game', () => {
  const h = harness();
  h.context.openGameById('co-tuong');
  cell(h.container, 6, 0).click();
  cell(h.container, 5, 0).click();
  h.context.closeGameModal();
  assertStopped(h);
  h.context.openGameById('co-tuong');
  assert.ok(cell(h.container, 6, 0).classList.contains('is-red'));
  assert.equal(cell(h.container, 5, 0).classList.contains('is-red'), false);
  assert.equal(h.container.querySelectorAll('.np-xiangqi-cell').length, 90);
  h.context.closeGameModal();
  assertStopped(h);
});

test('the game routes to the original asset and is not represented by the old puzzle artwork', () => {
  assert.match(read('app.js'), /'co-tuong': 'assets\/xiangqi-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'co_tuong_cover\.png', 'cotuong_intro\.jpg'/);
  assert.match(read('index.html'), /scripts\/engines-popcap\.js\?v=20261007_bbv1/);
  assert.match(read('index.html'), /scripts\/games\/xiangqi\.js\?v=20261007_xq1/);
});

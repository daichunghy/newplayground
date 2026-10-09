const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

const el = (h, id) => h.container.querySelector('#' + id);
function setup(seed = 42) {
  const h = harness({ loadEngines: false, loadApp: false });
  h.context.NP_MoleTapModel = require('../scripts/games/mole-tap-model.js');
  h.context.NP_MoleTap = undefined;
  const vm = require('node:vm');
  vm.runInContext(read('scripts/games/mole-tap.js'), h.context);
  h.game = h.context.NP_MoleTap.mount(h.container, h.context.NP_GameSession.start(), { seed });
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}

test('opens immediately on a touch-sized 3x3 board with one visible target', () => {
  const h = setup(), v = h.game.getModel().view();
  assert.equal(h.container.querySelectorAll('.mole-hole').length, 9);
  assert.equal(v.status, 'playing');
  assert.equal(h.container.querySelectorAll('.is-up').length, 1);
  assert.equal(el(h, 'moleHits').textContent, '0 / 12');
  assert.equal(el(h, `moleHole${v.target}`).getAttribute('aria-label').includes('mục tiêu'), true);
  h.close();
});

test('touch/click hits score, keyboard digits work, and the twelfth hit shows replay', () => {
  const h = setup(), model = h.game.getModel();
  el(h, `moleHole${model.view().target}`).click();
  assert.equal(model.view().hits, 1);
  h.document.dispatch('keydown', { key: String(model.view().target + 1) });
  assert.equal(model.view().hits, 2);
  el(h, `moleHole${model.view().target}`).click();
  assert.equal(model.view().hits, 3);
  assert.equal(el(h, `moleHole${model.view().target}`).classList.contains('is-gold'), true);
  assert.equal(el(h, 'moleCombo').textContent, '×2');
  while (model.view().status === 'playing') el(h, `moleHole${model.view().target}`).click();
  assert.equal(model.view().status, 'won');
  assert.equal(el(h, 'moleScore').textContent, '3500');
  assert.equal(el(h, 'moleOverlay').hidden, false);
  assert.equal(el(h, 'moleOverlayTitle').textContent, 'Bắt đủ 12!');
  el(h, 'moleOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().hits, 0);
  assert.equal(el(h, 'moleCombo').textContent, '×1');
  h.close();
});

test('pause/resume, restart, hidden-page interruption and close release the animation loop', () => {
  const h = setup(), model = h.game.getModel();
  assert.equal(h.frames.size, 1);
  el(h, 'molePause').click();
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  el(h, 'molePause').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(h.frames.size, 1);
  el(h, 'moleRestart').click();
  assert.equal(model.view().hits, 0);
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  h.close();
});

test('the exact catalog route launches its own game and close/reopen leaves no old loop', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('dap-chuot-chui'), 'launchMoleTap');
  assert.equal(h.context.openGameById('dap-chuot-chui'), true);
  assert.equal(h.container.querySelectorAll('.mole-hole').length, 9);
  h.context.closeGameModal();
  assertStopped(h);
  assert.equal(h.context.openGameById('dap-chuot-chui'), true);
  assert.equal(h.container.querySelectorAll('.mole-hole').length, 9);
  h.context.closeGameModal();
  assertStopped(h);
});

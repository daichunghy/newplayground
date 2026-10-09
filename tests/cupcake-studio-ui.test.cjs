const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

const el = (h, id) => h.container.querySelector('#' + id);
function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  h.context.NP_CupcakeStudioModel = require('../scripts/games/cupcake-studio-model.js');
  h.context.NP_CupcakeStudio = undefined;
  const vm = require('node:vm');
  vm.runInContext(read('scripts/games/cupcake-studio.js'), h.context);
  h.game = h.context.NP_CupcakeStudio.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}

function makePerfectWithUi(h) {
  const game = h.game.getModel(), recipe = game.view().recipe;
  h.container.querySelectorAll('button').find(button => button.dataset.frosting === recipe.frosting).click();
  recipe.pattern.forEach((topping, index) => {
    h.container.querySelectorAll('button').find(button => button.dataset.tool === (topping || 'erase')).click();
    el(h, `cupcakeSlot${index}`).click();
  });
  el(h, 'cupcakeSubmit').click();
}

test('opens a compact recipe and 3×3 cupcake with no separate onboarding screen', () => {
  const h = setup(), game = h.game.getModel(), v = game.view();
  assert.equal(v.status, 'playing');
  assert.equal(h.container.querySelectorAll('.cupcake-slot').length, 9);
  assert.equal(el(h, 'cupcakeCustomer').textContent, 'Mây');
  assert.match(el(h, 'cupcakeRecipeSummary').textContent, /Mẫu Mây: kem Dâu/);
  assert.equal(el(h, 'cupcakeMatch').textContent, 'Khớp 4 / 11 · 0★');
  assert.equal(el(h, 'cupcakeOverlay').hidden, true);
  h.close();
});

test('tap and keyboard shortcuts decorate, erase, undo and submit with immediate feedback', () => {
  const h = setup(), game = h.game.getModel();
  const first = game.view().recipe.pattern.findIndex(Boolean);
  h.document.dispatch('keydown', { key: '2' });
  assert.equal(game.view().frosting, 'berry');
  h.document.dispatch('keydown', { key: 'b' });
  el(h, `cupcakeSlot${first}`).click();
  assert.equal(game.view().toppings[first], 'star');
  h.document.dispatch('keydown', { key: 'u' });
  assert.equal(game.view().toppings[first], null);
  h.document.dispatch('keydown', { key: 'x' });
  el(h, `cupcakeSlot${first}`).click();
  assert.equal(game.view().toppings[first], null);
  h.document.dispatch('keydown', { key: '3' });
  assert.equal(game.view().frosting, 'mint');
  h.close();
});

test('cell arrows preserve a single roving tab stop and the six-star shift wins', () => {
  const h = setup();
  el(h, 'cupcakeSlot4').dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(el(h, 'cupcakeSlot4').tabIndex, -1);
  assert.equal(el(h, 'cupcakeSlot5').tabIndex, 0);
  makePerfectWithUi(h); makePerfectWithUi(h); makePerfectWithUi(h);
  assert.equal(h.game.getModel().view().status, 'won');
  assert.equal(el(h, 'cupcakeOverlayTitle').textContent, 'Mẻ bánh rực rỡ!');
  assert.match(el(h, 'cupcakeOverlayCopy').textContent, /9 sao/);
  el(h, 'cupcakeOverlayAction').click();
  assert.equal(h.game.getModel().view().status, 'playing');
  assert.equal(h.game.getModel().view().stars, 0);
  h.close();
});

test('pause, resume, visibility pause, low-score loss and new-shift reset are stable', () => {
  const h = setup(), game = h.game.getModel();
  el(h, 'cupcakePause').click();
  assert.equal(game.view().status, 'paused');
  assert.equal(el(h, 'cupcakeOverlayTitle').textContent, 'Bếp nghỉ một chút');
  el(h, 'cupcakeOverlayAction').click();
  assert.equal(game.view().status, 'playing');
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(game.view().status, 'paused');
  h.document.hidden = false; el(h, 'cupcakePause').click();
  el(h, 'cupcakeSubmit').click(); el(h, 'cupcakeSubmit').click(); el(h, 'cupcakeSubmit').click();
  assert.equal(game.view().status, 'lost');
  assert.equal(el(h, 'cupcakeOverlayTitle').textContent, 'Mẻ bánh đã xong');
  el(h, 'cupcakeRestart').click();
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().round, 0);
  h.close();
});

test('CSS declares touch targets and a narrow-screen layout; closing and repeated mount clean listeners', () => {
  const css = read('scripts/games/cupcake-studio.css');
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /max-width:\s*360px/);
  const h = setup();
  h.context.NP_GameSession.stop(); assertStopped(h);
  h.game = h.context.NP_CupcakeStudio.mount(h.container, h.context.NP_GameSession.start());
  assert.equal(h.container.querySelectorAll('.cupcake-slot').length, 9);
  h.close();
});

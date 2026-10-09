const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const el = (h, id) => h.container.querySelector('#' + id);
const tile = (h, id) => h.container.querySelectorAll('.pr-tile').find(node => node.dataset.pipe === id);
function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/pipe-route-model.js'), h.context);
  vm.runInContext(read('scripts/games/pipe-route.js'), h.context);
  h.game = h.context.NP_PipeRoute.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}

test('renders a compact pipe grid with named, keyboard-focusable 25 rotation controls', () => {
  const h = setup();
  assert.match(h.container.innerHTML, /<h2>Nối Ống Nước<\/h2>/);
  assert.equal(h.container.querySelectorAll('.pr-tile').length, 25);
  assert.equal(h.container.querySelectorAll('.pr-endpoint').length, 2);
  assert.equal(el(h, 'prStage').textContent, 'Màn 1 / 3');
  assert.equal(el(h, 'prTimer').textContent, '60 giây');
  assert.match(tile(h, '0,2').getAttribute('aria-label'), /Vòi nước/);
  assert.equal(tile(h, '0,0').tabIndex, 0);
  h.close();
});

test('tap and arrow-key rotations update water, undo, and stage pause/resume states', () => {
  const h = setup(), model = h.game.getModel(), before = model.view().pipes[0].ports;
  tile(h, '0,0').click();
  assert.equal(model.view().moves, 1);
  assert.notDeepEqual(model.view().pipes[0].ports, before);
  h.document.dispatch('keydown', { target: tile(h, '0,0'), key: 'ArrowRight' });
  assert.equal(tile(h, '1,0').focused, true, 'arrow navigation moves one tile without rotating');
  h.document.dispatch('keydown', { target: tile(h, '1,0'), key: 'd' });
  assert.equal(model.view().moves, 2);
  el(h, 'prUndo').click();
  assert.equal(model.view().moves, 1);
  el(h, 'prPause').click();
  assert.equal(model.view().status, 'paused');
  const frozenTime = model.view().timeLeft;
  h.tickIntervals();
  assert.equal(model.view().timeLeft, frozenTime);
  el(h, 'prPrimary').click();
  assert.equal(model.view().status, 'playing');
  h.tickIntervals();
  assert.equal(model.view().timeLeft, frozenTime - 1000);
  h.close();
});

test('pressure loss, retry, hidden-page pause, and restart cleanly recover a session', () => {
  const h = setup(), model = h.game.getModel();
  for (let i = 0; i < 60; i++) h.tickIntervals();
  assert.equal(model.view().status, 'lost');
  assert.equal(el(h, 'prOverlayTitle').textContent, 'Bể cạn áp lực');
  el(h, 'prPrimary').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().timeLeft, 60000);
  tile(h, '1,0').click();
  el(h, 'prRestart').click();
  assert.equal(model.view().moves, 0);
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false; el(h, 'prPrimary').click();
  assert.equal(model.view().status, 'playing');
  h.close();
});

test('exact catalog routing, teardown and remount release listeners and grid DOM', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('noi-ong-nuoc-pipemania'), 'launchPipeRoute');
  assert.equal(h.context.openGameById('noi-ong-nuoc-pipemania'), true);
  assert.equal(h.container.querySelectorAll('.pr-tile').length, 25);
  h.context.closeGameModal(); assertStopped(h);
  assert.equal(h.context.openGameById('noi-ong-nuoc-pipemania'), true);
  h.context.closeGameModal(); assertStopped(h);
});

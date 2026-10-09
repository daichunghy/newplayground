const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

const el = (h, id) => h.container.querySelector('#' + id);
function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/paperboy-model.js'), h.context);
  vm.runInContext(read('scripts/games/paperboy.js'), h.context);
  h.game = h.context.NP_Paperboy.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}

test('mount starts immediately with touch lanes, clear delivery counters and compact controls', () => {
  const h = setup(), model = h.game.getModel();
  assert.match(h.container.innerHTML, /Chọn làn · ném vào hộp thư/);
  assert.equal(el(h, 'pbDeliveries').textContent, '0 / 6');
  assert.equal(model.view().lane, 1);
  assert.equal(el(h, 'pbThrow').disabled, true);
  assert.equal(h.frames.size, 1);
  h.close();
});

test('lane buttons, paper throw, pause, restart and session cleanup work together', () => {
  const h = setup(), model = h.game.getModel();
  el(h, 'pbRight').click();
  assert.equal(model.view().lane, 2);
  el(h, 'pbLeft').click();
  assert.equal(model.view().lane, 1);
  model.advance(800);
  el(h, 'pbThrow').click();
  assert.equal(model.view().deliveries, 1);
  assert.equal(el(h, 'pbDeliveries').textContent, '1 / 6');
  el(h, 'pbPause').click();
  assert.equal(model.view().status, 'paused');
  el(h, 'pbOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  el(h, 'pbRestart').click();
  assert.equal(model.view().deliveries, 0);
  assert.equal(model.view().lane, 1);
  h.close();
});

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const SPANS = require('../scripts/games/bridge-builder-model.js').LEVELS[0].spans;

const el = (h, id) => h.container.querySelector('#' + id);
function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/bridge-builder-model.js'), h.context);
  vm.runInContext(read('scripts/games/bridge-builder.js'), h.context);
  h.game = h.context.NP_BridgeBuilder.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}
function buildAll(model, spans) {
  for (let i = 0; i < spans; i++) for (const deck of [`b${i}`, `b${i + 1}`]) {
    model.selectJoint(`t${i}`); model.selectJoint(deck);
  }
}

test('mount draws a responsive truss board, concise instructions and separate budget', () => {
  const h = setup();
  assert.match(el(h, 'bbBoard').innerHTML, /bb-ghost/);
  assert.equal(el(h, 'bbLevel').textContent, '1 / 3 · Khe Suối');
  assert.equal(el(h, 'bbBudget').textContent, '0 / 8');
  assert.match(h.container.innerHTML, /Chạm 2 khớp để đặt giằng/);
  h.close();
});

test('test controls animate a load, pause/resume, announce the result and clean all loops', () => {
  const h = setup(), model = h.game.getModel();
  buildAll(model, SPANS);
  el(h, 'bbTest').click();
  assert.equal(model.view().status, 'testing');
  assert.equal(h.frames.size, 1);
  el(h, 'bbPause').click();
  assert.equal(model.view().status, 'paused');
  assert.equal(el(h, 'bbOverlayTitle').textContent, 'Tạm dừng');
  el(h, 'bbOverlayAction').click();
  for (let i = 0; i < 190; i++) h.frame();
  assert.equal(model.view().status, 'passed');
  assert.equal(el(h, 'bbOverlayTitle').textContent, 'Tải qua an toàn');
  el(h, 'bbOverlayAction').click();
  assert.equal(model.view().levelNumber, 2);
  h.close();
});

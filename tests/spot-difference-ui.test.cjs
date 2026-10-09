const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/spot-difference-model.js');

const el = (h, id) => h.container.querySelector('#' + id);
function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/spot-difference-model.js'), h.context);
  vm.runInContext(read('scripts/games/spot-difference.js'), h.context);
  h.game = h.context.NP_SpotDifference.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}
function tapTarget(h, index, side = 'a', sceneIndex = 0) {
  const [x, y] = M.SCENES[sceneIndex].targets[index][side], panel = el(h, `sdImage${side.toUpperCase()}`);
  panel.dispatch('click', { detail: 1, clientX: x * 640, clientY: y * 480 });
}

test('mount presents the two original comparison images and a compact five-spot goal', () => {
  const h = setup();
  assert.equal(el(h, 'sdImageA').getAttribute('aria-label').startsWith('Ảnh A'), true);
  assert.equal(h.container.querySelectorAll('img').length, 2);
  assert.equal(h.container.querySelectorAll('img')[0].getAttribute('src'), 'assets/spot-the-difference-a.svg');
  assert.equal(h.container.querySelectorAll('img')[1].getAttribute('src'), 'assets/spot-the-difference-b.svg');
  assert.equal(el(h, 'sdMarkA0').hidden, true);
  assert.equal(el(h, 'sdFound').textContent, '0 / 5');
  assert.match(h.container.innerHTML, /Tìm 5 điểm · 3 cảnh/);
  h.close();
});

test('touch-sized panel taps accept a real difference and show a marker on both images', () => {
  const h = setup(), model = h.game.getModel();
  tapTarget(h, 0, 'b');
  assert.equal(model.view().found[0], true);
  assert.equal(el(h, 'sdFound').textContent, '1 / 5');
  assert.equal(el(h, 'sdMarkA0').hidden, false);
  assert.equal(el(h, 'sdMarkB0').hidden, false);
  assert.match(el(h, 'sdStatus').textContent, /Đúng/);
  h.close();
});

test('the view swaps authored images and markers as the three-scene course advances', () => {
  const h = setup(), model = h.game.getModel();
  for (const [sceneIndex, scene] of M.SCENES.entries()) {
    for (let index = 0; index < scene.targets.length; index++) tapTarget(h, index, 'b', sceneIndex);
    assert.equal(el(h, 'sdScene').textContent, `${Math.min(sceneIndex + 2, 3)} / 3`);
    assert.equal(el(h, 'sdProgress').style.width, `${(sceneIndex + 1) * 5 / M.TOTAL_TARGETS * 100}%`);
    if (sceneIndex < M.SCENES.length - 1) {
      assert.equal(el(h, 'sdPhotoA').getAttribute('src'), M.SCENES[sceneIndex + 1].a);
      assert.equal(el(h, 'sdFound').textContent, '0 / 5');
      assert.equal(el(h, 'sdMarkA0').hidden, true);
    }
  }
  assert.equal(model.view().status, 'won');
  assert.equal(el(h, 'sdOverlayTitle').textContent, 'Xong cả ba!');
  h.close();
});

test('keyboard arrows move the visible cursor and Enter uses that position', () => {
  const h = setup(), panel = el(h, 'sdImageA');
  panel.dispatch('focus');
  for (let index = 0; index < 6; index++) panel.dispatch('keydown', { key: 'ArrowLeft', preventDefault() {} });
  for (let index = 0; index < 6; index++) panel.dispatch('keydown', { key: 'ArrowUp', preventDefault() {} });
  assert.equal(el(h, 'sdCursorA').hidden, false);
  panel.dispatch('click', { detail: 0, clientX: 0, clientY: 0 });
  assert.equal(h.game.getModel().view().found[0], true);
  h.close();
});

test('misses, loss, pause/resume, timeout restart and game cleanup work together', () => {
  const h = setup(), model = h.game.getModel();
  for (let miss = 0; miss < 5; miss++) el(h, 'sdImageA').dispatch('click', { detail: 1, clientX: 610, clientY: 441 });
  assert.equal(model.view().status, 'lost');
  assert.equal(el(h, 'sdOverlayTitle').textContent, 'Hết lượt');
  el(h, 'sdOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  el(h, 'sdPause').click();
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  el(h, 'sdOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.close();
});

test('catalog route is playable and session teardown removes the comparison scene', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('tim-diem-khac-biet'), 'launchSpotDifference');
  assert.equal(h.context.openGameById('tim-diem-khac-biet'), true);
  assert.ok(el(h, 'sdImageA')); assert.ok(el(h, 'sdImageB'));
  h.context.closeGameModal();
  assertStopped(h);
});

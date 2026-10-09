const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/ban-vit-bay-model.js');

const el = (h, id) => h.container.querySelector('#' + id);
function launch(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false });
  h.context.NP_BanVitBayModel = M;
  vm.runInContext(read('scripts/games/ban-vit-bay.js'), h.context, { filename: 'scripts/games/ban-vit-bay.js' });
  h.mountResult = h.context.NP_BanVitBay.mount(h.container, h.context.NP_GameSession.start(), options);
  return h;
}
function close(h) { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []); }
function frames(h, count) { for (let i = 0; i < count; i++) h.frame(); }

test('mount begins play immediately with accessible pointer, touch, and keyboard controls', () => {
  const h = launch(), model = h.mountResult.getModel();
  for (const id of ['bvbCanvas', 'bvbHits', 'bvbMisses', 'bvbShots', 'bvbRemaining', 'bvbTimebar', 'bvbPause', 'bvbLeft', 'bvbRight', 'bvbUp', 'bvbDown', 'bvbFire', 'bvbOverlay']) assert.ok(el(h, id), id);
  assert.equal(model.view().status, 'playing');
  assert.equal(el(h, 'bvbOverlay').hidden, true);
  assert.equal(el(h, 'bvbCanvas').focused, true);
  assert.match(el(h, 'bvbCanvas').getAttribute('aria-label'), /Chặng 1 trong 5: Quét Ngang/);
  assert.match(el(h, 'bvbCanvas').getAttribute('aria-label'), /Chạm để bắn/);
  assert.match(read('scripts/games/ban-vit-bay.js'), /arrowleft.*arrowright.*arrowup.*arrowdown/s);
  assert.match(read('scripts/games/ban-vit-bay.css'), /min-width:46px/);
  close(h);
});

test('pointer targeting, keyboard aiming and the touch fire button update the same model', () => {
  const h = launch(), model = h.mountResult.getModel();
  const target = model.view().target;
  el(h, 'bvbCanvas').dispatch('pointermove', { clientX: target.x, clientY: target.y });
  const aim = model.view().aim;
  assert.equal(aim.x, target.x);
  assert.ok(Math.abs(aim.y - target.y) < 1e-9, 'scaled pointer math may differ by floating-point roundoff');
  el(h, 'bvbCanvas').dispatch('pointerdown', { clientX: target.x, clientY: target.y, preventDefault() {} });
  assert.equal(model.view().phase, 'hit');
  assert.equal(el(h, 'bvbLive').textContent, 'Trúng!');

  h.context.NP_GameSession.stop(); h.container.innerHTML = '';
  h.mountResult = h.context.NP_BanVitBay.mount(h.container, h.context.NP_GameSession.start());
  const startX = h.container.querySelector('#bvbCanvas').width / 2;
  h.container.dispatch('keydown', { key: 'ArrowLeft' });
  h.container.querySelector('#bvbLeft').click();
  h.container.dispatch('keydown', { key: ' ' });
  const uiModel = h.mountResult.getModel();
  assert.equal(uiModel.view().aim.x, startX - 52, 'keyboard and touch controls move the same reticle');
  assert.equal(uiModel.view().shotsLeft, 2, 'Space fires through the shared action path');
  close(h);
});

test('pause, tab switching, resume and blur all stop the loop safely', () => {
  const h = launch(), model = h.mountResult.getModel();
  el(h, 'bvbPause').click();
  assert.equal(model.view().status, 'paused');
  assert.equal(el(h, 'bvbOverlay').hidden, false);
  const elapsed = model.view().elapsed;
  frames(h, 5);
  assert.equal(model.view().elapsed, elapsed);
  el(h, 'bvbOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false; el(h, 'bvbOverlayAction').click();
  h.window.dispatch('blur');
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  close(h);
});

test('a compact five-flight round ends clearly and can be retried', () => {
  const seeds = [101, 101];
  const h = launch({ seedFactory: () => seeds.shift() }), model = h.mountResult.getModel();
  const firstSeed = model.view().seed;
  for (let flight = 0; flight < M.FLIGHTS; flight++) {
    for (let shot = 0; shot < M.SHOTS_PER_FLIGHT; shot++) el(h, 'bvbFire').click();
    assert.equal(model.view().phase, 'miss');
    frames(h, 28);
  }
  assert.equal(model.view().status, 'over');
  assert.equal(el(h, 'bvbOverlay').hidden, false);
  assert.equal(el(h, 'bvbOverlayTitle').textContent, 'Hết lượt');
  assert.match(el(h, 'bvbOverlayText').textContent, /0 \/ 5/);
  el(h, 'bvbOverlayAction').click();
  assert.equal(h.mountResult.getModel().view().status, 'playing');
  assert.equal(h.mountResult.getModel().view().remaining, 5);
  assert.notEqual(h.mountResult.getModel().view().seed, firstSeed, 'retry draws a fresh target pattern even if the seed source repeats');
  close(h);
});

test('session cleanup removes the animation and global lifecycle/input listeners', () => {
  const h = launch();
  h.frame(); h.window.dispatch('blur');
  assert.equal(h.frames.size, 0);
  h.window.dispatch('pagehide');
  assert.equal(h.mountResult.getModel().view().status, 'paused');
  close(h);
});

test('the exact catalog route uses the original gallery and retires the unverified cover', () => {
  const h = harness();
  assert.equal(h.context.openGameById('duck-hunt-ban-vit'), true);
  assert.ok(el(h, 'bvbCanvas'));
  assert.match(h.container.innerHTML, /Mục Tiêu Bay/);
  assert.match(read('app.js'), /'duck-hunt-ban-vit': 'assets\/muc-tieu-bay-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'duck_hunt_cover\.jpg'/);
  assert.deepEqual(h.errors, []);
  h.context.closeGameModal();
  assertStopped(h);
});

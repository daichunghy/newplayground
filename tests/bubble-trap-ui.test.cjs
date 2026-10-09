const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/bubble-trap-model.js');

function mount() {
  const h = harness({ loadEngines: false, loadApp: false });
  const baseDocumentListeners = h.document.listenerCount();
  vm.runInContext(read('scripts/games/bubble-trap.js'), h.context, { filename: 'bubble-trap.js' });
  h.window.NP_BubbleTrapModel = M;
  const session = h.window.NP_GameSession.start();
  const game = h.window.NP_BubbleTrap.mount(h.container, session, h.window.NP_AudioEngine);
  return { h, session, game, baseDocumentListeners };
}

function tick(h, ms = 100) { h.advance(ms); h.frame(); }
function el(h, id) { return h.container.querySelector('#' + id); }

test('the exact catalog route opens Mầm Gió with its original cover and closes cleanly', () => {
  const h = harness();
  assert.equal(h.context.openGameById('bubble-bobble-khung-long-bong-bong'), true);
  assert.ok(h.container.querySelector('#mgCanvas'));
  assert.equal(h.document.getElementById('modalGameTitle').textContent, 'Mầm Gió');
  assert.match(read('app.js'), /'bubble-bobble-khung-long-bong-bong': 'assets\/mam-gio-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'bubble_bobble_cover\.jpg'/);
  h.context.closeGameModal();
  assertStopped(h);
});

test('compact play-first screen names the original game and exposes canvas, pause, replay, and clear controls', () => {
  const { h, session } = mount();
  assert.match(h.container.innerHTML, /Mầm Gió/);
  assert.match(h.container.innerHTML, /← → đi/);
  assert.match(h.container.innerHTML, /X thổi bọt/);
  const visibleText = h.container.innerHTML.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(visibleText, /Taito|Bubble Bobble|Bubblun|Bobblun|Arcade Archives/i);
  assert.ok(el(h, 'mgCanvas'));
  assert.ok(el(h, 'mgPause'));
  assert.ok(el(h, 'mgReplay'));
  assert.ok(el(h, 'mgLeft'));
  assert.ok(el(h, 'mgJump'));
  assert.ok(el(h, 'mgBubble'));
  assert.ok(el(h, 'mgRight'));
  assert.equal(el(h, 'mgOverlay').hidden, true);
  assert.equal(el(h, 'mgCanvas').focused, true);
  assert.equal(el(h, 'mgStage').textContent, 'Chặng 1 / 3');
  assert.equal(el(h, 'mgLives').getAttribute('aria-label'), '3 lượt');
  const css = read('scripts/games/bubble-trap.css');
  assert.match(css, /min-height:48px/);
  assert.match(css, /touch-action:manipulation/);
  session.stop();
  assert.equal(h.container.classList.contains('mg-host'), false);
  assert.equal(h.frames.size, 0);
});

test('touch buttons and keyboard work together while a touch button has focus', () => {
  const { h, session, game } = mount();
  h.frame(); // establish the RAF clock before measuring held movement
  const before = game.getModel().view().player.x;
  el(h, 'mgRight').dispatch('pointerdown', { pointerId: 4 });
  tick(h, 120);
  el(h, 'mgRight').dispatch('pointerup', { pointerId: 4 });
  assert.ok(game.getModel().view().player.x > before);

  el(h, 'mgJump').click();
  assert.ok(game.getModel().view().player.vy < 0);
  el(h, 'mgBubble').click();
  assert.equal(game.getModel().view().bubbles.filter(b => b.kind === 'shot').length, 1);
  assert.equal(el(h, 'mgBubble').disabled, true);

  const x = game.getModel().view().player.x;
  el(h, 'mgBubble').focus();
  h.container.dispatch('keydown', { key: 'ArrowLeft', target: el(h, 'mgBubble'), repeat: false });
  tick(h, 110);
  h.container.dispatch('keyup', { key: 'ArrowLeft', target: el(h, 'mgBubble') });
  assert.ok(game.getModel().view().player.x < x);
  tick(h, 150); tick(h, 150); tick(h, 150);
  h.container.dispatch('keydown', { key: 'x', target: el(h, 'mgCanvas'), repeat: false });
  assert.equal(game.getModel().view().bubbles.filter(b => b.kind === 'shot').length, 2);
  session.stop();
});

test('pause, visibility interruption, resume, and replay keep one animation loop and clear held input', () => {
  const { h, session, game, baseDocumentListeners } = mount();
  h.frame();
  el(h, 'mgLeft').dispatch('pointerdown', { pointerId: 7 });
  tick(h, 120);
  el(h, 'mgPause').click();
  const pausedAt = game.getModel().view().elapsed;
  assert.equal(game.isPaused(), true);
  assert.equal(h.frames.size, 0);
  assert.equal(el(h, 'mgOverlay').hidden, false);
  tick(h, 4000);
  assert.equal(game.getModel().view().elapsed, pausedAt);
  el(h, 'mgOverlayAction').click();
  assert.equal(game.isPaused(), false);
  assert.equal(h.frames.size, 1);

  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(game.isPaused(), true);
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  el(h, 'mgOverlayAction').click();
  assert.equal(h.frames.size, 1);

  el(h, 'mgReplay').click();
  assert.equal(game.getModel().view().tick, 0);
  assert.equal(game.getModel().view().score, 0);
  assert.equal(game.isPaused(), false);
  assert.equal(h.frames.size, 1);
  h.window.dispatch('blur');
  assert.equal(game.isPaused(), true);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.container.classList.contains('mg-host'), false);
  assert.equal(h.container.listenerCount(), 0);
  assert.equal(h.window.listenerCount(), 0);
  assert.equal(h.document.listenerCount(), baseDocumentListeners);
});

test('repeated mount and cleanup does not retain game listeners or animation callbacks', () => {
  for (let i = 0; i < 10; i++) {
    const { h, session, baseDocumentListeners } = mount();
    session.stop();
    assert.equal(h.frames.size, 0);
    assert.equal(h.container.classList.contains('mg-host'), false);
    assert.equal(h.container.listenerCount(), 0);
    assert.equal(h.window.listenerCount(), 0);
    assert.equal(h.document.listenerCount(), baseDocumentListeners);
  }
});

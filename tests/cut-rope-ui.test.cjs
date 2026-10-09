const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

const el = (h, id) => h.container.querySelector('#' + id);

function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/cut-rope-model.js'), h.context);
  vm.runInContext(read('scripts/games/cut-rope.js'), h.context);
  const baselineDocumentHandlers = h.document.listenerCount();
  h.game = h.context.NP_CutRope.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => {
    h.context.NP_GameSession.stop();
    assertStopped(h);
    assert.equal(h.document.listenerCount(), baselineDocumentHandlers, 'game document handlers are removed');
    assert.deepEqual(h.errors, []);
  };
  return h;
}

function swipeAcross(h, segment, pointerId = 1) {
  const mid = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
  const dx = segment.end.x - segment.start.x, dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const half = { x: -dy / length * 8, y: dx / length * 8 };
  const start = { x: mid.x - half.x, y: mid.y - half.y };
  const end = { x: mid.x + half.x, y: mid.y + half.y };
  const canvas = el(h, 'ctArena');
  canvas.dispatch('pointerdown', { clientX: start.x, clientY: start.y, button: 0, pointerType: 'touch', pointerId });
  h.document.dispatch('pointerup', { clientX: end.x, clientY: end.y, pointerType: 'touch', pointerId });
}

test('mounts original scene, clear instructions, score, and accessible large controls', () => {
  const h = setup(), view = h.game.getModel().view();
  assert.match(h.container.innerHTML, /<h2>Mầm Măm<\/h2>/);
  assert.match(h.container.innerHTML, /Vuốt qua dây, gom sao, đưa hạt vào miệng Mầm/);
  assert.equal(el(h, 'ctArena').width, 360);
  assert.equal(el(h, 'ctArena').height, 540);
  assert.equal(view.levelCount, 3);
  assert.equal(view.rope.length, view.ropeSegments);
  assert.ok(el(h, 'ctCut').getAttribute('aria-label').includes('phím cách'));
  assert.equal(el(h, 'ctScore').textContent, '0');
  assert.equal(el(h, 'ctStage').textContent, '1 / 3 · Hiên Nắng');
  h.close();
});

test('touch pointer swipe severs a rope segment; action button and Space key are fallbacks', () => {
  const h = setup(), model = h.game.getModel();
  swipeAcross(h, model.view().rope[3]);
  assert.equal(model.view().attached, false);
  assert.equal(model.view().cuts, 1);
  assert.equal(el(h, 'ctCut').disabled, true);

  h.game.restart();
  assert.equal(model.view().attached, true);
  el(h, 'ctCut').click();
  assert.equal(model.view().attached, false, 'the large button can cut without a pointer gesture');

  h.game.restart();
  let prevented = false;
  h.document.dispatch('keydown', { target: el(h, 'ctArena'), key: ' ', code: 'Space', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(model.view().attached, false, 'Space uses the accessible cut action');
  h.close();
});

test('a second finger cannot finish a cut; pointer cancellation clears the drag without severing', () => {
  const h = setup(), model = h.game.getModel(), segment = model.view().rope[3];
  const mid = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
  const canvas = el(h, 'ctArena');
  canvas.dispatch('pointerdown', { clientX: mid.x, clientY: mid.y, button: 0, pointerType: 'touch', pointerId: 17 });
  h.document.dispatch('pointerup', { clientX: mid.x, clientY: mid.y, pointerType: 'touch', pointerId: 18 });
  assert.equal(model.view().attached, true, 'an unrelated pointer cannot complete the active gesture');
  h.document.dispatch('pointercancel', { pointerType: 'touch', pointerId: 18 });
  assert.equal(model.view().attached, true, 'cancelling another pointer leaves the drag intact');
  h.document.dispatch('pointercancel', { pointerType: 'touch', pointerId: 17 });
  assert.equal(model.view().attached, true, 'cancelling the active pointer never cuts');
  swipeAcross(h, model.view().rope[3], 19);
  assert.equal(model.view().attached, false, 'a fresh gesture still cuts after cancellation');
  h.close();
});

test('pause, keyboard resume, hidden tab, pagehide, and restart preserve the expected state', () => {
  const h = setup(), model = h.game.getModel();
  el(h, 'ctPause').click();
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  const frozen = model.view();
  model.step(.2);
  assert.equal(model.view().candy.x, frozen.candy.x);
  h.document.dispatch('keydown', { target: el(h, 'ctGame'), key: 'p', code: 'KeyP' });
  assert.equal(model.view().status, 'playing');
  assert.equal(h.frames.size, 1);

  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false;
  el(h, 'ctOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  h.window.dispatch('pagehide');
  assert.equal(model.view().status, 'paused');
  el(h, 'ctRestart').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().attached, true);
  assert.equal(h.frames.size, 1);
  h.close();
});

test('player can finish a stage, advance, restart, and the session disposes its animation loop', () => {
  const h = setup(), model = h.game.getModel();
  for (let i = 0; i < 20; i++) h.frame(); // about 0.30 seconds of authored pendulum motion
  el(h, 'ctCut').click();
  for (let i = 0; i < 90 && model.view().status === 'playing'; i++) h.frame();
  assert.equal(model.view().status, 'won');
  assert.equal(el(h, 'ctOverlay').hidden, false);
  assert.equal(el(h, 'ctOverlayTitle').textContent, 'Mầm bắt được hạt!');
  assert.match(el(h, 'ctOverlayCopy').textContent, /điểm/);
  el(h, 'ctOverlayAction').click();
  assert.equal(model.view().level, 1);
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().score, 650);
  el(h, 'ctRestart').click();
  assert.equal(model.view().score, 650, 'restart resets only the current stage score');
  h.close();
});

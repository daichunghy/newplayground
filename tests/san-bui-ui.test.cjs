const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/san-bui-model.js');

const el = (h, id) => h.container.querySelector('#' + id);
function open(seed = 1) {
  const h = harness({ loadEngines: false, loadApp: false });
  const documentListenersBefore = h.document.listenerCount();
  vm.runInContext(read('scripts/games/san-bui-model.js'), h.context);
  vm.runInContext(read('scripts/games/san-bui.js'), h.context);
  const session = h.context.NP_GameSession.start();
  h.game = h.context.NP_SanBui.mount(h.container, session, null, { seedFactory: () => seed });
  h.close = () => {
    h.context.NP_GameSession.stop();
    assertStopped(h);
    assert.equal(h.document.listenerCount(), documentListenersBefore);
    assert.deepEqual(h.errors, []);
  };
  return h;
}
function control(h, id, value) {
  const input = el(h, id); input.value = String(value); input.dispatch('input', { target: input });
}
function finishAnimatedAction(h, maxFrames = 300) {
  let frames = 0;
  while (h.game.getModel().view().status === 'playing' && h.game.getModel().view().phase !== 'aiming' && frames++ < maxFrames) h.frame();
  assert.ok(frames < maxFrames, 'throw and can motion settle within the bounded animation');
}
function aimEasyStage(h) { control(h, 'sbAngle', 18); control(h, 'sbPower', 75); }

test('mount opens immediately with original Sân Bụi art, an authored tower, and a short goal readout', () => {
  const h = open();
  assert.match(h.container.innerHTML, /Sân Bụi/);
  assert.doesNotMatch(h.container.innerHTML, /Ném Lon|Ném lon|PopCap|brand/i);
  assert.ok(el(h, 'sbCanvas'));
  assert.equal(el(h, 'sbCanvas').getAttribute('role'), 'img');
  assert.equal(el(h, 'sbStage').textContent, 'Vạt nắng · 1/3');
  assert.equal(el(h, 'sbKnocked').textContent, '0 / 3');
  assert.equal(el(h, 'sbThrows').textContent, '3');
  assert.equal(el(h, 'sbOverlay').hidden, true);
  assert.match(h.container.innerHTML, /id="sbPause"[^>]*>\|\|<\/button>/, 'pause icon uses visible text bars on the available font stack');
  assert.match(el(h, 'sbStatus').textContent, /góc và lực/);
  h.close();
});

test('touch buttons, sliders, and direct canvas aiming set angle and power', () => {
  const h = open();
  el(h, 'sbAimUp').click(); assert.equal(h.game.getModel().view().angle, 27);
  el(h, 'sbPowerUp').click(); assert.equal(h.game.getModel().view().power, 77);
  control(h, 'sbAngle', 33); control(h, 'sbPower', 82);
  assert.equal(el(h, 'sbAngleValue').textContent, '33°');
  assert.equal(el(h, 'sbPowerValue').textContent, '82%');
  const canvas = el(h, 'sbCanvas');
  canvas.dispatch('pointerdown', { pointerType: 'touch', clientX: 143, clientY: 277 });
  assert.equal(h.game.getModel().view().angle, 50);
  h.close();
});

test('dragging on the canvas tracks aim until release, then ignores stray pointer movement', () => {
  const h = open(), canvas = el(h, 'sbCanvas');
  canvas.dispatch('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 400, clientY: 100, preventDefault() {} });
  const first = h.game.getModel().view().angle;
  canvas.dispatch('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 500, clientY: 180, preventDefault() {} });
  const dragged = h.game.getModel().view().angle;
  assert.notEqual(dragged, first);
  canvas.dispatch('pointerup', { pointerId: 7 });
  canvas.dispatch('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 250, clientY: 300, preventDefault() {} });
  assert.equal(h.game.getModel().view().angle, dragged);
  h.close();
});

test('keyboard arrows adjust aim and force; Space makes one physics throw', () => {
  const h = open(), canvas = el(h, 'sbCanvas');
  h.container.dispatch('keydown', { key: 'ArrowLeft', target: canvas });
  h.container.dispatch('keydown', { key: 'ArrowUp', target: canvas });
  assert.equal(h.game.getModel().view().angle, 24);
  assert.equal(h.game.getModel().view().power, 75);
  h.container.dispatch('keydown', { key: ' ', code: 'Space', repeat: false, target: canvas });
  assert.equal(h.game.getModel().view().phase, 'flight');
  assert.equal(h.game.getModel().view().throwsLeft, 2);
  assert.equal(h.frames.size, 1);
  h.close();
});

test('a planned shot topples the small triangle and unlocks the next authored objective', () => {
  const h = open(1); aimEasyStage(h); el(h, 'sbFire').click();
  assert.equal(h.game.getModel().view().phase, 'flight');
  finishAnimatedAction(h);
  assert.equal(h.game.getModel().view().stageIndex, 1);
  assert.equal(el(h, 'sbStage').textContent, 'Góc sân · 2/3');
  assert.equal(el(h, 'sbKnocked').textContent, '0 / 6');
  assert.equal(h.game.getModel().view().totalThrows, 1);
  h.close();
});

test('pause freezes an active shot, resume keeps its phase, and restart is clean', () => {
  const h = open(); aimEasyStage(h); el(h, 'sbFire').click(); h.frame(); h.frame();
  const before = h.game.getModel().view();
  el(h, 'sbPause').click();
  assert.equal(h.game.isPaused(), true); assert.equal(h.frames.size, 0);
  assert.equal(h.game.getModel().view().status, 'paused');
  assert.deepEqual(h.game.getModel().view().ball, before.ball);
  assert.equal(el(h, 'sbOverlay').hidden, false);
  el(h, 'sbOverlayAction').click();
  assert.equal(h.game.isPaused(), false); assert.equal(h.frames.size, 1);
  assert.equal(h.game.getModel().view().phase, before.phase);
  el(h, 'sbRestart').click();
  assert.equal(h.game.getModel().view().stageIndex, 0);
  assert.equal(h.game.getModel().view().throwsLeft, 3);
  assert.equal(h.frames.size, 0);
  h.close();
});

test('window blur and hidden tab pause safely without automatic resume', () => {
  const h = open(); aimEasyStage(h); el(h, 'sbFire').click();
  h.window.dispatch('blur');
  assert.equal(h.game.isPaused(), true); assert.equal(h.frames.size, 0);
  el(h, 'sbOverlayAction').click();
  assert.equal(h.game.isPaused(), false);
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(h.game.isPaused(), true); assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.dispatch('visibilitychange');
  assert.equal(h.game.isPaused(), true); assert.equal(h.frames.size, 0);
  el(h, 'sbOverlayAction').click();
  assert.equal(h.game.isPaused(), false); assert.equal(h.frames.size, 1);
  h.close();
});

test('all three objectives show a result and replay returns to the first throw', () => {
  const h = open(1); aimEasyStage(h);
  for (let shot = 0; shot < 4 && h.game.getModel().view().status === 'playing'; shot++) {
    el(h, 'sbFire').click(); finishAnimatedAction(h);
  }
  assert.equal(h.game.getModel().view().status, 'won');
  assert.equal(h.game.getModel().view().totalThrows, 4);
  assert.equal(el(h, 'sbOverlay').hidden, false);
  assert.match(el(h, 'sbOverlayTitle').textContent, /ba chặng/);
  el(h, 'sbOverlayAction').click();
  assert.equal(h.game.getModel().view().status, 'playing');
  assert.equal(h.game.getModel().view().stageIndex, 0);
  assert.equal(h.game.getModel().view().throwsLeft, 3);
  assert.equal(el(h, 'sbOverlay').hidden, true);
  h.close();
});

test('three misses expose the loss result and offer replay', () => {
  const h = open(1); control(h, 'sbAngle', 10); control(h, 'sbPower', 35);
  for (let shot = 0; shot < 3 && h.game.getModel().view().status === 'playing'; shot++) {
    el(h, 'sbFire').click(); finishAnimatedAction(h);
  }
  assert.equal(h.game.getModel().view().status, 'lost');
  assert.match(el(h, 'sbOverlayTitle').textContent, /Chưa đủ lon/);
  el(h, 'sbOverlayAction').click();
  assert.equal(h.game.getModel().view().status, 'playing');
  assert.equal(h.game.getModel().view().throwsLeft, 3);
  h.close();
});

test('close during motion releases every frame and document/window listener', () => {
  const h = open(); el(h, 'sbFire').click(); h.frame();
  assert.equal(h.frames.size, 1);
  h.close();
});

test('local styling keeps touch controls at 44px, fits narrow screens, and honors reduced motion', () => {
  const css = read('scripts/games/san-bui.css');
  assert.match(css, /min-width: 44px; min-height: 44px/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /'Calibri', 'Inter', -apple-system, sans-serif/);
});

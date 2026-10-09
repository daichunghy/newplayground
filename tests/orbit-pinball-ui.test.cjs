const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/orbit-pinball-model.js');

const el = (h, id) => h.container.querySelector('#' + id);
function open(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false });
  h.baseDocumentListeners = h.document.listenerCount();
  vm.runInContext(read('scripts/games/orbit-pinball-model.js'), h.context, { filename: 'orbit-pinball-model.js' });
  vm.runInContext(read('scripts/games/orbit-pinball.js'), h.context, { filename: 'orbit-pinball.js' });
  h.game = h.context.NP_OrbitPinball.mount(h.container, h.context.NP_GameSession.start(), options);
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}

test('mounts the original table, six target marks, score, three balls and accessible controls', () => {
  const h = open();
  for (const id of ['opTable', 'opScore', 'opBalls', 'opTargets', 'opLeft', 'opRight', 'opLaunch', 'opPause', 'opRestart', 'opOverlay']) assert.ok(el(h, id), id);
  assert.equal(h.game.getModel().view().status, 'ready');
  assert.equal(el(h, 'opBalls').textContent, '3');
  assert.equal(el(h, 'opTargets').textContent, '0 / 6');
  assert.match(el(h, 'opDynamic').innerHTML, /op-bumper/);
  assert.match(read('scripts/games/orbit-pinball.css'), /max-width: 360px/);
  assert.match(read('scripts/games/orbit-pinball.css'), /min-height: 50px/);
  assert.match(read('scripts/games/orbit-pinball.js'), /pagehide/);
  h.close();
});

test('launch, touch flippers, keyboard controls and pause/resume use one model and RAF loop', () => {
  const h = open(), model = h.game.getModel();
  el(h, 'opLaunch').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(h.frames.size, 1);

  el(h, 'opLeft').dispatch('pointerdown', { pointerType: 'touch', preventDefault() {} });
  assert.equal(model.view().flippers.left, true);
  el(h, 'opLeft').dispatch('pointerup');
  assert.equal(model.view().flippers.left, false);
  el(h, 'opRight').dispatch('pointerdown', { pointerType: 'touch', preventDefault() {} });
  assert.equal(model.view().flippers.right, true);
  el(h, 'opRight').dispatch('pointercancel');
  assert.equal(model.view().flippers.right, false);

  h.container.dispatch('keydown', { key: 'ArrowLeft', repeat: false });
  assert.equal(model.view().flippers.left, true);
  h.container.dispatch('keyup', { key: 'ArrowLeft' });
  assert.equal(model.view().flippers.left, false);
  h.container.dispatch('keydown', { key: 'd', repeat: false });
  assert.equal(model.view().flippers.right, true);
  h.container.dispatch('keyup', { key: 'd' });
  h.frame(); h.frame();
  assert.ok(model.view().ticks > 0);

  h.container.dispatch('keydown', { key: 'p', repeat: false });
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  assert.equal(el(h, 'opOverlay').hidden, false);
  el(h, 'opOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(h.frames.size, 1);
  h.container.dispatch('keydown', { key: 'r', repeat: false });
  assert.equal(model.view().status, 'ready');
  assert.equal(model.view().score, 0);
  assert.equal(h.frames.size, 0);
  h.close();
});

test('a real final-target collision renders a win overlay and replay resets the table', () => {
  const state = M.initialState(), finalTarget = M.TARGETS[5];
  state.status = 'playing'; state.ballsLeft = 2;
  for (const target of M.TARGETS) state.targets[target.id] = target.id !== finalTarget.id;
  state.ball = { x: finalTarget.x, y: finalTarget.y - finalTarget.height / 2 - M.BALL_RADIUS + 1, vx: 0, vy: 260 };
  const h = open({ initialState: state }), model = h.game.getModel();
  h.frame(); h.frame();
  assert.equal(model.view().status, 'won');
  assert.equal(el(h, 'opOverlayTitle').textContent, 'Orbit cleared!');
  assert.match(el(h, 'opOverlayCopy').textContent, /all six targets/i);
  assert.equal(h.frames.size, 0);
  el(h, 'opOverlayAction').click();
  assert.equal(model.view().status, 'ready');
  assert.equal(model.view().targetHits, 0);
  h.close();
});

test('hidden tab and pagehide pause without auto-resuming; session stop releases all handlers', () => {
  const h = open(), model = h.game.getModel();
  el(h, 'opLaunch').click(); h.frame(); h.frame();
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  el(h, 'opPause').click();
  assert.equal(model.view().status, 'playing');
  h.window.dispatch('pagehide');
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  h.close();
  assert.equal(h.window.listenerCount(), 0);
  assert.equal(h.document.listenerCount(), h.baseDocumentListeners);
});

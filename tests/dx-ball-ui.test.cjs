// DOM/event/canvas doubles exercise controls and cleanup; this is not browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/dx-ball-model.js');
const get = (h, id) => h.container.querySelector('#' + id);

function launch() {
  const h = harness({ loadEngines: false, loadApp: false });
  h.context.NEWPLAYGROUND_MUTED = false;
  if (h.context.NP_Audio) h.context.NP_Audio.isMuted = false;
  h.context.NP_DxBallModel = M;
  vm.runInContext(read('scripts/games/dx-ball.js'), h.context, { filename: 'scripts/games/dx-ball.js' });
  const sounds = [], audioInits = [];
  h.mountResult = h.context.NP_DxBall.mount(h.container, h.context.NP_GameSession.start(), {
    init: () => audioInits.push(true), playTone: (...args) => sounds.push(args)
  });
  h.sounds = sounds;
  h.audioInits = audioInits;
  return h;
}

function close(h) {
  h.context.NP_GameSession.stop();
  h.container.innerHTML = '';
  assertStopped(h);
  assert.deepEqual(h.errors, []);
}

test('play surface has original title, score, level, lives, pause and restart controls', () => {
  const h = launch();
  for (const id of ['dbCanvas', 'dbScore', 'dbLevel', 'dbLives', 'dbPause', 'dbRestart', 'dbOverlay', 'dbStart']) assert.ok(get(h, id), id);
  assert.equal(h.mountResult.getModel().view().status, 'ready');
  assert.equal(get(h, 'dbCanvas').focused, undefined);
  assert.match(read('scripts/games/dx-ball.js'), /Space phóng/);
  const css = read('scripts/games/dx-ball.css');
  assert.match(css, /min-height:44px/); assert.match(css, /touch-action:none/); assert.match(css, /prefers-reduced-motion/);
  close(h);
});

test('canvas pointer launches and steers; keyboard movement updates the deterministic paddle', () => {
  const h = launch(), canvas = get(h, 'dbCanvas'), model = h.mountResult.getModel();
  canvas.dispatch('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 180, preventDefault() {} });
  assert.equal(model.view().status, 'playing'); assert.notEqual(model.view().paddle.targetX, null);
  h.frame(); // Establish the first animation timestamp before measuring steering.
  const prior = model.view().paddle.x;
  canvas.dispatch('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 520, buttons: 1 });
  h.frame(); assert.ok(model.view().paddle.x > prior);
  canvas.dispatch('pointerup', { pointerId: 7 });
  assert.equal(model.view().paddle.targetX, null);
  canvas.dispatch('pointerleave');
  assert.ok(h.sounds.some(args => args[0] === 520), 'launch tone is generated locally through the existing audio engine');
  assert.equal(h.audioInits.length, 1, 'the first user gesture unlocks audio');

  const before = model.view().paddle.x;
  h.container.dispatch('keydown', { key: 'a', repeat: false, target: canvas }); h.frame();
  assert.ok(model.view().paddle.x < before);
  h.container.dispatch('keyup', { key: 'a', target: canvas });
  close(h);
});

test('Space launches once, P pauses, continue resumes, and restart returns to a fresh serve', () => {
  const h = launch(), canvas = get(h, 'dbCanvas'), model = h.mountResult.getModel();
  get(h, 'dbStart').click(); assert.equal(model.view().status, 'playing'); assert.equal(h.frames.size, 1);
  const firstTicks = model.view().ticks;
  h.container.dispatch('keydown', { key: ' ', repeat: false, target: canvas });
  assert.equal(model.view().status, 'playing');
  h.frame(); h.frame(); assert.ok(model.view().ticks > firstTicks);

  h.container.dispatch('keydown', { key: 'p', repeat: false, target: canvas });
  assert.equal(model.view().status, 'paused'); assert.equal(h.frames.size, 0);
  const pausedTicks = model.view().ticks; h.frame(); assert.equal(model.view().ticks, pausedTicks);
  get(h, 'dbStart').click(); assert.equal(model.view().status, 'playing'); assert.equal(h.frames.size, 1);
  get(h, 'dbPause').click(); assert.equal(model.view().status, 'paused');
  get(h, 'dbStart').click(); assert.equal(model.view().status, 'playing');
  get(h, 'dbRestart').click();
  const fresh = h.mountResult.getModel();
  assert.equal(fresh.view().status, 'ready');
  assert.equal(fresh.view().score, 0); assert.equal(fresh.view().lives, M.MAX_LIVES); assert.equal(h.frames.size, 0);
  close(h);
});

test('window blur pauses active play and closing releases frames and listeners', () => {
  const h = launch(); get(h, 'dbStart').click(); assert.equal(h.frames.size, 1);
  h.window.dispatch('blur'); assert.equal(h.mountResult.getModel().view().status, 'paused'); assert.equal(h.frames.size, 0);
  const canvas = get(h, 'dbCanvas');
  close(h);
  canvas.dispatch('pointerdown', { pointerId: 1, clientX: 80 });
  assert.equal(h.frames.size, 0); assert.equal(h.window.listenerCount(), 0);
});

test('exact catalog route mounts the original Phá Gạch candidate and cover',()=>{const h=harness();assert.equal(h.context.openGameById('pha-gach-dx-ball'),true);assert.ok(h.container.querySelector('#dbCanvas'));assert.ok(h.container.querySelector('#dbScore'));assert.match(read('app.js'),/'pha-gach-dx-ball': 'assets\/pha-gach-original\.svg'/);assert.doesNotMatch(h.container.innerHTML,/DX-Ball|Welch|Longbow/i);h.context.closeGameModal();assertStopped(h);assert.deepEqual(h.errors,[]);});

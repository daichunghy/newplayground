// DOM/event and Canvas doubles cover campaign controls and lifecycle; they are not browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/flappy-bird-model.js');
const KEY = 'np_mach_gio_progress_v1';
const el = (h, id) => h.container.querySelector('#' + id);
function launch(storage = new Map()) {
  const h = harness({ loadEngines: false, loadApp: false, storage });
  h.context.NP_FlappyBirdModel = M;
  vm.runInContext(read('scripts/games/flappy-bird.js'), h.context, { filename: 'scripts/games/flappy-bird.js' });
  h.mountResult = h.context.NP_FlappyBird.mount(h.container, h.context.NP_GameSession.start());
  return h;
}
function close(h) {
  h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []);
}

test('three named route buttons show the current course and accessible progress controls', () => {
  const h = launch();
  for (const id of ['fgCanvas', 'fgScore', 'fgLives', 'fgBest', 'fgPause', 'fgOverlay', 'fgStart', 'fgStage0', 'fgStage1', 'fgStage2']) assert.ok(el(h, id), id);
  assert.equal(h.mountResult.getModel().view().status, 'ready');
  assert.equal(el(h, 'fgCanvas').focused, true);
  assert.equal(el(h, 'fgStageName').textContent, 'Chặng 1/3 · Ngõ sớm');
  assert.equal(el(h, 'fgStage0').getAttribute('aria-current'), 'step');
  assert.equal(el(h, 'fgStage0').getAttribute('aria-label'), 'Chặng 1: Ngõ sớm, 0 trên 3 sao');
  assert.equal(el(h, 'fgStage1').disabled, true); assert.equal(el(h, 'fgStage2').disabled, true);
  assert.match(el(h, 'fgCanvas').getAttribute('aria-label'), /Space/);
  assert.match(read('scripts/games/flappy-bird.css'), /min-height: 44px/);
  assert.match(read('scripts/games/flappy-bird.css'), /\.fg-stage-button[^}]*min-height: 44px/);
  assert.match(read('scripts/games/flappy-bird.css'), /prefers-reduced-motion/);
  close(h);
});

test('saved unlocks and selected stage restore without restoring midair input', () => {
  const saved = { version: M.SAVE_VERSION, unlockedStage: 1, selectedStage: 1, stars: [2, 0, 0] };
  const storage = new Map([[KEY, JSON.stringify(saved)]]);
  const first = launch(storage);
  assert.equal(first.mountResult.getModel().view().stageIndex, 1);
  assert.equal(el(first, 'fgStageName').textContent, 'Chặng 2/3 · Bờ kênh');
  assert.equal(el(first, 'fgStage0').disabled, false); assert.equal(el(first, 'fgStage1').disabled, false);
  assert.equal(el(first, 'fgStage2').disabled, true);
  assert.equal(el(first, 'fgStage1').getAttribute('aria-current'), 'step');
  el(first, 'fgStage0').click();
  assert.equal(first.mountResult.getModel().view().stageIndex, 0);
  assert.equal(JSON.parse(storage.get(KEY)).selectedStage, 0);
  close(first);
  const reopened = launch(storage);
  assert.equal(reopened.mountResult.getModel().view().status, 'ready');
  assert.equal(reopened.mountResult.getModel().view().stageIndex, 0);
  assert.deepEqual(Array.from(reopened.mountResult.getModel().view().stars), [2, 0, 0]);
  close(reopened);
});

test('Space and touch start a flight; pause, visibility, retry, and close release the frame loop', () => {
  const h = launch(), canvas = el(h, 'fgCanvas');
  canvas.dispatch('pointerdown', { pointerId: 1, preventDefault() {} });
  assert.equal(h.mountResult.getModel().view().status, 'playing');
  assert.equal(h.frames.size, 1);
  const first = h.mountResult.getModel().view().player.vy;
  h.container.dispatch('keydown', { key: ' ', repeat: true, target: canvas });
  assert.equal(h.mountResult.getModel().view().player.vy, first);
  h.container.dispatch('keydown', { key: ' ', repeat: false, target: canvas });
  assert.equal(h.mountResult.getModel().view().player.vy, M.FLAP);
  h.window.dispatch('blur'); assert.equal(h.mountResult.isPaused(), true); assert.equal(h.frames.size, 0);
  el(h, 'fgStart').click(); assert.equal(h.mountResult.isPaused(), false); assert.equal(h.frames.size, 1);
  el(h, 'fgPause').click(); assert.equal(h.mountResult.isPaused(), true); assert.equal(h.frames.size, 0);
  el(h, 'fgStart').click(); assert.equal(h.mountResult.isPaused(), false); assert.equal(h.frames.size, 1);
  for (let i = 0; i < 700 && h.mountResult.getModel().view().status !== 'over'; i++) h.frame();
  assert.equal(h.mountResult.getModel().view().status, 'over');
  assert.equal(h.mountResult.getModel().view().lives, 0);
  el(h, 'fgStart').click();
  assert.equal(h.mountResult.getModel().view().status, 'playing');
  assert.equal(h.mountResult.getModel().view().lives, M.MAX_LIVES);
  assert.equal(h.frames.size, 1);
  close(h);
});

test('corrupt progress is preserved and local-storage failure does not block play', () => {
  const storage = new Map([[KEY, '{broken']]);
  const h = launch(storage);
  assert.equal(h.mountResult.getModel().view().status, 'ready');
  assert.equal(storage.get(KEY), '{broken'); assert.equal(storage.get(KEY + '_backup'), '{broken');
  assert.equal(el(h, 'fgSave').hidden, false);
  el(h, 'fgStart').click(); assert.equal(h.mountResult.getModel().view().status, 'playing');
  close(h);
});

test('closing during active flight cancels animation and removes handlers', () => {
  const h = launch(); el(h, 'fgStart').click(); assert.equal(h.frames.size, 1); close(h);
});

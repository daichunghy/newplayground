const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

const ROOT = 'scripts/games/';
const SAVE_KEY = 'np_mam_chop_campaign_v1';
const RECOVERY_KEY = SAVE_KEY + '_recovery';
function launch(storage = new Map(), options = {}) {
  const h = harness({ loadEngines: false, loadApp: false, storage, reducedMotion: !!options.reducedMotion });
  vm.runInContext(read(ROOT + 'mam-chop-model.js'), h.context, { filename: ROOT + 'mam-chop-model.js' });
  vm.runInContext(read(ROOT + 'mam-chop.js'), h.context, { filename: ROOT + 'mam-chop.js' });
  const session = h.context.NP_GameSession.start();
  const mounted = h.context.NP_MamChop.mount(h.container, session, options.audio || null);
  const el = id => h.container.querySelector('#' + id);
  return { h, session, mounted, el };
}
function key(h, keyValue, extra = {}) { h.window.dispatch('keydown', { key: keyValue, code: keyValue === ' ' ? 'Space' : keyValue, ...extra }); }
function keyup(h, keyValue) { h.window.dispatch('keyup', { key: keyValue }); }
function frames(h, count) { for (let i = 0; i < count; i++) h.frame(); }
function close(h) { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []); }

test('a fresh run opens on the authored stage with health and concise controls', () => {
  const x = launch();
  assert.equal(x.mounted.getModel().status, 'playing');
  assert.equal(x.mounted.getModel().stageIndex, 0);
  assert.equal(x.el('mcStageNav').querySelector('#mcStage1').disabled, true);
  assert.equal(x.el('mcStageNav').querySelector('#mcStage2').disabled, true);
  assert.equal(x.h.frames.size, 1);
  assert.equal(x.el('mcCanvas').getAttribute('width'), '960');
  assert.equal(x.el('mcCanvas').getAttribute('height'), '540');
  assert.match(x.el('mcCanvas').getAttribute('aria-label'), /nhảy bằng Space/);
  assert.equal(x.el('mcOverlay').hidden, true);
  assert.match(x.el('mcStatus').getAttribute('aria-live'), /polite/);
  assert.match(x.h.container.innerHTML, /A D đi/);
  assert.match(read(ROOT + 'mam-chop.css'), /min-height: 52px/);
  assert.match(read(ROOT + 'mam-chop.css'), /min-width: 48px; min-height: 48px/);
  assert.match(read(ROOT + 'mam-chop.css'), /\.mc-game :focus-visible/);
  assert.doesNotMatch(x.h.container.innerHTML, /Mega Man|Rockman|Capcom|Robot Master/i);
  close(x.h);
});

test('pause freezes the loop, clears held inputs, and resumes without a duplicate frame', () => {
  const x = launch(); frames(x.h, 2);
  const model = x.mounted.getModel(), tick = model.tick;
  key(x.h, 'ArrowRight');
  x.el('mcPause').click();
  assert.equal(x.mounted.isPaused(), true);
  assert.equal(x.el('mcOverlay').hidden, false);
  assert.equal(x.el('mcOverlayTitle').textContent, 'Tạm dừng');
  assert.equal(x.el('mcResume').hidden, false);
  assert.equal(x.h.frames.size, 0);
  assert.equal(model.input.right, false, 'pause releases held keyboard input');
  key(x.h, 'ArrowLeft'); frames(x.h, 4);
  assert.equal(model.tick, tick, 'the paused simulation stays frozen');
  assert.equal(model.input.left, false, 'new movement is ignored while paused');

  x.el('mcResume').click();
  assert.equal(x.mounted.isPaused(), false);
  assert.equal(x.h.frames.size, 1);
  frames(x.h, 2);
  assert.equal(x.h.frames.size, 1);
  close(x.h);
});

test('blur and hidden-tab interruptions auto-pause; resuming waits until the tab is visible', () => {
  const x = launch(); frames(x.h, 1);
  x.h.window.dispatch('blur');
  assert.equal(x.mounted.isPaused(), true);
  assert.equal(x.h.frames.size, 0);
  x.h.document.hidden = true;
  assert.equal(x.mounted.resume(), false);
  x.h.document.hidden = false;
  assert.equal(x.mounted.resume(), true);
  assert.equal(x.h.frames.size, 1);
  close(x.h);
});

test('original procedural sound effects respect the shared mute control', () => {
  const notes = [], audio = { playTone: (...args) => notes.push(args) };
  const x = launch(new Map(), { audio });
  x.h.context.NEWPLAYGROUND_MUTED = false;
  if (x.h.context.NP_Audio) x.h.context.NP_Audio.isMuted = false;
  key(x.h, ' '); keyup(x.h, ' ');
  key(x.h, 'z'); keyup(x.h, 'z');
  assert.equal(notes.length, 2);
  assert.ok(notes.every(note => Number.isFinite(note[0]) && note[2] < 0.2));
  x.h.context.NEWPLAYGROUND_MUTED = true;
  if (x.h.context.NP_Audio) x.h.context.NP_Audio.isMuted = true;
  key(x.h, ' '); keyup(x.h, ' ');
  assert.equal(notes.length, 2, 'muted gameplay never schedules new tones');
  close(x.h);
});

test('keyboard movement, jump edge, shot tap, and key-up do not stick', () => {
  const x = launch(), start = x.mounted.getModel().player.x;
  key(x.h, 'ArrowRight'); frames(x.h, 8);
  assert.ok(x.mounted.getModel().player.x > start);
  keyup(x.h, 'ArrowRight'); const stoppedAt = x.mounted.getModel().player.x;
  frames(x.h, 8); assert.equal(x.mounted.getModel().player.x, stoppedAt);
  key(x.h, ' ', { repeat: false }); frames(x.h, 3);
  assert.ok(x.mounted.getModel().player.y < 428);
  key(x.h, ' ', { repeat: true }); frames(x.h, 3);
  keyup(x.h, ' '); frames(x.h, 70);
  assert.equal(x.mounted.getModel().player.grounded, true);
  key(x.h, 'z'); frames(x.h, 3); keyup(x.h, 'z');
  assert.ok(x.mounted.getModel().shots.some(shot => shot.kind === 'normal'));
  close(x.h);
});

test('touch left, jump, and held fire share the game model and release on cancel', () => {
  const x = launch(), left = x.h.container.querySelectorAll('.mc-touch').find(button => button.dataset.action === 'left');
  left.dispatch('pointerdown', { pointerId: 17, button: 0 }); frames(x.h, 6);
  const moved = x.mounted.getModel().player.x;
  assert.ok(moved < 66);
  x.h.window.dispatch('pointercancel', { pointerId: 17 }); frames(x.h, 6);
  assert.equal(x.mounted.getModel().player.x, moved);

  const fire = x.h.container.querySelectorAll('.mc-touch').find(button => button.dataset.action === 'fire');
  fire.dispatch('pointerdown', { pointerId: 18, button: 0 }); frames(x.h, 46);
  x.h.window.dispatch('pointerup', { pointerId: 18 });
  assert.ok(x.mounted.getModel().shots.some(shot => shot.kind === 'charged'));
  close(x.h);
});

test('clear overlay and replay reset the model without adding a second loop', () => {
  const x = launch(), M = x.h.context.NP_MamChopModel, model = x.mounted.getModel();
  model.player.x = M.WORLD_W - 40;
  frames(x.h, 3);
  assert.equal(model.status, 'won');
  assert.equal(x.el('mcOverlay').hidden, false);
  assert.match(x.el('mcOverlayTitle').textContent, /Cổng đã mở/);
  assert.equal(x.el('mcNext').hidden, false);
  x.el('mcReplay').click();
  assert.equal(x.mounted.getModel().status, 'playing');
  assert.equal(x.mounted.getModel().player.health, 4);
  assert.equal(x.el('mcOverlay').hidden, true);
  assert.equal(x.h.frames.size, 1);
  close(x.h);
});

test('stage wins unlock one next route, persist progress, and resume the current stage on reopen', () => {
  const storage = new Map(), x = launch(storage), M = x.h.context.NP_MamChopModel;
  assert.equal(x.el('mcStage1').disabled, true);
  x.mounted.getModel().player.x = M.STAGES[0].exitX - x.mounted.getModel().player.w + 1;
  frames(x.h, 3);
  assert.equal(x.mounted.getModel().unlockedStage, 1);
  assert.equal(x.el('mcStage1').disabled, false);
  assert.equal(x.el('mcStage2').disabled, true);
  x.el('mcNext').click();
  assert.equal(x.mounted.getModel().stageIndex, 1);
  assert.equal(x.el('mcStage1').getAttribute('aria-current'), 'step');
  assert.equal(JSON.parse(storage.get(SAVE_KEY)).state.stageIndex, 1);
  close(x.h);

  const resumed = launch(storage);
  assert.equal(resumed.mounted.getModel().stageIndex, 1);
  assert.equal(resumed.mounted.getModel().unlockedStage, 1);
  assert.equal(resumed.el('mcStage2').disabled, true);
  close(resumed.h);
});

test('active save restores the exact checkpoint but releases held keys; corrupt and future saves are preserved', () => {
  const M = require('../scripts/games/mam-chop-model.js');
  const source = M.create(1, { unlockedStage: 2, bestTicks: [120, null, 900] });
  source.player.x = 1000; source.player.checkpoint = 1;
  M.setButton(source, 'right', true); M.setButton(source, 'fire', true); M.stepTicks(source, 7);
  const storage = new Map([[SAVE_KEY, JSON.stringify(M.serialize(source))]]), x = launch(storage);
  const savedState = x.mounted.getModel();
  assert.equal(savedState.stageIndex, 1); assert.equal(savedState.player.x, source.player.x);
  assert.equal(savedState.input.right, false); assert.equal(savedState.input.fire, false);
  assert.equal(savedState.input.chargeTicks, 0); assert.deepEqual(Array.from(savedState.bestTicks), [120, null, 900]);
  close(x.h);

  const futureRaw = JSON.stringify({ version: 99, opaque: 'keep me' });
  const future = launch(new Map([[SAVE_KEY, futureRaw]]));
  assert.equal(future.h.stored.get(SAVE_KEY), futureRaw);
  assert.equal(future.el('mcSaveNotice').hidden, false);
  close(future.h);

  const damagedRaw = '{broken save';
  const damaged = launch(new Map([[SAVE_KEY, damagedRaw]]));
  assert.equal(damaged.h.stored.get(RECOVERY_KEY), damagedRaw);
  assert.equal(JSON.parse(damaged.h.stored.get(SAVE_KEY)).version, M.SAVE_VERSION);
  assert.equal(damaged.el('mcSaveNotice').hidden, false);
  close(damaged.h);
});

test('hazard announcements stay brief instead of masking the status for the whole stage', () => {
  const M = require('../scripts/games/mam-chop-model.js'), game = M.create(1, { unlockedStage: 1 });
  const hazard = M.STAGES[1].hazards[0];
  game.tick = hazard.period - hazard.warningTicks - hazard.offset - 1;
  const storage = new Map([[SAVE_KEY, JSON.stringify(M.serialize(game))]]), x = launch(storage);
  frames(x.h, 3);
  assert.match(x.el('mcStatus').textContent, /Sương sắp phun/);
  frames(x.h, 120);
  assert.doesNotMatch(x.el('mcStatus').textContent, /Sương sắp phun/);
  close(x.h);
});

test('reduced-motion preference removes decorative pulses without changing play input', () => {
  const x = launch(new Map(), { reducedMotion: true });
  const state = x.mounted.getModel();
  assert.equal(x.mounted.isReducedMotion(), true);
  assert.equal(x.h.container.querySelector('.mc-game').dataset.motion, 'reduced');
  const before = state.player.x; key(x.h, 'ArrowRight'); frames(x.h, 4); keyup(x.h, 'ArrowRight');
  assert.ok(state.player.x > before, 'reduced motion leaves required movement responsive');
  close(x.h);
});

test('session teardown cancels animation and every global input listener', () => {
  const x = launch(); frames(x.h, 2); close(x.h);
  assert.equal(x.h.window.listenerCount(), 0);
});

test('standalone preview remains available and the shared route opens the original game', () => {
  const page = read('candidates/mam-chop/index.html'), source = read(ROOT + 'mam-chop.js');
  assert.match(page, /mam-chop-model\.js/);
  assert.match(page, /\.\.\/\.\.\/scripts\/game-session\.js/);
  assert.match(source, /Mầm Chớp/);
  assert.doesNotMatch(page + source, /rockman-mega-man|Mega Man|Rockman/);
  assert.match(read('scripts/game-registry.js'), /'rockman-mega-man': 'launchMamChop'/);
});

test('the exact catalog route launches Mầm Chớp with original cover and one owned loop', () => {
  const h = harness();
  assert.equal(h.context.openGameById('rockman-mega-man'), true);
  assert.ok(h.container.querySelector('#mcCanvas'));
  assert.match(h.container.innerHTML, /Mầm Chớp/);
  assert.match(read('app.js'), /'rockman-mega-man': 'assets\/mam-chop-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'rockman_cover\.jpg'/);
  h.context.closeGameModal();
  assertStopped(h);
});

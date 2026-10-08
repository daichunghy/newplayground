const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/feeding-frenzy-model.js');
const el = (h, id) => h.container.querySelector('#' + id);
function close(h) { h.context.closeGameModal(); assertStopped(h); assert.deepEqual(h.errors, []); }
function direct() { const h = harness({ loadApp: false }); h.mount = h.context.NP_FeedingFrenzy.mount(h.container, h.context.NP_GameSession.start(), h.context.NP_AudioEngine); return h; }

test('the catalog route opens the short original growth game immediately', () => {
  const h = harness();
  assert.equal(h.context.openGameById('feeding-frenzy'), true);
  assert.ok(el(h, 'feedingCanvas'));
  assert.equal(el(h, 'feedingScore').textContent, `0 / ${M.TARGET}`);
  assert.equal(el(h, 'feedingLives').textContent, '3');
  assert.equal(h.frames.size, 1);
  assert.match(read('app.js'), /'feeding': 'assets\/feeding-frenzy-original\.svg'/);
  assert.doesNotMatch(h.container.innerHTML, /clam|pearl|frenzy|dash|Nemo/i);
  close(h);
});

test('keyboard and held pointer input move the fish while remaining inside the tank', () => {
  const h = direct(), canvas = el(h, 'feedingCanvas'), start = h.mount.getModel().view().player;
  canvas.dispatch('keydown', { key: 'ArrowRight' }); h.frame(); h.frame(); h.window.dispatch('keyup', { key: 'ArrowRight' });
  assert.ok(h.mount.getModel().view().player.x > start.x);
  const before = h.mount.getModel().view().player.x;
  canvas.dispatch('pointerdown', { button: 0, clientX: 600, clientY: 210 }); h.frame(); h.frame();
  assert.ok(h.mount.getModel().view().player.x > before);
  h.window.dispatch('pointerup');
  for (let i = 0; i < 80; i += 1) h.frame();
  const p = h.mount.getModel().view().player;
  assert.ok(p.x >= p.radius && p.x <= M.WIDTH - p.radius);
  assert.ok(p.y >= p.radius && p.y <= M.HEIGHT - p.radius);
  h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []);
});

test('pause, resume, restart, blur and closing release the owned frame', () => {
  const h = direct();
  const canvas = el(h, 'feedingCanvas');
  el(h, 'feedingPause').dispatch('click', { detail: 1 }); assert.equal(h.frames.size, 0); assert.equal(h.mount.isPaused(), true);
  el(h, 'feedingAgain').dispatch('click', { detail: 1 }); assert.equal(h.frames.size, 1); assert.equal(h.mount.isPaused(), false);
  assert.equal(canvas.focused, true, 'resuming should return keyboard focus to the canvas input target');
  h.frame(); const before = h.mount.getModel().view().player.x;
  canvas.dispatch('keydown', { key: 'ArrowRight' }); h.frame();
  assert.ok(h.mount.getModel().view().player.x > before, 'keyboard steering remains available after resume');
  h.window.dispatch('keyup', { key: 'ArrowRight' });
  el(h, 'feedingRestart').dispatch('click', { detail: 1 }); assert.equal(h.mount.getModel().view().score, 0); assert.equal(h.frames.size, 1);
  h.window.dispatch('blur'); assert.equal(h.frames.size, 0); assert.equal(h.mount.isPaused(), true);
  h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []);
});

test('canvas instructions, touch targets and the legacy cover exclusion stay explicit', () => {
  const h = harness(); h.context.openGameById('feeding-frenzy');
  assert.equal(el(h, 'feedingCanvas').getAttribute('tabindex'), '0');
  assert.equal(el(h, 'feedingCanvas').getAttribute('aria-live'), null);
  assert.match(read('scripts/games/feeding-frenzy.css'), /\.feeding-btn\{[^}]*min-width:44px;min-height:44px/);
  assert.match(read('scripts/games/feeding-frenzy.css'), /\.feeding-help summary\{[^}]*min-width:44px;min-height:44px/);
  assert.match(read('scripts/games/feeding-frenzy.css'), /\.feeding-board canvas\{[^}]*touch-action:none/);
  assert.match(read('scripts/release-preflight.mjs'), /'ca_lon_nuot_ca_be_cover\.png'/);
  close(h);
});

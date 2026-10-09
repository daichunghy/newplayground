// DOM, event and Canvas doubles cover the local UI lifecycle; they are not browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/ban-ga-vu-tru-model.js');

const el = (h, id) => h.container.querySelector('#' + id);

function launch() {
  const h = harness({ loadEngines: false, loadApp: false });
  h.context.NP_BanGaVuTruModel = M;
  vm.runInContext(read('scripts/games/ban-ga-vu-tru.js'), h.context, { filename: 'scripts/games/ban-ga-vu-tru.js' });
  h.mountResult = h.context.NP_BanGaVuTru.mount(h.container, h.context.NP_GameSession.start());
  return h;
}

function close(h) {
  h.context.NP_GameSession.stop(); h.container.innerHTML = '';
  assertStopped(h); assert.deepEqual(h.errors, []);
}

test('mount starts immediately with a small HUD, accessible canvas and touch controls', () => {
  const h = launch();
  for (const id of ['bgtCanvas', 'bgtScore', 'bgtTime', 'bgtHull', 'bgtWave', 'bgtWaveProgress', 'bgtLeft', 'bgtRight', 'bgtFire', 'bgtPause', 'bgtRestart', 'bgtOverlay']) assert.ok(el(h, id), id);
  assert.equal(h.mountResult.getModel().view().status, 'playing');
  assert.equal(el(h, 'bgtWave').textContent, 'Chặng 1/3 · Mạch Sương');
  assert.equal(el(h, 'bgtWaveProgress').textContent, '0/3');
  assert.equal(el(h, 'bgtCanvas').focused, true);
  assert.match(el(h, 'bgtCanvas').getAttribute('aria-label'), /Lái trái phải/);
  assert.match(read('scripts/games/ban-ga-vu-tru.js'), /Space\/Bắn/);
  assert.match(read('scripts/games/ban-ga-vu-tru.css'), /min-height:46px/);
  assert.match(read('scripts/games/ban-ga-vu-tru.css'), /prefers-reduced-motion/);
  close(h);
});

test('keyboard and held touch buttons steer and fire; releasing input stops it', () => {
  const h = launch(), model = h.mountResult.getModel();
  const startX = model.view().player.x;
  h.container.dispatch('keydown', { key: 'ArrowLeft' });
  for (let i = 0; i < 9; i++) h.frame();
  h.container.dispatch('keyup', { key: 'ArrowLeft' });
  assert.ok(model.view().player.x < startX);

  const x = model.view().player.x;
  el(h, 'bgtRight').dispatch('pointerdown', { pointerId: 7, preventDefault() {} });
  for (let i = 0; i < 9; i++) h.frame();
  h.window.dispatch('pointerup', { pointerId: 7 });
  assert.ok(model.view().player.x > x);

  const before = model.view().ticks;
  h.container.dispatch('keydown', { key: ' ' });
  for (let i = 0; i < 9; i++) h.frame();
  h.container.dispatch('keyup', { key: ' ' });
  assert.ok(model.view().ticks > before);
  assert.ok(model.view().shots.length > 0 || model.view().score > 0);

  const count = h.window.listenerCount();
  el(h, 'bgtRestart').click();
  assert.equal(h.window.listenerCount(), count, 'restart does not attach more global listeners');
  close(h);
});

test('pause, visibility loss, resume, game over and replay remain recoverable', () => {
  const h = launch(), model = h.mountResult.getModel();
  el(h, 'bgtPause').click();
  assert.equal(model.view().status, 'paused');
  assert.equal(el(h, 'bgtOverlay').hidden, false);
  const pausedAt = model.view().ticks;
  for (let i = 0; i < 4; i++) h.frame();
  assert.equal(model.view().ticks, pausedAt);
  el(h, 'bgtContinue').click();
  assert.equal(model.view().status, 'playing');

  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false; el(h, 'bgtContinue').click();
  for (let i = 0; i < 700 && model.view().status === 'playing'; i++) h.frame();
  assert.equal(model.view().status, 'over');
  assert.equal(el(h, 'bgtOverlay').hidden, false);
  assert.match(el(h, 'bgtOverlayText').textContent, /điểm/);
  el(h, 'bgtContinue').click();
  assert.equal(h.mountResult.getModel().view().status, 'playing');
  assert.equal(h.mountResult.getModel().view().hull, M.MAX_HULL);
  close(h);
});

test('window blur pauses play and closing releases RAF and all event handlers', () => {
  const h = launch();
  h.frame(); h.window.dispatch('blur');
  assert.equal(h.mountResult.getModel().view().status, 'paused');
  assert.equal(h.frames.size, 0);
  close(h);
});


test('exact catalog route opens the original solo arcade and cover',()=>{const h=harness();assert.equal(h.context.openGameById('ban-ga-vu-tru'),true);assert.ok(h.container.querySelector('#bgtCanvas'));assert.match(read('app.js'),/'ban-ga-vu-tru': 'assets\/ban_ga_vu_tru_original\.svg'/);assert.doesNotMatch(h.container.innerHTML.replace(/<link\b[^>]*>/gi,''),/Chicken Invaders|InterAction|drumstick/i);h.context.closeGameModal();assert.equal(h.frames.size,0);assert.equal(h.window.listenerCount(),0);assert.deepEqual(h.errors,[]);});

test('the original shooter assets are included once in the shell and test harness',()=>{
  const html=read('index.html');
  for(const file of ['ban-ga-vu-tru.css','ban-ga-vu-tru-model.js','ban-ga-vu-tru.js']) assert.equal(html.match(new RegExp(file.replaceAll('.','\\.'),'g'))?.length,1,file);
  const harnessSource=read('tests/support/browser-harness.cjs');
  assert.equal(harnessSource.match(/scripts\/games\/ban-ga-vu-tru-model\.js/g)?.length,1);
});

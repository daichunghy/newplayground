const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const M = require('../scripts/games/ban-bi-ve-model.js');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

const SAVE_KEY = 'np_ban_bi_ve_v1';
const BACKUP_KEY = `${SAVE_KEY}_recovery`;
const el = (h, id) => h.container.querySelector(`#${id}`);
const click = (h, id) => el(h, id).dispatch('click');
const plain = value => JSON.parse(JSON.stringify(value));

function setup(options = {}) {
  const storage = options.storage || new Map();
  const h = harness({ loadEngines: false, loadApp: false, storage });
  vm.runInContext(read('scripts/games/ban-bi-ve-model.js'), h.context, { filename: 'ban-bi-ve-model.js' });
  vm.runInContext(read('scripts/games/ban-bi-ve.js'), h.context, { filename: 'ban-bi-ve.js' });
  if (options.before) options.before(h);
  h.mount = () => {
    const session = h.context.NP_GameSession.start();
    h.api = h.context.NP_BanBiVe.mount(h.container, session);
    h.canvas = el(h, 'bbvCanvas');
  };
  h.close = () => {
    h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h);
    assert.deepEqual(h.errors, []);
  };
  h.mount();
  return h;
}

function clientPoint(canvas, point) {
  const rect = canvas.getBoundingClientRect();
  return { clientX: rect.left + point.x * rect.width / 720, clientY: rect.top + point.y * rect.height / 520 };
}
function pointer(h, type, worldPoint, extra = {}) {
  h.canvas.dispatch(type, { ...clientPoint(h.canvas, worldPoint), pointerId: 1, isPrimary: true, pointerType: 'touch', button: 0, ...extra });
}
function dragShot(h) {
  const home = h.api.model().home();
  pointer(h, 'pointerdown', home);
  pointer(h, 'pointermove', { x: home.x, y: home.y - 70 });
  pointer(h, 'pointerup', { x: home.x, y: home.y - 70 });
}

test('mounts a compact visual-first board with keyboard help and a 2–4 player score row', () => {
  const h = setup();
  assert.equal(h.frames.size, 1);
  assert.equal(h.canvas.getAttribute('aria-label').includes('Enter để búng'), true);
  assert.equal(h.container.querySelectorAll('.bbv-player-option').length, 3);
  assert.equal(h.container.querySelectorAll('.bbv-score').length, 2);
  assert.equal(h.api.snapshot().targets.length, 6);
  assert.match(h.container.innerHTML, /Kéo bi cái ngược hướng muốn bắn rồi thả/);
  assert.equal(el(h, 'bbvStatus').getAttribute('aria-live'), 'polite');
  h.close();
});

test('dragging from the shooter fires once, scales to CSS canvas size, and ignores synthetic click', () => {
  const h = setup();
  h.canvas.getBoundingClientRect = () => ({ left: 30, top: 45, right: 390, bottom: 305, width: 360, height: 260 });
  const home = h.api.model().home();
  pointer(h, 'pointerdown', home);
  pointer(h, 'pointermove', { x: home.x, y: home.y - 70 });
  assert.equal(h.api.snapshot().shots, 0);
  pointer(h, 'pointerup', { x: home.x, y: home.y - 70 });
  h.canvas.dispatch('click');
  assert.equal(h.api.snapshot().shots, 1);
  assert.equal(h.api.snapshot().phase, 'moving');
  pointer(h, 'pointerup', { x: home.x, y: home.y - 70 });
  assert.equal(h.api.snapshot().shots, 1);
  h.close();
});

test('cancelled, outside, secondary and multitouch gestures never flick', () => {
  for (const scenario of ['cancel', 'outside', 'secondary', 'multitouch', 'window-release']) {
    const h = setup(), home = h.api.model().home();
    pointer(h, 'pointerdown', home);
    if (scenario === 'cancel') pointer(h, 'pointercancel', home);
    if (scenario === 'outside') pointer(h, 'pointermove', { x: -200, y: home.y });
    if (scenario === 'secondary') pointer(h, 'pointerdown', home, { button: 2 });
    if (scenario === 'multitouch') pointer(h, 'pointerdown', home, { pointerId: 2, isPrimary: false });
    if (scenario === 'window-release') h.window.dispatch('pointerup', { pointerId: 1 });
    pointer(h, 'pointerup', { x: home.x, y: home.y - 70 });
    assert.equal(h.api.snapshot().shots, 0, scenario);
    h.close();
  }
});

test('arrow keys adjust aim and force, Enter fires, and a repeated key cannot double fire', () => {
  const h = setup();
  h.canvas.dispatch('keydown', { key: 'ArrowLeft' });
  h.canvas.dispatch('keydown', { key: 'ArrowUp' });
  h.canvas.dispatch('keydown', { key: 'Enter' });
  h.canvas.dispatch('keydown', { key: 'Enter', repeat: true });
  assert.equal(h.api.snapshot().shots, 1);
  h.close();
});

test('pause blocks input and simulation, then resumes the same shot cleanly', () => {
  const h = setup(); dragShot(h);
  const before = h.api.snapshot();
  click(h, 'bbvPause');
  assert.equal(h.frames.size, 0);
  assert.equal(el(h, 'bbvCover').hidden, false);
  click(h, 'bbvFire'); h.advance(3000); h.frame();
  assert.deepEqual(h.api.snapshot(), before);
  click(h, 'bbvResume');
  assert.equal(h.frames.size, 1);
  h.frame(); h.frame(); assert.ok(h.api.snapshot().ticks > before.ticks);
  h.close();
});

test('blur, hidden document and pagehide pause without auto-resuming', () => {
  for (const event of ['blur', 'visibilitychange', 'pagehide']) {
    const h = setup(); dragShot(h);
    if (event === 'visibilitychange') { h.document.hidden = true; h.document.dispatch(event); }
    else h.window.dispatch(event);
    assert.equal(h.frames.size, 0, event);
    assert.equal(el(h, 'bbvCover').hidden, false, event);
    h.document.hidden = false; h.document.dispatch('visibilitychange');
    assert.equal(h.frames.size, 0, 'visibility alone never resumes');
    h.close();
  }
});

test('a long animation interruption pauses and a restored moving shot waits for Resume', () => {
  const h = setup(); dragShot(h); h.frame(); h.advance(2500); h.frame();
  assert.equal(h.frames.size, 0);
  assert.match(el(h, 'bbvStatus').textContent, /khoảng gián đoạn/);
  const stored = JSON.parse(h.stored.get(SAVE_KEY));
  assert.equal(stored.round.phase, 'moving');
  h.close();
  h.mount();
  assert.equal(h.frames.size, 0);
  assert.equal(el(h, 'bbvCover').hidden, false);
  assert.deepEqual(plain(h.api.snapshot()), stored.round);
  click(h, 'bbvResume'); assert.equal(h.frames.size, 1);
  h.close();
});

test('a restored completed result stays on the result screen and starts a fresh match on request', () => {
  const finished = M.create({ players: 2, seed: 33 });
  finished.state.targets = []; finished.state.score = [1, 5];
  finished.state.status = 'won'; finished.state.winners = [1];
  const storage = new Map([[SAVE_KEY, JSON.stringify({ version: 1, round: finished.serialize() })]]);
  const h = setup({ storage });
  assert.equal(h.frames.size, 0);
  assert.match(el(h, 'bbvCoverTitle').textContent, /Người 2 thắng/);
  click(h, 'bbvResume');
  assert.equal(h.api.snapshot().status, 'playing');
  assert.equal(h.api.snapshot().shots, 0);
  assert.equal(h.frames.size, 1);
  h.close();
});

test('2, 3 and 4 player controls start a fresh local match and update score colors', () => {
  const h = setup();
  h.container.querySelectorAll('.bbv-player-option').find(button => button.dataset.players === '4').click();
  assert.equal(h.api.snapshot().players, 4);
  assert.equal(h.api.snapshot().targets.length, 12);
  assert.equal(h.container.querySelectorAll('.bbv-score').length, 4);
  assert.equal(h.container.querySelectorAll('.bbv-player-option').find(button => button.dataset.players === '4').getAttribute('aria-pressed'), 'true');
  h.container.querySelectorAll('.bbv-player-option').find(button => button.dataset.players === '3').click();
  assert.equal(h.api.snapshot().players, 3);
  h.close();
});

test('closed module can reopen and the session clears all RAF and global listeners', () => {
  const h = setup();
  const baseline = [h.window.listenerCount(), h.document.listenerCount()];
  h.close();
  for (let i = 0; i < 12; i++) {
    h.mount(); click(h, 'bbvPause'); click(h, 'bbvResume');
    assert.deepEqual([h.window.listenerCount(), h.document.listenerCount()], baseline);
    assert.equal(h.frames.size, 1);
    h.close();
  }
});

test('corrupt saves are backed up before replacement, and backup failure preserves them', () => {
  const raw = '{"version":5,"round":{"keep":true}}';
  const h = setup({ storage: new Map([[SAVE_KEY, raw]]) });
  assert.equal(h.stored.get(BACKUP_KEY), raw);
  assert.equal(JSON.parse(h.stored.get(SAVE_KEY)).round.version, 1);
  h.close();

  const broken = new Map([[SAVE_KEY, raw]]);
  const k = setup({ storage: broken, before: h => {
    const set = h.context.localStorage.setItem;
    h.context.localStorage.setItem = (key, value) => { if (key === BACKUP_KEY) throw Error('quota'); set(key, value); };
  } });
  assert.equal(k.stored.get(SAVE_KEY), raw);
  assert.match(el(k, 'bbvStatus').textContent, /Bản lưu cũ được giữ nguyên/);
  assert.equal(k.api.snapshot().status, 'playing');
  k.close(); assert.equal(k.stored.get(SAVE_KEY), raw);
});

test('unavailable storage does not block a round and quota failures do not break input', () => {
  const h = setup({ before: h => { h.context.localStorage.getItem = () => { throw Error('denied'); }; h.context.localStorage.setItem = () => { throw Error('write denied'); }; } });
  click(h, 'bbvFire');
  assert.equal(h.api.snapshot().shots, 1);
  assert.match(el(h, 'bbvTargetCount').textContent, /Chơi tiếp được/);
  h.close();

  const q = setup({ before: h => { h.context.localStorage.setItem = () => { throw Error('quota'); }; } });
  click(q, 'bbvFire');
  assert.equal(q.api.snapshot().shots, 1);
  assert.match(el(q, 'bbvTargetCount').textContent, /Chưa lưu/);
  q.close();
});

test('exact catalog route launches the owned module; CSS keeps touch targets and Calibri', () => {
  const h = setup();
  assert.equal(h.context.NP_GameRegistry.engineFor('ban-bi-ve'), 'launchBanBiVe');
  assert.match(read('app.js'), /'ban-bi': 'assets\/marble-ring-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'ban_bi_cover\.png', 'banbi_intro\.jpg'/);
  assert.match(read('index.html'), /scripts\/games\/ban-bi-ve\.js\?v=20261007_bbv1/);
  h.context.NP_GameSession.stop(); h.container.innerHTML = '';
  assert.equal(h.context.NP_GameRegistry.launch(h.container, { id: 'ban-bi-ve' }), true);
  assert.match(h.container.innerHTML, /Bắn Bi Ve/);
  assert.doesNotMatch(h.container.innerHTML, /bvIntroOverlay|banbi_intro\.jpg/);
  const css = read('scripts/games/ban-bi-ve.css');
  assert.match(css, /min-height: 44px/);
  assert.match(css, /'Calibri'/);
  h.close();
});

test('application catalog launch uses Bắn Bi Ve and closing releases its frame and listeners', () => {
  const h = harness();
  assert.equal(h.context.openGameById('ban-bi-ve'), true);
  assert.ok(el(h, 'bbvCanvas'));
  assert.equal(h.frames.size, 1);
  assert.deepEqual(h.errors, []);
  h.context.closeGameModal();
  assertStopped(h);
});

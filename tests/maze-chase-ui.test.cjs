// Session/DOM doubles check behavior; no claims about browser pixels, touch hardware or FPS.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/maze-chase-model.js');
const KEY = 'np_maze_chase_v1';
const el = (h, id) => h.container.querySelector('#' + id);
const click = (h, id) => el(h, id).dispatch('click');
const plain = value => JSON.parse(JSON.stringify(value));
function setup(options = {}) {
  const storage = options.storage || new Map();
  if (options.run) storage.set(KEY, JSON.stringify({ version: 1, best: options.best || 0, muted: !!options.muted, run: options.run }));
  const h = harness({ loadEngines: false, loadApp: false, storage, reducedMotion: options.reduced });
  for (const file of ['scripts/games/maze-chase-model.js', 'scripts/games/maze-chase.js']) vm.runInContext(read(file), h.context, { filename: file });
  if (options.before) options.before(h);
  const documentBaseline = h.document.listenerCount();
  h.mount = () => { h.game = h.context.NP_MazeChase.mount(h.container, h.context.NP_GameSession.start(), options.audio); };
  h.state = () => plain(h.game.snapshot());
  h.close = () => { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.equal(h.document.listenerCount(), documentBaseline); assert.equal(h.timers.size, 0); assert.deepEqual(h.errors, []); };
  h.mount(); return h;
}
function key(h, name, more = {}) { h.window.dispatch('keydown', { key: name, ...more }); }
function frames(h, n) { for (let i = 0; i < n; i++) h.frame(); }
function pointer(h, type, values = {}) { el(h, 'mcCanvas').dispatch(type, { pointerId: 1, isPrimary: true, clientX: 80, clientY: 80, button: 0, ...values }); }
function active() { const m = M.create(); m.input(3); m.advance(0.1); return m.serialize(); }

test('first mount has no intro gate, compact HUD, labeled controls and optional help only', () => {
  const h = setup(); assert.equal(el(h, 'mcOverlay').hidden, true); assert.equal(h.state().status, 'ready');
  assert.equal(el(h, 'mcPanelText').hidden, true); assert.equal(el(h, 'mcStage').textContent, '1/3');
  assert.equal(el(h, 'mcCanvas').getAttribute('aria-describedby'), 'mcInstructions');
  assert.equal(el(h, 'mcStatus').getAttribute('aria-live'), 'polite');
  assert.equal(h.container.querySelectorAll('.mc-dir').length, 4);
  for (const b of h.container.querySelectorAll('button')) assert.ok(b.getAttribute('aria-label'));
  frames(h, 2); assert.equal(h.frames.size, 0, 'ready view does not burn idle animation frames');
  h.close();
});

test('keyboard begins immediately; illegal/modifier/editable shortcuts do not hijack input', () => {
  const h = setup();
  key(h, 'ArrowLeft', { ctrlKey: true }); key(h, 'w', { target: { tagName: 'INPUT' } });
  key(h, 'ArrowRight', { target: { isContentEditable: true } }); assert.equal(h.state().status, 'ready');
  let prevented = false; key(h, 'ArrowLeft', { preventDefault() { prevented = true; } });
  frames(h, 20); assert.equal(prevented, true); assert.equal(h.state().status, 'playing'); assert.ok(h.state().score > 0);
  assert.ok(Number(el(h, 'mcProgress').getAttribute('aria-valuenow')) > 0); h.close();
});

test('D-pad has instant primary-pointer controls and accessible click fallback', () => {
  const h = setup(), buttons = h.container.querySelectorAll('.mc-dir');
  const left = buttons.find(b => b.dataset.dir === '3');
  left.dispatch('pointerdown', { isPrimary: false }); assert.equal(h.state().status, 'ready');
  left.dispatch('pointerdown', { isPrimary: true, button: 2 }); assert.equal(h.state().status, 'ready');
  left.dispatch('pointerdown', { isPrimary: true, button: 0 }); assert.equal(h.state().queued, 3);
  left.dispatch('click'); assert.equal(h.state().queued, 3);
  buttons.find(b => b.dataset.dir === '0').dispatch('click'); assert.equal(h.state().queued, 0);
  left.dispatch('pointercancel'); assert.equal(h.state().queued, -1); h.close();
});

test('swipes act during movement, enforce a threshold and cancel cleanly', () => {
  const h = setup(); const canvas = el(h, 'mcCanvas'), capture = [], release = [];
  canvas.setPointerCapture = id => capture.push(id); canvas.releasePointerCapture = id => release.push(id);
  pointer(h, 'pointerdown'); pointer(h, 'pointermove', { clientX: 85 }); assert.equal(h.state().status, 'ready');
  pointer(h, 'pointermove', { clientX: 50 }); assert.equal(h.state().queued, 3);
  pointer(h, 'pointermove', { clientX: 50, clientY: 40 }); assert.equal(h.state().queued, 0);
  h.window.dispatch('pointercancel', { pointerId: 1 }); assert.equal(h.state().queued, -1);
  pointer(h, 'pointermove', { clientX: 120 }); assert.equal(h.state().queued, -1);
  assert.deepEqual(capture, [1]); assert.deepEqual(release, [1]); h.close();
});

test('multitouch and lost capture clear buffered turns; foreign pointer events are ignored', () => {
  for (const reason of ['multi', 'lost']) {
    const h = setup(); pointer(h, 'pointerdown'); pointer(h, 'pointermove', { clientX: 50 });
    pointer(h, 'pointermove', { pointerId: 8, clientX: 150 }); assert.equal(h.state().queued, 3);
    if (reason === 'multi') pointer(h, 'pointerdown', { pointerId: 2, isPrimary: false });
    else el(h, 'mcCanvas').dispatch('lostpointercapture');
    assert.equal(h.state().queued, -1); pointer(h, 'pointermove', { clientY: 150 }); assert.equal(h.state().queued, -1); h.close();
  }
});

test('pause freezes simulation, stops RAF, clears pending turn and resumes without hidden-time catchup', () => {
  const h = setup(); key(h, 'a'); frames(h, 20); click(h, 'mcPause');
  const before = h.state(); assert.equal(before.queued, -1); assert.equal(h.frames.size, 0);
  assert.equal(el(h, 'mcOverlay').hidden, false); key(h, 'd'); frames(h, 100); assert.deepEqual(h.state(), before);
  h.advance(100000); click(h, 'mcContinue'); h.frame(); assert.deepEqual(h.state(), before);
  frames(h, 10); assert.ok(h.state().tick > before.tick); assert.equal(el(h, 'mcOverlay').hidden, true); h.close();
});

test('blur, visibilitychange and pagehide pause safely and never automatically resume', () => {
  for (const reason of ['blur', 'visibilitychange', 'pagehide']) {
    const h = setup(); key(h, 'a'); frames(h, 4);
    if (reason === 'visibilitychange') { h.document.hidden = true; h.document.dispatch(reason); }
    else h.window.dispatch(reason);
    assert.equal(el(h, 'mcOverlay').hidden, false); assert.equal(h.frames.size, 0);
    const state = h.state(); h.document.hidden = false; h.document.dispatch('visibilitychange');
    h.window.dispatch('focus'); frames(h, 2); assert.deepEqual(h.state(), state); h.close();
  }
});

test('hidden mount cannot play or resume until the document becomes visible', () => {
  const h = setup({ before(h) { h.document.hidden = true; } });
  key(h, 'a'); click(h, 'mcContinue'); frames(h, 2); assert.equal(h.state().status, 'ready');
  assert.equal(el(h, 'mcOverlay').hidden, false); h.document.hidden = false; click(h, 'mcContinue'); key(h, 'a');
  frames(h, 4); assert.equal(h.state().status, 'playing'); h.close();
});

test('compact help pauses and resumes the same run without progression/configuration screens', () => {
  const h = setup(); key(h, 'a'); frames(h, 20); click(h, 'mcHelp'); const state = h.state();
  assert.equal(el(h, 'mcPanelText').hidden, false); assert.ok(el(h, 'mcPanelText').textContent.length < 95);
  assert.equal(el(h, 'mcRestart').hidden, true); key(h, 'd'); assert.deepEqual(h.state(), state);
  click(h, 'mcContinue'); assert.equal(el(h, 'mcOverlay').hidden, true); assert.deepEqual(h.state(), state); h.close();
});

test('restart is two-step, cancellation keeps run; confirmation banks best and resets', () => {
  const h = setup(); key(h, 'a'); frames(h, 30); click(h, 'mcPause'); const state = h.state();
  click(h, 'mcRestart'); assert.equal(el(h, 'mcPanelTitle').textContent, 'Chơi lại?'); assert.deepEqual(h.state(), state);
  click(h, 'mcRestart'); assert.equal(el(h, 'mcPanelTitle').textContent, 'Tạm dừng'); assert.deepEqual(h.state(), state);
  click(h, 'mcRestart'); click(h, 'mcContinue'); assert.equal(h.state().status, 'ready'); assert.equal(h.state().score, 0);
  const saved = JSON.parse(h.stored.get(KEY)); assert.equal(saved.best, state.score); assert.equal(saved.run.lives, 3); h.close();
});

test('active save restores paused at the exact location; ready saves need no resume gate', () => {
  const run = active(), h = setup({ run, best: 999 });
  assert.equal(el(h, 'mcOverlay').hidden, false); assert.deepEqual(h.state(), run);
  click(h, 'mcContinue'); assert.deepEqual(h.state(), run); frames(h, 4); assert.ok(h.state().tick > run.tick);
  h.close(); h.mount(); assert.equal(el(h, 'mcOverlay').hidden, false); h.close();
  const r = setup({ run: M.create().serialize() }); assert.equal(el(r, 'mcOverlay').hidden, true); r.close();
});

test('periodic saves and cleanup preserve a run; interrupted transitions survive reopening', () => {
  const h = setup(); key(h, 'a'); frames(h, 150); assert.ok(JSON.parse(h.stored.get(KEY)).run.tick > 200);
  h.close(); assert.ok(M.restore(JSON.parse(h.stored.get(KEY)).run));
  const s = active(); s.status = 'dying'; s.phaseTicks = 50; s.lives = 2; s.queued = -1;
  const d = setup({ run: s }); assert.equal(el(d, 'mcOverlay').hidden, false); click(d, 'mcContinue'); frames(d, 40);
  assert.equal(d.state().status, 'ready'); assert.equal(d.state().lives, 2); d.close();
});

test('win and loss screens offer a one-action replay without duplicate listeners', () => {
  for (const status of ['won', 'lost']) {
    const s = M.create().serialize(); s.status = status;
    if (status === 'lost') s.lives = 0;
    else { s.stage = 2; s.items = M.LEVELS[2].items.map(() => 0); }
    const h = setup({ run: s }); const before = h.window.listenerCount();
    assert.equal(el(h, 'mcOverlay').hidden, false); assert.equal(el(h, 'mcPause').disabled, true);
    click(h, 'mcContinue'); assert.equal(h.state().status, 'ready'); assert.equal(h.state().stage, 0);
    assert.equal(h.window.listenerCount(), before); h.close();
  }
});

test('unknown/corrupt saves get a recovery copy; failed backup never overwrites the original', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 99, run: {} })]) {
    const h = setup({ storage: new Map([[KEY, raw]]) }); assert.equal(h.stored.get(KEY + '_recovery'), raw);
    assert.equal(JSON.parse(h.stored.get(KEY)).version, 1); assert.equal(el(h, 'mcSaveNote').hidden, false); h.close();
  }
  const raw = '{broken', h = setup({ storage: new Map([[KEY, raw]]), before(h) { h.context.localStorage.setItem = () => { throw Error('quota'); }; } });
  assert.equal(h.stored.get(KEY), raw); key(h, 'a'); frames(h, 3); assert.equal(h.state().status, 'playing'); h.close(); assert.equal(h.stored.get(KEY), raw);
});

test('existing different recovery copy is preserved and storage denial remains playable', () => {
  const storage = new Map([[KEY, '{current'], [KEY + '_recovery', '{older']]); const h = setup({ storage });
  assert.equal(storage.get(KEY), '{current'); assert.equal(storage.get(KEY + '_recovery'), '{older'); h.close();
  const denied = setup({ before(h) { h.context.localStorage.getItem = () => { throw Error('denied'); }; } });
  assert.equal(el(denied, 'mcSaveNote').hidden, false); key(denied, 'a'); frames(denied, 5);
  assert.equal(denied.state().status, 'playing'); denied.close();
});

test('a different tab update is never overwritten at the next save or cleanup', () => {
  const h = setup(); const other = JSON.stringify({ version: 8 }); h.stored.set(KEY, other);
  click(h, 'mcPause'); assert.equal(h.stored.get(KEY), other); assert.equal(el(h, 'mcSaveNote').hidden, false);
  h.close(); assert.equal(h.stored.get(KEY), other);
});

test('audio needs a gesture, respects local/global mute and survives missing or throwing audio', () => {
  const calls = [], h = setup({ audio: { playTone(...a) { calls.push(a); } }, before(h) { h.context.NEWPLAYGROUND_MUTED = false; } });
  assert.equal(calls.length, 0); key(h, 'a'); frames(h, 30); assert.ok(calls.length > 0);
  click(h, 'mcSound'); assert.equal(el(h, 'mcSound').getAttribute('aria-pressed'), 'true'); const count = calls.length;
  frames(h, 30); assert.equal(calls.length, count); h.close();
  const muted = setup({ audio: { playTone() { throw Error('no device'); } } }); key(muted, 'a'); frames(muted, 20); muted.close();
  const throwing = setup({ audio: { playTone() { throw Error('no device'); } }, before(h) { h.context.NEWPLAYGROUND_MUTED = false; } }); key(throwing, 'a'); frames(throwing, 20); throwing.close();
});

test('resize handles DPR within a memory cap and cancels stale pointer gestures', () => {
  const h = setup({ before(h) { h.context.devicePixelRatio = 3; } });
  assert.equal(el(h, 'mcCanvas').width, 912); assert.equal(el(h, 'mcCanvas').height, 816);
  pointer(h, 'pointerdown'); h.context.devicePixelRatio = 1; h.window.dispatch('resize');
  assert.equal(el(h, 'mcCanvas').width, 456); pointer(h, 'pointermove', { clientX: 20 }); assert.equal(h.state().status, 'ready'); h.close();
});

test('reduced motion and missing pointer capture keep all essential interactions', () => {
  const h = setup({ reduced: true }); pointer(h, 'pointerdown'); pointer(h, 'pointermove', { clientX: 30 });
  frames(h, 20); assert.ok(h.state().score > 0); h.window.dispatch('pointerup', { pointerId: 1 }); h.close();
});

test('repeated mount/close has no RAF, timer, input or host-class leaks', () => {
  const h = setup();
  for (let i = 0; i < 15; i++) {
    key(h, 'a'); frames(h, 2); const nodes = h.container.querySelectorAll('button'); h.close();
    assert.equal(h.container.classList.contains('mc-host'), false); assert.ok(nodes.every(n => n.listenerCount() === 0));
    if (i < 14) h.mount();
  }
});

test('styling keeps minimum targets, responsive board, hidden details and no imported game art', () => {
  const css = read('scripts/games/maze-chase.css'), js = read('scripts/games/maze-chase.js');
  assert.match(css, /min-width: 44px/); assert.match(css, /min-height: 44px/);
  assert.match(css, /aspect-ratio: 19\/17/); assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /font-family: Calibri/); assert.match(css, /\[hidden\] \{ display: none !important/);
  assert.doesNotMatch(js, /Blinky|Pinky|Inky|Clyde|PAC-MAN|new Image|https?:/);
});

// DOM/event doubles validate contracts; this is not browser rendering or real-device QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/line98-model.js');
const KEY = 'np_line98_v1';
const el = (h, id) => h.container.querySelector('#' + id);
const cells = h => h.container.querySelectorAll('.l98-cell');
const saved = h => JSON.parse(h.stored.get(KEY));
const click = (h, id) => el(h, id).dispatch('click');
function input(h, type, i, values = {}) {
  el(h, 'l98Grid').dispatch(type, { target: cells(h)[i], clientX: 5, clientY: 5, pointerType: 'touch', pointerId: 1, isPrimary: true, ...values });
}
const tap = (h, i, values) => input(h, 'click', i, values);
function snapshot(entries, extra = {}) {
  const board = Array(81).fill(0);
  Object.entries(entries).forEach(([i, color]) => { board[+i] = color; });
  return { version: 1, rules: M.RULES, board, next: [2, 3, 4], score: 0, moves: 0, cleared: 0, status: 'playing', rng: 123456, previous: null, ...extra };
}
function setup(options = {}) {
  const storage = options.storage || new Map();
  if (options.board) storage.set(KEY, JSON.stringify({ version: 1, best: options.best || 0, motion: options.motion !== false, board: options.board }));
  const h = harness({ loadEngines: false, loadApp: false, storage });
  h.media = { matches: !!options.reduced, addEventListener() {}, removeEventListener() {} };
  h.context.matchMedia = () => h.media;
  for (const file of ['scripts/games/line98-model.js', 'scripts/games/line98.js']) vm.runInContext(read(file), h.context, { filename: file });
  h.mount = () => h.context.NP_Line98.mount(h.container, h.context.NP_GameSession.start(), options.audio);
  h.close = () => { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.equal(h.timers.size, 0); assert.deepEqual(h.errors, []); };
  if (options.before) options.before(h);
  h.mount(); if (options.board && options.resume !== false) click(h, 'l98Resume');
  return h;
}
function enableAnimation(h) {
  h.animations = [];
  const add = node => { node.animate = (frames, options) => { const a = { frames, options, cancelled: false, cancel() { this.cancelled = true; } }; h.animations.push(a); return a; }; return node; };
  cells(h).forEach(add);
  const original = h.document.createElement;
  h.document.createElement = tag => add(original(tag));
}

test('dedicated 81-cell grid has stable nodes, roving focus and color plus shape labels', () => {
  const h = setup({ board: snapshot({ 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 }) });
  assert.equal(cells(h).length, 81); assert.equal(el(h, 'l98Grid').getAttribute('aria-rowcount'), '9');
  assert.equal(cells(h).filter(c => c.tabIndex === 0).length, 1);
  const before = cells(h); tap(h, 0); assert.deepEqual(cells(h), before);
  assert.equal(cells(h)[0].getAttribute('aria-selected'), 'true');
  assert.match(cells(h)[0].getAttribute('aria-label'), /đỏ, hình tròn/);
  assert.match(cells(h)[6].getAttribute('aria-label'), /xanh ngọc, hình hai vạch/);
  assert.match(el(h, 'l98Next').getAttribute('aria-label'), /lục.*lam.*vàng/);
  assert.equal(el(h, 'l98Status').getAttribute('aria-live'), 'polite'); h.close();
});

test('empty click gives instruction; ball selection toggles and changes without advancing', () => {
  const h = setup({ board: snapshot({ 0: 1, 1: 2 }) }); const before = saved(h).board;
  tap(h, 10); assert.match(el(h, 'l98Status').textContent, /Chọn một bóng trước/);
  tap(h, 0); tap(h, 1); assert.equal(cells(h)[1].getAttribute('aria-selected'), 'true');
  tap(h, 1); assert.equal(cells(h)[1].getAttribute('aria-selected'), 'false');
  assert.deepEqual(saved(h).board, before); assert.equal(el(h, 'l98Deselect').disabled, true); h.close();
});

test('blocked path preserves preview, score and turn; selection remains available', () => {
  const h = setup({ board: snapshot({ 0: 1, 1: 2, 9: 3 }) }); const before = saved(h).board;
  tap(h, 0); tap(h, 10); assert.deepEqual(saved(h).board, before);
  assert.match(el(h, 'l98Status').textContent, /Chưa có đường/); assert.equal(cells(h)[0].getAttribute('aria-selected'), 'true');
  assert.ok(cells(h)[10].classList.contains('l98-blocked')); h.flushTimeouts();
  assert.equal(cells(h)[10].classList.contains('l98-blocked'), false); h.close();
});

test('valid move updates board, preview, HUD and save exactly once; Undo replays identically', () => {
  const initial = snapshot({ 0: 1 }), h = setup({ board: initial });
  tap(h, 0); tap(h, 80); const after = saved(h).board;
  assert.equal(after.moves, 1); assert.equal(after.board[80], 1); assert.equal(after.board.filter(Boolean).length, 4);
  assert.equal(el(h, 'l98MoveCount').textContent, 'Lượt 1'); assert.equal(el(h, 'l98Free').textContent, '77 / 81');
  click(h, 'l98Undo'); assert.deepEqual(saved(h).board, initial); assert.equal(el(h, 'l98Undo').disabled, true);
  tap(h, 0); tap(h, 80); assert.deepEqual(saved(h).board, after); h.close();
});

test('keyboard boundaries, Home/End, no repeat actions, B deselect and U Undo', () => {
  const h = setup({ board: snapshot({ 0: 1 }) });
  input(h, 'keydown', 0, { key: 'ArrowLeft' }); assert.equal(cells(h)[0].tabIndex, 0);
  input(h, 'keydown', 0, { key: 'End' }); assert.equal(cells(h)[8].tabIndex, 0);
  input(h, 'keydown', 8, { key: 'ArrowRight' }); assert.equal(cells(h)[8].tabIndex, 0);
  input(h, 'keydown', 8, { key: 'End', ctrlKey: true }); assert.equal(cells(h)[80].tabIndex, 0);
  input(h, 'keydown', 80, { key: 'ArrowDown' }); assert.equal(cells(h)[80].tabIndex, 0);
  input(h, 'keydown', 80, { key: 'Home', ctrlKey: true }); input(h, 'keydown', 0, { key: 'Enter' });
  input(h, 'keydown', 0, { key: 'Enter', repeat: true }); assert.equal(cells(h)[0].getAttribute('aria-selected'), 'true');
  input(h, 'keydown', 0, { key: 'b' }); assert.equal(cells(h)[0].getAttribute('aria-selected'), 'false');
  input(h, 'keydown', 0, { key: ' ' }); input(h, 'keydown', 1, { key: 'Enter' }); assert.equal(saved(h).board.moves, 1);
  input(h, 'keydown', 1, { key: 'U' }); assert.equal(saved(h).board.moves, 0);
  assert.equal(cells(h).filter(c => c.tabIndex === 0).length, 1); h.close();
});

test('mouse hover and keyboard focus show only reachable orthogonal path', () => {
  const h = setup({ board: snapshot({ 0: 1, 1: 2 }) }); tap(h, 0);
  input(h, 'pointermove', 2, { pointerType: 'mouse' });
  assert.ok(cells(h)[9].classList.contains('l98-path')); assert.equal(cells(h)[1].classList.contains('l98-path'), false);
  input(h, 'focusin', 18); assert.ok(cells(h)[18].classList.contains('l98-path'));
  click(h, 'l98Deselect'); assert.equal(cells(h).some(c => c.classList.contains('l98-path')), false); h.close();
});

test('pointerdown does not commit; release-click commits, drag/cancel/outside/multitouch do not', () => {
  for (const scenario of ['normal', 'drag', 'cancel', 'outside', 'multitouch', 'scroll', 'leave', 'blur']) {
    const h = setup({ board: snapshot({ 0: 1 }) });
    input(h, 'pointerdown', 0); assert.equal(cells(h)[0].getAttribute('aria-selected'), 'false');
    if (scenario === 'drag') input(h, 'pointermove', 0, { clientX: 30 });
    if (scenario === 'cancel') h.window.dispatch('pointercancel', { pointerId: 1 });
    if (scenario === 'multitouch') input(h, 'pointerdown', 1, { pointerId: 2, isPrimary: false });
    if (scenario === 'scroll') el(h, 'l98Scroll').dispatch('scroll');
    if (scenario === 'leave') el(h, 'l98Grid').dispatch('pointerleave');
    if (scenario === 'blur') h.window.dispatch('blur');
    input(h, 'pointerup', 0, scenario === 'outside' ? { clientX: 800 } : {}); tap(h, 0);
    assert.equal(cells(h)[0].getAttribute('aria-selected'), scenario === 'normal' ? 'true' : 'false', scenario);
    h.close();
  }
});

test('cancel suppression persists for delayed click but never delays the next legitimate tap', () => {
  const h = setup({ board: snapshot({ 0: 1 }) });
  input(h, 'pointerdown', 0); input(h, 'pointermove', 0, { clientX: 40 }); input(h, 'pointerup', 0);
  h.advance(5000); tap(h, 0); assert.equal(cells(h)[0].getAttribute('aria-selected'), 'false');
  input(h, 'pointerdown', 0); input(h, 'pointerup', 0); tap(h, 0);
  assert.equal(cells(h)[0].getAttribute('aria-selected'), 'true'); h.close();
});

test('pause blocks mouse and keyboard, removes grid tab stops and resumes saved state', () => {
  const h = setup({ board: snapshot({ 0: 1 }) }); const before = saved(h).board;
  click(h, 'l98Pause'); assert.equal(el(h, 'l98Grid').inert, true); assert.equal(el(h, 'l98Grid').getAttribute('aria-hidden'), 'true');
  assert.equal(cells(h).filter(c => c.tabIndex === 0).length, 0); tap(h, 0); tap(h, 80);
  input(h, 'keydown', 0, { key: 'Enter' }); assert.deepEqual(saved(h).board, before);
  click(h, 'l98Resume'); assert.equal(el(h, 'l98Grid').inert, false); tap(h, 0); tap(h, 80);
  assert.equal(saved(h).board.moves, 1); const after = saved(h).board;
  h.close(); h.mount(); assert.equal(el(h, 'l98Cover').hidden, false); assert.deepEqual(saved(h).board, after); h.close();
});

test('visibilitychange and pagehide pause; game-over remains inspectable and undoable', () => {
  const h = setup({ board: snapshot({ 0: 1 }) }); h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(el(h, 'l98Cover').hidden, false); click(h, 'l98Resume'); h.window.dispatch('pagehide');
  assert.equal(el(h, 'l98Cover').hidden, false); h.close();
  const board = Array.from({ length: 81 }, (_, i) => (Math.floor(i / 9) + 2 * (i % 9)) % 7 + 1); board[0] = 0;
  const g = setup({ board: snapshot({}, { board, next: [7, 6, 5] }) }); tap(g, 1); tap(g, 0);
  assert.equal(saved(g).board.status, 'lost'); assert.equal(el(g, 'l98Result').hidden, false);
  assert.equal(el(g, 'l98Pause').disabled, true); assert.equal(el(g, 'l98Undo').disabled, false);
  const terminal = saved(g).board; tap(g, 1); assert.deepEqual(saved(g).board, terminal);
  click(g, 'l98Undo'); assert.equal(saved(g).board.status, 'playing'); assert.equal(el(g, 'l98Result').hidden, true); g.close();
});

test('active restart confirmation freezes board; No preserves turn; Yes resets without listener growth', () => {
  const h = setup({ board: snapshot({ 0: 1 }) }); tap(h, 0); tap(h, 80); const old = saved(h).board;
  click(h, 'l98New'); assert.equal(el(h, 'l98Confirm').hidden, false); assert.equal(el(h, 'l98Grid').inert, true);
  tap(h, 80); tap(h, 1); click(h, 'l98Undo'); assert.deepEqual(saved(h).board, old);
  click(h, 'l98ConfirmNo'); assert.equal(el(h, 'l98Grid').inert, false); assert.deepEqual(saved(h).board, old);
  click(h, 'l98Pause'); click(h, 'l98New'); click(h, 'l98ConfirmNo'); assert.equal(el(h, 'l98Cover').hidden, false);
  click(h, 'l98New'); click(h, 'l98ConfirmYes'); assert.equal(saved(h).board.moves, 0);
  const w = h.window.listenerCount(), d = h.document.listenerCount();
  for (let i = 0; i < 25; i++) click(h, 'l98New');
  assert.equal(h.window.listenerCount(), w); assert.equal(h.document.listenerCount(), d); h.close();
});

test('Undo rolls back provisional best; starting new game banks the retained score', () => {
  const h = setup({ board: snapshot({ 0: 1, 1: 1, 2: 1, 3: 1, 13: 1, 80: 2 }) });
  tap(h, 13); tap(h, 4); assert.equal(el(h, 'l98Best').textContent, '10');
  click(h, 'l98Undo'); assert.equal(el(h, 'l98Best').textContent, '0');
  tap(h, 13); tap(h, 4); click(h, 'l98New'); click(h, 'l98ConfirmYes');
  assert.equal(saved(h).best, 10); assert.equal(el(h, 'l98Best').textContent, '10'); h.close();
});

test('all-clear announces replenishment and keeps a playable board', () => {
  const h = setup({ board: snapshot({ 0: 1, 1: 1, 2: 1, 3: 1, 13: 1 }) }); tap(h, 13); tap(h, 4);
  assert.equal(saved(h).board.board.filter(Boolean).length, 3); assert.match(el(h, 'l98Status').textContent, /Sạch bàn/);
  assert.equal(saved(h).board.score, 10); h.close();
});

test('a new action settles the prior animation without losing the next move', () => {
  const h = setup({ board: snapshot({ 0: 1 }) }); enableAnimation(h);
  tap(h, 0); tap(h, 80); const after = saved(h).board;
  assert.equal(el(h, 'l98Grid').getAttribute('aria-busy'), 'true');
  assert.ok(h.animations[0].options.duration <= 180);
  const target = M.restore(after).reachable(80)[0];
  tap(h, 80); assert.equal(cells(h)[80].getAttribute('aria-selected'), 'true');
  tap(h, target); assert.equal(saved(h).board.moves, 2);
  assert.ok(h.animations[0].cancelled);
  h.flushTimeouts(); h.flushTimeouts();
  assert.equal(el(h, 'l98Grid').getAttribute('aria-busy'), 'false');
  assert.deepEqual(cells(h).map(c => +c.dataset.color), saved(h).board.board); h.close();
});

test('animation cancellation on undo, resize, scroll, pause and close cannot apply stale turns', () => {
  for (const reason of ['undo', 'resize', 'scroll', 'pause', 'close']) {
    const initial = snapshot({ 0: 1 }), h = setup({ board: initial }); enableAnimation(h); tap(h, 0); tap(h, 80);
    if (reason === 'undo') click(h, 'l98Undo');
    if (reason === 'resize') h.window.dispatch('resize');
    if (reason === 'scroll') el(h, 'l98Scroll').dispatch('scroll');
    if (reason === 'pause') click(h, 'l98Pause');
    if (reason === 'close') h.close();
    h.flushTimeouts(); h.flushTimeouts(); assert.ok(h.animations.every(a => a.cancelled));
    assert.equal(saved(h).board.moves, reason === 'undo' ? 0 : 1, reason);
    assert.equal(h.container.querySelectorAll('.l98-mover').length, 0);
    if (reason !== 'close') { assert.equal(el(h, 'l98Grid').getAttribute('aria-busy'), 'false'); h.close(); }
  }
});

test('reduced motion, user toggle and missing WAAPI settle instantly without timers', () => {
  for (const mode of ['system', 'user', 'unsupported']) {
    const h = setup({ board: snapshot({ 0: 1 }), reduced: mode === 'system' });
    if (mode !== 'unsupported') enableAnimation(h);
    if (mode === 'user') click(h, 'l98Motion');
    tap(h, 0); tap(h, 80); assert.equal(el(h, 'l98Grid').getAttribute('aria-busy'), 'false');
    assert.equal(h.timers.size, 0); assert.equal(saved(h).board.moves, 1); h.close();
  }
});

test('unknown and corrupt saves are backed up before replacement; backup failure never overwrites', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 99, board: {} })]) {
    const h = setup({ storage: new Map([[KEY, raw]]) }); assert.equal(h.stored.get(KEY + '_recovery'), raw);
    assert.equal(saved(h).version, 1); assert.equal(el(h, 'l98StorageNote').hidden, false); h.close();
  }
  const raw = '{broken';
  const h = setup({ storage: new Map([[KEY, raw]]), before(h) { h.context.localStorage.setItem = () => { throw Error('quota'); }; } });
  assert.equal(h.stored.get(KEY), raw); assert.equal(el(h, 'l98StorageNote').hidden, false);
  const source = cells(h).findIndex(c => c.dataset.color !== '0'); tap(h, source);
  assert.equal(cells(h)[source].getAttribute('aria-selected'), 'true'); h.close(); assert.equal(h.stored.get(KEY), raw);
});

test('denied storage and audio failures leave gameplay usable; legacy record is kept separate', () => {
  const h = setup({ before(h) {
    h.context.localStorage.getItem = () => { throw Error('denied'); };
    h.context.localStorage.setItem = () => { throw Error('denied'); };
  } });
  const source = cells(h).findIndex(c => c.dataset.color !== '0'), target = cells(h).findIndex(c => c.dataset.color === '0');
  tap(h, source); tap(h, target); assert.equal(el(h, 'l98MoveCount').textContent, 'Lượt 1'); h.close();
  const a = setup({ board: snapshot({ 0: 1 }), storage: new Map([['np_line98_high_score', '999']]), audio: { init() {}, playTone() { throw Error('audio failed'); } } });
  a.context.NEWPLAYGROUND_MUTED = false; a.context.NP_Audio = { isMuted: false };
  tap(a, 0); tap(a, 80); assert.doesNotThrow(() => a.flushTimeouts());
  assert.match(el(a, 'l98Legacy').textContent, /999/); assert.equal(el(a, 'l98Best').textContent, '0'); a.close();
});

test('pending audio honors mute changes and session cleanup', () => {
  const tones = [], h = setup({ board: snapshot({ 0: 1 }), audio: { init() {}, playTone(...args) { tones.push(args); } } });
  h.context.NEWPLAYGROUND_MUTED = false; h.context.NP_Audio = { isMuted: false }; tap(h, 0);
  h.context.NEWPLAYGROUND_MUTED = true; h.flushTimeouts(); assert.equal(tones.length, 0);
  h.context.NEWPLAYGROUND_MUTED = false; tap(h, 80); h.close(); h.flushTimeouts(); assert.equal(tones.length, 0);
});

test('stylesheet uses scoped selectors, 44px targets, readable glyphs, scroll/zoom and reduced motion', () => {
  const css = read('scripts/games/line98.css');
  assert.match(css, /min-width: 44px; min-height: 44px/); assert.match(css, /touch-action: pan-x pan-y pinch-zoom/);
  assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /forced-colors: active/);
  assert.match(css, /font-family: 'Calibri'/); assert.match(css, /:focus-visible/);
  assert.doesNotMatch(read('index.html'), /user-scalable=no|maximum-scale=1/);
  assert.doesNotMatch(read('scripts/games/line98.js'), /fetch\(|https?:\/\//);
});

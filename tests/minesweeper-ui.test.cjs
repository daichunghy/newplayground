// DOM double tests, not device rendering or browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const KEY = 'np_minesweeper_v1';
const open = h => { h.context.openGameById('do-min-minesweeper'); assert.deepEqual(h.errors, []); };
const el = (h, id) => h.container.querySelector('#' + id);
const cells = h => h.container.querySelectorAll('.dm-cell');
const saved = h => JSON.parse(h.stored.get(KEY));
function input(h, type, i, values = {}) {
  el(h, 'dmGrid').dispatch(type, { target: cells(h)[i], clientX: 5, clientY: 5, pointerType: 'touch', pointerId: 1, isPrimary: true, ...values });
}
const tap = (h, i) => input(h, 'click', i);
const click = (h, id) => el(h, id).dispatch('click');

test('default and phone boards, target sizes, reduced motion, and zoom contract', () => {
  const h = harness(); open(h); assert.equal(cells(h).length, 81);
  assert.equal(cells(h).filter(c => c.tabIndex === 0).length, 1);
  assert.equal(el(h, 'dmGrid').getAttribute('aria-rowcount'), '9');
  const phone = harness({ compact: true }); open(phone); assert.equal(cells(phone).length, 48);
  assert.equal(el(phone, 'dmDifficulty').value, 'pocket');
  assert.match(read('scripts/games/minesweeper.css'), /min-width: 44px; min-height: 44px/);
  assert.match(read('scripts/games/minesweeper.css'), /prefers-reduced-motion/);
  assert.doesNotMatch(read('index.html'), /user-scalable=no|maximum-scale=1/);
  h.context.closeGameModal(); phone.context.closeGameModal(); assertStopped(h); assertStopped(phone);
});

test('stable cells, separate flag mode and single timer start', () => {
  const h = harness(); const baselineDocument = h.document.listenerCount(); open(h); const before = cells(h);
  click(h, 'dmFlagMode'); tap(h, 80);
  assert.equal(saved(h).board.flags.length, 1); assert.equal(saved(h).board.status, 'ready');
  assert.equal([...h.timers.values()].filter(t => t.interval).length, 0);
  click(h, 'dmRevealMode'); tap(h, 0);
  assert.equal(saved(h).stats.beginner.played, 1); assert.equal(saved(h).board.status, 'playing');
  assert.deepEqual(cells(h), before); assert.equal([...h.timers.values()].filter(t => t.interval).length, 1);
  tap(h, 80); assert.equal(saved(h).board.flags.length, 1); assert.equal(saved(h).stats.beginner.played, 1);
  h.context.closeGameModal(); assertStopped(h); assert.equal(h.document.listenerCount(), baselineDocument);
});

test('question mode marks uncertain cells without starting play and persists them accessibly', () => {
  const h = harness(); open(h);
  click(h, 'dmQuestionMode'); tap(h, 1);
  assert.equal(saved(h).board.status, 'ready');
  assert.deepEqual(saved(h).board.questions, [1]);
  assert.deepEqual(saved(h).board.flags, []);
  assert.equal(cells(h)[1].textContent, '?');
  assert.equal(cells(h)[1].classList.contains('dm-questioned'), true);
  assert.match(cells(h)[1].getAttribute('aria-label'), /chưa chắc/);
  assert.equal(el(h, 'dmQuestionMode').getAttribute('aria-pressed'), 'true');
  input(h, 'pointerdown', 2); h.flushTimeouts(); input(h, 'pointerup', 2);
  assert.deepEqual(saved(h).board.questions, [1, 2]);

  input(h, 'keydown', 1, { key: 'q' });
  assert.equal(el(h, 'dmQuestionMode').getAttribute('aria-pressed'), 'false');
  input(h, 'keydown', 1, { key: 'Enter' });
  assert.equal(saved(h).board.status, 'playing');
  assert.equal(saved(h).board.questions.includes(1), false);
  h.context.closeGameModal(); assertStopped(h);
});

test('bounded keyboard navigation, one tab stop, repeat safety and accessible labels', () => {
  const h = harness(); open(h);
  input(h, 'keydown', 0, { key: 'ArrowLeft' }); assert.equal(cells(h)[0].tabIndex, 0);
  input(h, 'keydown', 0, { key: 'End' }); assert.equal(cells(h)[8].tabIndex, 0);
  input(h, 'keydown', 8, { key: 'End', ctrlKey: true }); assert.equal(cells(h)[80].tabIndex, 0);
  input(h, 'keydown', 80, { key: 'F' }); assert.deepEqual(saved(h).board.flags, [80]);
  input(h, 'keydown', 80, { key: 'F', repeat: true }); assert.deepEqual(saved(h).board.flags, [80]);
  assert.equal(cells(h).filter(c => c.tabIndex === 0).length, 1);
  input(h, 'keydown', 80, { key: 'Home', ctrlKey: true }); input(h, 'keydown', 0, { key: 'Enter' });
  assert.equal(saved(h).board.status, 'playing'); assert.match(cells(h)[0].getAttribute('aria-label'), /ô trống/);
  h.context.closeGameModal(); assertStopped(h);
});

test('long hold commits on release and suppresses the synthetic click', () => {
  const h = harness(); open(h); input(h, 'pointerdown', 0); h.flushTimeouts();
  assert.ok(cells(h)[0].classList.contains('dm-holding')); assert.equal(h.stored.has(KEY), false);
  input(h, 'pointerup', 0); assert.deepEqual(saved(h).board.flags, [0]);
  tap(h, 0); assert.deepEqual(saved(h).board.flags, [0]); assert.equal(saved(h).board.status, 'ready');
  input(h, 'pointerdown', 0, { pointerType: 'mouse' }); input(h, 'contextmenu', 0, { pointerType: 'mouse' });
  assert.deepEqual(saved(h).board.flags, []); assert.deepEqual(saved(h).board.questions, [0]);
  input(h, 'contextmenu', 0, { pointerType: 'mouse' }); assert.deepEqual(saved(h).board.questions, []);
  h.context.closeGameModal(); assertStopped(h);
});

test('drag, cancel, release outside and multi-touch do not activate cells', () => {
  for (const scenario of ['drag', 'cancel', 'outside', 'second-touch']) {
    const h = harness(); open(h); input(h, 'pointerdown', 0);
    if (scenario === 'drag') input(h, 'pointermove', 0, { clientX: 30 });
    if (scenario === 'cancel') h.window.dispatch('pointercancel', { pointerId: 1 });
    if (scenario === 'second-touch') input(h, 'pointerdown', 1, { pointerId: 2, isPrimary: false });
    h.flushTimeouts(); input(h, 'pointerup', 0, scenario === 'outside' ? { clientX: 800 } : {}); tap(h, 0);
    assert.equal(h.stored.has(KEY), false, scenario); assert.equal(cells(h)[0].classList.contains('dm-holding'), false);
    h.context.closeGameModal(); assertStopped(h);
  }
});

test('active clock pauses and hides board, restores on reopen, handles pagehide', () => {
  const h = harness(); open(h); tap(h, 0); h.advance(2345); h.tickIntervals(); assert.equal(el(h, 'dmTime').textContent, '0:02');
  click(h, 'dmPause'); assert.equal(saved(h).elapsed, 2345); assert.equal(el(h, 'dmGrid').inert, true);
  assert.equal(cells(h).filter(c => c.tabIndex === 0).length, 0); h.advance(30000); tap(h, 70); assert.equal(saved(h).elapsed, 2345);
  click(h, 'dmResume'); h.advance(7655); h.context.closeGameModal(); assertStopped(h);
  assert.equal(saved(h).elapsed, 10000); assert.equal(saved(h).stats.beginner.played, 1);
  open(h); assert.equal(el(h, 'dmPauseCover').hidden, false); assert.equal(el(h, 'dmTime').textContent, '0:10');
  click(h, 'dmResume'); h.advance(2000); h.window.dispatch('pagehide');
  assert.equal(saved(h).elapsed, 12000); assert.equal(el(h, 'dmPauseCover').hidden, false);
  h.context.closeGameModal(); assertStopped(h);
});

test('blur, hidden tab, and pagehide cancel ready long-presses without acting', () => {
  for (const interruption of ['blur', 'visibilitychange', 'pagehide']) {
    const h = harness(); open(h); input(h, 'pointerdown', 3); h.flushTimeouts();
    assert.equal(cells(h)[3].classList.contains('dm-holding'), true);
    if (interruption === 'visibilitychange') { h.document.hidden = true; h.document.dispatch(interruption); }
    else h.window.dispatch(interruption);
    assert.equal(cells(h)[3].classList.contains('dm-holding'), false, interruption);
    input(h, 'pointerup', 3); tap(h, 3);
    assert.equal(saved(h).board.status, 'ready', interruption);
    assert.deepEqual(saved(h).board.flags, [], interruption);
    assert.equal(saved(h).stats.beginner.played, 0, interruption);
    h.context.closeGameModal(); assertStopped(h);
  }
});

test('blur, hidden tab, and pagehide pause active play without moving focus or auto-resuming', () => {
  for (const interruption of ['blur', 'visibilitychange', 'pagehide']) {
    const h = harness(); open(h); tap(h, 0); h.advance(2345);
    if (interruption === 'visibilitychange') { h.document.hidden = true; h.document.dispatch(interruption); }
    else h.window.dispatch(interruption);
    assert.equal(el(h, 'dmPauseCover').hidden, false, interruption);
    assert.equal([...h.timers.values()].filter(t => t.interval).length, 0, interruption);
    const pausedAt = saved(h).elapsed;
    assert.equal(pausedAt, 2345, interruption);
    h.advance(5000); h.tickIntervals();
    assert.equal(saved(h).elapsed, pausedAt, interruption);
    h.window.dispatch('focus'); h.document.hidden = false; h.document.dispatch('visibilitychange');
    assert.equal(el(h, 'dmPauseCover').hidden, false, interruption);
    click(h, 'dmResume'); assert.equal(el(h, 'dmPauseCover').hidden, true, interruption);
    assert.equal([...h.timers.values()].filter(t => t.interval).length, 1, interruption);
    h.context.closeGameModal(); assertStopped(h);
  }
});

test('difficulty changes confirm an active game; cancellation resumes the same board', () => {
  const h = harness(); open(h); tap(h, 0); const original = saved(h).board;
  el(h, 'dmDifficulty').value = 'expert'; el(h, 'dmDifficulty').dispatch('change');
  assert.equal(el(h, 'dmConfirm').hidden, false); assert.equal(el(h, 'dmDifficulty').value, 'beginner');
  assert.deepEqual(saved(h).board, original); click(h, 'dmPause'); assert.equal(el(h, 'dmPauseCover').hidden, false);
  click(h, 'dmConfirmNo'); assert.equal(el(h, 'dmPauseCover').hidden, true);
  h.advance(601); el(h, 'dmDifficulty').value = 'expert'; el(h, 'dmDifficulty').dispatch('change'); click(h, 'dmConfirmYes');
  assert.equal(cells(h).length, 480); assert.equal(saved(h).board.status, 'ready'); assert.equal(saved(h).elapsed, 0);
  assert.equal(saved(h).stats.beginner.played, 1); assert.equal(saved(h).stats.expert.played, 0);
  h.context.closeGameModal(); assertStopped(h);
});

test('terminal states update records once, remain inspectable and clear active save', () => {
  for (const outcome of ['win', 'loss']) {
    const h = harness(); open(h); tap(h, 0); h.advance(1500); const b = saved(h).board;
    if (outcome === 'loss') tap(h, b.mines[0]); else for (let i = 0; i < 81; i++) if (!b.mines.includes(i)) tap(h, i);
    assert.equal(saved(h).board, null); assert.equal(saved(h).stats.beginner.won, outcome === 'win' ? 1 : 0);
    assert.equal(saved(h).stats.beginner.played, 1); assert.equal(el(h, 'dmResult').hidden, false); assert.equal(el(h, 'dmPause').disabled, true);
    assert.ok(cells(h).every(c => c.getAttribute('aria-disabled') === 'true'));
    const last = h.stored.get(KEY); tap(h, 0); input(h, 'contextmenu', 1); assert.equal(h.stored.get(KEY), last);
    assert.equal(cells(h).filter(c => c.tabIndex === 0).length, 1); assert.equal([...h.timers.values()].filter(t => t.interval).length, 0);
    click(h, 'dmPlayAgain'); assert.equal(saved(h).board.status, 'ready'); h.context.closeGameModal(); assertStopped(h);
  }
});

test('corrupt storage and storage errors leave gameplay usable', () => {
  for (const value of ['{broken', JSON.stringify({ board: { version: 1, presetId: '__proto__' }, stats: { beginner: { played: -2, won: 99, bestMs: -3 } } })]) {
    const h = harness({ storage: new Map([[KEY, value]]) }); open(h); tap(h, 0);
    assert.equal(saved(h).stats.beginner.played, 1); assert.equal(saved(h).stats.beginner.won, 0); h.context.closeGameModal(); assertStopped(h);
  }
  const h = harness(); h.context.localStorage.getItem = () => { throw new Error('storage denied'); };
  h.context.localStorage.setItem = () => { throw new Error('quota'); };
  open(h); assert.doesNotThrow(() => tap(h, 0)); assert.equal(el(h, 'dmStorageNote').hidden, false);
  h.context.closeGameModal(); assertStopped(h); assert.deepEqual(h.errors, []);
});

test('resets do not accumulate listeners; closing armed hold cancels all resources', () => {
  const h = harness(); open(h); const w = h.window.listenerCount(), d = h.document.listenerCount();
  for (let i = 0; i < 25; i++) click(h, 'dmRestart');
  assert.equal(h.window.listenerCount(), w); assert.equal(h.document.listenerCount(), d);
  input(h, 'pointerdown', 1); assert.ok(h.timers.size > 0); h.context.closeGameModal(); assertStopped(h);
  assert.equal(h.timers.size, 0); assert.equal(h.document.listenerCount(), d - 1); h.flushTimeouts(); assertStopped(h);
});

 test('cancelled gestures remain cancelled through long release; rapid next taps work', () => {
  const h = harness(); open(h);
  input(h, 'pointerdown', 0); input(h, 'pointermove', 0, { clientX: 30 });
  h.advance(2000); input(h, 'pointerup', 0); tap(h, 0);
  assert.equal(h.stored.has(KEY), false, 'late synthetic click stays cancelled');
  input(h, 'pointerdown', 0); h.flushTimeouts(); input(h, 'pointerup', 0); tap(h, 0);
  assert.deepEqual(saved(h).board.flags, [0]);
  h.advance(100); input(h, 'pointerdown', 1); input(h, 'pointerup', 1); tap(h, 1);
  assert.equal(saved(h).board.status, 'playing', 'a new tap is not globally delayed');
  h.context.closeGameModal(); assertStopped(h);
});

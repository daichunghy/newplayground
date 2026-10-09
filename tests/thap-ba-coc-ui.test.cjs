// DOM-double interaction checks; not a browser, screen-reader or device test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/thap-ba-coc-model.js');
const KEY = 'np_thap_ba_coc_campaign_v1';
const el = (h, id) => h.container.querySelector('#' + id);
const saved = h => JSON.parse(h.stored.get(KEY));
function setup(storage = new Map()) {
  const h = harness({ loadEngines: false, loadApp: false, storage });
  h.context.NP_ThapBaCoc.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}
function move(h, from, to) { el(h, `tbPeg${from}`).click(); el(h, `tbPeg${to}`).click(); }
function solveActiveStage(h) {
  let guard = 0;
  while (saved(h).stages[saved(h).activeStage] && M.restore(saved(h).stages[saved(h).activeStage]).view().status === 'playing' && guard++ < 64) {
    const game = M.restore(saved(h).stages[saved(h).activeStage]), hint = game.hint(); move(h, hint.from, hint.to);
  }
}

test('three pegs expose an accessible board, a four-stage campaign and a persisted first move', () => {
  const h = setup();
  assert.equal(h.container.querySelectorAll('.tb-peg').length, 3);
  assert.equal(el(h, 'tbStage0').disabled, false); assert.equal(el(h, 'tbStage3').disabled, true);
  assert.match(el(h, 'tbPeg0').getAttribute('aria-label'), /Cọc A, 3 đĩa/);
  assert.equal(el(h, 'tbStatus').getAttribute('aria-live'), 'polite');
  el(h, 'tbPeg0').click(); assert.equal(el(h, 'tbPeg0').getAttribute('aria-pressed'), 'true');
  el(h, 'tbPeg2').click();
  assert.deepEqual(saved(h).stages[0].pegs, [[3, 2], [], [1]]);
  assert.equal(saved(h).stages[0].moves, 1); assert.equal(el(h, 'tbMoveCount').textContent, '1 / 7');
  move(h, 0, 2);
  assert.equal(saved(h).stages[0].moves, 1); assert.match(el(h, 'tbStatus').textContent, /không đặt đĩa lớn/);
  h.close();
});

test('undo, hint and keyboard peg navigation all use the same legal move model', () => {
  const h = setup(); move(h, 0, 2); el(h, 'tbUndo').click();
  assert.equal(saved(h).stages[0].moves, 0); assert.equal(el(h, 'tbUndo').disabled, true);
  el(h, 'tbHint').click(); const hint = M.create(0).hint();
  assert.match(el(h, 'tbHintText').textContent, /Gợi ý/);
  assert.ok(el(h, `tbPeg${hint.from}`).classList.contains('tb-hint-source'));
  assert.ok(el(h, `tbPeg${hint.to}`).classList.contains('tb-hint-target'));
  el(h, 'tbPeg0').dispatch('keydown', { key: 'ArrowRight' }); assert.equal(el(h, 'tbPeg1').focused, true);
  el(h, 'tbPeg0').dispatch('keydown', { key: 'H' }); assert.match(el(h, 'tbStatus').textContent, /Gợi ý/);
  h.close();
});

test('solving unlocks the next stage and survives closing and reopening the game', () => {
  const storage = new Map(), h = setup(storage); solveActiveStage(h);
  assert.equal(saved(h).unlockedStage, 1); assert.equal(saved(h).bests[0], 7);
  assert.equal(el(h, 'tbStage1').disabled, false); assert.equal(el(h, 'tbNext').hidden, false);
  el(h, 'tbNext').click(); assert.equal(saved(h).activeStage, 1); assert.equal(el(h, 'tbDiskCount').textContent, '4 đĩa');
  h.close();
  const resumed = setup(storage);
  assert.equal(saved(resumed).unlockedStage, 1); assert.equal(saved(resumed).activeStage, 1);
  assert.equal(el(resumed, 'tbDiskCount').textContent, '4 đĩa'); assert.equal(el(resumed, 'tbStage1').disabled, false);
  resumed.close();
});

test('restart asks before clearing an active stage; continue keeps the board, restart resets it', () => {
  const h = setup(); move(h, 0, 2); el(h, 'tbReset').click();
  assert.equal(el(h, 'tbResetConfirm').hidden, false); el(h, 'tbResetNo').click();
  assert.equal(saved(h).stages[0].moves, 1);
  el(h, 'tbReset').click(); el(h, 'tbResetYes').click();
  assert.equal(saved(h).stages[0].moves, 0); assert.deepEqual(saved(h).stages[0].pegs, [[3, 2, 1], [], []]);
  h.close();
});

test('corrupt saves are preserved for recovery and future saves are never overwritten', () => {
  const corruptStore = new Map([[KEY, '{broken']]), recovered = setup(corruptStore);
  assert.equal(corruptStore.get(`${KEY}_recovery`), '{broken');
  assert.match(el(recovered, 'tbStorageNote').textContent, /đã được giữ lại/); recovered.close();
  const futureStore = new Map([[KEY, JSON.stringify({ version: 9, marker: 'future' })]]), future = setup(futureStore);
  move(future, 0, 2);
  assert.deepEqual(JSON.parse(futureStore.get(KEY)), { version: 9, marker: 'future' });
  assert.match(el(future, 'tbStorageNote').textContent, /mới hơn/); future.close();
});

test('campaign save rejects an unlock that skips a winning stage', () => {
  const malformed = {
    version: 1, unlockedStage: 2, activeStage: 2, bests: [null, null, null, null],
    stages: [null, null, null, null]
  };
  assert.equal(harness().context.NP_ThapBaCoc.validCampaign(malformed, M), false);
});

test('game stylesheet keeps controls touch-sized and motion-light', () => {
  const css = read('scripts/games/thap-ba-coc.css');
  assert.match(css, /min-width: 44px; min-height: 44px/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

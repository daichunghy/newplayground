const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/keo-nhip-model.js');

const el = (h, id) => h.container.querySelector('#' + id);

function setup() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/keo-nhip-model.js'), h.context, { filename: 'keo-nhip-model.js' });
  vm.runInContext(read('scripts/games/keo-nhip.js'), h.context, { filename: 'keo-nhip.js' });
  h.game = h.context.NP_KeoNhip.mount(h.container, h.context.NP_GameSession.start());
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}

function start(h) { el(h, 'knOverlayAction').click(); }

function playRound(h, win) {
  const model = h.game.getModel();
  let guard = 0;
  while (model.view().status === 'playing' && guard++ < 1400) {
    const cue = model.view().cue;
    if (win && cue.kind === 'step') {
      while (model.view().time < cue.time && model.view().status === 'playing') h.frame();
      if (model.view().status === 'playing') el(h, cue.side === 'left' ? 'knLeft' : 'knRight').click();
    } else {
      while (model.view().time <= cue.time + M.LATE_WINDOW && model.view().status === 'playing') h.frame();
    }
  }
  assert.ok(guard < 1400, 'round reaches a result without a runaway animation loop');
  assert.ok(['round-won', 'round-lost', 'won', 'lost'].includes(model.view().status));
}

test('mounts original Kéo Nhịp rules, center-marker canvas, accessibility status, and large A/D touch controls', () => {
  const h = setup();
  assert.match(h.container.innerHTML, /<h2>Kéo Nhịp<\/h2>/);
  assert.match(h.container.innerHTML, /Nghỉ/);
  assert.equal(el(h, 'knArena').width, 760);
  assert.equal(el(h, 'knLeft').getAttribute('aria-label'), 'Bước trái, phím A hoặc mũi tên trái');
  assert.equal(el(h, 'knRight').getAttribute('aria-label'), 'Bước phải, phím D hoặc mũi tên phải');
  assert.equal(el(h, 'knFeedback').getAttribute('role'), 'status');
  assert.equal(el(h, 'knPause').disabled, true);
  h.close();
});

test('keyboard A/D and arrow keys plus touch buttons step on their matching rhythm cues', () => {
  const h = setup(), model = h.game.getModel();
  start(h);
  let cue = model.view().cue;
  while (model.view().time < cue.time) h.frame();
  h.document.dispatch('keydown', { target: el(h, 'knGame'), code: 'KeyA', key: 'a' });
  assert.equal(model.view().perfects, 1); assert.ok(model.view().position > 0);
  h.document.dispatch('keyup', { target: el(h, 'knGame'), code: 'KeyA', key: 'a' });
  cue = model.view().cue;
  while (model.view().time < cue.time) h.frame();
  h.document.dispatch('keydown', { target: el(h, 'knGame'), code: 'ArrowRight', key: 'ArrowRight' });
  assert.ok(model.view().perfects + model.view().goods >= 2);
  h.document.dispatch('keyup', { target: el(h, 'knGame'), code: 'ArrowRight', key: 'ArrowRight' });
  cue = model.view().cue;
  while (model.view().time < cue.time) h.frame();
  el(h, cue.side === 'left' ? 'knLeft' : 'knRight').click();
  assert.ok(model.view().perfects + model.view().goods >= 3);
  assert.match(el(h, 'knFeedback').textContent, /nhịp|phách/i);
  h.close();
});

test('pause, resume, blur/focus and hidden-page interruption freeze time until explicit resume', () => {
  const h = setup(); start(h);
  for (let i = 0; i < 8; i++) h.frame();
  el(h, 'knPause').click();
  assert.equal(h.game.getModel().view().status, 'paused'); assert.equal(h.frames.size, 0);
  const frozen = h.game.getModel().view().time;
  h.window.dispatch('blur'); h.window.dispatch('focus');
  assert.equal(h.game.getModel().view().status, 'paused', 'focus return does not auto-resume play');
  assert.equal(h.game.getModel().view().time, frozen);
  el(h, 'knOverlayAction').click(); assert.equal(h.frames.size, 1);
  h.window.dispatch('blur'); assert.equal(h.game.getModel().view().status, 'paused');
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.dispatch('visibilitychange');
  assert.equal(h.game.getModel().view().status, 'paused');
  el(h, 'knPause').click(); assert.equal(h.game.getModel().view().status, 'playing');
  h.window.dispatch('pagehide'); assert.equal(h.game.getModel().view().status, 'paused');
  h.close();
});

test('visible round outcomes continue the best-of-three, replay resets wins, and restart returns to setup', () => {
  const h = setup(); start(h);
  playRound(h, true);
  assert.ok(['round-won', 'round-lost'].includes(h.game.getModel().view().status));
  assert.match(el(h, 'knOverlayTitle').textContent, /Thắng lượt|thuộc về đối thủ/);
  el(h, 'knOverlayAction').click(); assert.equal(h.game.getModel().view().round, 2);
  playRound(h, true);
  assert.equal(h.game.getModel().view().status, 'won');
  assert.equal(h.game.getModel().view().wins, 2);
  assert.equal(el(h, 'knOverlayTitle').textContent, 'Bạn thắng trận!');
  el(h, 'knOverlayAction').click();
  assert.equal(h.game.getModel().view().status, 'playing'); assert.equal(h.game.getModel().view().wins, 0);
  el(h, 'knRestart').click();
  assert.equal(h.game.getModel().view().status, 'ready'); assert.equal(h.frames.size, 0);
  assert.equal(h.game.getModel().view().round, 1);
  h.close();
});

test('two unattended rounds reveal a loss, final replay starts fresh, and close releases all resources', () => {
  const h = setup(); start(h);
  playRound(h, false);
  assert.equal(h.game.getModel().view().status, 'round-lost');
  el(h, 'knOverlayAction').click(); assert.equal(h.game.getModel().view().round, 2);
  playRound(h, false);
  assert.equal(h.game.getModel().view().status, 'lost');
  assert.equal(el(h, 'knOverlayTitle').textContent, 'Trận đã khép');
  el(h, 'knOverlayAction').click(); assert.equal(h.game.getModel().view().status, 'playing');
  assert.equal(h.game.getModel().view().losses, 0); assert.equal(h.game.getModel().view().round, 1);
  h.close();
});

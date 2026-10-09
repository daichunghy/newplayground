const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/raft-duel-model.js');

function open() {
  const h = harness();
  const engine = h.context.NP_RaftDuel.mount(h.container, h.context.NP_GameSession.start());
  return { ...h, engine, canvas: h.container.querySelector('#rpCanvas') };
}
function stop(h) { h.context.NP_GameSession.stop(); h.container.replaceChildren(); }

test('fresh match is visual-first with short controls, accessible live feedback and an original title', () => {
  const h = open();
  assert.match(h.container.innerHTML, /Đấu Phao/);
  assert.doesNotMatch(h.container.innerHTML, /Raft Wars|Simon|Pirate|Bắn Phao Raft Wars/i);
  assert.ok(h.canvas);
  assert.equal(h.canvas.getAttribute('role'), 'img');
  assert.equal(h.container.querySelector('#rpOverlay').hidden, true);
  assert.equal(h.container.querySelector('#rpPower').getAttribute('aria-valuenow'), '64');
  assert.equal(h.container.classList.contains('rp-host'), true);
  const css = read('scripts/games/raft-duel.css');
  assert.match(css, /min-height:48px/);
  assert.match(css, /min-height:44px/);
  stop(h);
  assert.equal(h.container.classList.contains('rp-host'), false);
});

test('touch hold fills the power bar and release fires once despite its synthetic click', () => {
  const h = open(), fire = h.container.querySelector('#rpFire');
  fire.dispatch('pointerdown', { pointerId: 1, button: 0 });
  h.frame(); h.frame(); h.frame(); h.frame();
  assert.ok(Number(h.container.querySelector('#rpPower').value) > M.MIN_POWER);
  h.window.dispatch('pointerup', { target: fire, pointerId: 1 });
  fire.dispatch('click', { detail: 1 });
  assert.equal(h.engine.getModel().view().shots, 1);
  assert.ok(h.engine.getModel().view().projectile);
  stop(h);
});

test('keyboard arrows adjust aim; Space charges and fires on key release', () => {
  const h = open(), angle = h.engine.getModel().view().player.angle;
  h.container.dispatch('keydown', { key: 'ArrowUp', target: h.canvas });
  assert.equal(h.engine.getModel().view().player.angle, angle + 1);
  h.container.dispatch('keydown', { key: ' ', code: 'Space', target: h.canvas, repeat: false });
  h.frame(); h.frame();
  h.container.dispatch('keyup', { key: ' ', code: 'Space', target: h.canvas });
  assert.equal(h.engine.getModel().view().shots, 1);
  assert.ok(h.engine.getModel().view().projectile);
  stop(h);
});

test('touch aim buttons and a screen-reader click can set aim and fire with default power', () => {
  const h = open(), before = h.engine.getModel().view().player.angle;
  h.container.querySelector('#rpUp').click();
  assert.equal(h.engine.getModel().view().player.angle, before + 2);
  h.container.querySelector('#rpFire').click();
  assert.equal(h.engine.getModel().view().shots, 1);
  stop(h);
});

test('pause cancels a held shot, resume keeps one frame, and restart opens a fresh round', () => {
  const h = open();
  h.container.querySelector('#rpFire').dispatch('pointerdown', { pointerId: 2, button: 0 });
  h.frame(); h.frame();
  h.container.querySelector('#rpPause').click();
  assert.equal(h.engine.isPaused(), true);
  assert.equal(h.engine.getModel().view().shots, 0);
  assert.equal(h.engine.getModel().view().charging, false);
  assert.equal(h.frames.size, 0);
  h.container.querySelector('#rpOverlayAction').click();
  assert.equal(h.frames.size, 1);
  h.container.querySelector('#rpRestart').click();
  assert.equal(h.engine.getModel().view().shots, 0);
  assert.equal(h.engine.getModel().view().turn, 'player');
  assert.equal(h.frames.size, 1);
  stop(h);
  assertStopped(h);
});

test('blur, hidden tab, pointer cancel and close stop the loop without firing stale input', () => {
  const h = open();
  h.container.querySelector('#rpFire').dispatch('pointerdown', { pointerId: 3, button: 0 });
  h.window.dispatch('pointercancel');
  assert.equal(h.engine.getModel().view().shots, 0);
  h.window.dispatch('blur');
  assert.equal(h.frames.size, 0);
  h.container.querySelector('#rpOverlayAction').click();
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  stop(h);
  assertStopped(h);
});

test('the exact legacy route opens the original cover and module, then close releases everything', () => {
  const h = harness();
  assert.equal(h.context.openGameById('raft-wars-ban-sung-phao'), true);
  assert.ok(h.container.querySelector('#rpCanvas'));
  assert.match(h.container.innerHTML, /Đấu Phao/);
  assert.match(read('app.js'), /'raft-wars-ban-sung-phao': 'assets\/dau-phao-original\.svg'/);
  assert.equal(h.errors.length, 0);
  h.context.closeGameModal();
  assertStopped(h);
});

test('repeated route open and close does not retain frames or global listeners', () => {
  const h = harness();
  for (let i = 0; i < 8; i++) {
    h.context.openGameById('raft-wars-ban-sung-phao');
    assert.ok(h.container.querySelector('#rpCanvas'));
    h.context.closeGameModal();
    assertStopped(h);
  }
});

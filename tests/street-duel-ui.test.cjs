const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

function launch() {
  const h = harness();
  assert.equal(h.context.openGameById('street-fighter-2-doi-khang'), true);
  return h;
}
function el(h, id) { return h.container.querySelector('#' + id); }
function buttons(h) { return h.container.querySelectorAll('button'); }

test('historic route opens an original solo-first rooftop duel with readable HUD and touch controls', () => {
  const h = launch(), model = h.window.NP_StreetDuelModel;
  assert.ok(el(h, 'ndStage'));
  assert.equal(model.create().view().mode, 'cpu');
  assert.equal(el(h, 'ndClock').textContent, '45');
  assert.equal(el(h, 'ndLeftHp').style.width, '100%');
  assert.equal(el(h, 'ndRightName').textContent, 'BẢO · MÁY');
  assert.equal(buttons(h).filter(button => button.getAttribute('data-nd-hold') || button.getAttribute('data-nd-tap')).length, 7);
  assert.match(h.container.innerHTML, /minmax\(44px,1fr\)/);
  assert.match(h.container.innerHTML, /min-height:46px/);
  assert.match(h.container.innerHTML, /touch-action:none/);
  assert.equal(h.document.getElementById('modalGameTitle').textContent, 'Nảy Lửa');
  assert.equal(el(h, 'ndLive').getAttribute('role'), 'status');
  assert.equal(el(h, 'ndLive').getAttribute('aria-live'), 'polite');
  assert.equal(el(h, 'ndResult').getAttribute('aria-live'), 'off');
  assert.match(read('app.js'), /'street-fighter-2-doi-khang': 'assets\/nay-lua-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'street_fighter_cover\.jpg'/);
  assert.match(h.container.innerHTML, /Chớp Đòn|Quét Mây|Vân Bộ/);
  assert.doesNotMatch(h.container.innerHTML, /Ryu|Ken|Chun-Li|Bison|Hadouken|Shoryuken|Street Fighter/i);
  assert.equal(h.frames.size, 1);
  h.context.closeGameModal(); assertStopped(h); assert.deepEqual(h.errors, []);
});

test('keyboard and touch inputs move, jump, guard, attack, and switch to local two-player', () => {
  const h = launch(), model = h.window.NP_StreetDuelModel;
  const game = h.context.NP_Engines.launchStreetFighter;
  assert.equal(typeof game, 'function');
  // The route-created mount is the active model exposed to tests by the launcher return.
  h.context.closeGameModal();
  h.container.innerHTML = '';
  h.mount = game(h.container, { id: 'street-fighter-2-doi-khang' });
  const match = h.mount.model, initial = match.view().fighters[0].x;
  h.window.dispatch('keydown', { code: 'KeyD' }); h.frame(); h.window.dispatch('keyup', { code: 'KeyD' });
  assert.ok(match.view().fighters[0].x > initial);
  const mode = el(h, 'ndMode'); mode.click();
  assert.equal(match.view().mode, 'local'); assert.equal(el(h, 'ndRightName').textContent, 'BẢO · P2');
  assert.equal(el(h, 'ndMode').getAttribute('aria-pressed'), 'true');
  const rightX = match.view().fighters[1].x;
  h.window.dispatch('keydown', { code: 'ArrowLeft' }); h.frame(); h.window.dispatch('keyup', { code: 'ArrowLeft' });
  assert.ok(match.view().fighters[1].x < rightX);
  const jump = buttons(h).find(button => button.getAttribute('data-nd-hold') === 'jump');
  jump.dispatch('pointerdown', { pointerId: 3, preventDefault() {} }); h.frame();
  assert.equal(match.view().fighters[0].grounded, false);
  jump.dispatch('pointerup', { pointerId: 3 });
  const punch = buttons(h).find(button => button.getAttribute('data-nd-tap') === 'punch');
  punch.click(); h.frame(); assert.ok(match.view().fighters[0].action);
  h.window.dispatch('blur');
  h.context.closeGameModal(); assertStopped(h); assert.deepEqual(h.errors, []);
  void model;
});

test('close and reopen release game input listeners and animation frames', () => {
  const h = launch(); h.window.dispatch('keydown', { code: 'KeyA' }); h.frame();
  h.context.closeGameModal(); assertStopped(h);
  assert.equal(h.context.openGameById('street-fighter-2-doi-khang'), true);
  assert.equal(h.frames.size, 1);
  h.context.closeGameModal(); assertStopped(h); assert.deepEqual(h.errors, []);
  const src = read('scripts/engines-retro50.js');
  assert.match(src, /window\.NP_StreetDuelModel = StreetDuelModel/);
  assert.doesNotMatch(src, /function launchStreetFighter[\s\S]{0,900}Hadouken/);
});

test('hidden tabs and window blur stop the match loop, clear held input, and resume once', () => {
  const h = launch(); h.context.closeGameModal();
  const mount = h.context.NP_Engines.launchStreetFighter(h.container, { id: 'street-fighter-2-doi-khang' });
  const game = mount.model, left = buttons(h).find(button => button.getAttribute('data-nd-hold') === 'left');
  left.dispatch('pointerdown', { pointerId: 19, preventDefault() {} }); h.frame();
  const atHide = game.view().fighters[0].x, timeAtHide = game.view().timeMs;
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.advance(5000); h.frame();
  assert.equal(game.view().timeMs, timeAtHide, 'hidden time does not advance the round');
  h.document.hidden = false; h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 1, 'one frame is scheduled on return');
  h.frame();
  assert.equal(game.view().fighters[0].x, atHide, 'touch movement was released while hidden');
  assert.equal(h.frames.size, 1);

  h.window.dispatch('keydown', { code: 'KeyD' }); h.frame();
  const beforeBlur = game.view().fighters[0].x;
  assert.ok(beforeBlur > atHide);
  h.window.dispatch('blur');
  assert.equal(h.frames.size, 0);
  h.advance(5000); h.frame();
  assert.equal(game.view().timeMs, timeAtHide - 32, 'blurred time does not advance the round');
  h.window.dispatch('focus');
  assert.equal(h.frames.size, 1);
  h.frame();
  assert.equal(game.view().fighters[0].x, beforeBlur, 'keyboard movement was released on blur');
  h.context.closeGameModal(); assertStopped(h); assert.deepEqual(h.errors, []);
});

test('the visible replay button starts a fresh match after two rounds', () => {
  const h = launch(); h.context.closeGameModal();
  const mount = h.context.NP_Engines.launchStreetFighter(h.container, { id: 'street-fighter-2-doi-khang' });
  const game = mount.model; game.reset('local');
  const winRound = () => {
    let guard = 0;
    while (game.view().status === 'playing' && guard++ < 1600) {
      const [left, right] = game.view().fighters;
      if (left.action) game.step(50, {});
      else if (Math.abs(right.x - left.x) > 70) game.step(50, { p1: { move: right.x > left.x ? 1 : -1 } });
      else game.step(16, { p1: { attack: 'punch' } });
    }
    assert.ok(guard < 1600);
  };
  winRound(); for (let i = 0; i < 30; i++) game.step(50, {}); winRound(); h.frame();
  assert.equal(game.view().status, 'matchOver'); assert.equal(el(h, 'ndReplay').hidden, false);
  assert.equal(h.frames.size, 0, 'the terminal match owns no animation loop');
  el(h, 'ndReplay').click();
  assert.equal(game.view().status, 'playing'); assert.deepEqual(Array.from(game.view().wins), [0, 0]);
  assert.equal(el(h, 'ndReplay').hidden, true);
  assert.equal(h.frames.size, 1, 'replay starts exactly one animation loop');
  h.context.closeGameModal(); assertStopped(h); assert.deepEqual(h.errors, []);
});

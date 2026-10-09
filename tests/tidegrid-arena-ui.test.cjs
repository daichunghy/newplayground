const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

function launch() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/tidegrid-arena-model.js'), h.context, { filename: 'scripts/games/tidegrid-arena-model.js' });
  vm.runInContext(read('scripts/games/tidegrid-arena.js'), h.context, { filename: 'scripts/games/tidegrid-arena.js' });
  const mounted = h.context.NP_TidegridArena.mount(h.container, h.context.NP_GameSession.start());
  const el = id => h.container.querySelector('#' + id);
  return { h, mounted, el, model: () => mounted.getModel() };
}
function key(h, keyValue, extra = {}) { h.container.dispatch('keydown', { key: keyValue, code: keyValue === ' ' ? 'Space' : keyValue, ...extra }); }
function keyup(h, keyValue) { h.window.dispatch('keyup', { key: keyValue }); }
function click(el, detail = 0) { el.dispatch('click', { detail }); }
function close(h) { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []); }

test('a fresh match opens immediately with a compact board and one-line controls', () => {
  const x = launch(), v = x.model().view();
  assert.equal(v.status, 'playing'); assert.equal(v.remaining, 3);
  assert.equal(x.h.frames.size, 1);
  assert.equal(x.el('tgOverlay').hidden, true);
  assert.equal(x.el('tgCanvas').getAttribute('width'), '546');
  assert.equal(x.el('tgCanvas').getAttribute('height'), '462');
  assert.match(x.el('tgCanvas').getAttribute('aria-label'), /Space thả bom nước/);
  assert.equal(x.el('tgStatus').getAttribute('aria-live'), 'polite');
  assert.equal(x.el('tgRescue').disabled, true);
  assert.match(read('scripts/games/tidegrid-arena.css'), /min-height: 48px/);
  click(x.el('tgBomb'));
  assert.equal(x.model().view().bombs.length, 1, 'first action is available without a title screen');
  close(x.h);
});

test('keyboard directions move immediately and Space is edge-triggered', () => {
  const x = launch();
  key(x.h, 'ArrowRight'); assert.equal(x.model().view().pilot.c, 2);
  keyup(x.h, 'ArrowRight');
  key(x.h, ' ', { repeat: false }); assert.equal(x.model().view().bombs.length, 1);
  key(x.h, ' ', { repeat: true }); assert.equal(x.model().view().bombs.length, 1);
  keyup(x.h, ' ');
  assert.equal(x.model().view().intent, null);
  close(x.h);
});

test('touch direction ends on pointer-up/cancel and ignores the follow-up synthetic click', () => {
  const x = launch(), button = x.el('tgRight');
  button.dispatch('pointerdown', { pointerId: 17, button: 0 });
  assert.equal(x.model().view().pilot.c, 2);
  x.h.window.dispatch('pointerup', { pointerId: 17 });
  click(button, 1);
  assert.equal(x.model().view().pilot.c, 2);
  assert.equal(x.model().view().intent, null);
  button.dispatch('pointerdown', { pointerId: 18, button: 0 });
  x.h.window.dispatch('pointercancel', { pointerId: 18 });
  assert.equal(x.model().view().intent, null);
  close(x.h);
});

test('pause, resume and a cancelled restart preserve the previous pause state', () => {
  const x = launch();
  click(x.el('tgPause'));
  assert.equal(x.el('tgOverlay').hidden, false); assert.equal(x.h.frames.size, 0);
  click(x.el('tgContinue'));
  assert.equal(x.el('tgOverlay').hidden, true); assert.equal(x.h.frames.size, 1);
  click(x.el('tgNew')); assert.equal(x.el('tgConfirmYes').hidden, false);
  click(x.el('tgConfirmNo'));
  assert.equal(x.el('tgOverlay').hidden, true); assert.equal(x.h.frames.size, 1);
  click(x.el('tgPause')); click(x.el('tgNew')); click(x.el('tgConfirmNo'));
  assert.equal(x.el('tgOverlay').hidden, false); assert.equal(x.h.frames.size, 0);
  click(x.el('tgContinue'));
  assert.equal(x.el('tgOverlay').hidden, true); assert.equal(x.h.frames.size, 1);
  click(x.el('tgBomb')); assert.equal(x.model().view().bombs.length, 1);
  click(x.el('tgNew')); click(x.el('tgConfirmYes'));
  assert.equal(x.model().view().bombs.length, 0); assert.equal(x.h.frames.size, 1);
  close(x.h);
});

test('a held pause shortcut toggles once while repeated key events are ignored', () => {
  const x = launch();
  key(x.h, 'p', { repeat: false });
  assert.equal(x.el('tgOverlay').hidden, false); assert.equal(x.h.frames.size, 0);
  key(x.h, 'p', { repeat: true });
  assert.equal(x.el('tgOverlay').hidden, false); assert.equal(x.h.frames.size, 0);
  click(x.el('tgContinue'));
  assert.equal(x.el('tgOverlay').hidden, true); assert.equal(x.h.frames.size, 1);
  close(x.h);
});

test('close removes the frame loop, input listeners and candidate DOM', () => {
  const x = launch(); x.h.frame(); close(x.h);
});

test('candidate uses its own title and authored vector/canvas art, without borrowed game marks', () => {
  const source = read('scripts/games/tidegrid-arena.js');
  assert.match(source, /Original, local water-bubble arena/);
  assert.doesNotMatch(source, /Bomberman|Bazzi|Nexon|Konami|BnB/);
  assert.match(read('scripts/games/tidegrid-arena-model.js'), /const CRATES = Object\.freeze/);
  assert.match(read('scripts/games/tidegrid-arena.css'), /prefers-reduced-motion/);
});

test('the exact catalog route opens the localized original game and cover', () => {
  const h = harness();
  assert.equal(h.context.openGameById('boom-online-bnb'), true);
  assert.ok(h.container.querySelector('#tgCanvas'));
  assert.match(h.container.innerHTML, /Đấu Trường Bọt Nước/);
  assert.match(read('app.js'), /'boom-online-bnb': 'assets\/dau-truong-bot-nuoc-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'boom_online_cover\.jpg'/);
  assert.deepEqual(h.errors, []);
  h.context.closeGameModal();
  assertStopped(h);
});

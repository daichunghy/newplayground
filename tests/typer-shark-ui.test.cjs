const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped } = require('./support/browser-harness.cjs');

function open() {
  const h = harness();
  h.game = h.context.NP_TyperShark.mount(h.container, h.context.NP_GameSession.start());
  return h;
}
const el = (h, id) => h.container.querySelector('#' + id);
const key = (h, letter) => h.document.dispatch('keydown', { key: letter, target: h.container });
const tapLetter = (h, letter) => el(h, 'tsKeyboard').dispatch('click', { target: el(h, 'tsKeyboard').querySelectorAll('.ts-key').find(button => button.dataset.letter === letter) });

test('keyboard and large on-screen keys both complete targets and score', () => {
  const h = open();
  for (const letter of 'S') key(h, letter);
  tapLetter(h, 'E'); tapLetter(h, 'A');
  assert.equal(el(h, 'tsWave').textContent, '1 / 3');
  assert.equal(el(h, 'tsScore').textContent, '85');
  assert.equal(el(h, 'tsTarget').textContent, 'REEF');
  assert.deepEqual(h.errors, []);
  h.context.NP_GameSession.stop(); assertStopped(h);
});

test('the NewPlayground character replaces the shark concept and editable fields keep physical keys', () => {
  const h = open();
  assert.match(h.container.innerHTML, /<h2>Đốm Biển<\/h2>/);
  assert.match(h.container.innerHTML, /id="tsGlow"/);
  assert.doesNotMatch(h.container.innerHTML, /cá mập|shark|Typer Shark/i);
  h.document.dispatch('keydown', { key: 'S', target: { isContentEditable: true, matches: () => false } });
  assert.equal(el(h, 'tsTyped').textContent, '');
  key(h, 'S');
  assert.equal(el(h, 'tsTyped').textContent, 'S');
  h.context.NP_GameSession.stop(); assertStopped(h);
});

test('pause, interrupt, resume, restart and session close own the animation loop', () => {
  const h = open();
  assert.equal(h.frames.size, 1);
  h.container.querySelector('#tsPause').dispatch('click');
  assert.equal(el(h, 'tsOverlayTitle').textContent, 'Tạm dừng');
  assert.equal(h.frames.size, 0);
  el(h, 'tsOverlayAction').dispatch('click');
  assert.equal(h.frames.size, 1);
  h.window.dispatch('pagehide');
  assert.equal(el(h, 'tsOverlayTitle').textContent, 'Tạm dừng');
  assert.equal(h.frames.size, 0);
  h.container.querySelector('#tsOverlayAction').dispatch('click');
  h.container.querySelector('#tsRestart').dispatch('click');
  assert.equal(el(h, 'tsTarget').textContent, 'SEA');
  assert.equal(h.frames.size, 1);
  h.context.NP_GameSession.stop(); assertStopped(h);
  assert.deepEqual(h.errors, []);
});

test('full typed course reaches a real result and replay starts a fresh round', () => {
  const h = open();
  for (const word of h.context.NP_TyperSharkModel.WORDS) for (const letter of word) key(h, letter);
  assert.equal(el(h, 'tsOverlayTitle').textContent, 'Rạn sáng rực!');
  assert.equal(el(h, 'tsOverlayAction').textContent, 'Chơi lại');
  assert.equal(h.frames.size, 0, 'win immediately cancels the pending animation frame');
  el(h, 'tsOverlayAction').dispatch('click');
  assert.equal(el(h, 'tsTarget').textContent, 'SEA');
  assert.equal(el(h, 'tsScore').textContent, '0');
  h.context.NP_GameSession.stop(); assertStopped(h);
});

test('three deadline misses show zero cleared words, disable typing and can restart cleanly', () => {
  const h = open();
  for (let miss = 0; miss < 3; miss++) {
    const taps = Math.ceil(h.game.getModel().view().wordRemainingMs / 220);
    for (let keyIndex = 0; keyIndex < taps; keyIndex++) tapLetter(h, 'X');
  }
  assert.equal(el(h, 'tsOverlayTitle').textContent, 'Lỡ ba lượt');
  assert.match(el(h, 'tsOverlayCopy').textContent, /0 \/ 9 từ/);
  assert.equal(el(h, 'tsKeyboard').querySelectorAll('.ts-key').every(button => button.disabled), true);
  assert.equal(h.frames.size, 0);
  el(h, 'tsOverlayAction').click();
  assert.equal(el(h, 'tsTarget').textContent, 'SEA');
  assert.equal(el(h, 'tsMisses').textContent, '●●●');
  assert.equal(h.frames.size, 1);
  h.context.NP_GameSession.stop(); assertStopped(h);
});

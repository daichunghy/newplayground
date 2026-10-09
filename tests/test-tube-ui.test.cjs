const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness } = require('./support/browser-harness.cjs');

function mount(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false });
  for (const file of ['test-tube-model.js', 'test-tube-campaign.js', 'test-tube.js']) {
    const source = fs.readFileSync(path.resolve(__dirname, `../scripts/games/${file}`), 'utf8');
    vm.runInContext(source, h.context, { filename: file });
  }
  const session = h.window.NP_GameSession.start();
  const host = h.document.createElement('div');
  const game = h.window.NP_TestTube.mount(host, session, options);
  return { h, host, session, game };
}

test('mount opens directly on a compact bottle with virus goal and labeled touch controls', () => {
  const { host, session, game } = mount({ seed: 'tube-ui' });
  assert.match(host.innerHTML, /<h2>Ống Nghiệm<\/h2>/);
  assert.match(host.innerHTML, /role="status" aria-live="polite"/);
  assert.match(host.innerHTML, /GHÉP 4/);
  assert.equal(game.getModel().view().virusesLeft, 3);
  for (const id of ['ttLeft', 'ttRotate', 'ttRight', 'ttDown', 'ttDrop', 'ttRestart']) assert.ok(host.querySelector(`#${id}`));
  session.stop();
  assert.equal(host.classList.contains('tt-host'), false);
});

test('campaign unlocks the next authored bottle and keeps simple replay controls', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { host, session, game } = mount({ storage });
  assert.match(host.querySelector('#ttBeat').textContent, /Chai 1\/4/);
  assert.match(host.querySelector('#ttBottles').innerHTML, /id="ttBottle-2"[^>]*disabled/);
  host.querySelector('#ttRotate').click();
  host.querySelector('#ttDrop').click();
  assert.equal(game.getModel().view().status, 'won');
  assert.doesNotMatch(host.querySelector('#ttBottles').innerHTML, /id="ttBottle-2"[^>]*disabled/);
  assert.match(host.querySelector('#ttStatus').textContent, /đã mở chai 2/i);
  assert.deepEqual(JSON.parse(values.get('np_test_tube_campaign_v1')), { version: 1, unlockedBottle: 2 });
  host.querySelector('#ttBottles').dispatch('click', { target: host.querySelector('#ttBottle-2') });
  assert.equal(game.getModel().view().virusesLeft, 3);
  host.querySelector('#ttRestart').click();
  assert.equal(game.getModel().view().virusesLeft, 3);
  session.stop();
});

test('a clear resolved by falling gravity also unlocks and saves the next bottle', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { h, host, session, game } = mount({ storage });
  game.getModel().rotate();
  for (let step = 0; step < 20 && game.getModel().view().status === 'playing'; step++) game.getModel().softDrop();
  assert.equal(game.getModel().view().status, 'won');
  h.frame();
  assert.doesNotMatch(host.querySelector('#ttBottles').innerHTML, /id="ttBottle-2"[^>]*disabled/);
  assert.deepEqual(JSON.parse(values.get('np_test_tube_campaign_v1')), { version: 1, unlockedBottle: 2 });
  session.stop();
});

test('touch buttons and keyboard rotate/move/drop the same falling capsule', () => {
  const { h, host, session, game } = mount({ seed: 'tube-input', viruses: [{ row: 15, col: 0, color: 'rose' }], pairs: [['blue', 'amber'], ['rose', 'blue']] });
  const initial = game.getModel().view().active;
  host.querySelector('#ttLeft').click();
  assert.equal(game.getModel().view().active.pivot.col, initial.pivot.col - 1);
  host.dispatch('keydown', { key: 'ArrowUp', repeat: false });
  assert.equal(game.getModel().view().active.rotation, 1);
  host.dispatch('keydown', { key: ' ', repeat: false });
  assert.equal(game.getModel().view().capsulesPlaced, 1);
  assert.equal(game.getModel().view().active.pivot.row, 1);
  assert.ok(h.frames.size > 0);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);
});

test('gravity steps steadily, blur freezes the bottle, and focus resumes the live capsule', () => {
  const { h, session, game } = mount({ seed: 'tube-gravity', viruses: [{ row: 15, col: 0, color: 'rose' }], pairs: [['blue', 'amber'], ['rose', 'blue']] });
  const startRow = game.getModel().view().active.pivot.row;
  for (let i = 0; i < 38; i++) h.frame();
  const fallenRow = game.getModel().view().active.pivot.row;
  assert.ok(fallenRow > startRow);
  h.window.dispatch('blur');
  assert.equal(h.frames.size, 0);
  h.window.dispatch('focus');
  assert.ok(h.frames.size > 0);
  session.stop();
  assert.equal(h.frames.size, 0);
});

test('a hidden tab suspends gravity and focus cannot restart it until visibility returns', () => {
  const { h, session, game } = mount({ seed: 'tube-hidden', viruses: [{ row: 15, col: 0, color: 'rose' }], pairs: [['blue', 'amber'], ['rose', 'blue']] });
  const startRow = game.getModel().view().active.pivot.row;
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  for (let i = 0; i < 50; i++) h.frame();
  assert.equal(game.getModel().view().active.pivot.row, startRow);
  h.window.dispatch('focus');
  assert.equal(h.frames.size, 0, 'a focus event while the document is hidden must not restart gravity');
  h.document.hidden = false;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 1);
  for (let i = 0; i < 38; i++) h.frame();
  assert.ok(game.getModel().view().active.pivot.row > startRow);
  session.stop();
  assert.equal(h.frames.size, 0);
});

test('focus and visibility return never schedule gravity for a terminal bottle', () => {
  const { h, session, game } = mount({ viruses: [], pairs: [['blue', 'amber']] });
  assert.equal(game.getModel().view().status, 'won');
  assert.equal(h.frames.size, 0);
  h.window.dispatch('focus');
  assert.equal(h.frames.size, 0);
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  h.document.hidden = false;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  session.stop();
  assert.equal(h.frames.size, 0);
});

test('restart restores viruses and active controls; closing removes listeners and scheduled frames', () => {
  const { h, host, session, game } = mount({ seed: 'tube-retry', viruses: [{ row: 15, col: 0, color: 'rose' }], pairs: [['blue', 'amber'], ['rose', 'blue']] });
  host.querySelector('#ttDrop').click();
  assert.equal(game.getModel().view().capsulesPlaced, 1);
  host.querySelector('#ttRestart').click();
  assert.equal(game.getModel().view().capsulesPlaced, 0);
  assert.equal(game.getModel().view().virusesLeft, 1);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);
});

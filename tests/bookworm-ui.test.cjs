const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/bookworm-model.js');

const el = (h, id) => h.container.querySelector('#' + id);
function setup(seed = 1) {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/bookworm-model.js'), h.context);
  vm.runInContext(read('scripts/games/bookworm.js'), h.context);
  const session = h.context.NP_GameSession.start();
  h.game = h.context.NP_Bookworm.mount(h.container, session, null, { seedFactory: () => seed });
  h.close = () => {
    h.context.NP_GameSession.stop();
    assertStopped(h);
    assert.deepEqual(h.errors, []);
  };
  return h;
}
function tapWord(h, route) {
  for (const index of route) el(h, `bwTile${index}`).click();
  el(h, 'bwSubmit').click();
}

test('mount opens directly on a 36-letter hex board with a clear submit action and compact HUD', () => {
  const h = setup();
  assert.equal(h.container.querySelectorAll('.bw-letter').length, 36);
  assert.equal(el(h, 'bwResult').hidden, true);
  assert.equal(el(h, 'bwSubmit').disabled, true);
  assert.match(el(h, 'bwStatus').textContent, /Nối chữ.*Ghép từ|Nối chữ liền kề/);
  assert.equal(el(h, 'bwTile15').classList.contains('bw-fire'), true);
  assert.match(el(h, 'bwTile0').getAttribute('aria-label'), /Chữ S/);
  h.close();
});

test('tap-by-tap selection assembles a known opening word; invalid feedback keeps the route editable', () => {
  const h = setup();
  for (const index of M.LEVELS[0].path) el(h, `bwTile${index}`).click();
  assert.equal(el(h, 'bwWord').textContent, 'SHELF');
  assert.equal(el(h, 'bwSubmit').disabled, false);
  el(h, 'bwSubmit').click();
  assert.equal(el(h, 'bwScore').textContent, '25 / 42');
  assert.equal(el(h, 'bwTurns').textContent, '11');
  assert.equal(el(h, 'bwWord').textContent, '—');
  assert.match(el(h, 'bwStatus').textContent, /SHELF.*\+25/);
  h.close();
});

test('mouse drag follows connected cells and suppresses the release click without losing the route', () => {
  const h = setup();
  el(h, 'bwTile0').dispatch('pointerdown', { button: 0, pointerType: 'mouse' });
  for (const index of [1, 2, 3, 4]) el(h, `bwTile${index}`).dispatch('pointerenter', { pointerType: 'mouse' });
  h.window.dispatch('pointerup', { pointerType: 'mouse' });
  el(h, 'bwTile4').click();
  assert.equal(el(h, 'bwWord').textContent, 'SHELF');
  el(h, 'bwSubmit').click();
  assert.equal(el(h, 'bwScore').textContent, '25 / 42');
  h.close();
});

test('touch pointer movement hit-tests under the finger despite implicit button capture', () => {
  const h = setup();
  const route = M.LEVELS[0].path;
  const original = h.document.elementFromPoint;
  h.document.elementFromPoint = (x) => el(h, `bwTile${Math.round(x / 50)}`);
  el(h, `bwTile${route[0]}`).dispatch('pointerdown', { button: 0, isPrimary: true, pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 });
  for (const index of route.slice(1)) {
    h.document.dispatch('pointermove', { pointerId: 1, pointerType: 'touch', clientX: index * 50, clientY: 0, target: el(h, `bwTile${route[0]}`) });
  }
  h.document.dispatch('pointerup', { pointerId: 1, pointerType: 'touch' });
  assert.equal(el(h, 'bwWord').textContent, 'SHELF');
  assert.equal(el(h, 'bwSubmit').disabled, false);
  el(h, 'bwSubmit').click();
  assert.equal(el(h, 'bwScore').textContent, '25 / 42');
  h.document.elementFromPoint = original;
  h.close();
});

test('tap selection does not reset a partial word when each tile fires pointerdown and click', () => {
  const h = setup();
  for (const index of M.LEVELS[0].path) {
    el(h, `bwTile${index}`).dispatch('pointerdown', { button: 0, isPrimary: true, pointerId: index + 1, pointerType: 'touch', clientX: index * 50, clientY: 0 });
    el(h, `bwTile${index}`).dispatch('pointerup', { pointerId: index + 1, pointerType: 'touch' });
    el(h, `bwTile${index}`).click();
  }
  assert.equal(el(h, 'bwWord').textContent, 'SHELF');
  el(h, 'bwSubmit').click();
  assert.equal(el(h, 'bwScore').textContent, '25 / 42');
  h.close();
});

test('a word containing the burning tile gives a visible bonus and pushes the spark back up', () => {
  const h = setup(1), model = h.game.getModel(), route = model.hint();
  assert.ok(route.includes(model.view().fire.index));
  for (const index of route) el(h, `bwTile${index}`).click();
  const word = route.map(index => model.view().board[index]).join('');
  el(h, 'bwSubmit').click();
  assert.match(el(h, 'bwStatus').textContent, /dập tắt tia lửa/);
  assert.notEqual(model.view().fire.row, 2);
  assert.equal(el(h, `bwTile${model.view().fire.index}`).classList.contains('bw-fire'), true);
  assert.equal(el(h, 'bwScore').textContent, `${word.length ** 2 + M.FIRE_BONUS} / 42`);
  h.close();
});

test('three shelves resolve to a win; replay starts a fresh campaign and closing releases listeners', () => {
  const h = setup(3);
  let actions = 0;
  while (h.game.getModel().view().status === 'playing' && actions++ < 30) {
    const model = h.game.getModel(), route = model.hint();
    assert.ok(route, 'each live shelf exposes a playable word route');
    tapWord(h, route);
  }
  assert.equal(h.game.getModel().view().status, 'won');
  assert.equal(el(h, 'bwResult').hidden, false);
  assert.match(el(h, 'bwResultTitle').textContent, /an toàn/);
  assert.equal(el(h, 'bwStep2').classList.contains('bw-step-done'), true);
  el(h, 'bwPlayAgain').click();
  assert.equal(h.game.getModel().view().status, 'playing');
  assert.equal(h.game.getModel().view().stageIndex, 0);
  assert.equal(el(h, 'bwResult').hidden, true);
  assert.equal(el(h, 'bwScore').textContent, '0 / 42');
  h.close();
});

test('game controls keep 44px targets, phone layout, reduced motion, and the Calibri stack', () => {
  const css = read('scripts/games/bookworm.css');
  assert.match(css, /min-width: 44px; min-height: 44px/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /'Calibri', 'Inter', -apple-system, sans-serif/);
  assert.doesNotMatch(css, /min-width: 40px/);
});

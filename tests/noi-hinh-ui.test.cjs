const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/noi-hinh-model.js');

const SAVE_KEY = 'np_noihinh_campaign_v3';
const RECOVERY_KEY = `${SAVE_KEY}_recovery`;

function open(storage = new Map()) {
  const h = harness({ loadEngines: false, loadApp: false, storage });
  vm.runInContext(read('scripts/games/noi-hinh-certified-deals.js'), h.context, { filename: 'noi-hinh-certified-deals.js' });
  vm.runInContext(read('scripts/games/noi-hinh-model.js'), h.context, { filename: 'noi-hinh-model.js' });
  vm.runInContext(read('scripts/games/noi-hinh.js'), h.context, { filename: 'noi-hinh.js' });
  h.mountResult = h.context.NP_NoiHinh.mount(h.container, h.context.NP_GameSession.start());
  return h;
}

function tapCell(h, index) {
  const tile = h.container.querySelectorAll('.nh-tile')[index];
  h.container.dispatch('click', { target: tile });
}

function tapPair(h, pair) {
  tapCell(h, pair.a);
  tapCell(h, pair.b);
}

function makeStuckProgress() {
  const campaignSeed = 0x2345;
  const dealNumbers = Array(M.CAMPAIGN.length).fill(0);
  const stage = M.CAMPAIGN.length;
  const game = M.create({ stage, seed: M.seedForStage(campaignSeed, stage, 0) });
  const witness = game.view().witness;
  for (const pair of witness.slice(0, -3)) {
    game.tap(pair.a);
    game.tap(pair.b);
    game.drain();
  }
  const state = game.serialize();
  const symbols = [...new Set(state.board.filter(value => value !== null))];
  state.board = '.BCA...AB..C.............'.split('').map(char => char === '.' ? null : symbols[char.charCodeAt(0) - 65]);
  state.status = 'stuck';
  state.selected = null;
  const progress = { version: M.PROGRESS_VERSION, campaignSeed, unlockedStage: stage, activeStage: stage, dealNumbers, game: state };
  assert.equal(M.validProgress(progress), true);
  return progress;
}

test('Nối Hình opens immediately with a small accessible board and stage picker', () => {
  const h = open();
  assert.deepEqual(h.errors, []);
  assert.equal(h.container.querySelectorAll('.nh-tile').length, 12);
  assert.equal(h.mountResult.getModel().view().rows, 3);
  assert.equal(h.container.querySelector('#nhOverlay').hidden, true);
  assert.equal(h.container.querySelector('#nhStatus').getAttribute('role'), 'status');
  assert.equal(h.container.querySelector('#nhStage').querySelectorAll('option').length, M.CAMPAIGN.length);
  assert.match(h.container.innerHTML, /đường đi rẽ tối đa hai lần/i);
  assert.match(h.container.querySelectorAll('.nh-tile')[0].getAttribute('aria-label'), /Hàng 1, cột 1/);
  h.context.NP_GameSession.stop();
  assertStopped(h);
});

test('a valid pair clears, briefly draws its route, and persists a verified progress save', () => {
  const h = open();
  const pair = h.mountResult.getModel().view().legalPairs[0];
  tapPair(h, pair);
  const tiles = h.container.querySelectorAll('.nh-tile');
  assert.equal(tiles[pair.a].classList.contains('nh-empty'), true);
  assert.equal(tiles[pair.b].classList.contains('nh-empty'), true);
  assert.equal(h.container.querySelector('#nhPairs').textContent, '1 / 6');
  assert.notEqual(h.container.querySelector('#nhPath').getAttribute('points'), '');
  const saved = JSON.parse(h.stored.get(SAVE_KEY));
  assert.equal(M.validProgress(saved), true);
  assert.equal(saved.game.moves, 1);
  h.flushTimeouts();
  assert.equal(h.container.querySelector('#nhPath').getAttribute('points'), '');
  h.context.NP_GameSession.stop();
  assertStopped(h);
});

test('keyboard focus follows the current grid, Escape deselects, and P pauses/resumes', () => {
  const h = open();
  const tiles = h.container.querySelectorAll('.nh-tile');
  tapCell(h, 0);
  h.container.dispatch('keydown', { key: 'ArrowRight', target: tiles[0], repeat: false });
  assert.equal(h.container.querySelectorAll('.nh-tile')[1].focused, true);
  h.container.dispatch('keydown', { key: 'Escape', target: h.container.querySelectorAll('.nh-tile')[1], repeat: false });
  assert.equal(h.mountResult.getModel().view().selected, null);

  h.container.dispatch('keydown', { key: 'p', target: h.container, repeat: false });
  assert.equal(h.mountResult.isPaused(), true);
  assert.equal(h.container.querySelector('#nhOverlay').hidden, false);
  h.container.querySelector('#nhContinue').click();
  assert.equal(h.mountResult.isPaused(), false);
  assert.equal(h.container.querySelector('#nhOverlay').hidden, true);
  h.context.NP_GameSession.stop();
  assertStopped(h);
});

test('exact retry preserves its seed while a new deal advances the deterministic replay index', () => {
  const h = open();
  const initial = h.mountResult.getModel().serialize();
  tapPair(h, h.mountResult.getModel().view().legalPairs[0]);
  const afterMatch = h.mountResult.getModel().serialize();
  h.container.querySelector('#nhNew').click();
  assert.equal(h.container.querySelector('#nhConfirm').hidden, false);
  h.container.querySelector('#nhNo').click();
  assert.deepEqual(h.mountResult.getModel().serialize(), afterMatch);

  h.container.querySelector('#nhNew').click();
  h.container.querySelector('#nhYes').click();
  assert.deepEqual(h.mountResult.getModel().view().board, initial.board);
  assert.equal(h.mountResult.getModel().view().dealSeed, initial.dealSeed);
  assert.equal(h.mountResult.getProgress().dealNumbers[0], 0);

  h.container.querySelector('#nhNew').click();
  h.container.querySelector('#nhFresh').click();
  const fresh = h.mountResult.getModel().view();
  assert.notEqual(fresh.dealSeed, initial.dealSeed);
  assert.equal(M.verifyWitness(fresh.originBoard, fresh.witness, fresh.stage), true);
  assert.equal(h.mountResult.getProgress().dealNumbers[0], 1);
  h.context.NP_GameSession.stop();
  assertStopped(h);
});

test('clearing a stage unlocks the next and unlocked-stage replay generates a new seeded deal', () => {
  const h = open();
  const first = h.mountResult.getModel().view();
  for (const pair of first.witness) tapPair(h, pair);
  assert.equal(h.mountResult.getModel().view().status, 'won');
  assert.equal(h.mountResult.getProgress().unlockedStage, 2);
  assert.equal(h.container.querySelector('#nhStage').querySelectorAll('option')[1].getAttribute('disabled'), null);
  h.container.querySelector('#nhContinue').click();
  assert.equal(h.mountResult.getModel().view().stage, 2);
  assert.equal(h.mountResult.getModel().view().board.length, 16);
  const firstStageTwoSeed = h.mountResult.getModel().view().dealSeed;

  const picker = h.container.querySelector('#nhStage');
  picker.value = '1';
  picker.dispatch('change', { target: picker });
  assert.equal(h.mountResult.getModel().view().stage, 1);
  assert.notEqual(h.mountResult.getModel().view().dealSeed, first.dealSeed);
  assert.equal(h.mountResult.getProgress().dealNumbers[0], 1);
  picker.value = '2';
  picker.dispatch('change', { target: picker });
  assert.equal(h.mountResult.getModel().view().dealSeed !== firstStageTwoSeed, true);
  h.context.NP_GameSession.stop();
  assertStopped(h);
});

test('a saved board resumes after remount with the same stage, seed, and selection', () => {
  const storage = new Map();
  const h = open(storage);
  const pair = h.mountResult.getModel().view().legalPairs[0];
  tapCell(h, pair.a);
  const expected = JSON.parse(JSON.stringify(h.mountResult.getModel().serialize()));
  h.context.NP_GameSession.stop();
  assertStopped(h);

  const resumed = open(storage);
  assert.deepEqual(JSON.parse(JSON.stringify(resumed.mountResult.getModel().serialize())), expected);
  assert.equal(resumed.mountResult.getModel().view().selected, pair.a);
  resumed.context.NP_GameSession.stop();
  assertStopped(resumed);
});

test('malformed progress is retained for recovery and future versions are never overwritten', () => {
  const corruptStorage = new Map([[SAVE_KEY, '{broken']]);
  const corrupt = open(corruptStorage);
  assert.equal(corrupt.stored.get(RECOVERY_KEY), '{broken');
  assert.match(corrupt.container.querySelector('#nhStorageNote').textContent, /Bản lưu lỗi/);
  tapCell(corrupt, 0);
  assert.equal(M.validProgress(JSON.parse(corrupt.stored.get(SAVE_KEY))), true);
  assert.equal(corrupt.stored.get(RECOVERY_KEY), '{broken');
  corrupt.context.NP_GameSession.stop();
  assertStopped(corrupt);

  const futureRaw = JSON.stringify({ version: M.PROGRESS_VERSION + 1, preserve: true });
  const future = open(new Map([[SAVE_KEY, futureRaw]]));
  tapCell(future, 0);
  assert.equal(future.stored.get(SAVE_KEY), futureRaw);
  assert.match(future.container.querySelector('#nhStorageNote').textContent, /mới hơn/);
  future.context.NP_GameSession.stop();
  assertStopped(future);
});

test('a stuck save offers reshuffle and the replacement stays certified with the same pair counts', () => {
  const progress = makeStuckProgress();
  const h = open(new Map([[SAVE_KEY, JSON.stringify(progress)]]));
  const before = h.mountResult.getModel().view();
  const counts = before.icons.map((_, symbol) => before.board.filter(value => value === symbol).length);
  assert.equal(before.status, 'stuck');
  assert.equal(h.container.querySelector('#nhReshuffle').hidden, false);
  h.container.querySelector('#nhReshuffle').click();
  const after = h.mountResult.getModel().view();
  assert.equal(after.status, 'playing');
  assert.ok(after.legalPairs.length > 0);
  assert.deepEqual(after.icons.map((_, symbol) => after.board.filter(value => value === symbol).length), counts);
  assert.equal(M.verifyWitness(after.originBoard, after.witness, after.stage), true);
  assert.equal(M.validProgress(JSON.parse(h.stored.get(SAVE_KEY))), true);
  h.context.NP_GameSession.stop();
  assertStopped(h);
});

test('blur and hidden-tab events pause, and cleanup removes listeners and route timers', () => {
  const h = open();
  tapPair(h, h.mountResult.getModel().view().legalPairs[0]);
  assert.equal(h.timers.size > 0, true, 'a matched route is scheduled to clear');
  h.window.dispatch('blur');
  assert.equal(h.mountResult.isPaused(), true);
  h.container.querySelector('#nhContinue').click();
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.mountResult.isPaused(), true);
  h.context.NP_GameSession.stop();
  assertStopped(h);
  assert.equal(h.timers.size, 0, 'cleanup cancels the route timer');
  assert.equal(h.container.classList.contains('nh-host'), false);
});

test('styling preserves 44px touch controls and original assets', () => {
  const css = read('scripts/games/noi-hinh.css');
  const source = read('scripts/games/noi-hinh.js');
  const cover = read('assets/noi-hinh-original.svg');
  assert.match(css, /min-width:44px;min-height:44px/);
  assert.match(source, /grid-template-columns', `repeat\(\$\{view\.cols\}/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(source, /Nối Hình/);
  assert.doesNotMatch(source + cover, /licensed replica|official edition/i);
  assert.match(cover, /Original abstract tile-connect cover/);
});

test('the exact catalog route launches original Nối Hình and keeps the unverified cover retired', () => {
  const h = harness();
  assert.equal(h.context.openGameById('lat-the-tri-nho'), true);
  assert.ok(h.container.querySelector('#nhBoard'));
  assert.match(h.container.innerHTML, /<h3>Nối Hình<\/h3>/);
  assert.match(read('app.js'), /'lat-the-tri-nho': 'assets\/noi-hinh-original\.svg'/);
  assert.match(read('index.html'), /noi-hinh-certified-deals\.js\?v=20261008_nh3/);
  assert.match(read('index.html'), /noi-hinh-model\.js\?v=20261008_nh3/);
  assert.match(read('index.html'), /noi-hinh\.js\?v=20261008_nh3/);
  assert.match(read('scripts/release-preflight.mjs'), /'pikachu_cover\.png'/);
  assert.doesNotMatch(read('scripts/engines.js'), /Authentic Pokémon Tokens|Charmander/);
  assert.deepEqual(h.errors, []);
  h.context.closeGameModal();
  assertStopped(h);
});

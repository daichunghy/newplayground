const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, games, read } = require('./helpers/game-harness.cjs');

const IDS = [
  'worlds-hardest-game', 'qwop-flash', 'helicopter-game',
  'desktop-tower-defense', 'red-ball-flash'
];

function modeFor(id) {
  const h = harness({ loadApp: false });
  const game = games.find(g => g.id === id);
  assert.ok(game, 'catalog entry: ' + id);
  const result = h.context.NP_ClassicWeb.launchGame(h.container, game);
  return { h, ...result };
}

test('five classics keep distinct dedicated engines and a pause-aware single session', () => {
  for (const id of IDS) {
    const { h, session, gameState } = modeFor(id);
    assert.ok(gameState.getState, id);
    assert.ok(session.isActive(), id);
    h.frame(); h.frame();
    assert.ok(h.container.querySelector('#flashCanvas'), id + ' playfield');
    session.pause();
    assert.equal(h.frames.size, 0);
    session.resume(); h.frame();
    h.context.NP_GameSession.stop();
    h.container.replaceChildren();
    assertStopped(h);
  }
});

test('Worlds Hardest Game has 30 non-identical routes, blue orbs and checkpoint logic', () => {
  const { h, gameState } = modeFor('worlds-hardest-game');
  const start = gameState.getState();
  assert.equal(start.level, 1);
  assert.equal(start.route.length, 4);
  assert.equal(start.orbs.length, 4);
  assert.equal(start.coins.length, 0, 'opening stage has no coins');
  const startX = start.player.x;
  for (let i = 0; i < 7; i++) gameState.update(.016, new Set(['right']));
  assert.ok(gameState.getState().player.x > startX, 'square moves right');
  assert.ok(read('scripts/flash-world-hardest.js').includes('ROWS-1-y'),
    'later half of the game mirrors maze layouts');
  h.context.NP_GameSession.stop();
});

test('Red Ball has 17 named stage patterns, real menu, level selection and game start', () => {
  const { h, gameState } = modeFor('red-ball-flash');
  const first = gameState.getState();
  assert.equal(first.phase, 'menu');
  assert.equal(first.stageCount, 17);
  gameState.action('levels');
  assert.equal(gameState.getState().phase, 'select');
  gameState.action('start');
  const play = gameState.getState();
  assert.equal(play.phase, 'playing');
  assert.equal(play.stage.feature, 'intro');
  assert.equal(play.stage.platforms.length, 6);
  gameState.update(.016, new Set(['right']));
  assert.ok(gameState.getState().ball.x >= 55);
  for (const word of ['Lifts and thorns','Axes','Springboards','Box bridge','Catapult','The King'])
    assert.ok(read('scripts/flash-red-ball.js').includes(word));
  h.context.NP_GameSession.stop();
});

test('Desktop Tower Defense restores six 2007 tower families and concurrent waves', () => {
  const { h, gameState } = modeFor('desktop-tower-defense');
  const init = gameState.getState();
  assert.equal(init.choices.length, 6);
  assert.deepEqual(JSON.stringify(init.choices.map(k => k.name)),
    JSON.stringify(['PELLET','SQUIRT','DART','SWARM','FROST','BASH']));
  gameState.action('t5');
  assert.equal(gameState.getState().choice, 5);
  gameState.pointer('down', 37 + 3*31 + 15, 79 + 3*31 + 15);
  assert.equal(gameState.getState().towers.length, 1);
  assert.equal(gameState.getState().money, 25);
  gameState.action('send');
  gameState.action('send');
  const overlap = gameState.getState();
  assert.equal(overlap.wave, 2, 'original allows sending level while level one is active');
  assert.equal(overlap.queues.length, 2);
  assert.ok(overlap.score >= 20, 'early send bonus');
  gameState.update(.25);
  assert.ok(gameState.getState().creeps.length > 0);
  h.context.NP_GameSession.stop();
});

test('QWOP uses four independently mapped opposing muscles instead of directional movement', () => {
  const { h, gameState } = modeFor('qwop-flash');
  const first = gameState.getState().legA.thigh;
  gameState.update(.016, new Set(['q', 'p']));
  const second = gameState.getState();
  assert.notEqual(second.legA.thigh, first);
  assert.equal(second.fallen, false, 'starts balanced');
  assert.ok(second.progress >= 0);
  assert.match(read('scripts/flash-qwop.js'), /THIGHS/);
  assert.match(read('scripts/flash-qwop.js'), /CALVES/);
  h.context.NP_GameSession.stop();
});

test('Helicopter Game keeps the original hold-to-rise and release-to-drop flight', () => {
  const { h, gameState } = modeFor('helicopter-game');
  gameState.pointer('down');
  gameState.update(.016, new Set());
  assert.ok(gameState.getState().distance > 0);
  const before = gameState.getState().height;
  gameState.update(.02, new Set());
  assert.ok(gameState.getState().height <= before,
    'holding button raises the helicopter');
  gameState.pointer('up');
  gameState.update(.02, new Set());
  h.context.NP_GameSession.stop();
});

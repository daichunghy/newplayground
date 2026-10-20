const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read, games, drawing } = require('./helpers/game-harness.cjs');

// Probes are injected only into the test VM; production engines expose no cheats.
function launch(name, probe, options = {}) {
  const h = harness({ loadEngines: false, loadApp: false });
  if (options.legacySession) {
    const start = h.context.NP_GameSession.start;
    h.context.NP_GameSession.start = () => ({ ...start(), pause: undefined, resume: undefined, onPauseChange: undefined });
  }
  if (options.blockStorage) {
    h.context.localStorage = {
      getItem() { throw new Error('storage blocked'); },
      setItem() { throw new Error('storage blocked'); },
      removeItem() { throw new Error('storage blocked'); }
    };
  }
  const marker = `function ${name}(container, game) {`;
  const source = read('scripts/engines.js');
  assert.ok(source.includes(marker));
  vm.runInContext(source.replace(marker, marker + '\nwindow.__coreTest = ' + probe + ';'), h.context);
  vm.runInContext(options.random === undefined
    ? 'Math.random = (() => { let s = 512; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); })();'
    : `Math.random = () => ${options.random};`, h.context);
  h.context.NP_Engines[name](h.container, games[0]);
  return { ...h, api: h.context.__coreTest };
}

const tankProbe = `{
  state: () => ({ stage, score, lives, gameOver, baseAlive, player: { ...player }, keys: { ...keys }, bullets: bullets.length }),
  clearField: () => { map = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); player.x = 150; player.y = 400; remainingWave = 1; enemyTanks = []; },
  finalEnemy: (bomb) => {
    map = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    remainingWave = 0;
    enemyTanks = [{ x: 200, y: 100, dir: 0, speed: 0, shootTimer: 999, hp: 1, maxHp: 1 }];
    if (bomb) powerups = [{ x: player.x, y: player.y, type: 'bomb', timer: 600 }];
    else bullets = [{ x: 200, y: 100, vx: 0, vy: 0, isPlayer: true }];
  },
  lose: () => {
    map = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    lives = 1; score = 444; player.invincibleTimer = 0;
    bullets = [{ x: player.x, y: player.y, vx: 0, vy: 0, isPlayer: false }];
  }
}`;

test('Battle City completes final enemies from bullets and bomb items without losing its animation loop', () => {
  for (const bomb of [false, true]) {
    const h = launch('launchXeTang1990', tankProbe, { random: 0.9 });
    h.api.finalEnemy(bomb);
    h.frame(1000 / 60);
    assert.equal(h.api.state().stage, 2);
    assert.ok(h.api.state().score >= 1100);
    assert.ok(h.frames.size > 0, 'a new wave still schedules frames');
    h.frame(1000 / 60);
    assert.ok(h.frames.size > 0);
    h.context.NP_GameSession.stop();
  }
});

test('Battle City keeps the final score on loss and restarts into a live game', () => {
  const h = launch('launchXeTang1990', tankProbe, { random: 0.9 });
  h.api.lose(); h.frame(1000 / 60);
  assert.equal(h.api.state().gameOver, true);
  assert.equal(h.api.state().score, 444);
  assert.equal(h.api.state().lives, 0);
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  assert.equal(h.api.state().bullets, 0, 'loss prevents new shots');
  h.container.querySelector('#xtRestartBtn').dispatch('click');
  h.frame(1000 / 60);
  assert.equal(h.api.state().gameOver, false);
  assert.equal(h.api.state().lives, 3);
  assert.equal(h.api.state().score, 0);
  assert.ok(h.frames.size > 0);
});

test('Battle City movement has the same speed at 60Hz and 120Hz', () => {
  const positions = [];
  for (const hz of [60, 120]) {
    const h = launch('launchXeTang1990', tankProbe, { random: 0.9 });
    h.api.clearField();
    h.window.dispatch('keydown', { key: 'ArrowUp', code: 'ArrowUp' });
    for (let i = 0; i < hz; i++) h.frame(1000 / hz);
    positions.push(h.api.state().player.y);
    h.context.NP_GameSession.stop();
  }
  assert.ok(Math.abs(positions[0] - positions[1]) < 0.01);
  assert.ok(positions[0] < 300, 'the test actually moves the tank');
});

test('held movement and fire have independent captured pointers and cancel safely', () => {
  const h = launch('launchXeTang1990', tankProbe, { random: 0.9 });
  const up = h.container.querySelector('#xtUp');
  const fire = h.container.querySelector('#xtFireBtn');
  up.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch' });
  fire.dispatch('pointerdown', { pointerId: 2, pointerType: 'touch' });
  h.window.dispatch('pointerup', { pointerId: 2, pointerType: 'touch' });
  assert.equal(h.api.state().keys.ArrowUp, true);
  assert.equal(h.api.state().keys.Space, false);
  h.window.dispatch('pointercancel', { pointerId: 1, pointerType: 'touch' });
  assert.equal(h.api.state().keys.ArrowUp, false);
  up.dispatch('pointerdown', { pointerId: 3, pointerType: 'touch' });
  h.window.dispatch('blur');
  assert.equal(h.api.state().keys.ArrowUp, false);
});

const bomberProbe = `{
  state: () => ({ stage, score, lives, needles, phase: gameState, player: { ...player }, enemies: enemies.map(e => ({ x: e.x, y: e.y })) }),
  finishStage: () => { gameState = 'playing'; player.x = TILE * 1.5; player.y = TILE * 1.5; map[1][1] = 0; exitDoorPos = { r: 1, c: 1 }; exitUnlocked = true; },
  oldRun: () => { player.speed = 4.8; player.bombCapacity = 8; player.flameRange = 6; player.hasTurtle = true; needles = 9; gameState = 'gameover'; }
}`;

test('Bomberman survives dense random maps, gives distinct spawns, and keeps running after stage clear', () => {
  const h = launch('launchDatBom', bomberProbe, { random: 0 });
  const spawns = h.api.state().enemies;
  assert.equal(new Set(spawns.map(e => e.x + ',' + e.y)).size, spawns.length);
  h.api.finishStage(); h.frame(1000 / 60);
  assert.equal(h.api.state().phase, 'stageclear');
  assert.ok(h.frames.size > 0);
  h.container.querySelector('#dbNextStageBtn').dispatch('click');
  h.frame(1000 / 60);
  assert.equal(h.api.state().stage, 2);
  assert.equal(h.api.state().phase, 'playing');
  assert.ok(h.frames.size > 0);
  h.api.oldRun();
  h.container.querySelector('#dbRetryBtn').dispatch('click');
  assert.equal(h.api.state().needles, 1);
  assert.equal(h.api.state().player.bombCapacity, 1);
  assert.equal(h.api.state().player.flameRange, 1);
  assert.equal(h.api.state().player.hasTurtle, false);
});

const fruitProbe = `{
  state: () => ({ score, gameOver, fruits: fruits.map(f => ({ x: f.x, y: f.y, sliced: f.sliced })) }),
  prepare: (bomb = false) => {
    fruits = [{ x: 260, y: 200, vx: 0, vy: -2, radius: 22, rotation: 0, rotSpeed: 0,
      sliced: false, isBomb: bomb, type: FRUIT_TYPES[0], perpX: 0, perpY: 0 }];
  },
  pair: () => {
    fruits = [180, 340].map(x => ({ x, y: 200, vx: 0, vy: -2, radius: 22, rotation: 0, rotSpeed: 0,
      sliced: false, isBomb: false, type: FRUIT_TYPES[0], perpX: 0, perpY: 0 }));
  }
}`;

test('Fruit Ninja detects the whole swipe segment and never joins two separate swipes', () => {
  const h = launch('launchFruitNinja', fruitProbe, { random: 0.9 });
  const canvas = h.container.querySelector('#fnCanvas');
  const point = (pointerId, x) => ({ pointerId, pointerType: 'touch', clientX: x, clientY: 200 });
  h.api.prepare();
  canvas.dispatch('pointerdown', point(1, 100));
  canvas.dispatch('pointermove', point(1, 420));
  assert.equal(h.api.state().fruits[0].sliced, true, 'a fast swipe crosses the fruit');
  assert.equal(h.api.state().score, 10);
  canvas.dispatch('pointercancel', point(1, 420));
  h.api.prepare();
  canvas.dispatch('pointerdown', point(2, 420));
  canvas.dispatch('pointercancel', point(2, 420));
  canvas.dispatch('pointerdown', point(3, 100));
  assert.equal(h.api.state().fruits[0].sliced, false, 'a new stroke starts at its own location');
});

test('Fruit Ninja fruit motion has the same speed at 60Hz and 120Hz', () => {
  const positions = [];
  for (const hz of [60, 120]) {
    const h = launch('launchFruitNinja', fruitProbe, { random: 0.9 });
    h.api.prepare();
    for (let i = 0; i < hz / 2; i++) h.frame(1000 / hz);
    positions.push(h.api.state().fruits[0].y);
    h.context.NP_GameSession.stop();
  }
  assert.ok(Math.abs(positions[0] - positions[1]) < 0.01);
});

test('Fruit Ninja gives the same combo for a fast stroke and a stroke with more pointer samples', () => {
  const scores = [];
  for (const samples of [[420], [180, 260, 340, 420]]) {
    const h = launch('launchFruitNinja', fruitProbe, { random: 0.9 });
    h.api.pair();
    const canvas = h.container.querySelector('#fnCanvas');
    canvas.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 80, clientY: 200 });
    for (const x of samples) canvas.dispatch('pointermove', { pointerId: 1, clientX: x, clientY: 200 });
    scores.push(h.api.state().score);
  }
  assert.deepEqual(scores, [50, 50]);
});

test('Gold Miner keeps its result readable across frames and restarts from the fire button', () => {
  const h = launch('launchDaoVang', `{
    lose: () => { score = 320; gameOverScreen(); },
    state: () => ({ score, stage, gameState })
  }`);
  const labels = [];
  const original = drawing.fillText;
  drawing.fillText = text => labels.push(String(text));
  try {
    h.api.lose(); h.frame();
    assert.ok(labels.some(text => text.includes('CHƯA ĐẠT MỤC TIÊU')));
    labels.length = 0; h.frame();
    assert.ok(labels.some(text => text.includes('CHƯA ĐẠT MỤC TIÊU')), 'the result is drawn again');
    h.container.querySelector('#dvFireClawBtn').dispatch('click');
    assert.equal(h.api.state().gameState, 'playing');
    assert.equal(h.api.state().score, 0);
    assert.equal(h.api.state().stage, 1);
    assert.ok(h.frames.size > 0);
  } finally { drawing.fillText = original; }
});

test('core games remain playable when local storage throws', () => {
  for (const name of ['launchHangRong', 'launchDaoVang', 'launchLine98', 'launchKimCuong',
    'launchDatBom', 'launchCaro', 'launchSnake', 'launchTetris', 'launchFlappyBird', 'launchDoMin', 'launchPikachu']) {
    const h = launch(name, '{}', { blockStorage: true });
    assert.doesNotThrow(() => h.frame(), name);
    assert.ok(h.container.children.length > 0, name);
    assert.deepEqual(h.errors, [], name);
    h.context.NP_GameSession.stop();
  }
});

test('Bejeweled offers a legal move and ignores hints while resolving a cascade', () => {
  const h = launch('launchKimCuong', `{
    state: () => ({ board: board.map(row => [...row]), matches: findMatches().length, move: findLegalMove() }),
    busy: () => { isProcessing = true; board[0][0] = 0; }
  }`, { random: 0 });
  assert.equal(h.api.state().matches, 0);
  assert.ok(h.api.state().move);
  h.api.busy();
  const before = JSON.stringify(h.api.state().board);
  h.container.querySelector('#kcHintBtn').dispatch('click');
  assert.equal(JSON.stringify(h.api.state().board), before, 'hint cannot replace a half-cleared board');
});

test('local and shared pauses stay synchronized in Snake, Tetris and Flappy and release input', () => {
  const cases = [
    ['launchSnake', '#snkCanvas', '#snkPauseBtn', `{
      state: () => ({ paused, dragging: !!swipe, gameOver, score }),
      lose: () => { gameOver = true; score = 321; }
    }`],
    ['launchTetris', '#tetCanvas', '#tetPauseBtn', `{
      state: () => ({ paused, dragging: !!drag, held: held.left || held.right || held.down, gameOver, score }),
      lose: () => { gameOver = true; score = 321; }
    }`],
    ['launchFlappyBird', '#fbCanvas', '#fbPauseBtn', `{
      state: () => ({ paused, started, gameOver, score }),
      lose: () => { gameOver = true; score = 321; }
    }`]
  ];
  for (const [name, canvasId, pauseId, probe] of cases) {
    const h = launch(name, probe);
    h.container.querySelector(canvasId).dispatch('pointerdown', {
      pointerId: 1, pointerType: 'touch', clientX: 160, clientY: 120
    });
    if (name === 'launchTetris') h.window.dispatch('keydown', { key: 'ArrowLeft' });
    const session = h.context.NP_GameSession.getCurrent();
    session.pause();
    assert.equal(h.api.state().paused, true, name + ' reflects the shared pause');
    assert.equal(h.container.querySelector(pauseId).textContent, 'Tiếp tục');
    assert.equal(h.api.state().dragging || false, false, name + ' cancels active gestures');
    assert.equal(h.api.state().held || false, false, name + ' releases held input');
    assert.equal(h.frames.size, 0);
    h.frame(5000);
    session.resume();
    h.frame();
    assert.equal(h.api.state().paused, false, name + ' resumes with one action');
    assert.ok(h.frames.size > 0);

    h.container.querySelector(pauseId).dispatch('click');
    assert.equal(h.api.state().paused, true, name + ' retains its manual pause control');
    assert.equal(session.isPaused(), true, name + ' native pause uses the same session');
    assert.equal(h.frames.size, 0, 'native pause also stops scheduled frames');
    session.resume();
    assert.equal(h.api.state().paused, false, name + ' a shared resume clears the native pause');
    assert.equal(h.container.querySelector(pauseId).textContent, 'Tạm dừng');
    session.pause();
    h.container.querySelector(pauseId).dispatch('click');
    assert.equal(session.isPaused(), false, name + ' native resume clears a shared pause');
    assert.equal(h.api.state().paused, false);
    if (name === 'launchSnake') {
      h.window.dispatch('keydown', { key: ' ', code: 'Space' });
      assert.equal(session.isPaused(), true, 'Snake Space also uses shared pause');
      session.resume();
      assert.equal(h.api.state().paused, false);
    }
    h.api.lose();
    h.container.querySelector(pauseId).dispatch('click');
    assert.equal(session.isPaused(), false, 'a terminal game does not start a native pause');
    session.pause(); session.resume(); h.frame();
    assert.equal(h.api.state().gameOver, true, 'resume never revives a finished run');
    assert.equal(h.api.state().score, 321, 'resume retains the final score');
    assert.deepEqual(h.errors, []);
    h.context.NP_GameSession.stop();
  }
});

test('classic pause controls retain local fallback when the session has no pause API', () => {
  for (const [name, canvasId, pauseId] of [
    ['launchSnake', '#snkCanvas', '#snkPauseBtn'],
    ['launchTetris', '#tetCanvas', '#tetPauseBtn'],
    ['launchFlappyBird', '#fbCanvas', '#fbPauseBtn']
  ]) {
    const h = launch(name, '{ state: () => ({ paused }) }', { legacySession: true });
    h.container.querySelector(canvasId).dispatch('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 160, clientY: 120 });
    h.container.querySelector(pauseId).dispatch('click');
    assert.equal(h.api.state().paused, true, name + ' pauses locally');
    h.container.querySelector(pauseId).dispatch('click');
    assert.equal(h.api.state().paused, false, name + ' resumes locally');
    assert.deepEqual(h.errors, []);
    h.context.NP_GameSession.stop();
  }
});

test('Minesweeper cancels an unfinished long press when the shared session pauses', () => {
  const h = launch('launchDoMin', `{
    state: () => ({ flagged: flags[0][0], pressing: isMouseDepressed, pending: activePressTimers.size })
  }`);
  const cell = h.container.querySelector('#dmGrid').children[0];
  cell.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 });
  cell.dispatch('mousedown');
  assert.equal(h.api.state().pending, 1);
  const session = h.context.NP_GameSession.getCurrent();
  session.pause();
  assert.equal(h.api.state().pending, 0);
  assert.equal(h.api.state().pressing, false);
  h.frame(5000);
  session.resume(); h.flushTimeouts();
  assert.equal(h.api.state().flagged, false, 'a released press cannot flag a cell after resume');
  assert.deepEqual(h.errors, []);
});

test('player guides cover every actual launcher and resolve replay buttons from the rendered game', () => {
  const h = harness({ loadApp: false });
  vm.runInContext(read('scripts/game-guide.js'), h.context);
  const guide = h.context.NP_GameGuide;
  const misleadingCatalogEntry = { id: 'guide-check', title: '2048', category: 'test' };
  const generic = guide.describe(null, misleadingCatalogEntry).objective;
  const launchers = Object.entries(h.context.NP_Engines).filter(([name, fn]) => name.startsWith('launch') && typeof fn === 'function');
  let persistentGames = 0;
  for (const [name, launcher] of launchers) {
    launcher(h.container, misleadingCatalogEntry);
    const description = guide.describe(h.container, misleadingCatalogEntry);
    assert.notEqual(description.objective, generic, name + ' has a specific objective');
    for (const field of ['objective', 'keyboard', 'touch']) assert.ok(description[field].length > 10, name + ' has ' + field);
    if (description.restartSelector) assert.ok(h.container.querySelector(description.restartSelector), name + ' replay target exists');
    if (description.persistent) {
      persistentGames++;
      assert.equal(description.restartSelector, undefined, name + ' does not expose a save deletion button');
    }
    if (name === 'launchSnake') assert.match(description.objective, /rắn/);
    if (name === 'launchGame2048') assert.equal(description.restartSelector, '#g2048NewBtn');
    const original = description.objective;
    description.objective = 'changed by caller';
    assert.equal(guide.describe(h.container, misleadingCatalogEntry).objective, original, 'descriptions are independent values');
    h.context.NP_GameSession.stop();
  }
  assert.equal(persistentGames, 2);
  assert.ok(launchers.length >= 43, 'all dedicated launcher groups were inspected');
  h.context.NP_TyperShark.launch(h.container, misleadingCatalogEntry);
  assert.match(guide.describe(h.container, misleadingCatalogEntry).keyboard, /Enter dùng Zapper/);
  assert.deepEqual(h.errors, []);
});

test('archetype guides use the launched mode and retain its player-facing alias note', () => {
  const h = harness({ loadApp: false });
  vm.runInContext(read('scripts/game-guide.js'), h.context);
  for (const kind of ['shooter', 'runner', 'reflex', 'puzzle', 'management', 'quiz', 'duel']) {
    const game = games.find(item => !item.id.includes('typer-shark') && h.context.NP_Archetypes.kindFor(item) === kind);
    assert.ok(game, kind + ' is represented in the catalog');
    h.context.NP_Archetypes.launch(h.container, game);
    const description = h.context.NP_GameGuide.describe(h.container, { title: 'A different catalog title', id: 'unrelated' });
    assert.equal(h.container.querySelector('#arcCanvas').dataset.kind, kind);
    assert.ok(description.objective && description.keyboard && description.touch);
    assert.equal(description.restartSelector, '#arcRestart');
    assert.match(description.note, /chưa mô phỏng đầy đủ luật game gốc/);
    assert.ok(h.container.querySelector('#arcHelp').textContent.includes(description.note));
    h.context.NP_GameSession.stop();
  }
  assert.deepEqual(h.errors, []);
});

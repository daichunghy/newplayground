// Real engine rules under a deterministic DOM/Canvas harness; not a visual benchmark.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read } = require('./helpers/game-harness.cjs');

function classic(name, api, { beforeLoad } = {}) {
  const h = harness({ loadEngines: false, loadApp: false });
  h.context.NP_Juice = null;
  vm.runInContext('let seed = 937; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);', h.context);
  if (beforeLoad) beforeLoad(h);
  // Inspect private simulation state in tests without shipping a debug API.
  const marker = `  function ${name}(container, game) {`;
  const source = read('scripts/engines-classics.js').replace(marker,
    marker + '\n    window.__classic = { ' + api + ' };');
  vm.runInContext(source, h.context, { filename: 'scripts/engines-classics.js' });
  h.context.NP_Engines[name](h.container, { id: name, title: name });
  h.api = h.context.__classic;
  return h;
}

const plain = value => JSON.parse(JSON.stringify(value));

function farm({ rawSave, blockStorage = false } = {}) {
  const h = classic('launchNongTrai', `
    get: () => ({ coins, exp, level, bones, selectedTool, selectedSeed, myPlots, neighbors }),
    select: (tool, seed = 'radish') => { selectedTool = tool; selectedSeed = seed; },
    handlePlotClick, handleSteal
  `, { beforeLoad(h) {
    h.context.__farmNow = 1700000000000;
    vm.runInContext('Date.now = () => __farmNow;', h.context);
    if (rawSave !== undefined) h.stored.set('np_nongtrai_save_v1', rawSave);
    if (blockStorage) h.context.localStorage = {
      getItem() { throw new Error('storage blocked'); },
      setItem() { throw new Error('storage blocked'); }
    };
  } });
  h.reopenFarm = () => {
    h.context.NP_Engines.launchNongTrai(h.container, { id: 'nong-trai' });
    h.api = h.context.__classic;
  };
  return h;
}

test('farm saves planted crops, tools, bones and neighbor actions and grows while closed', () => {
  const h = farm();
  h.api.handlePlotClick(0);
  h.api.select('seed'); h.api.handlePlotClick(0);
  h.api.select('water'); h.api.handlePlotClick(0);
  h.container.querySelector('#nfBuyBoneBtn').dispatch('click');
  h.api.handleSteal(1, 0);
  const before = plain(h.api.get());
  assert.equal(before.myPlots[0].growTime, 7.5);
  assert.equal(before.myPlots[0].watered, true);
  assert.equal(before.coins, 165); assert.equal(before.bones, 1);
  assert.equal(before.neighbors[1].dog.awake, false);
  assert.equal(before.neighbors[1].plots[0].stolen, true);
  const savedNow = JSON.parse(h.stored.get('np_nongtrai_save_v1'));
  assert.equal(savedNow.coins, before.coins, 'actions save immediately without waiting for close');
  h.context.NP_GameSession.stop();
  h.context.__farmNow += 2000; h.reopenFarm();
  assert.deepEqual(plain(h.api.get()), before, 'reopening restores the same farm and safe neighbor state');
  h.api.handleSteal(1, 0);
  assert.equal(h.api.get().coins, before.coins, 'a saved harvested neighbor plot cannot pay out again');
  h.context.NP_GameSession.stop();
  h.context.__farmNow += 10000; h.reopenFarm();
  assert.equal(h.api.get().myPlots[0].state, 'ripe', 'offline growth is applied before the first render');
  assert.equal(h.api.get().coins, before.coins);
  h.container.querySelector('#nfRestartBtn').dispatch('click');
  assert.equal(h.api.get().coins, 150); assert.equal(h.api.get().exp, 0); assert.equal(h.api.get().bones, 1);
  assert.ok(h.api.get().myPlots.every(plot => plot.state === 'grass' && !plot.watered && plot.plantTime === 0));
  assert.equal(h.api.get().neighbors[1].dog.awake, true);
  assert.equal(h.api.get().neighbors[1].plots[0].stolen, false);
  h.context.NP_GameSession.stop(); h.reopenFarm();
  assert.equal(h.api.get().coins, 150, 'an explicit fresh farm replaces the previous save');
  assert.ok(h.api.get().myPlots.every(plot => plot.state === 'grass'));
  assert.equal(h.errors.length, 0);
});

test('farm restores level unlocks and care penalties from validated saved values', () => {
  const plots = Array.from({ length: 9 }, () => ({ state: 'grass' }));
  plots[6] = { state: 'growing', crop: 'corn', plantTime: 1699999990000,
    growTime: 13.5, watered: true, hasPest: true, hasWeed: false };
  const h = farm({ rawSave: JSON.stringify({ version: 1, coins: 404, exp: 120, level: 3, bones: 5,
    selectedTool: 'care', selectedSeed: 'corn', plots }) });
  const value = h.api.get();
  assert.equal(value.level, 3); assert.equal(value.exp, 120); assert.equal(value.coins, 404); assert.equal(value.bones, 5);
  assert.ok(value.myPlots.every(plot => !plot.locked));
  assert.equal(value.myPlots[6].state, 'growing', 'pests still slow offline growth');
  assert.equal(value.myPlots[6].hasPest, true); assert.equal(value.selectedTool, 'care');
  h.api.handlePlotClick(6);
  assert.equal(h.api.get().myPlots[6].hasPest, false);
  assert.equal(h.api.get().exp, 130); assert.equal(h.api.get().coins, 409);
  h.context.NP_GameSession.stop(); h.context.__farmNow += 4000; h.reopenFarm();
  assert.equal(h.api.get().myPlots[6].state, 'ripe', 'care and elapsed time survive the next reopen');
});

test('farm ignores corrupt state and invalid crop names without rendering unsafe saved metadata', () => {
  const cases = ['{', 'null', '[]', JSON.stringify({ version: 1, coins: -10, exp: '80', level: 0, bones: -1,
    selectedSeed: '__proto__', plots: [{ state: 'ripe', crop: '__proto__' }, {
      state: 'growing', crop: 'radish', plantTime: 'bad', growTime: -10, watered: 'true'
    }], neighbors: [{ name: '<invalid saved name>', awake: 'true', plots: [{ crop: '__proto__', stolen: false }] }] })];
  for (const rawSave of cases) {
    const h = farm({ rawSave });
    const value = h.api.get();
    assert.equal(value.coins, 150); assert.equal(value.level, 1); assert.equal(value.bones, 1);
    assert.equal(value.selectedSeed, 'radish'); assert.equal(value.myPlots[0].state, 'grass');
    assert.equal(value.neighbors[0].name, 'Tuấn Còi (Zing Me)');
    assert.equal(value.neighbors[0].plots[0].crop, 'tomato');
    assert.ok(value.myPlots.every(plot => Number.isFinite(plot.plantTime) && Number.isFinite(plot.growTime)));
    assert.doesNotThrow(() => { h.api.handlePlotClick(0); h.api.select('seed'); h.api.handlePlotClick(0); });
    assert.equal(h.api.get().coins, 145);
    h.context.NP_GameSession.stop();
    assert.equal(h.errors.length, 0);
  }
});

test('farm remains playable when browser storage refuses both reads and writes', () => {
  const h = farm({ blockStorage: true });
  assert.doesNotThrow(() => {
    h.api.handlePlotClick(0); h.api.select('seed'); h.api.handlePlotClick(0);
    h.api.select('water'); h.api.handlePlotClick(0);
    h.container.querySelector('#nfBuyBoneBtn').dispatch('click');
  });
  assert.equal(h.api.get().coins, 115); assert.equal(h.api.get().bones, 2);
  h.context.NP_GameSession.stop(); h.reopenFarm();
  assert.equal(h.api.get().coins, 150, 'without storage a new playable farm is still available');
  assert.equal(h.errors.length, 0);
});

test('six classic arcade simulations keep the same pace at 60 Hz and 120 Hz', () => {
  const cases = [
    ['launchPacMan', 'get: () => ({ px: pacman.px, py: pacman.py, score, frightenedTimer })'],
    ['launchGunny', 'get: () => ({ tick, power, playerHP, botHP })'],
    ['launchFeedingFrenzy', 'get: () => ({ tick, dashCooldown, clamTimer: clam.timer, fishCount: fishes.length })'],
    ['launchPvZ', 'get: () => ({ tick, zombieSpawnTimer, zombiesSpawnedInWave, sun })'],
    ['launchChickenInvaders', 'get: () => ({ tick, x: ship.x, recoil: ship.recoil, wave })'],
    ['launchNuoiCaNemo', 'get: () => ({ nextAlienTimer, hunger: fishes[0].hunger, coins })']
  ];
  for (const [name, api] of cases) {
    const slow = classic(name, api), fast = classic(name, api);
    slow.frame(0); fast.frame(0);
    for (let frame = 0; frame < 60; frame++) slow.frame(1000 / 60);
    for (let frame = 0; frame < 120; frame++) fast.frame(1000 / 120);
    assert.deepEqual(plain(slow.api.get()), plain(fast.api.get()), name);
    slow.context.NP_GameSession.stop(); fast.context.NP_GameSession.stop();
  }
});

test('Pac-Man starts on a connected corridor and ghosts remain in valid maze cells', () => {
  const h = classic('launchPacMan', `
    get: () => ({ maze, pacman, ghosts }),
    safe: () => { frightenedTimer = 100000; }, update
  `);
  const { maze, pacman } = h.api.get();
  assert.notEqual(maze[pacman.y][pacman.x], 1, 'spawn cannot occupy a wall');
  const width = maze[0].length, seen = new Set([`${pacman.x},${pacman.y}`]);
  const queue = [[pacman.x, pacman.y]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = (x + dx + width) % width, ny = y + dy, key = `${nx},${ny}`;
      if (maze[ny] && maze[ny][nx] !== 1 && !seen.has(key)) { seen.add(key); queue.push([nx, ny]); }
    }
  }
  maze.forEach((row, y) => row.forEach((tile, x) => {
    if (tile === 2 || tile === 3) assert.ok(seen.has(`${x},${y}`), 'every pellet is reachable');
  }));
  h.api.safe();
  for (let frame = 0; frame < 1800; frame++) {
    h.api.update();
    for (const ghost of h.api.get().ghosts) {
      const x = (Math.floor(ghost.px / 20) + width) % width, y = Math.floor(ghost.py / 20);
      assert.ok(maze[y], 'ghost stays within vertical bounds');
      assert.notEqual(maze[y][x], 1, 'ghost turns only through valid corridors');
    }
  }
});

test('Pac-Man overlapping ghosts cost one final life and retain the final score', () => {
  const h = classic('launchPacMan', `
    crash: () => { lives = 1; score = 123; ghosts.forEach(g => {
      g.x = pacman.x; g.y = pacman.y; g.px = pacman.px; g.py = pacman.py; g.target = null;
    }); },
    get: () => ({ lives, score, gameOver }), update
  `);
  h.api.crash(); h.api.update();
  const result = plain(h.api.get());
  assert.equal(result.lives, 0); assert.equal(result.gameOver, true);
  for (let i = 0; i < 30; i++) h.api.update();
  assert.deepEqual(plain(h.api.get()), result, 'terminal state stays readable until replay');
});

test('Gunny refunds selected buffs even at low stamina and waits for the entire volley', () => {
  const h = classic('launchGunny', `
    get: () => ({ stamina, turn, shotInFlight, pendingShots, bullets: bullets.length, activeBuffs }),
    clearVolley: () => { bullets = []; playerRecoil = botRecoil = 0; },
    toggleBuff, triggerFire, releaseFire, update
  `);
  for (const type of ['triple', 'double', 'dmg50']) h.api.toggleBuff(type);
  assert.equal(h.api.get().stamina, 10);
  h.api.toggleBuff('triple');
  assert.equal(h.api.get().stamina, 40, 'a selected 30-point buff can be refunded from 10 stamina');
  h.api.triggerFire(); h.api.releaseFire();
  assert.equal(h.api.get().pendingShots, 1);
  h.api.clearVolley(); h.api.update();
  assert.equal(h.api.get().turn, 'player', 'delayed volley still belongs to the player');
  h.flushTimeouts();
  assert.equal(h.api.get().bullets, 1, 'the second shot launches once');
  h.api.clearVolley(); h.api.update();
  assert.equal(h.api.get().turn, 'bot');
  h.api.update(); h.api.update();
  assert.equal(h.api.get().turn, 'bot', 'waiting for the bot does not immediately skip its turn');
  h.flushTimeouts();
  assert.equal(h.api.get().shotInFlight, true);
  h.api.clearVolley(); h.api.update();
  assert.equal(h.api.get().turn, 'player');
  assert.equal(h.api.get().stamina, 100);
});

test('Gunny cancels interrupted pointer charging and spends a full POW meter once', () => {
  const h = classic('launchGunny', `
    get: () => ({ charging, power, rage, count: bullets.length }),
    fillRage: () => { rage = 100; updateBuffUI(); }, toggleBuff, triggerFire, releaseFire
  `);
  const fire = h.container.querySelector('#gnFireBtn');
  fire.dispatch('pointerdown', { pointerId: 9, button: 0 });
  assert.equal(h.api.get().charging, true);
  fire.dispatch('pointercancel', { pointerId: 9 });
  h.window.dispatch('pointerup', { pointerId: 9 });
  assert.equal(h.api.get().count, 0, 'a cancelled hold must not shoot');
  assert.equal(h.container.querySelector('#gnBuffPOW').disabled, true);
  h.api.fillRage(); h.api.toggleBuff('pow'); h.api.triggerFire(); h.api.releaseFire();
  assert.equal(h.api.get().rage, 0);
  assert.equal(h.api.get().count, 1);
});

test('Feeding Frenzy applies one clam penalty per snap and never displays negative frenzy', () => {
  const h = classic('launchFeedingFrenzy', `
    arrange: () => { score = 500; frenzy = 0.01; fishes = []; clam.state = 'snapping'; clam.timer = 0;
      player.x = player.targetX = clam.x; player.y = player.targetY = clam.y; },
    get: () => ({ score, frenzy }), update
  `);
  h.api.arrange();
  for (let frame = 0; frame < 20; frame++) h.api.update();
  assert.equal(h.api.get().score, 420);
  assert.equal(h.api.get().frenzy, 0);
});

test('PvZ finishes the final wave once and freezes its winning state', () => {
  const h = classic('launchPvZ', `
    arrange: () => { wave = 5; zombiesSpawnedInWave = 24; zombies = []; score = 2200; },
    get: () => ({ result, tick, score, sun, wave }), update
  `);
  h.api.arrange(); h.api.update();
  assert.equal(h.api.get().result, 'won');
  const result = plain(h.api.get());
  for (let i = 0; i < 120; i++) h.api.update();
  assert.deepEqual(plain(h.api.get()), result);
});

test('Chicken Invaders supports held arrow movement and Space fire, with clean release', () => {
  const h = classic('launchChickenInvaders', `get: () => ({ x: ship.x, lasers: lasers.length, keys }), update`);
  const start = h.api.get().x;
  h.window.dispatch('keydown', { code: 'ArrowRight', key: 'ArrowRight' });
  h.window.dispatch('keydown', { code: 'Space', key: ' ' });
  for (let i = 0; i < 12; i++) h.api.update();
  assert.ok(h.api.get().x > start + 40, 'the advertised arrows actually steer the ship');
  assert.ok(h.api.get().lasers >= 4, 'held Space fires repeatedly without relying on OS repeat');
  h.window.dispatch('blur');
  const stoppedX = h.api.get().x;
  h.api.update();
  assert.equal(h.api.get().x, stoppedX);
  assert.equal(h.api.get().keys.fire, false);
});

test('a Chicken Invaders nuke can finish a boss and advances only one wave', () => {
  const h = classic('launchChickenInvaders', `
    arrange: () => { wave = 5; chickens = []; boss = { x: 200, y: 70, hp: 200 }; },
    get: () => ({ wave, boss, score, missiles }), triggerNuke, update
  `);
  h.api.arrange(); h.api.triggerNuke();
  assert.equal(h.api.get().wave, 6);
  assert.equal(h.api.get().boss, null);
  assert.equal(h.api.get().score, 2000);
  h.api.update(); assert.equal(h.api.get().wave, 6);
});

test('Chicken Invaders resolves a formation that reaches the bottom instead of stranding the wave', () => {
  const h = classic('launchChickenInvaders', `
    invade: () => { lives = 1; score = 350; chickens = [{ x: 100, y: canvas.height - 20, vx: 0 }]; },
    get: () => ({ lives, score, gameOver, wave }), update
  `);
  h.api.invade(); h.api.update();
  assert.equal(h.api.get().gameOver, true);
  assert.equal(h.api.get().lives, 0);
  const result = plain(h.api.get());
  for (let i = 0; i < 30; i++) h.api.update();
  assert.deepEqual(plain(h.api.get()), result);
});

test('Nemo detects an unrecoverable empty aquarium and replay restores upgrade controls and timers', () => {
  const h = classic('launchNuoiCaNemo', `
    empty: () => { fishes = []; coins = 0; droppedTreasures = []; },
    upgraded: () => { foodLevel = laserPower = 2; nextAlienTimer = 1; updateHUD(); },
    get: () => ({ gameOver, gameWon, coins, foodLevel, laserPower, nextAlienTimer, fishCount: fishes.length }), update
  `);
  h.api.empty(); h.api.update(); assert.equal(h.api.get().gameOver, true);
  h.api.upgraded();
  assert.equal(h.container.querySelector('#ncUpgradeFood').disabled, true);
  h.container.querySelector('#ncRestartBtn').dispatch('click');
  assert.equal(h.container.querySelector('#ncUpgradeFood').disabled, false);
  assert.equal(h.container.querySelector('#ncUpgradeLaser').disabled, false);
  assert.deepEqual(plain(h.api.get()), {
    gameOver: false, gameWon: false, coins: 200, foodLevel: 1, laserPower: 1,
    nextAlienTimer: 2100, fishCount: 2
  });
});

test('Typer Shark avoids duplicate targets, preserves browser shortcuts, and restores typing focus', () => {
  const h = harness({ loadEngines: true, loadApp: false });
  vm.runInContext('Math.random = () => 0;', h.context);
  h.context.NP_TyperShark.launch(h.container);
  const targets = h.container.querySelector('#tsTargets').textContent;
  assert.ok(targets.includes('REEF') && targets.includes('SHARK'), 'even identical random draws create distinct targets');
  const input = h.container.querySelector('#tsInput');
  let focuses = 0; input.focus = () => { focuses++; };
  h.window.dispatch('keydown', { key: 'f', ctrlKey: true });
  assert.equal(input.value, '', 'Ctrl+F belongs to the browser');
  h.container.querySelector('#tsPause').dispatch('click');
  assert.equal(input.disabled, true);
  h.window.dispatch('keydown', { key: 'r' });
  assert.equal(input.value, '', 'typing while paused does not queue stale letters');
  h.container.querySelector('#tsPause').dispatch('click');
  assert.equal(input.disabled, false); assert.equal(focuses, 1);
  h.container.querySelector('#tsRestart').dispatch('click');
  assert.equal(focuses, 2);
  h.window.dispatch('keydown', { key: 'r', target: h.container.querySelector('#tsRestart') });
  assert.equal(input.value, 'R', 'typing continues after using a button');
});

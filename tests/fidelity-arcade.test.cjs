const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/game-harness.cjs');
const fs = require('node:fs');
const vm = require('node:vm');

const ids = [
  'space-invaders-1978', 'lunar-lander-1979', 'lode-runner-classic', 'qix-territory',
  'joust-arcade', 'pengo-ice-blocks', 'rally-x-maze', 'burgertime-platforms',
  'moon-patrol-rover', 'missile-command-defense'
];

function loadPack() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(fs.readFileSync('scripts/fidelity-arcade.js', 'utf8'), h.context, { filename: 'scripts/fidelity-arcade.js' });
  return h;
}

function model(h, id) {
  return h.context.NP_Fidelity.get(id).model();
}

test('Space Invaders marches, descends on a wall turn, scores hits, and freezes after invasion', () => {
  const h = loadPack();
  const m = model(h, ids[0]);
  m.game.invaders = [{ x: .93, y: .4, r: 0, c: 0, alive: true }];
  const oldY = m.game.invaders[0].y;
  m.step(.05);
  assert.equal(m.game.dir, -1);
  assert.ok(m.game.invaders[0].y > oldY);
  m.game.invaders = [{ x: .55, y: .5, r: 0, c: 0, alive: true }, { x: .8, y: .2, r: 1, c: 1, alive: true }];
  m.game.player = .394;
  m.game.bunkers.forEach(bunker => bunker.hp = 0);
  m.fire();
  m.step(.45);
  assert.equal(m.game.score, 10);
  assert.equal(m.game.invaders.length, 1);
  m.game.invaders = [{ x: .5, y: .9, r: 0, c: 0, alive: true }];
  m.step(.01);
  const score = m.game.score;
  assert.equal(m.game.over, true);
  assert.equal(m.fire(), undefined);
  m.step(1);
  assert.equal(m.game.score, score);
  const bunkerTest = model(h, ids[0]);
  bunkerTest.game.player = .19;
  bunkerTest.fire();
  bunkerTest.step(.05);
  assert.equal(bunkerTest.game.bunkers[0].hp, 3, 'player fire erodes bunker cover too');
});

test('Lunar Lander consumes fuel under thrust and distinguishes a pad touchdown from a crash', () => {
  const h = loadPack();
  const m = model(h, ids[1]);
  const fuel = m.state.fuel;
  m.step(.1, { thrust: true });
  assert.ok(m.state.fuel < fuel);
  assert.ok(m.state.vy < .02);
  Object.assign(m.state, { x: .74, y: .7799, vx: 0, vy: .02, angle: 0, status: 'flying' });
  m.step(.01);
  assert.equal(m.state.status, 'landed');
  const score = m.state.score;
  m.step(2, { thrust: true });
  assert.equal(m.state.score, score);
  m.restart();
  assert.equal(m.state.score, 0, 'restart begins a new scored run');
  Object.assign(m.state, { x: .74, y: .7799, vx: 0, vy: .5, angle: 0, status: 'flying' });
  m.step(.01);
  assert.equal(m.state.status, 'crashed');
});

test('Lode Runner requires all gold before exit and digs only temporary brick holes', () => {
  const h = loadPack();
  const m = model(h, ids[2]);
  const locked = model(h, ids[2]);
  locked.state.x = 7;
  assert.equal(locked.move(1, 0), false);
  assert.equal(locked.state.won, false);
  assert.equal(m.move(1, 0), true);
  assert.equal(m.move(-1, 0), true);
  assert.equal(m.state.gold, 1);
  assert.equal(m.move(1, 0), true);
  for (let x = 2; x <= 8; x++) m.move(1, 0);
  assert.equal(m.state.won, false);
  m.state.x = 3; m.state.y = 1;
  assert.equal(m.dig(1), true);
  assert.equal(m.state.rows[2][4], '.');
  m.state.guards[0].x = 4;
  m.state.guards[0].y = 2;
  m.step(.1);
  assert.ok(m.state.guards[0].trapped > 0);
  m.step(3.1);
  assert.equal(m.state.guards[0].y, 1, 'a trapped guard escapes when the temporary hole closes');
  m.step(5.1);
  assert.equal(m.state.rows[2][4], '#');
  m.state.x = 4; m.state.y = 1;
  assert.equal(m.move(0, 1), false);
  m.restart();
  assert.equal(m.state.gold, 1, 'the start tile gold is collected on entry');
  assert.equal(m.state.level, 1);
  for (let step = 0; step < 4; step++) m.move(1, 0);
  m.move(0, 1);
  m.move(0, 1);
  assert.equal(m.state.gold, 2, 'the ladder reaches the second authored gold tile');
  m.move(0, -1);
  m.move(0, -1);
  for (let step = 0; step < 2; step++) m.move(1, 0);
  assert.equal(m.move(1, 0), true);
  assert.equal(m.state.won, true);
  assert.equal(m.nextLevel(), true);
  assert.equal(m.state.level, 2);
  assert.equal(m.state.over, false);
  assert.equal(m.state.total, 2);
  m.move(1, 0); m.move(1, 0);
  m.move(0, 1); m.move(0, 1);
  m.move(1, 0); m.move(1, 0); m.move(1, 0);
  assert.equal(m.state.gold, 2, 'the second authored route also collects both gold tiles');
  m.move(-1, 0); m.move(-1, 0); m.move(-1, 0);
  m.move(0, -1); m.move(0, -1);
  for (let step = 0; step < 5; step++) m.move(1, 0);
  assert.equal(m.state.won, true);
});

test('Qix closes a trail and claims the side without the moving Qix', () => {
  const h = loadPack();
  const m = model(h, ids[3]);
  for (const move of [[1,0],[1,0],[0,1],[0,1],[-1,0],[-1,0]]) m.move(...move);
  assert.equal(m.state.drawing, false);
  assert.ok(m.state.captured.size > 0);
  assert.ok(m.state.area > 0 && m.state.area < .75);
  assert.equal(m.state.captured.has('6,6'), false, 'the Qix side remains open and is not claimed');
  assert.equal(m.move(-1,0), false, 'movement beyond the safe border is illegal');
  const exposed = model(h, ids[3]);
  Object.assign(exposed.state, { drawing: true, x: 4, y: 4, trail: ['4,4'], qix: { x: 4, y: 4, vx: 0, vy: 0 } });
  exposed.step(.01);
  assert.equal(exposed.state.lives, 2);
  assert.deepEqual([exposed.state.x, exposed.state.y], [0, 6], 'an exposed-trail death returns to a safe border');
  assert.equal(exposed.state.drawing, false);
  assert.equal(exposed.state.trail.length, 0);
});

test('Joust height wins contact, produces an egg, and egg hatching is timed', () => {
  const h = loadPack();
  const m = model(h, ids[4]);
  m.state.x = .5; m.state.y = .25;
  Object.assign(m.state.enemies[0], { x: .5, y: .29, vy: 0 });
  m.step(.01);
  assert.equal(m.state.enemies[0].egg, true);
  assert.equal(m.state.score, 100);
  m.step(3.1);
  assert.equal(m.state.enemies[0].egg, false);
  const collector = model(h, ids[4]);
  Object.assign(collector.state.enemies[0], { egg: true, timer: 2, x: collector.state.x, y: collector.state.y });
  assert.equal(collector.collectEgg(), true);
  assert.equal(collector.state.score, 500);
  assert.equal(collector.state.wave, 2);
  m.state.over = true;
  const score = m.state.score;
  assert.equal(m.flap(), undefined);
  m.step(1);
  assert.equal(m.state.score, score);
});

test('Pengo slides an ice block into an enemy and rejects a push out of bounds', () => {
  const h = loadPack();
  const m = model(h, ids[5]);
  m.state.x = 1; m.state.y = 2;
  m.state.grid[2] = '#.BE...#'.split('');
  assert.equal(m.move(1, 0), true);
  assert.equal(m.state.grid[2][3], '.');
  assert.equal(m.state.score, 100);
  const pursuer = model(h, ids[5]);
  pursuer.state.grid[1] = '#..E...##'.split('');
  pursuer.step(.7);
  assert.equal(pursuer.state.grid[1][3], '.');
  assert.equal(pursuer.state.grid[1][2], 'E');
  const smash = model(h, ids[5]);
  smash.state.x = 1; smash.state.y = 2;
  smash.state.grid[2] = '#.B######'.split('');
  assert.equal(smash.move(1, 0), true);
  assert.equal(smash.state.grid[2][2], '.');
  assert.equal(smash.state.score, 10);
  const diamonds = model(h, ids[5]);
  diamonds.state.x = 1; diamonds.state.y = 1;
  diamonds.move(0, 1);
  diamonds.move(1, 0);
  assert.equal(diamonds.state.score, 500, 'three aligned diamond blocks award the alignment bonus');
  m.state.over = true;
  const score = m.state.score;
  assert.equal(m.move(1, 0), false);
  assert.equal(m.state.score, score);
});

test('Rally-X collects flags through the maze and smoke spends fuel to stun pursuers', () => {
  const h = loadPack();
  const m = model(h, ids[6]);
  const fuel = m.state.fuel;
  assert.equal(m.smoke(), true);
  assert.equal(m.state.smoke, 1);
  assert.ok(m.state.fuel < fuel);
  assert.equal(m.state.stun, 2);
  const start = m.state.flags;
  m.steer(1, 0);
  assert.ok(m.state.flags >= start);
  m.state.flags = 9;
  m.state.x = 2; m.state.y = 1;
  m.steer(-1, 0);
  m.step(.01);
  assert.equal(m.state.stage, 2);
  assert.equal(m.state.flags, 0);
  assert.equal(m.state.map.flat().filter(cell => cell === 'F').length, 10);
  m.state.over = true;
  const flags = m.state.flags;
  assert.equal(m.steer(0, 1), false);
  assert.equal(m.state.flags, flags);
});

test('BurgerTime drops completed ingredient segments through platforms into a bottom stack', () => {
  const h = loadPack();
  const m = model(h, ids[7]);
  for (let step = 0; step < 4; step++) m.move(1, 0);
  assert.equal(m.state.ingredients, 2);
  assert.equal(m.state.score, 0, 'a row drop alone does not complete a burger');
  assert.equal(m.state.segments[0].size, 0);
  assert.equal(m.state.drops.length, 1);
  m.step(.2);
  assert.ok(m.state.drops[0].time > 0);
  m.state.enemy = { x: 0, y: 0 };
  m.state.stun = 5;
  for (const row of [1, 2]) {
    m.state.x = 0;
    m.state.y = row;
    m.move(0, 0);
    for (let step = 0; step < 4; step++) m.move(1, 0);
  }
  assert.equal(m.state.ingredients, 0);
  assert.equal(m.state.over, false, 'all three drops must reach the bottom before completion');
  m.step(.25);
  assert.equal(m.state.stackCount, 0);
  m.step(.2);
  assert.equal(m.state.stackCount, 1, 'the bottom ingredient lands first');
  m.step(.3);
  assert.equal(m.state.stackCount, 2);
  m.step(.2);
  assert.equal(m.state.completedBurgers, 1);
  assert.equal(m.state.score, 500);
  assert.equal(m.state.over, true);
  assert.equal(m.nextStage(), true);
  assert.equal(m.state.stage, 2);
  const pepper = m.state.pepper;
  assert.equal(m.pepper(), true);
  assert.equal(m.state.pepper, pepper - 1);
  m.state.over = true;
  assert.equal(m.pepper(), false);
});

test('Moon Patrol jump physics clears a gap; an unjumped rover loses a life', () => {
  const h = loadPack();
  const airborne = model(h, ids[8]);
  airborne.state.x = .33;
  assert.equal(airborne.jump(), true);
  airborne.step(.3);
  assert.ok(airborne.state.y < 0);
  assert.equal(airborne.state.lives, 3);
  const grounded = model(h, ids[8]);
  grounded.state.x = .357;
  grounded.step(.01);
  assert.equal(grounded.state.lives, 2);
  assert.equal(grounded.jump(), true);
  const shooter = model(h, ids[8]);
  shooter.gaps.length = 0;
  shooter.state.x = .78;
  shooter.fire(false);
  shooter.step(.1);
  assert.equal(shooter.state.score, 50, 'a forward projectile clears a rock');
  const shotAvoid = model(h, ids[8]);
  shotAvoid.gaps.length = 0;
  shotAvoid.state.x = .57;
  shotAvoid.state.vx = 0;
  shotAvoid.state.threats = [{ x: .57, y: 0, kind: 'rock', active: true }];
  shotAvoid.fire(false);
  shotAvoid.step(.01);
  assert.equal(shotAvoid.state.score, 50);
  assert.equal(shotAvoid.state.lives, 3, 'shooting a threat prevents the rover collision');
  const collision = model(h, ids[8]);
  collision.gaps.length = 0;
  collision.state.x = .57;
  collision.state.vx = 0;
  collision.state.threats = [{ x: .57, y: 0, kind: 'rock', active: true }];
  collision.step(.01);
  assert.equal(collision.state.lives, 2, 'a surviving ground threat costs one life');
  const jumper = model(h, ids[8]);
  jumper.gaps.length = 0;
  jumper.state.x = .57;
  jumper.state.vx = 0;
  jumper.state.threats = [{ x: .57, y: 0, kind: 'rock', active: true }];
  jumper.jump();
  jumper.step(.15);
  assert.equal(jumper.state.lives, 3, 'jumping clears a ground threat');
  const spark = model(h, ids[3]);
  spark.state.spark = { x: 0, y: 6 };
  spark.step(.01);
  assert.equal(spark.state.lives, 2, 'the border spark is a separate moving hazard');
});

test('Missile Command selects a nearby viable base and chain-clears missiles in an expanding blast', () => {
  const h = loadPack();
  const m = model(h, ids[9]);
  m.state.missiles = [
    { x: .5, y: .5, targetX: .5, targetCity: 2, vy: 0 },
    { x: .54, y: .5, targetX: .54, targetCity: 3, vy: 0 }
  ];
  assert.equal(m.blast(.51, .5), true);
  assert.deepEqual(Array.from(m.state.bases), [10, 9, 10]);
  m.step(.3);
  assert.equal(m.state.missiles.length, 6, 'the cleared wave is followed by missiles targeting every city');
  assert.equal(m.state.wave, 2);
  assert.equal(m.state.score, 50);
  assert.deepEqual(Array.from(m.state.missiles, missile => missile.targetCity), [0, 1, 2, 3, 4, 5]);
  const naturalLoss = model(h, ids[9]);
  naturalLoss.step(8);
  assert.deepEqual(Array.from(naturalLoss.state.cities), [false, false, false, false, false, false]);
  assert.equal(naturalLoss.state.over, true, 'missile impacts on all six authored targets end the game');
  const ammo = Array.from(naturalLoss.state.bases);
  assert.equal(naturalLoss.blast(.5, .5), false);
  naturalLoss.step(1);
  assert.deepEqual(Array.from(naturalLoss.state.bases), ammo);
});

test('every arcade entry launches directly, draws, pauses, resumes, and stops its session', () => {
  const h = loadPack();
  for (const id of ids) {
    const entry = h.context.NP_Fidelity.get(id);
    assert.ok(entry && entry.newGame && entry.catalog.id === id, id);
    const stage = h.context.NP_Fidelity.launch(h.container, { id, title: entry.title });
    assert.ok(stage.model, `${id} exposes the model used by rendering`);
    assert.ok(stage.controls.children.length >= 4, `${id} has touch actions`);
    h.frame(16);
    stage.session.pause();
    h.frame(100);
    stage.session.resume();
    h.frame(16);
    stage.session.stop();
    assert.equal(h.frames.size, 0, `${id} cancels frame resources`);
    assert.equal(stage.session.isActive(), false, `${id} stops the owned session`);
  }
  assert.deepEqual(h.errors, []);
});

test('touch controls execute game actions and held directional controls release on blur', () => {
  const h = loadPack();
  const space = h.context.NP_Fidelity.launch(h.container, { id: ids[0], title: 'Space Invaders' });
  const fire = space.controls.children.find(button => button.textContent === 'Fire');
  fire.dispatch('click');
  assert.equal(space.model.game.bullets.length, 1);
  const left = space.controls.children.find(button => button.textContent === 'Left');
  left.dispatch('pointerdown', { pointerId: 8 });
  h.frame(100);
  const moved = space.model.game.player;
  h.window.dispatch('blur');
  h.frame(100);
  assert.equal(space.model.game.player, moved);
  space.session.stop();
});

test('paused sessions reject button, keyboard, and pointer actions and release held controls', () => {
  const h = loadPack();
  const stage = h.context.NP_Fidelity.launch(h.container, { id: ids[0], title: 'Space Invaders' });
  const fire = stage.controls.children.find(button => button.textContent === 'Fire');
  const left = stage.controls.children.find(button => button.textContent === 'Left');
  left.dispatch('pointerdown', { pointerId: 9 });
  h.frame(100);
  const position = stage.model.game.player;
  stage.session.pause();
  fire.dispatch('click');
  h.window.dispatch('keydown', { code: 'Space' });
  stage.canvas.dispatch('pointerdown', { clientX: 200, clientY: 100, pointerId: 10 });
  h.frame(100);
  assert.equal(stage.model.game.bullets.length, 0, 'paused click, key, and canvas input are ignored');
  assert.equal(stage.model.game.player, position, 'pause releases a held directional control');
  stage.session.resume();
  h.frame(100);
  assert.equal(stage.model.game.player, position, 'the released pointer does not resume as a stuck hold');
  stage.session.stop();
});

test('the primary touch action changes live state in all ten individual games', () => {
  const h = loadPack();
  const actions = [
    ['Fire', m => m.game.bullets.length, (_m, value) => value + 1],
    ['Thrust', m => m.state.fuel, (_m, value) => value - .96],
    ['Dig left', m => m.state.holes.length, (_m, value) => value + 1],
    ['Right', m => m.state.drawing, () => true],
    ['Flap', m => m.state.vy, () => -.42],
    ['Right', m => m.state.x, (_m, value) => value + 1],
    ['Smoke', m => m.state.smoke, (_m, value) => value - 1],
    ['Pepper', m => m.state.pepper, (_m, value) => value - 1],
    ['Jump', m => m.state.vy, () => -.72],
    ['Fire left base', m => m.state.bases[0], (_m, value) => value - 1]
  ];
  ids.forEach((id, index) => {
    const entry = h.context.NP_Fidelity.get(id);
    const stage = h.context.NP_Fidelity.launch(h.container, { id, title: entry.title });
    const [label, before, expected] = actions[index];
    const prior = before(stage.model);
    const button = stage.controls.children.find(item => item.textContent === label);
    assert.ok(button, `${id} has a visible ${label} action`);
    button.dispatch('click');
    assert.equal(before(stage.model), expected(stage.model, prior), `${id} responds to touch control`);
    stage.session.stop();
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/engines-archetypes.js'), 'utf8'), context);
const model = context.window.NP_Archetypes.galagaModel;
const C = model.constants;

function advanceToFormation(state) {
  for (let i = 0; i < 32 && state.phase === 'entry'; i++) model.tick(state, {}, 0.05);
  assert.equal(state.phase, state.waveMode === 'challenge' ? 'challenge' : 'playing');
}

function grunt(x, y, mode = 'formation') {
  return { id: 99, type: 'grunt', hp: 1, x, y, baseX: x, baseY: y, row: 2, column: 3,
    phase: 0, mode, modeTime: 0, shotCooldown: 20, beamCooldown: 20, beamTime: 0, carrying: false };
}

test('Galaga begins with about forty three-rank enemies and the reference two-shot cap', () => {
  const state = model.create(1);
  assert.equal(state.enemies.length, C.enemyCount);
  assert.equal(state.enemies.filter(enemy => enemy.type === 'boss').length, 2);
  assert.equal(state.enemies.filter(enemy => enemy.type === 'guard').length, 8);
  assert.equal(state.enemies.filter(enemy => enemy.type === 'grunt').length, 30);
  assert.equal(model.fire(state), true);
  assert.equal(state.shots.length, 1);
  assert.equal(model.fire(state), false, 'fire cooldown prevents autofire above the tuned cadence');
  state.shotCooldown = 0;
  state.shots.push({ x: 100, y: 200, vy: -520 });
  assert.equal(model.fire(state), false, 'the official two-shot cap applies to active projectiles');
});

test('ship moves horizontally, pointer targeting is clamped, and firing supports no more than two bolts', () => {
  const state = model.create(2);
  model.tick(state, { right: true }, 0.05);
  assert.ok(state.player.x > C.width / 2);
  model.tick(state, { pointerX: C.width + 80 }, 0.05);
  assert.equal(state.player.x, C.width - 22);
  state.dual = true;
  state.shotCooldown = 0;
  state.shots = [];
  assert.equal(model.fire(state), true);
  assert.equal(state.shots.length, 2, 'dual fighter fires a paired spread within the total cap');
  state.shotCooldown = 0;
  assert.equal(model.fire(state), false, 'no additional bolt can exceed the two-shot cap');
});

test('one hit destroys a grunt and awards the local formation score', () => {
  const state = model.create(3);
  state.phase = 'playing';
  state.invulnerable = 1;
  const target = grunt(300, 500);
  state.enemies = [target];
  state.shots = [{ x: 300, y: 500, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.score, 50);
  assert.equal(state.phase, 'cleared');
});

test('Boss Galaga requires two hits, and guard/grunt ranks award distinct local scores', () => {
  const state = model.create(4);
  state.phase = 'playing'; state.invulnerable = 1;
  const boss = { ...grunt(300, 480), type: 'boss', hp: 2 };
  state.enemies = [boss];
  state.shots = [{ x: 300, y: 480, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.enemies.length, 1);
  assert.equal(boss.hp, 1);
  state.phase = 'playing'; state.shots = [{ x: boss.baseX, y: boss.baseY, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.score, 150);

  const guardState = model.create(5);
  guardState.phase = 'playing'; guardState.invulnerable = 1;
  const guard = { ...grunt(280, 500), type: 'guard' };
  guardState.enemies = [guard]; guardState.shots = [{ x: 280, y: 500, vy: 0 }];
  model.tick(guardState, {}, 0.016);
  assert.equal(guardState.score, 80);
});

test('diving enemies fire aimed shots and use a distinct attack path', () => {
  const state = model.create(6);
  state.phase = 'playing'; state.invulnerable = 1; state.player.x = 400;
  const attacker = { ...grunt(200, 300, 'diving'), type: 'guard', modeTime: 0.4, diveStartX: 200, shotCooldown: 0 };
  state.enemies = [attacker]; state.diveRemaining = 10;
  model.tick(state, {}, 0.05);
  assert.ok(attacker.y > attacker.baseY);
  assert.equal(state.enemyShots.length, 1);
  assert.ok(state.enemyShots[0].vx > 0, 'the dive shot angles toward the player');
});

test('Boss tractor beam captures a fighter, costs a ship, and rescue unlocks Dual Fighter', () => {
  const state = model.create(7);
  state.phase = 'playing'; state.invulnerable = 0;
  const boss = { ...grunt(300, 350), type: 'boss', hp: 2 };
  state.enemies = [boss];
  assert.equal(model.capture(state, boss), true);
  assert.equal(state.lives, 2);
  assert.equal(state.capturedFighter, true);
  assert.equal(model.capture(state, boss), false, 'a second captive cannot be taken before rescue');
  state.phase = 'playing'; state.invulnerable = 1; boss.hp = 1; boss.mode = 'formation'; boss.baseX = 300; boss.baseY = 350;
  state.shots = [{ x: 300, y: 350, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.capturedFighter, false);
  assert.equal(state.dual, true);
  assert.equal(state.lives, 3, 'rescue restores the captured ship to the available stock');
});

test('enemy fire loses one ship and the last hit ends the run', () => {
  const state = model.create(8);
  state.phase = 'playing'; state.invulnerable = 0; state.enemies = [grunt(60, 100)];
  state.enemyShots = [{ x: state.player.x, y: state.player.y, vx: 0, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.lives, 2);
  assert.equal(state.lastEvent.type, 'lost-ship');
  state.lives = 1; state.invulnerable = 0;
  state.enemyShots = [{ x: state.player.x, y: state.player.y, vx: 0, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.phase, 'over');
  assert.equal(state.lives, 0);
});

test('clearing a formation starts a new forty-unit stage after an intermission', () => {
  const state = model.create(9);
  advanceToFormation(state);
  state.enemies = [];
  model.tick(state, {}, 0.016);
  assert.equal(state.phase, 'cleared');
  for (let i = 0; i < 30; i++) model.tick(state, {}, 0.05);
  assert.equal(state.stage, 2);
  assert.equal(state.phase, 'entry');
  assert.equal(state.enemies.length, 40);
  assert.equal(state.waveMode, 'formation');
});

test('a rescue message survives when the saved boss is the final enemy of a wave', () => {
  const state = model.create(91);
  state.phase = 'playing'; state.invulnerable = 1; state.lives = 2; state.capturedFighter = true;
  const boss = { ...grunt(300, 350), type: 'boss', hp: 1, carrying: true };
  state.enemies = [boss]; state.shots = [{ x: 300, y: 350, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.phase, 'cleared');
  assert.equal(state.dual, true);
  assert.equal(state.lives, 3);
  assert.equal(state.lastEvent.type, 'rescued');
});

test('the local level-three challenge wave rewards a perfect seeded run', () => {
  const state = model.create(10);
  state.stage = 3; state.waveMode = 'challenge'; state.phase = 'challenge';
  state.waveRemaining = 18; state.challengePerfect = true;
  const target = grunt(300, 400, 'challenge');
  state.enemies = [target]; state.shots = [{ x: 300, y: 400, vy: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.phase, 'cleared');
  assert.equal(state.score, 1100, 'local perfect-stage award is 1,000 plus the local attacking-target score');
  assert.equal(state.lastEvent.type, 'challenge-perfect');
});

test('the catalog route dispatches Galaga to its own model and portrait dimensions', () => {
  assert.equal(context.window.NP_Archetypes.kindFor({ id: 'ban-ruoi-galaga', category: 'Hành động' }), 'shooter');
  assert.equal(C.width / C.height, 10 / 13);
  assert.equal(typeof model.tick, 'function');
});

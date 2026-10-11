const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/engines-archetypes.js'), 'utf8'), context);
const api = context.window.NP_Archetypes;
const contra = api.contraModel;
const snow = api.snowBrosModel;

test('Contra begins with three lives, a run speed, a grounded fighter, and a stage boss', () => {
  const state = contra.create();
  assert.equal(state.stage, 1);
  assert.equal(state.lives, 3);
  assert.equal(state.player.grounded, true);
  assert.equal(state.enemies.filter(enemy => enemy.type === 'boss').length, 1);
  assert.equal(state.enemies.at(-1).hp, 9);
});

test('Contra movement, jump arc, crouch speed, and held fire use simulation time', () => {
  const state = contra.create();
  const x = state.player.x;
  contra.tick(state, { right: true, jump: true, fire: true }, 0.05);
  assert.equal(state.player.x - x, 205 * 0.05);
  assert.equal(state.player.grounded, false);
  assert.ok(state.player.y < 410);
  assert.equal(state.playerShots.length, 1);
  const afterRun = state.player.x;
  contra.tick(state, { right: true, down: true }, 0.05);
  assert.equal(state.player.x - afterRun, 105 * 0.05);
});

test('Contra projectiles damage ordinary targets and later stages unlock a spread pattern', () => {
  const state = contra.create();
  const target = { id: 90, type: 'trooper', x: state.player.x + 80, y: state.player.y + 17, hp: 1, maxHp: 1, fireCooldown: 4, phase: 0 };
  state.enemies = [target];
  assert.equal(contra.fire(state), true);
  contra.tick(state, {}, 0.05);
  contra.tick(state, {}, 0.05);
  assert.equal(target.hp, 0);
  assert.equal(state.score, 100);

  state.stage = 2;
  state.phase = 'playing';
  state.fireCooldown = 0;
  state.enemies = [];
  assert.equal(contra.fire(state, -1), true);
  assert.equal(state.playerShots.length, 3);
  assert.ok(state.playerShots.every(shot => shot.vy < 0));
});

test('Contra loses one life per hit, recovers briefly, and reaches game over at zero', () => {
  const state = contra.create();
  state.player.invulnerable = 0;
  state.enemyShots = [{ x: state.player.x, y: state.player.y + 17, vx: 0, vy: 0, life: 1 }];
  contra.tick(state, {}, 0.016);
  assert.equal(state.lives, 2);
  assert.ok(state.player.invulnerable > 1);
  state.player.invulnerable = 0;
  state.lives = 1;
  state.enemyShots = [{ x: state.player.x, y: state.player.y + 17, vx: 0, vy: 0, life: 1 }];
  contra.tick(state, {}, 0.016);
  assert.equal(state.lives, 0);
  assert.equal(state.phase, 'over');
});

test('Contra resolves a boss defeat before a projectile that lands in the same simulation step', () => {
  const state = contra.create();
  const boss = state.enemies.find(enemy => enemy.type === 'boss');
  boss.hp = 1;
  state.player.invulnerable = 0;
  state.lives = 1;
  state.playerShots = [{ x: boss.x - 2, y: boss.y, vx: 0, vy: 0, life: 0.2, damage: 1 }];
  state.enemyShots = [{ x: state.player.x, y: state.player.y + 17, vx: 0, vy: 0, life: 1 }];
  contra.tick(state, {}, 0.016);
  assert.equal(state.score, 1000);
  assert.equal(state.phase, 'stage-clear', 'the shot that destroys the area boss resolves the clear first');
  assert.equal(state.lives, 1);
});

test('Contra advances after the boss, escalates stage two, and wins after three authored areas', () => {
  const state = contra.create();
  state.enemies = [{ id: 99, type: 'boss', x: 400, y: 398, hp: 0, maxHp: 9, fireCooldown: 1, phase: 0 }];
  contra.tick(state, {}, 0.016);
  assert.equal(state.phase, 'stage-clear');
  for (let i = 0; i < 20; i++) contra.tick(state, {}, 0.05);
  assert.equal(state.stage, 2);
  assert.equal(state.phase, 'playing');
  assert.equal(state.enemies.find(enemy => enemy.type === 'boss').hp, 11);

  state.stage = 3;
  state.enemies = [{ id: 99, type: 'boss', x: 400, y: 398, hp: 0, maxHp: 13, fireCooldown: 1, phase: 0 }];
  contra.tick(state, {}, 0.016);
  for (let i = 0; i < 20; i++) contra.tick(state, {}, 0.05);
  assert.equal(state.phase, 'won');
  assert.equal(state.lastEvent.type, 'complete');
});

test('Snow Bros begins with a fixed floor wave and three snow hits freeze one foe', () => {
  const state = snow.create(10);
  assert.equal(state.stage, 1);
  assert.equal(state.lives, 3);
  assert.equal(state.enemies.length, 3);
  assert.equal(state.platforms.length, 1);
  const enemy = state.enemies[0];
  enemy.x = state.player.x + 45;
  enemy.fireCooldown = 20;
  for (let hit = 0; hit < 3; hit++) {
    state.fireCooldown = 0;
    assert.equal(snow.fire(state), true);
    for (let frame = 0; frame < 5; frame++) snow.tick(state, {}, 0.05);
  }
  assert.equal(enemy.snow, 3);
  assert.equal(enemy.frozen, true);
  assert.ok(state.lastEvent.type === 'freeze' || state.lastEvent.type === 'hit');
});

test('Snow Bros kicks a frozen target into a rolling ball that clears another enemy', () => {
  const state = snow.create(11);
  const frozen = state.enemies[0];
  frozen.x = state.player.x + 37;
  frozen.frozen = true;
  frozen.snow = 3;
  const target = { id: 99, x: frozen.x + 36, y: frozen.y, vx: 0, platform: 0, snow: 0, frozen: false, fireCooldown: 10, phase: 0 };
  state.enemies = [frozen, target];
  state.fireCooldown = 0;
  assert.equal(snow.fire(state), true);
  assert.equal(state.enemies.includes(frozen), false);
  assert.equal(state.snowballs.length, 1);
  snow.tick(state, {}, 0.05);
  assert.equal(state.enemies.includes(target), false);
  assert.ok(state.score >= 150);
});

test('Snow Bros supports platform landings, a visible timed pumpkin threat, and life loss', () => {
  const state = snow.create(12);
  state.stage = 2;
  state.platforms = [{ x: 0, y: 578, w: 720 }, { x: 94, y: 430, w: 210 }, { x: 416, y: 430, w: 210 }];
  const ledge = state.platforms[1];
  state.player.x = ledge.x + ledge.w / 2;
  state.player.y = ledge.y - 55;
  state.player.vy = 180;
  state.player.grounded = false;
  snow.tick(state, {}, 0.05);
  snow.tick(state, {}, 0.05);
  assert.equal(state.player.grounded, true);
  assert.equal(state.player.y + 42, ledge.y);

  state.stageTime = snow.constants.stageSeconds;
  snow.tick(state, {}, 0.016);
  assert.ok(state.pumpkin);
  state.lives = 1;
  state.player.invulnerable = 0;
  state.pumpkin.x = state.player.x;
  state.pumpkin.y = state.player.y + 20;
  snow.tick(state, {}, 0.016);
  assert.equal(state.phase, 'over');
  assert.equal(state.lives, 0);
});

test('Snow Bros clears five fixed-screen waves then enters a terminal win state', () => {
  const state = snow.create(14);
  for (let stage = 1; stage <= snow.constants.maxStage; stage++) {
    assert.equal(state.stage, stage);
    state.enemies = [];
    snow.tick(state, {}, 0.016);
    assert.equal(state.phase, 'stage-clear');
    for (let i = 0; i < 20; i++) snow.tick(state, {}, 0.05);
    if (stage < snow.constants.maxStage) {
      assert.equal(state.stage, stage + 1);
      assert.equal(state.phase, 'playing');
      assert.equal(state.enemies.length, stage + 3);
    }
  }
  assert.equal(state.phase, 'won');
  assert.equal(state.lastEvent.type, 'complete');
});

test('catalog IDs select the two dedicated models before the generic shooter fallback', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/engines-archetypes.js'), 'utf8');
  assert.match(source, /id === 'contra-2d'\) \{ launchContra\(container, game\)/);
  assert.match(source, /id === 'nguoi-tuyet-snow-bros'\) \{ launchSnowBros\(container, game\)/);
  assert.equal(typeof contra.tick, 'function');
  assert.equal(typeof snow.tick, 'function');
});

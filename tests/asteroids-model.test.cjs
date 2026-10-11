const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/engines-archetypes.js'), 'utf8'), context);
const model = context.window.NP_Archetypes.asteroidsModel;
const C = model.constants;

test('ship turns independently and thrust accelerates while inertia persists after release', () => {
  const state = model.create(1);
  const heading = state.ship.angle;
  model.tick(state, { right: true }, 0.05);
  assert.ok(state.ship.angle > heading);
  model.tick(state, { thrust: true }, 0.05);
  const speed = Math.hypot(state.ship.vx, state.ship.vy);
  assert.ok(speed > 9 && speed < 12);
  model.tick(state, {}, 0.05);
  assert.ok(Math.hypot(state.ship.vx, state.ship.vy) > speed * 0.95, 'coasting retains nearly all momentum');
});

test('ship and projectiles wrap at both space boundaries', () => {
  const state = model.create(2);
  state.invulnerable = 1;
  state.ship.x = C.width - 1; state.ship.y = 300; state.ship.vx = 100; state.ship.vy = 0;
  model.tick(state, {}, 0.05);
  assert.ok(state.ship.x < 10);
  state.ship.x = 1; state.ship.y = 300; state.ship.vx = -100;
  model.tick(state, {}, 0.05);
  assert.ok(state.ship.x > C.width - 10);
  state.bullets = [{ x: C.width - 1, y: 50, vx: 100, vy: 0, life: 1 }];
  model.tick(state, {}, 0.05);
  assert.ok(state.bullets[0].x < 10);
});

test('fire creates forward-moving bolts with a four-shot cap and cooldown', () => {
  const state = model.create(3);
  assert.equal(model.fire(state), true);
  const shot = state.bullets[0];
  assert.ok(shot.y < state.ship.y);
  assert.ok(shot.vy < -380);
  assert.equal(model.fire(state), false, 'shot cadence is rate-limited');
  state.fireCooldown = 0; state.bullets = Array.from({ length: 4 }, () => ({ life: 1 }));
  assert.equal(model.fire(state), false, 'the active projectile count is capped');
});

test('a hit splits a large boulder into two medium rocks and awards its score', () => {
  const state = model.create(4);
  state.rocks = [{ size: 3, radius: 31, x: 480, y: 324, vx: 0, vy: 0, angle: 0, spin: 0, points: Array(10).fill(1) }];
  model.fire(state);
  model.tick(state, {}, 0.05);
  assert.equal(state.score, 20);
  assert.deepEqual(Array.from(state.rocks, rock => rock.size), [2, 2]);
  assert.ok(state.rocks.every(rock => rock.vx !== 0 || rock.vy !== 0));
});

test('clearing a wave advances into a faster, larger wave after the intermission', () => {
  const state = model.create(5);
  state.rocks = [];
  model.tick(state, {}, 0.016);
  assert.equal(state.phase, 'wave-clear');
  const firstWaveCount = 3 + state.stage;
  for (let i = 0; i < 25; i++) model.tick(state, {}, 0.05);
  assert.equal(state.stage, 2);
  assert.equal(state.phase, 'playing');
  assert.equal(state.rocks.length, firstWaveCount + 1);
  assert.equal(state.lastEvent.type, 'wave-start');
});

test('collisions spend one ship, grant brief invulnerability, and end the run at zero lives', () => {
  const state = model.create(6);
  state.invulnerable = 0;
  state.rocks = [{ size: 3, radius: 31, x: state.ship.x, y: state.ship.y, vx: 0, vy: 0, angle: 0, spin: 0, points: Array(10).fill(1) }];
  model.tick(state, {}, 0.016);
  assert.equal(state.lives, 2);
  assert.ok(state.invulnerable > 1);
  state.lives = 1; state.invulnerable = 0; state.ship.x = state.rocks[0].x; state.ship.y = state.rocks[0].y;
  model.tick(state, {}, 0.016);
  assert.equal(state.lives, 0);
  assert.equal(state.phase, 'over');
});

test('hyperspace teleports, has cooldown, and score milestones award capped extra lives', () => {
  const state = model.create(7);
  const before = { x: state.ship.x, y: state.ship.y };
  assert.equal(model.hyperspace(state), true);
  assert.notDeepEqual({ x: state.ship.x, y: state.ship.y }, before);
  assert.ok(state.invulnerable > 0);
  assert.equal(model.hyperspace(state), false);

  state.score = 9990; state.lives = 3; state.ship.angle = -Math.PI / 2; state.fireCooldown = 0;
  state.bullets = []; state.rocks = [{ size: 1, radius: 11, x: state.ship.x, y: state.ship.y - 37, vx: 0, vy: 0, angle: 0, spin: 0, points: Array(10).fill(1) }];
  model.fire(state); model.tick(state, {}, 0.05);
  assert.equal(state.lives, 4);
  assert.equal(state.score, 10090);
});

test('the saucer crosses the field, aims shots at the ship, and can be shot down', () => {
  const state = model.create(8);
  state.invulnerable = 1;
  state.rocks = [{ size: 1, radius: 11, x: 50, y: 50, vx: 0, vy: 0, angle: 0, spin: 0, points: Array(10).fill(1) }];
  state.saucer = { x: 420, y: 120, vx: 70, size: 'small', fireCooldown: 0.01 };
  model.tick(state, {}, 0.05);
  assert.ok(state.saucer.x > 420);
  assert.equal(state.saucerShots.length, 1);
  assert.ok(state.saucerShots[0].vy > 0, 'the saucer aims toward the player below it');

  state.bullets = [{ x: state.saucer.x, y: state.saucer.y, vx: 0, vy: 0, life: 1 }];
  model.tick(state, {}, 0.01);
  assert.equal(state.saucer, null);
  assert.equal(state.score, 1000);
});

test('the dedicated catalog entry is routed to its own game loop', () => {
  assert.equal(context.window.NP_Archetypes.kindFor({ id: 'asteroids-tau-ban-thien-thach', category: 'Kỹ năng' }), 'shooter');
});

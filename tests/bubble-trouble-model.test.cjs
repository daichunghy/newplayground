const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/engines-archetypes.js'), 'utf8'), context);
const model = context.window.NP_Archetypes.bubbleTroubleModel;
const C = model.constants;

test('the one-player arcade starts with one large training bubble and three lives', () => {
  const state = model.create(2002);
  assert.equal(state.phase, 'playing');
  assert.equal(state.stage, 1);
  assert.equal(state.lives, C.maxLives);
  assert.equal(state.bubbles.length, 1);
  assert.ok(state.bubbles.every(bubble => bubble.size === 2 && bubble.radius === C.radii[2]));
});

test('the harpoon is a single rate-limited vertical line and popping a large bubble makes two faster medium bubbles', () => {
  const state = model.create(4);
  state.fireCooldown = 0;
  assert.equal(model.fire(state), true);
  assert.equal(model.fire(state), false);
  const x = state.playerX;
  state.bubbles = [{ size: 2, radius: C.radii[2], x, y: 405, vx: 0, vy: 0, phase: 0, spin: 0 }];
  state.harpoon = { x, tip: 0, age: 0.1, hitLock: 0 };
  model.tick(state, {}, 0.016);
  assert.equal(state.score, 45);
  assert.deepEqual(Array.from(state.bubbles, bubble => bubble.size), [1, 1]);
  assert.ok(state.bubbles[0].vx < 0 && state.bubbles[1].vx > 0);
  assert.equal(state.lastEvent.type, 'bubble-pop');
});

test('bubbles rebound from both side walls and the floor', () => {
  const state = model.create(5);
  state.bubbles = [{ size: 0, radius: C.radii[0], x: 12, y: 500, vx: -100, vy: 440, phase: 0, spin: 0 }];
  model.tick(state, {}, 0.05);
  assert.equal(state.bubbles[0].x, C.radii[0]);
  assert.ok(state.bubbles[0].vx > 0);
  assert.ok(state.bubbles[0].y <= C.floor - C.radii[0]);
  assert.ok(state.bubbles[0].vy < 0, 'the floor bounce sends the bubble back upward');
});

test('moving out of a bubble costs one life and temporary invulnerability prevents repeat hits', () => {
  const state = model.create(6);
  state.invulnerable = 0;
  state.bubbles = [{ size: 0, radius: C.radii[0], x: state.playerX, y: C.playerY, vx: 0, vy: 0, phase: 0, spin: 0 }];
  model.tick(state, {}, 0.016);
  assert.equal(state.lives, 2);
  assert.ok(state.invulnerable > 1);
  state.invulnerable = 0; state.lives = 1;
  model.tick(state, {}, 0.016);
  assert.equal(state.lives, 0);
  assert.equal(state.phase, 'over');
});

test('emptying a wave advances to the next stage, and the final stage has a win state', () => {
  const state = model.create(7);
  state.bubbles = [];
  model.tick(state, {}, 0.016);
  assert.equal(state.phase, 'stage-clear');
  assert.equal(state.lastEvent.type, 'stage-clear');
  for (let i = 0; i < 21; i++) model.tick(state, {}, 0.05);
  assert.equal(state.stage, 2);
  assert.equal(state.phase, 'playing');
  assert.equal(state.bubbles.length, 2);

  state.stage = C.maxStage; state.bubbles = []; state.phase = 'playing';
  model.tick(state, {}, 0.016);
  for (let i = 0; i < 21; i++) model.tick(state, {}, 0.05);
  assert.equal(state.phase, 'won');
  assert.equal(state.lastEvent.type, 'complete');
});

test('keyboard and pointer movement share the same clamped horizontal player model', () => {
  const state = model.create(8);
  const start = state.playerX;
  model.tick(state, { left: true }, 0.05);
  assert.ok(state.playerX < start);
  model.tick(state, { targetX: -100 }, 0.05);
  assert.equal(state.playerX, 24);
  model.tick(state, { right: true }, 0.05);
  assert.ok(state.playerX > 24);
  assert.equal(C.width / C.height, 900 / 560);
});

test('the catalog routes Bubble Trouble to a dedicated arcade mode', () => {
  assert.equal(context.window.NP_Archetypes.kindFor({ id: 'bong-bong-nuoc-bubble-trouble', category: 'Kỹ năng' }), 'reflex');
  assert.equal(typeof model.tick, 'function');
  assert.equal(C.maxStage, 10);
});

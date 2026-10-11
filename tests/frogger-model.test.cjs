const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/engines-archetypes.js'), 'utf8'), context);
const model = context.window.NP_Archetypes.froggerModel;
const { constants: C } = model;
const laneAt = (state, row) => state.lanes.find(lane => lane.row === row);
const dock = (state, index) => {
  state.frog.x = C.cellW * (C.homes[index] + 0.5);
  state.frog.row = 1;
  state.hopCooldown = 0;
  return model.hop(state, 0, -1);
};

test('Frogger starts with a ten-row crossing, four water currents and four traffic lanes', () => {
  const state = model.create(7);
  assert.equal(state.phase, 'playing');
  assert.equal(state.lives, 3);
  assert.equal(state.frog.row, 10);
  assert.equal(state.homes.length, 5);
  assert.equal(state.lanes.filter(lane => lane.kind === 'river').length, 4);
  assert.equal(state.lanes.filter(lane => lane.kind === 'road').length, 4);
  assert.ok(state.lanes.every(lane => lane.wrap === C.width), 'rendering and physics share the board width as their wrap period');
  assert.equal(state.remaining, 28);
});

test('forward hops score once per new row, while sideways movement does not farm points', () => {
  const state = model.create(1);
  state.invulnerable = 1;
  assert.equal(model.hop(state, 0, -1), true);
  assert.equal(state.frog.row, 9);
  assert.equal(state.score, 10);
  state.hopCooldown = 0;
  assert.equal(model.hop(state, 1, 0), true);
  assert.equal(state.score, 10);
  state.hopCooldown = 0;
  assert.equal(model.hop(state, 0, 1), true);
  state.hopCooldown = 0;
  assert.equal(model.hop(state, 0, -1), true);
  assert.equal(state.score, 10, 'returning to the same row does not award points again');
});

test('invalid or already filled home slots cost one life and reset the frog', () => {
  const state = model.create(2);
  state.frog.x = C.cellW * 2.5;
  state.frog.row = 1;
  assert.equal(model.hop(state, 0, -1), true);
  assert.equal(state.lives, 2);
  assert.equal(JSON.stringify(state.lastEvent), JSON.stringify({ type: 'lost-life', reason: 'Sai ổ', lives: 2 }));
  assert.equal(state.frog.row, 10);

  dock(state, 0);
  assert.equal(state.homes[0], true);
  dock(state, 0);
  assert.equal(state.homes[0], true);
  assert.equal(state.lives, 1);
  assert.equal(state.lastEvent.reason, 'Ổ đã kín');
});

test('vehicles collide, platforms carry the frog, and unsupported water is fatal', () => {
  const state = model.create(3);
  const road = laneAt(state, 9);
  state.frog.row = 9;
  road.items = [{ x: 250, width: 100, color: '#f17663', cabin: true }];
  state.frog.x = 300;
  state.invulnerable = 0;
  model.tick(state, 0.02);
  assert.equal(state.lives, 2);
  assert.equal(state.lastEvent.reason, 'Va vào xe');

  const river = laneAt(state, 2);
  state.frog.row = 2;
  state.frog.x = river.items[1].x + river.items[1].width / 2;
  const startX = state.frog.x;
  model.tick(state, 0.1);
  assert.notEqual(state.frog.x, startX, 'a supported frog drifts with its current');
  assert.equal(state.lives, 2);

  state.frog.row = 3;
  state.frog.x = 330;
  laneAt(state, 3).items = [{ x: 0, width: 30 }];
  model.tick(state, 0.02);
  assert.equal(state.lives, 1);
  assert.match(state.lastEvent.reason, /bè|nước/);
});

test('wrapped road lanes collide only with cars that visibly cross either board edge', () => {
  const leftEdge = model.create(10);
  const leftRoad = laneAt(leftEdge, 9);
  leftEdge.frog.row = 9;
  leftEdge.frog.x = 12;
  leftEdge.invulnerable = 0;
  leftRoad.items = [{ x: 650, width: 50 }];
  model.tick(leftEdge, 0.01);
  assert.equal(leftEdge.lives, 2);
  assert.equal(leftEdge.lastEvent.reason, 'Va vào xe');

  const rightEdge = model.create(11);
  const rightRoad = laneAt(rightEdge, 9);
  rightEdge.frog.row = 9;
  rightEdge.frog.x = 650;
  rightEdge.invulnerable = 0;
  rightRoad.items = [{ x: 620, width: 50 }];
  model.tick(rightEdge, 0.01);
  assert.equal(rightEdge.lives, 2);
  assert.equal(rightEdge.lastEvent.reason, 'Va vào xe');

  const noGhost = model.create(12);
  const emptyRoad = laneAt(noGhost, 9);
  noGhost.frog.row = 9;
  noGhost.frog.x = 100;
  noGhost.invulnerable = 0;
  emptyRoad.items = [{ x: 650, width: 50 }];
  model.tick(noGhost, 0.01);
  assert.equal(noGhost.lives, 3, 'a wrapped car does not collide in an unrelated lane position');
});

test('a rider remains attached to logs across the visual wrap, then loses a life only at the screen edge', () => {
  const right = model.create(13);
  const rightRiver = laneAt(right, 2);
  rightRiver.speed = 100;
  rightRiver.items = [{ x: 640, width: 60 }];
  right.frog.row = 2;
  right.frog.x = 650;
  model.tick(right, 0.2);
  assert.ok(rightRiver.items[0].x < 60, 'the right-moving log has wrapped to the left edge');
  assert.equal(right.lives, 2);
  assert.equal(right.lastEvent.reason, 'Trôi khỏi bè', 'the rider was carried by the log through the wrapped collision copy');

  const left = model.create(14);
  const leftRiver = laneAt(left, 2);
  leftRiver.speed = -100;
  leftRiver.items = [{ x: 20, width: 60 }];
  left.frog.row = 2;
  left.frog.x = 20;
  model.tick(left, 0.2);
  assert.ok(leftRiver.items[0].x < 1, 'the left-moving log reaches and wraps through the left edge');
  assert.equal(left.lives, 2);
  assert.equal(left.lastEvent.reason, 'Trôi khỏi bè');
});

test('hops animate briefly while logical movement and landing rules resolve on the first input', () => {
  const state = model.create(15);
  state.invulnerable = 1;
  assert.equal(model.hop(state, 0, -1), true);
  assert.equal(state.frog.row, 9, 'the logical move resolves immediately');
  assert.deepEqual(JSON.parse(JSON.stringify(state.hopAnimation)), {
    fromX: C.cellW * 5.5, fromRow: 10, toX: C.cellW * 5.5, toRow: 9, elapsed: 0, duration: 0.095
  });
  model.tick(state, 0.04);
  assert.equal(state.hopAnimation.elapsed, 0.04);
  model.tick(state, 0.06);
  assert.equal(state.hopAnimation, null, 'the visual tween ends before another hop is accepted');
});

test('five homes clear a stage, then reset the board with faster traffic and less time', () => {
  const state = model.create(4);
  for (let index = 0; index < C.homes.length; index++) {
    assert.equal(dock(state, index), true);
  }
  assert.equal(Array.from(state.homes).every(Boolean), true);
  assert.equal(state.phase, 'stage-clear');
  assert.equal(state.lastEvent.type, 'stage-clear');
  assert.equal(state.lives, 3);
  assert.ok(state.score >= 250);

  model.tick(state, 1.2);
  assert.equal(state.stage, 2);
  assert.equal(state.phase, 'playing');
  assert.equal(Array.from(state.homes).some(Boolean), false);
  assert.equal(state.frog.row, 10);
  assert.ok(state.remaining < C.timeLimit);

  const stageOne = model.create(9);
  const stageTwo = model.create(9);
  stageTwo.stage = 2;
  stageOne.frog.row = 5;
  stageTwo.frog.row = 5;
  laneAt(stageOne, 1).items[0].x = 200;
  laneAt(stageTwo, 1).items[0].x = 200;
  const beforeOne = laneAt(stageOne, 1).items[0].x;
  const beforeTwo = laneAt(stageTwo, 1).items[0].x;
  model.tick(stageOne, 0.5);
  model.tick(stageTwo, 0.5);
  assert.ok(Math.abs(laneAt(stageTwo, 1).items[0].x - beforeTwo) > Math.abs(laneAt(stageOne, 1).items[0].x - beforeOne));
});

test('the timer ends a life, restart remains possible, and score milestones grant capped lives', () => {
  const state = model.create(5);
  state.lives = 1;
  state.remaining = 0.01;
  model.tick(state, 0.02);
  assert.equal(state.phase, 'over');
  assert.equal(state.lives, 0);

  const fresh = model.create(6);
  fresh.score = 9995;
  fresh.invulnerable = 1;
  model.hop(fresh, 0, -1);
  assert.equal(fresh.score, 10005);
  assert.equal(fresh.lives, 4);

  const capped = model.create(8);
  capped.lives = C.maxLives;
  capped.score = 9995;
  capped.invulnerable = 1;
  model.hop(capped, 0, -1);
  assert.equal(capped.lives, C.maxLives);
  assert.equal(capped.nextExtraLife, 20000, 'a capped bonus does not remain banked for farming after losing a life');
  capped.lives--;
  capped.hopCooldown = 0;
  model.hop(capped, 0, -1);
  assert.equal(capped.lives, C.maxLives - 1);
});

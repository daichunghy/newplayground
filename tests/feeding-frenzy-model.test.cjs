const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/feeding-frenzy-model.js');

function withFish(edit) {
  const game = M.create({ seed: 17 });
  const state = game.serialize();
  state.fish.forEach(fish => { fish.x = -fish.radius; fish.vx = 0; fish.vy = 0; });
  edit(state);
  return M.restore(state);
}
function meetPlayer(state, fish) { fish.x = state.player.x; fish.y = state.player.y; fish.vx = 0; fish.vy = 0; }
function emptyMotionGame(seed = 17) { const state = M.create({ seed }).serialize(); state.fish = []; return M.restore(state); }
function runFor(game, duration, input, dt = .1) {
  let remaining = duration;
  while (remaining > 1e-10) { const step = Math.min(dt, remaining); game.step(step, input); remaining -= step; }
}

test('seeded runs are deterministic and reset restores their opening state', () => {
  const a = M.create({ seed: 123 }), b = M.create({ seed: 123 });
  for (let i = 0; i < 40; i += 1) { a.step(.05, { x: 1, y: i % 2 ? 0 : -1 }); b.step(.05, { x: 1, y: i % 2 ? 0 : -1 }); }
  assert.deepEqual(a.view(), b.view());
  a.reset();
  assert.deepEqual(a.view(), M.create({ seed: 123 }).view());
});

test('the fish grows after four prey and only eats smaller fish', () => {
  const game = withFish(state => { state.fish = state.fish.slice(0, 4); state.fish.forEach(fish => { fish.tier = 0; fish.kind = 'prey'; fish.radius = 9; meetPlayer(state, fish); }); });
  game.step(0);
  assert.equal(game.view().score, 4);
  assert.equal(game.view().tier, 2);
  assert.equal(game.view().player.radius, 19);
  const before = game.view().score;
  game.step(.05, { x: 0, y: 0 });
  assert.equal(game.view().score, before);
});

test('each four-prey milestone changes reef, background profile, and predator count', () => {
  const first = M.create({ seed: 22 }), initial = first.serialize();
  assert.equal(first.view().stageIndex, 0);
  assert.equal(initial.fish.filter(fish => fish.kind === 'predator').length, 1);
  const prey = initial.fish.find(fish => fish.kind === 'prey' && fish.tier === 0);
  initial.fish = initial.fish.filter(fish => fish.kind === 'predator');
  for (let id = 0; id < 4; id += 1) initial.fish.push({ ...prey, id: initial.nextId++, x: initial.player.x, y: initial.player.y, vx: 0, vy: 0 });
  const firstZone = M.restore(initial); firstZone.step(0);
  assert.equal(firstZone.view().score, 4); assert.equal(firstZone.view().stageIndex, 1);
  assert.equal(firstZone.view().stage.name, 'Rạn San Hô'); assert.equal(firstZone.view().stageProgress, 0);
  assert.equal(firstZone.view().fish.filter(fish => fish.kind === 'predator').length, 2);
  assert.equal(firstZone.view().event, 'stage');

  const second = firstZone.serialize(), medium = { ...prey, tier: 1, radius: 14 };
  second.fish = second.fish.filter(fish => fish.kind === 'predator');
  for (let id = 0; id < 4; id += 1) second.fish.push({ ...medium, id: second.nextId++, x: second.player.x, y: second.player.y, vx: 0, vy: 0 });
  const deep = M.restore(second); deep.step(0);
  assert.equal(deep.view().score, 8); assert.equal(deep.view().stageIndex, 2);
  assert.equal(deep.view().stage.name, 'Biển Xanh'); assert.equal(deep.view().stageProgress, 0);
  assert.equal(deep.view().fish.filter(fish => fish.kind === 'predator').length, 3);
});

test('growth at a wall is clamped so the versioned save still restores', () => {
  const game = M.create({ seed: 41 }), state = game.serialize(), prey = state.fish.find(fish => fish.kind === 'prey' && fish.tier === 0);
  state.score = 3; state.stageIndex = 0; state.tier = 1;
  state.player.x = state.player.radius; state.player.y = state.player.radius;
  state.fish = state.fish.filter(fish => fish.kind === 'predator');
  state.fish.push({ ...prey, id: state.nextId++, x: state.player.x, y: state.player.y, vx: 0, vy: 0 });
  const edge = M.restore(state); edge.step(0);
  assert.equal(edge.view().score, 4); assert.equal(edge.view().tier, 2);
  assert.ok(edge.view().player.x >= edge.view().player.radius);
  assert.ok(edge.view().player.y >= edge.view().player.radius);
  assert.deepEqual(M.restore(edge.serialize()).view(), edge.view());
});

test('reaching twelve prey ends the round immediately without score overflow', () => {
  const game = withFish(state => {
    const template = state.fish[0];
    state.fish = Array.from({ length: 12 }, (_, id) => ({ ...template, id, tier: 0, kind: 'prey', radius: 9, x: state.player.x, y: state.player.y, vx: 0, vy: 0 }));
    state.nextId = 13;
  });
  game.step(0);
  assert.equal(game.view().status, 'won');
  assert.equal(game.view().score, M.TARGET);
  assert.equal(game.step(.05), false);
});

test('a larger predator costs one life, grants brief protection, then can end the run', () => {
  const game = withFish(state => {
    const predator = state.fish.find(fish => fish.kind === 'predator');
    state.fish = [predator];
    predator.x = state.player.x; predator.y = state.player.y; predator.vx = 0; predator.vy = 0;
    state.lives = 1;
  });
  game.step(0);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().lives, 0);
  assert.equal(game.step(.05), false);
});

test('the round ends at ninety seconds and snapshot restore preserves state', () => {
  const game = withFish(state => { state.time = 89.95; state.fish = []; });
  const restored = M.restore(game.serialize());
  assert.deepEqual(restored.view(), game.view());
  game.step(.05);
  assert.equal(game.view().time, M.DURATION);
  assert.equal(game.view().status, 'timeout');
  assert.throws(() => M.restore({ ...game.serialize(), time: 20 }), /timeout/);
});

test('inputs are bounded and invalid fixed steps and snapshots are rejected', () => {
  const game = M.create();
  game.step(.1, { x: 100, y: 100 });
  assert.ok(game.view().player.x <= M.WIDTH - game.view().player.radius);
  assert.ok(game.view().player.y <= M.HEIGHT - game.view().player.radius);
  assert.throws(() => game.step(.2), /step/);
  assert.throws(() => M.create({ seed: 0 }), /seed/);
  const broken = game.serialize(); broken.player.radius += 1;
  assert.throws(() => M.restore(broken), /state/);
  assert.throws(() => M.restore(null), /snapshot/);
  assert.throws(() => M.restore({ ...game.serialize(), version: 1 }), /snapshot/);
});

test('held input ramps quickly to the unchanged cruise speed and caps diagonal swim speed', () => {
  const game = emptyMotionGame(), start = game.view().player;
  game.step(.1, { x: 1, y: 0 });
  let player = game.view().player;
  assert.ok(player.x > start.x, 'keyboard input produces movement on the first 100 ms');
  assert.ok(player.vx > 0 && player.vx < M.PLAYER_SPEED, 'the fish accelerates instead of snapping to cruise speed');
  assert.ok(Math.abs(player.x - start.x - 7.25) < 1e-9);
  runFor(game, .2, { x: 1, y: 0 });
  player = game.view().player;
  assert.equal(player.vx, M.PLAYER_SPEED);
  assert.equal(player.vy, 0);

  const diagonal = emptyMotionGame();
  runFor(diagonal, .2, { x: 1, y: 1 });
  const speed = Math.hypot(diagonal.view().player.vx, diagonal.view().player.vy);
  assert.ok(Math.abs(speed - M.PLAYER_SPEED) < 1e-9, 'diagonal input does not exceed the same max speed');
});

test('release brakes within a short coast and a quarter-turn has a smooth, measurable arc', () => {
  const game = emptyMotionGame(), startX = game.view().player.x;
  runFor(game, .3, { x: 1, y: 0 });
  const cruiseX = game.view().player.x;
  assert.ok(Math.abs(cruiseX - startX - 42.4744827586207) < 1e-9);
  runFor(game, .2, { x: 0, y: 0 });
  const released = game.view().player;
  assert.equal(released.vx, 0);
  assert.ok(Math.abs(released.x - cruiseX - 8.1241025641025) < 1e-8, 'release coasts only about eight pixels before stopping');
  const stoppedX = released.x;
  runFor(game, .1, { x: 0, y: 0 });
  assert.equal(game.view().player.x, stoppedX);

  const turn = emptyMotionGame();
  runFor(turn, .2, { x: 1, y: 0 });
  const beforeTurn = turn.view().player;
  runFor(turn, .1, { x: 0, y: -1 });
  const duringTurn = turn.view().player;
  assert.ok(duringTurn.vx > 0 && duringTurn.vy < 0, 'the fish arcs through the turn instead of teleporting its heading');
  assert.ok(duringTurn.vx < beforeTurn.vx && Math.abs(duringTurn.vy) > 0);
  runFor(turn, .1, { x: 0, y: -1 });
  assert.ok(turn.view().player.vy < -M.PLAYER_SPEED * .95, 'a held turn still reaches cruise speed promptly');
});

test('opposite input deliberately cancels momentum before swimming the other way', () => {
  const game = emptyMotionGame(), startX = game.view().player.x;
  runFor(game, .2, { x: 1, y: 0 });
  runFor(game, .1, { x: -1, y: 0 });
  const braking = game.view().player;
  assert.ok(braking.vx > 0 && braking.x > startX, 'a short reverse tap cancels the current stroke first');
  runFor(game, .2, { x: -1, y: 0 });
  assert.equal(game.view().player.vx, -M.PLAYER_SPEED);
  assert.equal(game.view().player.facing, -1);
});

test('all tank edges clamp position, remove outward velocity, and let inward input escape', () => {
  const lowerLeft = M.create({ seed: 21 }).serialize(); lowerLeft.fish = [];
  lowerLeft.player.x = lowerLeft.player.radius + 1; lowerLeft.player.y = lowerLeft.player.radius + 1;
  const leftTop = M.restore(lowerLeft);
  runFor(leftTop, .1, { x: -1, y: -1 });
  let player = leftTop.view().player;
  assert.equal(player.x, player.radius); assert.equal(player.y, player.radius);
  assert.equal(player.vx, 0); assert.equal(player.vy, 0);
  runFor(leftTop, .1, { x: 1, y: 1 });
  player = leftTop.view().player;
  assert.ok(player.x > player.radius && player.y > player.radius);

  const lowerRight = M.create({ seed: 22 }).serialize(); lowerRight.fish = [];
  lowerRight.player.x = M.WIDTH - lowerRight.player.radius - 1; lowerRight.player.y = M.HEIGHT - lowerRight.player.radius - 1;
  const rightBottom = M.restore(lowerRight);
  runFor(rightBottom, .1, { x: 1, y: 1 });
  player = rightBottom.view().player;
  assert.equal(player.x, M.WIDTH - player.radius); assert.equal(player.y, M.HEIGHT - player.radius);
  assert.equal(player.vx, 0); assert.equal(player.vy, 0);
  runFor(rightBottom, .1, { x: -1, y: -1 });
  player = rightBottom.view().player;
  assert.ok(player.x < M.WIDTH - player.radius && player.y < M.HEIGHT - player.radius);
});

test('movement trajectories are stable across 100 ms and 60 Hz frame partitions', () => {
  const coarse = emptyMotionGame(24), fine = emptyMotionGame(24);
  const cues = [[.3, { x: 1, y: 0 }], [.3, { x: 0, y: 1 }], [.2, { x: 0, y: 0 }]];
  for (const [duration, input] of cues) { runFor(coarse, duration, input, .1); runFor(fine, duration, input, 1 / 60); }
  const a = coarse.view().player, b = fine.view().player;
  for (const key of ['x', 'y', 'vx', 'vy']) assert.ok(Math.abs(a[key] - b[key]) < 1e-8, `${key} differs across partitions by ${a[key] - b[key]}`);
});

test('legacy v2 cruise-velocity saves restore and continue with the new release model', () => {
  const oldSave = M.create({ seed: 25 }).serialize();
  oldSave.fish = []; oldSave.player.vx = M.PLAYER_SPEED; oldSave.player.vy = 0;
  const restored = M.restore(oldSave);
  assert.equal(restored.serialize().version, 2);
  assert.deepEqual(restored.serialize().player, oldSave.player);
  restored.step(.05, { x: 0, y: 0 });
  const braking = restored.serialize();
  assert.equal(braking.version, 2);
  assert.ok(braking.player.vx > 0 && braking.player.vx < M.PLAYER_SPEED);
  assert.deepEqual(M.restore(braking).serialize(), braking, 'a partially braked save remains recoverable without schema migration');
  restored.step(.05, { x: 0, y: 0 });
  assert.equal(restored.view().player.vx, 0);
});

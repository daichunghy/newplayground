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

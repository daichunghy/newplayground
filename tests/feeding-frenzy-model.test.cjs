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
});

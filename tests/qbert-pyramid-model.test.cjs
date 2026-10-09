const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/qbert-pyramid-model.js');

function shortestPath(start, goal) {
  const queue = [{ row: start.row, col: start.col, path: [] }];
  const seen = new Set([`${start.row},${start.col}`]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current.row === goal.row && current.col === goal.col) return current.path;
    for (const next of M.neighbors(current.row, current.col)) {
      const key = `${next.row},${next.col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ row: next.row, col: next.col, path: [...current.path, next.direction] });
    }
  }
  return null;
}

function sweepToWin(model) {
  const levels = new Set([model.view().levelNumber]);
  for (let turn = 0; turn < 500 && model.view().status === 'playing'; turn++) {
    const view = model.view();
    if (view.goalsFound === view.goalsTotal) break;
    let path = null;
    for (const tile of view.tiles) {
      if (tile.visited) continue;
      const candidate = shortestPath(view.player, tile);
      if (candidate && (!path || candidate.length < path.length)) path = candidate;
    }
    assert.ok(path?.length, 'there should be a route to a remaining tile');
    model.move(path[0]);
    levels.add(model.view().levelNumber);
  }
  return levels;
}

test('creates a seven-row, 28-tile pyramid with two legal hops from the apex', () => {
  const model = M.create({ seed: 41 }), view = model.view();
  assert.equal(M.ROWS, 7);
  assert.equal(M.TILE_COUNT, 28);
  assert.equal(view.tiles.length, 28);
  assert.equal(new Set(view.tiles.map(tile => tile.id)).size, 28);
  assert.equal(view.goalsFound, 1, 'the starting apex begins lit');
  assert.equal(view.player.id, '0,0');
  assert.deepEqual(M.neighbors(0, 0).map(node => node.direction), ['downLeft', 'downRight']);
  assert.deepEqual(view.enemies, M.create({ seed: 41 }).view().enemies);
});

test('diagonal landings recolor tiles and score once, revisits still cost a turn', () => {
  const model = M.create({ seed: 1 });
  const first = model.move('downLeft');
  assert.equal(first.event, 'landed');
  assert.equal(model.view().player.id, '1,0');
  assert.equal(model.view().goalsFound, 2);
  assert.equal(model.view().score, 210);
  const revisit = model.move('upRight');
  assert.equal(revisit.event, 'revisit');
  assert.equal(model.view().player.id, '0,0');
  assert.equal(model.view().goalsFound, 2);
  assert.equal(model.view().turns, 2);
  assert.equal(model.view().score, 220);
  const snapshot = model.view();
  assert.equal(model.move('sideways').accepted, false);
  assert.deepEqual(model.view(), snapshot);
});

test('patrols move on deterministic turns and contact costs one life', () => {
  const mover = M.create({ seed: 1 });
  const initial = mover.view().enemies[0];
  mover.move('downRight'); // (1,1)
  mover.move('downLeft'); // (2,1)
  mover.move('upRight'); // (1,1); pursuer completes its first patrol step
  assert.notDeepEqual(mover.view().enemies[0], initial);
  assert.deepEqual(mover.view().enemies[0], { ...initial, row: 4, col: 1 });
  const repeat = M.create({ seed: 1 });
  repeat.move('downRight'); repeat.move('downLeft'); repeat.move('upRight');
  assert.deepEqual(mover.view(), repeat.view(), 'same seed and turns repeat the same patrol route');
  const alternate = M.create({ seed: 2 });
  alternate.move('downRight'); alternate.move('downLeft'); alternate.move('upRight');
  assert.notDeepEqual(alternate.view().enemies, mover.view().enemies);

  const hit = M.create({ seed: 1 });
  hit.move('downLeft'); hit.move('downLeft');
  const result = hit.move('downRight'); // Lands on the patrol's authored first tile.
  assert.equal(result.event, 'enemy');
  assert.equal(hit.view().lives, M.MAX_LIVES - 1);
  assert.equal(hit.view().player.id, '0,0');
  assert.equal(hit.view().lastEvent, 'enemy');
  assert.equal(hit.move('downLeft').event, 'revisit', 'the one-turn respawn grace is not reported as another hit');
  assert.equal(hit.view().lives, M.MAX_LIVES - 1);
});

test('falling from the apex spends a life and returns the player to the apex', () => {
  const model = M.create({ seed: 8 });
  const result = model.move('upLeft');
  assert.equal(result.event, 'fall');
  assert.equal(model.view().player.id, '0,0');
  assert.equal(model.view().lives, M.MAX_LIVES - 1);
  assert.equal(model.view().goalsFound, 1);
});

test('a deterministic sweep can light every tile across all three levels and win', () => {
  const model = M.create({ seed: 1 });
  const reachedLevels = sweepToWin(model), view = model.view();
  assert.deepEqual([...reachedLevels], [1, 2, 3]);
  assert.equal(view.status, 'won');
  assert.equal(view.levelNumber, 3);
  assert.equal(view.goalsFound, M.TILE_COUNT);
  assert.equal(view.score > 0, true);
  assert.equal(model.move('downLeft').accepted, false);
});

test('the campaign timer and exhausted lives are terminal; pause freezes time and restart recovers', () => {
  const timer = M.create({ seed: 2 });
  assert.equal(timer.pause(), true);
  const paused = timer.view();
  assert.equal(timer.advance(5000), false);
  assert.deepEqual(timer.view(), paused);
  assert.equal(timer.resume(), true);
  assert.equal(timer.advance(M.CAMPAIGN_TIME_MS), true);
  assert.equal(timer.view().status, 'lost');
  assert.equal(timer.view().lossReason, 'time');
  assert.equal(timer.advance(100), false);
  timer.restart();
  assert.equal(timer.view().status, 'playing');
  assert.equal(timer.view().timeLeft, M.CAMPAIGN_TIME_MS);

  const lives = M.create({ seed: 2 });
  for (let count = 0; count < M.MAX_LIVES; count++) lives.move('upLeft');
  assert.equal(lives.view().status, 'lost');
  assert.equal(lives.view().lossReason, 'fall');
  assert.equal(lives.view().lives, 0);
});

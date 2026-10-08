const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/khoi-da-lan-model.js');

function key(state) { return `${state.x},${state.y},${state.orientation}`; }

function shortestRoute(levelIndex) {
  const game = M.create(levelIndex, { progress: { unlockedCount: M.LEVELS.length } });
  const view = game.view();
  const supports = new Set(view.tiles.map(tile => `${tile.x},${tile.y}`));
  const start = { ...view.start, orientation: 'stand' };
  const queue = [start];
  const previous = new Map([[key(start), null]]);
  const stepByState = new Map();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const state = queue[cursor];
    if (state.orientation === 'stand' && state.x === view.goal.x && state.y === view.goal.y) {
      const path = [];
      let current = key(state);
      while (previous.get(current) !== null) {
        path.push(stepByState.get(current));
        current = previous.get(current);
      }
      return path.reverse();
    }
    for (const direction of M.DIRECTIONS) {
      const next = M.moved(state, direction);
      const nextKey = key(next);
      if (previous.has(nextKey) || !M.occupied(next).every(cell => supports.has(`${cell.x},${cell.y}`))) continue;
      previous.set(nextKey, key(state));
      stepByState.set(nextKey, direction);
      queue.push(next);
    }
  }
  return null;
}

test('rolling transitions preserve the block footprint in all three orientations', () => {
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'stand' }, 'left'), { x: 1, y: 4, orientation: 'wide' });
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'stand' }, 'right'), { x: 4, y: 4, orientation: 'wide' });
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'stand' }, 'up'), { x: 3, y: 2, orientation: 'tall' });
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'stand' }, 'down'), { x: 3, y: 5, orientation: 'tall' });
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'wide' }, 'right'), { x: 5, y: 4, orientation: 'stand' });
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'wide' }, 'up'), { x: 3, y: 3, orientation: 'wide' });
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'tall' }, 'down'), { x: 3, y: 6, orientation: 'stand' });
  assert.deepEqual(M.moved({ x: 3, y: 4, orientation: 'tall' }, 'left'), { x: 2, y: 4, orientation: 'tall' });
  assert.equal(M.occupied({ x: 3, y: 4, orientation: 'stand' }).length, 1);
  assert.equal(M.occupied({ x: 3, y: 4, orientation: 'wide' }).length, 2);
  assert.equal(M.occupied({ x: 3, y: 4, orientation: 'tall' }).length, 2);
});

test('all ten authored boards have distinct topology and a shortest route to the upright goal', () => {
  assert.equal(M.LEVELS.length, 10);
  const topologies = new Set(M.LEVELS.map(level => level.rows.join('\n')));
  assert.equal(topologies.size, M.LEVELS.length);
  for (let i = 0; i < M.LEVELS.length; i++) {
    const route = shortestRoute(i);
    assert.ok(route && route.length > 0, `level ${i + 1} should be solvable`);
    assert.equal(route.length, M.LEVELS[i].par, `${M.LEVELS[i].name} par should be its verified shortest route`);
    const game = M.create(i, { progress: { unlockedCount: M.LEVELS.length } });
    for (const direction of route) assert.equal(game.move(direction), true);
    assert.equal(game.view().status, 'won', `${M.LEVELS[i].name} route should finish upright in the hole`);
    assert.equal(game.view().block.orientation, 'stand');
    assert.equal(game.view().moves, route.length);
  }
  assert.ok(M.LEVELS.some(level => level.rows.some(row => row.includes('='))), 'at least one authored board should include a marked safe stone bridge');
  for (let i = 1; i < M.LEVELS.length; i++) {
    assert.ok(M.LEVELS[i].par > M.LEVELS[i - 1].par, 'campaign par should rise at each stage');
  }
});

test('every legal roll transition preserves its footprint and reverses to the same pose', () => {
  const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' };
  for (const level of M.LEVELS) {
    const game = M.create(0, { progress: { unlockedCount: M.LEVELS.length } });
    game.selectLevel(M.LEVELS.indexOf(level));
    const view = game.view();
    const supports = new Set(view.tiles.map(tile => `${tile.x},${tile.y}`));
    for (let y = 0; y < view.height; y++) for (let x = 0; x < view.width; x++) {
      for (const orientation of ['stand', 'wide', 'tall']) {
        const state = { x, y, orientation };
        if (!M.occupied(state).every(cell => supports.has(`${cell.x},${cell.y}`))) continue;
        for (const direction of M.DIRECTIONS) {
          const next = M.moved(state, direction);
          if (!M.occupied(next).every(cell => supports.has(`${cell.x},${cell.y}`))) continue;
          const restored = M.moved(next, opposite[direction]);
          assert.deepEqual(restored, state, `${level.name}: ${orientation} rolling ${direction} and back`);
        }
      }
    }
  }
});

test('a fall from an unsupported footprint returns to the start and can be undone', () => {
  const game = M.create(0);
  const before = game.view();
  assert.equal(game.move('left'), true);
  const fallen = game.view();
  assert.equal(fallen.lastEvent, 'fall');
  assert.equal(fallen.falls, 1);
  assert.equal(fallen.moves, 1);
  assert.deepEqual(fallen.block, { ...before.block, cells: [{ x: 2, y: 2 }] });
  assert.equal(game.undo(), true);
  assert.equal(game.view().moves, 0);
  assert.equal(game.view().falls, 0);
  assert.equal(game.view().block.x, before.block.x);
  assert.equal(game.view().block.y, before.block.y);
  assert.equal(game.undo(), false);
});

test('restart clears move history and unlocked level choice works', () => {
  const game = M.create(0, { progress: { unlockedCount: M.LEVELS.length } });
  game.move('right');
  game.move('left');
  assert.equal(game.view().moves, 2);
  assert.equal(game.restart(), true);
  assert.equal(game.view().levelIndex, 0);
  assert.equal(game.view().moves, 0);
  assert.equal(game.view().canUndo, false);
  assert.equal(game.selectLevel(2), true);
  assert.equal(game.view().levelName, 'Vành Sao');
  assert.equal(game.view().moves, 0);
  assert.equal(game.selectLevel(-1), false);
  assert.equal(game.selectLevel(M.LEVELS.length), false);
});

test('undo restores the previous footprint and winning is terminal until next or restart', () => {
  const route = shortestRoute(0);
  const game = M.create(0);
  for (const direction of route) assert.equal(game.move(direction), true);
  assert.equal(game.view().status, 'won');
  assert.equal(game.move('right'), false);
  assert.equal(game.nextLevel(), true);
  assert.equal(game.view().levelIndex, 1);
  assert.equal(game.view().moves, 0);
  assert.equal(game.restart(), true);
  assert.equal(game.view().status, 'playing');
});

test('campaign unlocks one stage at a time and keeps a best move record across sessions', () => {
  const first = M.create();
  assert.equal(first.view().unlockedCount, 1);
  assert.equal(first.selectLevel(1), false);
  for (const direction of shortestRoute(0)) first.move(direction);
  assert.equal(first.view().unlockedCount, 2);
  assert.equal(first.view().bestMoves, M.LEVELS[0].par);
  assert.equal(first.view().canNext, true);
  assert.equal(first.nextLevel(), true);
  for (const direction of shortestRoute(1)) first.move(direction);
  assert.equal(first.view().unlockedCount, 3);

  const saved = first.progress();
  const resumed = M.create(0, { progress: saved });
  assert.equal(resumed.view().unlockedCount, 3);
  assert.equal(resumed.selectLevel(2), true);
  assert.equal(resumed.view().levelName, M.LEVELS[2].name);

  const replay = M.create(0, { progress: saved });
  replay.move('left'); // A deliberate fall adds a move before the shortest finish.
  for (const direction of shortestRoute(0)) replay.move(direction);
  assert.equal(replay.view().status, 'won');
  assert.equal(replay.view().bestMoves, M.LEVELS[0].par);
});

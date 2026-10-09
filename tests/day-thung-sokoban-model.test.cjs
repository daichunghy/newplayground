const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/day-thung-sokoban-model.js');

function shortestWitness(levelIndex) {
  const start = M.create(levelIndex).view(), walls = new Set(start.walls);
  const dirs = [['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]];
  const pointKey = point => `${point.x},${point.y}`;
  const stateKey = (player, boxes) => `${pointKey(player)}|${boxes.map(pointKey).sort().join(';')}`;
  const queue = [{ player: start.player, boxes: start.boxes, path: [] }];
  const seen = new Set([stateKey(start.player, start.boxes)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor], boxKeys = new Set(current.boxes.map(pointKey));
    if (start.goals.every(goal => boxKeys.has(pointKey(goal)))) return current.path;
    for (const [direction, dx, dy] of dirs) {
      const next = { x: current.player.x + dx, y: current.player.y + dy };
      const nextKey = pointKey(next);
      if (next.x < 0 || next.x >= start.width || next.y < 0 || next.y >= start.height || walls.has(nextKey)) continue;
      let boxes = current.boxes;
      if (boxKeys.has(nextKey)) {
        const beyond = { x: next.x + dx, y: next.y + dy }, beyondKey = pointKey(beyond);
        if (beyond.x < 0 || beyond.x >= start.width || beyond.y < 0 || beyond.y >= start.height || walls.has(beyondKey) || boxKeys.has(beyondKey)) continue;
        boxes = current.boxes.map(box => pointKey(box) === nextKey ? beyond : box);
      }
      const nextStateKey = stateKey(next, boxes);
      if (seen.has(nextStateKey)) continue;
      seen.add(nextStateKey);
      queue.push({ player: next, boxes, path: [...current.path, direction] });
    }
  }
  return null;
}

test('starts on the first authored room with a player, one box, and one goal', () => {
  const game = M.create();
  const view = game.view();
  assert.equal(view.levelIndex, 0);
  assert.equal(view.status, 'playing');
  assert.deepEqual(view.boxes, [{ x: 5, y: 2 }]);
  assert.deepEqual(view.goals, [{ x: 2, y: 2 }]);
  assert.deepEqual(view.player, { x: 4, y: 3 });
  assert.equal(view.moves, 0);
});

test('moves one tile, counts pushes, and forbids pushing two adjacent boxes at once', () => {
  const game = M.create(1);
  assert.equal(game.move('left'), true);
  assert.equal(game.move('left'), true);
  assert.equal(game.move('up'), true);
  assert.deepEqual(game.view().player, { x: 1, y: 3 });
  const moves = game.view().moves;
  assert.equal(game.move('right'), false);
  assert.equal(game.view().moves, moves);
  assert.deepEqual(game.view().boxes, [{ x: 2, y: 3 }, { x: 3, y: 3 }]);
  assert.equal(game.view().pushes, 0);

  const pushing = M.create(1);
  assert.equal(pushing.move('left'), true);
  assert.equal(pushing.move('up'), true);
  assert.equal(pushing.view().boxes[0].y, 2);
  assert.equal(pushing.view().player.y, 3);
  assert.equal(pushing.view().pushes, 1);
});

test('a crate moves one square at a time and cannot be pushed into a wall', () => {
  const game = M.create(2);
  assert.equal(game.move('up'), true);
  assert.equal(game.move('up'), true);
  assert.deepEqual(game.view().boxes, [{ x: 2, y: 1 }]);
  assert.equal(game.view().pushes, 1);
  assert.equal(game.move('up'), false);
  assert.equal(game.view().moves, 2);
  assert.equal(game.view().pushes, 1);
});

test('rejects unknown directions, boundary movement, and invalid level selection', () => {
  const game = M.create();
  assert.equal(game.move('northwest'), false);
  assert.equal(game.move('left'), true);
  assert.equal(game.move('left'), true);
  assert.equal(game.move('left'), true);
  assert.equal(game.move('left'), false);
  assert.equal(game.selectLevel(-1), false);
  assert.equal(game.selectLevel(M.LEVELS.length), false);
  assert.equal(game.view().moves, 3);
});

test('undo restores both a walk and a crate push, including after a win', () => {
  const game = M.create();
  for (const direction of ['right', 'right', 'up', 'left', 'left', 'left']) game.move(direction);
  assert.equal(game.view().status, 'won');
  assert.equal(game.undo(), true);
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().boxes[0].x, 3);
  assert.equal(game.view().moves, 5);
  assert.equal(game.undo(), true);
  assert.equal(game.view().boxes[0].x, 4);
  assert.equal(game.view().pushes, 1);
  assert.equal(game.undo(), true);
  assert.equal(game.view().player.x, 6);
  const before = game.view();
  assert.equal(game.undo(), true);
  assert.equal(game.view().moves, before.moves - 1);
  while (game.undo()) {}
  assert.equal(game.undo(), false);
  assert.equal(game.view().moves, 0);
});

test('each authored room has a legal solution and level advance is deterministic', () => {
  assert.equal(M.LEVELS.length, 6);
  const game = M.create();
  for (let level = 0; level < M.LEVELS.length; level += 1) {
    const witness = shortestWitness(level);
    assert.ok(witness, `level ${level + 1} has a solver witness`);
    if (game.view().levelIndex !== level) assert.equal(game.selectLevel(level), true);
    for (const direction of witness) assert.equal(game.move(direction), true, `level ${level + 1}: ${direction}`);
    assert.equal(game.view().status, 'won', `level ${level + 1} should be solvable`);
    assert.equal(game.view().unlockedLevel, Math.min(level + 1, M.LEVELS.length - 1));
    assert.equal(game.view().bestMoves[level], witness.length);
    if (level < M.LEVELS.length - 1) {
      assert.equal(game.nextLevel(), true);
      assert.equal(game.view().moves, 0);
      assert.equal(game.view().status, 'playing');
    }
  }
  assert.equal(game.nextLevel(), false);
  assert.equal(game.selectLevel(0), true);
  assert.equal(game.view().levelIndex, 0);
});

test('mid-room saves restore the board, undo stack, unlocks, and best-move records', () => {
  const game = M.create();
  for (const direction of ['right','right','up','left']) game.move(direction);
  const snapshot = game.serialize(), restored = M.restore(snapshot);
  assert.ok(restored);
  assert.deepEqual(restored.view(), game.view());
  assert.deepEqual(restored.undo(), game.undo());
  assert.deepEqual(restored.view(), game.view());
  const edits = [
    data => { data.version = 99; },
    data => { data.state.player = { x: 0, y: 0 }; },
    data => { data.progress.unlockedLevel = M.LEVELS.length; },
    data => { data.progress.bestMoves[0] = -1; },
    data => { data.history[0].boxes[0].x = 0; },
    data => { data.history[0].player = { x: 1, y: 1 }; }
  ];
  for (const edit of edits) { const damaged = game.serialize(); edit(damaged); assert.equal(M.restore(damaged), null); }
});

test('reset clears the active room without changing its index', () => {
  const game = M.create(2);
  game.move('up');
  game.reset();
  const view = game.view();
  assert.equal(view.levelIndex, 2);
  assert.equal(view.moves, 0);
  assert.equal(view.pushes, 0);
  assert.equal(view.status, 'playing');
  assert.deepEqual(view.player, { x: 2, y: 4 });
  assert.deepEqual(view.boxes, [{ x: 2, y: 2 }]);
});

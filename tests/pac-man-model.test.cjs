const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/engines-classics.js'), 'utf8'), context);
const model = context.window.NP_Engines.pacManModel;
const C = model.constants;

function reachableCount(state) {
  const queue = [{ x: 1, y: 1 }];
  const seen = new Set(['1,1']);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    for (const dir of model.directions) {
      if (!model.canMove(state.maze, cell.x, cell.y, dir, 'ghost')) continue;
      const next = model.nextCell(cell.x, cell.y, dir);
      const key = `${next.x},${next.y}`;
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  return seen.size;
}

test('Pac-Man uses an original connected maze, three starting lives, and a narrow wrap tunnel', () => {
  const state = model.create();
  assert.equal(state.maze.length, C.rows);
  assert.ok(state.maze.every(row => row.length === C.cols));
  assert.equal(state.lives, 3);
  assert.deepEqual(Array.from(state.ghosts, ghost => ghost.releaseTimer), [3, 5.25, 7.5, 9.75]);
  assert.equal(reachableCount(state), state.maze.flat().filter(tile => tile !== 1).length);
  assert.equal(model.canMove(state.maze, 0, 10, { x: -1, y: 0 }, 'player'), true);
  assert.equal(model.canMove(state.maze, 0, 9, { x: -1, y: 0 }, 'player'), false);
  assert.equal(model.canMove(state.maze, 1, 10, { x: 0, y: -1 }, 'player'), state.maze[9][1] !== 1);
});

test('player travel uses elapsed simulation time at 60 Hz and 120 Hz', () => {
  const a = model.create(), b = model.create();
  for (const state of [a, b]) state.ghosts.forEach(ghost => { ghost.releaseTimer = 10; });
  const down = model.directions.find(dir => dir.key === 'down');
  model.tick(a, {}, 0.05);
  assert.equal(a.player.progress, 0, 'an idle player stays aligned to the tile center');
  for (let i = 0; i < 60; i++) model.tick(a, { direction: down }, 1 / 60);
  for (let i = 0; i < 120; i++) model.tick(b, { direction: down }, 1 / 120);
  const pa = model.actorPosition(a.player), pb = model.actorPosition(b.player);
  assert.ok(Math.abs(pa.x - pb.x) < 0.01);
  assert.ok(Math.abs(pa.y - pb.y) < 0.01);
  assert.equal(a.score, b.score);
});

test('dot and power-pellet rewards consume one tile and frightened time shortens with level', () => {
  const state = model.create();
  const initialPellets = state.pelletsLeft;
  state.maze[1][17] = 3;
  state.player.x = 17; state.player.y = 1;
  model.consumeCell(state);
  assert.equal(state.score, 50);
  assert.equal(state.pelletsLeft, initialPellets - 1);
  assert.equal(state.frightenedTimer, model.frightenedDuration(1));
  assert.ok(model.frightenedDuration(4) < model.frightenedDuration(1));
  state.maze[1][16] = 2; state.player.x = 16; state.player.y = 1;
  model.consumeCell(state);
  assert.equal(state.score, 60);
  assert.equal(state.pelletsLeft, initialPellets - 2);
});

test('eating a power pellet reverses ghosts without changing their positions', () => {
  const state = model.create();
  const ghost = state.ghosts[0];
  Object.assign(ghost, { x: 8, y: 8, progress: 10, dirX: 1, dirY: 0, nextX: 1, nextY: 0 });
  const before = model.actorPosition(ghost);
  state.player.x = 17; state.player.y = 1;
  model.consumeCell(state);
  const after = model.actorPosition(ghost);
  assert.equal(ghost.dirX, -1);
  assert.ok(Math.abs(ghost.dirY) < 0.001);
  assert.ok(Math.abs(before.x - after.x) < 0.001);
  assert.ok(Math.abs(before.y - after.y) < 0.001);
});

test('player gets the arcade frightened-speed boost through level four', () => {
  const first = model.create();
  first.ghosts.forEach(ghost => { ghost.releaseTimer = 100; });
  first.frightenedTimer = 5;
  model.tick(first, { direction: model.directions.find(dir => dir.key === 'down') }, 0.05);
  assert.ok(Math.abs(first.player.progress - C.playerSpeed * (90 / 80) * 0.05) < 0.001);

  const later = model.create();
  later.level = 5;
  later.ghosts.forEach(ghost => { ghost.releaseTimer = 100; });
  later.frightenedTimer = 5;
  model.tick(later, { direction: model.directions.find(dir => dir.key === 'down') }, 0.05);
  assert.equal(later.player.progress, C.playerSpeed * 0.05);
});

test('ghost routing chooses a legal path through the maze toward a target', () => {
  const state = model.create();
  const ghost = state.ghosts[0];
  const direction = model.routeDirection(state.maze, ghost, { x: 1, y: 1 }, { x: -ghost.dirX, y: -ghost.dirY });
  assert.ok(direction);
  assert.ok(model.canMove(state.maze, ghost.x, ghost.y, direction, 'ghost'));
});

test('ghosts switch between scatter and chase on the arcade level-one schedule, pausing the mode timer while frightened', () => {
  const state = model.create();
  state.ghosts.forEach(ghost => { ghost.releaseTimer = 100; });
  assert.equal(state.ghostMode, 'scatter');
  assert.equal(state.ghostModeTimer, 7);
  for (let i = 0; i < 150; i++) model.tick(state, {}, 0.05);
  assert.equal(state.ghostMode, 'chase');
  assert.equal(state.ghostModeIndex, 1);
  assert.ok(Math.abs(state.ghostModeTimer - 19.55) < 0.01);
  state.frightenedTimer = 2;
  const pausedTimer = state.ghostModeTimer;
  for (let i = 0; i < 10; i++) model.tick(state, {}, 0.05);
  assert.equal(state.ghostModeTimer, pausedTimer);
  assert.equal(state.ghostMode, 'chase');
});

test('collisions cost one life, terminal loss waits for an explicit retry, and retry retains the record', () => {
  const state = model.create({ bestScore: 500, bestLevel: 3 });
  const ghost = state.ghosts[0];
  assert.equal(model.collide(state, ghost), 'hit');
  assert.equal(state.lives, 2);
  assert.ok(state.hitTimer > 0);
  state.hitTimer = 0; state.lives = 1;
  assert.equal(model.collide(state, ghost), 'hit');
  assert.equal(state.phase, 'over');
  assert.equal(state.lives, 0);
  assert.equal(model.restart(state), state);
  assert.equal(state.phase, 'playing');
  assert.equal(state.score, 0);
  assert.equal(state.lives, 3);
  assert.equal(state.bestScore, 500);
  assert.equal(state.bestLevel, 3);
});

test('clearing the maze advances to the next level and refills dots', () => {
  const state = model.create();
  state.score = 530;
  state.lives = 2;
  state.maze[2][1] = 2;
  state.pelletsLeft = 1;
  state.player.dirX = 0; state.player.dirY = 1;
  for (let i = 0; i < 20 && state.phase === 'playing'; i++) model.tick(state, {}, 0.05);
  assert.equal(state.phase, 'level-clear');
  assert.equal(state.lastEvent.type, 'level-clear');
  for (let i = 0; i < 24; i++) model.tick(state, {}, 0.05);
  assert.equal(state.level, 2);
  assert.equal(state.phase, 'playing');
  assert.equal(state.pelletsLeft, state.maze.flat().filter(tile => tile === 2 || tile === 3).length);
  assert.equal(state.pelletsLeft, 183);
  assert.equal(state.score, 540);
  assert.equal(state.lives, 2);
  assert.deepEqual(Array.from(state.ghosts, ghost => [ghost.x, ghost.y]), [[9, 9], [7, 9], [11, 9], [9, 7]]);
  assert.ok(state.ghosts.every(ghost => ghost.speed === model.ghostSpeed(2)));
  assert.equal(state.bestLevel, 2);
});

test('ghost and player pace are bounded for later levels', () => {
  assert.equal(model.ghostSpeed(1), 48);
  assert.equal(model.ghostSpeed(2), 50);
  assert.ok(model.ghostSpeed(3) > model.ghostSpeed(1));
  assert.equal(model.ghostSpeed(25), 90);
  assert.equal(model.ghostSpeed(40), 90);
  assert.equal(C.tile * C.cols / (C.tile * C.rows), 19 / 20);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/pipe-route-model.js');

const VECTORS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function wantedPorts(path, index) {
  const ports = [];
  if (index === 0) ports.push(M.DIRECTION.west);
  else {
    const [x, y] = path[index], [px, py] = path[index - 1];
    const direction = VECTORS.findIndex(([dx, dy]) => px + dx === x && py + dy === y);
    ports.push((direction + 2) % 4);
  }
  if (index === path.length - 1) ports.push(M.DIRECTION.east);
  else {
    const [x, y] = path[index], [nx, ny] = path[index + 1];
    ports.push(VECTORS.findIndex(([dx, dy]) => x + dx === nx && y + dy === ny));
  }
  return ports.sort((a, b) => a - b);
}

function orientWitness(model, level) {
  for (const [x, y] of M.PATHS[level]) {
    const id = `${x},${y}`, wanted = wantedPorts(M.PATHS[level], M.PATHS[level].findIndex(([px, py]) => px === x && py === y));
    for (let turn = 0; turn < 4 && model.view().status === 'playing'; turn++) {
      const pipe = model.view().pipes.find(item => item.id === id);
      if (pipe.ports.every((port, index) => wanted[index] === port)) break;
      model.rotate(id, 1);
    }
  }
}

test('three deterministic, distinct 5×5 grids start scrambled and contain exactly 25 rotatable pieces', () => {
  const first = M.create({ seed: 123 }).view(), same = M.create({ seed: 123 }).view(), other = M.create({ seed: 456 }).view();
  assert.equal(first.pipes.length, 25);
  assert.equal(new Set(first.pipes.map(pipe => pipe.id)).size, 25);
  assert.equal(first.flow, 'leak');
  assert.deepEqual(first.pipes, same.pipes);
  assert.notDeepEqual(first.pipes.map(pipe => pipe.rotation), other.pipes.map(pipe => pipe.rotation));
  assert.deepEqual(M.PATHS.map(path => path.length), [7, 9, 9]);
  assert.deepEqual(M.TIME_LIMITS, [60000, 55000, 50000]);
});

test('each authored route carries water all the way from the inlet to the outlet', () => {
  const model = M.create({ seed: 41 });
  for (let level = 0; level < M.PATHS.length; level++) {
    orientWitness(model, level);
    const view = model.view();
    assert.equal(view.status, 'won', `stage ${level + 1}`);
    assert.equal(view.flow, 'connected');
    assert.deepEqual(view.wet, M.PATHS[level].map(([x, y]) => `${x},${y}`));
    if (level < M.PATHS.length - 1) assert.equal(model.nextLevel(), true);
  }
  assert.equal(model.nextLevel(), false);
  assert.equal(model.view().level, 2);
});

test('clockwise and counterclockwise rotation, undo, and invalid actions preserve the board', () => {
  const model = M.create({ seed: 18 }), initial = model.view(), tile = initial.pipes.find(pipe => pipe.type === 'elbow');
  assert.equal(model.rotate('missing').accepted, false);
  const first = model.view().pipes.find(pipe => pipe.id === tile.id);
  const clockwise = model.rotate(tile.id, 1);
  assert.equal(clockwise.accepted, true);
  assert.equal(model.view().moves, 1);
  assert.notDeepEqual(model.view().pipes.find(pipe => pipe.id === tile.id).ports, first.ports);
  assert.equal(model.undo(), true);
  assert.deepEqual(model.view().pipes.find(pipe => pipe.id === tile.id).ports, first.ports);
  assert.equal(model.view().moves, 0);
  assert.equal(model.rotate(tile.id, -1).accepted, true);
  assert.equal(model.view().moves, 1);
  const frozen = model.view();
  assert.equal(model.rotate(tile.id, 2).accepted, false);
  assert.deepEqual(model.view(), frozen);
});

test('pause freezes pressure; expiry loses cleanly and replay resets a deterministic board', () => {
  const model = M.create({ seed: 7 }), firstBoard = model.view().pipes;
  assert.equal(model.advance(5000), true);
  assert.equal(model.view().timeLeft, 55000);
  assert.equal(model.pause(), true);
  const paused = model.view();
  assert.equal(model.advance(5000), false);
  assert.deepEqual(model.view(), paused);
  assert.equal(model.resume(), true);
  assert.equal(model.advance(55000), true);
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().timeLeft, 0);
  assert.equal(model.rotate('0,0').accepted, false);
  assert.equal(model.restart(), true);
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().timeLeft, 60000);
  assert.deepEqual(model.view().pipes, firstBoard);
  model.newGame(999);
  assert.equal(model.view().level, 0);
  assert.notDeepEqual(model.view().pipes.map(pipe => pipe.rotation), firstBoard.map(pipe => pipe.rotation));
});

test('terminal actions are guarded and both open ends must connect reciprocally', () => {
  const result = M.traceFlow([
    { id: '0,2', x: 0, y: 2, type: 'straight', rotation: 1 },
    { id: '1,2', x: 1, y: 2, type: 'straight', rotation: 0 },
    { id: '2,2', x: 2, y: 2, type: 'straight', rotation: 0 }
  ]);
  assert.equal(result.connected, false);
  assert.equal(result.mode, 'leak');
  assert.equal(result.wet[0], '0,2');
});

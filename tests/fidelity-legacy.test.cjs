const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { harness, assertStopped, drawing, ROOT } = require('./helpers/game-harness.cjs');

const gameIds = [
  'dr-mario-diet-khuan',
  'thap-ha-noi-tower',
  'peggle-pachinko',
  'chuzzle'
];

function loadPack() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/fidelity-legacy.js'), 'utf8'), h.context, {
    filename: 'scripts/fidelity-legacy.js'
  });
  return h;
}

function newModelState(model, options) {
  return model.createState(options);
}

function emptyDrState(model) {
  const state = newModelState(model, { virusCount: 0 });
  state.grid = Array.from({ length: 16 }, () => Array(8).fill(null));
  state.viruses = 0;
  state.phase = 'playing';
  return state;
}

test('Dr. Mario matches four same-color cells, leaves three alone, and keeps viruses fixed', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('dr-mario-diet-khuan').model;
  const state = emptyDrState(model);
  state.grid[12][0] = { color: 'red', type: 'capsule' };
  state.grid[12][1] = { color: 'red', type: 'capsule' };
  state.grid[12][2] = { color: 'red', type: 'virus' };
  model.resolve(state);
  assert.ok(state.grid[12].slice(0, 3).every(Boolean), 'a run of three must remain');
  state.grid[12][3] = { color: 'red', type: 'capsule' };
  model.resolve(state);
  assert.ok(state.grid[12].slice(0, 4).every(cell => cell === null), 'four aligned cells clear');
  assert.equal(state.viruses, 0, 'the virus counter tracks cleared viruses');

  const anchored = emptyDrState(model);
  anchored.grid[14][2] = { color: 'blue', type: 'virus' };
  anchored.grid[10][2] = { color: 'yellow', type: 'capsule' };
  model.settle(anchored);
  assert.equal(anchored.grid[14][2].type, 'virus', 'viruses never fall');
  assert.equal(anchored.grid[13][2].type, 'capsule', 'capsules settle above viruses');

  const fallingPair = emptyDrState(model);
  fallingPair.grid[12][2] = { color: 'red', type: 'capsule', pairId: 'falling-horizontal', half: 0 };
  fallingPair.grid[12][3] = { color: 'blue', type: 'capsule', pairId: 'falling-horizontal', half: 1 };
  model.settle(fallingPair);
  assert.equal(fallingPair.grid[15][2].pairId, 'falling-horizontal', 'unsupported horizontal pairs fall');
  assert.equal(fallingPair.grid[15][3].pairId, 'falling-horizontal', 'both horizontal halves stay linked');

  const linked = emptyDrState(model);
  linked.grid[15][3] = { color: 'red', type: 'virus' };
  linked.grid[15][4] = { color: 'blue', type: 'virus' };
  linked.grid[14][3] = { color: 'red', type: 'capsule', pairId: 'supported-pair', half: 0 };
  linked.grid[14][4] = { color: 'blue', type: 'capsule', pairId: 'supported-pair', half: 1 };
  model.settle(linked);
  assert.equal(linked.grid[14][3].pairId, 'supported-pair', 'intact halves remain linked while supported');
  assert.equal(linked.grid[14][4].pairId, 'supported-pair');
});

test('Dr. Mario splits a linked capsule and applies gravity to the remaining half', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('dr-mario-diet-khuan').model;
  const state = emptyDrState(model);
  state.grid[12][0] = { color: 'red', type: 'capsule' };
  state.grid[12][1] = { color: 'red', type: 'capsule' };
  state.grid[12][2] = { color: 'red', type: 'capsule' };
  state.grid[12][3] = { color: 'red', type: 'virus' };
  state.grid[12][4] = { color: 'blue', type: 'capsule', pairId: 'pair-a', half: 0 };
  state.grid[12][3] = { color: 'red', type: 'capsule', pairId: 'pair-a', half: 1 };
  model.resolve(state);
  assert.equal(state.grid[15][4].color, 'blue', 'detached half falls independently to the floor');
  assert.equal(state.grid[15][4].pairId, null, 'detached half no longer links to a partner');
});

test('Dr. Mario reaches a clear win and loses when a new capsule cannot spawn', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('dr-mario-diet-khuan').model;
  const won = emptyDrState(model);
  won.everHadViruses = true;
  won.grid[15][0] = { color: 'blue', type: 'virus' };
  won.viruses = 1;
  for (let x = 1; x < 4; x++) won.grid[15][x] = { color: 'blue', type: 'capsule' };
  model.resolve(won);
  assert.equal(won.phase, 'won');

  const blocked = newModelState(model, { virusCount: 0 });
  blocked.current = null;
  blocked.grid[0][3] = { color: 'red', type: 'capsule' };
  blocked.grid[0][4] = { color: 'blue', type: 'capsule' };
  model.spawn(blocked);
  assert.equal(blocked.phase, 'lost');
});

test('Hanoi validates top-disk moves, undo/reset, and complete shortest solutions for 3–7 disks', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('thap-ha-noi-tower').model;
  for (let diskCount = 3; diskCount <= 7; diskCount++) {
    const state = newModelState(model, { diskCount });
    assert.equal(state.diskCount, diskCount);
    assert.equal(state.minimumMoves, 2 ** diskCount - 1);
    assert.equal(model.move(state, 0, 2), true);
    assert.equal(model.move(state, 0, 2), false, 'larger disk cannot land on smaller disk');
    assert.equal(model.undo(state), true);
    assert.equal(state.moves, 0);
    model.reset(state);
    const sequence = [];
    const solve = (count, from, to, spare) => {
      if (count === 0) return;
      solve(count - 1, from, spare, to);
      sequence.push([from, to]);
      solve(count - 1, spare, to, from);
    };
    solve(diskCount, 0, 2, 1);
    for (const [from, to] of sequence) assert.equal(model.move(state, from, to), true);
    assert.equal(state.phase, 'won', `${diskCount}-disk tower can be completed`);
    assert.equal(state.moves, state.minimumMoves);
    assert.equal(model.move(state, 2, 0), false, 'terminal board rejects more moves');
    assert.equal(model.undo(state), true, 'undo can reopen the winning move');
    assert.equal(state.phase, 'playing');
    assert.equal(state.moves, state.minimumMoves - 1);
  }
});

test('Peggle tracks orange targets, removes hit pegs once, and awards a bucket ball', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('peggle-pachinko').model;
  const state = newModelState(model);
  const orange = { id: 'orange-1', x: 120, y: 120, radius: 12, type: 'orange', active: true };
  const blue = { id: 'blue-1', x: 220, y: 120, radius: 12, type: 'blue', active: true };
  state.pegs = [orange, blue];
  state.remainingOranges = 1;
  state.remainingBalls = 10;
  state.ball = { x: 120, y: 120, vx: 0, vy: 0, hitIds: [] };
  model.step(state, 0.016);
  assert.equal(orange.active, false, 'orange is a goal target');
  assert.equal(state.remainingOranges, 0);
  assert.equal(state.score, 100, 'orange targets score once on their first hit per shot');
  state.ball.y = 120;
  model.step(state, 0.016);
  assert.equal(state.score, 100);
  assert.equal(state.phase, 'won');

  const bucket = newModelState(model);
  bucket.pegs = [];
  bucket.remainingOranges = 1;
  bucket.remainingBalls = 4;
  bucket.ball = { x: bucket.bucket.x, y: bucket.height - 10, vx: 0, vy: 20, hitIds: [] };
  model.step(bucket, 0.016);
  assert.equal(bucket.remainingBalls, 5, 'bucket catch refunds one ball');
  assert.equal(bucket.ball, null);
});

test('Peggle uses ten balls, prevents mid-flight shots, and loses only after balls run out', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('peggle-pachinko').model;
  const state = newModelState(model);
  assert.equal(state.remainingBalls, 10);
  assert.equal(model.shoot(state), true);
  assert.equal(model.shoot(state), false, 'a second ball cannot launch during flight');
  state.ball = { x: -20, y: state.height + 30, vx: 0, vy: 0, hitIds: [] };
  state.remainingOranges = 1;
  state.remainingBalls = 0;
  model.step(state, 0.016);
  assert.equal(state.phase, 'lost');
});

test('Peggle green pegs create a visible predicted path that is consumed by the following shot', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('peggle-pachinko').model;
  const state = newModelState(model);
  const green = { id: 'green-1', x: 120, y: 120, radius: 12, type: 'green', active: true };
  state.pegs = [green];
  state.remainingOranges = 1;
  state.ball = { x: 120, y: 120, vx: 0, vy: 0, hitIds: [] };
  model.step(state, 0.016);
  assert.equal(green.active, false);
  assert.equal(state.guideNextShot, true);
  state.ball = null;
  const preview = model.guidePath(state);
  assert.ok(preview.length > 10, 'green reward supplies a trajectory preview');
  assert.equal(preview[0].x, state.width / 2);
  assert.equal(preview[0].y, 60);
  assert.equal(model.shoot(state), true);
  assert.equal(state.usedGuide, true);
  assert.equal(state.guideNextShot, false);
  assert.equal(model.guidePath(state).length, 0, 'the preview is consumed when its shot begins');
});

test('Peggle UI draws the green-peg guide and uses it for the following touch-button shot', () => {
  const h = loadPack();
  const definition = h.context.NP_Fidelity.get('peggle-pachinko');
  const model = definition.model;
  let angleForGreen = null;
  for (let angle = 0.18; angle < Math.PI - 0.18 && angleForGreen === null; angle += 0.08) {
    const simulation = model.createState();
    model.aim(simulation, angle);
    model.shoot(simulation);
    for (let frame = 0; frame < 600 && simulation.ball; frame++) {
      model.step(simulation, 0.016);
    }
    if (!simulation.ball && simulation.guideNextShot && simulation.phase === 'playing' && simulation.remainingOranges > 0) {
      angleForGreen = angle;
    }
  }
  assert.notEqual(angleForGreen, null, 'the initial board has a reachable green peg');

  let visibleGuideDrawn = false;
  drawing.setLineDash = pattern => {
    if (pattern?.[0] === 6 && pattern?.[1] === 7) visibleGuideDrawn = true;
  };
  try {
    h.context.NP_Fidelity.launch(h.container, { id: 'peggle-pachinko', title: definition.title });
    const canvas = h.container.querySelector('canvas');
    const controls = h.container.querySelector('.np-fidelity-controls');
    const status = h.container.querySelector('.np-fidelity-status');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.width, height: canvas.height });
    const aimX = 320 + Math.cos(angleForGreen) * 120;
    const aimY = 60 + Math.sin(angleForGreen) * 120;
    canvas.dispatch('pointerdown', { clientX: aimX, clientY: aimY });
    controls.children[0].dispatch('click');
    for (let frame = 0; frame < 600 && !visibleGuideDrawn; frame++) h.frame(16);
    assert.equal(visibleGuideDrawn, true, 'the actual canvas renderer draws the trajectory preview');
    assert.match(status.textContent, /Chốt xanh mở đường ngắm lượt tới/);
    controls.children[0].dispatch('click');
    assert.match(status.textContent, /đường ngắm gợi ý được bật/);
    h.context.NP_GameSession.getCurrent().stop();
  } finally {
    h.context.NP_GameSession.getCurrent()?.stop();
    delete drawing.setLineDash;
  }
});

test('Chuzzle shifts whole cyclic rows and columns, rejects invalid moves, and pops groups with gravity', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('chuzzle').model;
  const state = newModelState(model, { seed: 7, locks: false });
  const before = state.board.map(row => row.map(cell => cell.color));
  const shifted = model.shift(state, 'row', 2, 1);
  assert.equal(shifted.valid, false, 'a move without a match restores the board');
  assert.deepEqual(state.board.map(row => row.map(cell => cell.color)), before);

  state.board[0] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'].map(color => ({ color, locked: false }));
  state.board[1] = ['blue', 'green', 'yellow', 'purple', 'orange', 'red'].map(color => ({ color, locked: false }));
  state.board[2] = ['green', 'yellow', 'purple', 'orange', 'red', 'blue'].map(color => ({ color, locked: false }));
  state.board[3] = ['yellow', 'purple', 'orange', 'red', 'blue', 'green'].map(color => ({ color, locked: false }));
  state.board[4] = ['purple', 'orange', 'red', 'blue', 'green', 'yellow'].map(color => ({ color, locked: false }));
  state.board[5] = ['orange', 'red', 'blue', 'green', 'yellow', 'purple'].map(color => ({ color, locked: false }));
  state.board[0][0].color = 'red';
  state.board[1][0].color = 'green';
  state.board[2][0].color = 'blue';
  state.board[3][0].color = 'yellow';
  state.board[4][0].color = 'purple';
  state.board[5][0].color = 'orange';
  state.board[5][1].color = 'red';
  state.board[5][2].color = 'red';
  const result = model.shift(state, 'row', 5, 1);
  assert.equal(result.valid, true);
  assert.ok(result.popped >= 3, 'three touching fuzzballs pop');
  assert.equal(state.popped >= 3, true);
  assert.equal(state.level, 1);
});

test('Chuzzle locked lines stay fixed, matching a lock frees it, and new boards start without matches', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('chuzzle').model;
  const state = newModelState(model, { seed: 11, locks: false });
  assert.equal(model.findMatches(state).length, 0);
  const lockState = newModelState(model, { seed: 4, locks: false });
  lockState.board[0][0].locked = true;
  const before = JSON.stringify(lockState.board);
  assert.equal(model.shift(lockState, 'row', 0, 1).valid, false);
  assert.equal(JSON.stringify(lockState.board), before);
  lockState.board[0][0].color = 'red';
  lockState.board[0][1].color = 'red';
  lockState.board[0][2].color = 'red';
  const result = model.resolve(lockState);
  assert.ok(result.popped >= 3);
  assert.ok(lockState.board.flat().every(cell => !cell.locked), 'matching a locked creature removes its lock');
});

test('Chuzzle treats horizontal/vertical contact as a match and keeps diagonal-only groups separate', () => {
  const { context } = loadPack();
  const model = context.NP_Fidelity.get('chuzzle').model;
  const state = newModelState(model, { seed: 21, locks: false });
  state.board = Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 6 }, (_, column) => ({
      color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'][(row + column) % 6],
      locked: false
    })));
  state.board[0][0].color = 'red';
  state.board[0][1].color = 'red';
  state.board[1][1].color = 'red';
  assert.equal(model.findMatches(state).some(group => group.length === 3), true, 'the original L-shaped group uses orthogonal contacts');
  state.board[0][0].color = 'coral';
  state.board[0][1].color = 'blue';
  state.board[1][1].color = 'mint';
  state.board[2][2].color = 'red';
  assert.equal(model.findMatches(state).length, 0, 'diagonal contact alone is not connected');
});

test('all four exact-ID overrides expose their actual models, visible actions, and clean session lifecycles', () => {
  const h = loadPack();
  for (const id of gameIds) {
    const definition = h.context.NP_Fidelity.get(id);
    assert.ok(definition, `${id} registered`);
    assert.equal(definition.newGame, false);
    assert.ok(definition.model && typeof definition.model.createState === 'function');
    const game = { id, title: definition.title };
    h.context.NP_Fidelity.launch(h.container, game);
    h.frame(16);
    const controls = h.container.querySelector('.np-fidelity-controls');
    assert.ok(controls.children.length >= 3, `${id} has visible controls`);
    const canvas = h.container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.width, height: canvas.height });
    const status = h.container.querySelector('.np-fidelity-status');
    if (id === 'dr-mario-diet-khuan') {
      controls.children[1].dispatch('click');
      assert.match(status.textContent, /Viên nang đã sang phải/);
      canvas.dispatch('keydown', { key: 'x' });
      assert.match(status.textContent, /xoay viên nang/i);
    } else if (id === 'thap-ha-noi-tower') {
      const selectPeg = (x, y = 200) => canvas.dispatch('pointerdown', { clientX: x, clientY: y });
      for (let diskCount = 3; diskCount <= 7; diskCount++) {
        controls.children[diskCount - 3].dispatch('click');
        assert.match(status.textContent, new RegExp(`tháp ${diskCount} đĩa`));
        selectPeg(140);
        assert.match(status.textContent, /Cọc 1 được chọn/);
        selectPeg(500);
        assert.match(status.textContent, /Đã chuyển đĩa 1/);
        controls.children[6].dispatch('click');
        assert.match(status.textContent, new RegExp(`tháp ${diskCount} đĩa`));
        assert.match(status.textContent, /được làm mới|bắt đầu/i);
      }
      selectPeg(140);
      selectPeg(500);
      assert.match(status.textContent, /Đã chuyển đĩa 1/);
    } else if (id === 'peggle-pachinko') {
      controls.children[0].dispatch('click');
      assert.match(status.textContent, /Bóng đang bay/);
      controls.children[0].dispatch('click');
      assert.match(status.textContent, /Bóng đang bay/);
    } else if (id === 'chuzzle') {
      canvas.dispatch('pointerdown', { clientX: 115 + 2 * 68 + 34, clientY: 72 + 2 * 68 + 34 });
      assert.match(status.textContent, /hàng 3, cột 3/i);
      controls.children[0].dispatch('click');
      assert.ok(status.textContent.length > 0, 'strip-shift button reports the actual move result');
    }
    const session = h.context.NP_GameSession.getCurrent();
    const root = h.container.children[0];
    root.parentNode = h.container;
    session.pause();
    assert.equal(session.isPaused(), true);
    session.resume();
    assert.equal(session.isPaused(), false);
    session.stop();
    assert.equal(h.frames.size, 0, `${id} releases its frame loop`);
    assert.equal(h.container.children.length, 0, `${id} removes its stage`);
  }
  assert.deepEqual([...h.context.NP_Fidelity.entries()].map(entry => entry.id).sort(), [...gameIds].sort());
  assert.deepEqual(h.errors, []);
});

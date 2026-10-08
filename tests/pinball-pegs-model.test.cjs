const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/pinball-pegs-model.js');

function settle(model, seconds = 3) {
  for (let i = 0; i < Math.ceil(seconds * 60) && model.view().projectile; i++) model.tick(1 / 60);
  return model.view();
}

function greedyClearWitness(stageIndex) {
  const stage = M.STAGES[stageIndex];
  const model = M.createStage(stageIndex);
  let shots = 0;
  const settleShot = candidate => {
    for (let i = 0; i < 600 && candidate.view().projectile; i++) candidate.tick(1 / 120);
    return candidate.view();
  };
  while (model.view().status === 'playing' && shots < stage.balls + 4) {
    const before = model.view();
    let best = null;
    for (let angle = -68; angle <= 68; angle += 0.5) {
      const candidate = M.create({ pegs: before.pegs, balls: 1, bucketX: before.bucketX,
        bucketDirection: before.bucketDirection, bucketSpeed: stage.bucketSpeed });
      candidate.fire(angle);
      const after = settleShot(candidate);
      const value = [before.orangeLeft - after.orangeLeft, after.score, after.ballsLeft > 1 ? 1 : 0];
      if (!best || value[0] > best.value[0]
        || (value[0] === best.value[0] && value[1] > best.value[1])
        || (value[0] === best.value[0] && value[1] === best.value[1] && value[2] > best.value[2])) {
        best = { angle, value };
      }
    }
    if (!best || (best.value[0] === 0 && best.value[1] === 0)) break;
    assert.equal(model.fire(best.angle), true);
    settleShot(model); shots++;
  }
  return { ...model.view(), shots };
}

test('the five authored stages vary shape, target count, bucket pace and ball budget', () => {
  assert.equal(M.STAGES.length, 5);
  const boards = M.STAGES.map((_, index) => M.stagePegs(index));
  const targets = boards.map(board => board.filter(peg => peg.color === 'orange').length);
  assert.deepEqual(targets, [16, 16, 15, 20, 27]);
  assert.deepEqual(M.STAGES.map(stage => stage.balls), [10, 10, 9, 9, 8]);
  assert.deepEqual(M.STAGES.map(stage => stage.bucketSpeed), [82, 108, 132, 160, 184]);
  assert.equal(new Set(boards.map(board => board.map(peg => `${peg.x},${peg.y},${peg.color}`).join('|'))).size, 5);
  for (let index = 0; index < M.STAGES.length; index++) {
    const stage = M.createStage(index).view();
    assert.equal(stage.orangeLeft, targets[index]);
    assert.equal(stage.ballsLeft, M.STAGES[index].balls);
  }
  assert.throws(() => M.createStage(-1), /Stage index is invalid/);
});

test('an angle-search witness clears every authored stage within its starting ball budget', () => {
  const results = M.STAGES.map((_, index) => greedyClearWitness(index));
  for (let index = 0; index < results.length; index++) {
    assert.equal(results[index].status, 'won', `${M.STAGES[index].name} clears`);
    assert.equal(results[index].orangeLeft, 0);
    assert.ok(results[index].shots <= M.STAGES[index].balls, `${M.STAGES[index].name} uses ${results[index].shots}/${M.STAGES[index].balls} shots`);
  }
});

test('seeded board repeats and starts with 25 orange targets and ten balls', () => {
  const a = M.create({ seed: 'bật-chốt' }).view();
  const b = M.create({ seed: 'bật-chốt' }).view();
  const c = M.create({ seed: 'khác' }).view();
  assert.deepEqual(a.pegs, b.pegs);
  assert.notDeepEqual(a.pegs, c.pegs);
  assert.equal(a.pegs.length, 54);
  assert.equal(a.orangeLeft, 25);
  assert.equal(a.ballsLeft, 10);
});

test('aim clamps, accepts one shot at a time, and exhausted balls cannot relaunch', () => {
  const m = M.create({ seed: 1, pegs: [{ x: 35, y: 150, color: 'orange' }], balls: 1, bucketX: 35, bucketSpeed: 0 });
  assert.equal(m.setAim(500), true);
  assert.equal(m.view().aim, M.ANGLE_LIMIT);
  assert.equal(m.fire(), true);
  assert.equal(m.view().ballsLeft, 0);
  assert.equal(m.fire(), false);
  assert.equal(m.setAim(0), false);
});

test('wall reflection changes horizontal velocity while keeping the ball within bounds', () => {
  const m = M.create({ seed: 2, pegs: [{ x: 40, y: 100, color: 'orange' }], bucketX: 40, bucketSpeed: 0 });
  m.fire(65);
  m.tick(0.55);
  m.tick(0.55);
  const ball = m.view().projectile;
  assert.ok(ball, 'shot remains above the catcher after one reflection');
  assert.ok(ball.x < M.WIDTH - M.BALL_RADIUS);
  assert.ok(ball.vx < 0, 'right-wall collision reverses the ball');
});

test('orange targets and blue scoring pegs have separate values and are removed on contact', () => {
  const m = M.create({ seed: 3, pegs: [
    { id: 'blue', x: 210, y: 150, color: 'blue' }, { id: 'orange', x: 32, y: 150, color: 'orange' }
  ], balls: 1, bucketX: 210, bucketSpeed: 0 });
  m.fire(0);
  const v = settle(m, 4);
  assert.equal(v.score, 10);
  assert.equal(v.orangeLeft, 1);
  assert.equal(v.ballsLeft, 1, 'a bucket catch returns the spent ball');
  assert.equal(v.status, 'playing');
  assert.equal(v.pegs.some(peg => peg.id === 'blue'), false);
});

test('a hit peg stays visibly lit without scoring twice, then clears when the shot settles', () => {
  const m = M.create({ seed: 3, pegs: [{ id: 'orange', x: 210, y: 160, color: 'orange' }], balls: 1, bucketX: 210, bucketSpeed: 0 });
  m.fire(0);
  for (let i = 0; i < 120 && !m.view().score; i++) m.tick(1 / 120);
  let v = m.view();
  assert.equal(v.score, 100);
  assert.equal(v.orangeLeft, 1, 'the orange peg remains visible until the shot settles');
  assert.equal(v.pegs[0].hit, true);
  settle(m, 4);
  v = m.view();
  assert.equal(v.orangeLeft, 0);
  assert.equal(v.pegs.length, 0);
  assert.equal(v.score, 100, 'one peg cannot score more than once per shot');
  assert.equal(v.status, 'won');
});

test('clearing the final orange target ends in a win after the active shot settles', () => {
  const m = M.create({ seed: 4, pegs: [{ x: 210, y: 160, color: 'orange' }], balls: 1, bucketX: 210, bucketSpeed: 0 });
  m.fire(0);
  const v = settle(m, 4);
  assert.equal(v.orangeLeft, 0);
  assert.equal(v.score, 100);
  assert.equal(v.status, 'won');
  assert.equal(m.fire(0), false);
});

test('missing the bucket spends the shot, and the final miss loses while targets remain', () => {
  const m = M.create({ seed: 5, pegs: [{ x: 34, y: 130, color: 'orange' }], balls: 1, bucketX: 34, bucketSpeed: 0 });
  m.fire(0);
  const v = settle(m, 2);
  assert.equal(v.status, 'lost');
  assert.equal(v.orangeLeft, 1);
  assert.equal(v.ballsLeft, 0);
  assert.equal(v.lastEvent, 'loss');
});

test('a long trapped shot ends after the bounded flight window instead of hanging the round', () => {
  const m = M.createStage(0);
  assert.equal(m.fire(0), true);
  for (let i = 0; i <= M.SHOT_MAX_SECONDS * 120 && m.view().projectile; i++) m.tick(1 / 120);
  const v = m.view();
  assert.equal(v.projectile, null);
  assert.equal(v.lastEvent, 'timeout');
  assert.equal(v.ballsLeft, M.STAGES[0].balls - 1);
  assert.equal(v.status, 'playing');
});

test('equal simulated time is independent of frame chunking and restart restores the opening', () => {
  const a = M.create({ seed: 'repeatability' }), b = M.create({ seed: 'repeatability' });
  a.fire(17); b.fire(17);
  for (let i = 0; i < 60; i++) a.tick(1 / 60);
  for (let i = 0; i < 120; i++) b.tick(1 / 120);
  const x = a.view(), y = b.view();
  assert.equal(x.score, y.score);
  assert.equal(x.orangeLeft, y.orangeLeft);
  assert.equal(x.ballsLeft, y.ballsLeft);
  assert.ok(Math.abs(x.projectile.x - y.projectile.x) < 1e-7);
  const opening = M.create({ seed: 'restart' }).view();
  const m = M.create({ seed: 'restart' }); m.fire(10); m.tick(.2); m.restart();
  assert.deepEqual(m.view().pegs, opening.pegs);
  assert.equal(m.view().ballsLeft, opening.ballsLeft);
  assert.equal(m.view().projectile, null);
});

test('invalid peg layouts, aim and elapsed-time inputs are rejected safely', () => {
  assert.throws(() => M.create({ pegs: [{ x: -1, y: 100, color: 'orange' }] }), /layout is invalid/);
  const m = M.create({ seed: 6 });
  const before = m.view();
  assert.equal(m.setAim(Number.NaN), false);
  assert.equal(m.fire(Number.NaN), false);
  assert.equal(m.tick(-1), false);
  assert.deepEqual(m.view(), before);
});

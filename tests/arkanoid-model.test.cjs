const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../candidates/arkanoid-dap-gach/model.js');

function playingState(change) {
  const state = M.initialState();
  state.status = 'playing'; state.ball.vx = 0; state.ball.vy = 300;
  change?.(state);
  return state;
}

test('round fields are deterministic and distinguish color, silver, and indestructible gold walls', () => {
  assert.deepEqual(M.roundBricks(2), M.roundBricks(2));
  assert.notDeepEqual(M.roundBricks(1), M.roundBricks(2));
  assert.ok(M.roundBricks(2).some(brick => brick.type === 'color' && brick.row === 7 && brick.points === 120));
  for (const round of [1, 2, 3]) {
    const field = M.roundBricks(round);
    assert.equal(field.filter(brick => brick.carriesExpand).length, 1);
    assert.ok(field.some(brick => brick.type === 'color' && brick.carriesExpand));
    assert.ok(field.some(brick => brick.type === 'silver' && brick.hits === 2));
    assert.ok(field.some(brick => brick.type === 'gold' && brick.hits === null));
    assert.ok(field.filter(brick => brick.type !== 'gold').every(brick => brick.points > 0));
  }
  assert.equal(M.roundBricks(2).find(brick => brick.type === 'color' && brick.row === 0).points, 50);
  assert.equal(M.create().view().lives, 3);
  assert.equal(M.create().view().status, 'ready');
});

test('three authored silhouettes create distinct routes and move the expansion capsule lane', () => {
  const fields = [1, 2, 3].map(round => M.roundBricks(round));
  const signatures = fields.map(field => field.map(brick => brick.id).sort((a, b) => a - b));
  assert.notDeepEqual(signatures[0], signatures[1]);
  assert.notDeepEqual(signatures[1], signatures[2]);
  assert.notDeepEqual(signatures[0], signatures[2]);
  assert.deepEqual(fields.map(field => field.filter(brick => brick.type === 'gold').length), [2, 2, 2]);
  assert.deepEqual(fields.map(field => {
    const carrier = field.find(brick => brick.carriesExpand);
    return [carrier.row, carrier.col];
  }), [[3, 2], [6, 3], [5, 5]]);
  assert.deepEqual([1, 2, 3].map(round => M.roundTheme(round).name), ['Vành mở', 'Giằng so le', 'Lõi đôi']);
  assert.equal(M.MAX_ROUNDS, 3);
  const speeds = [1, 2, 3].map(round => {
    const state = M.initialState(); state.round = round;
    const model = M.makeModel(state); model.launch();
    return Math.round(Math.hypot(model.view().ball.vx, model.view().ball.vy));
  });
  assert.deepEqual(speeds, [310, 324, 338]);
  assert.ok(speeds.every(speed => speed < M.MAX_SPEED));
});

test('launch is normalized, fixed-step deterministic, and rejects a second launch', () => {
  const a = M.create(), b = M.create();
  assert.equal(a.launch(), true); assert.equal(a.launch(), false);
  b.launch(); a.drain(); b.drain();
  assert.ok(Math.abs(Math.hypot(a.view().ball.vx, a.view().ball.vy) - M.START_SPEED) < 1e-8);
  for (let i = 0; i < 12; i++) a.advance(M.STEP);
  b.advance(M.STEP * 12);
  assert.deepEqual(a.view(), b.view());
});

test('paddle steering is bounded and both wall and paddle contact reflect the ball', () => {
  const steering = M.create(); steering.setAxis(-1); steering.advance(M.STEP * 6);
  assert.ok(steering.view().paddle.x < M.WIDTH / 2);
  steering.setAxis(0); steering.setTarget(-900); steering.advance(1000);
  assert.equal(steering.view().paddle.x, M.PADDLE_WIDTH / 2);

  const wall = M.makeModel(playingState(s => { s.ball.x = M.BALL_RADIUS + 1; s.ball.y = 200; s.ball.vx = -200; s.ball.vy = 0; }));
  wall.advance(M.STEP); assert.ok(wall.view().ball.vx > 0); assert.ok(wall.view().ball.x >= M.BALL_RADIUS);

  const state = playingState(s => {
    s.ball.x = s.paddle.x + 20; s.ball.y = M.PADDLE_Y - M.BALL_RADIUS - 2; s.ball.vy = 300;
    s.bricks = s.bricks.filter(brick => brick.y < 100);
  });
  const model = M.makeModel(state), events = model.advance(M.STEP);
  assert.ok(events.some(event => event.kind === 'paddle'));
  assert.ok(model.view().ball.vy < 0); assert.ok(model.view().ball.vx > 0);
});

test('silver walls take two hits, gold walls rebound the ball, and color walls score by row', () => {
  const silver = M.roundBricks(1).find(brick => brick.type === 'silver');
  const spare = { ...M.roundBricks(1).find(brick => brick.type === 'color'), x: 10, y: 10, carriesExpand: false };
  const firstHit = M.makeModel(playingState(state => {
    state.bricks = [{ ...silver }, spare];
    state.ball.x = silver.x + silver.width / 2; state.ball.y = silver.y - M.BALL_RADIUS - 2; state.ball.vy = 300;
  }));
  const damage = firstHit.advance(M.STEP);
  assert.equal(firstHit.view().bricks.find(brick => brick.type === 'silver').hits, 1);
  assert.equal(firstHit.view().score, 0); assert.ok(damage.some(event => event.kind === 'brick-damaged'));

  const secondState = firstHit.serialize();
  secondState.ball.x = silver.x + silver.width / 2; secondState.ball.y = silver.y + silver.height + M.BALL_RADIUS + 2; secondState.ball.vy = -300;
  const secondHit = M.makeModel(secondState), broken = secondHit.advance(M.STEP);
  assert.equal(secondHit.view().bricks.some(brick => brick.type === 'silver'), false);
  assert.equal(secondHit.view().score, 50); assert.ok(broken.some(event => event.kind === 'brick' && event.type === 'silver'));

  const gold = M.roundBricks(1).find(brick => brick.type === 'gold');
  const goldState = playingState(state => {
    state.bricks = [{ ...gold }, { ...spare }];
    state.ball.x = gold.x + gold.width / 2; state.ball.y = gold.y - M.BALL_RADIUS - 2; state.ball.vy = 300;
  });
  const goldModel = M.makeModel(goldState), blocked = goldModel.advance(M.STEP);
  assert.equal(goldModel.view().bricks[0].type, 'gold'); assert.ok(goldModel.view().ball.vy < 0);
  assert.ok(blocked.some(event => event.kind === 'gold-wall')); assert.equal(goldModel.view().score, 0);
});

test('a carrier wall drops one capsule; collecting it widens the paddle for eight seconds', () => {
  const carrier = M.roundBricks(1).find(brick => brick.carriesExpand);
  const spare = { ...M.roundBricks(1).find(brick => brick.type === 'color'), x: 4, y: 4, carriesExpand: false };
  const model = M.makeModel(playingState(state => {
    state.bricks = [{ ...carrier }, spare];
    state.ball.x = carrier.x + carrier.width / 2; state.ball.y = carrier.y - M.BALL_RADIUS - 2; state.ball.vy = 300;
  }));
  const dropEvents = model.advance(M.STEP);
  assert.ok(dropEvents.some(event => event.kind === 'capsule-drop'));
  assert.equal(model.view().capsule.type, 'expand');

  const collection = M.makeModel(playingState(state => {
    state.bricks = [{ ...spare }, { ...spare, id: 999, x: 80 }];
    state.ball.x = 360; state.ball.y = 220; state.ball.vy = -120;
    state.capsule = { x: 351, y: M.PADDLE_Y - 18, width: 18, height: 25, fallSpeed: 115, type: 'expand' };
  }));
  const collectEvents = collection.advance(M.STEP);
  assert.equal(collection.view().capsule, null); assert.equal(collection.view().paddle.width, M.EXPANDED_WIDTH);
  assert.equal(collection.view().score, 100); assert.ok(collectEvents.some(event => event.kind === 'capsule-collected'));

  for (let second = 0; second < 7; second++) collection.advance(1000);
  assert.equal(collection.view().paddle.width, M.EXPANDED_WIDTH);
  const ended = collection.advance(1000);
  assert.equal(collection.view().paddle.width, M.PADDLE_WIDTH);
  assert.ok(ended.some(event => event.kind === 'power-ended'));
});

test('clearing rounds preserves score and lives, then the third clear wins', () => {
  const first = M.makeModel(playingState(state => { state.bricks = []; state.score = 270; state.lives = 2; }));
  const firstEvents = first.advance(M.STEP);
  assert.equal(first.view().round, 2); assert.equal(first.view().status, 'ready');
  assert.equal(first.view().score, 270); assert.equal(first.view().lives, 2);
  assert.equal(first.view().ball.vx, 0); assert.equal(first.view().ball.vy, 0);
  assert.notDeepEqual(first.view().bricks.map(brick => brick.id).sort((a, b) => a - b), M.roundBricks(1).map(brick => brick.id).sort((a, b) => a - b));
  assert.ok(firstEvents.some(event => event.kind === 'round' && event.round === 2));

  const thirdState = first.serialize(); thirdState.round = 3; thirdState.bricks = []; thirdState.status = 'playing';
  const third = M.makeModel(thirdState), winEvents = third.advance(M.STEP);
  assert.equal(third.view().status, 'won'); assert.equal(third.view().round, 3);
  assert.ok(winEvents.some(event => event.kind === 'won'));
});

test('missing the paddle costs lives, ends at zero, and replay resets the round', () => {
  const missed = M.makeModel(playingState(state => { state.ball.y = M.HEIGHT + M.BALL_RADIUS + 1; state.ball.vy = 300; }));
  const lifeEvents = missed.advance(M.STEP);
  assert.equal(missed.view().lives, 2); assert.equal(missed.view().status, 'ready');
  assert.ok(lifeEvents.some(event => event.kind === 'life' && event.lives === 2));

  const final = M.makeModel(playingState(state => { state.lives = 1; state.ball.y = M.HEIGHT + M.BALL_RADIUS + 1; }));
  const overEvents = final.advance(M.STEP);
  assert.equal(final.view().lives, 0); assert.equal(final.view().status, 'over');
  assert.ok(overEvents.some(event => event.kind === 'over'));
  const replay = final.reset();
  assert.equal(replay.view().status, 'ready'); assert.equal(replay.view().lives, 3);
  assert.equal(replay.view().round, 1); assert.equal(replay.view().score, 0);
});

test('pause freezes play, resume restores it, and invalid elapsed time is ignored', () => {
  const model = M.create(); model.launch(); model.drain(); model.advance(M.STEP * 5);
  const before = model.view(); model.pause(); model.drain(); model.advance(300);
  assert.equal(model.view().ticks, before.ticks); assert.deepEqual(model.view().ball, before.ball);
  assert.equal(model.resume(), true); model.advance(M.STEP); assert.equal(model.view().ticks, before.ticks + 1);
  const unchanged = model.view();
  for (const elapsed of [-1, 1001, NaN, Infinity]) assert.deepEqual(model.advance(elapsed), []);
  assert.deepEqual(model.view(), unchanged);
});

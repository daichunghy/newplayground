const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/pong-1972-model.js');

function step(model, count = 1, axis = {}) {
  const events = [];
  for (let i = 0; i < count; i += 1) {
    if (axis.left !== undefined) model.setAxis('left', axis.left);
    if (axis.right !== undefined) model.setAxis('right', axis.right);
    events.push(...model.advance(M.STEP_MS));
  }
  return events;
}

test('the table opens in solo mode with a fair CPU and stays bounded', () => {
  const game = M.create(), view = game.view();
  assert.equal(view.mode, 'solo');
  assert.equal(view.width, 800); assert.equal(view.height, 460);
  assert.equal(view.status, 'serve'); assert.deepEqual(view.score, { left: 0, right: 0 });
  assert.equal(view.paddles.left.x, M.LEFT_X); assert.equal(view.paddles.right.x, M.RIGHT_X);
  assert.equal(view.paddles.left.y, M.HEIGHT / 2); assert.equal(view.paddles.right.y, M.HEIGHT / 2);
  assert.equal(view.ball.vx, 0); assert.equal(view.ball.vy, 0);
  assert.equal(M.WIN_SCORE, 7); assert.equal(M.STEP_MS, 1000 / 120);
});

test('CPU intercept prediction reflects the ball off both table edges', () => {
  const straight = { x: 400, y: 230, vx: 300, vy: 100 };
  const bank = { x: 400, y: 440, vx: 300, vy: 200 };
  assert.equal(M.predictInterceptY(straight), 344);
  assert.equal(M.predictInterceptY(bank), 238);
  assert.equal(M.predictInterceptY({ ...straight, vx: -300 }), M.HEIGHT / 2);
  assert.equal(M.predictInterceptY({ ...straight, vx: 0 }), M.HEIGHT / 2);
});

test('solo CPU moves toward a banked-ball intercept instead of chasing its current height', () => {
  const game = M.create();
  let anticipated = false;
  for (let tick = 0; tick < 3000 && !anticipated; tick += 1) {
    const before = game.view();
    if (before.ball.vx < 0) {
      const desired = before.ball.y - 40;
      game.setTarget('left', Math.max(M.PADDLE_HEIGHT / 2, Math.min(M.HEIGHT - M.PADDLE_HEIGHT / 2, desired)));
    } else if (before.ball.vx > 0) game.releaseTarget('left');

    const predicted = M.predictInterceptY(before.ball);
    const currentDelta = before.ball.y - before.paddles.right.y;
    const predictedDelta = predicted - before.paddles.right.y;
    if (before.ball.vx > 0 && before.ball.x >= M.CPU_PREDICT_X
      && Math.abs(currentDelta) > 30 && Math.abs(predictedDelta) > 30 && currentDelta * predictedDelta < 0) {
      const beforeY = before.paddles.right.y;
      game.advance(M.STEP_MS);
      const afterY = game.view().paddles.right.y;
      assert.equal(Math.sign(afterY - beforeY), Math.sign(predictedDelta));
      assert.ok(Math.abs(afterY - beforeY) <= M.CPU_SPEED * M.STEP_MS / 1000 + 1e-7);
      anticipated = true;
      break;
    }
    game.advance(M.STEP_MS);
  }
  assert.equal(anticipated, true, 'the CPU should reposition for a reflected shot before it reaches the paddle');
});

test('solo remains winnable when the player deliberately aims each return', () => {
  const game = M.create();
  let steps = 0;
  while (game.view().status !== 'won' && steps < 30000) {
    const view = game.view();
    if (view.ball.vx < 0) {
      const aim = view.ball.y + 40;
      game.setTarget('left', Math.max(M.PADDLE_HEIGHT / 2, Math.min(M.HEIGHT - M.PADDLE_HEIGHT / 2, aim)));
    } else if (view.ball.vx > 0) game.releaseTarget('left');
    game.advance(M.STEP_MS);
    steps++;
  }
  assert.equal(game.view().winner, 'left');
  assert.equal(game.view().score.left, M.WIN_SCORE);
  assert.ok(steps < 30000);
});

test('same inputs and fixed steps replay exactly; view objects cannot mutate the model', () => {
  const a = M.create(), b = M.create();
  step(a, 410, { left: -1, right: 1 });
  step(b, 410, { left: -1, right: 1 });
  assert.deepEqual(a.serialize(), b.serialize());
  const scoreBefore = a.view().score.left;
  const view = a.view(); view.score.left = 99; view.paddles.left.y = -1;
  assert.equal(a.view().score.left, scoreBefore); assert.notEqual(a.view().paddles.left.y, -1);
});

test('keyboard axes and touch targets move both paddles with court-edge clamping', () => {
  const game = M.create('versus');
  game.setAxis('left', -1); game.setAxis('right', 1); step(game, 900);
  let view = game.view();
  assert.equal(view.paddles.left.y, M.PADDLE_HEIGHT / 2);
  assert.equal(view.paddles.right.y, M.HEIGHT - M.PADDLE_HEIGHT / 2);
  game.setAxis('left', 0); game.setAxis('right', 0);
  assert.equal(game.setTarget('left', -40), true); assert.equal(game.setTarget('right', 900), true);
  step(game, 120);
  view = game.view();
  assert.ok(view.paddles.left.y < M.HEIGHT / 2);
  assert.ok(view.paddles.right.y > M.HEIGHT / 2);
  assert.ok(view.paddles.left.y >= M.PADDLE_HEIGHT / 2);
  assert.ok(view.paddles.right.y <= M.HEIGHT - M.PADDLE_HEIGHT / 2);
  game.releaseTarget('left'); game.releaseTarget('right');
  assert.equal(game.view().paddles.left.targetY, null);
});

test('serve wait, wall rebounds, paddle contacts and a short scoring set are deterministic', () => {
  const a = M.create('versus'), b = M.create('versus'), seen = [];
  let sameEvents = [];
  for (let i = 0; i < 3600 && a.view().status !== 'won'; i += 1) {
    const ae = a.advance(M.STEP_MS), be = b.advance(M.STEP_MS);
    seen.push(...ae); sameEvents = be;
    assert.deepEqual(ae, be);
  }
  const events = seen;
  assert.equal(a.view().status, 'won'); assert.equal(a.view().winner, 'left');
  assert.deepEqual(a.view().score, { left: M.WIN_SCORE, right: M.WIN_SCORE - 1 });
  assert.ok(events.some(event => event.kind === 'serve'));
  assert.ok(events.some(event => event.kind === 'wall-hit'));
  assert.ok(events.some(event => event.kind === 'paddle-hit'));
  assert.equal(events.filter(event => event.kind === 'point').length, 2 * M.WIN_SCORE - 1);
  assert.equal(events.at(-1).kind, 'match-won');
  assert.deepEqual(a.serialize(), b.serialize());
  assert.ok(sameEvents.length > 0);
});

test('pause freezes the match, resume continues it, and restart clears score and input', () => {
  const game = M.create('versus'); step(game, 90);
  assert.equal(game.pause(), true); assert.equal(game.view().status, 'paused');
  const paused = game.serialize();
  assert.deepEqual(game.advance(1000), []); assert.deepEqual(game.serialize(), paused);
  assert.equal(game.resume(), true); assert.equal(game.view().status, 'playing');
  step(game, 15, { left: -1, right: 1 });
  assert.equal(game.reset(), true);
  const fresh = game.view();
  assert.equal(fresh.status, 'serve'); assert.deepEqual(fresh.score, { left: 0, right: 0 });
  assert.equal(fresh.ticks, 0); assert.equal(fresh.paddles.left.axis, 0); assert.equal(fresh.paddles.right.axis, 0);
});

test('invalid or oversized elapsed values do not perturb fixed-step state', () => {
  const game = M.create(); step(game, 82);
  const before = game.serialize();
  for (const elapsed of [-1, NaN, Infinity, 30001]) assert.deepEqual(game.advance(elapsed), []);
  assert.deepEqual(game.serialize(), before);
});

test('solo mode gives left a fair input paddle, the CPU tracks returns, and versus can be selected',()=>{
  const game=M.create();let tracked=false;
  assert.equal(game.setAxis('right',1),false);assert.equal(game.setTarget('right',50),false);
  for(let i=0;i<1600&&!tracked;i++){
    const before=game.view();
    if(before.ball.vx<0)game.setTarget('left',before.ball.y);else game.releaseTarget('left');
    game.advance(M.STEP_MS);
    const after=game.view();
    if(before.mode==='solo'&&before.ball.vx>0&&Math.abs(before.ball.y-before.paddles.right.y)>M.CPU_DEADBAND){
      assert.ok(Math.abs(after.paddles.right.y-before.paddles.right.y)<=M.CPU_SPEED*M.STEP_MS/1000+1e-7);tracked=true;
    }
  }
  assert.equal(tracked,true,'the CPU should react to a ball returned toward it');
  assert.equal(game.setMode('versus'),true);assert.equal(game.view().mode,'versus');assert.equal(game.view().score.left,0);assert.equal(game.setAxis('right',1),true);assert.equal(game.setMode('invalid'),false);
});

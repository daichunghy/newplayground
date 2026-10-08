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

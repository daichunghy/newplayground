const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../scripts/games/san-bui-model.js');

function throwAndSettle(game, angle, power, chunk = M.STEP_MS) {
  game.setAim(angle);
  game.setPower(power);
  assert.equal(game.view().angle, angle);
  assert.equal(game.view().power, power);
  assert.equal(game.throwBall(), true);
  const events = [];
  for (let i = 0; i < 300 && game.view().status === 'playing' && game.view().phase !== 'aiming'; i++) {
    events.push(...game.advance(chunk));
  }
  return events;
}

test('seeded stages build centered triangular stacks with rising clear goals and three throws', () => {
  const a = M.create({ seed: 17 }).view(), b = M.create({ seed: 17 }).view();
  assert.deepEqual(a, b);
  assert.equal(a.status, 'playing'); assert.equal(a.phase, 'aiming');
  assert.deepEqual(M.STAGES.map(stage => [stage.rows, stage.goal, stage.throws]), [[3, 3, 3], [4, 6, 3], [5, 10, 3]]);
  assert.equal(a.cans.length, 6);
  assert.deepEqual(a.cans.map(can => can.row).sort(), [0, 0, 0, 1, 1, 2]);
  assert.equal(a.throwsLeft, 3); assert.equal(a.throwsUsed, 0); assert.equal(a.totalThrows, 0);
  assert.ok(a.targetCenter > 500 && a.targetCenter < 540);
});

test('aim and force clamp at authored bounds and remain locked during a live throw', () => {
  const game = M.create();
  assert.equal(game.setAim(-99), true); assert.equal(game.view().angle, M.MIN_ANGLE);
  assert.equal(game.setAim(999), true); assert.equal(game.view().angle, M.MAX_ANGLE);
  assert.equal(game.setPower(1), true); assert.equal(game.view().power, M.MIN_POWER);
  assert.equal(game.setPower(999), true); assert.equal(game.view().power, M.MAX_POWER);
  assert.equal(game.setAim(NaN), false); assert.equal(game.setPower(Infinity), false);
  game.setAim(20); game.setPower(65);
  const lowArc = game.view().trajectory;
  game.setAim(42); game.setPower(88);
  assert.notDeepEqual(game.view().trajectory, lowArc);
  assert.equal(game.throwBall(), true);
  assert.equal(game.view().throwsLeft, 2); assert.equal(game.view().throwsUsed, 1);
  assert.equal(game.view().totalThrows, 1);
  assert.equal(game.setAim(30), false); assert.equal(game.setPower(70), false);
  assert.equal(game.throwBall(), false);
});

test('a deliberate trajectory collides, topples cans through the stack, and clears a short stage', () => {
  const game = M.create({ seed: 1 }), events = throwAndSettle(game, 18, 75);
  assert.ok(events.some(event => event.kind === 'impact'));
  assert.ok(events.some(event => event.kind === 'knock'));
  assert.ok(events.some(event => event.kind === 'stage-clear'));
  assert.equal(game.view().stageIndex, 1);
  assert.equal(game.view().phase, 'aiming');
  assert.equal(game.view().knocked, 0);
  assert.equal(game.view().cans.length, 10);
  assert.equal(game.view().throwsLeft, 3);
  assert.equal(game.view().totalThrows, 1);
});

test('four deterministic aimed throws clear all three objectives and the terminal state stops input', () => {
  const game = M.create({ seed: 1 });
  const results = [];
  for (let shot = 0; shot < 4; shot++) results.push(...throwAndSettle(game, 18, 75));
  const view = game.view();
  assert.equal(view.status, 'won'); assert.equal(view.phase, 'result');
  assert.equal(view.stageIndex, 2); assert.equal(view.knocked, 12);
  assert.equal(view.cans.length, 15); assert.equal(view.score, 2400);
  assert.equal(view.totalThrows, 4);
  assert.ok(results.filter(event => event.kind === 'stage-clear').length >= 3);
  assert.ok(results.some(event => event.kind === 'won'));
  assert.equal(game.throwBall(), false); assert.equal(game.setAim(40), false);
  assert.deepEqual(game.advance(5000), []);
});

test('three soft throws that miss the stack end in a loss with no knocked cans', () => {
  const game = M.create({ seed: 1 });
  const events = [];
  for (let shot = 0; shot < 3; shot++) events.push(...throwAndSettle(game, 10, 35));
  assert.equal(game.view().status, 'lost'); assert.equal(game.view().phase, 'result');
  assert.equal(game.view().knocked, 0); assert.equal(game.view().throwsLeft, 0);
  assert.ok(events.some(event => event.kind === 'lost'));
});

test('pause freezes flight and resume restores the same throw without spending another one', () => {
  const game = M.create({ seed: 9 });
  game.throwBall(); game.advance(320);
  const before = game.view();
  assert.equal(game.pause(), true); assert.equal(game.view().status, 'paused');
  assert.deepEqual(game.advance(4000), []);
  assert.deepEqual(game.view().ball, before.ball);
  assert.equal(game.view().throwsLeft, before.throwsLeft);
  assert.equal(game.setAim(40), false);
  assert.equal(game.resume(), true); assert.equal(game.view().status, 'playing');
  assert.equal(game.view().phase, before.phase);
  assert.equal(game.throwBall(), false);
});

test('physics outcomes are deterministic across different elapsed-time chunk sizes', () => {
  function replay(chunk) {
    const game = M.create({ seed: 1 }); game.setAim(18); game.setPower(75); game.throwBall();
    const events = [];
    for (let i = 0; i < Math.ceil(3200 / chunk) && game.view().phase !== 'aiming'; i++) events.push(...game.advance(chunk));
    return { view: game.view(), events };
  }
  const fine = replay(16), coarse = replay(32);
  assert.deepEqual(fine.view, coarse.view);
  assert.deepEqual(fine.events, coarse.events);
});

test('invalid and oversized time advances do not mutate the board', () => {
  const game = M.create({ seed: 3 }); game.throwBall();
  const before = game.serialize();
  assert.deepEqual(game.advance(-1), []); assert.deepEqual(game.advance(NaN), []); assert.deepEqual(game.advance(30001), []);
  assert.deepEqual(game.serialize(), before);
});

test('CommonJS and browser-global rule APIs agree without DOM or canvas objects', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/games/san-bui-model.js'), 'utf8');
  const window = {}; vm.runInContext(source, vm.createContext({ window }));
  assert.equal(typeof window.NP_SanBuiModel.create, 'function');
  assert.deepEqual(Array.from(window.NP_SanBuiModel.create({ seed: 31 }).view().cans, can => can.x),
    M.create({ seed: 31 }).view().cans.map(can => can.x));
});

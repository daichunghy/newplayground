const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/cut-rope-model.js');

function advanceTo(game, seconds) {
  const steps = Math.round(seconds / M.STEP);
  for (let i = 0; i < steps; i++) game.step(M.STEP);
}

function cutMiddle(game) {
  const view = game.view();
  const piece = view.rope[Math.floor(view.rope.length / 2)];
  return game.cut(
    { x: (piece.start.x + piece.end.x) / 2, y: (piece.start.y + piece.end.y) / 2 },
    { x: (piece.start.x + piece.end.x) / 2, y: (piece.start.y + piece.end.y) / 2 }
  );
}

function playRelease(level, releaseTime) {
  const game = M.create({ level });
  advanceTo(game, releaseTime);
  assert.equal(cutMiddle(game).cut, true);
  for (let i = 0; i < 3 * 120 && game.view().status === 'playing'; i++) game.step(M.STEP);
  return game;
}

test('three authored stages define distinct swing routes, targets, and hazards', () => {
  assert.equal(M.LEVELS.length, 3);
  assert.deepEqual(M.LEVELS.map(stage => stage.name), ['Hiên Nắng', 'Cầu Lau', 'Vườn Trăng']);
  for (const stage of M.LEVELS) {
    assert.ok(stage.gravity >= 600);
    assert.ok(stage.ropeSegments >= 7);
    assert.equal(stage.stars.length, 3);
    assert.ok(stage.receiver.radius >= 30);
  }
  assert.notDeepEqual(M.LEVELS[0].anchor, M.LEVELS[1].anchor);
  assert.ok(M.LEVELS[1].hazards.length > 0 && M.LEVELS[2].hazards.length > 0);
});

test('swept circle contact catches a fast crossing but rejects a near miss', () => {
  assert.equal(M.circleContactOnSegment({ x: -20, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 0 }, 5), 0.375);
  assert.equal(M.circleContactOnSegment({ x: -20, y: 6 }, { x: 20, y: 6 }, { x: 0, y: 0 }, 5), null);
  assert.equal(M.circleContactOnSegment({ x: 2, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 0 }, 3), 0);
  assert.equal(M.circleContactOnSegment({ x: 4, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 0 }, 3), null);
});

test('fixed-step gravity creates a pendulum swing while the tether keeps its authored length', () => {
  const game = M.create(), before = game.view();
  const initialDistance = Math.hypot(before.candy.x - before.anchor.x, before.candy.y - before.anchor.y);
  advanceTo(game, 0.28);
  const after = game.view();
  const distance = Math.hypot(after.candy.x - after.anchor.x, after.candy.y - after.anchor.y);
  assert.ok(Math.abs(initialDistance - before.ropeLength) < 1e-8);
  assert.ok(Math.abs(distance - after.ropeLength) < 0.02);
  assert.ok(Math.abs(after.candy.x - before.candy.x) > 15, 'the candy swings without input');
  assert.equal(after.attached, true);
});

test('only a swipe near a visible rope segment severs the tether and releases gravity', () => {
  const game = M.create(), view = game.view();
  assert.equal(game.cut({ x: 12, y: 12 }, { x: 40, y: 12 }).cut, false);
  assert.equal(game.view().attached, true);
  const middle = view.rope[3];
  const result = game.cutAt({ x: (middle.start.x + middle.end.x) / 2, y: (middle.start.y + middle.end.y) / 2 });
  assert.equal(result.cut, true);
  assert.ok(result.segment >= 0 && result.segment < view.ropeSegments);
  const released = game.view();
  assert.equal(released.attached, false);
  advanceTo(game, 0.12);
  assert.ok(game.view().candy.y > released.candy.y);
  assert.equal(game.view().rope.length, 0);
});

test('three short release routes collect stars, feed the receiver, and award score', () => {
  const first = playRelease(0, 0.30).view();
  assert.equal(first.status, 'won');
  assert.equal(first.starsCollected, 3);
  assert.equal(first.levelScore, 650);
  assert.equal(first.score, 650);

  const secondGame = playRelease(1, 0.30);
  assert.equal(secondGame.view().status, 'won');
  assert.equal(secondGame.view().starsCollected, 3);
  assert.equal(secondGame.view().levelScore, 680);

  const third = playRelease(2, 0.38).view();
  assert.equal(third.status, 'campaign-won');
  assert.equal(third.starsCollected, 3);
  assert.equal(third.levelScore, 720);
});

test('a mistimed release can miss the garden, lose, and restart the same level cleanly', () => {
  const game = M.create();
  advanceTo(game, 0.2);
  assert.equal(cutMiddle(game).cut, true);
  for (let i = 0; i < 3 * 120 && game.view().status === 'playing'; i++) game.step(M.STEP);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().lossReason, 'missed');
  assert.equal(game.restart(), true);
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().level, 0);
  assert.equal(game.view().attached, true);
  assert.equal(game.view().starsCollected, 0);
});

test('the authored spike beds catch badly aimed releases while the clean routes stay open', () => {
  const reed = playRelease(1, 0.2).view();
  assert.equal(reed.status, 'lost');
  assert.equal(reed.lossReason, 'hazard');
  const moon = playRelease(2, 0.3).view();
  assert.equal(moon.status, 'lost');
  assert.equal(moon.lossReason, 'hazard');
  assert.equal(playRelease(2, 0.38).view().status, 'campaign-won');
});

test('pause freezes physics; resume, level advance, replay, and new campaign reset cleanly', () => {
  const game = M.create();
  assert.equal(game.pause(), true);
  const paused = game.view();
  advanceTo(game, 0.5);
  assert.deepEqual(game.view(), paused);
  assert.equal(game.resume(), true);
  const first = playRelease(0, 0.30);
  assert.equal(first.nextLevel(), true);
  assert.equal(first.view().level, 1);
  assert.equal(first.view().status, 'playing');
  assert.equal(first.view().score, 650);
  assert.equal(first.restart(), true);
  assert.equal(first.view().score, 650);
  assert.equal(first.newGame(), true);
  assert.equal(first.view().level, 0);
  assert.equal(first.view().score, 0);
});

test('equal fixed-step input sequences produce identical state', () => {
  const left = M.create({ level: 2 }), right = M.create({ level: 2 });
  for (let i = 0; i < 50; i++) { left.step(M.STEP); right.step(M.STEP); }
  assert.deepEqual(left.view(), right.view());
});

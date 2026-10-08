const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/ban-bi-ve-model.js');

function settle(game, limit = 1200) {
  for (let i = 0; i < limit && game.state.phase === 'moving'; i++) game.advance(1 / 60);
  assert.equal(game.state.phase, 'ready', 'shot reaches a settled state');
}

function fixture(targets, scores, players = 2) {
  const game = M.create({ players, seed: 17 });
  game.state.targets = targets.map(ball => ({ ...ball, vx: ball.vx || 0, vy: ball.vy || 0 }));
  game.state.score = scores.slice();
  return game;
}

function target(id, x, y) {
  const owner = (id - 1) % 2;
  return { id, owner, color: (id - 1) % M.TARGET_COLORS.length, x, y, vx: 0, vy: 0 };
}

function invariant(game) {
  const s = game.state;
  assert.equal(s.score.reduce((sum, value) => sum + value, 0) + s.targets.length, s.players * M.INITIAL_PER_PLAYER);
  assert.equal(new Set(s.targets.map(ball => ball.id)).size, s.targets.length);
  for (const ball of s.targets) {
    assert.ok(Number.isFinite(ball.x) && Number.isFinite(ball.y) && Number.isFinite(ball.vx) && Number.isFinite(ball.vy));
    assert.ok(Math.hypot(ball.x - M.CENTER.x, ball.y - M.CENTER.y) <= M.RING_RADIUS + 1e-6);
  }
  assert.ok(M.restore(s), 'serialized state is restorable');
}

test('seeded circle setup is deterministic and scales from two to four players', () => {
  assert.deepEqual(M.create({ players: 2, seed: 41 }).serialize(), M.create({ players: 2, seed: 41 }).serialize());
  for (const players of [2, 3, 4]) {
    const game = M.create({ players, seed: 41 });
    assert.equal(game.state.targets.length, players * 3);
    assert.deepEqual(game.state.score, Array(players).fill(0));
    assert.equal(new Set(game.state.targets.map(ball => ball.owner)).size, players);
    for (let player = 0; player < players; player++) {
      const home = M.homeFor(players, player);
      assert.ok(Math.hypot(home.x - M.CENTER.x, home.y - M.CENTER.y) > M.RING_RADIUS);
    }
  }
});

test('flick input rejects invalid pulls, caps force, and starts one deterministic shot', () => {
  const game = M.create({ seed: 3 }), home = game.home();
  assert.equal(game.shootFromPull(NaN, home.y), false);
  assert.equal(game.shootFromPull(home.x, home.y), false);
  assert.equal(game.shootFromPull(home.x, home.y - M.MAX_PULL - 8), false);
  assert.equal(game.shootFromPull(home.x, home.y - 80), true);
  assert.equal(game.state.phase, 'moving');
  assert.equal(game.state.shots, 1);
  assert.ok(Math.abs(game.state.striker.vx) < 1e-8);
  assert.ok(game.state.striker.vy > 0);
  assert.equal(game.shoot(0, 200), false, 'no second shooter while the first shot is moving');
});

test('solo CPU picks a repeatable legal shot within its simulation budget and leaves marbles in play', () => {
  function cpuGame() {
    const game = fixture([
      target(1, 360, 120), target(2, 418, 220), target(3, 418, 300),
      target(4, 302, 300), target(5, 302, 220), target(6, 360, 260)
    ], [0, 0]);
    game.state.turn = 1;
    game.state.striker = { ...M.homeFor(2, 1), vx: 0, vy: 0 };
    return game;
  }
  const game = cpuGame(), replay = cpuGame(), before = game.serialize();
  const shot = game.chooseCpuShot();
  assert.deepEqual(shot, replay.chooseCpuShot());
  assert.ok(shot);
  assert.ok(M.CPU_LIMITS.maxTrials >= shot.trials && shot.trials <= 18);
  assert.equal(shot.predictedCaptures, 1, 'the edge marble is a clean tactical target');
  assert.deepEqual(game.serialize(), before, 'shot search does not move marbles or spend a turn');
  assert.equal(game.shoot(shot.angle, shot.speed), true, 'the returned angle and speed use the normal legal shot path');
  settle(game);
  assert.equal(game.state.score[1], 1);
  assert.equal(game.state.targets.length, 5, 'the human still has five targets to play');
  assert.equal(game.state.status, 'playing');
  assert.equal(game.state.cpuScoredTurn, true);
  const resumed = M.restore(game.serialize());
  assert.ok(resumed);
  const pass = resumed.chooseCpuShot();
  assert.deepEqual(pass, { angle: Math.PI / 2, speed: 100, predictedCaptures: 0, trials: 0 });
  assert.equal(resumed.shoot(pass.angle, pass.speed), true, 'the CPU still takes the extra shot granted by a capture');
  settle(resumed);
  assert.equal(resumed.state.turn, 0, 'the safe low-power shot yields the turn to the human');
  assert.equal(resumed.state.targets.length, 5);
});

test('CPU cannot choose a shot outside its turn or while a shot is moving', () => {
  const game = M.create({ players: 2, seed: 5 });
  assert.equal(game.chooseCpuShot(), null);
  game.state.turn = 1;
  assert.ok(game.chooseCpuShot());
  assert.equal(game.shoot(0, 240), true);
  assert.equal(game.chooseCpuShot(), null);
});

test('a miss passes the turn after the striker settles', () => {
  const game = fixture([target(1, 360, 260)], [0, 5]);
  assert.equal(game.shoot(Math.PI, 400), true);
  settle(game);
  assert.equal(game.state.turn, 1);
  assert.deepEqual(game.state.score, [0, 5]);
  assert.equal(game.state.targets.length, 1);
  assert.equal(game.drainEvents().at(-1).type, 'turn');
});

test('a captured marble scores for the shooter and grants another shot before turn rotation', () => {
  const game = fixture([target(1, 360, 200), target(2, 480, 260)], [0, 4]);
  assert.equal(game.shoot(Math.PI / 2, M.MAX_SPEED), true);
  settle(game);
  assert.deepEqual(game.state.score, [1, 4]);
  assert.equal(game.state.targets.length, 1);
  assert.equal(game.state.turn, 0, 'successful capture keeps the turn');
  assert.equal(game.state.phase, 'ready');
  assert.equal(game.shoot(Math.PI, 400), true);
  settle(game);
  assert.equal(game.state.turn, 1, 'the next miss passes play');
});

test('clearing the ring ends the match once and records a winner or a tie', () => {
  const game = fixture([target(1, 360, 200)], [0, 5]);
  game.shoot(Math.PI / 2, M.MAX_SPEED); settle(game);
  assert.equal(game.state.status, 'won');
  assert.deepEqual(game.state.winners, [1]);
  assert.equal(game.shoot(0, 300), false);
  assert.equal(game.drainEvents().filter(event => event.type === 'won').length, 1);

  const tie = fixture([target(1, 360, 200)], [2, 3]);
  tie.shoot(Math.PI / 2, M.MAX_SPEED); settle(tie);
  assert.deepEqual(tie.state.winners, [0, 1]);
  assert.equal(tie.drainEvents().at(-1).type, 'draw');
});

test('fixed-step replay and restore produce the same moving shot', () => {
  const live = M.create({ players: 3, seed: 91 });
  live.shoot(-Math.PI / 2, 510);
  for (let i = 0; i < 12; i++) live.advance(1 / 120);
  const restored = M.restore(live.serialize());
  assert.ok(restored);
  for (let i = 0; i < 180; i++) { live.advance(1 / 60); restored.advance(1 / 60); }
  assert.deepEqual(restored.serialize(), live.serialize());
});

test('invalid, inconsistent and future saves are rejected without throwing', () => {
  const valid = M.create({ players: 3, seed: 7 }).serialize();
  const legacy = JSON.parse(JSON.stringify(valid)); delete legacy.cpuScoredTurn;
  assert.equal(M.restore(legacy).state.cpuScoredTurn, false, 'older saves default the new CPU turn flag safely');
  const edits = [
    state => { state.version = 2; },
    state => { state.rules = 'other'; },
    state => { state.players = 5; },
    state => { state.turn = 9; },
    state => { state.targets[1].id = state.targets[0].id; },
    state => { state.targets[0].owner = 2; },
    state => { state.targets[0].x = Infinity; },
    state => { state.score[0] = 500; },
    state => { state.phase = 'moving'; state.striker.vy = 1000; },
    state => { state.status = 'won'; state.winners = [2]; },
    state => { state.cpuScoredTurn = 'yes'; },
    state => { state.cpuScoredTurn = true; },
    state => { state.accumulator = 10; }
  ];
  for (const edit of edits) {
    const state = JSON.parse(JSON.stringify(valid)); edit(state);
    assert.equal(M.restore(state), null);
  }
  for (const raw of [null, {}, [], 'bad']) assert.equal(M.restore(raw), null);
});

test('seeded action batch keeps marbles bounded, finite, and replayable', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const game = M.create({ players: 2 + seed % 3, seed });
    for (let shot = 0; shot < 10 && game.state.status === 'playing'; shot++) {
      const angle = -Math.PI / 2 + ((shot * 1.73 + seed) % 6) * Math.PI / 6;
      game.shoot(angle, 250 + (shot % 4) * 70);
      settle(game);
      invariant(game);
    }
  }
});

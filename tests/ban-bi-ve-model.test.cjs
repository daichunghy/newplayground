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

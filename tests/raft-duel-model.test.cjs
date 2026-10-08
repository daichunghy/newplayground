const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/raft-duel-model.js');

function takeShot(game, angle, chargeMs = 1800) {
  game.setAngle(angle);
  assert.equal(game.beginCharge(), true);
  game.advance(chargeMs);
  assert.equal(game.releaseCharge(), true);
  const result = [];
  for (let i = 0; i < 130; i++) {
    result.push(...game.advance(M.STEP_MS));
    if (result.some(event => ['hit', 'miss', 'splash'].includes(event.kind))) break;
  }
  return result;
}

test('fresh duel has two small decks, three hits and one immediate player turn', () => {
  const game = M.create(), v = game.view();
  assert.equal(v.status, 'playing');
  assert.equal(v.turn, 'player');
  assert.equal(v.player.hp, 3);
  assert.equal(v.cpu.hp, 3);
  assert.deepEqual(v.playerDeck, { left: 48, right: 180 });
  assert.deepEqual(v.cpuDeck, { left: 460, right: 592 });
});

test('aim changes within bounds and is locked while charging or after firing', () => {
  const game = M.create();
  assert.equal(game.setAngle(55), true);
  assert.equal(game.view().player.angle, 55);
  game.setAngle(900); assert.equal(game.view().player.angle, M.MAX_ANGLE);
  game.setAngle(-4); assert.equal(game.view().player.angle, M.MIN_ANGLE);
  assert.equal(game.beginCharge(), true);
  assert.equal(game.setAngle(40), false);
  game.releaseCharge();
  assert.equal(game.setAngle(40), false);
});

test('holding to charge fills a bounded power meter and release fires exactly once', () => {
  const game = M.create();
  assert.equal(game.beginCharge(), true);
  game.advance(2200);
  assert.equal(game.view().player.power, M.MAX_POWER);
  assert.equal(game.releaseCharge(), true);
  assert.equal(game.view().shots, 1);
  assert.equal(game.releaseCharge(), false);
});

test('cancelled pointer hold spends no shot and restores a usable default meter', () => {
  const game = M.create();
  game.beginCharge(); game.advance(900);
  assert.equal(game.cancelCharge(), true);
  assert.equal(game.view().player.power, 64);
  assert.equal(game.view().shots, 0);
  assert.equal(game.releaseCharge(), false);
  assert.equal(game.beginCharge(), true);
});

test('a carefully aimed full-power shot hits, damages and pushes the opposing crew', () => {
  const game = M.create(), events = takeShot(game, 26);
  const hit = events.find(event => event.kind === 'hit');
  assert.equal(hit.target, 'cpu');
  assert.equal(hit.hp, 2);
  assert.ok(hit.x > 528);
  assert.equal(game.view().turn, 'cpu');
});

test('a close water splash pushes the target without taking a heart', () => {
  const game = M.create(), snapshot = game.serialize();
  snapshot.projectile = { side: 'player', x: 482, y: 292, vx: 0, vy: 9, age: 1, power: 80 };
  assert.equal(game.restore(snapshot), true);
  const events = game.advance(M.STEP_MS);
  const splash = events.find(event => event.kind === 'splash');
  assert.ok(splash);
  assert.ok(splash.x > 528);
  assert.equal(game.view().cpu.hp, 3);
});

test('cpu returns fire automatically and the player regains control after its shot', () => {
  const game = M.create(); takeShot(game, 26);
  assert.equal(game.view().turn, 'cpu');
  const events = game.advance(600);
  assert.ok(events.some(event => event.kind === 'fire' && event.side === 'cpu'));
  let landed = false;
  for (let i = 0; i < 130 && !landed; i++) {
    const next = game.advance(M.STEP_MS);
    landed = next.some(event => ['hit', 'miss', 'splash'].includes(event.kind));
  }
  assert.equal(landed, true);
  assert.equal(game.view().turn, 'player');
  assert.equal(game.beginCharge(), true);
});

test('falling beyond either deck ends once with the correct winner', () => {
  const game = M.create(), snapshot = game.serialize();
  snapshot.cpu.x = 579;
  snapshot.projectile = { side: 'player', x: 550, y: 226, vx: 7, vy: 0, age: 4, power: 90 };
  game.restore(snapshot);
  const events = [];
  for (let i = 0; i < 4; i++) events.push(...game.advance(M.STEP_MS));
  assert.ok(events.some(event => event.kind === 'won' && event.knockoff));
  assert.equal(game.view().status, 'won');
  assert.deepEqual(game.advance(5000), []);
});

test('valid save resumes the same projectile; corrupt or future state is rejected without mutation', () => {
  const first = M.create(); first.beginCharge(); first.advance(800); first.releaseCharge(); first.advance(32);
  const saved = first.serialize(), second = M.create();
  assert.equal(second.restore(saved), true);
  assert.deepEqual(second.serialize(), saved);
  const before = second.serialize();
  assert.equal(second.restore({ ...saved, version: 99 }), false);
  assert.equal(second.restore({ ...saved, cpu: { x: 500, hp: 4, out: false, angle: 30, power: 60 } }), false);
  assert.deepEqual(second.serialize(), before);
});

test('equal shot actions replay deterministically across refresh-rate-sized chunks', () => {
  function replay(chunks) {
    const game = M.create(); game.setAngle(26); game.beginCharge();
    chunks.forEach(ms => game.advance(ms)); game.releaseCharge();
    for (let i = 0; i < 100; i++) game.advance(16);
    return game.serialize();
  }
  assert.deepEqual(replay(Array(120).fill(16)), replay(Array(60).fill(32)));
});

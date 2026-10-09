const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/soap-bubble-garden-model.js');

function flyWithAimedBreaths(game) {
  let guard = 0;
  while (game.view().status === 'playing' && guard++ < 1200) {
    const v = game.view();
    const gate = v.gates[v.gatesPassed];
    const target = gate ? gate.center : 400;
    const direction = Math.abs(v.x - target) < 12 ? 0 : v.x < target ? 1 : -1;
    game.setInput({ inflate: v.charge < .58, left: direction < 0, right: direction > 0 });
    game.advance(1 / 60);
  }
  return game.view();
}

test('original course starts with three documented fixed openings and scores each safe crossing', () => {
  const game = M.create();
  assert.equal(game.view().status, 'ready');
  assert.equal(game.view().gates.length, 3);
  assert.equal(game.start(), true);
  const result = flyWithAimedBreaths(game);
  assert.equal(result.status, 'won');
  assert.equal(result.result, 'delivered');
  assert.equal(result.gatesPassed, 3);
  assert.equal(result.score, 625);
  assert.equal(game.setInput({ inflate: true }), false, 'terminal input is rejected');
});

test('missing the safe window pops the bubble and records the thorn loss', () => {
  const game = M.create(); game.start();
  game.setInput({ inflate: true });
  for (let i = 0; i < 500 && game.view().status === 'playing'; i++) game.advance(1 / 120);
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().result, 'thorns');
  assert.equal(game.view().gatesPassed, 0);
  assert.equal(game.view().lastEvent, 'thorns');
});

test('continuous inflation eventually pops; releasing the breath restores a controllable size', () => {
  const game = M.create(); game.start();
  let guard = 0;
  while (game.view().status === 'playing' && guard++ < 500) {
    const v = game.view(), gate = v.gates[v.gatesPassed];
    const direction = gate && Math.abs(v.x - gate.center) > 12 ? (v.x < gate.center ? 1 : -1) : 0;
    game.setInput({ inflate: true, left: direction < 0, right: direction > 0 });
    game.advance(.01);
  }
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().result, 'overpressure');
  game.restart(); game.start(); game.setInput({ inflate: true }); game.advance(.6);
  const charged = game.view().charge;
  game.setInput({ inflate: false }); game.advance(.5);
  assert.ok(game.view().charge < charged);
  assert.equal(game.view().status, 'playing');
});

test('pause freezes time and lift, resume continues, and restart returns to the start', () => {
  const game = M.create(); game.start(); game.setInput({ inflate: true, right: true }); game.advance(.4);
  const before = game.view();
  assert.equal(game.pause(), true);
  assert.equal(game.view().input.inflate, false);
  assert.equal(game.advance(.5), false);
  assert.equal(game.view().timeLeft, before.timeLeft);
  assert.equal(game.view().y, before.y);
  assert.equal(game.resume(), true);
  assert.equal(game.advance(.1), true);
  assert.ok(game.view().elapsed > before.elapsed);
  game.restart();
  assert.equal(game.view().status, 'ready');
  assert.equal(game.view().x, 400);
  assert.equal(game.view().y, 408);
  assert.equal(game.view().score, 0);
});

test('careful, low-lift flight can run out the timer; invalid advances do not alter the round', () => {
  const game = M.create(); game.start();
  const before = game.view();
  for (const value of [0, -1, 2.01, NaN, Infinity]) assert.equal(game.advance(value), false);
  assert.equal(game.view().elapsed, before.elapsed);
  game.advance(2);
  assert.ok(Math.abs(game.view().elapsed - 2) < 1e-9);
  let guard = 0;
  while (game.view().status === 'playing' && guard++ < 1600) {
    const v = game.view(), gate = v.gates[v.gatesPassed];
    const direction = gate && Math.abs(v.x - gate.center) > 12 ? (v.x < gate.center ? 1 : -1) : 0;
    game.setInput({ inflate: false, left: direction < 0, right: direction > 0 });
    game.advance(1 / 60);
  }
  assert.equal(game.view().status, 'lost');
  assert.equal(game.view().result, 'time');
});

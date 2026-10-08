const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/ban-vit-bay-model.js');

test('same seed gives the same target positions and movement', () => {
  const a = M.create({ seed: 91 }), b = M.create({ seed: 91 });
  a.drain(); b.drain();
  assert.deepEqual(a.view(), b.view());
  a.advance(860); b.advance(860);
  assert.deepEqual(a.view(), b.view());
  assert.notEqual(a.view().target.x, 0);
});

test('aim clamps to the field; an accurate shot hits once and adds one hundred points', () => {
  const game = M.create({ seed: 5 }); game.drain();
  assert.equal(game.act('aim', { x: -20, y: 700 }), true);
  assert.deepEqual(game.view().aim, { x: 0, y: M.HEIGHT });
  const target = game.view().target;
  assert.equal(game.act('fire', { x: target.x, y: target.y }), true);
  assert.equal(game.view().phase, 'hit');
  assert.equal(game.view().hits, 1);
  assert.equal(game.view().score, 100);
  assert.equal(game.view().shotsLeft, 2);
  assert.equal(game.act('fire', target), false);
  assert.equal(game.advance(M.RESULT_MS).some(event => event.kind === 'flight'), true);
  assert.equal(game.view().index, 1);
  assert.equal(game.view().shotsLeft, M.SHOTS_PER_FLIGHT);
});

test('three misses settle one flight; escape is a miss and the fifth flight finishes', () => {
  const game = M.create({ seed: 13 }); game.drain();
  for (let n = 0; n < M.SHOTS_PER_FLIGHT; n++) assert.equal(game.act('fire', { x: 0, y: 0 }), true);
  assert.equal(game.view().phase, 'miss');
  assert.equal(game.view().misses, 1);
  assert.equal(game.act('fire'), false);
  game.advance(M.RESULT_MS);
  for (let n = 1; n < M.FLIGHTS; n++) {
    game.advance(M.FLIGHT_MS);
    assert.equal(game.view().phase, 'miss');
    game.advance(M.RESULT_MS);
  }
  assert.equal(game.view().status, 'over');
  assert.equal(game.view().index, M.FLIGHTS);
  assert.equal(game.view().misses, M.FLIGHTS);
  assert.equal(game.view().target, null);
});

test('five authored courses vary movement, and the direction change is telegraphed', () => {
  assert.deepEqual(M.COURSES.map(course => course.name), ['Quét Ngang', 'Cánh Cao', 'Lượn Cỏ', 'Đảo Gió', 'Gió Cuối']);
  assert.equal(new Set(M.COURSES.map(course => `${course.speed}/${course.yAmplitude}/${course.yPeriod}/${course.sideSway}/${course.turnAtMs}`)).size, M.FLIGHTS);
  const game = M.create({ seed: 25 }); game.drain();
  for (let flight = 0; flight < 3; flight++) {
    assert.equal(game.view().target.courseName, M.COURSES[flight].name);
    game.advance(M.FLIGHT_MS);
    game.advance(M.RESULT_MS);
  }
  assert.equal(game.view().index, 3);
  assert.equal(game.view().target.courseName, 'Đảo Gió');
  const warning = game.advance(M.COURSES[3].turnAtMs - 300);
  assert.ok(warning.some(event => event.kind === 'turn-warning'));
  assert.equal(game.view().target.turned, false);
  const vxBefore = game.view().target.vx;
  const turned = game.advance(300);
  assert.ok(turned.some(event => event.kind === 'turn'));
  assert.equal(game.view().target.turned, true);
  assert.equal(Math.sign(game.view().target.vx), -Math.sign(vxBefore));
});

test('pause freezes timing and only resumes through the explicit action', () => {
  const game = M.create({ seed: 22 }); game.drain();
  game.advance(360);
  const x = game.view().target.x, elapsed = game.view().elapsed;
  assert.equal(game.act('pause'), true);
  game.advance(5000);
  assert.equal(game.view().target.x, x);
  assert.equal(game.view().elapsed, elapsed);
  assert.equal(game.act('fire'), false);
  assert.equal(game.act('resume'), true);
  game.advance(40);
  assert.notEqual(game.view().target.x, x);
});

test('invalid, negative, and oversized time steps are ignored', () => {
  const game = M.create(); game.drain();
  const before = game.view();
  assert.deepEqual(game.advance(-1), []);
  assert.deepEqual(game.advance(60001), []);
  assert.deepEqual(game.advance(NaN), []);
  assert.deepEqual(game.view(), before);
});

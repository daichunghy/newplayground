const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/paperboy-model.js');

test('a clean route changes lanes, delivers all six papers and wins with a bounded score', () => {
  const model = M.create();
  // Dodge each hazard between the short mailbox windows while lining up the next address.
  model.advance(800); assert.equal(model.throwPaper().hit, true);
  model.setLane(2); model.advance(2400); assert.equal(model.throwPaper().hit, true);
  model.setLane(0); model.advance(2400); assert.equal(model.throwPaper().hit, true);
  model.setLane(1); model.advance(2400); assert.equal(model.throwPaper().hit, true);
  // Stay in lane 1 through the 9.1 s car, then lane 0 through the 11.5 s dog.
  model.advance(1200); model.setLane(0); model.advance(1200); assert.equal(model.throwPaper().hit, true);
  model.advance(1200); model.setLane(2); model.advance(1200); assert.equal(model.throwPaper().hit, true);
  model.advance(M.ROUTE_MS - model.view().elapsed);
  assert.equal(model.view().status, 'won');
  assert.equal(model.view().deliveries, 6);
  assert.equal(model.view().score, 600);
  assert.equal(model.view().crashes, 0);
});

test('early throws are harmless, wrong lanes consume an address and missed windows lose', () => {
  const model = M.create();
  assert.deepEqual(model.throwPaper(), { accepted: false, reason: 'window' });
  model.advance(800); model.setLane(0);
  assert.equal(model.throwPaper().hit, false);
  assert.equal(model.view().misses, 1);
  model.advance(2400); model.advance(2400); model.advance(1600);
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().misses, 3);
  assert.equal(model.throwPaper().accepted, false);
});

test('traffic hits cost lives, and lane bounds, pause and restart hold', () => {
  const model = M.create();
  assert.equal(model.changeLane(1), true);
  assert.equal(model.changeLane(1), false);
  model.setLane(1);
  assert.equal(model.advance(6000), true);
  assert.equal(model.view().crashes, 1, 'middle-lane car is resolved at 4.3 seconds when crossed');
  model.setLane(2);
  model.advance(700);
  assert.equal(model.view().crashes, 2, 'the dog arrives in lane 2 at 6.7 seconds');
  assert.equal(model.pause(), true);
  const elapsed = model.view().elapsed;
  assert.equal(model.advance(500), false);
  assert.equal(model.view().elapsed, elapsed);
  assert.equal(model.resume(), true);
  model.restart();
  assert.equal(model.view().elapsed, 0);
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().lane, 1);
});

test('invalid deltas and very late clock jumps do not freeze the route', () => {
  const model = M.create();
  for (const delta of [0, -1, 60001, NaN, Infinity]) assert.equal(model.advance(delta), false);
  model.advance(50000);
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().misses, 3);
});

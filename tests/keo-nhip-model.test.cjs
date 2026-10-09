const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/keo-nhip-model.js');

function start(seed = 41) {
  const model = M.create({ seed });
  assert.equal(model.start(), true);
  return model;
}

function cueTime(model) {
  const cue = model.view().cue;
  model.advance(Math.max(0, cue.time - model.view().time));
  return cue;
}

function winRound(model) {
  while (model.view().status === 'playing') {
    const cue = cueTime(model);
    if (cue.kind === 'rest') model.advance(M.LATE_WINDOW + 0.01);
    else assert.equal(model.press(cue.side).grade, 'perfect');
  }
  assert.ok(['round-won', 'won'].includes(model.view().status));
}

function loseRound(model) {
  while (model.view().status === 'playing') {
    const cue = model.view().cue;
    model.advance(cue.time + M.LATE_WINDOW + 0.01 - model.view().time);
  }
  assert.ok(['round-lost', 'lost'].includes(model.view().status));
}

test('new match has original rhythm cues, center mark, readable start state, and best-of-three rules', () => {
  const model = M.create({ seed: 41 }), view = model.view();
  assert.equal(view.status, 'ready'); assert.equal(view.round, 1);
  assert.equal(view.wins, 0); assert.equal(view.losses, 0);
  assert.equal(view.position, 0); assert.equal(view.cueCount, 12);
  assert.equal(view.cue.kind, 'step'); assert.equal(view.cue.side, 'left');
  assert.equal(view.cue.time, M.FIRST_CUE);
  assert.equal(model.press('left').accepted, false, 'the player must start the pull first');
  assert.equal(model.pause(), false, 'ready state cannot be paused');
});

test('seeded rival pull cues are deterministic and round strength rises predictably', () => {
  const a = start(1234), b = start(1234), c = start(1235);
  assert.equal(a.view().cue.rivalPull, b.view().cue.rivalPull);
  assert.notEqual(a.view().cue.rivalPull, c.view().cue.rivalPull);
  const firstPull = a.view().cue.rivalPull;
  winRound(a); assert.equal(a.nextRound(), true); a.start();
  assert.ok(a.view().cue.rivalPull > firstPull, 'later round uses the stronger deterministic rival profile');
});

test('on-beat alternating steps increase pull and combo; wrong foot adds fatigue and breaks it', () => {
  const model = start();
  const first = cueTime(model);
  assert.equal(model.press('left').grade, 'perfect');
  assert.equal(model.view().combo, 1);
  assert.ok(model.view().position > 0);
  assert.equal(cueTime(model).side, 'right');
  assert.equal(model.press('left').grade, 'wrong-side');
  assert.equal(model.view().combo, 0);
  assert.ok(model.view().fatigue > 0);
  assert.equal(model.view().misses, 1);
  assert.equal(first.index, 0);
});

test('off-beat input is ignored; rest cues recover fatigue and stepping on rest is penalized', () => {
  const model = start();
  assert.equal(model.press('left').grade, 'early');
  assert.equal(model.view().beatIndex, 0);
  for (let i = 0; i < 4; i++) {
    const cue = cueTime(model);
    assert.equal(model.press(cue.side).accepted, true);
  }
  const rest = cueTime(model);
  assert.equal(rest.kind, 'rest');
  const before = model.view().fatigue;
  assert.equal(model.press('left').grade, 'overstep');
  assert.ok(model.view().fatigue > before);
  assert.equal(model.view().misses, 1);

  while (model.view().status === 'playing' && model.view().cue.index < 9) {
    const cue = model.view().cue;
    model.advance(cue.time + M.LATE_WINDOW + 0.01 - model.view().time);
  }
  const recoveryCue = model.view().cue;
  assert.equal(recoveryCue.kind, 'rest');
  const tired = model.view().fatigue;
  model.advance(M.LATE_WINDOW + 0.01);
  assert.ok(model.view().fatigue <= tired);
  assert.ok(model.view().rests >= 1);
});

test('best-of-three can end early at two wins and replay resets the complete match', () => {
  const model = start(41);
  winRound(model);
  assert.equal(model.view().wins, 1); assert.equal(model.view().status, 'round-won');
  assert.equal(model.nextRound(), true); assert.equal(model.view().status, 'ready');
  assert.equal(model.view().round, 2); model.start(); winRound(model);
  assert.equal(model.view().status, 'won');
  assert.equal(model.view().wins, 2); assert.equal(model.view().rounds.length, 2);
  assert.equal(model.nextRound(), false);
  model.restart();
  assert.equal(model.view().status, 'ready'); assert.equal(model.view().round, 1);
  assert.equal(model.view().wins, 0); assert.equal(model.view().losses, 0);
  assert.equal(model.view().position, 0); assert.equal(model.view().rounds.length, 0);
});

test('missed cues can lose two rounds; terminal input and pause cannot alter the result', () => {
  const model = start(72);
  loseRound(model);
  assert.equal(model.view().losses, 1); assert.equal(model.nextRound(), true);
  model.start(); loseRound(model);
  const result = model.view();
  assert.equal(result.status, 'lost'); assert.equal(result.losses, 2);
  assert.equal(model.pause(), false); assert.equal(model.press('left').accepted, false);
  assert.deepEqual(model.view(), result);
});

test('pause/resume preserves the cue clock and marker; restart returns to the center', () => {
  const model = start();
  model.advance(0.7); const before = model.view();
  assert.equal(model.pause(), true);
  assert.equal(model.advance(5).time, before.time);
  assert.equal(model.press('left').accepted, false);
  assert.equal(model.resume(), true);
  model.advance(0.2);
  assert.ok(model.view().time > before.time);
  model.restart();
  assert.equal(model.view().position, 0); assert.equal(model.view().time, 0);
  assert.equal(model.view().status, 'ready');
});

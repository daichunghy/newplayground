// Pure rules and optimal-hint checks; these are not visual/device acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/thap-ba-coc-model.js');

test('campaign is staged from three through six disks with the classical par', () => {
  assert.deepEqual(M.STAGES.map(stage => stage.disks), [3, 4, 5, 6]);
  assert.deepEqual(M.STAGES.map(stage => M.optimalMoves(stage.disks)), [7, 15, 31, 63]);
  assert.equal(M.create(-1), null); assert.equal(M.create(M.STAGES.length), null);
});

test('fresh stacks are ordered largest to smallest and only top disks can move', () => {
  const game = M.create(0), before = game.serialize();
  assert.deepEqual(game.view().pegs, [[3, 2, 1], [], []]);
  for (const move of [[0, 0], [1, 2], [-1, 2], [3, 1], [0, 3]]) {
    assert.equal(game.move(...move).ok, false);
    assert.deepEqual(game.serialize(), before);
  }
  assert.equal(game.move(0, 2).disk, 1);
  assert.equal(game.move(0, 2).reason, 'larger-on-smaller');
  assert.deepEqual(game.view().pegs, [[3, 2], [], [1]]);
});

test('hints finish each stage in the exact classical minimum and moves stop after the win', () => {
  for (let stage = 0; stage < M.STAGES.length; stage++) {
    const game = M.create(stage), par = M.optimalMoves(M.STAGES[stage].disks);
    let count = 0;
    while (game.view().status === 'playing' && count <= par) {
      const hint = game.hint(); assert.ok(hint, `stage ${stage + 1} should have a next move`);
      const result = game.move(hint.from, hint.to);
      assert.equal(result.ok, true); assert.equal(result.disk, hint.disk); count++;
    }
    assert.equal(count, par); assert.equal(game.view().status, 'won'); assert.equal(game.view().moves, par);
    assert.equal(game.hint(), null); assert.equal(game.move(2, 0).reason, 'won');
    assert.deepEqual(game.view().pegs, [[], [], Array.from({ length: M.STAGES[stage].disks }, (_, i) => M.STAGES[stage].disks - i)]);
  }
});

test('undo restores the previous legal position and remains available after a win', () => {
  const game = M.create(0); const initial = game.serialize();
  const step = game.hint(); game.move(step.from, step.to); const once = game.serialize();
  assert.equal(game.undo(), true); assert.deepEqual(game.serialize(), initial);
  assert.equal(game.undo(), false);
  for (let i = 0; i < 7; i++) { const hint = game.hint(); game.move(hint.from, hint.to); }
  assert.equal(game.view().status, 'won'); assert.equal(game.undo(), true);
  assert.equal(game.view().status, 'playing'); assert.equal(game.view().moves, 6);
  assert.ok(M.restore(once));
});

test('validated save state resumes exactly and malformed/replayed configurations are rejected', () => {
  const game = M.create(2);
  for (let i = 0; i < 12; i++) { const hint = game.hint(); game.move(hint.from, hint.to); }
  const saved = game.serialize(); assert.equal(M.validSave(saved), true);
  assert.deepEqual(M.restore(saved).serialize(), saved);
  assert.equal(M.restore({ ...saved, stageIndex: 1 }), null);
  assert.equal(M.restore({ ...saved, pegs: [[5, 2, 4, 1], [3], []] }), null);
  assert.equal(M.restore({ ...saved, history: [...saved.history, saved.history[0]] }), null);
  assert.equal(M.restore({ ...saved, moves: 0 }), null);
  assert.equal(M.restore(null), null);
});

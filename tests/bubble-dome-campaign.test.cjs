const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/bubble-dome-model.js');
const C = require('../scripts/games/bubble-dome-campaign.js');

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    get(key) { return values.get(key); }
  };
}
function settle(model) {
  for (let frame = 0; frame < 1200 && model.view().projectile; frame++) model.tick(1 / 60);
  return model.view();
}
function winSelected(campaign, number) {
  assert.equal(campaign.selectStage(number), true);
  const stage = C.stage(number);
  const model = campaign.getModel();
  for (const angle of stage.witnessAngles) {
    assert.equal(model.fire(angle), true);
    settle(model);
  }
  assert.equal(model.view().status, 'won');
  campaign.recordWin();
  return model.view();
}

test('all six authored boards have distinct executable witnesses and intentional drop checkpoints', () => {
  assert.equal(C.COUNT, 6);
  const signatures = new Set();
  for (let number = 1; number <= C.COUNT; number++) {
    const stage = C.stage(number);
    assert.ok(stage.initial.length >= 2);
    assert.ok(stage.queue.length > stage.witnessAngles.length, `stage ${number} has recovery shots`);
    assert.equal(new Set(stage.initial.map(b => `${b.row}:${b.col}`)).size, stage.initial.length);
    signatures.add(stage.initial.map(b => `${b.row}:${b.col}:${b.color}`).join('|'));
    const proof = C.replayWitness(M, number);
    assert.equal(proof.ok, true, `stage ${number} witness: ${proof.reason || proof.final.status}`);
    assert.deepEqual(proof.checkpoints.map(view => view.bubbles.length), stage.checkpointCounts);
    assert.equal(proof.final.shotsUsed, stage.witnessAngles.length);
    assert.equal(proof.final.status, 'won');
    assert.equal(proof.final.bubbles.length, 0);
    assert.ok(proof.final.score > 0);
  }
  assert.equal(signatures.size, C.COUNT, 'every level uses its own authored bubble layout');

  const dropProof = C.replayWitness(M, 3);
  assert.deepEqual(dropProof.checkpoints[0].bubbles.map(b => `${b.color}@${b.row},${b.col}`), ['rose@0,0', 'rose@0,1']);
  assert.equal(dropProof.checkpoints[0].lastClear.dropped, 3, 'the blue and mint support branch falls away');
  const threeSingles = C.replayWitness(M, 5);
  assert.deepEqual(threeSingles.checkpoints.map(view => view.lastClear.popped), [0, 3, 0, 3, 0, 3],
    'the three isolated bubbles each need a same-color partner and a completing shot');
  assert.equal(threeSingles.final.shotsUsed, 6);
  const bankAndBranch = C.replayWitness(M, 6);
  assert.deepEqual(bankAndBranch.checkpoints.map(view => view.lastClear.popped), [3, 3, 0, 3]);
  assert.equal(bankAndBranch.checkpoints[0].wallBounce, true, 'the amber target is banked off the left wall');
  assert.equal(bankAndBranch.checkpoints[1].wallBounce, true, 'the rose support is reached with a second bank shot');
  assert.equal(bankAndBranch.checkpoints[1].lastClear.dropped, 3, 'clearing the rose anchor drops the blue and mint branch');
  assert.equal(bankAndBranch.checkpoints[2].lastClear.popped, 0, 'the first mint shot builds a match beside the lone target');
  assert.equal(bankAndBranch.final.shotsUsed, 4);
  assert.equal(bankAndBranch.final.shotsLeft, 2, 'two recovery shots remain after the authored clear');
});

test('stages unlock in order, can be replayed, and preserve per-stage bests across reloads', () => {
  const storage = memoryStorage();
  const campaign = C.create({ model: M, storage });
  assert.equal(campaign.view().unlockedStage, 1);
  assert.equal(campaign.selectStage(2), false);
  assert.equal(campaign.recordWin(), false, 'an unearned round cannot unlock a stage');
  const opening = campaign.getModel().view();

  const first = winSelected(campaign, 1);
  assert.equal(campaign.view().unlockedStage, 2);
  assert.deepEqual(campaign.view().completedStages, [1]);
  assert.equal(campaign.view().stages[1].unlocked, true);
  assert.equal(campaign.recordWin(), false, 'rendering a completed round again does not change progress');
  assert.deepEqual(campaign.view().best, { score: first.score, shotsUsed: 1 });

  assert.equal(campaign.selectStage(1), true);
  campaign.restart();
  assert.deepEqual(campaign.getModel().view(), opening, 'replay restores the same authored start');
  winSelected(campaign, 2);
  assert.equal(campaign.view().unlockedStage, 3);
  assert.equal(campaign.selectStage(4), false);
  winSelected(campaign, 3);
  winSelected(campaign, 4);
  winSelected(campaign, 5);
  winSelected(campaign, 6);

  const raw = storage.get(C.STORAGE_KEY);
  const saved = JSON.parse(raw);
  assert.equal(saved.version, C.SCHEMA_VERSION);
  assert.equal(saved.game, 'bi-vom');
  assert.equal(saved.unlockedStage, C.COUNT);
  assert.deepEqual(saved.completedStages, [1, 2, 3, 4, 5, 6]);
  assert.equal(Object.keys(saved.bestByStage).length, C.COUNT);
  assert.equal(C.validProgress(saved), true);

  const reloaded = C.create({ model: M, storage });
  assert.equal(reloaded.view().unlockedStage, C.COUNT);
  assert.deepEqual(reloaded.view().completedStages, saved.completedStages);
  assert.deepEqual(reloaded.view().best, saved.bestByStage['1']);
  assert.equal(reloaded.selectStage(6), true);
  const finalStage = C.stage(6);
  assert.deepEqual(reloaded.getModel().view(), M.create({
    seed: `bi-vom-${finalStage.id}-v1`, initial: finalStage.initial, queue: finalStage.queue
  }).view(), 'the final stage reopens at its authored start');
});

test('corrupt, future-schema, and unavailable storage remain playable without destroying data', () => {
  const corruptRaw = '{not-json';
  const corruptStorage = memoryStorage({ [C.STORAGE_KEY]: corruptRaw });
  const recovered = C.create({ model: M, storage: corruptStorage });
  assert.equal(corruptStorage.get(C.BACKUP_KEY), corruptRaw);
  assert.match(recovered.view().saveMessage, /đã được giữ riêng/);
  winSelected(recovered, 1);
  assert.equal(JSON.parse(corruptStorage.get(C.STORAGE_KEY)).unlockedStage, 2);
  assert.equal(corruptStorage.get(C.BACKUP_KEY), corruptRaw);

  const futureRaw = JSON.stringify({ version: 99, game: 'bi-vom', unlockedStage: 5, note: 'keep' });
  const futureStorage = memoryStorage({ [C.STORAGE_KEY]: futureRaw });
  const future = C.create({ model: M, storage: futureStorage });
  assert.equal(future.view().unlockedStage, 1);
  assert.match(future.view().saveMessage, /mới hơn được giữ nguyên/);
  winSelected(future, 1);
  assert.equal(future.view().unlockedStage, 2, 'the current session still progresses');
  assert.equal(futureStorage.get(C.STORAGE_KEY), futureRaw, 'a newer save is never overwritten');

  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); }
  };
  const broken = C.create({ model: M, storage: brokenStorage });
  winSelected(broken, 1);
  assert.equal(broken.view().unlockedStage, 2);
  assert.match(broken.view().saveMessage, /vẫn chơi tiếp được/);

  const quotaStorage = { getItem() { return null; }, setItem() { throw new Error('quota'); } };
  const quota = C.create({ model: M, storage: quotaStorage });
  winSelected(quota, 1);
  assert.equal(quota.view().unlockedStage, 2);
  assert.match(quota.view().saveMessage, /Chưa lưu được/);

  const memoryOnly = C.create({ model: M, storage: null });
  assert.match(memoryOnly.view().saveMessage, /chỉ giữ trong lượt này/);
  winSelected(memoryOnly, 1);
  assert.equal(memoryOnly.view().unlockedStage, 2);
});

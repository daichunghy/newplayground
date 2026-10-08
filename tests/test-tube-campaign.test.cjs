const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/test-tube-model.js');
const C = require('../scripts/games/test-tube-campaign.js');

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    get(key) { return values.get(key); }
  };
}

function rotateRight(model) { assert.equal(model.rotate(), true); }
function beatHorizontal(campaign) {
  const model = campaign.getModel();
  rotateRight(model);
  assert.equal(model.hardDrop(), true);
  campaign.recordWin();
  return model.view();
}
function beatVertical(campaign) {
  const model = campaign.getModel();
  rotateRight(model);
  rotateRight(model);
  assert.equal(model.hardDrop(), true);
  campaign.recordWin();
  return model.view();
}

test('each authored bottle has a legal clear that demonstrates its teaching beat', () => {
  const one = C.create({ model: M, storage: null });
  const horizontal = beatHorizontal(one);
  assert.equal(horizontal.status, 'won');
  assert.equal(horizontal.lastResolution.cascades, 1);
  assert.equal(horizontal.lastResolution.viruses, 3);

  const two = C.create({ model: M, storage: null });
  beatHorizontal(two);
  assert.equal(two.selectBottle(2), true);
  const vertical = beatVertical(two);
  assert.equal(vertical.status, 'won');
  assert.equal(vertical.lastResolution.cascades, 1);
  assert.equal(vertical.lastResolution.viruses, 3);

  const three = C.create({ model: M, storage: null });
  beatHorizontal(three);
  assert.equal(three.selectBottle(2), true);
  beatVertical(three);
  assert.equal(three.selectBottle(3), true);
  const falling = three.getModel();
  rotateRight(falling);
  assert.equal(falling.hardDrop(), true);
  let view = falling.view();
  assert.equal(view.status, 'playing');
  assert.equal(view.lastResolution.cascades, 1);
  assert.equal(view.board[15][4]?.color, 'rose', 'the unmatched half falls below the cleared row');
  assert.equal(view.board[15][3]?.kind, 'virus', 'the support germ remains in place');
  assert.equal(view.virusesLeft, 2);
  rotateRight(falling);
  assert.equal(falling.move(-1), true);
  assert.equal(falling.move(-1), true);
  assert.equal(falling.move(-1), true);
  assert.equal(falling.hardDrop(), true);
  view = falling.view();
  assert.equal(view.status, 'won');
  assert.equal(view.lastResolution.viruses, 2);

  const four = C.create({ model: M, storage: null });
  beatHorizontal(four);
  assert.equal(four.selectBottle(2), true);
  beatVertical(four);
  assert.equal(four.selectBottle(3), true);
  const stageThree = four.getModel();
  rotateRight(stageThree);
  stageThree.hardDrop();
  rotateRight(stageThree);
  stageThree.move(-1); stageThree.move(-1); stageThree.move(-1);
  stageThree.hardDrop();
  four.recordWin();
  assert.equal(four.selectBottle(4), true);
  const cascade = four.getModel();
  rotateRight(cascade);
  assert.equal(cascade.hardDrop(), true);
  view = cascade.view();
  assert.equal(view.status, 'won');
  assert.equal(view.lastResolution.cascades, 2, 'the falling half creates an automatic second clear');
  assert.equal(view.lastResolution.viruses, 7);
});

test('mixed route unlocks in order, refuses locked bottles, and replay stays deterministic after reload', () => {
  const storage = memoryStorage();
  const campaign = C.create({ model: M, storage });
  const opening = campaign.getModel().view();
  beatHorizontal(campaign);
  assert.equal(campaign.view().unlockedBottle, 2);
  assert.equal(campaign.selectBottle(4), false);
  assert.equal(campaign.selectBottle(2), true);
  beatVertical(campaign);
  assert.equal(campaign.view().unlockedBottle, 3);
  assert.equal(campaign.selectBottle(1), true);
  assert.deepEqual(campaign.getModel().view(), opening, 'replay restores the authored board and queue');
  const saved = JSON.parse(storage.get(C.STORAGE_KEY));
  assert.deepEqual(saved, { version: 1, unlockedBottle: 3 });
  const reloaded = C.create({ model: M, storage });
  assert.equal(reloaded.view().unlockedBottle, 3);
  assert.equal(reloaded.view().selectedBottle, 1);
  assert.equal(reloaded.selectBottle(3), true);
  const expectedStageThree = C.create({ model: M, storage: null });
  beatHorizontal(expectedStageThree);
  expectedStageThree.selectBottle(2); beatVertical(expectedStageThree);
  expectedStageThree.selectBottle(3);
  assert.deepEqual(reloaded.getModel().view(), expectedStageThree.getModel().view(), 'every bottle reopens at the same authored start');
});

test('malformed saves are backed up; future schemas and failed writes never block play', () => {
  const malformed = memoryStorage({ [C.STORAGE_KEY]: '{not-json' });
  const recovered = C.create({ model: M, storage: malformed });
  assert.equal(recovered.view().unlockedBottle, 1);
  assert.equal(malformed.get(C.BACKUP_KEY), '{not-json');
  beatHorizontal(recovered);
  assert.equal(recovered.view().unlockedBottle, 2);

  const futureRaw = JSON.stringify({ version: 99, unlockedBottle: 4, extra: 'keep' });
  const futureStorage = memoryStorage({ [C.STORAGE_KEY]: futureRaw });
  const future = C.create({ model: M, storage: futureStorage });
  assert.equal(future.view().unlockedBottle, 1);
  assert.match(future.view().saveMessage, /được giữ nguyên/);
  beatHorizontal(future);
  assert.equal(future.view().unlockedBottle, 2);
  assert.equal(futureStorage.get(C.STORAGE_KEY), futureRaw);

  const failingStorage = {
    getItem() { return null; },
    setItem() { throw new Error('quota'); }
  };
  const failedSave = C.create({ model: M, storage: failingStorage });
  beatHorizontal(failedSave);
  assert.equal(failedSave.view().unlockedBottle, 2, 'runtime unlock works even when persistence fails');
  assert.match(failedSave.view().saveMessage, /vẫn chơi tiếp được/);

  const failedRead = C.create({ model: M, storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } });
  assert.equal(beatHorizontal(failedRead).status, 'won');
  assert.equal(failedRead.view().unlockedBottle, 2, 'read failure also leaves the campaign playable');
});

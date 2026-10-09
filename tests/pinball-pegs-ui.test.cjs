const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness } = require('./support/browser-harness.cjs');

function mount(options = {}, storage = new Map()) {
  const h = harness({ loadEngines: false, loadApp: false, storage });
  for (const file of ['pinball-pegs-model.js', 'pinball-pegs.js']) {
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, `../scripts/games/${file}`), 'utf8'), h.context, { filename: file });
  }
  const session = h.window.NP_GameSession.start();
  const host = h.document.createElement('div');
  const game = h.window.NP_PinballPegs.mount(host, session, options);
  return { h, host, session, game };
}

const SAVE_KEY = 'np_bat_chot_campaign_v1';

function playShot(h, model, angle) {
  assert.equal(model.fire(angle), true);
  for (let tick = 0; tick < 900 && model.view().projectile; tick++) model.tick(1 / 120);
  h.frame();
  assert.equal(model.view().projectile, null, 'shot settles before the next aim');
}

test('mount starts directly with compact orange-target goal and accessible controls', () => {
  const { host, session, game } = mount({ seed: 'ui-peg' });
  assert.match(host.innerHTML, /<h2>Bật Chốt<\/h2>/);
  assert.match(host.innerHTML, /role="status" aria-live="polite"/);
  assert.match(host.querySelector('#pcTargets').textContent, /25 chốt cam/);
  assert.ok(host.querySelector('#pcFire'));
  assert.ok(host.querySelector('#pcLeft'));
  assert.ok(host.querySelector('#pcRight'));
  assert.equal(game.getModel().view().ballsLeft, 10);
  session.stop();
  assert.equal(host.classList.contains('pc-host'), false);
});

test('touch aim, keyboard aim and the launch button share the same model and frame loop', () => {
  const { h, host, session, game } = mount({ seed: 'ui-input' });
  const board = host.querySelector('#pcBoard');
  board.dispatch('pointermove', { clientX: 430, clientY: 180, pointerType: 'touch' });
  assert.ok(game.getModel().view().aim > 0);
  host.dispatch('keydown', { key: 'ArrowLeft', repeat: false });
  assert.ok(game.getModel().view().aim < 68);
  host.querySelector('#pcFire').click();
  assert.ok(game.getModel().view().projectile);
  assert.equal(game.getModel().view().ballsLeft, 9);
  assert.ok(h.frames.size > 0);
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.dispatch('visibilitychange');
  assert.ok(h.frames.size > 0);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);
});

test('an orange peg can clear the round, then restart restores pegs and balls', () => {
  const { h, host, session, game } = mount({ seed: 'ui-win', pegs: [{ id: 'last-orange', x: 210, y: 160, color: 'orange' }], balls: 1, bucketX: 210, bucketSpeed: 0 });
  host.querySelector('#pcFire').click();
  for (let i = 0; i < 240 && h.frames.size; i++) h.frame();
  assert.equal(game.getModel().view().status, 'won');
  assert.match(host.querySelector('#pcStatus').textContent, /Dọn hết/);
  assert.equal(h.frames.size, 0);
  host.querySelector('#pcRestart').click();
  assert.equal(game.getModel().view().status, 'playing');
  assert.equal(game.getModel().view().orangeLeft, 1);
  assert.equal(game.getModel().view().ballsLeft, 1);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);
});

test('the five-stage campaign starts at the first board and keeps later boards locked', () => {
  const { host, session, game } = mount();
  assert.equal(host.querySelector('#pcStages').hidden, false);
  assert.equal(host.querySelector('#pcStageName').textContent, 'Chặng 1/5 · Vòm Nắng');
  assert.equal(game.getModel().view().orangeLeft, 16);
  assert.equal(game.getModel().view().ballsLeft, 10);
  assert.equal(host.querySelector('#pcStage0').disabled, false);
  assert.equal(host.querySelector('#pcStage1').disabled, true);
  assert.equal(host.querySelector('#pcNext').hidden, true);
  session.stop();
});

test('a clear saves score and unlocks replayable stages, then resumes the last unlocked stage', () => {
  const storage = new Map();
  const { h, host, session, game } = mount({}, storage);
  for (const angle of [-40, -49, 9]) playShot(h, game.getModel(), angle);
  assert.equal(game.getModel().view().status, 'won');
  assert.equal(host.querySelector('#pcNext').hidden, false);
  const saved = JSON.parse(storage.get(SAVE_KEY));
  assert.equal(saved.version, 1);
  assert.equal(saved.unlockedStage, 1);
  assert.ok(saved.bestScores[0] > 0);
  assert.equal(saved.bestShots[0], 3);
  assert.match(host.querySelector('#pcBest').textContent, /Kỷ lục .* · ít nhất 3 bi/);
  assert.equal(host.querySelector('#pcStage1').disabled, false);
  host.querySelector('#pcNext').click();
  assert.equal(host.querySelector('#pcStageName').textContent, 'Chặng 2/5 · Hai Mỏm');
  assert.equal(host.querySelector('#pcStage1').getAttribute('aria-current'), 'step');
  host.querySelector('#pcStage0').click();
  assert.equal(host.querySelector('#pcStageName').textContent, 'Chặng 1/5 · Vòm Nắng');
  assert.equal(game.getModel().view().orangeLeft, 16);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);

  const resumed = mount({}, storage);
  assert.equal(resumed.host.querySelector('#pcStageName').textContent, 'Chặng 2/5 · Hai Mỏm');
  assert.equal(resumed.game.getModel().view().orangeLeft, 16);
  resumed.session.stop();
});

test('a malformed save is copied for recovery and a future save stays untouched', () => {
  const malformed = '{broken save';
  const storage = new Map([[SAVE_KEY, malformed]]);
  const recovered = mount({}, storage);
  assert.equal(storage.get(SAVE_KEY), malformed);
  assert.equal(storage.get(`${SAVE_KEY}_recovery`), malformed);
  assert.match(recovered.host.querySelector('#pcSaveNote').textContent, /Bản lưu lỗi/);
  recovered.session.stop();

  const future = JSON.stringify({ version: 7, unlockedStage: 4, bestScores: [], bestShots: [] });
  const futureStorage = new Map([[SAVE_KEY, future]]);
  const safe = mount({}, futureStorage);
  assert.equal(futureStorage.get(SAVE_KEY), future);
  assert.equal(futureStorage.has(`${SAVE_KEY}_recovery`), false);
  assert.match(safe.host.querySelector('#pcSaveNote').textContent, /mới hơn/);
  assert.equal(safe.game.getModel().view().status, 'playing');
  safe.session.stop();
});

test('a save-write failure does not block winning or unlocking the next board', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const { h, host, session, game } = mount({ campaign: true, storage });
  for (const angle of [-40, -49, 9]) playShot(h, game.getModel(), angle);
  assert.equal(game.getModel().view().status, 'won');
  assert.equal(host.querySelector('#pcStage1').disabled, false);
  assert.match(host.querySelector('#pcSaveNote').textContent, /chỉ lưu trong lượt này/);
  session.stop();
  assert.equal(h.errors.length, 0);
});

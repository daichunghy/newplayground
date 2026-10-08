const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness } = require('./support/browser-harness.cjs');

function mount(options = {}, storage = new Map()) {
  const h = harness({ loadEngines: false, loadApp: false, storage });
  const baseDocumentListeners = h.document.listenerCount();
  for (const file of ['lemonade-stand-model.js', 'lemonade-stand.js']) {
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, `../scripts/games/${file}`), 'utf8'), h.context, { filename: file });
  }
  const session = h.window.NP_GameSession.start();
  const host = h.document.createElement('div');
  const game = h.window.NP_LemonadeStand.mount(host, session, options);
  return { h, host, session, game, baseDocumentListeners };
}

const SAVE_KEY = 'np_quay_nuoc_chanh_campaign_v1';
const plan = { sunny: ['lsTart', 15], mild: ['lsBalanced', 13], rain: ['lsSweet', 12] };

function adaptiveCampaignDay(h, host, model) {
  for (let frame = 0; frame < 460 && model.view().status === 'playing'; frame++) {
    const view = model.view();
    const [recipeButton, price] = plan[view.weather];
    host.querySelector(`#${recipeButton}`).click();
    while (model.view().price < price) host.querySelector('#lsPriceUp').click();
    while (model.view().price > price) host.querySelector('#lsPriceDown').click();
    h.advance(100); h.frame();
  }
  assert.notEqual(model.view().status, 'playing', 'the shift reaches a result before its 45-second limit');
}

test('mount opens directly into a compact one-shift game with accessible, touch-sized controls', () => {
  const { host, session, game } = mount({ seed: 'ui-open' });
  assert.match(host.innerHTML, /<h2>Quầy Nước Chanh<\/h2>/);
  assert.match(host.innerHTML, /role="status" aria-live="polite"/);
  assert.match(host.innerHTML, /Chanh · đường · đá/);
  assert.doesNotMatch(host.innerHTML, /P tạm dừng|hướng dẫn|nâng cấp|kho hàng/i);
  assert.equal(host.querySelector('#lsTime').textContent, '45s');
  assert.equal(host.querySelector('#lsGoalLabel').textContent, 'Mục tiêu 120');
  assert.equal(host.querySelector('#lsPriceLabel').textContent, 'Giá bán · vốn 5');
  assert.match(host.innerHTML, /Chanh · đường · đá/);
  assert.match(host.innerHTML, /3 · 2 · 2/);
  assert.equal(host.querySelector('#lsResult').hidden, true);
  assert.equal(game.getModel().view().status, 'playing');
  assert.equal(host.querySelector('#lsBalanced').getAttribute('aria-pressed'), 'true');
  const css = fs.readFileSync(path.resolve(__dirname, '../scripts/games/lemonade-stand.css'), 'utf8');
  assert.match(css, /\.ls-button\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
  assert.match(css, /\.ls-recipe\s*\{[^}]*min-height:\s*48px/s);
  session.stop();
  assert.equal(host.classList.contains('ls-host'), false);
});

test('buttons and keyboard change one shared model, and replay works before the shift ends', () => {
  const { h, host, session, game } = mount({ seed: 'ui-input', weatherOrder: ['sunny', 'mild', 'rain'] });
  const model = game.getModel();
  host.querySelector('#lsPriceDown').click();
  assert.equal(model.view().price, 11);
  host.querySelector('#lsSweet').click();
  assert.equal(model.view().recipe, 'sweet');
  assert.equal(host.querySelector('#lsPriceLabel').textContent, 'Giá bán · vốn 6');
  assert.equal(host.querySelector('#lsSweet').getAttribute('aria-pressed'), 'true');
  host.dispatch('keydown', { key: 'ArrowRight', repeat: false });
  assert.equal(model.view().price, 12);
  host.dispatch('keydown', { key: '1', repeat: false });
  assert.equal(model.view().recipe, 'tart');
  host.dispatch('keydown', { key: '3', repeat: true });
  assert.equal(model.view().recipe, 'tart', 'held key repeat does not cycle recipes');
  const beforePauseKey = h.frames.size;
  host.dispatch('keydown', { key: 'p', repeat: false });
  assert.equal(h.frames.size, beforePauseKey, 'there is no hidden pause key that can freeze the shift');
  for (let i = 0; i < 12; i++) { h.advance(1000); h.frame(); }
  assert.ok(model.view().elapsed > 0);
  host.querySelector('#lsRestart').click();
  assert.equal(model.view().elapsed, 0);
  assert.equal(model.view().recipe, 'balanced');
  assert.equal(model.view().price, 12);
  assert.equal(host.querySelector('#lsRestart').disabled, false);
  assert.equal(h.frames.size, 1, 'restart does not create duplicate animation loops');
  session.stop();
  assert.equal(h.frames.size, 0);
});

test('blur and hidden-page interruptions preserve elapsed time and resume without a duplicate loop', () => {
  const { h, host, session, game, baseDocumentListeners } = mount({ seed: 'ui-lifecycle' });
  h.frame();
  for (let i = 0; i < 12; i++) { h.advance(100); h.frame(); }
  const elapsed = game.getModel().view().elapsed;
  assert.ok(elapsed >= .9 && elapsed <= 1.1);
  h.window.dispatch('blur');
  assert.equal(h.frames.size, 0);
  h.advance(3000); h.frame();
  assert.equal(game.getModel().view().elapsed, elapsed);
  h.window.dispatch('focus');
  assert.equal(h.frames.size, 1);
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 1);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);
  assert.equal(h.document.listenerCount(), baseDocumentListeners);
  assert.equal(host.classList.contains('ls-host'), false);
});

test('an adaptive shift reports the result once and replay opens a fresh shift', () => {
  const { h, host, session, game } = mount({ seed: 1, weatherOrder: ['sunny', 'mild', 'rain'] });
  const choices = { sunny: ['lsTart', 15], mild: ['lsBalanced', 13], rain: ['lsSweet', 12] };
  h.frame();
  for (let seconds = 0; seconds < 45 && game.getModel().view().status === 'playing'; seconds++) {
    const v = game.getModel().view();
    const [recipeButton, price] = choices[v.weather];
    host.querySelector(`#${recipeButton}`).click();
    while (game.getModel().view().price < price) host.querySelector('#lsPriceUp').click();
    while (game.getModel().view().price > price) host.querySelector('#lsPriceDown').click();
    for (let frame = 0; frame < 10 && game.getModel().view().status === 'playing'; frame++) {
      h.advance(1000); h.frame();
    }
  }
  assert.equal(game.getModel().view().status, 'won');
  assert.equal(host.querySelector('#lsResult').hidden, false);
  assert.equal(host.querySelector('#lsGoalProgress').value, 120);
  assert.match(host.querySelector('#lsResultTitle').textContent, /đạt mục tiêu/i);
  assert.equal(host.querySelector('#lsPriceUp').disabled, true);
  host.querySelector('#lsRestart').click();
  assert.equal(game.getModel().view().status, 'playing');
  assert.equal(host.querySelector('#lsResult').hidden, true);
  assert.equal(host.querySelector('#lsTime').textContent, '45s');
  session.stop();
  assert.equal(h.frames.size, 0);
});

test('the five-day campaign starts with the first short shift and keeps later days locked', () => {
  const { host, session, game } = mount({ campaign: true, seed: 'campaign-open' });
  assert.equal(host.querySelector('#lsDays').hidden, false);
  assert.equal(host.querySelector('#lsDayName').textContent, 'Ngày 1/5 · Mở Quầy');
  assert.equal(host.querySelector('#lsGoalLabel').textContent, 'Mục tiêu 100');
  assert.equal(game.getModel().view().remaining, 45);
  assert.equal(host.querySelector('#lsDay0').disabled, false);
  assert.equal(host.querySelector('#lsDay1').disabled, true);
  assert.equal(host.querySelector('#lsNext').hidden, true);
  session.stop();
});

test('winning a day saves the record, unlocks the next day and resumes after reload', () => {
  const storage = new Map();
  const { h, host, session, game } = mount({ campaign: true, seed: 1 }, storage);
  h.frame();
  adaptiveCampaignDay(h, host, game.getModel());
  assert.equal(game.getModel().view().status, 'won');
  const saved = JSON.parse(storage.get(SAVE_KEY));
  assert.equal(saved.version, 1);
  assert.equal(saved.campaignSeed, '1');
  assert.equal(saved.unlockedDay, 1);
  assert.ok(saved.bestProfits[0] >= 100);
  assert.ok(saved.bestCups[0] > 0);
  assert.equal(host.querySelector('#lsNext').hidden, false);
  assert.equal(host.querySelector('#lsDay1').disabled, false);
  assert.match(host.querySelector('#lsBest').textContent, /Kỷ lục lãi/);
  host.querySelector('#lsNext').click();
  assert.equal(host.querySelector('#lsDayName').textContent, 'Ngày 2/5 · Mưa Trước');
  assert.equal(host.querySelector('#lsGoalLabel').textContent, 'Mục tiêu 110');
  assert.equal(host.querySelector('#lsDay1').getAttribute('aria-current'), 'step');
  host.querySelector('#lsDay0').click();
  assert.equal(host.querySelector('#lsDayName').textContent, 'Ngày 1/5 · Mở Quầy');
  assert.equal(game.getModel().view().elapsed, 0);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);

  const resumed = mount({ campaign: true }, storage);
  assert.equal(resumed.host.querySelector('#lsDayName').textContent, 'Ngày 2/5 · Mưa Trước');
  assert.equal(resumed.game.getModel().view().target, 110);
  assert.equal(resumed.game.getModel().view().seed, '1-1', 'a reload resumes the same deterministic campaign seed');
  resumed.session.stop();
});

test('malformed campaign progress is copied for recovery and future progress remains untouched', () => {
  const malformed = '{broken save';
  const storage = new Map([[SAVE_KEY, malformed]]);
  const recovered = mount({ campaign: true, seed: 'bad-save' }, storage);
  assert.equal(storage.get(SAVE_KEY), malformed);
  assert.equal(storage.get(`${SAVE_KEY}_recovery`), malformed);
  assert.match(recovered.host.querySelector('#lsSaveNote').textContent, /Bản lưu lỗi/);
  recovered.session.stop();

  const future = JSON.stringify({ version: 4, unlockedDay: 4, bestProfits: [], bestCups: [] });
  const futureStorage = new Map([[SAVE_KEY, future]]);
  const safe = mount({ campaign: true, seed: 'future-save' }, futureStorage);
  assert.equal(futureStorage.get(SAVE_KEY), future);
  assert.equal(futureStorage.has(`${SAVE_KEY}_recovery`), false);
  assert.match(safe.host.querySelector('#lsSaveNote').textContent, /mới hơn/);
  assert.equal(safe.game.getModel().view().status, 'playing');
  safe.session.stop();
});

test('a save-write failure keeps the day result and next unlock playable', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const { h, host, session, game } = mount({ campaign: true, seed: 1, storage });
  h.frame();
  adaptiveCampaignDay(h, host, game.getModel());
  assert.equal(game.getModel().view().status, 'won');
  assert.equal(host.querySelector('#lsDay1').disabled, false);
  assert.equal(host.querySelector('#lsNext').hidden, false);
  assert.match(host.querySelector('#lsSaveNote').textContent, /chỉ lưu trong lượt này/);
  session.stop();
  assert.equal(h.errors.length, 0);
});

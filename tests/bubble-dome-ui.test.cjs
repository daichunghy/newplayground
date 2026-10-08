const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness } = require('./support/browser-harness.cjs');

function mount(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../scripts/games/bubble-dome-model.js'), 'utf8'), h.context);
  vm.runInContext(require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../scripts/games/bubble-dome.js'), 'utf8'), h.context);
  const session = h.window.NP_GameSession.start();
  const host = h.document.createElement('div');
  const game = h.window.NP_BubbleDome.mount(host, session, options);
  return { h, host, session, game };
}

function finishFlight(h) {
  for (let i = 0; i < 100 && h.frames.size; i++) h.frame();
}

test('mount starts a compact original board with clear controls and accessible status', () => {
  const { host, session } = mount({ seed: 'ui-open' });
  const css = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../scripts/games/bubble-dome.css'), 'utf8');
  assert.match(host.innerHTML, /<h2>Bi Vòm<\/h2>/);
  assert.match(host.innerHTML, /role="status" aria-live="polite"/);
  assert.match(host.innerHTML, /Nhắm rồi bắn/);
  assert.ok(host.querySelector('#bvBoard'));
  assert.equal(host.querySelector('#bvFire').disabled, false);
  assert.match(css, /\.bv-stage \{ min-width: 44px; min-height: 44px;/);
  session.stop();
  assert.equal(host.classList.contains('bv-host'), false);
});

test('button and keyboard fire once, blur freezes a shot, focus resumes and clear ends the round', () => {
  const { h, host, session, game } = mount({ seed: 'ui-clear', initial: [
    { row: 0, col: 4, color: 'rose' }, { row: 0, col: 5, color: 'rose' }
  ], queue: ['rose'] });
  host.querySelector('#bvFire').click();
  assert.ok(game.getModel().view().projectile);
  assert.equal(host.querySelector('#bvFire').disabled, true);
  assert.ok(h.frames.size > 0);
  h.window.dispatch('blur');
  assert.equal(h.frames.size, 0);
  h.window.dispatch('focus');
  finishFlight(h);
  assert.equal(game.getModel().view().status, 'won');
  assert.match(host.querySelector('#bvStatus').textContent, /Dọn sạch/);
  assert.equal(h.frames.size, 0);
  session.stop();
  assert.equal(h.window.listenerCount(), 0);
});

test('hidden-tab visibility stops projectile frames and resumes them only after the tab is visible', () => {
  const { h, host, session, game } = mount({ seed: 'ui-hidden-tab' });
  host.querySelector('#bvFire').click();
  assert.ok(game.getModel().view().projectile);
  assert.equal(h.frames.size, 1);

  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.window.dispatch('focus');
  assert.equal(h.frames.size, 0, 'a focus event must not restart a hidden tab');

  h.document.hidden = false;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 1);
  session.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.listenerCount(), 0);
});

test('pointer aim, touch-sized fire and replay release stale handlers and frames', () => {
  const { h, host, session, game } = mount({ seed: 'ui-touch' });
  const board = host.querySelector('#bvBoard');
  board.dispatch('pointermove', { clientX: 440, clientY: 180, pointerType: 'touch' });
  assert.ok(game.getModel().view().aim > 0);
  board.dispatch('pointerdown', { clientX: 420, clientY: 220, pointerType: 'touch', button: 0 });
  assert.ok(game.getModel().view().projectile);
  assert.ok(h.frames.size > 0);
  host.querySelector('#bvRestart').click();
  assert.equal(game.getModel().view().projectile, null);
  assert.equal(game.getModel().view().shotsUsed, 0);
  assert.equal(h.frames.size, 0);
  session.stop();
  assert.equal(h.window.listenerCount(), 0);
});

test('arrow keys adjust aim; Space fires and repeated keydown does not spend a second shot', () => {
  const { h, host, session, game } = mount({ seed: 'ui-key', initial: [], queue: ['amber', 'blue'] });
  host.dispatch('keydown', { key: 'ArrowRight', repeat: false });
  assert.equal(game.getModel().view().aim, 4);
  host.dispatch('keydown', { key: ' ', repeat: false });
  const used = game.getModel().view().shotsUsed;
  host.dispatch('keydown', { key: ' ', repeat: true });
  assert.equal(game.getModel().view().shotsUsed, used);
  session.stop();
  assert.equal(h.frames.size, 0);
});

test('campaign exposes locked stages, unlocks after a clear, and replays authored starts', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../scripts/games/bubble-dome-model.js'), 'utf8'), h.context);
  vm.runInContext(require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../scripts/games/bubble-dome-campaign.js'), 'utf8'), h.context);
  vm.runInContext(require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../scripts/games/bubble-dome.js'), 'utf8'), h.context);
  const session = h.window.NP_GameSession.start();
  const host = h.document.createElement('div');
  const game = h.window.NP_BubbleDome.mount(host, session);
  const campaign = game.getCampaign();
  const stages = host.querySelector('#bvStages');
  assert.equal(stages.querySelectorAll('button').length, 6);
  assert.match(stages.innerHTML, /data-stage="2"[^>]*disabled/);

  const lockedButton = stages.querySelectorAll('button')[1];
  stages.dispatch('click', { target: lockedButton });
  assert.equal(campaign.view().selectedStage, 1);
  assert.equal(campaign.view().unlockedStage, 1);

  const opening = game.getModel().view();
  host.querySelector('#bvFire').click();
  finishFlight(h);
  assert.equal(game.getModel().view().status, 'won');
  assert.equal(campaign.view().unlockedStage, 2);
  assert.match(host.querySelector('#bvStatus').textContent, /đã mở chặng 2/);
  assert.doesNotMatch(stages.innerHTML, /data-stage="2"[^>]*disabled/);
  assert.match(host.querySelector('#bvBest').textContent, /Kỷ lục/);

  const stageTwo = stages.querySelectorAll('button')[1];
  stages.dispatch('click', { target: stageTwo });
  assert.equal(campaign.view().selectedStage, 2);
  host.querySelector('#bvRestart').click();
  assert.equal(campaign.view().selectedStage, 2);
  assert.equal(game.getModel().view().shotsUsed, 0);
  assert.equal(game.getModel().view().bubbles.length, 4);
  assert.notDeepEqual(game.getModel().view().bubbles, opening.bubbles);

  session.stop();
  assert.equal(h.window.listenerCount(), 0);
  assert.equal(h.frames.size, 0);
  assert.equal(host.classList.contains('bv-host'), false);
});

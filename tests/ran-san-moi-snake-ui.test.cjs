const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

const el = (h, id) => h.container.querySelector(`#${id}`);
const click = (h, id) => el(h, id).dispatch('click');
const plain = value => JSON.parse(JSON.stringify(value));

function setup(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false, storage: options.storage || new Map() });
  vm.runInContext(read('scripts/games/ran-san-moi-snake-model.js'), h.context, { filename: 'ran-san-moi-snake-model.js' });
  vm.runInContext(read('scripts/games/ran-san-moi-snake.js'), h.context, { filename: 'ran-san-moi-snake.js' });
  if (options.before) options.before(h);
  h.mount = () => {
    const session = h.context.NP_GameSession.start();
    h.api = h.context.NP_RanSanMoiSnake.mount(h.container, session);
  };
  h.close = () => {
    h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h);
    assert.deepEqual(h.errors, []);
  };
  h.mount(); return h;
}

test('mounts a compact readable board with keyboard help, score and four touch directions', () => {
  const h = setup();
  assert.equal(h.container.querySelectorAll('.sn-cell').length, 18 * 14);
  assert.equal(el(h, 'snGrid').getAttribute('role'), 'img');
  assert.equal(el(h, 'snStatus').getAttribute('aria-live'), 'polite');
  assert.equal(el(h, 'snScore').textContent, '0');
  assert.equal(el(h, 'snLength').textContent, '3');
  assert.equal(h.container.querySelectorAll('.sn-direction').length, 4);
  assert.match(h.container.innerHTML, /Mũi tên\/WASD/);
  assert.match(read('scripts/games/ran-san-moi-snake.css'), /height: 48px/);
  assert.match(read('scripts/games/ran-san-moi-snake.css'), /prefers-reduced-motion/);
  h.close();
});

test('arrow and WASD start play; opposite turns are ignored; the touch pad steers', () => {
  const h = setup();
  el(h, 'snGame').dispatch('keydown', { key: 'ArrowUp', preventDefault() { this.prevented = true; } });
  assert.equal(h.api.snapshot().status, 'running');
  assert.equal(h.api.snapshot().direction, 'up');
  el(h, 'snGame').dispatch('keydown', { key: 'ArrowDown' });
  assert.deepEqual(plain(h.api.snapshot().snake[0]), { x: 9, y: 7 });
  h.advance(200); h.frame(); h.advance(200); h.frame();
  assert.deepEqual(plain(h.api.snapshot().snake[0]), { x: 9, y: 6 });
  el(h, 'snGame').dispatch('keydown', { key: 'a' });
  h.advance(200); h.frame();
  assert.equal(h.api.snapshot().direction, 'left');
  assert.deepEqual(plain(h.api.snapshot().snake[0]), { x: 8, y: 6 });
  click(h, 'snDown'); h.advance(200); h.frame();
  assert.equal(h.api.snapshot().direction, 'down');
  assert.deepEqual(plain(h.api.snapshot().snake[0]), { x: 8, y: 7 });
  h.close();

  const f = setup(); click(f, 'snRight');
  assert.equal(f.api.snapshot().status, 'running'); assert.equal(f.api.snapshot().direction, 'right');
  f.close();
});

test('pause, resume, tab hiding and pagehide stop the frame loop and require a clear resume', () => {
  for (const interruption of ['pause', 'blur', 'visibilitychange', 'pagehide']) {
    const h = setup(); click(h, 'snUp');
    assert.equal(h.frames.size, 1);
    if (interruption === 'pause') click(h, 'snPause');
    else if (interruption === 'visibilitychange') { h.document.hidden = true; h.document.dispatch(interruption); }
    else h.window.dispatch(interruption);
    assert.equal(h.frames.size, 0, interruption);
    assert.equal(el(h, 'snOverlay').hidden, false, interruption);
    const before = plain(h.api.snapshot());
    el(h, 'snGame').dispatch('keydown', { key: 'ArrowLeft' });
    assert.deepEqual(plain(h.api.snapshot()), before, 'paused input cannot change the run');
    if (interruption === 'pause') click(h, 'snResume');
    assert.equal(h.frames.size, interruption === 'pause' ? 1 : 0);
    h.close();
  }
});

test('frame movement is time based, and reset restores a ready run without stacking listeners', () => {
  const h = setup();
  const baseline = [h.window.listenerCount(), h.document.listenerCount()];
  click(h, 'snUp');
  h.advance(1000); h.frame(); // establish the first frame timestamp without catch-up movement
  h.advance(181); h.frame();
  assert.deepEqual(plain(h.api.snapshot().snake[0]), { x: 9, y: 6 });
  click(h, 'snRestart');
  assert.equal(h.api.snapshot().status, 'ready'); assert.equal(h.api.snapshot().score, 0);
  for (let i = 0; i < 10; i++) { click(h, 'snUp'); click(h, 'snPause'); click(h, 'snResume'); }
  assert.deepEqual([h.window.listenerCount(), h.document.listenerCount()], baseline);
  h.close(); assert.equal(h.frames.size, 0);
});

test('corrupt or unavailable high-score storage never blocks the game', () => {
  const bad = setup({ storage: new Map([['np_ran_san_moi_snake_best_v1', 'NaN']]) });
  assert.equal(el(bad, 'snBest').textContent, '0'); bad.close();
  const denied = setup({ before: h => {
    h.context.localStorage.getItem = () => { throw new Error('denied'); };
    h.context.localStorage.setItem = () => { throw new Error('quota'); };
  } });
  click(denied, 'snLeft');
  assert.equal(denied.api.snapshot().status, 'running');
  assert.equal(el(denied, 'snStorage').hidden, false);
  denied.close();
});

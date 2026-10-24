const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, games, read } = require('./helpers/game-harness.cjs');

const lifeIds = [
  'pho-mua-giao-hang',
  'do-xe-dung-chuan',
  'doi-cuu-hoa-dem',
  'thu-ngan-ca-toi',
  'cang-cau-container'
];

test('all five real-life games are in both catalogs and have dedicated registered engines', () => {
  const h = harness({ loadApp: false });
  const cacheIds = [...read('games-data.js').matchAll(/"id": "([^"]+)"/g)].map(match => match[1]);
  assert.equal(games.length, 155);
  assert.equal(cacheIds.length, 155, 'offline cache matches the primary catalog');
  for (const id of lifeIds) {
    assert.equal(games.filter(game => game.id === id).length, 1, id);
    assert.equal(cacheIds.filter(gameId => gameId === id).length, 1, 'cached ' + id);
    assert.equal(h.context.NP_LifeSim.hasGame(id), true, 'dedicated engine for ' + id);
  }
  const html = read('index.html');
  assert.ok(html.indexOf('scripts/real-life-core.js') < html.indexOf('scripts/life-city.js'));
  assert.ok(html.indexOf('scripts/life-crane.js') < html.indexOf('scripts/game-guide.js'));
  assert.ok(html.indexOf('scripts/life-crane.js') < html.indexOf('app.js'));
  assert.match(html, /data-category="Mô phỏng"/);
});

test('each life simulation opens, renders, responds to pointer and keyboard, and fully cleans up', () => {
  const h = harness();
  for (const id of lifeIds) {
    assert.equal(h.context.openGameById(id), true);
    const canvas = h.container.querySelector('#lifeCanvas');
    assert.ok(canvas, id + ' renders its own scene');
    assert.ok(h.container.querySelector('#lifeRestartBtn'));
    assert.ok(h.context.NP_GameSession.getCurrent()?.isActive());
    h.frame(); h.frame(); h.frame();
    h.window.dispatch('keydown', { key: 'ArrowRight', code: 'ArrowRight' });
    h.frame(16); h.frame(16);
    h.window.dispatch('keyup', { key: 'ArrowRight', code: 'ArrowRight' });
    canvas.dispatch('pointerdown', { clientX: 350, clientY: 250, pointerId: 1 });
    canvas.dispatch('pointermove', { clientX: 430, clientY: 240, pointerId: 1 });
    h.frame(16);
    canvas.dispatch('pointerup', { clientX: 430, clientY: 240, pointerId: 1 });
    h.frame(16);
    assert.equal(h.errors.length, 0, id + ': ' + h.errors.join('; '));
    h.context.closeGameModal();
    assertStopped(h);
  }
});

test('cashier scans goods, gives correct denominations and advances to the next customer', () => {
  const h = harness();
  h.context.openGameById('thu-ngan-ca-toi');
  const press = (key, code = 'Digit' + key) => h.window.dispatch('keydown', { key, code });
  press('1'); press('2'); press('3');
  assert.match(h.container.querySelector('#lifeObjective').textContent, /Đã quét 3 món/);
  press('Enter', 'Enter');
  assert.match(h.container.querySelector('#lifeObjective').textContent, /Cần trả 45k/);
  press('5'); press('5'); press('3'); // 20k + 20k + 5k = 45k
  press('Enter', 'Enter');
  assert.match(h.container.querySelector('#lifeObjective').textContent, /Khách 2\/5/);
  assert.match(h.container.querySelector('#lifeNotice').textContent, /Giao dịch chính xác/);
  h.context.closeGameModal();
  assertStopped(h);
});

test('pause freezes real-life gameplay; restart releases old listeners and starts a fresh session', () => {
  const h = harness();
  h.context.openGameById('pho-mua-giao-hang');
  h.frame(); h.frame(250);
  const old = h.context.NP_GameSession.getCurrent();
  old.pause();
  const pausedClock = old.clock.now();
  assert.equal(h.frames.size, 0);
  h.frame(4000);
  assert.equal(old.clock.now(), pausedClock);
  old.resume(); h.frame(16);
  assert.equal(h.frames.size, 1);
  h.container.querySelector('#lifeRestartBtn').dispatch('click');
  assert.equal(old.isActive(), false);
  assert.ok(h.context.NP_GameSession.getCurrent()?.isActive());
  assert.equal(h.frames.size, 1);
  h.context.closeGameModal();
  assertStopped(h);
});

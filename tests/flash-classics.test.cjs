const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, games, read } = require('./helpers/game-harness.cjs');

const classics = [
  'worlds-hardest-game', 'qwop-flash', 'helicopter-game',
  'desktop-tower-defense', 'red-ball-flash'
];
const removed = [
  'pho-mua-giao-hang', 'do-xe-dung-chuan', 'doi-cuu-hoa-dem', 'thu-ngan-ca-toi',
  'cang-cau-container', 'ban-bi-ve', 'nem-lon-truong-lang', 'tat-lon-via-he',
  'duo-hinh-bat-chu', 'tim-diem-khac-biet', 'keo-co-doi-khang',
  'phi-tieu-bong-bong', 'gap-thu-bong-dien-tu', 'nem-vong-co-chai',
  'thoi-bong-xa-phong', 'tiem-banh-ngot-ba-baker', 'dap-ruoi-ban-tay',
  'dau-truong-xe-dung', 'gap-chu-cho-qua-duong', 'tiem-sach-cu-pho-co'
];

test('entire catalog has 140 unique titles, five verified classics and no invented game listing', () => {
  const h = harness({ loadApp: false });
  const ids = games.map(game => game.id);
  assert.equal(games.length, 140);
  assert.equal(new Set(ids).size, 140);
  const embedded = [...read('games-data.js').matchAll(/"id": "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(embedded, ids);
  for (const id of removed) assert.ok(!ids.includes(id), 'original made-up listing: ' + id);
  for (const id of classics) {
    assert.equal(ids.filter(x => x === id).length, 1, 'registered in primary catalog: ' + id);
    assert.equal(h.context.NP_ClassicWeb.hasGame(id), true, 'registered custom engine: ' + id);
  }
  const html = read('index.html');
  assert.ok(html.indexOf('flash-classics-core.js') < html.indexOf('flash-world-hardest.js'));
  assert.ok(html.indexOf('flash-desktop-td.js') < html.indexOf('scripts/game-guide.js'));
  assert.ok(html.indexOf('flash-desktop-td.js') < html.indexOf('app.js'));
  assert.doesNotMatch(html, /real-life-core|life-city|life-parking|life-cashier|life-fire|life-crane/);
  assert.match(read('docs/GAME_ORIGIN_AUDIT_2026_10_24.md'), /Ma trận đầy đủ/);
});

test('all five Flash game scenes launch, draw, respond to input and stop without stale resources', () => {
  const h = harness();
  for (const id of classics) {
    assert.equal(h.context.openGameById(id), true, id);
    const canvas = h.container.querySelector('#flashCanvas');
    assert.ok(canvas, id + ': dedicated playfield');
    assert.ok(h.container.querySelector('#flashRestart'));
    assert.equal(h.context.NP_GameSession.getCurrent()?.isActive(), true);
    h.frame(); h.frame();
    h.window.dispatch('keydown', { key: 'ArrowRight', code: 'ArrowRight' });
    h.frame(16); h.frame(16);
    h.window.dispatch('keyup', { key: 'ArrowRight', code: 'ArrowRight' });
    canvas.dispatch('pointerdown', { clientX: 400, clientY: 230, pointerId: 1 });
    canvas.dispatch('pointermove', { clientX: 429, clientY: 234, pointerId: 1 });
    h.frame(16);
    canvas.dispatch('pointerup', { clientX: 429, clientY: 234, pointerId: 1 });
    h.frame(16);
    assert.deepEqual(h.errors, [], id + ' launch issues');
    h.context.closeGameModal();
    assertStopped(h);
  }
});

test('World’s Hardest Game has red-square movement and blue-orb collision respawn', () => {
  const h = harness(); h.context.openGameById('worlds-hardest-game');
  h.frame(); h.frame(16);
  const st = h.context.NP_ClassicWeb; assert.equal(st.hasGame('worlds-hardest-game'), true);
  const canvas = h.container.querySelector('#flashCanvas'); assert.ok(canvas);
  for (let i=0;i<12;i++) h.frame(16);
  h.context.closeGameModal(); assertStopped(h);
});

test('QWOP four controls are independent and are not mapped to the global pause shortcut', () => {
  const h = harness(); h.context.openGameById('qwop-flash');
  const session = h.context.NP_GameSession.getCurrent();
  for (const [key,code] of [['q','KeyQ'],['w','KeyW'],['o','KeyO'],['p','KeyP']]) {
    h.window.dispatch('keydown', { key, code });
    h.frame(16);
    assert.equal(session.isPaused(), false, code + ' is a leg muscle, not pause');
    h.window.dispatch('keyup', { key, code });
  }
  h.context.closeGameModal();assertStopped(h);
});

test('Helicopter holds Space to ascend and pauses without pointer sticks', () => {
  const h = harness(); h.context.openGameById('helicopter-game');
  h.frame(); h.window.dispatch('keydown', { code:'Space', key:' ' }); h.frame(16);
  const session = h.context.NP_GameSession.getCurrent();
  session.pause();
  assert.equal(h.frames.size,0);
  session.resume();h.frame(16);
  h.window.dispatch('keyup',{code:'Space',key:' '});
  h.context.closeGameModal();assertStopped(h);
});

test('game switching removes the previous classic engine frame, timers and keys', () => {
  const h = harness();
  for (const first of classics) for (const second of classics) {
    h.context.openGameById(first);h.frame();
    h.context.openGameById(second);h.frame();
    assert.equal(h.frames.size,1, first+' -> '+second);
    h.context.closeGameModal();assertStopped(h);
  }
});

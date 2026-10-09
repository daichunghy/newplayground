// Dependency-free flow checks. DOM/Canvas/audio are mocks, not browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read, games } = require('./support/browser-harness.cjs');

async function portalHarness() {
  const h = harness();
  for (const id of ['gridHot', 'gridQuick', 'gridFriends', 'gridAll', 'allSectionTitle',
    'resultsCount', 'noResultsBlock', 'catalogAvailability', 'searchInput', 'heroBrowseBtn']) {
    h.document.body.appendChild(h.document.createElement('div'));
    h.document.body.children.at(-1).setAttribute('id', id);
  }
  for (const category of ['all', 'playable']) {
    const pill = h.document.createElement('button');
    pill.classList.add('filter-pill');
    pill.setAttribute('data-category', category);
    pill.textContent = category === 'all' ? 'Tất cả' : 'Có thể chơi';
    if (category === 'playable') pill.classList.add('active');
    h.document.body.appendChild(pill);
  }
  h.context.fetch = async () => ({ ok: true, json: async () => games });
  h.document.dispatch('DOMContentLoaded');
  await new Promise(resolve => setImmediate(resolve));
  return h;
}

test('catalog routing uses one exact launcher for prototypes and none for planned games', () => {
  const h = harness(); const calls = [];
  for (const name of Object.keys(h.context.NP_Engines)) h.context.NP_Engines[name] = () => calls.push(name);
  for (const game of games) {
    calls.length = 0;
    assert.equal(h.context.openGameById(game.id), true);
    assert.equal(calls.length, h.context.NP_GameRegistry.isPlayable(game.id) ? 1 : 0,
      game.id + ' must use its exact launcher or remain visibly planned');
  }
  for (const [id, expected] of [['hang-rong', 'launchHangRong'], ['zuma-ech-ban-ngoc', 'launchZuma'], ['line-98', 'launchLine98'], ['ran-san-moi-snake', 'launchSnake'], ['boom-online-bnb', 'launchDauTruongNuoc'], ['audition-nhip-dieu', 'launchNhipMay'], ['duck-hunt-ban-vit', 'launchMucTieuBay'], ['rockman-mega-man', 'launchMamChop'], ['street-fighter-2-doi-khang', 'launchStreetFighter'], ['road-rash-dua-xe-moto', 'launchDuaGio'], ['raft-wars-ban-sung-phao', 'launchDauPhao'], ['bubble-bobble-khung-long-bong-bong', 'launchMamGio'], ['age-of-war-thoi-dai-chien-tranh', 'launchRanhGioiMay'], ['bloxorz-khoi-da-lan', 'launchKhoiDaLan'], ['xep-bai-solitaire', 'launchBaiBayCot'], ['xep-bai-freecell', 'launchBonO'], ['xep-bai-nhen-spider', 'launchBaiNhen'], ['arkanoid-dap-gach', 'launchOrbitArkanoid'], ['puzzle-bobble-khung-long', 'launchBiVom'], ['dr-mario-diet-khuan', 'launchOngNghiem'], ['peggle-pachinko', 'launchBatChot'], ['lemonade-tycoon', 'launchLemonadeStand'], ['thap-ha-noi-tower', 'launchThapBaCoc'], ['bookworm-sau-noi-chu', 'launchBookworm']]) {
    calls.length = 0; h.context.openGameById(id); assert.deepEqual(calls, [expected]);
  }
  assert.equal(h.context.openGameById('not-in-catalog'), false);
});

test('the default catalog favors playable prototypes and planned entries have no launch button', async () => {
  const h = await portalHarness(), grid = h.document.getElementById('gridAll');
  const playable = h.document.body.querySelectorAll('.filter-pill').find(pill => pill.getAttribute('data-category') === 'playable');
  const all = h.document.body.querySelectorAll('.filter-pill').find(pill => pill.getAttribute('data-category') === 'all');
  assert.equal(playable.classList.contains('active'), true);
  assert.equal(grid.children.length, 56);
  assert.equal(h.document.getElementById('allSectionTitle').textContent, 'Bản thử nghiệm có thể chơi (56)');
  assert.equal(h.document.getElementById('catalogAvailability').textContent, '56 chơi thử · 150 trong danh mục');

  all.click();
  assert.equal(grid.children.length, 150, 'the full catalog remains available by explicit selection');
  const plannedEntry = games.find(game => !h.context.NP_GameRegistry.isPlayable(game.id));
  const plannedCard = grid.children.find(card => card.getAttribute('data-id') === plannedEntry.id);
  assert.ok(plannedCard.classList.contains('game-card-planned'));
  assert.match(plannedCard.innerHTML, /Đang phát triển/);
  assert.match(plannedCard.innerHTML, /Chưa có bản chơi/);
  assert.equal(plannedCard.querySelector('.game-card-play'), null);
  plannedCard.click();
  assert.equal(h.container.children.length, 0, 'a planned card cannot open a misleading or empty game dialog');

  playable.click();
  assert.equal(grid.children.length, 56);
});

test('Quầy Nước Chanh opens instantly with its own cover and releases its session', () => {
  const h = harness();
  assert.equal(h.context.openGameById('lemonade-tycoon'), true);
  assert.match(h.container.innerHTML, /<h2>Quầy Nước Chanh<\/h2>/);
  assert.equal(h.container.querySelector('#lsStatus').getAttribute('role'), 'status');
  assert.match(read('app.js'), /'lemonade-tycoon': 'assets\/quay-nuoc-chanh-original\.svg'/);
  assert.equal(h.frames.size, 1);
  h.context.closeGameModal();
  assertStopped(h);
});

test('Tháp Ba Cọc opens its own campaign and releases the session', () => {
  const h = harness();
  assert.equal(h.context.openGameById('thap-ha-noi-tower'), true);
  assert.ok(h.container.querySelector('#tbPeg0'));
  assert.equal(h.container.querySelector('#tbStage3').disabled, true);
  h.context.closeGameModal(); assertStopped(h);
});

test('Mọt Sách Nối Chữ has its own route, cover, and working word submission', () => {
  const h = harness();
  assert.equal(h.context.openGameById('bookworm-sau-noi-chu'), true);
  assert.equal(h.container.querySelectorAll('.bw-letter').length, 36);
  assert.match(read('app.js'), /'bookworm-sau-noi-chu': 'assets\/mot-sach-noi-chu-original\.svg'/);
  assert.ok(JSON.parse(read('assets/ASSET_MANIFEST.json')).some(asset => asset.local_path === 'assets/mot-sach-noi-chu-original.svg'));
  for (let index = 0; index < 5; index++) h.container.querySelector('#bwTile' + index).dispatch('click');
  assert.equal(h.container.querySelector('#bwWord').textContent, 'SHELF');
  h.container.querySelector('#bwSubmit').dispatch('click');
  assert.equal(h.container.querySelector('#bwScore').textContent, '25 / 42');
  h.context.closeGameModal(); assertStopped(h);
});

test('the rolling-block route opens its original board and excludes the unknown cover', () => {
  const h = harness();
  assert.equal(h.context.openGameById('bloxorz-khoi-da-lan'), true);
  assert.ok(h.container.querySelector('#kdBoard'));
  assert.match(h.container.innerHTML, /Khối Đá Lăn/);
  assert.match(read('app.js'), /'bloxorz-khoi-da-lan': 'assets\/khoi-da-lan-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'bloxorz_cover\.jpg'/);
  h.context.closeGameModal();
  assertStopped(h);
});

test('Klondike route opens an immediate deal with the original card-table cover', () => {
  const h = harness();
  assert.equal(h.context.openGameById('xep-bai-solitaire'), true);
  assert.ok(h.container.querySelector('#klTableau'));
  assert.match(h.container.innerHTML, /Bảy Cột/);
  assert.match(read('app.js'), /'xep-bai-solitaire': 'assets\/bay-cot-original\.svg'/);
  assert.equal(h.container.querySelector('#klStatus').getAttribute('role'), 'status');
  h.context.closeGameModal();
  assertStopped(h);
});

test('FreeCell route opens the face-up original table and its own cover', () => {
  const h = harness();
  assert.equal(h.context.openGameById('xep-bai-freecell'), true);
  assert.match(h.container.innerHTML, /Bốn Ô/);
  assert.match(read('app.js'), /'xep-bai-freecell': 'assets\/bon-o-original\.svg'/);
  assert.equal(h.container.querySelector('#fcStatus').getAttribute('role'), 'status');
  h.context.closeGameModal();
  assertStopped(h);
});

test('Spider, Arkanoid, Bi Vòm, Ống Nghiệm and Bật Chốt open exact original routes and covers', () => {
  const h = harness();
  const routes = [
    ['xep-bai-nhen-spider', 'Bài Nhện', '#spStatus', 'assets/bai-nhen-original.svg'],
    ['arkanoid-dap-gach', 'Vệ Tinh Giữ Quỹ Đạo', '#ogStatus', 'assets/ve-tinh-giu-quy-dao-original.svg'],
    ['puzzle-bobble-khung-long', 'Bi Vòm', '#bvStatus', 'assets/bi-vom-original.svg'],
    ['dr-mario-diet-khuan', 'Ống Nghiệm', '#ttStatus', 'assets/ong-nghiem-original.svg'],
    ['peggle-pachinko', 'Bật Chốt', '#pcStatus', 'assets/bat-chot-original.svg']
  ];
  for (const [id, title, statusSelector, cover] of routes) {
    assert.equal(h.context.openGameById(id), true);
    assert.match(h.container.innerHTML, new RegExp(title));
    const status = h.container.querySelector(statusSelector);
    assert.equal(status?.getAttribute('role'), 'status', id);
    assert.match(read('app.js'), new RegExp(`'${id}': '${cover.replaceAll('.', '\\.')}'`));
    h.context.closeGameModal();
    assertStopped(h);
  }
});

test('session cancels nested timers, intervals, frames and only its own listeners', () => {
  const h = harness({ loadEngines: false, loadApp: false }); let gameEvents = 0, portalEvents = 0, cleanup = 0;
  h.window.addEventListener('keydown', () => portalEvents++);
  const s = h.context.NP_GameSession.start();
  s.listen(h.window, 'keydown', () => gameEvents++, true);
  s.setTimeout(() => s.setTimeout(() => gameEvents++, 30), 10);
  s.setInterval(() => gameEvents++, 10);
  s.requestAnimationFrame(() => s.requestAnimationFrame(() => gameEvents++));
  s.onCleanup(() => cleanup++);
  h.flushTimeouts(); h.frame();
  const queued = [...h.timers.values()].map(x => () => x.callback(...x.args)).concat([...h.frames.values()]);
  h.context.NP_GameSession.stop(); h.context.NP_GameSession.stop();
  queued.forEach(callback => callback());
  h.window.dispatch('keydown');
  assert.equal(gameEvents, 0); assert.equal(portalEvents, 1); assert.equal(cleanup, 1);
  assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
  assert.equal(s.setTimeout(() => {}, 10), null);
  assert.equal(s.requestAnimationFrame(() => {}), null);
});

test('callable vibration and all five named presets are compatible and safe without hardware', () => {
  const h = harness({ loadEngines: false, loadApp: false }); const v = h.context.NP_Juice.vibrate;
  v(8); v([20, 40]); for (const name of ['light', 'medium', 'heavy', 'combo', 'success']) v[name]();
  assert.equal(JSON.stringify(h.vibrations), JSON.stringify([8, [20, 40], 12, 28, 60, [15, 30, 25], [20, 40, 60]]));
  delete h.context.navigator.vibrate;
  assert.doesNotThrow(() => { v(8); v.light(); });
  h.context.navigator.vibrate = () => { throw new Error('hardware blocked'); };
  assert.doesNotThrow(() => { v([1, 2]); v.heavy(); });
});

test('real engine launch, render and close across every catalog entry (mocked canvas)', () => {
  const h = harness();
  for (const game of games) {
    assert.equal(h.context.openGameById(game.id), true);
    assert.equal(h.errors.length, 0, game.id + ': ' + h.errors.join('; '));
    assert.ok(h.container.children.length > 0, game.id + ' renders game DOM');
    h.frame(); h.frame();
    h.context.closeGameModal(); h.context.closeGameModal();
    assertStopped(h);
    h.window.dispatch('keydown', { key: ' ', code: 'Space' });
    h.window.dispatch('keyup', { key: ' ', code: 'Space' });
    h.flushTimeouts();
    assertStopped(h);
    assert.equal(h.errors.length, 0, game.id + ': ' + h.errors.join('; '));
  }
});

test('generic arcade fire uses vibration; switching leaves one live game and no old keyboard action', () => {
  const h = harness();
  h.context.NP_Engines.launchRetroArcade(h.container, { id: 'test-arcade', title: 'Test arcade' });
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  assert.ok(h.vibrations.includes(8));
  h.context.openGameById('boom-online-bnb');
  assert.equal(h.container.querySelector('#arcCanvas'), null);
  assert.ok(h.container.querySelector('#tgCanvas'));
  const before = h.vibrations.length;
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  assert.equal(h.vibrations.length, before, 'old arcade firing listener was removed');
  h.context.closeGameModal(); h.flushTimeouts(); assertStopped(h);
  for (let n = 0; n < 5; n++) { h.context.openGameById('road-rash-dua-xe-moto'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  for (let n = 0; n < 5; n++) { h.context.openGameById('raft-wars-ban-sung-phao'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  for (let n = 0; n < 5; n++) { h.context.openGameById('bubble-bobble-khung-long-bong-bong'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  for (let n = 0; n < 5; n++) { h.context.openGameById('age-of-war-thoi-dai-chien-tranh'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  for (let n = 0; n < 5; n++) { h.context.openGameById('bloxorz-khoi-da-lan'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  for (let n = 0; n < 5; n++) { h.context.openGameById('xep-bai-solitaire'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  for (let n = 0; n < 5; n++) { h.context.openGameById('xep-bai-freecell'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  for (const id of ['xep-bai-nhen-spider', 'arkanoid-dap-gach', 'puzzle-bobble-khung-long', 'dr-mario-diet-khuan', 'peggle-pachinko']) {
    for (let n = 0; n < 3; n++) { h.context.openGameById(id); h.frame(); h.context.closeGameModal(); assertStopped(h); }
  }
});

test('failed launch cleans partial resources and can reopen; missing engines show a message', () => {
  const h = harness(); const original = h.context.NP_Engines.launchSnake;
  h.context.NP_Engines.launchSnake = () => {
    const s = h.context.NP_GameSession.start(); s.setInterval(() => {}, 10); s.listen(h.window, 'keydown', () => {});
    throw new Error('test launch failure');
  };
  h.context.openGameById('ran-san-moi-snake');
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0); assert.equal(h.window.listenerCount(), 0);
  assert.match(h.container.querySelector('h3').textContent, /Chưa thể mở/);
  h.context.NP_Engines.launchSnake = original; h.context.openGameById('ran-san-moi-snake');
  assert.ok(h.container.querySelector('#snGrid')); h.context.closeGameModal(); assertStopped(h);
  h.context.NP_Engines = undefined; h.context.NP_Retro50Engines = undefined;
  h.context.openGameById('ran-san-moi-snake'); assert.match(h.container.querySelector('h3').textContent, /đang phát triển/);
});

test('engine resources use local sessions; portal APIs and script order stay independent', () => {
  for (const file of ['engines.js', 'engines-classics.js', 'engines-popcap.js', 'engines-retro50.js', 'engines-era-front.js', 'engines-thap-ba-coc.js', 'engines-bookworm.js']) {
    const source = read('scripts/' + file);
    const launches = source.match(/function launch\w+\(container, game\)/g) || [];
    assert.equal((source.match(/window\.NP_GameSession\.start\(\)/g) || []).length, launches.length);
    assert.doesNotMatch(source, /window\.addEventListener|window\.__current\w+Cleanup/);
  }
  const html = read('index.html'); assert.ok(html.indexOf('scripts/game-session.js') < html.indexOf('scripts/engines.js'));
  assert.match(read('app.js'), /soundBtn\.addEventListener\('click', toggleSound\)/);
  assert.match(read('app.js'), /themeBtn\.addEventListener\('click'/);
});

test('cleanup hooks are isolated, and unrelated portal timers/listeners survive close', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  const portalTimer = h.context.setInterval(() => {}, 5000);
  const portalFrame = h.context.requestAnimationFrame(() => {});
  const portalListener = () => {};
  h.window.addEventListener('click', portalListener);
  let saved = false;
  const first = h.context.NP_GameSession.start();
  first.setInterval(() => {}, 20); first.requestAnimationFrame(() => {});
  first.onCleanup(() => { throw new Error('expected test cleanup failure'); });
  first.onCleanup(() => { saved = true; });
  const second = h.context.NP_GameSession.start();
  assert.equal(saved, true, 'a failing cleanup does not skip subsequent cleanup');
  assert.equal(h.errors.length, 1);
  const secondTimer = second.setInterval(() => {}, 30);
  first.stop();
  assert.ok(h.timers.has(secondTimer), 'old stop cannot cancel the next game');
  h.context.NP_GameSession.stop();
  assert.deepEqual([...h.timers.keys()], [portalTimer]);
  assert.deepEqual([...h.frames.keys()], [portalFrame]);
  assert.equal(h.window.listenerCount(), 1);
});

test('Line98 and Mục Tiêu Bay release all work after close', () => {
  const h = harness();
  h.context.openGameById('line-98');
  h.frame();
  h.context.closeGameModal();
  assert.equal(h.timers.size, 0); assertStopped(h);
  h.context.openGameById('duck-hunt-ban-vit');
  const canvas = h.container.querySelector('#bvbCanvas');
  assert.ok(canvas);
  canvas.dispatch('pointermove', { clientX: 40, clientY: 40 });
  h.frame();
  assert.ok(h.frames.size > 0, 'target gallery owns one animation frame');
  h.context.closeGameModal();
  assert.equal(h.frames.size, 0, 'close cancels its animation frame');
  assert.equal(h.window.listenerCount(), 0, 'close removes its global listeners');
  h.flushTimeouts();
  assertStopped(h);
  assert.equal(h.errors.length, 0);
});

test('the marble-chain route opens its new game immediately and keeps one owned loop', () => {
  const h = harness(); h.context.openGameById('zuma-ech-ban-ngoc');
  assert.ok(h.container.querySelector('#mtCanvas')); assert.equal(h.container.querySelector('#zmCanvas'), null);
  assert.equal(h.container.querySelector('#mtCover').hidden, true);
  assert.doesNotThrow(() => { h.frame(); h.frame(); });
  assert.equal(h.frames.size, 1); assert.equal(h.errors.length, 0);
  h.context.closeGameModal(); assertStopped(h);
});

test('closing during shared screen shake and audio fanfare cancels effects and restores transform', () => {
  const h = harness(); h.context.NP_Engines.launchRetroArcade(h.container, { id: 'test-arcade', title: 'Test arcade' });
  h.container.style.transform = 'scale(1)';
  h.context.NP_Juice.screenShake(h.container, 10, 600); h.frame();
  assert.match(h.container.style.transform, /translate/);
  h.context.NP_Audio.win(); h.context.NP_AudioEngine.coin();
  assert.ok(h.timers.size > 0);
  h.context.closeGameModal();
  assert.equal(h.container.style.transform, 'scale(1)');
  assert.equal(h.timers.size, 0); assertStopped(h);
  h.context.NP_Engines.launchRetroArcade(h.container, { id: 'test-arcade', title: 'Test arcade' });
  h.context.NP_Juice.screenShake(h.container, 10, 30); h.frame();
  h.context.NP_Juice.screenShake(h.container, 5, 30); h.frame(); h.frame();
  assert.equal(h.container.style.transform, 'scale(1)', 'overlapping effects restore the original transform');
  h.context.closeGameModal(); assertStopped(h);
});

test('malformed catalog ID shows unavailable notice instead of throwing before cleanup', () => {
  const h = harness();
  const malformed = { id: 7, title: 'Malformed test entry', category: 'test' };
  games.push(malformed);
  try {
    assert.doesNotThrow(() => h.context.openGameById(7));
    assert.ok(h.container.querySelector('.game-availability-notice'));
    assert.equal(h.container.querySelector('#arcCanvas'), null);
    h.context.closeGameModal(); assertStopped(h);
    assert.equal(h.errors.length, 0);
  } finally { games.pop(); }
});

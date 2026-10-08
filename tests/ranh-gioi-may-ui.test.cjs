const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

test('the exact legacy catalog ID opens the new encounter immediately with original branding and cover', () => {
  const h = harness();
  assert.equal(h.context.openGameById('age-of-war-thoi-dai-chien-tranh'), true);
  assert.match(h.container.innerHTML, /Ranh Giới Mây/);
  assert.doesNotMatch(h.container.innerHTML, /Age of War|Max Games|Caveman|Abrams/i);
  assert.ok(h.container.querySelector('#efCanvas'));
  assert.equal(h.container.querySelector('#efOverlay').hidden, true);
  assert.equal(h.container.querySelector('#efCanvas').focused, true);
  assert.equal(h.container.querySelector('#efResources').textContent, '82');
  assert.equal(h.container.querySelector('#efPlayerHealthTrack').getAttribute('aria-valuenow'), '250');
  assert.equal(h.container.querySelector('#efRivalHealthTrack').getAttribute('aria-valuenow'), '250');
  assert.match(h.container.innerHTML, /id="efStage0"[^>]*>1<small/);
  assert.match(h.container.querySelector('#efStage0').getAttribute('aria-label'), /Chặng 1: Cầu Mầm/);
  assert.match(h.container.querySelector('#efShield').getAttribute('aria-label'), /giảm sát thương từ Nỏ Hạt/);
  assert.match(h.container.querySelector('#efSling').getAttribute('aria-label'), /sát thương mạnh lên Bọ Sỏi/);
  assert.match(h.container.querySelector('#efBeetle').getAttribute('aria-label'), /sát thương mạnh lên Mầm Khiên/);
  assert.match(h.container.innerHTML, /Chặn Nỏ · phím 1/);
  assert.match(h.container.innerHTML, /Hạ Bọ · phím 2/);
  assert.match(h.container.innerHTML, /Phá Khiên · phím 3/);
  assert.match(read('scripts/games/ranh-gioi-may.css'), /\.ef-unit-button\s*\{[^}]*min-height:\s*56px/s);
  assert.equal(h.frames.size, 1);
  assert.match(read('app.js'), /'age-of-war-thoi-dai-chien-tranh': 'assets\/ranh-gioi-may-original\.svg'/);
  assert.doesNotMatch(read('app.js'), /'age-of-war': 'assets\/age_of_war_cover\.jpg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'age_of_war_cover\.jpg'/);
  h.context.closeGameModal();
  assertStopped(h);
});

test('touch buttons and focused-canvas hotkeys call the chosen original units', () => {
  const h = harness();
  h.context.openGameById('age-of-war-thoi-dai-chien-tranh');
  h.container.querySelector('#efShield').click();
  assert.equal(h.container.querySelector('#efResources').textContent, '54');
  assert.equal(h.container.querySelector('#efShield').disabled, false);
  const canvas = h.container.querySelector('#efCanvas');
  h.container.dispatch('keydown', { key: '2', target: canvas, repeat: false });
  assert.equal(h.container.querySelector('#efResources').textContent, '4');
  assert.equal(h.container.querySelector('#efLive').textContent, 'Đã gọi Nỏ Hạt. Quân tự tiến lên cầu.');
  assert.ok(h.context.NP_Engines.launchRanhGioiMay);
  h.context.closeGameModal();
  assertStopped(h);
});

test('pause, visibility resume, replay, and dismissal leave no stale frame or listener', () => {
  const h = harness();
  h.context.openGameById('age-of-war-thoi-dai-chien-tranh');
  h.container.querySelector('#efPause').click();
  assert.equal(h.container.querySelector('#efOverlay').hidden, false);
  assert.equal(h.container.querySelector('#efResult').textContent, 'Tạm dừng');
  assert.equal(h.frames.size, 0);
  h.container.querySelector('#efOverlayAction').click();
  assert.equal(h.container.querySelector('#efOverlay').hidden, true);
  assert.equal(h.frames.size, 1);
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.container.querySelector('#efResult').textContent, 'Tạm dừng');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.container.querySelector('#efOverlayAction').click();
  h.container.querySelector('#efReplayTop').click();
  assert.equal(h.container.querySelector('#efResources').textContent, '82');
  assert.equal(h.frames.size, 1);
  h.context.closeGameModal();
  assertStopped(h);
});

test('malformed campaign progress is preserved and copied to a recovery key', () => {
  const key = 'np_ranh_gioi_campaign_v1';
  const malformed = '{broken save';
  const h = harness({ storage: new Map([[key, malformed]]) });
  h.context.openGameById('age-of-war-thoi-dai-chien-tranh');
  assert.equal(h.stored.get(key), malformed);
  assert.equal(h.stored.get(key + '_recovery'), malformed);
  assert.match(h.container.querySelector('#efSaveNote').textContent, /bản lưu lỗi đã được giữ lại/i);
  assert.equal(h.container.querySelector('#efStage0').getAttribute('aria-current'), 'step');
  h.context.closeGameModal();
  assertStopped(h);
});

test('a newer campaign save is left untouched and does not block a fresh match', () => {
  const key = 'np_ranh_gioi_campaign_v1';
  const future = JSON.stringify({ version: 99, unlockedStage: 2, bestTimes: [12000, 15000, 17000] });
  const h = harness({ storage: new Map([[key, future]]) });
  h.context.openGameById('age-of-war-thoi-dai-chien-tranh');
  assert.equal(h.stored.get(key), future);
  assert.equal(h.stored.has(key + '_recovery'), false);
  assert.match(h.container.querySelector('#efSaveNote').textContent, /bản lưu mới hơn được giữ nguyên/i);
  assert.equal(h.container.querySelector('#efCanvas').focused, true);
  assert.equal(h.container.querySelector('#efOverlay').hidden, true);
  h.context.closeGameModal();
  assertStopped(h);
});

test('a cleared bridge saves its record and resumes at the next unlocked bridge', () => {
  const key = 'np_ranh_gioi_campaign_v1';
  const h = harness();
  h.context.openGameById('age-of-war-thoi-dai-chien-tranh');
  for (let frame = 0; frame < 2600 && h.container.querySelector('#efOverlay').hidden; frame++) {
    const shield = h.container.querySelector('#efShield');
    if (!shield.disabled) shield.click();
    h.frame();
  }
  assert.equal(h.container.querySelector('#efResult').textContent, 'Giữ được cây cầu!');
  const saved = JSON.parse(h.stored.get(key));
  assert.equal(saved.unlockedStage, 1);
  assert.ok(Number.isSafeInteger(saved.bestTimes[0]));
  h.context.closeGameModal();
  assertStopped(h);

  const reload = harness({ storage: h.stored });
  reload.context.openGameById('age-of-war-thoi-dai-chien-tranh');
  assert.match(reload.container.querySelector('#efStageName').textContent, /Chặng 2\/3 · Cầu Đá/);
  assert.equal(reload.container.querySelector('#efStage0').disabled, true);
  assert.equal(reload.container.querySelector('#efStage1').getAttribute('aria-current'), 'step');
  reload.context.closeGameModal();
  assertStopped(reload);
});

test('a storage write failure reports the problem while the win remains playable', () => {
  const h = harness();
  h.context.localStorage.setItem = () => { throw new Error('storage full'); };
  h.context.openGameById('age-of-war-thoi-dai-chien-tranh');
  for (let frame = 0; frame < 2600 && h.container.querySelector('#efOverlay').hidden; frame++) {
    const shield = h.container.querySelector('#efShield');
    if (!shield.disabled) shield.click();
    h.frame();
  }
  assert.equal(h.container.querySelector('#efResult').textContent, 'Giữ được cây cầu!');
  assert.match(h.container.querySelector('#efSaveNote').textContent, /không lưu được/i);
  assert.equal(h.errors.length, 0);
  h.context.closeGameModal();
  assertStopped(h);
});

test('repeated route open and close cycles release session-owned browser work', () => {
  const h = harness();
  for (let i = 0; i < 8; i++) {
    h.context.openGameById('age-of-war-thoi-dai-chien-tranh');
    h.frame(); h.frame();
    h.context.closeGameModal();
    assertStopped(h);
    assert.equal(h.errors.length, 0);
  }
});

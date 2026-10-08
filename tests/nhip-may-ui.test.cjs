const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

function setup(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false, reducedMotion: !!options.reducedMotion });
  vm.runInContext(read('scripts/games/nhip-may-model.js'), h.context, { filename: 'nhip-may-model.js' });
  vm.runInContext(read('scripts/games/nhip-may.js'), h.context, { filename: 'nhip-may.js' });
  h.mount = () => { h.api = h.context.NP_NhipMay.mount(h.container, h.context.NP_GameSession.start()); };
  h.close = () => { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []); };
  h.mount();
  return h;
}
const el = (h, id) => h.container.querySelector(`#${id}`);

test('shows a clear start action, original title, four touch targets, and concise controls', () => {
  const h = setup();
  assert.match(h.container.innerHTML, /Nhịp Mây/);
  assert.equal(el(h, 'nmSong').textContent, 'Đoạn 1/3 · Mây Sớm');
  assert.equal(h.container.querySelectorAll('.nm-lane').length, 4);
  assert.ok(el(h, 'nmSpace'));
  assert.match(h.container.innerHTML, />Chơi<\/button>/);
  assert.match(h.container.innerHTML, /chốt Space/);
  assert.equal(h.frames.size, 0);
  assert.match(h.container.innerHTML, />SPACE<\/button>/);
  h.close();
});

test('D/F/J/K or arrows grade lanes, Space closes each phrase, and repeats do not double count', () => {
  const h = setup(); el(h, 'nmOverlayAction').click();
  assert.equal(h.api.snapshot().status, 'playing');
  for (let i = 0; i < 15; i++) h.api.model().advance(.1);
  h.window.dispatch('keydown', { code: 'KeyD', key: 'd' });
  assert.equal(h.api.snapshot().hits, 1);
  assert.equal(h.api.snapshot().combo, 1);
  h.window.dispatch('keydown', { code: 'KeyD', key: 'd', repeat: true });
  assert.equal(h.api.snapshot().hits, 1);
  h.window.dispatch('keyup', { code: 'KeyD' });
  for (let i = 0; i < 17; i++) h.api.model().advance(.1);
  h.window.dispatch('keydown', { code: 'Space', key: ' ' });
  assert.equal(h.api.snapshot().hits, 2);
  h.window.dispatch('keyup', { code: 'Space' });
  for (let i = 0; i < 5; i++) h.api.model().advance(.1);
  h.container.querySelectorAll('.nm-lane')[2].dispatch('click');
  assert.equal(h.api.snapshot().hits, 3);
  assert.equal(el(h, 'nmScore').textContent, String(h.api.snapshot().score));
  h.close();
});

test('pause, resume, and restart keep frame ownership bounded across the three-song set', () => {
  const h = setup(); el(h, 'nmOverlayAction').click();
  assert.equal(h.frames.size, 1);
  h.frame(); h.frame();
  el(h, 'nmPause').click();
  const pausedAt = h.api.snapshot().time;
  assert.equal(h.api.snapshot().status, 'paused'); assert.equal(h.frames.size, 0);
  h.advance(3000); h.frame(); assert.equal(h.api.snapshot().time, pausedAt);
  el(h, 'nmPause').click(); assert.equal(h.frames.size, 1);
  el(h, 'nmRestart').click(); assert.equal(h.api.snapshot().status, 'playing'); assert.equal(h.frames.size, 1);
  for (let song = 0; song < 3; song++) {
    for (let i = 0; i < 1600 && h.api.snapshot().status === 'playing'; i++) h.frame();
    if (song < 2) {
      assert.equal(h.api.snapshot().status, 'song-ended'); assert.equal(h.frames.size, 0);
      assert.equal(el(h, 'nmSong').textContent, `Đoạn ${song + 1}/3 · ${['Mây Sớm','Đèn Phố','Mưa Nhịp'][song]}`);
      el(h, 'nmOverlayAction').click();
      assert.equal(h.api.snapshot().status, 'playing'); assert.equal(h.api.snapshot().songIndex, song + 1); assert.equal(h.frames.size, 1);
    } else {
      assert.equal(h.api.snapshot().status, 'ended'); assert.equal(h.frames.size, 0);
      assert.match(el(h, 'nmOverlayTitle').textContent, /Bộ nhịp khép lại/);
      assert.equal(h.api.snapshot().results.length, 3);
    }
  }
  el(h, 'nmOverlayAction').click(); assert.equal(h.api.snapshot().status, 'playing'); assert.equal(h.frames.size, 1);
  h.close();
});

test('blur, hidden-tab changes and pagehide pause safely; reduced motion remains playable', () => {
  for (const event of ['blur', 'hidden', 'pagehide']) {
    const h = setup({ reducedMotion: true }); el(h, 'nmOverlayAction').click();
    if (event === 'hidden') { h.document.hidden = true; h.document.dispatch('visibilitychange'); }
    else h.window.dispatch(event);
    assert.equal(h.api.snapshot().status, 'paused', event);
    assert.equal(h.frames.size, 0, event);
    h.window.dispatch('focus'); h.document.hidden = false; h.document.dispatch('visibilitychange');
    assert.equal(h.api.snapshot().status, 'paused', 'returning focus never resumes the chart automatically');
    h.close();
  }
});

test('the exact #34 launcher reaches the original title and session module', () => {
  const h = harness({ loadEngines: true, loadApp: false });
  vm.runInContext(read('scripts/games/nhip-may-model.js'), h.context, { filename: 'nhip-may-model.js' });
  vm.runInContext(read('scripts/games/nhip-may.js'), h.context, { filename: 'nhip-may.js' });
  const launched = h.context.NP_GameRegistry.launch(h.container, { id: 'audition-nhip-dieu', title: 'unused catalog label' });
  assert.equal(launched, true);
  assert.equal(h.document.getElementById('modalGameTitle').textContent, 'Nhịp Mây');
  assert.match(h.container.innerHTML, /Nhịp Mây/);
  h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []);
});

test('the exact catalog route uses the original cover and excludes the old unverified image', () => {
  const h = harness();
  assert.equal(h.context.openGameById('audition-nhip-dieu'), true);
  assert.ok(el(h, 'nmCanvas'));
  assert.match(read('app.js'), /'audition-nhip-dieu': 'assets\/nhip-may-original\.svg'/);
  assert.match(read('scripts/game-registry.js'), /'audition-nhip-dieu': 'launchNhipMay'/);
  assert.doesNotMatch(read('scripts/engines-retro50.js'), /launchAudition/);
  assert.match(read('scripts/release-preflight.mjs'), /'audition_cover\.jpg'/);
  assert.deepEqual(h.errors, []);
  h.context.closeGameModal();
  assertStopped(h);
});

test('closing removes frame and global input listeners; canceled pointer input has no effect', () => {
  const h = setup(); el(h, 'nmOverlayAction').click();
  h.container.querySelectorAll('.nm-lane')[0].dispatch('pointerdown', { pointerId: 4 });
  h.container.querySelectorAll('.nm-lane')[0].dispatch('pointercancel', { pointerId: 4 });
  assert.equal(h.api.snapshot().hits, 0);
  h.close();
  h.window.dispatch('keydown', { code: 'ArrowLeft', key: 'ArrowLeft' });
  assert.deepEqual(h.errors, []);
});

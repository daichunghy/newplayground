// DOM/RAF/audio doubles only. Not browser, layout, touch-device, or audio-device QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/hangrong-model.js');
const KEY = 'np_hangrong_save_v3', BACKUP = KEY + '_backup', OLD = 'np_hangrong_save_v2';
function setup(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false, ...options });
  vm.runInContext(read('scripts/games/hangrong-model.js'), h.context);
  vm.runInContext(read('scripts/games/hangrong.js'), h.context); return h;
}
const open = (h, audio) => h.context.NP_HangRong.mount(h.container, h.context.NP_GameSession.start(), audio);
const el = (h, id) => h.container.querySelector('#hr3' + id);
const click = (h, id, values) => el(h, id).dispatch('click', values);
const saved = h => JSON.parse(h.stored.get(KEY));
function close(h) { h.context.NP_GameSession.stop(); h.container.innerHTML = ''; assertStopped(h); assert.deepEqual(h.errors, []); }
function run(h, ms) { for (let n = 0; n < Math.ceil(ms / 100) + 1; n++) { h.advance(84); h.frame(); } }
function firstDish(h) { click(h, 'Cook0'); run(h, 4600); return saved(h).shift.tray[0].id; }
function playUI(h) {
  for (let t = 0; t < 1600 && saved(h).phase !== 'result'; t++) {
    const v = saved(h), s = v.shift;
    for (const c of s.customers) if (s.tray.some(d => d.recipe === c.recipe)) click(h, 'Customer' + c.seat);
    if (saved(h).phase !== 'playing') break;
    for (let i = 0; i < 3; i++) if (!el(h, 'Cook' + i).disabled && !el(h, 'Cook' + i).hidden) click(h, 'Cook' + i);
    run(h, 100);
  }
  assert.equal(saved(h).phase, 'result');
}

test('opens directly into two-dish gameplay without setup, market, equipment or long tutorial panels', () => {
  const h = setup(); open(h);
  assert.equal(saved(h).phase, 'playing'); assert.equal(saved(h).shift.customers.length, 1); assert.equal(h.frames.size, 1);
  assert.equal(saved(h).profile.menu.length, 2); assert.equal(el(h, 'Cook2').hidden, true); assert.equal(el(h, 'HelpText').hidden, true);
  for (const removed of ['Start', 'Prep', 'Menu', 'Restock', 'Shop', 'Coins', 'XP', 'Receipt', 'Confirm', 'Discard', 'End']) assert.equal(el(h, removed), null, removed);
  assert.match(el(h, 'Goal').textContent, /Giao 0\/8 · cần 5/); assert.equal(h.container.querySelectorAll('details').length, 0);
  close(h);
});

test('only cook then customer tap is required; collection and dish matching are automatic', () => {
  const h = setup(); open(h); click(h, 'Cook0'); click(h, 'Cook0'); assert.equal(saved(h).shift.jobs.filter(Boolean).length, 1);
  const artwork = el(h, 'CookArt0').children[0]; run(h, 4600);
  assert.equal(el(h, 'CookArt0').children[0], artwork); assert.equal(saved(h).shift.jobs.filter(Boolean).length, 0);
  assert.equal(saved(h).shift.tray.length, 1); assert.equal(el(h, 'CustomerHint0').textContent, 'Giao');
  assert.equal(el(h, 'Customer0').classList.contains('hr3-match'), true);
  click(h, 'Customer0'); assert.equal(saved(h).shift.served, 1); assert.equal(saved(h).shift.tray.length, 0);
  click(h, 'Customer0'); assert.equal(saved(h).shift.served, 1); close(h);
});

test('prevents unnecessary dishes and repeated cooks; premature customer taps are harmless', () => {
  const h = setup(); open(h); const before = saved(h).shift.stock;
  click(h, 'Cook1'); assert.deepEqual(saved(h).shift.stock, before, 'do not cook a dish no customer ordered');
  click(h, 'Customer0'); assert.equal(saved(h).shift.served, 0); assert.match(el(h, 'Status').textContent, /nấu/);
  click(h, 'Cook0'); run(h, 500); click(h, 'Cook0'); assert.equal(saved(h).shift.jobs.filter(Boolean).length, 1);
  click(h, 'Customer0'); assert.match(el(h, 'Status').textContent, /Đợi/); close(h);
});

test('keyboard is just 1–3 to cook, Q/W/E/R to serve and P to pause; repeats/editable inputs ignored', () => {
  const h = setup(); open(h); h.container.dispatch('keydown', { key: '1', repeat: true }); assert.equal(saved(h).shift.jobs.filter(Boolean).length, 0);
  h.container.dispatch('keydown', { key: '1', target: { tagName: 'INPUT' } }); assert.equal(saved(h).shift.jobs.filter(Boolean).length, 0);
  h.container.dispatch('keydown', { key: '1' }); run(h, 4600); h.container.dispatch('keydown', { key: 'q' }); assert.equal(saved(h).shift.served, 1);
  h.container.dispatch('keydown', { key: 'p' }); assert.equal(saved(h).phase, 'paused'); assert.equal(h.frames.size, 0);
  h.container.dispatch('keydown', { key: 'p' }); assert.equal(saved(h).phase, 'playing'); assert.equal(el(h, 'Pause').focused, true); close(h);
});

test('optional short help pauses; closing it does not silently resume; resume closes help', () => {
  const h = setup(); open(h); click(h, 'Help'); assert.equal(el(h, 'HelpText').hidden, false); assert.equal(saved(h).phase, 'paused');
  click(h, 'Cook0'); assert.equal(saved(h).shift.jobs.filter(Boolean).length, 0);
  click(h, 'Help'); assert.equal(saved(h).phase, 'paused'); assert.equal(el(h, 'HelpText').hidden, true);
  click(h, 'Help'); click(h, 'Resume'); assert.equal(saved(h).phase, 'playing'); assert.equal(el(h, 'HelpText').hidden, true); close(h);
});

test('blur, hidden tab and pagehide preserve paused progress; reopening requires explicit resume', () => {
  const h = setup(); open(h); firstDish(h); click(h, 'Customer0'); run(h, 3300);
  h.window.dispatch('blur'); const before = saved(h).shift.elapsed; assert.equal(saved(h).phase, 'paused'); assert.equal(el(h, 'Scene').inert, true);
  run(h, 30000); assert.equal(saved(h).shift.elapsed, before); assert.equal(h.frames.size, 0);
  click(h, 'Resume'); run(h, 1000); h.document.hidden = true; h.document.dispatch('visibilitychange'); assert.equal(saved(h).phase, 'paused');
  h.document.hidden = false; click(h, 'Resume'); h.window.dispatch('pagehide'); assert.equal(saved(h).phase, 'paused'); close(h);
  open(h); assert.equal(el(h, 'PauseCover').hidden, false); assert.equal(h.frames.size, 0); click(h, 'Resume'); assert.equal(h.frames.size, 1); close(h);
});

test('winning and next shift take one button, no receipt/setup; no duplicate rewards on repeated taps', () => {
  const h = setup(); open(h); playUI(h);
  assert.equal(saved(h).result.won, true); assert.equal(el(h, 'ResultTitle').textContent, 'Xong ca!'); assert.equal(el(h, 'ResultTitle').focused, true);
  assert.equal(el(h, 'Unlock').hidden, true, 'ordinary level gains do not add unrelated progression text');
  assert.equal(el(h, 'Receipt'), null); assert.equal(saved(h).profile.shifts, 1); assert.equal(h.frames.size, 0);
  click(h, 'Next'); assert.equal(saved(h).phase, 'playing'); assert.equal(saved(h).profile.shifts, 1); assert.equal(saved(h).shift.customers.length, 1);
  const second = saved(h); click(h, 'Next'); assert.deepEqual(saved(h), second); close(h);
});

test('stage and newly served recipe unlocks are announced on the result screen', () => {
  const p = M.create().view().profile;
  p.level = 3; p.xp = M.xpNeeded(p.level) - 1;
  const seed = M.create({ profile: p }).serialize();
  const h = setup({ storage: new Map([[KEY, JSON.stringify(seed)]]) }); open(h);
  assert.equal(el(h, 'Unlock').hidden, true);
  playUI(h);
  assert.equal(saved(h).profile.level, 4);
  assert.match(el(h, 'Unlock').textContent, /Khu mới: Xe đẩy/);
  assert.match(el(h, 'Unlock').textContent, /Món mới: Cá viên chiên · Nước mía/);
  assert.equal(el(h, 'Unlock').hidden, false);
  close(h);
});

test('loss exposes only retry and starts a playable new shift automatically', () => {
  const m = M.create(); m.restock(); m.begin(); m.end();
  const h = setup({ storage: new Map([[KEY, JSON.stringify(m.serialize())]]) }); open(h);
  run(h, 85000); assert.equal(saved(h).phase, 'result'); assert.equal(el(h, 'ResultTitle').textContent, 'Thử lại nhé');
  click(h, 'Next'); assert.equal(saved(h).phase, 'playing'); assert.equal(el(h, 'Prep'), null); close(h);
});

test('v2 migration preserves level, balances and upgrades; v2 data is never written', () => {
  const p = { level: 8, coins: 4321, exp: 20, expNeeded: 400, inventory: { sausage: 100, tea_milk: 100, bread: 100, egg_pate: 100, ice: 100, oil: 100, lime: 100, sugar: 100 }, upgrades: { extraChair: true } };
  const old = JSON.stringify(p), h = setup({ storage: new Map([[OLD, old]]) }); open(h);
  assert.equal(saved(h).profile.level, 8); assert.equal(saved(h).profile.coins, 4321); assert.equal(saved(h).profile.upgrades.extraChair, true); assert.equal(h.stored.get(OLD), old);
  assert.equal(saved(h).phase, 'playing'); assert.equal(el(h, 'Customer3').hidden, false); close(h); assert.equal(h.stored.get(OLD), old);
});

test('active v3 save retains its exact menu, stock, jobs, balance and elapsed time on reopen', () => {
  const m = M.create(); m.restock(); m.begin(); m.cook('banhmi_trung'); m.step(2137); const source = m.serialize();
  const h = setup({ storage: new Map([[KEY, JSON.stringify(source)]]) }); open(h);
  assert.equal(saved(h).phase, 'paused'); assert.deepEqual(saved(h).shift, source.shift); assert.deepEqual(saved(h).profile, source.profile);
  click(h, 'Resume'); run(h, 2600); assert.equal(saved(h).shift.tray[0].recipe, 'banhmi_trung'); close(h);
});

test('legacy exhausted-tutorial snapshot can cook without stock decisions or an end-shift button', () => {
  const m = M.create(); m.restock(); m.begin(); const source = m.serialize();
  source.shift.stock.bread = 0; source.shift.stock.egg_pate = 0;
  source.shift.usedCost = source.profile.inventory.bread * 4 + source.profile.inventory.egg_pate * 3; source.shift.waste = source.shift.usedCost;
  source.profile.coins = 0; assert.ok(M.restore(source));
  const h = setup({ storage: new Map([[KEY, JSON.stringify(source)]]) }); open(h); click(h, 'Resume');
  assert.equal(el(h, 'Cook0').disabled, false); firstDish(h); click(h, 'Customer0'); assert.equal(saved(h).shift.served, 1); assert.ok(M.restore(saved(h)));
  assert.equal(saved(h).profile.coins, 0); close(h);
});

test('corrupt/future saves remain untouched; backup recovery and denied storage still allow immediate play', () => {
  for (const bad of ['{broken', JSON.stringify({ version: 900, profile: M.create().view().profile })]) {
    const h = setup({ storage: new Map([[KEY, bad], [BACKUP, JSON.stringify(M.create().serialize())]]) }); open(h);
    click(h, 'Cook0'); run(h, 4600); assert.equal(h.stored.get(KEY), bad); assert.equal(h.frames.size, 1); assert.equal(el(h, 'Storage').hidden, false); close(h);
  }
  const h = setup(); h.context.localStorage.getItem = () => { throw Error('denied'); }; h.context.localStorage.setItem = () => { throw Error('quota'); };
  open(h); click(h, 'Cook0'); run(h, 4600); assert.equal(el(h, 'CustomerHint0').textContent, 'Giao'); close(h);
  const q = setup(); q.context.localStorage.setItem = () => { throw Error('quota'); }; open(q); assert.equal(el(q, 'Storage').hidden, false); close(q);
});

test('repeated mount/close and queued audio/RAF clean up all owned resources', () => {
  const h = setup(); const baseline = h.document.listenerCount(); let tones = 0;
  const audio = { init() {}, playTone() { tones++; } }; h.context.NEWPLAYGROUND_MUTED = false;
  for (let i = 0; i < 15; i++) {
    open(h, audio); if (saved(h).phase === 'paused') click(h, 'Resume'); click(h, 'Cook0'); run(h, 4600); click(h, 'Customer0');
    const queued = [...h.frames.values()], delayed = [...h.timers.values()].map(x => x.callback);
    close(h); assert.equal(h.timers.size, 0); assert.equal(h.document.listenerCount(), baseline); const before = tones;
    queued.forEach(fn => fn(100000)); delayed.forEach(fn => fn()); assert.equal(tones, before); assertStopped(h);
  }
});

test('icons have accessible text fallback, controls are 44px minimum and compact/reduced-motion CSS exists', () => {
  const h = setup({ compact: true }); open(h); assert.match(el(h, 'CookName0').textContent, /Bánh mì/);
  const css = read('scripts/games/hangrong.css'); assert.match(css, /min-width: 44px; min-height: 44px/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /max-width: 520px/); assert.match(css, /forced-colors/);
  const svg = read('assets/sprites/hangrong/atlas.svg'); for (const id of Object.keys(M.RECIPES)) assert.ok(svg.includes(`id="food-${id}"`));
  assert.equal(el(h, 'Status').getAttribute('aria-live'), 'polite'); assert.match(el(h, 'Customer0').getAttribute('aria-label'), /Bánh mì/); close(h);
});

test('saved four-seat upgrade lays out all customer controls in a responsive four-column grid', () => {
  const p = M.create().view().profile; p.upgrades.extraChair = true;
  const m = M.create({ profile: p }); m.restock(); assert.ok(m.begin().ok);
  const h = setup({ compact: true, storage: new Map([[KEY, JSON.stringify(m.serialize())]]) }); open(h); click(h, 'Resume');
  for (let i = 0; i < 4; i++) assert.equal(el(h, 'Customer' + i).hidden, false);
  const css = read('scripts/games/hangrong.css');
  assert.match(css, /\.hr3-customers\.hr3-four-seats\s*\{[^}]*display:\s*grid/);
  assert.match(css, /grid-template-columns:\s*repeat\(4,\s*minmax\(44px,\s*1fr\)\)/);
  assert.match(css, /\.hr3-four-seats \.hr3-customer\s*\{[^}]*width:\s*auto/);
  assert.doesNotMatch(css, /\.hr3-four-seats \.hr3-customer\s*\{[^}]*width:\s*25%/);
  close(h);
});

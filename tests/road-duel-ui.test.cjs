const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/road-duel-model.js');

class Target {
  constructor(id = '', tag = 'DIV', className = '') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.className = className;
    this.listeners = new Map();
    this.attributes = new Map();
    this.style = {};
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this.parentElement = null;
    this.focused = false;
    const classes = new Set(className.split(/\s+/).filter(Boolean));
    this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) };
  }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== fn)); }
  dispatch(type, data = {}) {
    const event = { target: this, preventDefault() { this.defaultPrevented = true; }, ...data };
    for (const fn of [...(this.listeners.get(type) || [])]) fn(event);
    return event;
  }
  click() { if (!this.disabled) return this.dispatch('click'); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  focus() { this.focused = true; }
  closest(selector) { return selector.includes('button') && this.tagName === 'BUTTON' ? this : null; }
  setPointerCapture() {}
  getContext() {
    if (!this.context) {
      this.context = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) }, {
        get(target, property) { return property in target ? target[property] : () => {}; },
        set(target, property, value) { target[property] = value; return true; }
      });
    }
    return this.context;
  }
}

class Container extends Target {
  constructor() { super('container', 'DIV'); this.nodes = new Map(); this._html = ''; }
  set innerHTML(html) {
    this._html = html; this.nodes.clear();
    const tagPattern = /<(canvas|button|div|section|nav|p|h2|strong|span)[^>]*>/gi;
    let match;
    while ((match = tagPattern.exec(html))) {
      const tag = match[1];
      const open = match[0];
      const id = open.match(/\bid="([^"]+)"/)?.[1];
      const cls = open.match(/\bclass="([^"]+)"/)?.[1] || '';
      const node = new Target(id || '', tag, cls);
      if (id) this.nodes.set('#' + id, node);
      if (cls.split(/\s+/).includes('dd-progress')) this.nodes.set('.dd-progress', node);
    }
    const track = this.nodes.get('.dd-progress');
    if (track) track.setAttribute = Target.prototype.setAttribute.bind(track);
    const bar = this.nodes.get('#ddProgress');
    if (bar) bar.parentElement = track;
    const progressBar = new Target('progressbar', 'DIV');
    if (track) track.parentElement = progressBar;
  }
  get innerHTML() { return this._html; }
  querySelector(selector) { return this.nodes.get(selector) || null; }
}

class Session {
  constructor() { this.listeners = []; this.cleanups = []; this.frames = new Map(); this.nextId = 1; this.listen = this.listen.bind(this); this.onCleanup = this.onCleanup.bind(this); this.requestAnimationFrame = this.requestAnimationFrame.bind(this); this.cancelAnimationFrame = this.cancelAnimationFrame.bind(this); }
  listen(target, type, fn) { target.addEventListener(type, fn); this.listeners.push({ target, type, fn }); }
  onCleanup(fn) { this.cleanups.push(fn); }
  requestAnimationFrame(fn) { const id = this.nextId++; this.frames.set(id, fn); return id; }
  cancelAnimationFrame(id) { this.frames.delete(id); }
  frame(time) { const first = this.frames.entries().next().value; if (!first) return false; const [id, fn] = first; this.frames.delete(id); fn(time); return true; }
  stop() {
    for (const item of this.listeners) item.target.removeEventListener(item.type, item.fn);
    this.listeners = [];
    for (const fn of this.cleanups.splice(0)) fn();
    this.frames.clear();
  }
}

function mount(storage = new Map(), options = {}) {
  const window = new Target('window', 'WINDOW');
  window.NP_RoadDuelModel = M;
  const motionQuery = options.motionQuery || { matches: !!options.reducedMotion };
  window.matchMedia = () => motionQuery;
  window.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value))
  };
  const document = new Target('document', 'DOCUMENT');
  document.hidden = false;
  const container = new Container();
  const session = new Session();
  const context = { window, document, console };
  vm.runInNewContext(fs.readFileSync('scripts/games/road-duel.js', 'utf8'), context, { filename: 'road-duel.js' });
  const mounted = window.NP_RoadDuel.mount(container, session, {});
  return { window, document, container, session, mounted, storage, motionQuery };
}

function finishCourseThroughInput(h) {
  const active = new Set(), keyEvent = (type, key) => h.container.dispatch(type, { key, repeat: false });
  const hold = key => { if (!active.has(key)) { keyEvent('keydown', key); active.add(key); } };
  const release = key => { if (active.delete(key)) keyEvent('keyup', key); };
  hold('ArrowUp');
  let now = 0;
  for (let tick = 0; tick < 3600 && h.mounted.getModel().view().status === 'playing'; tick++) {
    const v = h.mounted.getModel().view(), near = v.hazardsAhead.find(item => item.ahead < 48);
    const safe = near ? [-0.34, 0, 0.34].filter(lane => Math.abs(lane - near.lane) > 0.2) : [0];
    const target = safe.sort((a, b) => Math.abs(a - v.lane) - Math.abs(b - v.lane))[0];
    const direction = v.lane < target - 0.02 ? 'ArrowRight' : v.lane > target + 0.02 ? 'ArrowLeft' : '';
    release(direction === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight');
    if (direction) hold(direction); else { release('ArrowLeft'); release('ArrowRight'); }
    h.session.frame(now);
    now += 1000 / 60;
  }
  for (const key of active) release(key);
}

test('immediate compact interface starts a race and session cleanup releases every resource', () => {
  const h = mount();
  assert.doesNotMatch(h.container.innerHTML, /Road Rash|Electronic Arts|Genesis|EA Sports/i);
  const css = fs.readFileSync('scripts/games/road-duel.css', 'utf8');
  assert.match(css, /min-width:48px/);
  assert.match(css, /min-height:48px/);
  assert.equal(h.container.classList.contains('dd-host'), true);
  assert.ok(h.container.querySelector('#ddCanvas'));
  assert.equal(h.container.querySelector('#ddOverlay').hidden, true);
  assert.equal(h.container.querySelector('#ddDistance').textContent, '0 / 720 m');
  assert.equal(h.container.querySelector('#ddPlace').textContent, '4 / 4');
  assert.equal(h.container.querySelector('#ddProgress').style.width, '0%');
  assert.equal(h.container.querySelector('.dd-progress').getAttribute('aria-valuenow'), '0');
  assert.equal(h.container.querySelector('#ddCanvas').focused, true);
  assert.ok(h.container.querySelector('#ddAttack'));
  assert.ok(h.container.querySelector('#ddStageNav'));
  assert.equal(h.container.querySelector('#ddStage1').disabled, true);
  assert.equal(h.container.querySelector('#ddStage2').disabled, true);
  assert.equal(h.mounted.getModel().view().stageName, 'Bãi Cát');
  assert.equal(h.session.frames.size, 1);
  h.session.stop();
  assert.equal(h.container.classList.contains('dd-host'), false);
  assert.equal(h.session.frames.size, 0);
  assert.equal(h.window.listeners.get('blur')?.length || 0, 0);
  assert.equal(h.container.listeners.get('keydown')?.length || 0, 0);
});

test('reduced-motion mode holds decorative road movement and bike lean while hazards stay model-driven', () => {
  const motionQuery = new Target(); motionQuery.matches = true;
  const h = mount(new Map(), { motionQuery });
  const root = h.container.querySelector('#ddGameRoot');
  assert.equal(h.mounted.isReducedMotion(), true);
  assert.equal(root.getAttribute('data-motion'), 'reduced');
  assert.match(fs.readFileSync('scripts/games/road-duel.js', 'utf8'), /const visualDistance = reducedMotion \? 0 : v\.distance/);
  assert.match(fs.readFileSync('scripts/games/road-duel.js', 'utf8'), /reducedMotion \? 0 : currentSteer/);
  motionQuery.matches = false;
  motionQuery.dispatch('change', { matches: false });
  assert.equal(h.mounted.isReducedMotion(), false);
  assert.equal(root.getAttribute('data-motion'), 'full');
  h.session.stop();
  assert.equal(motionQuery.listeners.get('change')?.length || 0, 0);
});

test('touch-style held controls steer and accelerate; melee is one edge-triggered action', () => {
  const h = mount();
  const gas = h.container.querySelector('#ddGas');
  const right = h.container.querySelector('#ddRight');
  gas.dispatch('pointerdown', { pointerId: 1 });
  right.dispatch('pointerdown', { pointerId: 2 });
  h.session.frame(0);
  h.session.frame(250);
  h.session.frame(500);
  gas.dispatch('pointerup', { pointerId: 1 });
  right.dispatch('pointerup', { pointerId: 2 });
  const moved = h.mounted.getModel().view();
  assert.ok(moved.speed > 18);
  assert.ok(moved.lane > 0);
  assert.notEqual(h.container.querySelector('#ddProgress').style.width, '0%');
  assert.ok(Number(h.container.querySelector('.dd-progress').getAttribute('aria-valuenow')) > 0);
  h.container.querySelector('#ddReplayTop').click();
  assert.equal(h.mounted.getModel().view().tick, 0);
  h.container.querySelector('#ddAttack').click();
  assert.equal(h.mounted.getModel().view().hits, 1);
  assert.match(h.container.querySelector('#ddLive').textContent, /Tạt trúng/);
  h.session.stop();
});

test('close-range melee guidance explains the miss cost and the live message confirms it', () => {
  const h = mount();
  assert.match(h.container.innerHTML, /Space\/Tạt sát xe để ghìm đối thủ; hụt mất đà/);
  const model = h.mounted.getModel();
  for (let i = 0; i < 120; i++) model.advance(M.STEP, { brake: true });
  for (let i = 0; i < 30; i++) model.advance(M.STEP, { accelerate: true });
  const speedBefore = model.view().speed;
  h.container.querySelector('#ddAttack').click();
  assert.equal(model.view().speed, speedBefore - M.ATTACK_MISS_SPEED_LOSS);
  assert.match(h.container.querySelector('#ddLive').textContent, /Tạt hụt\. Mất đà/);
  h.session.stop();
});

test('keyboard steering still works while a touch control button has focus', () => {
  const h = mount();
  const gas = h.container.querySelector('#ddGas');
  gas.focus();
  h.container.dispatch('keydown', { key: 'ArrowUp', target: gas, repeat: false });
  h.container.dispatch('keydown', { key: 'ArrowRight', target: gas, repeat: false });
  h.session.frame(0); h.session.frame(250);
  h.container.dispatch('keyup', { key: 'ArrowUp', target: gas });
  h.container.dispatch('keyup', { key: 'ArrowRight', target: gas });
  assert.ok(h.mounted.getModel().view().speed > 18);
  assert.ok(h.mounted.getModel().view().lane > 0);
  h.session.stop();
});

test('pause, resume, tab visibility and replay leave no stale input or extra animation loop', () => {
  const h = mount();
  h.container.querySelector('#ddGas').dispatch('pointerdown', { pointerId: 1 });
  h.session.frame(0); h.session.frame(100);
  h.container.querySelector('#ddPause').click();
  assert.equal(h.mounted.isPaused(), true);
  assert.equal(h.container.querySelector('#ddPause').getAttribute('aria-pressed'), 'true');
  assert.equal(h.container.querySelector('#ddPause').getAttribute('aria-label'), 'Tiếp tục');
  assert.equal(h.session.frames.size, 0);
  assert.equal(h.container.querySelector('#ddOverlay').hidden, false);
  h.container.querySelector('#ddOverlayAction').click();
  assert.equal(h.mounted.isPaused(), false);
  assert.equal(h.container.querySelector('#ddPause').getAttribute('aria-pressed'), 'false');
  assert.equal(h.session.frames.size, 1);
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.mounted.isPaused(), true);
  assert.equal(h.session.frames.size, 0);
  h.document.hidden = false;
  h.container.querySelector('#ddOverlayAction').click();
  h.container.querySelector('#ddReplayTop').click();
  assert.equal(h.mounted.isPaused(), false);
  assert.equal(h.session.frames.size, 1);
  h.session.stop();
  assert.equal(h.session.frames.size, 0);
});

test('repeated mount and teardown cycles do not retain listeners or frames', () => {
  for (let i = 0; i < 12; i++) {
    const h = mount();
    h.session.stop();
    assert.equal(h.session.frames.size, 0);
    assert.equal(h.container.classList.contains('dd-host'), false);
    assert.equal(h.container.listeners.get('keyup')?.length || 0, 0);
    assert.equal(h.window.listeners.get('pagehide')?.length || 0, 0);
  }
});

test('winning a race saves cup progress, unlocks the next original course, and resumes there', () => {
  const h = mount();
  finishCourseThroughInput(h);
  const first = h.mounted.getModel().view();
  assert.equal(first.status, 'won');
  assert.equal(first.stageIndex, 0);
  assert.equal(first.unlockedStage, 1);
  assert.equal(h.container.querySelector('#ddStage1').disabled, false);
  const saved = JSON.parse(h.storage.get('np_dua_gio_cup_v1'));
  assert.equal(M.validProgress(saved), true);
  assert.equal(saved.bestPlaces[0], first.place);
  assert.equal(saved.bestTimes[0], first.finishTimeMs);
  assert.equal(h.container.querySelector('#ddStage0').disabled, false);
  h.container.querySelector('#ddStage0').click();
  assert.equal(h.mounted.getModel().view().stageIndex, 0, 'an unlocked course can be replayed from its tab');
  finishCourseThroughInput(h);
  assert.equal(h.mounted.getModel().view().status, 'won');
  assert.match(h.container.querySelector('#ddResultNote').textContent, /^0:\d{2}\.\d{2} · Chặng sau:/);
  h.container.querySelector('#ddOverlayAction').click();
  assert.equal(h.mounted.getModel().view().stageIndex, 1);
  assert.equal(h.mounted.getModel().view().stageName, 'Đèo Mây');
  assert.equal(h.container.querySelector('#ddDistance').textContent, '0 / 780 m');
  h.session.stop();

  const resumed = mount(h.storage);
  assert.equal(resumed.mounted.getModel().view().stageIndex, 1);
  assert.equal(resumed.mounted.getModel().view().unlockedStage, 1);
  assert.equal(resumed.mounted.getModel().view().bestPlaces[0], first.place);
  assert.equal(resumed.mounted.getModel().view().bestTimes[0], first.finishTimeMs);
  assert.match(resumed.container.querySelector('#ddStageBest0').textContent, /^H1 · \d+:\d{2}\.\d{2}$/);
  resumed.session.stop();
});

test('corrupt cup progress is backed up and a future save is preserved untouched', () => {
  const corruptRaw = '{broken cup save';
  const corrupt = mount(new Map([['np_dua_gio_cup_v1', corruptRaw]]));
  assert.equal(corrupt.storage.get('np_dua_gio_cup_v1_recovery'), corruptRaw);
  assert.equal(corrupt.storage.get('np_dua_gio_cup_v1'), corruptRaw);
  assert.equal(corrupt.container.querySelector('#ddSaveNote').hidden, false);
  corrupt.session.stop();

  const futureRaw = JSON.stringify({ version: 99, unlockedStage: 2, bestPlaces: [1, 1, 1] });
  const future = mount(new Map([['np_dua_gio_cup_v1', futureRaw]]));
  assert.equal(future.storage.get('np_dua_gio_cup_v1'), futureRaw);
  assert.equal(future.container.querySelector('#ddSaveNote').hidden, false);
  assert.equal(future.mounted.getModel().view().stageIndex, 0);
  future.session.stop();
});

test('the exact catalog route launches original Đua Gió and uses its cover', () => {
  const h = harness();
  assert.equal(h.context.openGameById('road-rash-dua-xe-moto'), true);
  assert.ok(h.container.querySelector('#ddCanvas'));
  assert.match(h.container.innerHTML, /Đua Gió/);
  assert.match(read('app.js'), /'road-rash-dua-xe-moto': 'assets\/dua-gio-original\.svg'/);
  assert.match(read('scripts/release-preflight.mjs'), /'road_rash_cover\.jpg'/);
  assert.deepEqual(h.errors, []);
  h.context.closeGameModal();
  assertStopped(h);
});

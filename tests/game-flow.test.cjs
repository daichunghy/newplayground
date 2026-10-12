// Dependency-free source/DOM regression checks. Canvas/audio are mocked, not visual QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = process.env.NP_TEST_ROOT || path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const games = JSON.parse(read('data/games.json'));

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback, options) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    const list = this.listeners.get(type) || [];
    if (!list.some(x => x.callback === callback && x.capture === capture)) list.push({ callback, capture });
    this.listeners.set(type, list);
  }
  removeEventListener(type, callback, options) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    this.listeners.set(type, (this.listeners.get(type) || []).filter(x => x.callback !== callback || x.capture !== capture));
  }
  dispatch(type, values = {}) {
    const event = { type, target: this, preventDefault() {}, stopPropagation() {}, ...values };
    for (const item of [...(this.listeners.get(type) || [])]) {
      if ((this.listeners.get(type) || []).includes(item)) item.callback.call(this, event);
    }
  }
  listenerCount() { return [...this.listeners.values()].reduce((n, list) => n + list.length, 0); }
}

const drawImageCalls = [];
const drawing = new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'measureText') return text => ({ width: String(text).length * 8 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (key === 'drawImage') return (...args) => drawImageCalls.push(args);
    return () => {};
  },
  set(target, key, value) { target[key] = value; return true; }
});

class Element extends Target {
  constructor(tag = 'div', attrs = '') {
    super(); this.tagName = tag.toUpperCase(); this.children = []; this.style = {}; this.dataset = {};
    this.attributes = {}; this.textContent = ''; this.width = 640; this.height = 480;
    this.classList = {
      add: (...names) => names.forEach(n => { if (!this.className.split(' ').includes(n)) this.className += ' ' + n; }),
      remove: (...names) => { this.className = this.className.split(' ').filter(n => !names.includes(n)).join(' '); },
      contains: name => this.className.split(' ').includes(name),
      toggle: name => { const has = this.classList.contains(name); this.classList[has ? 'remove' : 'add'](name); return !has; }
    };
    this.className = '';
    for (const match of attrs.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) this.setAttribute(match[1], match[2] ?? match[3]);
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase())] = value;
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  set innerHTML(html) {
    this.html = html; this.children = [];
    for (const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) this.appendChild(new Element(m[1], m[2]));
  }
  get innerHTML() { return this.html || ''; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  replaceChildren(...children) { this.html = ''; this.children = children; }
  querySelectorAll(selector) {
    const selectors = selector.split(',').map(x => x.trim());
    const matches = node => selectors.some(s => {
      if (s.startsWith('#')) return node.id === s.slice(1);
      if (s.startsWith('.')) return s.slice(1).split('.').every(c => node.classList.contains(c));
      return node.tagName.toLowerCase() === s.toLowerCase();
    });
    return this.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getContext() { return drawing; }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; }
  focus() {}
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); }
}

function harness({ loadEngines = true, loadApp = true, ImageClass } = {}) {
  const errors = [], vibrations = [], timers = new Map(), frames = new Map();
  let nextId = 1, now = 0;
  const window = new Target(), document = new Target();
  document.readyState = 'loading'; document.body = new Element('body');
  for (const id of ['gameModal', 'modalGameTitle', 'modalGameBadge', 'modalGameContainer', 'toastBox']) {
    document.body.appendChild(new Element('div', `id="${id}"`));
  }
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.body.querySelector('#' + id);
  document.querySelector = selector => document.body.querySelector(selector);
  document.querySelectorAll = selector => document.body.querySelectorAll(selector);
  const stored = new Map();
  const context = vm.createContext(Object.assign(window, {
    window, document, navigator: { vibrate: pattern => vibrations.push(pattern) },
    console: { log() {}, warn() {}, error: (...args) => errors.push(args.map(String).join(' ')) },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, val) => stored.set(key, String(val)) },
    performance: { now: () => now },
    setTimeout(callback, delay, ...args) { const id = nextId++; timers.set(id, { callback, args, delay, interval: false }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay, ...args) { const id = nextId++; timers.set(id, { callback, args, delay, interval: true }); return id; },
    clearInterval(id) { timers.delete(id); },
    requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    __testGames: games,
    NEWPLAYGROUND_MUTED: true
  }));
  const run = file => vm.runInContext(read(file), context, { filename: file });
  if (ImageClass) context.Image = ImageClass;
  run('scripts/game-session.js'); run('scripts/game-feel.js'); run('scripts/game-art.js');
  if (loadEngines) for (const file of ['engines.js', 'engines-classics.js', 'engines-popcap.js', 'engines-retro50.js', 'engines-archetypes.js', 'engines-typer-shark.js']) run('scripts/' + file);
  if (loadApp) vm.runInContext(read('app.js').replace('let allGames = [];', 'let allGames = globalThis.__testGames;'), context, { filename: 'app.js' });
  return {
    context, window, document, timers, frames, errors, vibrations, stored, drawImageCalls,
    frame(stepMs = 16) { now += stepMs; for (const [id, callback] of [...frames]) { if (frames.delete(id)) callback(now); } },
    flushTimeouts() { for (const [id, item] of [...timers]) if (!item.interval && timers.delete(id)) item.callback(...item.args); },
    container: document.getElementById('modalGameContainer')
  };
}

function assertStopped(h) {
  assert.equal(h.frames.size, 0, 'no scheduled animation frames');
  assert.equal([...h.timers.values()].filter(x => x.interval).length, 0, 'no game intervals');
  assert.equal(h.window.listenerCount(), 0, 'no window game input listeners');
  assert.equal(h.container.children.length, 0, 'closed game DOM removed');
}

test('one specialized or generic launcher per catalog selection; Retro50 has priority', () => {
  const h = harness(); const calls = [];
  for (const name of Object.keys(h.context.NP_Engines)) h.context.NP_Engines[name] = () => calls.push(name);
  h.context.NP_Retro50Engines.launchGame = () => calls.push('retro50');
  for (const game of games) {
    calls.length = 0;
    assert.equal(h.context.openGameById(game.id), true);
    assert.equal(calls.length, 1, game.id + ' must start exactly one engine');
  }
  for (const [id, expected] of [['hang-rong', 'launchHangRong'], ['zuma-ech-ban-ngoc', 'launchZuma'], ['line-98', 'launchLine98'], ['ran-san-moi-snake', 'launchSnake'], ['boom-online-bnb', 'retro50'], ['bubble-bobble-khung-long-bong-bong', 'retro50'], ['bong-bong-nuoc-bubble-trouble', 'launchRetroArcade'], ['lemonade-tycoon', 'launchRetroArcade'], ['dr-mario-diet-khuan', 'launchTetris'], ['ban-ruoi-galaga', 'launchRetroArcade']]) {
    calls.length = 0; h.context.openGameById(id); assert.deepEqual(calls, [expected]);
  }
  calls.length = 0; h.context.openGameById('ban-ga-vu-tru'); assert.deepEqual(calls, ['launchChickenInvaders'], 'Chicken Invaders keeps its own engine after Galaga is split out');
  assert.equal(h.context.openGameById('not-in-catalog'), false);
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
  h.context.openGameById('contra-2d');
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  assert.ok(h.vibrations.includes(8));
  h.context.openGameById('boom-online-bnb');
  assert.equal(h.container.querySelector('#arcCanvas'), null);
  assert.ok(h.container.querySelector('#bnbCanvas'));
  const before = h.vibrations.length;
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  assert.equal(h.vibrations.length, before, 'old arcade firing listener was removed');
  h.context.closeGameModal(); h.flushTimeouts(); assertStopped(h);
  for (let n = 0; n < 5; n++) { h.context.openGameById('road-rash-dua-xe-moto'); h.frame(); h.context.closeGameModal(); assertStopped(h); }
});

test('failed launch cleans partial resources and can reopen; missing engines show a message', () => {
  const h = harness(); const original = h.context.NP_Engines.launchSnake;
  h.context.NP_Engines.launchSnake = () => {
    const s = h.context.NP_GameSession.start(); s.setInterval(() => {}, 10); s.listen(h.window, 'keydown', () => {});
    throw new Error('test launch failure');
  };
  h.context.openGameById('ran-san-moi-snake');
  assertStopped(h); assert.match(h.container.textContent, /Không thể mở/);
  h.context.NP_Engines.launchSnake = original; h.context.openGameById('ran-san-moi-snake');
  assert.ok(h.container.querySelector('#snkCanvas')); h.context.closeGameModal(); assertStopped(h);
  h.context.NP_Engines = undefined; h.context.NP_Retro50Engines = undefined;
  h.context.openGameById('lemonade-tycoon'); assert.match(h.container.textContent, /Chưa tải được/);
});

test('engine resources use local sessions; portal APIs and script order stay independent', () => {
  for (const file of ['engines.js', 'engines-classics.js', 'engines-popcap.js', 'engines-retro50.js']) {
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

test('Line98 and Duck Hunt deferred actions do not revive a closed game', () => {
  const h = harness();
  h.context.openGameById('line-98');
  h.frame();
  h.context.closeGameModal();
  assert.equal(h.timers.size, 0); assertStopped(h);
  h.context.openGameById('duck-hunt-ban-vit');
  const canvas = h.container.querySelector('#dhCanvas');
  assert.ok(canvas);
  canvas.dispatch('click');
  for (let i = 0; i < 1000 && ![...h.timers.values()].some(x => x.delay === 800); i++) h.frame();
  assert.ok([...h.timers.values()].some(x => x.delay === 800), 'Duck Hunt queued its next-target timer');
  h.context.closeGameModal();
  assert.equal(h.timers.size, 0, 'close cancels the queued next-target timer');
  h.flushTimeouts();
  assertStopped(h);
  assert.equal(h.errors.length, 0);
});

test('Zuma renders its intro and next frame without the former undefined track length', () => {
  const h = harness();
  h.context.openGameById('zuma-ech-ban-ngoc');
  assert.ok(h.container.querySelector('#zmCanvas'));
  assert.doesNotThrow(() => { h.frame(); h.frame(); });
  h.container.querySelector('#zmStartGameBtn').dispatch('click');
  assert.doesNotThrow(() => h.frame());
  assert.equal(h.frames.size, 1, 'Zuma keeps its own render loop alive');
  h.context.closeGameModal(); assertStopped(h);
});

test('closing during shared screen shake and audio fanfare cancels effects and restores transform', () => {
  const h = harness(); h.context.openGameById('lemonade-tycoon');
  h.container.style.transform = 'scale(1)';
  h.context.NP_Juice.screenShake(h.container, 10, 600); h.frame();
  assert.match(h.container.style.transform, /translate/);
  h.context.NP_Audio.win(); h.context.NP_AudioEngine.coin();
  assert.ok(h.timers.size > 0);
  h.context.closeGameModal();
  assert.equal(h.container.style.transform, 'scale(1)');
  assert.equal(h.timers.size, 0); assertStopped(h);
  h.context.openGameById('contra-2d');
  h.context.NP_Juice.screenShake(h.container, 10, 30); h.frame();
  h.context.NP_Juice.screenShake(h.container, 5, 30); h.frame(); h.frame();
  assert.equal(h.container.style.transform, 'scale(1)', 'overlapping effects restore the original transform');
  h.context.closeGameModal(); assertStopped(h);
});

test('malformed catalog ID falls back safely instead of throwing before cleanup', () => {
  const h = harness();
  const malformed = { id: 7, title: 'Malformed test entry', category: 'test' };
  games.push(malformed);
  try {
    assert.doesNotThrow(() => h.context.openGameById(7));
    assert.ok(h.container.querySelector('#arcCanvas'));
    h.context.closeGameModal(); assertStopped(h);
    assert.equal(h.errors.length, 0);
  } finally { games.pop(); }
});


test('fallback catalog has real, distinct genre loops and closes resources safely', () => {
  const h = harness();
  let count = 0;
  const found = new Set();
  for (const game of games) {
    h.context.openGameById(game.id);
    const canvas = h.container.querySelector('#arcCanvas');
    const dedicatedDispatch = ['frogger-ech-bang-qua-duong', 'asteroids-tau-ban-thien-thach', 'ban-ruoi-galaga', 'piano-tiles-phim-nhac', 'bong-bong-nuoc-bubble-trouble', 'lemonade-tycoon', 'dr-mario-diet-khuan'].includes(game.id);
    if (canvas && !dedicatedDispatch) {
      count++;
      const kind = h.context.NP_Archetypes.kindFor(game);
      found.add(kind);
      assert.ok(h.container.querySelector('#arcProgress'), game.id + ' has stage goal');
      assert.ok(h.container.querySelector('#arcRestart'), game.id + ' can restart');
      assert.ok(h.container.querySelector('#arcPause'), game.id + ' can pause');
      h.frame(); h.frame();
    }
    h.context.closeGameModal();
    assertStopped(h);
    assert.equal(h.errors.length, 0, game.id + ': ' + h.errors.join('; '));
  }
  assert.equal(count, 80, 'Lemonade Tycoon now has a dedicated market-planning loop outside the generic management archetype');
  assert.deepEqual([...found].sort(), ['duel', 'management', 'puzzle', 'quiz', 'reflex', 'runner', 'shooter']);
});

test('fallback puzzle, reflex, management and quiz advance to stage two', () => {
  function setup(id) {
    const h = harness();
    vm.runInContext('Math.random = () => 0;', h.context);
    assert.equal(h.context.openGameById(id), true);
    return { h, get: selector => h.container.querySelector(selector) };
  }
  let { h, get } = setup('tiem-sach-cu-pho-co');
  for (let i = 0; i < 6; i++) get('#arcAction').dispatch('pointerdown');
  assert.equal(get('#arcLevel').textContent, 2, 'management advances after enough correct orders');
  h.context.closeGameModal(); assertStopped(h);

  ({ h, get } = setup('dap-chuot-chui'));
  for (let i = 0; i < 6; i++) get('#arcCanvas').dispatch('pointerdown', { clientX: 70, clientY: 102 });
  assert.equal(get('#arcLevel').textContent, 2, 'reflex advances after hitting targets');
  h.context.closeGameModal(); assertStopped(h);

  ({ h, get } = setup('xep-bai-solitaire'));
  const cards = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5];
  for (let i = cards.length - 1; i > 0; i--) [cards[i], cards[0]] = [cards[0], cards[i]];
  for (const value of new Set(cards)) {
    for (const index of cards.flatMap((c, i) => c === value ? [i] : [])) {
      const x = 186.5 + index % 4 * 69 + 20;
      const y = (72 + Math.floor(index / 4) * 69 + 20) * (480 / 400);
      get('#arcCanvas').dispatch('pointerdown', { clientX: x, clientY: y });
    }
  }
  assert.equal(get('#arcLevel').textContent, 2, 'puzzle advances only after clearing all pairs');
  h.context.closeGameModal(); assertStopped(h);

  ({ h, get } = setup('ai-la-trieu-phu'));
  const answers = [2, 2, 1, 1, 0, 2];
  let selected = 0;
  for (const answer of answers) {
    while (selected !== answer) {
      get('#arcRight').dispatch('pointerdown');
      selected = (selected + 1) % 4;
    }
    get('#arcAction').dispatch('pointerdown');
  }
  assert.equal(get('#arcLevel').textContent, 2, 'quiz advances after six correct answers');
  h.context.closeGameModal(); assertStopped(h);
});

test('Lemonade Tycoon has its own stock-planning and ten-day market model', () => {
  const h = harness();
  const model = h.context.NP_Archetypes.lemonadeModel;
  const state = model.create(42);
  assert.equal(state.phase, 'planning');
  assert.equal(state.cash, 40);
  assert.ok(state.forecast.temperature >= 14 && state.forecast.temperature <= 34);
  assert.equal(model.buy(state, 'lemons', 99), true, 'pack counts are capped and purchased from cash');
  assert.equal(state.stock.lemons, model.constants.packs.lemons.count * 5);
  assert.equal(model.buy(state, 'not-an-item'), false);
  assert.equal(model.set(state, 'priceCents', 9999), true);
  assert.equal(state.priceCents, 350, 'price is clamped to the supported range');
  assert.equal(model.set(state, 'location', 'not-a-location'), false);
  assert.equal(model.set(state, 'location', 'suburbs'), true);
  assert.equal(model.startDay(state).day, 1);
  assert.equal(state.phase, 'result');
  assert.equal(model.startDay(state), false, 'a market day resolves only once');
  assert.equal(model.nextDay(state), true);
  assert.equal(state.day, 2);
  assert.equal(state.phase, 'planning');
});

test('Lemonade Tycoon can finish a seeded ten-day season above its cash target', () => {
  const h = harness();
  const model = h.context.NP_Archetypes.lemonadeModel;
  const state = model.create(1);
  for (let day = 1; day <= model.constants.days; day++) {
    const temp = state.forecast.temperature;
    model.set(state, 'lemons', 2);
    model.set(state, 'sugar', temp <= 17 ? 3 : temp >= 31 ? 1 : 2);
    model.set(state, 'ice', temp >= 29 ? 5 : temp <= 18 ? 2 : 3);
    model.set(state, 'priceCents', 325);
    model.set(state, 'adSpend', 0);
    model.set(state, 'location', state.forecast.rain ? 'suburbs' : temp >= 27 ? 'station' : temp >= 20 ? 'park' : 'suburbs');
    const wants = { lemons: 36 - state.stock.lemons, sugar: 18 * state.recipe.sugar - state.stock.sugar,
      ice: 18 * state.recipe.ice - state.stock.ice, cups: 18 - state.stock.cups };
    const packSizes = { lemons: 12, sugar: 20, ice: 50, cups: 75 };
    for (const [item, missing] of Object.entries(wants)) {
      const packs = Math.max(0, Math.ceil(missing / packSizes[item]));
      if (packs) model.buy(state, item, packs);
    }
    const report = model.startDay(state);
    assert.ok(report, `seed 1 day ${day} opened and produced a report`);
    assert.equal(model.nextDay(state), true);
  }
  assert.equal(state.phase, 'won');
  assert.equal(state.day, 10);
  assert.ok(state.cash >= model.constants.targetCash);
});

test('Dr. Mario clears four connected colors, detaches a split capsule and resolves a cascade', () => {
  const h = harness();
  const model = h.context.NP_Engines.drMarioModel;
  const state = model.create(321);
  const grid = Array.from({ length: model.constants.rows }, () => Array(model.constants.columns).fill(null));
  state.grid = grid; state.viruses = 6; state.phase = 'playing';
  for (const x of [0, 1, 2]) grid[11][x] = { color: 0, virus: true, pairId: null };
  for (const x of [0, 1, 2]) grid[15][x] = { color: 1, virus: true, pairId: null };
  grid[11][3] = { color: 0, virus: false, pairId: 77, side: 0 };
  grid[10][3] = { color: 1, virus: false, pairId: 77, side: 1 };
  const result = model.resolve(state);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { removed: 8, viruses: 6, chain: 2 });
  assert.equal(state.viruses, 0);
  assert.equal(state.score, 2250);
  assert.ok(grid[15].every(cell => cell === null), 'the detached half falls into the second color group and clears');
});

test('Dr. Mario exact route uses capsule rules, advances stages, supports bottle top-out and final victory', () => {
  const h = harness();
  const model = h.context.NP_Engines.drMarioModel;
  const first = model.create(2026), same = model.create(2026);
  assert.equal(JSON.stringify(first.grid), JSON.stringify(same.grid), 'seeded virus placement is repeatable');
  assert.equal(first.active.colors[0], 1); assert.equal(first.active.colors[1], 0);
  assert.ok(model.rotate(first, 1), 'capsules rotate');
  assert.ok(model.move(first, -1), 'capsules move');
  const generated = model.create(2026);
  for (let stage = 2; stage <= model.constants.maxStage; stage++) {
    model.startLevel(generated, stage);
    assert.equal(generated.viruses, 4 + (stage - 1) * 4, `stage ${stage} places its full local virus count`);
    assert.deepEqual(JSON.parse(JSON.stringify(model.resolve(generated))), { removed: 0, viruses: 0, chain: 0 }, `stage ${stage} starts without an immediate match`);
  }
  const clear = model.create(2026);
  clear.fallElapsed = 0.8;
  model.hardDrop(clear);
  assert.equal(clear.phase, 'stage-clear');
  for (let i = 0; i < 20 && clear.stage === 1; i++) model.tick(clear, {}, 0.05);
  assert.equal(clear.stage, 2);
  assert.equal(clear.viruses, 8);
  assert.equal(clear.fallElapsed, 0, 'the next bottle gives the new capsule a fresh gravity interval');

  const topout = model.create(99);
  topout.grid[0][4] = { color: 2, virus: false, pairId: null };
  assert.equal(model.move(topout, -1), true);
  topout.active.x = 4;
  assert.equal(model.hardDrop(topout), 0);
  assert.equal(topout.phase, 'over', 'a capsule cannot lock above the bottle mouth');

  const last = model.create(123);
  last.stage = 5; last.phase = 'playing'; last.viruses = 3;
  last.grid = Array.from({ length: model.constants.rows }, () => Array(model.constants.columns).fill(null));
  for (const x of [2, 3, 4]) last.grid[15][x] = { color: 0, virus: true, pairId: null };
  last.active = { x: 5, y: 15, direction: 0, colors: [0, 0], pairId: 900, fall: 0 };
  model.hardDrop(last);
  assert.equal(last.phase, 'stage-clear');
  for (let i = 0; i < 20; i++) model.tick(last, {}, 0.05);
  assert.equal(last.phase, 'won', 'clearing the fifth bottle completes the five-stage adaptation');

  h.context.openGameById('lemonade-tycoon');
  assert.ok(h.container.querySelector('#ltScene'));
  assert.equal(h.container.querySelector('#arcCanvas'), null);
  h.context.closeGameModal(); assertStopped(h);

  h.context.openGameById('dr-mario-diet-khuan');
  assert.ok(h.container.querySelector('#dmCanvas'));
  assert.equal(h.container.querySelector('#tetrisCanvas'), null);
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  for (let i = 0; i < 20; i++) h.frame(50);
  assert.equal(h.container.querySelector('#dmStage').textContent, '2 / 5');
  assert.equal(h.container.querySelector('#dmViruses').textContent, 8);
  h.context.closeGameModal(); assertStopped(h);
});

test('fallback action genres stay frame-driven and progress across stages', () => {
  function setup(id) {
    const h = harness();
    vm.runInContext('Math.random = () => 0;', h.context);
    h.context.openGameById(id);
    return h;
  }
  let h = setup('crossy-road');
  for (let i = 0; i < 1200; i++) h.frame();
  assert.ok(+h.container.querySelector('#arcLevel').textContent >= 2, 'runner advances by avoiding hazards');
  h.context.closeGameModal(); assertStopped(h);

  h = setup('asteroids-tau-ban-thien-thach');
  assert.ok(h.container.querySelector('.np-asteroids-board'), 'Asteroids has its own vector board and control panel');
  assert.equal(h.container.querySelector('#arcProgress'), null, 'Asteroids does not render the generic shooter objective');
  assert.equal(h.context.NP_Archetypes.asteroidsModel.create(17).rocks.length, 4, 'its dedicated model starts a four-boulder field');
  h.frame(); h.frame();
  assert.equal(h.frames.size, 1, 'the dedicated Asteroids loop remains frame-driven');
  h.context.closeGameModal(); assertStopped(h);

  h = setup('ban-ruoi-galaga');
  assert.ok(h.container.querySelector('.np-galaga-board'), 'Galaga has its own portrait fixed-shooter board and touch controls');
  assert.equal(h.container.querySelector('#arcProgress'), null, 'Galaga does not render the generic shooter objective');
  assert.equal(h.context.NP_Archetypes.galagaModel.create(17).enemies.length, 40, 'Galaga starts with its own 40-unit formation');
  h.frame(); h.frame();
  assert.equal(h.frames.size, 1, 'the dedicated Galaga loop remains frame-driven');
  h.context.closeGameModal(); assertStopped(h);

  h = setup('electric-man-2-vo-thuat-nguoi-que');
  for (let i = 0; i < 6; i++) {
    h.container.querySelector('#arcAction').dispatch('pointerdown');
    for (let f = 0; f < 30; f++) h.frame();
  }
  assert.equal(h.container.querySelector('#arcLevel').textContent, 2, 'duel advances after enemy defeat');
  h.context.closeGameModal(); assertStopped(h);
});

test('Minesweeper has progressive boards, Street Fighter rematch and Raft Wars pointer aiming', () => {
  const h = harness();
  h.context.openGameById('do-min-minesweeper');
  assert.ok(h.container.querySelector('#dmStage'));
  assert.ok(h.container.querySelector('#dmNextBtn'));
  assert.ok(h.container.querySelector('#dmGrid').children.length === 81);
  h.context.closeGameModal(); assertStopped(h);

  h.context.openGameById('street-fighter-2-doi-khang');
  assert.ok(h.container.querySelector('#sfRestart'));
  assert.ok(h.container.querySelector('#sfLeft'));
  h.window.dispatch('keydown', { code: 'KeyL', key: 'l' });
  h.frame(); h.frame();
  assert.equal(h.errors.length, 0);
  h.context.closeGameModal(); assertStopped(h);

  h.context.openGameById('raft-wars-ban-sung-phao');
  assert.ok(h.container.querySelector('#rwRestart'));
  const canvas = h.container.querySelector('#rwCanvas');
  canvas.dispatch('pointerdown', { clientX: 220, clientY: 180 });
  canvas.dispatch('pointermove', { clientX: 260, clientY: 140 });
  canvas.dispatch('pointerup', { clientX: 260, clientY: 140 });
  h.frame(); h.frame();
  assert.equal(h.errors.length, 0);
  h.context.closeGameModal(); assertStopped(h);
});

test('Piano Tiles opens its falling-key board and pause/restart/close cleanly', () => {
  const h = harness();
  h.context.openGameById('piano-tiles-phim-nhac');
  assert.ok(h.container.querySelector('.np-piano-shell'));
  assert.ok(h.container.querySelector('#ptCanvas'));
  assert.equal(h.container.querySelector('#arcCanvas'), null, 'Piano Tiles skips the generic reflex target canvas');
  assert.equal(h.frames.size, 1);
  h.container.querySelector('#ptPause').dispatch('click');
  assert.equal(h.container.querySelector('#ptPause').textContent, 'TIẾP');
  h.container.querySelector('#ptPause').dispatch('click');
  assert.equal(h.container.querySelector('#ptPause').textContent, 'DỪNG');
  h.container.querySelector('#ptRestart').dispatch('click');
  assert.equal(h.container.querySelector('#ptScore').textContent, '0/50');
  h.context.closeGameModal(); assertStopped(h);
});


test('Minesweeper clears a safe board and advances with increasing mine count', () => {
  const h = harness();
  const seed = 123456;
  vm.runInContext('Math.random = (() => { let s = 123456; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();', h.context);
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const mines = new Set();
  while (mines.size < 10) {
    const row = Math.floor(random() * 9);
    const col = Math.floor(random() * 9);
    if (row > 1 || col > 1) mines.add(row + ',' + col);
  }
  h.context.openGameById('do-min-minesweeper');
  const grid = h.container.querySelector('#dmGrid');
  grid.children[0].dispatch('click');
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (!mines.has(row + ',' + col)) grid.children[row * 9 + col].dispatch('click');
    }
  }
  const next = h.container.querySelector('#dmNextBtn');
  assert.equal(next.style.display, 'inline-flex', 'the first board can be won');
  next.dispatch('click');
  assert.equal(h.container.querySelector('#dmStage').textContent, 2);
  assert.equal(h.container.querySelector('#dmMineCount').textContent, '012');
  assert.equal(h.errors.length, 0);
  h.context.closeGameModal(); assertStopped(h);
});

test('Street Fighter can finish the three-match tournament', () => {
  const h = harness();
  h.context.openGameById('street-fighter-2-doi-khang');
  const status = h.container.querySelector('#sfStatus');
  for (let shot = 0; shot < 25 && !String(status.textContent).includes('Vô địch'); shot++) {
    h.window.dispatch('keydown', { code: 'KeyL', key: 'l' });
    for (let f = 0; f < 45; f++) h.frame();
    h.window.dispatch('keyup', { code: 'KeyL', key: 'l' });
  }
  assert.match(status.textContent, /Vô địch/, 'boss victory terminates the campaign');
  assert.match(h.container.querySelector('#sfMatch').textContent, /3\/3/);
  assert.equal(h.errors.length, 0);
  h.context.closeGameModal(); assertStopped(h);
});

test('Raft Wars can finish all battles using gold for cannon upgrades and repairs', () => {
  const h = harness();
  vm.runInContext('Math.random = () => 0.5;', h.context);
  h.context.openGameById('raft-wars-ban-sung-phao');
  const canvas = h.container.querySelector('#rwCanvas');
  const status = h.container.querySelector('#rwStatus');
  const get = id => h.container.querySelector('#' + id);
  let repairCount = 0, upgradeCount = 0;
  for (let shot = 0; shot < 30 && !/Hoàn thành|Thất bại/.test(status.textContent); shot++) {
    if (parseInt(get('rwSimonHp').textContent, 10) < 70 &&
        parseInt(get('rwGold').textContent, 10) >= 200) {
      get('rwRepair').dispatch('click'); repairCount++;
    }
    if (parseInt(get('rwGold').textContent, 10) >= 300 &&
        Number(get('rwCannon').textContent) < 5) {
      get('rwUpgrade').dispatch('click'); upgradeCount++;
    }
    canvas.dispatch('pointerdown', { clientX: 340, clientY: 265 });
    canvas.dispatch('pointermove', { clientX: 350, clientY: 259 });
    canvas.dispatch('pointerup', { clientX: 350, clientY: 259 });
    for (let f = 0; f < 60; f++) h.frame();
    h.flushTimeouts();
    for (let f = 0; f < 90; f++) h.frame();
  }
  assert.match(status.textContent, /Hoàn thành cả 4 trận/);
  assert.ok(upgradeCount > 0, 'cannon upgrades are purchasable');
  assert.ok(repairCount > 0, 'repair items are purchasable');
  assert.equal(h.errors.length, 0);
  h.context.closeGameModal(); assertStopped(h);
});


test('original vector illustration set is stable and non-emoji', () => {
  const h = harness({ loadApp: false, loadEngines: false });
  const art = h.context.NP_GameArt;
  assert.equal(art.creatureIds.length, 16);
  assert.equal(new Set([...art.creatureIds]).size, 16);
  for (const id of ['radish', 'corn', 'tomato', 'watermelon', 'sunflower']) {
    const svg = art.svg('crop', id);
    assert.match(svg, /<svg/);
    assert.match(svg, /<path|<ellipse|<rect|<circle/);
    assert.doesNotMatch(svg, /\p{Extended_Pictographic}/u);
  }
  const portraits = [...art.creatureIds].map(id => art.svg('creature', id));
  assert.equal(new Set(portraits).size, 16, 'all 16 tile illustrations must differ');
});

test('Pikachu illustrated tiles have one click action and optional touch zoom', () => {
  const h = harness();
  assert.equal(h.context.openGameById('lat-the-tri-nho'), true);
  const tiles = h.container.querySelectorAll('.np-link-tile');
  assert.equal(tiles.length, 96, 'the full 8 by 12 board is rendered');
  assert.ok(tiles.every(tile => !tile.disabled && tile.querySelector('svg')));
  assert.ok(tiles.every(tile => !(tile.listeners.get('touchstart') || []).length),
    'avoid duplicate touchstart plus synthesized click on each tile');
  tiles[0].dispatch('click');
  assert.equal(h.container.querySelectorAll('.np-link-tile.selected').length, 1);
  const zoomBtn = h.container.querySelector('#pkZoomBtn');
  zoomBtn.dispatch('click');
  assert.ok(h.container.querySelector('.np-link-board-wrap').classList.contains('zoomed'));
  zoomBtn.dispatch('click');
  assert.ok(!h.container.querySelector('.np-link-board-wrap').classList.contains('zoomed'));
  h.context.closeGameModal(); assertStopped(h);
});

test('Nong Trai soil, sowing and neighbor art preserve interactions', () => {
  const h = harness();
  h.context.openGameById('nong-trai-vui-ve');
  const grid = h.container.querySelector('#nfPlotsGrid');
  assert.equal(grid.querySelectorAll('.np-farm-plot').length, 9);
  assert.equal(grid.querySelectorAll('.np-farm-plot.locked').length, 3);
  grid.querySelectorAll('.np-farm-plot')[0].dispatch('click');
  assert.match(grid.innerHTML, /Đã xới/);
  const seedTool = h.container.querySelectorAll('.tool-btn')
    .find(btn => btn.getAttribute('data-tool') === 'seed');
  seedTool.dispatch('click');
  grid.querySelectorAll('.np-farm-plot')[0].dispatch('click');
  assert.match(grid.innerHTML, /np-farm-crop-art/, 'crop becomes visible after sowing');
  assert.match(grid.innerHTML, /phát triển/, 'sowing retains growth progress');
  h.container.querySelector('#nfTabNeighbors').dispatch('click');
  assert.ok(h.container.querySelector('#nfNeighborFarmBox').innerHTML.includes('np-farm-neighbor-crop'));
  h.context.closeGameModal(); assertStopped(h);
});

test('Hang Rong cooking progresses without replacing tap targets every tick', () => {
  const h = harness();
  h.context.openGameById('hang-rong');
  assert.ok(h.container.querySelector('#hrStreetCanvas'));
  assert.ok(h.container.querySelectorAll('.np-stall-dish-art').length >= 1);
  const source = read('scripts/engines.js');
  assert.match(source, /function paintCookingSlot\(slot\)/);
  assert.match(source, /paintCookingSlot\(emptySlot\)/);
  const intervalBlock = source.slice(source.indexOf('emptySlot.timer = setInterval('));
  assert.doesNotMatch(intervalBlock.slice(0, intervalBlock.indexOf('}, intervalMs);')),
    /renderCookingSlotsUI\(\)/, '100ms cooking ticks must not rebuild buttons');
  h.context.closeGameModal(); assertStopped(h);
});

test('art assets load before game engine scripts', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('scripts/game-art.js') > html.indexOf('scripts/game-feel.js'));
  assert.ok(html.indexOf('scripts/game-art.js') < html.indexOf('scripts/engines.js'));
});


test('Diner Dash uses a concise playable intro and keeps controls active', () => {
  const h = harness();
  assert.equal(h.context.openGameById('diner-dash'), true);
  assert.ok(h.container.querySelector('.np-diner-game'), 'visual update class exists');
  const cards = h.container.querySelectorAll('.np-diner-steps');
  assert.equal(cards.length, 1, 'onboarding is a single concise group');
  assert.ok(h.container.querySelector('#ddCanvas'));
  const start = h.container.querySelector('#ddStartGameBtn');
  assert.ok(start, 'start button remains available');
  start.dispatch('click');
  h.frame(); h.frame();
  assert.equal(h.errors.length, 0, h.errors.join('; '));
  h.context.closeGameModal();
  assertStopped(h);
  const engine = read('scripts/engines-popcap.js');
  assert.match(engine, /np-diner-steps/);
  assert.match(engine, /ctx\.fillText\('BẾP', 320, 42\)/);
});


function instrumentBoom(h) {
  const source = read('scripts/engines-retro50.js');
  const tail = [
    '    updateHUD();',
    '    animId = requestAnimationFrame(loop);',
    '    onCleanup(() => { cancelAnimationFrame(animId); });'
  ].join('\n');
  assert.ok(source.includes(tail), 'Boom probe anchor exists');
  const probe = [
    '    window.__boomProbe = {',
    "      snapshot: () => ({phase,currentStage,score,lives,x:player.x,y:player.y, bossHp:pirateBoss?.hp || 0}),",
    "      setStage(n) { currentStage=n;phase='playing';buildMap(n); },",
    "      clearEnemies() { bots.forEach(bot => { bot.alive=false; }); if(pirateBoss)pirateBoss.alive=false; },",
    "      clearLane() { for(let c=1;c<COLS-1;c++)map[1][c]=0; },",
    "      blast(c,r,range=2) { explodeBalloon({c,r,range}); },",
    '      tick: stepSimulation,',
    "      loseNow() { player.trapped=true;player.trapTimer=301;player.invuln=0;lives=1;mount='none'; },",
    '    };'
  ].join('\n');
  vm.runInContext(source.replace(tail, probe + '\n' + tail), h.context);
  assert.ok(h.context.NP_Retro50Engines);
}

test('Boom canvas uses painted sprites, compact HUD and unified pointer controls', () => {
  const h=harness();
  instrumentBoom(h);
  assert.equal(h.context.openGameById('boom-online-bnb'),true);
  const canvas=h.container.querySelector('#bnbCanvas');
  assert.ok(canvas);
  assert.ok(h.container.querySelector('.np-boom-game'));
  assert.ok(h.container.querySelector('#bnbScore'));
  assert.ok(h.container.querySelector('#bnbLives'));
  assert.ok(h.container.querySelector('#bnbRestart'));
  const before=h.context.__boomProbe.snapshot().x;
  h.container.querySelector('#bnbRight').dispatch('pointerdown',{pointerId:1,button:0});
  for(let i=0;i<14;i++)h.frame();
  const moved=h.context.__boomProbe.snapshot().x;
  assert.ok(moved>before,'holding pointer moves hero');
  h.container.querySelector('#bnbRight').dispatch('pointercancel',{pointerId:1});
  for(let i=0;i<12;i++)h.frame();
  assert.equal(h.context.__boomProbe.snapshot().x,moved,'cancel releases movement');
  assert.equal(h.errors.length,0);
  h.context.closeGameModal();assertStopped(h);
});

test('Boom boss loses one HP per distinct blast and victory occurs only once', () => {
  const h=harness();
  instrumentBoom(h);
  h.context.openGameById('boom-online-bnb');
  const p=h.context.__boomProbe;
  p.setStage(3);
  assert.equal(p.snapshot().bossHp,5);
  p.blast(7,3,2);
  for(let i=0;i<14;i++)p.tick();
  assert.equal(p.snapshot().bossHp,4,'25 frames of one area blast must not multi-hit boss');
  p.clearEnemies();p.tick();
  assert.equal(p.snapshot().phase,'won');
  assert.equal(h.container.querySelector('#bnbEndOverlay').style.display,'flex');
  const score=p.snapshot().score;
  for(let i=0;i<20;i++)p.tick();
  assert.equal(p.snapshot().score,score,'victory cannot repeatedly award points');
  h.container.querySelector('#bnbRestart').dispatch('click');
  assert.equal(p.snapshot().phase,'playing');
  assert.equal(p.snapshot().currentStage,1);
  p.loseNow();p.tick();
  assert.equal(p.snapshot().phase,'lost','running out of lives must terminate the match');
  assert.equal(h.errors.length,0);
  h.context.closeGameModal();assertStopped(h);
});

test('Boom movement distance is stable across 60Hz and 120Hz render schedules', () => {
  function travel(step,count) {
    const h=harness();instrumentBoom(h);h.context.openGameById('boom-online-bnb');
    const p=h.context.__boomProbe;
    p.clearLane();
    h.window.dispatch('keydown',{code:'KeyD',key:'d'});
    for(let i=0;i<count;i++)h.frame(step);
    const x=p.snapshot().x;
    h.context.closeGameModal();assertStopped(h);
    return x;
  }
  const x60=travel(16,50),x120=travel(8,100);
  assert.ok(Math.abs(x60-x120)<4,
    'equal elapsed time should produce near-identical motion, got '+x60+' vs '+x120);
});

test('Bắn Trứng uses one pointer shot, controls and sprite caching', () => {
  const h=harness();
  let newCanvases=0;
  const create=h.document.createElement;
  h.document.createElement = tag => { if(tag==='canvas')newCanvases++;return create(tag); };
  h.context.openGameById('ban-trung-khung-long');
  assert.ok(h.container.querySelector('.np-egg-game'));
  assert.ok(h.container.querySelector('#btFireBtn'));
  assert.ok(h.container.querySelector('#btSwapEggBtn'));
  h.container.querySelector('#btStartGameBtn').dispatch('click');
  for(let i=0;i<5;i++)h.frame();
  const cachedBefore=newCanvases;
  for(let i=0;i<10;i++)h.frame();
  assert.equal(newCanvases,cachedBefore,'render loop must reuse pre-painted egg sprites');
  assert.ok(cachedBefore>0 && cachedBefore<=9,'sprite cache creates a bounded set of sprites');
  const canvas=h.container.querySelector('#btCanvas');
  assert.equal((canvas.listeners.get('touchstart')||[]).length,0);
  assert.equal((canvas.listeners.get('click')||[]).length,0);
  assert.equal(h.container.querySelector('#btShotsLeft').textContent,'5');
  canvas.dispatch('pointerdown',{pointerId:31,button:0,clientX:250,clientY:130});
  canvas.dispatch('pointerup',{pointerId:31,button:0,clientX:250,clientY:130});
  // A synthesized click after touch must not cause another shot.
  canvas.dispatch('click',{clientX:250,clientY:130});
  for(let i=0;i<100;i++)h.frame();
  assert.equal(h.container.querySelector('#btShotsLeft').textContent,'4',
    'one touch-release should count as exactly one shot');
  assert.equal(h.errors.length,0);
  h.context.closeGameModal();assertStopped(h);
});




test('Typer Shark has its own underwater word-target loop, HUD and responsive controls', async () => {
  const h = harness();
  assert.equal(h.context.openGameById('typer-shark'), true);
  const canvas = h.container.querySelector('#tsCanvas');
  const input = h.container.querySelector('#tsInput');
  assert.ok(canvas, 'Typer Shark gets a dedicated 640x480 underwater stage');
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 480);
  assert.ok(input, 'typing input is available for desktop and touch keyboards');
  assert.equal(h.container.querySelector('#arcCanvas'), null, 'generic quiz/archetype renderer is bypassed');

  const targetList = h.container.querySelector('#tsTargets').textContent;
  const targetWord = targetList.match(/:\s*([A-Z]+)/)?.[1];
  assert.ok(targetWord, 'accessible target list includes each shark word and its screen-side position');
  input.value = targetWord;
  input.dispatch('input', { target: input });
  assert.ok(Number(h.container.querySelector('#tsScore').textContent) > 0,
    'typing a shark word zaps that shark and awards points');
  for (let n=0;n<5;n++) h.frame();
  h.container.querySelector('#tsPause').dispatch('click');
  assert.equal(h.container.querySelector('#tsPause').textContent, 'TIẾP TỤC');
  h.container.querySelector('#tsPause').dispatch('click');
  assert.equal(h.container.querySelector('#tsPause').textContent, 'PAUSE');
  h.container.querySelector('#tsRestart').dispatch('click');
  assert.equal(h.container.querySelector('#tsScore').textContent, '0');
  h.context.closeGameModal(); h.flushTimeouts(); assertStopped(h);
  assert.equal(h.errors.length, 0, h.errors.join('; '));
});

test('Flappy Bird sprite fits its collision box and offline fallback stays available', async () => {
  const fallback = harness();
  fallback.drawImageCalls.length = 0;
  assert.equal(fallback.context.openGameById('flappy-bird'), true);
  fallback.frame();
  assert.equal(fallback.drawImageCalls.length, 0, 'offline mode uses vector art');
  fallback.context.closeGameModal(); fallback.flushTimeouts(); assertStopped(fallback);

  class FailedImage {
    constructor() { this.complete = true; this.naturalWidth = 0; this.src = ''; }
  }
  const failed = harness({ ImageClass: FailedImage });
  failed.drawImageCalls.length = 0;
  assert.equal(failed.context.openGameById('flappy-bird'), true);
  failed.frame();
  assert.equal(failed.drawImageCalls.length, 0, 'failed image load falls back to vector art');
  failed.context.closeGameModal(); failed.flushTimeouts(); assertStopped(failed);

  let loadedSprite;
  class LoadedImage {
    constructor() { this.complete = true; this.naturalWidth = 256; this.src = ''; loadedSprite = this; }
  }
  const loaded = harness({ ImageClass: LoadedImage });
  loaded.drawImageCalls.length = 0;
  assert.equal(loaded.context.openGameById('flappy-bird'), true);
  loaded.frame();
  const call = loaded.drawImageCalls.find(args => args[0] === loadedSprite);
  assert.ok(call, 'loaded sprite is drawn');
  assert.equal(loadedSprite.src, 'assets/avatars/flappy-swift-sprite.webp');
  assert.deepEqual(Array.from(call.slice(1)), [-15, -14, 30, 28],
    'visible sprite stays aligned to the 28px collision diameter');
  loaded.context.closeGameModal(); loaded.flushTimeouts(); assertStopped(loaded);
});

test('ten polished games keep their core interactions and clean up', async () => {
  const h = harness();
  const cases = [
    ['pong-1972', '#pongCanvas', '#pongPause', '#pongRestart'],
    ['pha-gach-dx-ball', '#dxCanvas', '#dxPauseBtn', '#dxRestartBtn'],
    ['ran-san-moi-snake', '#snkCanvas', '#snkPauseBtn', '#snkRestartBtn'],
    ['xep-gach-tetris', '#tetCanvas', '#tetPauseBtn', '#tetRestartBtn'],
    ['flappy-bird', '#fbCanvas', '#fbPauseBtn', '#fbFlapBtn']
  ];
  for (const [id, canvasSelector, pauseSelector, restartSelector] of cases) {
    assert.equal(h.context.openGameById(id), true);
    const canvas = h.container.querySelector(canvasSelector);
    assert.ok(canvas, id + ' must render a canvas');
    assert.ok(h.container.querySelector(pauseSelector), id + ' needs pause');
    assert.ok(h.container.querySelector(restartSelector), id + ' needs restart/action');
    if (id === 'flappy-bird') {
      canvas.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 180 });
    } else if (id === 'pha-gach-dx-ball') {
      canvas.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 220, clientY: 300 });
    }
    for (let n = 0; n < 12; n++) h.frame();
    h.container.querySelector(pauseSelector).dispatch('click');
    assert.equal(h.container.querySelector(pauseSelector).textContent, 'Tiếp tục', id + ' enters paused state');
    for (let n = 0; n < 5; n++) h.frame();
    h.container.querySelector(pauseSelector).dispatch('click');
    assert.equal(h.container.querySelector(pauseSelector).textContent, 'Tạm dừng', id + ' resumes');
    if (id !== 'flappy-bird') h.container.querySelector(restartSelector).dispatch('click');
    h.context.closeGameModal(); h.flushTimeouts(); assertStopped(h);
    assert.equal(h.errors.length, 0, h.errors.join('; '));
  }

  h.context.openGameById('co-caro');
  let cells = h.container.querySelectorAll('.caro-cell');
  cells[112].dispatch('click');
  cells = h.container.querySelectorAll('.caro-cell');
  cells[113].dispatch('click');
  assert.equal(h.container.querySelectorAll('.caro-cell')
    .filter(cell => cell.innerHTML.includes('piece-x')).length, 1,
    'a player cannot place a second stone during the delayed AI turn');
  h.container.querySelector('#caroResetBtn').dispatch('click');
  h.flushTimeouts();
  await Promise.resolve();
  assert.equal(h.container.querySelectorAll('.caro-cell')
    .filter(cell => cell.innerHTML.includes('piece-o')).length, 0,
    'an old AI response cannot appear on a reset board');
  h.context.closeGameModal(); assertStopped(h);

  h.context.openGameById('line-98');
  assert.ok(h.container.querySelector('#l98NewBtn'));
  assert.ok(h.container.querySelector('#l98Best'));
  assert.equal(h.container.querySelectorAll('.line98-cell').length, 81);
  assert.ok(h.container.querySelectorAll('.line98-cell')
    .every(cell => !(cell.listeners.get('touchstart') || []).length));
  h.container.querySelector('#l98NewBtn').dispatch('click');
  assert.equal(h.container.querySelector('#l98Score').textContent, 0);
  h.context.closeGameModal(); assertStopped(h);

  h.context.openGameById('tro-choi-2048');
  const grid2048 = h.container.querySelector('#g2048Grid');
  assert.ok(h.container.querySelector('#g2048UndoBtn'));
  grid2048.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 240, clientY: 120 });
  grid2048.dispatch('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 30, clientY: 120 });
  assert.ok(h.stored.has('np_2048_state'), 'run is saved after interaction');
  h.container.querySelector('#g2048NewBtn').dispatch('click');
  assert.equal(h.container.querySelector('#g2048Score').textContent, 0);
  h.context.closeGameModal(); assertStopped(h);

  h.context.openGameById('do-min-minesweeper');
  const grid = h.container.querySelector('#dmGrid');
  grid.children[0].dispatch('pointerdown', { pointerType: 'touch', clientX: 10, clientY: 10 });
  h.flushTimeouts();
  assert.equal(h.container.querySelector('#dmMineCount').textContent, '009',
    'touch long-press toggles a flag without revealing the minefield');
  h.container.querySelector('#dmGrid').children[0].dispatch('click');
  assert.equal(h.container.querySelector('#dmMineCount').textContent, '009',
    'synthetic click after holding cannot remove a flag');
  h.context.closeGameModal(); assertStopped(h);
  assert.equal(h.errors.length, 0, h.errors.join('; '));
});

test('Sokoban campaign has ten solvable levels and the first is finishable by input', () => {
  const code = read('scripts/engines-classics.js');
  const portion = code.slice(code.indexOf('function launchSokoban('), code.indexOf('function launchOAnQuan('));
  const matches = [...portion.matchAll(/\{\s*name:\s*'([^']+)',\s*px:\s*(\d+),\s*py:\s*(\d+),\s*map:\s*\[([\s\S]*?)\]\s*\}/g)];
  const levels = matches.map(m => ({ name: m[1], px: +m[2], py: +m[3], map: [...m[4].matchAll(/'([^']*)'/g)].map(x => x[1]) }));
  assert.equal(levels.length, 10);
  function solvable(lvl) {
    const H = lvl.map.length, W = Math.max(...lvl.map.map(r => r.length));
    const walls = new Set(), goals = new Set(), boxes = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = lvl.map[r][c] || '#', n = r * W + c;
      if (ch === '#') walls.add(n);
      if (ch === '.' || ch === '*') goals.add(n);
      if (ch === '$' || ch === '*') boxes.push(n);
    }
    assert.equal(boxes.length, goals.size, lvl.name + ' has equal boxes and goals');
    const dirs = [-W, W, -1, 1];
    function reach(player, objects) {
      const filled = new Set(objects), found = new Set([player]), q = [player];
      for (let k = 0; k < q.length; k++) for (const d of dirs) {
        const n = q[k] + d;
        if (n < 0 || n >= H * W || walls.has(n) || filled.has(n) || found.has(n)) continue;
        if (Math.abs(d) === 1 && Math.floor(n / W) !== Math.floor(q[k] / W)) continue;
        found.add(n); q.push(n);
      }
      return found;
    }
    const first = { player: lvl.py * W + lvl.px, boxes: boxes.sort((x,y) => x-y) };
    const seen = new Set(), q = [first];
    while (q.length) {
      const state = q.shift();
      if (state.boxes.every(x => goals.has(x))) return true;
      const accessible = reach(state.player, state.boxes), occupied = new Set(state.boxes);
      for (const box of state.boxes) for (const d of dirs) {
        const behind = box - d, ahead = box + d;
        if (!accessible.has(behind) || walls.has(ahead) || occupied.has(ahead) || ahead < 0 || ahead >= H * W) continue;
        if (Math.abs(d) === 1 && (Math.floor(behind / W) !== Math.floor(box / W) ||
            Math.floor(ahead / W) !== Math.floor(box / W))) continue;
        const next = state.boxes.filter(x => x !== box).concat(ahead).sort((x,y) => x-y);
        const reachable = reach(box, next), key = next.join(',') + '|' + Math.min(...reachable);
        if (!seen.has(key)) {
          seen.add(key);
          q.push({ player: box, boxes: next });
        }
      }
      assert.ok(seen.size < 30000, lvl.name + ' state search must remain tractable');
    }
    return false;
  }
  for (const level of levels) assert.ok(solvable(level), level.name + ' has a winning push sequence');
  const h = harness();
  h.context.openGameById('day-thung-sokoban');
  for (const direction of ['ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp']) {
    h.window.dispatch('keydown', { key: direction });
  }
  assert.equal(h.container.querySelector('#skNextBtn').style.display, 'block');
  h.container.querySelector('#skNextBtn').dispatch('click');
  assert.equal(h.container.querySelector('#skLevel').textContent, 2);
  h.context.closeGameModal(); assertStopped(h);
  assert.equal(h.errors.length, 0);
});


test('deep gameplay Mine modes resize correctly without rebuilding tile targets on every reveal', () => {
  const h=harness();
  assert.equal(h.context.openGameById('do-min-minesweeper'),true);
  const board=h.container.querySelector('#dmGrid');
  const difficulty=h.container.querySelector('#dmDifficulty');
  assert.equal(board.children.length,81);
  const initialCell=board.children[0];
  initialCell.dispatch('click');
  assert.equal(board.children[0],initialCell,'reveals repaint existing button rather than discarding it');
  difficulty.value='intermediate';
  difficulty.dispatch('change');
  assert.equal(board.children.length,256,'intermediate field must be 16 by 16');
  assert.equal(h.container.querySelector('#dmMineCount').textContent,'040');
  difficulty.value='expert';
  difficulty.dispatch('change');
  assert.equal(board.children.length,480,'expert field must be 30 by 16');
  assert.equal(h.container.querySelector('#dmMineCount').textContent,'099');
  const expertCell=board.children[0];
  expertCell.dispatch('pointerdown',{pointerType:'touch',clientX:12,clientY:12});
  assert.ok([...h.timers.values()].some(x=>x.delay===420));
  difficulty.value='beginner';
  difficulty.dispatch('change');
  assert.equal(board.children.length,81);
  assert.ok(![...h.timers.values()].some(x=>x.delay===420),'mode switching cancels stale long presses');
  h.context.closeGameModal();h.flushTimeouts();assertStopped(h);
  assert.equal(h.errors.length,0,h.errors.join('; '));
});

test('deep gameplay Sokoban click-to-walk uses BFS and can be interrupted and cleaned up', () => {
  const h=harness();
  assert.equal(h.context.openGameById('day-thung-sokoban'),true);
  const board=h.container.querySelector('#skBoard');
  assert.equal(h.container.querySelectorAll('.np-sk-cell').length,49);
  const target={closest:()=>({dataset:{skR:'1',skC:'1'}})};
  board.dispatch('click',{target});
  const first=[...h.timers.values()].find(x=>x.interval && x.delay===65);
  assert.ok(first,'path walking must schedule a short, cancellable interval');
  first.callback();
  first.callback();
  assert.equal(h.container.querySelector('#skMoves').textContent,2,'walking two empty squares should take two steps');
  assert.ok(![...h.timers.values()].some(x=>x.interval && x.delay===65),'route finishes without leaving timer');
  board.dispatch('click',{target:{closest:()=>({dataset:{skR:'4',skC:'5'}})}});
  assert.ok([...h.timers.values()].some(x=>x.interval && x.delay===65));
  h.container.querySelector('#skResetBtn').dispatch('click');
  assert.ok(![...h.timers.values()].some(x=>x.interval && x.delay===65),'restart aborts auto-walk');
  h.context.closeGameModal();h.flushTimeouts();assertStopped(h);
  assert.equal(h.errors.length,0,h.errors.join('; '));
});

test('deep gameplay Line 98 animates a valid BFS route and undo restores its original position', () => {
  const h=harness();
  assert.equal(h.context.openGameById('line-98'),true);
  const grid=h.container.querySelector('#l98Grid');
  const cells=grid.children;
  let source=-1,destination=-1;
  for(let i=0;i<81 && source===-1;i++){
    if(!Number(cells[i].dataset.color))continue;
    const r=Math.floor(i/9),c=i%9;
    for(const [dr,dc] of [[0,1],[1,0],[0,-1],[-1,0]]){
      const nr=r+dr,nc=c+dc;
      if(nr<0||nr>=9||nc<0||nc>=9)continue;
      const idx=nr*9+nc;
      if(Number(cells[idx].dataset.color)===0){source=i;destination=idx;break;}
    }
  }
  assert.ok(source>=0 && destination>=0,'seeded board has an adjacent reachable empty cell');
  const original=String(cells[source].dataset.color);
  const firstNode=cells[0];
  cells[source].dispatch('click');
  cells[destination].dispatch('click');
  assert.ok([...h.timers.values()].some(x=>!x.interval),'ball movement should produce scheduled steps');
  for(let n=0;n<15;n++)h.flushTimeouts();
  assert.equal(grid.children[0],firstNode,'cell DOM must persist across animation');
  h.container.querySelector('#l98UndoBtn').dispatch('click');
  assert.equal(String(grid.children[source].dataset.color),original,'undo replaces ball at original source');
  assert.equal(String(grid.children[destination].dataset.color),'0','undo clears destination');
  h.context.closeGameModal();h.flushTimeouts();assertStopped(h);
  assert.equal(h.errors.length,0,h.errors.join('; '));
});

test('deep gameplay 2048 move, save and undo survive closing and reopening',()=>{
  const h=harness();
  h.stored.set('np_2048_state',JSON.stringify({
    board:[[2,2,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],score:0,hasWon:false
  }));
  assert.equal(h.context.openGameById('tro-choi-2048'),true);
  h.window.dispatch('keydown',{key:'ArrowLeft'});
  assert.equal(h.container.querySelector('#g2048Score').textContent,4,'adjacent two tiles merge once');
  const saved=JSON.parse(h.stored.get('np_2048_state'));
  assert.equal(saved.undoState.board[0][0],2);
  assert.equal(saved.undoState.board[0][1],2);
  h.context.closeGameModal();assertStopped(h);
  h.context.openGameById('tro-choi-2048');
  h.container.querySelector('#g2048UndoBtn').dispatch('click');
  assert.equal(h.container.querySelector('#g2048Score').textContent,0);
  const reverted=JSON.parse(h.stored.get('np_2048_state'));
  assert.deepEqual(reverted.board[0],[2,2,0,0]);
  h.context.closeGameModal();assertStopped(h);
  assert.equal(h.errors.length,0,h.errors.join('; '));
});

test('deep gameplay Pong, Caro and Flappy modes reset without resurrecting old actions',async()=>{
  const h=harness();
  h.context.openGameById('pong-1972');
  const pongMode=h.container.querySelector('#pongDifficulty');
  pongMode.value='hard';pongMode.dispatch('change');
  assert.equal(h.container.querySelector('#pongPlayer').textContent,0);
  assert.equal(h.container.querySelector('#pongRally').textContent,0);
  h.context.closeGameModal();assertStopped(h);

  h.context.openGameById('co-caro');
  const caroGrid=h.container.querySelector('#caroGrid');
  const node=caroGrid.children[112];
  node.dispatch('click');
  assert.equal(caroGrid.children[112],node,'moves must retain original DOM node');
  const caroRules=h.container.querySelector('#caroRules');
  caroRules.value='free';caroRules.dispatch('change');
  h.flushTimeouts();
  await Promise.resolve();
  assert.equal(caroGrid.children[112],node,'changing rules repaints instead of rerendering all cells');
  assert.equal(caroGrid.children.filter(c=>c.innerHTML.includes('piece-o')).length,0,'old AI timeout must be rejected');
  h.context.closeGameModal();assertStopped(h);

  h.context.openGameById('flappy-bird');
  const flapMode=h.container.querySelector('#fbMode');
  assert.ok(flapMode);
  flapMode.value='practice';flapMode.dispatch('change');
  h.container.querySelector('#fbCanvas').dispatch('pointerdown',{
    pointerType:'touch',pointerId:1,clientX:100,clientY:190
  });
  for(let n=0;n<5;n++)h.frame();
  h.container.querySelector('#fbPauseBtn').dispatch('click');
  assert.equal(h.container.querySelector('#fbPauseBtn').textContent,'Tiếp tục');
  flapMode.value='classic';flapMode.dispatch('change');
  assert.equal(h.container.querySelector('#fbPauseBtn').textContent,'Tạm dừng');
  assert.equal(h.container.querySelector('#fbScore').textContent,0);
  h.context.closeGameModal();assertStopped(h);
  assert.equal(h.errors.length,0,h.errors.join('; '));
});

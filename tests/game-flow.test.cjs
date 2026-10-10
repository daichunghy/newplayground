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

const drawing = new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'measureText') return text => ({ width: String(text).length * 8 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
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

function harness({ loadEngines = true, loadApp = true } = {}) {
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
  run('scripts/game-session.js'); run('scripts/game-feel.js');
  if (loadEngines) for (const file of ['engines.js', 'engines-classics.js', 'engines-popcap.js', 'engines-retro50.js', 'engines-archetypes.js']) run('scripts/' + file);
  if (loadApp) vm.runInContext(read('app.js').replace('let allGames = [];', 'let allGames = globalThis.__testGames;'), context, { filename: 'app.js' });
  return {
    context, window, document, timers, frames, errors, vibrations, stored,
    frame() { now += 16; for (const [id, callback] of [...frames]) { if (frames.delete(id)) callback(now); } },
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
  for (const [id, expected] of [['hang-rong', 'launchHangRong'], ['zuma-ech-ban-ngoc', 'launchZuma'], ['line-98', 'launchLine98'], ['ran-san-moi-snake', 'launchSnake'], ['boom-online-bnb', 'retro50'], ['bubble-bobble-khung-long-bong-bong', 'retro50'], ['lemonade-tycoon', 'launchRetroArcade']]) {
    calls.length = 0; h.context.openGameById(id); assert.deepEqual(calls, [expected]);
  }
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
  h.context.openGameById('lemonade-tycoon');
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
  h.context.openGameById('lemonade-tycoon');
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
    if (canvas) {
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
  assert.equal(count, 86, 'every currently generic catalog entry uses a playable archetype');
  assert.deepEqual([...found].sort(), ['duel', 'management', 'puzzle', 'quiz', 'reflex', 'runner', 'shooter']);
});

test('fallback puzzle, reflex, management and quiz advance to stage two', () => {
  function setup(id) {
    const h = harness();
    vm.runInContext('Math.random = () => 0;', h.context);
    assert.equal(h.context.openGameById(id), true);
    return { h, get: selector => h.container.querySelector(selector) };
  }
  let { h, get } = setup('lemonade-tycoon');
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
  h.container.querySelector('#arcCanvas').dispatch('pointerdown', { clientX: 28, clientY: 330 });
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  for (let i = 0; i < 1200; i++) h.frame();
  assert.ok(+h.container.querySelector('#arcLevel').textContent >= 2, 'shooter advances when enemies are destroyed');
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

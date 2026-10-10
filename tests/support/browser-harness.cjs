// Dependency-free source/DOM regression checks. Canvas/audio are mocked, not visual QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = process.env.NP_TEST_ROOT || path.resolve(__dirname, '../..');
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
    super(); this.tagName = tag.toUpperCase(); this.children = []; this.style = { setProperty(name, value) { this[name] = String(value); } }; this.dataset = {};
    this.attributes = {}; this.textContent = ''; this.width = 640; this.height = 480;
    this.classList = {
      add: (...names) => names.forEach(n => { if (!this.className.split(' ').includes(n)) this.className += ' ' + n; }),
      remove: (...names) => { this.className = this.className.split(' ').filter(n => !names.includes(n)).join(' '); },
      contains: name => this.className.split(' ').includes(name),
      toggle: (name, force) => { const next = force === undefined ? !this.classList.contains(name) : force; this.classList[next ? 'add' : 'remove'](name); return next; }
    };
    this.className = ''; this.hidden = /(?:^|\s)hidden(?:\s|$)/.test(attrs);
    for (const match of attrs.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) this.setAttribute(match[1], match[2] ?? match[3]);
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
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
  append(...children) { children.forEach(child => this.appendChild(child)); }
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
  getBoundingClientRect() { return { left: 0, top: 0, right: this.width, bottom: this.height, width: this.width, height: this.height }; }
  focus() { this.focused = true; }
  click() { this.dispatch('click', { detail: 1 }); }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  closest(selector) {
    const attribute = /^\[data-([a-z][a-z0-9-]*)\]$/.exec(selector);
    if (attribute) {
      const key = attribute[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (this.dataset[key] !== undefined) return this;
    }
    return this.parentNode?.closest(selector) || null;
  }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); }
}

function harness({ loadEngines = true, loadApp = true, storage = new Map(), compact = false, reducedMotion = false } = {}) {
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
  const stored = storage;
  const context = vm.createContext(Object.assign(window, {
    window, document, navigator: { vibrate: pattern => vibrations.push(pattern) },
    console: { log() {}, warn() {}, error: (...args) => errors.push(args.map(String).join(' ')) },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, val) => stored.set(key, String(val)), removeItem: key => stored.delete(key) },
    performance: { now: () => now }, matchMedia: query => ({ matches: query.includes('reduced-motion') ? reducedMotion : compact }),
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
  run('scripts/game-session.js'); run('scripts/games/spot-difference-model.js'); run('scripts/games/spot-difference.js'); run('scripts/games/mole-tap-model.js'); run('scripts/games/mole-tap.js'); run('scripts/game-feel.js'); run('scripts/games/minesweeper-model.js'); run('scripts/games/minesweeper.js'); run('scripts/games/game2048-model.js'); run('scripts/games/game2048-view.js'); run('scripts/games/typer-shark-model.js'); run('scripts/games/typer-shark.js'); run('scripts/games/line98-model.js'); run('scripts/games/line98.js'); run('scripts/games/hangrong-model.js'); run('scripts/games/hangrong.js'); run('scripts/games/marble-trail-model.js'); run('scripts/games/marble-trail.js'); run('scripts/games/falling-blocks-model.js'); run('scripts/games/falling-blocks-input.js'); run('scripts/games/falling-blocks.js'); run('scripts/games/maze-chase-model.js'); run('scripts/games/maze-chase.js'); run('scripts/games/garden-bombs-model.js'); run('scripts/games/cloud-canopy-model.js'); run('scripts/games/tea-service-model.js'); run('scripts/games/beacon-shore-model.js'); run('scripts/games/season-shed-model.js'); run('scripts/games/abyss-retrieval-model.js'); run('scripts/games/starlight-match-model.js'); run('scripts/games/mosaic-match-model.js'); run('scripts/games/scrap-rover-model.js'); run('scripts/games/sun-garden-model.js'); run('scripts/games/wind-duel-model.js'); run('scripts/games/sea-garden-model.js'); run('scripts/games/caro-candidate-model.js'); run('scripts/games/xiangqi-model.js'); run('scripts/games/ban-bi-ve-model.js'); run('scripts/games/o-an-quan-model.js'); run('scripts/games/feeding-frenzy-model.js'); run('scripts/games/ran-san-moi-snake-model.js'); run('scripts/games/flappy-bird-model.js'); run('scripts/games/chem-hoa-qua-model.js'); run('scripts/games/dx-ball-model.js'); run('scripts/games/day-thung-sokoban-model.js'); run('scripts/games/pong-1972-model.js'); run('scripts/games/ban-ga-vu-tru-model.js'); run('scripts/games/noi-hinh-certified-deals.js'); run('scripts/games/noi-hinh-model.js'); run('scripts/games/noi-hinh.js'); run('scripts/games/nhip-may-model.js'); run('scripts/games/tidegrid-arena-model.js'); run('scripts/games/ban-vit-bay-model.js'); run('scripts/games/mam-chop-model.js'); run('scripts/games/road-duel-model.js'); run('scripts/games/raft-duel-model.js'); run('scripts/games/bubble-trap-model.js'); run('scripts/games/ranh-gioi-may-model.js'); run('scripts/games/khoi-da-lan-model.js'); run('scripts/games/klondike-model.js'); run('scripts/games/freecell-model.js'); run('scripts/games/spider-model.js'); run('scripts/games/arkanoid-model.js'); run('scripts/games/bubble-dome-model.js'); run('scripts/games/bubble-dome-campaign.js'); run('scripts/games/test-tube-model.js'); run('scripts/games/pinball-pegs-model.js'); run('scripts/games/lemonade-stand-model.js'); run('scripts/games/bookworm-model.js'); run('scripts/games/bookworm.js'); run('scripts/games/thap-ba-coc-model.js'); run('scripts/games/thap-ba-coc.js'); run('scripts/games/khoi-sac-model.js'); run('scripts/games/khoi-sac.js'); run('scripts/games/san-bui-model.js'); run('scripts/games/san-bui.js'); run('scripts/games/keo-nhip-model.js'); run('scripts/games/keo-nhip.js'); run('scripts/games/ke-sach-ky-uc-model.js'); run('scripts/games/ke-sach-ky-uc.js');
  if (loadEngines) { for (const file of ['engines.js', 'engines-classics.js', 'engines-popcap.js', 'engines-retro50.js']) run('scripts/' + file); run('scripts/games/garden-bombs.js'); run('scripts/games/cloud-canopy.js'); run('scripts/games/tea-service.js'); run('scripts/games/beacon-shore.js'); run('scripts/games/season-shed.js'); run('scripts/games/abyss-retrieval.js'); run('scripts/games/starlight-match.js'); run('scripts/games/mosaic-match.js'); run('scripts/games/scrap-rover.js'); run('scripts/games/sun-garden.js'); run('scripts/games/wind-duel.js'); run('scripts/games/sea-garden.js'); run('scripts/games/caro-candidate.js'); run('scripts/games/xiangqi.js'); run('scripts/games/ban-bi-ve.js'); run('scripts/games/o-an-quan.js'); run('scripts/games/feeding-frenzy.js'); run('scripts/games/ran-san-moi-snake.js'); run('scripts/games/flappy-bird.js'); run('scripts/games/chem-hoa-qua.js'); run('scripts/games/dx-ball.js'); run('scripts/games/day-thung-sokoban.js'); run('scripts/games/pong-1972.js'); run('scripts/games/ban-ga-vu-tru.js'); run('scripts/games/nhip-may.js'); run('scripts/games/tidegrid-arena.js'); run('scripts/games/ban-vit-bay.js'); run('scripts/games/mam-chop.js'); run('scripts/games/road-duel.js'); run('scripts/games/raft-duel.js'); run('scripts/games/bubble-trap.js'); run('scripts/games/ranh-gioi-may.js'); run('scripts/games/khoi-da-lan.js'); run('scripts/games/klondike.js'); run('scripts/games/freecell.js'); run('scripts/games/spider.js'); run('scripts/games/arkanoid.js'); run('scripts/games/bubble-dome.js'); run('scripts/games/test-tube.js'); run('scripts/games/pinball-pegs.js'); run('scripts/games/lemonade-stand.js'); run('scripts/engines-era-front.js'); run('scripts/engines-thap-ba-coc.js'); run('scripts/engines-bookworm.js'); run('scripts/games/atom-glide-model.js'); run('scripts/games/atom-glide.js'); run('scripts/engines-atom-glide.js'); run('scripts/games/pipe-route-model.js'); run('scripts/games/pipe-route.js'); run('scripts/engines-pipe-route.js'); run('scripts/engines-playable-discovery.js'); run('scripts/engines-khoi-sac.js'); run('scripts/engines-san-bui.js'); run('scripts/engines-keo-nhip.js'); run('scripts/engines-ke-sach-ky-uc.js'); }
  run('scripts/games/cut-rope-model.js'); run('scripts/games/cut-rope.js');
  run('scripts/games/orbit-pinball-model.js'); run('scripts/games/orbit-pinball.js');
  run('scripts/games/qbert-pyramid-model.js'); run('scripts/games/qbert-pyramid.js');
  run('scripts/games/soap-bubble-garden-model.js'); run('scripts/games/soap-bubble-garden.js');
  run('scripts/games/bridge-builder-model.js'); run('scripts/games/bridge-builder.js');
  run('scripts/games/paperboy-model.js'); run('scripts/games/paperboy.js');
  if (loadEngines) {
    for (const file of ['scripts/games/dog-crossing-model.js', 'scripts/games/dog-crossing.js',
      'scripts/games/line-rider-model.js', 'scripts/games/line-rider.js',
      'scripts/games/cupcake-studio-model.js', 'scripts/games/cupcake-studio.js', 'scripts/engines-cupcake-studio.js',
      'scripts/engines-new-games.js',
      'scripts/engines-p3-games.js']) run(file);
  }
  if (loadEngines) run('scripts/engines-batch4-games.js');
  if (loadEngines) {
    for (const file of ['scripts/games/phim-sao.js', 'scripts/games/moc-qua.js', 'scripts/games/dao-ngoc.js',
      'scripts/engines-batch6-games.js']) run(file);
  }
  run('scripts/game-registry.js'); run('scripts/modal-accessibility.js');
  if (loadApp) vm.runInContext(read('app.js').replace('let allGames = [];', 'let allGames = globalThis.__testGames;'), context, { filename: 'app.js' });
  return {
    context, window, document, timers, frames, errors, vibrations, stored,
    advance(ms) { now += ms; },
    tickIntervals() { for (const item of [...timers.values()]) if (item.interval) item.callback(...item.args); },
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


module.exports = { harness, assertStopped, read, games };

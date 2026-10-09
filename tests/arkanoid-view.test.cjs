const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../candidates/arkanoid-dap-gach/model.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback, options) {
    const list = this.listeners.get(type) || [];
    if (!list.some(item => item.callback === callback)) list.push({ callback, options });
    this.listeners.set(type, list);
  }
  removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.callback !== callback)); }
  dispatch(type, values = {}) {
    const event = { type, target: this, preventDefault() {}, stopPropagation() {}, ...values };
    for (const item of [...(this.listeners.get(type) || [])]) item.callback.call(this, event);
  }
  listenerCount() { return [...this.listeners.values()].reduce((sum, list) => sum + list.length, 0); }
}

class Element extends Target {
  constructor(tag = 'div', attrs = '') {
    super(); this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.dataset = {};
    this.style = {}; this.textContent = ''; this.className = ''; this.width = 720; this.height = 480; this.hidden = false;
    this.classList = {
      add: (...names) => names.forEach(name => { if (!this.className.split(' ').includes(name)) this.className = `${this.className} ${name}`.trim(); }),
      remove: (...names) => { this.className = this.className.split(' ').filter(name => !names.includes(name)).join(' '); },
      contains: name => this.className.split(' ').includes(name)
    };
    this._arcCount = 0;
    this.ctx = new Proxy({
      arc: () => { this._arcCount++; },
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      measureText: value => ({ width: String(value).length * 7 })
    }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
    for (const match of attrs.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) this.setAttribute(match[1], match[2] ?? match[3]);
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  set innerHTML(value) {
    this.html = value; this.children = [];
    for (const match of value.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) this.appendChild(new Element(match[1], match[2]));
  }
  get innerHTML() { return this.html || ''; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  querySelectorAll(selector) {
    const selectors = selector.split(',').map(value => value.trim());
    const matches = node => selectors.some(part => part.startsWith('#') ? node.id === part.slice(1) : part.startsWith('.') ? node.classList.contains(part.slice(1)) : node.tagName.toLowerCase() === part.toLowerCase());
    return this.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getContext() { return this.ctx; }
  getBoundingClientRect() { return { left: 0, top: 0, right: this.width, bottom: this.height, width: this.width, height: this.height }; }
  focus() { this.focused = true; }
  setPointerCapture(id) { this.pointerCapture = id; }
  hasPointerCapture(id) { return this.pointerCapture === id; }
  releasePointerCapture(id) { if (this.pointerCapture === id) this.pointerCapture = null; }
  click() { this.dispatch('click'); }
  closest(selector) { return selector.includes('button') && this.tagName === 'BUTTON' ? this : null; }
}

function start({ reducedMotion = false } = {}) {
  const window = new Target(), document = new Target(), container = new Element('div');
  document.hidden = false;
  let nextFrame = 1, now = 0;
  const frames = new Map(), cleanup = [];
  const context = vm.createContext(Object.assign(window, {
    window, document, console, devicePixelRatio: 1,
    matchMedia: query => ({ matches: query.includes('reduced-motion') && reducedMotion }),
    requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  }));
  context.NP_OrbitBrickModel = M;
  vm.runInContext(read('candidates/arkanoid-dap-gach/view.js'), context, { filename: 'view.js' });
  const session = {
    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      cleanup.push(() => target.removeEventListener(type, handler, options));
    },
    requestAnimationFrame: callback => context.requestAnimationFrame(callback),
    cancelAnimationFrame: id => context.cancelAnimationFrame(id),
    onCleanup(callback) { cleanup.push(callback); }
  };
  const tones = [];
  const mounted = context.NP_OrbitBrick.mount(container, session, { playTone: (...args) => tones.push(args), init() {} });
  return {
    context, window, document, container, mounted, frames, tones,
    get: id => container.querySelector('#' + id),
    frame(ms = 16) { now += ms; const pending = [...frames.entries()]; for (const [id, callback] of pending) if (frames.delete(id)) callback(now); },
    close() { for (const fn of cleanup.splice(0).reverse()) fn(); }
  };
}

test('play surface is brief, accessible, original, and touch-sized', () => {
  const h = start({ reducedMotion: true });
  for (const id of ['ogCanvas', 'ogScore', 'ogRound', 'ogLives', 'ogPause', 'ogRestart', 'ogOverlay', 'ogStart', 'ogStatus']) assert.ok(h.get(id), id);
  assert.match(h.container.innerHTML, /Vệ Tinh Giữ Quỹ Đạo/);
  assert.match(h.container.innerHTML, /Space phóng/);
  assert.match(h.container.innerHTML, /Khối bạc cần 2 chạm · khối vàng chắn bóng/);
  assert.match(h.get('ogStatus').textContent, /Vành mở: Khe giữa dẫn sang hai cánh/);
  assert.equal(h.mounted.isReducedMotion(), true); assert.equal(h.get('ogCanvas').dataset.motion, 'reduced');
  const css = read('candidates/arkanoid-dap-gach/style.css');
  assert.match(css, /min-height:44px/); assert.match(css, /touch-action:none/); assert.match(css, /prefers-reduced-motion/);
  h.close(); assert.equal(h.window.listenerCount(), 0);
});

test('integrated portal model and view stay in sync with the candidate files', () => {
  assert.equal(read('scripts/games/arkanoid-model.js'), read('candidates/arkanoid-dap-gach/model.js'));
  assert.equal(read('scripts/games/arkanoid.js'), read('candidates/arkanoid-dap-gach/view.js'));
});

test('pointer and keyboard inputs move the paddle and launch play', () => {
  const h = start(), canvas = h.get('ogCanvas'), model = h.mounted.getModel();
  canvas.dispatch('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 170, preventDefault() {} });
  assert.equal(model.view().status, 'playing'); assert.notEqual(model.view().paddle.targetX, null);
  h.frame(); const prior = model.view().paddle.x;
  canvas.dispatch('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 520, buttons: 1 }); h.frame();
  assert.ok(model.view().paddle.x > prior);
  canvas.dispatch('pointerup', { pointerId: 2 }); assert.equal(model.view().paddle.targetX, null);
  const beforeKey = model.view().paddle.x;
  h.container.dispatch('keydown', { key: 'a', repeat: false, target: canvas }); h.frame();
  assert.ok(model.view().paddle.x < beforeKey);
  h.container.dispatch('keyup', { key: 'a', target: canvas });
  assert.ok(h.tones.some(args => args[0] === 520));
  h.close();
});

test('Space, pause, resume, blur, and replay controls manage animation frames', () => {
  const h = start(), canvas = h.get('ogCanvas');
  h.container.dispatch('keydown', { key: ' ', repeat: false, target: canvas });
  assert.equal(h.mounted.getModel().view().status, 'playing'); assert.equal(h.frames.size, 1);
  h.container.dispatch('keydown', { key: 'p', repeat: false, target: canvas });
  assert.equal(h.mounted.getModel().view().status, 'paused'); assert.equal(h.frames.size, 0);
  h.get('ogStart').click(); assert.equal(h.mounted.getModel().view().status, 'playing'); assert.equal(h.frames.size, 1);
  h.window.dispatch('blur'); assert.equal(h.mounted.getModel().view().status, 'paused'); assert.equal(h.frames.size, 0);
  h.get('ogStart').click(); h.get('ogRestart').click();
  assert.equal(h.mounted.getModel().view().status, 'ready'); assert.equal(h.mounted.getModel().view().score, 0);
  assert.equal(h.mounted.getModel().view().lives, M.MAX_LIVES); assert.equal(h.frames.size, 0);
  h.close();
});

test('reduced motion disables the decorative ball trail and cleanup removes all listeners and frames', () => {
  const h = start({ reducedMotion: true }), canvas = h.get('ogCanvas');
  const baseArcs = canvas._arcCount;
  h.get('ogStart').click(); h.frame(17);
  assert.equal(canvas._arcCount - baseArcs, 6, 'two redraws add only the three static ball arcs each');
  const fullMotion = start(), fullCanvas = fullMotion.get('ogCanvas'), fullBase = fullCanvas._arcCount;
  fullMotion.get('ogStart').click(); fullMotion.frame(17);
  assert.equal(fullCanvas._arcCount - fullBase, 7, 'full motion adds one small trail arc on the moving frame');
  fullMotion.close();
  const target = h.get('ogCanvas');
  target.dispatch('pointerdown', { pointerId: 9, clientX: 420, preventDefault() {} });
  assert.equal(target.pointerCapture, 9);
  h.close();
  assert.equal(target.pointerCapture, null, 'cleanup releases active pointer capture');
  assert.equal(h.frames.size, 0); assert.equal(h.window.listenerCount(), 0);
  target.dispatch('pointerdown', { pointerId: 1, clientX: 80 });
  assert.equal(h.frames.size, 0, 'detached canvas cannot restart animation');
});

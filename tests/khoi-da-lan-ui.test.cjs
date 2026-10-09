const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const M = require('../scripts/games/khoi-da-lan-model.js');

class FakeElement {
  constructor(id, container) {
    this.id = id;
    this.container = container;
    this.handlers = new Map();
    this.attributes = new Map();
    this.classNames = new Set();
    this.classList = {
      add: name => this.classNames.add(name),
      remove: name => this.classNames.delete(name),
      contains: name => this.classNames.has(name)
    };
    this.style = { values: {}, setProperty: (name, value) => { this.style.values[name] = value; } };
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this._html = '';
  }
  set innerHTML(value) { this._html = value; this.container?.registerMarkup(value); }
  get innerHTML() { return this._html; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name); }
  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(handler);
  }
  dispatch(type, event = {}) {
    const e = { preventDefault() { this.defaultPrevented = true; }, ...event };
    for (const handler of this.handlers.get(type) || []) handler(e);
    return e;
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  querySelector(selector) { return this.container.querySelector(selector); }
}

function domHarness(options = {}) {
  const nodes = new Map();
  const container = new FakeElement('container', null);
  container.container = container;
  container.registerMarkup = html => {
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
      if (!nodes.has(match[1])) nodes.set(match[1], new FakeElement(match[1], container));
    }
  };
  container.querySelector = selector => nodes.get(selector.replace(/^#/, '')) || null;
  const window = new FakeElement('window', container);
  const values = options.storage || new Map();
  window.localStorage = options.localStorage || {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  const cleanups = [];
  const session = {
    listen(target, type, handler) { target.addEventListener(type, handler); },
    onCleanup(handler) { cleanups.push(handler); }
  };
  window.NP_KhoiDaLanModel = M;
  const context = { window };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/games/khoi-da-lan.js'), 'utf8'), context);
  const game = window.NP_KhoiDaLan.mount(container, session);
  return { container, nodes, window, game, cleanups, storage: values };
}

function shortestRoute(levelIndex) {
  const view = M.create(levelIndex, { progress: { unlockedCount: M.LEVELS.length } }).view();
  const supports = new Set(view.tiles.map(tile => `${tile.x},${tile.y}`));
  const start = { ...view.start, orientation: 'stand' };
  const key = state => `${state.x},${state.y},${state.orientation}`;
  const queue = [start], previous = new Map([[key(start), null]]), via = new Map();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const state = queue[cursor];
    if (state.orientation === 'stand' && state.x === view.goal.x && state.y === view.goal.y) {
      const path = [];
      let here = key(state);
      while (previous.get(here) !== null) { path.push(via.get(here)); here = previous.get(here); }
      return path.reverse();
    }
    for (const direction of M.DIRECTIONS) {
      const next = M.moved(state, direction), nextKey = key(next);
      if (previous.has(nextKey) || !M.occupied(next).every(cell => supports.has(`${cell.x},${cell.y}`))) continue;
      previous.set(nextKey, key(state)); via.set(nextKey, direction); queue.push(next);
    }
  }
  return null;
}

test('mount renders original tiles, campaign metrics, locked stages and the gap key', () => {
  const h = domHarness();
  assert.equal(h.container.classList.contains('kd-host'), true);
  assert.match(h.nodes.get('kdBoard').innerHTML, /kd-goal/);
  assert.match(h.nodes.get('kdBoard').innerHTML, /kd-bridge/);
  assert.match(h.nodes.get('kdBoard').innerHTML, /kd-gap/);
  assert.equal(h.nodes.get('kdLevel0').getAttribute('aria-pressed'), 'true');
  assert.equal(h.nodes.get('kdLevel1').getAttribute('aria-pressed'), 'false');
  assert.equal(h.nodes.get('kdLevel1').disabled, true);
  assert.match(h.nodes.get('kdBoard').getAttribute('aria-label'), /Khối đang đứng/);
  assert.match(h.nodes.get('kdStatus').textContent, /Lăn qua đá/);
  assert.equal(h.nodes.get('kdPar').textContent, '3');
  assert.equal(h.nodes.get('kdBest').textContent, '—');
});

test('keyboard and touch-pad inputs move immediately, fall clearly, and undo/restart correctly', () => {
  const h = domHarness();
  const keyboard = h.window.dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(keyboard.defaultPrevented, true);
  assert.equal(h.game.getModel().view().block.orientation, 'wide');
  assert.match(h.nodes.get('kdBoard').getAttribute('aria-label'), /Khối đang nằm/);
  h.nodes.get('kdDown').click();
  assert.equal(h.nodes.get('kdMoves').textContent, '2');
  assert.equal(h.game.getModel().view().block.y, 3);
  h.nodes.get('kdRestart').click();
  assert.equal(h.nodes.get('kdMoves').textContent, '0');
  h.nodes.get('kdLeft').click();
  assert.equal(h.game.getModel().view().lastEvent, 'fall');
  assert.match(h.nodes.get('kdStatus').textContent, /Rơi khỏi lối/);
  h.nodes.get('kdUndo').click();
  assert.equal(h.game.getModel().view().moves, 0);
  assert.match(h.nodes.get('kdStatus').textContent, /hoàn tác/i);
  assert.equal(h.nodes.get('kdUndo').disabled, true);
});

test('all authored boards can be completed, and next level stays optional and immediate', () => {
  const h = domHarness();
  for (const direction of shortestRoute(0)) h.window.dispatch('keydown', { key: `Arrow${({ left: 'Left', right: 'Right', up: 'Up', down: 'Down' })[direction]}` });
  assert.equal(h.game.getModel().view().status, 'won');
  assert.equal(h.nodes.get('kdNext').hidden, false);
  assert.equal(h.nodes.get('kdLevel1').disabled, false);
  assert.match(h.nodes.get('kdStatus').textContent, /lọt hố/);
  h.nodes.get('kdNext').click();
  assert.equal(h.game.getModel().view().levelIndex, 1);
  assert.equal(h.nodes.get('kdLevel1').getAttribute('aria-pressed'), 'true');
  assert.match(h.nodes.get('kdLevelName').textContent, /Bậc Mây/);
  for (const direction of shortestRoute(1)) h.window.dispatch('keydown', { key: `Arrow${({ left: 'Left', right: 'Right', up: 'Up', down: 'Down' })[direction]}` });
  h.nodes.get('kdNext').click();
  h.nodes.get('kdLevel2').click();
  assert.equal(h.game.getModel().view().levelIndex, 2);
  assert.match(h.nodes.get('kdBoard').getAttribute('aria-label'), /11 cột, 7 hàng/);
  assert.equal(h.nodes.get('kdLevel3').disabled, true);
});

test('completed progress and personal best survive a remount', () => {
  const first = domHarness();
  for (const direction of shortestRoute(0)) first.nodes.get(`kd${direction[0].toUpperCase()}${direction.slice(1)}`).click();
  const saved = JSON.parse(first.storage.get('np-khoi-da-lan-progress-v1'));
  assert.equal(saved.unlockedCount, 2);
  assert.equal(saved.bestMoves[0], M.LEVELS[0].par);

  const resumed = domHarness({ storage: first.storage });
  assert.equal(resumed.nodes.get('kdLevel1').disabled, false);
  assert.equal(resumed.nodes.get('kdBest').textContent, String(M.LEVELS[0].par));
  resumed.nodes.get('kdLevel1').click();
  assert.equal(resumed.game.getModel().view().levelIndex, 1);
});

test('malformed or blocked local storage never prevents play', () => {
  const malformed = domHarness({ localStorage: { getItem: () => '{bad', setItem() {} } });
  assert.equal(malformed.game.getModel().view().unlockedCount, 1);

  const blocked = domHarness({ localStorage: {
    getItem() { throw new Error('storage blocked'); },
    setItem() { throw new Error('storage blocked'); }
  } });
  for (const direction of shortestRoute(0)) blocked.nodes.get(`kd${direction[0].toUpperCase()}${direction.slice(1)}`).click();
  assert.equal(blocked.game.getModel().view().status, 'won');
});

test('cleanup makes stale keyboard and button events inert', () => {
  const h = domHarness();
  const before = h.game.getModel().view();
  for (const cleanup of h.cleanups) cleanup();
  h.window.dispatch('keydown', { key: 'ArrowRight' });
  h.nodes.get('kdRestart').click();
  assert.equal(h.game.getModel().view().moves, before.moves);
  assert.equal(h.game.getModel().view().block.x, before.block.x);
  assert.equal(h.container.classList.contains('kd-host'), false);
});

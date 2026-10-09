const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../scripts/games/freecell-model.js');

class FakeElement {
  constructor(root, tag = 'div') {
    this.root = root || this;
    this.tagName = tag.toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.handlers = new Map();
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
      toggle: (name, force) => {
        const next = force === undefined ? !this.classes.has(name) : Boolean(force);
        if (next) this.classes.add(name); else this.classes.delete(name);
        return next;
      }
    };
    this.disabled = false;
    this.parentNode = null;
    this._innerHTML = '';
  }
  focus() { this.root.activeElement = this; }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.root.registerMarkup(this._innerHTML);
  }
  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') for (const cls of String(value).split(/\s+/)) if (cls) this.classes.add(cls);
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
  }
  addEventListener(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    this.handlers.set(type, (this.handlers.get(type) || []).filter(candidate => candidate !== fn));
  }
  dispatch(type, values = {}) {
    const event = { type, target: this, repeat: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const fn of this.handlers.get(type) || []) fn(event);
    return event;
  }
  closest(selector) {
    const attr = selector.match(/^\[data-([\w-]+)(?:="([^"]+)")?\]$/);
    if (!attr) return null;
    const key = attr[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const expected = attr[2];
    if (this.dataset[key] !== undefined && (expected === undefined || this.dataset[key] === expected)) return this;
    return this.parentNode?.closest(selector) || null;
  }
}

function domHarness(options = {}) {
  const container = new FakeElement(null);
  container.root = container;
  container.nodes = new Map();
  container.allNodes = [];
  container.registerMarkup = html => {
    for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
      const node = new FakeElement(container, match[1]);
      for (const attr of match[2].matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) node.setAttribute(attr[1], attr[2]);
      container.allNodes.push(node);
      if (node.id) container.nodes.set(node.id, node);
      for (const cls of node.classes) if (!container.nodes.has(`.${cls}`)) container.nodes.set(`.${cls}`, node);
    }
  };
  container.querySelector = selector => {
    const direct = container.nodes.get(selector) || (selector.startsWith('#') ? container.nodes.get(selector.slice(1)) : null);
    if (direct) return direct;
    const attrs = [...selector.matchAll(/\[data-([\w-]+)="([^"]+)"\]/g)].map(([, key, value]) => [key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]);
    return attrs.length ? [...container.allNodes].reverse().find(node => attrs.every(([key, value]) => node.dataset[key] === value)) || null : null;
  };
  const window = new FakeElement(container, 'window');
  window.NP_FreeCellModel = M;
  const context = { window, Date, Math };
  const source = fs.readFileSync(path.join(__dirname, '../scripts/games/freecell.js'), 'utf8');
  vm.runInNewContext(source, context);
  const cleanups = [];
  const session = {
    listen(target, type, handler) {
      target.addEventListener(type, handler);
      cleanups.push(() => target.removeEventListener(type, handler));
    },
    bindHorizontalPan(_viewport, controls) { controls.group.hidden = true; return () => {}; },
    onCleanup(handler) { cleanups.push(handler); },
    stop() { cleanups.splice(0).forEach(cleanup => cleanup()); }
  };
  const game = window.NP_FreeCell.mount(container, session, options);
  return { container, window, session, game };
}

function sourceCard(container, source, target = null) {
  const pile = new FakeElement(container, 'div');
  pile.dataset.target = 'tableau';
  pile.dataset.pile = String(target?.pile ?? source.pile ?? 0);
  const card = new FakeElement(container, 'button');
  card.dataset.source = source.zone;
  if (source.zone === 'tableau') {
    card.dataset.pile = String(source.pile);
    card.dataset.index = String(source.index);
  } else card.dataset.cell = String(source.cell);
  card.parentNode = pile;
  return card;
}

test('mount opens a complete face-up deal immediately with four cells, four foundations and eight columns', () => {
  const { container, game } = domHarness({ seed: 'freecell-dom-double' });
  const view = game.getModel().view();
  assert.equal(view.tableaus.flat().length, 52);
  assert.match(container.innerHTML, /52 LÁ.*8 CỘT/);
  assert.equal((container.querySelector('.fc-tableau').innerHTML.match(/class="fc-pile"/g) || []).length, 8);
  assert.equal((container.querySelector('.fc-tableau').innerHTML.match(/data-source="tableau"/g) || []).length, 52);
  assert.equal((container.querySelector('.fc-cells').innerHTML.match(/class="fc-cell"/g) || []).length, 4);
  assert.equal((container.querySelector('.fc-foundations').innerHTML.match(/data-target="foundation"/g) || []).length, 4);
  assert.equal(container.querySelector('#fcUndo').disabled, true);
  assert.equal(container.classList.contains('fc-host'), true);
});

test('click selection and destination move a card; keyboard undo and restart recover the deal', () => {
  const { container, window, game } = domHarness({ seed: 'freecell-click-test' });
  const model = game.getModel();
  const before = model.view();
  const source = { zone: 'tableau', pile: 0, index: 6 };
  const card = sourceCard(container, source);
  container.dispatch('click', { target: card });
  assert.match(container.querySelector('.fc-tableau').innerHTML, /fc-selected/);
  assert.equal(container.activeElement.dataset.source, 'tableau', 'keyboard selection keeps focus on the selected card');
  const slot = new FakeElement(container, 'button');
  slot.dataset.target = 'cell';
  slot.dataset.cell = '0';
  container.dispatch('click', { target: slot });
  assert.equal(model.view().freeCells[0].id, before.tableaus[0][6].id);
  assert.equal(container.activeElement.dataset.source, 'cell', 'focus follows the moved card into its new cell');
  assert.equal(model.view().moves, 1);
  assert.equal(container.querySelector('#fcUndo').disabled, false);

  window.dispatch('keydown', { key: 'z' });
  assert.deepEqual(model.view().tableaus, before.tableaus);
  assert.equal(model.view().freeCells[0], null);
  assert.equal(model.view().moves, 0);
  assert.equal(window.dispatch('keydown', { key: 'Escape' }).defaultPrevented, true);

  const restart = new FakeElement(container, 'button');
  restart.dataset.action = 'restart';
  container.dispatch('click', { target: restart });
  assert.deepEqual(model.view().tableaus, before.tableaus);
  assert.equal(model.view().lastEvent, 'restart');

  const priorSeed = game.getModel().view().seed;
  const newDeal = new FakeElement(container, 'button');
  newDeal.dataset.action = 'new';
  container.dispatch('click', { target: newDeal });
  assert.notEqual(game.getModel().view().seed, priorSeed);
  assert.equal(game.getModel().view().tableaus.flat().length, 52);
});

test('cleanup removes input listeners and makes captured stale actions inert', () => {
  const { container, window, session, game } = domHarness({ seed: 'freecell-cleanup-test' });
  const model = game.getModel();
  const before = model.view();
  const staleCard = sourceCard(container, { zone: 'tableau', pile: 0, index: 6 });
  const staleNew = new FakeElement(container, 'button');
  staleNew.dataset.action = 'new';
  assert.equal((container.handlers.get('click') || []).length, 1);
  assert.equal((window.handlers.get('keydown') || []).length, 1);

  session.stop();
  assert.equal(container.classList.contains('fc-host'), false);
  assert.equal((container.handlers.get('click') || []).length, 0);
  assert.equal((window.handlers.get('keydown') || []).length, 0);
  container.dispatch('click', { target: staleCard });
  container.dispatch('click', { target: staleNew });
  window.dispatch('keydown', { key: 'z' });
  assert.deepEqual(model.view().tableaus, before.tableaus);
  assert.equal(model.view().moves, 0);
});

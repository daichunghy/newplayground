const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../scripts/games/klondike-model.js');

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
    this.style = { setProperty() {} };
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this.parentNode = null;
    this._innerHTML = '';
  }
  focus() { this.root.activeElement = this; this.focused = true; }
  set innerHTML(value) { this._innerHTML = String(value); if (this === this.root) this.root.registerMarkup(value); }
  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') for (const cls of String(value).split(/\s+/)) if (cls) this.classes.add(cls);
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
  }
  dispatch(type, values = {}) {
    const event = { type, target: this, repeat: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const fn of this.handlers.get(type) || []) fn(event);
    return event;
  }
  click() { this.root.dispatch('click', { target: this }); }
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
  container.registerMarkup = html => {
    for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
      const node = new FakeElement(container, match[1]);
      for (const attr of match[2].matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) node.setAttribute(attr[1], attr[2]);
      if (node.id) container.nodes.set(node.id, node);
      for (const cls of node.classes) if (!container.nodes.has(`.${cls}`)) container.nodes.set(`.${cls}`, node);
    }
  };
  container.querySelector = selector => container.nodes.get(selector) || (selector.startsWith('#') ? container.nodes.get(selector.slice(1)) : null) || null;
  container.querySelectorAll = selector => {
    const exact = container.nodes.get(selector);
    return exact ? [exact] : [];
  };
  const window = new FakeElement(container, 'window');
  window.NP_KlondikeModel = M;
  const context = { window, Date, Math };
  const source = fs.readFileSync(path.join(__dirname, '../scripts/games/klondike.js'), 'utf8');
  vm.runInNewContext(source, context);
  const cleanups = [];
  const session = {
    listen(target, type, handler) { target.addEventListener(type, handler); },
    onCleanup(handler) { cleanups.push(handler); }
  };
  const game = window.NP_Klondike.mount(container, session, options);
  return { container, window, game, cleanups };
}

function sourceCard(zone, values = {}, parent = null) {
  const card = new FakeElement(parent?.root || null, 'button');
  card.dataset.source = zone;
  for (const [key, value] of Object.entries(values)) card.dataset[key] = String(value);
  card.parentNode = parent;
  return card;
}
function targetPile(zone, values = {}) {
  const pile = new FakeElement(null, 'div');
  pile.dataset.target = zone;
  for (const [key, value] of Object.entries(values)) pile.dataset[key] = String(value);
  return pile;
}
function makeDeck(overrides = {}) {
  const base = M.cardsInOrder().map(card => card.id);
  const used = new Set(Object.values(overrides));
  const deck = Array(52);
  for (const [index, id] of Object.entries(overrides)) deck[Number(index)] = id;
  const remaining = base.filter(id => !used.has(id));
  for (let i = 0; i < deck.length; i++) if (!deck[i]) deck[i] = remaining.shift();
  return deck;
}

test('mount starts on a playable seven-column deal with concise controls and no tutorial gate', () => {
  const h = domHarness({ seed: 10 });
  assert.equal(h.container.classList.contains('kl-host'), true);
  assert.match(h.container.innerHTML, /Chạm lá bài/);
  assert.match(h.container.innerHTML, /id="klStock"/);
  assert.match(h.container.innerHTML, /id="klNew"/);
  assert.match(h.container.querySelector('#klStatus').textContent, /Chạm lá bài/);
  const board = h.container.querySelector('#klTableau');
  assert.equal((board.innerHTML.match(/class="kl-pile"/g) || []).length, 7);
  assert.match(h.container.querySelector('#klStock').getAttribute('aria-label'), /24/);
  assert.equal(h.container.querySelector('#klUndo').disabled, true);
  assert.match(h.container.querySelector('.kl-foundations').innerHTML, /data-target="foundation"/);
});

test('tap selection, destination tap, keyboard undo, stock draw and restart work through the mounted UI', () => {
  const order = makeDeck({ 0: 'c5', 2: 'h6' });
  const h = domHarness({ seed: 11, deckOrder: order });
  const card = sourceCard('tableau', { pile: 0, index: 0 });
  h.container.dispatch('click', { target: card });
  assert.match(h.container.querySelector('#klStatus').textContent, /Đã chọn bài/);
  const destination = targetPile('tableau', { pile: 1 });
  h.container.dispatch('click', { target: destination });
  assert.equal(h.game.getModel().view().tableaus[1].at(-1).id, 'c5');
  assert.equal(h.container.querySelector('#klMoveCount').textContent, '1 nước');
  assert.equal(h.container.querySelector('#klUndo').disabled, false);

  const keyboardUndo = h.window.dispatch('keydown', { key: 'z' });
  assert.equal(keyboardUndo.defaultPrevented, true);
  assert.equal(h.container.querySelector('#klUndo').focused, true, 'keyboard undo restores focus to its control');
  assert.equal(h.game.getModel().view().tableaus[0][0].id, 'c5');
  assert.equal(h.game.getModel().view().moves, 0);
  h.container.querySelector('#klStock').click();
  assert.equal(h.game.getModel().view().stockCount, 23);
  assert.equal(h.game.getModel().view().waste.length, 1);
  h.container.querySelector('#klRestart').click();
  assert.equal(h.game.getModel().view().stockCount, 24);
  assert.equal(h.game.getModel().view().waste.length, 0);
  assert.equal(h.game.getModel().view().moves, 0);
});

test('desktop drag and drop moves the same run as tap selection', () => {
  const h = domHarness({ seed: 12, deckOrder: makeDeck({ 0: 'c5', 2: 'h6' }) });
  const card = sourceCard('tableau', { pile: 0, index: 0 }, targetPile('tableau', { pile: 0 }));
  const destination = targetPile('tableau', { pile: 1 });
  const dragStart = h.container.dispatch('dragstart', { target: card, dataTransfer: { effectAllowed: '', setData() {} } });
  assert.equal(dragStart.defaultPrevented, undefined);
  const drop = h.container.dispatch('drop', { target: destination });
  assert.equal(drop.defaultPrevented, true);
  assert.equal(h.game.getModel().view().tableaus[1].at(-1).id, 'c5');
  assert.equal(h.game.getModel().view().moves, 1);
});

test('card selection, cancellation and a move keep keyboard focus on a live card', () => {
  const h = domHarness({ seed: 14, deckOrder: makeDeck({ 0: 'c5', 2: 'h6' }) });
  const focusable = new FakeElement(h.container, 'button');
  const sourceSelector = '[data-source="tableau"][data-pile="0"][data-index="0"]';
  h.container.nodes.set(sourceSelector, focusable);
  h.container.dispatch('click', { target: sourceCard('tableau', { pile: 0, index: 0 }) });
  assert.equal(focusable.focused, true, 'selection restores focus to the selected card');

  h.window.dispatch('keydown', { key: 'Escape' });
  assert.equal(focusable.focused, true, 'Escape restores focus to the deselected card');

  const movedCardFocus = new FakeElement(h.container, 'button');
  h.container.nodes.set('[data-source="tableau"][data-pile="1"][data-index="2"]', movedCardFocus);
  h.container.dispatch('click', { target: sourceCard('tableau', { pile: 0, index: 0 }) });
  h.container.dispatch('click', { target: targetPile('tableau', { pile: 1 }) });
  assert.equal(movedCardFocus.focused, true, 'a successful move focuses the moved card at its destination');
});

test('cleanup removes the host state and makes stale click, drag and keyboard events inert', () => {
  const h = domHarness({ seed: 13 });
  const before = h.game.getModel().view();
  for (const cleanup of h.cleanups) cleanup();
  h.container.querySelector('#klStock').click();
  h.window.dispatch('keydown', { key: 'z' });
  h.container.dispatch('dragstart', { target: sourceCard('waste') });
  assert.equal(h.container.classList.contains('kl-host'), false);
  assert.equal(h.game.getModel().view().moves, before.moves);
  assert.equal(h.game.getModel().view().stockCount, before.stockCount);
});

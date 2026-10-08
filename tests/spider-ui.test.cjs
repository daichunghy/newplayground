const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../scripts/games/spider-model.js');

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
  set innerHTML(value) { this._innerHTML = String(value); this.root.registerMarkup(this._innerHTML); }
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
  removeEventListener(type, fn) { this.handlers.set(type, (this.handlers.get(type) || []).filter(candidate => candidate !== fn)); }
  dispatch(type, values = {}) {
    const event = { type, target: this, repeat: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const fn of this.handlers.get(type) || []) fn(event);
    return event;
  }
  closest(selector) {
    const attrs = [...selector.matchAll(/\[data-([\w-]+)(?:="([^"]+)")?\]/g)];
    if (!attrs.length) return null;
    const matches = attrs.every(([, name, value]) => {
      const key = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return this.dataset[key] !== undefined && (value === undefined || this.dataset[key] === value);
    });
    return matches ? this : this.parentNode?.closest(selector) || null;
  }
}

function arrangeOpeningMove() {
  const order = M.shuffledDeck(77);
  const cards = M.cardsInOrder();
  const byRank = rank => cards.find(card => card.rank === rank).id;
  const fixed = new Map([[5, byRank(5)], [11, byRank(6)]]);
  const rest = order.filter(id => ![...fixed.values()].includes(id));
  const result = Array(104);
  for (const [index, id] of fixed) result[index] = id;
  for (let i = 0, next = 0; i < result.length; i++) if (!result[i]) result[i] = rest[next++];
  return result;
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
      if (node.id) container.nodes.set(`#${node.id}`, node);
      for (const cls of node.classes) if (!container.nodes.has(`.${cls}`)) container.nodes.set(`.${cls}`, node);
    }
  };
  container.querySelector = selector => {
    const direct = container.nodes.get(selector);
    if (direct) return direct;
    const attrs = [...selector.matchAll(/\[data-([\w-]+)="([^"]+)"\]/g)].map(([, key, value]) => [key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]);
    return attrs.length ? [...container.allNodes].reverse().find(node => attrs.every(([key, value]) => node.dataset[key] === value)) || null : null;
  };
  const window = new FakeElement(container, 'window');
  window.NP_SpiderModel = M;
  let now = 100;
  const FakeDate = class extends Date { static now() { return ++now; } };
  const MathForGame = Object.create(Math);
  let random = .1;
  MathForGame.random = () => { random += .1; return random % 1; };
  const context = { window, Date: FakeDate, Math: MathForGame };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/games/spider.js'), 'utf8'), context);
  const cleanups = [];
  const session = {
    listen(target, type, handler) { target.addEventListener(type, handler); cleanups.push(() => target.removeEventListener(type, handler)); },
    onCleanup(handler) { cleanups.push(handler); },
    stop() { cleanups.splice(0).forEach(cleanup => cleanup()); }
  };
  const game = window.NP_Spider.mount(container, session, options);
  return { container, window, session, game };
}

function cardNode(container, pile, index, targetPile = pile) {
  const pileNode = new FakeElement(container, 'div');
  pileNode.dataset.target = 'tableau';
  pileNode.dataset.pile = String(targetPile);
  const card = new FakeElement(container, 'button');
  card.dataset.source = 'tableau';
  card.dataset.pile = String(pile);
  card.dataset.index = String(index);
  card.parentNode = pileNode;
  return card;
}

test('mount shows a compact one-suit board, stock, ten columns, and enabled undo state', () => {
  const { container, game } = domHarness({ seed: 'spider-ui' });
  assert.match(container.innerHTML, /1 CHẤT · 104 LÁ/);
  assert.equal((container.querySelector('#spTableau').innerHTML.match(/class="sp-pile"/g) || []).length, 10);
  assert.equal(game.getModel().view().stockCount, 50);
  assert.equal(container.querySelector('#spStock').disabled, false);
  assert.equal(container.querySelector('#spUndo').disabled, true);
  assert.equal(container.classList.contains('sp-host'), true);
});

test('touch-style click selects and moves a valid run; keyboard undo and stock deal work', () => {
  const { container, window, game } = domHarness({ seed: 'spider-touch', deckOrder: arrangeOpeningMove() });
  const model = game.getModel();
  const source = cardNode(container, 0, 5, 0);
  container.dispatch('click', { target: source, pointerType: 'touch' });
  assert.match(container.querySelector('#spTableau').innerHTML, /sp-selected/);
  assert.equal(container.activeElement.dataset.source, 'tableau');
  const destination = new FakeElement(container, 'button');
  destination.dataset.target = 'tableau';
  destination.dataset.pile = '1';
  container.dispatch('click', { target: destination, pointerType: 'touch' });
  assert.equal(model.view().moves, 1);
  assert.equal(model.view().tableaus[1].at(-1).rank, 5);
  assert.equal(window.dispatch('keydown', { key: 'z' }).defaultPrevented, true);
  assert.equal(model.view().moves, 0);
  assert.equal(model.view().tableaus[0].length, 6);
  assert.equal(window.dispatch('keydown', { key: 'd' }).defaultPrevented, true);
  assert.equal(model.view().stockCount, 40);
  assert.equal(model.view().moves, 1);
  const selected = cardNode(container, 0, 5, 0);
  container.dispatch('click', { target: selected, pointerType: 'touch' });
  window.dispatch('keydown', { key: 'Escape' });
  assert.doesNotMatch(container.querySelector('#spTableau').innerHTML, /sp-selected/);
  assert.equal(container.activeElement.dataset.pile, '0', 'Escape restores focus to the card that was deselected');
  assert.equal(container.activeElement.dataset.index, '5');
});

test('restart replays its deal, new deal changes seed, and cleanup removes input handlers', () => {
  const { container, window, session, game } = domHarness({ seed: 'spider-reset' });
  const model = game.getModel();
  const original = model.view();
  model.dealStock();
  const restart = new FakeElement(container, 'button');
  restart.dataset.action = 'restart';
  container.dispatch('click', { target: restart });
  assert.equal(model.view().stockCount, 50);
  assert.equal(model.view().moves, 0);
  assert.deepEqual(model.view().tableaus.map(pile => pile.map(card => card.id)), original.tableaus.map(pile => pile.map(card => card.id)));
  const newButton = new FakeElement(container, 'button');
  newButton.dataset.action = 'new';
  container.dispatch('click', { target: newButton });
  assert.notEqual(game.getModel().view().seed, 'spider-reset');
  const before = game.getModel().view();
  assert.equal((container.handlers.get('click') || []).length, 1);
  assert.equal((window.handlers.get('keydown') || []).length, 1);
  session.stop();
  assert.equal(container.classList.contains('sp-host'), false);
  assert.equal((container.handlers.get('click') || []).length, 0);
  assert.equal((window.handlers.get('keydown') || []).length, 0);
  const stock = new FakeElement(container, 'button');
  stock.dataset.action = 'deal';
  container.dispatch('click', { target: stock });
  window.dispatch('keydown', { key: 'd' });
  assert.equal(game.getModel().view().stockCount, before.stockCount);
});

test('local integration loads the exact Spider route and original cover', () => {
  const root = path.join(__dirname, '..');
  assert.match(fs.readFileSync(path.join(root, 'scripts/game-registry.js'), 'utf8'), /'xep-bai-nhen-spider': 'launchBaiNhen'/);
  assert.match(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), /'xep-bai-nhen-spider': 'assets\/bai-nhen-original\.svg'/);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /scripts\/games\/spider\.(?:js|css)/);
  assert.equal(fs.existsSync(path.join(root, 'assets/bai-nhen-original.svg')), true);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read, games, Element } = require('./helpers/game-harness.cjs');

// Local DOM support for focus, selectors, dimensions and native button clicks.
// This remains a source/runtime test; actual layout is checked separately in a browser.
class ShellElement extends Element {
  constructor(tag = 'div', attrs = '', document) {
    super(tag);
    this.ownerDocument = document;
    this.clientWidth = 640; this.offsetHeight = 0;
    this.tabIndex = /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(this.tagName) ? 0 : -1;
    this.hidden = this.disabled = this.inert = false;
    this.classList.toggle = (name, force) => {
      const next = force === undefined ? !this.classList.contains(name) : !!force;
      this.classList[next ? 'add' : 'remove'](name); return next;
    };
    for (const match of attrs.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      this.setAttribute(match[1], match[2] ?? match[3] ?? match[4] ?? '');
    }
  }
  setAttribute(name, value) {
    super.setAttribute(name, String(value));
    if (['width', 'height'].includes(name)) this[name] = Number(value);
    if (name === 'tabindex') this.tabIndex = Number(value);
    if (name === 'value') this.value = String(value);
    if (['hidden', 'disabled', 'inert'].includes(name)) this[name] = true;
    if (name === 'style') for (const declaration of String(value).split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      const key = declaration.slice(0, colon).trim().replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (key) this.style[key] = declaration.slice(colon + 1).trim();
    }
  }
  hasAttribute(name) { return this.getAttribute(name) !== null; }
  get parentElement() { return this.parentNode instanceof ShellElement ? this.parentNode : null; }
  get isConnected() {
    let node = this;
    while (node?.parentNode) node = node.parentNode;
    return node === this.ownerDocument?.body;
  }
  get textContent() { return (this._text || '') + (this.children || []).map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.replaceChildren(); }
  appendChild(child) {
    if (child.parentNode) child.remove();
    child.ownerDocument = this.ownerDocument;
    return super.appendChild(child);
  }
  replaceChildren(...children) {
    for (const child of this.children || []) child.parentNode = null;
    this.children = [];
    for (const child of children) this.appendChild(child);
  }
  set innerHTML(html) {
    this.html = String(html); this._text = ''; this.replaceChildren();
    const stack = [this], voidTags = new Set(['input', 'br', 'hr', 'img', 'meta', 'link', 'source', 'area', 'wbr']);
    for (const match of this.html.matchAll(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi)) {
      const token = match[0];
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) {
        const tag = token.slice(2).match(/^[\w-]+/)[0].toUpperCase();
        const index = stack.findLastIndex(node => node.tagName === tag);
        if (index > 0) stack.length = index;
      } else if (token.startsWith('<')) {
        const [, tag, attrs] = token.match(/^<([\w-]+)([^>]*)>/);
        const child = new ShellElement(tag, attrs, this.ownerDocument);
        stack[stack.length - 1].appendChild(child);
        if (!voidTags.has(tag.toLowerCase()) && !token.endsWith('/>')) stack.push(child);
      } else stack[stack.length - 1]._text += token;
    }
  }
  get innerHTML() { return this.html || ''; }
  matches(selector) {
    return selector.split(',').some(part => {
      const pieces = part.trim().match(/(?:\[[^\]]*\]|\([^)]*\)|[^\s])+/g) || [];
      let node = this;
      const simple = (element, value) => {
        let valid = true;
        value = value.replace(/:not\(([^)]+)\)/g, (_, excluded) => {
          if (element.matches(excluded)) valid = false; return '';
        });
        value = value.replace(/\[([\w-]+)(?:\s*=\s*["']?([^\]"']+)["']?)?\]/g, (_, name, expected) => {
          const actual = ['hidden', 'disabled', 'inert'].includes(name)
            ? (element[name] ? '' : null) : element.getAttribute(name);
          if (expected === undefined ? actual === null : String(actual) !== expected) valid = false;
          return '';
        });
        const id = value.match(/#([\w-]+)/)?.[1];
        if (id && id !== element.id) valid = false;
        for (const match of value.matchAll(/\.([\w-]+)/g)) if (!element.classList.contains(match[1])) valid = false;
        const tag = value.match(/^[\w-]+/)?.[0];
        return valid && (!tag || tag.toUpperCase() === element.tagName);
      };
      if (!pieces.length || !simple(node, pieces.pop())) return false;
      while (pieces.length) {
        const ancestor = pieces.pop(); node = node.parentElement;
        while (node && !simple(node, ancestor)) node = node.parentElement;
        if (!node) return false;
      }
      return true;
    });
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  closest(selector) { let node = this; while (node) { if (node.matches(selector)) return node; node = node.parentElement; } return null; }
  contains(other) { while (other) { if (other === this) return true; other = other.parentNode; } return false; }
  getClientRects() {
    let node = this;
    while (node) { if (node.hidden || node.style.display === 'none') return []; node = node.parentElement; }
    return this.isConnected ? [this.getBoundingClientRect()] : [];
  }
  getBoundingClientRect() {
    const width = parseFloat(this.style.width) || this.width;
    const height = this.style.height === 'auto' ? width * this.height / this.width : parseFloat(this.style.height) || this.height;
    return { left: 0, top: 0, width, height };
  }
  focus() {
    if (!this.disabled && !this.closest('[hidden], [inert]') && this.getClientRects().length) this.ownerDocument.activeElement = this;
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  setPointerCapture(id) { this.capturedPointer = id; }
  releasePointerCapture(id) { if (id === this.capturedPointer) this.capturedPointer = null; }
}

function shellHarness({ blockStorage = false, initialize = true } = {}) {
  const h = harness({ loadApp: false });
  h.document.body = new ShellElement('body', '', h.document);
  h.document.body.style.overflow = '';
  h.document.createElement = tag => new ShellElement(tag, '', h.document);
  const markup = read('index.html');
  const start = markup.indexOf('<div class="game-modal" id="gameModal"');
  h.document.body.innerHTML = markup.slice(start, markup.indexOf('<!-- MODAL: DONATE', start));
  for (const [tag, id] of [['button', 'launchForTest'], ['div', 'toastBox'], ['button', 'themeToggleBtn'], ['button', 'soundToggleBtn'], ['span', 'favCount']]) {
    h.document.body.appendChild(new ShellElement(tag, `id="${id}"`, h.document));
  }
  h.container = h.document.getElementById('modalGameContainer');
  h.container.clientWidth = 720;
  h.window.innerHeight = 900;
  h.window.innerWidth = 1000;
  h.observers = new Set();
  h.context.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.target = target; h.observers.add(this); }
    disconnect() { h.observers.delete(this); }
  };
  h.window.dispatch = function (type, values = {}) {
    let stopped = false;
    const event = { type, target: this, preventDefault() {}, stopPropagation() {}, ...values,
      stopImmediatePropagation() { stopped = true; } };
    const entries = [...(this.listeners.get(type) || [])].sort((a, b) => Number(b.capture) - Number(a.capture));
    for (const entry of entries) {
      if (stopped) break;
      if ((this.listeners.get(type) || []).includes(entry)) entry.callback.call(this, event);
    }
  };
  if (blockStorage) h.context.localStorage = {
    getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); }, removeItem() { throw new Error('storage blocked'); }
  };
  vm.runInContext('Math.random = (() => { let seed = 816; return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); })();', h.context);
  vm.runInContext(read('scripts/game-guide.js'), h.context);
  const entry = '  // --- START ENTRY ---';
  const source = read('app.js').replace('let allGames = [];', 'let allGames = globalThis.__testGames;')
    .replace(entry, `  window.__shellTest = { setupGameShell, showGameOverlay, resumeGame, restartGame,
      fitGameCanvases, prepareGameShell, currentGuide, initPortal, toggleFavorite,
      state: () => ({ activeGame, favorites }) };\n` + entry);
  vm.runInContext(source, h.context, { filename: 'app.js' });
  h.api = h.context.__shellTest;
  if (initialize) h.api.setupGameShell();
  return h;
}

test('all 155 real games support shell help, pause, resume, replay and close without losing resources', () => {
  const h = shellHarness();
  assert.equal(games.length, 155);
  const windowListeners = h.window.listenerCount(), documentListeners = h.document.listenerCount();
  for (const game of games) {
    assert.equal(h.context.openGameById(game.id), true, game.id);
    const session = h.context.NP_GameSession.getCurrent();
    assert.ok(session?.isActive(), game.id + ' starts an active session');
    assert.equal(h.errors.length, 0, game.id + ': ' + h.errors.join('; '));
    h.frame(16); h.frame(16);
    const canvas = h.container.querySelector('canvas');
    h.window.dispatch('keydown', { target: canvas || h.container, key: 'ArrowRight', code: 'ArrowRight' });
    let timerFired = 0, frameFired = 0;
    session.setTimeout(() => timerFired++, 40);
    session.requestAnimationFrame(() => frameFired++);
    const beforeFrames = h.frames.size;
    h.api.showGameOverlay('help');
    assert.equal(session.isPaused(), true, game.id + ' help pauses gameplay');
    assert.equal(h.container.inert, true);
    assert.equal(h.document.getElementById('gameSessionOverlay').hidden, false);
    for (const id of ['gameHelpObjective', 'gameHelpKeyboard', 'gameHelpTouch']) {
      assert.ok(h.document.getElementById(id).textContent.length > 10, game.id + ' ' + id);
    }
    const pausedClock = session.clock.now();
    h.frame(10000); h.flushTimeouts();
    assert.equal(session.clock.now(), pausedClock);
    assert.equal(timerFired + frameFired, 0, game.id + ' work stays paused');
    assert.equal(h.frames.size, 0, game.id + ' no native RAF while paused');
    h.api.resumeGame();
    assert.equal(h.frames.size, beforeFrames, game.id + ' all scheduled frames resume');
    h.frame(16); h.flushTimeouts();
    assert.equal(timerFired, 1); assert.equal(frameFired, 1);
    assert.equal(h.container.inert, false);
    h.api.showGameOverlay(); h.api.restartGame();
    assert.equal(h.context.NP_GameSession.getCurrent()?.isPaused(), false, game.id + ' replay resumes gameplay');
    assert.equal(h.observers.size, 1, game.id + ' one current resize observer');
    h.frame(16);
    h.api.showGameOverlay(); h.context.closeGameModal(); h.flushTimeouts();
    assert.equal(h.context.NP_GameSession.getCurrent(), null);
    assert.equal(h.container.children.length, 0);
    assert.equal(h.frames.size, 0, game.id + ' no stale RAF after close');
    assert.equal(h.timers.size, 0, game.id + ' no stale timer after close');
    assert.equal(h.window.listenerCount(), windowListeners, game.id + ' shell listeners alone remain');
    assert.equal(h.document.listenerCount(), documentListeners, game.id + ' no document listener leak');
    assert.equal(h.observers.size, 0);
    assert.equal(h.errors.length, 0, game.id + ': ' + h.errors.join('; '));
  }
});

test('help pauses Typer Shark and restores the prior input focus; closing restores the launcher', () => {
  const h = shellHarness(), launcher = h.document.getElementById('launchForTest');
  launcher.focus(); h.context.openGameById('typer-shark');
  const input = h.container.querySelector('#tsInput');
  assert.equal(h.document.activeElement, input);
  h.api.showGameOverlay('help');
  assert.equal(h.document.activeElement, h.document.getElementById('resumeGameBtn'));
  assert.equal(h.document.getElementById('helpGameBtn').getAttribute('aria-expanded'), 'true');
  h.api.showGameOverlay('help'); h.api.resumeGame();
  assert.equal(h.document.activeElement, input, 'reopening help must retain the original playfield focus');
  assert.equal(h.document.getElementById('helpGameBtn').getAttribute('aria-expanded'), 'false');
  h.api.showGameOverlay(); h.context.closeGameModal();
  assert.equal(h.document.activeElement, launcher);
  assert.equal(h.document.body.style.overflow, '');
});

test('Gunny initially focuses its playfield instead of its angle slider', () => {
  const h = shellHarness(); h.context.openGameById('gunny-2d');
  const canvas = h.container.querySelector('#gnCanvas');
  assert.ok(h.container.querySelector('input[type="range"]'), 'fixture includes the editable range control');
  assert.equal(h.document.activeElement, canvas, 'Space and arrow gameplay are available immediately');
  h.api.showGameOverlay('help'); h.api.resumeGame();
  assert.equal(h.document.activeElement, canvas);
  h.context.openGameById('typer-shark');
  assert.equal(h.document.activeElement, h.container.querySelector('#tsInput'), 'typing games retain input focus');
});

test('closing a paused game releases shared audio pause before returning to the portal', () => {
  const h = shellHarness();
  const audio = { isPaused: false, setPaused(value) { this.isPaused = value; } };
  h.context.NP_Audio = audio;
  h.context.openGameById('ran-san-moi-snake');
  h.api.showGameOverlay(); assert.equal(audio.isPaused, true);
  h.context.closeGameModal(); assert.equal(audio.isPaused, false);
  h.context.openGameById('pong-1972');
  assert.equal(audio.isPaused, false);
  assert.equal(h.context.NP_GameSession.getCurrent().isPaused(), false);
});

test('shell keyboard capture handles pause once and preserves typing and browser shortcuts', () => {
  const h = shellHarness(); h.context.openGameById('ran-san-moi-snake');
  const canvas = h.container.querySelector('#snkCanvas'), session = h.context.NP_GameSession.getCurrent();
  h.window.dispatch('keydown', { target: canvas, key: 'p' });
  assert.equal(session.isPaused(), true);
  assert.equal(h.container.querySelector('#snkPauseBtn').textContent, 'Tiếp tục', 'native button reflects the shared pause state');
  h.window.dispatch('keydown', { target: canvas, key: 'p', repeat: true });
  assert.equal(session.isPaused(), true);
  h.window.dispatch('keydown', { target: canvas, key: 'Escape' });
  assert.equal(session.isPaused(), false);
  assert.equal(h.container.querySelector('#snkPauseBtn').textContent, 'Tạm dừng', 'global resume clears the mirrored native pause');
  let prevented = false;
  h.window.dispatch('keydown', { target: canvas, key: 'p', ctrlKey: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, false); assert.equal(session.isPaused(), false);
  h.context.openGameById('typer-shark');
  h.window.dispatch('keydown', { target: h.container.querySelector('#tsInput'), key: 'p' });
  assert.equal(h.context.NP_GameSession.getCurrent().isPaused(), false, 'P is a typing letter in an input');
});

test('Tab wraps around visible modal controls and excludes the paused playfield', () => {
  const h = shellHarness(); h.context.openGameById('typer-shark'); h.api.showGameOverlay('help');
  const modal = h.document.querySelector('#gameModal .modal-window');
  const available = modal.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')
    .filter(el => !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden], [inert]') && el.getClientRects().length);
  assert.ok(available.length > 2);
  assert.ok(!available.includes(h.container.querySelector('#tsInput')));
  available[available.length - 1].focus();
  h.window.dispatch('keydown', { target: h.document.activeElement, key: 'Tab' });
  assert.equal(h.document.activeElement, available[0]);
  h.window.dispatch('keydown', { target: h.document.activeElement, key: 'Tab', shiftKey: true });
  assert.equal(h.document.activeElement, available[available.length - 1]);
});

test('background blur and hidden tabs pause once and wait for explicit resume', () => {
  const h = shellHarness(); h.context.openGameById('gunny-2d');
  const session = h.context.NP_GameSession.getCurrent();
  let transitions = 0; session.onPauseChange(() => transitions++);
  h.window.dispatch('keydown', { key: ' ', code: 'Space', target: h.container.querySelector('#gnCanvas') });
  h.window.dispatch('blur');
  assert.equal(session.isPaused(), true); assert.equal(transitions, 1);
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  h.document.hidden = false; h.document.dispatch('visibilitychange'); h.window.dispatch('focus');
  assert.equal(session.isPaused(), true); assert.equal(transitions, 1);
  h.api.resumeGame(); assert.equal(transitions, 2);
  assert.equal(h.errors.length, 0, h.errors.join('; '));
});

test('canvas fitting preserves intrinsic dimensions and the aspect ratio on narrow and short screens', () => {
  const h = shellHarness();
  // A custom rendered playfield exercises both landscape and portrait canvas sizes.
  h.context.NP_Engines.launchTetris = container => {
    h.context.NP_GameSession.start();
    container.innerHTML = '<div id="fitParent"><canvas id="decoration" width="640" height="480" aria-hidden="true"></canvas><canvas id="landscape" width="640" height="480"></canvas><canvas id="portrait" width="240" height="480"></canvas><canvas id="preview" width="80" height="80"></canvas><canvas id="hiddenCanvas" width="640" height="480" style="display:none"></canvas></div>';
    container.querySelector('#fitParent').clientWidth = 300;
  };
  h.container.clientWidth = 320;
  h.context.openGameById('xep-gach-tetris');
  assert.equal(h.document.activeElement, h.container.querySelector('#landscape'));
  assert.equal(h.container.querySelector('#decoration').getAttribute('tabindex'), null);
  for (const height of [900, 360]) {
    h.window.innerHeight = height;
    h.api.fitGameCanvases();
    for (const [id, width, canvasHeight] of [['landscape', 640, 480], ['portrait', 240, 480]]) {
      const canvas = h.container.querySelector('#' + id);
      const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect();
      assert.equal(canvas.style.height, 'auto', 'intrinsic height also respects stylesheet width caps');
      assert.ok(Math.abs(cssWidth / cssHeight - width / canvasHeight) < 0.00001);
      assert.ok(cssWidth <= 300); assert.ok(cssHeight <= Math.max(160, height - 54 - 64 - 126));
      assert.equal(canvas.width, width); assert.equal(canvas.height, canvasHeight);
    }
    assert.equal(h.container.querySelector('#preview').style.width, undefined);
    assert.equal(h.container.querySelector('#hiddenCanvas').style.width, undefined);
    assert.equal(h.container.querySelector('#decoration').style.width, undefined);
  }
  h.context.closeGameModal(); assert.equal(h.observers.size, 0);
});

test('auto-height resize feedback keeps a stable canvas size and coalesces observer work until cleanup', () => {
  const h = shellHarness();
  const controlsHeight = 180;
  let measurements = 0;
  h.window.innerHeight = 760;
  h.context.NP_Engines.launchSnake = container => {
    h.context.NP_GameSession.start();
    container.innerHTML = '<div class="canvas-game-box" id="resizeGameBox"><canvas id="resizeCanvas" width="640" height="480"></canvas></div>';
    const canvas = container.querySelector('#resizeCanvas');
    const gameBox = container.querySelector('#resizeGameBox');
    gameBox.clientWidth = container.clientWidth;
    gameBox.getBoundingClientRect = () => {
      measurements++;
      const rect = canvas.getBoundingClientRect();
      return { ...rect, height: rect.height + controlsHeight };
    };
    container.clientHeight = canvas.height + controlsHeight;
  };
  h.context.openGameById('ran-san-moi-snake');
  const canvas = h.container.querySelector('#resizeCanvas');
  const observer = [...h.observers][0];
  const fittedWidth = canvas.getBoundingClientRect().width;
  assert.ok(fittedWidth > 400, 'the available viewport supports a useful playfield');
  assert.ok(canvas.getBoundingClientRect().height < canvas.height, 'initial fitting actually shrinks the automatic-height modal');
  for (let iteration = 0; iteration < 5; iteration++) {
    // The container follows its newly fitted child, reproducing the browser feedback path.
    h.container.clientHeight = canvas.getBoundingClientRect().height + controlsHeight;
    const before = measurements;
    observer.callback(); observer.callback(); observer.callback();
    assert.equal(measurements, before, 'observer delivery does not synchronously resize its own target');
    assert.equal(h.frames.size, 1, 'an observer burst requests one coalesced native animation frame');
    h.frame(16);
    assert.equal(h.frames.size, 0);
    assert.equal(canvas.getBoundingClientRect().width, fittedWidth, 'automatic container shrink cannot reduce the next height budget');
  }
  observer.callback(); observer.callback();
  assert.equal(h.frames.size, 1);
  h.context.closeGameModal();
  assert.equal(h.frames.size, 0, 'closing cancels an already queued resize frame');
  assert.equal(h.observers.size, 0, 'closing disconnects the observed container');
  h.frame(16);
  assert.equal(h.errors.length, 0, h.errors.join('; '));
});

test('native replay keeps Pong options while persistent Hàng Rong reopen restores saved progress', () => {
  const h = shellHarness(); h.context.openGameById('pong-1972');
  const canvas = h.container.querySelector('#pongCanvas'), session = h.context.NP_GameSession.getCurrent();
  const difficulty = h.container.querySelector('#pongDifficulty');
  difficulty.value = 'hard'; difficulty.dispatch('change', { target: difficulty });
  h.api.showGameOverlay(); h.api.restartGame();
  assert.equal(h.container.querySelector('#pongCanvas'), canvas);
  assert.equal(h.context.NP_GameSession.getCurrent(), session);
  assert.equal(difficulty.value, 'hard');
  h.context.openGameById('hang-rong');
  const original = h.context.NP_GameSession.getCurrent(), originalCanvas = h.container.querySelector('#hrStreetCanvas');
  assert.equal(h.api.currentGuide().persistent, true);
  assert.match(h.document.getElementById('restartGameBtn').title, /giữ tiến trình/);
  h.context.closeGameModal();
  const saved = JSON.parse(h.stored.get('np_hangrong_save_v2'));
  saved.coins = 777; saved.inventory.bread = 33;
  h.stored.set('np_hangrong_save_v2', JSON.stringify(saved));
  h.context.openGameById('hang-rong');
  h.api.showGameOverlay(); h.api.restartGame();
  assert.notEqual(h.context.NP_GameSession.getCurrent(), original);
  assert.notEqual(h.container.querySelector('#hrStreetCanvas'), originalCanvas);
  h.context.closeGameModal();
  const restored = JSON.parse(h.stored.get('np_hangrong_save_v2'));
  assert.equal(restored.coins, 777); assert.equal(restored.inventory.bread, 33);
});

test('blocked browser storage cannot prevent portal initialization, preferences or game controls', () => {
  const h = shellHarness({ blockStorage: true, initialize: false });
  assert.doesNotThrow(() => h.api.initPortal());
  assert.equal(h.api.state().favorites.length, 0);
  assert.doesNotThrow(() => {
    h.document.getElementById('themeToggleBtn').click();
    h.document.getElementById('soundToggleBtn').click();
    h.document.getElementById('crtToggleBtn').click();
    h.api.toggleFavorite('hang-rong');
  });
  h.context.openGameById('hang-rong'); h.api.showGameOverlay('help'); h.api.resumeGame(); h.api.restartGame();
  assert.ok(h.context.NP_GameSession.getCurrent()?.isActive());
  h.context.closeGameModal(); h.flushTimeouts();
  assert.equal(h.errors.length, 0, h.errors.join('; '));
});

test('shared farm reopen preserves planting while its explicit new-game button resets the farm', () => {
  const h = shellHarness();
  h.context.openGameById(games.find(game => game.id.includes('nong-trai')).id);
  let plot = h.container.querySelector('[data-plot-id="0"]');
  plot.click();
  h.container.querySelector('[data-tool="seed"]').click();
  plot = h.container.querySelector('[data-plot-id="0"]'); plot.click();
  assert.equal(h.container.querySelector('#nfCoins').textContent, '145');
  const session = h.context.NP_GameSession.getCurrent();
  h.api.showGameOverlay(); h.api.restartGame();
  assert.notEqual(h.context.NP_GameSession.getCurrent(), session);
  assert.equal(h.container.querySelector('#nfCoins').textContent, '145');
  assert.equal(h.container.querySelector('[data-plot-id="0"]').classList.contains('growing'), true);
  assert.match(h.document.getElementById('restartGameBtn').title, /giữ tiến trình/);
  h.container.querySelector('#nfRestartBtn').click();
  assert.equal(h.container.querySelector('#nfCoins').textContent, '150');
  h.api.restartGame();
  assert.equal(h.container.querySelector('#nfCoins').textContent, '150');
  assert.equal(h.container.querySelector('[data-plot-id="0"]').classList.contains('grass'), true);
  assert.equal(h.errors.length, 0);
});

test('native Pong, DXBall and Typer pause buttons resume through the shell without reviving finished games', () => {
  const cases = [
    { id: 'pong-1972', button: '#pongPause', launcher: 'launchPong', probe: `{
      get: () => ({ paused, progress: serve, over: winner >= 0, score: score.slice() }),
      finish: () => { winner = 0; score = [7, 0]; syncHUD(); }
    }` },
    { id: games.find(game => game.id.includes('dx-ball')).id, button: '#dxPauseBtn', launcher: 'launchDXBall', probe: `{
      get: () => ({ paused, progress: balls[0].x + balls[0].y, over: gameOver, score }),
      finish: () => { gameOver = true; score = 123; updateHUD(); }
    }` },
    { id: 'typer-shark', button: '#tsPause', probe: `{
      get: () => ({ paused: state.paused, progress: state.elapsed, over: state.phase === 'over', score: state.score }),
      finish: () => { state.phase = 'over'; state.score = 123; updateHUD(); }
    }` }
  ];
  for (const item of cases) {
    const h = shellHarness();
    const file = item.launcher ? 'scripts/engines-classics.js' : 'scripts/engines-typer-shark.js';
    const marker = item.launcher ? `  function ${item.launcher}(container, game) {` : '  function launch(container) {';
    vm.runInContext(read(file).replace(marker, marker + '\n    window.__pauseGame = ' + item.probe + ';'), h.context);
    h.context.openGameById(item.id); h.frame(16);
    if (item.launcher === 'launchDXBall') h.window.dispatch('keydown', { target: h.container.querySelector('#dxCanvas'), key: ' ', code: 'Space' });
    h.frame(16);
    const session = h.context.NP_GameSession.getCurrent(), before = h.context.__pauseGame.get().progress;
    h.container.querySelector(item.button).click();
    assert.equal(session.isPaused(), true, item.id + ' native pause uses the shared session');
    assert.equal(h.context.__pauseGame.get().paused, true);
    assert.equal(h.document.getElementById('gameSessionOverlay').hidden, false, item.id + ' native pause displays the shell overlay');
    h.frame(5000); assert.equal(h.context.__pauseGame.get().progress, before);
    h.api.resumeGame();
    assert.equal(h.context.__pauseGame.get().paused, false);
    assert.equal(h.document.getElementById('gameSessionOverlay').hidden, true);
    for (let frame = 0; frame < 20; frame++) h.frame(1000 / 60);
    assert.notEqual(h.context.__pauseGame.get().progress, before, item.id + ' actually progresses after global resume');
    h.context.__pauseGame.finish();
    const terminal = JSON.stringify(h.context.__pauseGame.get().score);
    h.container.querySelector(item.button).click();
    assert.equal(session.isPaused(), false, item.id + ' terminal native control cannot restart the game');
    h.api.showGameOverlay(); h.api.resumeGame(); h.frame(16);
    assert.equal(h.context.__pauseGame.get().over, true);
    assert.equal(JSON.stringify(h.context.__pauseGame.get().score), terminal);
    assert.equal(h.errors.length, 0, item.id + ': ' + h.errors.join('; '));
    h.context.closeGameModal();
  }
});

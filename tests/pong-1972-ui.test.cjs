const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/pong-1972-model.js');

function launch() {
  const h = harness({ loadEngines: false, loadApp: false });
  h.window.NEWPLAYGROUND_MUTED = false;
  if (h.window.NP_Audio) h.window.NP_Audio.isMuted = false;
  h.window.NP_Pong1972Model = M;
  vm.runInContext(read('scripts/games/pong-1972.js'), h.context, { filename: 'scripts/games/pong-1972.js' });
  const sounds = [], audioInits = [];
  const audio = { init: () => audioInits.push(true), playTone: (...args) => sounds.push(args) };
  h.documentListenerBaseline = h.document.listenerCount();
  const session = h.context.NP_GameSession.start();
  h.mountResult = h.window.NP_Pong1972.mount(h.container, session, audio);
  h.session = session; h.sounds = sounds; h.audioInits = audioInits;
  return h;
}

function get(h, id) { return h.container.querySelector('#' + id); }
function close(h) {
  h.mountResult.destroy();
  assertStopped(h);
  assert.equal(h.document.listenerCount(), h.documentListenerBaseline, 'document game listener was released');
  assert.deepEqual(h.errors, []);
}

test('the standalone game view has an original table, score, clear controls, and scoped responsive styles', () => {
  const h = launch();
  for (const id of ['p72Canvas', 'p72LeftScore', 'p72RightScore', 'p72Pause', 'p72Restart', 'p72Sound', 'p72Mode', 'p72Overlay', 'p72Continue']) assert.ok(get(h, id), id);
  assert.equal(h.mountResult.getModel().view().status, 'serve');
  assert.equal(h.mountResult.getModel().view().mode, 'solo');
  assert.equal(get(h, 'p72RightPad').hidden, true);
  assert.equal(get(h, 'p72RightLabel').textContent, 'MÁY');
  assert.equal(h.frames.size, 1);
  const pads = h.container.querySelectorAll('.p72-arrow');
  assert.equal(pads.length, 4);
  assert.ok(read('scripts/games/pong-1972.js').includes('data-side="left"'));
  const css = read('scripts/games/pong-1972.css');
  assert.match(css, /min-height:\s*44px/); assert.match(css, /touch-action:\s*none/);
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /\.p72-game/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.p72-arrow \{ width: 44px; min-width: 44px; \}/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.p72-arrow \{ width: 44px; min-width: 44px; \}/);
  assert.match(read('assets/pong-1972-original.svg'), /Bóng Bàn Cổ Điển/);
  close(h);
});

test('both touch drag lanes and held direction buttons steer the intended paddle', () => {
  const h = launch(), canvas = get(h, 'p72Canvas');
  get(h, 'p72Mode').click(); const model = h.mountResult.getModel(); assert.equal(model.view().mode, 'versus');
  canvas.dispatch('pointerdown', { pointerId: 11, pointerType: 'touch', clientX: 100, clientY: 410, preventDefault() {} });
  canvas.dispatch('pointerdown', { pointerId: 12, pointerType: 'touch', clientX: 700, clientY: 65, preventDefault() {} });
  for (let i = 0; i < 28; i += 1) h.frame();
  assert.ok(model.view().paddles.left.y > M.HEIGHT / 2);
  assert.ok(model.view().paddles.right.y < M.HEIGHT / 2);
  h.window.dispatch('pointerup', { pointerId: 11 }); h.window.dispatch('pointerup', { pointerId: 12 });
  assert.equal(model.view().paddles.left.targetY, null); assert.equal(model.view().paddles.right.targetY, null);

  const [leftUp, leftDown, rightUp] = h.container.querySelectorAll('.p72-arrow');
  const leftY = model.view().paddles.left.y, rightY = model.view().paddles.right.y;
  leftDown.dispatch('pointerdown', { pointerId: 21, preventDefault() {} });
  rightUp.dispatch('pointerdown', { pointerId: 22, preventDefault() {} });
  for (let i = 0; i < 10; i += 1) h.frame();
  assert.ok(model.view().paddles.left.y > leftY);
  assert.ok(model.view().paddles.right.y < rightY);
  h.window.dispatch('pointerup', { pointerId: 21 }); h.window.dispatch('pointerup', { pointerId: 22 });
  leftUp.dispatch('pointerdown', { pointerId: 23, preventDefault() {} });
  h.frame(); h.window.dispatch('pointerup', { pointerId: 23 });
  assert.equal(model.view().paddles.left.axis, 0);
  close(h);
});

test('W/S and arrow keys control separate paddles; pause, resume, and restart reset the right state', () => {
  const h = launch(), canvas = get(h, 'p72Canvas');
  get(h, 'p72Mode').click(); const model = h.mountResult.getModel(); assert.equal(model.view().mode, 'versus');
  const leftStart = model.view().paddles.left.y, rightStart = model.view().paddles.right.y;
  h.container.dispatch('keydown', { key: 'w', target: canvas });
  h.container.dispatch('keydown', { key: 'ArrowDown', target: canvas });
  for (let i = 0; i < 12; i += 1) h.frame();
  assert.ok(model.view().paddles.left.y < leftStart);
  assert.ok(model.view().paddles.right.y > rightStart);
  h.container.dispatch('keyup', { key: 'w', target: canvas });
  h.container.dispatch('keyup', { key: 'ArrowDown', target: canvas });

  get(h, 'p72Pause').click();
  assert.equal(model.view().status, 'paused'); assert.equal(h.frames.size, 0); assert.equal(get(h, 'p72Overlay').hidden, false);
  get(h, 'p72Continue').click();
  assert.notEqual(model.view().status, 'paused'); assert.equal(h.frames.size, 1);
  get(h, 'p72Restart').click();
  assert.equal(model.view().status, 'serve'); assert.deepEqual(model.view().score, { left: 0, right: 0 });
  assert.equal(h.frames.size, 1);
  get(h, 'p72Sound').click(); assert.equal(get(h, 'p72Sound').getAttribute('aria-pressed'), 'true');
  close(h);
});

test('serve sound unlocks from a gesture; closing and reopening releases the old frame and listeners', () => {
  const h = launch(), canvas = get(h, 'p72Canvas');
  canvas.dispatch('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 200, button: 0 });
  h.window.dispatch('pointerup', { pointerId: 1 });
  for (let i = 0; i < 45; i += 1) h.frame();
  assert.ok(h.audioInits.length >= 1);
  assert.ok(h.sounds.some(args => args[0] === 505), 'the local serve tone plays through the injected audio adapter');
  close(h);

  const secondSession = h.context.NP_GameSession.start();
  h.mountResult = h.window.NP_Pong1972.mount(h.container, secondSession, null);
  assert.equal(h.frames.size, 1);
  h.mountResult.destroy(); assertStopped(h);
  assert.equal(h.document.listenerCount(), h.documentListenerBaseline); assert.deepEqual(h.errors, []);
});

test('exact catalog route opens the original solo-first table and cover',()=>{const h=harness();assert.equal(h.context.openGameById('pong-1972'),true);assert.ok(h.container.querySelector('#p72Canvas'));assert.match(read('app.js'),/'pong-1972': 'assets\/pong-1972-original\.svg'/);assert.doesNotMatch(h.container.innerHTML.replace(/<link\b[^>]*>/gi,''),/Atari|Magnavox|Pong/i);h.context.closeGameModal();assert.equal(h.frames.size,0);assert.equal(h.window.listenerCount(),0);assert.deepEqual(h.errors,[]);});

test('solo is the immediate default and the mode button starts a clean local two-player round',()=>{const h=launch(),game=()=>h.mountResult.getModel();assert.equal(game().view().mode,'solo');assert.equal(get(h,'p72RightPad').hidden,true);assert.equal(get(h,'p72RightLabel').textContent,'MÁY');get(h,'p72Mode').click();assert.equal(game().view().mode,'versus');assert.equal(get(h,'p72RightPad').hidden,false);assert.equal(get(h,'p72RightLabel').textContent,'PHẢI');get(h,'p72Mode').click();assert.equal(game().view().mode,'solo');assert.deepEqual(game().view().score,{left:0,right:0});close(h);});

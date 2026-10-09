const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/khoi-sac-model.js');

const el = (h, id) => h.container.querySelector('#' + id);

function setup(options = {}) {
  const h = harness({ loadEngines: false, loadApp: false });
  const baselineDocumentListeners = h.document.listenerCount();
  vm.runInContext(read('scripts/games/khoi-sac-model.js'), h.context);
  vm.runInContext(read('scripts/games/khoi-sac.js'), h.context);
  h.game = h.context.NP_KhoiSac.mount(h.container, h.context.NP_GameSession.start(), options);
  h.close = () => {
    h.context.NP_GameSession.stop();
    assertStopped(h);
    assert.equal(h.document.listenerCount(), baselineDocumentListeners, 'game document listeners removed');
    assert.deepEqual(h.errors, []);
  };
  return h;
}

function parse(token) {
  const match = /^([UDFBRL])([2']?)$/.exec(token);
  assert.ok(match);
  return { face: match[1], turns: match[2] === "'" ? -1 : match[2] === '2' ? 2 : 1 };
}

function tapTurn(h, move) {
  const face = typeof move === 'string' ? parse(move).face : move.face;
  const turns = typeof move === 'string' ? parse(move).turns : move.turns;
  el(h, `ks-${face.toLowerCase()}-${turns === -1 ? 'ccw' : 'cw'}`).click();
}

function solveVisibleStage(h) {
  const model = h.game.getModel(), before = model.view();
  const moves = model.scramble().slice().reverse().map(move => ({ face: move.face, turns: -move.turns }))
    .concat(M.STAGES[before.stageIndex].targetSequence);
  for (const move of moves) {
    if (model.view().stageIndex !== before.stageIndex || model.view().status !== 'playing') break;
    tapTurn(h, move);
  }
  assert.ok(model.view().stageIndex > before.stageIndex || model.view().status === 'won');
}

test('mount shows the original motif objective, six color-marked face windows and twelve touch turns', () => {
  const h = setup();
  assert.match(h.container.innerHTML, /Khối Sắc/);
  assert.doesNotMatch(h.container.innerHTML, /Rubik/i);
  assert.equal(h.container.querySelectorAll('.ks-face-panel').length, 6);
  assert.equal(h.container.querySelectorAll('.ks-turn').length, 12);
  assert.equal(h.container.querySelectorAll('.ks-goal-face').length, 1);
  assert.equal(el(h, 'ksStage').textContent, 'Mẫu 1 / 3');
  assert.equal(el(h, 'ksMoves').textContent, '0 / 10 lượt');
  assert.equal(el(h, 'ksGoalName').textContent, 'Đốm Sáng');
  assert.equal(el(h, 'ksOverlay').hidden, true);
  assert.equal(el(h, 'ksPause').textContent, '||', 'pause icon uses a visible two-bar fallback');
  const css = read('scripts/games/khoi-sac.css');
  assert.match(css, /\.ks-turn\s*\{[^}]*min-height:\s*46px/s);
  assert.match(css, /\.ks-icon\s*\{[^}]*min-width:\s*48px/s);
  h.close();
});

test('touch face buttons and focused keyboard turns update the model; Shift reverses a turn', () => {
  const h = setup(), model = h.game.getModel();
  const original = JSON.stringify(model.view().faces);
  el(h, 'ks-r-cw').click();
  assert.equal(model.view().stageMoves, 1);
  assert.equal(model.view().lastMove.face, 'R');
  assert.notEqual(JSON.stringify(model.view().faces), original);
  const game = h.container.querySelector('.ks-game');
  game.dispatch('keydown', { key: 'r', repeat: false, shiftKey: true, preventDefault() {} });
  assert.equal(model.view().stageMoves, 2);
  assert.equal(JSON.stringify(model.view().faces), original);
  h.close();
});

test('keyboard pause, touch resume, hidden-page pause and restart preserve lifecycle state', () => {
  const h = setup({ campaignTimeMs: 5000 }), model = h.game.getModel();
  const game = h.container.querySelector('.ks-game');
  game.dispatch('keydown', { key: 'p', repeat: false, preventDefault() {} });
  assert.equal(model.view().status, 'paused');
  assert.equal(h.frames.size, 0);
  const timeLeft = model.view().timeLeft;
  assert.equal(model.advance(2000), false);
  assert.equal(model.view().timeLeft, timeLeft);
  el(h, 'ksOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(h.frames.size, 1);
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false;
  h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  el(h, 'ksRestart').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().stage, 1);
  assert.equal(model.view().timeLeft, 5000);
  h.close();
});

test('the touch controls can finish all three distinct motif stages and reach the replay overlay', () => {
  const h = setup({ seed: 'campaign-check' }), model = h.game.getModel();
  solveVisibleStage(h);
  assert.equal(model.view().stage, 2);
  assert.equal(el(h, 'ksGoalName').textContent, 'Cầu Sáng');
  assert.equal(h.container.querySelectorAll('.ks-goal-face').length, 2);
  solveVisibleStage(h);
  assert.equal(model.view().stage, 3);
  assert.equal(el(h, 'ksGoalName').textContent, 'Vệt Quỹ Đạo');
  assert.equal(h.container.querySelectorAll('.ks-goal-face').length, 3);
  solveVisibleStage(h);
  assert.equal(model.view().status, 'won');
  assert.equal(el(h, 'ksOverlay').hidden, false);
  assert.equal(el(h, 'ksOverlayTitle').textContent, 'Ba mẫu đã ghép');
  assert.equal(el(h, 'ksOverlayAction').textContent, 'Chơi lại');
  assert.equal(el(h, 'ks-u-cw').disabled, true);
  el(h, 'ksOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().stage, 1);
  h.close();
});

test('campaign clock timeout and per-pattern move exhaustion both show a replayable loss', () => {
  const timeout = setup({ seed: 'timer', campaignTimeMs: 500 });
  timeout.frame();
  timeout.advance(250);
  timeout.frame();
  timeout.advance(250);
  timeout.frame();
  assert.equal(timeout.game.getModel().view().status, 'lost');
  assert.equal(el(timeout, 'ksOverlayTitle').textContent, 'Hết thời gian');
  el(timeout, 'ksOverlayAction').click();
  assert.equal(timeout.game.getModel().view().status, 'playing');
  timeout.close();

  const moves = setup({ seed: 'move-cap' });
  for (let i = 0; i < 10 && moves.game.getModel().view().status === 'playing'; i++) {
    tapTurn(moves, { face: M.FACES[i % 6], turns: i % 2 ? -1 : 1 });
  }
  assert.equal(moves.game.getModel().view().status, 'lost');
  assert.equal(moves.game.getModel().view().lastEvent, 'moves');
  assert.equal(el(moves, 'ksOverlayTitle').textContent, 'Hết lượt');
  moves.close();
});

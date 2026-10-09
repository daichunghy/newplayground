const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');
const M = require('../scripts/games/ke-sach-ky-uc-model.js');

const el = (h, id) => h.container.querySelector('#' + id);
function launch(seed = 313) {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/ke-sach-ky-uc-model.js'), h.context, { filename: 'scripts/games/ke-sach-ky-uc-model.js' });
  vm.runInContext(read('scripts/games/ke-sach-ky-uc.js'), h.context, { filename: 'scripts/games/ke-sach-ky-uc.js' });
  const session = h.context.NP_GameSession.start();
  h.mountResult = h.context.NP_KeSachKyUc.mount(h.container, session, { seed });
  return h;
}
function click(h, id) { el(h, id).dispatch('click', { detail: 1 }); }
function bookButton(h, id) { return h.container.querySelectorAll('.ksku-book').find(button => button.dataset.bookId === id); }
function clickBook(h, id) {
  const button = bookButton(h, id);
  assert.ok(button, `visible book button ${id}`);
  el(h, 'kskuShelf').dispatch('click', { target: button });
}
function solveWithControls(h, answer) {
  const model = h.mountResult.getModel();
  const assertClues = () => assert.deepEqual(
    Array.from(el(h, 'kskuClueList').querySelectorAll('li')).map(item => item.dataset.satisfied === 'true'),
    Array.from(model.view().clues, clue => clue.satisfied)
  );
  assertClues();
  for (let target = 0; target < answer.length; target++) {
    let view = model.view();
    while (view.order.indexOf(answer[target]) > target) {
      if (!h.mountResult.isSelected(answer[target])) clickBook(h, answer[target]);
      click(h, 'kskuLeft');
      view = model.view();
      assertClues();
    }
  }
  return model.view();
}
function close(h) {
  h.context.NP_GameSession.stop();
  assertStopped(h);
  assert.deepEqual(h.errors, []);
}

test('the game opens directly with fictional books, short clues, budget, replay, and 44px touch controls', () => {
  const h = launch();
  const view = h.mountResult.getModel().view();
  assert.equal(view.stageNumber, 1);
  assert.equal(h.container.querySelectorAll('.ksku-book').length, 5);
  assert.ok(el(h, 'kskuClueList').innerHTML.includes('Mây'));
  assert.equal(el(h, 'kskuClueList').querySelectorAll('.ksku-clue-state').length, view.clues.length);
  assert.deepEqual(
    Array.from(el(h, 'kskuClueList').querySelectorAll('li')).map(item => item.dataset.satisfied === 'true'),
    Array.from(view.clues, clue => clue.satisfied)
  );
  for (const id of ['kskuPause', 'kskuReplay', 'kskuLeft', 'kskuRight', 'kskuOverlay', 'kskuStatus']) assert.ok(el(h, id), id);
  const css = read('scripts/games/ke-sach-ky-uc.css');
  assert.match(css, /min-width: 48px/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /grid-template-columns: repeat\(4/);
  close(h);
});

test('tap selection and arrows slide books one place; arrow keys shift the selected book', () => {
  const h = launch(411), model = h.mountResult.getModel(), initial = model.view();
  const first = initial.order[0], before = initial.order.slice();
  clickBook(h, first);
  assert.equal(h.mountResult.isSelected(first), true);
  click(h, 'kskuRight');
  assert.deepEqual(Array.from(model.view().order.slice(0, 2)), [before[1], first]);
  const moves = model.view().moves;
  h.container.dispatch('keydown', { target: bookButton(h, first), key: 'ArrowLeft' });
  assert.equal(model.view().moves, moves + 1);
  assert.deepEqual(Array.from(model.view().order.slice(0, 2)), Array.from(before.slice(0, 2)));
  close(h);
});

test('Enter selects a focused book; P, pause control, and hidden-page changes pause and resume cleanly', () => {
  const h = launch(722), model = h.mountResult.getModel(), id = model.view().order[1];
  h.container.dispatch('keydown', { target: bookButton(h, id), key: 'Enter' });
  assert.equal(h.mountResult.isSelected(id), true);
  h.container.dispatch('keydown', { target: bookButton(h, id), key: 'p' });
  assert.equal(model.view().status, 'paused');
  assert.equal(el(h, 'kskuOverlay').hidden, false);
  click(h, 'kskuContinue');
  assert.equal(model.view().status, 'playing');
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false; click(h, 'kskuPause');
  assert.equal(model.view().status, 'playing');
  assert.equal(model.move(id, 1).accepted, true);
  close(h);
});

test('all three authored boards can be completed through visible controls and campaign ends in a replayable win', () => {
  const h = launch(985), model = h.mountResult.getModel();
  for (let index = 0; index < M.STAGES.length; index++) {
    const result = solveWithControls(h, M.STAGES[index].answer);
    assert.ok(['stage-clear', 'won'].includes(result.status));
    if (index < M.STAGES.length - 1) {
      assert.equal(el(h, 'kskuOverlay').hidden, false);
      click(h, 'kskuNext');
      assert.equal(model.view().stageIndex, index + 1);
      assert.equal(model.view().status, 'playing');
    }
  }
  assert.equal(model.view().status, 'won');
  assert.match(el(h, 'kskuOverlayTitle').textContent, /vào nếp/);
  const start = model.view().order;
  click(h, 'kskuReplayEnd');
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().stageIndex, 0);
  assert.equal(model.view().moves, 0);
  assert.deepEqual(Array.from(model.view().order), Array.from(M.create({ seed: 985 }).view().order));
  assert.notDeepEqual(start, model.view().order);
  close(h);
});

test('move exhaustion displays a replayable loss; the header restart restores the same board', () => {
  const h = launch(91), model = h.mountResult.getModel(), start = model.view();
  let pair;
  for (let index = 0; index < start.order.length - 1; index++) {
    const order = start.order.slice(); [order[index], order[index + 1]] = [order[index + 1], order[index]];
    if (!M.satisfiesClues(M.STAGES[start.stageIndex], order)) { pair = [start.order[index], start.order[index + 1]]; break; }
  }
  assert.ok(pair);
  clickBook(h, pair[0]);
  for (let count = 0; count < start.budget; count++) click(h, count % 2 === 0 ? 'kskuRight' : 'kskuLeft');
  assert.equal(model.view().status, 'lost');
  assert.match(el(h, 'kskuOverlayTitle').textContent, /Hết lượt/);
  click(h, 'kskuReplayEnd');
  assert.equal(model.view().status, 'playing');
  assert.deepEqual(Array.from(model.view().order), Array.from(start.order));
  click(h, 'kskuReplay');
  assert.deepEqual(Array.from(model.view().order), Array.from(start.order));
  close(h);
});

test('NP_GameSession cleanup removes the board and every owned listener', () => {
  const h = launch();
  assert.ok(h.container.querySelectorAll('.ksku-book').length);
  close(h);
  assert.equal(h.container.innerHTML, '');
  assert.equal(h.container.classList.contains('ksku-host'), false);
});

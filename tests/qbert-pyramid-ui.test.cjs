const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, assertStopped, read } = require('./support/browser-harness.cjs');

function setup(seed = 1) {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/qbert-pyramid-model.js'), h.context, { filename: 'qbert-pyramid-model.js' });
  vm.runInContext(read('scripts/games/qbert-pyramid.js'), h.context, { filename: 'qbert-pyramid.js' });
  h.game = h.context.NP_QbertPyramid.mount(h.container, h.context.NP_GameSession.start(), { seed });
  h.close = () => { h.context.NP_GameSession.stop(); assertStopped(h); assert.deepEqual(h.errors, []); };
  return h;
}

function shortestPath(modelView, goal) {
  const q = [{ row: modelView.player.row, col: modelView.player.col, path: [] }];
  const seen = new Set([`${modelView.player.row},${modelView.player.col}`]);
  const directions = { upLeft: [-1, -1], upRight: [-1, 0], downLeft: [1, 0], downRight: [1, 1] };
  for (let i = 0; i < q.length; i++) {
    const current = q[i];
    if (current.row === goal.row && current.col === goal.col) return current.path;
    for (const [direction, [dr, dc]] of Object.entries(directions)) {
      const row = current.row + dr, col = current.col + dc;
      if (row < 0 || row > 6 || col < 0 || col > row) continue;
      const key = `${row},${col}`;
      if (seen.has(key)) continue;
      seen.add(key); q.push({ row, col, path: [...current.path, direction] });
    }
  }
  return null;
}

function nextUnlitMove(model) {
  const view = model.view();
  let best = null;
  for (const tile of view.tiles) {
    if (tile.visited) continue;
    const path = shortestPath(view, tile);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best?.[0] || null;
}

test('mounts 28 labeled pyramid cells, a score HUD, and four 48px touch directions', () => {
  const h = setup();
  assert.match(h.container.innerHTML, /Nhảy Bậc Kim Tự Tháp/);
  assert.equal(h.container.querySelectorAll('.qbp-tile').length, 28);
  assert.equal(h.container.querySelectorAll('.qbp-control').length, 4);
  assert.equal(h.container.querySelector('#qbpLevel').textContent, '1 / 3');
  assert.equal(h.container.querySelector('#qbpGoals').textContent, '1 / 28');
  assert.equal(h.container.querySelector('#qbpScore').textContent, '100');
  assert.match(h.container.querySelector('#qbpDownLeft').getAttribute('aria-label'), /phím Z/);
  assert.match(read('scripts/games/qbert-pyramid.css'), /\.qbp-button\s*\{[^}]*min-width:\s*48px[^}]*min-height:\s*48px/s);
  h.close();
});

test('touch controls and diagonal keyboard keys update position, color, and score', () => {
  const h = setup(), model = h.game.getModel();
  h.container.querySelector('#qbpDownLeft').click();
  assert.equal(model.view().player.id, '1,0');
  assert.equal(h.container.querySelector('#qbpGoals').textContent, '2 / 28');
  assert.equal(h.container.querySelector('#qbpScore').textContent, '210');
  const lit = h.container.querySelectorAll('.qbp-tile').find(tile => tile.dataset.tile === '1,0');
  assert.equal(lit.dataset.visited, 'true');
  h.window.dispatch('keydown', { key: 'c', target: h.container.querySelector('#qbpDownRight') });
  assert.equal(model.view().player.id, '2,1');
  assert.equal(model.view().goalsFound, 3);
  h.close();
});

test('pause, visibility and pagehide stop turns until explicit resume; restart resets the board', () => {
  const h = setup(), model = h.game.getModel();
  const originalTime = model.view().timeLeft;
  h.container.querySelector('#qbpPause').click();
  assert.equal(model.view().status, 'paused');
  h.tickIntervals();
  assert.equal(model.view().timeLeft, originalTime);
  h.container.querySelector('#qbpOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(model.view().status, 'paused');
  h.document.hidden = false; h.container.querySelector('#qbpOverlayAction').click();
  h.window.dispatch('pagehide');
  assert.equal(model.view().status, 'paused');
  h.container.querySelector('#qbpOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  h.container.querySelector('#qbpDownRight').click();
  h.container.querySelector('#qbpRestart').click();
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().player.id, '0,0');
  assert.equal(model.view().goalsFound, 1);
  assert.equal(model.view().score, 100);
  h.close();
});

test('three-level touch play reaches the actual win overlay; session cleanup removes listeners and timers', () => {
  const h = setup(1), model = h.game.getModel();
  const controlIds = { upLeft: 'qbpUpLeft', upRight: 'qbpUpRight', downLeft: 'qbpDownLeft', downRight: 'qbpDownRight' };
  for (let turn = 0; turn < 500 && model.view().status === 'playing'; turn++) {
    const direction = nextUnlitMove(model);
    if (!direction) break;
    h.container.querySelector('#' + controlIds[direction]).click();
  }
  assert.equal(model.view().status, 'won');
  assert.equal(model.view().levelNumber, 3);
  assert.equal(model.view().goalsFound, 28);
  assert.equal(h.container.querySelector('#qbpOverlay').hidden, false);
  assert.equal(h.container.querySelector('#qbpOverlayTitle').textContent, 'Cả kim tự tháp đã sáng!');
  assert.match(h.container.querySelector('#qbpOverlayCopy').textContent, /điểm/);
  h.close();
});

test('terminal timer and life loss show retry states; direct destroy is idempotent', () => {
  const h = setup(), model = h.game.getModel();
  model.advance(h.context.NP_QbertPyramidModel.CAMPAIGN_TIME_MS);
  h.tickIntervals();
  assert.equal(model.view().status, 'lost');
  assert.equal(h.container.querySelector('#qbpOverlayTitle').textContent, 'Hết giờ');
  h.container.querySelector('#qbpOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  for (let count = 0; count < h.context.NP_QbertPyramidModel.MAX_LIVES; count++) h.container.querySelector('#qbpUpLeft').click();
  assert.equal(model.view().status, 'lost');
  assert.equal(h.container.querySelector('#qbpOverlayTitle').textContent, 'Hết lượt sống');
  h.container.querySelector('#qbpOverlayAction').click();
  assert.equal(model.view().status, 'playing');
  h.game.destroy(); h.game.destroy();
  h.context.NP_GameSession.stop();
  assert.equal(h.container.children.length, 0);
  assert.equal(h.window.listenerCount(), 0);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.errors, []);
});

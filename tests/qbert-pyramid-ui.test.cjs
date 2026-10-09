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

test('mounts original Sắc Bậc identity, 28 labeled cells, and four 48px touch directions', () => {
  const h = setup();
  assert.match(h.container.innerHTML, /Sắc Bậc/);
  assert.doesNotMatch(h.container.innerHTML, /Nhảy Bậc Kim Tự Tháp|Q\*bert|Om Nom|Space Cadet|Typer Shark/i);
  assert.equal(h.container.querySelectorAll('.qbp-tile').length, 28);
  assert.equal(h.container.querySelectorAll('.qbp-control').length, 4);
  assert.equal(h.container.querySelector('#qbpLevel').textContent, '1 / 3');
  assert.equal(h.container.querySelector('#qbpGoals').textContent, '1 / 28');
  assert.equal(h.container.querySelector('#qbpScore').textContent, '100');
  assert.match(h.container.querySelector('#qbpDownLeft').getAttribute('aria-label'), /phím Z/);
  assert.match(read('scripts/games/qbert-pyramid.css'), /\.qbp-button\s*\{[^}]*min-width:\s*48px[^}]*min-height:\s*48px/s);
  assert.match(read('scripts/games/qbert-pyramid.css'), /\.qbp-player\s*\{[^}]*clip-path:/s, 'the hero is a faceted prism');
  assert.doesNotMatch(read('scripts/games/qbert-pyramid.css'), /box-shadow:\s*7px\s+0/, 'paired-eye styling is gone');
  const cover = read('assets/covers/qbert-pyramid-original.svg');
  assert.match(cover, /<title[^>]*>Sắc Bậc/);
  assert.match(cover, /M0 -34 26 -19/);
  assert.doesNotMatch(cover, /cx="-8"|Q\*bert|Om Nom|Space Cadet|Typer Shark/i);
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

test('arrow keys match all four diagonal directions and ignore key repeat', () => {
  const h = setup(1), model = h.game.getModel();
  const press = key => h.window.dispatch('keydown', { key, target: h.container });
  h.container.querySelector('#qbpDownRight').click(); // 1,1
  h.container.querySelector('#qbpDownLeft').click(); // 2,1
  press('ArrowUp');
  assert.equal(model.view().player.id, '1,0');
  press('ArrowDown');
  assert.equal(model.view().player.id, '0,0');
  press('ArrowLeft');
  assert.equal(model.view().player.id, '1,0');
  press('ArrowRight');
  assert.equal(model.view().player.id, '2,1');
  const snapshot = model.view();
  h.window.dispatch('keydown', { key: 'ArrowLeft', repeat: true, target: h.container });
  assert.deepEqual(model.view(), snapshot);
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
  assert.equal(h.container.querySelector('#qbpPause').focused, true, 'focus returns to the pause control after resume');
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

test('six patrol collisions show the terminal state and block touch and keyboard moves', () => {
  const h = setup(1), model = h.game.getModel();
  for (let hit = 1; hit <= h.context.NP_QbertPyramidModel.MAX_LIVES; hit++) {
    h.container.querySelector('#qbpDownLeft').click(); // first step also consumes respawn grace after a hit
    h.container.querySelector('#qbpDownLeft').click();
    h.container.querySelector('#qbpDownRight').click();
  }
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().lossReason, 'enemy');
  assert.equal(h.container.querySelector('#qbpOverlayTitle').textContent, 'Hết lượt sống');
  assert.equal(h.container.querySelector('#qbpDownLeft').disabled, true);
  const ended = model.view();
  h.window.dispatch('keydown', { key: 'c', target: h.container });
  assert.deepEqual(model.view(), ended);
  h.close();
});

test('the final-tile patrol hit explains why one safe hop is still needed to clear the level', () => {
  const h = setup(123), model = h.game.getModel();
  const buttons = { upLeft: 'qbpUpLeft', upRight: 'qbpUpRight', downLeft: 'qbpDownLeft', downRight: 'qbpDownRight' };
  const path = [
    'downLeft', 'downRight', 'upRight', 'downRight', 'downRight', 'downRight', 'downRight', 'downRight',
    'upLeft', 'downLeft', 'upLeft', 'downLeft', 'upLeft', 'upLeft', 'upRight', 'downRight', 'downLeft',
    'downLeft', 'upLeft', 'downLeft', 'downLeft', 'downLeft', 'downLeft', 'downLeft', 'downLeft', 'upRight',
    'downRight', 'upRight', 'downRight', 'upLeft', 'upRight'
  ];
  for (const direction of path) {
    h.container.querySelector('#' + buttons[direction]).click();
    assert.equal(model.view().status, 'playing');
  }
  assert.equal(model.view().goalsFound, 27);
  h.container.querySelector('#' + buttons.upRight).click();
  assert.equal(model.view().goalsFound, 28);
  assert.equal(model.view().levelNumber, 1);
  assert.match(h.container.querySelector('#qbpStatus').textContent, /Nhảy an toàn để sang tầng/);
  assert.equal(h.container.querySelector('#qbpOverlay').hidden, true);
  h.close();
});

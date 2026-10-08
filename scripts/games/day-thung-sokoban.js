/* DOM-first view for the original Đẩy Thùng candidate. Load its model first. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_DayThungSokoban = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const KEY_DIRECTIONS = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left'
  };

  function mount(container, options = {}) {
    const modelApi = options.modelApi || window.NP_DayThungSokobanModel;
    if (!container || !modelApi) throw new TypeError('Đẩy Thùng needs a container and its model');
    const model = options.model || modelApi.create();
    if (!model || typeof model.view !== 'function' || typeof model.move !== 'function') {
      throw new TypeError('Đẩy Thùng needs a working puzzle model');
    }

    const session = options.session || window.NP_GameSession?.start?.() || null;
    let destroyed = false;
    let pointerStart = null;
    let suppressBoardClickUntil = 0;
    let notice = '';
    const bindings = [];
    container.innerHTML = `
      <section class="np-soko" aria-label="Đẩy Thùng Sokoban">
        <header class="np-soko-header">
          <div class="np-soko-mark" aria-hidden="true"><span></span></div>
          <div><h2 class="np-soko-title">Đẩy Thùng</h2><p class="np-soko-stage"></p></div>
          <p class="np-soko-counter"></p>
        </header>
        <p class="np-soko-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="np-soko-board" role="grid" tabindex="0" aria-label="Bàn kho. Dùng phím mũi tên hoặc WASD để đi; nhấn Z để hoàn tác, R để chơi lại."></div>
        <div class="np-soko-controls" aria-label="Điều khiển">
          <div class="np-soko-actions">
            <button class="np-soko-action np-soko-undo" type="button" aria-label="Hoàn tác nước đi">Hoàn tác</button>
            <button class="np-soko-action np-soko-reset" type="button">Chơi lại</button>
            <button class="np-soko-action np-soko-next" type="button" hidden>Màn tiếp</button>
          </div>
          <div class="np-soko-pad" role="group" aria-label="Nút di chuyển">
            <button class="np-soko-arrow is-up" data-direction="up" type="button" aria-label="Đi lên">↑</button>
            <button class="np-soko-arrow is-left" data-direction="left" type="button" aria-label="Đi sang trái">←</button>
            <button class="np-soko-arrow is-down" data-direction="down" type="button" aria-label="Đi xuống">↓</button>
            <button class="np-soko-arrow is-right" data-direction="right" type="button" aria-label="Đi sang phải">→</button>
          </div>
        </div>
        <p class="np-soko-help">Mũi tên / WASD · Vuốt hoặc chạm nút hướng · Z hoàn tác · R chơi lại</p>
      </section>`;

    const board = container.querySelector('.np-soko-board');
    const stage = container.querySelector('.np-soko-stage');
    const counter = container.querySelector('.np-soko-counter');
    const status = container.querySelector('.np-soko-status');
    const undoButton = container.querySelector('.np-soko-undo');
    const resetButton = container.querySelector('.np-soko-reset');
    const nextButton = container.querySelector('.np-soko-next');

    function listen(target, type, handler, options) {
      target?.addEventListener?.(type, handler, options);
      if (target?.removeEventListener) bindings.push({ target, type, handler, options });
    }

    function pointKey(point) { return `${point.x},${point.y}`; }

    function render() {
      if (destroyed) return;
      const view = model.view();
      const goalSet = new Set(view.goals.map(pointKey));
      const boxSet = new Set(view.boxes.map(pointKey));
      const wallSet = new Set(view.walls);
      stage.textContent = `Màn ${view.levelIndex + 1}/${modelApi.LEVELS.length} · ${view.levelName}`;
      counter.textContent = `${view.moves} bước · ${view.pushes} lần đẩy`;
      if (view.status === 'won') {
        status.textContent = view.levelIndex + 1 === modelApi.LEVELS.length
          ? 'Xong cả kho! Bạn đã đưa mọi thùng vào đích.'
          : `Màn ${view.levelIndex + 1} hoàn thành. Mọi thùng đã vào đích.`;
      } else {
        status.textContent = notice || `Còn ${view.boxes.length} thùng. Đẩy từng thùng vào ô đích.`;
      }
      undoButton.disabled = view.moves === 0;
      nextButton.hidden = view.status !== 'won';
      nextButton.textContent = view.levelIndex + 1 === modelApi.LEVELS.length ? 'Chơi lại từ đầu' : 'Màn tiếp';

      board.style.gridTemplateColumns = `repeat(${view.width}, minmax(0, 1fr))`;
      board.setAttribute('aria-label', `Màn ${view.levelIndex + 1}: ${view.levelName}. Bàn ${view.width} cột, ${view.height} hàng.`);
      let markup = '';
      for (let y = 0; y < view.height; y += 1) {
        for (let x = 0; x < view.width; x += 1) {
          const point = { x, y }, cellKey = pointKey(point);
          const isWall = wallSet.has(cellKey), isGoal = goalSet.has(cellKey);
          const isBox = boxSet.has(cellKey), isPlayer = view.player.x === x && view.player.y === y;
          const classes = ['np-soko-cell', isWall ? 'is-wall' : 'is-floor'];
          if (isGoal) classes.push('has-goal');
          if (isBox) classes.push('has-box');
          if (isBox && isGoal) classes.push('box-on-goal');
          if (isPlayer) classes.push('has-player');
          const label = isWall ? 'Tường' : isPlayer ? `Người chơi${isGoal ? ', đang ở ô đích' : ''}` :
            isBox ? `Thùng${isGoal ? ' trên ô đích' : ''}` : isGoal ? 'Ô đích' : 'Lối đi';
          const inner = isWall ? '' : `${isGoal ? '<span class="np-soko-goal" aria-hidden="true"></span>' : ''}${isBox ? '<span class="np-soko-box" aria-hidden="true"></span>' : ''}${isPlayer ? '<span class="np-soko-player" aria-hidden="true"></span>' : ''}`;
          markup += `<div class="${classes.join(' ')}" data-cell="true" data-x="${x}" data-y="${y}" role="gridcell" aria-label="Hàng ${y + 1}, cột ${x + 1}: ${label}">${inner}</div>`;
        }
      }
      board.innerHTML = markup;
    }

    function takeStep(direction) {
      if (destroyed) return false;
      notice = '';
      const changed = model.move(direction);
      if (!changed) {
        notice = 'Đường bị chặn.';
        render();
        return false;
      }
      render();
      return true;
    }

    function onBoardClick(event) {
      if (Date.now() < suppressBoardClickUntil) return;
      const cell = event.target?.closest?.('[data-cell]');
      if (!cell) return;
      const view = model.view();
      const dx = Number(cell.dataset.x) - view.player.x;
      const dy = Number(cell.dataset.y) - view.player.y;
      if (dx === 0 && dy === 0) return;
      takeStep(Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
    }

    function onKeydown(event) {
      const direction = KEY_DIRECTIONS[event.key];
      if (direction) {
        event.preventDefault?.();
        takeStep(direction);
      } else if (event.key === 'z' || event.key === 'Z' || event.key === 'Backspace') {
        event.preventDefault?.();
        if (model.undo()) { notice = ''; render(); }
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault?.();
        model.reset(); notice = ''; render();
      }
    }

    function onPointerDown(event) {
      if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      suppressBoardClickUntil = 0;
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }

    function onPointerUp(event) {
      if (!pointerStart || (event.pointerId !== undefined && pointerStart.id !== undefined && event.pointerId !== pointerStart.id)) return;
      const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      suppressBoardClickUntil = Date.now() + 350;
      takeStep(Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
    }

    function onUndo() { if (model.undo()) { notice = ''; render(); } }
    function onReset() { model.reset(); notice = ''; render(); board.focus?.(); }
    function onNext() {
      if (model.nextLevel()) notice = '';
      else if (model.view().status === 'won') { model.selectLevel(0); notice = ''; }
      render();
      board.focus?.();
    }

    listen(board, 'click', onBoardClick);
    listen(board, 'keydown', onKeydown);
    listen(board, 'pointerdown', onPointerDown, { passive: true });
    listen(window, 'pointerup', onPointerUp);
    listen(window, 'pointercancel', () => { pointerStart = null; });
    listen(undoButton, 'click', onUndo);
    listen(resetButton, 'click', onReset);
    listen(nextButton, 'click', onNext);
    for (const button of container.querySelectorAll('.np-soko-arrow')) {
      listen(button, 'click', () => takeStep(button.dataset.direction));
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      pointerStart = null;
      suppressBoardClickUntil = 0;
      for (const { target, type, handler, options: listenerOptions } of bindings.splice(0)) {
        target.removeEventListener(type, handler, listenerOptions);
      }
      container.replaceChildren();
    }
    session?.onCleanup?.(destroy);
    render();

    return { model, render, destroy };
  }

  return { mount };
});

/* DOM-only view for the original Caro candidate; load caro-candidate-model.js first. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_CaroCandidate = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const SIZE = 15;

  function mount(container, { model = window.NP_CaroCandidateModel.create() } = {}) {
    if (!container || !model || typeof model.view !== 'function' || typeof model.place !== 'function') {
      throw new TypeError('Caro candidate needs a container and a model');
    }

    let selected = { row: 7, col: 7 };
    let destroyed = false;
    container.innerHTML = `
      <section class="np-caro" aria-label="Cờ Caro">
        <div class="np-caro-status np-game-sr" id="caroStatus" data-status role="status" aria-live="polite" aria-atomic="true"></div>
        <p class="np-caro-turn" data-turn>Lượt X</p>
        <div class="np-caro-board" data-board role="group" aria-label="Bàn cờ 15 nhân 15. Dùng phím mũi tên để chọn ô, Enter để đặt quân."></div>
        <p class="np-caro-hint">Nối đúng 5 quân để thắng. Chạm ô trống để đi.</p>
        <button class="np-caro-new" data-new-game type="button" hidden>Ván mới</button>
      </section>`;

    const board = container.querySelector('.np-caro-board');
    const status = container.querySelector('.np-caro-status');
    const turnIndicator = container.querySelector('.np-caro-turn');
    const newGame = container.querySelector('.np-caro-new');

    let notice = '';
    function statusText(view) {
      if (view.status === 'won') return `${view.winner === 1 ? 'X' : 'O'} thắng!`;
      if (view.status === 'draw') return 'Hòa ván.';
      return `Lượt ${view.currentPlayer === 1 ? 'X' : 'O'}${notice ? `. ${notice}` : ''}`;
    }

    function focusSelected() {
      const cell = Array.from(board.querySelectorAll('button')).find(item =>
        Number(item.dataset.row) === selected.row && Number(item.dataset.col) === selected.col);
      if (cell && typeof cell.focus === 'function') cell.focus();
    }

    function render({ focus = false } = {}) {
      if (destroyed) return;
      const view = model.view();
      status.textContent = statusText(view);
      turnIndicator.textContent = view.status === 'won' ? `${view.winner === 1 ? 'X' : 'O'} thắng!` :
        view.status === 'draw' ? 'Hòa ván.' : `Lượt ${view.currentPlayer === 1 ? 'X' : 'O'}`;
      newGame.hidden = view.status === 'playing';
      let markup = '';
      for (let row = 0; row < view.board.length; row += 1) {
        for (let col = 0; col < view.board[row].length; col += 1) {
          const value = view.board[row][col];
          const piece = value === 1 ? 'X' : value === 2 ? 'O' : '';
          const classes = ['np-caro-cell'];
          if (value === 1) classes.push('is-x');
          if (value === 2) classes.push('is-o');
          if (view.lastMove && view.lastMove.row === row && view.lastMove.col === col) classes.push('is-last');
          if (view.winningLine && view.winningLine.some(point => point.row === row && point.col === col)) classes.push('is-winner');
          const label = piece ? `Hàng ${row + 1}, cột ${col + 1}, quân ${piece}` : `Hàng ${row + 1}, cột ${col + 1}, ô trống`;
          markup += `<button class="${classes.join(' ')}" type="button" data-row="${row}" data-col="${col}" aria-label="${label}" aria-current="${selected.row === row && selected.col === col ? 'true' : 'false'}" tabindex="${selected.row === row && selected.col === col ? '0' : '-1'}"${view.status !== 'playing' ? ' disabled="disabled"' : ''}>${piece}</button>`;
        }
      }
      board.innerHTML = markup;
      bindCells();
      if (focus) focusSelected();
    }

    function onPlace(event) {
      const row = Number(event.target.dataset.row);
      const col = Number(event.target.dataset.col);
      selected = { row, col };
      if (model.place(row, col)) {
        notice = '';
        const ended = model.view().status !== 'playing';
        render();
        if (ended && typeof newGame.focus === 'function') newGame.focus();
        else focusSelected();
      } else {
        notice = 'Ô này đã có quân.';
        render();
        focusSelected();
      }
    }

    function onKeydown(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPlace({ target: event.currentTarget || event.target });
        return;
      }
      const deltas = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      selected = {
        row: Math.max(0, Math.min(SIZE - 1, selected.row + delta[0])),
        col: Math.max(0, Math.min(SIZE - 1, selected.col + delta[1]))
      };
      render({ focus: true });
    }

    function onNewGame() {
      if (model.view().status === 'playing') return;
      model.reset();
      notice = '';
      selected = { row: 7, col: 7 };
      render({ focus: true });
    }

    function bindCells() {
      for (const cell of board.querySelectorAll('button')) {
        cell.addEventListener('click', onPlace);
        cell.addEventListener('keydown', onKeydown);
      }
    }

    newGame.addEventListener('click', onNewGame);
    render();

    return {
      model,
      render,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        newGame.removeEventListener('click', onNewGame);
        container.replaceChildren();
      }
    };
  }

  return { mount };
});

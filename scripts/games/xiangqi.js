/* Compact DOM board view for the original local Xiangqi candidate. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_Xiangqi = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const ROWS = 10;
  const COLS = 9;

  function mount(container, { model = window.NP_XiangqiModel.create(), session = null } = {}) {
    if (!container || !model || typeof model.view !== 'function' || typeof model.play !== 'function') {
      throw new TypeError('Xiangqi needs a container and a rules model');
    }

    let cursor = { row: 9, col: 4 };
    let selected = null;
    let legal = [];
    let notice = '';
    let destroyed = false;
    container.innerHTML = `
      <section class="np-xiangqi" aria-label="Cờ Tướng">
        <div class="np-xiangqi-status" id="xqStatus" role="status" aria-live="polite" aria-atomic="true"></div>
        <p class="np-xiangqi-turn" id="xqTurn"></p>
        <div class="np-xiangqi-board" id="xqBoard" role="group" aria-label="Bàn cờ tướng 9 cột, 10 hàng. Dùng phím mũi tên để chọn điểm, Enter để chọn quân hoặc đi quân."></div>
        <div class="np-xiangqi-footer"><span class="np-xiangqi-help">Chọn quân rồi chọn điểm đến.</span><button class="np-xiangqi-new" data-new-game type="button">Ván mới</button></div>
      </section>`;

    const board = container.querySelector('#xqBoard');
    const status = container.querySelector('#xqStatus');
    const turn = container.querySelector('#xqTurn');
    const newGame = container.querySelector('.np-xiangqi-new');

    function pieceName(item) {
      const sideName = item.side === 'red' ? 'đỏ' : 'đen';
      const names = { general: 'tướng', advisor: 'sĩ', elephant: 'tượng', horse: 'mã', chariot: 'xe', cannon: 'pháo', soldier: 'tốt' };
      return `${names[item.type]} ${sideName}`;
    }

    function statusText(state) {
      if (state.status === 'checkmate') return `${state.winner === 'red' ? 'Đỏ' : 'Đen'} thắng chiếu bí.`;
      if (state.status === 'stalemate') return `${state.winner === 'red' ? 'Đỏ' : 'Đen'} thắng. Đối thủ hết nước đi.`;
      if (state.status === 'draw') return 'Hòa do lặp lại vị trí ba lần.';
      if (notice) return notice;
      return state.check ? 'Chiếu tướng!' : `Lượt ${state.turn === 'red' ? 'đỏ' : 'đen'}.`;
    }

    function focusCursor() {
      const cell = board.querySelectorAll('button').find(item => Number(item.dataset.row) === cursor.row && Number(item.dataset.col) === cursor.col);
      if (cell && typeof cell.focus === 'function') cell.focus({ preventScroll: true });
    }

    function render({ focus = false } = {}) {
      if (destroyed) return;
      const state = model.view();
      status.textContent = statusText(state);
      turn.textContent = state.status === 'playing' ? `Lượt ${state.turn === 'red' ? 'Đỏ' : 'Đen'}` : state.status === 'draw' ? 'Hòa' : `${state.winner === 'red' ? 'Đỏ' : 'Đen'} thắng`;
      const destinations = new Set(legal.map(point => `${point.row}:${point.col}`));
      let markup = '';
      for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
          const item = state.board[row][col];
          const key = `${row}:${col}`;
          const classes = ['np-xiangqi-cell'];
          if (item) classes.push(item.side === 'red' ? 'is-red' : 'is-black');
          if (selected && selected.row === row && selected.col === col) classes.push('is-selected');
          if (destinations.has(key)) classes.push(item ? 'is-capture' : 'is-legal');
          const glyph = item ? window.NP_XiangqiModel.GLYPHS[item.side][item.type] : '';
          const label = `Hàng ${row + 1}, cột ${col + 1}${item ? `, ${pieceName(item)}` : ', trống'}`;
          markup += `<button class="${classes.join(' ')}" type="button" data-row="${row}" data-col="${col}" aria-label="${label}" aria-current="${cursor.row === row && cursor.col === col ? 'true' : 'false'}" tabindex="${cursor.row === row && cursor.col === col ? '0' : '-1'}"${state.status !== 'playing' ? ' disabled="disabled"' : ''}>${glyph}</button>`;
        }
      }
      board.innerHTML = markup;
      for (const cell of board.querySelectorAll('button')) {
        cell.addEventListener('click', onClick);
        cell.addEventListener('keydown', onKeydown);
      }
      if (focus) focusCursor();
    }

    function attempt(row, col) {
      cursor = { row, col };
      const state = model.view();
      if (selected) {
        if (legal.some(move => move.row === row && move.col === col)) {
          if (model.play(selected, { row, col })) {
            selected = null;
            legal = [];
            notice = '';
            const nextState = model.view();
            render({ focus: nextState.status === 'playing' });
            if (nextState.status !== 'playing') newGame.focus?.({ preventScroll: true });
            return;
          }
        }
      }
      const item = state.board[row][col];
      if (item && item.side === state.turn) {
        selected = { row, col };
        legal = model.legalMoves(row, col);
        notice = '';
      } else if (selected) {
        selected = null;
        legal = [];
        notice = item ? 'Chọn quân đúng lượt.' : 'Nước đi không hợp lệ.';
      }
      render({ focus: true });
    }

    function onClick(event) {
      const cell = event.currentTarget || event.target;
      attempt(Number(cell.dataset.row), Number(cell.dataset.col));
    }

    function onKeydown(event) {
      const cell = event.currentTarget || event.target;
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
      if (delta) {
        event.preventDefault();
        cursor = { row: Math.max(0, Math.min(ROWS - 1, row + delta[0])), col: Math.max(0, Math.min(COLS - 1, col + delta[1])) };
        render({ focus: true });
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        attempt(row, col);
      }
    }

    function onNewGame() {
      model.reset();
      cursor = { row: 9, col: 4 };
      selected = null;
      legal = [];
      notice = '';
      render({ focus: true });
    }

    newGame.addEventListener('click', onNewGame);
    render();

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      newGame.removeEventListener('click', onNewGame);
      container.replaceChildren();
    };
    if (session && typeof session.onCleanup === 'function') session.onCleanup(destroy);
    return { model, render, destroy };
  }

  return Object.freeze({ mount });
});

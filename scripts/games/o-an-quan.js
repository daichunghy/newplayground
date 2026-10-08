/* Compact local hot-seat view for the documented Ô Ăn Quan candidate. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_OAnQuan = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const RED_FIELDS = [7, 8, 9, 10, 11];
  const BLACK_FIELDS = [1, 2, 3, 4, 5];

  function mount(container, { model = window.NP_OAnQuanModel.create(), session = null } = {}) {
    if (!container || !model || typeof model.view !== 'function' || typeof model.play !== 'function') {
      throw new TypeError('Ô Ăn Quan needs a container and rules model');
    }
    let selected = null;
    let notice = '';
    let destroyed = false;
    container.innerHTML = `
      <section class="np-oaq" aria-label="Ô Ăn Quan">
        <div class="oaq-scores"><div class="oaq-score oaq-score-red"><span>Đỏ</span><strong id="oaqRedScore">0</strong></div><div class="oaq-turn" id="oaqTurn" aria-live="polite">Lượt Đỏ</div><div class="oaq-score oaq-score-black"><span>Đen</span><strong id="oaqBlackScore">0</strong></div></div>
        <div class="oaq-status" id="oaqStatus" role="status" aria-live="polite" aria-atomic="true"></div>
        <div class="oaq-board" id="oaqBoard" role="group" aria-label="Bàn ô ăn quan. Mỗi bên có năm ô dân, hai đầu là ô quan."></div>
        <div class="oaq-controls"><span class="oaq-help">Chọn ô dân rồi chọn chiều.</span><div class="oaq-directions"><button class="oaq-button" id="oaqReverse" type="button" disabled aria-label="Rải ngược chiều">↶</button><button class="oaq-button" id="oaqForward" type="button" disabled aria-label="Rải thuận chiều">↷</button></div></div>
        <button class="oaq-new" id="oaqNew" type="button" hidden>Ván mới</button>
      </section>`;

    const boardEl = container.querySelector('#oaqBoard');
    const statusEl = container.querySelector('#oaqStatus');
    const turnEl = container.querySelector('#oaqTurn');
    const redScoreEl = container.querySelector('#oaqRedScore');
    const blackScoreEl = container.querySelector('#oaqBlackScore');
    const reverse = container.querySelector('#oaqReverse');
    const forward = container.querySelector('#oaqForward');
    const newGame = container.querySelector('#oaqNew');

    function countLabel(item) {
      return `${item.stones} sỏi${item.quan ? ', có quân Quan' : ''}`;
    }

    function statusText(state) {
      if (notice) return notice;
      if (state.status === 'draw') return 'Hòa ván.';
      if (state.status === 'won') return `Bên ${state.winner === 'red' ? 'Đỏ' : 'Đen'} thắng.`;
      if (state.status === 'forfeit') return `Bên ${state.winner === 'red' ? 'Đỏ' : 'Đen'} thắng.`;
      return state.notice || '';
    }

    function focusPit(index) {
      const cell = Array.from(boardEl.querySelectorAll('button')).find(item => Number(item.dataset.pit) === index);
      cell?.focus?.({ preventScroll: true });
    }

    function field(index, side, row, col, item, state) {
      const canPick = state.status === 'playing' && state.turn === side && item.stones > 0;
      const isSelected = selected === index;
      return `<button class="oaq-pit oaq-field ${side === 'red' ? 'is-red' : 'is-black'}${isSelected ? ' is-selected' : ''}" type="button" data-pit="${index}" style="grid-row:${row};grid-column:${col}" aria-label="Ô dân ${side === 'red' ? 'Đỏ' : 'Đen'}, ${countLabel(item)}" aria-pressed="${isSelected}"${canPick ? '' : ' disabled'}><span class="oaq-count">${item.stones}</span></button>`;
    }

    function quan(index, row, col, item) {
      return `<div class="oaq-pit oaq-quan${item.quan ? ' is-active' : ' is-empty'}" style="grid-row:${row} / span 2;grid-column:${col}" role="img" aria-label="Ô Quan ${index === 0 ? 'Tây' : 'Đông'}, ${countLabel(item)}"><span class="oaq-quan-name">Quan</span><span class="oaq-count">${item.stones}</span><span class="oaq-pit-label">${item.quan ? '10 điểm' : 'đã ăn'}</span></div>`;
    }

    function render() {
      if (destroyed) return;
      const state = model.view();
      redScoreEl.textContent = String(state.scores.red);
      blackScoreEl.textContent = String(state.scores.black);
      turnEl.textContent = state.status === 'playing' ? `Lượt ${state.turn === 'red' ? 'Đỏ' : 'Đen'}` : state.status === 'draw' ? 'Hòa' : `${state.winner === 'red' ? 'Đỏ' : 'Đen'} thắng`;
      statusEl.textContent = statusText(state);
      reverse.disabled = state.status !== 'playing' || selected === null;
      forward.disabled = state.status !== 'playing' || selected === null;
      newGame.hidden = state.status === 'playing';
      let markup = quan(0, 1, 1, state.board[0]) + quan(6, 1, 7, state.board[6]);
      for (let col = 0; col < 5; col += 1) markup += field(BLACK_FIELDS[col], 'black', 1, col + 2, state.board[BLACK_FIELDS[col]], state);
      for (let col = 0; col < 5; col += 1) {
        const index = RED_FIELDS[4 - col];
        markup += field(index, 'red', 2, col + 2, state.board[index], state);
      }
      boardEl.innerHTML = markup;
      const activePits = new Set(model.legalPits());
      for (const cell of boardEl.querySelectorAll('button')) {
        cell.disabled = !activePits.has(Number(cell.dataset.pit));
        cell.addEventListener('click', onSelect);
      }
    }

    function onSelect(event) {
      const cell = event.currentTarget || event.target;
      const index = Number(cell.dataset.pit);
      if (!model.legalPits().includes(index)) return;
      selected = selected === index ? null : index;
      notice = '';
      render();
      focusPit(index);
    }

    function onDirection(direction) {
      if (selected === null) return;
      if (!model.play(selected, direction)) return;
      selected = null;
      const state = model.view();
      if (state.status === 'playing') {
        notice = state.lastMove?.captured ? `Ăn ${state.lastMove.captured} điểm. ${state.notice}` : state.notice;
      } else notice = '';
      render();
      if (state.status !== 'playing') newGame.focus?.({ preventScroll: true });
      else {
        const nextPit = model.legalPits()[0];
        if (Number.isInteger(nextPit)) focusPit(nextPit);
      }
    }

    const onReverse = () => onDirection(-1);
    const onForward = () => onDirection(1);

    function onNewGame() {
      model.reset();
      selected = null;
      notice = '';
      render();
      const firstPit = model.legalPits()[0];
      if (Number.isInteger(firstPit)) focusPit(firstPit);
    }

    reverse.addEventListener('click', onReverse);
    forward.addEventListener('click', onForward);
    newGame.addEventListener('click', onNewGame);
    render();

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      reverse.removeEventListener('click', onReverse);
      forward.removeEventListener('click', onForward);
      newGame.removeEventListener('click', onNewGame);
      container.replaceChildren();
    };
    if (session && typeof session.onCleanup === 'function') session.onCleanup(destroy);
    return { model, render, destroy };
  }

  return Object.freeze({ mount });
});

if (typeof window === 'object') {
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchOAnQuan = function (container) {
    const session = window.NP_GameSession?.start();
    return window.NP_OAnQuan.mount(container, { session });
  };
}

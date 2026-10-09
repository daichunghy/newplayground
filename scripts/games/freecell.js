/* Original Vietnamese FreeCell presentation; every state change goes through the pure model. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_FreeCellModel;
    if (!M) throw new Error('Xếp Bài Bốn Ô chưa sẵn sàng');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Phiên chơi chưa sẵn sàng');
    }
    const { listen, onCleanup } = session;

    let seed = options.seed ?? `${Date.now()}-${Math.floor(Math.random() * 0x100000000)}`;
    let model = M.create({ seed, deckOrder: options.deckOrder });
    let alive = true;
    let selected = null;
    container.classList.add('fc-host');
    container.innerHTML = `
      <section class="fc-game" aria-label="Xếp Bài Bốn Ô">
        <header class="fc-header">
          <div class="fc-brand"><p class="fc-kicker">52 LÁ · 8 CỘT</p><h2>Bốn Ô</h2></div>
          <div class="fc-actions" aria-label="Thao tác ván chơi">
            <button class="fc-action" id="fcUndo" data-action="undo" type="button" title="Hoàn tác · Z" aria-label="Hoàn tác một nước">↶</button>
            <button class="fc-action" id="fcRestart" data-action="restart" type="button" title="Chơi lại ván này" aria-label="Chơi lại ván này">↻</button>
            <button class="fc-action fc-new" id="fcNew" data-action="new" type="button">Ván mới</button>
          </div>
        </header>
        <div class="fc-statusline">
          <p id="fcStatus" role="status" aria-live="polite" aria-atomic="true">Chọn lá rồi chọn ô, cột hoặc nền.</p>
          <span id="fcProgress">0 / 52 lá lên nền</span>
        </div>
        <div class="fc-board-pan" id="fcBoardPan" role="group" aria-label="Cuộn bàn bài" hidden>
          <button class="fc-pan-button" id="fcPanLeft" type="button" aria-label="Cuộn bàn bài sang trái">‹</button>
          <button class="fc-pan-button" id="fcPanRight" type="button" aria-label="Cuộn bàn bài sang phải">›</button>
        </div>
        <div class="fc-board-scroll" id="fcBoardScroll" tabindex="0" aria-label="Bàn bài, có thể cuộn ngang trên màn hình nhỏ">
          <div class="fc-board">
            <div class="fc-topbar">
              <div class="fc-group fc-cells" aria-label="Bốn ô tạm"></div>
              <div class="fc-group fc-foundations" aria-label="Bốn nền theo chất"></div>
            </div>
            <div class="fc-tableau" aria-label="Tám cột bài"></div>
          </div>
        </div>
        <footer class="fc-footer">
          <p>Xếp giảm dần, xen màu. Dùng ô trống để chuyền dãy.</p>
          <p class="fc-shortcuts">Z hoàn tác · Esc bỏ chọn</p>
        </footer>
      </section>`;

    const el = id => container.querySelector(`#${id}`);
    const updateBoardPan = session.bindHorizontalPan(el('fcBoardScroll'), {
      group: el('fcBoardPan'), left: el('fcPanLeft'), right: el('fcPanRight')
    });
    const sourceEqual = (a, b) => Boolean(a && b && a.zone === b.zone && a.pile === b.pile
      && a.index === b.index && a.cell === b.cell);

    function sourceFrom(element) {
      if (!element?.dataset?.source) return null;
      const data = element.dataset;
      if (data.source === 'tableau') return { zone: 'tableau', pile: Number(data.pile), index: Number(data.index) };
      if (data.source === 'cell') return { zone: 'cell', cell: Number(data.cell) };
      return null;
    }
    function targetFrom(element) {
      if (!element?.dataset?.target) return null;
      const data = element.dataset;
      if (data.target === 'tableau') return { zone: 'tableau', pile: Number(data.pile) };
      if (data.target === 'cell') return { zone: 'cell', cell: Number(data.cell) };
      if (data.target === 'foundation') return { zone: 'foundation', suit: data.suit };
      return null;
    }
    function cardLabel(card) {
      return `${M.RANK_MARKS[card.rank]} ${M.SUIT_NAMES[card.suit]}`;
    }
    function sourceSelector(source) {
      return source.zone === 'tableau'
        ? `[data-source="tableau"][data-pile="${source.pile}"][data-index="${source.index}"]`
        : `[data-source="cell"][data-cell="${source.cell}"]`;
    }
    function focusSource(source) {
      container.querySelector(sourceSelector(source))?.focus?.();
    }
    function focusTarget(target) {
      if (target.zone === 'foundation') {
        container.querySelector(`[data-target="foundation"][data-suit="${target.suit}"]`)?.focus?.();
        return;
      }
      if (target.zone === 'cell') {
        if (model.view().freeCells[target.cell]) focusSource({ zone: 'cell', cell: target.cell });
        else container.querySelector(`[data-target="cell"][data-cell="${target.cell}"]`)?.focus?.();
        return;
      }
      const pile = model.view().tableaus[target.pile];
      if (pile.length) focusSource({ zone: 'tableau', pile: target.pile, index: pile.length - 1 });
      else container.querySelector(`[data-target="tableau"][data-pile="${target.pile}"]`)?.focus?.();
    }
    function cardMarkup(card, source, picked = false) {
      const sourceAttrs = source.zone === 'tableau'
        ? `data-source="tableau" data-pile="${source.pile}" data-index="${source.index}"`
        : `data-source="cell" data-cell="${source.cell}"`;
      const red = card.color === 'red' ? ' fc-red' : '';
      const suitMark = M.SUIT_MARKS[card.suit];
      return `<button class="fc-card${red}${picked ? ' fc-selected' : ''}" type="button" ${sourceAttrs} aria-pressed="${picked ? 'true' : 'false'}" aria-label="${cardLabel(card)}${picked ? ', đang chọn' : ''}"><span class="fc-corner fc-corner-top"><b>${M.RANK_MARKS[card.rank]}</b><i>${suitMark}</i></span><span class="fc-card-center" aria-hidden="true">${suitMark}</span><span class="fc-corner fc-corner-bottom" aria-hidden="true"><b>${M.RANK_MARKS[card.rank]}</b><i>${suitMark}</i></span></button>`;
    }

    function statusText(view) {
      if (view.status === 'won') return 'Đẹp lắm! Cả bốn chất đã xếp đủ từ Át đến K.';
      if (view.status === 'stuck') return 'Không còn nước đi. Hoàn tác hoặc chia ván mới để thử lại.';
      if (view.lastEvent === 'undo') return 'Đã hoàn tác một nước.';
      if (view.lastEvent === 'restart') return 'Đã chia lại đúng ván này.';
      if (view.lastEvent === 'supermove') return 'Đã chuyển một dãy bài trong một nước.';
      if (view.lastEvent === 'to-foundation') return 'Đã đưa một lá lên nền.';
      if (view.lastEvent === 'to-cell') return 'Đã đặt một lá vào ô tạm.';
      if (view.lastEvent === 'to-tableau') return 'Đã chuyển bài sang cột mới.';
      if (selected) return 'Đã chọn bài. Chạm vị trí đến hợp lệ để chuyển.';
      return 'Chạm một lá rồi chạm ô, cột hoặc nền hợp lệ. Mọi lá đều mở.';
    }

    function render() {
      if (!alive) return;
      const view = model.view();
      el('fcUndo').disabled = !view.canUndo;
      el('fcProgress').textContent = `${view.cardsInFoundations} / 52 lá lên nền`;

      container.querySelector('.fc-cells').innerHTML = view.freeCells.map((card, cell) => {
        const content = card
          ? cardMarkup(card, { zone: 'cell', cell }, sourceEqual(selected, { zone: 'cell', cell }))
          : `<button class="fc-empty-slot" data-target="cell" data-cell="${cell}" type="button" aria-label="Ô tạm ${cell + 1} trống"></button>`;
        return `<div class="fc-zone"><span class="fc-zone-label">Ô ${cell + 1}</span><div class="fc-cell" data-target="cell" data-cell="${cell}">${content}</div></div>`;
      }).join('');

      container.querySelector('.fc-foundations').innerHTML = M.SUITS.map(suit => {
        const pile = view.foundations[suit];
        const top = pile[pile.length - 1];
        const shown = top
          ? `<span class="fc-foundation-card${top.color === 'red' ? ' fc-red' : ''}" aria-hidden="true"><b>${M.RANK_MARKS[top.rank]}</b><i>${M.SUIT_MARKS[suit]}</i></span>`
          : `<span class="fc-foundation-empty" aria-hidden="true">A</span>`;
        return `<div class="fc-zone"><span class="fc-zone-label">${M.SUIT_NAMES[suit]}</span><button class="fc-foundation-slot" data-target="foundation" data-suit="${suit}" type="button" aria-label="Nền ${M.SUIT_NAMES[suit]}, ${pile.length} trên 13">${shown}</button></div>`;
      }).join('');

      container.querySelector('.fc-tableau').innerHTML = view.tableaus.map((pile, pileIndex) => {
        const cards = pile.map((card, index) => {
          const picked = selected?.zone === 'tableau' && selected.pile === pileIndex && selected.index === index;
          const top = 5 + index * 25;
          return `<span class="fc-card-position" style="top:${top}px">${cardMarkup(card, { zone: 'tableau', pile: pileIndex, index }, picked)}</span>`;
        }).join('');
        const blank = pile.length ? '' : `<button class="fc-empty-pile" data-target="tableau" data-pile="${pileIndex}" type="button" aria-label="Cột ${pileIndex + 1} trống, nhận mọi lá"></button>`;
        const height = Math.max(126, 5 + pile.length * 25 + 88);
        return `<div class="fc-pile" data-target="tableau" data-pile="${pileIndex}" style="height:${height}px" role="group" aria-label="Cột ${pileIndex + 1}, ${pile.length} lá">${blank}${cards}</div>`;
      }).join('');

      el('fcStatus').textContent = statusText(view);
      el('fcStatus').classList.toggle('fc-result', view.status !== 'playing');
      updateBoardPan();
    }

    function tryMove(source, target) {
      if (!source || !target || !model.move(source, target)) return false;
      selected = null;
      render();
      focusTarget(target);
      return true;
    }
    function select(source) {
      if (model.isMovable(source)) selected = sourceEqual(selected, source) ? null : source;
      render();
      focusSource(selected || source);
    }
    function actOnCard(sourceEl) {
      const source = sourceFrom(sourceEl);
      const target = targetFrom(sourceEl.closest?.('[data-target]'));
      if (selected && !sourceEqual(selected, source) && target && tryMove(selected, target)) return;
      if (source) select(source);
    }
    function act(action) {
      if (action === 'undo' && model.undo()) { selected = null; render(); el('fcUndo').focus?.(); }
      else if (action === 'restart') { model.restart(); selected = null; render(); el('fcRestart').focus?.(); }
      else if (action === 'new') {
        seed = `${Date.now()}-${Math.floor(Math.random() * 0x100000000)}`;
        model = M.create({ seed });
        selected = null;
        render();
        el('fcStatus').textContent = 'Ván mới đã sẵn sàng.';
        el('fcNew').focus?.();
      }
    }

    listen(container, 'click', event => {
      if (!alive) return;
      const actionEl = event.target?.closest?.('[data-action]');
      if (actionEl) { act(actionEl.dataset.action); return; }
      const sourceEl = event.target?.closest?.('[data-source]');
      if (sourceEl) { actOnCard(sourceEl); return; }
      const target = targetFrom(event.target?.closest?.('[data-target]'));
      if (selected && target) tryMove(selected, target);
    });

    listen(root, 'keydown', event => {
      if (!alive || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        const previous = selected;
        selected = null;
        render();
        if (previous) focusSource(previous);
        event.preventDefault?.();
      }
      else if (event.key === 'z' || event.key === 'Z') { act('undo'); event.preventDefault?.(); }
    });
    onCleanup(() => {
      alive = false;
      selected = null;
      container.classList.remove('fc-host');
    });
    render();
    return Object.freeze({ getModel: () => model });
  }

  root.NP_FreeCell = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

/* Original Vietnamese one-suit Spider view. All rules and state live in spider-model.js. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_SpiderModel;
    if (!M) throw new Error('Bài Nhện chưa sẵn sàng');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Phiên chơi chưa sẵn sàng');
    }
    const { listen, onCleanup } = session;
    let seed = options.seed ?? `${Date.now()}-${Math.floor(Math.random() * 0x100000000)}`;
    let model = M.create({ seed, deckOrder: options.deckOrder });
    let alive = true;
    let selected = null;
    let dragged = null;
    let hintedMove = null;
    let hintMessage = null;

    container.classList.add('sp-host');
    container.innerHTML = `
      <section class="sp-game" aria-label="Bài Nhện">
        <header class="sp-header">
          <div><p class="sp-kicker">1 CHẤT · 104 LÁ</p><h2>Bài Nhện</h2></div>
          <div class="sp-actions" aria-label="Thao tác ván chơi">
            <button class="sp-action" id="spUndo" data-action="undo" type="button" aria-label="Hoàn tác một nước" title="Hoàn tác · Z">↶</button>
            <button class="sp-action" id="spRestart" data-action="restart" type="button" aria-label="Chơi lại ván này" title="Chơi lại ván này">↻</button>
            <button class="sp-action sp-new" id="spNew" data-action="new" type="button">Ván mới</button>
          </div>
        </header>
        <div class="sp-statusline"><p id="spStatus" role="status" aria-live="polite" aria-atomic="true">Chạm một lá hoặc dãy liền chất, rồi chạm vị trí đến.</p><button class="sp-action sp-hint-button" id="spHint" data-action="hint" type="button" aria-label="Gợi ý một nước đi" title="Gợi ý · H">Gợi ý</button><span id="spProgress">0 / 8 dãy</span></div>
        <div class="sp-board-pan" id="spBoardPan" role="group" aria-label="Cuộn bàn bài" hidden>
          <button class="sp-pan-button" id="spPanLeft" type="button" aria-label="Cuộn bàn bài sang trái">‹</button>
          <button class="sp-pan-button" id="spPanRight" type="button" aria-label="Cuộn bàn bài sang phải">›</button>
        </div>
        <div class="sp-board-scroll" id="spBoardScroll" tabindex="0" aria-label="Bàn bài, có thể cuộn ngang trên màn hình nhỏ">
          <div class="sp-board">
            <div class="sp-toolbar">
              <button class="sp-stock" id="spStock" data-action="deal" type="button" aria-label="Chia hàng mới từ nọc"></button>
              <span class="sp-hint" id="spStockHint">Mỗi lần chia thêm 10 lá</span>
              <span class="sp-toolbar-spacer" aria-hidden="true"></span>
              <span class="sp-runs" id="spRuns" aria-live="polite"></span>
            </div>
            <div class="sp-tableau" id="spTableau" role="group" aria-label="Mười cột bài"></div>
          </div>
        </div>
        <footer class="sp-footer"><p>Xếp K xuống Át. Đủ 13 lá cùng chất thì dãy tự thu.</p><p class="sp-shortcuts">Z hoàn tác · D chia · H gợi ý · Esc bỏ chọn</p></footer>
      </section>`;

    const el = id => container.querySelector(`#${id}`);
    const updateBoardPan = session.bindHorizontalPan(el('spBoardScroll'), {
      group: el('spBoardPan'), left: el('spPanLeft'), right: el('spPanRight')
    });
    const sourceEqual = (a, b) => Boolean(a && b && a.zone === b.zone && a.pile === b.pile && a.index === b.index);

    function sourceFrom(element) {
      if (element?.dataset?.source !== 'tableau') return null;
      return { zone: 'tableau', pile: Number(element.dataset.pile), index: Number(element.dataset.index) };
    }
    function targetFrom(element) {
      if (element?.dataset?.target !== 'tableau') return null;
      return { zone: 'tableau', pile: Number(element.dataset.pile) };
    }
    function sourceSelector(source) {
      return `[data-source="tableau"][data-pile="${source.pile}"][data-index="${source.index}"]`;
    }
    function focusSource(source) { if (source) container.querySelector(sourceSelector(source))?.focus?.(); }
    function focusTarget(pileIndex) {
      const pile = model.view().tableaus[pileIndex];
      if (pile.length) focusSource({ zone: 'tableau', pile: pileIndex, index: pile.length - 1 });
      else container.querySelector(`[data-target="tableau"][data-pile="${pileIndex}"]`)?.focus?.();
    }
    function cardLabel(card) { return `${M.RANK_MARKS[card.rank]} ${M.SUIT_NAMES[card.suit]}`; }
    function cardMarkup(card, pileIndex, index, picked = false) {
      const suit = M.SUIT_MARKS[card.suit];
      const source = `data-source="tableau" data-pile="${pileIndex}" data-index="${index}"`;
      return `<button class="sp-card${picked ? ' sp-selected' : ''}" type="button" draggable="true" ${source} aria-pressed="${picked ? 'true' : 'false'}" aria-label="${cardLabel(card)}${picked ? ', đang chọn' : ''}"><span class="sp-corner sp-corner-top"><b>${M.RANK_MARKS[card.rank]}</b><i>${suit}</i></span><span class="sp-center" aria-hidden="true">${suit}</span><span class="sp-corner sp-corner-bottom" aria-hidden="true"><b>${M.RANK_MARKS[card.rank]}</b><i>${suit}</i></span></button>`;
    }
    function statusText(view) {
      if (view.status === 'won') return 'Tuyệt! Cả 8 dãy đã thu. Chơi lại hoặc chia ván mới.';
      if (view.status === 'stuck') return 'Hết nọc và nước đi. Hoàn tác hoặc chia ván mới.';
      if (hintMessage) return hintMessage;
      if (view.lastEvent === 'run-completed') return 'Đủ K xuống Át cùng chất. Dãy đã thu.';
      if (view.lastEvent === 'stock-deal') return 'Đã chia 10 lá, mỗi cột một lá.';
      if (view.lastEvent === 'undo') return 'Đã hoàn tác một nước.';
      if (view.lastEvent === 'restart') return 'Đã chia lại ván này.';
      if (selected) return 'Đã chọn bài. Chạm cột hoặc lá đích hợp lệ.';
      if (!view.hasLegalMove && view.canDeal) return 'Chưa có nước xếp. Chia thêm một hàng.';
      return 'Chạm lá hoặc dãy liền chất, rồi chạm vị trí đến.';
    }
    function render() {
      if (!alive) return;
      const view = model.view();
      const stock = el('spStock');
      stock.classList.toggle('sp-hint-target', hintedMove?.kind === 'deal');
      stock.disabled = !view.canDeal;
      stock.innerHTML = view.stockCount
        ? `<span class="sp-stock-card" aria-hidden="true"><i>✦</i></span><span class="sp-stock-count">${view.stockCount}</span>`
        : '<span class="sp-stock-empty" aria-hidden="true">·</span><span class="sp-stock-count">Hết nọc</span>';
      stock.setAttribute('aria-label', view.canDeal ? `Chia một hàng mới, còn ${view.stockCount} lá trong nọc` : view.stockCount ? 'Chia bị khóa khi có cột trống' : 'Nọc đã hết');
      el('spUndo').disabled = !view.canUndo;
      el('spHint').disabled = view.status !== 'playing';
      el('spProgress').textContent = `${view.completedRuns} / 8 dãy`;
      el('spRuns').textContent = view.completedRuns ? `${view.completedRuns} dãy đã thu` : '';
      const tableau = el('spTableau');
      tableau.innerHTML = view.tableaus.map((pile, pileIndex) => {
        let offset = 5;
        const cards = pile.map((card, index) => {
          const top = offset;
          offset += card.faceUp ? 28 : 17;
          if (!card.faceUp) return `<span class="sp-card sp-back" style="top:${top}px" aria-hidden="true"><i>✦</i></span>`;
          const picked = selected?.zone === 'tableau' && selected.pile === pileIndex && selected.index === index;
          return `<span class="sp-card-position" style="top:${top}px">${cardMarkup(card, pileIndex, index, picked)}</span>`;
        }).join('');
        const blank = pile.length ? '' : `<button class="sp-empty-pile" data-target="tableau" data-pile="${pileIndex}" type="button" aria-label="Cột ${pileIndex + 1} trống, nhận mọi dãy liền chất"></button>`;
        const height = Math.max(145, offset + 94);
        const hinted = hintedMove?.kind === 'move' && hintedMove.target.pile === pileIndex ? ' sp-hint-target' : '';
        return `<div class="sp-pile${hinted}" data-target="tableau" data-pile="${pileIndex}" style="height:${height}px" role="group" aria-label="Cột ${pileIndex + 1}, ${pile.length} lá${pile.length && !pile[pile.length - 1].faceUp ? ', lá trên cùng úp' : ''}">${blank}${cards}</div>`;
      }).join('');
      el('spStatus').textContent = statusText(view);
      el('spStatus').classList.toggle('sp-result', view.status !== 'playing');
      tableau.setAttribute('aria-label', `Mười cột bài, ${view.tableaus.reduce((sum, pile) => sum + pile.length, 0)} lá còn trên bàn.`);
      updateBoardPan();
    }
    function tryMove(source, target) {
      if (!source || !target || !model.move(source, target)) return false;
      selected = null;
      dragged = null;
      hintedMove = null;
      hintMessage = null;
      render();
      focusTarget(target.pile);
      return true;
    }
    function select(source) {
      hintedMove = null;
      hintMessage = null;
      if (model.isMovable(source)) selected = sourceEqual(selected, source) ? null : source;
      render();
      focusSource(selected || source);
    }
    function actOnCard(element) {
      const source = sourceFrom(element);
      const target = targetFrom(element?.closest?.('[data-target]'));
      if (selected && !sourceEqual(selected, source) && target && tryMove(selected, target)) return;
      if (source) select(source);
    }
    function act(action) {
      if (action === 'hint') {
        selected = null;
        hintedMove = model.findHint();
        if (hintedMove?.kind === 'move') {
          selected = hintedMove.source;
          hintMessage = hintedMove.revealsCard
            ? `Gợi ý: Cột ${hintedMove.source.pile + 1} → ${hintedMove.target.pile + 1} để lật lá.`
            : `Gợi ý: Cột ${hintedMove.source.pile + 1} → ${hintedMove.target.pile + 1}.`;
        } else if (hintedMove?.kind === 'deal') hintMessage = 'Gợi ý: Chia thêm một hàng.';
        else hintMessage = 'Chưa thấy nước đi. Hoàn tác hoặc chia ván mới.';
        render();
        if (hintedMove?.kind === 'move') focusSource(hintedMove.source);
        return;
      }
      hintedMove = null;
      hintMessage = null;
      if (action === 'deal' && model.dealStock()) { selected = null; render(); }
      else if (action === 'undo' && model.undo()) { selected = null; render(); el('spUndo').focus?.(); }
      else if (action === 'restart') { model.restart(); selected = null; render(); el('spRestart').focus?.(); }
      else if (action === 'new') {
        seed = `${Date.now()}-${Math.floor(Math.random() * 0x100000000)}`;
        model = M.create({ seed });
        selected = null;
        render();
        el('spStatus').textContent = 'Ván mới đã sẵn sàng.';
        el('spNew').focus?.();
      }
    }

    listen(container, 'click', event => {
      if (!alive) return;
      const action = event.target?.closest?.('[data-action]');
      if (action) { act(action.dataset.action); return; }
      const sourceEl = event.target?.closest?.('[data-source]');
      if (sourceEl) { actOnCard(sourceEl); return; }
      const target = targetFrom(event.target?.closest?.('[data-target]'));
      if (selected && target) tryMove(selected, target);
    });
    listen(container, 'dragstart', event => {
      const source = sourceFrom(event.target?.closest?.('[data-source]'));
      if (!alive || !source || !model.isMovable(source)) { event.preventDefault?.(); return; }
      dragged = source;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify(source));
      }
    });
    listen(container, 'dragover', event => {
      if (alive && dragged && event.target?.closest?.('[data-target]')) event.preventDefault?.();
    });
    listen(container, 'drop', event => {
      const target = targetFrom(event.target?.closest?.('[data-target]'));
      if (!alive || !dragged || !target) return;
      event.preventDefault?.();
      tryMove(dragged, target);
    });
    listen(root, 'keydown', event => {
      if (!alive || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        const previous = selected;
        selected = null;
        hintedMove = null;
        hintMessage = null;
        render();
        if (previous) focusSource(previous);
        event.preventDefault?.();
      }
      else if (event.key === 'z' || event.key === 'Z') { act('undo'); event.preventDefault?.(); }
      else if (event.key === 'd' || event.key === 'D') { act('deal'); event.preventDefault?.(); }
      else if (event.key === 'h' || event.key === 'H') { act('hint'); event.preventDefault?.(); }
    });
    onCleanup(() => {
      alive = false;
      selected = null;
      dragged = null;
      container.classList.remove('sp-host');
    });
    render();
    return Object.freeze({ getModel: () => model });
  }

  root.NP_Spider = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

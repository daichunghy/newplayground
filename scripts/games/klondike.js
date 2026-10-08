/* Click/tap-first original Klondike view. Card faces and backs are authored in CSS. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_KlondikeModel;
    if (!M) throw new Error('Xếp Bài Klondike chưa sẵn sàng');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Phiên chơi chưa sẵn sàng');
    }

    const { listen, onCleanup } = session;
    let seed = options.seed ?? `${Date.now()}-${Math.floor(Math.random() * 0x100000000)}`;
    let model = M.create({ seed, deckOrder: options.deckOrder });
    let alive = true;
    let selected = null;
    let dragged = null;
    container.classList.add('kl-host');
    container.innerHTML = `
      <section class="kl-game" aria-label="Bảy Cột">
        <header class="kl-header">
          <div><p class="kl-kicker">MỘT BỘ BÀI · BỐN CHẤT</p><h2>Bảy Cột</h2></div>
          <div class="kl-actions" aria-label="Thao tác ván chơi">
            <button class="kl-action" id="klUndo" data-action="undo" type="button" aria-label="Hoàn tác một nước" title="Hoàn tác · Z">↶</button>
            <button class="kl-action" id="klRestart" data-action="restart" type="button" aria-label="Chơi lại ván này" title="Chơi lại ván này">↻</button>
            <button class="kl-action kl-new" id="klNew" data-action="new" type="button">Ván mới</button>
          </div>
        </header>
        <div class="kl-statusline">
          <p id="klStatus" role="status" aria-live="polite" aria-atomic="true">Chạm lá bài rồi chạm cột đích. Có thể kéo bài trên máy tính.</p>
          <span id="klMoveCount">0 nước</span>
        </div>
        <div class="kl-tabletop" aria-label="Kho bài và nền">
          <div class="kl-slot-group">
            <div class="kl-slot-wrap"><span class="kl-slot-label">Nọc</span>
              <button class="kl-stock-slot" id="klStock" data-action="stock" type="button" aria-label="Rút một lá từ nọc"></button>
            </div>
            <div class="kl-slot-wrap"><span class="kl-slot-label">Bài lật</span>
              <div class="kl-waste-slot" id="klWaste" aria-label="Bài lật"></div>
            </div>
          </div>
          <div class="kl-spacer" aria-hidden="true"></div>
          <div class="kl-foundations" aria-label="Bốn nền theo chất"></div>
        </div>
        <div class="kl-tableau" id="klTableau" role="group" aria-label="Bảy cột bài"></div>
        <div class="kl-footer">
          <p>Đặt lá thấp hơn khác màu. Chỉ Vua vào cột trống; Nọc rút 1 lá, đảo lại một lần.</p>
          <p class="kl-shortcuts">Phím: Z hoàn tác · Esc bỏ chọn</p>
        </div>
      </section>`;

    const el = id => container.querySelector(`#${id}`);
    const suitName = { clubs: 'Tép', diamonds: 'Rô', hearts: 'Cơ', spades: 'Bích' };
    const sourceEqual = (a, b) => Boolean(a && b && a.zone === b.zone && a.pile === b.pile && a.index === b.index && a.suit === b.suit);

    function sourceFrom(element) {
      if (!element) return null;
      const data = element.dataset || {};
      if (!data.source) return null;
      if (data.source === 'tableau') return { zone: 'tableau', pile: Number(data.pile), index: Number(data.index) };
      if (data.source === 'foundation') return { zone: 'foundation', suit: data.suit };
      if (data.source === 'waste') return { zone: 'waste' };
      return null;
    }
    function targetFrom(element) {
      if (!element) return null;
      const data = element.dataset || {};
      if (data.target === 'tableau') return { zone: 'tableau', pile: Number(data.pile) };
      if (data.target === 'foundation') return { zone: 'foundation', suit: data.suit };
      return null;
    }
    function sourceSelector(source) {
      if (source.zone === 'tableau') return `[data-source="tableau"][data-pile="${source.pile}"][data-index="${source.index}"]`;
      if (source.zone === 'foundation') return `[data-source="foundation"][data-suit="${source.suit}"]`;
      if (source.zone === 'waste') return '[data-source="waste"]';
      return null;
    }
    function focusSource(source) {
      const selector = source && sourceSelector(source);
      if (selector) container.querySelector(selector)?.focus?.({ preventScroll: true });
    }
    function focusTarget(target) {
      if (!target) return;
      if (target.zone === 'tableau') {
        const pile = model.view().tableaus[target.pile];
        if (pile?.length) focusSource({ zone: 'tableau', pile: target.pile, index: pile.length - 1 });
        else container.querySelector(`[data-target="tableau"][data-pile="${target.pile}"] button`)?.focus?.({ preventScroll: true });
      } else if (target.zone === 'foundation') {
        const pile = model.view().foundations[target.suit];
        if (pile?.length) focusSource({ zone: 'foundation', suit: target.suit });
        else container.querySelector(`[data-target="foundation"][data-suit="${target.suit}"] button`)?.focus?.({ preventScroll: true });
      }
    }
    function displayCard(card) {
      return `${M.RANK_MARKS[card.rank]} ${M.SUIT_MARKS[card.suit]}`;
    }
    function cardMarkup(card, source, picked = false) {
      const sourceAttrs = source.zone === 'tableau'
        ? `data-source="tableau" data-pile="${source.pile}" data-index="${source.index}"`
        : source.zone === 'foundation' ? `data-source="foundation" data-suit="${source.suit}"` : 'data-source="waste"';
      const red = card.color === 'red' ? ' kl-red' : '';
      const pressed = picked ? ' aria-pressed="true"' : ' aria-pressed="false"';
      return `<button class="kl-card kl-face${red}${picked ? ' kl-selected' : ''}" type="button" draggable="true" ${sourceAttrs}${pressed} aria-label="${displayCard(card)}, ${suitName[card.suit]}${picked ? ', đang chọn' : ''}"><span class="kl-corner kl-corner-top"><b>${M.RANK_MARKS[card.rank]}</b><i>${M.SUIT_MARKS[card.suit]}</i></span><span class="kl-center-suit" aria-hidden="true">${M.SUIT_MARKS[card.suit]}</span><span class="kl-corner kl-corner-bottom" aria-hidden="true"><b>${M.RANK_MARKS[card.rank]}</b><i>${M.SUIT_MARKS[card.suit]}</i></span></button>`;
    }
    function cardBack(label = 'Lá úp') {
      return `<span class="kl-card kl-back" aria-label="${label}" role="img"><i aria-hidden="true">✦</i></span>`;
    }
    function statusText(view) {
      if (view.status === 'won') return 'Bạn đã xếp đủ bốn chất từ Át đến K. Chơi lại hoặc chia ván mới.';
      if (view.status === 'lost') return 'Hết nước đi sau lượt đảo bài. Hoàn tác hoặc chia ván mới.';
      if (view.noCardMoves) return view.canRecycle
        ? 'Chưa có nước đặt bài. Đảo nọc một lần hoặc hoàn tác.'
        : view.stockCount ? 'Chưa có nước đặt bài. Rút tiếp từ nọc hoặc hoàn tác.'
          : 'Chưa có nước đặt bài. Hoàn tác để thử nước khác.';
      if (view.lastEvent === 'draw') return 'Đã lật một lá. Chạm lá lật để chọn, rồi chạm cột đích.';
      if (view.lastEvent === 'recycle') return 'Đã đảo nọc. Có thể rút lại từ đầu.';
      if (view.lastEvent === 'undo') return 'Đã hoàn tác một nước.';
      if (view.lastEvent === 'restart') return 'Đã chia lại ván này.';
      if (view.lastEvent === 'new') return 'Ván mới đã sẵn sàng.';
      if (view.lastEvent === 'move-tableau') return 'Đã chuyển bài. Lá úp mới trong cột vừa mở đã được lật.';
      if (view.lastEvent === 'to-foundation') return 'Đã chuyển bài lên nền.';
      if (selected) return 'Đã chọn bài. Chạm cột hoặc nền hợp lệ để chuyển.';
      return 'Chạm lá bài rồi chạm cột đích. Có thể kéo bài trên máy tính.';
    }

    function render() {
      if (!alive) return;
      const view = model.view();
      const stock = el('klStock');
      stock.innerHTML = view.stockCount ? `${cardBack('Nọc úp')}<span class="kl-stock-count">${view.stockCount}</span>`
        : view.canRecycle ? '<span class="kl-recycle-mark" aria-hidden="true">↻</span><span class="kl-stock-count">Đảo</span>'
          : '<span class="kl-empty-mark" aria-hidden="true">·</span>';
      stock.disabled = !(view.canDraw || view.canRecycle);
      stock.setAttribute('aria-label', view.stockCount ? `Rút một lá, còn ${view.stockCount} trong nọc` : view.canRecycle ? 'Đảo lại nọc, lượt rút không giới hạn' : 'Nọc đã hết');

      const waste = el('klWaste');
      if (view.waste.length) {
        const top = view.waste[view.waste.length - 1];
        waste.innerHTML = cardMarkup(top, { zone: 'waste' }, sourceEqual(selected, { zone: 'waste' }));
      } else waste.innerHTML = '<span class="kl-empty-mark" aria-hidden="true">·</span>';

      const foundations = container.querySelector('.kl-foundations');
      foundations.innerHTML = M.SUITS.map(suit => {
        const pile = view.foundations[suit];
        const top = pile[pile.length - 1];
        const topMarkup = top ? cardMarkup(top, { zone: 'foundation', suit }, sourceEqual(selected, { zone: 'foundation', suit }))
          : '<button class="kl-foundation-empty" type="button" aria-label="Nền trống, chỉ nhận Át">A</button>';
        return `<div class="kl-slot-wrap"><span class="kl-slot-label">${suitName[suit]}</span><div class="kl-foundation-slot" data-target="foundation" data-suit="${suit}" aria-label="Nền ${suitName[suit]}, ${pile.length} trên 13">${topMarkup}</div></div>`;
      }).join('');

      const tableau = el('klTableau');
      tableau.innerHTML = view.tableaus.map((pile, pileIndex) => {
        let offset = 0;
        const cards = pile.map((card, index) => {
          const top = offset;
          offset += card.faceUp ? 29 : 18;
          if (!card.faceUp) return `<span class="kl-card kl-back kl-stack-back" style="top:${top}px" aria-hidden="true"><i>✦</i></span>`;
          const picked = selected?.zone === 'tableau' && selected.pile === pileIndex && selected.index === index;
          return `<span class="kl-card-position" style="top:${top}px">${cardMarkup(card, { zone: 'tableau', pile: pileIndex, index }, picked)}</span>`;
        }).join('');
        const blank = pile.length ? '' : `<button class="kl-king-hint" data-target="tableau" data-pile="${pileIndex}" type="button" aria-label="Cột ${pileIndex + 1} trống, chỉ nhận Vua">K</button>`;
        const height = Math.max(124, offset + 88);
        return `<div class="kl-pile" data-target="tableau" data-pile="${pileIndex}" style="height:${height}px" role="group" aria-label="Cột ${pileIndex + 1}, ${pile.length} lá${pile.length && !pile[pile.length - 1].faceUp ? ', trên cùng úp' : ''}">${blank}${cards}</div>`;
      }).join('');

      el('klMoveCount').textContent = `${view.moves} nước`;
      el('klUndo').disabled = !view.canUndo;
      el('klStatus').textContent = statusText(view);
      el('klStatus').classList.toggle('kl-result', view.status !== 'playing');
      tableau.setAttribute('aria-label', `Bảy cột bài. ${view.tableaus.reduce((sum, pile) => sum + pile.length, 0)} lá đang nằm trong các cột.`);
    }

    function tryMove(source, target) {
      if (!source || !target || !model.move(source, target)) return false;
      selected = null;
      dragged = null;
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
      const stack = sourceEl?.closest?.('[data-target]');
      const target = targetFrom(stack);
      if (selected && !sourceEqual(selected, source) && target && tryMove(selected, target)) return;
      if (source) select(source);
    }
    function act(action) {
      if (action === 'stock') {
        const view = model.view();
        const changed = view.canDraw ? model.draw() : view.canRecycle ? model.recycle() : false;
        if (changed) { selected = null; render(); }
      } else if (action === 'undo') {
        if (model.undo()) { selected = null; render(); el('klUndo').focus?.({ preventScroll: true }); }
      } else if (action === 'restart') {
        model.restart(); selected = null; render(); el('klRestart').focus?.({ preventScroll: true });
      } else if (action === 'new') {
        seed = `${Date.now()}-${Math.floor(Math.random() * 0x100000000)}`;
        model = M.create({ seed }); selected = null;
        model.view();
        render();
        el('klStatus').textContent = 'Ván mới đã sẵn sàng.';
        el('klNew').focus?.({ preventScroll: true });
      }
    }

    listen(container, 'click', event => {
      if (!alive) return;
      const targetEl = event.target?.closest?.('[data-action]');
      if (targetEl) { act(targetEl.dataset.action); return; }
      const sourceEl = event.target?.closest?.('[data-source]');
      if (sourceEl) { actOnCard(sourceEl); return; }
      const pileEl = event.target?.closest?.('[data-target]');
      const target = targetFrom(pileEl);
      if (selected && target) tryMove(selected, target);
    });

    listen(container, 'dragstart', event => {
      const sourceEl = event.target?.closest?.('[data-source]');
      const source = sourceFrom(sourceEl);
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
      const pileEl = event.target?.closest?.('[data-target]');
      const target = targetFrom(pileEl);
      if (!alive || !dragged || !target) return;
      event.preventDefault?.();
      tryMove(dragged, target);
    });

    listen(root, 'keydown', event => {
      if (!alive || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape' && selected) {
        const previous = selected;
        selected = null;
        render();
        focusSource(previous);
        event.preventDefault?.();
      }
      else if (event.key === 'z' || event.key === 'Z') { act('undo'); event.preventDefault?.(); }
    });
    onCleanup(() => {
      alive = false;
      selected = null;
      dragged = null;
      container.classList.remove('kl-host');
    });
    render();
    return Object.freeze({ getModel: () => model });
  }

  root.NP_Klondike = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

/* Original clue-driven shelf-ordering campaign. NP_GameSession owns all resources. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_KeSachKyUcModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Kệ Sách Ký Ức needs its model and an active game session');
    }
    const seed = typeof options.seed === 'number' ? options.seed : (typeof options.seedFactory === 'function' ? options.seedFactory() : 0x4b534b55);
    const model = M.create({ seed });
    const { listen, onCleanup } = session;
    let alive = true, selectedId = null, message = 'Đọc manh mối, chọn một gáy rồi dịch trái hoặc phải.';

    container.classList.add('ksku-host');
    container.innerHTML = `
      <section class="ksku-game" aria-label="Kệ Sách Ký Ức">
        <header class="ksku-head">
          <div class="ksku-title"><span class="ksku-mark" aria-hidden="true">⌂</span><div><h2>Kệ Sách Ký Ức</h2><p>Dịch từng sách theo manh mối</p></div></div>
          <div class="ksku-tools" role="group" aria-label="Điều khiển ván">
            <button class="ksku-tool" id="kskuPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">||</button>
            <button class="ksku-tool" id="kskuReplay" type="button" aria-label="Chơi lại từ đầu" title="Chơi lại">↻</button>
          </div>
        </header>
        <div class="ksku-hud" aria-label="Tiến độ">
          <div><span>Ngăn</span><strong id="kskuStage">1 / 3</strong></div>
          <div><span>Đổi chỗ</span><strong id="kskuMoves">0 / 8</strong></div>
          <div class="ksku-room"><span id="kskuName">Góc Đèn</span><strong id="kskuLeft">8 lượt còn</strong></div>
        </div>
        <p class="ksku-instruction">Chọn một gáy sách. Dùng ← / → hoặc hai mũi tên để dịch sách từng vị trí.</p>
        <ol class="ksku-shelf" id="kskuShelf" aria-label="Sách trên kệ"></ol>
        <div class="ksku-shift" role="group" aria-label="Dịch cuốn đang chọn">
          <button class="ksku-shift-button" id="kskuLeft" type="button" aria-label="Dịch sách sang trái">←</button>
          <span id="kskuSelected">Chưa chọn sách</span>
          <button class="ksku-shift-button" id="kskuRight" type="button" aria-label="Dịch sách sang phải">→</button>
        </div>
        <section class="ksku-clues" aria-labelledby="kskuClueTitle">
          <h3 id="kskuClueTitle">Manh mối</h3>
          <ol id="kskuClueList"></ol>
        </section>
        <p class="ksku-status" id="kskuStatus" role="status" aria-live="polite" aria-atomic="true"></p>
        <section class="ksku-overlay" id="kskuOverlay" hidden aria-live="polite" aria-label="Trạng thái ván">
          <div class="ksku-overlay-card"><span class="ksku-seal" aria-hidden="true">✦</span><h3 id="kskuOverlayTitle"></h3><p id="kskuOverlayText"></p>
            <button class="ksku-primary" id="kskuContinue" type="button" hidden>Tiếp tục</button>
            <button class="ksku-primary" id="kskuNext" type="button" hidden>Ngăn tiếp</button>
            <button class="ksku-primary" id="kskuReplayEnd" type="button" hidden>Chơi lại</button>
          </div>
        </section>
      </section>`;

    const el = id => container.querySelector('#' + id);
    function announce(text) { message = text; }
    function selectedPosition(view = model.view()) { return selectedId ? view.order.indexOf(selectedId) : -1; }
    function focusBook(id = selectedId) {
      const button = Array.from(container.querySelectorAll('.ksku-book')).find(item => item.dataset.bookId === id);
      button?.focus({ preventScroll: true });
    }

    function render() {
      if (!alive) return;
      const view = model.view(), movable = view.status === 'playing';
      el('kskuStage').textContent = `${view.stageNumber} / ${view.stageCount}`;
      el('kskuMoves').textContent = `${view.moves} / ${view.budget}`;
      el('kskuName').textContent = view.stageName;
      el('kskuLeft').textContent = `${view.movesLeft} lượt còn`;
      el('kskuShelf').innerHTML = view.books.map((book, index) => `
        <li class="ksku-slot"><span class="ksku-position" aria-hidden="true">${index + 1}</span>
          <button class="ksku-book" type="button" data-book-id="${book.id}" data-tone="${book.tone}" aria-pressed="${selectedId === book.id ? 'true' : 'false'}" aria-label="Vị trí ${index + 1}: ${book.title}${selectedId === book.id ? ', đang chọn' : ''}" ${movable ? '' : 'disabled'}>
            <span class="ksku-sigil" aria-hidden="true">${book.sigil}</span><span class="ksku-book-title">${book.title}</span>
          </button>
        </li>`).join('');
      el('kskuClueList').innerHTML = view.clues.map((clue, index) => `<li data-satisfied="${clue.satisfied}"><span class="ksku-clue-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="ksku-clue-state" role="img" aria-label="${clue.satisfied ? 'Đã khớp' : 'Chưa khớp'}">${clue.satisfied ? '✓' : '○'}</span><span class="ksku-clue-text">${clue.text}</span></li>`).join('');
      const position = selectedPosition(view);
      el('kskuSelected').textContent = position >= 0 ? `Đang chọn · ${view.books[position].title}` : 'Chưa chọn sách';
      el('kskuLeft').disabled = !movable || position <= 0;
      el('kskuRight').disabled = !movable || position < 0 || position >= view.order.length - 1;
      el('kskuPause').disabled = !['playing', 'paused'].includes(view.status);
      el('kskuPause').textContent = view.status === 'paused' ? '▶' : '||';
      el('kskuPause').setAttribute('aria-label', view.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng');

      const paused = view.status === 'paused', cleared = view.status === 'stage-clear', terminal = view.status === 'won' || view.status === 'lost';
      el('kskuOverlay').hidden = !(paused || cleared || terminal);
      el('kskuContinue').hidden = !paused;
      el('kskuNext').hidden = !cleared;
      el('kskuReplayEnd').hidden = !terminal;
      if (paused) {
        el('kskuOverlayTitle').textContent = 'Tạm dừng';
        el('kskuOverlayText').textContent = 'Kệ sách vẫn chờ bạn.';
      } else if (cleared) {
        el('kskuOverlayTitle').textContent = 'Đúng trật tự!';
        el('kskuOverlayText').textContent = 'Các manh mối đã khớp. Sang ngăn mới nhé.';
      } else if (view.status === 'won') {
        el('kskuOverlayTitle').textContent = 'Kệ sách đã vào nếp';
        el('kskuOverlayText').textContent = 'Ba ngăn đã được sắp theo đúng manh mối.';
      } else if (view.status === 'lost') {
        el('kskuOverlayTitle').textContent = 'Hết lượt đổi chỗ';
        el('kskuOverlayText').textContent = 'Bắt đầu lại và lần theo từng manh mối.';
      } else {
        el('kskuOverlayTitle').textContent = '';
        el('kskuOverlayText').textContent = '';
      }
      el('kskuStatus').textContent = message;
    }

    function select(id) {
      if (!alive || model.view().status !== 'playing' || !model.view().order.includes(id)) return;
      if (selectedId === id) { selectedId = null; announce('Đã bỏ chọn.'); }
      else { selectedId = id; announce(`Đã chọn ${M.BOOKS.find(book => book.id === id).title}. Dịch từng vị trí.`); }
      render();
      if (selectedId) focusBook();
    }

    function shift(direction) {
      if (!alive || !selectedId) { announce('Chọn một cuốn sách trước.'); render(); return false; }
      const result = model.move(selectedId, direction);
      if (!result.accepted) { announce('Cuốn sách đã ở mép kệ.'); render(); return false; }
      const view = model.view();
      if (view.status === 'stage-clear') announce('Đúng trật tự. Ngăn này đã hoàn tất.');
      else if (view.status === 'won') announce('Cả ba ngăn đã đúng trật tự.');
      else if (view.status === 'lost') announce('Đã dùng hết lượt đổi chỗ.');
      else announce(`${view.movesLeft} lượt còn.`);
      render();
      if (view.status === 'playing') focusBook();
      else if (view.status === 'stage-clear') el('kskuNext').focus({ preventScroll: true });
      else if (view.status === 'won' || view.status === 'lost') el('kskuReplayEnd').focus({ preventScroll: true });
      return true;
    }

    function togglePause() {
      if (model.view().status === 'paused') {
        model.resume(); announce('Tiếp tục sắp sách.');
      } else if (model.pause()) announce('Đã tạm dừng.');
      render();
      if (model.view().status === 'playing') focusBook(selectedId || model.view().order[0]);
      else el('kskuContinue').focus({ preventScroll: true });
    }

    function replay() {
      model.restart(); selectedId = null; announce('Đọc manh mối, chọn một gáy rồi dịch trái hoặc phải.'); render();
      focusBook(model.view().order[0]);
    }

    function nextStage() {
      if (!model.nextStage()) return;
      selectedId = null; announce(`Ngăn ${model.view().stageNumber}: đọc các manh mối mới.`); render();
      focusBook(model.view().order[0]);
    }

    listen(el('kskuShelf'), 'click', event => {
      const button = event.target?.closest?.('.ksku-book') || event.target;
      if (button?.dataset?.bookId) select(button.dataset.bookId);
    });
    listen(el('kskuLeft'), 'click', () => shift(-1));
    listen(el('kskuRight'), 'click', () => shift(1));
    listen(el('kskuPause'), 'click', togglePause);
    listen(el('kskuReplay'), 'click', replay);
    listen(el('kskuReplayEnd'), 'click', replay);
    listen(el('kskuContinue'), 'click', togglePause);
    listen(el('kskuNext'), 'click', nextStage);
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const key = String(event.key || '').toLowerCase();
      if (key === 'p' || key === 'escape') { event.preventDefault(); togglePause(); return; }
      const focused = event.target?.dataset?.bookId;
      if ((key === 'enter' || key === ' ') && focused) { event.preventDefault(); select(focused); return; }
      if (key !== 'arrowleft' && key !== 'arrowright') return;
      event.preventDefault();
      if (selectedId) { shift(key === 'arrowleft' ? -1 : 1); return; }
      const view = model.view(), from = focused ? view.order.indexOf(focused) : 0;
      const to = Math.max(0, Math.min(view.order.length - 1, from + (key === 'arrowleft' ? -1 : 1)));
      const next = Array.from(container.querySelectorAll('.ksku-book')).find(button => button.dataset.bookId === view.order[to]);
      next?.focus({ preventScroll: true });
    });
    listen(root.document, 'visibilitychange', () => {
      if (root.document.hidden && model.pause()) { announce('Đã tạm dừng khi chuyển tab.'); render(); }
      else if (!root.document.hidden && model.view().status === 'paused') el('kskuContinue').focus({ preventScroll: true });
    });
    listen(root, 'blur', () => { if (model.pause()) { announce('Đã tạm dừng khi đổi cửa sổ.'); render(); el('kskuContinue').focus({ preventScroll: true }); } });
    listen(root, 'pagehide', () => { if (model.pause()) { announce('Đã tạm dừng.'); render(); } });
    onCleanup(() => { alive = false; selectedId = null; container.innerHTML = ''; container.classList.remove('ksku-host'); });
    render();
    focusBook(model.view().order[0]);
    return { getModel: () => model, isSelected: id => selectedId === id, replay };
  }

  root.NP_KeSachKyUc = Object.freeze({ mount });
})(typeof window === 'object' ? window : null);

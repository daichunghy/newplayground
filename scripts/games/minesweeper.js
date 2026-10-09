/* NewPlayground Minesweeper presentation; rules live in minesweeper-model.js. */
(function () {
  'use strict';
  const STORAGE = 'np_minesweeper_v1';
  const ICONS = {
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V3m0 1h12l-3 4 3 4H6M3 21h7"/></svg>',
    mine: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3M16 8l3-3"/></svg>'
  };
  function mount(container, session, audio) {
    const { PRESETS, create, restore } = window.NP_MinesweeperModel;
    const { listen, setTimeout, clearTimeout, setInterval, clearInterval, onCleanup } = session;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch (_) {}
    const stats = {};
    for (const id of Object.keys(PRESETS)) {
      const s = saved?.stats?.[id];
      stats[id] = {
        played: Number.isSafeInteger(s?.played) && s.played >= 0 ? s.played : 0,
        won: Number.isSafeInteger(s?.won) && s.won >= 0 ? s.won : 0,
        bestMs: Number.isFinite(s?.bestMs) && s.bestMs >= 0 && s.bestMs <= 604800000 ? s.bestMs : null
      };
      stats[id].won = Math.min(stats[id].won, stats[id].played);
    }
    const compact = window.matchMedia?.('(max-width: 520px)').matches;
    const preferred = Object.hasOwn(PRESETS, saved?.difficulty) ? saved.difficulty : (compact ? 'pocket' : 'beginner');
    let board = restore(saved?.board) || create(preferred);
    let elapsed = board.view().status === 'playing' && Number.isFinite(saved?.elapsed) && saved.elapsed >= 0 ? Math.min(saved.elapsed, 604800000) : 0;
    let startedAt = null, ticker = null, paused = board.view().status === 'playing', alive = true;
    let mode = 'reveal', focusIndex = 0, pointer = null, holdTimer = null;
    const suppressedClicks = new Map();
    let cellEls = [], rendered = [], toastTimer = null, pendingDifficulty = null;
    let storageAvailable = true;
    const now = () => performance.now();
    const terminal = () => ['won', 'lost'].includes(board.view().status);
    const duration = () => elapsed + (startedAt === null ? 0 : Math.max(0, now() - startedAt));
    const timeText = ms => {
      const seconds = Math.floor(ms / 1000);
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    };

    container.classList.add('dm-host');
    container.innerHTML = `
      <section class="dm-game" aria-label="Dò Mìn">
        <div class="dm-controls">
          <label class="dm-difficulty"><select id="dmDifficulty" aria-label="Chọn bàn chơi">${Object.entries(PRESETS).map(([id, p]) => `<option value="${id}">${p.cols}×${p.rows}</option>`).join('')}</select></label>
          <button class="dm-button" id="dmRestart" type="button">Ván mới</button>
        </div>
        <div class="dm-confirm" id="dmConfirm" hidden role="group" aria-label="Xác nhận ván mới">
          <span>Chơi lại?</span>
          <button class="dm-button dm-primary" id="dmConfirmYes" type="button">Bắt đầu</button><button class="dm-button" id="dmConfirmNo" type="button">Chơi tiếp</button>
        </div>
        <div class="dm-hud">
          <div><span class="dm-hud-label">Cờ</span><strong id="dmMines">10</strong></div>
          <div><span class="dm-hud-label">Giờ</span><strong id="dmTime">0:00</strong></div>
          <div hidden><span class="dm-hud-label">Ô an toàn</span><strong id="dmProgress">0 / 71</strong></div>
        </div>
        <div class="dm-toolrow">
          <div class="dm-modes" role="group" aria-label="Thao tác chạm">
            <button class="dm-button dm-mode" id="dmRevealMode" type="button" aria-pressed="true">Mở</button>
            <button class="dm-button dm-mode" id="dmFlagMode" type="button" aria-pressed="false">${ICONS.flag} Cờ</button>
            <button class="dm-button dm-mode" id="dmQuestionMode" type="button" aria-pressed="false" aria-label="Đánh dấu chưa chắc" title="Dấu hỏi · Q">?</button>
          </div>
          <button class="dm-button" id="dmPan" type="button" aria-label="Cuộn ngang sang phải" hidden>→</button>
          <button class="dm-button" id="dmPause" type="button" aria-label="Tạm dừng">Ⅱ</button>
        </div>
        <p class="np-game-sr" id="dmScrollHint">Có thể cuộn bàn ngang / dọc. Chọn “Bỏ túi” để dễ chơi trên điện thoại.</p>
        <div class="dm-board-wrap">
          <div class="dm-scroll" id="dmScroll"><div class="dm-grid" id="dmGrid" role="grid" aria-label="Bàn Dò Mìn" aria-describedby="dmKeyboardHelp"></div></div>
          <div class="dm-pause-cover" id="dmPauseCover" hidden><strong>Tạm dừng</strong><button class="dm-button dm-primary" id="dmResume" type="button">Chơi tiếp</button></div>
        </div>
        <div class="dm-result" id="dmResult" hidden><h4 id="dmResultTitle"></h4><p id="dmResultText" class="np-game-sr"></p><button class="dm-button dm-primary" id="dmPlayAgain" type="button">Chơi lại</button></div>
        <p class="np-game-sr" id="dmStatus" role="status" aria-live="polite" aria-atomic="true">Chọn một ô để bắt đầu. Ô đầu và các ô sát cạnh luôn an toàn.</p>
        <div class="dm-records" id="dmRecords" hidden></div>
        <details class="dm-help np-help"><summary aria-label="Cách chơi">?</summary><p>Mở ô. Số là mìn quanh ô. Cắm cờ khi chắc; dùng ? để ghi ô còn phân vân.</p></details>
        <p id="dmKeyboardHelp" class="np-game-sr">Mũi tên di chuyển; Enter/Space mở hoặc đánh dấu theo chế độ; F cắm/gỡ cờ; Q đổi sang dấu hỏi; Home/End đến đầu/cuối hàng.</p>
        <p class="dm-storage-note" id="dmStorageNote" hidden>Không lưu được ván này.</p>
      </section>`;
    const el = id => container.querySelector('#' + id);
    const grid = el('dmGrid'), scroll = el('dmScroll'), select = el('dmDifficulty');

    function announce(text) { el('dmStatus').textContent = text; }
    function updatePanButton() {
      const pan = el('dmPan');
      const maxScroll = Math.max(0, (scroll.scrollWidth || 0) - (scroll.clientWidth || 0));
      pan.hidden = maxScroll <= 1;
      if (pan.hidden) return;
      const atRight = scroll.scrollLeft >= maxScroll - 2;
      pan.textContent = atRight ? '←' : '→';
      pan.setAttribute('aria-label', atRight ? 'Cuộn ngang sang trái' : 'Cuộn ngang sang phải');
      pan.disabled = paused || terminal();
    }
    function save() {
      if (!alive) return;
      try {
        localStorage.setItem(STORAGE, JSON.stringify({ version: 1, difficulty: board.view().presetId, stats,
          board: terminal() ? null : board.serialize(), elapsed: Math.round(duration()) }));
      } catch (_) {
        storageAvailable = false;
        el('dmStorageNote').hidden = false;
      }
    }
    function sound(kind) {
      if (!alive || !audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      try {
        audio.init();
        if (audio.ctx?.state === 'suspended') audio.ctx.resume().catch(() => {});
        const notes = kind === 'win' ? [523, 659, 784] : kind === 'loss' ? [147] : kind === 'flag' ? [640] : [420];
        notes.forEach((freq, i) => setTimeout(() => audio.playTone(freq, 'sine', kind === 'loss' ? 0.16 : 0.07, 0.035), i * 70));
      } catch (_) { /* Sound never blocks a move. */ }
    }
    function stopClock() {
      if (startedAt !== null) elapsed += Math.max(0, now() - startedAt);
      startedAt = null; clearInterval(ticker); ticker = null;
    }
    function startClock() {
      if (board.view().status !== 'playing' || paused || startedAt !== null) return;
      startedAt = now();
      ticker = setInterval(() => { el('dmTime').textContent = timeText(duration()); }, 250);
    }
    function cancelPointer(blockClick = false) {
      if (pointer) {
        cellEls[pointer.index]?.classList.remove('dm-holding');
        if (blockClick) suppressedClicks.set(pointer.id, pointer.index);
      }
      pointer = null; clearTimeout(holdTimer); holdTimer = null;
    }
    function cancelGesture() {
      if (!pointer) return;
      cellEls[pointer.index]?.classList.remove('dm-holding');
      clearTimeout(holdTimer); holdTimer = null;
      pointer.cancelled = true; pointer.held = false;
    }
    function setPaused(value, message) {
      if (board.view().status !== 'playing') return;
      cancelPointer(Boolean(pointer)); paused = value;
      if (paused) stopClock(); else startClock();
      render(); save();
      announce(message || (paused ? 'Đã tạm dừng. Bấm Chơi tiếp khi bạn sẵn sàng.' : 'Tiếp tục ván đang chơi.'));
      if (paused) el('dmResume').focus(); else cellEls[focusIndex]?.focus({ preventScroll: true });
    }
    function updateRecords() {
      const s = stats[board.view().presetId];
      el('dmRecords').textContent = `Nhanh nhất: ${s.bestMs === null ? 'chưa có' : timeText(s.bestMs)} · Thắng ${s.won} / ${s.played} ván đã bắt đầu`;
    }
    function buildBoard() {
      const v = board.view();
      select.value = v.presetId; grid.innerHTML = ''; cellEls = []; rendered = [];
      grid.style.setProperty('--dm-cols', v.cols);
      grid.setAttribute('aria-rowcount', v.rows); grid.setAttribute('aria-colcount', v.cols);
      el('dmScrollHint').hidden = v.presetId === 'pocket';
      for (let r = 0; r < v.rows; r++) {
        const row = document.createElement('div'); row.className = 'dm-row'; row.setAttribute('role', 'row'); row.setAttribute('aria-rowindex', r + 1);
        for (let c = 0; c < v.cols; c++) {
          const i = r * v.cols + c, cell = document.createElement('button');
          cell.type = 'button'; cell.className = 'dm-cell'; cell.dataset.cell = String(i);
          cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-colindex', c + 1);
          cell.tabIndex = i === focusIndex ? 0 : -1;
          row.appendChild(cell); cellEls.push(cell);
        }
        grid.appendChild(row);
      }
      scroll.scrollLeft = 0; scroll.scrollTop = 0;
    }
    function render() {
      const v = board.view(), ended = terminal();
      v.cells.forEach((cell, i) => {
        const mineVisible = (ended && cell.mine), wrongFlag = v.status === 'lost' && cell.flagged && !cell.mine;
        const flagVisible = cell.flagged || (v.status === 'won' && cell.mine);
        const key = `${cell.revealed}/${flagVisible}/${cell.questioned}/${mineVisible}/${wrongFlag}/${paused}/${v.status}/${v.explodedIndex === i}`;
        if (rendered[i] === key) return;
        rendered[i] = key;
        const node = cellEls[i];
        node.className = 'dm-cell' + (cell.revealed ? ' dm-open' : '') + (flagVisible ? ' dm-flagged' : '') + (mineVisible ? ' dm-mine' : '') + (wrongFlag ? ' dm-wrong' : '') + (v.explodedIndex === i ? ' dm-exploded' : '');
        node.dataset.number = String(cell.adjacent);
        let label = 'chưa mở';
        node.innerHTML = '';
        if (wrongFlag) { node.textContent = '×'; label = 'cắm cờ sai, ô an toàn'; }
        else if (flagVisible && (v.status !== 'lost' || cell.mine)) { node.innerHTML = ICONS.flag; label = ended ? 'mìn được đánh dấu' : 'đã cắm cờ'; }
        else if (mineVisible) { node.innerHTML = ICONS.mine; label = v.explodedIndex === i ? 'mìn đã nổ' : 'có mìn'; }
        else if (cell.questioned) { node.textContent = '?'; node.classList.add('dm-questioned'); label = 'chưa chắc có mìn'; }
        else if (cell.revealed) { node.textContent = cell.adjacent || ''; label = cell.adjacent ? `${cell.adjacent} mìn xung quanh` : 'ô trống'; }
        node.setAttribute('aria-label', `Hàng ${Math.floor(i / v.cols) + 1}, cột ${i % v.cols + 1}: ${label}`);
        node.setAttribute('aria-disabled', paused || ended ? 'true' : 'false');
        node.tabIndex = !paused && i === focusIndex ? 0 : -1;
      });
      el('dmMines').textContent = v.status === 'won' ? '0' : String(v.mines - v.flagCount);
      el('dmTime').textContent = timeText(duration());
      el('dmProgress').textContent = `${v.revealedCount} / ${v.rows * v.cols - v.mines}`;
      el('dmPause').disabled = v.status !== 'playing';
      el('dmPause').textContent = paused ? '▶' : 'Ⅱ';
      el('dmPause').setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      updatePanButton();
      el('dmPauseCover').hidden = !paused; grid.setAttribute('aria-hidden', paused ? 'true' : 'false');
      grid.inert = paused; scroll.classList.toggle('dm-is-paused', paused);
      el('dmResult').hidden = !ended;
      if (ended) {
        el('dmResultTitle').textContent = v.status === 'won' ? 'Thắng!' : 'Chạm mìn';
        el('dmResultText').textContent = v.status === 'won' ? `Bạn mở toàn bộ ô an toàn trong ${timeText(duration())}.` : `Bạn đã mở ${v.revealedCount} ô an toàn. Dấu × là cờ sai. Thử lại với một bàn mới nhé.`;
      }
      updateRecords();
    }
    function setMode(next) {
      mode = next;
      el('dmRevealMode').setAttribute('aria-pressed', mode === 'reveal' ? 'true' : 'false');
      el('dmFlagMode').setAttribute('aria-pressed', mode === 'flag' ? 'true' : 'false');
      el('dmQuestionMode').setAttribute('aria-pressed', mode === 'question' ? 'true' : 'false');
      announce(mode === 'flag' ? 'Chế độ cắm cờ. Chạm để cắm hoặc gỡ cờ.' : mode === 'question' ? 'Chế độ dấu hỏi. Chạm để đánh dấu hoặc bỏ dấu ô chưa chắc.' : 'Chế độ mở ô. Chạm ô số đã mở để mở nhanh.');
    }
    function act(index, action = mode) {
      if (!alive || paused || terminal() || !el('dmConfirm').hidden) return;
      const result = action === 'flag' ? board.flag(index) : action === 'question' ? board.question(index) : action === 'mark' ? board.cycleMark(index) : board.reveal(index);
      if (result.kind === 'none') {
        if (result.reason === 'flags-mismatch') announce('Số cờ xung quanh chưa khớp ô số. Kiểm tra cờ trước khi mở nhanh.');
        return;
      }
      if (result.started) { stats[board.view().presetId].played++; startClock(); }
      if (terminal()) {
        stopClock();
        if (result.status === 'won') {
          const s = stats[board.view().presetId]; s.won++;
          s.bestMs = s.bestMs === null ? duration() : Math.min(s.bestMs, duration());
        }
      }
      render(); save(); sound(result.kind);
      if (result.kind === 'flag') announce(board.view().cells[index].flagged ? 'Đã cắm cờ.' : 'Đã gỡ cờ.');
      else if (result.kind === 'question') announce(board.view().cells[index].questioned ? 'Đã đánh dấu chưa chắc.' : 'Đã bỏ dấu hỏi.');
      else if (result.kind === 'mark') announce(result.reason === 'flag' ? 'Đã cắm cờ.' : result.reason === 'question' ? 'Đã đánh dấu chưa chắc.' : 'Đã bỏ dấu đánh dấu.');
      else if (result.status === 'won') announce(`Bạn thắng trong ${timeText(duration())}. Tất cả ô an toàn đã mở.`);
      else if (result.status === 'lost') announce('Chạm mìn. Ván đã kết thúc. Bạn có thể xem lại bàn và chơi ván tiếp.');
      else announce(`Đã mở ${result.changed.length} ô. Còn ${board.view().rows * board.view().cols - board.view().mines - board.view().revealedCount} ô an toàn.`);
      if (!terminal()) result.changed.filter(i => board.view().cells[i].revealed).forEach(i => cellEls[i].classList.add('dm-just-opened'));
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => cellEls.forEach(node => node.classList.remove('dm-just-opened')), 180);
    }
    function newBoard(id) {
      cancelPointer(); stopClock(); clearTimeout(toastTimer);
      board = create(id); elapsed = 0; paused = false; focusIndex = 0;
      el('dmConfirm').hidden = true; pendingDifficulty = null;
      setMode('reveal'); buildBoard(); render(); save();
      announce('Ván mới. Chọn một ô để bắt đầu; vùng mở đầu luôn an toàn.');
      cellEls[0]?.focus({ preventScroll: true });
    }
    function requestNew(id) {
      if (board.view().status === 'playing') {
        pendingDifficulty = id;
        setPaused(true); el('dmConfirm').hidden = false;
        announce('Ván đang chơi sẽ kết thúc nếu bạn bắt đầu ván mới.');
        el('dmConfirmYes').focus();
      } else newBoard(id);
    }
    function eventIndex(e) {
      const cell = e.target.closest?.('[data-cell]');
      if (!cell || !grid.contains(cell)) return null;
      const index = Number(cell.dataset.cell);
      return Number.isInteger(index) && cellEls[index] === cell ? index : null;
    }
    function focusCell(index, move = false) {
      cellEls[focusIndex].tabIndex = -1; focusIndex = index;
      cellEls[index].tabIndex = 0;
      if (move) { cellEls[index].focus({ preventScroll: true }); cellEls[index].scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
    }
    listen(grid, 'focusin', e => { const i = eventIndex(e); if (i !== null && !paused) focusCell(i); });
    listen(grid, 'click', e => {
      const i = eventIndex(e); if (i === null) return;
      const suppressed = e.pointerId !== undefined ? suppressedClicks.has(e.pointerId) :
        e.detail !== 0 && [...suppressedClicks.values()].includes(i);
      if (suppressed) { suppressedClicks.delete(e.pointerId); if (e.pointerId === undefined) suppressedClicks.clear(); return; }
      focusCell(i); act(i);
    });
    listen(grid, 'contextmenu', e => {
      const i = eventIndex(e); if (i === null) return;
      e.preventDefault();
      if (pointer?.type === 'touch' || pointer?.type === 'pen' || [...suppressedClicks.values()].includes(i)) return;
      focusCell(i); act(i, 'mark');
    });
    listen(grid, 'keydown', e => {
      const i = eventIndex(e); if (i === null || paused) return;
      const v = board.view(), r = Math.floor(i / v.cols), c = i % v.cols;
      let next = i;
      if (e.key === 'ArrowLeft') next = r * v.cols + Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') next = r * v.cols + Math.min(v.cols - 1, c + 1);
      else if (e.key === 'ArrowUp') next = Math.max(0, r - 1) * v.cols + c;
      else if (e.key === 'ArrowDown') next = Math.min(v.rows - 1, r + 1) * v.cols + c;
      else if (e.key === 'Home') next = e.ctrlKey ? 0 : r * v.cols;
      else if (e.key === 'End') next = e.ctrlKey ? v.cells.length - 1 : (r + 1) * v.cols - 1;
      else if (['Enter', ' ', 'f', 'F', 'q', 'Q', '?'].includes(e.key)) {
        e.preventDefault(); if (!e.repeat) {
          if (e.key.toLowerCase() === 'q' || e.key === '?') setMode(mode === 'question' ? 'reveal' : 'question');
          else act(i, e.key.toLowerCase() === 'f' ? 'flag' : mode);
        }
        return;
      } else return;
      e.preventDefault(); focusCell(next, true);
    });
    listen(grid, 'pointerdown', e => {
      if (!pointer && e.isPrimary !== false) suppressedClicks.clear();
      if (e.pointerType === 'mouse' || paused || terminal()) return;
      const i = eventIndex(e); if (i === null) return;
      if (pointer || e.isPrimary === false) { cancelGesture(); suppressedClicks.set(e.pointerId, i); return; }
      if (board.view().cells[i].revealed) return;
      pointer = { id: e.pointerId, index: i, x: e.clientX, y: e.clientY, type: e.pointerType, held: false, cancelled: false };
      holdTimer = setTimeout(() => {
        if (!pointer || pointer.cancelled) return;
        pointer.held = true; cellEls[pointer.index].classList.add('dm-holding');
      }, 450);
    });
    listen(grid, 'pointermove', e => {
      if (pointer?.id === e.pointerId && Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 10) cancelGesture();
    });
    listen(grid, 'pointerup', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const held = pointer.held, cancelled = pointer.cancelled, i = pointer.index, target = eventIndex(e);
      const bounds = cellEls[i].getBoundingClientRect();
      const inside = e.clientX >= bounds.left && e.clientX <= bounds.right && e.clientY >= bounds.top && e.clientY <= bounds.bottom;
      cancelPointer(held || cancelled || target !== i || !inside);
      if (held && !cancelled && target === i && inside) { focusCell(i); act(i, mode === 'question' ? 'question' : 'flag'); }
    });
    listen(grid, 'pointerleave', () => { if (pointer) cancelGesture(); });
    listen(window, 'pointerup', e => { if (pointer?.id === e.pointerId) cancelPointer(true); });
    listen(window, 'pointercancel', e => { if (pointer?.id === e.pointerId) cancelPointer(true); });
    listen(el('dmRevealMode'), 'click', () => setMode('reveal'));
    listen(el('dmFlagMode'), 'click', () => setMode('flag'));
    listen(el('dmQuestionMode'), 'click', () => setMode('question'));
    listen(el('dmPan'), 'click', () => {
      const maxScroll = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      if (maxScroll <= 1) return;
      const target = scroll.scrollLeft >= maxScroll - 2 ? 0 : maxScroll;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      scroll.scrollTo({ left: target, behavior: reduced ? 'auto' : 'smooth' });
    });
    listen(scroll, 'scroll', updatePanButton, { passive: true });
    listen(window, 'resize', updatePanButton);
    listen(el('dmPause'), 'click', () => { if (el('dmConfirm').hidden) setPaused(!paused); });
    listen(el('dmResume'), 'click', () => { if (el('dmConfirm').hidden) setPaused(false); else el('dmConfirmYes').focus(); });
    listen(el('dmRestart'), 'click', () => requestNew(board.view().presetId));
    listen(el('dmPlayAgain'), 'click', () => newBoard(board.view().presetId));
    listen(select, 'change', () => {
      const id = select.value; select.value = board.view().presetId;
      if (Object.hasOwn(PRESETS, id) && id !== board.view().presetId) requestNew(id);
    });
    listen(el('dmConfirmYes'), 'click', () => { if (pendingDifficulty) newBoard(pendingDifficulty); });
    listen(el('dmConfirmNo'), 'click', () => { el('dmConfirm').hidden = true; pendingDifficulty = null; setPaused(false); });
    listen(document, 'visibilitychange', () => { if (document.hidden) { if (board.view().status === 'playing') setPaused(true); else save(); } });
    listen(window, 'pagehide', () => { if (board.view().status === 'playing') setPaused(true); else save(); });
    onCleanup(() => {
      stopClock(); cancelPointer(); save(); alive = false;
      container.classList.remove('dm-host');
    });
    buildBoard(); render();
    if (paused) announce('Đã tìm thấy ván đang chơi. Bấm Chơi tiếp để tiếp tục.');
    else if (saved && !storageAvailable) el('dmStorageNote').hidden = false;
  }
  window.NP_Minesweeper = { mount };
})();

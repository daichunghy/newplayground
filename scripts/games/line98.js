/* Original Line 98 view. All scheduling/input belongs to the supplied NP_GameSession. */
(function () {
  'use strict';
  const STORAGE = 'np_line98_v1', RECOVERY = STORAGE + '_recovery';
  const COLOR_NAMES = ['', 'đỏ', 'lục', 'lam', 'vàng', 'tím', 'hồng', 'xanh ngọc'];
  const SHAPE_NAMES = ['', 'tròn', 'tam giác', 'vuông', 'thoi', 'dấu cộng', 'sao', 'hai vạch'];
  const SHAPES = ['', '<circle cx="12" cy="12" r="4"/>', '<path d="M12 6 18 17H6Z"/>',
    '<rect x="7" y="7" width="10" height="10" rx="1"/>', '<path d="m12 5 7 7-7 7-7-7Z"/>',
    '<path d="M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5Z"/>', '<path d="m12 4 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8Z"/>',
    '<path d="M6 7h4v10H6Zm8 0h4v10h-4Z"/>'];
  const ballMarkup = c => `<span class="l98-ball" data-color="${c}" aria-hidden="true"><svg viewBox="0 0 24 24">${SHAPES[c]}</svg></span>`;
  const label = c => `${COLOR_NAMES[c]}, hình ${SHAPE_NAMES[c]}`;
  const safeNumber = v => Number.isSafeInteger(v) && v >= 0 && v <= 1000000000 ? v : 0;

  function mount(container, session, audio) {
    const { create, restore } = window.NP_Line98Model;
    const { listen, setTimeout, clearTimeout, onCleanup } = session;
    let raw = null, saved = null, legacy = 0, storageOK = true, preserveRaw = false;
    try {
      raw = localStorage.getItem(STORAGE);
      if (raw) saved = JSON.parse(raw);
      legacy = safeNumber(Number(localStorage.getItem('np_line98_high_score')));
    } catch (_) { storageOK = false; }
    const restored = saved?.version === 1 ? restore(saved.board) : null;
    if (raw && !restored) preserveRaw = true;
    let model = restored || create(), bankedBest = safeNumber(saved?.best), paused = Boolean(restored && model.view().status === 'playing');
    let selected = null, focusIndex = 0, busy = false, alive = true, confirming = false, pausedBeforeConfirm = false;
    let moving = null, animation = null, phaseTimer = null, effectTimer = null;
    let pointer = null, suppression = new Map(), cellEls = [];
    let motionEnabled = saved?.motion !== false;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => motionEnabled && !reduced?.matches;

    container.classList.add('l98-host');
    container.innerHTML = `
      <section class="l98-game" aria-label="Line 98">
        <div class="l98-hud"><div><span>Điểm</span><strong id="l98Score">0</strong></div><div><span>Kỷ lục</span><strong id="l98Best">0</strong></div><div hidden><span>Ô trống</span><strong id="l98Free">78<span> / 81</span></strong></div></div>
        <div class="l98-next-row"><div><span class="l98-next-label">Tiếp</span><div class="l98-next" id="l98Next" aria-label="Ba bóng tiếp theo"></div></div><p id="l98MoveCount" hidden>Lượt 0</p></div>
        <div class="l98-toolbar"><button class="l98-button" id="l98Undo" type="button" aria-label="Đi lại một nước">↶</button><button class="l98-button" id="l98Deselect" type="button" aria-label="Bỏ chọn">×</button><button class="l98-button" id="l98Pause" type="button" aria-label="Tạm dừng">Ⅱ</button><button class="l98-button l98-pan" id="l98Pan" type="button" aria-label="Cuộn ngang sang phải" hidden>→</button><button class="l98-button l98-primary" id="l98New" type="button" aria-label="Ván mới">↻</button></div>
        <div class="l98-confirm" id="l98Confirm" hidden role="group" aria-label="Xác nhận ván mới"><p>Chơi lại?</p><button class="l98-button l98-primary" id="l98ConfirmYes" type="button">Bắt đầu</button><button class="l98-button" id="l98ConfirmNo" type="button">Chơi tiếp</button></div>
        <p class="np-game-sr">Trên màn hình nhỏ, vuốt bàn hoặc dùng nút mũi tên để xem các cột. Mỗi ô vẫn đủ lớn để chạm.</p>
        <div class="l98-board-shell"><div class="l98-scroll" id="l98Scroll"><div class="l98-grid" id="l98Grid" role="grid" aria-label="Bàn Line 98, 9 hàng 9 cột" aria-rowcount="9" aria-colcount="9" aria-describedby="l98KeyboardHelp"></div></div><div class="l98-cover" id="l98Cover" hidden><span class="l98-cover-symbol" aria-hidden="true">Ⅱ</span><strong>Tạm dừng</strong><button class="l98-button l98-primary" id="l98Resume" type="button">Chơi tiếp</button></div></div>
        <p class="np-game-sr" id="l98Status" role="status" aria-live="polite" aria-atomic="true">Chọn một bóng, rồi chọn ô trống. Ghép từ 5 bóng cùng màu để mở đường.</p>
        <div class="l98-result" id="l98Result" hidden><h4 id="l98ResultTitle"></h4><p id="l98ResultText" class="np-game-sr"></p><button class="l98-button l98-primary" id="l98Again" type="button">Chơi lại</button></div>
        <div class="l98-footer" hidden><span id="l98Progress">0 bóng đã xóa</span><button class="l98-button l98-motion" id="l98Motion" type="button" aria-pressed="true">Chuyển động: bật</button></div>
        <details class="l98-help np-help"><summary aria-label="Cách chơi">?</summary><p>Chọn bóng, chọn ô. Ghép 5 bóng cùng màu.</p></details>
        <p id="l98KeyboardHelp" class="np-game-sr">Mũi tên đổi ô; Enter/Space chọn; U đi lại; B bỏ chọn; Home/End đầu/cuối hàng.</p>
        <p class="l98-legacy" id="l98Legacy" hidden></p><p class="l98-storage-note" id="l98StorageNote" hidden></p>
      </section>`;
    const el = id => container.querySelector('#' + id);
    const grid = el('l98Grid'), scroll = el('l98Scroll');
    const announce = text => { el('l98Status').textContent = text; };
    function updatePanButton() {
      const pan = el('l98Pan');
      const maxScroll = Math.max(0, (scroll.scrollWidth || 0) - (scroll.clientWidth || 0));
      pan.hidden = maxScroll <= 1;
      if (pan.hidden) return;
      const atRight = scroll.scrollLeft >= maxScroll - 2;
      pan.textContent = atRight ? '←' : '→';
      pan.setAttribute('aria-label', atRight ? 'Cuộn ngang sang trái' : 'Cuộn ngang sang phải');
      pan.disabled = paused || confirming;
    }
    function storageNotice(message) { el('l98StorageNote').hidden = false; el('l98StorageNote').textContent = message; }
    if (!storageOK) storageNotice('Chưa đọc được dữ liệu đã lưu. Bạn vẫn có thể chơi; việc lưu có thể không khả dụng.');
    if (legacy) { el('l98Legacy').hidden = false; el('l98Legacy').textContent = `Kỷ lục bản cũ: ${legacy}. Giữ riêng vì cách tính điểm đã thay đổi.`; }
    function save() {
      if (!alive) return;
      try {
        // Preserve an unknown/corrupt save before replacing it. If backup fails, never overwrite it.
        if (preserveRaw) { localStorage.setItem(RECOVERY, raw); preserveRaw = false; storageNotice('Bản lưu cũ không đọc được đã được giữ lại để khôi phục. Ván mới đang dùng bộ lưu riêng.'); }
        localStorage.setItem(STORAGE, JSON.stringify({ version: 1, best: bankedBest, motion: motionEnabled, board: model.serialize() }));
      } catch (_) { storageNotice('Không lưu được ván này.'); }
    }
    function warmAudio() {
      if (!audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      try { audio.init(); if (audio.ctx?.state === 'suspended') audio.ctx.resume().catch(() => {}); } catch (_) {}
    }
    function sound(kind) {
      if (!alive || paused || !audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      try {
        const notes = kind === 'clear' ? [523, 659, 784] : kind === 'loss' ? [196, 147] : kind === 'blocked' ? [180] : [440];
        notes.forEach((hz, i) => setTimeout(() => {
          if (alive && !paused && !window.NEWPLAYGROUND_MUTED && !window.NP_Audio?.isMuted) {
            try { audio.playTone(hz, 'sine', 0.07, 0.035); } catch (_) { /* Audio failure must not stop interaction. */ }
          }
        }, i * 65));
      } catch (_) {}
    }
    function buildBoard() {
      for (let r = 0; r < 9; r++) {
        const row = document.createElement('div'); row.className = 'l98-row'; row.setAttribute('role', 'row'); row.setAttribute('aria-rowindex', r + 1);
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement('button'), i = r * 9 + c;
          cell.type = 'button'; cell.className = 'l98-cell'; cell.dataset.cell = String(i); cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-colindex', c + 1);
          row.appendChild(cell); cellEls.push(cell);
        }
        grid.appendChild(row);
      }
    }
    function paintBoard(cells = model.view().board) {
      const reached = new Set(selected === null ? [] : model.reachable(selected));
      const ended = model.view().status === 'lost';
      cells.forEach((color, i) => {
        const cell = cellEls[i];
        if (cell.dataset.color !== String(color)) { cell.innerHTML = color ? ballMarkup(color) : ''; cell.dataset.color = String(color); }
        cell.classList.toggle('l98-selected', i === selected);
        cell.classList.toggle('l98-reachable', !color && reached.has(i));
        cell.setAttribute('aria-selected', i === selected ? 'true' : 'false');
        cell.setAttribute('aria-disabled', paused || busy || ended || confirming ? 'true' : 'false');
        cell.setAttribute('aria-label', `Hàng ${Math.floor(i / 9) + 1}, cột ${i % 9 + 1}: ${color ? label(color) : 'ô trống'}${i === selected ? ', đang chọn' : reached.has(i) ? ', có thể đến' : ''}`);
        cell.tabIndex = !paused && !confirming && i === focusIndex ? 0 : -1;
      });
    }
    function render() {
      const v = model.view(), ended = v.status === 'lost';
      paintBoard();
      el('l98Score').textContent = String(v.score); el('l98Best').textContent = String(Math.max(bankedBest, v.score));
      el('l98Free').textContent = `${v.free} / 81`; el('l98Free').classList.toggle('l98-low-space', v.free <= 12);
      el('l98MoveCount').textContent = `Lượt ${v.moves}`; el('l98Progress').textContent = `${v.cleared} bóng đã xóa`;
      el('l98Next').innerHTML = v.next.map(ballMarkup).join('');
      el('l98Next').setAttribute('aria-label', `Ba bóng tiếp theo: ${v.next.map(label).join('; ')}`);
      el('l98Undo').disabled = !v.canUndo || paused || confirming;
      el('l98Deselect').disabled = selected === null || busy || paused || confirming;
      el('l98Pause').disabled = ended || confirming; el('l98Pause').textContent = paused ? '▶' : 'Ⅱ'; el('l98Pause').setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      el('l98Cover').hidden = !paused; grid.inert = paused || confirming; grid.setAttribute('aria-hidden', paused ? 'true' : 'false');
      scroll.classList.toggle('l98-is-paused', paused); grid.setAttribute('aria-busy', busy ? 'true' : 'false');
      el('l98Result').hidden = !ended;
      if (ended) { el('l98ResultTitle').textContent = `Hết chỗ · ${v.score} điểm`; el('l98ResultText').textContent = `Bạn đã xóa ${v.cleared} bóng. Thử giữ một lối trống qua giữa bàn trong ván tiếp theo.`; }
      el('l98Motion').setAttribute('aria-pressed', motion() ? 'true' : 'false');
      el('l98Motion').textContent = reduced?.matches ? 'Chuyển động: giảm theo thiết bị' : `Chuyển động: ${motionEnabled ? 'bật' : 'tắt'}`;
      grid.classList.toggle('l98-no-motion', !motion());
      updatePanButton();
    }
    function clearEffects() {
      clearTimeout(phaseTimer); clearTimeout(effectTimer); phaseTimer = null; effectTimer = null;
      if (animation) { animation.cancel(); animation = null; }
      if (moving) { moving.remove(); moving = null; }
      cellEls.forEach(c => c.classList.remove('l98-path', 'l98-clearing', 'l98-spawned', 'l98-blocked'));
      busy = false;
    }
    function finishMotion() { clearEffects(); render(); }
    function animateTurn(result) {
      if (!motion() || typeof cellEls[0].animate !== 'function') { render(); return; }
      busy = true; render(); paintBoard(result.afterMove.map((c, i) => i === result.to ? 0 : c));
      result.path.forEach(i => cellEls[i].classList.add('l98-path'));
      const gridRect = grid.getBoundingClientRect(), start = cellEls[result.from].getBoundingClientRect();
      moving = document.createElement('div'); moving.className = 'l98-mover'; moving.innerHTML = ballMarkup(result.color);
      moving.style.width = start.width + 'px'; moving.style.height = start.height + 'px'; moving.setAttribute('aria-hidden', 'true'); grid.appendChild(moving);
      const keyframes = result.path.map(i => {
        const rect = cellEls[i].getBoundingClientRect();
        return { transform: `translate(${rect.left - gridRect.left}px, ${rect.top - gridRect.top}px)` };
      });
      const duration = Math.min(180, 60 + (result.path.length - 1) * 12);
      animation = moving.animate(keyframes, { duration, easing: 'linear', fill: 'forwards' });
      phaseTimer = setTimeout(() => {
        if (!alive || paused) return;
        animation?.cancel(); animation = null; moving?.remove(); moving = null;
        cellEls.forEach(c => c.classList.remove('l98-path'));
        paintBoard(result.afterSpawn || result.afterMove);
        result.spawned.forEach(({ index }) => cellEls[index].classList.add('l98-spawned'));
        result.removed.forEach(({ index }) => cellEls[index].classList.add('l98-clearing'));
        phaseTimer = setTimeout(finishMotion, result.removed.length ? 110 : 80);
      }, duration);
    }
    function showPath(index) {
      cellEls.forEach(c => c.classList.remove('l98-path'));
      if (selected === null || busy || paused || confirming) return;
      model.path(selected, index).forEach(i => cellEls[i].classList.add('l98-path'));
    }
    function act(index) {
      if (!alive || paused || confirming || model.view().status !== 'playing') return;
      if (busy) finishMotion();
      warmAudio();
      if (model.view().board[index]) {
        selected = selected === index ? null : index; render();
        announce(selected === null ? 'Đã bỏ chọn. Chọn một bóng khác để đi.' : `Đã chọn bóng ${label(model.view().board[index])}. Chọn ô trống có chấm để đi.`);
        sound('select'); return;
      }
      if (selected === null) { announce('Chọn một bóng trước, rồi chọn ô trống bạn muốn đến.'); return; }
      const result = model.move(selected, index);
      if (result.kind === 'none') {
        announce('Chưa có đường trống đến ô này. Bóng chỉ đi ngang hoặc dọc, không nhảy qua bóng khác.');
        cellEls[index].classList.add('l98-blocked'); clearTimeout(effectTimer); effectTimer = setTimeout(() => cellEls[index].classList.remove('l98-blocked'), 180); sound('blocked'); return;
      }
      selected = null; save(); animateTurn(result); sound(result.kind);
      const v = model.view();
      if (v.status === 'lost') announce(`Bàn đã đầy. Bạn đạt ${v.score} điểm. Có thể đi lại nước cuối hoặc bắt đầu ván mới.`);
      else if (result.removed.length) announce(`Xóa ${result.removed.length} bóng, cộng ${result.points} điểm. ${result.replenished.length ? 'Sạch bàn! Thêm ba bóng xem trước để tiếp tục.' : result.spawned.length ? 'Bóng mới vừa tạo đường.' : 'Được đi tiếp, không thêm bóng.'} Còn ${v.free} ô trống.`);
      else announce(`Đã đi và thêm ${result.spawned.length} bóng. Còn ${v.free} ô trống. ${v.free <= 12 ? 'Bàn sắp đầy; hãy giữ đường đi mở.' : 'Chọn bóng cho lượt tiếp theo.'}`);
    }
    function cancelPointer(block = true) {
      if (pointer && block) suppression.set(pointer.id, pointer.index);
      pointer = null;
    }
    function pause(value) {
      if (!alive || confirming || model.view().status === 'lost') return;
      cancelPointer(); finishMotion(); paused = value; selected = null; render(); save();
      announce(paused ? 'Đã tạm dừng. Ván sẽ tiếp tục khi bạn sẵn sàng.' : 'Tiếp tục. Chọn bóng rồi chọn ô trống.');
      if (paused) el('l98Resume').focus(); else cellEls[focusIndex].focus({ preventScroll: true });
    }
    function undo() {
      if (paused || confirming || !alive) return;
      clearEffects(); cancelPointer();
      if (!model.undo()) { render(); return; }
      selected = null; render(); save();
      announce('Đã đi lại nước cuối. Bàn, điểm, bóng tiếp theo và chuỗi ngẫu nhiên được khôi phục.');
    }
    function newGame() {
      clearEffects(); cancelPointer(); bankedBest = Math.max(bankedBest, model.view().score);
      model = create(); paused = false; confirming = false; selected = null; focusIndex = 0;
      el('l98Confirm').hidden = true; render(); save(); cellEls[0].focus({ preventScroll: true });
      announce('Ván mới. Ghép từ 5 bóng cùng màu; giữ lối trống để bóng đi qua.');
    }
    function requestNew() {
      if (confirming) return;
      if (model.view().moves === 0 || model.view().status === 'lost') { newGame(); return; }
      clearEffects(); cancelPointer(); selected = null; pausedBeforeConfirm = paused; paused = true; confirming = true;
      el('l98Confirm').hidden = false; render(); el('l98ConfirmYes').focus();
    }
    function eventIndex(e) {
      const cell = e.target.closest?.('[data-cell]');
      if (!cell || !grid.contains(cell)) return null;
      const i = Number(cell.dataset.cell); return Number.isInteger(i) && cellEls[i] === cell ? i : null;
    }
    function focusCell(index, actual = false) {
      if (paused || confirming) return;
      cellEls[focusIndex].tabIndex = -1; focusIndex = index; cellEls[index].tabIndex = 0;
      if (actual) { cellEls[index].focus({ preventScroll: true }); cellEls[index].scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
    }
    listen(grid, 'focusin', e => { const i = eventIndex(e); if (i !== null) { focusCell(i); showPath(i); } });
    listen(grid, 'click', e => {
      const i = eventIndex(e); if (i === null) return;
      const blocked = e.pointerId !== undefined ? suppression.has(e.pointerId) : e.detail !== 0 && [...suppression.values()].includes(i);
      if (blocked) { suppression.delete(e.pointerId); if (e.pointerId === undefined) suppression.clear(); return; }
      focusCell(i); act(i);
    });
    listen(grid, 'keydown', e => {
      const i = eventIndex(e); if (i === null || paused || confirming) return;
      const r = Math.floor(i / 9), c = i % 9; let next = i;
      if (e.key === 'ArrowLeft') next = r * 9 + Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') next = r * 9 + Math.min(8, c + 1);
      else if (e.key === 'ArrowUp') next = Math.max(0, r - 1) * 9 + c;
      else if (e.key === 'ArrowDown') next = Math.min(8, r + 1) * 9 + c;
      else if (e.key === 'Home') next = e.ctrlKey ? 0 : r * 9;
      else if (e.key === 'End') next = e.ctrlKey ? 80 : r * 9 + 8;
      else if (['Enter', ' ', 'u', 'U', 'b', 'B'].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) {
          if (e.key.toLowerCase() === 'u') undo();
          else if (e.key.toLowerCase() === 'b') { selected = null; showPath(i); render(); announce('Đã bỏ chọn.'); }
          else act(i);
        }
        return;
      } else return;
      e.preventDefault(); focusCell(next, true); showPath(next);
    });
    listen(grid, 'pointerdown', e => {
      const i = eventIndex(e); if (i === null) return;
      if (!pointer && e.isPrimary !== false) suppression.clear();
      if (pointer || e.isPrimary === false) { if (pointer) pointer.cancelled = true; suppression.set(e.pointerId, i); return; }
      pointer = { id: e.pointerId, index: i, x: e.clientX, y: e.clientY, cancelled: paused || busy || confirming };
    });
    listen(grid, 'pointermove', e => {
      if (pointer?.id === e.pointerId && Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 10) pointer.cancelled = true;
      if (e.pointerType === 'mouse' && !pointer) { const i = eventIndex(e); if (i !== null) showPath(i); }
    });
    listen(grid, 'pointerup', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const rect = cellEls[pointer.index].getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      cancelPointer(pointer.cancelled || !inside || eventIndex(e) !== pointer.index);
    });
    listen(grid, 'pointerleave', () => { if (pointer) pointer.cancelled = true; if (!busy) cellEls.forEach(c => c.classList.remove('l98-path')); });
    listen(window, 'pointerup', e => { if (pointer?.id === e.pointerId) cancelPointer(); });
    listen(window, 'pointercancel', e => { if (pointer?.id === e.pointerId) cancelPointer(); });
    listen(window, 'blur', () => { cancelPointer(); finishMotion(); });
    listen(window, 'resize', () => { finishMotion(); updatePanButton(); });
    listen(scroll, 'scroll', () => { if (pointer) pointer.cancelled = true; if (busy) finishMotion(); updatePanButton(); }, { passive: true });
    listen(el('l98Pan'), 'click', () => {
      const maxScroll = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      if (maxScroll <= 1) return;
      const target = scroll.scrollLeft >= maxScroll - 2 ? 0 : maxScroll;
      scroll.scrollTo({ left: target, behavior: motion() ? 'smooth' : 'auto' });
    });
    listen(el('l98Undo'), 'click', undo);
    listen(el('l98Deselect'), 'click', () => { if (paused || busy || confirming) return; selected = null; showPath(focusIndex); render(); announce('Đã bỏ chọn.'); });
    listen(el('l98Pause'), 'click', () => pause(!paused));
    listen(el('l98Resume'), 'click', () => { if (confirming) el('l98ConfirmYes').focus(); else pause(false); });
    listen(el('l98New'), 'click', requestNew); listen(el('l98Again'), 'click', requestNew);
    listen(el('l98ConfirmYes'), 'click', () => { if (confirming) newGame(); });
    listen(el('l98ConfirmNo'), 'click', () => {
      if (!confirming) return;
      confirming = false; paused = pausedBeforeConfirm; el('l98Confirm').hidden = true; render();
      if (paused) el('l98Resume').focus(); else cellEls[focusIndex].focus({ preventScroll: true });
      announce('Đã giữ ván đang chơi.');
    });
    listen(el('l98Motion'), 'click', () => { motionEnabled = !motionEnabled; finishMotion(); save(); });
    if (reduced?.addEventListener) listen(reduced, 'change', finishMotion);
    listen(document, 'visibilitychange', () => { if (document.hidden) { cancelPointer(); if (!confirming) pause(true); save(); } });
    listen(window, 'pagehide', () => { cancelPointer(); if (!confirming) pause(true); save(); });
    onCleanup(() => { clearEffects(); cancelPointer(false); save(); alive = false; container.classList.remove('l98-host'); });
    buildBoard(); render(); save();
    if (paused) announce('Đã khôi phục ván đang chơi. Bấm Chơi tiếp để tiếp tục.');
    else if (restored?.view().status === 'lost') announce('Ván trước đã đầy bàn. Có thể đi lại nước cuối hoặc thử ván mới.');
  }
  window.NP_Line98 = Object.freeze({ mount });
})();

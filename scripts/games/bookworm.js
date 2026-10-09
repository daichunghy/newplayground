/* Original, touch-first word board. The host owns every listener through NP_GameSession. */
(function (root) {
  'use strict';

  function mount(container, session, audio = null, options = {}) {
    const M = root.NP_BookwormModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Mọt Sách Nối Chữ needs its model and an active game session');
    }
    const { listen, onCleanup } = session;
    const seedFactory = typeof options.seedFactory === 'function' ? options.seedFactory : () => {
      try {
        const values = new Uint32Array(1);
        root.crypto?.getRandomValues?.(values);
        if (values[0]) return values[0];
      } catch (_) { /* Use a local fallback when secure randomness is unavailable. */ }
      return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
    };
    let seed = (Number(seedFactory()) >>> 0) || 1;
    const makeModel = () => M.create({ seed });
    let model = makeModel(), path = [], alive = true, dragging = false, dragged = false,
      dragStarted = false, dragStartIndex = -1, dragStartX = 0, dragStartY = 0,
      dragPointerId = null, suppressClick = false;
    let message = 'Nối chữ liền kề, rồi nhấn Ghép từ. Dập tia lửa trước khi chạm đáy kệ.';
    container.classList.add('bw-host');
    container.innerHTML = `
      <section class="bw-game" aria-label="Mọt Sách Nối Chữ">
        <header class="bw-head">
          <div><h2>Mọt Sách Nối Chữ</h2><p class="bw-subtitle">Gom chữ · dập lửa · giữ kệ sách</p></div>
          <button class="bw-button bw-replay" id="bwReplay" type="button" aria-label="Chơi lại từ đầu">↻</button>
        </header>
        <div class="bw-hud" aria-label="Tiến độ">
          <div><span>Kệ</span><strong id="bwShelf">1 / 3</strong></div>
          <div><span>Điểm</span><strong id="bwScore">0 / 42</strong></div>
          <div><span>Lượt</span><strong id="bwTurns">12</strong></div>
          <div class="bw-fire-meter"><span>Tia lửa</span><strong id="bwFire">Kệ 3 · 2 lượt</strong></div>
        </div>
        <div class="bw-progress" id="bwProgress" role="group" aria-label="Ba kệ sách">
          ${M.LEVELS.map((level, i) => `<span class="bw-step" id="bwStep${i}" aria-label="Kệ ${i + 1}: ${level.name}">${i + 1}</span>`).join('')}
        </div>
        <div class="bw-board" id="bwBoard" role="group" aria-label="Lưới chữ tổ ong">
          ${Array.from({ length: M.ROWS }, (_, row) => `<div class="bw-row${row % 2 ? ' bw-row-offset' : ''}" role="group" aria-label="Hàng ${row + 1}">${Array.from({ length: M.COLS }, (_, col) => {
            const index = row * M.COLS + col;
            return `<button class="bw-letter" id="bwTile${index}" type="button" data-index="${index}" aria-pressed="false" aria-label="Chữ cái hàng ${row + 1}, cột ${col + 1}"></button>`;
          }).join('')}</div>`).join('')}
        </div>
        <div class="bw-wordbar">
          <div class="bw-word-readout" aria-label="Từ đang nối"><span>Từ</span><strong id="bwWord">—</strong><small id="bwWordLength">0 chữ</small></div>
          <div class="bw-actions" role="group" aria-label="Điều khiển chữ">
            <button class="bw-button" id="bwClear" type="button">Xóa đường</button>
            <button class="bw-button bw-primary" id="bwSubmit" type="button" disabled>Ghép từ</button>
          </div>
        </div>
        <p class="bw-status" id="bwStatus" role="status" aria-live="polite" aria-atomic="true"></p>
        <details class="bw-help"><summary>Điều khiển</summary><p>Chọn 3–7 chữ liền cạnh bằng chạm hoặc rê chuột; nhấn <strong>Ghép từ</strong>. Chữ quen thuộc bằng tiếng Anh. Mỗi từ hợp lệ giúp tia lửa tiến; dùng chữ đang cháy để đẩy lửa lên kệ trên.</p></details>
        <div class="bw-result" id="bwResult" hidden role="group" aria-label="Kết quả">
          <strong id="bwResultTitle"></strong><p id="bwResultText"></p>
          <button class="bw-button bw-primary" id="bwPlayAgain" type="button">Chơi lại</button>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const tiles = Array.from(container.querySelectorAll('.bw-letter'));
    const wordButton = el('bwSubmit');
    function chosenWord(board = model.view().board) { return path.map(index => board[index]).join(''); }
    function announce(text) { message = text; el('bwStatus').textContent = text; }
    function render() {
      if (!alive) return;
      const view = model.view(), word = chosenWord(view.board), selected = new Set(path);
      tiles.forEach((button, index) => {
        const letter = view.board[index];
        button.textContent = letter;
        button.classList.toggle('bw-selected', selected.has(index));
        button.classList.toggle('bw-fire', view.fire.index === index);
        button.setAttribute('aria-pressed', selected.has(index) ? 'true' : 'false');
        const row = Math.floor(index / M.COLS) + 1, col = (index % M.COLS) + 1;
        button.setAttribute('aria-label', `Chữ ${letter}, hàng ${row}, cột ${col}${view.fire.index === index ? ', đang bốc cháy' : ''}${selected.has(index) ? ', đã chọn' : ''}`);
      });
      el('bwShelf').textContent = `${view.stageIndex + 1} / ${view.stages.length}`;
      el('bwScore').textContent = `${view.score} / ${view.target}`;
      el('bwTurns').textContent = String(view.turnsLeft);
      el('bwFire').textContent = `Hàng ${view.fire.row + 1} · ${view.fire.beatsLeft} lượt`;
      el('bwWord').textContent = word || '—';
      el('bwWordLength').textContent = `${path.length} chữ`;
      wordButton.disabled = path.length < 3 || view.status !== 'playing';
      el('bwClear').disabled = path.length === 0 || view.status !== 'playing';
      view.stages.forEach((_, index) => {
        const step = el(`bwStep${index}`);
        step.classList.toggle('bw-step-current', index === view.stageIndex && view.status === 'playing');
        step.classList.toggle('bw-step-done', index < view.stageIndex || view.status === 'won');
      });
      el('bwResult').hidden = view.status === 'playing';
      if (view.status === 'won') {
        el('bwResultTitle').textContent = 'Kệ sách đã an toàn!';
        el('bwResultText').textContent = `Ba kệ được dọn lửa · ${view.totalScore} điểm.`;
      } else if (view.status === 'lost') {
        el('bwResultTitle').textContent = 'Lửa đã chạm đáy kệ.';
        el('bwResultText').textContent = `${view.totalScore} điểm · thử một đường chữ khác.`;
      }
      el('bwStatus').textContent = message;
    }
    function clearPath() { path = []; render(); }
    function choose(index) {
      if (!alive || model.view().status !== 'playing') return;
      if (path.at(-1) === index) return;
      const existing = path.indexOf(index);
      if (existing >= 0) path = path.slice(0, existing + 1);
      else if (!path.length || model.neighbors(path.at(-1)).includes(index)) path.push(index);
      else path = [index];
      render();
    }
    function submit() {
      if (!alive || model.view().status !== 'playing') return;
      const result = model.submit(path);
      if (!result.ok) {
        announce(result.reason === 'invalid-word' ? 'Từ này chưa thành từ quen thuộc. Hãy thêm, bỏ hoặc đổi chữ.' : 'Lượt này đã kết thúc.');
        render(); return;
      }
      path = [];
      if (result.status === 'won') announce(`“${result.word}” · +${result.points}. Bạn đã giữ an toàn cả ba kệ!`);
      else if (result.status === 'lost') announce(`“${result.word}” · +${result.points}. Tia lửa đã tới đáy kệ.`);
      else if (result.stageCleared !== null) announce(`“${result.word}” · +${result.points}${result.doused ? ' · dập tắt tia lửa!' : '.'} Kệ mới: ${model.view().stage}.`);
      else announce(`“${result.word}” · +${result.points}${result.doused ? ' · dập tắt tia lửa!' : '.'}`);
      render();
    }
    function replay() {
      seed = (Number(seedFactory()) >>> 0) || ((seed + 1) >>> 0) || 1;
      model = makeModel(); path = []; dragging = false; dragged = false; dragStarted = false;
      dragStartIndex = -1; dragPointerId = null; suppressClick = false;
      announce('Nối chữ liền kề, rồi nhấn Ghép từ. Dập tia lửa trước khi chạm đáy kệ.'); render();
      tiles[0]?.focus({ preventScroll: true });
    }
    function finishDrag(event = {}) {
      if (!dragging) return;
      if (dragPointerId !== null && event.pointerId !== undefined && event.pointerId !== dragPointerId) return;
      dragging = false; dragStarted = false; dragStartIndex = -1; dragPointerId = null;
      if (dragged) {
        suppressClick = true;
        session.setTimeout(() => { suppressClick = false; }, 0);
      }
    }

    tiles.forEach((button, index) => {
      listen(button, 'click', () => {
        if (suppressClick) { suppressClick = false; return; }
        choose(index);
      });
      listen(button, 'pointerdown', event => {
        if ((event.button !== undefined && event.button !== 0) || event.isPrimary === false || dragging) return;
        dragging = true; dragged = false; dragStarted = false; dragStartIndex = index;
        dragStartX = event.clientX || 0; dragStartY = event.clientY || 0; dragPointerId = event.pointerId ?? null;
      });
      listen(button, 'pointerenter', () => {
        if (!dragging) return;
        if (!dragStarted) { path = [dragStartIndex]; dragStarted = true; render(); }
        if (path.at(-1) === index) return;
        const before = path.length; choose(index);
        if (path.length !== before || path.at(-1) === index) dragged = true;
      });
      listen(button, 'pointerup', finishDrag);
      listen(button, 'pointercancel', finishDrag);
      listen(button, 'keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        const row = Math.floor(index / M.COLS), col = index % M.COLS;
        let target = null;
        if (event.key === 'ArrowLeft' && col > 0) target = index - 1;
        if (event.key === 'ArrowRight' && col < M.COLS - 1) target = index + 1;
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const direction = event.key === 'ArrowUp' ? -1 : 1;
          target = model.neighbors(index).filter(next => Math.sign(Math.floor(next / M.COLS) - row) === direction)
            .sort((a, b) => Math.abs((a % M.COLS) - col) - Math.abs((b % M.COLS) - col))[0] ?? null;
        }
        if (target !== null && tiles[target]) { event.preventDefault(); tiles[target].focus({ preventScroll: true }); }
      });
    });
    listen(root, 'pointerup', finishDrag);
    listen(root, 'pointercancel', finishDrag);
    listen(root.document, 'pointermove', event => {
      if (!dragging || (dragPointerId !== null && event.pointerId !== undefined && event.pointerId !== dragPointerId)) return;
      // A mouse released outside the page may not deliver pointerup back here.
      // Do not let later hover movement keep extending the old word.
      if (event.buttons === 0) { finishDrag(event); return; }
      if (!dragStarted) {
        if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) < 8) return;
        path = [dragStartIndex]; dragStarted = true; render();
      }
      // Touch browsers implicitly capture the pointer at its starting button. Hit testing
      // lets the drawn path follow the finger while tap-by-tap input stays available.
      const underFinger = root.document.elementFromPoint?.(event.clientX, event.clientY);
      const target = underFinger?.dataset?.index !== undefined ? underFinger :
        (event.target?.dataset?.index !== undefined ? event.target : null);
      if (!target) return;
      const index = Number(target.dataset.index);
      if (Number.isSafeInteger(index) && path.at(-1) !== index) {
        const before = path.length; choose(index);
        if (path.length !== before || path.at(-1) === index) dragged = true;
      }
    });
    listen(root, 'blur', finishDrag);
    listen(root.document, 'visibilitychange', () => {
      if (root.document.hidden) finishDrag();
    });
    listen(root, 'pagehide', finishDrag);
    listen(wordButton, 'click', submit);
    listen(el('bwClear'), 'click', clearPath);
    listen(el('bwReplay'), 'click', replay);
    listen(el('bwPlayAgain'), 'click', replay);
    onCleanup(() => { alive = false; path = []; container.innerHTML = ''; container.classList.remove('bw-host'); });
    render();
    return { getModel: () => model, replay, submit, clear: clearPath };
  }

  root.NP_Bookworm = { mount };
})(typeof window === 'object' ? window : null);

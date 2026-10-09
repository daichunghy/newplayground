/* Original 2048 presentation. Source study and deliberate deviations are recorded in docs/games. */
(function () {
  'use strict';
  const STATE_KEY = 'np_2048_state_v1', BEST_KEY = 'np_2048_best_v1';
  const directionForSwipe = (dx, dy) => !Number.isFinite(dx) || !Number.isFinite(dy) ? null : Math.max(Math.abs(dx), Math.abs(dy)) <= 10 ? null :
    Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  function mount(container, session, audio) {
    const { setTimeout, clearTimeout, listen, onCleanup } = session;
    const Model = window.NP_2048Model;
    let alive = true, storageMessage = '', preserveFutureSave = false, externalSaveChanged = false, saved = null;
    const parseBest = raw => typeof raw === 'string' && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : 0;
    let best = 0;
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        try { saved = JSON.parse(raw); } catch (_) { storageMessage = 'Bản lưu không đọc được. Bắt đầu một ván mới.'; }
        preserveFutureSave = Number.isInteger(saved?.version) && saved.version > 2;
      }
      best = Math.max(parseBest(localStorage.getItem(BEST_KEY)), parseBest(localStorage.getItem('np_2048_high')));
    } catch (_) { storageMessage = 'Không truy cập được bộ nhớ. Ván này chỉ giữ trong phiên đang mở.'; }
    let model = saved ? Model.restore(saved) : null;
    if (preserveFutureSave) storageMessage = 'Bản lưu thuộc phiên bản mới hơn được giữ nguyên. Ván thử này không ghi đè lên nó.';
    else if (saved && !model) storageMessage = 'Bản lưu không hợp lệ. Bắt đầu ván mới; kỷ lục hợp lệ được giữ lại.';
    const restored = !!model;
    model ||= Model.create(); best = Math.max(best, model.state().score);
    let paused = false, pointer = null, motionTimer = null, generation = 0, animations = [], confirm = false;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    container.classList.add('g2048-host');
    container.innerHTML = `
      <section class="g2048-game" aria-label="Trò chơi 2048">
        <header class="g2048-header"><div><h3>2048</h3></div>
          <div class="g2048-scores"><div><span>Điểm</span><strong id="g2048Score">0</strong></div><div><span>Kỷ lục</span><strong id="g2048Best">0</strong></div></div></header>
        <div class="g2048-toolbar"><button class="g2048-button" id="g2048NewBtn" type="button">Ván mới</button><button class="g2048-button" id="g2048Undo" type="button">Lùi 1 nước</button><button class="g2048-button" id="g2048Pause" type="button" aria-label="Tạm dừng">Ⅱ</button></div>
        <div class="g2048-confirm" id="g2048Confirm" hidden><span>Chơi lại?</span><button class="g2048-button g2048-primary" id="g2048ConfirmYes" type="button">Ván mới</button><button class="g2048-button" id="g2048ConfirmNo" type="button">Chơi tiếp</button></div>
        <div class="g2048-board" id="g2048Board">
          <div class="g2048-stage" id="g2048Grid" tabindex="0" role="group" aria-label="Bàn chơi 2048. Dùng phím mũi tên hoặc WASD để trượt." aria-describedby="g2048Instructions">
            <div class="g2048-background" id="g2048Background" aria-hidden="true"></div><div class="g2048-tiles" id="g2048Tiles" aria-hidden="true"></div>
          </div>
          <div class="g2048-overlay" id="g2048Overlay" hidden><h4 id="g2048ResultTitle"></h4><p id="g2048ResultText"></p><button class="g2048-button g2048-primary" id="g2048Continue" type="button">Tiếp tục</button><button class="g2048-button" id="g2048Again" type="button">Chơi lại</button></div>
          <div class="g2048-overlay" id="g2048PauseOverlay" hidden><h4>Tạm dừng</h4><button class="g2048-button g2048-primary" id="g2048Resume" type="button">Chơi tiếp</button></div>
        </div>
        <div class="g2048-direction-pad" role="group" aria-label="Nút trượt thay thế thao tác vuốt"><button id="g2048Up" class="g2048-button" aria-label="Trượt lên" type="button">↑</button><div><button id="g2048Left" class="g2048-button" aria-label="Trượt trái" type="button">←</button><button id="g2048Down" class="g2048-button" aria-label="Trượt xuống" type="button">↓</button><button id="g2048Right" class="g2048-button" aria-label="Trượt phải" type="button">→</button></div></div>
        <p id="g2048Status" class="np-game-sr" role="status" aria-live="polite" aria-atomic="true">${restored ? 'Đã khôi phục ván đang chơi.' : 'Sẵn sàng. Trượt theo một hướng để bắt đầu.'}</p>
        <p class="np-game-sr" id="g2048Instructions">Mũi tên / WASD khi bàn có focus, vuốt trên bàn hoặc bấm nút hướng. Hai ô bằng nhau ghép một lần mỗi lượt. Nước không đổi bàn không sinh ô mới.</p>
        <details class="g2048-help np-help"><summary aria-label="Cách chơi">?</summary><p>Vuốt ghép hai ô cùng số.</p><p>Luật gốc: <a href="https://github.com/gabrielecirulli/2048" target="_blank" rel="noopener">Gabriele Cirulli</a>.</p></details>
        <div class="np-game-sr"><table><caption>Bàn hiện tại, theo hàng và cột</caption><tbody id="g2048Readable"></tbody></table></div>
        <p id="g2048Storage" class="g2048-storage" hidden></p>
      </section>`;
    const el = id => container.querySelector('#' + id);
    const stage = el('g2048Grid'), tileLayer = el('g2048Tiles');
    el('g2048Background').innerHTML = '<span></span>'.repeat(16);
    function showStorage() { el('g2048Storage').textContent = storageMessage; el('g2048Storage').hidden = !storageMessage; }
    const announce = text => { el('g2048Status').textContent = text; };
    function persist(takeOwnership = false) {
      if (!alive) return;
      const state = model.state(); best = Math.max(best, state.score);
      try {
        best = Math.max(best, parseBest(localStorage.getItem(BEST_KEY)));
        localStorage.setItem(BEST_KEY, String(best));
        if (!preserveFutureSave && (takeOwnership || !externalSaveChanged)) {
          if (state.over) localStorage.removeItem(STATE_KEY);
          else localStorage.setItem(STATE_KEY, JSON.stringify(model.serialize()));
          externalSaveChanged = false;
        }
      } catch (_) { storageMessage = 'Không lưu được ván này.'; }
      showStorage();
    }
    function cancelMotion() {
      generation++; clearTimeout(motionTimer); motionTimer = null;
      animations.forEach(a => { try { a.cancel(); } catch (_) {} }); animations = [];
    }
    function tile(value, at, effect = '') {
      const node = document.createElement('div'); node.className = 'g2048-tile ' + effect;
      node.dataset.value = String(value); node.dataset.digits = String(String(value).length);
      node.style.transform = `translate(${at[1] * 100}%, ${at[0] * 100}%)`;
      const label = document.createElement('span'); label.textContent = String(value); node.appendChild(label); tileLayer.appendChild(node);
      return node;
    }
    function drawStable(transaction = null) {
      tileLayer.innerHTML = '';
      model.state().board.forEach((row, r) => row.forEach((value, c) => {
        if (!value) return;
        const merge = transaction?.merges?.some(m => m.at[0] === r && m.at[1] === c);
        const spawn = transaction?.spawned?.at[0] === r && transaction?.spawned?.at[1] === c;
        tile(value, [r, c], reduced?.matches ? '' : merge ? 'g2048-merged' : spawn ? 'g2048-spawned' : '');
      }));
    }
    function animate(transaction) {
      cancelMotion();
      if (reduced?.matches || !tileLayer.animate) { drawStable(transaction); return; }
      const version = generation; tileLayer.innerHTML = '';
      for (const move of transaction.movements) {
        const node = tile(move.value, move.to);
        if (move.from[0] !== move.to[0] || move.from[1] !== move.to[1]) {
          animations.push(node.animate([
            { transform: `translate(${move.from[1] * 100}%, ${move.from[0] * 100}%)` },
            { transform: `translate(${move.to[1] * 100}%, ${move.to[0] * 100}%)` }
          ], { duration: 100, easing: 'ease-in-out' }));
        }
      }
      motionTimer = setTimeout(() => {
        if (!alive || version !== generation) return;
        animations = []; motionTimer = null; drawStable(transaction);
      }, 100);
    }
    function update() {
      const s = model.state(), blocked = s.status !== 'playing' || paused || confirm;
      el('g2048Score').textContent = String(s.score); el('g2048Best').textContent = String(best);
      el('g2048Pause').disabled = s.status !== 'playing' || confirm;
      el('g2048Undo').disabled = !s.undoAvailable || paused || confirm;
      el('g2048Pause').textContent = paused ? '▶' : 'Ⅱ';
      el('g2048Pause').setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      el('g2048PauseOverlay').hidden = !paused;
      el('g2048Overlay').hidden = s.status === 'playing' || paused;
      el('g2048Continue').hidden = s.status !== 'won';
      el('g2048Continue').disabled = confirm; el('g2048Again').disabled = confirm; el('g2048Resume').disabled = confirm;
      stage.inert = blocked; stage.tabIndex = blocked ? -1 : 0;
      stage.setAttribute('aria-hidden', paused ? 'true' : 'false');
      el('g2048Board').classList.toggle('g2048-paused', paused);
      ['Up','Down','Left','Right'].forEach(d => { el('g2048' + d).disabled = blocked; });
      if (s.status === 'won') { el('g2048ResultTitle').textContent = '2048!'; el('g2048ResultText').textContent = `${s.score} điểm`; }
      if (s.status === 'lost') { el('g2048ResultTitle').textContent = 'Hết nước'; el('g2048ResultText').textContent = `${s.score} điểm`; }
      el('g2048Readable').innerHTML = '';
      s.board.forEach((row, r) => {
        const tr = document.createElement('tr');
        row.forEach((value, c) => { const td = document.createElement('td'); td.textContent = value || '·'; td.setAttribute('aria-label', `Hàng ${r + 1}, cột ${c + 1}: ${value || 'trống'}`); tr.appendChild(td); });
        el('g2048Readable').appendChild(tr);
      });
    }
    function sound(result) {
      if (!alive || !result.scoreDelta || !audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      try { audio.init?.(); if (audio.ctx?.state === 'suspended') audio.ctx.resume().catch(() => {}); audio.playTone(result.status === 'won' ? 784 : 440, 'sine', .09, .03); } catch (_) {}
    }
    function move(direction) {
      if (!alive || paused || confirm) return;
      const result = model.move(direction);
      if (!result.changed) { if (model.state().status === 'playing') announce('Hướng này chưa làm đổi bàn. Thử một hướng khác.'); return; }
      best = Math.max(best, result.score); persist(true); animate(result); update(); sound(result);
      announce(result.status === 'won' ? `Bạn thắng! Đạt 2048 với ${result.score} điểm. Chọn Tiếp tục chơi hoặc Chơi lại.` : result.status === 'lost' ? `Hết nước đi. Điểm ${result.score}.` : `${result.scoreDelta ? '+' + result.scoreDelta + ' điểm. ' : ''}Lượt ${result.moves}. Tổng điểm ${result.score}.`);
      if (result.status !== 'playing') el(result.status === 'won' ? 'g2048Continue' : 'g2048Again').focus();
    }
    function rewind() {
      if (!alive || paused || confirm || !model.state().undoAvailable) return;
      resetPointer(); cancelMotion();
      const result = model.undo();
      if (!result.changed) return;
      persist(true); drawStable(); update();
      announce(`Đã lùi một nước. Lượt ${result.moves}, ${result.score} điểm.`);
      stage.focus({ preventScroll:true });
    }
    function resetPointer() { pointer = null; }
    function pause(value) {
      if (model.state().status !== 'playing' || confirm) return;
      paused = value; resetPointer(); cancelMotion(); drawStable(); update(); persist();
      announce(paused ? 'Đã tạm dừng.' : 'Chơi tiếp.'); el(paused ? 'g2048Resume' : 'g2048Grid').focus();
    }
    function restart() {
      resetPointer(); cancelMotion(); model = Model.create(); paused = false; confirm = false;
      el('g2048Confirm').hidden = true; persist(true); drawStable(); update(); announce('Ván mới. Hai ô đã sẵn sàng.'); stage.focus();
    }
    function requestRestart() {
      if (model.state().moves > 0 && !model.state().over) {
        resetPointer(); cancelMotion(); drawStable(); confirm = true; el('g2048Confirm').hidden = false; update(); el('g2048ConfirmYes').focus();
      } else restart();
    }
    for (const direction of Model.DIRECTIONS) listen(el('g2048' + direction[0].toUpperCase() + direction.slice(1)), 'click', () => move(direction));
    listen(el('g2048NewBtn'), 'click', requestRestart); listen(el('g2048Again'), 'click', requestRestart);
    listen(el('g2048Undo'), 'click', rewind);
    listen(el('g2048ConfirmYes'), 'click', restart);
    listen(el('g2048ConfirmNo'), 'click', () => { confirm = false; el('g2048Confirm').hidden = true; update(); el(paused ? 'g2048Resume' : model.state().status === 'won' ? 'g2048Continue' : 'g2048Grid').focus(); });
    listen(el('g2048Continue'), 'click', () => { if (!confirm && !paused && model.continueGame()) { cancelMotion(); drawStable(); persist(true); update(); announce('Tiếp tục ván đã thắng. Thử tiến tới 4096!'); stage.focus(); } });
    listen(el('g2048Pause'), 'click', () => pause(!paused)); listen(el('g2048Resume'), 'click', () => pause(false));
    listen(container, 'keydown', e => {
      // Keep directional shortcuts scoped to the board. Bubbling from toolbar and
      // help controls used to advance the game while the player was navigating UI.
      if (e.target !== stage || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      const dir = { ArrowUp:'up', ArrowRight:'right', ArrowDown:'down', ArrowLeft:'left', w:'up', d:'right', s:'down', a:'left' }[e.key] || { W:'up',D:'right',S:'down',A:'left' }[e.key];
      if (dir) { e.preventDefault(); move(dir); }
    });
    listen(stage, 'pointerdown', e => {
      if (pointer || e.isPrimary === false) { resetPointer(); return; }
      if (paused || confirm || model.state().status !== 'playing' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pointer = { id:e.pointerId, x:e.clientX, y:e.clientY }; stage.focus({ preventScroll:true });
      try { stage.setPointerCapture?.(e.pointerId); } catch (_) {}
    });
    listen(stage, 'pointerup', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const dir = directionForSwipe(e.clientX - pointer.x, e.clientY - pointer.y); resetPointer();
      if (dir) move(dir);
    });
    listen(stage, 'pointercancel', resetPointer); listen(stage, 'lostpointercapture', resetPointer);
    listen(window, 'blur', () => { resetPointer(); if (model.state().status === 'playing' && !confirm) pause(true); });
    listen(document, 'visibilitychange', () => { if (document.hidden) { resetPointer(); if (model.state().status === 'playing' && !confirm) pause(true); persist(); } });
    listen(window, 'pagehide', () => persist());
    listen(window, 'storage', e => {
      if (e.key === BEST_KEY) { best = Math.max(best, parseBest(e.newValue)); update(); }
      if (e.key === STATE_KEY) {
        externalSaveChanged = true;
        announce('Ván trong tab khác vừa thay đổi. Tab này giữ bàn hiện tại; nước tiếp theo sẽ lưu theo tab này.');
      }
    });
    if (reduced?.addEventListener) listen(reduced, 'change', () => { cancelMotion(); drawStable(); });
    onCleanup(() => { resetPointer(); cancelMotion(); persist(); alive = false; container.classList.remove('g2048-host'); });
    persist(); drawStable(); update(); showStorage();
    setTimeout(() => { if (alive) el(model.state().status === 'won' ? 'g2048Continue' : model.state().status === 'lost' ? 'g2048Again' : 'g2048Grid').focus({ preventScroll:true }); }, 0);
  }
  window.NP_2048 = { mount, directionForSwipe };
})();

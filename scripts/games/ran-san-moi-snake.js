/* Rắn Săn Mồi view and input. All artwork is drawn with original CSS geometry. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NP_RanSanMoiSnake = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const SAVE_KEY = 'np_ran_san_moi_snake_best_v1';
  const KEY_DIR = Object.freeze({ ArrowUp: 'up', w: 'up', W: 'up', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left' });
  const DIR_LABEL = Object.freeze({ up: 'lên', right: 'phải', down: 'xuống', left: 'trái' });

  function mount(container, session) {
    const Model = window.NP_RanSanMoiSnakeModel;
    if (!Model) throw new Error('Snake model is unavailable');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    container.classList.add('sn-host');
    container.innerHTML = `
      <section class="sn-game" id="snGame" aria-label="Rắn Săn Mồi" tabindex="0">
        <header class="sn-header">
          <div><span class="sn-eyebrow">VƯỜN UỐN LƯỢN</span><h2>Rắn Săn Mồi</h2></div>
          <button class="sn-button sn-restart" id="snRestart" type="button" aria-label="Chơi ván mới">↻ <span>Chơi mới</span></button>
        </header>
        <div class="sn-hud" aria-label="Trạng thái ván chơi">
          <div><span>Điểm</span><strong id="snScore">0</strong></div>
          <div><span>Độ dài</span><strong id="snLength">3</strong></div>
          <div><span>Kỷ lục</span><strong id="snBest">0</strong></div>
          <div><span>Nhịp</span><strong id="snPace">1</strong></div>
        </div>
        <div class="sn-board-frame">
          <div class="sn-grid" id="snGrid" role="img" aria-label="Bàn chơi Rắn Săn Mồi"></div>
          <div class="sn-overlay" id="snOverlay" hidden>
            <div class="sn-overlay-card">
              <strong id="snOverlayTitle">Tạm dừng</strong>
              <p id="snOverlayText">Ván chơi đang tạm dừng.</p>
              <button class="sn-button sn-primary" id="snResume" type="button">Chơi tiếp</button>
              <button class="sn-button" id="snOverlayRestart" type="button">Chơi ván mới</button>
            </div>
          </div>
        </div>
        <div class="sn-playbar">
          <button class="sn-button" id="snPause" type="button" aria-label="Tạm dừng" disabled>Ⅱ Tạm dừng</button>
          <p class="sn-help">Mũi tên/WASD · Ăn hạt · Tránh va chạm</p>
        </div>
        <div class="sn-pad" role="group" aria-label="Điều khiển hướng">
          <span aria-hidden="true"></span><button class="sn-direction" data-dir="up" id="snUp" type="button" aria-label="Đi lên">↑</button><span aria-hidden="true"></span>
          <button class="sn-direction" data-dir="left" id="snLeft" type="button" aria-label="Đi trái">←</button><span class="sn-pad-center" aria-hidden="true">✦</span><button class="sn-direction" data-dir="right" id="snRight" type="button" aria-label="Đi phải">→</button>
          <span aria-hidden="true"></span><button class="sn-direction" data-dir="down" id="snDown" type="button" aria-label="Đi xuống">↓</button><span aria-hidden="true"></span>
        </div>
        <p class="sn-status" id="snStatus" role="status" aria-live="polite" aria-atomic="true">Chọn hướng để chơi.</p>
        <p class="sn-storage" id="snStorage" hidden>Không lưu được kỷ lục trên thiết bị này.</p>
        <p class="sn-sr" id="snInstructions">Điều khiển bằng phím mũi tên, WASD hoặc nút hướng. Ăn hạt để được 10 điểm và dài thêm một đốt. Không đâm vào tường hay thân mình. Phím P tạm dừng.</p>
      </section>`;
    const el = id => container.querySelector('#' + id);
    const game = el('snGame'), grid = el('snGrid');
    let seed = 0x51a9e;
    let model = Model.create({ seed });
    let best = 0, storageOK = true, paused = false, alive = true;
    let frame = null, lastFrameTime = null, accumulator = 0, lastStatus = '';
    const { width, height } = model.view();
    const cellEls = [];

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const saved = raw === null ? 0 : Number(raw);
      if (Number.isSafeInteger(saved) && saved >= 0 && saved <= 1000000000) best = saved;
    } catch (_) { storageOK = false; }

    grid.style.setProperty('--sn-cols', String(width));
    grid.style.setProperty('--sn-rows', String(height));
    grid.setAttribute('aria-describedby', 'snInstructions');
    for (let i = 0; i < width * height; i++) {
      const cell = document.createElement('span');
      cell.className = 'sn-cell'; cell.setAttribute('aria-hidden', 'true');
      grid.appendChild(cell); cellEls.push(cell);
    }

    function say(text) {
      if (text !== lastStatus) { el('snStatus').textContent = text; lastStatus = text; }
    }
    function persistBest(score) {
      if (score <= best) return;
      best = score;
      try { localStorage.setItem(SAVE_KEY, String(best)); }
      catch (_) { storageOK = false; }
    }
    function delayFor(view) { return Math.max(90, 180 - Math.floor((view.eaten || 0) / 5) * 14); }
    function stopLoop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; lastFrameTime = null; accumulator = 0;
    }
    function schedule() {
      if (alive && !paused && !document.hidden && model.view().status === 'running' && frame === null) {
        frame = requestAnimationFrame(loop);
      }
    }
    function render() {
      const v = model.view();
      persistBest(v.score);
      el('snScore').textContent = String(v.score);
      el('snLength').textContent = String(v.length);
      el('snBest').textContent = String(best);
      el('snPace').textContent = String(v.speedLevel);
      const body = new Map(v.snake.map((part, i) => [part.y * width + part.x, i]));
      const foodIndex = v.food ? v.food.y * width + v.food.x : -1;
      for (let i = 0; i < cellEls.length; i++) {
        const part = body.get(i);
        cellEls[i].className = 'sn-cell' + (part !== undefined ? (part === 0 ? ` sn-head sn-dir-${v.direction}` : ' sn-body') : '') + (i === foodIndex ? ' sn-food' : '');
      }
      grid.setAttribute('aria-label', `Bàn chơi ${width} cột, ${height} hàng. Rắn dài ${v.length}; ${v.score} điểm.`);
      const ended = v.status === 'lost' || v.status === 'won';
      const showOverlay = paused || ended;
      el('snOverlay').hidden = !showOverlay;
      el('snOverlayTitle').textContent = paused ? 'Tạm dừng' : v.status === 'won' ? 'Đầy khu vườn!' : 'Kết thúc ván';
      el('snOverlayText').textContent = paused ? `Bạn đang có ${v.score} điểm. Sẵn sàng đi tiếp?` : v.status === 'won' ? `Không còn chỗ trống. Bạn đạt ${v.score} điểm.` : `Rắn đã chạm ${v.reason === 'wall' ? 'mép bàn' : 'vào thân mình'} · ${v.score} điểm.`;
      el('snResume').hidden = !paused;
      el('snPause').disabled = paused || v.status !== 'running';
      el('snPause').textContent = paused ? '▶ Chơi tiếp' : 'Ⅱ Tạm dừng';
      el('snPause').setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      grid.inert = paused || ended;
      for (const button of container.querySelectorAll('.sn-direction')) button.disabled = paused || ended;
      el('snStorage').hidden = storageOK;
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || paused || document.hidden || model.view().status !== 'running') return;
      if (lastFrameTime === null) lastFrameTime = timestamp;
      accumulator += Math.min(250, Math.max(0, timestamp - lastFrameTime));
      lastFrameTime = timestamp;
      let ateAny = false;
      let result;
      while (accumulator >= delayFor(model.view()) && model.view().status === 'running') {
        accumulator -= delayFor(model.view());
        result = model.step();
        ateAny ||= result.ate;
      }
      const v = model.view();
      if (result || ateAny) render();
      if (v.status === 'lost') {
        stopLoop();
        say(`Chạm ${v.reason === 'wall' ? 'mép bàn' : 'vào thân mình'} · ${v.score} điểm. Chơi ván mới để thử lại.`);
      } else if (v.status === 'won') {
        stopLoop(); say(`Đã kín bàn! Bạn đạt ${v.score} điểm.`);
      } else if (ateAny) say(`Ăn hạt! +10 điểm · rắn dài ${v.length}.`);
      else schedule();
    }
    function begin(direction) {
      if (!alive || paused) return;
      const accepted = model.turn(direction);
      if (!accepted) return;
      const v = model.view(); render();
      if (v.moves === 0 && v.status === 'running') say(`Bắt đầu đi ${DIR_LABEL[direction]}.`);
      if (frame === null) { lastFrameTime = null; accumulator = 0; schedule(); }
      game.focus({ preventScroll: true });
    }
    function pause() {
      if (!alive || model.view().status !== 'running' || paused) return;
      paused = true; stopLoop(); render(); say('Đã tạm dừng.');
    }
    function resume() {
      if (!alive || !paused || document.hidden) return;
      paused = false; render(); say('Chơi tiếp.'); lastFrameTime = null; schedule(); game.focus({ preventScroll: true });
    }
    function restart() {
      if (!alive) return;
      stopLoop(); paused = false;
      seed = (seed + 0x9e3779b9) >>> 0;
      model = Model.create({ seed });
      render(); say('Ván mới sẵn sàng. Chọn hướng để chơi.'); game.focus({ preventScroll: true });
    }
    function togglePause() {
      if (paused) resume(); else pause();
    }
    function onKey(event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const direction = KEY_DIR[event.key];
      if (direction) { event.preventDefault(); begin(direction); return; }
      if (event.key === 'p' || event.key === 'P') { event.preventDefault(); togglePause(); }
      else if (event.key === 'Enter' && model.view().status === 'ready') { event.preventDefault(); begin('right'); }
      else if (event.key === 'Escape' && model.view().status === 'running') { event.preventDefault(); pause(); }
    }
    function onFocusLoss() {
      if (model.view().status === 'running' && !paused) pause();
    }
    function onVisibility() { if (document.hidden) onFocusLoss(); }
    listen(game, 'keydown', onKey);
    for (const button of container.querySelectorAll('.sn-direction')) {
      listen(button, 'click', () => { if (!button.disabled) begin(button.dataset.dir); });
    }
    listen(window, 'blur', onFocusLoss);
    listen(window, 'pagehide', onFocusLoss);
    listen(document, 'visibilitychange', onVisibility);
    listen(el('snPause'), 'click', togglePause);
    listen(el('snResume'), 'click', resume);
    listen(el('snRestart'), 'click', restart);
    listen(el('snOverlayRestart'), 'click', restart);
    listen(el('snGrid'), 'click', () => { if (model.view().status === 'ready') begin('right'); });
    onCleanup(() => { alive = false; stopLoop(); container.classList.remove('sn-host'); });
    render();
    return Object.freeze({ model: () => model, snapshot: () => model.view(), restart });
  }

  return Object.freeze({ mount, SAVE_KEY });
});

/* Original two-panel visual-search game; the only images are the paired authored SVGs. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_SpotDifferenceModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Tìm Điểm Khác Biệt needs its model and an active game session');
    }
    let model = M.create(), alive = true, frame = null, previous = null;
    const cursor = { side: 'a', x: 0.5, y: 0.5 };
    let cursorVisible = false, message = '·';
    const images = {};
    container.classList.add('sd-host');
    container.innerHTML = `
      <section class="sd-game" aria-label="Tìm Điểm Khác Biệt">
        <header class="sd-head"><h2>Tìm Điểm Khác Biệt</h2><div class="sd-actions">
          <button class="sd-button" id="sdPause" type="button" aria-label="Tạm dừng">||</button>
          <button class="sd-button" id="sdRestart" type="button" aria-label="Chơi lại">↻</button>
        </div></header>
        <p id="sdCue" class="sd-cue">Tìm 5 điểm · 3 cảnh</p>
        <div class="sd-hud" aria-label="Tiến độ ván"><strong id="sdScene">1 / 3 · Bờ biển</strong><strong id="sdFound">0 / 5</strong><strong id="sdTimer">2:30</strong><span id="sdMisses">●●●●●</span></div>
        <div class="sd-progress" aria-hidden="true"><span id="sdProgress"></span></div>
        <div id="sdImages" class="sd-images">
          <button class="sd-picture" id="sdImageA" data-side="a" type="button" aria-label="Ảnh A, chọn vùng để tìm điểm khác biệt">
            <img id="sdPhotoA" src="assets/spot-the-difference-a.svg" alt="Bờ biển với hải đăng, thuyền và mây" draggable="false">
            <span id="sdCursorA" class="sd-key-cursor" aria-hidden="true"></span>
            ${M.TARGETS.map((_, i) => `<span id="sdMarkA${i}" class="sd-found-marker" data-mark="${i}" aria-hidden="true">✓</span>`).join('')}
          </button>
          <button class="sd-picture" id="sdImageB" data-side="b" type="button" aria-label="Ảnh B, chọn vùng để tìm điểm khác biệt">
            <img id="sdPhotoB" src="assets/spot-the-difference-b.svg" alt="Bờ biển với hải đăng, thuyền và mây" draggable="false">
            <span id="sdCursorB" class="sd-key-cursor" aria-hidden="true"></span>
            ${M.TARGETS.map((_, i) => `<span id="sdMarkB${i}" class="sd-found-marker" data-mark="${i}" aria-hidden="true">✓</span>`).join('')}
          </button>
        </div>
        <p id="sdStatus" class="sd-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div id="sdOverlay" class="sd-overlay" hidden role="group" aria-label="Trạng thái ván">
          <div class="sd-overlay-card"><strong id="sdOverlayTitle"></strong><p id="sdOverlayCopy"></p>
            <button id="sdOverlayAction" class="sd-button sd-primary" type="button"></button>
          </div>
        </div>
      </section>`;
    const el = id => container.querySelector('#' + id);
    images.a = el('sdImageA'); images.b = el('sdImageB');

    function stopLoop() {
      if (frame !== null) session.cancelAnimationFrame(frame);
      frame = null; previous = null;
    }
    function destroy() {
      if (!alive) return;
      alive = false; stopLoop();
      container.classList.remove('sd-host');
      container.innerHTML = '';
    }
    function announce(text) { message = text; el('sdStatus').textContent = text; }
    function render() {
      if (!alive) return;
      const v = model.view(), playing = v.status === 'playing', paused = v.status === 'paused';
      el('sdScene').textContent = `${v.sceneNumber} / ${v.sceneCount}`;
      el('sdScene').setAttribute('aria-label', `Cảnh ${v.sceneNumber}: ${v.sceneName}`);
      el('sdFound').textContent = `${v.foundCount} / ${v.sceneTotal}`;
      el('sdTimer').textContent = `${Math.floor(v.timeLeft / 60000)}:${String(Math.ceil((v.timeLeft % 60000) / 1000)).padStart(2, '0')}`;
      el('sdMisses').textContent = '●'.repeat(v.maxMisses - v.misses) + '○'.repeat(v.misses);
      el('sdProgress').style.width = `${v.overallFoundCount / v.totalTargets * 100}%`;
      el('sdPhotoA').setAttribute('src', v.scene.a); el('sdPhotoB').setAttribute('src', v.scene.b);
      el('sdPhotoA').alt = `${v.sceneName}, ảnh A`;
      el('sdPhotoB').alt = `${v.sceneName}, ảnh B`;
      for (const side of ['a', 'b']) {
        const panel = images[side];
        panel.disabled = !playing;
        const keyCursor = el(`sdCursor${side.toUpperCase()}`);
        keyCursor.hidden = !(cursorVisible && cursor.side === side);
        keyCursor.style.left = `${cursor.x * 100}%`;
        keyCursor.style.top = `${cursor.y * 100}%`;
        v.scene.targets.forEach((_, index) => {
          const marker = el(`sdMark${side.toUpperCase()}${index}`), point = v.scene.targets[index][side];
          marker.hidden = !v.found[index];
          marker.style.left = `${point[0] * 100}%`; marker.style.top = `${point[1] * 100}%`;
        });
      }
      el('sdPause').disabled = v.status === 'won' || v.status === 'lost';
      el('sdPause').textContent = paused ? '>' : '||';
      el('sdPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('sdOverlay').hidden = playing;
      if (paused) {
        el('sdOverlayTitle').textContent = 'Tạm dừng';
        el('sdOverlayCopy').textContent = `${v.overallFoundCount} / ${v.totalTargets}`;
        el('sdOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'won') {
        el('sdOverlayTitle').textContent = 'Xong cả ba!';
        el('sdOverlayCopy').textContent = `${v.overallFoundCount} điểm · ${v.sceneCount} cảnh`;
        el('sdOverlayAction').textContent = 'Chơi lại';
      } else if (v.status === 'lost') {
        el('sdOverlayTitle').textContent = v.lastEvent === 'time' ? 'Hết giờ' : 'Hết lượt';
        el('sdOverlayCopy').textContent = `${v.overallFoundCount} / ${v.totalTargets}`;
        el('sdOverlayAction').textContent = 'Chơi lại';
      }
      el('sdStatus').textContent = message;
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'playing') { previous = null; return; }
      if (previous !== null) model.advance(Math.max(0, Math.min(250, timestamp - previous)));
      previous = timestamp;
      render();
      if (model.view().status === 'playing') frame = session.requestAnimationFrame(loop);
      else { previous = null; render(); }
    }
    function startLoop() {
      if (!alive || frame !== null || model.view().status !== 'playing' || root.document?.hidden) return;
      previous = null; frame = session.requestAnimationFrame(loop);
    }
    function interrupt() {
      if (model.pause()) { stopLoop(); announce('Tạm dừng.'); render(); }
    }
    function choose(side, x, y) {
      if (!alive || model.view().status !== 'playing') return;
      const result = model.pick(side, x, y);
      if (!result.accepted) return;
      if (result.duplicate) announce('Đã tìm thấy điểm này.');
      else if (result.gameComplete) announce('Đã soi hết ba cảnh!');
      else if (result.sceneComplete) announce(`Cảnh mới · ${result.sceneName}`);
      else if (result.hit) announce(`Đúng · ${result.foundCount} / ${M.SCENES[result.sceneIndex].targets.length}`);
      else announce(result.status === 'lost' ? 'Hết lượt.' : `Sai · còn ${M.MAX_MISSES - result.misses}`);
      render();
      if (result.status !== 'playing') stopLoop(); else startLoop();
    }
    function replay() {
      model.restart(); stopLoop(); cursorVisible = false; cursor.x = 0.5; cursor.y = 0.5;
      announce('·'); render(); images.a.focus({ preventScroll: true }); startLoop();
    }

    for (const side of ['a', 'b']) {
      const panel = images[side];
      session.listen(panel, 'focus', () => { cursor.side = side; cursorVisible = true; render(); });
      session.listen(panel, 'blur', () => { cursorVisible = false; render(); });
      session.listen(panel, 'click', event => {
        const rect = panel.getBoundingClientRect();
        if (event.detail === 0) choose(side, cursor.x, cursor.y);
        else choose(side, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
      });
      session.listen(panel, 'keydown', event => {
        const step = event.shiftKey ? 0.02 : 0.05;
        const moves = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
        if (moves[event.key]) {
          event.preventDefault(); cursor.side = side; cursorVisible = true;
          cursor.x = Math.max(0.01, Math.min(0.99, cursor.x + moves[event.key][0]));
          cursor.y = Math.max(0.01, Math.min(0.99, cursor.y + moves[event.key][1]));
          announce(`Ảnh ${side.toUpperCase()} · ${Math.round(cursor.x * 100)}%, ${Math.round(cursor.y * 100)}%.`); render();
        }
      });
    }
    session.listen(el('sdPause'), 'click', () => {
      if (model.pause()) { stopLoop(); announce('Tạm dừng.'); render(); }
      else if (model.resume()) { announce('Tiếp tục.'); render(); startLoop(); }
    });
    session.listen(el('sdRestart'), 'click', replay);
    session.listen(el('sdOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') { model.resume(); announce('Tiếp tục.'); render(); startLoop(); }
      else replay();
    });
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); else startLoop(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);
    render(); startLoop();
    return { getModel: () => model, destroy };
  }

  root.NP_SpotDifference = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

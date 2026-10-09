/* Project-authored touch-first reflex round; no borrowed characters, sprites or sounds. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_MoleTapModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Đập Chuột Chũi needs its model and an active game session');
    }
    const seed = options.seed ?? (Date.now() >>> 0);
    let model = M.create({ seed }), alive = true, frame = null, previous = null, focusIndex = 4;
    let message = '·';
    const holes = [];
    container.classList.add('mole-host');
    container.innerHTML = `
      <section class="mole-game" aria-label="Đập Chuột Chũi">
        <header class="mole-head"><h2>Đập Chuột Chũi</h2><div class="mole-actions">
          <button class="mole-button" id="molePause" type="button" aria-label="Tạm dừng">||</button>
          <button class="mole-button" id="moleRestart" type="button" aria-label="Chơi lại">↻</button>
        </div></header>
        <div class="mole-hud" aria-label="Tiến độ ván">
          <div><span>Bắt</span><strong id="moleHits">0 / 12</strong></div>
          <div><span>Điểm</span><strong id="moleScore">0</strong></div>
          <div><span>Sượt</span><strong id="moleMisses">●●●</strong></div>
        </div>
        <div class="mole-clock" aria-hidden="true"><span id="moleClockFill"></span></div>
        <div class="mole-board" id="moleBoard" role="group" aria-label="Chín hố chạm để đập mục tiêu">
          ${Array.from({ length: M.HOLES }, (_, index) => `<button class="mole-hole" id="moleHole${index}" data-hole="${index}" type="button" aria-pressed="false" aria-label="Hố ${index + 1}" tabindex="${index === focusIndex ? 0 : -1}"><span class="mole-critter" aria-hidden="true"></span></button>`).join('')}
        </div>
        <p id="moleStatus" class="mole-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div id="moleOverlay" class="mole-overlay" hidden role="group" aria-label="Trạng thái ván">
          <div class="mole-overlay-card"><strong id="moleOverlayTitle"></strong><p id="moleOverlayCopy"></p>
            <button id="moleOverlayAction" class="mole-button mole-primary" type="button"></button>
          </div>
        </div>
      </section>`;
    const el = id => container.querySelector('#' + id);
    for (let i = 0; i < M.HOLES; i++) holes.push(el(`moleHole${i}`));

    function stopLoop() {
      if (frame !== null) session.cancelAnimationFrame(frame);
      frame = null; previous = null;
    }
    function destroy() {
      if (!alive) return;
      alive = false; stopLoop();
      container.classList.remove('mole-host');
      container.innerHTML = '';
    }
    function announce(text) { message = text; el('moleStatus').textContent = text; }
    function render() {
      if (!alive) return;
      const v = model.view(), playing = v.status === 'playing', paused = v.status === 'paused';
      el('moleHits').textContent = `${v.hits} / ${v.targetCount}`;
      el('moleScore').textContent = String(v.score);
      el('moleMisses').textContent = '●'.repeat(v.maxMisses - v.misses) + '○'.repeat(v.misses);
      el('moleClockFill').style.width = `${v.targetTimeLeft / v.targetWindowMs * 100}%`;
      holes.forEach((button, index) => {
        const target = v.target === index;
        button.classList.toggle('is-up', target);
        button.disabled = !playing;
        button.tabIndex = index === focusIndex ? 0 : -1;
        button.setAttribute('aria-pressed', String(target));
        button.setAttribute('aria-label', `Hố ${index + 1}${target ? ', mục tiêu' : ''}`);
      });
      el('molePause').disabled = v.status === 'won' || v.status === 'lost';
      el('molePause').textContent = paused ? '>' : '||';
      el('molePause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      const overlay = el('moleOverlay');
      overlay.hidden = playing;
      if (paused) {
        el('moleOverlayTitle').textContent = 'Tạm dừng';
        el('moleOverlayCopy').textContent = `${v.hits} / ${v.targetCount}`;
        el('moleOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'won') {
        el('moleOverlayTitle').textContent = 'Bắt đủ 12!';
        el('moleOverlayCopy').textContent = `${v.score} điểm`;
        el('moleOverlayAction').textContent = 'Chơi lại';
      } else if (v.status === 'lost') {
        el('moleOverlayTitle').textContent = 'Hết lượt';
        el('moleOverlayCopy').textContent = `${v.hits} / ${v.targetCount} · ${v.score} điểm`;
        el('moleOverlayAction').textContent = 'Chơi lại';
      }
      el('moleStatus').textContent = message;
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
      previous = null;
      frame = session.requestAnimationFrame(loop);
    }
    function interrupt() {
      if (model.pause()) {
        stopLoop(); announce('Tạm dừng.'); render();
      }
    }
    function whack(index) {
      if (!alive) return;
      focusIndex = index;
      const result = model.whack(index);
      if (!result.accepted) return;
      if (result.hit) announce(`Trúng · ${result.hits} / ${M.TARGET_COUNT}`);
      else announce(result.status === 'lost' ? 'Hết lượt.' : `Sượt · ${M.MAX_MISSES - result.misses} lượt`);
      render();
      if (result.status !== 'playing') stopLoop();
      else startLoop();
    }
    function replay() {
      model.restart();
      stopLoop(); message = '·'; render(); holes[focusIndex]?.focus({ preventScroll: true }); startLoop();
    }

    holes.forEach((button, index) => {
      session.listen(button, 'click', () => whack(index));
      session.listen(button, 'keydown', event => {
        const deltas = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: -1, ArrowRight: 1 };
        if (!(event.key in deltas)) return;
        event.preventDefault();
        let next = focusIndex + deltas[event.key];
        if (event.key === 'ArrowLeft' && focusIndex % 3 === 0) next = focusIndex;
        if (event.key === 'ArrowRight' && focusIndex % 3 === 2) next = focusIndex;
        focusIndex = Math.max(0, Math.min(M.HOLES - 1, next));
        render(); holes[focusIndex]?.focus({ preventScroll: true });
      });
    });
    session.listen(root.document, 'keydown', event => {
      if (!/^[1-9]$/.test(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault(); whack(Number(event.key) - 1);
    });
    session.listen(el('molePause'), 'click', () => {
      if (model.pause()) { stopLoop(); announce('Tạm dừng.'); render(); }
      else if (model.resume()) { announce('Tiếp tục.'); render(); startLoop(); }
    });
    session.listen(el('moleRestart'), 'click', replay);
    session.listen(el('moleOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') {
        model.resume(); announce('Tiếp tục.'); render(); startLoop();
      } else replay();
    });
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); else startLoop(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);
    render(); startLoop();
    return { getModel: () => model, destroy };
  }

  root.NP_MoleTap = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

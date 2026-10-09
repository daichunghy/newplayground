/* Original three-lane street run. Arrow keys or large touch buttons; Space throws a paper. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_PaperboyModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Giao Báo needs its model and an active game session');
    }
    let model = M.create(), alive = true, frame = null, previous = null, message = '·';
    const laneX = [165, 350, 535];
    container.classList.add('pb-host');
    container.innerHTML = `
      <section class="pb-game" aria-label="Cậu Bé Giao Báo">
        <header class="pb-head"><h2>Giao Báo</h2><div class="pb-actions">
          <button class="pb-button" id="pbPause" type="button" aria-label="Tạm dừng">||</button>
          <button class="pb-button" id="pbRestart" type="button" aria-label="Chơi lại">↻</button>
        </div></header>
        <div class="pb-hud" aria-label="Tiến độ chuyến giao"><div><span>Đã giao</span><strong id="pbDeliveries">0 / 6</strong></div><div><span>Sượt</span><strong id="pbMisses">●●●</strong></div><div><span>Va chạm</span><strong id="pbCrashes">●●●</strong></div></div>
        <p class="pb-cue">Chọn làn · ném vào hộp thư</p>
        <svg id="pbRoad" class="pb-road" viewBox="0 0 700 430" role="img" aria-label="Đường ba làn: chuyến xe, hộp thư và chướng ngại">
          <defs><linearGradient id="pbSky" x2="0" y2="1"><stop stop-color="#c6e3dd"/><stop offset="1" stop-color="#f0e4bf"/></linearGradient></defs>
          <rect width="700" height="430" fill="url(#pbSky)"/><path d="M0 0h125v430H0Zm575 0h125v430H575Z" fill="#86a876"/>
          <path d="M155 0h390v430H155Z" fill="#555d5c"/><path d="M282 0v430m136-430v430" stroke="#f4e7bd" stroke-width="5" stroke-dasharray="24 22" opacity=".8"/>
          <path d="M145 0v430m410-430v430" stroke="#e9e1cc" stroke-width="8"/>
          <g fill="#5c845b"><circle cx="53" cy="74" r="29"/><circle cx="82" cy="156" r="34"/><circle cx="52" cy="262" r="32"/><circle cx="642" cy="66" r="31"/><circle cx="617" cy="188" r="36"/><circle cx="652" cy="305" r="30"/></g>
          <g id="pbActors"></g>
        </svg>
        <div class="pb-lane-controls" aria-label="Chọn làn đường"><button class="pb-button pb-lane" id="pbLeft" type="button" aria-label="Sang trái">←</button><span id="pbLaneLabel" aria-live="polite">Làn giữa</span><button class="pb-button pb-lane" id="pbRight" type="button" aria-label="Sang phải">→</button></div>
        <button class="pb-button pb-throw" id="pbThrow" type="button">Ném báo</button>
        <p id="pbStatus" class="pb-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div id="pbOverlay" class="pb-overlay" hidden role="group" aria-label="Kết quả chuyến giao"><div class="pb-overlay-card"><strong id="pbOverlayTitle"></strong><p id="pbOverlayCopy"></p><button class="pb-button pb-primary" id="pbOverlayAction" type="button"></button></div></div>
      </section>`;
    const el = id => container.querySelector('#' + id);
    function stopLoop() { if (frame !== null) session.cancelAnimationFrame(frame); frame = null; previous = null; }
    function destroy() { if (!alive) return; alive = false; stopLoop(); container.classList.remove('pb-host'); container.innerHTML = ''; }
    function drawActors(v) {
      const actors = [];
      if (v.mailbox) {
        const x = laneX[v.mailbox.lane], y = 84 + v.mailbox.progress * 185;
        actors.push(`<g class="pb-mailbox" transform="translate(${x} ${y})"><rect x="-25" y="-18" width="50" height="35" rx="6"/><path d="M-22-3h44m-24-12 9 12-9 12"/></g>`);
      }
      for (const obstacle of v.obstacles) {
        const x = laneX[obstacle.lane], y = 75 + obstacle.y * 310;
        if (obstacle.kind === 'car') actors.push(`<g class="pb-car" transform="translate(${x} ${y})"><rect x="-39" y="-24" width="78" height="48" rx="12"/><path d="M-23-20h38l13 18h-64Z"/><circle cx="-23" cy="23" r="8"/><circle cx="23" cy="23" r="8"/></g>`);
        else actors.push(`<g class="pb-dog" transform="translate(${x} ${y})"><path d="M-32 4q3-22 25-19 20-12 35 6l7 15-11 11h-45Zm-14-18 12 7m39 19v14m-24-12v12"/><circle cx="16" cy="-1" r="2.8"/></g>`);
      }
      const x = laneX[v.lane];
      actors.push(`<g class="pb-rider" transform="translate(${x} 350)"><circle cx="-25" cy="18" r="17"/><circle cx="28" cy="18" r="17"/><path d="M-25 18-8-8 5 18h-30l-3-20m16 10L28 18M-8-8h20m-3 0 10-9"/><circle cx="-7" cy="-23" r="11"/><path d="M-18-11Q-12-28 9-10l8 20h-31Z"/></g>`);
      el('pbActors').innerHTML = actors.join('');
    }
    function render() {
      if (!alive) return;
      const v = model.view(), playing = v.status === 'playing', paused = v.status === 'paused';
      el('pbDeliveries').textContent = `${v.deliveries} / ${v.deliveryCount}`;
      el('pbMisses').textContent = '●'.repeat(v.maxMisses - v.misses) + '○'.repeat(v.misses);
      el('pbCrashes').textContent = '●'.repeat(v.maxCrashes - v.crashes) + '○'.repeat(v.crashes);
      el('pbLaneLabel').textContent = `Làn ${v.laneName.toLowerCase()}`;
      el('pbLeft').disabled = !playing || v.lane === 0;
      el('pbRight').disabled = !playing || v.lane === 2;
      el('pbThrow').disabled = !playing || !v.mailbox;
      el('pbPause').disabled = ['won', 'lost'].includes(v.status);
      el('pbPause').textContent = paused ? '>' : '||';
      el('pbPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      drawActors(v);
      const overlay = el('pbOverlay'); overlay.hidden = playing;
      if (paused) {
        el('pbOverlayTitle').textContent = 'Tạm dừng'; el('pbOverlayCopy').textContent = `${v.deliveries} / ${v.deliveryCount} đã giao`;
        el('pbOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'won') {
        el('pbOverlayTitle').textContent = 'Giao đủ rồi!'; el('pbOverlayCopy').textContent = `${v.score} điểm · ${v.crashes} va chạm`;
        el('pbOverlayAction').textContent = 'Chơi lại';
      } else if (v.status === 'lost') {
        el('pbOverlayTitle').textContent = 'Hết chuyến'; el('pbOverlayCopy').textContent = `${v.deliveries} / ${v.deliveryCount} · ${v.misses} sượt · ${v.crashes} va`;
        el('pbOverlayAction').textContent = 'Thử lại';
      }
      el('pbStatus').textContent = message;
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'playing') { previous = null; return; }
      if (previous !== null) model.advance(Math.max(0, Math.min(250, timestamp - previous)));
      previous = timestamp; render();
      if (model.view().status === 'playing') frame = session.requestAnimationFrame(loop);
      else { previous = null; render(); }
    }
    function startLoop() { if (!alive || frame !== null || model.view().status !== 'playing' || root.document?.hidden) return; previous = null; frame = session.requestAnimationFrame(loop); }
    function changeLane(delta) { if (model.changeLane(delta)) { message = `Làn ${model.view().laneName.toLowerCase()}.`; render(); } }
    function throwPaper() {
      const result = model.throwPaper();
      if (result.hit) message = `Trúng hộp thư · ${result.deliveries} / ${M.DELIVERIES.length}`;
      else if (result.accepted) message = 'Lệch làn.';
      else message = 'Chờ hộp thư tới.';
      render();
    }
    function replay() { model.restart(); stopLoop(); message = '·'; render(); startLoop(); }
    function interrupt() { if (model.pause()) { stopLoop(); message = 'Tạm dừng.'; render(); } }
    session.listen(el('pbLeft'), 'click', () => changeLane(-1));
    session.listen(el('pbRight'), 'click', () => changeLane(1));
    session.listen(el('pbThrow'), 'click', throwPaper);
    session.listen(el('pbPause'), 'click', () => { if (model.pause()) { stopLoop(); message = 'Tạm dừng.'; render(); } else if (model.resume()) { message = 'Tiếp tục.'; render(); startLoop(); } });
    session.listen(el('pbRestart'), 'click', replay);
    session.listen(el('pbOverlayAction'), 'click', () => { if (model.view().status === 'paused') { model.resume(); message = 'Tiếp tục.'; render(); startLoop(); } else replay(); });
    session.listen(root.document, 'keydown', event => {
      if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { event.preventDefault(); changeLane(-1); }
      else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { event.preventDefault(); changeLane(1); }
      else if (event.key === ' ' || event.key === 'Spacebar') { event.preventDefault(); throwPaper(); }
      else if (event.key.toLowerCase() === 'p') { if (model.pause()) { stopLoop(); message = 'Tạm dừng.'; render(); } else if (model.resume()) { message = 'Tiếp tục.'; render(); startLoop(); } }
    });
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); else startLoop(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy); render(); startLoop();
    return { getModel: () => model, destroy };
  }

  root.NP_Paperboy = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

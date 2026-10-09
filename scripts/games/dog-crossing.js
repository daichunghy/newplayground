/* Original one-crosswalk timing game. Canvas art is drawn from code. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_DogCrossingModel;
    if (!M || !container || !session?.listen || !session?.requestAnimationFrame || !session?.onCleanup) {
      throw new TypeError('Dắt Cún Qua Đường needs its model, container, and managed session');
    }
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup, setTimeout } = session;
    container.classList.add('dc-host');
    container.innerHTML = `
      <section class="dc-game" aria-label="Dắt Cún Qua Đường">
        <header class="dc-header"><div><p class="dc-kicker">5 CÚN · 1 VẠCH</p><h2>Dắt Cún Qua Đường</h2></div>
          <div class="dc-tools"><button class="dc-tool" id="dcPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
          <button class="dc-tool" id="dcRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button></div>
        </header>
        <div class="dc-scoreline" aria-label="Điểm, thời gian và số lượt">
          <span>Điểm <b id="dcScore">0</b></span><span><b id="dcTime">28</b>s</span><span>Cún <b id="dcDogs">5</b></span><span class="dc-misses" id="dcMisses" aria-label="Lượt sai còn lại">● ● ●</span>
        </div>
        <div class="dc-board"><canvas id="dcCanvas" width="800" height="420" role="img" aria-label="Vạch qua đường, xe đang chờ hoặc chạy, đèn xanh và đàn cún" aria-describedby="dcStatus">Vạch kẻ đường và đèn giao thông.</canvas>
          <div class="dc-overlay" id="dcOverlay" hidden><div class="dc-overlay-card"><span class="dc-overlay-mark" id="dcOverlayMark" aria-hidden="true">✦</span>
            <h3 id="dcOverlayTitle"></h3><p id="dcOverlayText"></p><button class="dc-primary" id="dcOverlayAction" type="button"></button>
          </div></div>
        </div>
        <p class="dc-status" id="dcStatus" role="status" aria-live="polite" aria-atomic="true">Đèn xanh · Chạm để qua.</p>
        <button class="dc-cross" id="dcCross" type="button" aria-label="Dẫn cún qua vạch">Dẫn cún qua <span aria-hidden="true">↑</span></button>
        <p class="dc-shortcut">Chạm / Space · P nghỉ</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('dcCanvas'), ctx = canvas.getContext('2d');
    let model = M.create(), alive = true, frame = null, previousTime = null, stamp = '';
    model.start();

    function announceState(view) {
      let text = view.signal === 'green' ? 'Đèn xanh · Chạm để qua.' : 'Đèn đỏ · Chờ xe dừng.';
      if (view.lastEvent === 'crossing') text = 'Đang qua vạch…';
      else if (view.lastEvent === 'saved') text = view.combo > 1 ? `Qua an toàn · ${view.combo} liền.` : 'Qua an toàn!';
      else if (view.lastEvent === 'red-light') text = 'Đèn đỏ · Cún chờ an toàn.';
      else if (view.lastEvent === 'strike-out') text = 'Hết lượt. Thử lại nhé.';
      else if (view.lastEvent === 'time-up') text = 'Hết giờ. Thử lại nhé.';
      else if (view.status === 'paused') text = 'Đã nghỉ.';
      el('dcStatus').textContent = text;
    }

    function drawDog(x, y, scale, color = '#fff5d9') {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = color; ctx.strokeStyle = '#314f48'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(20, -6, 11, 10, .15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e9a071'; ctx.beginPath(); ctx.ellipse(18, -15, 4, 9, -.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#263d3b'; ctx.beginPath(); ctx.arc(24, -8, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-12, 17); ctx.moveTo(9, 10); ctx.lineTo(10, 17); ctx.stroke();
      ctx.restore();
    }

    function drawCar(x, y, color, direction) {
      ctx.save(); ctx.translate(x, y); ctx.scale(direction, 1);
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-48, -17, 96, 34, 11); ctx.fill();
      ctx.fillStyle = '#dff2ed'; ctx.beginPath(); ctx.roundRect(-22, -13, 34, 17, 6); ctx.fill();
      ctx.fillStyle = '#233b39';
      for (const wheelX of [-28, 29]) { ctx.beginPath(); ctx.arc(wheelX, 16, 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }

    function draw() {
      if (!alive || !ctx) return;
      const v = model.view(), w = M.WIDTH || 800, h = M.HEIGHT || 420;
      ctx.clearRect(0, 0, w, h);
      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#c9eef1'); sky.addColorStop(1, '#e6f1d6');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#80b878'; ctx.fillRect(0, 0, w, 112); ctx.fillRect(0, 322, w, 98);
      ctx.fillStyle = '#34434a'; ctx.fillRect(0, 112, w, 210);
      ctx.fillStyle = '#44535a'; ctx.fillRect(0, 112, w, 5); ctx.fillRect(0, 317, w, 5);
      ctx.fillStyle = '#f4f2d8'; ctx.fillRect(373, 0, 54, 420);
      for (let y = 119; y < 310; y += 42) { ctx.fillStyle = '#fff7df'; ctx.fillRect(380, y, 40, 24); }
      ctx.fillStyle = '#e5dfc4'; ctx.fillRect(0, 100, w, 12); ctx.fillRect(0, 322, w, 12);

      // Traffic halts while the pedestrian signal is green.
      const traffic = v.signal === 'green' ? 0 : v.elapsed;
      const laneOne = (traffic * 112 + 60) % 940 - 90;
      const laneTwo = 800 - ((traffic * 148 + 250) % 950);
      if (v.signal === 'green') {
        drawCar(98, 166, '#e8aa4a', 1); drawCar(702, 266, '#5a99b4', -1);
      } else {
        drawCar(laneOne, 166, '#e8aa4a', 1); drawCar(laneOne + 430, 166, '#d56e60', 1);
        drawCar(laneTwo, 266, '#5a99b4', -1); drawCar(laneTwo - 430, 266, '#7c83b8', -1);
      }

      // Compact original traffic light and hand-drawn code-only dogs.
      ctx.fillStyle = '#2e4544'; ctx.beginPath(); ctx.roundRect(680, 24, 76, 88, 18); ctx.fill();
      ctx.fillStyle = v.signal === 'red' ? '#f26154' : '#3b6957'; ctx.beginPath(); ctx.arc(718, 51, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = v.signal === 'green' ? '#cbff73' : '#315348'; ctx.beginPath(); ctx.arc(718, 87, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = v.signal === 'green' ? '#28453b' : '#f6f5d8'; ctx.font = '700 14px Calibri, Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ĐI', 718, 92);

      for (let i = 0; i < v.dogsWaiting; i++) drawDog(96 + i * 49, 376, .72, ['#fff5d9','#f3d6b4','#f1e8d3','#e6c496','#fff1dc'][i]);
      for (let i = 0; i < v.dogsSaved; i++) drawDog(94 + i * 49, 56, .62, '#fff5d9');
      if (v.crossingTime > 0 && v.dogsWaiting > 0) {
        const y = 342 - v.crossingProgress * 270;
        drawDog(400, y, .92, '#fff0ce');
        ctx.strokeStyle = 'rgba(231,255,199,.72)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(400, y, 29 + Math.sin(v.elapsed * 26) * 3, 0, Math.PI * 2); ctx.stroke();
      }
      if (v.lastEvent === 'red-light' || v.lastEvent === 'strike-out') {
        ctx.fillStyle = 'rgba(242,97,84,.9)'; ctx.font = '700 28px Calibri, Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('CHỜ ĐÈN XANH', 400, 218);
      }
    }

    function update() {
      if (!alive) return;
      const v = model.view();
      const nextStamp = [v.status, v.signal, Math.ceil(v.roundTime), v.dogsSaved, v.misses, v.score, v.lastEvent, v.combo].join('|');
      if (nextStamp !== stamp) {
        stamp = nextStamp;
        el('dcScore').textContent = String(v.score);
        el('dcTime').textContent = String(Math.ceil(v.roundTime));
        el('dcDogs').textContent = String(v.dogsWaiting);
        el('dcMisses').textContent = `${'● '.repeat(v.missesLeft)}${'○ '.repeat(v.misses)}`.trim();
        el('dcMisses').setAttribute('aria-label', `${v.missesLeft} lượt sai còn lại`);
        announceState(v);
      }
      const paused = v.status === 'paused', terminal = v.status === 'won' || v.status === 'lost';
      el('dcPause').disabled = !['playing','paused'].includes(v.status);
      el('dcPause').textContent = paused ? '▶' : 'Ⅱ';
      el('dcPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('dcCross').disabled = v.status !== 'playing' || !v.canCross;
      el('dcOverlay').hidden = !(paused || terminal);
      el('dcOverlayTitle').textContent = paused ? 'Tạm dừng' : v.status === 'won' ? 'Cún qua an toàn!' : 'Hẹn chuyến sau';
      el('dcOverlayText').textContent = paused ? 'Đèn đang nghỉ.' : `${v.score} điểm`;
      el('dcOverlayMark').textContent = v.status === 'won' ? '✓' : paused ? 'Ⅱ' : '↻';
      el('dcOverlayAction').textContent = paused ? 'Tiếp tục' : 'Chơi lại';
      draw();
    }

    function stopLoop() { if (frame !== null) cancelAnimationFrame(frame); frame = null; previousTime = null; }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'playing') return;
      if (previousTime !== null) model.advance(Math.min(.05, Math.max(0, (timestamp - previousTime) / 1000)));
      previousTime = timestamp; update();
      if (model.view().status === 'playing') frame = requestAnimationFrame(loop);
    }
    function schedule() { if (alive && model.view().status === 'playing' && frame === null) frame = requestAnimationFrame(loop); }
    function interrupt() {
      if (model.pause()) { stopLoop(); update(); }
    }
    function restart() { stopLoop(); model.restart(); model.start(); stamp = ''; update(); schedule(); el('dcCross').focus({ preventScroll: true }); }
    function doCross() {
      if (!model.cross()) return;
      const v = model.view();
      if (v.status === 'lost') stopLoop();
      update();
    }

    listen(el('dcCross'), 'click', doCross);
    listen(el('dcRestart'), 'click', restart);
    listen(el('dcPause'), 'click', () => {
      if (model.view().status === 'paused') { model.resume(); previousTime = null; schedule(); }
      else if (model.pause()) stopLoop();
      update();
      if (model.view().status === 'paused') el('dcOverlayAction').focus({ preventScroll: true });
    });
    listen(el('dcOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') { model.resume(); previousTime = null; update(); schedule(); }
      else restart();
    });
    listen(root, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        if (model.view().status === 'playing') { if (model.pause()) stopLoop(); }
        else if (model.resume()) { previousTime = null; schedule(); }
        update();
      } else if ((event.code === 'Space' || event.key === 'Enter') && !event.target?.closest?.('button')) {
        event.preventDefault(); doCross();
      }
    });
    listen(root, 'blur', interrupt);
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    listen(root, 'pagehide', interrupt);
    onCleanup(() => { alive = false; stopLoop(); container.classList.remove('dc-host'); });

    update(); schedule();
    return Object.freeze({ getModel: () => model });
  }

  root.NP_DogCrossing = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

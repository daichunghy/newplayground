/* Self-contained, original touch-first bubble ascent view. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_SoapBubbleGardenModel;
    if (!M || !container || !session?.listen || !session?.requestAnimationFrame || !session?.cancelAnimationFrame || !session?.onCleanup) {
      throw new TypeError('Thổi Bong Bóng Xà Phòng needs its model, container, and managed session');
    }
    container.classList.add('sbg-host');
    container.innerHTML = `
      <section class="sbg-game" aria-label="Thổi Bong Bóng Xà Phòng">
        <header class="sbg-head"><div><p class="sbg-kicker">THỔI · LÁCH · BAY</p><h2>Thổi Bong Bóng</h2></div>
          <div class="sbg-tools"><button class="sbg-icon" id="sbgPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">||</button>
          <button class="sbg-icon" id="sbgRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button></div>
        </header>
        <div class="sbg-hud"><span>Điểm <b id="sbgScore">0</b></span><span>Cửa <b id="sbgGates">0 / 3</b></span>
          <span><b id="sbgTime">24</b>s</span><div class="sbg-air"><span>Hơi</span><span class="sbg-meter" id="sbgMeter" role="progressbar" aria-label="Áp lực trong bong bóng" aria-valuemin="0" aria-valuemax="100" aria-valuenow="18"><i id="sbgAir"></i></span></div>
        </div>
        <div class="sbg-board"><canvas id="sbgCanvas" width="800" height="440" role="img" aria-label="Bong bóng đang bay lên qua ba khe gai trong khu vườn" aria-describedby="sbgStatus">Ba khe an toàn dẫn lên hiên vườn.</canvas>
          <div class="sbg-overlay" id="sbgOverlay" hidden><div class="sbg-overlay-card"><span class="sbg-mark" id="sbgMark" aria-hidden="true">✦</span>
            <h3 id="sbgTitle"></h3><p id="sbgCopy"></p><button id="sbgOverlayAction" class="sbg-primary" type="button"></button>
          </div></div>
        </div>
        <p class="sbg-status" id="sbgStatus" role="status" aria-live="polite" aria-atomic="true">Giữ để bay lên · thả để chậm · né gai.</p>
        <div class="sbg-controls" aria-label="Điều khiển bong bóng">
          <button class="sbg-steer" id="sbgLeft" type="button" aria-label="Sang trái">←</button>
          <button class="sbg-blow" id="sbgBlow" type="button" aria-label="Giữ để thổi phồng"><span aria-hidden="true">◉</span> Thổi</button>
          <button class="sbg-steer" id="sbgRight" type="button" aria-label="Sang phải">→</button>
        </div>
        <p class="sbg-shortcut">Giữ Thổi · ← → lái · P nghỉ</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('sbgCanvas'), ctx = canvas.getContext('2d');
    const model = M.create();
    model.start();
    let alive = true, frame = null, previousTime = null, stamp = '', message = 'Giữ để bay lên · thả để chậm · né gai.';
    let keys = new Set(), pointers = new Map(), tapTimer = null;
    const input = () => ({
      inflate: keys.has('inflate') || [...pointers.values()].includes('inflate'),
      left: keys.has('left') || [...pointers.values()].includes('left'),
      right: keys.has('right') || [...pointers.values()].includes('right')
    });

    function applyInput() { model.setInput(input()); }
    function drawBubble(v) {
      const r = v.radius;
      ctx.save();
      ctx.shadowColor = 'rgba(103,225,225,.62)'; ctx.shadowBlur = 20;
      const fill = ctx.createRadialGradient(v.x - r * .35, v.y - r * .4, r * .08, v.x, v.y, r * 1.1);
      fill.addColorStop(0, 'rgba(255,255,255,.78)'); fill.addColorStop(.36, 'rgba(185,246,246,.26)'); fill.addColorStop(.82, 'rgba(250,181,230,.20)'); fill.addColorStop(1, 'rgba(111,203,223,.46)');
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(v.x, v.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(230,255,255,.94)'; ctx.stroke();
      ctx.lineWidth = Math.max(2, r * .11); ctx.strokeStyle = 'rgba(248,168,217,.84)';
      ctx.beginPath(); ctx.arc(v.x, v.y, r - 3, -.88, .18); ctx.stroke();
      ctx.strokeStyle = 'rgba(119,226,217,.88)'; ctx.beginPath(); ctx.arc(v.x, v.y, r - 3, 1.35, 2.45); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(v.x - r * .33, v.y - r * .39, r * .18, r * .09, -.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function draw() {
      if (!alive || !ctx) return;
      const v = model.view();
      const sky = ctx.createLinearGradient(0, 0, 0, M.HEIGHT);
      sky.addColorStop(0, '#c7eced'); sky.addColorStop(.66, '#e7f4dc'); sky.addColorStop(1, '#fff1d6');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      // Original garden silhouettes and soft clouds, composed directly in Canvas.
      ctx.fillStyle = 'rgba(255,255,255,.46)';
      for (const [x, y, r] of [[130,74,26],[157,68,34],[188,78,24],[611,92,24],[642,82,32],[672,94,22]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#9dcd9d'; ctx.beginPath(); ctx.moveTo(0, 352); ctx.quadraticCurveTo(192, 306, 355, 357); ctx.quadraticCurveTo(592, 410, 800, 330); ctx.lineTo(800,440); ctx.lineTo(0,440); ctx.fill();
      ctx.fillStyle = '#6d9e71'; ctx.fillRect(0, 417, 800, 23);
      for (const [x, y] of [[78,369],[137,388],[708,365],[756,391],[321,390]]) {
        ctx.strokeStyle = '#4d8767'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-5,y-28); ctx.stroke();
        ctx.fillStyle = '#76b48a'; ctx.beginPath(); ctx.ellipse(x-9,y-24,10,5,-.55,0,Math.PI*2); ctx.ellipse(x+3,y-31,11,5,.55,0,Math.PI*2); ctx.fill();
      }

      // Three fixed openings. The safe window is bracketed by original thorn marks.
      v.gates.forEach(gate => {
        if (gate.passed) return;
        ctx.fillStyle = 'rgba(73,117,98,.22)'; ctx.fillRect(0, gate.y - 5, M.WIDTH, 10);
        const leftEnd = gate.center - gate.halfWidth, rightStart = gate.center + gate.halfWidth;
        ctx.fillStyle = '#62896b'; ctx.fillRect(0, gate.y - 3, leftEnd, 6); ctx.fillRect(rightStart, gate.y - 3, M.WIDTH - rightStart, 6);
        for (let x = 18; x < leftEnd - 3; x += 25) {
          ctx.fillStyle = '#f4f0d9'; ctx.beginPath(); ctx.moveTo(x, gate.y - 2); ctx.lineTo(x + 10, gate.y + 13); ctx.lineTo(x + 20, gate.y - 2); ctx.closePath(); ctx.fill();
        }
        for (let x = rightStart + 3; x < M.WIDTH - 20; x += 25) {
          ctx.fillStyle = '#f4f0d9'; ctx.beginPath(); ctx.moveTo(x, gate.y - 2); ctx.lineTo(x + 10, gate.y + 13); ctx.lineTo(x + 20, gate.y - 2); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 2; ctx.setLineDash([5,8]); ctx.beginPath(); ctx.moveTo(leftEnd, gate.y + 22); ctx.lineTo(rightStart, gate.y + 22); ctx.stroke(); ctx.setLineDash([]);
      });
      ctx.fillStyle = '#fff8de'; ctx.beginPath(); ctx.roundRect(338, 11, 124, 31, 15); ctx.fill();
      ctx.fillStyle = '#507e71'; ctx.font = '700 13px Calibri, Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(v.gatesPassed === 3 ? 'HIÊN VƯỜN' : `CỬA ${v.gatesPassed + 1} / 3`, 400, 31);
      drawBubble(v);
      if (v.status === 'playing' && v.input.inflate) {
        ctx.strokeStyle = `rgba(248,180,103,${.28 + v.charge * .56})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(v.x, v.y, v.radius + 9 + Math.sin(v.elapsed * 14) * 2, 0, Math.PI * 2); ctx.stroke();
      }
    }

    function render() {
      if (!alive) return;
      const v = model.view(), paused = v.status === 'paused', terminal = v.status === 'won' || v.status === 'lost';
      el('sbgScore').textContent = String(v.score);
      el('sbgGates').textContent = `${v.gatesPassed} / ${v.gateCount}`;
      el('sbgTime').textContent = String(Math.ceil(v.timeLeft));
      el('sbgAir').style.width = `${Math.round(v.charge * 100)}%`;
      el('sbgAir').classList.toggle('is-hot', v.charge >= M.POP_CHARGE * .92);
      el('sbgMeter').setAttribute('aria-valuenow', String(Math.round(v.charge * 100)));
      el('sbgMeter').setAttribute('aria-valuetext', `${Math.round(v.charge * 100)}% · bong bóng lên nhanh hơn khi giữ Thổi`);
      el('sbgPause').disabled = terminal;
      el('sbgPause').textContent = paused ? '>' : '||';
      el('sbgPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('sbgBlow').disabled = v.status !== 'playing';
      el('sbgLeft').disabled = v.status !== 'playing'; el('sbgRight').disabled = v.status !== 'playing';
      const overlay = el('sbgOverlay'); overlay.hidden = !(paused || terminal);
      if (paused) { el('sbgTitle').textContent = 'Tạm dừng'; el('sbgCopy').textContent = `${v.gatesPassed} / 3 cửa`; el('sbgMark').textContent = 'Ⅱ'; el('sbgOverlayAction').textContent = 'Tiếp tục'; }
      else if (v.status === 'won') { el('sbgTitle').textContent = 'Đến hiên rồi!'; el('sbgCopy').textContent = `${v.score} điểm`; el('sbgMark').textContent = '✦'; el('sbgOverlayAction').textContent = 'Thổi lượt nữa'; }
      else if (v.status === 'lost') {
        el('sbgTitle').textContent = v.result === 'thorns' ? 'Chạm gai!' : v.result === 'overpressure' ? 'Bong bóng vỡ!' : 'Hết giờ';
        el('sbgCopy').textContent = `${v.gatesPassed} / 3 cửa · ${v.score} điểm`; el('sbgMark').textContent = '○'; el('sbgOverlayAction').textContent = 'Thử lại';
      }
      el('sbgStatus').textContent = message;
      draw();
    }

    function stopLoop() { if (frame !== null) session.cancelAnimationFrame(frame); frame = null; previousTime = null; }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'playing') return;
      if (previousTime !== null) model.advance(Math.min(.05, Math.max(0, (timestamp - previousTime) / 1000)));
      previousTime = timestamp;
      const v = model.view(), nextStamp = `${v.status}|${v.gatesPassed}|${v.result}|${Math.ceil(v.timeLeft)}|${Math.floor(v.charge * 12)}|${v.lastEvent}`;
      if (nextStamp !== stamp) {
        stamp = nextStamp;
        if (v.lastEvent === 'gate') message = `Qua cửa ${v.gatesPassed} / 3!`;
        else if (v.lastEvent === 'win') message = 'Bong bóng tới hiên an toàn!';
        else if (v.result === 'thorns') message = 'Chạm gai · thử lại.';
        else if (v.result === 'overpressure') message = 'Thổi nhẹ hơn · thử lại.';
        else if (v.result === 'time') message = 'Hết giờ · thử lại.';
        else if (v.status === 'paused') message = 'Đã nghỉ.';
        render();
      } else draw();
      if (model.view().status === 'playing') frame = session.requestAnimationFrame(loop);
      else { stopLoop(); render(); }
    }
    function schedule() { if (alive && model.view().status === 'playing' && frame === null && !root.document?.hidden) frame = session.requestAnimationFrame(loop); }
    function releaseControls() { keys.clear(); pointers.clear(); applyInput(); }
    function interrupt() {
      if (model.pause()) { releaseControls(); stopLoop(); message = 'Đã nghỉ.'; render(); }
    }
    function resume() { if (!model.resume()) return false; previousTime = null; message = 'Tiếp tục.'; render(); schedule(); return true; }
    function pauseOrResume() { if (model.view().status === 'paused') resume(); else if (model.pause()) { releaseControls(); stopLoop(); message = 'Đã nghỉ.'; render(); el('sbgOverlayAction').focus({ preventScroll: true }); } }
    function restart() { stopLoop(); releaseControls(); model.restart(); model.start(); stamp = ''; message = 'Giữ để bay lên · thả để chậm · né gai.'; render(); schedule(); el('sbgBlow').focus({ preventScroll: true }); }
    function destroy() {
      if (!alive) return;
      alive = false; releaseControls(); stopLoop();
      if (tapTimer !== null) session.clearTimeout?.(tapTimer);
      container.classList.remove('sbg-host'); container.innerHTML = '';
    }
    function bindHold(button, kind) {
      session.listen(button, 'pointerdown', event => {
        if (model.view().status !== 'playing') return;
        event.preventDefault(); pointers.set(event.pointerId, kind); button.setPointerCapture?.(event.pointerId); applyInput();
      });
      const clear = event => { if (pointers.delete(event.pointerId)) applyInput(); };
      session.listen(button, 'pointerup', clear); session.listen(button, 'pointercancel', clear); session.listen(button, 'lostpointercapture', clear);
      session.listen(root, 'pointerup', clear); session.listen(root, 'pointercancel', clear);
      // Voice-control and assistive clicks receive a short, finite puff.
      session.listen(button, 'click', event => {
        if (event.detail !== 0 || kind !== 'inflate' || model.view().status !== 'playing') return;
        model.setInput({ ...input(), inflate: true });
        if (tapTimer !== null) session.clearTimeout?.(tapTimer);
        tapTimer = session.setTimeout?.(() => { tapTimer = null; model.setInput(input()); }, 320) ?? null;
      });
    }

    bindHold(el('sbgBlow'), 'inflate'); bindHold(el('sbgLeft'), 'left'); bindHold(el('sbgRight'), 'right');
    session.listen(el('sbgPause'), 'click', pauseOrResume);
    session.listen(el('sbgRestart'), 'click', restart);
    session.listen(el('sbgOverlayAction'), 'click', () => model.view().status === 'paused' ? resume() : restart());
    session.listen(root, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      let key = null;
      if (event.code === 'Space' || event.key === ' ') key = 'inflate';
      else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') key = 'left';
      else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') key = 'right';
      else if (event.key.toLowerCase() === 'p') { event.preventDefault(); pauseOrResume(); return; }
      if (key) { event.preventDefault(); keys.add(key); applyInput(); }
    });
    session.listen(root, 'keyup', event => {
      const key = event.code === 'Space' || event.key === ' ' ? 'inflate' : event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a' ? 'left' : event.key === 'ArrowRight' || event.key.toLowerCase() === 'd' ? 'right' : null;
      if (key && keys.delete(key)) { event.preventDefault(); applyInput(); }
    });
    session.listen(root, 'blur', interrupt);
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); else schedule(); });
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);

    render(); schedule();
    return Object.freeze({ getModel: () => model, destroy });
  }

  root.NP_SoapBubbleGarden = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

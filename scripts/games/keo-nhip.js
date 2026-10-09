/* Kéo Nhịp: original single-player rhythm-tug arcade game. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_KeoNhipModel;
    if (!container || !M || !session?.listen || !session?.requestAnimationFrame || !session?.onCleanup) {
      throw new TypeError('Kéo Nhịp needs its model, container, and an active game session');
    }

    container.classList.add('kn-host');
    container.innerHTML = `
      <section class="kn-game" id="knGame" tabindex="0" aria-label="Kéo Nhịp, trò chơi kéo dây theo nhịp">
        <header class="kn-head">
          <div><p class="kn-kicker">MỘT NGƯỜI · BA LƯỢT</p><h2>Kéo Nhịp</h2></div>
          <div class="kn-head-score"><span>Lượt <b id="knRound">1 / 3</b></span><span>Tỉ số <b id="knScore">0–0</b></span></div>
          <div class="kn-actions">
            <button class="kn-icon" id="knPause" type="button" aria-label="Tạm dừng" title="Tạm dừng · P" disabled>||</button>
            <button class="kn-icon" id="knRestart" type="button" aria-label="Chơi lại trận" title="Chơi lại trận">↻</button>
          </div>
        </header>

        <p class="kn-rules" id="knHelp">Theo dấu trái/phải đúng phách. Nghỉ ở ◇ để hồi sức.</p>

        <div class="kn-arena-wrap">
          <canvas class="kn-arena" id="knArena" width="760" height="320" role="img" aria-label="Dải dây và dấu đèn giữa hai bến" aria-describedby="knHelp">Dấu đèn bắt đầu ở vạch giữa.</canvas>
          <div class="kn-overlay" id="knOverlay" role="group" aria-labelledby="knOverlayTitle" aria-describedby="knOverlayText">
            <div class="kn-card">
              <span class="kn-card-mark" aria-hidden="true">✦</span>
              <h3 id="knOverlayTitle">Sẵn sàng?</h3>
              <p id="knOverlayText">Thắng hai trong tối đa ba lượt.</p>
              <button class="kn-primary" id="knOverlayAction" type="button">Bắt đầu kéo</button>
            </div>
          </div>
        </div>

        <div class="kn-meter-row" aria-label="Trạng thái lượt">
          <div class="kn-cue-box"><span class="kn-label">NHỊP KẾ</span><strong id="knCue">Chuẩn bị</strong><small id="knCueClock">Chờ tín hiệu</small></div>
          <div class="kn-fatigue"><span class="kn-label">HƠI SỨC</span><div class="kn-fatigue-track" role="meter" id="knFatigueMeter" aria-label="Mức mệt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="knFatigueFill"></i></div><small id="knFatigueText">Khỏe</small></div>
          <div class="kn-combo"><span class="kn-label">NHỊP LIỀN</span><strong id="knCombo">0</strong></div>
        </div>

        <div class="kn-controls" role="group" aria-label="Bước kéo theo nhịp">
          <button class="kn-step kn-left" id="knLeft" data-side="left" type="button" aria-label="Bước trái, phím A hoặc mũi tên trái"><span aria-hidden="true">←</span><b>TRÁI</b><small>A · ←</small></button>
          <button class="kn-step kn-right" id="knRight" data-side="right" type="button" aria-label="Bước phải, phím D hoặc mũi tên phải"><span aria-hidden="true">→</span><b>PHẢI</b><small>D · →</small></button>
        </div>
        <p class="kn-feedback" id="knFeedback" role="status" aria-live="polite" aria-atomic="true">Canh nhịp rồi bước.</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('knArena'), ctx = canvas?.getContext?.('2d');
    if (!ctx) { container.classList.remove('kn-host'); throw new Error('Kéo Nhịp needs canvas support'); }
    canvas.width = M.WIDTH; canvas.height = M.HEIGHT;

    let model = M.create({ seed: (Date.now() >>> 0) || 0x4b454f });
    let alive = true, raf = null, lastFrame = null;
    const held = new Set();
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    const W = M.WIDTH || 760, H = M.HEIGHT || 320, markerScale = 37;

    function stopLoop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; lastFrame = null;
    }

    function setFeedback(text) { el('knFeedback').textContent = text; }

    function draw() {
      if (!alive) return;
      const v = model.view();
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#213f58'); sky.addColorStop(.55, '#376977'); sky.addColorStop(1, '#e0b77e');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Original cut-paper hills, pennants, and wind figures frame an abstract ribbon.
      ctx.fillStyle = '#254755'; ctx.beginPath(); ctx.moveTo(0, 243); ctx.quadraticCurveTo(126, 158, 251, 238); ctx.lineTo(251, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = '#315566'; ctx.beginPath(); ctx.moveTo(W, 224); ctx.quadraticCurveTo(628, 154, 506, 236); ctx.lineTo(506, H); ctx.lineTo(W, H); ctx.fill();
      ctx.fillStyle = 'rgba(247,225,186,.75)';
      for (let i = 0; i < 9; i++) {
        const x = 43 + i * 86, y = 44 + (i % 3) * 31;
        ctx.beginPath(); ctx.arc(x, y, i % 3 === 0 ? 2.5 : 1.6, 0, Math.PI * 2); ctx.fill();
      }

      const leftX = 74, rightX = W - 74, railY = 210;
      const centerX = W / 2;
      const leftMark = centerX - M.WIN_MARK * markerScale, rightMark = centerX + M.WIN_MARK * markerScale;
      ctx.setLineDash([5, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,247,226,.72)';
      ctx.beginPath(); ctx.moveTo(centerX, 105); ctx.lineTo(centerX, 250); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,247,226,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(leftMark, 132); ctx.lineTo(leftMark, 251); ctx.moveTo(rightMark, 132); ctx.lineTo(rightMark, 251); ctx.stroke();
      ctx.fillStyle = '#dce8df'; ctx.textAlign = 'center'; ctx.font = '700 12px Calibri, Inter, sans-serif';
      ctx.fillText('BẾN TRÁI', leftX, 281); ctx.fillText('VẠCH GIỮA', centerX, 281); ctx.fillText('BẾN PHẢI', rightX, 281);

      const markerX = centerX - v.position * markerScale;
      ctx.lineCap = 'round'; ctx.lineWidth = 11;
      ctx.strokeStyle = '#f2c77d'; ctx.beginPath(); ctx.moveTo(leftX + 30, railY); ctx.quadraticCurveTo(centerX, railY + 9, rightX - 30, railY); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff0c8'; ctx.beginPath(); ctx.moveTo(leftX + 30, railY - 1); ctx.lineTo(markerX, railY - 1); ctx.stroke();
      ctx.fillStyle = '#8fd0c3'; ctx.beginPath(); ctx.ellipse(leftX, railY - 20, 19, 26, -.48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f09c88'; ctx.beginPath(); ctx.ellipse(rightX, railY - 20, 19, 26, .48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16384b'; ctx.beginPath(); ctx.arc(leftX + 7, railY - 22, 2, 0, Math.PI * 2); ctx.arc(rightX - 7, railY - 22, 2, 0, Math.PI * 2); ctx.fill();

      // The moving lamp is the only score marker: positive displacement favors the player.
      ctx.save(); ctx.shadowColor = '#fff0a8'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffe29b'; ctx.beginPath(); ctx.arc(markerX, railY, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#f9edcc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(markerX - 7, railY + 15); ctx.lineTo(markerX + 7, railY + 15); ctx.stroke();

      const cue = v.cue;
      const cueName = !cue ? 'KẾT THÚC' : cue.kind === 'rest' ? 'NGHỈ' : cue.side === 'left' ? 'TRÁI' : 'PHẢI';
      const cueColor = cue?.kind === 'rest' ? '#f4df9d' : cue?.side === 'left' ? '#9be1d2' : '#ffb09c';
      ctx.fillStyle = 'rgba(14,34,48,.62)'; ctx.beginPath(); ctx.roundRect(centerX - 68, 32, 136, 54, 18); ctx.fill();
      ctx.strokeStyle = cueColor; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = cueColor;
      ctx.textAlign = 'center'; ctx.font = '800 17px Calibri, Inter, sans-serif'; ctx.fillText(cueName, centerX, 55);
      ctx.fillStyle = 'rgba(255,247,226,.8)'; ctx.font = '600 11px Calibri, Inter, sans-serif';
      ctx.fillText(cue ? `NHỊP ${cue.index + 1} / ${v.cueCount}` : 'TRẬN ĐÃ KHÉP', centerX, 73);
    }

    function showOverlay(title, copy, action, visible = true) {
      const overlay = el('knOverlay'); overlay.hidden = !visible;
      el('knOverlayTitle').textContent = title; el('knOverlayText').textContent = copy;
      el('knOverlayAction').textContent = action;
    }

    function render() {
      if (!alive) return;
      const v = model.view();
      el('knRound').textContent = `${v.round} / 3`;
      el('knScore').textContent = `${v.wins}–${v.losses}`;
      el('knCombo').textContent = String(v.combo);
      el('knFatigueFill').style.width = `${v.fatiguePercent}%`;
      el('knFatigueMeter').setAttribute('aria-valuenow', String(v.fatiguePercent));
      el('knFatigueText').textContent = v.fatiguePercent >= 70 ? 'Mệt' : v.fatiguePercent >= 35 ? 'Cần nghỉ' : 'Khỏe';
      el('knPause').disabled = !['playing', 'paused'].includes(v.status);
      el('knPause').textContent = v.status === 'paused' ? '▶' : '||';
      el('knPause').setAttribute('aria-label', v.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng');
      el('knPause').setAttribute('aria-pressed', String(v.status === 'paused'));
      const cue = v.cue;
      if (!cue) {
        el('knCue').textContent = v.status === 'won' ? 'Trận thắng' : v.status === 'lost' ? 'Trận thua' : 'Lượt xong';
        el('knCueClock').textContent = `${v.wins} thắng · ${v.losses} thua`;
      } else if (cue.kind === 'rest') {
        el('knCue').textContent = '◇ NGHỈ'; el('knCueClock').textContent = 'Không bấm · hồi hơi sức';
      } else {
        el('knCue').textContent = cue.side === 'left' ? '← TRÁI' : 'PHẢI →';
        const remaining = cue.time - v.time;
        el('knCueClock').textContent = v.status === 'playing' ? remaining > 0 ? `Trong ${remaining.toFixed(1)} giây` : 'Đến nhịp · bấm!' : 'Chờ tín hiệu';
      }

      if (v.status === 'ready') showOverlay(`Lượt ${v.round} · ${v.wins}–${v.losses}`, 'Theo phách; dừng ở ◇ để nghỉ.', 'Bắt đầu kéo');
      else if (v.status === 'paused') showOverlay('Tạm nghỉ', 'Dấu đèn và nhịp được giữ nguyên. Tiếp tục khi sẵn sàng.', 'Tiếp tục');
      else if (v.status === 'round-won' || v.status === 'round-lost') showOverlay(v.status === 'round-won' ? 'Thắng lượt!' : 'Lượt này thuộc về đối thủ', `${v.wins} thắng · ${v.losses} thua. Trận đấu là tối đa ba lượt.`, `Vào lượt ${v.round + 1}`);
      else if (v.status === 'won' || v.status === 'lost') showOverlay(v.status === 'won' ? 'Bạn thắng trận!' : 'Trận đã khép', `${v.wins} thắng · ${v.losses} thua. Đối thủ sẽ giữ nhịp khác ở lượt kế tiếp.`, 'Chơi lại');
      else showOverlay('', '', '', false);
      draw();
    }

    function schedule() {
      if (!alive || raf !== null || model.view().status !== 'playing') return;
      lastFrame = null;
      raf = requestAnimationFrame(frame);
    }

    function frame(timestamp) {
      raf = null;
      if (!alive || model.view().status !== 'playing') return;
      if (lastFrame !== null) {
        const elapsed = Math.max(0, timestamp - lastFrame);
        if (elapsed > 500) { interrupt(); return; }
        model.advance(elapsed / 1000);
      }
      lastFrame = timestamp;
      render();
      if (model.view().status === 'playing') raf = requestAnimationFrame(frame);
      else lastFrame = null;
    }

    function interrupt() {
      held.clear();
      if (model.pause()) {
        stopLoop(); setFeedback('Tự tạm dừng khi rời trò chơi.'); render();
      }
    }

    function begin() {
      if (!alive) return false;
      let ok = false;
      const status = model.view().status;
      if (status === 'ready') ok = model.start();
      else if (status === 'paused') ok = model.resume();
      else if (status === 'round-won' || status === 'round-lost') {
        ok = model.nextRound() && model.start();
      } else if (status === 'won' || status === 'lost') {
        model.restart(); ok = model.start();
      }
      if (!ok) return false;
      setFeedback('Theo dấu chân; dừng ở viên nghỉ.');
      showOverlay('', '', '', false); el('knGame').focus?.(); render(); schedule();
      return true;
    }

    function restart() {
      if (!alive) return;
      stopLoop(); held.clear(); model.restart(); setFeedback('Trận mới · canh dấu chân.'); render();
    }

    function togglePause() {
      if (model.view().status === 'playing') {
        if (model.pause()) { stopLoop(); setFeedback('Tạm dừng.'); render(); }
      } else if (model.view().status === 'paused') begin();
    }

    function step(side) {
      if (!alive) return;
      const result = model.press(side);
      if (!result.accepted) {
        if (result.grade === 'early') setFeedback('Chờ đến dấu nhịp.');
        return;
      }
      const v = model.view();
      setFeedback(result.grade === 'perfect' ? 'Đúng phách · kéo chắc!' : result.grade === 'good' ? 'Vừa nhịp · giữ nhịp.'
        : result.grade === 'overstep' ? 'Đã bước lúc cần nghỉ.' : result.grade === 'wrong-side' ? 'Đổi chân · đối thủ kéo thêm.' : v.lastGrade);
      render();
    }

    listen(el('knOverlayAction'), 'click', begin);
    listen(el('knPause'), 'click', togglePause);
    listen(el('knRestart'), 'click', restart);
    listen(el('knLeft'), 'click', () => step('left'));
    listen(el('knRight'), 'click', () => step('right'));
    listen(root.document, 'keydown', event => {
      if (!alive || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (typeof container.contains === 'function' && !container.contains(event.target)) return;
      if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.code || event.key;
      if (held.has(key)) return;
      held.add(key);
      if (key === 'KeyP' || key === 'Escape') {
        if (['playing', 'paused'].includes(model.view().status)) { event.preventDefault(); togglePause(); }
        return;
      }
      if ((key === 'Enter' || key === 'Space') && !el('knOverlay').hidden) {
        event.preventDefault(); begin(); return;
      }
      if (model.view().status !== 'playing') return;
      if (key === 'KeyA' || event.key?.toLowerCase() === 'a' || key === 'ArrowLeft') { event.preventDefault(); step('left'); }
      else if (key === 'KeyD' || event.key?.toLowerCase() === 'd' || key === 'ArrowRight') { event.preventDefault(); step('right'); }
    });
    listen(root.document, 'keyup', event => held.delete(event.code || event.key));
    listen(root, 'blur', interrupt);
    listen(root, 'pagehide', interrupt);
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    onCleanup(() => {
      alive = false; held.clear(); stopLoop(); container.classList.remove('kn-host'); container.innerHTML = '';
    });

    setFeedback('Canh nhịp rồi bước.'); render();
    return { getModel: () => model, begin, restart, pause: togglePause };
  }

  root.NP_KeoNhip = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

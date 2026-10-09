/* Original touch-first rope puzzle presentation for Cắt Dây. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_CutRopeModel;
    if (!container || !M || !session?.listen || !session?.requestAnimationFrame
      || !session?.cancelAnimationFrame || !session?.onCleanup) {
      throw new TypeError('Cắt Dây needs its model, container, and an active game session');
    }

    container.classList.add('ct-host');
    container.innerHTML = `
      <section class="ct-game" id="ctGame" tabindex="0" aria-label="Cắt Dây, trò chơi giải đố vật lý">
        <header class="ct-head">
          <div class="ct-title"><span class="ct-kicker">TRÒ CHƠI VẬT LÝ · 3 MÀN</span><h2>Cắt Dây</h2></div>
          <div class="ct-score" aria-label="Điểm số"><span>Điểm <b id="ctScore">0</b></span><span>Màn <b id="ctStage">1 / 3</b></span></div>
          <div class="ct-actions">
            <button class="ct-icon" id="ctPause" type="button" aria-label="Tạm dừng" title="Tạm dừng · P">II</button>
            <button class="ct-icon" id="ctRestart" type="button" aria-label="Chơi lại màn" title="Chơi lại màn">↻</button>
          </div>
        </header>
        <p class="ct-help" id="ctHelp">Vuốt qua dây để thả kẹo. Gom sao rồi đưa kẹo vào miệng ếch.</p>
        <div class="ct-arena-wrap">
          <canvas class="ct-arena" id="ctArena" width="360" height="540" tabindex="0" role="img" aria-label="Dây treo một viên kẹo, ba ngôi sao và miệng ếch ở phía dưới" aria-describedby="ctHelp">Vuốt qua dây treo viên kẹo để cắt dây.</canvas>
          <div class="ct-overlay" id="ctOverlay" hidden role="group" aria-labelledby="ctOverlayTitle" aria-describedby="ctOverlayCopy">
            <div class="ct-card"><span class="ct-card-mark" aria-hidden="true">✦</span><h3 id="ctOverlayTitle"></h3><p id="ctOverlayCopy"></p><button class="ct-primary" id="ctOverlayAction" type="button"></button><button class="ct-secondary" id="ctOverlayRestart" type="button">Chơi lại màn</button></div>
          </div>
        </div>
        <div class="ct-bottom-row">
          <p class="ct-status" id="ctStatus" role="status" aria-live="polite" aria-atomic="true">Canh lúc kẹo đang đung đưa rồi vuốt qua dây.</p>
          <div class="ct-tools" role="group" aria-label="Điều khiển">
            <span class="ct-stars" id="ctStars" aria-label="Sao đã nhặt">☆ ☆ ☆</span>
            <button class="ct-cut" id="ctCut" type="button" aria-label="Cắt dây, phím cách">Cắt dây</button>
          </div>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('ctArena'), ctx = canvas?.getContext?.('2d');
    if (!ctx) {
      container.classList.remove('ct-host'); container.innerHTML = '';
      throw new Error('Cắt Dây needs canvas support');
    }
    canvas.width = M.WIDTH; canvas.height = M.HEIGHT;

    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let model = M.create(), alive = true, raf = null, lastFrame = null;
    let dragStart = null, dragCurrent = null, message = 'Canh lúc kẹo đang đung đưa rồi vuốt qua dây.';
    const W = M.WIDTH, H = M.HEIGHT;

    function stopLoop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; lastFrame = null;
    }

    function setMessage(text) { message = text; el('ctStatus').textContent = text; }

    function drawStar(x, y, radius, collected) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2); ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? radius * 0.43 : radius;
        const angle = i * Math.PI / 5;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath(); ctx.fillStyle = collected ? '#fff2b6' : '#ffd86f';
      ctx.strokeStyle = collected ? '#fff8db' : '#f3a94c'; ctx.lineWidth = 2;
      ctx.shadowColor = collected ? '#fff2b6' : 'rgba(255,214,112,.55)'; ctx.shadowBlur = collected ? 15 : 5;
      ctx.fill(); ctx.stroke(); ctx.restore();
    }

    function drawCandy(candy) {
      ctx.save(); ctx.translate(candy.x, candy.y); ctx.rotate(Math.atan2(candy.vy, candy.vx) * 0.08);
      ctx.fillStyle = 'rgba(38,54,49,.18)'; ctx.beginPath(); ctx.ellipse(0, 17, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f27e63'; ctx.strokeStyle = '#a84548'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, -4); ctx.lineTo(-19, -10); ctx.lineTo(-18, 1); ctx.lineTo(-12, 5);
      ctx.lineTo(12, 5); ctx.lineTo(18, 1); ctx.lineTo(19, -10); ctx.lineTo(11, -4);
      ctx.quadraticCurveTo(0, -14, -11, -4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -1, 12, 10, 0, 0, Math.PI * 2); ctx.fillStyle = '#ff9a75'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff0d2'; ctx.beginPath(); ctx.arc(-3, -4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawReceiver(receiver) {
      // A small original leaf frog, drawn as a clear catch target.
      ctx.save(); ctx.translate(receiver.x, receiver.y + 2);
      ctx.fillStyle = 'rgba(42,67,55,.16)'; ctx.beginPath(); ctx.ellipse(0, 24, 50, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7fc68a'; ctx.strokeStyle = '#367d5a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 9, 37, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-18, -7, 12, 0, Math.PI * 2); ctx.arc(18, -7, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f9f2da'; ctx.beginPath(); ctx.arc(-17, -7, 6, 0, Math.PI * 2); ctx.arc(17, -7, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#234d48'; ctx.beginPath(); ctx.arc(-16, -6, 2.4, 0, Math.PI * 2); ctx.arc(18, -6, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#285949'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 8, 18, 0.16, Math.PI - 0.16); ctx.stroke();
      ctx.fillStyle = '#d7868a'; ctx.beginPath(); ctx.ellipse(0, 16, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function draw(v) {
      const palettes = [
        ['#b8e6e3', '#f7efd0', '#d5e9b1'], ['#b6d5e4', '#f2e7c9', '#bfd5a7'], ['#aebcdc', '#ebe2ce', '#c5d1aa']
      ];
      const palette = palettes[v.level] || palettes[0];
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, palette[0]); sky.addColorStop(.68, palette[1]); sky.addColorStop(1, palette[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // Soft hills and sun-speckled sky provide original scene art without image dependencies.
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(300, 76, 29, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.33)'; ctx.beginPath(); ctx.ellipse(70, 95, 36, 12, 0, 0, Math.PI * 2); ctx.ellipse(91, 89, 23, 15, 0, 0, Math.PI * 2); ctx.ellipse(111, 96, 31, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(114,168,132,.2)'; ctx.beginPath(); ctx.moveTo(0, 460); ctx.quadraticCurveTo(94, 412, 193, 466); ctx.quadraticCurveTo(275, 424, W, 462); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      for (let i = 0; i < 7; i++) {
        const x = 18 + i * 54, lean = i % 2 ? -8 : 7;
        ctx.strokeStyle = 'rgba(73,137,100,.42)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + lean, 475, x - lean * .4, 440 - (i % 3) * 7); ctx.stroke();
        ctx.fillStyle = 'rgba(105,171,120,.52)'; ctx.beginPath(); ctx.ellipse(x - 7, 456, 12, 5, -.55, 0, Math.PI * 2); ctx.ellipse(x + 6, 446, 12, 5, .55, 0, Math.PI * 2); ctx.fill();
      }
      // Anchor and rope segments.
      ctx.fillStyle = '#714c46'; ctx.strokeStyle = '#4f3d36'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(v.anchor.x, v.anchor.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dab47d'; ctx.beginPath(); ctx.arc(v.anchor.x, v.anchor.y, 5, 0, Math.PI * 2); ctx.fill();
      for (const piece of v.rope) {
        ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#9a704c';
        ctx.beginPath(); ctx.moveTo(piece.start.x, piece.start.y); ctx.lineTo(piece.end.x, piece.end.y); ctx.stroke();
        const knotX = (piece.start.x + piece.end.x) / 2, knotY = (piece.start.y + piece.end.y) / 2;
        ctx.fillStyle = piece.index % 2 ? '#d8b37a' : '#b98959'; ctx.beginPath(); ctx.arc(knotX, knotY, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      for (const hazard of v.hazards) {
        ctx.fillStyle = '#8b6b72'; ctx.strokeStyle = '#624d57'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius + 2, Math.PI, Math.PI * 2); ctx.lineTo(hazard.x + hazard.radius + 2, hazard.y + 9); ctx.lineTo(hazard.x - hazard.radius - 2, hazard.y + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (let x = hazard.x - hazard.radius + 4; x < hazard.x + hazard.radius; x += 13) {
          ctx.fillStyle = '#f2d4a1'; ctx.beginPath(); ctx.moveTo(x, hazard.y + 1); ctx.lineTo(x + 6, hazard.y - 8); ctx.lineTo(x + 12, hazard.y + 1); ctx.closePath(); ctx.fill();
        }
      }
      for (const star of v.stars) if (!star.collected) drawStar(star.x, star.y, 13, false);
      // A faint ring marks the catch zone, with the frog itself below its center.
      ctx.strokeStyle = 'rgba(44,125,82,.48)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(v.receiver.x, v.receiver.y, v.receiver.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      drawReceiver(v.receiver);
      drawCandy(v.candy);
      if (dragStart && dragCurrent) {
        ctx.strokeStyle = '#fff7da'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.globalAlpha = .8;
        ctx.beginPath(); ctx.moveTo(dragStart.x, dragStart.y); ctx.lineTo(dragCurrent.x, dragCurrent.y); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }

    function showOverlay(v) {
      const overlay = el('ctOverlay');
      if (v.status === 'playing') { overlay.hidden = true; return; }
      overlay.hidden = false;
      if (v.status === 'paused') {
        el('ctOverlayTitle').textContent = 'Tạm dừng';
        el('ctOverlayCopy').textContent = `${v.levelName} · ${v.starsCollected}/${v.starCount} sao · ${v.score} điểm`;
        el('ctOverlayAction').textContent = 'Tiếp tục'; el('ctOverlayRestart').hidden = false;
      } else if (v.status === 'lost') {
        el('ctOverlayTitle').textContent = v.lossReason === 'hazard' ? 'Chạm gai mất rồi!' : 'Kẹo rơi mất rồi!';
        el('ctOverlayCopy').textContent = `Đã nhặt ${v.starsCollected}/${v.starCount} sao · ${v.score} điểm. Thử canh nhịp cắt khác nhé.`;
        el('ctOverlayAction').textContent = 'Thử lại'; el('ctOverlayRestart').hidden = true;
      } else if (v.status === 'campaign-won') {
        el('ctOverlayTitle').textContent = 'Ếch no bụng!';
        el('ctOverlayCopy').textContent = `Hoàn thành ba màn · ${v.score} điểm.`;
        el('ctOverlayAction').textContent = 'Chơi lại từ đầu'; el('ctOverlayRestart').hidden = true;
      } else {
        el('ctOverlayTitle').textContent = 'Đã cho ếch ăn!';
        el('ctOverlayCopy').textContent = `${v.levelName} · ${v.starsCollected}/${v.starCount} sao · +${v.levelScore} điểm.`;
        el('ctOverlayAction').textContent = 'Màn kế →'; el('ctOverlayRestart').hidden = false;
      }
    }

    function render() {
      if (!alive) return;
      const v = model.view();
      el('ctScore').textContent = String(v.score);
      el('ctStage').textContent = `${v.levelNumber} / ${v.levelCount} · ${v.levelName}`;
      el('ctStars').textContent = `${'★ '.repeat(v.starsCollected)}${'☆ '.repeat(v.starCount - v.starsCollected)}`.trim();
      el('ctStars').setAttribute('aria-label', `${v.starsCollected} trên ${v.starCount} sao đã nhặt`);
      el('ctPause').disabled = !['playing', 'paused'].includes(v.status);
      el('ctPause').textContent = v.status === 'paused' ? '>' : 'II';
      el('ctPause').setAttribute('aria-label', v.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng');
      el('ctCut').disabled = v.status !== 'playing' || !v.attached;
      el('ctStatus').textContent = message;
      showOverlay(v); draw(v);
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
        const oldStars = model.view().starsCollected;
        model.step(elapsed / 1000);
        const v = model.view();
        if (v.starsCollected > oldStars) setMessage('Đã nhặt sao!');
        if (v.status === 'won' || v.status === 'campaign-won') setMessage('Đưa kẹo vào miệng ếch thành công!');
        else if (v.status === 'lost') setMessage(v.lossReason === 'hazard' ? 'Kẹo vướng gai. Thử cắt ở nhịp khác.' : 'Kẹo rơi khỏi vườn. Thử lại nhé.');
      }
      lastFrame = timestamp;
      render();
      if (model.view().status === 'playing') raf = requestAnimationFrame(frame);
      else lastFrame = null;
    }

    function interrupt() {
      if (model.pause()) {
        stopLoop(); dragStart = null; dragCurrent = null;
        setMessage('Tự tạm dừng khi rời trò chơi.'); render();
      }
    }

    function togglePause() {
      if (model.pause()) {
        stopLoop(); dragStart = null; dragCurrent = null; setMessage('Đã tạm dừng.'); render();
      } else if (model.resume()) {
        setMessage('Tiếp tục đung đưa.'); render(); schedule();
      }
    }

    function gamePoint(event) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width ? W / rect.width : 1, scaleY = rect.height ? H / rect.height : 1;
      return { x: (Number(event.clientX) - rect.left) * scaleX, y: (Number(event.clientY) - rect.top) * scaleY };
    }

    function applyCut(start, end) {
      const result = model.cut(start, end);
      if (result.cut) setMessage('Dây đã đứt! Kẹo đang bay…');
      else if (result.accepted && model.view().attached) setMessage('Vuốt ngang qua đoạn dây để cắt.');
      render();
      if (model.view().status === 'playing') schedule();
      return result;
    }

    function cutFromButton() {
      const v = model.view();
      if (!v.attached || v.status !== 'playing') return;
      const piece = v.rope[Math.floor(v.rope.length / 2)];
      applyCut(piece ? { x: (piece.start.x + piece.end.x) / 2, y: (piece.start.y + piece.end.y) / 2 } : v.candy);
    }

    function restart() {
      model.restart(); dragStart = null; dragCurrent = null;
      setMessage('Màn mới. Chờ kẹo đung đưa rồi cắt dây.'); render(); schedule();
    }

    listen(canvas, 'pointerdown', event => {
      if (model.view().status !== 'playing' || !model.view().attached) return;
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault?.(); dragStart = gamePoint(event); dragCurrent = dragStart; render();
    });
    listen(canvas, 'pointermove', event => {
      if (!dragStart) return;
      dragCurrent = gamePoint(event); render();
    });
    listen(root.document, 'pointerup', event => {
      if (!dragStart) return;
      const start = dragStart, end = gamePoint(event);
      dragStart = null; dragCurrent = null;
      applyCut(start, end);
    });
    listen(el('ctCut'), 'click', cutFromButton);
    listen(el('ctPause'), 'click', togglePause);
    listen(el('ctRestart'), 'click', restart);
    listen(el('ctOverlayRestart'), 'click', restart);
    listen(el('ctOverlayAction'), 'click', () => {
      const v = model.view();
      if (v.status === 'paused') { togglePause(); return; }
      if (v.status === 'lost' || v.status === 'won') {
        if (v.status === 'won') model.nextLevel(); else model.restart();
      } else if (v.status === 'campaign-won') model.newGame();
      setMessage('Màn mới. Canh lúc kẹo đung đưa rồi cắt dây.'); render(); schedule();
    });
    listen(root.document, 'keydown', event => {
      if (!alive || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (typeof container.contains === 'function' && !container.contains(event.target)) return;
      if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.code || event.key;
      if (key === 'KeyP' || event.key?.toLowerCase() === 'p' || key === 'Escape') {
        if (['playing', 'paused'].includes(model.view().status)) { event.preventDefault(); togglePause(); }
      } else if ((key === 'Space' || event.key === ' ') && model.view().status === 'playing') {
        event.preventDefault(); cutFromButton();
      }
    });
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    listen(root, 'blur', interrupt);
    listen(root, 'pagehide', interrupt);
    onCleanup(() => {
      if (!alive) return;
      alive = false; stopLoop(); dragStart = null; dragCurrent = null;
      container.classList.remove('ct-host'); container.innerHTML = '';
    });

    render(); schedule();
    return { getModel: () => model, restart, togglePause, cut: cutFromButton, destroy: () => { alive = false; stopLoop(); container.classList.remove('ct-host'); container.innerHTML = ''; } };
  }

  root.NP_CutRope = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

/* Original solo-first platform arcade: Mầm Gió traps Mực Rêu in drifting bubbles. */
(function () {
  'use strict';

  const W = 760;
  const H = 430;

  function mount(container, session, audio) {
    const M = window.NP_BubbleTrapModel;
    if (!M) throw new Error('Mầm Gió chưa sẵn sàng');
    if (!session || typeof session.listen !== 'function' || typeof session.requestAnimationFrame !== 'function') {
      throw new Error('Phiên chơi chưa sẵn sàng');
    }
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    let model = M.create();
    let alive = true;
    let paused = false;
    let raf = null;
    let lastTime = null;
    const pressed = new Set();
    container.classList.add('mg-host');
    container.innerHTML = `
      <section class="mg-game" aria-label="Mầm Gió: trò chơi nhảy và bẫy bóng">
        <header class="mg-header">
          <div class="mg-title-wrap"><span class="mg-mark" aria-hidden="true">✦</span><div><h2>Mầm Gió</h2><p>Bọt bay, mực rêu chạy!</p></div></div>
          <div class="mg-header-actions">
            <button class="mg-icon" id="mgPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
            <button class="mg-icon" id="mgReplay" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button>
          </div>
        </header>
        <div class="mg-hud" aria-label="Điểm, chặng và lượt chơi">
          <div class="mg-stat"><span>Điểm</span><strong id="mgScore">0</strong></div>
          <div class="mg-stat mg-stage-stat"><span id="mgStageName">Sân Sương Non</span><strong id="mgStage">Chặng 1 / 3</strong></div>
          <div class="mg-stat"><span>Còn lại</span><strong id="mgEnemies">3</strong></div>
          <div class="mg-stat"><span>Lượt</span><strong id="mgLives" aria-label="3 lượt">● ● ●</strong></div>
        </div>
        <div class="mg-playfield">
          <canvas id="mgCanvas" width="760" height="430" role="img" tabindex="0"
            aria-label="Sân chơi platform. Trái phải để đi, mũi tên lên hoặc Space để nhảy, X để thổi bọt và chạm bọt lần nữa để ghi điểm."></canvas>
          <div class="mg-overlay" id="mgOverlay" hidden>
            <div class="mg-overlay-card">
              <span class="mg-overlay-spark" aria-hidden="true">✦</span>
              <strong id="mgResult">Tạm dừng</strong>
              <span id="mgResultNote">Sân vườn đang chờ.</span>
              <button class="mg-action" id="mgOverlayAction" type="button">Tiếp tục</button>
            </div>
          </div>
        </div>
        <div class="mg-controls" role="group" aria-label="Điều khiển">
          <button class="mg-control mg-move" id="mgLeft" type="button" aria-label="Đi sang trái">←</button>
          <button class="mg-control mg-jump" id="mgJump" type="button" aria-label="Nhảy">Nhảy ↑</button>
          <button class="mg-control mg-bubble" id="mgBubble" type="button" aria-label="Thổi bọt hoặc chạm bọt để ghi điểm">Thổi bọt ✦</button>
          <button class="mg-control mg-move" id="mgRight" type="button" aria-label="Đi sang phải">→</button>
        </div>
        <p class="mg-help">← → đi · ↑ / Space nhảy · X thổi bọt, chạm bọt lần nữa để ghi điểm</p>
        <p class="mg-live" id="mgLive" role="status" aria-live="polite" aria-atomic="true">Ba lượt. Bẫy từng con rồi chạm bọt để ghi điểm.</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('mgCanvas');
    const ctx = canvas.getContext('2d');

    function tone(kind, chain = 1) {
      if (window.NEWPLAYGROUND_MUTED === true || window.NP_Audio?.isMuted || !audio?.tone) return;
      try {
        if (kind === 'jump') audio.tone(354, 'sine', 0.055, 0.025);
        else if (kind === 'breathe') audio.tone(520, 'sine', 0.065, 0.024);
        else if (kind === 'trap') { audio.tone(690, 'triangle', 0.09, 0.035); audio.tone(920, 'sine', 0.12, 0.018); }
        else if (kind === 'pop') {
          audio.tone(750 + Math.min(5, chain - 1) * 70, 'triangle', 0.12, 0.035);
          audio.tone(1120 + Math.min(5, chain - 1) * 90, 'sine', 0.15, 0.022);
        } else if (kind === 'ouch') audio.tone(138, 'sawtooth', 0.17, 0.035);
        else if (kind === 'escape') audio.tone(245, 'triangle', 0.11, 0.024);
        else if (kind === 'round-clear') { audio.tone(660, 'sine', 0.11, 0.03); audio.tone(880, 'triangle', 0.16, 0.022); }
        else if (kind === 'won') { audio.tone(784, 'sine', 0.13, 0.032); audio.tone(988, 'triangle', 0.18, 0.026); audio.tone(1174, 'sine', 0.22, 0.022); }
      } catch (_) {}
    }

    function announce(message) { el('mgLive').textContent = message; }

    function drainEvents() {
      for (const event of model.drain()) {
        tone(event.kind, event.chain);
        if (event.kind === 'jump') announce('Nhảy lên!');
        else if (event.kind === 'breathe') announce('Bọt bay tới. Canh hướng của Mầm Gió.');
        else if (event.kind === 'trap') announce('Bắt được một Mực Rêu. Chạm bọt để ghi điểm.');
        else if (event.kind === 'escape') announce('Bọt tan mất. Mực Rêu chạy tiếp.');
        else if (event.kind === 'pop') announce(`Bọt nổ! +${event.points} điểm${event.chain > 1 ? `, chuỗi ${event.chain}` : ''}.`);
        else if (event.kind === 'ouch') announce(event.lives > 0 ? `Chạm phải Mực Rêu. Còn ${event.lives} lượt.` : 'Hết lượt. Thử lại nhé.');
        else if (event.kind === 'round-clear') announce(`Dọn sạch ${model.view().stage.name}! Sang chặng tiếp theo.`);
        else if (event.kind === 'round-start') announce(`Chặng ${event.round}: ${event.name}.`);
        else if (event.kind === 'won') announce(`Thắng rồi! ${event.score} điểm sau ${event.rounds} chặng.`);
        else if (event.kind === 'lost') announce('Hết lượt. Chơi lại để thử lần nữa.');
      }
    }

    function roundedRect(x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
    }

    function drawHills(color, y, amp, phase) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.012 + phase) * amp + Math.cos(x * 0.021 + phase) * amp * 0.26);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }

    function drawLantern(x, y, scale, color, glow = false) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      if (glow) { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 27); g.addColorStop(0, 'rgba(255,226,151,.36)'); g.addColorStop(1, 'rgba(255,226,151,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#4c5961'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -21); ctx.quadraticCurveTo(3, -29, 12, -29); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,242,199,.52)'; ctx.beginPath(); ctx.ellipse(-3, -3, 3, 6, -.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawBackground(v) {
      const theme = v.stage.theme;
      const top = theme === 'dawn' ? '#a9dcd1' : theme === 'firefly' ? '#253d55' : '#433c66';
      const bottom = theme === 'dawn' ? '#f0d9a6' : theme === 'firefly' ? '#6a6c76' : '#f0a899';
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, top); sky.addColorStop(1, bottom);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      if (theme === 'dawn') {
        const sun = ctx.createRadialGradient(614, 84, 5, 614, 84, 54); sun.addColorStop(0, 'rgba(255,249,209,.9)'); sun.addColorStop(1, 'rgba(255,220,149,0)');
        ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(614, 84, 54, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(614, 84, 22, 0, Math.PI * 2); ctx.fill();
        drawHills('#a3c59d', 239, 22, 0.2); drawHills('#698b78', 298, 25, 1.1);
        for (let i = 0; i < 5; i++) drawLantern(95 + i * 135, 115 + (i % 2) * 24, .48 + (i % 3) * .05, ['#f1a77e', '#f5d57e', '#a7d2ac'][i % 3]);
      } else if (theme === 'firefly') {
        ctx.fillStyle = '#f3d99a'; ctx.beginPath(); ctx.arc(630, 77, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#34485b'; ctx.beginPath(); ctx.arc(640, 69, 23, 0, Math.PI * 2); ctx.fill();
        drawHills('#526779', 250, 18, .8); drawHills('#3f665f', 307, 23, 1.8);
        for (let i = 0; i < 18; i++) {
          const x = (i * 173 + 41) % W, y = 65 + ((i * 79) % 224), pulse = .55 + .45 * Math.sin(v.elapsed * 2.3 + i * 1.7);
          ctx.fillStyle = `rgba(246,221,146,${.25 + pulse * .55})`; ctx.beginPath(); ctx.arc(x, y, 1.8 + pulse * 2, 0, Math.PI * 2); ctx.fill();
        }
        [112, 334, 568, 698].forEach((x, i) => drawLantern(x, 155 + (i % 2) * 27, .8, ['#f2c375', '#e9a488'][i % 2], true));
      } else {
        ctx.fillStyle = '#f6dca6'; ctx.beginPath(); ctx.arc(123, 75, 23, 0, Math.PI * 2); ctx.fill();
        drawHills('#71627d', 245, 20, .6); drawHills('#5b5675', 300, 24, 1.3);
        for (let i = 0; i < 4; i++) {
          const x = 62 + i * 190, y = 196 + (i % 2) * 32;
          ctx.fillStyle = i % 2 ? '#b97777' : '#936d89';
          ctx.beginPath(); ctx.moveTo(x - 52, y + 28); ctx.lineTo(x, y - 7); ctx.lineTo(x + 52, y + 28); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#e9c4a1'; ctx.fillRect(x - 42, y + 28, 84, 50);
          ctx.fillStyle = '#765c70'; ctx.fillRect(x - 8, y + 44, 16, 34);
        }
        for (let i = 0; i < 13; i++) {
          const x = (i * 83 + v.elapsed * 33) % W, y = (i * 53 + v.elapsed * 57) % 240;
          ctx.strokeStyle = 'rgba(222,231,235,.43)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 14); ctx.stroke();
        }
      }
      // Wind ribbons and seed specks are authored for this garden, not sourced art.
      ctx.strokeStyle = 'rgba(250,249,219,.38)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const y = 120 + i * 41 + Math.sin(v.elapsed * .7 + i) * 5;
        ctx.beginPath(); ctx.moveTo(24, y); ctx.bezierCurveTo(153, y - 12, 226, y + 18, 350, y); ctx.stroke();
      }
    }

    function drawPlatform(p) {
      ctx.save();
      ctx.fillStyle = 'rgba(22,35,42,.22)'; ctx.beginPath(); ctx.ellipse(p.x + p.width / 2, p.y + 15, p.width / 2, 10, 0, 0, Math.PI * 2); ctx.fill();
      roundedRect(p.x, p.y, p.width, 15, 7, '#654e50', '#3a4248');
      roundedRect(p.x + 2, p.y - 5, p.width - 4, 10, 6, p.trim, '#36494b');
      ctx.strokeStyle = 'rgba(248,241,205,.54)'; ctx.lineWidth = 2;
      for (let x = p.x + 18; x < p.x + p.width - 12; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, p.y + 6); ctx.quadraticCurveTo(x + 5, p.y - 3, x + 11, p.y + 5); ctx.stroke();
      }
      for (let x = p.x + 17; x < p.x + p.width - 8; x += 53) {
        ctx.fillStyle = '#f4e3b4'; ctx.beginPath(); ctx.arc(x, p.y + 18, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function drawGround() {
      const soil = ctx.createLinearGradient(0, H - 42, 0, H); soil.addColorStop(0, '#475c55'); soil.addColorStop(1, '#283a41');
      ctx.fillStyle = soil; ctx.fillRect(0, M.GROUND_Y, W, H - M.GROUND_Y);
      ctx.strokeStyle = '#d7c78c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, M.GROUND_Y); ctx.lineTo(W, M.GROUND_Y); ctx.stroke();
      for (let i = 0; i < 42; i++) {
        const x = i * 19 + (i % 3) * 2, h = 4 + (i * 7 % 9);
        ctx.strokeStyle = i % 2 ? '#95b58b' : '#d1bd76'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, M.GROUND_Y + 1); ctx.lineTo(x - 3, M.GROUND_Y - h); ctx.moveTo(x, M.GROUND_Y + 1); ctx.lineTo(x + 5, M.GROUND_Y - h * .72); ctx.stroke();
      }
    }

    function drawBubble(b, v) {
      const r = b.kind === 'trap' ? 19 : 8 + Math.max(0, 1 - b.life) * 5;
      const glow = ctx.createRadialGradient(b.x - r * .35, b.y - r * .44, 1, b.x, b.y, r * 1.45);
      glow.addColorStop(0, 'rgba(255,255,243,.96)'); glow.addColorStop(.28, b.kind === 'trap' ? 'rgba(202,245,220,.78)' : 'rgba(228,245,249,.64)');
      glow.addColorStop(.78, 'rgba(126,209,203,.25)'); glow.addColorStop(1, 'rgba(255,241,196,.12)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = b.kind === 'trap' ? 'rgba(251,241,184,.88)' : 'rgba(238,255,247,.75)'; ctx.lineWidth = b.kind === 'trap' ? 2.3 : 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, -.55, Math.PI * 1.55); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,244,.9)'; ctx.beginPath(); ctx.ellipse(b.x - r * .3, b.y - r * .42, r * .2, r * .11, -.55, 0, Math.PI * 2); ctx.fill();
      if (b.kind === 'trap') {
        const e = v.enemies.find(item => item.id === b.targetId);
        if (e) drawMoss(e.x, b.y - 1, e.color, .58, 0, true);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = '#fff3b2'; ctx.fillRect(b.x + 11 + (i % 2) * 3, b.y - 12 - i * 5, 2, 2); }
      }
    }

    function drawMoss(x, y, color, scale = 1, direction = 1, trapped = false) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale * direction, scale);
      ctx.fillStyle = 'rgba(14,27,32,.24)'; ctx.beginPath(); ctx.ellipse(0, 15, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      // A new moss seedling creature with uneven tufts, not a reference character.
      ctx.fillStyle = color; ctx.strokeStyle = '#31434a'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-15, 8); ctx.quadraticCurveTo(-19, -2, -12, -11); ctx.quadraticCurveTo(-8, -19, -1, -14);
      ctx.quadraticCurveTo(5, -22, 10, -13); ctx.quadraticCurveTo(21, -11, 16, 1); ctx.quadraticCurveTo(18, 12, 9, 13);
      ctx.lineTo(-10, 13); ctx.quadraticCurveTo(-17, 13, -15, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#35434a';
      for (const eye of [-5, 5]) { ctx.beginPath(); ctx.ellipse(eye, -3, 1.7, 2.7, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#35434a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 3, 3, .1, Math.PI - .1); ctx.stroke();
      ctx.strokeStyle = '#39474a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-10, 17); ctx.moveTo(8, 12); ctx.lineTo(10, 17); ctx.stroke();
      ctx.fillStyle = 'rgba(246,224,162,.5)'; ctx.beginPath(); ctx.arc(-9, -8, 2.2, 0, Math.PI * 2); ctx.fill();
      if (trapped) { ctx.strokeStyle = '#3b5962'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -1, 15, Math.PI * 1.08, Math.PI * 1.9); ctx.stroke(); }
      ctx.restore();
    }

    function drawMầm(x, y, facing = 1, vy = 0, blink = false, elapsed = 0) {
      ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1);
      const bob = vy < -60 ? -2 : vy > 60 ? 2 : 0;
      ctx.fillStyle = 'rgba(14,27,32,.22)'; ctx.beginPath(); ctx.ellipse(0, 37, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#315454'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, 28 + bob); ctx.lineTo(-10, 34); ctx.moveTo(8, 28 + bob); ctx.lineTo(10, 34); ctx.stroke();
      // Sprout-shaped hood, soft seed body and a wind ribbon make Mầm visually distinct.
      ctx.fillStyle = '#5d9b84'; ctx.strokeStyle = '#315454'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(0, 15 + bob, 17, 18, -.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#87c49a'; ctx.beginPath(); ctx.ellipse(-3, 10 + bob, 9, 10, -.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2cf7f'; ctx.strokeStyle = '#405c4f'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-2, -1 + bob); ctx.quadraticCurveTo(-17, -12, -10, -22); ctx.quadraticCurveTo(1, -20, 0, -5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -2 + bob); ctx.quadraticCurveTo(5, -19, 17, -17); ctx.quadraticCurveTo(18, -6, 3, 1); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#41695e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, -3 + bob); ctx.quadraticCurveTo(-6, -12, -10, -17); ctx.moveTo(5, -2 + bob); ctx.quadraticCurveTo(10, -12, 15, -14); ctx.stroke();
      ctx.fillStyle = '#263e49';
      if (blink) { ctx.strokeStyle = '#263e49'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(1, 15); ctx.lineTo(5, 15); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(2, 15 + bob, 1.6, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(9, 15 + bob, 1.6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#29474a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(5, 20 + bob, 3, .15, 1.5); ctx.stroke();
      ctx.fillStyle = '#df997b'; ctx.beginPath(); ctx.arc(-2, 20 + bob, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8a579'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-11, 23 + bob); ctx.quadraticCurveTo(-19, 25, -25, 20 + Math.sin(elapsed * 9) * 3); ctx.stroke();
      ctx.restore();
    }

    function draw(v) {
      drawBackground(v);
      for (const p of v.platforms) drawPlatform(p);
      drawGround();
      for (const bubble of v.bubbles) if (bubble.kind === 'trap') drawBubble(bubble, v);
      for (const bubble of v.bubbles) if (bubble.kind === 'shot') drawBubble(bubble, v);
      for (const enemy of v.enemies) if (enemy.mode === 'alive') drawMoss(enemy.x, enemy.y + 13, enemy.color, 1, enemy.direction);
      const blink = v.player && v.invulnerable > 0 && Math.floor(v.elapsed * 12) % 2 === 0;
      if (!blink) drawMầm(v.player.x, v.player.y, v.player.facing, v.player.vy, false, v.elapsed);
      if (v.roundClearTimer !== null) {
        ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 25px Calibri, Inter, sans-serif';
        ctx.fillStyle = '#27434c'; ctx.strokeStyle = 'rgba(255,246,218,.92)'; ctx.lineWidth = 6;
        ctx.strokeText('SÂN ĐÃ SẠCH!', W / 2, 88); ctx.fillText('SÂN ĐÃ SẠCH!', W / 2, 88); ctx.restore();
      }
    }

    function render() {
      if (!alive) return;
      const v = model.view();
      el('mgScore').textContent = String(v.score);
      el('mgStageName').textContent = v.stage.name;
      el('mgStage').textContent = `Chặng ${v.round} / ${v.roundCount}`;
      el('mgEnemies').textContent = String(v.enemiesRemaining);
      el('mgLives').textContent = `${'● '.repeat(v.lives)}${'○ '.repeat(v.maxLives - v.lives)}`.trim();
      el('mgLives').setAttribute('aria-label', `${v.lives} lượt`);
      el('mgPause').disabled = v.status !== 'playing';
      el('mgBubble').disabled = v.status !== 'playing' || v.roundClearTimer !== null || !v.attackReady;
      const overlay = el('mgOverlay');
      overlay.hidden = !(paused || v.status !== 'playing');
      if (paused) {
        el('mgResult').textContent = 'Tạm nghỉ';
        el('mgResultNote').textContent = 'Mầm Gió sẽ chờ bạn quay lại.';
        el('mgOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'won') {
        el('mgResult').textContent = 'Vườn yên rồi!';
        el('mgResultNote').textContent = `${v.score} điểm · 3 chặng đã sạch.`;
        el('mgOverlayAction').textContent = 'Chơi lại';
      } else if (v.status === 'lost') {
        el('mgResult').textContent = 'Hết lượt';
        el('mgResultNote').textContent = `Được ${v.score} điểm. Thử lại nhé.`;
        el('mgOverlayAction').textContent = 'Chơi lại';
      }
      if (v.status !== 'playing') el('mgOverlayAction').focus?.({ preventScroll: true });
      canvas.setAttribute('aria-label', `${v.stage.name}. Còn ${v.enemiesRemaining} Mực Rêu, ${v.lives} lượt. Trái phải để đi; mũi tên lên hoặc Space để nhảy; X để thổi bọt, chạm bọt lần nữa để ghi điểm.`);
      draw(v);
    }

    function controls() {
      return { move: Number(pressed.has('right') || pressed.has('ArrowRight') || pressed.has('d')) - Number(pressed.has('left') || pressed.has('ArrowLeft') || pressed.has('a')) };
    }

    function schedule() {
      if (raf === null && alive && !paused && model.view().status === 'playing') raf = requestAnimationFrame(loop);
    }

    function loop(now) {
      raf = null;
      if (!alive || paused || model.view().status !== 'playing') return;
      if (lastTime === null) lastTime = now;
      const delta = now - lastTime; lastTime = now;
      if (!Number.isFinite(delta) || delta < 0) { schedule(); return; }
      if (delta > 1200) { pause('Tạm dừng khi quay lại.'); return; }
      model.advance(Math.min(delta, 250) / 1000, controls());
      drainEvents(); render();
      if (model.view().status === 'playing') schedule();
    }

    function pause(message = 'Tạm dừng.') {
      if (!alive || paused || model.view().status !== 'playing') return;
      paused = true; pressed.clear();
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; lastTime = null; render(); announce(message);
      el('mgOverlayAction').focus?.({ preventScroll: true });
    }

    function resume() {
      if (!alive || !paused || document.hidden || model.view().status !== 'playing') return;
      paused = false; lastTime = null; render(); announce('Tiếp tục.'); schedule();
      canvas.focus?.({ preventScroll: true });
    }

    function replay() {
      if (!alive) return;
      model = M.create(); paused = false; lastTime = null; pressed.clear();
      render(); announce('Ván mới.'); canvas.focus?.({ preventScroll: true }); schedule();
    }

    function action(name) {
      if (!alive || paused || !model.act(name)) return;
      drainEvents(); render();
      if (model.view().status === 'playing') schedule();
    }

    function bindHold(id, input) {
      const button = el(id);
      const start = event => {
        event.preventDefault?.(); pressed.add(input);
        try { button.setPointerCapture?.(event.pointerId); } catch (_) {}
      };
      const end = () => pressed.delete(input);
      listen(button, 'pointerdown', start);
      listen(button, 'pointerup', end);
      listen(button, 'pointercancel', end);
      listen(button, 'lostpointercapture', end);
    }

    function pressKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      const key = String(event.key || '').toLowerCase();
      if (key === 'arrowleft' || key === 'a') { pressed.add(key === 'a' ? 'a' : 'ArrowLeft'); event.preventDefault?.(); }
      else if (key === 'arrowright' || key === 'd') { pressed.add(key === 'd' ? 'd' : 'ArrowRight'); event.preventDefault?.(); }
      else if (key === 'arrowup' || key === 'w' || key === ' ' || event.code === 'Space') { event.preventDefault?.(); action('jump'); }
      else if (key === 'x' || key === 'z') { event.preventDefault?.(); action('bubble'); }
      else if (key === 'p' || key === 'escape') { event.preventDefault?.(); paused ? resume() : pause(); }
    }

    function releaseKey(event) {
      const key = String(event.key || '').toLowerCase();
      if (key === 'arrowleft') pressed.delete('ArrowLeft');
      if (key === 'arrowright') pressed.delete('ArrowRight');
      if (key === 'a') pressed.delete('a');
      if (key === 'd') pressed.delete('d');
    }

    bindHold('mgLeft', 'left'); bindHold('mgRight', 'right');
    listen(el('mgJump'), 'click', () => action('jump'));
    listen(el('mgBubble'), 'click', () => action('bubble'));
    listen(el('mgPause'), 'click', () => paused ? resume() : pause());
    listen(el('mgReplay'), 'click', replay);
    listen(el('mgOverlayAction'), 'click', () => paused ? resume() : replay());
    listen(container, 'keydown', pressKey); listen(container, 'keyup', releaseKey);
    listen(window, 'blur', () => pause('Tạm dừng khi rời cửa sổ.'));
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Tạm dừng khi chuyển tab.'); });
    listen(window, 'pagehide', () => pause('Ván đã dừng.'));
    onCleanup(() => {
      alive = false; pressed.clear();
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; lastTime = null; container.classList.remove('mg-host');
    });

    render(); canvas.focus?.({ preventScroll: true }); schedule();
    return { getModel: () => model, pause, resume, replay, isPaused: () => paused };
  }

  window.NP_BubbleTrap = Object.freeze({ mount });
})();

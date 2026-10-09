/* Original Bắn Bi Ve view. All canvas art is procedural and drawn for this candidate. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BanBiVe = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const SAVE_KEY = 'np_ban_bi_ve_v1';
  const BACKUP_KEY = `${SAVE_KEY}_recovery`;
  const M = window.NP_BanBiVeModel;
  const COLORS = ['#70d4ff', '#ff8b72', '#b59aff', '#f4cf61'];

  function mount(container, session, options = {}) {
    if (!container || !M) throw new TypeError('Bắn Bi Ve needs a container and its model');
    if (!session) session = window.NP_GameSession?.start();
    if (!session) throw new TypeError('Bắn Bi Ve needs a game session');
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    let raw = null, saved = null, readFailed = false, preserveRaw = false, writeFailed = false;
    try {
      raw = localStorage.getItem(SAVE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (_) { readFailed = true; }
    const restored = saved?.version === 1 ? M.restore(saved.round) : null;
    let game = restored;
    if (raw && !restored) {
      try { localStorage.setItem(BACKUP_KEY, raw); }
      catch (_) { preserveRaw = true; }
    }
    if (preserveRaw) game = M.create({ seed: (Date.now() >>> 0) || 1 });
    else game ||= M.create({ seed: (Date.now() >>> 0) || 1 });

    let opponentMode = restored && (saved?.mode === 'local' || game.state.players > 2) ? 'local' : 'solo';
    let cpuPassingTurn = false;
    let alive = true, mode = restored ? (game.state.status === 'won' ? 'result' : 'paused') : 'playing';
    let frame = null, lastTime = null, saveAt = game.state.ticks;
    let pointer = null, pull = null, aimAngle = Math.atan2(M.CENTER.y - game.home().y, M.CENTER.x - game.home().x);
    let aimSpeed = 380, notice = '', lastAnnouncement = '';
    const stateEl = container;
    container.classList.add('bbv-host');
    container.innerHTML = `
      <section class="bbv-game" aria-label="Bắn Bi Ve">
        <header class="bbv-head"><span class="bbv-head-mark" aria-hidden="true">✦</span><div><h3 class="bbv-title">Bắn Bi Ve</h3><p class="bbv-subtitle">Sân bi, một cú búng chuẩn</p></div></header>
        <div class="bbv-hud"><div class="bbv-turn" id="bbvTurn">Lượt Người 1</div><div class="bbv-scores" id="bbvScores" aria-label="Điểm người chơi"></div></div>
        <div class="bbv-stage">
          <canvas id="bbvCanvas" class="bbv-canvas" width="${M.WIDTH}" height="${M.HEIGHT}" tabindex="0" aria-label="Bàn bắn bi. Kéo bi cái ngược hướng muốn bắn rồi thả. Dùng phím mũi tên để ngắm, Enter để búng."></canvas>
          <div class="bbv-cover" id="bbvCover" hidden>
            <div class="bbv-cover-card"><h4 id="bbvCoverTitle">Tạm dừng</h4><p id="bbvCoverText">Ván bi đang chờ bạn.</p><button class="bbv-button bbv-button-primary" id="bbvResume" type="button">Chơi tiếp</button></div>
          </div>
        </div>
        <div class="bbv-help"><span>Kéo bi cái ngược hướng muốn bắn rồi thả.</span><span id="bbvTargetCount">Bi trong vòng: 6</span></div>
        <div class="bbv-actions">
          <div class="bbv-mode-pick" role="group" aria-label="Chế độ chơi">
            <button class="bbv-button bbv-mode-option" type="button" data-mode="solo" aria-pressed="true">Một người</button>
            <button class="bbv-button bbv-mode-option" type="button" data-mode="local" aria-pressed="false">Chơi chung</button>
          </div>
          <div class="bbv-player-pick" id="bbvPlayerPick" role="group" aria-label="Số người chơi"><span class="bbv-player-label">Người chơi</span>
            <button class="bbv-button bbv-player-option" type="button" data-players="2" aria-pressed="true">2</button>
            <button class="bbv-button bbv-player-option" type="button" data-players="3" aria-pressed="false">3</button>
            <button class="bbv-button bbv-player-option" type="button" data-players="4" aria-pressed="false">4</button>
          </div>
          <button class="bbv-button" id="bbvFire" type="button">Búng bi</button>
          <button class="bbv-button" id="bbvPause" type="button">Tạm dừng</button>
          <button class="bbv-button" id="bbvNew" type="button">Ván mới</button>
        </div>
        <div class="bbv-sr-only" id="bbvStatus" role="status" aria-live="polite" aria-atomic="true"></div>
      </section>`;

    const el = id => container.querySelector(`#${id}`);
    const canvas = el('bbvCanvas'), ctx = canvas.getContext?.('2d');
    const cover = el('bbvCover'), coverTitle = el('bbvCoverTitle'), coverText = el('bbvCoverText'), resume = el('bbvResume');
    const turnEl = el('bbvTurn'), scoresEl = el('bbvScores'), statusEl = el('bbvStatus');

    function announce(message) {
      if (message !== lastAnnouncement) { statusEl.textContent = message; lastAnnouncement = message; }
    }
    function storageMessage(message) {
      notice = message;
      if (notice) announce(notice);
    }
    function save() {
      if (preserveRaw || readFailed) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, mode: opponentMode, round: game.serialize() }));
        writeFailed = false;
      } catch (_) {
        writeFailed = true; storageMessage('Chưa lưu được ván này. Bạn vẫn chơi tiếp được.');
      }
    }
    if (readFailed) storageMessage('Không đọc được bộ nhớ. Ván này sẽ không được lưu.');
    else if (preserveRaw) storageMessage('Bản lưu cũ được giữ nguyên vì chưa tạo được bản dự phòng.');
    else if (raw && !saved?.round) storageMessage('Bản lưu cũ đã được sao lưu.');

    function drawMarble(ball, radius, owner, pattern) {
      const base = owner === null ? '#f5f0d9' : COLORS[owner % COLORS.length];
      ctx.save();
      const gradient = ctx.createRadialGradient(ball.x - radius * .34, ball.y - radius * .4, 1, ball.x, ball.y, radius * 1.18);
      gradient.addColorStop(0, '#fffef7');
      gradient.addColorStop(.26, base);
      gradient.addColorStop(1, owner === null ? '#988c73' : '#31574c');
      ctx.beginPath(); ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
      ctx.strokeStyle = 'rgba(27, 53, 43, .45)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(ball.x, ball.y, radius * .68, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = .72; ctx.strokeStyle = '#fffdf0'; ctx.fillStyle = '#fffdf0'; ctx.lineWidth = radius * .22;
      if (pattern % 3 === 0) {
        ctx.beginPath(); ctx.moveTo(ball.x - radius, ball.y + radius * .35); ctx.lineTo(ball.x + radius, ball.y - radius * .35); ctx.stroke();
      } else if (pattern % 3 === 1) {
        ctx.beginPath(); ctx.arc(ball.x, ball.y, radius * .36, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(ball.x, ball.y - radius * .52); ctx.lineTo(ball.x + radius * .46, ball.y); ctx.lineTo(ball.x, ball.y + radius * .52); ctx.lineTo(ball.x - radius * .46, ball.y); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(ball.x - radius * .26, ball.y - radius * .38, radius * .23, radius * .12, -.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fill();
      ctx.restore();
    }

    function drawBoard() {
      const w = M.WIDTH, h = M.HEIGHT;
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#eadfb9'); bg.addColorStop(1, '#d4c59b');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(76, 91, 65, .11)';
      for (let y = 18; y < h; y += 34) for (let x = 14 + (Math.floor(y / 34) % 2) * 16; x < w; x += 38) {
        ctx.beginPath(); ctx.arc(x, y, 1 + ((x + y) % 3) * .24, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(62, 83, 63, .15)'; ctx.lineWidth = 2; ctx.strokeRect(9, 9, w - 18, h - 18);
      ctx.beginPath(); ctx.arc(M.CENTER.x, M.CENTER.y, M.RING_RADIUS + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(248, 244, 220, .92)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.arc(M.CENTER.x, M.CENTER.y, M.RING_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = '#577261'; ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.arc(M.CENTER.x, M.CENTER.y, M.RING_RADIUS - 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 251, 224, .85)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(M.CENTER.x, M.CENTER.y, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(72, 94, 70, .3)'; ctx.fill();
    }

    function direction() {
      const home = game.home();
      if (pull) {
        const dx = home.x - pull.x, dy = home.y - pull.y, n = Math.hypot(dx, dy) || 1;
        return { x: dx / n, y: dy / n, power: Math.min(100, Math.round(Math.hypot(dx, dy) / M.MAX_PULL * 100)) };
      }
      return { x: Math.cos(aimAngle), y: Math.sin(aimAngle), power: Math.round(aimSpeed / M.MAX_SPEED * 100) };
    }

    function drawAim() {
      if (game.state.phase !== 'ready') return;
      const home = game.home(), aim = direction(), end = { x: home.x + aim.x * 105, y: home.y + aim.y * 105 };
      ctx.save(); ctx.setLineDash([7, 7]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(36, 92, 75, .7)';
      ctx.beginPath(); ctx.moveTo(home.x, home.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(end.x - aim.x * 12 - aim.y * 6, end.y - aim.y * 12 + aim.x * 6); ctx.lineTo(end.x - aim.x * 12 + aim.y * 6, end.y - aim.y * 12 - aim.x * 6); ctx.closePath(); ctx.fillStyle = 'rgba(36, 92, 75, .75)'; ctx.fill();
      ctx.restore();
      if (pull) {
        const width = 5 + aim.power * .11;
        ctx.beginPath(); ctx.arc(home.x, home.y, M.SHOOTER_RADIUS + 5, -.9 * Math.PI, (-.9 + aim.power / 100 * 1.8) * Math.PI);
        ctx.strokeStyle = '#1f6655'; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
      }
    }

    function playerLabel(player) { return opponentMode === 'solo' ? (player === 0 ? 'Bạn' : 'Máy') : `Người ${player + 1}`; }

    function renderHud() {
      const state = game.state;
      turnEl.textContent = state.status === 'won'
        ? (state.winners.length > 1 ? 'Hòa ván' : `${playerLabel(state.winners[0])} thắng`)
        : `Lượt ${playerLabel(state.turn)}`;
      el('bbvTargetCount').textContent = `Bi trong vòng: ${state.targets.length}`;
      scoresEl.setAttribute('aria-label', opponentMode === 'solo' ? 'Điểm của bạn và máy' : 'Điểm người chơi');
      scoresEl.innerHTML = state.score.map((score, player) => `<span class="bbv-score" aria-current="${state.status === 'playing' && state.turn === player ? 'true' : 'false'}"><i class="bbv-score-dot" style="background:${COLORS[player]}" aria-hidden="true"></i>${playerLabel(player)}: ${score}</span>`).join('');
      for (const button of container.querySelectorAll('.bbv-mode-option')) {
        button.setAttribute('aria-pressed', button.dataset.mode === opponentMode ? 'true' : 'false');
      }
      el('bbvPlayerPick').hidden = opponentMode === 'solo';
      for (const button of container.querySelectorAll('.bbv-player-option')) {
        button.setAttribute('aria-pressed', Number(button.dataset.players) === state.players ? 'true' : 'false');
      }
      el('bbvFire').disabled = mode !== 'playing' || state.phase !== 'ready';
      el('bbvPause').disabled = mode === 'result';
      el('bbvPause').textContent = mode === 'paused' ? 'Đang dừng' : 'Tạm dừng';
      if (writeFailed) el('bbvTargetCount').textContent += ' · Chưa lưu';
      if (notice && (readFailed || preserveRaw || writeFailed)) el('bbvTargetCount').textContent += ' · Chơi tiếp được';
    }

    function showCover(title, message, buttonText) {
      coverTitle.textContent = title; coverText.textContent = message; resume.textContent = buttonText; cover.hidden = false;
    }
    function hideCover() { cover.hidden = true; }
    function draw() {
      if (!ctx) return;
      drawBoard();
      for (const ball of game.state.targets) drawMarble(ball, M.MARBLE_RADIUS, ball.owner, ball.id);
      const striker = game.state.striker;
      drawMarble(striker, M.SHOOTER_RADIUS, game.state.turn, 2);
      if (game.state.phase === 'ready') drawAim();
      renderHud();
    }

    function consumeEvents() {
      for (const event of game.drainEvents()) {
        if (event.type === 'shot') {
          announce(opponentMode === 'solo' && event.player === 1 && cpuPassingTurn ? 'Máy nhường lượt sau cú ăn bi.' : `${playerLabel(event.player)} đã búng bi.`);
          cpuPassingTurn = false;
        }
        else if (event.type === 'capture') {
          announce(`${playerLabel(event.player)} lấy được một viên bi.`);
        }
        else if (event.type === 'turn') {
          setAimForTurn();
          announce(`Lượt ${playerLabel(event.player)}.`);
          maybeCpuTurn(event.player);
        }
        else if (event.type === 'won' || event.type === 'draw') {
          mode = 'result'; frame !== null && cancelAnimationFrame(frame); frame = null;
          const title = event.type === 'draw' ? 'Hòa ván!' : `${playerLabel(event.winners[0])} thắng!`;
          showCover(title, `Đã thu được ${Math.max(...event.score)} viên bi.`, 'Ván mới');
          announce(title); save(); resume.focus?.();
        }
      }
      if (game.state.ticks - saveAt >= 90) { save(); saveAt = game.state.ticks; }
    }

    function resetInput() {
      const pointerId = pointer?.id;
      pointer = null; pull = null;
      try { if (pointerId !== undefined) canvas.releasePointerCapture?.(pointerId); } catch (_) {}
    }
    function setAimForTurn() {
      const home = game.home(); aimAngle = Math.atan2(M.CENTER.y - home.y, M.CENTER.x - home.x); aimSpeed = 380;
    }
    function startLoop() {
      if (!alive || mode !== 'playing' || frame !== null) return;
      lastTime = null; frame = requestAnimationFrame(loop);
    }
    function pause(message = '') {
      if (mode !== 'playing') return;
      mode = 'paused'; resetInput();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; save();
      showCover('Tạm dừng', message || 'Ván bi đang chờ bạn.', 'Chơi tiếp');
      draw(); resume.focus?.();
    }
    function resumeGame() {
      if (mode === 'result') {
        game = game.retry({ seed: ((game.state.seed + 1) >>> 0) || 1 });
        mode = 'playing'; setAimForTurn(); saveAt = 0; save(); announce('Ván mới bắt đầu.');
      } else if (mode === 'paused') {
        mode = 'playing'; announce('Tiếp tục ván bi.');
        if (game.state.phase === 'ready') maybeCpuTurn(game.state.turn);
      }
      hideCover(); draw(); canvas.focus?.(); startLoop();
    }
    function fire(angle = aimAngle, speed = aimSpeed) {
      if (mode !== 'playing' || game.state.phase !== 'ready') return false;
      resetInput();
      if (!game.shoot(angle, speed)) return false;
      save(); consumeEvents(); draw(); return true;
    }
    function newMatch(players = game.state.players) {
      if (!Number.isInteger(players) || players < 2 || players > 4) return;
      if (opponentMode === 'solo') players = 2;
      game = game.retry({ players, seed: ((game.state.seed + 1) >>> 0) || 1 });
      cpuPassingTurn = false;
      mode = 'playing'; setAimForTurn(); saveAt = 0; save(); hideCover(); announce(opponentMode === 'solo' ? 'Ván mới: bạn đấu máy.' : `Ván mới với ${players} người chơi.`); draw(); startLoop();
    }

    function maybeCpuTurn(player) {
      if (!alive || mode !== 'playing' || opponentMode !== 'solo' || player !== 1 || game.state.phase !== 'ready' || game.state.status !== 'playing') return false;
      const passAfterCapture = game.state.cpuScoredTurn;
      const shot = game.chooseCpuShot();
      if (!shot || !game.shoot(shot.angle, shot.speed)) {
        announce('Máy chưa ngắm được cú búng.');
        return false;
      }
      cpuPassingTurn = passAfterCapture;
      save();
      announce(passAfterCapture ? 'Máy nhường lượt sau cú ăn bi.' : shot.predictedCaptures ? `Máy búng bi, dự kiến lấy ${shot.predictedCaptures} viên.` : 'Máy búng bi.');
      return true;
    }

    function onModeChange(event) {
      const nextMode = (event.currentTarget || event.target).dataset.mode;
      if (!['solo', 'local'].includes(nextMode) || nextMode === opponentMode) return;
      opponentMode = nextMode;
      newMatch(2);
    }

    function onPlayerCount(event) {
      opponentMode = 'local';
      newMatch(Number((event.currentTarget || event.target).dataset.players));
    }
    function canvasPoint(event) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const x = (event.clientX - rect.left) * M.WIDTH / rect.width;
      const y = (event.clientY - rect.top) * M.HEIGHT / rect.height;
      return { x, y,
        inside: event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom,
        pullable: x >= -M.MAX_PULL && x <= M.WIDTH + M.MAX_PULL && y >= -M.MAX_PULL && y <= M.HEIGHT + M.MAX_PULL };
    }
    function pointerDown(event) {
      if (mode !== 'playing' || game.state.phase !== 'ready') return;
      if (event.isPrimary === false || pointer) { resetInput(); return; }
      if (event.button !== undefined && event.button !== 0) return;
      const p = canvasPoint(event), home = game.home();
      if (!p?.inside || Math.hypot(p.x - home.x, p.y - home.y) > M.SHOOTER_RADIUS * 2.6) return;
      event.preventDefault?.(); pointer = { id: event.pointerId }; pull = p;
      try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {}
      canvas.focus?.(); draw();
    }
    function pointerMove(event) {
      if (!pointer || pointer.id !== event.pointerId || mode !== 'playing') return;
      const p = canvasPoint(event); if (!p?.pullable) { resetInput(); draw(); return; }
      pull = p; draw();
    }
    function pointerUp(event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      const p = canvasPoint(event), valid = p?.pullable;
      if (valid) pull = p;
      const releasedPull = pull; resetInput();
      try { canvas.releasePointerCapture?.(event.pointerId); } catch (_) {}
      if (valid && releasedPull) {
        const home = game.home();
        const distance = Math.hypot(home.x - releasedPull.x, home.y - releasedPull.y);
        const angle = Math.atan2(home.y - releasedPull.y, home.x - releasedPull.x);
        const speed = Math.min(M.MAX_SPEED, Math.max(100, distance * 4.8));
        fire(angle, speed);
      } else draw();
    }
    function loop(now) {
      frame = null;
      if (!alive || mode !== 'playing') return;
      const delta = lastTime === null ? 0 : Math.max(0, (now - lastTime) / 1000); lastTime = now;
      if (delta > 1) { pause('Ván đã tạm dừng sau một khoảng gián đoạn.'); announce('Ván đã tạm dừng sau một khoảng gián đoạn.'); return; }
      game.advance(Math.min(0.25, delta)); consumeEvents(); draw();
      if (mode === 'playing') frame = requestAnimationFrame(loop);
    }

    listen(canvas, 'pointerdown', pointerDown); listen(canvas, 'pointermove', pointerMove); listen(canvas, 'pointerup', pointerUp);
    listen(canvas, 'pointercancel', () => { resetInput(); draw(); }); listen(canvas, 'lostpointercapture', () => { resetInput(); draw(); });
    listen(canvas, 'contextmenu', event => event.preventDefault());
    listen(window, 'pointercancel', () => { resetInput(); draw(); });
    listen(window, 'pointerup', event => { if (pointer?.id === event.pointerId) { resetInput(); draw(); } });
    listen(window, 'blur', () => pause('Ván tự dừng khi bạn rời cửa sổ.'));
    listen(window, 'pagehide', () => { pause('Ván đã tạm dừng.'); save(); });
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Ván tự dừng khi thẻ bị ẩn.'); });
    listen(canvas, 'blur', resetInput);
    listen(canvas, 'keydown', event => {
      if (mode !== 'playing' || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const key = event.key?.toLowerCase();
      if (key === 'enter' || key === ' ') { event.preventDefault(); fire(); return; }
      const turns = { arrowleft: -.055, arrowright: .055, arrowup: 0, arrowdown: 0 };
      if (!(key in turns)) return;
      event.preventDefault();
      if (key === 'arrowup') aimSpeed = Math.min(M.MAX_SPEED, aimSpeed + 28);
      else if (key === 'arrowdown') aimSpeed = Math.max(100, aimSpeed - 28);
      else aimAngle += turns[key];
      draw();
    });
    listen(resume, 'click', resumeGame);
    listen(el('bbvFire'), 'click', () => fire());
    listen(el('bbvPause'), 'click', () => pause());
    listen(el('bbvNew'), 'click', () => newMatch());
    for (const button of container.querySelectorAll('.bbv-mode-option')) listen(button, 'click', onModeChange);
    for (const button of container.querySelectorAll('.bbv-player-option')) listen(button, 'click', onPlayerCount);

    onCleanup(() => {
      if (!alive) return;
      save(); alive = false; resetInput();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; container.classList.remove('bbv-host');
    });
    if (!ctx) {
      showCover('Không mở được bàn bi', 'Canvas chưa sẵn sàng trong trình duyệt này.', 'Ván mới');
      el('bbvFire').disabled = true;
    }
    if (mode === 'result') {
      const winners = game.state.winners;
      showCover(winners.length > 1 ? 'Hòa ván!' : `${playerLabel(winners[0])} thắng!`, `Đã thu được ${Math.max(...game.state.score)} viên bi.`, 'Ván mới');
    } else if (mode === 'paused') showCover('Tiếp tục ván bi?', 'Bản lưu trên thiết bị đã được khôi phục.', 'Chơi tiếp');
    renderHud(); draw();
    if (mode === 'playing') { save(); startLoop(); }
    return { pause, snapshot: () => game.serialize(), model: () => game, resume: resumeGame, opponentMode: () => opponentMode };
  }

  return { mount };
});

/* Keep the existing exact-ID registry contract while routing this ID to its owned module. */
if (typeof window === 'object') {
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchBanBiVe = function (container) {
    const session = window.NP_GameSession?.start();
    return window.NP_BanBiVe.mount(container, session);
  };
}

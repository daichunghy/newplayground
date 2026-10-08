/* Original three-stage road cup: short races, rival side-checks, and authored hazards. */
(function () {
  'use strict';

  const W = 760;
  const H = 440;
  const SKY = 112;
  const RIDER_Y = 350;
  const SAVE_KEY = 'np_dua_gio_cup_v1';
  const RECOVERY_KEY = SAVE_KEY + '_recovery';

  function mount(container, session, audio) {
    const M = window.NP_RoadDuelModel;
    if (!M) throw new Error('Đua Gió chưa sẵn sàng');
    if (!session || typeof session.listen !== 'function' || typeof session.requestAnimationFrame !== 'function') {
      throw new Error('Phiên chơi chưa sẵn sàng');
    }
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    let motionQuery = null;
    let reducedMotion = false;
    try {
      motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
      reducedMotion = Boolean(motionQuery?.matches);
    } catch (_) { /* The game still runs when a browser lacks motion preferences. */ }
    let model = null;
    let alive = true;
    let paused = false;
    let raf = null;
    let lastTime = null;
    let currentSteer = 0;
    const pressed = new Set();
    container.classList.add('dd-host');
    container.innerHTML = `
      <section id="ddGameRoot" class="dd-game" aria-label="Đua Gió">
        <header class="dd-header">
          <div><p class="dd-stage-kicker" id="ddStageName">Chặng 1/3 · Bãi Cát</p><h2>Đua Gió</h2></div>
          <div class="dd-header-actions">
            <button class="dd-icon" id="ddPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
            <button class="dd-icon" id="ddReplayTop" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button>
          </div>
        </header>
        <nav class="dd-stage-nav" id="ddStageNav" aria-label="Chặng đua">${M.STAGES.map((stage, index) =>
          `<button class="dd-stage" id="ddStage${index}" type="button" aria-label="Chặng ${index + 1}: ${stage.name}" aria-current="${index === 0 ? 'step' : 'false'}">${index + 1}<span>${stage.name}</span><span class="dd-stage-best" id="ddStageBest${index}"></span></button>`
        ).join('')}</nav>
        <div class="dd-hud" aria-label="Thông tin cuộc đua">
          <div class="dd-stat"><span>Đường</span><strong id="ddDistance">0 / 720 m</strong></div>
          <div class="dd-progress" role="progressbar" aria-label="Quãng đường" aria-valuemin="0" aria-valuemax="720" aria-valuenow="0"><span id="ddProgress"></span></div>
          <div class="dd-stat"><span>Tốc độ</span><strong><span id="ddSpeed">65</span> km/h</strong></div>
          <div class="dd-stat"><span>Hạng</span><strong id="ddPlace">4 / 4</strong></div>
          <div class="dd-stat"><span>Va chạm</span><strong id="ddCrashes">○ ○ ○</strong></div>
        </div>
        <div class="dd-track-wrap">
          <canvas id="ddCanvas" width="760" height="440" role="img" tabindex="0"
            aria-label="Đường đua. Giữ mũi tên lên để tăng tốc, trái và phải để né, Space để tạt xe bên cạnh."></canvas>
          <div class="dd-overlay" id="ddOverlay" hidden>
            <div class="dd-overlay-card">
              <strong id="ddResult">Tạm dừng</strong>
              <span id="ddResultNote">Đường đua sẽ tiếp tục ngay.</span>
              <button class="dd-action" id="ddOverlayAction" type="button">Tiếp tục</button>
            </div>
          </div>
        </div>
        <div class="dd-controls" role="group" aria-label="Điều khiển">
          <button class="dd-control" id="ddLeft" type="button" aria-label="Lái trái">←</button>
          <button class="dd-control dd-gas" id="ddGas" type="button" aria-label="Tăng tốc">Ga ↑</button>
          <button class="dd-control" id="ddBrake" type="button" aria-label="Phanh">Phanh ↓</button>
          <button class="dd-control" id="ddRight" type="button" aria-label="Lái phải">→</button>
          <button class="dd-control dd-attack" id="ddAttack" type="button" aria-label="Tạt xe bên cạnh">Tạt</button>
        </div>
        <p class="dd-help">Giữ ↑ để tăng tốc · ← → để né · Space/Tạt sát xe để ghìm đối thủ; hụt mất đà.</p>
        <p class="dd-live" id="ddLive" role="status" aria-live="polite" aria-atomic="true">Đường đang mở.</p>
        <p class="dd-save-note" id="ddSaveNote" role="status" aria-live="polite" hidden></p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('ddCanvas');
    const gameRoot = el('ddGameRoot');
    gameRoot.setAttribute('data-motion', reducedMotion ? 'reduced' : 'full');
    const ctx = canvas.getContext('2d');
    const progressTrack = container.querySelector('.dd-progress');
    const progressFill = el('ddProgress');
    const stageButtons = M.STAGES.map((_, index) => el('ddStage' + index));
    let saveDisabled = false, saveNoticeSticky = false;
    let storedProgress = { unlockedStage: 0, bestPlaces: Array(M.STAGES.length).fill(null) };
    let rawProgress = null;
    try { rawProgress = window.localStorage.getItem(SAVE_KEY); }
    catch (_) { saveDisabled = true; saveNoticeSticky = true; el('ddSaveNote').hidden = false; el('ddSaveNote').textContent = 'Tiến trình chỉ lưu trong lượt này.'; }
    if (rawProgress && !saveDisabled) {
      let parsed = null;
      try { parsed = JSON.parse(rawProgress); } catch (_) {}
      if (parsed && Number.isInteger(parsed.version) && parsed.version > M.PROGRESS_VERSION) {
        saveDisabled = true; saveNoticeSticky = true;
        el('ddSaveNote').hidden = false; el('ddSaveNote').textContent = 'Bản lưu mới hơn được giữ nguyên.';
      } else if (M.validProgress(parsed)) storedProgress = parsed;
      else {
        try {
          window.localStorage.setItem(RECOVERY_KEY, rawProgress);
          saveNoticeSticky = true; el('ddSaveNote').hidden = false;
          el('ddSaveNote').textContent = 'Bản lưu lỗi đã được giữ lại.';
        } catch (_) {
          saveDisabled = true; saveNoticeSticky = true; el('ddSaveNote').hidden = false;
          el('ddSaveNote').textContent = 'Bản lưu lỗi vẫn được giữ nguyên.';
        }
      }
    }
    model = M.create(storedProgress.unlockedStage, storedProgress);

    function persistProgress() {
      if (saveDisabled) return false;
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(model.progress()));
        if (!saveNoticeSticky) el('ddSaveNote').hidden = true;
        return true;
      } catch (_) {
        saveDisabled = true; saveNoticeSticky = true;
        el('ddSaveNote').hidden = false; el('ddSaveNote').textContent = 'Tiến trình không lưu được. Bạn vẫn có thể đua.';
        return false;
      }
    }

    function tone(kind) {
      if (window.NEWPLAYGROUND_MUTED === true || window.NP_Audio?.isMuted) return;
      try {
        if (kind === 'hit') audio?.playTone?.(510, 'triangle', 0.07, 0.02);
        else if (kind === 'crash') audio?.playTone?.(125, 'sawtooth', 0.12, 0.03);
        else if (kind === 'finish') audio?.playTone?.(720, 'sine', 0.16, 0.03);
      } catch (_) {}
    }

    function announce(text) { el('ddLive').textContent = text; }

    function formatTime(milliseconds) {
      const totalCentiseconds = Math.round(milliseconds / 10);
      const totalSeconds = Math.floor(totalCentiseconds / 100);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      const centiseconds = String(totalCentiseconds % 100).padStart(2, '0');
      return `${minutes}:${seconds}.${centiseconds}`;
    }

    function drainEvents() {
      for (const event of model.drain()) {
        tone(event.kind);
        if (event.kind === 'hit') announce('Tạt trúng. Đối thủ chậm lại.');
        else if (event.kind === 'swing') announce('Tạt hụt. Mất đà; chờ đối thủ vào gần hơn.');
        else if (event.kind === 'crash') announce(`Va chạm. Còn ${event.remaining} lượt chịu đòn.`);
        else if (event.kind === 'avoided') announce('Né gọn.');
        else if (event.kind === 'rival-finish') announce('Một tay đua đã về đích.');
        else if (event.kind === 'finish' || event.kind === 'wrecked' || event.kind === 'last-place') {
          persistProgress();
          if (event.kind === 'finish') announce(event.status === 'won' ? `Về đích hạng ${event.place}. Thắng!` : 'Về đích cuối. Thử lại nhé.');
          else if (event.kind === 'wrecked') announce('Xe hỏng giữa đường. Thử lại nhé.');
          else announce('Các tay đua đã về đích. Thử lại nhé.');
        }
      }
    }

    function laneX(lane, y, v) {
      const depth = Math.max(0, Math.min(1, (y - SKY) / (H - SKY)));
      const half = 42 + depth * 240;
      return roadCenter(y, reducedMotion ? 0 : v.distance, v.curve) + lane * half * 1.55;
    }

    function roadCenter(y, distance, curve = 1) {
      const depth = Math.max(0, Math.min(1, (y - SKY) / (H - SKY)));
      return W / 2 + Math.sin(distance * 0.0032 * curve + depth * 2.1) * (8 + depth * 42) * curve;
    }

    function objectY(ahead) {
      const depth = Math.max(0.12, Math.min(1, 145 / (145 + Math.max(-25, ahead))));
      return SKY + (RIDER_Y - SKY) * depth;
    }

    function drawRoad(v) {
      const visualDistance = reducedMotion ? 0 : v.distance;
      const palette = v.palette === 'mist'
        ? { sky: ['#a9c9c3', '#7da5a3', '#626d70'], ridge: '#607c78', trees: '#3e615d' }
        : v.palette === 'ember'
          ? { sky: ['#e9a879', '#be765b', '#586459'], ridge: '#695349', trees: '#473d35' }
          : { sky: ['#f5c592', '#d99a74', '#64766f'], ridge: '#586e60', trees: '#405949' };
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, palette.sky[0]);
      sky.addColorStop(0.42, palette.sky[1]);
      sky.addColorStop(1, palette.sky[2]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = palette.ridge;
      ctx.beginPath();
      ctx.moveTo(0, 168); ctx.lineTo(120, 128); ctx.lineTo(235, 161); ctx.lineTo(345, 122);
      ctx.lineTo(460, 161); ctx.lineTo(594, 126); ctx.lineTo(760, 174); ctx.lineTo(760, 228); ctx.lineTo(0, 228); ctx.closePath(); ctx.fill();
      ctx.fillStyle = palette.trees;
      for (let i = 0; i < 19; i++) {
        const x = (i * 137 + 31) % W;
        const y = 188 + ((i * 23) % 42);
        const size = 10 + (i % 4) * 3;
        ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x - size * 0.65, y + 4); ctx.lineTo(x + size * 0.65, y + 4); ctx.closePath(); ctx.fill();
      }
      const left = [], right = [];
      for (let y = SKY; y <= H; y += 8) {
        const depth = (y - SKY) / (H - SKY);
        const half = 40 + depth * 244;
        const center = roadCenter(y, visualDistance, v.curve);
        left.push([center - half, y]); right.push([center + half, y]);
      }
      ctx.beginPath();
      ctx.moveTo(...left[0]);
      for (const p of left.slice(1)) ctx.lineTo(...p);
      for (const p of right.slice().reverse()) ctx.lineTo(...p);
      ctx.closePath(); ctx.fillStyle = '#353b3c'; ctx.fill();
      ctx.strokeStyle = '#e5c994'; ctx.lineWidth = 5;
      ctx.beginPath(); for (const p of left) { if (p === left[0]) ctx.moveTo(...p); else ctx.lineTo(...p); } ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < right.length; i++) { const p = right[i]; if (!i) ctx.moveTo(...p); else ctx.lineTo(...p); } ctx.stroke();
      for (let i = 0; i < 11; i++) {
        const phase = ((visualDistance * 0.09 + i * 27) % 297) / 297;
        const y = SKY + 12 + phase * (H - SKY - 14);
        const depth = (y - SKY) / (H - SKY);
        const half = 40 + depth * 244;
        const center = roadCenter(y, visualDistance, v.curve);
        const dashH = 3 + depth * 20;
        ctx.fillStyle = 'rgba(246,226,185,.76)';
        for (const divider of [-0.32, 0.32]) {
          const x = center + divider * half * 1.55;
          ctx.fillRect(x - 1.5 - depth, y, 3 + depth * 2, dashH);
        }
      }
    }

    function drawBike(x, y, scale, color, lean = 0, player = false) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean * -0.12);
      ctx.scale(scale, scale);
      ctx.fillStyle = 'rgba(21,27,27,.32)';
      ctx.beginPath(); ctx.ellipse(0, 16, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#171d20';
      ctx.beginPath(); ctx.ellipse(0, 9, 6, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -13, 5, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(13, -3); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.lineTo(-13, -3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = player ? '#f0e2c8' : '#263c43';
      ctx.fillRect(-8, -5, 16, 10);
      ctx.strokeStyle = '#191f21'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-11, -7); ctx.lineTo(-17, -12); ctx.moveTo(11, -7); ctx.lineTo(17, -12); ctx.stroke();
      ctx.fillStyle = '#22282b';
      ctx.beginPath(); ctx.ellipse(0, -25, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = player ? '#b5d2c5' : '#ddd1b0';
      ctx.beginPath(); ctx.arc(0, -28, 6, Math.PI, Math.PI * 2); ctx.fill();
      if (player) { ctx.fillStyle = '#f6cf7a'; ctx.fillRect(-3, 14, 6, 3); }
      ctx.restore();
    }

    function drawHazard(hazard, ahead, v) {
      const y = objectY(ahead);
      if (y < SKY + 4 || y > H + 10) return;
      const depth = Math.max(0.2, Math.min(1.2, 145 / (145 + ahead)));
      const x = laneX(hazard.lane, y, v);
      if (hazard.kind === 'barrier') {
        const w = 30 * depth, h = 13 * depth;
        ctx.fillStyle = '#d5b273'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = '#633d34'; ctx.lineWidth = Math.max(1, 3 * depth);
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 3 - 3 * depth, y - h / 2); ctx.lineTo(x + i * w / 3 + 3 * depth, y + h / 2); ctx.stroke(); }
      } else {
        const w = 30 * depth, h = 37 * depth;
        ctx.fillStyle = hazard.kind === 'van' ? '#84928c' : '#c2745b';
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = '#263940'; ctx.fillRect(x - w * 0.32, y - h * 0.2, w * 0.64, h * 0.24);
        ctx.fillStyle = '#f1c77f'; ctx.fillRect(x - w * 0.34, y + h * 0.31, w * 0.2, h * 0.08); ctx.fillRect(x + w * 0.14, y + h * 0.31, w * 0.2, h * 0.08);
      }
    }

    function draw(v) {
      drawRoad(v);
      for (const hazard of v.hazardsAhead) if (hazard.ahead < 220) drawHazard(hazard, hazard.ahead, v);
      for (const rider of v.rivals) {
        if (rider.finishAt !== null) continue;
        const ahead = rider.distance - v.distance;
        if (ahead > 210 || ahead < -35) continue;
        const y = objectY(ahead);
        const depth = Math.max(0.35, Math.min(0.95, 145 / (145 + Math.max(0, ahead))));
        drawBike(laneX(rider.lane, y, v), y, 0.34 + depth * 0.37, rider.stun > 0 ? '#b8b3a0' : rider.color, 0, false);
      }
      drawBike(laneX(v.lane, RIDER_Y, v), RIDER_Y, 1.03, '#d06d49', reducedMotion ? 0 : currentSteer, true);
      if (v.impactSlow > 0 && !reducedMotion) {
        ctx.strokeStyle = 'rgba(249,219,163,.78)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(laneX(v.lane, RIDER_Y, v), RIDER_Y - 8, 42, 0.15, 2.8); ctx.stroke();
      }
    }

    function render() {
      if (!alive) return;
      const v = model.view();
      el('ddStageName').textContent = `Chặng ${v.stageIndex + 1}/${v.stageCount} · ${v.stageName}`;
      el('ddDistance').textContent = `${Math.floor(v.distance)} / ${v.trackLength} m`;
      el('ddSpeed').textContent = String(Math.round(v.speed * 3.6));
      el('ddPlace').textContent = `${v.position} / 4`;
      el('ddCrashes').textContent = `${'● '.repeat(v.crashes)}${'○ '.repeat(v.maxCrashes - v.crashes)}`.trim();
      progressFill.style.width = `${Math.round(v.progress * 100)}%`;
      progressTrack.setAttribute('aria-valuenow', String(Math.floor(v.distance)));
      progressTrack.setAttribute('aria-valuemax', String(v.trackLength));
      for (let index = 0; index < stageButtons.length; index++) {
        const button = stageButtons[index], best = v.bestPlaces[index], time = v.bestTimes[index];
        button.disabled = v.status === 'playing' || index > v.unlockedStage;
        button.setAttribute('aria-current', index === v.stageIndex ? 'step' : 'false');
        const record = best === null ? '' : `Hạng ${best}${time === null ? '' : ', ' + formatTime(time)}`;
        button.setAttribute('aria-label', `Chặng ${index + 1}: ${M.STAGES[index].name}${record ? ', ' + record : ''}`);
        el('ddStageBest' + index).textContent = best === null ? '' : `H${best}${time === null ? '' : ' · ' + formatTime(time)}`;
      }
      el('ddPause').disabled = v.status !== 'playing';
      el('ddPause').textContent = paused ? '▶' : 'Ⅱ';
      el('ddPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('ddPause').setAttribute('aria-pressed', String(paused));
      el('ddAttack').disabled = v.status !== 'playing' || !v.attackReady;
      const overlay = el('ddOverlay');
      overlay.hidden = !(paused || v.status !== 'playing');
      if (paused) {
        el('ddResult').textContent = 'Tạm dừng';
        el('ddResultNote').textContent = 'Đường đua đã dừng.';
        el('ddOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'won') {
        el('ddResult').textContent = `Hạng ${v.place} / 4 · Qua chặng`;
        el('ddResultNote').textContent = v.stageIndex + 1 < v.stageCount
          ? `${formatTime(v.finishTimeMs)} · Chặng sau: ${M.STAGES[v.stageIndex + 1].name}`
          : `Cúp xong · ${formatTime(v.finishTimeMs)}`;
        el('ddOverlayAction').textContent = v.stageIndex < v.unlockedStage ? 'Chặng sau' : 'Chơi lại';
      } else if (v.status === 'lost') {
        el('ddResult').textContent = v.crashes >= v.maxCrashes ? 'Xe hỏng' : 'Về cuối';
        el('ddResultNote').textContent = `Chặng ${v.stageIndex + 1} · ${formatTime(Math.round(v.elapsed * 1000))}`;
        el('ddOverlayAction').textContent = 'Chơi lại';
      }
      if (v.status !== 'playing') el('ddOverlayAction').focus?.({ preventScroll: true });
      draw(v);
    }

    function getControls() {
      return {
        accelerate: pressed.has('gas') || pressed.has('ArrowUp') || pressed.has('KeyW'),
        brake: pressed.has('brake') || pressed.has('ArrowDown') || pressed.has('KeyS'),
        steer: Number(pressed.has('right') || pressed.has('ArrowRight') || pressed.has('KeyD')) -
          Number(pressed.has('left') || pressed.has('ArrowLeft') || pressed.has('KeyA'))
      };
    }

    function loop(now) {
      raf = null;
      if (!alive || paused || model.view().status !== 'playing') return;
      if (lastTime === null) lastTime = now;
      const delta = now - lastTime;
      lastTime = now;
      if (!Number.isFinite(delta) || delta < 0) { schedule(); return; }
      if (delta > 1200) { pause('Tạm dừng khi quay lại.'); return; }
      const controls = getControls();
      currentSteer = controls.steer;
      model.advance(Math.min(delta, 250) / 1000, controls);
      drainEvents();
      render();
      if (model.view().status === 'playing') schedule();
    }

    function schedule() {
      if (raf === null && alive && !paused && model.view().status === 'playing') raf = requestAnimationFrame(loop);
    }

    function pause(message = 'Tạm dừng.') {
      if (!alive || paused || model.view().status !== 'playing') return;
      paused = true;
      pressed.clear();
      currentSteer = 0;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; lastTime = null;
      render(); announce(message);
      el('ddOverlayAction').focus?.({ preventScroll: true });
    }

    function resume() {
      if (!alive || !paused || document.hidden || model.view().status !== 'playing') return;
      paused = false; lastTime = null; render(); announce('Tiếp tục.'); schedule();
      canvas.focus?.({ preventScroll: true });
    }

    function replay() {
      if (!alive) return;
      if (!model.replay()) return;
      paused = false; lastTime = null; pressed.clear(); currentSteer = 0;
      render(); announce('Ván mới.'); canvas.focus?.({ preventScroll: true }); schedule();
    }

    function nextStage() {
      if (!alive || !model.nextStage()) return;
      paused = false; lastTime = null; pressed.clear(); currentSteer = 0;
      render(); announce(`Bắt đầu chặng ${model.view().stageIndex + 1}.`); canvas.focus?.({ preventScroll: true }); schedule();
    }

    function chooseStage(index) {
      if (!alive || !model.selectStage(index)) return;
      paused = false; lastTime = null; pressed.clear(); currentSteer = 0;
      render(); announce(`Đua lại chặng ${index + 1}.`); canvas.focus?.({ preventScroll: true }); schedule();
    }

    function action() {
      if (!alive || paused || !model.act('attack')) return;
      drainEvents(); render();
    }

    function bindHold(id, input) {
      const button = el(id);
      const start = event => {
        event.preventDefault?.();
        pressed.add(input);
        try { button.setPointerCapture?.(event.pointerId); } catch (_) {}
      };
      const end = () => pressed.delete(input);
      listen(button, 'pointerdown', start);
      listen(button, 'pointerup', end);
      listen(button, 'pointercancel', end);
      listen(button, 'lostpointercapture', end);
    }

    bindHold('ddLeft', 'left'); bindHold('ddRight', 'right');
    bindHold('ddGas', 'gas'); bindHold('ddBrake', 'brake');
    listen(el('ddAttack'), 'click', action);
    listen(el('ddPause'), 'click', () => paused ? resume() : pause());
    listen(el('ddReplayTop'), 'click', replay);
    listen(el('ddOverlayAction'), 'click', () => {
      if (paused) resume();
      else if (model.view().status === 'won' && model.view().stageIndex < model.view().unlockedStage) nextStage();
      else replay();
    });
    for (let index = 0; index < stageButtons.length; index++) {
      listen(stageButtons[index], 'click', () => chooseStage(index));
    }
    if (motionQuery?.addEventListener) {
      listen(motionQuery, 'change', event => {
        reducedMotion = Boolean(event.matches);
        gameRoot.setAttribute('data-motion', reducedMotion ? 'reduced' : 'full');
        render();
      });
    }
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      const key = String(event.key || '').toLowerCase();
      const map = { arrowup: 'ArrowUp', w: 'KeyW', arrowdown: 'ArrowDown', s: 'KeyS', arrowleft: 'ArrowLeft', a: 'KeyA', arrowright: 'ArrowRight', d: 'KeyD' };
      if (map[key]) { pressed.add(map[key]); event.preventDefault?.(); }
      else if ((event.code === 'Space' || event.key === ' ') && !event.target?.closest?.('button')) { event.preventDefault?.(); action(); }
      else if (key === 'p') { event.preventDefault?.(); paused ? resume() : pause(); }
    });
    listen(container, 'keyup', event => {
      const key = String(event.key || '').toLowerCase();
      const map = { arrowup: 'ArrowUp', w: 'KeyW', arrowdown: 'ArrowDown', s: 'KeyS', arrowleft: 'ArrowLeft', a: 'KeyA', arrowright: 'ArrowRight', d: 'KeyD' };
      if (map[key]) pressed.delete(map[key]);
    });
    listen(window, 'blur', () => pause('Tạm dừng khi rời cửa sổ.'));
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Tạm dừng khi chuyển tab.'); });
    listen(window, 'pagehide', () => pause('Ván đã dừng.'));
    onCleanup(() => {
      alive = false; pressed.clear(); currentSteer = 0;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; lastTime = null; container.classList.remove('dd-host');
    });

    render();
    canvas.focus?.({ preventScroll: true });
    schedule();
    return { getModel: () => model, pause, resume, replay, nextStage, chooseStage,
      isPaused: () => paused, isReducedMotion: () => reducedMotion };
  }

  window.NP_RoadDuel = Object.freeze({ mount });
})();

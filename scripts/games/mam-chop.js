/* Small canvas view/input owner for the original Mầm Chớp stage. */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_MamChop = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const W = 960, H = 540;
  const SAVE_KEY = 'np_mam_chop_campaign_v1', RECOVERY_KEY = SAVE_KEY + '_recovery';
  const markup = `
    <section class="mc-game" aria-label="Mầm Chớp">
      <header class="mc-topline">
        <div><p class="mc-kicker" id="mcStageName">Màn 1/3 · Vườn Hoang</p><h2>Mầm Chớp</h2></div>
        <div class="mc-hud" aria-label="Thông tin màn chơi">
          <span id="mcHealth" class="mc-health" aria-label="Sinh lực: 4 trên 4">♥ ♥ ♥ ♥</span>
          <span id="mcEnemies" class="mc-enemies">Địch còn 4</span>
          <button id="mcPause" class="mc-small-button" type="button" aria-label="Tạm dừng" aria-pressed="false">Ⅱ</button>
          <button id="mcRestartTop" class="mc-small-button" type="button" aria-label="Chơi lại">↻</button>
        </div>
      </header>
      <nav id="mcStageNav" class="mc-stage-nav" aria-label="Chọn chặng"></nav>
      <div class="mc-frame">
        <canvas id="mcCanvas" width="960" height="540" tabindex="0" aria-label="Mầm Chớp. Đi bằng phím mũi tên hoặc A và D; nhảy bằng Space; bắn bằng Z. Giữ Z để nạp hạt sáng."></canvas>
        <div id="mcOverlay" class="mc-overlay" hidden>
          <div class="mc-card" role="dialog" aria-modal="true" aria-labelledby="mcOverlayTitle">
            <p class="mc-kicker">MẦM CHỚP</p><h3 id="mcOverlayTitle">Đường đã sáng!</h3>
            <p id="mcOverlayText">Cổng phía trước đã mở.</p>
            <div class="mc-result-actions">
              <button id="mcResume" class="mc-primary" type="button" hidden>Tiếp tục</button>
              <button id="mcReplay" class="mc-secondary" type="button">Chơi lại chặng</button>
              <button id="mcNext" class="mc-primary" type="button" hidden>Chặng sau</button>
            </div>
          </div>
        </div>
      </div>
      <div class="mc-footer">
        <p id="mcStatus" class="mc-status" role="status" aria-live="polite" aria-atomic="true">Đi / nhảy / bắn · giữ Z để nạp</p>
        <div class="mc-progress" aria-label="Tiến độ màn chơi"><span id="mcProgress"></span></div>
      </div>
      <p id="mcSaveNotice" class="mc-save-notice" hidden></p>
      <div class="mc-touchbar" aria-label="Điều khiển cảm ứng">
        <div class="mc-dpad"><button class="mc-touch" data-action="left" type="button" aria-label="Đi sang trái">←</button><button class="mc-touch" data-action="right" type="button" aria-label="Đi sang phải">→</button></div>
        <div class="mc-actions"><button class="mc-touch mc-jump" data-action="jump" type="button">Nhảy</button><button class="mc-touch mc-fire" data-action="fire" type="button">Bắn</button></div>
      </div>
      <p class="mc-help">← → / A D đi · Space nhảy · Z bắn · giữ Z để nạp</p>
    </section>`;

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function roundRect(ctx, x, y, w, h, r, fill) {
    const q = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + q, y); ctx.lineTo(x + w - q, y); ctx.quadraticCurveTo(x + w, y, x + w, y + q);
    ctx.lineTo(x + w, y + h - q); ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
    ctx.lineTo(x + q, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - q); ctx.lineTo(x, y + q); ctx.quadraticCurveTo(x, y, x + q, y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function drawBackground(ctx, camera, tick, palette, reducedMotion) {
    const colors = palette === 'mist'
      ? { sky: ['#213849', '#46636c', '#5e7469'], hills: ['#2e5059', '#27464f', '#203c45'], glow: '#9ac5af' }
      : palette === 'dawn'
        ? { sky: ['#2c3148', '#654b59', '#98705f'], hills: ['#3a4652', '#313f4a', '#273840'], glow: '#e0be8a' }
        : { sky: ['#142940', '#214754', '#397062'], hills: ['#234a56', '#1b414b', '#183a43'], glow: '#89c3a0' };
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, colors.sky[0]); sky.addColorStop(.62, colors.sky[1]); sky.addColorStop(1, colors.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd48c'; ctx.beginPath(); ctx.arc(745 - camera * .12, 142, 48, 0, Math.PI * 2); ctx.fill();
    for (let n = 0; n < 38; n++) {
      const x = ((n * 179 - camera * .16) % (W + 20) + W + 20) % (W + 20) - 10;
      const y = 30 + (n * 67 % 210);
      ctx.globalAlpha = .35 + ((n + (reducedMotion ? 0 : tick / 18)) % 3) * .13;
      ctx.fillStyle = n % 4 === 0 ? '#ffd99a' : '#d7efe4'; ctx.beginPath(); ctx.arc(x, y, n % 5 === 0 ? 2 : 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let layer = 0; layer < 3; layer++) {
      const parallax = .16 + layer * .11, base = 336 + layer * 48;
      ctx.fillStyle = colors.hills[layer];
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = -40; x <= W + 100; x += 80) {
        const world = x + camera * parallax;
        const y = base + Math.sin(world * .009 + layer * 2) * (26 + layer * 6) + Math.sin(world * .021) * 9;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = .36; ctx.strokeStyle = colors.glow; ctx.lineWidth = 2;
    for (let n = 0; n < 7; n++) {
      const x = ((n * 210 - camera * .28) % (W + 190) + W + 190) % (W + 190) - 95;
      ctx.beginPath(); ctx.moveTo(x, 305); ctx.quadraticCurveTo(x + 28, 205, x + 78, 305); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 15, 308); ctx.quadraticCurveTo(x + 38, 235, x + 63, 308); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawTerrain(ctx, camera, model) {
    const soilTop = model.palette === 'mist' ? '#63706a' : model.palette === 'dawn' ? '#745e58' : '#815f4a';
    const soilBottom = model.palette === 'mist' ? '#424c50' : model.palette === 'dawn' ? '#493d49' : '#473d43';
    const grass = model.palette === 'mist' ? '#a2bb9c' : model.palette === 'dawn' ? '#c4ab7c' : '#8bc17b';
    for (const p of model.platforms) {
      const x = Math.round(p.x - camera); if (x > W || x + p.w < 0) continue;
      if (p.kind === 'ground') {
        const soil = ctx.createLinearGradient(0, p.y, 0, H); soil.addColorStop(0, soilTop); soil.addColorStop(1, soilBottom);
        ctx.fillStyle = soil; ctx.fillRect(x, p.y, p.w, H - p.y);
        ctx.fillStyle = grass; ctx.fillRect(x, p.y, p.w, 8);
        ctx.fillStyle = '#c6dc94'; ctx.fillRect(x, p.y, p.w, 2);
        for (let at = x + 18; at < x + p.w; at += 42) { ctx.fillStyle = '#ad8560'; ctx.fillRect(at, p.y + 22 + (at % 3) * 8, 12, 3); }
      } else {
        roundRect(ctx, x, p.y, p.w, 15, 6, soilTop);
        roundRect(ctx, x, p.y, p.w, 7, 4, grass);
        ctx.fillStyle = '#d8de9b'; ctx.fillRect(x + 8, p.y + 3, Math.max(0, p.w - 16), 2);
        for (let at = x + 24; at < x + p.w - 8; at += 38) { ctx.fillStyle = '#c88f65'; ctx.beginPath(); ctx.arc(at, p.y + 11, 2, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    for (let n = 0; n < 23; n++) {
      const wx = 120 + n * 119, sx = wx - camera;
      if (sx < -12 || sx > W + 12) continue;
      const top = n % 3 === 0 ? 460 : 464, sway = Math.sin(n * 4.1) * 4;
      ctx.strokeStyle = n % 2 ? '#75ae7d' : '#a3be78'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx, 468); ctx.quadraticCurveTo(sx + sway, top + 9, sx + sway, top); ctx.stroke();
      ctx.fillStyle = n % 3 === 0 ? '#e9aa75' : '#d4d48b'; ctx.beginPath(); ctx.arc(sx + sway, top - 2, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawMarkers(ctx, camera, model, reducedMotion) {
    for (let n = 1; n < model.checkpoints.length; n++) {
      const x = model.checkpoints[n] - camera; if (x < -30 || x > W + 30) continue;
      ctx.strokeStyle = '#c5ddaa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 466); ctx.lineTo(x, 413); ctx.stroke();
      ctx.fillStyle = model.player.checkpoint >= n ? '#f6d47c' : '#8aa78c';
      ctx.beginPath(); ctx.moveTo(x + 2, 414); ctx.lineTo(x + 24, 422); ctx.lineTo(x + 2, 430); ctx.closePath(); ctx.fill();
    }
    const ex = model.exitX - 47 - camera;
    if (ex > -60 && ex < W + 60) {
      ctx.fillStyle = '#88c6a0'; ctx.fillRect(ex, 399, 6, 70); ctx.fillRect(ex + 44, 399, 6, 70);
      ctx.strokeStyle = '#c7d893'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(ex + 25, 399, 25, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#ffd48c'; ctx.beginPath(); ctx.arc(ex + 25, 410, 6 + (reducedMotion ? 0 : Math.sin(model.tick / 8) * 1.5), 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawHazards(ctx, camera, hazards, reducedMotion) {
    for (const hazard of hazards) {
      const x = hazard.x - camera;
      if (x + hazard.w < -4 || x > W + 4) continue;
      if (hazard.state === 'active') {
        ctx.fillStyle = 'rgba(237,153,112,.38)'; ctx.fillRect(x - 4, hazard.y - 11, hazard.w + 8, hazard.h + 14);
        ctx.fillStyle = '#f1a16f';
        for (let n = 0; n < hazard.w; n += 12) {
          ctx.beginPath(); ctx.moveTo(x + n, hazard.y + hazard.h); ctx.lineTo(x + n + 6, hazard.y - 8); ctx.lineTo(x + n + 12, hazard.y + hazard.h); ctx.fill();
        }
      } else {
        const warning = hazard.state === 'warning', pulse = warning ? reducedMotion ? .78 : .55 + Math.sin(hazard.phase * .34) * .25 : .18;
        ctx.globalAlpha = pulse; ctx.fillStyle = warning ? '#f5c487' : '#86a99b';
        ctx.fillRect(x, hazard.y + hazard.h - 4, hazard.w, 4);
        ctx.beginPath(); ctx.arc(x + hazard.w / 2, hazard.y + 1, warning ? 13 : 7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  function drawCrawler(ctx, e, camera, reducedMotion) {
    const x = e.x - camera, y = e.y;
    ctx.fillStyle = '#82644e'; ctx.beginPath(); ctx.ellipse(x + 17, y + 16, 17, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b88361'; ctx.beginPath(); ctx.ellipse(x + 17, y + 11, 11, 9, -.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dca17a'; ctx.beginPath(); ctx.arc(x + (e.dir > 0 ? 23 : 11), y + 15, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#253c42'; ctx.beginPath(); ctx.arc(x + (e.dir > 0 ? 24 : 10), y + 15, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b88361'; ctx.lineWidth = 3;
    for (const leg of [7, 14, 21, 28]) { const lift = reducedMotion ? 0 : Math.sin((e.phase + leg * 4) / 4) * 2; ctx.beginPath(); ctx.moveTo(x + leg, y + 21); ctx.lineTo(x + leg - 4, y + 27 + lift); ctx.stroke(); }
    ctx.strokeStyle = '#d7c28c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 12, y + 3); ctx.quadraticCurveTo(x + 3, y - 9, x + 7, y - 11); ctx.moveTo(x + 22, y + 3); ctx.quadraticCurveTo(x + 31, y - 9, x + 29, y - 11); ctx.stroke();
  }
  function drawSentry(ctx, e, camera, reducedMotion) {
    const x = e.x - camera + e.w / 2, y = e.y + 34;
    ctx.strokeStyle = '#83b884'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.quadraticCurveTo(x - 4, y + 29, x - 2, y + 42); ctx.stroke();
    const pulse = e.warning && !reducedMotion ? 1 + Math.sin(e.warning * .6) * .12 : 1;
    for (let n = 0; n < 6; n++) { const a = n * Math.PI / 3; ctx.fillStyle = e.warning ? '#f1b980' : '#e7a876'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 8 * pulse, 5 * pulse, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = e.warning ? '#fff0ad' : '#d5d591'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    if (e.warning) { ctx.strokeStyle = 'rgba(255,231,164,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 17 + (reducedMotion ? 0 : (30 - e.warning) * .35), 0, Math.PI * 2); ctx.stroke(); }
  }
  function drawGuardian(ctx, e, camera, reducedMotion) {
    const x = e.x - camera, y = e.y, open = e.state === 'open', warning = e.state === 'warning';
    if (warning) {
      ctx.strokeStyle = 'rgba(255,224,139,.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x + e.w / 2, y + e.h / 2, 48 + (reducedMotion ? 0 : Math.sin(e.warning * .7) * 5), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = open ? '#dda875' : '#74634f';
    ctx.beginPath(); ctx.ellipse(x + e.w / 2, y + e.h * .59, 31, 34, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = warning ? '#ffdfa0' : open ? '#fff2bd' : '#a8ba82';
    ctx.beginPath(); ctx.arc(x + e.w / 2, y + 25, open ? 17 : 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = open ? '#f3d875' : '#415257';
    ctx.beginPath(); ctx.arc(x + e.w / 2, y + 25, open ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c8a871'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 7, y + 53); ctx.lineTo(x - 6, y + 66); ctx.moveTo(x + e.w - 7, y + 53); ctx.lineTo(x + e.w + 6, y + 66); ctx.stroke();
  }
  function drawShot(ctx, shot, camera, tick) {
    const x = shot.x - camera, y = shot.y + shot.h / 2;
    if (shot.team === 'player') {
      const charged = shot.kind === 'charged'; ctx.strokeStyle = charged ? 'rgba(255,222,129,.68)' : 'rgba(255,232,160,.55)'; ctx.lineWidth = charged ? 9 : 5;
      ctx.beginPath(); ctx.moveTo(x - Math.sign(shot.vx) * 13, y); ctx.lineTo(x + shot.w / 2, y); ctx.stroke();
      ctx.fillStyle = charged ? '#fff1b1' : '#f7db91'; ctx.beginPath(); ctx.ellipse(x + shot.w / 2, y, charged ? 12 : 6, charged ? 9 : 5, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = shot.kind === 'glass-seed' ? '#ffe09b' : '#f3a58f';
      ctx.beginPath(); ctx.arc(x + 6, y, 7 + Math.sin(tick / 5) * .5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe2b6'; ctx.beginPath(); ctx.arc(x + 6, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawPlayer(ctx, p, camera, model, reducedMotion) {
    const x = p.x - camera, y = p.y;
    if (model.charging) {
      const pct = clamp(model.charge / root.NP_MamChopModel.CHARGE_TICKS, 0, 1);
      ctx.strokeStyle = `rgba(244,226,147,${.35 + pct * .5})`; ctx.lineWidth = 2 + pct * 3;
      ctx.beginPath(); ctx.ellipse(x + p.w / 2, y + 20, 20 + pct * 8, 25 + pct * 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (p.invuln > 0 && (reducedMotion ? true : Math.floor(p.invuln / 5) % 2 === 0)) ctx.globalAlpha = .5;
    ctx.save(); if (p.face < 0) { ctx.translate(2 * x + p.w, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = '#273b40'; ctx.beginPath(); ctx.ellipse(x + 8, y + 38, 8, 4, 0, 0, Math.PI * 2); ctx.ellipse(x + 22, y + 38, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    roundRect(ctx, x + 4, y + 17, 21, 20, 8, '#cf865c');
    ctx.fillStyle = '#e8ab72'; ctx.beginPath(); ctx.ellipse(x + 15, y + 12, 12, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#79b986'; ctx.beginPath(); ctx.moveTo(x + 11, y + 3); ctx.quadraticCurveTo(x + 2, y - 12, x + 7, y - 14); ctx.quadraticCurveTo(x + 16, y - 11, x + 15, y + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a4cf83'; ctx.beginPath(); ctx.moveTo(x + 15, y + 4); ctx.quadraticCurveTo(x + 20, y - 12, x + 27, y - 8); ctx.quadraticCurveTo(x + 27, y + 1, x + 17, y + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f8edcc'; ctx.beginPath(); ctx.arc(x + 19, y + 11, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#293d42'; ctx.beginPath(); ctx.arc(x + 20, y + 11, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#eac890'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 6, y + 24); ctx.quadraticCurveTo(x - 3, y + 25 + (reducedMotion ? 0 : Math.sin(model.tick / 4) * 4), x - 7, y + 22); ctx.stroke();
    ctx.fillStyle = '#edcc8b'; ctx.beginPath(); ctx.arc(x + 24, y + 24, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function render(canvas, model, reducedMotion = false) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const camera = model.cameraX; ctx.clearRect(0, 0, W, H);
    drawBackground(ctx, camera, model.tick, model.palette, reducedMotion); drawTerrain(ctx, camera, model); drawHazards(ctx, camera, model.hazards, reducedMotion); drawMarkers(ctx, camera, model, reducedMotion);
    for (const enemy of model.enemies) {
      if (!enemy.alive) continue;
      if (enemy.type === 'sentry') drawSentry(ctx, enemy, camera, reducedMotion);
      else if (enemy.type === 'guardian') drawGuardian(ctx, enemy, camera, reducedMotion);
      else drawCrawler(ctx, enemy, camera, reducedMotion);
    }
    for (const shot of model.shots) drawShot(ctx, shot, camera, reducedMotion ? 0 : model.tick);
    drawPlayer(ctx, model.player, camera, model, reducedMotion);
    const tint = ctx.createLinearGradient(0, 0, 0, 170); tint.addColorStop(0, 'rgba(12,28,44,.2)'); tint.addColorStop(1, 'rgba(12,28,44,0)'); ctx.fillStyle = tint; ctx.fillRect(0, 0, W, 170);
  }
  function mount(container, session, audio) {
    if (!container || !session) throw new Error('Mầm Chớp needs its own DOM container and game session.');
    const M = root.NP_MamChopModel;
    container.innerHTML = markup;
    const $ = id => container.querySelector('#' + id);
    const canvas = $('mcCanvas'), gameRoot = container.querySelector('.mc-game');
    let reducedMotion = false;
    try { reducedMotion = Boolean(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (_) { /* Keep the standard visual mode if the media preference is unavailable. */ }
    gameRoot.dataset.motion = reducedMotion ? 'reduced' : 'full';
    const status = $('mcStatus'), overlay = $('mcOverlay'), overlayTitle = $('mcOverlayTitle'), overlayText = $('mcOverlayText');
    const stageNav = $('mcStageNav'), saveNotice = $('mcSaveNotice');
    let model = null, stopped = false, paused = false, lastTime = null, frameHandle = null;
    let saveDisabled = false, preserveFutureSave = false, saveNoticePersistent = false;
    let lastSavedTick = -100, announcement = '', announcementUntil = -1;
    const pointers = new Map(), actionButtons = new Map();
    for (const button of container.querySelectorAll('.mc-touch')) if (button.dataset.action) actionButtons.set(button, button.dataset.action);

    let rawSave = null, invalidSave = false;
    try { rawSave = root.localStorage.getItem(SAVE_KEY); }
    catch (_) {
      saveDisabled = true; saveNoticePersistent = true; saveNotice.hidden = false;
      saveNotice.textContent = 'Không đọc được bản lưu. Bạn vẫn có thể chơi.';
    }
    if (rawSave && !saveDisabled) {
      let parsed = null;
      try { parsed = JSON.parse(rawSave); } catch (_) { invalidSave = true; }
      if (!parsed) invalidSave = true;
      if (parsed) {
        preserveFutureSave = Number.isInteger(parsed.version) && parsed.version > M.SAVE_VERSION;
        if (!preserveFutureSave) { model = M.restore(parsed); invalidSave = !model; }
      }
    }
    if (!model) {
      if (rawSave && invalidSave && !preserveFutureSave && !saveDisabled) {
        try { root.localStorage.setItem(RECOVERY_KEY, rawSave); }
        catch (_) {
          saveDisabled = true; saveNoticePersistent = true; saveNotice.hidden = false;
          saveNotice.textContent = 'Bản lưu lỗi vẫn được giữ nguyên. Bạn vẫn có thể chơi.';
        }
      }
      model = M.create();
    }
    if (preserveFutureSave) {
      saveDisabled = true; saveNoticePersistent = true; saveNotice.hidden = false;
      saveNotice.textContent = 'Bản lưu mới hơn được giữ nguyên. Ván này chỉ chạy trong phiên.';
    } else if (rawSave && invalidSave && !saveDisabled) {
      saveNoticePersistent = true; saveNotice.hidden = false; saveNotice.textContent = 'Bản lưu lỗi đã được giữ lại.';
    }

    stageNav.innerHTML = M.STAGES.map((stage, index) =>
      '<button class="mc-stage-button" id="mcStage' + index + '" type="button" aria-label="Chặng ' +
      (index + 1) + ': ' + stage.name + '">' + (index + 1) + '<span>' + stage.name + '</span></button>'
    ).join('');
    const stageButtons = M.STAGES.map((_, index) => $('mcStage' + index));
    function persist() {
      if (saveDisabled || preserveFutureSave) return false;
      try {
        root.localStorage.setItem(SAVE_KEY, JSON.stringify(M.serialize(model)));
        lastSavedTick = model.tick;
        if (!saveNoticePersistent) saveNotice.hidden = true;
        return true;
      } catch (_) {
        saveDisabled = true; saveNoticePersistent = true; saveNotice.hidden = false;
        saveNotice.textContent = 'Không lưu được. Bạn vẫn có thể chơi.'; return false;
      }
    }
    function showEnd(view) {
      if (view.status === 'playing' && !paused) { overlay.hidden = true; $('mcResume').hidden = true; return; }
      overlay.hidden = false;
      $('mcResume').hidden = !paused;
      if (paused) {
        overlayTitle.textContent = 'Tạm dừng';
        overlayText.textContent = 'Đường đã dừng.';
      } else {
        overlayTitle.textContent = view.status === 'won'
          ? view.stageIndex === view.stageCount - 1 ? 'Vườn sáng lại!' : 'Cổng đã mở!'
          : 'Thử lại nhé';
        overlayText.textContent = view.status === 'won'
          ? 'Chặng ' + (view.stageIndex + 1) + '/' + view.stageCount + ' · ' + view.stageName
          : 'Sinh lực đã cạn. Chặng này vẫn mở lại.';
      }
      $('mcReplay').textContent = paused || view.status === 'won' ? 'Chơi lại chặng' : 'Thử lại';
      $('mcNext').hidden = paused || view.status !== 'won' || view.stageIndex >= view.unlockedStage;
      status.textContent = paused ? 'Đã tạm dừng' : view.status === 'won' ? 'Đích đến đã tới' : 'Sinh lực đã cạn';
    }
    function updateHud() {
      const view = M.view(model);
      if (view.tick >= announcementUntil) announcement = '';
      const hearts = '♥ '.repeat(view.player.health).trim() || '—';
      gameRoot.dataset.palette = view.palette;
      $('mcStageName').textContent = 'Chặng ' + (view.stageIndex + 1) + '/' + view.stageCount + ' · ' + view.stageName;
      $('mcHealth').textContent = hearts;
      $('mcHealth').setAttribute('aria-label', 'Sinh lực: ' + view.player.health + ' trên 4');
      $('mcEnemies').textContent = view.guardian ? 'Người gác ' + view.guardian.hp + '/' + view.guardian.maxHp : 'Địch còn ' + view.enemyCount;
      $('mcProgress').style.width = String(Math.round(view.stageProgress * 100)) + '%';
      $('mcPause').disabled = view.status !== 'playing';
      $('mcPause').textContent = paused ? '▶' : 'Ⅱ';
      $('mcPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      $('mcPause').setAttribute('aria-pressed', String(paused));
      for (let index = 0; index < stageButtons.length; index++) {
        stageButtons[index].disabled = index > view.unlockedStage;
        stageButtons[index].setAttribute('aria-current', index === view.stageIndex ? 'step' : 'false');
      }
      if (view.status === 'playing') {
        status.textContent = view.charging
          ? 'Đang nạp ' + Math.round(view.charge / M.CHARGE_TICKS * 100) + '% · Địch còn ' + view.enemyCount
          : paused ? 'Đã tạm dừng' : announcement || ('Sinh lực ' + view.player.health + '/4 · Địch còn ' + view.enemyCount);
      }
      showEnd(view);
    }
    function releaseAll(cancel = false) {
      if (cancel) {
        pointers.clear(); M.cancelInputs(model); return;
      }
      for (const [id, action] of pointers) { M.setButton(model, action, false); pointers.delete(id); }
      for (const action of ['left', 'right', 'jump', 'fire']) M.setButton(model, action, false);
    }
    function sound(kind) {
      if (root.NEWPLAYGROUND_MUTED === true || root.NP_Audio?.isMuted) return;
      const notes = {
        jump: [420, 'triangle', 0.055, 0.02], seed: [560, 'sine', 0.045, 0.014],
        charge: [720, 'triangle', 0.09, 0.024], hit: [145, 'sawtooth', 0.09, 0.022],
        clear: [820, 'sine', 0.16, 0.025], lost: [115, 'triangle', 0.15, 0.022]
      }[kind];
      if (!notes) return;
      try { audio?.playTone?.(...notes); } catch (_) { /* Sound must never block play. */ }
    }
    function setAction(action, down) {
      if (paused && down) return false;
      const wasDown = model.input[action], chargedShot = model.input.fireShot;
      const ok = M.setButton(model, action, down);
      if (!ok) return ok;
      if (action === 'jump' && down && !wasDown) sound('jump');
      if (action === 'fire' && !down && wasDown && !chargedShot) sound('seed');
      return ok;
    }
    function pointerDown(event) {
      const action = actionButtons.get(event.currentTarget || event.target); if (!action) return;
      event.preventDefault(); const id = event.pointerId ?? 0;
      if (pointers.has(id)) return;
      pointers.set(id, action); setAction(action, true);
    }
    function pointerEnd(event) {
      const id = event.pointerId ?? 0, action = pointers.get(id); if (!action) return;
      pointers.delete(id); setAction(action, false);
    }
    for (const button of actionButtons.keys()) session.listen(button, 'pointerdown', pointerDown);
    session.listen(root, 'pointerup', pointerEnd);
    session.listen(root, 'pointercancel', pointerEnd);
    session.listen(root, 'blur', () => pause('Tạm dừng khi rời cửa sổ.'));
    session.listen(root.document || (typeof document !== 'undefined' ? document : null), 'visibilitychange', () => {
      if (root.document && root.document.hidden) pause('Tạm dừng khi chuyển tab.');
    });
    const keys = new Map([
      ['ArrowLeft', 'left'], ['a', 'left'], ['A', 'left'], ['ArrowRight', 'right'], ['d', 'right'], ['D', 'right'],
      ['ArrowUp', 'jump'], [' ', 'jump'], ['Spacebar', 'jump'], ['z', 'fire'], ['Z', 'fire'], ['x', 'fire'], ['X', 'fire']
    ]);
    session.listen(root, 'keydown', event => {
      if ((event.key === 'p' || event.key === 'P' || event.key === 'Escape') && !event.repeat) {
        event.preventDefault(); paused ? resume() : pause(); return;
      }
      if (event.key === 'r' || event.key === 'R') { event.preventDefault(); restart(); return; }
      const action = keys.get(event.key); if (!action) return;
      event.preventDefault(); setAction(action, true);
    });
    session.listen(root, 'keyup', event => {
      const action = keys.get(event.key); if (!action) return;
      setAction(action, false);
    });
    function schedule() {
      if (!stopped && !paused && frameHandle === null) frameHandle = session.requestAnimationFrame(loop);
    }
    function pause(message = 'Tạm dừng.') {
      if (stopped || paused || model.status !== 'playing') return false;
      paused = true; releaseAll(true); lastTime = null;
      if (frameHandle !== null) session.cancelAnimationFrame(frameHandle);
      frameHandle = null; announcement = ''; updateHud(); render(canvas, M.view(model), reducedMotion);
      status.textContent = message;
      if (!(root.document && root.document.hidden)) $('mcResume').focus?.({ preventScroll: true });
      return true;
    }
    function resume() {
      if (stopped || !paused || (root.document && root.document.hidden) || model.status !== 'playing') return false;
      paused = false; lastTime = null; updateHud(); render(canvas, M.view(model), reducedMotion);
      schedule(); canvas.focus?.({ preventScroll: true }); return true;
    }
    function restart() {
      releaseAll(); M.restart(model); paused = false; announcement = ''; lastTime = null;
      persist(); updateHud(); render(canvas, M.view(model), reducedMotion); schedule();
    }
    function chooseStage(index) {
      releaseAll();
      if (M.selectStage(model, index)) {
        paused = false; announcement = ''; lastTime = null; persist(); updateHud(); render(canvas, M.view(model), reducedMotion); schedule();
      }
    }
    function nextStage() {
      releaseAll();
      if (M.nextStage(model)) {
        paused = false; announcement = ''; lastTime = null; persist(); updateHud(); render(canvas, M.view(model), reducedMotion); schedule();
      }
    }
    session.listen($('mcReplay'), 'click', restart);
    session.listen($('mcRestartTop'), 'click', restart);
    session.listen($('mcPause'), 'click', () => paused ? resume() : pause());
    session.listen($('mcResume'), 'click', resume);
    session.listen($('mcNext'), 'click', nextStage);
    for (let index = 0; index < stageButtons.length; index++) {
      session.listen(stageButtons[index], 'click', () => chooseStage(index));
    }
    session.listen(root, 'pagehide', persist);
    function announceEvents(events) {
      for (const event of events) {
        if (event.kind === 'charge-shot') sound('charge');
        else if (event.kind === 'player-hit') sound('hit');
        else if (event.kind === 'stage-clear') sound('clear');
        else if (event.kind === 'player-out') sound('lost');
        const before = announcement;
        if (event.kind === 'hazard-warning') announcement = 'Sương sắp phun · nhảy qua';
        else if (event.kind === 'enemy-warning') announcement = 'Hoa báo trước · né hạt gai';
        else if (event.kind === 'guardian-warning') announcement = 'Người gác đang ngắm · chuẩn bị né';
        else if (event.kind === 'guardian-open') announcement = 'Lõi sáng · bắn vào người gác';
        else if (event.kind === 'guardian-guard') announcement = 'Vỏ khép lại';
        else if (event.kind === 'guardian-defeated') announcement = 'Người gác đã gục · cổng mở';
        else if (event.kind === 'exit-blocked') announcement = 'Hạ người gác rồi qua cổng';
        else if (event.kind === 'checkpoint-respawn') announcement = 'Về mốc gần nhất · còn ' + model.player.health + ' nhịp tim';
        else if (event.kind === 'player-hit') announcement = 'Trúng đòn · đang chớp bảo vệ';
        else if (event.kind === 'stage-clear') announcement = 'Đã tới cổng';
        else if (event.kind === 'player-out') announcement = 'Sinh lực đã cạn';
        if (announcement !== before) announcementUntil = model.tick + 90;
      }
    }
    function loop(now) {
      frameHandle = null;
      if (stopped || paused) return;
      if (lastTime !== null) {
        const events = M.advance(model, clamp(now - lastTime, 0, 180));
        if (events.length) { announceEvents(events); persist(); }
      }
      lastTime = now;
      const view = M.view(model);
      if (view.tick - lastSavedTick >= 100) persist();
      render(canvas, view, reducedMotion); updateHud();
      if (view.status === 'playing') schedule();
      else $('mcReplay').focus?.({ preventScroll: true });
    }
    schedule();
    session.onCleanup(() => { releaseAll(true); persist(); stopped = true; if (frameHandle !== null) session.cancelAnimationFrame(frameHandle); frameHandle = null; });
    persist();
    render(canvas, M.view(model), reducedMotion); updateHud();
    return { getModel: () => model, restart, chooseStage, pause, resume, isPaused: () => paused, isReducedMotion: () => reducedMotion };
  }

  return Object.freeze({ mount, render });
});

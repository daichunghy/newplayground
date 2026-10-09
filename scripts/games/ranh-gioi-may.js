/* Canvas view and browser inputs for the original Ranh Giới Mây encounter. */
(function (root) {
  'use strict';

  const WIDTH = 920;
  const HEIGHT = 440;
  const FLOOR = 326;
  const SAVE_KEY = 'np_ranh_gioi_campaign_v1';
  const RECOVERY_KEY = SAVE_KEY + '_recovery';
  const LABELS = { shield: 'Mầm Khiên', sling: 'Nỏ Hạt', beetle: 'Bọ Sỏi' };
  const COSTS = { shield: 28, sling: 50, beetle: 68 };

  function mount(container, game, session) {
    const M = root.NP_RanhGioiMayModel;
    if (!M) throw new Error('Ranh Giới Mây chưa sẵn sàng');
    if (!session || typeof session.listen !== 'function' || typeof session.requestAnimationFrame !== 'function') {
      throw new Error('Phiên chơi chưa sẵn sàng');
    }

    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    let model = null;
    let alive = true;
    let paused = false;
    let raf = null;
    let lastTime = null;
    container.classList.add('ef-host');
    container.innerHTML = `
      <section class="ef-game" aria-label="Ranh Giới Mây">
        <header class="ef-header">
          <div><p class="ef-kicker" id="efStageName">Chặng 1/3 · Cầu Mầm</p><h2>Ranh Giới Mây</h2></div>
          <div class="ef-header-actions">
            <button class="ef-icon" id="efPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
            <button class="ef-icon" id="efReplayTop" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button>
          </div>
        </header>
        <nav class="ef-stage-nav" id="efStageNav" aria-label="Chặng đấu">${M.STAGES.map((stage, index) =>
          `<button class="ef-stage" id="efStage${index}" type="button" aria-label="Chặng ${index + 1}: ${stage.name}" aria-current="${index === 0 ? 'step' : 'false'}">${index + 1}<small id="efStageBest${index}"></small></button>`
        ).join('')}</nav>
        <div class="ef-hud" aria-label="Tình hình trận đấu">
          <div class="ef-base ef-base-player">
            <div class="ef-base-row"><strong>Lam</strong><span><b id="efPlayerHpText">250</b></span></div>
            <div class="ef-health" id="efPlayerHealthTrack" role="progressbar" aria-label="Độ bền Bờ Lam" aria-valuemin="0" aria-valuemax="250" aria-valuenow="250"><span id="efPlayerHp"></span></div>
          </div>
          <div class="ef-resource"><span>Hạt</span><strong id="efResources">82</strong><small>Tự hồi</small></div>
          <div class="ef-base ef-base-rival">
            <div class="ef-base-row"><strong>Cam</strong><span><b id="efRivalHpText">250</b></span></div>
            <div class="ef-health" id="efRivalHealthTrack" role="progressbar" aria-label="Độ bền Bờ Cam" aria-valuemin="0" aria-valuemax="250" aria-valuenow="250"><span id="efRivalHp"></span></div>
          </div>
        </div>
        <div class="ef-field-wrap">
          <canvas id="efCanvas" width="${WIDTH}" height="${HEIGHT}" tabindex="0" role="img"
            aria-label="Một cây cầu nối hai vườn. Mầm Khiên giảm sát thương từ Nỏ Hạt. Nỏ Hạt đánh Bọ Sỏi mạnh; Bọ Sỏi phá Mầm Khiên. Quân tự tiến lên và bảo vệ bệ."></canvas>
          <div class="ef-overlay" id="efOverlay" hidden>
            <div class="ef-overlay-card"><strong id="efResult">Tạm dừng</strong><span id="efResultNote">Cây cầu đang chờ bạn.</span><button class="ef-primary" id="efOverlayAction" type="button">Tiếp tục</button></div>
          </div>
        </div>
        <div class="ef-controls" role="group" aria-label="Chọn quân">
          <button class="ef-unit-button" id="efShield" type="button" data-unit="shield" aria-label="Mầm Khiên, giảm sát thương từ Nỏ Hạt, giá 28 hạt, phím 1"><span class="ef-unit-mark ef-mark-shield">◒</span><span><strong>Mầm Khiên</strong><small>Chặn Nỏ · phím 1</small></span><b>28</b></button>
          <button class="ef-unit-button" id="efSling" type="button" data-unit="sling" aria-label="Nỏ Hạt, gây sát thương mạnh lên Bọ Sỏi, giá 50 hạt, phím 2"><span class="ef-unit-mark ef-mark-sling">⌁</span><span><strong>Nỏ Hạt</strong><small>Hạ Bọ · phím 2</small></span><b>50</b></button>
          <button class="ef-unit-button" id="efBeetle" type="button" data-unit="beetle" aria-label="Bọ Sỏi, gây sát thương mạnh lên Mầm Khiên, giá 68 hạt, phím 3"><span class="ef-unit-mark ef-mark-beetle">⬭</span><span><strong>Bọ Sỏi</strong><small>Phá Khiên · phím 3</small></span><b>68</b></button>
        </div>
        <p class="ef-help">Chọn quân · Quân tự đánh · P tạm dừng</p>
        <p class="ef-live" id="efLive" role="status" aria-live="polite" aria-atomic="true">Chọn quân. Máy cũng gọi quân.</p>
        <p class="ef-save-note" id="efSaveNote" role="status" aria-live="polite" hidden></p>
      </section>`;

    const stageButtons = M.STAGES.map((_, index) => container.querySelector('#efStage' + index));
    let saveDisabled = false, saveNoticeSticky = false;
    let storedProgress = { unlockedStage: 0, bestTimes: Array(M.STAGES.length).fill(null) };
    let rawProgress = null;
    try { rawProgress = root.localStorage.getItem(SAVE_KEY); }
    catch (_) {
      saveDisabled = true; saveNoticeSticky = true;
      container.querySelector('#efSaveNote').hidden = false;
      container.querySelector('#efSaveNote').textContent = 'Tiến trình chỉ lưu trong lượt này.';
    }
    if (rawProgress && !saveDisabled) {
      let parsed = null;
      try { parsed = JSON.parse(rawProgress); } catch (_) {}
      if (parsed && Number.isInteger(parsed.version) && parsed.version > M.PROGRESS_VERSION) {
        saveDisabled = true; saveNoticeSticky = true;
        container.querySelector('#efSaveNote').hidden = false;
        container.querySelector('#efSaveNote').textContent = 'Bản lưu mới hơn được giữ nguyên.';
      } else if (M.validProgress(parsed)) storedProgress = parsed;
      else {
        try {
          root.localStorage.setItem(RECOVERY_KEY, rawProgress);
          saveNoticeSticky = true; container.querySelector('#efSaveNote').hidden = false;
          container.querySelector('#efSaveNote').textContent = 'Bản lưu lỗi đã được giữ lại.';
        } catch (_) {
          saveDisabled = true; saveNoticeSticky = true; container.querySelector('#efSaveNote').hidden = false;
          container.querySelector('#efSaveNote').textContent = 'Bản lưu lỗi vẫn được giữ nguyên.';
        }
      }
    }
    model = M.create({ stageIndex: storedProgress.unlockedStage, ...storedProgress });
    function persistProgress() {
      if (saveDisabled) return false;
      try {
        root.localStorage.setItem(SAVE_KEY, JSON.stringify(model.progress()));
        if (!saveNoticeSticky) container.querySelector('#efSaveNote').hidden = true;
        return true;
      } catch (_) {
        saveDisabled = true; saveNoticeSticky = true;
        container.querySelector('#efSaveNote').hidden = false;
        container.querySelector('#efSaveNote').textContent = 'Tiến trình không lưu được. Bạn vẫn có thể chơi.';
        return false;
      }
    }

    const el = id => container.querySelector('#' + id);
    const canvas = el('efCanvas');
    const ctx = canvas.getContext('2d');
    const healthPlayer = el('efPlayerHealthTrack');
    const healthRival = el('efRivalHealthTrack');

    function announce(text) { el('efLive').textContent = text; }

    function drainEvents() {
      for (const event of model.drain()) {
        if (event.kind === 'deploy' && event.side === 'player') announce(`Đã gọi ${LABELS[event.type]}. Quân tự tiến lên cầu.`);
        else if (event.kind === 'unaffordable') announce(`Chưa đủ hạt cho ${LABELS[event.type]}. Hạt đang tự hồi.`);
        else if (event.kind === 'hit-unit' && event.side === 'player') announce(`${LABELS[event.type]} vừa chặn một quân Bờ Cam.`);
        else if (event.kind === 'hit-base' && event.targetSide === 'player') announce(`Bệ Bờ Lam bị đánh, mất ${event.damage} độ bền.`);
        else if (event.kind === 'hit-base' && event.targetSide === 'rival') announce(`Bệ Bờ Cam mất ${event.damage} độ bền.`);
        else if (event.kind === 'finished') {
          persistProgress();
          announce(event.status === 'won' ? 'Bờ Cam đã rút lui. Bạn thắng!' : 'Bệ Bờ Lam thất thủ. Thử lại nhé.');
        }
      }
    }

    function roundedRect(x, y, width, height, radius, fill, stroke) {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, radius);
      else ctx.rect(x, y, width, height);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
    }

    function drawBase(x, side) {
      const player = side === 'player';
      const fill = player ? '#318b86' : '#d16d4d';
      const dark = player ? '#1b565a' : '#813e3a';
      ctx.save();
      ctx.fillStyle = 'rgba(34,47,47,.14)';
      ctx.beginPath(); ctx.ellipse(x, FLOOR + 13, 63, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = player ? '#a1c9a1' : '#ddb184';
      ctx.beginPath(); ctx.ellipse(x, FLOOR, 67, 20, 0, 0, Math.PI * 2); ctx.fill();
      roundedRect(x - 36, FLOOR - 96, 72, 98, 12, fill, dark);
      ctx.fillStyle = player ? '#d6e4af' : '#f5dfb5';
      ctx.beginPath();
      if (player) {
        ctx.moveTo(x - 46, FLOOR - 92); ctx.quadraticCurveTo(x, FLOOR - 147, x + 45, FLOOR - 93);
      } else {
        ctx.moveTo(x - 46, FLOOR - 92); ctx.quadraticCurveTo(x, FLOOR - 149, x + 45, FLOOR - 93);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(x - 7, FLOOR - 49, 14, 51);
      ctx.fillStyle = player ? '#e9f2d5' : '#fff0d2';
      ctx.beginPath(); ctx.arc(x, FLOOR - 78, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, FLOOR - 70); ctx.lineTo(x + (player ? 15 : -15), FLOOR - 56); ctx.stroke();
      ctx.restore();
    }

    function drawShieldUnit(x, y, color, direction, flash) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(28,42,39,.19)'; ctx.beginPath(); ctx.ellipse(0, 2, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, -13, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ecd6a7'; ctx.beginPath(); ctx.arc(0, -30, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#76a879'; ctx.beginPath(); ctx.ellipse(-1, -39, 10, 5, -0.35 * direction, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? '#fff2a7' : '#d7bc85';
      ctx.beginPath(); ctx.ellipse(direction * 13, -15, 9, 12, direction * -0.18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#695d47'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(direction * 7, -15); ctx.lineTo(direction * 19, -15); ctx.stroke();
      ctx.restore();
    }

    function drawSlingUnit(x, y, color, direction, flash) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(28,42,39,.19)'; ctx.beginPath(); ctx.ellipse(0, 2, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, -13, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1dfb3'; ctx.beginPath(); ctx.arc(0, -29, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#775d56'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(direction * 3, -17); ctx.lineTo(direction * 18, -25); ctx.lineTo(direction * 23, -13); ctx.stroke();
      ctx.fillStyle = flash ? '#fff0a0' : '#e9c779'; ctx.beginPath(); ctx.arc(direction * 23, -20, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7b6550'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(direction * 10, -25, 10, 10, direction * 0.35, -1.1, 1.1); ctx.stroke();
      ctx.restore();
    }

    function drawBeetle(x, y, color, direction, flash) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(28,42,39,.19)'; ctx.beginPath(); ctx.ellipse(0, 3, 23, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4b4d42'; ctx.lineWidth = 3;
      for (const leg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(leg * 10, -5); ctx.lineTo(leg * 20, 0); ctx.stroke(); }
      ctx.fillStyle = flash ? '#fff0a0' : color; ctx.beginPath(); ctx.ellipse(0, -17, 22, 15, 0, Math.PI, Math.PI * 2); ctx.lineTo(22, -9); ctx.ellipse(0, -9, 22, 9, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#e3d1a7'; ctx.beginPath(); ctx.arc(direction * 16, -13, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#58625a'; ctx.beginPath(); ctx.arc(-5, -19, 3, 0, Math.PI * 2); ctx.arc(6, -21, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawUnit(unit) {
      const y = FLOOR - 2;
      const player = unit.side === 'player';
      const direction = player ? 1 : -1;
      const color = player ? '#4caaa0' : '#df805d';
      if (unit.type === 'shield') drawShieldUnit(unit.x, y, color, direction, unit.hitFlash > 0);
      else if (unit.type === 'sling') drawSlingUnit(unit.x, y, color, direction, unit.hitFlash > 0);
      else drawBeetle(unit.x, y, color, direction, unit.hitFlash > 0);
      const barW = unit.type === 'beetle' ? 38 : 30;
      roundedRect(unit.x - barW / 2, y - 52, barW, 4, 2, 'rgba(27,42,43,.24)');
      roundedRect(unit.x - barW / 2, y - 52, barW * (unit.hp / unit.maxHp), 4, 2, player ? '#2c807a' : '#bb5546');
    }

    function draw(view) {
      const colors = view.palette === 'mist'
        ? { sky: ['#c5d9d3', '#e1dfc6', '#a9c0a4'], far: '#9eb6a6', near: '#789c85', bridge: '#9a795b', plank: '#d7bb8e' }
        : view.palette === 'dusk'
          ? { sky: ['#a9bacd', '#d7c4b4', '#8a9e99'], far: '#879f9f', near: '#627f7d', bridge: '#786a65', plank: '#bfa78f' }
          : { sky: ['#d8e6dd', '#f4ddb5', '#bfd0a3'], far: '#b6c9a4', near: '#91b392', bridge: '#b58a5d', plank: '#e4c495' };
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, colors.sky[0]); sky.addColorStop(0.64, colors.sky[1]); sky.addColorStop(1, colors.sky[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'rgba(255,248,221,.78)';
      for (const [x, y, r] of [[178, 82, 29], [228, 70, 40], [272, 86, 25], [636, 93, 31], [679, 78, 40], [721, 94, 26]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = colors.far; ctx.beginPath(); ctx.moveTo(0, 248); ctx.quadraticCurveTo(182, 160, 360, 245); ctx.quadraticCurveTo(605, 146, 920, 247); ctx.lineTo(920, HEIGHT); ctx.lineTo(0, HEIGHT); ctx.fill();
      ctx.fillStyle = colors.near; ctx.beginPath(); ctx.moveTo(0, 291); ctx.quadraticCurveTo(162, 242, 350, 290); ctx.quadraticCurveTo(578, 240, 920, 292); ctx.lineTo(920, HEIGHT); ctx.lineTo(0, HEIGHT); ctx.fill();

      ctx.fillStyle = colors.bridge; ctx.fillRect(102, FLOOR - 4, 716, 18);
      ctx.fillStyle = colors.plank;
      for (let x = 113; x < 810; x += 35) {
        ctx.fillRect(x, FLOOR - 2, 29, 7);
        ctx.strokeStyle = 'rgba(111,83,62,.36)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 5, FLOOR + 5); ctx.lineTo(x + 5, FLOOR + 12); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(91,118,100,.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(106, FLOOR - 17); ctx.lineTo(814, FLOOR - 17); ctx.moveTo(106, FLOOR + 18); ctx.lineTo(814, FLOOR + 18); ctx.stroke();

      drawBase(70, 'player'); drawBase(850, 'rival');
      for (const effect of view.effects) {
        const y = FLOOR - 27;
        ctx.strokeStyle = effect.side === 'player' ? 'rgba(58,118,167,.78)' : 'rgba(203,101,72,.78)';
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(effect.x1, y); ctx.lineTo(effect.x2, y); ctx.stroke();
        ctx.fillStyle = '#f8dc95'; ctx.beginPath(); ctx.arc(effect.x2, y, 4, 0, Math.PI * 2); ctx.fill();
      }
      for (const unit of view.units) drawUnit(unit);
      ctx.fillStyle = '#425949'; ctx.font = '700 15px Calibri, Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BỜ LAM', 70, FLOOR + 38); ctx.fillText('BỜ CAM', 850, FLOOR + 38);
      ctx.textAlign = 'left';
    }

    function render() {
      if (!alive) return;
      const view = model.view();
      el('efStageName').textContent = `Chặng ${view.stageIndex + 1}/${view.stageCount} · ${view.stageName}`;
      const playerHp = Math.ceil(view.bases.player);
      const rivalHp = Math.ceil(view.bases.rival);
      el('efPlayerHpText').textContent = String(playerHp);
      el('efRivalHpText').textContent = String(rivalHp);
      el('efPlayerHp').style.width = `${Math.max(0, playerHp / view.maxBaseHealth * 100)}%`;
      el('efRivalHp').style.width = `${Math.max(0, rivalHp / view.maxBaseHealth * 100)}%`;
      healthPlayer.setAttribute('aria-valuenow', String(playerHp));
      healthRival.setAttribute('aria-valuenow', String(rivalHp));
      healthPlayer.setAttribute('aria-valuemax', String(view.maxBaseHealth));
      healthRival.setAttribute('aria-valuemax', String(view.maxBaseHealth));
      el('efResources').textContent = String(Math.floor(view.resources.player));
      for (let index = 0; index < stageButtons.length; index++) {
        const button = stageButtons[index], best = view.bestTimes[index];
        button.disabled = view.status === 'playing' || index > view.unlockedStage;
        button.setAttribute('aria-current', index === view.stageIndex ? 'step' : 'false');
        button.setAttribute('aria-label', `Chặng ${index + 1}: ${M.STAGES[index].name}${best === null ? '' : ', kỷ lục ' + Math.floor(best / 1000) + ' giây'}`);
        container.querySelector('#efStageBest' + index).textContent = best === null ? '' : `${Math.floor(best / 1000)}s`;
      }
      for (const [buttonId, type] of [['efShield', 'shield'], ['efSling', 'sling'], ['efBeetle', 'beetle']]) {
        el(buttonId).disabled = view.status !== 'playing' || paused || view.resources.player + 1e-8 < COSTS[type];
      }
      el('efPause').disabled = view.status !== 'playing';
      const overlay = el('efOverlay');
      overlay.hidden = !(paused || view.status !== 'playing');
      if (paused) {
        el('efResult').textContent = 'Tạm dừng';
        el('efResultNote').textContent = 'Cây cầu sẽ tiếp tục khi bạn sẵn sàng.';
        el('efOverlayAction').textContent = 'Tiếp tục';
      } else if (view.status === 'won') {
        el('efResult').textContent = view.stageIndex + 1 === view.stageCount ? 'Giữ trọn ba cây cầu!' : 'Giữ được cây cầu!';
        el('efResultNote').textContent = view.stageIndex + 1 < view.stageCount
          ? `Kỷ lục ${Math.floor(view.bestTimes[view.stageIndex] / 1000)} giây · Chặng sau: ${M.STAGES[view.stageIndex + 1].name}`
          : `Cúp xong · Kỷ lục ${Math.floor(view.bestTimes[view.stageIndex] / 1000)} giây`;
        el('efOverlayAction').textContent = view.stageIndex < view.unlockedStage ? 'Chặng sau' : 'Chơi lại chặng';
      } else if (view.status === 'lost') {
        el('efResult').textContent = 'Bệ Bờ Lam thất thủ';
        el('efResultNote').textContent = `Thử lại chặng ${view.stageIndex + 1}.`;
        el('efOverlayAction').textContent = 'Chơi lại';
      }
      draw(view);
    }

    function beginLoop() {
      if (alive && !paused && model.view().status === 'playing' && raf === null) {
        lastTime = null;
        raf = requestAnimationFrame(frame);
      }
    }

    function frame(timestamp) {
      raf = null;
      if (!alive || paused) return;
      if (lastTime !== null) {
        model.advance(Math.max(0, Math.min(0.25, (timestamp - lastTime) / 1000)));
        drainEvents();
        render();
      }
      lastTime = timestamp;
      if (model.view().status === 'playing') raf = requestAnimationFrame(frame);
      else lastTime = null;
    }

    function pause(next) {
      if (model.view().status !== 'playing' || paused === next) return;
      paused = next;
      if (paused && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      lastTime = null;
      render();
      announce(paused ? 'Đã tạm dừng.' : 'Trận đấu tiếp tục.');
      if (!paused) beginLoop();
    }

    function startAgain() {
      const view = model.view();
      model = M.create({ stageIndex: view.stageIndex, unlockedStage: view.unlockedStage, bestTimes: view.bestTimes });
      paused = false;
      lastTime = null;
      render();
      announce(`Trận mới · Chặng ${model.view().stageIndex + 1}. Gọi quân khi bạn muốn.`);
      beginLoop();
    }

    function nextStage() {
      const next = model.nextStage();
      if (!next) return;
      model = next; paused = false; lastTime = null; render();
      announce(`Bắt đầu chặng ${model.view().stageIndex + 1}.`); beginLoop();
    }

    function selectStage(index) {
      const chosen = model.selectStage(index);
      if (!chosen) return;
      model = chosen; paused = false; lastTime = null; render();
      announce(`Đấu lại chặng ${index + 1}.`); beginLoop();
    }

    function callUnit(type) {
      if (paused || model.view().status !== 'playing') return;
      model.deploy(type);
      drainEvents(); render();
    }

    listen(el('efShield'), 'click', () => callUnit('shield'));
    listen(el('efSling'), 'click', () => callUnit('sling'));
    listen(el('efBeetle'), 'click', () => callUnit('beetle'));
    listen(el('efPause'), 'click', () => pause(!paused));
    listen(el('efReplayTop'), 'click', startAgain);
    listen(el('efOverlayAction'), 'click', () => {
      const view = model.view();
      if (view.status === 'playing') pause(false);
      else if (view.status === 'won' && view.stageIndex < view.unlockedStage) nextStage();
      else startAgain();
    });
    for (let index = 0; index < stageButtons.length; index++) {
      listen(stageButtons[index], 'click', () => selectStage(index));
    }
    listen(container, 'keydown', event => {
      if (event.repeat || event.target?.tagName === 'BUTTON') return;
      const key = String(event.key || '').toLowerCase();
      if (key === '1') { event.preventDefault(); callUnit('shield'); }
      else if (key === '2') { event.preventDefault(); callUnit('sling'); }
      else if (key === '3') { event.preventDefault(); callUnit('beetle'); }
      else if (key === 'p' || key === 'escape') { event.preventDefault(); pause(!paused); }
    });
    listen(root, 'blur', () => pause(true));
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) pause(true); });
    onCleanup(() => {
      alive = false;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; lastTime = null; paused = false;
      container.classList.remove('ef-host');
    });

    render();
    canvas.focus();
    beginLoop();
    return { getModel: () => model, isPaused: () => paused, replay: startAgain, nextStage, selectStage, destroy: () => session.stop() };
  }

  root.NP_RanhGioiMay = Object.freeze({ mount });
})(window);

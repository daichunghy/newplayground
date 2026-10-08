/* Mạch Gió: an original three-stage one-button flight campaign. */
(function () {
  'use strict';
  const KEY = 'np_mach_gio_progress_v1', BACKUP = KEY + '_backup';
  function mount(container, session, audio) {
    const M = window.NP_FlappyBirdModel;
    if (!M || !session) throw new Error('Mạch Gió rules are not ready');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let model = M.create(), alive = true, paused = false, frame = null, lastFrame = null;
    let lastHUD = '', lastSaved = '', message = '', saveDisabled = false, warning = '', previousPhase = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        const restored = M.restore(parsed);
        if (restored) { model = restored; lastSaved = raw; }
        else {
          try { localStorage.setItem(BACKUP, raw); } catch (_) { saveDisabled = true; }
          saveDisabled = true; warning = 'Bản lưu lỗi được giữ nguyên. Phiên này chưa lưu.';
        }
      }
    } catch (_) { saveDisabled = true; warning = 'Không lưu được. Bạn vẫn chơi được.'; }
    container.classList.add('fg-host');
    container.innerHTML = `<section class="fg-game" aria-label="Mạch Gió">
      <header class="fg-head"><div><span class="fg-tag">BA CHẶNG BAY · MỘT NÚT</span><h3>Mạch Gió</h3><p id="fgStageName"></p><small id="fgPlace"></small></div>
        <div class="fg-tools"><button class="fg-button" id="fgPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></div></header>
      <nav class="fg-stage-nav" id="fgStageNav" aria-label="Chọn chặng">${M.STAGES.map((stage, i) =>
        `<button class="fg-stage-button" id="fgStage${i}" type="button"><span class="fg-stage-index">${i + 1}</span><span class="fg-stage-name">${stage.name}</span><span class="fg-stage-stars" id="fgStars${i}" aria-hidden="true">☆☆☆</span></button>`).join('')}</nav>
      <div class="fg-hud" aria-label="Tiến độ chặng"><div><span>Khe</span><strong id="fgScore">0 / 4</strong></div><div><span>Lượt</span><strong id="fgLives">3</strong></div><div><span>Tốt nhất</span><strong id="fgBest">☆☆☆</strong></div></div>
      <div class="fg-board-wrap"><canvas class="fg-canvas" id="fgCanvas" width="600" height="360" tabindex="0" role="img" aria-label="Bàn Mạch Gió. Chạm, nhấp chuột hoặc nhấn Space để vỗ cánh qua khe." aria-describedby="fgInstructions">Bàn chơi Mạch Gió.</canvas>
        <div class="fg-overlay" id="fgOverlay" hidden><div class="fg-card" role="dialog" aria-modal="true" aria-labelledby="fgTitle"><strong id="fgTitle">Sẵn sàng?</strong><p id="fgText"></p><button class="fg-button fg-primary" id="fgStart" type="button">Bắt đầu bay</button></div></div>
      </div>
      <p class="fg-status" id="fgStatus" role="status" aria-live="polite" aria-atomic="true">Chạm hoặc nhấn Space để bay.</p>
      <p class="fg-save" id="fgSave" role="status" hidden></p>
      <p class="np-game-sr" id="fgInstructions">Chạm, nhấp hoặc nhấn Space để bay lên. Lướt xuống để canh khe. Mỗi chặng có một dãy cổng riêng; ba lượt va chạm.</p>
      <details class="fg-help"><summary aria-label="Cách chơi">?</summary><p>Vỗ cánh để bay lên, thả trôi để hạ xuống. Qua đủ số khe của chặng để mở đường tiếp theo.</p></details>
    </section>`;
    const el = id => container.querySelector('#fg' + id), canvas = el('Canvas'), ctx = canvas?.getContext?.('2d');
    if (!ctx) {
      el('Overlay').hidden = false; el('Title').textContent = 'Không mở được bàn chơi';
      el('Text').textContent = 'Trình duyệt này không bật canvas.'; el('Start').hidden = true;
      onCleanup(() => container.classList.remove('fg-host')); return null;
    }
    const stageButton = index => el('Stage' + index);
    function save() {
      if (!alive || saveDisabled) return;
      const payload = JSON.stringify(model.serializeProgress());
      if (payload === lastSaved) return;
      try {
        const current = localStorage.getItem(KEY);
        if (current) {
          let valid = false; try { valid = !!M.restore(JSON.parse(current)); } catch (_) {}
          if (valid) localStorage.setItem(BACKUP, current);
        }
        localStorage.setItem(KEY, payload); lastSaved = payload;
      } catch (_) { saveDisabled = true; warning = 'Không lưu được. Bạn vẫn chơi được.'; }
    }
    function size() {
      const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
      canvas.width = M.WIDTH * dpr; canvas.height = M.HEIGHT * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw() {
      const v = model.view(), stage = v.stage;
      ctx.clearRect(0, 0, M.WIDTH, M.HEIGHT);
      const sky = ctx.createLinearGradient(0, 0, 0, M.HEIGHT);
      sky.addColorStop(0, stage.sky[0]); sky.addColorStop(.62, stage.sky[1]); sky.addColorStop(1, stage.sky[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      ctx.fillStyle = '#e7c98d'; ctx.globalAlpha = .88; ctx.beginPath(); ctx.arc(478, 72, 27, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      for (let i = 0; i < 16; i++) {
        const x = (i * 71 + 31) % M.WIDTH, y = 24 + (i * 47) % 196;
        ctx.fillStyle = i % 3 ? '#d9e1df' : '#f4dfaf'; ctx.globalAlpha = .2 + (i % 4) * .08; ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = '#aab8bb'; ctx.globalAlpha = .22; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 62 + i * 61); ctx.bezierCurveTo(156, 26 + i * 61, 310, 98 + i * 61, 600, 47 + i * 61); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (const gate of v.gates) {
        if (gate.x > M.WIDTH || gate.x + M.GATE_W < 0) continue;
        const gapTop = gate.center - stage.gap / 2, gapBottom = gate.center + stage.gap / 2;
        ctx.fillStyle = stage.stone; ctx.beginPath(); ctx.moveTo(gate.x, 0); ctx.lineTo(gate.x + M.GATE_W, 0);
        ctx.lineTo(gate.x + M.GATE_W, gapTop - 16); ctx.lineTo(gate.x + M.GATE_W - 8, gapTop - 9);
        ctx.lineTo(gate.x + M.GATE_W, gapTop); ctx.lineTo(gate.x, gapTop + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b88a58'; ctx.fillRect(gate.x + 8, 8, 3, Math.max(0, gapTop - 22));
        ctx.fillStyle = stage.stone; ctx.beginPath(); ctx.moveTo(gate.x, gapBottom); ctx.lineTo(gate.x + M.GATE_W, gapBottom - 4);
        ctx.lineTo(gate.x + M.GATE_W - 8, gapBottom + 7); ctx.lineTo(gate.x + M.GATE_W, gapBottom + 15);
        ctx.lineTo(gate.x + M.GATE_W, M.HEIGHT); ctx.lineTo(gate.x, M.HEIGHT); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b88a58'; ctx.fillRect(gate.x + 27, gapBottom + 20, 3, Math.max(0, M.HEIGHT - gapBottom - 28));
        ctx.strokeStyle = '#d6bb85'; ctx.globalAlpha = .45; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(gate.x + 4, gapTop - 3); ctx.lineTo(gate.x + M.GATE_W - 4, gapTop - 3);
        ctx.moveTo(gate.x + 4, gapBottom + 3); ctx.lineTo(gate.x + M.GATE_W - 4, gapBottom + 3); ctx.stroke(); ctx.globalAlpha = 1;
      }
      const p = v.player; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.max(-.46, Math.min(.55, p.vy * .055)));
      ctx.fillStyle = '#f0c56e'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(12, 0); ctx.lineTo(0, 12); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3c6873'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(0, -5); ctx.lineTo(7, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff0c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(4, 0); ctx.lineTo(-3, 4); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#f3e6c9'; ctx.fillRect(0, M.HEIGHT - 8, M.WIDTH, 8); ctx.fillStyle = '#bd8661'; ctx.fillRect(0, M.HEIGHT - 8, M.WIDTH, 3);
    }
    function update() {
      if (!alive) return;
      const v = model.view(), result = v.result;
      const stamp = [v.status, v.stageIndex, v.score, v.lives, v.unlockedStage, v.stars.join(','), paused, message].join('|');
      if (stamp === lastHUD) return; lastHUD = stamp;
      el('StageName').textContent = `Chặng ${v.stageIndex + 1}/${v.stageCount} · ${v.stage.name}`;
      el('Place').textContent = v.stage.place;
      el('Score').textContent = `${Math.min(v.score, v.goal)} / ${v.goal}`;
      el('Lives').textContent = `${v.lives} / ${M.MAX_LIVES}`;
      el('Best').textContent = '★'.repeat(v.stars[v.stageIndex]) + '☆'.repeat(3 - v.stars[v.stageIndex]);
      for (let i = 0; i < v.stageCount; i++) {
        const button = stageButton(i), unlocked = i <= v.unlockedStage;
        button.disabled = !unlocked || paused || v.status === 'playing';
        button.setAttribute('aria-label', `Chặng ${i + 1}: ${M.STAGES[i].name}${unlocked ? `, ${v.stars[i]} trên 3 sao` : ', đang khóa'}`);
        button.setAttribute('aria-current', i === v.stageIndex ? 'step' : 'false');
        el(`Stars${i}`).textContent = '★'.repeat(v.stars[i]) + '☆'.repeat(3 - v.stars[i]);
      }
      const ready = v.status === 'ready', terminal = v.status === 'over' || v.status === 'won';
      el('Overlay').hidden = !(paused || ready || terminal);
      el('Pause').disabled = ready || terminal; el('Pause').textContent = paused ? '▶' : 'Ⅱ';
      el('Pause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      if (paused) { el('Title').textContent = 'Tạm dừng'; el('Text').textContent = 'Đường bay đang nghỉ.'; el('Start').textContent = 'Chơi tiếp'; }
      else if (ready) { el('Title').textContent = 'Sẵn sàng?'; el('Text').textContent = `Qua ${v.goal} khe để mở chặng tiếp.`; el('Start').textContent = 'Bắt đầu bay'; }
      else if (v.status === 'won') {
        el('Title').textContent = result.final ? 'Xong tuyến!' : 'Qua chặng!';
        el('Text').textContent = `${v.stage.name} · ${result.stars} sao`;
        el('Start').textContent = result.final ? 'Bay lại tuyến' : 'Chặng sau';
      } else if (v.status === 'over') {
        el('Title').textContent = 'Thử lại nhé'; el('Text').textContent = `${Math.min(v.score, v.goal)} / ${v.goal} khe · hết lượt bay.`; el('Start').textContent = 'Thử lại chặng';
      }
      el('Status').textContent = message || (paused ? 'Đang tạm dừng.' : v.status === 'won' ? `Đã qua ${v.stage.name}.` : v.status === 'over' ? 'Hết lượt bay.' : ready ? 'Chạm hoặc nhấn Space để bay.' : `Khe ${Math.min(v.score + 1, v.goal)} / ${v.goal} · ${v.lives} lượt.`);
      if (warning) { el('Save').hidden = false; el('Save').textContent = warning; }
      const phase = paused ? 'paused' : v.status;
      if (terminal && previousPhase !== phase) el('Start').focus({ preventScroll: true });
      previousPhase = phase;
    }
    function stopLoop() { if (frame !== null) cancelAnimationFrame(frame); frame = null; lastFrame = null; }
    function schedule() { if (alive && !paused && model.view().status === 'playing' && frame === null) frame = requestAnimationFrame(loop); else if (model.view().status !== 'playing' || paused) stopLoop(); }
    function loop(now) {
      frame = null; if (!alive || paused || model.view().status !== 'playing') return;
      if (lastFrame === null) lastFrame = now;
      const dt = Math.min(100, Math.max(0, now - lastFrame)); lastFrame = now;
      const events = model.advance(dt);
      for (const event of events) {
        if (event.kind === 'crash') message = event.lives ? `Va chạm · còn ${event.lives} lượt.` : 'Va chạm · hết lượt bay.';
        if (event.kind === 'score') message = `Qua khe ${event.score} / ${event.goal}.`;
        if (event.kind === 'clear') { message = `Chặng đã mở · ${event.stars} sao.`; save(); }
      }
      if (events.length) update();
      draw(); schedule();
    }
    function flap() {
      if (!alive || paused || model.view().status !== 'ready' && model.view().status !== 'playing') return;
      model.flap(); model.drain(); message = ''; lastFrame = null; draw(); lastHUD = ''; update(); canvas.focus({ preventScroll: true }); schedule();
    }
    function replayStage() {
      const index = model.view().stageIndex;
      model.selectStage(index); model.drain(); message = ''; paused = false; save(); lastHUD = ''; draw(); update();
    }
    function startAction() {
      if (paused) { paused = false; message = ''; lastFrame = null; lastHUD = ''; update(); canvas.focus({ preventScroll: true }); schedule(); return; }
      const v = model.view();
      if (v.status === 'over') replayStage();
      else if (v.status === 'won') {
        if (v.result.final) model.replayCampaign(); else model.nextStage();
        model.drain(); message = ''; save(); lastFrame = null; lastHUD = ''; draw(); update();
      }
      if (model.view().status === 'ready') flap();
    }
    function pause(moveFocus = true) {
      if (model.view().status !== 'playing') return;
      paused = !paused; message = paused ? 'Đang tạm dừng.' : '';
      if (paused) stopLoop(); else lastFrame = null;
      draw(); lastHUD = ''; update();
      if (paused) { if (moveFocus) el('Start').focus({ preventScroll: true }); }
      else { canvas.focus({ preventScroll: true }); schedule(); }
    }
    function resize() { size(); draw(); }
    size(); draw(); update(); save(); canvas.focus({ preventScroll: true });
    for (let i = 0; i < M.STAGES.length; i++) listen(stageButton(i), 'click', () => {
      if (!alive || paused || model.view().status === 'playing' || !model.selectStage(i)) return;
      model.drain(); message = ''; lastFrame = null; save(); draw(); lastHUD = ''; update(); canvas.focus({ preventScroll: true });
    });
    listen(canvas, 'pointerdown', event => {
      event.preventDefault?.();
      if (model.view().status === 'over') replayStage();
      flap();
    });
    listen(el('Start'), 'click', startAction);
    listen(el('Pause'), 'click', () => { if (paused) startAction(); else pause(); });
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target?.closest?.('button,summary,input,textarea,select,[contenteditable]')) return;
      const key = String(event.key || '');
      if (key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        const status = model.view().status;
        if (status === 'over' || status === 'won') startAction(); else flap();
      } else if (key.toLowerCase() === 'p') { event.preventDefault(); pause(); }
    });
    listen(window, 'blur', () => { if (model.view().status === 'playing' && !paused) pause(false); });
    listen(document, 'visibilitychange', () => { if (document.hidden && model.view().status === 'playing' && !paused) pause(false); });
    listen(window, 'resize', resize);
    onCleanup(() => { if (!alive) return; save(); alive = false; stopLoop(); container.classList.remove('fg-host'); });
    return { getModel: () => model, isPaused: () => paused, replay: replayStage };
  }
  window.NP_FlappyBird = Object.freeze({ mount });
  if (window.NP_Engines && typeof window.NP_Engines.launchFlappyBird === 'function') {
    window.NP_Engines.launchFlappyBird = function (container) { return mount(container, window.NP_GameSession.start()); };
  }
})();

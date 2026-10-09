/* Original Lối sáng presentation. The supplied game session owns every listener/frame. */
(function () {
  'use strict';
  const STORAGE = 'np_maze_chase_v1', RECOVERY = STORAGE + '_recovery';
  const KEYS = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
  const T = 24, COLORS = ['#ff8d80', '#beafff', '#edbe71'];
  const goodNumber = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;

  function mount(container, session, audio) {
    const M = window.NP_MazeChaseModel, { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let raw = null, saved = null, storageOK = true, notice = '';
    try { raw = localStorage.getItem(STORAGE); saved = raw ? JSON.parse(raw) : null; } catch (_) { notice = 'Không đọc được bản lưu.'; }
    let model = saved?.version === 1 && goodNumber(saved.best) && typeof saved.muted === 'boolean' ? M.restore(saved.run) : null;
    if (raw && !model) {
      try {
        const recovery = localStorage.getItem(RECOVERY);
        if (recovery && recovery !== raw) storageOK = false;
        else localStorage.setItem(RECOVERY, raw);
      } catch (_) { storageOK = false; }
      notice = 'Bản lưu cũ được giữ riêng; ván mới đã sẵn sàng.';
    }
    const restored = !!model;
    model = model || M.create();
    let best = restored ? saved.best : 0, muted = restored ? saved.muted : false;
    let alive = true, paused = restored && !['ready', 'won', 'lost'].includes(model.view().status);
    let panel = paused ? 'pause' : '', previousPanel = '', pointer = null, lastFrame = null, frame = null;
    let elapsedSave = 0, lastToneTick = -100, userGesture = false, lastHUD = '', lastStatus = '';
    let effects = [], flash = 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => !reduced?.matches;
    container.classList.add('mc-host');
    container.innerHTML = `
      <section class="mc-game" aria-label="Lối sáng">
        <header class="mc-bar"><strong class="mc-title">Lối sáng</strong><span class="mc-score" id="mcScore" aria-label="Điểm">0</span><span class="mc-lives" id="mcLives" aria-label="Mạng">♥♥♥</span><span class="mc-stage" id="mcStage" aria-label="Màn">1/3</span></header>
        <div class="mc-board"><canvas id="mcCanvas" width="456" height="408" tabindex="0" role="img" aria-label="Mê lộ Lối sáng. Điều khiển đèn bằng mũi tên hoặc WASD." aria-describedby="mcInstructions"></canvas>
          <div class="mc-overlay" id="mcOverlay" hidden><div class="mc-card"><strong id="mcPanelTitle"></strong><p id="mcPanelText" hidden></p><button class="mc-primary" id="mcContinue" type="button">▶</button><button class="mc-secondary" id="mcRestart" type="button" hidden>↻</button></div></div>
        </div>
        <div class="mc-progress" role="progressbar" id="mcProgress" aria-label="Ánh sáng đã gom" aria-valuemin="0" aria-valuemax="100"><span id="mcProgressFill"></span></div>
        <footer class="mc-controls"><div class="mc-tools"><button id="mcPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button><button id="mcSound" type="button" aria-label="Tắt âm thanh" title="Âm thanh">♪</button><button id="mcHelp" type="button" aria-label="Cách chơi" title="Cách chơi">?</button><span id="mcSaveNote" class="mc-save-note" hidden role="status">!</span></div><div class="mc-pad" role="group" aria-label="Di chuyển"><button class="mc-dir mc-up" data-dir="0" type="button" aria-label="Lên">↑</button><button class="mc-dir mc-left" data-dir="3" type="button" aria-label="Trái">←</button><button class="mc-dir mc-down" data-dir="2" type="button" aria-label="Xuống">↓</button><button class="mc-dir mc-right" data-dir="1" type="button" aria-label="Phải">→</button></div></footer>
        <p class="mc-sr" id="mcInstructions">Gom hết ánh sáng để qua màn. Tinh thể lớn giúp bạn đẩy lùi lính gác trong thời gian ngắn. Mũi tên hoặc WASD để di chuyển; có thể vuốt trên bàn hoặc dùng bốn nút hướng. P để tạm dừng. Có ba màn, ba mạng và một mạng thưởng khi đạt 6000 điểm.</p><p class="mc-sr" id="mcStatus" aria-live="polite" aria-atomic="true"></p>
      </section>`;
    const el = id => container.querySelector('#' + id);
    const canvas = el('mcCanvas'), ctx = canvas.getContext('2d');
    if (!ctx) {
      el('mcOverlay').hidden = false; el('mcPanelTitle').textContent = 'Không mở được bàn chơi';
      el('mcContinue').hidden = true;
      onCleanup(() => container.classList.remove('mc-host'));
      return null;
    }
    let dpr = 1;
    function sizeCanvas() {
      dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
      canvas.width = Math.round(456 * dpr); canvas.height = Math.round(408 * dpr);
    }
    sizeCanvas();

    function storageNotice(text) { notice = text; el('mcSaveNote').hidden = false; el('mcSaveNote').title = text; el('mcSaveNote').setAttribute('aria-label', text); }
    function save() {
      if (!storageOK) { storageNotice('Không thể lưu; ván chơi vẫn tiếp tục trên tab này.'); return; }
      best = Math.max(best, model.view().score);
      try {
        // Never silently overwrite another tab's newer run.
        if (localStorage.getItem(STORAGE) !== raw) { storageOK = false; storageNotice('Bản lưu đã đổi ở tab khác; ván này sẽ không ghi đè.'); return; }
        const next = JSON.stringify({ version: 1, best, muted, run: model.serialize() });
        localStorage.setItem(STORAGE, next); raw = next;
      } catch (_) { storageOK = false; storageNotice('Không thể lưu; ván chơi vẫn tiếp tục trên tab này.'); }
    }
    function say(text) { if (text !== lastStatus) { el('mcStatus').textContent = text; lastStatus = text; } }
    function tone(freq, duration = 0.08, volume = 0.035) {
      if (!userGesture || muted || window.NEWPLAYGROUND_MUTED === true) return;
      try { audio?.playTone?.(freq, 'sine', duration, volume); } catch (_) { /* Audio is optional. */ }
    }
    function unlockAudio() {
      userGesture = true;
      if (muted || window.NEWPLAYGROUND_MUTED === true) return;
      try {
        audio?.init?.();
        if (audio?.ctx?.state === 'suspended') audio.ctx.resume()?.catch?.(() => {});
      } catch (_) { /* An unavailable audio device must never block play. */ }
    }
    function cancelPointer() {
      const id = pointer?.id; pointer = null;
      if (id !== undefined) { try { canvas.releasePointerCapture?.(id); } catch (_) {} }
    }
    function pause(kind = 'pause') {
      if (!alive) return;
      cancelPointer(); model.clearInput(); paused = true; panel = kind; lastFrame = null;
      cancelAnimationFrame(frame); frame = null;
      effects = []; save(); update(); render();
    }
    function resume() {
      if (!alive || document.hidden) return;
      unlockAudio(); paused = false; panel = ''; lastFrame = null;
      update(); canvas.focus({ preventScroll: true }); save();
      if (frame === null) frame = requestAnimationFrame(loop);
    }
    function newRun() {
      best = Math.max(best, model.view().score); model = M.create(); paused = false; panel = '';
      effects = []; flash = 0; elapsedSave = 0; lastToneTick = -100; lastFrame = null;
      update(); render(); save(); canvas.focus({ preventScroll: true }); say('Ván mới.');
      if (frame === null) frame = requestAnimationFrame(loop);
    }
    function direct(dir) {
      if (!alive || paused || document.hidden) return;
      unlockAudio(); if (model.input(dir)) { canvas.focus({ preventScroll: true }); update(); if (frame === null) { lastFrame = null; frame = requestAnimationFrame(loop); } }
    }
    function update() {
      const v = model.view(); best = Math.max(best, v.score);
      const stamp = [v.score, v.lives, v.stage, v.remaining, v.status, panel, muted].join('/');
      if (stamp === lastHUD) return;
      lastHUD = stamp;
      el('mcScore').textContent = v.score.toLocaleString('vi-VN'); el('mcScore').setAttribute('aria-label', `${v.score} điểm; kỷ lục ${best}`);
      el('mcLives').textContent = '♥'.repeat(v.lives) || '♡'; el('mcLives').setAttribute('aria-label', `${v.lives} mạng`);
      el('mcStage').textContent = `${v.stage + 1}/3`; el('mcStage').setAttribute('aria-label', `Màn ${v.stage + 1} trên 3`);
      const progress = Math.round((v.total - v.remaining) / v.total * 100);
      el('mcProgress').setAttribute('aria-valuenow', String(progress));
      el('mcProgress').setAttribute('aria-valuetext', `Còn ${v.remaining} ánh sáng`); el('mcProgressFill').style.width = progress + '%';
      el('mcSound').textContent = muted ? '♩' : '♪'; el('mcSound').setAttribute('aria-pressed', String(muted));
      el('mcSound').setAttribute('aria-label', muted ? 'Bật âm thanh' : 'Tắt âm thanh');
      const terminal = ['won', 'lost'].includes(v.status);
      el('mcPause').disabled = terminal; el('mcPause').setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      el('mcPause').textContent = paused ? '▶' : 'Ⅱ';
      el('mcOverlay').hidden = !paused && !terminal;
      el('mcRestart').hidden = !paused || panel === 'help';
      el('mcPanelText').hidden = panel !== 'help';
      el('mcPanelTitle').textContent = terminal ? v.status === 'won' ? 'Rực sáng! ✦' : 'Thử lại nhé' : panel === 'help' ? 'Gom ánh sáng ✦' : panel === 'restart' ? 'Chơi lại?' : 'Tạm dừng';
      el('mcPanelText').textContent = 'Tinh thể lớn đẩy lùi lính gác.\n← ↑ ↓ → / WASD · vuốt';
      el('mcContinue').textContent = terminal || panel === 'restart' ? '↻' : '▶';
      el('mcContinue').setAttribute('aria-label', terminal || panel === 'restart' ? 'Bắt đầu ván mới' : 'Chơi tiếp');
      el('mcRestart').textContent = panel === 'restart' ? '×' : '↻';
      el('mcRestart').setAttribute('aria-label', panel === 'restart' ? 'Hủy chơi lại' : 'Chơi lại từ đầu');
      for (const button of container.querySelectorAll('.mc-dir')) button.disabled = paused || terminal || ['dying', 'clearing'].includes(v.status);
      if (terminal) say(v.status === 'won' ? `Đã hoàn thành ba màn. ${v.score} điểm.` : `Hết mạng. ${v.score} điểm. Chọn chơi lại để bắt đầu.`);
    }
    function diamond(x, y, r, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.74, y);
      ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.74, y); ctx.closePath(); ctx.fill();
    }
    function rounded(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function render() {
      const v = model.view(), map = v.map, width = map.width * T, height = map.height * T;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#10292b'; ctx.fillRect(0, 0, width, height);
      // Original stone garden. Contiguous wall faces form readable corridors.
      for (let i = 0; i < map.walls.length; i++) {
        const x = (i % map.width) * T, y = Math.floor(i / map.width) * T;
        if (map.walls[i]) {
          ctx.fillStyle = '#274446'; rounded(x + 1, y + 1, T - 2, T - 2, 4); ctx.fill();
          ctx.fillStyle = '#355455'; ctx.fillRect(x + 5, y + 3, T - 10, 1);
        } else if (v.items[i] === 1) {
          diamond(x + T / 2, y + T / 2, 2.4, '#e2ebc4');
        } else if (v.items[i] === 2) {
          const pulse = motion() && !paused ? 1 + Math.sin(v.tick / 19) * 0.1 : 1;
          ctx.strokeStyle = '#82efc0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 12, y + 12, 8.8, 0, Math.PI * 2); ctx.stroke();
          diamond(x + 12, y + 12, 6 * pulse, '#aeffda');
        }
      }
      if (v.bonusTicks > 0) {
        const x = map.bonus % map.width * T + 12, y = Math.floor(map.bonus / map.width) * T + 12;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#ffd496'; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
        ctx.fillStyle = '#f9ffdf'; ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      for (let i = 0; i < v.enemies.length; i++) {
        const e = v.enemies[i], p = v.enemyPositions[i];
        for (const shift of [-map.width, 0, map.width]) {
          const x = (p.x + shift + 0.5) * T, y = (p.y + 0.5) * T;
          if (x < -T || x > width + T) continue;
          const fleeing = v.power > 0 && e.mode === 'active';
          ctx.save(); ctx.translate(x, y); ctx.globalAlpha = e.wait > 0 ? 0.38 : 1;
          const color = e.mode === 'returning' ? '#6f9592' : fleeing ? '#edf8d0' : COLORS[i];
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 6, -5); ctx.lineTo(side * 10, -7); ctx.moveTo(side * 6, 5); ctx.lineTo(side * 10, 7); ctx.stroke(); }
          ctx.fillStyle = color; rounded(-7, -8, 14, 16, 4); ctx.fill();
          ctx.fillStyle = '#183033'; ctx.fillRect(-4, -3, 8, 3);
          if (fleeing) { ctx.fillRect(-3, 3, 2, 2); ctx.fillRect(1, 3, 2, 2); }
          else if (i === 0) diamond(0, 4, 2.5, '#183033');
          else if (i === 1) { ctx.fillRect(-3, 3, 2, 3); ctx.fillRect(1, 3, 2, 3); }
          else ctx.fillRect(-3, 3, 6, 2);
          ctx.restore();
        }
      }
      const p = v.playerPosition;
      for (const shift of [-map.width, 0, map.width]) {
        const x = (p.x + shift + 0.5) * T, y = (p.y + 0.5) * T;
        if (x < -T || x > width + T) continue;
        ctx.save(); ctx.translate(x, y);
        if (v.status === 'dying') ctx.globalAlpha = Math.max(0.1, v.phaseTicks / 84);
        if (v.power > 0 || v.immune > 0 || v.status === 'ready') {
          ctx.strokeStyle = v.power ? '#a7ffc8' : '#95bda9'; ctx.lineWidth = v.power ? 2.5 : 1;
          ctx.beginPath(); ctx.arc(0, 0, 11.3, 0, Math.PI * 2); ctx.stroke();
          if (v.power) { ctx.strokeStyle = '#f5ffcc'; ctx.beginPath(); ctx.arc(0, 0, 11.3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v.power / map.powerTicks); ctx.stroke(); }
        }
        const dir = M.DIRS[v.player.dir] || { x: 0, y: -1 };
        if (motion() && v.status === 'playing' && v.player.next >= 0) {
          diamond(-dir.x * 12, -dir.y * 12, 3.2, '#57a993'); diamond(-dir.x * 17, -dir.y * 17, 1.7, '#377565');
        }
        diamond(0, 0, 9.5, '#7ae6bd'); diamond(0, -1, 6.3, '#f2ffe0');
        ctx.fillStyle = '#215f52'; ctx.fillRect(-2 + dir.x * 2, -1 + dir.y * 2, 4, 3);
        ctx.restore();
      }
      if (motion()) for (const e of effects) {
        ctx.globalAlpha = Math.max(0, e.life / 0.3); ctx.strokeStyle = e.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, (0.3 - e.life) * 38 + 5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (flash > 0 && motion()) { ctx.fillStyle = `rgba(197,255,209,${flash * 0.15})`; ctx.fillRect(0, 0, width, height); }
      if (v.status === 'clearing') { ctx.fillStyle = 'rgba(17,45,43,.7)'; ctx.fillRect(0, 0, width, height); ctx.font = 'bold 34px Calibri, Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#d8ffe1'; ctx.fillText('✦', width / 2, height / 2); }
    }
    function process(events) {
      for (const event of events) {
        const v = model.view();
        if (event.kind === 'collect' && v.tick - lastToneTick > 9) { tone(520 + v.remaining % 3 * 90, 0.045, 0.018); lastToneTick = v.tick; }
        if (event.kind === 'power') { tone(720, 0.2); say('Tinh thể sáng. Lính gác đang rút lui.'); }
        if (event.kind === 'capture' || event.kind === 'bonus') { tone(1040, 0.12); }
        if (event.kind === 'death') { tone(150, 0.2, 0.04); say(`Còn ${v.lives} mạng.`); }
        if (event.kind === 'respawn') say('Sẵn sàng. Chọn hướng để chơi tiếp.');
        if (event.kind === 'stage') say(`Màn ${v.stage + 1}. Chọn hướng để tiếp tục.`);
        if (event.kind === 'clear' || event.kind === 'win') { tone(860, 0.25); flash = 1; }
        if (event.kind === 'life') say('Thêm một mạng.');
        if (event.cell !== undefined && motion()) effects.push({ x: event.cell % v.map.width * T + 12, y: Math.floor(event.cell / v.map.width) * T + 12, life: 0.3, color: event.kind === 'power' ? '#b9ffde' : '#d3e7b8' });
        if (event.kind !== 'collect') save();
      }
      effects = effects.slice(-16);
    }
    function loop(time) {
      if (!alive) return;
      frame = null;
      const dt = lastFrame === null ? 0 : Math.min(0.1, Math.max(0, (time - lastFrame) / 1000)); lastFrame = time;
      if (!paused) {
        process(model.advance(dt)); elapsedSave += dt;
        effects.forEach(e => { e.life -= dt; }); effects = effects.filter(e => e.life > 0); flash = Math.max(0, flash - dt * 3);
        if (elapsedSave > 2) { elapsedSave = 0; save(); }
      }
      update(); render();
      if (!paused && ['playing', 'dying', 'clearing'].includes(model.view().status)) frame = requestAnimationFrame(loop);
    }

    listen(window, 'keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (Object.hasOwn(KEYS, e.key)) { e.preventDefault(); direct(KEYS[e.key]); }
      else if ((e.key === 'p' || e.key === 'P') && !e.repeat) { e.preventDefault(); paused ? resume() : pause(); }
    });
    for (const button of container.querySelectorAll('.mc-dir')) {
      listen(button, 'pointerdown', e => { if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return; e.preventDefault(); direct(Number(button.dataset.dir)); });
      listen(button, 'click', () => direct(Number(button.dataset.dir)));
      listen(button, 'pointercancel', () => model.clearInput());
    }
    listen(canvas, 'pointerdown', e => {
      if (paused || (e.button !== undefined && e.button !== 0)) return;
      if (e.isPrimary === false || pointer) { cancelPointer(); model.clearInput(); return; }
      e.preventDefault(); unlockAudio(); canvas.focus({ preventScroll: true });
      pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture?.(e.pointerId); } catch (_) {}
    });
    listen(canvas, 'pointermove', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      e.preventDefault(); direct(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : 3 : dy > 0 ? 2 : 0);
      pointer.x = e.clientX; pointer.y = e.clientY;
    });
    listen(window, 'pointerup', e => { if (pointer?.id === e.pointerId) cancelPointer(); });
    listen(window, 'pointercancel', e => { if (pointer?.id === e.pointerId) { cancelPointer(); model.clearInput(); } });
    listen(canvas, 'lostpointercapture', () => { if (pointer) { pointer = null; model.clearInput(); } });
    listen(el('mcPause'), 'click', () => { userGesture = true; paused ? resume() : pause(); });
    listen(el('mcHelp'), 'click', () => { userGesture = true; pause('help'); });
    listen(el('mcSound'), 'click', () => { muted = !muted; unlockAudio(); if (!muted) tone(640); update(); save(); });
    listen(el('mcContinue'), 'click', () => {
      userGesture = true;
      if (panel === 'restart' || ['won', 'lost'].includes(model.view().status)) newRun(); else resume();
    });
    listen(el('mcRestart'), 'click', () => { if (panel === 'restart') { panel = previousPanel || 'pause'; update(); } else { previousPanel = panel; panel = 'restart'; update(); } });
    listen(window, 'blur', () => pause());
    listen(window, 'resize', () => { cancelPointer(); sizeCanvas(); render(); });
    listen(window, 'pagehide', () => pause());
    listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
    onCleanup(() => {
      alive = false; cancelPointer(); model.clearInput(); save(); cancelAnimationFrame(frame);
      effects = []; container.classList.remove('mc-host');
    });
    if (notice) storageNotice(notice);
    if (document.hidden) { paused = true; panel = 'pause'; }
    update(); render(); save(); frame = requestAnimationFrame(loop);
    return { snapshot: () => model.serialize(), pause, resume };
  }
  window.NP_MazeChase = { mount };
})();

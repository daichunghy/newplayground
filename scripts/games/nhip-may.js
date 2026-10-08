/* Nhịp Mây: original four-lane timing prototype with procedural, optional sound. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_NhipMay = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const W = 640, H = 400, TARGET_Y = 292, SPEED = 184, NOTE_INSET = 34;
  const KEYS = Object.freeze({ KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 });

  function mount(container, session) {
    const M = window.NP_NhipMayModel;
    if (!container || !M || !session?.listen || !session?.requestAnimationFrame || !session?.onCleanup) throw new TypeError('Nhịp Mây needs its model, container, and game session');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    container.classList.add('nm-host');
    container.innerHTML = `
      <section class="nm-game" aria-label="Nhịp Mây">
        <header class="nm-top"><div><h2>Nhịp Mây</h2></div>
          <div class="nm-hud"><span>Điểm <b id="nmScore">0</b></span><span>Combo <b id="nmCombo">0</b></span></div></header>
        <div class="nm-stage-wrap"><canvas id="nmCanvas" class="nm-stage" width="640" height="400" role="img" aria-label="Bốn làn nốt nhạc và phím Space để chốt nhịp" aria-describedby="nmHelp">Nhịp Mây.</canvas>
          <div class="nm-overlay" id="nmOverlay"><div class="nm-card"><span class="nm-mark" aria-hidden="true">✦</span><h3 id="nmOverlayTitle">Sẵn sàng</h3><p id="nmOverlayText">Bấm nốt; chốt Space.</p><button class="nm-button nm-primary" id="nmOverlayAction" type="button">Chơi</button></div></div>
        </div>
        <div class="nm-feedback" id="nmFeedback" role="status" aria-live="polite" aria-atomic="true">Sẵn sàng.</div>
        <div class="nm-controls" aria-label="Bốn phím nhịp điệu">${M.LANES.map((lane, i) => `<button class="nm-lane" data-lane="${i}" type="button" aria-label="${lane.key.slice(3)} hoặc mũi tên ${lane.name.toLowerCase()}"><span aria-hidden="true">${lane.label}</span><small>${lane.key.slice(3)}</small></button>`).join('')}<button class="nm-space" id="nmSpace" type="button" aria-label="Phím cách, chốt nhịp">SPACE</button></div>
        <div class="nm-actions"><button class="nm-button" id="nmPause" type="button" aria-label="Tạm dừng" title="Tạm dừng" disabled>Ⅱ</button><button class="nm-button" id="nmRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button><button class="nm-button nm-sound" id="nmSound" type="button" aria-label="Âm thanh bật" title="Âm thanh" aria-pressed="true">♫</button></div>
        <p class="nm-help" id="nmHelp">P nghỉ</p>
      </section>`;
    const el = id => container.querySelector('#' + id);
    const canvas = el('nmCanvas'), ctx = canvas?.getContext?.('2d');
    if (!ctx) { container.classList.remove('nm-host'); throw new Error('Nhịp Mây needs canvas support'); }
    let model = M.create(), alive = true, raf = null, lastFrame = null, held = new Set(), soundOn = true, seenMisses = 0;
    let audioContext = null, audioUnavailable = false, pulseIndex = -1;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const laneWidth = W / 4;

    function playTone(freq, duration = 0.075, wave = 'sine', volume = 0.045) {
      if (!alive || !soundOn || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted || audioUnavailable) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) { audioUnavailable = true; return; }
        if (!audioContext) audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        const now = audioContext.currentTime;
        oscillator.type = wave; oscillator.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + duration);
      } catch (_) { audioUnavailable = true; }
    }
    function startAudio() { playTone(392, 0.11, 'triangle', 0.025); }
    function audioAction(name) {
      try { const pending = audioContext?.[name]?.(); pending?.catch?.(() => {}); } catch (_) { /* Audio is optional. */ }
    }
    function setFeedback(text) { el('nmFeedback').textContent = text; }
    function updateHud() {
      const s = model.view(); el('nmScore').textContent = String(s.score); el('nmCombo').textContent = String(s.combo);
      el('nmPause').disabled = !['playing','paused'].includes(s.status);
      el('nmPause').textContent = s.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
      el('nmSound').setAttribute('aria-pressed', soundOn ? 'true' : 'false'); el('nmSound').setAttribute('aria-label', `Âm thanh ${soundOn ? 'bật' : 'tắt'}`); el('nmSound').textContent = soundOn ? '♫' : '♪';
    }
    function draw() {
      if (!alive) return;
      const s = model.view();
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#193d51'); sky.addColorStop(.58, '#315c68'); sky.addColorStop(1, '#c08c68');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // Rounded cloud bands and tiny rooftop lights make an original evening scene.
      ctx.fillStyle = 'rgba(238,214,173,.16)';
      for (let row = 0; row < 3; row++) {
        const y = 68 + row * 37;
        for (let x = -18 + row * 26; x < W; x += 118) { ctx.beginPath(); ctx.ellipse(x, y, 47, 8, -.08, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(16,39,51,.54)';
      for (let i = 0; i < 9; i++) { const x = i * 78 - 14, h = 25 + (i * 19 % 45); ctx.fillRect(x, 224 - h, 53, h + 18); ctx.fillStyle = i % 2 ? '#e6ba78' : '#9cd2c5'; ctx.fillRect(x + 9, 210 - h, 4, 5); ctx.fillRect(x + 26, 210 - h, 4, 5); ctx.fillStyle = 'rgba(16,39,51,.54)'; }
      for (let lane = 0; lane < 4; lane++) {
        const x = lane * laneWidth;
        ctx.fillStyle = lane % 2 ? 'rgba(12,34,46,.19)' : 'rgba(255,244,219,.06)'; ctx.fillRect(x, 0, laneWidth, H);
        ctx.strokeStyle = 'rgba(246,234,204,.17)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.fillStyle = 'rgba(244,229,201,.42)'; ctx.font = "600 14px Calibri, Inter, sans-serif"; ctx.textAlign = 'center'; ctx.fillText(M.LANES[lane].name.toUpperCase(), x + laneWidth / 2, 29);
      }
      // Target line stays visible even when reduced motion is requested; note travel is core information.
      ctx.fillStyle = '#f1cf92'; ctx.fillRect(16, TARGET_Y, W - 32, 3);
      ctx.fillStyle = 'rgba(241,207,146,.15)'; ctx.fillRect(16, TARGET_Y - 12, W - 32, 27);
        ctx.fillStyle = '#f1cf92'; ctx.textAlign = 'right'; ctx.font = "700 11px Calibri, Inter, sans-serif"; ctx.fillText('CHẠM VẠCH', W - 18, TARGET_Y - 17);
      for (const note of s.notes) {
        if (note.judged) continue;
        const y = TARGET_Y - (note.time - s.time) * SPEED;
        if (y < -26 || y > H + 28) continue;
        const isSpace = note.kind === 'space';
        const cx = isSpace ? W / 2 : note.lane * laneWidth + laneWidth / 2;
        const color = isSpace ? '#f7d28d' : M.LANES[note.lane].color;
        const halfWidth = isSpace ? 46 : NOTE_INSET;
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = reduced?.matches ? 0 : 13;
        ctx.fillStyle = '#172f3c'; ctx.beginPath(); ctx.roundRect(cx - halfWidth, y - 21, halfWidth * 2, 42, 14); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = isSpace ? "700 14px Calibri, Inter, sans-serif" : "800 24px Calibri, Inter, sans-serif"; ctx.fillText(isSpace ? 'SPACE' : M.LANES[note.lane].label, cx, y + 1); ctx.restore();
      }
      if (s.status === 'playing' && soundOn) {
        const beat = Math.floor(s.time / M.BEAT);
        if (beat > pulseIndex) { for (let i = pulseIndex + 1; i <= beat && i < M.SONG_BEATS; i++) playTone([196, 220, 247, 220][Math.floor(i / 8) % 4], .055, i % 4 === 0 ? 'triangle' : 'sine', i % 4 === 0 ? .026 : .013); pulseIndex = beat; }
      }
      ctx.fillStyle = 'rgba(247,229,198,.66)'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = "600 12px Calibri, Inter, sans-serif"; ctx.fillText(`${M.BPM} BPM · ${Math.min(M.SONG_BEATS, Math.floor(s.time / M.BEAT))}/${M.SONG_BEATS} nhịp`, 18, H - 18);
    }
    function showOverlay(title, text, action, visible = true) {
      el('nmOverlay').hidden = !visible; el('nmOverlayTitle').textContent = title; el('nmOverlayText').textContent = text; el('nmOverlayAction').textContent = action;
    }
    function frame(timestamp) {
      raf = null;
      if (!alive || model.view().status !== 'playing') return;
      if (lastFrame !== null) {
        const gap = Math.min(.05, Math.max(0, (timestamp - lastFrame) / 1000));
        model.advance(gap);
      }
      lastFrame = timestamp;
      const state = model.view();
      if (state.misses > seenMisses) {
        const missed = state.misses - seenMisses; seenMisses = state.misses;
        setFeedback(missed === 1 ? 'Lỡ nhịp · giữ nhịp cho nốt kế tiếp' : `${missed} nốt vừa trôi qua · tiếp tục nhé`);
        playTone(150, .1, 'sine', .024);
      }
      draw(); updateHud();
      if (state.status === 'ended') {
        lastFrame = null; showOverlay('Đoạn nhạc khép lại', `Điểm ${state.score} · nhịp dài nhất ${state.bestCombo}`, 'Chơi lại · Enter');
        setFeedback(`Kết thúc · ${state.hits} nốt đúng · ${state.misses} lần lỡ nhịp.`);
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    function run() { if (raf === null && model.view().status === 'playing') { lastFrame = null; raf = requestAnimationFrame(frame); } }
    function pause() { if (!alive || !model.pause()) return; if (raf !== null) cancelAnimationFrame(raf); raf = null; lastFrame = null; showOverlay('Tạm nghỉ', 'Các nốt sẽ chờ ở đây cho tới khi bạn tiếp tục.', 'Tiếp tục · Enter'); setFeedback('Đang tạm dừng.'); draw(); updateHud(); }
    function begin() {
      if (!alive) return;
      if (model.view().status === 'ended') model = M.create();
      if (model.view().status === 'paused') { model.resume(); showOverlay('', '', '', false); setFeedback('Trở lại nhịp.'); run(); return; }
      if (model.view().status === 'ready') { model.start(); pulseIndex = -1; showOverlay('', '', '', false); startAudio(); setFeedback('Bấm theo nốt khi chạm vạch sáng.'); draw(); updateHud(); run(); }
    }
    function restart() { if (!alive) return; if (raf !== null) cancelAnimationFrame(raf); raf = null; model = M.create(); lastFrame = null; pulseIndex = -1; seenMisses = 0; begin(); }
    function hit(lane) {
      if (!alive) return;
      const result = model.press(lane);
      if (!result.grade) return;
      seenMisses = model.view().misses;
      if (result.grade === 'Đẹp') { setFeedback(`Đẹp · +${result.points}`); playTone(523.25 + lane * 45, .09, 'sine', .05); }
      else if (result.grade === 'Ổn') { setFeedback(`Ổn · +${result.points}`); playTone(392 + lane * 38, .07, 'triangle', .035); }
      else { setFeedback('Lệch nhịp · thử nốt kế tiếp'); playTone(145, .12, 'sine', .028); }
      updateHud(); draw();
    }
    function hitSpace() {
      if (!alive) return;
      const result = model.pressSpace();
      if (!result.grade) return;
      seenMisses = model.view().misses;
      if (result.grade === 'Đẹp') { setFeedback(`Chốt đẹp · +${result.points}`); playTone(660, .1, 'triangle', .05); }
      else if (result.grade === 'Ổn') { setFeedback(`Chốt nhịp · +${result.points}`); playTone(440, .08, 'sine', .035); }
      else { setFeedback('Lệch nhịp · thử câu tiếp theo'); playTone(145, .12, 'sine', .028); }
      updateHud(); draw();
    }
    listen(window, 'keydown', event => {
      const key = event.code || (event.key === ' ' ? 'Space' : event.key);
      if (held.has(key) || event.repeat) return;
      held.add(key);
      if (KEYS[key] !== undefined && model.view().status === 'playing') { event.preventDefault(); hit(KEYS[key]); }
      else if (key === 'Space' && model.view().status === 'playing') { event.preventDefault(); hitSpace(); }
      else if (key === 'Enter' && !el('nmOverlay').hidden) { event.preventDefault(); begin(); }
      else if (key === 'KeyP' && ['playing','paused'].includes(model.view().status)) { event.preventDefault(); model.view().status === 'paused' ? begin() : pause(); }
    });
    listen(window, 'keyup', event => held.delete(event.code));
    listen(window, 'blur', () => { held.clear(); if (model.view().status === 'playing') pause(); });
    listen(window, 'pagehide', () => { held.clear(); if (model.view().status === 'playing') pause(); });
    listen(document, 'visibilitychange', () => { held.clear(); if (document.hidden && model.view().status === 'playing') pause(); });
    container.querySelectorAll('.nm-lane').forEach(button => button.addEventListener('click', () => hit(Number(button.dataset.lane))));
    el('nmSpace').addEventListener('click', hitSpace);
    el('nmOverlayAction').addEventListener('click', begin);
    el('nmPause').addEventListener('click', () => model.view().status === 'paused' ? begin() : pause());
    el('nmRestart').addEventListener('click', restart);
    el('nmSound').addEventListener('click', () => { soundOn = !soundOn; if (!soundOn) audioAction('suspend'); else { audioAction('resume'); startAudio(); } updateHud(); draw(); });
    onCleanup(() => { alive = false; held.clear(); if (raf !== null) cancelAnimationFrame(raf); raf = null; audioAction('close'); audioContext = null; container.classList.remove('nm-host'); });
    draw(); updateHud();
    return { model: () => model, snapshot: () => model.view(), press: hit, restart, pause, begin };
  }
  return Object.freeze({ mount });
});

/* Touch and keyboard presentation for a short original typing defense game. */
(function (root) {
  'use strict';

  let instanceSerial = 0;

  function mount(container, session) {
    const M = root.NP_TyperSharkModel;
    if (!container || !M || !session?.listen || !session?.onCleanup || !session?.requestAnimationFrame) throw new Error('Đốm Biển chưa sẵn sàng');
    let model = M.create(), alive = true, frame = null, previous = null, message = 'Gõ chữ để Đốm về rạn.';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const waterGradientId = `tsWater${++instanceSerial}`;
    container.classList.add('ts-host');
    container.innerHTML = `
        <section class="ts-game" aria-label="Đốm Biển · trò chơi gõ chữ">
        <header class="ts-header"><h2>Đốm Biển</h2><div class="ts-actions"><button class="ts-button" id="tsPause" type="button" aria-label="Tạm dừng">II</button><button class="ts-button" id="tsRestart" type="button" aria-label="Chơi lại">↻</button></div></header>
        <div class="ts-hud"><div><span>Sóng</span><strong id="tsWave">1 / 3</strong></div><div><span>Điểm</span><strong id="tsScore">0</strong></div><div><span>Lỡ</span><strong id="tsMisses">●●●</strong></div><div><span>Giờ</span><strong id="tsTime">1:15</strong></div></div>
        <p class="ts-cue">Gõ chữ · dẫn Đốm về rạn san hô</p>
        <svg class="ts-sea" id="tsSea" viewBox="0 0 600 210" role="img" aria-label="Đốm Biển đang bơi về rạn san hô">
          <defs>
            <linearGradient id="${waterGradientId}" x2="0" y2="1"><stop stop-color="#126080"/><stop offset="1" stop-color="#062c45"/></linearGradient>
            <linearGradient id="${waterGradientId}Glow" x2="0" y2="1"><stop stop-color="#d0ffbd"/><stop offset="1" stop-color="#52d8c5"/></linearGradient>
          </defs>
          <rect width="600" height="210" rx="18" fill="url(#${waterGradientId})"/><path d="M0 167q45-20 90 0t90 0 90 0 90 0 90 0 90 0 90 0v43H0Z" fill="#124d4b"/>
          <path d="M540 0v210" stroke="#ffb86b" stroke-width="9" stroke-dasharray="8 10" opacity=".9"/>
          <g fill="#7ecbc5" opacity=".35"><circle cx="116" cy="42" r="6"/><circle cx="180" cy="116" r="4"/><circle cx="348" cy="53" r="5"/><circle cx="450" cy="133" r="7"/></g>
          <g id="tsGlow" class="ts-glow">
            <path d="M-36 4Q-40-13-26-20Q-11-28 4-20Q15-15 22-4Q39-1 48 11Q41 24 23 25H-30Q-43 23-47 15Q-47 9-36 4Z" fill="url(#${waterGradientId}Glow)" stroke="#e7ffcf" stroke-width="3"/>
            <path d="M-24-17Q-29-31-22-40M-5-20Q-3-34 5-40" fill="none" stroke="#8ef1d5" stroke-width="6" stroke-linecap="round"/>
            <circle cx="-22" cy="-41" r="5" fill="#f5dc83"/><circle cx="6" cy="-41" r="5" fill="#f5dc83"/>
            <path d="M-16-12Q-11-19-6-12M2-12Q7-19 12-12" fill="none" stroke="#327a78" stroke-width="3" stroke-linecap="round"/>
            <circle cx="-3" cy="2" r="3.5" fill="#164656"/><circle cx="17" cy="2" r="3.5" fill="#164656"/>
            <path d="M1 11Q7 16 13 11" fill="none" stroke="#164656" stroke-width="2.5" stroke-linecap="round"/>
            <circle class="ts-spot" cx="-29" cy="3" r="3"/><circle class="ts-spot" cx="-18" cy="-3" r="2.5"/><circle class="ts-spot" cx="-28" cy="14" r="2"/>
          </g>
          <text id="tsWord" class="ts-word" x="300" y="58" text-anchor="middle"></text>
          <text id="tsBank" class="ts-bank" x="570" y="42" text-anchor="middle">RẠN</text>
        </svg>
        <div class="ts-word-row" aria-label="Từ mục tiêu"><span id="tsTyped" class="ts-typed"></span><strong id="tsTarget"></strong><span id="tsNext" class="ts-next"></span></div>
        <div class="ts-progress" aria-hidden="true"><span id="tsProgress"></span></div>
        <p id="tsStatus" class="ts-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="ts-keyboard" id="tsKeyboard" role="group" aria-label="Bàn phím chữ cảm ứng"></div>
        <div class="ts-overlay" id="tsOverlay" hidden role="group" aria-label="Kết quả vòng chơi"><div class="ts-card"><strong id="tsOverlayTitle"></strong><p id="tsOverlayCopy"></p><button id="tsOverlayAction" class="ts-button ts-primary" type="button"></button></div></div>
      </section>`;
    const el = id => container.querySelector('#' + id);
    for (const letter of letters) {
      const button = root.document.createElement('button'); button.type = 'button'; button.className = 'ts-key';
      button.dataset.letter = letter; button.setAttribute('data-letter', letter); button.setAttribute('aria-label', `Chữ ${letter}`); button.textContent = letter;
      el('tsKeyboard').appendChild(button);
    }
    const ui = {
      wave: el('tsWave'), score: el('tsScore'), misses: el('tsMisses'), time: el('tsTime'),
      typed: el('tsTyped'), target: el('tsTarget'), next: el('tsNext'), progress: el('tsProgress'),
      glow: el('tsGlow'), word: el('tsWord'), sea: el('tsSea'), pause: el('tsPause'),
      keyboard: el('tsKeyboard'), keys: [...el('tsKeyboard').querySelectorAll('.ts-key')],
      overlay: el('tsOverlay'), overlayTitle: el('tsOverlayTitle'), overlayCopy: el('tsOverlayCopy'),
      overlayAction: el('tsOverlayAction'), status: el('tsStatus')
    };
    let controlsActive = null;
    function stopLoop() { if (frame !== null) session.cancelAnimationFrame(frame); frame = null; previous = null; }
    function destroy() { if (!alive) return; alive = false; stopLoop(); container.classList.remove('ts-host'); container.innerHTML = ''; }
    function render() {
      if (!alive) return;
      const v = model.view(), paused = v.status === 'paused', active = v.status === 'playing';
      ui.wave.textContent = `${v.wave} / 3`; ui.score.textContent = String(v.score);
      ui.misses.textContent = '●'.repeat(v.maxMisses - v.misses) + '○'.repeat(v.misses);
      const totalSeconds = Math.ceil(v.remainingMs / 1000);
      ui.time.textContent = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
      ui.typed.textContent = v.typed; ui.target.textContent = v.word.slice(v.typed.length);
      ui.next.textContent = v.nextLetter ? `· ${v.nextLetter}` : '';
      ui.progress.style.width = `${v.wordProgress * 100}%`;
      ui.glow.setAttribute('transform', `translate(${105 + v.wordProgress * 390} 98)`);
      ui.word.textContent = v.word;
      ui.sea.setAttribute('aria-label', v.word ? `Đốm Biển mang chữ ${v.word} đang bơi về rạn san hô` : 'Đốm Biển đã về rạn san hô');
      ui.pause.disabled = v.status === 'won' || v.status === 'lost';
      ui.pause.textContent = paused ? '>' : 'II'; ui.pause.setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      if (controlsActive !== active) {
        controlsActive = active;
        ui.keyboard.inert = !active;
        ui.keys.forEach(button => { button.disabled = !active; });
      }
      ui.overlay.hidden = active;
      if (paused) { ui.overlayTitle.textContent = 'Tạm dừng'; ui.overlayCopy.textContent = `${v.completed} / ${v.total} từ · ${v.score} điểm`; ui.overlayAction.textContent = 'Chơi tiếp'; }
      else if (v.status === 'won') { ui.overlayTitle.textContent = 'Rạn sáng rực!'; ui.overlayCopy.textContent = `${v.score} điểm · ${v.completed} từ`; ui.overlayAction.textContent = 'Chơi lại'; }
      else if (v.status === 'lost') { ui.overlayTitle.textContent = v.lastEvent === 'time' ? 'Hết giờ' : 'Lỡ ba lượt'; ui.overlayCopy.textContent = `${v.score} điểm · ${v.completed} / ${v.total} từ`; ui.overlayAction.textContent = 'Thử lại'; }
      ui.status.textContent = message;
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'playing') return;
      if (previous !== null) model.advance(Math.min(150, Math.max(0, timestamp - previous)));
      previous = timestamp; render();
      if (model.view().status === 'playing') frame = session.requestAnimationFrame(loop);
      else previous = null;
    }
    function startLoop() { if (!alive || frame !== null || model.view().status !== 'playing' || root.document?.hidden) return; previous = null; frame = session.requestAnimationFrame(loop); }
    function enterPause(value) {
      const changed = value ? model.pause() : model.resume();
      if (!changed) return;
      stopLoop(); message = value ? 'Ván đã dừng.' : 'Gõ chữ để Đốm về rạn.'; render();
      if (!value) startLoop();
    }
    function press(letter) {
      const result = model.typeLetter(letter);
      if (!result.accepted) return;
      message = result.correct ? (result.cleared ? 'Đốm đã về rạn!' : 'Đúng chữ.') : `Sai chữ · cần ${result.expected || '—'}.`;
      if (result.status !== 'playing') stopLoop();
      render();
    }
    function interrupt() { enterPause(true); }
    session.listen(el('tsKeyboard'), 'click', event => { const button = event.target.closest?.('[data-letter]'); if (button) press(button.dataset.letter); });
    session.listen(root.document, 'keydown', event => {
      if (event.target?.matches?.('input, textarea, select') || event.target?.isContentEditable) return;
      if (event.key === 'Escape') { event.preventDefault(); enterPause(model.view().status !== 'paused'); }
      else if (/^[a-z]$/i.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) { event.preventDefault(); press(event.key); }
    });
    session.listen(el('tsPause'), 'click', () => enterPause(model.view().status !== 'paused'));
    session.listen(el('tsRestart'), 'click', () => { stopLoop(); model.restart(); message = 'Gõ chữ để Đốm về rạn.'; render(); startLoop(); });
    session.listen(el('tsOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') enterPause(false);
      else { stopLoop(); model.restart(); message = 'Gõ chữ để Đốm về rạn.'; render(); startLoop(); }
    });
    session.listen(root, 'blur', interrupt);
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy); render(); startLoop();
    return { getModel: () => model, destroy };
  }

  root.NP_TyperShark = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

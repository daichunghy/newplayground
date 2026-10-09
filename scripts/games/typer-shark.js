/* Touch and keyboard presentation for a short original typing defense game. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_TyperSharkModel;
    if (!container || !M || !session?.listen || !session?.onCleanup || !session?.requestAnimationFrame) throw new Error('Typer Shark is not ready');
    let model = M.create(), alive = true, frame = null, previous = null, message = 'Gõ chữ trên lưng cá.';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    container.classList.add('ts-host');
    container.innerHTML = `
      <section class="ts-game" aria-label="Gõ chữ nhanh">
        <header class="ts-header"><h2>Gõ Chữ Nhanh</h2><div class="ts-actions"><button class="ts-button" id="tsPause" type="button" aria-label="Tạm dừng">II</button><button class="ts-button" id="tsRestart" type="button" aria-label="Chơi lại">↻</button></div></header>
        <div class="ts-hud"><div><span>Sóng</span><strong id="tsWave">1 / 3</strong></div><div><span>Điểm</span><strong id="tsScore">0</strong></div><div><span>Thoát</span><strong id="tsMisses">●●●</strong></div><div><span>Giờ</span><strong id="tsTime">1:30</strong></div></div>
        <p class="ts-cue">Gõ chữ · đừng để cá chạm bờ</p>
        <svg class="ts-sea" id="tsSea" viewBox="0 0 600 210" role="img" aria-label="Cá mập đang tiến về bờ san hô">
          <defs><linearGradient id="tsWater" x2="0" y2="1"><stop stop-color="#126080"/><stop offset="1" stop-color="#062c45"/></linearGradient></defs>
          <rect width="600" height="210" rx="18" fill="url(#tsWater)"/><path d="M0 167q45-20 90 0t90 0 90 0 90 0 90 0 90 0 90 0v43H0Z" fill="#124d4b"/>
          <path d="M540 0v210" stroke="#ffb86b" stroke-width="9" stroke-dasharray="8 10" opacity=".9"/>
          <g fill="#7ecbc5" opacity=".35"><circle cx="116" cy="42" r="6"/><circle cx="180" cy="116" r="4"/><circle cx="348" cy="53" r="5"/><circle cx="450" cy="133" r="7"/></g>
          <g id="tsShark" class="ts-shark"><path d="M-55 0q24-27 61-17l26-18 1 24q28 8 39 19-13 12-39 20l-1 23-27-20q-37 10-60-17l-19 13 3-22-3-20Z"/><circle cx="17" cy="-5" r="3.6" fill="#072d3e"/><path d="M-35 7q31 17 59 4" fill="none" stroke="#e8f6ef" stroke-width="3"/></g>
          <text id="tsWord" class="ts-word" x="250" y="108" text-anchor="middle"></text>
          <text id="tsBank" class="ts-bank" x="570" y="42" text-anchor="middle">BỜ</text>
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
    function stopLoop() { if (frame !== null) session.cancelAnimationFrame(frame); frame = null; previous = null; }
    function destroy() { if (!alive) return; alive = false; stopLoop(); container.classList.remove('ts-host'); container.innerHTML = ''; }
    function render() {
      if (!alive) return;
      const v = model.view(), paused = v.status === 'paused', active = v.status === 'playing';
      el('tsWave').textContent = `${v.wave} / 3`; el('tsScore').textContent = String(v.score);
      el('tsMisses').textContent = '●'.repeat(v.maxMisses - v.misses) + '○'.repeat(v.misses);
      el('tsTime').textContent = `${Math.floor(v.remainingMs / 60000)}:${String(Math.ceil(v.remainingMs / 1000) % 60).padStart(2, '0')}`;
      el('tsTyped').textContent = v.typed; el('tsTarget').textContent = v.word.slice(v.typed.length);
      el('tsNext').textContent = v.nextLetter ? `· ${v.nextLetter}` : '';
      el('tsProgress').style.width = `${v.wordProgress * 100}%`;
      el('tsShark').setAttribute('transform', `translate(${105 + v.wordProgress * 390} 98)`);
      el('tsWord').textContent = v.word;
      el('tsSea').setAttribute('aria-label', v.word ? `Cá mập mang chữ ${v.word} đang tiến về bờ` : 'Bầy cá đã qua');
      el('tsPause').disabled = v.status === 'won' || v.status === 'lost';
      el('tsPause').textContent = paused ? '>' : 'II'; el('tsPause').setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      el('tsKeyboard').inert = !active;
      el('tsKeyboard').querySelectorAll('.ts-key').forEach(button => { button.disabled = !active; });
      const overlay = el('tsOverlay'); overlay.hidden = active;
      if (paused) { el('tsOverlayTitle').textContent = 'Tạm dừng'; el('tsOverlayCopy').textContent = `${v.completed} / ${v.total} từ · ${v.score} điểm`; el('tsOverlayAction').textContent = 'Chơi tiếp'; }
      else if (v.status === 'won') { el('tsOverlayTitle').textContent = 'Bờ biển an toàn!'; el('tsOverlayCopy').textContent = `${v.score} điểm · ${v.completed} từ`; el('tsOverlayAction').textContent = 'Chơi lại'; }
      else if (v.status === 'lost') { el('tsOverlayTitle').textContent = v.lastEvent === 'time' ? 'Hết giờ' : 'Cá chạm bờ'; el('tsOverlayCopy').textContent = `${v.score} điểm · ${v.completed} / ${v.total} từ`; el('tsOverlayAction').textContent = 'Thử lại'; }
      el('tsStatus').textContent = message;
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
      stopLoop(); message = value ? 'Ván đã dừng.' : 'Gõ chữ trên lưng cá.'; render();
      if (!value) startLoop();
    }
    function press(letter) {
      const result = model.typeLetter(letter);
      if (!result.accepted) return;
      message = result.correct ? (result.cleared ? 'Một đàn cá đã quay đầu!' : 'Đúng chữ.') : `Sai chữ · cần ${result.expected || '—'}.`;
      render();
    }
    function interrupt() { enterPause(true); }
    session.listen(el('tsKeyboard'), 'click', event => { const button = event.target.closest?.('[data-letter]'); if (button) press(button.dataset.letter); });
    session.listen(root.document, 'keydown', event => {
      if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); enterPause(model.view().status !== 'paused'); }
      else if (/^[a-z]$/i.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) { event.preventDefault(); press(event.key); }
    });
    session.listen(el('tsPause'), 'click', () => enterPause(model.view().status !== 'paused'));
    session.listen(el('tsRestart'), 'click', () => { stopLoop(); model.restart(); message = 'Gõ chữ trên lưng cá.'; render(); startLoop(); });
    session.listen(el('tsOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') enterPause(false);
      else { stopLoop(); model.restart(); message = 'Gõ chữ trên lưng cá.'; render(); startLoop(); }
    });
    session.listen(root, 'blur', interrupt);
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy); render(); startLoop();
    return { getModel: () => model, destroy };
  }

  root.NP_TyperShark = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

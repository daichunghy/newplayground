/* Original signal-pattern puzzle presentation. All resources belong to NP_GameSession. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_KhoiSacModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Khối Sắc needs its model and an active game session');
    }

    let model = M.create(options), alive = true, frame = null, previous = null;
    let message = 'Khớp các ô mẫu bằng cách xoay mặt.';
    container.classList.add('ks-host');
    container.innerHTML = `
      <section class="ks-game" tabindex="0" aria-label="Khối Sắc">
        <header class="ks-head">
          <h2>Khối Sắc</h2>
          <div class="ks-actions">
            <button id="ksPause" class="ks-icon" type="button" aria-label="Tạm dừng">||</button>
            <button id="ksRestart" class="ks-icon" type="button" aria-label="Chơi lại">↻</button>
          </div>
        </header>
        <div class="ks-hud" aria-label="Tiến độ">
          <strong id="ksStage">Mẫu 1 / 3</strong>
          <span id="ksMoves">0 / 10 lượt</span>
          <strong id="ksTimer">2:00</strong>
        </div>
        <div class="ks-objective">
          <div><strong id="ksGoalName">Cặp Chớp</strong><span id="ksGoalProgress">0 / 4 ô khớp</span></div>
          <div id="ksGoals" class="ks-goals" role="group" aria-label="Mẫu cần ghép"></div>
        </div>
        <p class="ks-hint">Ghép mẫu, không cần làm đều mọi mặt. U D F B R L · giữ Shift để xoay ngược.</p>
        <div id="ksFaces" class="ks-faces" role="group" aria-label="Sáu mặt Khối Sắc"></div>
        <div id="ksControls" class="ks-controls" role="group" aria-label="Xoay mặt">
          ${M.FACES.map(face => `<div class="ks-turn-pair" role="group" aria-label="Mặt ${M.FACE_NAMES[face]}">
            <span class="ks-face-key">${face}</span>
            <button id="ks-${face.toLowerCase()}-cw" class="ks-turn" data-face="${face}" data-turns="1" type="button" aria-label="Mặt ${M.FACE_NAMES[face]}, xoay thuận">${face}</button>
            <button id="ks-${face.toLowerCase()}-ccw" class="ks-turn" data-face="${face}" data-turns="-1" type="button" aria-label="Mặt ${M.FACE_NAMES[face]}, xoay ngược">${face}′</button>
          </div>`).join('')}
        </div>
        <p id="ksStatus" class="ks-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div id="ksOverlay" class="ks-overlay" hidden role="group" aria-label="Trạng thái chiến dịch">
          <div class="ks-overlay-card">
            <strong id="ksOverlayTitle"></strong>
            <p id="ksOverlayCopy"></p>
            <button id="ksOverlayAction" class="ks-primary" type="button"></button>
          </div>
        </div>
      </section>`;
    const el = id => container.querySelector('#' + id);
    const game = container.querySelector('.ks-game');

    function stopLoop() {
      if (frame !== null) session.cancelAnimationFrame(frame);
      frame = null;
      previous = null;
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      stopLoop();
      container.classList.remove('ks-host');
      container.innerHTML = '';
    }

    function announce(text) {
      message = text;
      el('ksStatus').textContent = text;
    }

    function stickerMarkup(color, index, prefix) {
      const mark = M.COLORS[color];
      return `<span id="${prefix}-${index}" class="ks-sticker" role="img" data-color="${color}" data-mark="${mark.mark}" style="--ks-color:${mark.value}" aria-label="${mark.name}"></span>`;
    }

    function render() {
      if (!alive) return;
      const v = model.view();
      const playing = v.status === 'playing', paused = v.status === 'paused';
      const seconds = Math.ceil(v.timeLeft / 1000);
      el('ksStage').textContent = `Mẫu ${v.stage} / ${v.stageCount}`;
      el('ksMoves').textContent = `${v.stageMoves} / ${v.moveBudget} lượt`;
      el('ksTimer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      el('ksGoalName').textContent = M.STAGES[v.stageIndex].name;
      el('ksGoalProgress').textContent = `${v.matches} / ${v.targetStickerCount} ô khớp`;
      el('ksFaces').innerHTML = M.FACES.map(face => `<div class="ks-face-panel" role="group" aria-label="Mặt ${M.FACE_NAMES[face]} ${face}">
        <strong><span>${face}</span>${M.FACE_NAMES[face]}</strong>
        <div class="ks-face-grid">${v.faces[face].map((color, index) => stickerMarkup(color, index, `ks-face-${face}`)).join('')}</div>
      </div>`).join('');
      el('ksGoals').innerHTML = v.targetFaces.map(face => `<div class="ks-goal-face" aria-label="Mẫu mặt ${M.FACE_NAMES[face]} ${face}">
        <strong>${face}</strong><div class="ks-goal-grid">${v.targets[face].map((color, index) => stickerMarkup(color, index, `ks-goal-${face}`)).join('')}</div>
      </div>`).join('');
      for (const button of container.querySelectorAll('.ks-turn')) button.disabled = !playing;
      el('ksPause').disabled = v.status === 'won' || v.status === 'lost';
      el('ksPause').textContent = paused ? '▶' : '||';
      el('ksPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('ksOverlay').hidden = playing;
      if (paused) {
        el('ksOverlayTitle').textContent = 'Tạm dừng';
        el('ksOverlayCopy').textContent = `${v.matches} / ${v.targetStickerCount} ô · ${v.stageMoves} / ${v.moveBudget} lượt`;
        el('ksOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'won') {
        el('ksOverlayTitle').textContent = 'Ba mẫu đã ghép';
        el('ksOverlayCopy').textContent = `${v.totalMoves} lượt · chiến dịch hoàn tất.`;
        el('ksOverlayAction').textContent = 'Chơi lại';
      } else if (v.status === 'lost') {
        el('ksOverlayTitle').textContent = v.lastEvent === 'timeout' ? 'Hết thời gian' : 'Hết lượt';
        el('ksOverlayCopy').textContent = `${v.matches} / ${v.targetStickerCount} ô trong mẫu này.`;
        el('ksOverlayAction').textContent = 'Chơi lại';
      }
      el('ksStatus').textContent = message;
    }

    function loop(timestamp) {
      frame = null;
      if (!alive) { previous = null; return; }
      const before = model.view();
      if (before.status !== 'playing') { previous = null; return; }
      if (previous !== null) model.advance(Math.max(0, Math.min(250, timestamp - previous)));
      previous = timestamp;
      const after = model.view();
      const seconds = Math.ceil(after.timeLeft / 1000);
      const shownTimer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      if (el('ksTimer').textContent !== shownTimer) el('ksTimer').textContent = shownTimer;
      if (after.status === 'playing') frame = session.requestAnimationFrame(loop);
      else { previous = null; render(); }
    }

    function startLoop() {
      if (!alive || frame !== null || model.view().status !== 'playing' || root.document?.hidden) return;
      previous = null;
      frame = session.requestAnimationFrame(loop);
    }

    function interrupt() {
      if (model.pause()) {
        stopLoop();
        announce('Tạm dừng.');
        render();
      }
    }

    function togglePause() {
      if (model.pause()) {
        stopLoop(); announce('Tạm dừng.'); render();
      } else if (model.resume()) {
        announce('Tiếp tục.'); render(); startLoop();
      }
    }

    function turn(face, turns) {
      if (!alive) return;
      const result = model.turn(face, turns);
      if (!result.accepted) return;
      if (result.status === 'won') announce('Ba mẫu đã ghép.');
      else if (result.status === 'lost') announce(result.lastEvent === 'timeout' ? 'Hết thời gian.' : 'Hết lượt.');
      else if (result.advanced) announce(`Mẫu ${result.previousStage} đã ghép. Tiếp theo: ${model.view().stageName}.`);
      else announce(`${model.view().matches} / ${model.view().targetStickerCount} ô khớp.`);
      render();
      if (model.view().status !== 'playing') stopLoop();
      else startLoop();
    }

    function replay() {
      model.restart();
      stopLoop();
      announce('Chiến dịch mới · ghép các ô mẫu.');
      render();
      game.focus({ preventScroll: true });
      startLoop();
    }

    for (const button of container.querySelectorAll('.ks-turn')) {
      session.listen(button, 'click', () => turn(button.dataset.face, Number(button.dataset.turns)));
    }
    session.listen(el('ksPause'), 'click', togglePause);
    session.listen(el('ksRestart'), 'click', replay);
    session.listen(el('ksOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') togglePause();
      else replay();
    });
    session.listen(game, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const key = String(event.key || '');
      if (key === 'Escape' || key.toLowerCase() === 'p') {
        event.preventDefault(); togglePause(); return;
      }
      const face = key.toUpperCase();
      if (M.FACES.includes(face)) {
        event.preventDefault();
        turn(face, event.shiftKey ? -1 : 1);
      }
    });
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); else startLoop(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);
    render();
    game.focus({ preventScroll: true });
    startLoop();
    return { getModel: () => model, destroy };
  }

  root.NP_KhoiSac = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

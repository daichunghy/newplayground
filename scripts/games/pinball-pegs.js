/* Original Vietnamese ball-and-peg board with immediate mouse, touch and keyboard play. */
(function (root) {
  'use strict';
  const M = root.NP_PinballPegsModel;
  const COLORS = M.COLORS;
  const SAVE_KEY = 'np_bat_chot_campaign_v1';

  function mount(container, session, options = {}) {
    if (!M) throw new Error('Bật Chốt rules are not ready');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Bật Chốt needs an active game session');
    }
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    const hasCustomModel = Object.keys(options).some(key => key !== 'campaign' && key !== 'storage');
    const campaignEnabled = options.campaign === true || !hasCustomModel;
    let progress = { unlockedStage: 0, bestScores: Array(M.STAGES.length).fill(null), bestShots: Array(M.STAGES.length).fill(null) };
    let saveDisabled = false, saveNote = '', stageIndex = 0, completionRecorded = false;
    let storage = options.storage || null;
    if (campaignEnabled) {
      try {
        if (!storage) storage = root.localStorage;
        const raw = storage.getItem(SAVE_KEY);
        if (raw !== null) {
          let parsed;
          try { parsed = JSON.parse(raw); } catch (_) { parsed = null; }
          if (parsed && Number.isInteger(parsed.version) && parsed.version > 1) {
            saveDisabled = true; saveNote = 'Bản lưu mới hơn được giữ nguyên.';
          } else if (parsed && parsed.version === 1 && Number.isInteger(parsed.unlockedStage)
            && parsed.unlockedStage >= 0 && parsed.unlockedStage < M.STAGES.length
            && Array.isArray(parsed.bestScores) && parsed.bestScores.length === M.STAGES.length
            && parsed.bestScores.every(value => value === null || (Number.isSafeInteger(value) && value >= 0))
            && Array.isArray(parsed.bestShots) && parsed.bestShots.length === M.STAGES.length
            && parsed.bestShots.every(value => value === null || (Number.isSafeInteger(value) && value >= 1))) {
            progress = { unlockedStage: parsed.unlockedStage, bestScores: parsed.bestScores.slice(), bestShots: parsed.bestShots.slice() };
          } else {
            if (storage.getItem(`${SAVE_KEY}_recovery`) === null) storage.setItem(`${SAVE_KEY}_recovery`, raw);
            saveNote = 'Bản lưu lỗi đã được giữ lại.';
          }
        }
      } catch (_) { saveDisabled = true; saveNote = 'Tiến trình chỉ lưu trong lượt này.'; }
    }
    stageIndex = campaignEnabled ? progress.unlockedStage : 0;
    let model = campaignEnabled ? M.createStage(stageIndex) : M.create(options);
    let alive = true, frame = null, previous = null, aim = 0, pegSignature = '';
    container.classList.add('pc-host');
    container.innerHTML = `
      <section class="pc-game" aria-label="Bật Chốt" tabindex="0">
        <header class="pc-header"><div><p class="pc-kicker" id="pcStageName"></p><h2>Bật Chốt</h2></div><button id="pcRestart" class="pc-button" type="button">Chơi lại</button></header>
        <nav id="pcStages" class="pc-stage-nav" aria-label="Chặng Bật Chốt">${M.STAGES.map((stage, index) =>
          `<button class="pc-button pc-stage" id="pcStage${index}" type="button" aria-label="Chặng ${index + 1}: ${stage.name}" aria-current="${index === stageIndex ? 'step' : 'false'}" ${index > progress.unlockedStage ? 'disabled' : ''}>${index + 1}</button>`
        ).join('')}</nav>
        <div class="pc-hud"><p id="pcStatus" role="status" aria-live="polite" aria-atomic="true">Nhắm rồi bắn. Dọn hết chốt cam.</p><div class="pc-hud-results"><strong id="pcTargets"></strong><small id="pcBest" hidden></small></div></div>
        <svg id="pcBoard" class="pc-board" viewBox="0 0 420 580" role="img" tabindex="0" aria-label="Bàn chốt. Chạm để ngắm và bắn bóng.">
          <defs><linearGradient id="pcBg" x2="0" y2="1"><stop stop-color="#eaf2ef"/><stop offset="1" stop-color="#f5eee0"/></linearGradient></defs>
          <rect x="8" y="8" width="404" height="564" rx="24" fill="url(#pcBg)" stroke="#c3ced2" stroke-width="2"/>
          <path d="M18 20V550M402 20V550" stroke="#77899a" stroke-width="5" opacity=".52"/>
          <g id="pcPegs"></g><g id="pcBall"></g>
          <path id="pcAim" d="" stroke="#536477" stroke-width="2" stroke-dasharray="6 7" opacity=".62"/>
          <path d="M188 54h44l-8-20h-28z" fill="#435c7d" stroke="#263d5c" stroke-width="3" stroke-linejoin="round"/>
          <rect id="pcBucket" x="164" y="548" width="92" height="12" rx="6" fill="#527967" stroke="#fff" stroke-width="2"/>
          <text x="24" y="40" class="pc-label">ĐIỂM</text><text id="pcScore" x="24" y="65" class="pc-score">0</text>
          <text x="337" y="40" class="pc-label">BI</text><text id="pcBalls" x="337" y="65" class="pc-score">10</text>
        </svg>
        <div class="pc-controls"><button id="pcLeft" class="pc-button pc-arrow" type="button" aria-label="Ngắm trái">←</button><button id="pcFire" class="pc-button pc-primary" type="button">Bắn</button><button id="pcRight" class="pc-button pc-arrow" type="button" aria-label="Ngắm phải">→</button></div>
        <button id="pcNext" class="pc-button pc-primary pc-next" type="button" hidden>Chặng sau</button>
        <p class="pc-footer">← → ngắm · Space bắn · R chơi lại</p>
        <p id="pcSaveNote" class="pc-save-note" role="status" aria-live="polite" hidden></p>
      </section>`;
    const el = id => container.querySelector(`#${id}`);

    function persistProgress() {
      if (!campaignEnabled || saveDisabled) return;
      try {
        storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, unlockedStage: progress.unlockedStage,
          bestScores: progress.bestScores, bestShots: progress.bestShots }));
      } catch (_) { saveDisabled = true; saveNote = 'Tiến trình chỉ lưu trong lượt này.'; }
    }
    function recordCompletion(view) {
      if (!campaignEnabled || view.status !== 'won' || completionRecorded) return;
      completionRecorded = true;
      const oldScore = progress.bestScores[stageIndex];
      const oldShots = progress.bestShots[stageIndex];
      progress.bestScores[stageIndex] = oldScore === null ? view.score : Math.max(oldScore, view.score);
      progress.bestShots[stageIndex] = oldShots === null ? view.shots : Math.min(oldShots, view.shots);
      progress.unlockedStage = Math.max(progress.unlockedStage, Math.min(M.STAGES.length - 1, stageIndex + 1));
      persistProgress();
    }
    function loadStage(index) {
      if (!campaignEnabled || index < 0 || index > progress.unlockedStage || index >= M.STAGES.length) return false;
      stopLoop(); stageIndex = index; model = M.createStage(stageIndex); aim = 0; pegSignature = ''; completionRecorded = false;
      render(); el('pcBoard').focus?.(); return true;
    }
    function restartStage() {
      if (campaignEnabled) model = M.createStage(stageIndex);
      else model.restart();
      stopLoop(); aim = 0; pegSignature = ''; completionRecorded = false;
      render(); el('pcBoard').focus?.();
    }

    function statusText(view) {
      if (view.status === 'won') return campaignEnabled
        ? (stageIndex === M.STAGES.length - 1 ? `Xong ${M.STAGES.length} chặng!` : `Qua chặng ${stageIndex + 1}!`)
        : 'Dọn hết chốt cam!';
      if (view.status === 'lost') return 'Hết bi. Chơi lại nhé.';
      if (view.lastEvent === 'catch') return 'Bắt được bi!';
      if (view.lastEvent === 'target') return 'Trúng chốt cam!';
      if (view.lastEvent === 'peg') return 'Chốt bật!';
      if (view.lastEvent === 'drain') return 'Rơi mất bi.';
      if (view.lastEvent === 'timeout') return 'Hết lượt.';
      return 'Nhắm rồi bắn. Dọn hết chốt cam.';
    }
    function render() {
      if (!alive) return;
      const v = model.view();
      recordCompletion(v);
      el('pcStageName').textContent = campaignEnabled
        ? `Chặng ${stageIndex + 1}/${M.STAGES.length} · ${M.STAGES[stageIndex].name}`
        : `CHỐT CAM · ${options.balls ?? M.SHOT_LIMIT} BI`;
      el('pcStages').hidden = !campaignEnabled;
      M.STAGES.forEach((stage, index) => {
        const button = el(`pcStage${index}`);
        button.disabled = !campaignEnabled || index > progress.unlockedStage;
        button.setAttribute('aria-current', index === stageIndex ? 'step' : 'false');
        button.setAttribute('aria-label', `Chặng ${index + 1}: ${stage.name}${progress.bestScores[index] === null ? '' : `, kỷ lục ${progress.bestScores[index]} điểm, ít nhất ${progress.bestShots[index]} bi`}`);
      });
      el('pcNext').hidden = !campaignEnabled || v.status !== 'won' || stageIndex >= M.STAGES.length - 1;
      const bestScore = progress.bestScores[stageIndex], bestShots = progress.bestShots[stageIndex];
      el('pcBest').textContent = bestScore === null ? '' : `Kỷ lục ${bestScore} điểm · ít nhất ${bestShots} bi`;
      el('pcBest').hidden = !campaignEnabled || bestScore === null;
      el('pcSaveNote').textContent = saveNote;
      el('pcSaveNote').hidden = !saveNote;
      const signature = v.pegs.map(peg => `${peg.id}:${peg.color}:${peg.hit ? 1 : 0}`).join('|');
      if (signature !== pegSignature) {
        el('pcPegs').innerHTML = v.pegs.map(peg => {
          const fill = peg.hit ? '#f4cc77' : COLORS[peg.color], mark = M.MARKS[peg.color];
          return `<g aria-label="${peg.hit ? 'Đã chạm chốt' : 'Chốt'} ${peg.color === 'orange' ? 'cam' : 'xanh'}"><circle cx="${peg.x}" cy="${peg.y}" r="${M.PEG_RADIUS}" fill="${fill}" stroke="#fff" stroke-width="2"/>${peg.hit ? `<circle cx="${peg.x}" cy="${peg.y}" r="12" fill="none" stroke="#fff4c5" stroke-width="2"/>` : ''}<text x="${peg.x}" y="${peg.y + 4}" text-anchor="middle" fill="#30465e" font-size="11" font-weight="800">${mark}</text></g>`;
        }).join('');
        pegSignature = signature;
      }
      el('pcBall').innerHTML = v.projectile
        ? `<circle cx="${v.projectile.x.toFixed(1)}" cy="${v.projectile.y.toFixed(1)}" r="${M.BALL_RADIUS}" fill="#fff4bf" stroke="#e5a343" stroke-width="3"/>` : '';
      const radians = aim * Math.PI / 180;
      const endX = M.WIDTH / 2 + Math.sin(radians) * 250;
      const endY = 42 + Math.cos(radians) * 250;
      el('pcAim').setAttribute('d', `M210 46 L${endX.toFixed(1)} ${endY.toFixed(1)}`);
      el('pcBucket').setAttribute('x', (v.bucketX - M.BUCKET_WIDTH / 2).toFixed(1));
      el('pcScore').textContent = String(v.score);
      el('pcBalls').textContent = String(v.ballsLeft);
      el('pcTargets').textContent = `${v.orangeLeft} chốt cam`;
      el('pcStatus').textContent = statusText(v);
      el('pcFire').disabled = !v.canFire;
      el('pcLeft').disabled = !v.canFire; el('pcRight').disabled = !v.canFire;
      if (v.status === 'playing') schedule(); else stopLoop();
    }
    function stopLoop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; previous = null;
    }
    function schedule() { if (alive && frame === null) frame = requestAnimationFrame(animate); }
    function animate(time) {
      frame = null;
      if (!alive) return;
      const delta = previous === null ? 0 : Math.max(0, Math.min(.05, (time - previous) / 1000));
      previous = time;
      if (delta) model.tick(delta);
      render();
    }
    function fire() {
      if (!model.fire(aim)) return;
      render(); el('pcBoard').focus?.();
    }
    function setAim(value) {
      if (!model.setAim(value)) return;
      aim = model.view().aim; render();
    }
    function aimFromPointer(event) {
      const bounds = el('pcBoard').getBoundingClientRect();
      if (!bounds.width || !bounds.height) return false;
      const x = ((event.clientX - bounds.left) / bounds.width) * M.WIDTH;
      const y = ((event.clientY - bounds.top) / bounds.height) * M.HEIGHT;
      const angle = Math.atan2(x - M.WIDTH / 2, y - 42) * 180 / Math.PI;
      return model.setAim(angle);
    }
    listen(el('pcFire'), 'click', fire);
    listen(el('pcRestart'), 'click', restartStage);
    listen(el('pcNext'), 'click', () => loadStage(stageIndex + 1));
    M.STAGES.forEach((_, index) => listen(el(`pcStage${index}`), 'click', () => loadStage(index)));
    listen(el('pcLeft'), 'click', () => setAim(aim - 4));
    listen(el('pcRight'), 'click', () => setAim(aim + 4));
    listen(el('pcBoard'), 'pointermove', event => {
      if (model.view().canFire && aimFromPointer(event)) { aim = model.view().aim; render(); }
    });
    listen(el('pcBoard'), 'pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      if (aimFromPointer(event)) { aim = model.view().aim; fire(); }
      event.preventDefault?.();
    });
    listen(container, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        setAim(aim + (event.key === 'ArrowLeft' ? -4 : 4)); event.preventDefault?.();
      } else if (event.key === ' ' || event.key === 'Enter') { fire(); event.preventDefault?.(); }
      else if (event.key === 'r' || event.key === 'R') { restartStage(); event.preventDefault?.(); }
    });
    listen(root, 'blur', stopLoop); listen(root, 'focus', schedule);
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) stopLoop(); else schedule(); });
    onCleanup(() => { alive = false; stopLoop(); container.classList.remove('pc-host'); });
    render();
    return Object.freeze({ getModel: () => model, close: stopLoop });
  }
  root.NP_PinballPegs = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

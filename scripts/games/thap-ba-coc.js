/* Original Vietnamese campaign and accessible controls for Tháp Ba Cọc. */
(function (root) {
  'use strict';
  const SAVE_KEY = 'np_thap_ba_coc_campaign_v1';
  const RECOVERY_KEY = `${SAVE_KEY}_recovery`;
  const LETTERS = ['A', 'B', 'C'];

  function validCampaign(saved, M) {
    return !!saved && saved.version === 1 && Number.isSafeInteger(saved.unlockedStage) &&
      saved.unlockedStage >= 0 && saved.unlockedStage < M.STAGES.length &&
      Number.isSafeInteger(saved.activeStage) && saved.activeStage >= 0 && saved.activeStage <= saved.unlockedStage &&
      Array.isArray(saved.bests) && saved.bests.length === M.STAGES.length &&
      saved.bests.every((best, i) => best === null || (Number.isSafeInteger(best) && best >= M.optimalMoves(M.STAGES[i].disks) && best <= 1000000)) &&
      Array.isArray(saved.stages) && saved.stages.length === M.STAGES.length &&
      saved.bests.every((best, i) => i < saved.unlockedStage ? best !== null : i > saved.unlockedStage ? best === null : true) &&
      saved.stages.every((stage, i) => stage === null || (i <= saved.unlockedStage && M.validSave(stage, i)));
  }

  function mount(container, session, storage = null) {
    const M = root.NP_ThapBaCocModel;
    if (!M) throw new Error('Tháp Ba Cọc rules are not ready');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Tháp Ba Cọc needs an active game session');
    }
    const { listen, onCleanup } = session;
    let store = storage;
    let progress = { version: 1, unlockedStage: 0, activeStage: 0, bests: Array(M.STAGES.length).fill(null), stages: Array(M.STAGES.length).fill(null) };
    let storageLocked = false, storageNote = '', alive = true;
    try {
      if (!store) store = root.localStorage;
      const raw = store.getItem(SAVE_KEY);
      if (raw !== null) {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        if (parsed?.version > 1) {
          storageLocked = true; storageNote = 'Bản lưu mới hơn được giữ nguyên.';
        } else if (validCampaign(parsed, M)) {
          progress = { version: 1, unlockedStage: parsed.unlockedStage, activeStage: parsed.activeStage,
            bests: parsed.bests.slice(), stages: parsed.stages.slice() };
        } else {
          try { if (store.getItem(RECOVERY_KEY) === null) store.setItem(RECOVERY_KEY, raw); } catch (_) {}
          storageNote = 'Bản lưu lỗi đã được giữ lại; chặng này bắt đầu lại.';
        }
      }
    } catch (_) { storageLocked = true; storageNote = 'Tiến trình chỉ lưu trong lượt này.'; }

    let stageIndex = progress.activeStage;
    let model = progress.stages[stageIndex] ? M.create(stageIndex, progress.stages[stageIndex]) : M.create(stageIndex);
    let selectedPeg = null, hintStep = null, resetPending = false;
    container.classList.add('tb-host');
    container.innerHTML = `
      <section class="tb-game" aria-label="Tháp Ba Cọc">
        <header class="tb-header">
          <div><p class="tb-kicker">Bình tĩnh, từng nước một</p><h2>Tháp Ba Cọc</h2></div>
          <button id="tbReset" class="tb-button" type="button">Làm lại chặng</button>
        </header>
        <nav class="tb-stages" id="tbStages" role="group" aria-label="Chọn chặng">${M.STAGES.map((stage, i) =>
          `<button id="tbStage${i}" class="tb-button tb-stage" type="button" aria-label="Chặng ${i + 1}: ${stage.name}, ${stage.disks} đĩa" ${i > progress.unlockedStage ? 'disabled' : ''}>${i + 1}</button>`
        ).join('')}</nav>
        <div class="tb-hud" aria-label="Tiến độ chặng">
          <div><span id="tbStageName" class="tb-hud-label"></span><strong id="tbDiskCount"></strong></div>
          <div><span class="tb-hud-label">Nước đi / chuẩn</span><strong id="tbMoveCount"></strong><small id="tbMoveDelta"></small></div>
          <div><span class="tb-hud-label">Kỷ lục</span><strong id="tbBest"></strong></div>
        </div>
        <div class="tb-reset-confirm" id="tbResetConfirm" hidden role="group" aria-label="Xác nhận làm lại">
          <span>Làm lại từ đầu chặng này? Nước đi hiện tại sẽ mất.</span>
          <button class="tb-button tb-primary" id="tbResetYes" type="button">Làm lại</button>
          <button class="tb-button" id="tbResetNo" type="button">Chơi tiếp</button>
        </div>
        <p class="tb-instruction">Chọn cọc có đĩa trên cùng, rồi chọn cọc đích.</p>
        <div class="tb-board" role="group" aria-label="Ba cọc và các đĩa">
          ${LETTERS.map((letter, i) => `<button id="tbPeg${i}" class="tb-peg" type="button" aria-pressed="false" aria-label="Cọc ${letter}"><span class="tb-peg-name">Cọc ${letter}</span><span id="tbStack${i}" class="tb-stack" aria-hidden="true"></span></button>`).join('')}
        </div>
        <p class="tb-hint-text" id="tbHintText" aria-live="polite"></p>
        <p class="tb-status" id="tbStatus" role="status" aria-live="polite" aria-atomic="true">Chuyển cả chồng đĩa sang Cọc C. Không đặt đĩa lớn lên đĩa nhỏ.</p>
        <div class="tb-actions">
          <button id="tbUndo" class="tb-button" type="button" disabled>Hoàn tác</button>
          <button id="tbHint" class="tb-button" type="button">Gợi ý</button>
          <button id="tbNext" class="tb-button tb-primary" type="button" hidden>Chặng tiếp</button>
          <button id="tbReplay" class="tb-button" type="button" hidden>Chơi lại chặng</button>
        </div>
        <p class="tb-complete" id="tbComplete" hidden></p>
        <p class="tb-storage-note" id="tbStorageNote" hidden></p>
        <details class="tb-help"><summary>Cách chơi</summary><p>Di chuyển từng đĩa một. Chỉ có thể đặt đĩa nhỏ hơn lên trên đĩa lớn hơn hoặc lên cọc trống. Dùng mũi tên để chuyển cọc đang chọn; Enter hoặc chạm để chọn cọc xuất phát rồi cọc đích. Hoàn tác bằng U, gợi ý bằng H.</p></details>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const pegEls = LETTERS.map((_, i) => el(`tbPeg${i}`));
    const stageEls = M.STAGES.map((_, i) => el(`tbStage${i}`));
    const focusPeg = index => pegEls[index]?.focus({ preventScroll: true });
    function save() {
      if (!alive || storageLocked) return;
      try {
        progress.activeStage = stageIndex;
        progress.stages[stageIndex] = model.serialize();
        store.setItem(SAVE_KEY, JSON.stringify(progress));
      } catch (_) { storageNote = 'Không lưu được tiến trình; bạn vẫn có thể tiếp tục chơi.'; }
      el('tbStorageNote').textContent = storageNote;
      el('tbStorageNote').hidden = !storageNote;
    }
    function announce(message) { el('tbStatus').textContent = message; }
    function setStage(index) {
      if (!Number.isSafeInteger(index) || index < 0 || index > progress.unlockedStage || index >= M.STAGES.length) return;
      progress.stages[stageIndex] = model.serialize();
      stageIndex = index; progress.activeStage = index;
      model = progress.stages[index] ? M.create(index, progress.stages[index]) : M.create(index);
      selectedPeg = null; hintStep = null; resetPending = false;
      el('tbResetConfirm').hidden = true;
      render(); save(); announce(`Đang ở chặng ${index + 1}: ${M.STAGES[index].name}.`);
      focusPeg(0);
    }
    function restart() {
      model = M.create(stageIndex); progress.stages[stageIndex] = model.serialize();
      selectedPeg = null; hintStep = null; resetPending = false;
      el('tbResetConfirm').hidden = true; render(); save();
      announce(`Chặng ${stageIndex + 1} bắt đầu lại. Chuyển ${model.view().stage.disks} đĩa sang Cọc C.`);
      focusPeg(0);
    }
    function makeMove(from, to) {
      const result = model.move(from, to);
      if (!result.ok) {
        if (result.reason === 'larger-on-smaller') announce('Không hợp lệ: không đặt đĩa lớn lên trên đĩa nhỏ. Chọn cọc đích khác nhé.');
        else if (result.reason === 'empty-source') announce('Cọc này đang trống. Chọn cọc có đĩa trước.');
        selectedPeg = result.reason === 'empty-source' ? null : from;
        render(); focusPeg(from); return;
      }
      selectedPeg = null; hintStep = null;
      const v = model.view();
      if (v.status === 'won') {
        const previous = progress.bests[stageIndex];
        progress.bests[stageIndex] = previous === null ? v.moves : Math.min(previous, v.moves);
        progress.unlockedStage = Math.max(progress.unlockedStage, Math.min(stageIndex + 1, M.STAGES.length - 1));
        M.STAGES.forEach((_, i) => { stageEls[i].disabled = i > progress.unlockedStage; });
        announce(`Chặng hoàn thành trong ${v.moves} nước. Chuẩn là ${v.par}.`);
      } else {
        announce(`Đĩa ${result.disk} chuyển từ Cọc ${LETTERS[from]} sang Cọc ${LETTERS[to]}. Nước ${v.moves} trên ${v.par}.`);
      }
      render(); save(); focusPeg(to);
    }
    function choosePeg(index) {
      if (resetPending) return;
      const v = model.view();
      if (v.status === 'won') { announce('Chặng này đã hoàn thành. Chọn Chơi lại chặng để thử lần nữa.'); return; }
      if (selectedPeg === null) {
        if (!v.pegs[index].length) { announce('Cọc này đang trống. Chọn cọc có đĩa trước.'); return; }
        selectedPeg = index; hintStep = null;
        announce(`Đã chọn đĩa ${v.pegs[index].at(-1)} ở Cọc ${LETTERS[index]}. Chọn cọc đích.`);
        render(); return;
      }
      if (selectedPeg === index) {
        selectedPeg = null; hintStep = null; render(); announce('Đã bỏ chọn cọc xuất phát.'); return;
      }
      makeMove(selectedPeg, index);
    }
    function render() {
      const v = model.view();
      el('tbStageName').textContent = `${stageIndex + 1} / ${M.STAGES.length} · ${v.stage.name}`;
      el('tbDiskCount').textContent = `${v.stage.disks} đĩa`;
      el('tbMoveCount').textContent = `${v.moves} / ${v.par}`;
      el('tbMoveDelta').textContent = v.moves <= v.par ? 'Trong chuẩn' : `+${v.moves - v.par} so với chuẩn`;
      el('tbBest').textContent = progress.bests[stageIndex] === null ? 'Chưa có' : `${progress.bests[stageIndex]} nước`;
      stageEls.forEach((button, i) => {
        button.setAttribute('aria-current', i === stageIndex ? 'step' : 'false');
        button.textContent = i < progress.unlockedStage ? `${i + 1} ✓` : String(i + 1);
        button.disabled = i > progress.unlockedStage;
      });
      pegEls.forEach((button, i) => {
        const disks = v.pegs[i];
        const stack = el(`tbStack${i}`);
        stack.innerHTML = disks.map(disk => `<i class="tb-disk tb-disk-${disk}"></i>`).join('');
        button.classList.toggle('tb-selected', selectedPeg === i);
        button.classList.toggle('tb-hint-source', hintStep?.from === i);
        button.classList.toggle('tb-hint-target', hintStep?.to === i);
        button.setAttribute('aria-pressed', selectedPeg === i ? 'true' : 'false');
        const top = disks.at(-1);
        button.setAttribute('aria-label', `Cọc ${LETTERS[i]}, ${disks.length} ${disks.length === 1 ? 'đĩa' : 'đĩa'}${top ? `. Đĩa trên cùng ${top}` : ''}${selectedPeg === i ? '. Đang chọn làm cọc xuất phát' : ''}${v.status === 'won' ? '. Chặng đã hoàn thành' : ''}`);
      });
      el('tbUndo').disabled = v.undoDepth === 0 || resetPending;
      el('tbHint').disabled = v.status === 'won' || resetPending;
      el('tbReset').disabled = resetPending;
      el('tbNext').hidden = v.status !== 'won' || stageIndex >= M.STAGES.length - 1;
      el('tbReplay').hidden = v.status !== 'won';
      const complete = v.status === 'won' && progress.bests.every(best => best !== null);
      el('tbComplete').hidden = !complete;
      el('tbComplete').textContent = complete ? 'Bạn đã hoàn thành cả bốn chặng. Mỗi chặng đều có thể chơi lại.' : '';
      const h = hintStep ? `Gợi ý: chuyển đĩa ${hintStep.disk} từ Cọc ${LETTERS[hintStep.from]} sang Cọc ${LETTERS[hintStep.to]}.` : '';
      el('tbHintText').textContent = h;
    }

    stageEls.forEach((button, i) => listen(button, 'click', () => setStage(i)));
    pegEls.forEach((button, i) => {
      listen(button, 'click', () => choosePeg(i));
      listen(button, 'keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : Math.max(0, Math.min(2, i + (event.key === 'ArrowLeft' ? -1 : 1)));
          focusPeg(next);
        } else if (!event.repeat && (event.key.toLowerCase() === 'u')) {
          event.preventDefault(); el('tbUndo').click();
        } else if (!event.repeat && event.key.toLowerCase() === 'h') {
          event.preventDefault(); el('tbHint').click();
        } else if (event.key === 'Escape' && selectedPeg !== null) {
          selectedPeg = null; hintStep = null; render(); announce('Đã bỏ chọn cọc xuất phát.');
        }
      });
    });
    listen(el('tbUndo'), 'click', () => {
      if (model.undo()) { selectedPeg = null; hintStep = null; render(); save(); announce(`Đã hoàn tác. Nước đi hiện tại: ${model.view().moves}.`); focusPeg(0); }
    });
    listen(el('tbHint'), 'click', () => {
      selectedPeg = null;
      hintStep = model.hint();
      render();
      announce(hintStep ? `Gợi ý: chuyển đĩa ${hintStep.disk} từ Cọc ${LETTERS[hintStep.from]} sang Cọc ${LETTERS[hintStep.to]}.` : 'Không còn nước gợi ý.');
    });
    listen(el('tbReset'), 'click', () => {
      if (model.view().moves > 0 && model.view().status === 'playing') {
        resetPending = true; selectedPeg = null; hintStep = null;
        el('tbResetConfirm').hidden = false; render(); el('tbResetYes').focus();
      } else restart();
    });
    listen(el('tbResetYes'), 'click', restart);
    listen(el('tbResetNo'), 'click', () => {
      resetPending = false; el('tbResetConfirm').hidden = true; render(); announce('Tiếp tục chặng hiện tại.'); focusPeg(0);
    });
    listen(el('tbNext'), 'click', () => setStage(stageIndex + 1));
    listen(el('tbReplay'), 'click', restart);
    onCleanup(() => { save(); alive = false; });
    render();
    el('tbStorageNote').textContent = storageNote;
    el('tbStorageNote').hidden = !storageNote;
    save();
  }

  root.NP_ThapBaCoc = { SAVE_KEY, RECOVERY_KEY, validCampaign, mount };
})(typeof window === 'object' ? window : globalThis);

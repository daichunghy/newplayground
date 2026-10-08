/* Original Nối Hình campaign interface. */
(function () {
  'use strict';

  const GLYPHS = [
    '<path d="M24 5C19 14 11 20 11 29a13 13 0 0 0 26 0C37 20 29 14 24 5Z"/><path d="M19 30c1 4 4 6 8 7" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2.5"/>',
    '<path d="M24 40V20M24 28c-7 0-12-4-13-11 7 0 12 3 13 9M24 33c7 0 12-4 13-11-7 0-12 3-13 9"/><path d="M19 40h10" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2"/>',
    '<circle cx="24" cy="24" r="8"/><path d="M24 5v6m0 26v6M5 24h6m26 0h6M10.5 10.5l4.3 4.3m18.4 18.4 4.3 4.3m0-27-4.3 4.3m-18.4 18.4-4.3-4.3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>',
    '<path d="M7 19c5-6 10 6 17 0s12 6 17 0M7 29c5-6 10 6 17 0s12 6 17 0M10 38h28" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>',
    '<path d="M24 9c2.8 0 4.6 5.7 6.9 7.1 2.4 1.5 8.3.3 9.7 2.7 1.4 2.4-2.5 6.7-2.5 9.5s3.9 7.1 2.5 9.5c-1.4 2.4-7.3 1.2-9.7 2.7C28.6 42 26.8 47.7 24 47.7s-4.6-5.7-6.9-7.1c-2.4-1.5-8.3-.3-9.7-2.7-1.4-2.4 2.5-6.7 2.5-9.5s-3.9-7.1-2.5-9.5c1.4-2.4 7.3-1.2 9.7-2.7C19.4 14.7 21.2 9 24 9Z" transform="translate(0 -4) scale(.92)"/><circle cx="24" cy="24" r="4" fill="#fff"/>',
    '<path d="M35 10c-4-3-12-2-17 2-8 6-8 17-2 23 6 7 17 6 23 0-8 2-16-4-16-12 0-6 5-11 12-13Z"/><circle cx="18" cy="32" r="2" fill="#fff"/>',
    '<path d="m5 39 12-17 7 9 7-14 12 22H5Z"/><path d="m14 39 5-7 5 7m4 0 5-9 6 9" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>',
    '<path d="M8 30c0-8 7-14 16-14 8 0 12 5 14 10 5 1 7 5 6 9-1 4-4 6-9 6H17C11 41 8 37 8 30Z"/><path d="M15 31h.1m9-5h.1m9 7h.1" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="3"/>',
    '<path d="M24 5 43 22 27 43 5 31l19-26Z"/><path d="m24 5 3 38M5 31l38-9" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2.3"/><path d="m27 43 4 3" fill="none" stroke="currentColor" stroke-width="2"/>',
    '<path d="M24 5c11 0 19 8 19 19 0 12-9 20-20 20C13 44 5 36 5 26 5 15 13 7 23 7c8 0 14 6 14 13 0 7-5 12-11 12-5 0-9-4-9-8 0-4 3-7 7-7 3 0 5 2 5 5 0 2-1 3-3 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>',
    '<path d="M39 8C25 8 13 13 10 25c-2 8 3 15 11 15 12 0 17-14 18-32Z"/><path d="M12 37c7-8 14-13 23-20" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2.5"/>',
    '<path d="M25 4c2 10-7 12-7 20-5-2-7-6-6-11-8 8-9 18-4 26 7 11 25 10 30 0 6-12-5-23-13-35Z"/><path d="M24 25c-5 5-6 8-4 12 2 4 8 4 10 0 2-4-1-8-6-12Z" fill="#fff"/>'
  ];
  const SAVE_KEY = 'np_noihinh_campaign_v3';
  const RECOVERY_KEY = `${SAVE_KEY}_recovery`;
  const DEFAULT_CAMPAIGN_SEED = 0x4e6f6948;

  function mount(container, session, audio = null) {
    const M = window.NP_NoiHinhModel;
    if (!M) throw new Error('Nối Hình rules are not ready');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Nối Hình needs a game session');
    }

    const { listen, onCleanup, setTimeout: schedule, clearTimeout: cancel } = session;
    let rawSave = null;
    let storageWritable = true;
    let storageNotice = '';
    let savedProgress = null;
    try {
      rawSave = window.localStorage?.getItem(SAVE_KEY) ?? null;
      if (rawSave) {
        let parsed = null;
        try { parsed = JSON.parse(rawSave); } catch (_) { /* recover below */ }
        if (M.validProgress(parsed)) savedProgress = parsed;
        else if (parsed && Number.isInteger(parsed.version) && parsed.version > M.PROGRESS_VERSION) {
          storageWritable = false;
          storageNotice = 'Bản lưu mới hơn đang được giữ nguyên.';
        } else {
          storageNotice = 'Bản lưu lỗi đã được giữ. Đang bắt đầu mới.';
          try {
            const prior = window.localStorage.getItem(RECOVERY_KEY);
            if (prior && prior !== rawSave) storageWritable = false;
            else if (!prior) window.localStorage.setItem(RECOVERY_KEY, rawSave);
          } catch (_) { storageWritable = false; }
        }
      }
    } catch (_) {
      storageWritable = false;
      storageNotice = 'Không đọc được bộ nhớ. Ván này vẫn chơi được.';
    }

    let progress = savedProgress || {
      version: M.PROGRESS_VERSION,
      campaignSeed: DEFAULT_CAMPAIGN_SEED,
      unlockedStage: 1,
      activeStage: 1,
      dealNumbers: Array(M.CAMPAIGN.length).fill(0),
      game: null
    };
    let model = savedProgress ? M.restore(savedProgress.game) : null;
    if (!model) {
      progress = { ...progress, activeStage: 1, game: null };
      model = M.create({ stage: 1, seed: M.seedForStage(progress.campaignSeed, 1, progress.dealNumbers[0]), dealIndex: progress.dealNumbers[0] });
    }
    let alive = true;
    let paused = false;
    let confirming = false;
    let pausedBeforeConfirm = false;
    let pendingStage = null;
    let confirmTitle = 'Bàn mới?';
    let focusIndex = 0;
    let lastPath = null;
    let pathTimer = null;
    let lastRender = '';
    let cells = [];
    container.classList.add('nh-host');

    container.innerHTML = `
      <section class="nh-game" aria-label="Nối Hình">
        <header class="nh-header"><h3>Nối Hình</h3><div class="nh-stage-picker"><label class="np-game-sr" for="nhStage">Màn</label><select class="nh-button" id="nhStage" aria-label="Chọn màn"></select></div><div class="nh-toolbar" aria-label="Điều khiển">
          <button class="nh-button" id="nhUndo" type="button" aria-label="Hoàn tác cặp gần nhất" title="Hoàn tác">↶</button>
          <button class="nh-button" id="nhPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
          <button class="nh-button" id="nhNew" type="button" aria-label="Tạo hoặc chơi lại bàn" title="Bàn mới">↻</button>
        </div></header>
        <div class="nh-hud"><div><span>Đã nối</span><strong id="nhPairs"></strong></div><div><span>Nước</span><strong id="nhMoves">0</strong></div></div>
        <div class="nh-board-wrap" id="nhBoardWrap">
          <svg class="nh-path-layer" id="nhPathLayer" viewBox="0 0 7 6" preserveAspectRatio="none" aria-hidden="true"><polyline id="nhPath" points=""></polyline></svg>
          <div class="nh-board" id="nhBoard" role="group" aria-label="Bàn Nối Hình"></div>
        </div>
        <p class="np-game-sr" id="nhStatus" role="status" aria-live="polite" aria-atomic="true">Chọn hai hình giống nhau. Đường đi rẽ tối đa hai lần.</p>
        <p class="nh-storage-note" id="nhStorageNote" hidden></p>
        <details class="nh-help"><summary aria-label="Cách chơi">?</summary><p>Chọn hai hình giống nhau. Chỉ nối qua ô trống theo đường ngang, dọc; đường được rẽ tối đa hai lần và có thể vòng một ô ngoài mép bàn.</p></details>
        <div class="nh-overlay" id="nhOverlay" hidden><div class="nh-overlay-card">
          <strong id="nhOverlayTitle"></strong><p id="nhOverlayText"></p>
          <div class="nh-confirm" id="nhConfirm" hidden role="group" aria-label="Xác nhận đổi bàn"><span id="nhConfirmText"></span><button class="nh-button nh-primary" id="nhYes" type="button">Chơi lại</button><button class="nh-button" id="nhFresh" type="button">Bàn mới</button><button class="nh-button" id="nhNo" type="button">Ở lại</button></div>
          <div class="nh-overlay-actions"><button class="nh-button nh-primary" id="nhContinue" type="button">Tiếp tục</button><button class="nh-button" id="nhOverlayUndo" type="button">Hoàn tác</button><button class="nh-button" id="nhReshuffle" type="button">Đổi vị trí</button></div>
        </div></div>
      </section>`;

    const el = id => container.querySelector(`#${id}`);
    const icons = M.ICONS;

    function announce(text) { el('nhStatus').textContent = text; }

    function sound(kind) {
      if (window.NEWPLAYGROUND_MUTED === true || window.NP_Audio?.isMuted) return;
      try {
        if (kind === 'match') audio?.playTone?.(560, 'sine', 0.06, 0.02);
        else if (kind === 'undo' || kind === 'reshuffle') audio?.playTone?.(360, 'triangle', 0.07, 0.018);
      } catch (_) { /* audio is optional */ }
    }

    function persist() {
      if (!alive || !storageWritable) return;
      progress = { ...progress, activeStage: model.view().stage, game: model.serialize() };
      try {
        if (window.localStorage.getItem(SAVE_KEY) !== rawSave) {
          storageWritable = false;
          storageNotice = 'Bản lưu đã đổi ở tab khác; ván này không ghi đè.';
          updateStorageNotice();
          return;
        }
        rawSave = JSON.stringify(progress);
        window.localStorage.setItem(SAVE_KEY, rawSave);
      } catch (_) {
        storageWritable = false;
        storageNotice = 'Không lưu được. Ván này vẫn chơi được.';
        updateStorageNotice();
      }
    }

    function updateStorageNotice() {
      el('nhStorageNote').hidden = !storageNotice;
      el('nhStorageNote').textContent = storageNotice;
    }

    function renderStagePicker(view) {
      const select = el('nhStage');
      select.innerHTML = M.CAMPAIGN.map(stage => `<option value="${stage.stage}"${stage.stage > progress.unlockedStage ? ' disabled' : ''}>${stage.stage}. ${stage.name}</option>`).join('');
      select.value = String(view.stage);
      select.setAttribute('aria-label', `Màn ${view.stage} trên ${view.stageCount}`);
    }

    function renderBoard(view) {
      const wrap = el('nhBoardWrap');
      const board = el('nhBoard');
      wrap.style.setProperty('grid-template-columns', `repeat(${view.cols + 2},minmax(0,1fr))`);
      wrap.style.setProperty('grid-template-rows', `repeat(${view.rows + 2},minmax(0,1fr))`);
      wrap.style.setProperty('aspect-ratio', `${view.cols + 2}/${view.rows + 2}`);
      board.style.setProperty('grid-column', `2/${view.cols + 2}`);
      board.style.setProperty('grid-row', `2/${view.rows + 2}`);
      board.style.setProperty('grid-template-columns', `repeat(${view.cols},minmax(0,1fr))`);
      board.style.setProperty('grid-template-rows', `repeat(${view.rows},minmax(0,1fr))`);
      board.setAttribute('aria-label', `Bàn ${view.stageName}, ${view.rows} hàng, ${view.cols} cột`);
      el('nhPathLayer').setAttribute('viewBox', `0 0 ${view.cols + 2} ${view.rows + 2}`);
      board.innerHTML = Array.from({ length: view.cells }, (_, index) =>
        `<button class="nh-tile" type="button" data-index="${index}" tabindex="-1" aria-pressed="false"></button>`
      ).join('');
      cells = container.querySelectorAll('.nh-tile');
    }

    function drain() {
      for (const event of model.drain()) {
        sound(event.kind);
        if (event.kind === 'select') announce(`Đã chọn ${icons[event.symbol].name}. Chọn hình giống nó.`);
        else if (event.kind === 'blocked') announce('Đường nối bị chắn hoặc cần quá hai lần rẽ.');
        else if (event.kind === 'match') {
          if (pathTimer !== null) cancel(pathTimer);
          lastPath = event.path;
          pathTimer = schedule(() => { pathTimer = null; lastPath = null; update(); }, 240);
          announce(`Đã nối cặp ${event.cleared}.`);
        } else if (event.kind === 'stuck') announce('Hết nước nối. Hoàn tác hoặc đổi vị trí các hình.');
        else if (event.kind === 'reshuffle') announce(`Đã đổi vị trí ${event.count} cặp.`);
        else if (event.kind === 'won') announce('Đã nối hết các hình!');
        else if (event.kind === 'undo') announce('Đã hoàn tác cặp gần nhất.');
      }
    }

    function resetTransient() {
      paused = false;
      confirming = false;
      pendingStage = null;
      lastPath = null;
      if (pathTimer !== null) cancel(pathTimer);
      pathTimer = null;
      lastRender = '';
      focusIndex = model.view().board.findIndex(value => value !== null);
    }

    function startStage(stage, fresh = false) {
      if (stage < 1 || stage > progress.unlockedStage) return false;
      if (fresh) progress.dealNumbers[stage - 1]++;
      model = M.create({ stage, seed: M.seedForStage(progress.campaignSeed, stage, progress.dealNumbers[stage - 1]),
        dealIndex: progress.dealNumbers[stage - 1] });
      progress = { ...progress, activeStage: stage };
      resetTransient();
      update();
      persist();
      announce(`Màn ${stage}: ${model.view().stageName}.`);
      cells[focusIndex]?.focus({ preventScroll: true });
      return true;
    }

    function input(index) {
      if (!alive || paused || confirming) return false;
      const changed = model.tap(index);
      drain();
      const view = model.view();
      if (view.status === 'won' && view.stage < M.CAMPAIGN.length) {
        progress = { ...progress, unlockedStage: Math.max(progress.unlockedStage, view.stage + 1) };
      }
      if (view.status === 'playing' && view.board[focusIndex] === null) focusIndex = view.board.findIndex(symbol => symbol !== null);
      update();
      if (changed) persist();
      if (view.status === 'stuck') el('nhReshuffle').focus();
      else if (view.status === 'won') el('nhContinue').focus();
      else if (view.board[focusIndex] !== null) cells[focusIndex]?.focus({ preventScroll: true });
      return changed;
    }

    function pause(message = 'Đã tạm dừng.') {
      if (!alive || model.view().status !== 'playing' || confirming) return;
      paused = true;
      update();
      announce(message);
      el('nhContinue').focus();
    }

    function resume() {
      if (!alive || confirming || model.view().status !== 'playing') return;
      paused = false;
      update();
      announce('Tiếp tục.');
      cells[focusIndex]?.focus();
    }

    function retryCurrent() {
      const stage = model.view().stage;
      model = M.create({ stage, seed: model.view().dealSeed, dealIndex: model.view().dealIndex });
      resetTransient();
      update();
      persist();
      announce(`Màn ${stage}: ${model.view().stageName}.`);
      cells[focusIndex]?.focus({ preventScroll: true });
      return true;
    }

    function requestNew() {
      if (confirming) return;
      pendingStage = null;
      pausedBeforeConfirm = paused;
      paused = true;
      confirming = true;
      confirmTitle = 'Bàn mới?';
      update();
      el('nhConfirmText').textContent = 'Chơi lại bàn này hay tạo bàn mới?';
      el('nhYes').textContent = 'Chơi lại';
      el('nhFresh').hidden = false;
      el('nhYes').focus();
    }

    function requestStage(stage) {
      if (stage < 1 || stage > progress.unlockedStage || stage === model.view().stage) return;
      if (model.view().moves > 0) {
        pendingStage = stage;
        pausedBeforeConfirm = paused;
        paused = true;
        confirming = true;
        confirmTitle = 'Đổi màn?';
        update();
        el('nhConfirmText').textContent = `Mở lại màn ${stage}?`;
        el('nhYes').textContent = 'Mở màn';
        el('nhFresh').hidden = true;
        el('nhYes').focus();
      } else startStage(stage, true);
    }

    function doUndo() {
      if (!alive || confirming || !model.undo()) return;
      paused = false;
      lastPath = null;
      if (pathTimer !== null) cancel(pathTimer);
      pathTimer = null;
      lastRender = '';
      drain();
      update();
      persist();
      cells[focusIndex]?.focus();
    }

    function doReshuffle() {
      if (!alive || confirming || !model.reshuffle()) return false;
      paused = false;
      lastPath = null;
      if (pathTimer !== null) cancel(pathTimer);
      pathTimer = null;
      lastRender = '';
      drain();
      focusIndex = model.view().board.findIndex(value => value !== null);
      update();
      persist();
      cells[focusIndex]?.focus();
      return true;
    }

    function continueCampaign() {
      const view = model.view();
      if (view.status === 'won' && view.stage < M.CAMPAIGN.length) {
        progress = { ...progress, unlockedStage: Math.max(progress.unlockedStage, view.stage + 1) };
        const next = view.stage + 1;
        startStage(next, progress.dealNumbers[next - 1] > 0);
      } else if (view.status === 'won') startStage(view.stage, true);
      else if (view.status === 'stuck') doUndo();
      else resume();
    }

    function update() {
      if (!alive) return;
      const view = model.view();
      const terminal = view.status !== 'playing';
      const pathStamp = lastPath ? lastPath.map(point => `${point.r},${point.c}`).join(';') : '';
      const stamp = [view.stage, view.status, view.moves, view.selected, paused, confirming, progress.unlockedStage, pathStamp].join('|');
      if (stamp !== lastRender) {
        lastRender = stamp;
        renderStagePicker(view);
        renderBoard(view);
        el('nhPairs').textContent = `${view.cleared} / ${view.pairCount}`;
        el('nhMoves').textContent = String(view.moves);
        el('nhPause').disabled = terminal || confirming;
        el('nhPause').textContent = paused && !terminal ? '▶' : 'Ⅱ';
        el('nhPause').setAttribute('aria-label', paused && !terminal ? 'Tiếp tục' : 'Tạm dừng');
        el('nhUndo').disabled = view.moves === 0 || confirming;
        el('nhOverlay').hidden = !(paused || terminal || confirming);
        el('nhConfirm').hidden = !confirming;
        el('nhContinue').hidden = confirming || view.status === 'stuck';
        el('nhOverlayUndo').hidden = confirming || view.status !== 'stuck' || view.moves === 0;
        el('nhReshuffle').hidden = confirming || view.status !== 'stuck';
        el('nhOverlayTitle').textContent = confirming ? confirmTitle : paused ? 'Tạm dừng' : view.status === 'stuck' ? 'Hết nước nối' : view.status === 'won' ? 'Bạn đã nối hết hình!' : '';
        el('nhOverlayText').textContent = confirming ? '' : view.status === 'stuck' ? 'Đổi vị trí để tiếp tục hoặc hoàn tác.' : view.status === 'won' ? `${view.cleared} cặp đã nối.` : paused ? 'Bàn đang được giữ nguyên.' : '';
        el('nhContinue').textContent = view.status === 'won' ? (view.stage < M.CAMPAIGN.length ? `Màn ${view.stage + 1}` : 'Bàn mới') : 'Tiếp tục';
      }
      for (let i = 0; i < cells.length; i++) {
        const tile = cells[i];
        const symbol = view.board[i];
        const active = view.active[i];
        const selected = view.selected === i;
        tile.disabled = !active || symbol === null || paused || confirming || view.status !== 'playing';
        tile.classList.toggle('nh-selected', selected);
        tile.classList.toggle('nh-void', !active);
        tile.setAttribute('aria-pressed', String(selected));
        tile.setAttribute('tabindex', active && i === focusIndex ? '0' : '-1');
        if (!active) {
          tile.innerHTML = '';
          tile.setAttribute('aria-label', `Ngoài bàn, hàng ${Math.floor(i / view.cols) + 1}, cột ${i % view.cols + 1}`);
          tile.classList.remove('nh-empty');
        } else if (symbol === null) {
          tile.innerHTML = '';
          tile.setAttribute('aria-label', `Hàng ${Math.floor(i / view.cols) + 1}, cột ${i % view.cols + 1}, ô trống`);
          tile.classList.add('nh-empty');
        } else {
          tile.innerHTML = `<svg class="nh-glyph" viewBox="0 0 48 48" aria-hidden="true">${GLYPHS[symbol]}</svg>`;
          tile.setAttribute('aria-label', `Hàng ${Math.floor(i / view.cols) + 1}, cột ${i % view.cols + 1}, ${icons[symbol].name}${selected ? ', đang chọn' : ''}`);
          tile.classList.remove('nh-empty');
          tile.style.setProperty('--nh-color', icons[symbol].color);
        }
      }
      updateStorageNotice();
      if (lastPath) {
        const points = lastPath.map(({ r, c }) => `${c + 1.5},${r + 1.5}`).join(' ');
        el('nhPath').setAttribute('points', points);
        el('nhPathLayer').classList.add('nh-path-visible');
      } else {
        el('nhPath').setAttribute('points', '');
        el('nhPathLayer').classList.remove('nh-path-visible');
      }
    }

    function moveFocus(index, key) {
      const view = model.view();
      const row = Math.floor(index / view.cols);
      const col = index % view.cols;
      const delta = key === 'ArrowLeft' ? [0, -1] : key === 'ArrowRight' ? [0, 1] :
        key === 'ArrowUp' ? [-1, 0] : [1, 0];
      let nextRow = row + delta[0];
      let nextCol = col + delta[1];
      while (nextRow >= 0 && nextRow < view.rows && nextCol >= 0 && nextCol < view.cols &&
        (!view.active[nextRow * view.cols + nextCol] || view.board[nextRow * view.cols + nextCol] === null)) {
        nextRow += delta[0];
        nextCol += delta[1];
      }
      if (nextRow < 0 || nextRow >= view.rows || nextCol < 0 || nextCol >= view.cols) return;
      focusIndex = nextRow * view.cols + nextCol;
      update();
      cells[focusIndex]?.focus();
    }

    listen(container, 'click', event => {
      const tile = event.target?.closest?.('.nh-tile') || (event.target?.dataset?.index !== undefined ? event.target : null);
      const index = tile?.dataset?.index;
      if (index === undefined) return;
      focusIndex = Number(index);
      input(focusIndex);
    });
    listen(el('nhStage'), 'change', event => requestStage(Number(event.target.value)));
    listen(el('nhNew'), 'click', requestNew);
    listen(el('nhPause'), 'click', () => paused ? resume() : pause());
    listen(el('nhUndo'), 'click', doUndo);
    listen(el('nhYes'), 'click', () => pendingStage ? startStage(pendingStage, true) : retryCurrent());
    listen(el('nhFresh'), 'click', () => startStage(pendingStage || model.view().stage, true));
    listen(el('nhNo'), 'click', () => {
      if (!confirming) return;
      confirming = false;
      pendingStage = null;
      paused = pausedBeforeConfirm;
      update();
      if (paused) el('nhContinue').focus();
      else cells[focusIndex]?.focus();
    });
    listen(el('nhOverlayUndo'), 'click', doUndo);
    listen(el('nhReshuffle'), 'click', doReshuffle);
    listen(el('nhContinue'), 'click', continueCampaign);
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const hasCell = event.target?.dataset?.index !== undefined;
      if (hasCell && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        moveFocus(Number(event.target.dataset.index), event.key);
      } else if (hasCell && event.key === 'Escape' && model.view().selected !== null) {
        event.preventDefault();
        model.deselect();
        drain();
        update();
        persist();
      } else if (!hasCell && event.target?.tagName !== 'BUTTON' && event.target?.tagName !== 'SELECT' && String(event.key).toLowerCase() === 'p') {
        event.preventDefault();
        paused ? resume() : pause();
      }
    });
    listen(window, 'blur', () => pause('Đã tạm dừng khi mất tiêu điểm.'));
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Đã tạm dừng khi chuyển tab.'); });
    listen(window, 'pagehide', () => pause('Đã tạm dừng khi rời trang.'));
    onCleanup(() => {
      if (pathTimer !== null) cancel(pathTimer);
      pathTimer = null;
      alive = false;
      container.classList.remove('nh-host');
      container.innerHTML = '';
    });

    update();
    cells[focusIndex]?.focus({ preventScroll: true });
    return { getModel: () => model, getProgress: () => ({ ...progress, game: model.serialize() }), isPaused: () => paused };
  }

  window.NP_NoiHinh = Object.freeze({ mount });
})();

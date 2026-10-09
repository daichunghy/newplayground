/* Project-authored falling-capsule puzzle view. */
(function (root) {
  'use strict';
  const PAINT = Object.freeze({ blue: '#6388ce', amber: '#e2ac42', rose: '#d96e7e' });

  function mount(container, session, options = {}) {
    const M = root.NP_TestTubeModel;
    const C = root.NP_TestTubeCampaign;
    if (!M) throw new Error('Ống Nghiệm rules are not ready');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Ống Nghiệm needs an active game session');
    }
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    const customScenario = Array.isArray(options.viruses) || Array.isArray(options.pairs);
    const campaign = !customScenario && C ? C.create({ storage: options.storage }) : null;
    let model = campaign ? campaign.getModel() : M.create(options);
    let alive = true;
    let frame = null;
    let previous = null;
    container.classList.add('tt-host');
    container.innerHTML = `
      <section class="tt-game" aria-label="Ống Nghiệm" tabindex="0">
        <header class="tt-header"><div><p class="tt-kicker">GHÉP 4 · RƠI TỰ DO</p><h2>Ống Nghiệm</h2></div><div class="tt-actions"><button id="ttRestart" class="tt-button" type="button">Chơi lại</button></div></header>
        <div class="tt-panel"><p id="ttStatus" role="status" aria-live="polite" aria-atomic="true">Dọn hết mầm khuẩn.</p><strong id="ttCount"></strong></div>
        <div id="ttBottles" class="tt-bottles" role="group" aria-label="Chọn chai"></div>
        <p id="ttBeat" class="tt-beat" hidden></p><p id="ttSaveNote" class="tt-save-note" hidden role="status"></p>
        <svg id="ttBoard" class="tt-board" viewBox="0 0 360 600" role="img" tabindex="0" aria-label="Ống nghiệm 8 cột. Ghép bốn màu giống nhau để dọn mầm khuẩn.">
          <rect x="18" y="14" width="220" height="568" rx="17" fill="#f9fbfc" stroke="#8092a6" stroke-width="3"/>
          <g id="ttCells"></g><g id="ttActive"></g>
          <text x="275" y="76" class="tt-label">TIẾP</text><g id="ttPreview"></g>
          <text x="275" y="178" class="tt-label">ỐNG</text><text id="ttViruses" x="275" y="212" class="tt-number"></text>
          <path d="M255 242h78" stroke="#c7d1da" stroke-width="2"/>
          <text x="275" y="279" class="tt-label">CẶP ĐÃ ĐẶT</text><text id="ttCapsules" x="275" y="312" class="tt-number"></text>
        </svg>
        <div class="tt-controls">
          <div class="tt-pad" aria-label="Di chuyển và xoay viên nang">
            <button id="ttLeft" class="tt-button" type="button" aria-label="Sang trái">←</button>
            <button id="ttRotate" class="tt-button" type="button" aria-label="Xoay viên">↻</button>
            <button id="ttRight" class="tt-button" type="button" aria-label="Sang phải">→</button>
            <button id="ttDown" class="tt-button" type="button" aria-label="Rơi nhanh">↓</button>
          </div>
          <button id="ttDrop" class="tt-button tt-primary" type="button">Thả</button>
        </div>
        <p class="tt-footer">← → di chuyển · ↑ xoay · Space thả nhanh</p>
      </section>`;
    const el = id => container.querySelector(`#${id}`);
    function textFor(view, route) {
      if (view.status === 'won') return route
        ? route.selectedBottle === route.count ? 'Bốn chai đã sạch! Combo tự dọn hai hàng.' : `Chai ${route.selectedBottle} sạch rồi! Đã mở chai ${route.unlockedBottle}.`
        : 'Sạch ống rồi!';
      if (view.status === 'lost') return 'Ống đầy. Chơi lại nhé.';
      if (route?.stage.id === 'combo' && view.lastResolution?.cascades > 1) return 'Combo tự dọn thêm một hàng!';
      if (route?.stage.id === 'roi' && view.lastEvent === 'clear-virus') return 'Một nửa đã rơi xuống.';
      if (view.lastEvent === 'clear-virus') return 'Dọn được mầm khuẩn!';
      if (view.lastEvent === 'clear-capsule') return 'Viên nang đã xóa.';
      return 'Dọn hết mầm khuẩn.';
    }
    function pieceMarkup(cell, x, y, size, kind) {
      const color = PAINT[cell.color];
      if (kind === 'virus') {
        return `<g aria-label="Mầm khuẩn ${M.LABELS[cell.color]}"><circle cx="${x}" cy="${y}" r="${size / 2 - 2}" fill="${color}" stroke="#fff" stroke-width="2"/><path d="M${x - 5} ${y - 3}q5-5 10 0M${x - 5} ${y + 3}q5 5 10 0" fill="none" stroke="#293951" stroke-width="2" stroke-linecap="round"/><circle cx="${x - 4}" cy="${y - 7}" r="1.5" fill="#293951"/><circle cx="${x + 4}" cy="${y - 7}" r="1.5" fill="#293951"/></g>`;
      }
      return `<g aria-label="Nửa viên ${M.LABELS[cell.color]}"><rect x="${x - size / 2 + 1}" y="${y - size / 2 + 1}" width="${size - 2}" height="${size - 2}" rx="7" fill="${color}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y + 6}" text-anchor="middle" fill="#25344b" font-size="17" font-weight="800">${M.MARKS[cell.color]}</text></g>`;
    }
    function render() {
      if (!alive) return;
      if (campaign) model = campaign.getModel();
      if (campaign) campaign.recordWin();
      const view = model.view();
      const route = campaign?.view() || null;
      if (route) {
        el('ttBottles').hidden = false;
        el('ttBottles').innerHTML = route.bottles.map(bottle => `<button id="ttBottle-${bottle.number}" class="tt-button tt-bottle${bottle.selected ? ' is-current' : ''}" type="button" data-bottle="${bottle.number}" aria-label="Chai ${bottle.number}: ${bottle.title}" aria-pressed="${bottle.selected}" ${bottle.unlocked ? '' : 'disabled'}>${bottle.number}</button>`).join('');
        el('ttBeat').hidden = false;
        el('ttBeat').textContent = `Chai ${route.selectedBottle}/${route.count} · ${route.stage.beat}`;
        el('ttSaveNote').hidden = !route.saveMessage;
        el('ttSaveNote').textContent = route.saveMessage;
      } else {
        el('ttBottles').hidden = true;
        el('ttBeat').hidden = true;
        el('ttSaveNote').hidden = true;
      }
      const cells = [];
      for (let row = 0; row < M.ROWS; row++) for (let col = 0; col < M.COLS; col++) {
        const x = 24 + col * 26;
        const y = 20 + row * 35;
        cells.push(`<rect x="${x}" y="${y}" width="26" height="35" fill="none" stroke="#dce3e8" stroke-width=".8"/>`);
        const cell = view.board[row][col];
        if (cell) cells.push(pieceMarkup(cell, x + 13, y + 17.5, 25, cell.kind));
      }
      el('ttCells').innerHTML = cells.join('');
      const activeMarkup = view.active ? [view.active.pivot, view.active.mate].map(cell => pieceMarkup(cell, 24 + cell.col * 26 + 13, 20 + cell.row * 35 + 17.5, 25, 'capsule')).join('') : '';
      el('ttActive').innerHTML = activeMarkup;
      el('ttPreview').innerHTML = view.preview ? view.preview.map((color, index) => pieceMarkup({ color }, 287 + (index ? 27 : 0), 116, 25, 'capsule')).join('') : '';
      el('ttStatus').textContent = textFor(view, route);
      el('ttCount').textContent = `${view.virusesLeft} mầm`;
      el('ttViruses').textContent = `${view.virusesLeft}`;
      el('ttCapsules').textContent = `${view.capsulesPlaced}`;
      for (const id of ['ttLeft', 'ttRotate', 'ttRight', 'ttDown', 'ttDrop']) el(id).disabled = !view.active;
      if (view.active && view.status === 'playing') schedule();
      else stopLoop();
    }
    function stopLoop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previous = null;
    }
    function schedule() {
      const view = model.view();
      if (alive && frame === null && !root.document?.hidden && view.status === 'playing' && view.active) {
        frame = requestAnimationFrame(animate);
      }
    }
    function animate(time) {
      frame = null;
      if (!alive) return;
      const delta = previous === null ? 0 : Math.max(0, Math.min(.1, (time - previous) / 1000));
      previous = time;
      if (delta) model.tick(delta);
      render();
    }
    function action(name) {
      if (name === 'left') model.move(-1);
      else if (name === 'right') model.move(1);
      else if (name === 'rotate') model.rotate();
      else if (name === 'down') model.softDrop();
      else if (name === 'drop') model.hardDrop();
      else if (name === 'restart') { if (campaign) campaign.restart(); else model.restart(); }
      if (campaign) model = campaign.getModel();
      render();
      el('ttBoard').focus?.();
    }
    listen(el('ttBottles'), 'click', event => {
      const number = Number(event.target?.dataset?.bottle);
      if (!campaign || !campaign.selectBottle(number)) return;
      model = campaign.getModel();
      render();
      el('ttBoard').focus?.();
    });
    for (const [id, name] of [['ttLeft', 'left'], ['ttRight', 'right'], ['ttRotate', 'rotate'], ['ttDown', 'down'], ['ttDrop', 'drop'], ['ttRestart', 'restart']]) {
      listen(el(id), 'click', () => action(name));
    }
    listen(container, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const actions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down', ' ': 'drop' };
      const name = actions[event.key];
      if (name) { action(name); event.preventDefault?.(); }
      else if (event.key === 'r' || event.key === 'R') { action('restart'); event.preventDefault?.(); }
    });
    listen(root, 'blur', stopLoop);
    listen(root, 'focus', schedule);
    listen(root.document, 'visibilitychange', () => {
      if (root.document.hidden) stopLoop();
      else schedule();
    });
    onCleanup(() => { alive = false; stopLoop(); container.classList.remove('tt-host'); });
    render();
    return Object.freeze({ getModel: () => model, close: stopLoop });
  }

  root.NP_TestTube = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

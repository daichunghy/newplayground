/* Original touch-first pipe-routing campaign. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_PipeRouteModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Nối Ống Nước needs its model and an active game session');
    }

    let model = M.create(), alive = true, announcement = 'Nước đang rò.';
    container.classList.add('pr-host');
    container.innerHTML = `
      <section class="pr-game" aria-label="Nối Ống Nước">
        <header class="pr-head"><div><h2>Nối Ống Nước</h2><p class="pr-cue">Chạm xoay · phím mũi tên chọn · A/D xoay</p></div>
          <div class="pr-actions"><button class="pr-button" id="prPause" type="button" aria-label="Tạm dừng">Ⅱ</button><button class="pr-button" id="prRestart" type="button" aria-label="Chơi lại màn">↻</button></div>
        </header>
        <div class="pr-hud" aria-label="Tiến độ màn"><strong id="prStage">Màn 1 / 3</strong><span id="prTimer">60 giây</span><span id="prMoves">0 lượt xoay</span><button class="pr-button pr-undo" id="prUndo" type="button" aria-label="Hoàn tác" disabled>↶</button></div>
        <div class="pr-pressure" role="progressbar" aria-label="Áp lực nước" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span id="prPressure"></span></div>
        <div class="pr-flow-labels" aria-hidden="true"><span>Vòi</span><span>Bể</span></div>
        <div class="pr-board" id="prBoard" role="grid" aria-label="Lưới ống năm nhân năm"></div>
        <p class="pr-status" id="prStatus" role="status" aria-live="polite" aria-atomic="true">${announcement}</p>
        <div class="pr-overlay" id="prOverlay" hidden role="group" aria-label="Trạng thái màn">
          <div class="pr-card"><strong id="prOverlayTitle"></strong><p id="prOverlayCopy"></p><button id="prPrimary" class="pr-button pr-primary" type="button"></button><button id="prRetry" class="pr-button pr-secondary" type="button">Thử lại</button></div>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id), board = el('prBoard'), tiles = new Map();
    let focusId = '0,0';
    const pipeShape = `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="pr-stroke" d="M50 6V50H94"/><circle class="pr-hub" cx="50" cy="50" r="9"/></svg>`;

    for (let y = 0; y < M.HEIGHT; y++) for (let x = 0; x < M.WIDTH; x++) {
      const id = `${x},${y}`, tile = root.document.createElement('button');
      tile.type = 'button'; tile.className = 'pr-tile'; tile.dataset.pipe = id; tile.dataset.x = String(x); tile.dataset.y = String(y);
      tile.tabIndex = id === focusId ? 0 : -1;
      tile.innerHTML = pipeShape + (id === '0,2' ? '<span class="pr-endpoint">Vòi</span>' : id === '4,2' ? '<span class="pr-endpoint">Bể</span>' : '');
      board.appendChild(tile); tiles.set(id, tile);
    }

    function destroy() {
      if (!alive) return;
      alive = false; container.classList.remove('pr-host'); container.innerHTML = '';
    }
    function setAnnouncement(text) { announcement = text; el('prStatus').textContent = text; }
    function describePorts(ports) {
      const dirs = ['bắc', 'đông', 'nam', 'tây'];
      return ports.map(port => dirs[port]).join(' và ');
    }
    function render() {
      if (!alive) return;
      const v = model.view(), playing = v.status === 'playing', paused = v.status === 'paused';
      el('prStage').textContent = `Màn ${v.levelNumber} / ${v.levelCount}`;
      el('prTimer').textContent = `${Math.ceil(v.timeLeft / 1000)} giây`;
      el('prMoves').textContent = `${v.moves} lượt xoay`;
      el('prUndo').disabled = !playing || !v.canUndo;
      el('prPause').disabled = v.status === 'won' || v.status === 'lost';
      el('prPause').textContent = paused ? '▶' : 'Ⅱ';
      el('prPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('prPause').textContent = paused ? '>' : '||';
      const percent = Math.max(0, v.timeLeft / v.timeLimit * 100);
      el('prPressure').style.width = `${percent}%`;
      el('prPressure').parentNode.setAttribute('aria-valuenow', String(Math.round(percent)));
      for (const pipe of v.pipes) {
        const tile = tiles.get(pipe.id), svg = tile.querySelector('svg');
        tile.querySelector('.pr-stroke').setAttribute('d', pipe.type === 'straight' ? 'M50 6V94' : 'M50 6V50H94');
        tile.disabled = !playing;
        tile.tabIndex = pipe.id === focusId ? 0 : -1;
        tile.classList.toggle('is-wet', pipe.wet);
        tile.classList.toggle('is-leak', pipe.leaking);
        tile.classList.toggle('is-source', pipe.id === '0,2');
        tile.classList.toggle('is-exit', pipe.id === '4,2');
        tile.classList.toggle('is-straight', pipe.type === 'straight');
        svg.style.transform = `rotate(${pipe.rotation * 90}deg)`;
        tile.setAttribute('aria-label', `${pipe.id === '0,2' ? 'Vòi nước, ' : pipe.id === '4,2' ? 'Bể nhận nước, ' : ''}hàng ${pipe.y + 1}, cột ${pipe.x + 1}: ống ${pipe.type === 'straight' ? 'thẳng' : 'gấp khúc'}, nối ${describePorts(pipe.ports)}${pipe.wet ? ', có nước' : ''}${pipe.leaking ? ', điểm rò' : ''}. Chạm để xoay theo chiều kim đồng hồ.`);
      }
      const overlay = el('prOverlay'); overlay.hidden = playing;
      if (paused) {
        el('prOverlayTitle').textContent = 'Đã tạm dừng';
        el('prOverlayCopy').textContent = `${v.levelNumber} / ${v.levelCount} · ${Math.ceil(v.timeLeft / 1000)} giây còn lại`;
        el('prPrimary').textContent = 'Tiếp tục'; el('prRetry').hidden = false;
      } else if (v.status === 'won') {
        el('prOverlayTitle').textContent = 'Nước tới bể!';
        el('prOverlayCopy').textContent = `Màn ${v.levelNumber} · ${v.moves} lượt xoay`;
        el('prPrimary').textContent = v.levelNumber === v.levelCount ? 'Chơi ván mới' : 'Màn tiếp →'; el('prRetry').hidden = true;
      } else {
        el('prOverlayTitle').textContent = 'Bể cạn áp lực';
        el('prOverlayCopy').textContent = 'Nối lại đường ống, thử nhanh hơn.';
        el('prPrimary').textContent = 'Thử lại màn'; el('prRetry').hidden = true;
      }
      el('prStatus').textContent = announcement;
    }
    function rotate(id, direction = 1) {
      const before = model.view().status, result = model.rotate(id, direction);
      if (!result.accepted) return;
      focusId = id;
      setAnnouncement(result.status === 'won' ? 'Nước đã tới bể.' : result.flow === 'connected' ? 'Đường ống kín.' : result.flow === 'loop' ? 'Nước quay vòng.' : 'Nước đang rò.');
      render();
      if (before === 'playing' && result.status === 'won') el('prPrimary').focus();
    }
    function restart() { model.restart(); setAnnouncement('Màn đã lặp lại.'); render(); }

    for (const [id, tile] of tiles) {
      session.listen(tile, 'focus', () => { focusId = id; for (const [tileId, node] of tiles) node.tabIndex = tileId === focusId ? 0 : -1; });
      session.listen(tile, 'click', () => rotate(id, 1));
    }
    session.listen(el('prUndo'), 'click', () => { if (model.undo()) { setAnnouncement('Đã hoàn tác.'); render(); } });
    session.listen(el('prPause'), 'click', () => {
      if (model.pause()) { setAnnouncement('Đã tạm dừng.'); render(); el('prPrimary').focus(); }
      else if (model.resume()) { setAnnouncement('Tiếp tục.'); render(); }
    });
    session.listen(el('prRestart'), 'click', restart);
    session.listen(el('prRetry'), 'click', restart);
    session.listen(el('prPrimary'), 'click', () => {
      const v = model.view();
      if (v.status === 'paused') { model.resume(); setAnnouncement('Tiếp tục.'); render(); tiles.get(focusId).focus(); }
      else if (v.status === 'won' && v.level < v.levelCount - 1) { model.nextLevel(); focusId = '0,0'; setAnnouncement('Màn mới.'); render(); }
      else if (v.status === 'won') { model.newGame(); focusId = '0,0'; setAnnouncement('Ván mới.'); render(); }
      else restart();
    });
    session.listen(root.document, 'keydown', event => {
      const id = event.target?.dataset?.pipe;
      if (!id || !tiles.has(id) || event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === 'a') { event.preventDefault(); rotate(id, -1); }
      else if (key === 'd') { event.preventDefault(); rotate(id, 1); }
      else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
        event.preventDefault(); const pipe = model.view().pipes.find(item => item.id === id);
        const dx = key === 'arrowleft' ? -1 : key === 'arrowright' ? 1 : 0;
        const dy = key === 'arrowup' ? -1 : key === 'arrowdown' ? 1 : 0;
        const next = tiles.get(`${pipe.x + dx},${pipe.y + dy}`); if (next) next.focus();
      }
    });
    session.setInterval(() => {
      if (model.advance(1000)) {
        const v = model.view();
        setAnnouncement(v.status === 'lost' ? 'Áp lực nước đã cạn.' : v.flow === 'loop' ? 'Nước đang quay vòng.' : v.leaking ? 'Nước đang rò.' : 'Đường ống kín.');
        render();
        if (v.status === 'lost') el('prPrimary').focus();
      }
    }, 1000);
    const interrupt = () => { if (model.pause()) { setAnnouncement('Đã tạm dừng khi rời màn.'); render(); } };
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);
    render();
    return { getModel: () => model, destroy };
  }

  root.NP_PipeRoute = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

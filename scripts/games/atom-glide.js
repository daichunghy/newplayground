/* Touch-first controls for the authored H2O sliding puzzle. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_AtomGlideModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Ghép Phân Tử needs its model and an active game session');
    }

    let model = M.create(), alive = true, announcement = '·';
    container.classList.add('ag-host');
    container.innerHTML = `
      <section class="ag-game" aria-label="Ghép Phân Tử Hóa Học">
        <header class="ag-head"><div><h2>Ghép Phân Tử</h2><p class="ag-goal" aria-label="Công thức đích: H₂O"><svg class="ag-goal-shape" viewBox="0 0 100 50" aria-hidden="true"><path d="M20 13 44 35 M56 35 80 13"/><circle cx="14" cy="8" r="10"/><circle class="ag-goal-oxygen" cx="50" cy="40" r="10"/><circle cx="86" cy="8" r="10"/><text x="14" y="12">H</text><text x="50" y="44">O</text><text x="86" y="12">H</text></svg><strong>H₂O</strong></p></div>
          <div class="ag-actions"><button class="ag-button" id="agPause" type="button" aria-label="Tạm dừng">||</button><button class="ag-button" id="agRestart" type="button" aria-label="Chơi lại màn">↻</button></div>
        </header>
        <p class="ag-cue">Chọn H hoặc O · trượt tới đúng ô.</p>
        <div class="ag-hud" aria-label="Tiến độ"><strong id="agStage">Màn 1 / 4</strong><span id="agMoves">0 lượt</span><button id="agUndo" class="ag-button ag-undo" type="button" aria-label="Hoàn tác" disabled>↶</button></div>
        <div class="ag-board-wrap">
          <div class="ag-board" id="agBoard" role="group" aria-label="Bàn trượt sáu nhân sáu"></div>
        </div>
        <div class="ag-pad" role="group" aria-label="Hướng trượt">
          <button class="ag-button" data-dir="up" type="button" aria-label="Trượt lên">↑</button>
          <button class="ag-button" data-dir="left" type="button" aria-label="Trượt trái">←</button>
          <button class="ag-button" data-dir="down" type="button" aria-label="Trượt xuống">↓</button>
          <button class="ag-button" data-dir="right" type="button" aria-label="Trượt phải">→</button>
        </div>
        <p class="ag-status" id="agStatus" role="status" aria-live="polite" aria-atomic="true">·</p>
        <div class="ag-overlay" id="agOverlay" hidden role="group" aria-label="Trạng thái màn">
          <div class="ag-card"><strong id="agOverlayTitle"></strong><p id="agOverlayCopy"></p><button id="agOverlayNext" class="ag-button ag-primary" type="button"></button><button id="agOverlayRestart" class="ag-button ag-secondary" type="button">Chơi lại màn</button></div>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const board = el('agBoard');
    const atoms = new Map();
    const walls = new Map();
    let renderedWallKey = '';
    const goals = new Map();
    for (let y = 0; y < M.HEIGHT; y++) for (let x = 0; x < M.WIDTH; x++) {
      const goalId = M.ATOMS.find(id => M.GOAL[id][0] === x && M.GOAL[id][1] === y);
      if (goalId) {
        const marker = root.document.createElement('span');
        marker.className = `ag-target ag-target-${goalId === 'o' ? 'o' : 'h'}`;
        marker.setAttribute('aria-hidden', 'true');
        marker.style.left = `${(x + 0.5) * 100 / M.WIDTH}%`;
        marker.style.top = `${(y + 0.5) * 100 / M.HEIGHT}%`;
        marker.textContent = goalId === 'o' ? 'O' : 'H';
        board.appendChild(marker);
        goals.set(goalId, marker);
      }
    }
    for (let i = 0; i < M.ATOMS.length; i++) {
      const id = M.ATOMS[i], button = root.document.createElement('button');
      button.className = `ag-atom ag-atom-${id === 'o' ? 'o' : 'h'}`;
      button.type = 'button'; button.dataset.atom = id;
      button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', id === 'o' ? 'Oxy (O)' : `Hiđro ${i + 1} (H)`);
      button.textContent = id === 'o' ? 'O' : 'H';
      board.appendChild(button); atoms.set(id, button);
    }
    const padButtons = [...container.querySelectorAll('button')].filter(button => button.dataset.dir);

    function destroy() {
      if (!alive) return;
      alive = false; container.classList.remove('ag-host'); container.innerHTML = '';
    }
    function setAnnouncement(text) { announcement = text; el('agStatus').textContent = text; }
    function render() {
      if (!alive) return;
      const v = model.view(), canPlay = v.status === 'playing', paused = v.status === 'paused';
      el('agStage').textContent = `Màn ${v.levelNumber} / ${v.levelCount}`;
      el('agMoves').textContent = `${v.moves} lượt`;
      el('agUndo').disabled = !v.canUndo || !canPlay;
      el('agPause').disabled = v.status === 'won';
      el('agPause').textContent = paused ? '>' : '||';
      el('agPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      padButtons.forEach(button => { button.disabled = !canPlay || !v.selected; });
      for (const [id, button] of atoms) {
        const point = v.atoms[id];
        button.style.left = `${(point[0] + 0.5) * 100 / M.WIDTH}%`;
        button.style.top = `${(point[1] + 0.5) * 100 / M.HEIGHT}%`;
        button.disabled = !canPlay;
        button.classList.toggle('is-selected', v.selected === id);
        button.setAttribute('aria-pressed', String(v.selected === id));
        button.setAttribute('aria-label', `${id === 'o' ? 'Oxy (O)' : `Hiđro ${id === 'h1' ? '1' : '2'} (H)`}, ô ${point[0] + 1}, ${point[1] + 1}${v.selected === id ? ', đã chọn' : ''}`);
      }
      // Wall geometry changes only between the four authored stages.
      const wallKey = JSON.stringify(v.walls);
      if (wallKey !== renderedWallKey) {
        for (const node of walls.values()) node.remove();
        walls.clear();
        for (const [x, y] of v.walls) {
          const wall = root.document.createElement('span');
          wall.className = 'ag-wall'; wall.setAttribute('aria-hidden', 'true');
          wall.style.left = `${x * 100 / M.WIDTH}%`; wall.style.top = `${y * 100 / M.HEIGHT}%`;
          board.appendChild(wall);
          walls.set(`${x},${y}`, wall);
        }
        renderedWallKey = wallKey;
      }
      for (const [id, marker] of goals) marker.classList.toggle('is-occupied', M.ATOMS.some(atomId =>
        (id === 'o' ? atomId === 'o' : atomId !== 'o')
        && v.atoms[atomId][0] === v.goal[id][0] && v.atoms[atomId][1] === v.goal[id][1]));

      const overlay = el('agOverlay'); overlay.hidden = canPlay;
      if (paused) {
        el('agOverlayTitle').textContent = 'Tạm dừng';
        el('agOverlayCopy').textContent = `${v.levelNumber} / ${v.levelCount} · ${v.moves} lượt`;
        el('agOverlayNext').textContent = 'Tiếp tục';
        el('agOverlayRestart').hidden = false;
      } else {
        el('agOverlayTitle').textContent = v.levelNumber === v.levelCount ? 'Đã ghép H₂O!' : 'Ghép đúng H₂O!';
        el('agOverlayCopy').textContent = `Màn ${v.levelNumber} · ${v.moves} lượt`;
        el('agOverlayNext').textContent = v.levelNumber === v.levelCount ? 'Chơi lại' : 'Màn tiếp →';
        el('agOverlayRestart').hidden = v.levelNumber === v.levelCount;
      }
      el('agStatus').textContent = announcement;
    }
    function chooseAtom(id) {
      const result = model.select(id);
      if (!result.accepted) return;
      setAnnouncement(id === 'o' ? 'Đã chọn Oxy.' : 'Đã chọn Hiđro.'); render();
    }
    function slide(direction) {
      const result = model.move(direction);
      if (!result.accepted) return;
      setAnnouncement(result.moved ? 'Đã trượt.' : 'Bị chặn.'); render();
      if (result.status === 'won') setAnnouncement('Đã ghép đúng H₂O!');
    }
    function restart() { model.restart(); setAnnouncement('Màn mới.'); render(); }

    for (const [id, button] of atoms) session.listen(button, 'click', () => chooseAtom(id));
    for (const button of padButtons) session.listen(button, 'click', () => slide(button.dataset.dir));
    session.listen(el('agUndo'), 'click', () => { if (model.undo()) { setAnnouncement('Đã hoàn tác.'); render(); } });
    session.listen(el('agPause'), 'click', () => {
      if (model.pause()) { setAnnouncement('Tạm dừng.'); render(); }
      else if (model.resume()) { setAnnouncement('Tiếp tục.'); render(); }
    });
    session.listen(el('agRestart'), 'click', restart);
    session.listen(el('agOverlayNext'), 'click', () => {
      const v = model.view();
      if (v.status === 'paused') { model.resume(); setAnnouncement('Tiếp tục.'); render(); }
      else if (v.level < v.levelCount - 1) { model.nextLevel(); setAnnouncement('Màn mới.'); render(); }
      else { model.newGame(); setAnnouncement('Màn mới.'); render(); }
    });
    session.listen(el('agOverlayRestart'), 'click', restart);
    session.listen(root.document, 'keydown', event => {
      if (!container.contains(event.target) || event.altKey || event.ctrlKey || event.metaKey
        || event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      const direction = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', w: 'up', d: 'right', s: 'down', a: 'left' }[event.key];
      if (direction && model.view().selected) { event.preventDefault(); slide(direction); }
    });
    const interrupt = () => { if (model.pause()) { setAnnouncement('Tạm dừng.'); render(); } };
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);
    render();
    return { getModel: () => model, destroy };
  }

  root.NP_AtomGlide = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

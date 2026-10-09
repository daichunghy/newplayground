/* Original Vietnamese rolling-block grid puzzle. Game art is authored in khoi-da-lan.css. */
(function () {
  'use strict';

  function mount(container, session) {
    const M = window.NP_KhoiDaLanModel;
    if (!M) throw new Error('Khối Đá Lăn rules are not ready');
    const { listen, onCleanup } = session;
    const PROGRESS_KEY = 'np-khoi-da-lan-progress-v1';
    function loadProgress() {
      try {
        const raw = window.localStorage && window.localStorage.getItem(PROGRESS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) { return null; }
    }
    let model = M.create(0, { progress: loadProgress() });
    let alive = true;
    container.classList.add('kd-host');
    container.innerHTML = `
      <section class="kd-game" aria-label="Khối Đá Lăn">
        <header class="kd-header">
          <div><p class="kd-kicker">BỘ ĐỐ ĐÁ NỔI</p><h2>Khối Đá Lăn</h2></div>
          <div class="kd-head-actions">
            <button class="kd-btn kd-icon-btn" id="kdUndo" type="button" aria-label="Hoàn tác một bước" title="Hoàn tác · Z">↶</button>
            <button class="kd-btn kd-icon-btn" id="kdRestart" type="button" aria-label="Chơi lại màn này" title="Chơi lại">↻</button>
          </div>
        </header>
        <div class="kd-hud">
          <div><span>Màn</span><strong id="kdLevelName"></strong></div>
          <div><span>Số bước</span><strong id="kdMoves">0</strong></div>
          <div><span>Kỷ lục</span><strong id="kdBest">—</strong></div>
          <div><span>Tối thiểu</span><strong id="kdPar">0</strong></div>
          <p id="kdStatus" class="kd-status" role="status" aria-live="polite" aria-atomic="true">Chọn hướng để lăn khối.</p>
        </div>
        <nav id="kdLevels" class="kd-levels" aria-label="Chọn màn"></nav>
        <div id="kdBoard" class="kd-board" role="img" aria-label="Bàn đá nổi"></div>
        <div class="kd-play-row">
          <div class="kd-pad" role="group" aria-label="Điều khiển khối">
            <button class="kd-btn kd-dir kd-dir-up" id="kdUp" data-direction="up" type="button" aria-label="Lăn lên">↑</button>
            <button class="kd-btn kd-dir kd-dir-left" id="kdLeft" data-direction="left" type="button" aria-label="Lăn trái">←</button>
            <button class="kd-btn kd-dir kd-dir-down" id="kdDown" data-direction="down" type="button" aria-label="Lăn xuống">↓</button>
            <button class="kd-btn kd-dir kd-dir-right" id="kdRight" data-direction="right" type="button" aria-label="Lăn phải">→</button>
          </div>
          <button class="kd-btn kd-next" id="kdNext" type="button" hidden>Màn kế →</button>
        </div>
        <p class="kd-instructions">Dùng phím mũi tên hoặc chạm nút. Khối đứng chiếm 1 ô, nằm chiếm 2 ô; khe trống làm khối rơi. Đứng thẳng trên hố để mở màn kế.</p>
        <div class="kd-key" aria-hidden="true"><span><i class="kd-key-stone"></i> Đá</span><span><i class="kd-key-bridge"></i> Cầu đá</span><span><i class="kd-key-hole"></i> Hố đích</span><span><i class="kd-key-gap"></i> Khe rơi</span></div>
      </section>`;

    const el = id => container.querySelector(`#${id}`);
    const board = el('kdBoard');
    const levelNav = el('kdLevels');
    levelNav.innerHTML = M.LEVELS.map((level, index) =>
      `<button class="kd-btn kd-level" id="kdLevel${index}" type="button" data-level="${index}" aria-label="Màn ${index + 1}: ${level.name}">${index + 1}<span>${level.name}</span></button>`
    ).join('');

    function announce(view) {
      if (view.status === 'won') return view.levelIndex === view.levelCount - 1
        ? `Đã lọt hố! Hoàn tất ${view.levelCount} màn. Kỷ lục: ${view.bestMoves} bước.`
        : `Đã lọt hố! Mở màn ${view.levelIndex + 2}. Kỷ lục: ${view.bestMoves} bước.`;
      if (view.lastEvent === 'fall') return 'Rơi khỏi lối! Khối đã về đầu màn. Hoàn tác nếu muốn thử lại nước vừa rồi.';
      if (view.lastEvent === 'undo') return 'Đã hoàn tác một bước.';
      if (view.lastEvent === 'restart') return 'Đã chơi lại màn này.';
      if (view.lastEvent === 'selected') return `Đã chọn màn ${view.levelIndex + 1}: ${view.levelName}.`;
      if (view.lastEvent === 'roll') return `Khối ${view.block.orientation === 'stand' ? 'đứng' : 'nằm'} ở hàng ${view.block.y + 1}, cột ${view.block.x + 1}.`;
      return 'Lăn qua đá liền nhau rồi đứng thẳng trên hố đích.';
    }

    function render() {
      if (!alive) return;
      const v = model.view();
      el('kdLevelName').textContent = `${v.levelIndex + 1}. ${v.levelName}`;
      el('kdMoves').textContent = String(v.moves);
      el('kdBest').textContent = v.bestMoves === null ? '—' : String(v.bestMoves);
      el('kdPar').textContent = String(v.par);
      el('kdStatus').textContent = announce(v);
      el('kdNext').hidden = !v.canNext;
      el('kdUndo').disabled = !v.canUndo;
      for (let i = 0; i < v.levelCount; i++) {
        const button = el(`kdLevel${i}`);
        button.setAttribute('aria-pressed', String(i === v.levelIndex));
        button.disabled = i >= v.unlockedCount;
        button.setAttribute('aria-label', button.disabled
          ? `Màn ${i + 1}: ${M.LEVELS[i].name}, đang khóa`
          : `Màn ${i + 1}: ${M.LEVELS[i].name}`);
      }
      if (v.lastEvent === 'win') {
        try {
          if (window.localStorage) window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(model.progress()));
        } catch (_) { /* The puzzle still works when storage is unavailable. */ }
      }

      const byCell = new Map(v.tiles.map(tile => [`${tile.x},${tile.y}`, tile.kind]));
      const slots = [];
      for (let y = 0; y < v.height; y++) {
        for (let x = 0; x < v.width; x++) {
          const kind = byCell.get(`${x},${y}`);
          let cls = 'kd-cell kd-gap';
          if (kind === 'stone') cls = 'kd-cell kd-stone';
          else if (kind === 'bridge') cls = 'kd-cell kd-bridge';
          else if (kind === 'goal') cls = 'kd-cell kd-goal';
          if (x === v.start.x && y === v.start.y) cls += ' kd-start';
          slots.push(`<span class="${cls}" style="grid-column:${x + 1};grid-row:${y + 1}" aria-hidden="true"><i>${kind === 'goal' ? '◇' : kind === 'bridge' ? '≋' : ''}</i></span>`);
        }
      }
      const cols = v.block.orientation === 'wide' ? 2 : 1;
      const rows = v.block.orientation === 'tall' ? 2 : 1;
      slots.push(`<span class="kd-block kd-${v.block.orientation}" style="grid-column:${v.block.x + 1} / span ${cols};grid-row:${v.block.y + 1} / span ${rows}" aria-label="Khối ${v.block.orientation === 'stand' ? 'đang đứng, chiếm một ô' : 'đang nằm, chiếm hai ô'}"><i class="kd-block-mark" aria-hidden="true"></i><b>${v.block.orientation === 'stand' ? 'ĐỨNG' : 'LĂN'}</b></span>`);
      board.style.setProperty('--kd-cols', String(v.width));
      board.style.setProperty('--kd-rows', String(v.height));
      const footprint = v.block.orientation === 'wide'
        ? `cột ${v.block.x + 1}–${v.block.x + 2}`
        : v.block.orientation === 'tall' ? `hàng ${v.block.y + 1}–${v.block.y + 2}` : `ô hàng ${v.block.y + 1}, cột ${v.block.x + 1}`;
      const pose = v.block.orientation === 'stand' ? 'đứng' : 'nằm';
      board.setAttribute('aria-label', `Màn ${v.levelIndex + 1} trên ${v.levelCount}, ${v.levelName}. ${v.width} cột, ${v.height} hàng. ${v.tiles.length} ô đá; hố đích ở hàng ${v.goal.y + 1}, cột ${v.goal.x + 1}. Khối đang ${pose} tại ${footprint}.`);
      board.innerHTML = slots.join('');
    }

    function roll(direction) {
      if (!alive || !model.move(direction)) return;
      render();
    }
    function restart() { if (alive) { model.restart(); render(); } }
    function undo() { if (alive && model.undo()) render(); }
    function chooseLevel(index) { if (alive && model.selectLevel(index)) render(); }

    listen(el('kdLeft'), 'click', () => roll('left'));
    listen(el('kdRight'), 'click', () => roll('right'));
    listen(el('kdUp'), 'click', () => roll('up'));
    listen(el('kdDown'), 'click', () => roll('down'));
    listen(el('kdUndo'), 'click', undo);
    listen(el('kdRestart'), 'click', restart);
    listen(el('kdNext'), 'click', () => { if (alive) { model.nextLevel(); render(); } });
    for (let i = 0; i < M.LEVELS.length; i++) listen(el(`kdLevel${i}`), 'click', () => chooseLevel(i));
    listen(window, 'keydown', event => {
      if (!alive) return;
      const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key];
      if (direction) { event.preventDefault(); roll(direction); }
      else if ((event.key === 'z' || event.key === 'Z') && !event.altKey && !event.ctrlKey && !event.metaKey) { event.preventDefault(); undo(); }
    });
    onCleanup(() => { alive = false; container.classList.remove('kd-host'); });
    render();
    return { getModel: () => model };
  }

  window.NP_KhoiDaLan = Object.freeze({ mount });
})();

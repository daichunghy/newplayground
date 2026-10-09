/* Original DOM presentation for Nhảy Bậc Kim Tự Tháp. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_QbertPyramidModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.setInterval !== 'function' || typeof session.clearInterval !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Nhảy Bậc Kim Tự Tháp needs its model and an active game session');
    }

    let model = M.create({ seed: options.seed }), alive = true, clock = null;
    let announcement = 'Chạm mũi tên để nhảy. Kẻ đuổi tuần tra theo nhịp.';
    container.classList.add('qbp-host');
    container.innerHTML = `
      <section class="qbp-game" aria-label="Nhảy Bậc Kim Tự Tháp">
        <header class="qbp-head">
          <div><p class="qbp-kicker">BẬC THANG PHA LÊ</p><h2>Nhảy Bậc</h2>
            <p class="qbp-cue">←/→ xuống · ↑/↓ lên · Q/E/Z/C · kẻ đuổi tuần tra</p></div>
          <div class="qbp-tools"><button class="qbp-button qbp-tool" id="qbpPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">II</button>
            <button class="qbp-button qbp-tool" id="qbpRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button></div>
        </header>
        <div class="qbp-hud" aria-label="Điểm số, tiến độ và giới hạn">
          <div><span>Tầng</span><strong id="qbpLevel">1 / 3</strong></div>
          <div><span>Ô sáng</span><strong id="qbpGoals">1 / 28</strong></div>
          <div><span>Điểm</span><strong id="qbpScore">100</strong></div>
          <div><span>Thời gian</span><strong id="qbpTime">3:00</strong></div>
          <div><span>Mạng</span><strong id="qbpLives">● ● ● ● ● ●</strong></div>
        </div>
        <div class="qbp-progress" role="progressbar" aria-label="Ô bậc đã sáng" aria-valuemin="0" aria-valuemax="28" aria-valuenow="1"><span id="qbpProgress"></span></div>
        <div class="qbp-board-wrap">
          <div class="qbp-board" id="qbpBoard" role="grid" aria-label="Kim tự tháp gồm bảy hàng, hai mươi tám bậc"></div>
          <div class="qbp-overlay" id="qbpOverlay" hidden role="group" aria-label="Trạng thái ván">
            <div class="qbp-card"><span class="qbp-overlay-mark" id="qbpOverlayMark" aria-hidden="true">II</span>
              <h3 id="qbpOverlayTitle"></h3><p id="qbpOverlayCopy"></p>
              <button class="qbp-button qbp-primary" id="qbpOverlayAction" type="button"></button></div>
          </div>
        </div>
        <div class="qbp-controls" role="group" aria-label="Phím nhảy chéo">
          <button class="qbp-button qbp-control" id="qbpUpLeft" data-move="upLeft" type="button" aria-label="Nhảy chéo lên trái, phím Q"><span class="qbp-arrow qbp-arrow-nw" aria-hidden="true">↑</span><small>Q</small></button>
          <button class="qbp-button qbp-control" id="qbpUpRight" data-move="upRight" type="button" aria-label="Nhảy chéo lên phải, phím E"><span class="qbp-arrow qbp-arrow-ne" aria-hidden="true">↑</span><small>E</small></button>
          <button class="qbp-button qbp-control" id="qbpDownLeft" data-move="downLeft" type="button" aria-label="Nhảy chéo xuống trái, phím Z"><span class="qbp-arrow qbp-arrow-sw" aria-hidden="true">↑</span><small>Z</small></button>
          <button class="qbp-button qbp-control" id="qbpDownRight" data-move="downRight" type="button" aria-label="Nhảy chéo xuống phải, phím C"><span class="qbp-arrow qbp-arrow-se" aria-hidden="true">↑</span><small>C</small></button>
        </div>
        <p class="qbp-status" id="qbpStatus" role="status" aria-live="polite" aria-atomic="true"></p>
      </section>`;

    const el = id => container.querySelector('#' + id), board = el('qbpBoard');
    const tiles = new Map();
    for (let row = 0; row < M.ROWS; row++) {
      const rowNode = root.document.createElement('div');
      rowNode.className = 'qbp-row'; rowNode.setAttribute('role', 'row');
      for (let col = 0; col <= row; col++) {
        const tile = root.document.createElement('div'), id = `${row},${col}`;
        tile.className = 'qbp-tile'; tile.dataset.tile = id;
        tile.setAttribute('role', 'gridcell');
        tile.innerHTML = '<span class="qbp-player" aria-hidden="true"></span><span class="qbp-enemy" aria-hidden="true"></span>';
        rowNode.appendChild(tile); tiles.set(id, tile);
      }
      board.appendChild(rowNode);
    }

    function stopClock() {
      if (clock === null) return;
      session.clearInterval(clock); clock = null;
    }
    function startClock() {
      if (clock !== null || !alive || model.view().status !== 'playing') return;
      clock = session.setInterval(() => {
        if (!alive) return;
        model.advance(1000);
        render();
        if (model.view().status !== 'playing') stopClock();
      }, 1000);
    }
    function destroy() {
      if (!alive) return;
      alive = false; stopClock();
      container.classList.remove('qbp-host');
      container.innerHTML = '';
    }
    function formatTime(milliseconds) {
      const seconds = Math.ceil(milliseconds / 1000);
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }
    function render() {
      if (!alive) return;
      const v = model.view(), playing = v.status === 'playing', paused = v.status === 'paused';
      board.dataset.level = String(v.levelNumber);
      el('qbpLevel').textContent = `${v.levelNumber} / ${v.levelCount}`;
      el('qbpGoals').textContent = `${v.goalsFound} / ${v.goalsTotal}`;
      el('qbpScore').textContent = String(v.score);
      el('qbpTime').textContent = formatTime(v.timeLeft);
      el('qbpLives').textContent = `${'● '.repeat(v.lives)}${'○ '.repeat(v.maxLives - v.lives)}`.trim();
      el('qbpLives').setAttribute('aria-label', `${v.lives} lượt sống còn lại`);
      const percent = Math.round(v.goalsFound / v.goalsTotal * 100);
      el('qbpProgress').style.width = `${percent}%`;
      el('qbpProgress').parentNode.setAttribute('aria-valuenow', String(v.goalsFound));

      for (const tile of v.tiles) {
        const node = tiles.get(tile.id);
        node.dataset.visited = String(tile.visited);
        node.classList.toggle('is-visited', tile.visited);
        node.classList.toggle('is-player', tile.player);
        node.classList.toggle('has-enemy', tile.enemies.length > 0);
        node.querySelector('.qbp-player').hidden = !tile.player;
        node.querySelector('.qbp-enemy').hidden = tile.enemies.length === 0;
        node.querySelector('.qbp-enemy').textContent = tile.enemies.length > 1 ? String(tile.enemies.length) : '';
        node.setAttribute('aria-label', `Hàng ${tile.row + 1}, bậc ${tile.col + 1}: ${tile.visited ? 'đã sáng' : 'chưa sáng'}${tile.player ? ', người nhảy đang đứng đây' : ''}${tile.enemies.length ? `, ${tile.enemies.length} kẻ đuổi` : ''}`);
      }
      for (const button of container.querySelectorAll('.qbp-control')) button.disabled = !playing;
      el('qbpPause').disabled = !playing && !paused;
      el('qbpPause').textContent = paused ? '>' : 'II';
      el('qbpPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');

      const overlay = el('qbpOverlay'); overlay.hidden = playing;
      if (paused) {
        el('qbpOverlayMark').textContent = 'II';
        el('qbpOverlayTitle').textContent = 'Đã tạm dừng';
        el('qbpOverlayCopy').textContent = `Tầng ${v.levelNumber} · ${v.goalsFound} / ${v.goalsTotal} bậc đã sáng`;
        el('qbpOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'won') {
        el('qbpOverlayMark').textContent = '✦';
        el('qbpOverlayTitle').textContent = 'Cả kim tự tháp đã sáng!';
        el('qbpOverlayCopy').textContent = `${v.score} điểm · ${v.turns} lượt nhảy`;
        el('qbpOverlayAction').textContent = 'Chơi lại';
      } else {
        el('qbpOverlayMark').textContent = '↻';
        el('qbpOverlayTitle').textContent = v.lossReason === 'time' ? 'Hết giờ' : 'Hết lượt sống';
        el('qbpOverlayCopy').textContent = `${v.score} điểm · đã sáng ${v.goalsFound} bậc ở tầng ${v.levelNumber}`;
        el('qbpOverlayAction').textContent = 'Thử lại';
      }
      el('qbpStatus').textContent = announcement;
    }
    function describeResult(result) {
      if (result.event === 'fall') return 'Trượt khỏi bậc · mất một lượt sống.';
      if (result.event === 'enemy') return 'Kẻ đuổi chạm tới · mất một lượt sống.';
      if (result.event === 'lost') return 'Hết lượt sống. Thử lại nhé.';
      if (result.event === 'level') return `Tầng ${result.level + 1} mở ra · tiếp tục sáng bậc!`;
      if (result.event === 'won') return 'Ba tầng đã sáng · kim tự tháp hoàn tất!';
      if (result.event === 'landed') return 'Bậc đã đổi màu · tìm ô tiếp theo.';
      if (result.event === 'revisit') return 'Bậc đã sáng · chọn hướng khác.';
      return 'Nhảy chéo · tránh đường tuần tra.';
    }
    function move(direction) {
      const result = model.move(direction);
      if (!result.accepted) return false;
      announcement = describeResult(result);
      render();
      if (result.status !== 'playing') { stopClock(); el('qbpOverlayAction').focus(); }
      return true;
    }
    function pause() {
      if (model.pause()) {
        stopClock(); announcement = 'Đã tạm dừng.'; render(); el('qbpOverlayAction').focus(); return true;
      }
      if (model.resume()) {
        announcement = 'Tiếp tục · giữ mắt ở các bậc đang sáng.'; render(); startClock(); return true;
      }
      return false;
    }
    function restart() {
      stopClock(); model.restart();
      announcement = 'Ván mới · sáng mọi bậc và né kẻ đuổi.';
      render(); startClock();
    }

    for (const button of container.querySelectorAll('.qbp-control')) {
      session.listen(button, 'click', () => move(button.dataset.move));
    }
    session.listen(el('qbpPause'), 'click', pause);
    session.listen(el('qbpRestart'), 'click', restart);
    session.listen(el('qbpOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') pause(); else restart();
    });
    const keyMoves = Object.freeze({
      arrowup: 'upLeft', arrowdown: 'upRight', arrowleft: 'downLeft', arrowright: 'downRight',
      q: 'upLeft', e: 'upRight', z: 'downLeft', c: 'downRight'
    });
    session.listen(root, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      const key = String(event.key || '').toLowerCase();
      if (key === 'p') { event.preventDefault(); pause(); return; }
      if (keyMoves[key]) { event.preventDefault(); move(keyMoves[key]); }
    });
    const interrupt = () => {
      if (model.pause()) { stopClock(); announcement = 'Đã tự dừng khi rời màn.'; render(); }
    };
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);

    render(); startClock();
    return Object.freeze({ getModel: () => model, destroy });
  }

  root.NP_QbertPyramid = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

/* Original touch-first truss builder with a small linear-static load solver. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_BridgeBuilderModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Xây Cầu needs its model and an active game session');
    }
    let model = M.create(), alive = true, frame = null, previous = null, message = '·';
    container.classList.add('bb-host');
    container.innerHTML = `
      <section class="bb-game" id="bbGame" aria-label="Xây Cầu">
        <header class="bb-head"><h2>Xây Cầu</h2><div class="bb-actions">
          <button class="bb-button" id="bbPause" type="button" aria-label="Tạm dừng">||</button>
          <button class="bb-button" id="bbRestart" type="button" aria-label="Xây lại từ đầu">↻</button>
        </div></header>
        <div class="bb-hud" aria-label="Thông số thử cầu"><div><span>Chặng</span><strong id="bbLevel">1 / 3 · Khe Suối</strong></div><div><span>Giằng</span><strong id="bbBudget">0 / 8</strong></div><div><span>Tải</span><strong id="bbLoad">1.2 t</strong></div></div>
        <p id="bbCue" class="bb-cue">Chạm 2 khớp để đặt giằng</p>
        <div class="bb-board-frame"><svg id="bbBoard" class="bb-board" viewBox="0 0 420 260" role="group" aria-label="Lưới khớp cầu; nối khớp trên với khớp đường liền kề"></svg></div>
        <div class="bb-progress" aria-hidden="true"><span id="bbProgress"></span></div>
        <div class="bb-tools"><button class="bb-button" id="bbUndo" type="button">↶ Hoàn tác</button><button class="bb-button bb-primary" id="bbTest" type="button">Thử tải</button></div>
        <p id="bbStatus" class="bb-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div id="bbOverlay" class="bb-overlay" hidden role="group" aria-label="Kết quả thử cầu"><div class="bb-overlay-card"><strong id="bbOverlayTitle"></strong><p id="bbOverlayCopy"></p><button class="bb-button bb-primary" id="bbOverlayAction" type="button"></button></div></div>
      </section>`;
    const el = id => container.querySelector('#' + id);

    function stopLoop() { if (frame !== null) session.cancelAnimationFrame(frame); frame = null; previous = null; }
    function destroy() {
      if (!alive) return;
      alive = false; stopLoop(); container.classList.remove('bb-host'); container.innerHTML = '';
    }
    function drawBoard(v) {
      const xById = new Map(v.points.map(point => [point.id, 26 + point.x * (368 / v.spans)]));
      const yById = new Map(v.points.map(point => [point.id, point.kind === 'deck' ? 190 : 96]));
      const mobile = Boolean(root.matchMedia?.('(max-width: 480px)').matches);
      const radius = mobile ? (v.spans > 4 ? 22 : 42) : 24;
      const position = id => `${xById.get(id)},${yById.get(id)}`;
      const braces = new Set(v.braces.map(bar => [bar.a, bar.b].sort().join('|')));
      const possible = [];
      for (let i = 0; i < v.spans; i++) {
        for (const deck of [`b${i}`, `b${i + 1}`]) {
          const member = [`t${i}`, deck].sort().join('|');
          if (!braces.has(member)) possible.push(`<line class="bb-ghost" x1="${xById.get(`t${i}`)}" y1="96" x2="${xById.get(deck)}" y2="190"/>`);
        }
      }
      const lines = v.bars.map(bar => `<line class="bb-member ${bar.kind}" x1="${xById.get(bar.a)}" y1="${yById.get(bar.a)}" x2="${xById.get(bar.b)}" y2="${yById.get(bar.b)}"/>`).join('');
      const joints = v.points.map(point => `<g class="bb-joint ${v.selected === point.id ? 'selected' : ''}" data-joint="${point.id}" role="button" tabindex="0" aria-label="Khớp ${point.id}"><circle class="bb-hit" cx="${xById.get(point.id)}" cy="${yById.get(point.id)}" r="${radius}"/><circle class="bb-joint-dot ${point.kind}" cx="${xById.get(point.id)}" cy="${yById.get(point.id)}" r="12"/><text x="${xById.get(point.id)}" y="${yById.get(point.id) + 4}" text-anchor="middle">${point.kind === 'deck' ? '•' : '○'}</text></g>`).join('');
      const road = `<path class="bb-river" d="M0 202q52-20 104 0t104 0t104 0t104 0v58H0Z"/><path class="bb-bank" d="M0 183h54v17H0Zm365 0h55v17h-55Z"/><line class="bb-road" x1="26" y1="190" x2="394" y2="190"/>`;
      const truckX = 26 + 368 * v.progress;
      const truck = v.status === 'testing' || v.status === 'passed' || v.status === 'won' || v.status === 'failed'
        ? `<g id="bbTruck" class="bb-truck" transform="translate(${truckX} 170)"><rect x="-18" y="-15" width="28" height="15" rx="3"/><path d="M10 -11h13l9 11H10Z"/><circle cx="-9" cy="2" r="5"/><circle cx="22" cy="2" r="5"/></g>` : '';
      el('bbBoard').innerHTML = `<g aria-hidden="true">${road}${possible.join('')}${lines}${truck}</g>${joints}`;
    }
    function render() {
      if (!alive) return;
      const v = model.view(), building = v.status === 'building', paused = v.status === 'paused';
      const mobileWide = Boolean(root.matchMedia?.('(max-width: 480px)').matches) && v.spans > 4;
      el('bbGame').classList.toggle('is-wide', mobileWide);
      el('bbLevel').textContent = `${v.levelNumber} / ${v.levelCount} · ${v.levelName}`;
      el('bbCue').textContent = v.spans > 4 ? 'Chạm 2 khớp · kéo ngang' : 'Chạm 2 khớp để đặt giằng';
      el('bbBudget').textContent = `${v.used} / ${v.budget}`;
      el('bbLoad').textContent = `${v.load.toFixed(1)} t`;
      el('bbProgress').style.width = `${v.progress * 100}%`;
      el('bbUndo').disabled = !building || v.used === 0;
      el('bbTest').disabled = !building || v.used === 0;
      el('bbPause').disabled = ['passed', 'won', 'failed'].includes(v.status);
      el('bbPause').textContent = paused ? '>' : '||';
      el('bbPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('bbBoard').setAttribute('aria-label', `Cầu chặng ${v.levelNumber}: ${v.used} giằng đã đặt`);
      drawBoard(v);
      const overlay = el('bbOverlay'); overlay.hidden = !['paused', 'passed', 'won', 'failed'].includes(v.status);
      if (paused) {
        el('bbOverlayTitle').textContent = 'Tạm dừng'; el('bbOverlayCopy').textContent = `${v.used} / ${v.budget} giằng`;
        el('bbOverlayAction').textContent = 'Tiếp tục';
      } else if (v.status === 'passed' || v.status === 'won') {
        el('bbOverlayTitle').textContent = v.status === 'won' ? 'Cầu vững!' : 'Tải qua an toàn';
        el('bbOverlayCopy').textContent = `Độ võng ${v.report.maxDeflection.toFixed(3)} · lực ${v.report.maxForce.toFixed(2)}`;
        el('bbOverlayAction').textContent = v.status === 'won' ? 'Xây lại' : 'Chặng kế';
      } else if (v.status === 'failed') {
        el('bbOverlayTitle').textContent = v.report.reason === 'unstable' ? 'Cầu chưa kín' : v.report.reason === 'flex' ? 'Cầu võng quá' : 'Giằng quá tải';
        el('bbOverlayCopy').textContent = 'Thêm giằng rồi thử lại.'; el('bbOverlayAction').textContent = 'Sửa cầu';
      }
      el('bbStatus').textContent = message;
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'testing') { previous = null; return; }
      if (previous !== null) model.advance(Math.min(100, Math.max(0, timestamp - previous)));
      previous = timestamp; render();
      if (model.view().status === 'testing') frame = session.requestAnimationFrame(loop);
      else { previous = null; render(); }
    }
    function startLoop() {
      if (!alive || frame !== null || model.view().status !== 'testing' || root.document?.hidden) return;
      previous = null; frame = session.requestAnimationFrame(loop);
    }
    function selectJoint(id) {
      const result = model.selectJoint(id);
      if (!result.accepted) message = result.reason === 'pair' || result.reason === 'distance' ? 'Nối khớp trên với điểm kề.' : 'Giằng đã đặt.';
      else message = result.member ? 'Giằng đặt.' : result.cleared ? 'Chọn hai khớp.' : 'Chọn khớp kế.';
      render();
    }
    function resumeOrRestart() {
      if (model.view().status === 'paused') { model.resume(); message = 'Tiếp tục.'; render(); startLoop(); }
      else if (model.view().status === 'failed') { model.repair(); message = 'Sửa cầu.'; render(); }
      else if (model.view().status === 'passed') { model.nextLevel(); message = 'Chặng mới.'; render(); }
      else { model.restart(); stopLoop(); message = '·'; render(); }
    }
    session.listen(el('bbBoard'), 'click', event => { const joint = event.target.closest?.('[data-joint]'); if (joint) selectJoint(joint.getAttribute('data-joint')); });
    session.listen(el('bbBoard'), 'keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target?.matches?.('[data-joint]')) { event.preventDefault(); selectJoint(event.target.getAttribute('data-joint')); }
    });
    session.listen(el('bbUndo'), 'click', () => { if (model.undo()) message = 'Giằng gỡ ra.'; render(); });
    session.listen(el('bbTest'), 'click', () => { if (model.test()) { stopLoop(); message = 'Xe đang qua cầu…'; render(); startLoop(); } });
    session.listen(el('bbPause'), 'click', () => {
      if (model.pause()) { stopLoop(); message = 'Tạm dừng.'; render(); }
      else if (model.resume()) { message = 'Tiếp tục.'; render(); startLoop(); }
    });
    session.listen(el('bbRestart'), 'click', () => { model.restart(); stopLoop(); message = '·'; render(); });
    session.listen(el('bbOverlayAction'), 'click', resumeOrRestart);
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden && model.pause()) { stopLoop(); message = 'Tạm dừng.'; render(); } else startLoop(); });
    session.listen(root, 'blur', () => { if (model.pause()) { stopLoop(); message = 'Tạm dừng.'; render(); } });
    session.onCleanup(destroy); render();
    return { getModel: () => model, destroy };
  }

  root.NP_BridgeBuilder = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

/* Project-authored, original Vietnamese ceiling shooter. */
(function (root) {
  'use strict';

  const COLORS = Object.freeze({ amber: '#e6ad45', mint: '#48ad91', blue: '#658ad0', rose: '#df7283' });
  const M = () => root.NP_BubbleDomeModel;
  const C = () => root.NP_BubbleDomeCampaign;

  function mount(container, session, options = {}) {
    const Model = M();
    if (!Model) throw new Error('Bi Vòm rules are not ready');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Bi Vòm needs an active game session');
    }
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    const seed = options.seed ?? 'bi-vom-20261008';
    const customScenario = Array.isArray(options.initial) || Array.isArray(options.queue);
    const Campaign = C();
    const campaign = !customScenario && Campaign ? Campaign.create({ storage: options.storage }) : null;
    let model = campaign ? campaign.getModel() : Model.create({ ...options, seed });
    let alive = true;
    let frame = null;
    let previousTime = null;
    let currentAim = 0;

    container.classList.add('bv-host');
    container.innerHTML = `
      <section class="bv-game" aria-label="Bi Vòm" tabindex="0">
        <header class="bv-header">
          <div><p class="bv-kicker">BẮN · GHÉP 3+</p><h2>Bi Vòm</h2></div>
          <div class="bv-actions"><button id="bvFire" class="bv-button bv-primary" type="button">Bắn</button><button id="bvRestart" class="bv-button" type="button">Chơi lại</button></div>
        </header>
        <div class="bv-hud"><p id="bvStatus" role="status" aria-live="polite" aria-atomic="true">Dọn sạch các cụm bóng.</p><span id="bvCount"></span></div>
        <div id="bvCampaign" class="bv-campaign" ${campaign ? '' : 'hidden'}>
          <div class="bv-stage-info"><div><strong id="bvStageTitle"></strong><p id="bvStageHint"></p></div><span id="bvBest"></span></div>
          <nav id="bvStages" class="bv-stages" aria-label="Chọn chặng"></nav>
          <p id="bvSaveNote" class="bv-save-note" hidden role="status"></p>
        </div>
        <svg id="bvBoard" class="bv-board" viewBox="0 0 480 560" role="img" aria-label="Bàn bóng. Chạm để nhắm và bắn.">
          <defs><linearGradient id="bvSky" x2="0" y2="1"><stop stop-color="#e5f4fa"/><stop offset="1" stop-color="#f5f4e7"/></linearGradient></defs>
          <rect x="12" y="12" width="456" height="536" rx="24" fill="url(#bvSky)"/>
          <path d="M34 420H446" stroke="#8194a4" stroke-dasharray="5 7" stroke-width="2" opacity=".48"/>
          <g id="bvBubbles"></g><g id="bvFlight"></g>
          <path id="bvAim" d="" stroke="#374c73" stroke-width="2" stroke-dasharray="5 7" opacity=".62"/>
          <path d="M209 524h62l-10-18h-42z" fill="#415881" stroke="#263959" stroke-width="3" stroke-linejoin="round"/>
          <circle id="bvCurrent" cx="240" cy="485" r="18" stroke="#fff" stroke-width="3"/>
          <text id="bvCurrentMark" x="240" y="492" text-anchor="middle" font-size="20" font-weight="700"></text>
          <text x="372" y="490" class="bv-small-label">TIẾP</text><circle id="bvNext" cx="414" cy="485" r="13" stroke="#fff" stroke-width="3"/><text id="bvNextMark" x="414" y="490" text-anchor="middle" font-size="15" font-weight="700"></text>
        </svg>
        <footer class="bv-footer"><span>Nhắm rồi bắn. ← → / Space</span><span id="bvRemaining"></span></footer>
      </section>`;

    const el = id => container.querySelector(`#${id}`);
    const svg = el('bvBoard');
    function screenPoint(bubble) {
      const p = Model.position(bubble.row, bubble.col);
      return { x: 30 + p.x * 42, y: 20 + p.y * 42 };
    }
    function ballMarkup(color, x, y, radius) {
      return `<g aria-label="Bóng ${Model.LABELS[color]}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${COLORS[color]}" stroke="#fff" stroke-width="2.5"/><text x="${x.toFixed(1)}" y="${(y + radius * 0.34).toFixed(1)}" text-anchor="middle" fill="#1f3150" font-size="${Math.round(radius * 0.94)}" font-weight="800">${Model.SYMBOLS[color]}</text></g>`;
    }
    function resultText(view, route) {
      if (view.status === 'won') {
        if (route) return route.selectedStage === route.count ? 'Hoàn thành hành trình!' : `Qua chặng ${route.selectedStage} · đã mở chặng ${route.unlockedStage}.`;
        return 'Dọn sạch!';
      }
      if (view.status === 'lost') return view.lastEvent === 'blocked' ? 'Hết chỗ. Chơi lại nhé.' : 'Hết bóng. Chơi lại nhé.';
      return view.lastEvent === 'pop' ? 'Nổ cụm!' : 'Dọn sạch các cụm bóng.';
    }
    function colorMarkup(bubble) {
      const point = screenPoint(bubble);
      return ballMarkup(bubble.color, point.x, point.y, 18);
    }
    function render() {
      if (!alive) return;
      if (campaign) {
        campaign.recordWin();
        model = campaign.getModel();
      }
      const view = model.view();
      const route = campaign?.view() || null;
      if (route) {
        el('bvStageTitle').textContent = `Chặng ${route.selectedStage}/${route.count} · ${route.stage.title}`;
        el('bvStageHint').textContent = route.stage.hint;
        el('bvBest').textContent = route.best ? `Kỷ lục ${route.best.score} điểm · ${route.best.shotsUsed} lượt` : 'Chưa có kỷ lục';
        el('bvStages').innerHTML = route.stages.map(stage => `<button class="bv-stage${stage.selected ? ' is-current' : ''}${stage.complete ? ' is-complete' : ''}" type="button" data-stage="${stage.number}" aria-label="Chặng ${stage.number}: ${stage.title}${stage.complete ? ', đã qua' : ''}" aria-pressed="${stage.selected}" ${stage.unlocked ? '' : 'disabled'}>${stage.number}</button>`).join('');
        el('bvSaveNote').hidden = !route.saveMessage;
        el('bvSaveNote').textContent = route.saveMessage;
      }
      el('bvBubbles').innerHTML = view.bubbles.map(colorMarkup).join('');
      el('bvFlight').innerHTML = view.projectile
        ? ballMarkup(view.projectile.color, 30 + view.projectile.x * 42, 20 + view.projectile.y * 42, 18) : '';
      currentAim = view.aim;
      const angle = view.aim * Math.PI / 180;
      const endX = 240 + Math.sin(angle) * 440;
      const endY = 20 + 11 * 42 - Math.cos(angle) * 440;
      el('bvAim').setAttribute('d', `M240 482 L${endX.toFixed(1)} ${endY.toFixed(1)}`);
      const current = view.currentColor && COLORS[view.currentColor] || '#d9e0e2';
      const next = view.nextColor && COLORS[view.nextColor] || '#d9e0e2';
      el('bvCurrent').setAttribute('fill', current);
      el('bvCurrentMark').textContent = view.currentColor ? Model.SYMBOLS[view.currentColor] : '';
      el('bvNext').setAttribute('fill', next);
      el('bvNextMark').textContent = view.nextColor ? Model.SYMBOLS[view.nextColor] : '';
      el('bvStatus').textContent = resultText(view, route);
      el('bvCount').textContent = `${view.bubbles.length} bóng · ${view.score} điểm`;
      el('bvRemaining').textContent = `${view.shotsLeft} lượt`;
      el('bvFire').disabled = !view.canFire;
      if (view.projectile) schedule();
      else stopLoop();
    }
    function stopLoop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
    }
    function schedule() {
      if (alive && !root.document.hidden && frame === null) frame = requestAnimationFrame(animate);
    }
    function animate(time) {
      frame = null;
      if (!alive) return;
      const delta = previousTime === null ? 1 / 60 : Math.max(0, Math.min(0.1, (time - previousTime) / 1000));
      previousTime = time;
      model.tick(delta);
      render();
    }
    function fire() {
      if (!model.fire(currentAim)) return;
      render();
      el('bvBoard').focus?.();
    }
    function aimFromPointer(event) {
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return false;
      const x = ((event.clientX - bounds.left) / bounds.width) * 480;
      const y = ((event.clientY - bounds.top) / bounds.height) * 560;
      const targetX = (x - 30) / 42;
      const targetY = (y - 20) / 42;
      const angle = Math.atan2(targetX - 5, 11 - targetY) * 180 / Math.PI;
      model.setAim(angle);
      currentAim = model.view().aim;
      return true;
    }

    listen(el('bvFire'), 'click', fire);
    listen(el('bvRestart'), 'click', () => { if (campaign) { campaign.restart(); model = campaign.getModel(); } else model.restart(); render(); el('bvBoard').focus?.(); });
    if (campaign) listen(el('bvStages'), 'click', event => {
      const number = Number(event.target?.dataset?.stage);
      if (!campaign.selectStage(number)) return;
      model = campaign.getModel();
      render();
      el('bvBoard').focus?.();
    });
    listen(svg, 'pointermove', event => { if (model.view().canFire) { aimFromPointer(event); render(); } });
    listen(svg, 'pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      aimFromPointer(event);
      fire();
      event.preventDefault?.();
    });
    listen(container, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        model.setAim(currentAim + (event.key === 'ArrowLeft' ? -4 : 4));
        currentAim = model.view().aim;
        render();
        event.preventDefault?.();
      } else if (event.key === ' ' || event.key === 'Enter') {
        fire();
        event.preventDefault?.();
      } else if (event.key === 'r' || event.key === 'R') {
        if (campaign) { campaign.restart(); model = campaign.getModel(); }
        else model.restart();
        render();
      }
    });
    listen(root, 'blur', stopLoop);
    listen(root, 'focus', schedule);
    listen(root.document, 'visibilitychange', () => {
      if (root.document.hidden) stopLoop();
      else schedule();
    });
    onCleanup(() => {
      alive = false;
      stopLoop();
      container.classList.remove('bv-host');
    });
    render();
    return Object.freeze({ getModel: () => model, getCampaign: () => campaign, close: stopLoop });
  }

  root.NP_BubbleDome = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

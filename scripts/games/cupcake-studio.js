/* Original recipe-matching cupcake game; all visuals are CSS and project-authored markup. */
(function (root) {
  'use strict';

  const FROSTINGS = [
    { id: 'vanilla', name: 'Vani', color: 'Mật ong' },
    { id: 'berry', name: 'Dâu', color: 'Hồng dâu' },
    { id: 'mint', name: 'Bạc hà', color: 'Xanh bạc hà' }
  ];
  const TOPPINGS = [
    { id: 'berry', name: 'Hoa dâu', mark: '✿' },
    { id: 'star', name: 'Sao đường', mark: '✦' },
    { id: 'choc', name: 'Hạt cacao', mark: '●' },
    { id: 'leaf', name: 'Lá bạc hà', mark: '❋' }
  ];
  const labelFor = value => value === 'erase' ? 'trống' : (TOPPINGS.find(item => item.id === value)?.name || 'trống');

  function mount(container, session) {
    const M = root.NP_CupcakeStudioModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function') {
      throw new Error('Tiệm Bánh Ngọt Cupcake needs its model and an active game session');
    }
    let model = M.create(), alive = true, focusIndex = 4, message = 'Chọn kem, chọn topping, chạm 9 ô rồi giao.';
    const slotIds = Array.from({ length: 9 }, (_, index) => `cupcakeSlot${index}`);

    container.classList.add('cupcake-host');
    container.innerHTML = `
      <section class="cupcake-game" aria-label="Tiệm Bánh Ngọt Cupcake">
        <header class="cupcake-head">
          <div><h2>Tiệm Bánh Ngọt</h2><p>Đơn nhỏ, bánh xinh.</p></div>
          <div class="cupcake-head-actions">
            <button class="cupcake-icon" id="cupcakePause" type="button" aria-label="Tạm dừng">Ⅱ</button>
            <button class="cupcake-icon" id="cupcakeRestart" type="button" aria-label="Làm mẻ mới">↻</button>
          </div>
        </header>
        <p class="cupcake-howto">Chọn kem · chọn topping · chạm ô để trang trí</p>
        <div class="cupcake-progress" aria-label="Tiến độ đơn">
          <span id="cupcakeRound">Đơn 1 / 3</span><span id="cupcakeStars">☆ ☆ ☆</span>
        </div>
        <section class="cupcake-recipe" aria-label="Mẫu khách đặt">
          <div class="cupcake-recipe-copy"><div><span class="cupcake-eyebrow">MẪU ĐẶT</span><strong id="cupcakeCustomer">Mây</strong></div>
            <span id="cupcakeRecipeIcing" class="cupcake-recipe-icing">Kem dâu</span></div>
          <div id="cupcakeRecipeGrid" class="cupcake-recipe-grid" role="img" aria-label="Mẫu trang trí 3 nhân 3"></div>
          <p id="cupcakeRecipeSummary" class="cupcake-sr-only"></p>
        </section>
        <section class="cupcake-canvas" aria-label="Bánh đang làm">
          <div class="cupcake-cake">
            <div id="cupcakeTop" class="cupcake-top icing-vanilla" role="group" aria-label="Chín ô trang trí; dùng phím mũi tên để di chuyển">
              ${Array.from({ length: 9 }, (_, index) => `<button class="cupcake-slot" id="cupcakeSlot${index}" data-cell="${index}" type="button" aria-label="Vị trí ${index + 1}, trống" aria-pressed="false" tabindex="${index === focusIndex ? 0 : -1}"><span aria-hidden="true"></span></button>`).join('')}
            </div>
            <div class="cupcake-liner" aria-hidden="true"><i></i><i></i><i></i></div>
          </div>
          <div id="cupcakeMatch" class="cupcake-match" aria-label="Độ khớp mẫu">Khớp 0 / 11</div>
        </section>
        <section class="cupcake-tools" aria-label="Dụng cụ làm bánh">
          <div class="cupcake-tool-group"><h3>Kem</h3><div class="cupcake-tool-row" id="cupcakeFrostings">
            ${FROSTINGS.map((item, index) => `<button class="cupcake-tool frosting-tool frosting-${item.id}" data-frosting="${item.id}" type="button" aria-label="Kem ${item.name}, phím ${index + 1}" aria-pressed="false"><span aria-hidden="true"></span><b>${item.name}</b></button>`).join('')}
          </div></div>
          <div class="cupcake-tool-group"><h3>Rắc</h3><div class="cupcake-tool-row" id="cupcakeToppings">
            ${TOPPINGS.map((item, index) => `<button class="cupcake-tool topping-tool topping-${item.id}" data-tool="${item.id}" type="button" aria-label="${item.name}, phím ${String.fromCharCode(65 + index)}" aria-pressed="false"><span aria-hidden="true">${item.mark}</span><b>${item.name}</b></button>`).join('')}
            <button class="cupcake-tool topping-tool topping-erase" data-tool="erase" type="button" aria-label="Tẩy, phím X" aria-pressed="false"><span aria-hidden="true">⌫</span><b>Tẩy</b></button>
          </div></div>
        </section>
        <div class="cupcake-actions">
          <button id="cupcakeUndo" class="cupcake-action" type="button" aria-label="Hoàn tác bước gần nhất, phím U">Lùi bước</button>
          <button id="cupcakeClear" class="cupcake-action" type="button">Dọn bánh</button>
          <button id="cupcakeSubmit" class="cupcake-action cupcake-primary" type="button">Giao bánh</button>
        </div>
        <p class="cupcake-key-help">Phím: 1–3 kem · A–D rắc · X tẩy · U lùi · P tạm dừng</p>
        <p id="cupcakeStatus" class="cupcake-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div id="cupcakeOverlay" class="cupcake-overlay" hidden role="group" aria-label="Trạng thái mẻ bánh">
          <div class="cupcake-overlay-card"><strong id="cupcakeOverlayTitle"></strong><p id="cupcakeOverlayCopy"></p>
            <button id="cupcakeOverlayAction" class="cupcake-action cupcake-primary" type="button"></button>
          </div>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const slots = slotIds.map(el);
    const buttons = [...container.querySelectorAll('button')];
    const icingButtons = buttons.filter(button => button.dataset.frosting);
    const toolButtons = buttons.filter(button => button.dataset.tool);

    function announce(text) { message = text; el('cupcakeStatus').textContent = text; }
    function destroy() {
      if (!alive) return;
      alive = false;
      container.classList.remove('cupcake-host');
      container.innerHTML = '';
    }
    function render() {
      if (!alive) return;
      const v = model.view(), playing = v.status === 'playing', paused = v.status === 'paused';
      const currentRecipe = v.recipe;
      el('cupcakeRound').textContent = v.status === 'won' || v.status === 'lost' ? `${v.orderCount} / ${v.orderCount} đơn` : `Đơn ${v.orderNumber} / ${v.orderCount}`;
      el('cupcakeStars').textContent = `${'★ '.repeat(v.stars)}${'☆ '.repeat(Math.max(0, v.winStars - v.stars))}`.trim();
      el('cupcakeStars').setAttribute('aria-label', `${v.stars} sao, mục tiêu ${v.winStars} sao`);
      el('cupcakeCustomer').textContent = currentRecipe ? v.customer : 'Xong';
      const icing = FROSTINGS.find(item => item.id === currentRecipe?.frosting);
      el('cupcakeRecipeIcing').textContent = icing ? `Kem ${icing.name}` : '';
      const recipeGrid = el('cupcakeRecipeGrid');
      recipeGrid.innerHTML = currentRecipe ? currentRecipe.pattern.map((value, index) => {
        const topping = TOPPINGS.find(item => item.id === value);
        return `<span class="cupcake-recipe-cell${value ? ` recipe-${value}` : ''}" aria-hidden="true">${topping?.mark || ''}</span>`;
      }).join('') : '';
      el('cupcakeRecipeSummary').textContent = currentRecipe
        ? `Mẫu ${v.customer}: kem ${icing?.name}. Ô có topping: ${currentRecipe.pattern.map((value, index) => value ? `${index + 1} ${labelFor(value)}` : '').filter(Boolean).join(', ')}.`
        : 'Đã hoàn thành ba đơn.';
      el('cupcakeTop').className = `cupcake-top icing-${v.frosting}`;
      el('cupcakeTop').setAttribute('aria-label', `Bánh kem ${FROSTINGS.find(item => item.id === v.frosting)?.name || 'vani'}, chín ô trang trí`);
      slots.forEach((button, index) => {
        const value = v.toppings[index];
        const item = TOPPINGS.find(topping => topping.id === value);
        button.disabled = !playing;
        button.tabIndex = index === focusIndex ? 0 : -1;
        button.className = `cupcake-slot${value ? ` slot-${value}` : ''}`;
        button.setAttribute('aria-label', `Vị trí ${index + 1}, ${item?.name || 'trống'}`);
        button.setAttribute('aria-pressed', String(!!value));
        button.textContent = item?.mark || '';
      });
      icingButtons.forEach(button => {
        const value = button.dataset.frosting;
        button.disabled = !playing;
        button.setAttribute('aria-pressed', String(v.frosting === value));
        button.classList.toggle('is-selected', v.frosting === value);
      });
      toolButtons.forEach(button => {
        button.disabled = !playing;
        button.setAttribute('aria-pressed', String(v.selectedTool === button.dataset.tool));
        button.classList.toggle('is-selected', v.selectedTool === button.dataset.tool);
      });
      el('cupcakeMatch').textContent = currentRecipe ? `Khớp ${v.match} / ${v.matchMax} · ${v.starsForOrder}★` : '';
      el('cupcakeMatch').setAttribute('aria-label', currentRecipe ? `Khớp ${v.match} trên ${v.matchMax}, được ${v.starsForOrder} sao nếu giao` : 'Đã xong');
      el('cupcakeUndo').disabled = !playing || !v.canUndo;
      el('cupcakeClear').disabled = !playing;
      el('cupcakeSubmit').disabled = !playing;
      el('cupcakePause').disabled = v.status === 'won' || v.status === 'lost';
      el('cupcakePause').textContent = paused ? '▶' : 'Ⅱ';
      el('cupcakePause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      const overlay = el('cupcakeOverlay');
      overlay.hidden = playing;
      if (paused) {
        el('cupcakeOverlayTitle').textContent = 'Bếp nghỉ một chút';
        el('cupcakeOverlayCopy').textContent = `Đơn ${v.orderNumber} / ${v.orderCount} · ${v.stars} sao`;
        el('cupcakeOverlayAction').textContent = 'Làm tiếp';
      } else if (v.status === 'won' || v.status === 'lost') {
        el('cupcakeOverlayTitle').textContent = v.status === 'won' ? 'Mẻ bánh rực rỡ!' : 'Mẻ bánh đã xong';
        el('cupcakeOverlayCopy').textContent = `${v.stars} sao · ${v.score} điểm · ${v.results.map(item => `${item.customer} ${item.stars}★`).join(' · ')}`;
        el('cupcakeOverlayAction').textContent = 'Làm mẻ mới';
      }
      el('cupcakeStatus').textContent = message;
    }
    function chooseFrosting(value) {
      if (model.selectFrosting(value)) {
        const label = FROSTINGS.find(item => item.id === value)?.name;
        announce(`Đã chọn kem ${label}.`); render();
      }
    }
    function chooseTool(value) {
      if (model.selectTool(value)) { announce(value === 'erase' ? 'Đã chọn tẩy.' : `Đã chọn ${labelFor(value)}.`); render(); }
    }
    function place(index) {
      if (!alive || model.view().status !== 'playing') return;
      focusIndex = index;
      const tool = model.view().selectedTool;
      if (model.place(index)) {
        announce(tool === 'erase' ? `Đã dọn ô ${index + 1}.` : `Đã trang trí ô ${index + 1}: ${labelFor(tool)}.`);
        render();
      }
    }
    function replay() {
      model.restart(); focusIndex = 4; announce('Mẻ mới bắt đầu. Chúc bạn trang trí vui!'); render();
      slots[focusIndex]?.focus({ preventScroll: true });
    }
    function togglePause() {
      if (model.pause()) { announce('Đã tạm dừng.'); render(); }
      else if (model.resume()) { announce('Tiếp tục trang trí.'); render(); }
    }
    function interrupt() {
      if (model.pause()) { announce('Bếp đã tạm nghỉ. Chạm tiếp tục khi sẵn sàng.'); render(); }
    }

    slots.forEach((button, index) => {
      session.listen(button, 'click', () => place(index));
      session.listen(button, 'keydown', event => {
        const delta = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: -1, ArrowRight: 1 }[event.key];
        if (delta === undefined) return;
        event.preventDefault();
        let next = focusIndex + delta;
        if (event.key === 'ArrowLeft' && focusIndex % 3 === 0) next = focusIndex;
        if (event.key === 'ArrowRight' && focusIndex % 3 === 2) next = focusIndex;
        focusIndex = Math.max(0, Math.min(8, next)); render(); slots[focusIndex]?.focus({ preventScroll: true });
      });
    });
    icingButtons.forEach(button => session.listen(button, 'click', () => chooseFrosting(button.dataset.frosting)));
    toolButtons.forEach(button => session.listen(button, 'click', () => chooseTool(button.dataset.tool)));
    session.listen(el('cupcakePause'), 'click', togglePause);
    session.listen(el('cupcakeRestart'), 'click', replay);
    session.listen(el('cupcakeUndo'), 'click', () => { if (model.undo()) { announce('Đã lùi một bước.'); render(); } });
    session.listen(el('cupcakeClear'), 'click', () => { if (model.clear()) { announce('Bánh đã được dọn sạch.'); render(); } });
    session.listen(el('cupcakeSubmit'), 'click', () => {
      const result = model.submit();
      if (!result.accepted) return;
      if (result.status === 'won') announce(`Tuyệt! Cả tiệm nhận ${result.totalStars} sao.`);
      else if (result.status === 'lost') announce(`Mẻ bánh hoàn tất với ${result.totalStars} sao. Mục tiêu là ${M.WIN_STARS}.`);
      else announce(`${result.customer}: ${result.stars} sao (${result.points}/${result.max}). Sang đơn tiếp theo!`);
      render();
    });
    session.listen(el('cupcakeOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') { model.resume(); announce('Tiếp tục trang trí.'); render(); }
      else replay();
    });
    session.listen(root.document, 'keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      if (/^[1-3]$/.test(event.key)) { event.preventDefault(); chooseFrosting(FROSTINGS[Number(event.key) - 1].id); }
      else if (/^[a-d]$/i.test(event.key)) { event.preventDefault(); chooseTool(TOPPINGS[event.key.toLowerCase().charCodeAt(0) - 97].id); }
      else if (event.key.toLowerCase() === 'x') { event.preventDefault(); chooseTool('erase'); }
      else if (event.key.toLowerCase() === 'u') { event.preventDefault(); if (model.undo()) { announce('Đã lùi một bước.'); render(); } }
      else if (event.key.toLowerCase() === 'p' && model.view().status !== 'won' && model.view().status !== 'lost') { event.preventDefault(); togglePause(); }
    });
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    session.listen(root, 'blur', interrupt);
    session.listen(root, 'pagehide', interrupt);
    session.onCleanup(destroy);
    render(); slots[focusIndex]?.focus({ preventScroll: true });
    return { getModel: () => model, destroy };
  }

  root.NP_CupcakeStudio = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

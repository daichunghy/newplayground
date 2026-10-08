/* Original Vietnamese lemonade campaign; player makes only recipe and price choices. */
(function (root) {
  'use strict';
  const SAVE_KEY = 'np_quay_nuoc_chanh_campaign_v1';
  function mount(container, session, options = {}) {
    const M = root.NP_LemonadeStandModel;
    if (!M) throw new Error('Quầy Nước Chanh rules are not ready');
    if (!session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Quầy Nước Chanh needs an active game session');
    }
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    const hasCustomModel = Object.keys(options).some(key => key !== 'campaign' && key !== 'storage');
    const campaignEnabled = options.campaign === true || !hasCustomModel;
    let progress = { unlockedDay: 0, bestProfits: Array(M.DAYS.length).fill(null), bestCups: Array(M.DAYS.length).fill(null) };
    let saveDisabled = false, saveNote = '', dayIndex = 0, completionRecorded = false, savedCampaignSeed = null;
    let storage = options.storage || null;
    if (campaignEnabled) {
      try {
        if (!storage) storage = root.localStorage;
        const raw = storage.getItem(SAVE_KEY);
        if (raw !== null) {
          let parsed;
          try { parsed = JSON.parse(raw); } catch (_) { parsed = null; }
          if (parsed && Number.isInteger(parsed.version) && parsed.version > 1) {
            saveDisabled = true; saveNote = 'Bản lưu mới hơn được giữ nguyên.';
          } else if (parsed && parsed.version === 1 && Number.isInteger(parsed.unlockedDay)
            && parsed.unlockedDay >= 0 && parsed.unlockedDay < M.DAYS.length
            && Array.isArray(parsed.bestProfits) && parsed.bestProfits.length === M.DAYS.length
            && parsed.bestProfits.every(value => value === null || (Number.isSafeInteger(value) && value >= 0))
            && Array.isArray(parsed.bestCups) && parsed.bestCups.length === M.DAYS.length
            && parsed.bestCups.every(value => value === null || (Number.isSafeInteger(value) && value >= 0))
            && (parsed.campaignSeed === undefined || (typeof parsed.campaignSeed === 'string' && parsed.campaignSeed.length <= 128))
            && parsed.bestProfits.every((value, index) => (value === null) === (parsed.bestCups[index] === null))) {
            progress = { unlockedDay: parsed.unlockedDay, bestProfits: parsed.bestProfits.slice(), bestCups: parsed.bestCups.slice() };
            savedCampaignSeed = parsed.campaignSeed ?? null;
          } else {
            if (storage.getItem(`${SAVE_KEY}_recovery`) === null) storage.setItem(`${SAVE_KEY}_recovery`, raw);
            saveNote = 'Bản lưu lỗi đã được giữ lại.';
          }
        }
      } catch (_) { saveDisabled = true; saveNote = 'Tiến trình chỉ lưu trong lượt này.'; }
    }
    dayIndex = campaignEnabled ? progress.unlockedDay : 0;
    const campaignSeed = String(options.seed ?? savedCampaignSeed ?? Date.now());
    const createDayModel = index => M.createDay(index, { seed: `${campaignSeed}-${index}` });
    let model = campaignEnabled ? createDayModel(dayIndex) : M.create(options);
    let alive = true, frame = null, previous = null;
    container.classList.add('ls-host');
    container.innerHTML = `
      <section id="lsGame" class="ls-game" aria-label="Quầy Nước Chanh" tabindex="0">
        <header class="ls-header"><div><p id="lsDayName" class="ls-kicker"></p><h2>Quầy Nước Chanh</h2></div><button id="lsRestart" class="ls-button" type="button">Chơi lại</button></header>
        <nav id="lsDays" class="ls-day-nav" aria-label="Chặng tuần quầy chanh">${M.DAYS.map((day, index) =>
          `<button id="lsDay${index}" class="ls-button ls-day" type="button" aria-label="Ngày ${index + 1}: ${day.name}" aria-current="${index === dayIndex ? 'step' : 'false'}" ${index > progress.unlockedDay ? 'disabled' : ''}>${index + 1}</button>`
        ).join('')}</nav>
        <div class="ls-weather"><strong id="lsWeather"></strong><strong id="lsTime" class="ls-time"></strong></div>
        <progress id="lsProgress" class="ls-progress" max="45" value="45" aria-label="Thời gian ca"></progress>
        <div class="ls-stand" aria-hidden="true"><div class="ls-awning"></div><span id="lsPerson" class="ls-person"></span><span id="lsQuote" class="ls-quote">·</span><span class="ls-lemon"></span><div class="ls-counter"><span class="ls-jar">◒</span><span class="ls-jar">◒</span></div></div>
        <div class="ls-stats"><div class="ls-stat"><span>Khách</span><strong id="lsCustomers">0</strong></div><div class="ls-stat"><span>Đã bán</span><strong id="lsSold">0</strong></div><div class="ls-stat"><span>Lãi</span><strong id="lsProfit">0</strong></div></div>
        <div class="ls-goal"><span id="lsGoalLabel"></span><progress id="lsGoalProgress" max="120" value="0" aria-label="Tiến độ lãi"></progress><small id="lsBest" hidden></small></div>
        <p class="ls-recipe-title">Chanh · đường · đá</p><div class="ls-recipes">
          <button id="lsTart" class="ls-recipe" data-recipe="tart" type="button" aria-pressed="false"><span>Chua dịu</span><small>3 · 1 · 3</small></button>
          <button id="lsBalanced" class="ls-recipe" data-recipe="balanced" type="button" aria-pressed="true"><span>Vừa miệng</span><small>3 · 2 · 2</small></button>
          <button id="lsSweet" class="ls-recipe" data-recipe="sweet" type="button" aria-pressed="false"><span>Ngọt thanh</span><small>2 · 3 · 2</small></button>
        </div>
        <div class="ls-price-row"><button id="lsPriceDown" class="ls-button" type="button" aria-label="Giảm giá">−</button><div class="ls-price"><small id="lsPriceLabel">Giá bán · vốn 5</small><strong id="lsPrice">12</strong></div><button id="lsPriceUp" class="ls-button" type="button" aria-label="Tăng giá">+</button></div>
        <p id="lsStatus" class="ls-status" role="status" aria-live="polite" aria-atomic="true">Đang bán.</p>
        <div id="lsResult" class="ls-result" hidden><strong id="lsResultTitle"></strong><span id="lsResultText"></span></div>
        <button id="lsNext" class="ls-button ls-primary ls-next" type="button" hidden>Ngày tiếp</button>
        <p id="lsSaveNote" class="ls-save-note" role="status" aria-live="polite" hidden></p>
        <p class="ls-footer">← → đổi giá · 1–3 chọn vị</p>
      </section>`;
    const el = id => container.querySelector(`#${id}`);
    const recipeButtons = { tart: el('lsTart'), balanced: el('lsBalanced'), sweet: el('lsSweet') };
    function persistProgress() {
      if (!campaignEnabled || saveDisabled) return;
      try {
        storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, campaignSeed, unlockedDay: progress.unlockedDay,
          bestProfits: progress.bestProfits, bestCups: progress.bestCups }));
      } catch (_) { saveDisabled = true; saveNote = 'Tiến trình chỉ lưu trong lượt này.'; }
    }
    function recordEnd(view) {
      if (!campaignEnabled || completionRecorded || view.status === 'playing') return;
      completionRecorded = true;
      const bestProfit = progress.bestProfits[dayIndex];
      const bestCups = progress.bestCups[dayIndex];
      if (bestProfit === null || view.profit > bestProfit
        || (view.profit === bestProfit && (bestCups === null || view.sold > bestCups))) {
        progress.bestProfits[dayIndex] = view.profit;
        progress.bestCups[dayIndex] = view.sold;
      }
      if (view.status === 'won') progress.unlockedDay = Math.max(progress.unlockedDay, Math.min(M.DAYS.length - 1, dayIndex + 1));
      persistProgress();
    }
    function loadDay(index) {
      if (!campaignEnabled || index < 0 || index > progress.unlockedDay || index >= M.DAYS.length) return false;
      stopLoop(); dayIndex = index; model = createDayModel(dayIndex); completionRecorded = false;
      render(); el('lsGame')?.focus?.(); return true;
    }
    function restartDay() {
      if (campaignEnabled) model = createDayModel(dayIndex);
      else model.restart();
      stopLoop(); completionRecorded = false; render(); el('lsGame')?.focus?.();
    }
    function announce(view) {
      if (view.status === 'won') return dayIndex === M.DAYS.length - 1 ? 'Hoàn tất tuần!' : `Qua ngày ${dayIndex + 1}!`;
      if (view.status === 'lost') return 'Hết giờ. Chơi lại nhé.';
      if (view.lastEvent === 'sale') return 'Một ly mát lành đã bán!';
      if (view.lastEvent === 'pass') return 'Khách tìm vị khác.';
      if (view.lastEvent === 'weather') return 'Thời tiết vừa đổi.';
      if (view.lastEvent === 'price') return `Giá mới: ${view.price}.`;
      if (view.lastEvent === 'recipe') return `Đổi sang vị ${view.recipeName.toLowerCase()}.`;
      return 'Đang bán.';
    }
    function render() {
      if (!alive) return;
      const v = model.view();
      recordEnd(v);
      el('lsDayName').textContent = campaignEnabled ? `Ngày ${dayIndex + 1}/${M.DAYS.length} · ${M.DAYS[dayIndex].name}` : 'MỘT CA NẮNG';
      el('lsDays').hidden = !campaignEnabled;
      M.DAYS.forEach((day, index) => {
        const button = el(`lsDay${index}`);
        button.disabled = !campaignEnabled || index > progress.unlockedDay;
        button.setAttribute('aria-current', index === dayIndex ? 'step' : 'false');
        button.setAttribute('aria-label', `Ngày ${index + 1}: ${day.name}${progress.bestProfits[index] === null ? '' : `, kỷ lục lãi ${progress.bestProfits[index]}`}`);
      });
      el('lsNext').hidden = !campaignEnabled || v.status !== 'won' || dayIndex >= M.DAYS.length - 1;
      el('lsSaveNote').textContent = saveNote;
      el('lsSaveNote').hidden = !saveNote;
      el('lsWeather').textContent = `${v.weatherMark} ${v.weatherName}`;
      el('lsTime').textContent = `${v.remaining}s`;
      el('lsProgress').value = v.remaining;
      el('lsCustomers').textContent = String(v.customers);
      el('lsSold').textContent = String(v.sold);
      el('lsProfit').textContent = String(v.profit);
      el('lsGoalLabel').textContent = `Mục tiêu ${v.target}`;
      el('lsGoalProgress').max = v.target;
      el('lsGoalProgress').setAttribute('aria-label', `Tiến độ lãi đến ${v.target}`);
      el('lsGoalProgress').value = Math.max(0, Math.min(v.target, v.profit));
      const bestProfit = progress.bestProfits[dayIndex], bestCups = progress.bestCups[dayIndex];
      el('lsBest').textContent = bestProfit === null ? '' : `Kỷ lục lãi ${bestProfit} · ${bestCups} ly`;
      el('lsBest').hidden = !campaignEnabled || bestProfit === null;
      el('lsPriceLabel').textContent = `Giá bán · vốn ${v.recipeCost}`;
      el('lsPrice').textContent = String(v.price);
      const marks = { sale: '✓', pass: '×', weather: '☼', price: '↔', recipe: '✦', quiet: '·', open: '·' };
      el('lsQuote').textContent = marks[v.lastEvent] || '·';
      el('lsPerson').classList.toggle('ls-happy', v.lastEvent === 'sale');
      el('lsPerson').classList.toggle('ls-away', v.lastEvent === 'pass');
      for (const id of M.RECIPE_IDS) {
        const button = recipeButtons[id];
        button.setAttribute('aria-pressed', String(v.recipe === id));
        button.disabled = !v.canAdjust;
      }
      el('lsPriceDown').disabled = !v.canAdjust || v.price <= M.MIN_PRICE;
      el('lsPriceUp').disabled = !v.canAdjust || v.price >= M.MAX_PRICE;
      el('lsRestart').disabled = false;
      el('lsStatus').textContent = announce(v);
      el('lsResult').hidden = v.status === 'playing';
      if (v.status !== 'playing') {
        el('lsResultTitle').textContent = v.status === 'won'
          ? (dayIndex === M.DAYS.length - 1 ? `Tuần xong ${M.DAYS.length} ngày!` : `Ngày ${dayIndex + 1} đạt mục tiêu!`)
          : 'Ca vừa khép lại';
        el('lsResultText').textContent = `Lãi ${v.profit} · ${v.sold} ly`;
        stopLoop();
      } else schedule();
    }
    function stopLoop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; previous = null;
    }
    function schedule() { if (alive && frame === null && model.view().status === 'playing') frame = requestAnimationFrame(animate); }
    function animate(time) {
      frame = null;
      if (!alive || model.view().status !== 'playing') return;
      const delta = previous === null ? 0 : Math.max(0, Math.min(.1, (time - previous) / 1000));
      previous = time;
      if (delta) { model.tick(delta); render(); }
      else schedule();
    }
    function update(action) { if (!alive) return; action(); render(); }
    listen(el('lsPriceDown'), 'click', () => update(() => model.adjustPrice(-1)));
    listen(el('lsPriceUp'), 'click', () => update(() => model.adjustPrice(1)));
    listen(el('lsRestart'), 'click', restartDay);
    listen(el('lsNext'), 'click', () => loadDay(dayIndex + 1));
    M.DAYS.forEach((_, index) => listen(el(`lsDay${index}`), 'click', () => loadDay(index)));
    for (const id of M.RECIPE_IDS) listen(recipeButtons[id], 'click', () => update(() => model.setRecipe(id)));
    listen(container, 'keydown', event => {
      if (['button', 'input', 'select', 'textarea'].includes(String(event.target?.tagName || '').toLowerCase())) return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key?.toLowerCase();
      if (key === 'arrowleft') { update(() => model.adjustPrice(-1)); event.preventDefault?.(); }
      else if (key === 'arrowright') { update(() => model.adjustPrice(1)); event.preventDefault?.(); }
      else if (['1', '2', '3'].includes(key)) { update(() => model.setRecipe(M.RECIPE_IDS[Number(key) - 1])); event.preventDefault?.(); }
    });
    listen(root, 'blur', stopLoop);
    listen(root, 'focus', schedule);
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) stopLoop(); else schedule(); });
    onCleanup(() => { alive = false; stopLoop(); container.classList.remove('ls-host'); });
    render();
    return Object.freeze({ getModel: () => model, close: stopLoop });
  }
  root.NP_LemonadeStand = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);

/* Hàng Rong simple play: cook a dish, tap its customer. Saves retain the hr3 schema. */
(function () {
  'use strict';
  const KEY = 'np_hangrong_save_v3', LEGACY = 'np_hangrong_save_v2', BACKUP = KEY + '_backup';
  const ART = 'assets/sprites/hangrong/atlas.svg';
  const MENUS = [ ['banhmi_trung', 'tra_da'], ['cavien_chien', 'nuoc_mia'], ['nemchua_ran', 'tra_chanh'],
    ['banhtrang_nuong', 'trasua_topping', 'lau_ly'], ['banhtrang_nuong', 'trasua_topping', 'lau_ly'] ];
  function mount(container, session, audio) {
    const M = window.NP_HangRongModel;
    const { listen, requestAnimationFrame, cancelAnimationFrame, setTimeout, onCleanup } = session;
    let model, alive = true, raf = null, previous = null, lastSave = 0, lastRender = 0;
    let saveDisabled = false, audioReady = false, warning = '', helpOpen = false, previousPhase = null;
    try {
      const source = localStorage.getItem(KEY);
      if (source) {
        try { model = M.restore(JSON.parse(source)); } catch (_) {}
        if (!model) {
          try { model = M.restore(JSON.parse(localStorage.getItem(BACKUP) || 'null')); } catch (_) {}
          saveDisabled = true; warning = 'Bản lưu lỗi được giữ nguyên. Phiên này chưa lưu.';
        }
      } else {
        let old;
        try { old = JSON.parse(localStorage.getItem(LEGACY) || 'null'); } catch (_) { warning = 'Bản lưu cũ được giữ. Đang chơi mới.'; }
        const migrated = M.migrate(old);
        if (migrated) model = M.create({ profile: migrated });
        else if (old) warning = 'Bản lưu cũ được giữ. Đang chơi mới.';
      }
    } catch (_) { saveDisabled = true; warning = 'Không lưu được. Bạn vẫn chơi được.'; }
    model ||= M.create();
    const picture = (id, type = 'food') => `<svg class="hr3-art" viewBox="0 0 96 72" aria-hidden="true" focusable="false"><use href="${ART}#${type}-${id}"></use></svg>`;
    container.classList.add('hr3-host');
    container.innerHTML = `<section class="hr3-game" aria-label="Hàng Rong">
      <header class="hr3-header"><h3>Hàng Rong</h3><div><button class="hr3-button" id="hr3Help" type="button" aria-label="Cách chơi" aria-expanded="false" aria-controls="hr3HelpText">?</button><button class="hr3-button" id="hr3Pause" type="button" aria-label="Tạm dừng">Ⅱ</button></div></header>
      <p class="hr3-help" id="hr3HelpText" hidden>Chạm món để nấu, chạm khách để giao. Phím 1–3: nấu; Q/W/E/R: giao; P: tạm dừng.</p>
      <p class="hr3-storage" id="hr3Storage" hidden></p>
      <div id="hr3Service"><div class="hr3-hud"><strong id="hr3Goal"></strong><span id="hr3Clock" aria-label="Thời gian ca còn lại"></span></div>
        <div class="hr3-play-wrap"><div class="hr3-scene" id="hr3Scene">
          <div class="hr3-awning" aria-hidden="true"></div>
          <div class="hr3-customers" id="hr3Customers">${Array.from({ length: 4 }, (_, i) => `<button class="hr3-customer" id="hr3Customer${i}" type="button"><span class="hr3-order" id="hr3Order${i}"></span><span class="hr3-portrait" id="hr3Portrait${i}"></span><strong id="hr3CustomerName${i}"></strong><span class="hr3-customer-hint" id="hr3CustomerHint${i}"></span><progress id="hr3Patience${i}" max="100" value="100" aria-label="Thời gian khách còn chờ"></progress></button>`).join('')}</div>
          <div class="hr3-counter">
            <div class="hr3-recipes" id="hr3Recipes">${Array.from({ length: 3 }, (_, i) => `<button class="hr3-recipe" id="hr3Cook${i}" type="button"><span id="hr3CookArt${i}"></span><strong id="hr3CookName${i}"></strong><small id="hr3CookHint${i}"></small></button>`).join('')}</div>
            <div class="hr3-stations" aria-label="Bếp tự chuyển món đã xong lên khay">${[0, 1].map(i => `<div class="hr3-station" id="hr3Station${i}"><span id="hr3StationArt${i}"></span><progress id="hr3CookProgress${i}" max="100" value="0" aria-label="Tiến độ chế biến trạm ${i + 1}"></progress></div>`).join('')}</div>
            <div class="hr3-tray" id="hr3Tray" role="list" aria-label="Món sẵn sàng">${Array.from({ length: 4 }, (_, i) => `<div class="hr3-dish" id="hr3Dish${i}" role="listitem"><span id="hr3DishArt${i}"></span><span class="hr3-sr-only" id="hr3DishName${i}"></span></div>`).join('')}</div>
          </div>
        </div><div class="hr3-pause-cover" id="hr3PauseCover" hidden><h4>Tạm nghỉ</h4><button class="hr3-button hr3-primary" id="hr3Resume" type="button">Chơi tiếp</button></div></div>
      </div>
      <div class="hr3-result" id="hr3Result" hidden><div class="hr3-stars" id="hr3Stars"></div><h4 id="hr3ResultTitle" tabindex="-1"></h4><p class="hr3-unlock" id="hr3Unlock" hidden></p><button class="hr3-button hr3-primary" id="hr3Next" type="button">Chơi tiếp</button></div>
      <p class="hr3-status" id="hr3Status" role="status" aria-live="polite" aria-atomic="true">Chạm món để nấu.</p>
    </section>`;
    const nodes = new Map(), artCache = new Map(), lastCook = new Map();
    const el = id => { if (!nodes.has(id)) nodes.set(id, container.querySelector('#hr3' + id)); return nodes.get(id); };
    function setArt(id, value) { if (artCache.get(id) !== value) { el(id).innerHTML = value; artCache.set(id, value); } }
    const notice = message => { el('Status').textContent = message; };
    function storageNotice(message) { el('Storage').hidden = false; el('Storage').textContent = message; }
    if (warning) storageNotice(warning);
    function save() {
      if (!alive || saveDisabled) return;
      try {
        const current = localStorage.getItem(KEY);
        if (current) { let valid = false; try { valid = !!M.restore(JSON.parse(current)); } catch (_) {} if (valid) localStorage.setItem(BACKUP, current); }
        localStorage.setItem(KEY, JSON.stringify(model.serialize()));
      } catch (_) { saveDisabled = true; storageNotice('Không lưu được. Bạn vẫn chơi được.'); }
    }
    function unlockAudio() {
      if (!audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      try { audio.init(); audioReady = true; if (audio.ctx?.state === 'suspended') audio.ctx.resume().catch(() => {}); } catch (_) {}
    }
    function sound(kind) {
      if (!alive || !audioReady || !audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      const tones = kind === 'serve' ? [660, 880] : kind === 'result' ? [523, 659, 784] : [740];
      tones.forEach((tone, i) => setTimeout(() => { try { audio.playTone(tone, 'sine', .09, .035); } catch (_) {} }, i * 75));
    }
    function prepare() {
      if (model.view().phase === 'result') model.next();
      if (model.view().phase !== 'prep') return;
      const menu = MENUS[model.view().stageIndex];
      // Routine choices happen between shifts; active/restored shifts keep their exact saved menu.
      for (const id of [...model.view().profile.menu]) if (!menu.includes(id) && model.view().profile.menu.length > 1) model.menu(id);
      for (const id of menu) if (!model.view().profile.menu.includes(id)) {
        if (model.view().profile.menu.length === 3) model.menu(model.view().profile.menu.find(x => !menu.includes(x)));
        model.menu(id);
      }
      for (const id of [...model.view().profile.menu]) if (!menu.includes(id)) model.menu(id);
      model.restock(); model.begin(); model.drainEvents();
    }
    function collectReady() {
      if (model.view().phase !== 'playing') return;
      for (let i = 0; i < 2; i++) if (model.view().shift.jobs[i]?.remaining === 0) model.collect(i);
    }
    function consumeEvents() {
      const events = model.drainEvents();
      for (const event of events) {
        if (event.type === 'ready') { notice('Món xong! Chạm khách để giao.'); sound('ready'); }
        if (event.type === 'serve') { notice('Ngon quá!'); sound('serve'); }
        if (event.type === 'miss') notice('Khách đi rồi.');
        if (event.type === 'result') { sound('result'); notice(''); }
      }
      return events.length;
    }
    function needDish(v, id) {
      if (v.phase !== 'playing' || !id) return false;
      const s = v.shift;
      return s.customers.filter(c => c.recipe === id).length > s.jobs.concat(s.tray).filter(d => d?.recipe === id).length;
    }
    function update() { collectReady(); consumeEvents(); render(); save(); schedule(); }
    function cook(i) {
      if (!alive || helpOpen) return;
      const v = model.view(), id = v.profile.menu[i]; if (!needDish(v, id)) return;
      const time = performance.now(); if (lastCook.has(i) && time - lastCook.get(i) < 180) return;
      if (v.shift.jobs.every(Boolean)) return;
      lastCook.set(i, time); unlockAudio(); model.ensureIngredients(id); const reply = model.cook(id);
      if (!reply.ok) { if (reply.reason === 'busy') notice('Bếp đang nấu.'); return; }
      notice('Đang nấu…'); update();
    }
    function serve(i) {
      if (!alive || helpOpen) return;
      const v = model.view(); if (v.phase !== 'playing') return;
      const c = v.shift.customers.find(c => c.seat === i); if (!c) return;
      const dish = v.shift.tray.find(d => d.recipe === c.recipe);
      if (!dish) { notice(v.shift.jobs.some(d => d?.recipe === c.recipe) ? 'Đợi món một chút…' : 'Chạm món bên dưới để nấu.'); return; }
      unlockAudio(); model.serve(dish.id, c.id); update();
    }
    function render() {
      const v = model.view(), p = v.profile, s = v.shift, active = ['playing', 'paused'].includes(v.phase), paused = v.phase === 'paused';
      el('Service').hidden = !active; el('Result').hidden = v.phase !== 'result'; el('Pause').hidden = !active;
      el('PauseCover').hidden = !paused; el('Scene').inert = paused; el('Scene').setAttribute('aria-hidden', String(paused));
      el('Pause').textContent = paused ? '▶' : 'Ⅱ'; el('Pause').setAttribute('aria-label', paused ? 'Chơi tiếp' : 'Tạm dừng');
      if (active) {
        el('Goal').textContent = `Giao ${s.served}/${s.plan.orders.length} · cần ${s.plan.quota}`;
        const seconds = Math.ceil(Math.max(0, s.plan.duration + s.plan.grace - s.elapsed) / 1000);
        el('Clock').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        const rain = s.plan.rainAt !== null && s.elapsed >= s.plan.rainAt && s.elapsed < s.plan.rainAt + 12000;
        el('Scene').classList.toggle('hr3-rain', rain); el('Customers').classList.toggle('hr3-four-seats', p.upgrades.extraChair);
        for (let i = 0; i < 4; i++) {
          const c = s.customers.find(c => c.seat === i), button = el('Customer' + i), ready = c && s.tray.some(d => d.recipe === c.recipe);
          button.hidden = i >= (p.upgrades.extraChair ? 4 : 2); button.disabled = !c || paused;
          setArt('Order' + i, c ? picture(c.recipe) : ''); setArt('Portrait' + i, c ? picture(c.person, 'person') : '');
          el('CustomerName' + i).textContent = c ? M.RECIPES[c.recipe].name : '';
          el('CustomerHint' + i).textContent = c ? ready ? 'Giao' : 'Đợi món' : '';
          el('Patience' + i).hidden = !c; el('Patience' + i).value = c ? 100 * c.remaining / c.max : 0;
          button.classList.toggle('hr3-match', !!ready); button.classList.toggle('hr3-urgent', !!c && c.remaining <= c.max * .3);
          button.setAttribute('aria-label', c ? `${M.CUSTOMERS[c.person].name}: ${M.RECIPES[c.recipe].name}, còn ${Math.ceil(c.remaining / 1000)} giây. ${ready ? 'Chạm để giao.' : 'Chưa có món sẵn.'}` : 'Ghế trống');
          const dish = s.tray[i]; setArt('DishArt' + i, dish ? picture(dish.recipe) : '');
          el('DishName' + i).textContent = dish ? `${M.RECIPES[dish.recipe].name}, sẵn sàng` : 'Khay trống';
          el('Dish' + i).classList.toggle('hr3-empty', !dish);
        }
        el('Recipes').style.setProperty('--hr3-dishes', p.menu.length);
        for (let i = 0; i < 3; i++) {
          const id = p.menu[i], button = el('Cook' + i); button.hidden = !id; if (!id) continue;
          setArt('CookArt' + i, picture(id)); el('CookName' + i).textContent = M.RECIPES[id].name;
          const needed = needDish(v, id), busy = s.jobs.every(Boolean);
          button.disabled = paused || !needed || busy;
          const cooking = s.jobs.some(d => d?.recipe === id), ready = s.tray.some(d => d.recipe === id);
          el('CookHint' + i).textContent = cooking ? 'Đang nấu' : ready ? 'Đã xong' : needed ? 'Nấu' : '';
          button.setAttribute('aria-label', `Nấu ${M.RECIPES[id].name}, phím ${i + 1}`);
        }
        for (let i = 0; i < 2; i++) {
          const job = s.jobs[i]; setArt('StationArt' + i, job ? picture(job.recipe) : '');
          el('CookProgress' + i).value = job ? 100 * (1 - job.remaining / job.total) : 0;
          el('Station' + i).classList.toggle('hr3-cooking', !!job);
        }
      }
      if (v.phase === 'result') {
        el('Stars').textContent = '★'.repeat(v.result.stars) + '☆'.repeat(3 - v.result.stars);
        el('Stars').setAttribute('aria-label', `${v.result.stars} trên 3 sao`);
        el('ResultTitle').textContent = v.result.won ? 'Xong ca!' : 'Thử lại nhé';
        const previousStage = M.stageFor(v.result.previousLevel), stage = M.stageFor(v.result.level);
        const unlocks = [];
        if (v.result.unlocked.length) unlocks.push(`Khu mới: ${v.result.unlocked.join(' · ')}`);
        const newRecipes = MENUS[stage].filter(id => !MENUS[previousStage].includes(id));
        if (newRecipes.length) unlocks.push(`Món mới: ${newRecipes.map(id => M.RECIPES[id].name).join(' · ')}`);
        el('Unlock').textContent = unlocks.join(' — ');
        el('Unlock').hidden = unlocks.length === 0;
        el('Next').textContent = v.result.won ? 'Chơi tiếp' : 'Thử lại';
        if (previousPhase !== 'result') el('ResultTitle').focus();
      }
      previousPhase = v.phase;
    }
    function stopLoop() { cancelAnimationFrame(raf); raf = null; previous = null; }
    function schedule() { if (alive && model.view().phase === 'playing' && raf === null) raf = requestAnimationFrame(frame); else if (model.view().phase !== 'playing') stopLoop(); }
    function frame(timestamp) {
      raf = null; if (!alive || model.view().phase !== 'playing') return;
      if (previous !== null) model.step(Math.max(0, Math.min(250, timestamp - previous)));
      previous = timestamp; collectReady(); const changed = consumeEvents();
      if (changed || timestamp - lastRender >= 100) { render(); lastRender = timestamp; }
      if (changed || timestamp - lastSave >= 2000 || model.view().phase === 'result') { save(); lastSave = timestamp; }
      schedule();
    }
    function pause() { if (model.view().phase !== 'playing') return; model.pause(); render(); save(); stopLoop(); el('Resume').focus(); }
    function togglePause() {
      if (model.view().phase === 'paused') { if (helpOpen) toggleHelp(); model.resume(); notice(''); update(); el('Pause').focus(); }
      else pause();
    }
    function toggleHelp() { helpOpen = !helpOpen; el('HelpText').hidden = !helpOpen; el('Help').setAttribute('aria-expanded', String(helpOpen)); if (helpOpen) pause(); }
    for (let i = 0; i < 3; i++) listen(el('Cook' + i), 'click', () => cook(i));
    for (let i = 0; i < 4; i++) listen(el('Customer' + i), 'click', () => serve(i));
    listen(el('Pause'), 'click', togglePause); listen(el('Resume'), 'click', togglePause); listen(el('Help'), 'click', toggleHelp);
    listen(el('Next'), 'click', () => { if (!alive || model.view().phase !== 'result') return; lastCook.clear(); helpOpen = false; el('HelpText').hidden = true; el('Help').setAttribute('aria-expanded', 'false'); prepare(); notice('Chạm món để nấu.'); update(); el('Cook0').focus(); });
    listen(container, 'keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      const key = e.key?.toLowerCase();
      if (key === 'p') { e.preventDefault(); togglePause(); return; }
      if (helpOpen || model.view().phase !== 'playing') return;
      if (['1', '2', '3'].includes(key)) { e.preventDefault(); cook(Number(key) - 1); }
      else { const i = ['q', 'w', 'e', 'r'].indexOf(key); if (i >= 0) { e.preventDefault(); serve(i); } }
    });
    listen(window, 'blur', pause); listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
    listen(window, 'pagehide', () => { pause(); save(); });
    onCleanup(() => { if (!alive) return; model.pause(); save(); alive = false; stopLoop(); container.classList.remove('hr3-host'); });
    prepare(); render(); save(); schedule();
  }
  window.NP_HangRong = { mount };
})();

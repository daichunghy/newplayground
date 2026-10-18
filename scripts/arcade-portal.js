/* Static arcade entry point. app.js remains the legacy reference, not a second
 * running portal. Existing NP_Engines and their session-owned resources are kept.
 */
(function () {
  'use strict';
  const C = window.NP_ArcadeCore;
  if (!C) return;
  let storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  const catalog = Array.isArray(window.__NP_GAMES_CACHE__) ? window.__NP_GAMES_CACHE__.filter(g => g && typeof g.id === 'string' && typeof g.title === 'string') : [];
  const byId = new Map(catalog.map(g => [g.id,g]));
  let favorites = C.cleanIds(C.read(storage,'np_favorites',[]),catalog);
  let recent = C.cleanIds(C.read(storage,'np_recent_v2',[]),catalog,12);
  let query = '', filter = 'all', limit = 24, active = null, priorFocus = null, priorOverflow = '';
  let toastTimer = null, stageObserver = null, initialized = false;
  const thumbs = new Map();
  const $ = id => document.getElementById(id);
  const visible = el => !!el && el.getClientRects().length > 0;
  const thumb = g => { if(!thumbs.has(g.id)) thumbs.set(g.id,C.cover(g)); return thumbs.get(g.id); };
  function toast(message) {
    const el = $('toastBox'); if(!el) return;
    el.textContent = String(message); el.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('visible'),2800);
  }
  window.showToastNotification = toast;
  function card(g, small = false) {
    const p = C.profile(g), saved = favorites.includes(g.id), el = document.createElement('article');
    el.className = 'game-card' + (small?' game-card-small':''); el.dataset.id=g.id;
    el.style.setProperty('--card-surface',p.surface); el.style.setProperty('--card-accent',p.accent);
    el.innerHTML = `<button type="button" class="game-launch" data-play="${C.escape(g.id)}" aria-label="Chơi ${C.escape(p.title)}"><span class="card-media"><img src="${C.escape(thumb(g))}" alt="" width="400" height="260" loading="lazy" decoding="async"><span class="card-play-cue">${C.icon('play')}</span></span><span class="card-info"><span class="card-category">${C.escape(g.category)}${p.experimental?' · Bản thử thể loại':''}</span><span class="card-title">${C.escape(p.title)}</span><span class="card-caption">${C.escape(p.objective)}</span></span></button><button type="button" class="card-save ${saved?'is-saved':''}" data-save="${C.escape(g.id)}" aria-label="${saved?'Bỏ thích':'Yêu thích'} ${C.escape(p.title)}" aria-pressed="${saved}">${C.icon('heart')}</button>`;
    return el;
  }
  function syncFavoriteButtons() {
    document.querySelectorAll('[data-save]').forEach(button => {
      const id=button.dataset.save, game=byId.get(id); if(!game) return;
      const saved=favorites.includes(id);
      button.classList.toggle('is-saved',saved); button.setAttribute('aria-pressed',String(saved));
      button.setAttribute('aria-label',`${saved?'Bỏ thích':'Yêu thích'} ${C.profile(game).title}`);
    });
    if($('favCount')) $('favCount').textContent=String(favorites.length);
    if($('roomFavorite') && active) {
      const saved=favorites.includes(active.id), button=$('roomFavorite');
      button.classList.toggle('is-saved',saved); button.setAttribute('aria-pressed',String(saved));
      button.title=button.getAttribute('aria-label')||'';
    }
  }
  function renderRecent() {
    const region=$('recentSection'), grid=$('recentGames'); if(!region||!grid)return;
    region.hidden=!recent.length || !!query || filter!=='all';
    grid.replaceChildren(...recent.slice(0,6).map(id=>card(byId.get(id),true)));
  }
  function render() {
    const grid=$('gridAll'); if(!grid)return;
    const list=C.select(catalog,query,filter,favorites,recent);
    grid.replaceChildren(...list.slice(0,limit).map(g=>card(g)));
    grid.querySelectorAll('img').forEach((img,i)=>{if(i<6)img.loading='eager';});
    const titles={all:'Chọn một trò, vào chơi ngay',favorites:'Những game bạn đã thích',recent:'Game vừa chơi',experimental:'Thử một thể loại mới'};
    $('allSectionTitle').textContent=query ? `Tìm game “${query}”` : titles[filter]||filter;
    $('resultsCount').textContent=`${list.length} game`;
    $('loadMoreBtn').hidden=list.length<=limit;
    $('loadMoreBtn').textContent=`Xem thêm ${Math.min(24,Math.max(0,list.length-limit))} game`;
    $('noResultsBlock').hidden=list.length>0;
    $('emptyTitle').textContent=filter==='favorites'&&!query?'Danh sách này đang chờ game đầu tiên':filter==='recent'&&!query?'Chưa có game nào vừa chơi':'Chưa tìm thấy game phù hợp';
    $('emptyDescription').textContent=filter==='favorites'&&!query?'Bấm trái tim trên một game để giữ lại ở đây.':'Thử tên ngắn hơn hoặc quay lại tất cả trò chơi.';
    $('clearSearchBtn').hidden=!query;
    $('portalIntro').hidden=!!query || filter!=='all';
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
    renderRecent(); syncFavoriteButtons();
  }
  function chooseFilter(value, resetQuery = false) {
    filter=value; limit=24;
    if(resetQuery){query='';$('searchInput').value='';}
    render();
  }
  function toggleFavorite(id) {
    if(!byId.has(id))return;
    favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
    const saved=C.write(storage,'np_favorites',favorites);
    syncFavoriteButtons();
    if(filter==='favorites'&&!active) {
      const index=[...$('gridAll').children].findIndex(c=>c.dataset.id===id);
      render(); const next=$('gridAll').children[Math.max(0,Math.min(index,$('gridAll').children.length-1))];
      (next?.querySelector('.card-save')||$('resetSearchBtn')).focus();
    }
    toast(saved?(favorites.includes(id)?'Đã thêm vào game yêu thích':'Đã bỏ khỏi game yêu thích'):'Trình duyệt không cho lưu. Danh sách chỉ được giữ trong lần mở này.');
  }
  function syncTheme() {
    const dark=document.body.classList.contains('dark-theme'), button=$('themeToggleBtn');
    if(button){button.innerHTML=C.icon(dark?'sun':'moon');button.setAttribute('aria-label',dark?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối');button.title=button.getAttribute('aria-label');button.setAttribute('aria-pressed',String(dark));}
  }
  function syncSound() {
    const muted=window.NEWPLAYGROUND_MUTED!==false;
    for(const id of ['soundToggleBtn','modalSoundToggleBtn']){
      const b=$(id);if(!b)continue;b.innerHTML=C.icon(muted?'mute':'sound');b.setAttribute('aria-label',muted?'Bật âm thanh':'Tắt âm thanh');b.title=b.getAttribute('aria-label');b.setAttribute('aria-pressed',String(!muted));
    }
  }
  function toggleSound() {
    if(window.NP_Audio?.toggleMute) window.NP_Audio.toggleMute();
    else { window.NEWPLAYGROUND_MUTED=window.NEWPLAYGROUND_MUTED===false; try{storage?.setItem('np_muted',String(window.NEWPLAYGROUND_MUTED));}catch(_){} }
    syncSound();
  }
  function updateUrl(id) {
    try { const url=new URL(location.href); url.hash=id?'play/'+encodeURIComponent(id):''; history.replaceState(null,'',url); } catch (_) {}
  }
  function cleanGame() {
    if(stageObserver){stageObserver.disconnect();stageObserver=null;}
    window.NP_GameSession?.stop();
    window.NP_Audio?.stopBGM?.();
    $('modalGameContainer')?.replaceChildren();
  }
  function decorateStage() {
    const stage=$('modalGameContainer');if(!stage)return;
    // Only browser-native scaling. Never stretch a canvas to a different ratio.
    stage.querySelectorAll('canvas').forEach(canvas=>{
      if(canvas.width>0&&canvas.height>0){canvas.style.setProperty('--intrinsic-ratio',`${canvas.width} / ${canvas.height}`);canvas.classList.add('arcade-canvas');}
      if(canvas.id==='hrStreetCanvas')canvas.classList.add('arcade-stall-scene');
    });
    // Some original controls use only an arrow glyph. Add names without changing
    // event bindings, labels/state or the simulation's control implementation.
    const names={snkUp:'Đi lên',snkLeft:'Đi trái',snkDown:'Đi xuống',snkRight:'Đi phải',tetLeft:'Dịch khối sang trái',tetRight:'Dịch khối sang phải',tetDown:'Hạ khối',tetRotate:'Xoay khối',bnbUp:'Đi lên',bnbDown:'Đi xuống',bnbLeft:'Đi trái',bnbRight:'Đi phải',skUp:'Đi lên',skDown:'Đi xuống',skLeft:'Đi trái',skRight:'Đi phải'};
    Object.entries(names).forEach(([id,name])=>{const b=$(id);if(b)b.setAttribute('aria-label',name);});
  }
  function fillGameInfo(game, method) {
    const p=C.profile(game), modal=$('gameModal');
    modal.dataset.game=game.id;modal.dataset.art=p.art;
    modal.style.setProperty('--game-accent',p.accent);modal.style.setProperty('--game-surface',p.surface);
    $('modalGameTitle').textContent=p.title;
    $('modalGameBadge').textContent=game.category;
    $('roomObjective').textContent=p.objective;
    $('roomInstructions').textContent=p.help;
    $('gameHelp').open=false;
    const experimental=method==='launchRetroArcade'&&game.id!=='typer-shark';
    $('editionNote').hidden=!experimental;
    $('editionNote').textContent='Bản thử theo thể loại. Cơ chế hiện tại được dùng chung với một số mục khác, chưa phải bản tái hiện riêng của tựa game này.';
    $('roomEdition').hidden=!experimental;
    const save=$('roomFavorite');save.dataset.save=game.id;
    const others=C.select(catalog,'',game.category,favorites,recent).filter(g=>g.id!==game.id&&!C.profile(g).experimental).slice(0,4);
    $('relatedGames').replaceChildren(...others.map(g=>{
      const button=document.createElement('button');button.type='button';button.dataset.play=g.id;button.className='related-game';
      button.innerHTML=`<img src="${C.escape(thumb(g))}" width="72" height="48" alt=""><span>${C.escape(C.profile(g).title)}</span>${C.icon('arrow')}`;
      return button;
    }));
    $('relatedSection').hidden=!others.length;
    syncFavoriteButtons();syncSound();
  }
  function openGameById(id) {
    const game=byId.get(id);if(!game)return false;
    const modal=$('gameModal'), stage=$('modalGameContainer');if(!modal||!stage)return false;
    const method=C.routeFor(game,window.NP_Retro50Engines);
    if(!active){priorFocus=document.activeElement;priorOverflow=document.body.style.overflow;}
    cleanGame();active=game;
    modal.hidden=false;modal.style.display='flex';document.body.style.overflow='hidden';$('portalRoot').inert=true;
    fillGameInfo(game,method);
    try{
      if(method==='retro50')window.NP_Retro50Engines.launchGame(stage,game);
      else {
        const launch=window.NP_Engines?.[method];
        if(typeof launch!=='function')throw new Error(`Engine unavailable: ${method}`);
        launch(stage,game);
      }
      recent=C.remember(recent,id,catalog);C.write(storage,'np_recent_v2',recent);
      decorateStage();
      // Scoped to the current game and stopped before a switch/close. A child-list
      // observer handles DOM games rebuilding their own boards, not animation frames.
      stageObserver=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))decorateStage();});
      stageObserver.observe(stage,{childList:true,subtree:true});
      $('roomScroll').scrollTop=0;
      // Preserve text inputs used by typing games; otherwise focus the playfield.
      if(!stage.contains(document.activeElement))stage.focus({preventScroll:true});
      updateUrl(id);return true;
    }catch(error){
      cleanGame();
      const box=document.createElement('div');box.className='game-launch-error';
      box.innerHTML=`<h3>Game chưa mở được</h3><p>Bạn có thể thử lại hoặc chọn một trò khác. Các game đã thích vẫn được giữ.</p><button type="button" class="arcade-button" data-play="${C.escape(id)}">Thử mở lại</button>`;
      stage.appendChild(box);box.querySelector('button').focus();
      console.error('Game launch failed',id,error);return false;
    }
  }
  function closeGameModal() {
    if(!active)return;
    const lastId=active.id;
    cleanGame();active=null;
    $('gameModal').hidden=true;$('gameModal').style.display='none';$('portalRoot').inert=false;document.body.style.overflow=priorOverflow;
    if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
    updateUrl(null);renderRecent();
    if(filter==='recent'||filter==='favorites')render();
    if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});
    else { const match=[...document.querySelectorAll('#gridAll [data-play]')].find(b=>b.dataset.play===lastId);(match||$('searchInput'))?.focus({preventScroll:true}); }
    priorFocus=null;
  }
  window.openGameById=openGameById;
  window.closeGameModal=closeGameModal;
  function keyboard(event) {
    if(!active)return;
    if(event.key==='Escape'&&!document.fullscreenElement){event.preventDefault();event.stopImmediatePropagation();closeGameModal();return;}
    if(event.key==='Tab'){
      const dialog=$('gameModal'), nodes=[...dialog.querySelectorAll('button:not([disabled]),a[href],input,select,summary,[tabindex="0"]')].filter(visible);
      if(nodes.length){const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
      return;
    }
    // Toolbar/help keyboard use must never also move, fire or undo inside a game.
    if(!$('modalGameContainer').contains(event.target))event.stopImmediatePropagation();
  }
  async function fullscreen() {
    const box=document.querySelector('#gameModal .modal-window');
    try { if(document.fullscreenElement)await document.exitFullscreen();else if(box.requestFullscreen)await box.requestFullscreen();else throw new Error('not supported'); }
    catch(_){toast('Trình duyệt này chưa hỗ trợ toàn màn hình. Bàn chơi vẫn vừa theo cửa sổ.');}
  }
  async function copyLink() {
    if(!active)return;
    try { await navigator.clipboard.writeText(location.href);toast('Đã sao chép đường dẫn game'); }
    catch(_){toast('Không thể sao chép tự động. Đường dẫn trên thanh địa chỉ đã trỏ đến game này.');}
  }
  function init() {
    if(initialized)return;initialized=true;
    try { if(storage?.getItem('np_theme')==='dark')document.body.classList.add('dark-theme'); } catch(_){}
    document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=C.icon(el.dataset.icon);});
    syncTheme();syncSound();render();
    document.addEventListener('click',event=>{
      const play=event.target.closest('[data-play]');if(play){event.preventDefault();openGameById(play.dataset.play);return;}
      const save=event.target.closest('[data-save]');if(save){event.preventDefault();toggleFavorite(save.dataset.save);return;}
      const category=event.target.closest('[data-filter]');if(category){chooseFilter(category.dataset.filter,category.dataset.clear==='true');return;}
    });
    $('searchInput').addEventListener('input',event=>{query=event.target.value.trim().slice(0,100);limit=24;render();});
    $('clearSearchBtn').addEventListener('click',()=>{query='';$('searchInput').value='';render();$('searchInput').focus();});
    $('resetSearchBtn').addEventListener('click',()=>{chooseFilter('all',true);$('searchInput').focus();});
    $('loadMoreBtn').addEventListener('click',()=>{const before=Math.min(limit,C.select(catalog,query,filter,favorites,recent).length);limit+=24;render();$('gridAll').children[before]?.querySelector('.game-launch')?.focus({preventScroll:true});});
    $('randomGameBtn').addEventListener('click',()=>{const pool=C.featured.filter(id=>byId.has(id)&&id!==active?.id);if(pool.length)openGameById(pool[Math.floor(Math.random()*pool.length)]);});
    $('themeToggleBtn').addEventListener('click',()=>{const dark=document.body.classList.toggle('dark-theme');try{storage?.setItem('np_theme',dark?'dark':'light');}catch(_){}syncTheme();});
    $('soundToggleBtn').addEventListener('click',toggleSound);$('modalSoundToggleBtn').addEventListener('click',toggleSound);
    $('closeModalBtn').addEventListener('click',closeGameModal);$('closeModalBackdrop').addEventListener('click',closeGameModal);
    $('fullscreenGameBtn').addEventListener('click',fullscreen);$('shareGameBtn').addEventListener('click',copyLink);
    $('mobileSearchBtn').addEventListener('click',()=>{window.scrollTo({top:0,behavior:'auto'});$('searchInput').focus();});
    window.addEventListener('keydown',keyboard,true);
    window.addEventListener('storage',event=>{if(!['np_favorites','np_recent_v2'].includes(event.key))return;favorites=C.cleanIds(C.read(storage,'np_favorites',favorites),catalog);recent=C.cleanIds(C.read(storage,'np_recent_v2',recent),catalog,12);if(!active)render();else syncFavoriteButtons();});
    window.addEventListener('hashchange',()=>{const match=location.hash.match(/^#play\/(.+)$/);if(match){try{openGameById(decodeURIComponent(match[1]));}catch(_){}}else if(active)closeGameModal();});
    document.addEventListener('fullscreenchange',()=>{$('fullscreenGameBtn').setAttribute('aria-pressed',String(!!document.fullscreenElement));});
    const match=location.hash.match(/^#play\/(.+)$/);if(match){try{openGameById(decodeURIComponent(match[1]));}catch(_){}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());

/* Read-only presentation adapters. No score, save, timer or collision mutation. */
(function () {
  'use strict';
  const C=window.NP_ArcadeCore;if(!C)return;
  const records={
    'tro-choi-2048':['np_2048_high','điểm'],'ran-san-moi-snake':['np_snake_high_score','điểm'],
    'xep-gach-tetris':['np_tetris_high_score','điểm'],'line-98':['np_line98_high_score','điểm'],
    'ban-trung-khung-long':['np_bantrung_high_score','điểm'],'pha-gach-dx-ball':['np_dxball_best','điểm'],
    'boom-online-bnb':['np_boom_online_best','điểm'],'flappy-bird':['np_flappy_high','ống'],
    'dao-vang':['np_daovang_high_score','điểm'],'kim-cuong-bejeweled':['np_kimcuong_high_score','điểm']
  };
  let current=null,stageRoot=null,initialBest=0,dispose=[];
  function readRecord(id){const spec=records[id];if(!spec)return 0;try{const n=Number(localStorage.getItem(spec[0]));return Number.isFinite(n)&&n>0?Math.floor(n):0;}catch(_){return 0;}}
  function paintLibrary(){
    document.querySelectorAll('#gridAll .game-card').forEach(card=>{
      const n=readRecord(card.dataset.id),existing=card.querySelector('.personal-record');if(!n){existing?.remove();return;}
      const el=existing||document.createElement('span');el.className='personal-record';el.textContent=`Cao nhất · ${n.toLocaleString('vi-VN')} ${records[card.dataset.id][1]}`;
      if(!existing)card.querySelector('.card-info')?.appendChild(el);
    });
  }
  function stop(){
    dispose.forEach(fn=>{try{fn();}catch(_){}});dispose=[];
    if(current&&readRecord(current)>initialBest)window.showToastNotification?.(`Kỷ lục mới của bạn: ${readRecord(current).toLocaleString('vi-VN')} ${records[current][1]}.`);
    current=null;stageRoot=null;paintLibrary();
  }
  function sizeCanvases(stage){stage.querySelectorAll('canvas').forEach(c=>{if(c.width>0&&c.height>0)c.style.setProperty('--canvas-aspect',String(c.width/c.height));});}
  function addPan(wrap,content){
    const bar=document.createElement('div');bar.className='arcade-board-pan';bar.innerHTML=`<button type="button" aria-label="Xem phần bàn bên trái">${C.icon('back')}</button><span>Kéo ngang để xem toàn bộ bàn</span><button type="button" aria-label="Xem phần bàn bên phải">${C.icon('arrow')}</button>`;
    wrap.after(bar);wrap.tabIndex=0;wrap.setAttribute('aria-label','Bàn có thể cuộn ngang. Dùng các nút trái và phải khi cần.');const buttons=bar.querySelectorAll('button');
    function update(){const overflow=wrap.scrollWidth>wrap.clientWidth+2;bar.hidden=!overflow;buttons[0].disabled=wrap.scrollLeft<2;buttons[1].disabled=wrap.scrollLeft>=wrap.scrollWidth-wrap.clientWidth-2;}
    buttons.forEach((b,i)=>b.addEventListener('click',()=>{wrap.scrollBy({left:(i?1:-1)*Math.max(140,wrap.clientWidth*.75),behavior:'auto'});update();}));
    wrap.addEventListener('scroll',update,{passive:true});const resize=new ResizeObserver(update);resize.observe(wrap);if(content)resize.observe(content);
    dispose.push(()=>{resize.disconnect();wrap.removeEventListener('scroll',update);bar.remove();});update();
  }
  function addZoom(board){
    if(!board)return;const wrap=document.createElement('div');wrap.className='arcade-zoom-wrap';board.before(wrap);wrap.appendChild(board);
    const button=document.createElement('button');button.type='button';button.className='arcade-board-zoom';button.setAttribute('aria-pressed','false');button.textContent='Phóng to bàn';wrap.before(button);
    button.addEventListener('click',()=>{const zoom=wrap.classList.toggle('is-zoomed');button.setAttribute('aria-pressed',String(zoom));button.textContent=zoom?'Thu gọn bàn':'Phóng to bàn';});addPan(wrap,board);
    dispose.push(()=>{button.remove();if(wrap.isConnected){wrap.before(board);wrap.remove();}});
  }
  function minesZoom(wrap,grid){
    const button=document.createElement('button');button.type='button';button.className='arcade-board-zoom';button.setAttribute('aria-pressed','false');button.textContent='Phóng to ô';wrap.before(button);
    const difficulty=document.getElementById('dmDifficulty');let zoom=false;
    function update(){
      const cols={beginner:9,intermediate:16,expert:30}[difficulty?.value]||9;
      if(zoom){grid.style.setProperty('grid-template-columns',`repeat(${cols},48px)`,'important');grid.style.setProperty('width','max-content','important');}
      else {grid.style.removeProperty('grid-template-columns');grid.style.gridTemplateColumns=`repeat(${cols},minmax(38px,1fr))`;grid.style.removeProperty('width');grid.style.width='max-content';}
      button.setAttribute('aria-pressed',String(zoom));button.textContent=zoom?'Thu gọn ô':'Phóng to ô';
    }
    button.addEventListener('click',()=>{zoom=!zoom;update();});difficulty?.addEventListener('change',update);
    const next=document.getElementById('dmNextBtn'),reset=document.getElementById('dmFaceBtn');next?.addEventListener('click',update);reset?.addEventListener('click',update);
    dispose.push(()=>{difficulty?.removeEventListener('change',update);next?.removeEventListener('click',update);reset?.removeEventListener('click',update);button.remove();});addPan(wrap,grid);
  }
  function reliableFlagTap(button){
    if(!button)return;
    // Some touch gesture transitions deliver pointerup without compatibility
    // click. Forward a short, stationary touch to the existing engine's button
    // action, and consume the subsequent trusted click so it cannot toggle twice.
    // Mouse and keyboard keep native click behavior. No board flags are set here.
    let press=null,suppressUntil=0,forwarding=false;
    const reset=()=>{press=null;};
    const down=e=>{if(e.pointerType==='touch'&&e.isPrimary!==false)press={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now()};};
    const move=e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12)press=null;};
    const up=e=>{
      const p=press;press=null;if(!p||p.id!==e.pointerId||e.pointerType!=='touch'||performance.now()-p.at>400)return;
      const b=button.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)return;
      e.preventDefault();suppressUntil=performance.now()+700;forwarding=true;try{button.click();}finally{forwarding=false;}
    };
    const deduplicate=e=>{if(!forwarding&&e.isTrusted&&e.detail>0&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}};
    const sync=()=>button.setAttribute('aria-pressed',String(document.getElementById('dmFlagStatus')?.textContent==='BẬT'));
    for(const [type,fn,opts] of [['pointerdown',down,false],['pointermove',move,false],['pointerup',up,false],['pointercancel',reset,false],['pointerleave',reset,false],['click',deduplicate,true],['click',sync,false]]){
      button.addEventListener(type,fn,opts);dispose.push(()=>button.removeEventListener(type,fn,opts));
    }
    sync();dispose.push(reset);
  }
  function install(){
    const modal=document.getElementById('gameModal'),stage=document.getElementById('modalGameContainer');if(!modal||!stage)return;
    const style=document.createElement('style');style.textContent='.np-arcade button{touch-action:manipulation}.np-arcade #gameModal .play-header .arcade-icon{min-width:44px;min-height:44px}.np-arcade .game-card-small .card-save{width:44px;min-height:44px}.np-arcade .game-card-small .card-info{padding-right:33px}.np-arcade #dmFlagToggleBtn[aria-pressed="true"]{background:#315f4b!important;color:#fff!important}';document.head.appendChild(style);
    const nav=document.querySelector('.arcade-categories');
    if(nav){const present=new Set([...nav.querySelectorAll('[data-filter]')].map(b=>b.dataset.filter));for(const category of new Set((window.__NP_GAMES_CACHE__||[]).map(g=>g.category).filter(Boolean))){if(present.has(category))continue;const b=document.createElement('button');b.type='button';b.dataset.filter=category;b.setAttribute('aria-pressed','false');b.textContent=category;nav.insertBefore(b,nav.querySelector('[data-filter="experimental"]'));}}
    function sync(){
      if(modal.hidden||modal.style.display==='none'){if(current)stop();return;}
      if(current===modal.dataset.game&&stageRoot===stage.firstElementChild)return;
      stop();current=modal.dataset.game;stageRoot=stage.firstElementChild;initialBest=readRecord(current);sizeCanvases(stage);
      const observer=new MutationObserver(items=>{if(items.some(i=>[...i.addedNodes].some(n=>n.nodeType===1)))sizeCanvases(stage);});observer.observe(stage,{subtree:true,childList:true});dispose.push(()=>observer.disconnect());
      if(current==='do-min-minesweeper'){
        const wrap=document.getElementById('dmGridWrap'),grid=document.getElementById('dmGrid');if(wrap&&grid)minesZoom(wrap,grid);reliableFlagTap(document.getElementById('dmFlagToggleBtn'));
        for(const [id,label] of [['dmMineCount','Còn lại'],['dmTimer','Giây']]){const node=document.getElementById(id);if(!node)continue;const box=document.createElement('div');box.className='arcade-mine-counter';const caption=document.createElement('small');caption.textContent=label;node.before(box);box.append(caption,node);}
      }
      if(current==='co-caro')addZoom(document.getElementById('caroGrid'));if(current==='line-98')addZoom(document.getElementById('l98Grid'));
    }
    const roomObserver=new MutationObserver(sync);roomObserver.observe(modal,{attributes:true,attributeFilter:['data-game','style','hidden']});
    for(const id of ['gridAll','recentGames']){const grid=document.getElementById(id);if(!grid)continue;const observer=new MutationObserver(paintLibrary);observer.observe(grid,{childList:true});}
    sync();paintLibrary();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());

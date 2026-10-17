/* Read-only presentation adapters for existing games. These never alter scores,
 * saved boards, timers, collisions or game rules. Observers are scoped/cleaned up.
 */
(function () {
  'use strict';
  const C=window.NP_ArcadeCore;
  if(!C)return;
  const records={
    'tro-choi-2048':['np_2048_high','điểm'], 'ran-san-moi-snake':['np_snake_high_score','điểm'],
    'xep-gach-tetris':['np_tetris_high_score','điểm'], 'line-98':['np_line98_high_score','điểm'],
    'ban-trung-khung-long':['np_bantrung_high_score','điểm'], 'pha-gach-dx-ball':['np_dxball_best','điểm'],
    'boom-online-bnb':['np_boom_online_best','điểm'], 'flappy-bird':['np_flappy_high','ống'],
    'dao-vang':['np_daovang_high_score','điểm'], 'kim-cuong-bejeweled':['np_kimcuong_high_score','điểm']
  };
  let current=null, stageRoot=null, initialBest=0, dispose=[];
  function readRecord(id){
    const spec=records[id];if(!spec)return 0;
    try{const n=Number(localStorage.getItem(spec[0]));return Number.isFinite(n)&&n>0?Math.floor(n):0;}catch(_){return 0;}
  }
  function paintLibrary(){
    document.querySelectorAll('#gridAll .game-card').forEach(card=>{
      const n=readRecord(card.dataset.id), existing=card.querySelector('.personal-record');
      if(!n){existing?.remove();return;}
      const el=existing||document.createElement('span');el.className='personal-record';
      el.textContent=`Cao nhất · ${n.toLocaleString('vi-VN')} ${records[card.dataset.id][1]}`;
      if(!existing)card.querySelector('.card-info')?.appendChild(el);
    });
  }
  function stop(){
    dispose.forEach(fn=>{try{fn();}catch(_){}});dispose=[];
    if(current&&readRecord(current)>initialBest)window.showToastNotification?.(`Kỷ lục mới của bạn: ${readRecord(current).toLocaleString('vi-VN')} ${records[current][1]}.`);
    current=null;stageRoot=null;paintLibrary();
  }
  function sizeCanvases(stage){
    stage.querySelectorAll('canvas').forEach(canvas=>{
      if(canvas.width>0&&canvas.height>0)canvas.style.setProperty('--canvas-aspect',String(canvas.width/canvas.height));
    });
  }
  function addPan(wrap,content){
    const bar=document.createElement('div');bar.className='arcade-board-pan';
    bar.innerHTML=`<button type="button" aria-label="Xem phần bàn bên trái">${C.icon('back')}</button><span>Kéo ngang để xem toàn bộ bàn</span><button type="button" aria-label="Xem phần bàn bên phải">${C.icon('arrow')}</button>`;
    wrap.after(bar);wrap.tabIndex=0;wrap.setAttribute('aria-label','Bàn có thể cuộn ngang. Dùng các nút trái và phải khi cần.');
    const buttons=bar.querySelectorAll('button');
    function update(){const overflow=wrap.scrollWidth>wrap.clientWidth+2;bar.hidden=!overflow;buttons[0].disabled=wrap.scrollLeft<2;buttons[1].disabled=wrap.scrollLeft>=wrap.scrollWidth-wrap.clientWidth-2;}
    buttons.forEach((b,i)=>b.addEventListener('click',()=>{wrap.scrollBy({left:(i?1:-1)*Math.max(140,wrap.clientWidth*.75),behavior:'auto'});update();}));
    wrap.addEventListener('scroll',update,{passive:true});
    const resize=new ResizeObserver(update);resize.observe(wrap);if(content)resize.observe(content);
    dispose.push(()=>{resize.disconnect();wrap.removeEventListener('scroll',update);bar.remove();});update();
  }
  function addZoom(board){
    if(!board)return;
    const wrap=document.createElement('div');wrap.className='arcade-zoom-wrap';
    board.before(wrap);wrap.appendChild(board);
    const button=document.createElement('button');button.type='button';button.className='arcade-board-zoom';button.setAttribute('aria-pressed','false');button.textContent='Phóng to bàn';
    wrap.before(button);
    button.addEventListener('click',()=>{const zoom=wrap.classList.toggle('is-zoomed');button.setAttribute('aria-pressed',String(zoom));button.textContent=zoom?'Thu gọn bàn':'Phóng to bàn';});
    addPan(wrap,board);
    // The board belongs to the engine. Cleanup never deletes or resets it.
    dispose.push(()=>{button.remove();if(wrap.isConnected){wrap.before(board);wrap.remove();}});
  }
  function install(){
    const modal=document.getElementById('gameModal'),stage=document.getElementById('modalGameContainer');
    if(!modal||!stage)return;
    function sync(){
      if(modal.hidden||modal.style.display==='none'){if(current)stop();return;}
      if(current===modal.dataset.game&&stageRoot===stage.firstElementChild)return;
      stop();current=modal.dataset.game;stageRoot=stage.firstElementChild;initialBest=readRecord(current);
      sizeCanvases(stage);
      const childObserver=new MutationObserver(items=>{if(items.some(i=>[...i.addedNodes].some(n=>n.nodeType===1)))sizeCanvases(stage);});
      childObserver.observe(stage,{subtree:true,childList:true});dispose.push(()=>childObserver.disconnect());
      if(current==='do-min-minesweeper'){
        const wrap=document.getElementById('dmGridWrap');if(wrap)addPan(wrap,document.getElementById('dmGrid'));
        for(const [id,label] of [['dmMineCount','Còn lại'],['dmTimer','Giây']]){
          const node=document.getElementById(id);if(!node)continue;
          const box=document.createElement('div');box.className='arcade-mine-counter';
          const caption=document.createElement('small');caption.textContent=label;node.before(box);box.append(caption,node);
        }
      }
      if(current==='co-caro')addZoom(document.getElementById('caroGrid'));
      if(current==='line-98')addZoom(document.getElementById('l98Grid'));
    }
    const roomObserver=new MutationObserver(sync);
    roomObserver.observe(modal,{attributes:true,attributeFilter:['data-game','style','hidden']});
    for(const id of ['gridAll','recentGames']){
      const grid=document.getElementById(id);if(!grid)continue;
      const observer=new MutationObserver(paintLibrary);observer.observe(grid,{childList:true});
    }
    sync();paintLibrary();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());

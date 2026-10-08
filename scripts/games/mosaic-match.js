/* Original Kính Khảm interface. Accessible 6×6 tile buttons; one short help line stays tucked away. */
(function(){
 'use strict';
 const STORAGE='np_mosaic_match_v1',RECOVERY=STORAGE+'_recovery';
 function mount(container,session,audio){
  const M=window.NP_MosaicMatchModel;if(!M)throw new Error('Kính Khảm rules are not ready');
  const{listen,requestAnimationFrame,cancelAnimationFrame,onCleanup}=session;
  let raw=null,saved=null,storageOK=true,notice='';try{raw=localStorage.getItem(STORAGE);if(raw)saved=JSON.parse(raw);}catch(_){storageOK=false;notice='Ván này vẫn chơi được.';}
  const future=Number.isInteger(saved?.version)&&saved.version>1;let model=!future&&saved?.version===1?M.restore(saved.game):null;
  if(raw&&!model&&!future){try{const old=localStorage.getItem(RECOVERY);if(old&&old!==raw)storageOK=false;else localStorage.setItem(RECOVERY,raw);}catch(_){storageOK=false;}notice='Bản lưu lỗi được giữ riêng.';}
  if(future){storageOK=false;notice='Bản lưu mới hơn được giữ nguyên.';}
  const restored=Boolean(model);model||=M.create();let alive=true,paused=restored&&model.view().status==='playing',confirm=false,pausedBeforeConfirm=false,raf=null,focusIndex=21,lastHud='';container.classList.add('kk-host');
  const tiles=Array.from({length:M.CELL_COUNT},(_,i)=>`<button class="kk-cell" type="button" data-index="${i}" tabindex="${i===focusIndex?0:-1}" aria-pressed="false"></button>`).join('');
  container.innerHTML=`
   <section class="kk-game" aria-label="Kính Khảm">
    <header class="kk-header"><h3>Kính Khảm</h3><div class="kk-toolbar"><button class="kk-button" id="kkNew" type="button" aria-label="Ván mới" title="Ván mới">↻</button><button class="kk-button" id="kkPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></div></header>
    <div class="kk-hud"><div><span>Cửa</span><strong id="kkStage">1 / 3</strong></div><div><span>Mảnh</span><strong id="kkCount">0 / 45</strong></div><div><span>Nước</span><strong id="kkMoves">30</strong></div><div><span>Điểm</span><strong id="kkScore">0</strong></div></div>
    <div class="kk-board-wrap"><div class="kk-board" role="group" aria-label="Bàn kính ghép mảnh">${tiles}</div></div>
    <p class="np-game-sr" id="kkStatus" role="status" aria-live="polite" aria-atomic="true">Chọn hai mảnh liền nhau để ghép ba biểu tượng.</p><p class="kk-storage" id="kkStorage" hidden role="status"></p>
    <details class="kk-help"><summary aria-label="Cách chơi">?</summary><p>Chạm hai mảnh liền nhau. Ghép ba biểu tượng trở lên theo hàng ngang hoặc dọc; mảnh được tự bù từ trên.</p></details>
    <div class="kk-overlay" id="kkOverlay" hidden><div class="kk-overlay-card"><strong id="kkOverlayTitle"></strong><p id="kkOverlayText" hidden></p><div class="kk-confirm" id="kkConfirm" hidden role="group" aria-label="Xác nhận ván mới"><span>Ván mới?</span><button class="kk-button kk-primary" id="kkYes" type="button">Bắt đầu</button><button class="kk-button" id="kkNo" type="button">Ở lại</button></div><button class="kk-button kk-primary" id="kkContinue" type="button">▶</button></div></div>
   </section>`;
  const el=id=>container.querySelector('#'+id),cells=container.querySelectorAll('.kk-cell');
  function announce(text){el('kkStatus').textContent=text;}
  function setNotice(text){if(!text)return;notice=text;el('kkStorage').hidden=false;el('kkStorage').textContent=text;}
  function save(){if(!alive||!storageOK){if(notice)setNotice(notice);return;}try{if(localStorage.getItem(STORAGE)!==raw){storageOK=false;setNotice('Bản lưu đã đổi ở tab khác; ván này không ghi đè.');return;}raw=JSON.stringify({version:1,game:model.serialize()});localStorage.setItem(STORAGE,raw);}catch(_){storageOK=false;setNotice('Không lưu được; ván này vẫn chơi được.');}}
  function sound(kind){if(window.NEWPLAYGROUND_MUTED===true||window.NP_Audio?.isMuted)return;try{if(kind==='match')audio?.playTone?.(610,'sine',.05,.018);else if(kind==='clear')audio?.playTone?.(430,'triangle',.09,.025);}catch(_) {}}
  function drain(){for(const e of model.drain()){sound(e.kind);if(e.kind==='invalid')announce('Không ghép được. Thử cặp khác.');else if(e.kind==='match')announce(`${e.count} mảnh đã ghép${e.chain>1?`; chuỗi ${e.chain}`:''}.`);else if(e.kind==='cleared')announce('Ô cửa đã hoàn tất.');else if(e.kind==='won')announce('Ba ô cửa đã sáng!');else if(e.kind==='lost')announce('Hết nước. Thử lại ô cửa này.');else if(e.kind==='shuffle')announce('Bàn được sắp lại.');}}
  function input(index){if(!alive||paused||confirm||model.view().status!=='playing')return false;const ok=model.tap(Math.floor(index/M.COLS),index%M.COLS);drain();update();save();return ok;}
  function pause(message='Đã tạm dừng.'){if(model.view().status!=='playing')return;paused=true;cancelAnimationFrame(raf);raf=null;update();save();announce(message);el('kkContinue').focus();}
  function resume(){if(!alive||confirm||model.view().status!=='playing'||document.hidden)return;paused=false;update();save();announce('Tiếp tục.');cells[focusIndex]?.focus();}
  function newRun(){model=M.create();paused=false;confirm=false;lastHud='';update();save();announce('Ván mới.');cells[focusIndex]?.focus();}
  function requestNew(){if(confirm)return;const v=model.view();if(v.status==='playing'&&(v.moves>0||v.stage>0||v.cleared>0)){pausedBeforeConfirm=paused;confirm=true;paused=true;update();save();el('kkYes').focus();}else newRun();}
  function update(){if(!alive)return;const v=model.view(),terminal=v.status!=='playing',stamp=[v.stage,v.score,v.status,v.moves,v.cleared,v.selected?.r,v.selected?.c,paused,confirm].join('|');
   if(stamp!==lastHud){lastHud=stamp;el('kkStage').textContent=`${v.stage+1} / ${M.STAGES.length}`;el('kkCount').textContent=`${v.cleared} / ${v.stageInfo.target}`;el('kkMoves').textContent=String(v.maxMoves-v.moves);el('kkScore').textContent=String(v.score);el('kkPause').disabled=terminal||confirm;el('kkPause').textContent=paused&&!terminal?'▶':'Ⅱ';el('kkPause').setAttribute('aria-label',paused&&!terminal?'Tiếp tục':'Tạm dừng');el('kkOverlay').hidden=!(paused||terminal||confirm);el('kkConfirm').hidden=!confirm;el('kkContinue').hidden=confirm;el('kkOverlayTitle').textContent=confirm?'Ván mới?':v.status==='cleared'?`Cửa ${v.stage+1} sáng!`:v.status==='won'?'Ba ô cửa đã sáng!':v.status==='lost'?'Hết nước':'Tạm dừng';el('kkOverlayText').hidden=!terminal;el('kkOverlayText').textContent=terminal?`${v.score} điểm.`:'';el('kkContinue').textContent=v.status==='cleared'?'Cửa tiếp':v.status==='lost'?'Thử lại':v.status==='won'?'Chơi lại':'▶';}
   for(let i=0;i<cells.length;i++){const r=Math.floor(i/M.COLS),c=i%M.COLS,color=v.board[r][c],info=M.COLORS[color],cell=cells[i],selected=v.selected?.r===r&&v.selected?.c===c;cell.textContent=info.symbol;cell.style.setProperty('--kk-tone',info.tone);cell.classList.toggle('kk-selected',Boolean(selected));cell.setAttribute('aria-pressed',String(Boolean(selected)));cell.setAttribute('aria-label',`Hàng ${r+1}, cột ${c+1}, mảnh ${info.name}${selected?', đang chọn':''}`);cell.setAttribute('tabindex',i===focusIndex?'0':'-1');}
  }
  function moveFocus(index,key){const r=Math.floor(index/M.COLS),c=index%M.COLS;let nr=r,nc=c;if(key==='ArrowLeft')nc=Math.max(0,c-1);if(key==='ArrowRight')nc=Math.min(M.COLS-1,c+1);if(key==='ArrowUp')nr=Math.max(0,r-1);if(key==='ArrowDown')nr=Math.min(M.ROWS-1,r+1);focusIndex=nr*M.COLS+nc;update();cells[focusIndex]?.focus();}
  cells.forEach((cell,i)=>listen(cell,'click',()=>{focusIndex=i;input(i);}));
  listen(el('kkNew'),'click',requestNew);listen(el('kkPause'),'click',()=>paused?resume():pause());listen(el('kkYes'),'click',newRun);listen(el('kkNo'),'click',()=>{confirm=false;paused=pausedBeforeConfirm;update();save();if(paused)el('kkContinue').focus();else cells[focusIndex]?.focus();});
  listen(el('kkContinue'),'click',()=>{if(confirm)return;const v=model.view();if(v.status==='cleared'){model=model.next();paused=false;lastHud='';update();save();cells[focusIndex]?.focus();}else if(v.status==='lost'){model=model.retry();paused=false;lastHud='';update();save();cells[focusIndex]?.focus();}else if(v.status==='won')newRun();else resume();});
  listen(container,'keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest?.('input,textarea,select,[contenteditable]'))return;const index=Number.isInteger(Number(e.target?.dataset?.index))?Number(e.target.dataset.index):focusIndex;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();moveFocus(index,e.key);}else if(e.key==='Escape'&&model.view().selected){e.preventDefault();model.deselect();update();save();}else if(String(e.key).toLowerCase()==='p'){e.preventDefault();paused?resume():pause();}});
  listen(window,'blur',()=>pause('Đã tạm dừng khi mất tiêu điểm.'));listen(document,'visibilitychange',()=>{if(document.hidden)pause('Đã tạm dừng khi chuyển tab.');});listen(window,'pagehide',()=>pause('Đã lưu ván đang chơi.'));
  onCleanup(()=>{cancelAnimationFrame(raf);raf=null;save();alive=false;container.classList.remove('kk-host');});if(paused)announce('Ván đã lưu. Bấm tiếp tục để chơi.');if(notice)setNotice(notice);update();save();if(!paused)cells[focusIndex]?.focus({preventScroll:true});return{getModel:()=>model,isPaused:()=>paused};
 }
 window.NP_MosaicMatch=Object.freeze({mount});
 if(window.NP_Engines&&typeof window.NP_Engines.launchKimCuong==='function')window.NP_Engines.launchKimCuong=function(container){return mount(container,window.NP_GameSession.start(),window.NP_AudioEngine);};
})();

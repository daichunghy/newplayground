/* Original NewPlayground falling-block presentation. No third-party art, music or fonts. */
(function(){
 'use strict';
 const KEY='np_falling_blocks_v1';
 const COLORS={I:'#a36a32',J:'#397b74',L:'#a54b79',O:'#667280',S:'#b95e46',T:'#71863b',Z:'#496faf'};
 function mount(container,session,audio){
  const{listen,onCleanup,requestAnimationFrame,cancelAnimationFrame,setTimeout}=session;
  const M=window.NP_FallingBlocksModel,input=window.NP_FallingBlocksInput.create();
  let saved=null,raw=null,storageMessage='',preserve=false,legacy=0;
  try{raw=localStorage.getItem(KEY);saved=raw?JSON.parse(raw):null;const n=Number(localStorage.getItem('np_tetris_high_score'));legacy=Number.isSafeInteger(n)&&n>=0?n:0;}catch(_){storageMessage='Không đọc được bộ nhớ. Ván này vẫn chơi được.';}
  preserve=(Number.isInteger(saved?.version)&&saved.version>1)||(Number.isInteger(saved?.game?.version)&&saved.game.version>1);
  let model=saved?.version===1?M.restore(saved.game):null;
  if(preserve)storageMessage='Bản lưu mới hơn được giữ nguyên. Ván này không ghi đè lên bản đó.';
  else if(raw&&!model){storageMessage='Bản lưu không hợp lệ. Bắt đầu ván mới.';try{localStorage.setItem(KEY+'_recovery',raw);}catch(_){preserve=true;storageMessage='Bản lưu lỗi được giữ nguyên. Ván mới không lưu.';}}
  const restored=Boolean(model);
    model ||= M.create({mode:'endless'});
  const best={sprint:null,endless:0};
  if(Number.isSafeInteger(saved?.best?.sprint)&&saved.best.sprint>0)best.sprint=saved.best.sprint;
  if(Number.isSafeInteger(saved?.best?.endless)&&saved.best.endless>=0)best.endless=saved.best.endless;
  let alive=true,paused=restored,frame=null,last=null,accumulator=0,confirm=false,pendingMode=null,roundRecorded=false;
  const pointers=new Map(),suppressed=new Map();let lastPaint='',lastSecond=-1;
  container.classList.add('fb-host');
  container.innerHTML=`<section class="fb-game" aria-label="Xếp Khối Cổ Điển">
   <header class="fb-header"><h3>Xếp Khối</h3></header>
   <div class="fb-toolbar"><label hidden>Chế độ<select id="fbMode"><option value="sprint">Mục tiêu 40 hàng</option><option value="endless">Chơi bền</option></select></label><button id="fbNew" class="fb-button" type="button" aria-label="Ván mới">↻</button><button id="fbPause" class="fb-button" type="button" aria-label="Tạm dừng">Ⅱ</button></div>
   <div id="fbConfirm" class="fb-confirm" hidden><span>Chơi lại?</span><button id="fbConfirmYes" class="fb-button fb-primary" type="button">Bắt đầu</button><button id="fbConfirmNo" class="fb-button" type="button">Hủy</button></div>
   <div class="fb-hud"><div><span>Điểm</span><strong id="fbScore">0</strong></div><div hidden><span>Hàng</span><strong id="fbLines">0 / 40</strong></div><div hidden><span>Cấp</span><strong id="fbLevel">1</strong></div><div hidden><span>Thời gian</span><strong id="fbTime">0:00</strong></div></div>
   <div class="fb-previews"><div hidden><span>Dự trữ</span><canvas id="fbHoldCanvas" width="80" height="70" role="img" aria-label="Chưa có khối dự trữ"></canvas></div><div class="fb-next"><span>Tiếp theo</span><canvas id="fbNextCanvas" width="240" height="70" role="img" aria-label="Ba khối tiếp theo"></canvas></div></div>
   <div class="fb-playfield"><canvas id="fbCanvas" width="240" height="480" tabindex="0" role="img" aria-label="Bàn xếp khối 10 cột, 20 hàng" aria-describedby="fbInstructions">Bàn xếp khối. Dùng các nút điều khiển và Đọc bàn để kiểm tra trạng thái.</canvas><div id="fbOverlay" class="fb-overlay"><h4 id="fbOverlayTitle">Tạm dừng</h4><p id="fbOverlayText"></p><button id="fbResume" class="fb-button fb-primary" type="button">Chơi</button></div></div>
   <div class="fb-controls"><button id="fbLeft" class="fb-button" type="button" aria-label="Sang trái">←</button><button id="fbDown" class="fb-button" type="button" hidden aria-label="Rơi mềm">↓ Rơi</button><button id="fbRight" class="fb-button" type="button" aria-label="Sang phải">→</button><button id="fbCCW" class="fb-button" type="button" hidden>↶ Xoay trái</button><button id="fbCW" class="fb-button" type="button" aria-label="Xoay khối">↻</button><button id="fbHold" class="fb-button" type="button" hidden>Dự trữ [C]</button><button id="fbDrop" class="fb-button fb-primary fb-wide" type="button">Thả</button></div>
   <p id="fbStatus" class="np-game-sr" role="status" aria-live="polite" aria-atomic="true">Hoàn thành hàng ngang để dọn bàn. Bóng viền cho biết nơi khối sẽ rơi.</p>
   <p id="fbRecords" class="fb-records" hidden></p><p id="fbInstructions" class="np-game-sr">← → di chuyển; ↓ rơi mềm; ↑ / X xoay phải; Z xoay trái; Space thả ngay; P tạm dừng. Giữ trái/phải để lặp. Phím chỉ hoạt động trong game.</p>
   <details class="fb-help np-help"><summary aria-label="Cách chơi">?</summary><p>Xếp kín hàng để dọn bàn.</p><button id="fbRead" class="fb-button" type="button">Đọc bàn</button><a href="assets/licenses/tetr-js-MIT.txt" target="_blank" rel="noopener">Nguồn mã</a></details><div id="fbSnapshot" class="np-game-sr" tabindex="-1" hidden></div><p id="fbStorage" class="fb-storage" hidden></p></section>`;
  const el=id=>container.querySelector('#'+id),canvas=el('fbCanvas'),ctx=canvas.getContext('2d');
  const time=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
  const announce=text=>{el('fbStatus').textContent=text;};
  function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;last=null;accumulator=0;input.reset();for(const p of pointers.values())suppressed.set(p.id,true);pointers.clear();model.advance(0,false);}
  function save(){if(!alive)return;try{if(!preserve)localStorage.setItem(KEY,JSON.stringify({version:1,game:model.serialize(),best}));}catch(_){storageMessage='Không lưu được. Tiến độ chỉ còn trong phiên đang mở.';}el('fbStorage').hidden=!storageMessage;el('fbStorage').textContent=storageMessage;}
  function sound(kind){if(!audio||window.NEWPLAYGROUND_MUTED||window.NP_Audio?.isMuted)return;try{audio.init?.();if(audio.ctx?.state==='suspended')audio.ctx.resume().catch(()=>{});audio.playTone(kind==='won'?784:kind==='clear'?660:kind==='lost'?147:330,'sine',.09,.03);}catch(_){}}
  function finish(events=[]){const v=model.view();let endedNow=false;for(const event of events)if(event){if(event.kind==='clear')announce(`Đã dọn ${event.cleared} hàng. Tổng ${v.lines} hàng.`);sound(event.kind);}
   if(v.status!=='playing'&&!roundRecorded){roundRecorded=true;endedNow=true;stop();if(v.status==='won'){best.sprint=best.sprint===null?v.elapsedMs:Math.min(best.sprint,v.elapsedMs);announce(`Hoàn thành ${v.lines} hàng trong ${time(v.elapsedMs)}.`);}else announce(`Hết chỗ. ${v.lines} hàng, ${v.score} điểm.`);}
   if(v.mode==='endless')best.endless=Math.max(best.endless,v.score);save();render();if(endedNow)el('fbResume').focus();
  }
  function action(name){if(!alive||paused||confirm||model.view().status!=='playing')return;let result;
   if(name==='left'||name==='right')result=model.move(name==='left'?-1:1);else if(name==='down')result=model.softDrop();else if(name==='cw'||name==='ccw')result=model.rotate(name==='cw'?1:-1);else if(name==='hold')result=model.hold();else if(name==='drop')result=model.hardDrop();
   if(result){if(name==='hold')announce('Đã đổi khối dự trữ.');finish(typeof result==='object'?[result]:[]);}if(model.view().status==='playing')canvas.focus({preventScroll:true});
  }
  function run(ts){frame=null;if(!alive||paused||confirm||model.view().status!=='playing')return;const dt=last===null?0:ts-last;last=ts;
   if(dt>250){pause(true,'Đã tạm dừng vì phiên chơi bị gián đoạn.');return;}
   accumulator+=Math.max(0,dt);let changed=false,events=[];
   while(accumulator+1e-7>=M.STEP&&model.view().status==='playing'){accumulator-=M.STEP;for(const dir of input.tick(M.STEP))changed=model.move(dir==='left'?-1:1)||changed;const r=model.advance(M.STEP,input.soft());changed||=r.changed;events.push(...r.events);}
   if(events.length)finish(events);else if(changed){render();save();}else if(Math.floor(model.view().elapsedMs/1000)!==lastSecond)render();
   if(!paused&&!confirm&&model.view().status==='playing')frame=requestAnimationFrame(run);
  }
  function schedule(){if(frame===null&&!paused&&!confirm&&model.view().status==='playing')frame=requestAnimationFrame(run);}
  function pause(value,message){if(model.view().status!=='playing')return;paused=value;stop();render();save();announce(message||(paused?'Đã tạm dừng.':'Chơi tiếp.'));if(paused)el('fbResume').focus();else{canvas.focus();schedule();}}
  function block(context,x,y,size,type,ghost=false){context.fillStyle=COLORS[type]||'#6a7770';context.strokeStyle=ghost?'#627366':'#f6efe0';context.lineWidth=ghost?2:1;if(ghost){context.strokeRect(x+3,y+3,size-6,size-6);return;}context.fillRect(x+1,y+1,size-2,size-2);context.strokeRect(x+3,y+3,size-6,size-6);}
  function mini(target,types){const c=target.getContext('2d');c.clearRect(0,0,target.width,target.height);types.forEach((type,i)=>{if(!type)return;const m=M.matrix(type),size=12,ox=i*80+(80-m.length*size)/2,oy=(70-m.length*size)/2;m.forEach((row,r)=>row.forEach((v,col)=>{if(v)block(c,ox+col*size,oy+r*size,size,type);}));});}
  function render(){const v=model.view();lastSecond=Math.floor(v.elapsedMs/1000);el('fbMode').value=v.mode;el('fbScore').textContent=String(v.score);el('fbLines').textContent=v.mode==='sprint'?`${v.lines} / 40`:String(v.lines);el('fbLevel').textContent=String(v.level);el('fbTime').textContent=time(v.elapsedMs);
   el('fbRecords').textContent=`40 hàng: ${best.sprint===null?'chưa có':time(best.sprint)} · Chơi bền: ${best.endless} điểm${legacy?' · Kỷ lục luật cũ: '+legacy:''}`;
   const ended=v.status!=='playing',blocked=paused||ended||confirm;el('fbOverlay').hidden=!paused&&!ended;el('fbResume').disabled=confirm;el('fbPause').disabled=ended||confirm;el('fbPause').textContent=paused?'▶':'Ⅱ';el('fbPause').setAttribute('aria-label',paused?'Chơi tiếp':'Tạm dừng');
   el('fbOverlayTitle').textContent=ended?(v.status==='won'?'Trọn 40 hàng!':'Hết chỗ rồi'):(v.pieces||v.elapsedMs?'Đã tạm dừng':'Tạm dừng');el('fbOverlayText').textContent=ended?`${v.score} điểm`:'';el('fbResume').textContent=ended?'Chơi lại':'▶';
   for(const id of ['fbLeft','fbRight','fbDown','fbCW','fbCCW','fbHold','fbDrop'])el(id).disabled=blocked||(id==='fbHold'&&v.holdUsed);
   canvas.tabIndex=blocked?-1:0;canvas.setAttribute('aria-label',`Bàn 10 cột, 20 hàng. Khối ${v.active.type}, cột ${v.active.x+1}, hàng ${Math.max(1,v.active.y-M.HIDDEN+1)}. Đích rơi hàng ${v.ghostY-M.HIDDEN+1}.`);canvas.classList.toggle('fb-paused',paused);
   el('fbHoldCanvas').setAttribute('aria-label',v.hold?'Dự trữ khối '+v.hold:'Chưa dự trữ');el('fbNextCanvas').setAttribute('aria-label','Tiếp theo: '+v.queue.slice(0,3).join(', '));mini(el('fbHoldCanvas'),[v.hold]);mini(el('fbNextCanvas'),v.queue.slice(0,3));
   const signature=JSON.stringify([v.grid,v.active,v.status]);if(signature===lastPaint)return;lastPaint=signature;ctx.fillStyle='#ede8da';ctx.fillRect(0,0,240,480);ctx.strokeStyle='#d5cfbe';ctx.lineWidth=1;
   for(let r=0;r<20;r++)for(let c=0;c<10;c++){ctx.strokeRect(c*24,r*24,24,24);if(v.grid[r+M.HIDDEN][c])block(ctx,c*24,r*24,24,v.grid[r+M.HIDDEN][c]);}
   if(!ended){for(const[r,c]of M.cells({...v.active,y:v.ghostY}))if(r>=M.HIDDEN)block(ctx,c*24,(r-M.HIDDEN)*24,24,v.active.type,true);for(const[r,c]of v.activeCells)if(r>=M.HIDDEN)block(ctx,c*24,(r-M.HIDDEN)*24,24,v.active.type);}
  }
  function restart(mode=pendingMode||model.view().mode){stop();model=M.create({mode});paused=false;confirm=false;pendingMode=null;roundRecorded=false;lastPaint='';el('fbConfirm').hidden=true;el('fbSnapshot').hidden=true;save();render();announce('Ván mới. Xếp kín hàng để dọn bàn.');canvas.focus();schedule();}
  function requestNew(mode=model.view().mode){pendingMode=mode;const v=model.view();if(v.status==='playing'&&(v.elapsedMs||v.pieces)){confirm=true;stop();el('fbConfirm').hidden=false;render();el('fbConfirmYes').focus();}else restart(mode);}
  listen(el('fbNew'),'click',()=>requestNew());listen(el('fbMode'),'change',()=>{const mode=el('fbMode').value;el('fbMode').value=model.view().mode;if(['sprint','endless'].includes(mode)&&mode!==model.view().mode)requestNew(mode);});
  listen(el('fbConfirmYes'),'click',()=>{if(confirm)restart();});listen(el('fbConfirmNo'),'click',()=>{confirm=false;pendingMode=null;el('fbConfirm').hidden=true;render();if(!paused)schedule();el(paused?'fbResume':'fbCanvas').focus();});
  listen(el('fbPause'),'click',()=>pause(!paused));listen(el('fbResume'),'click',()=>{if(confirm)return;if(model.view().status==='playing')pause(false);else restart();});
  listen(el('fbRead'),'click',()=>{pause(true);const v=model.view(),rows=v.grid.slice(M.HIDDEN).map((row,r)=>`Hàng ${r+1}: ${row.map((type,c)=>type?'cột '+(c+1)+' '+type:null).filter(Boolean).join(', ')||'trống'}`);el('fbSnapshot').textContent=`Khối đang rơi: ${v.active.type}.\n${rows.join('\n')}`;el('fbSnapshot').hidden=false;el('fbSnapshot').focus();});
  const heldIds={fbLeft:'left',fbDown:'down',fbRight:'right'};
  for(const[id,dir]of Object.entries(heldIds)){
   const button=el(id);
   listen(button,'pointerdown',e=>{if(button.disabled||e.button>0)return;const owner='pointer:'+e.pointerId;suppressed.delete(id);pointers.set(e.pointerId,{owner,id});const first=input.press(owner,dir);if(first)action(first);try{button.setPointerCapture?.(e.pointerId);}catch(_){}});
   listen(button,'click',e=>{if(e.detail!==0&&suppressed.has(id)){suppressed.delete(id);return;}action(dir);});
   listen(button,'lostpointercapture',e=>releasePointer(e));
  }
  function releasePointer(e){const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);suppressed.set(p.id,true);const fallback=input.release(p.owner);if(fallback)action(fallback);}
  listen(window,'pointerup',releasePointer);listen(window,'pointercancel',releasePointer);
  for(const[id,name]of [['fbCW','cw'],['fbCCW','ccw'],['fbHold','hold'],['fbDrop','drop']])listen(el(id),'click',()=>action(name));
  const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'cw',x:'cw',z:'ccw',' ':'drop'};
  listen(container,'keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest?.('input,textarea,select,[contenteditable]'))return;if(e.key.toLowerCase()==='p'){e.preventDefault();pause(!paused);return;}const name=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(!name||paused||confirm||model.view().status!=='playing'||e.key===' '&&e.target.tagName==='BUTTON')return;e.preventDefault();if(['left','right','down'].includes(name)){const first=input.press('key:'+(e.code||e.key),name);if(first)action(first);}else action(name);});
  listen(window,'keyup',e=>{const fallback=input.release('key:'+(e.code||e.key));if(fallback)action(fallback);});
  listen(window,'blur',()=>pause(true));listen(document,'visibilitychange',()=>{if(document.hidden)pause(true);});listen(window,'pagehide',()=>{pause(true);save();});
  onCleanup(()=>{stop();save();alive=false;container.classList.remove('fb-host');});
  render();save();schedule();setTimeout(()=>{if(alive)el(paused?'fbResume':'fbCanvas').focus();},0);
 }
 window.NP_FallingBlocks={mount};
})();

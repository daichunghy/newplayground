/* Original Vườn Nắng browser game: plant, grow, and let the ripe harvest land in the basket. */
(function(){
 'use strict';
 function mount(container,session,audio){
  const M=window.NP_SunGardenModel;if(!M)throw new Error('Vườn Nắng rules are not ready');
  const{listen,cancelAnimationFrame,onCleanup}=session;let model=M.create(),selected='berry',paused=false,alive=true,raf=null,last=0;
  container.classList.add('sg-host');
  container.innerHTML=`
   <section class="sg-game" aria-label="Vườn Nắng">
    <header class="sg-head"><h3>Vườn Nắng</h3><div class="sg-toolbar"><button class="sg-btn" id="sgNew" type="button" aria-label="Ván mới" title="Ván mới">↻</button><button class="sg-btn" id="sgPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></div></header>
    <div class="sg-hud"><div class="sg-meter"><span>Giỏ</span><strong id="sgBaskets">0 / ${M.TARGET}</strong><div class="sg-meter-bar" aria-hidden="true"><i id="sgBasketBar" style="width:0%"></i></div></div><div class="sg-meter"><span>Nắng còn</span><strong id="sgClock">45s</strong><div class="sg-meter-bar" aria-hidden="true"><i id="sgTimeBar" style="width:100%"></i></div></div></div>
    <div class="sg-seeds" role="group" aria-label="Chọn hạt giống">
     <button class="sg-btn sg-seed" id="sgSeedBean" data-seed="bean" type="button" aria-label="Đậu, 3 giây, 1 nông sản" aria-pressed="false">🫛 Đậu · 3s · 1</button>
     <button class="sg-btn sg-seed" id="sgSeedBerry" data-seed="berry" type="button" aria-label="Dâu, 5 giây, 2 nông sản" aria-pressed="true">🍓 Dâu · 5s · 2</button>
     <button class="sg-btn sg-seed" id="sgSeedBloom" data-seed="bloom" type="button" aria-label="Hoa, 7 giây, 3 nông sản" aria-pressed="false">🌻 Hoa · 7s · 3</button>
    </div>
    <div class="sg-board" id="sgBoard" role="group" aria-label="Chín luống rau" tabindex="-1">
     ${Array.from({length:M.PLOTS},(_,i)=>`<button class="sg-plot sg-empty" id="sgPlot${i}" type="button" aria-label="Luống trống ${i+1}"><span class="sg-crop-icon" id="sgIcon${i}" aria-hidden="true">＋</span><span class="sg-progress" id="sgProgress${i}" hidden aria-hidden="true"><i id="sgFill${i}"></i></span></button>`).join('')}
    </div>
    <p class="sg-goal">Trồng cây; quả chín tự vào giỏ. Thu ${M.TARGET} nông sản trước khi trời tối.</p>
    <p class="np-game-sr sg-status" id="sgStatus" role="status" aria-live="polite" aria-atomic="true">Chọn hạt, chạm luống trống.</p>
    <div class="sg-overlay" id="sgOverlay" hidden><strong id="sgOverlayTitle"></strong><button class="sg-btn sg-replay" id="sgContinue" type="button">Tiếp tục</button></div>
   </section>`;
  const el=id=>container.querySelector('#'+id),plots=Array.from({length:M.PLOTS},(_,i)=>({button:el(`sgPlot${i}`),icon:el(`sgIcon${i}`),progress:el(`sgProgress${i}`),fill:el(`sgFill${i}`)}));
  function announce(text){el('sgStatus').textContent=text;}
  function sound(kind){if(window.NEWPLAYGROUND_MUTED===true||window.NP_Audio?.isMuted)return;try{if(kind==='harvest')audio?.playTone?.(560,'sine',.08,.018);else audio?.playTone?.(320,'triangle',.05,.012);}catch(_) {}}
  function update(){
   if(!alive)return;const v=model.view(),terminal=v.status!=='playing';
   el('sgBaskets').textContent=`${v.baskets} / ${M.TARGET}`;el('sgBasketBar').style.width=`${Math.min(100,v.baskets/M.TARGET*100)}%`;
   el('sgClock').textContent=`${Math.ceil(v.remainingMs/1000)}s`;el('sgTimeBar').style.width=`${v.remainingMs/M.DAY_MS*100}%`;
   for(const p of v.plots){const view=plots[p.index],button=view.button;button.classList.toggle('sg-empty',!p.crop);button.classList.toggle('sg-growing',Boolean(p.crop));view.icon.textContent=p.crop?p.crop.icon:'＋';view.progress.hidden=!p.crop;view.fill.style.width=`${p.progress}%`;button.setAttribute('aria-label',p.crop?`${p.crop.name}, ${Math.ceil((p.crop.growMs-p.grownMs)/1000)} giây nữa`:`Luống trống ${p.index+1}`);}
   for(const button of container.querySelectorAll('.sg-seed'))button.setAttribute('aria-pressed',String(button.dataset.seed===selected));
   el('sgPause').disabled=terminal;el('sgPause').textContent=paused?'▶':'Ⅱ';el('sgPause').setAttribute('aria-label',paused?'Tiếp tục':'Tạm dừng');
   el('sgOverlay').hidden=!(paused||terminal);el('sgOverlayTitle').textContent=terminal?(v.status==='won'?'Đủ giỏ rồi!':`Hết nắng · ${v.baskets} / ${M.TARGET}`):'Đã tạm dừng';el('sgContinue').textContent=terminal?'Chơi lại':'Tiếp tục';
  }
  function stopFrame(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function pause(message='Đã tạm dừng.'){if(paused||model.view().status!=='playing')return;paused=true;stopFrame();update();announce(message);el('sgContinue').focus();}
  function startFrame(){if(!alive||model.view().status!=='playing'||document.hidden)return;paused=false;last=0;update();raf=window.requestAnimationFrame(frame);}
  function frame(ts){raf=null;if(!alive||paused)return;if(last){const delta=ts-last;if(delta>150){pause('Đã tạm dừng khi quay lại.');return;}for(const event of model.advance(Math.max(0,delta)))if(event.kind==='harvested')sound('harvest');}last=ts;update();if(model.view().status==='playing')raf=window.requestAnimationFrame(frame);else{stopFrame();announce(model.view().status==='won'?'Thu hoạch đủ rồi!':'Trời tối mất rồi.');}}
  function plant(index){if(paused||model.view().status!=='playing')return;const ok=model.plant(index,selected);if(ok){sound('plant');announce(`Đã trồng ${M.CROPS[selected].name}.`);update();}else if(model.view().plots[index]?.crop)announce('Cây đang lớn.');}
  function newRun(){model=M.create();paused=false;last=0;announce('Chọn hạt, chạm luống trống.');update();stopFrame();startFrame();}
  function continueRun(){if(model.view().status!=='playing'){newRun();return;}startFrame();el('sgBoard').focus?.({preventScroll:true});}
  for(let i=0;i<M.PLOTS;i++)listen(plots[i].button,'click',()=>plant(i));
  for(const button of container.querySelectorAll('.sg-seed'))listen(button,'click',()=>{selected=button.dataset.seed;update();announce(`Đã chọn ${M.CROPS[selected].name}.`);});
  listen(el('sgNew'),'click',newRun);listen(el('sgPause'),'click',()=>paused?continueRun():pause());listen(el('sgContinue'),'click',continueRun);
  listen(window,'blur',()=>pause('Đã tạm dừng khi mất tiêu điểm.'));listen(document,'visibilitychange',()=>{if(document.hidden)pause('Đã tạm dừng khi chuyển tab.');});
  onCleanup(()=>{alive=false;stopFrame();container.classList.remove('sg-host');});update();raf=window.requestAnimationFrame(frame);return{getModel:()=>model,isPaused:()=>paused};
 }
 window.NP_SunGarden=Object.freeze({mount});
 if(window.NP_Engines&&typeof window.NP_Engines.launchNongTrai==='function')window.NP_Engines.launchNongTrai=function(container){return mount(container,window.NP_GameSession.start(),window.NP_AudioEngine);};
})();

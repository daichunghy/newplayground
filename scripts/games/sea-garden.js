/* Original Bể Sao aquarium: feed growing fish and click to repel alien visitors. */
(function(){
 'use strict';
 function mount(container,session,audio){
  const M=window.NP_SeaGardenModel;if(!M)throw new Error('Bể Sao rules are not ready');
  const{listen,cancelAnimationFrame,onCleanup}=session;let model=M.create(),alive=true,paused=false,raf=null,last=0;
  container.classList.add('sea-host');
  container.innerHTML=`
   <section class="sea-game" aria-label="Bể Sao">
    <header class="sea-head"><h3>Bể Sao</h3><div class="sea-actions"><button class="sea-btn" id="seaNew" type="button" aria-label="Ván mới" title="Ván mới">↻</button><button class="sea-btn" id="seaPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></div></header>
    <div class="sea-hud"><div><span>Ngọc</span><strong id="seaPearls">0 / ${M.GOAL}</strong></div><div><span>Cá</span><strong id="seaFish">3</strong></div><div><span>Thời gian</span><strong id="seaClock">60s</strong></div></div>
    <div class="sea-tank-wrap"><canvas class="sea-tank" id="seaCanvas" width="600" height="360" tabindex="0" role="group" aria-label="Bể cá. Chạm để thả mồi; chạm sinh vật lạ để đuổi đi. Nhấn Space để thả mồi hoặc bắn sinh vật gần nhất."></canvas></div>
    <p class="sea-goal">Thả mồi, giữ cá an toàn, gom ${M.GOAL} ngọc.</p>
    <p class="np-game-sr sea-status" id="seaStatus" role="status" aria-live="polite" aria-atomic="true">Chạm bể để thả mồi.</p>
    <details class="sea-help"><summary aria-label="Cách chơi">?</summary><p>Chạm bể để thả mồi; chạm sinh vật lạ để bắn. Ngọc tự thu.</p></details>
    <div class="sea-overlay" id="seaOverlay" hidden><strong id="seaResult"></strong><button class="sea-btn" id="seaContinue" type="button">Chơi lại</button></div>
   </section>`;
  const el=id=>container.querySelector('#'+id),canvas=el('seaCanvas'),ctx=canvas.getContext('2d');
  function announce(text){el('seaStatus').textContent=text;}
  function sound(kind){if(window.NEWPLAYGROUND_MUTED===true||window.NP_Audio?.isMuted)return;try{if(kind==='bite')audio?.playTone?.(170,'sawtooth',.06,.012);else if(kind==='pearl')audio?.playTone?.(630,'sine',.08,.018);else if(kind==='zap')audio?.playTone?.(360,'triangle',.06,.014);else audio?.playTone?.(280,'sine',.035,.009);}catch(_) {}}
  function handleEvents(events){for(const e of events){if(e.kind==='food-dropped'){sound('feed');announce('Đã thả mồi.');}else if(e.kind==='fed'){sound('feed');}else if(e.kind==='pearl-collected'){sound('pearl');announce(`Ngọc tự thu: ${e.total} / ${M.GOAL}.`);}else if(e.kind==='alien-arrived'){announce('Sinh vật lạ! Chạm để bắn.');}else if(e.kind==='zap'){sound('zap');announce(`Trúng đích. Sinh vật còn ${e.hp} điểm.`);}else if(e.kind==='alien-cleared'){sound('pearl');announce('Bể đã an toàn.');}else if(e.kind==='fish-bitten'){sound('bite');announce(`Cá bị cắn. Còn ${e.hp} lượt chịu đựng.`);}else if(e.kind==='fish-lost'){announce(e.left?`Một cá rời bể. Còn ${e.left}.`:'Bể trống rồi.');}else if(e.kind==='won')announce('Đủ ngọc rồi!');else if(e.kind==='lost')announce(e.fish?'Hết giờ rồi.':'Không còn cá trong bể.');}}
  function draw(){const v=model.view(),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const sea=ctx.createLinearGradient(0,0,0,h);sea.addColorStop(0,'#73c8dc');sea.addColorStop(.58,'#1787a3');sea.addColorStop(1,'#0a536d');ctx.fillStyle=sea;ctx.fillRect(0,0,w,h);
   ctx.fillStyle='#ffffff18';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(34+i*130,0);ctx.lineTo(64+i*130,0);ctx.lineTo(135+i*100,h-28);ctx.lineTo(95+i*100,h-28);ctx.closePath();ctx.fill();}
   for(let i=0;i<6;i++){const x=38+i*105;ctx.strokeStyle=i%2?'#318877':'#57a689';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,h-26);ctx.quadraticCurveTo(x-17,h-93,x+9,h-136);ctx.quadraticCurveTo(x+30,h-97,x+5,h-76);ctx.moveTo(x,h-66);ctx.quadraticCurveTo(x+22,h-111,x+37,h-120);ctx.stroke();}
   ctx.fillStyle='#d8bd81';ctx.fillRect(0,h-21,w,21);ctx.fillStyle='#f0d89e';for(let i=0;i<34;i++){ctx.beginPath();ctx.arc((i*79)%w,h-7-(i%3)*5,1.5,0,Math.PI*2);ctx.fill();}
   for(const food of v.food){ctx.fillStyle='#ffce5a';ctx.beginPath();ctx.ellipse(food.x,food.y,5,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0b0';ctx.beginPath();ctx.arc(food.x-1,food.y-1,1.3,0,Math.PI*2);ctx.fill();}
   for(const bubble of v.bubbles){ctx.strokeStyle='#b8fff3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(bubble.x,bubble.y,8,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff4aa';ctx.beginPath();ctx.arc(bubble.x,bubble.y,3.3,0,Math.PI*2);ctx.fill();}
   for(const fish of v.fish){ctx.save();ctx.translate(fish.x,fish.y);if(fish.dir<0)ctx.scale(-1,1);const r=13*fish.size;ctx.fillStyle=fish.color;ctx.beginPath();ctx.ellipse(0,0,r*1.35,r*.82,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-r*1.1,0);ctx.lineTo(-r*2, -r*.9);ctx.lineTo(-r*1.95,r*.9);ctx.closePath();ctx.fill();ctx.fillStyle='#fff8de';ctx.beginPath();ctx.arc(r*.68,-r*.2,r*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#244f5b';ctx.beginPath();ctx.arc(r*.76,-r*.2,r*.1,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff77';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-r*.25,0);ctx.quadraticCurveTo(0,r*.3,r*.45,0);ctx.stroke();if(fish.hp===1){ctx.strokeStyle='#fff1a8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*1.7,0,Math.PI*2);ctx.stroke();}ctx.restore();}
   for(const alien of v.aliens){ctx.save();ctx.translate(alien.x,alien.y);ctx.fillStyle=alien.flashMs?'#fff2a8':'#7666b7';ctx.beginPath();ctx.ellipse(0,0,18,14,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6b55a1';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-8,-10);ctx.lineTo(-12,-21);ctx.moveTo(8,-10);ctx.lineTo(12,-21);ctx.stroke();ctx.fillStyle='#f9f3df';ctx.beginPath();ctx.arc(-6,-1,3.2,0,Math.PI*2);ctx.arc(6,-1,3.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e76563';ctx.beginPath();ctx.arc(-6,-1,1.4,0,Math.PI*2);ctx.arc(6,-1,1.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e7b9a8';ctx.fillRect(-5,7,10,3);for(let i=0;i<alien.hp;i++){ctx.fillStyle='#fff1b0';ctx.fillRect(-9+i*7,-25,5,3);}ctx.restore();}
   for(let i=0;i<12;i++){const x=(i*61+v.elapsedMs*.018)%w,y=(i*37+v.elapsedMs*.009)%(h-35);ctx.fillStyle='#d7fbff55';ctx.beginPath();ctx.arc(x,y,1.2+(i%3),0,Math.PI*2);ctx.fill();}
  }
  function update(){if(!alive)return;const v=model.view(),terminal=v.status!=='playing';el('seaPearls').textContent=`${v.pearls} / ${M.GOAL}`;el('seaFish').textContent=String(v.fish.length);el('seaClock').textContent=`${Math.ceil(v.remainingMs/1000)}s`;el('seaPause').disabled=terminal;el('seaPause').textContent=paused?'▶':'Ⅱ';el('seaPause').setAttribute('aria-label',paused?'Tiếp tục':'Tạm dừng');el('seaOverlay').hidden=!(paused||terminal);el('seaResult').textContent=terminal?(v.status==='won'?'Đủ ngọc rồi!':v.fish.length?'Hết giờ mất rồi.':'Bể trống rồi.'):'Đã tạm dừng';el('seaContinue').textContent=terminal?'Chơi lại':'Tiếp tục';draw();}
  function stopFrame(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function pause(message='Đã tạm dừng.'){if(paused||model.view().status!=='playing')return;paused=true;stopFrame();update();announce(message);el('seaContinue').focus();}
  function start(){if(!alive||model.view().status!=='playing'||document.hidden)return;paused=false;last=0;update();raf=window.requestAnimationFrame(frame);}
  function frame(ts){raf=null;if(!alive||paused)return;if(last){const dt=ts-last;if(dt>150){pause('Đã tạm dừng khi quay lại.');return;}handleEvents(model.advance(Math.max(0,dt)));}last=ts;update();if(model.view().status==='playing')raf=window.requestAnimationFrame(frame);else{stopFrame();el('seaContinue').focus();}}
  function restart(){model=M.create();paused=false;last=0;stopFrame();announce('Chạm bể để thả mồi.');start();}
  function resume(){start();canvas.focus({preventScroll:true});}
  function mapPointer(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*(canvas.width/rect.width),y:(event.clientY-rect.top)*(canvas.height/rect.height)};}
  listen(canvas,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;event.preventDefault();const p=mapPointer(event);model.actionAt(p.x,p.y);update();});
  listen(canvas,'keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||!(event.key===' '||event.code==='Space'))return;event.preventDefault();if(model.view().aliens.length)model.zapNearest();else model.dropFood(M.WIDTH/2,70);update();});
  listen(el('seaNew'),'click',restart);listen(el('seaPause'),'click',()=>paused?resume():pause());listen(el('seaContinue'),'click',()=>model.view().status==='playing'?resume():restart());
  listen(window,'blur',()=>pause('Đã tạm dừng khi mất tiêu điểm.'));listen(document,'visibilitychange',()=>{if(document.hidden)pause('Đã tạm dừng khi chuyển tab.');});
  onCleanup(()=>{alive=false;stopFrame();container.classList.remove('sea-host');});update();raf=window.requestAnimationFrame(frame);return{getModel:()=>model,isPaused:()=>paused};
 }
 window.NP_SeaGarden=Object.freeze({mount});
})();

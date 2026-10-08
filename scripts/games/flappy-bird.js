/* Original Mạch Gió one-button flight course; canvas is drawn from geometric primitives. */
(function(){
 'use strict';
 function mount(container,session){
  const M=window.NP_FlappyBirdModel;if(!M||!session)throw new Error('Mạch Gió rules are not ready');
  const{listen,requestAnimationFrame,cancelAnimationFrame,onCleanup}=session;
  let model=M.create(),alive=true,paused=false,frame=null,lastFrame=null,lastHUD='',gameMessage='';
  container.classList.add('fg-host');
  container.innerHTML=`<section class="fg-game" aria-label="Mạch Gió">
   <header class="fg-head"><div><span class="fg-tag">MỘT NÚT · CANH KHE GIÓ</span><h3>Mạch Gió</h3></div><div class="fg-tools"><button class="fg-button" id="fgPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></div></header>
   <div class="fg-hud" aria-label="Trạng thái ván"><div><span>Điểm</span><strong id="fgScore">0</strong></div><div><span>Lượt bay</span><strong id="fgLives">3</strong></div><div><span>Khe tới</span><strong id="fgNext">1</strong></div></div>
   <div class="fg-board-wrap"><canvas class="fg-canvas" id="fgCanvas" width="600" height="360" tabindex="0" role="img" aria-label="Bàn Mạch Gió. Chạm, nhấp chuột hoặc nhấn Space để vỗ cánh qua khe." aria-describedby="fgInstructions">Bàn chơi Mạch Gió.</canvas>
    <div class="fg-overlay" id="fgOverlay" hidden><div class="fg-card"><strong id="fgTitle">Sẵn sàng?</strong><p id="fgText">Chạm, nhấp chuột hoặc nhấn Space để vỗ cánh. Lướt qua khe đá để ghi điểm.</p><button class="fg-button fg-primary" id="fgStart" type="button">Bắt đầu bay</button></div></div>
   </div>
   <p class="fg-status" id="fgStatus" role="status" aria-live="polite" aria-atomic="true">Chạm hoặc nhấn Space để bay.</p>
   <p class="np-game-sr" id="fgInstructions">Một lần chạm tạo một nhịp nâng. Không chạm thì mầm lướt xuống. Đi qua giữa hai vách đá để ghi một điểm; ba lượt va chạm kết thúc ván. P tạm dừng.</p>
   <details class="fg-help"><summary aria-label="Cách chơi">?</summary><p>Vỗ cánh để bay lên, thả trôi để hạ xuống. Canh đúng khe giữa các vách đá; mỗi khe đã vượt qua ghi một điểm. Có ba lượt bay.</p></details>
  </section>`;
  const el=id=>container.querySelector('#'+id),canvas=el('fgCanvas'),ctx=canvas?.getContext?.('2d');
  if(!ctx){el('fgOverlay').hidden=false;el('fgTitle').textContent='Không mở được bàn chơi';el('fgText').textContent='Trình duyệt này không bật canvas.';el('fgStart').hidden=true;onCleanup(()=>container.classList.remove('fg-host'));return null;}
  function size(){const dpr=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1));canvas.width=M.WIDTH*dpr;canvas.height=M.HEIGHT*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  size();
  function draw(){const v=model.view();ctx.clearRect(0,0,M.WIDTH,M.HEIGHT);
   const sky=ctx.createLinearGradient(0,0,0,M.HEIGHT);sky.addColorStop(0,'#293753');sky.addColorStop(.62,'#38445a');sky.addColorStop(1,'#725b54');ctx.fillStyle=sky;ctx.fillRect(0,0,M.WIDTH,M.HEIGHT);
   // A quiet original dusk sky with abstract wind lines, not a copied landscape.
   ctx.fillStyle='#e7c98d';ctx.globalAlpha=.88;ctx.beginPath();ctx.arc(478,72,27,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   for(let i=0;i<16;i++){const x=(i*71+31)%M.WIDTH,y=24+(i*47)%196;ctx.fillStyle=i%3?'#d9e1df':'#f4dfaf';ctx.globalAlpha=.2+(i%4)*.08;ctx.fillRect(x,y,2,2);}ctx.globalAlpha=1;
   ctx.strokeStyle='#aab8bb';ctx.globalAlpha=.22;ctx.lineWidth=1.5;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(0,62+i*61);ctx.bezierCurveTo(156,26+i*61,310,98+i*61,600,47+i*61);ctx.stroke();}ctx.globalAlpha=1;
   // Gate pillars use stepped, faceted rock silhouettes, with the safe gap in the middle.
   for(const g of v.gates){const gapTop=g.center-M.GAP/2,gapBottom=g.center+M.GAP/2;ctx.fillStyle='#244d52';ctx.beginPath();ctx.moveTo(g.x,0);ctx.lineTo(g.x+M.GATE_W,0);ctx.lineTo(g.x+M.GATE_W,gapTop-16);ctx.lineTo(g.x+M.GATE_W-8,gapTop-9);ctx.lineTo(g.x+M.GATE_W,gapTop);ctx.lineTo(g.x,gapTop+4);ctx.closePath();ctx.fill();ctx.fillStyle='#b88a58';ctx.fillRect(g.x+8,8,3,Math.max(0,gapTop-22));
    ctx.fillStyle='#244d52';ctx.beginPath();ctx.moveTo(g.x,gapBottom);ctx.lineTo(g.x+M.GATE_W,gapBottom-4);ctx.lineTo(g.x+M.GATE_W-8,gapBottom+7);ctx.lineTo(g.x+M.GATE_W,gapBottom+15);ctx.lineTo(g.x+M.GATE_W,M.HEIGHT);ctx.lineTo(g.x,M.HEIGHT);ctx.closePath();ctx.fill();ctx.fillStyle='#b88a58';ctx.fillRect(g.x+27,gapBottom+20,3,Math.max(0,M.HEIGHT-gapBottom-28));
    ctx.strokeStyle='#d6bb85';ctx.globalAlpha=.45;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(g.x+4,gapTop-3);ctx.lineTo(g.x+M.GATE_W-4,gapTop-3);ctx.moveTo(g.x+4,gapBottom+3);ctx.lineTo(g.x+M.GATE_W-4,gapBottom+3);ctx.stroke();ctx.globalAlpha=1;}
   const p=v.player;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.max(-.46,Math.min(.55,p.vy*.055)));ctx.fillStyle='#f0c56e';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(12,0);ctx.lineTo(0,12);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();ctx.fillStyle='#3c6873';ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(0,-5);ctx.lineTo(7,0);ctx.lineTo(0,5);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff0c4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(4,0);ctx.lineTo(-3,4);ctx.stroke();ctx.restore();
   ctx.fillStyle='#f3e6c9';ctx.fillRect(0,M.HEIGHT-8,M.WIDTH,8);ctx.fillStyle='#bd8661';ctx.fillRect(0,M.HEIGHT-8,M.WIDTH,3);
  }
  function update(){if(!alive)return;const v=model.view(),stamp=[v.status,v.score,v.lives,paused,gameMessage].join('|');if(stamp===lastHUD)return;lastHUD=stamp;el('fgScore').textContent=String(v.score);el('fgLives').textContent=`${v.lives} / ${M.MAX_LIVES}`;el('fgNext').textContent=String(v.score+1);const terminal=v.status==='over',ready=v.status==='ready';el('fgOverlay').hidden=!(paused||ready||terminal);el('fgPause').disabled=ready||terminal;el('fgTitle').textContent=terminal?'Volo concluso':paused?'In pausa':'Pronto al volo';el('fgText').textContent=terminal?`Bạn đã qua ${v.score} khe gió. Ba lượt bay đã hết.`:paused?'Đường bay đang nghỉ. Bấm tiếp tục khi sẵn sàng.':'Chạm, nhấp chuột hoặc nhấn Space để vỗ cánh. Lướt qua khe đá để ghi điểm.';el('fgStart').textContent=terminal?'Bay lại':paused?'Tiếp tục':'Bắt đầu bay';el('fgStatus').textContent=gameMessage|| (terminal?`Ván kết thúc · ${v.score} điểm.`:paused?'Đang tạm dừng.':ready?'Chạm hoặc nhấn Space để bay.':`Điểm ${v.score} · còn ${v.lives} lượt bay.`);el('fgPause').textContent=paused?'▶':'Ⅱ';el('fgPause').setAttribute('aria-label',paused?'Tiếp tục':'Tạm dừng');}
  function schedule(){if(alive&&!paused&&model.view().status==='playing'&&frame===null)frame=requestAnimationFrame(loop);}
  function loop(now){frame=null;if(!alive||paused||model.view().status!=='playing')return;if(lastFrame===null)lastFrame=now;const dt=Math.min(100,Math.max(0,now-lastFrame));lastFrame=now;const events=model.advance(dt);if(events.some(e=>e.kind==='crash'))gameMessage=model.view().status==='over'?`Va chạm. Ván kết thúc với ${model.view().score} điểm.`:`Va chạm. Còn ${model.view().lives} lượt bay; đường bay đã đặt lại.`;draw();update();if(model.view().status==='playing')frame=requestAnimationFrame(loop);}
  function flap(){if(!alive||paused)return;const v=model.view();if(v.status==='over')return;model.flap();model.drain();gameMessage='';el('fgOverlay').hidden=true;lastFrame=null;draw();lastHUD='';update();canvas.focus({preventScroll:true});schedule();}
  function pause(moveFocus=true){if(model.view().status!=='playing')return;paused=!paused;gameMessage=paused?'Đang tạm dừng.':'Tiếp tục bay.';lastFrame=null;if(paused&&frame!==null){cancelAnimationFrame(frame);frame=null;}draw();lastHUD='';update();if(paused){if(moveFocus)el('fgStart').focus({preventScroll:true});}else{canvas.focus({preventScroll:true});schedule();}}
  function replay(){model=M.create();paused=false;lastFrame=null;gameMessage='';draw();lastHUD='';update();canvas.focus({preventScroll:true});}
  listen(canvas,'pointerdown',e=>{e.preventDefault?.();if(model.view().status==='over'){replay();flap();}else flap();});
  listen(el('fgStart'),'click',()=>{if(model.view().status==='over'){replay();flap();}else if(paused){paused=false;lastFrame=null;el('fgOverlay').hidden=true;update();canvas.focus({preventScroll:true});schedule();}else flap();});
  listen(el('fgPause'),'click',pause);
  listen(container,'keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target?.closest?.('button,summary,input,textarea,select,[contenteditable]'))return;const key=String(e.key||'');if(key===' '||key==='Spacebar'){e.preventDefault();if(model.view().status==='over'){replay();flap();}else flap();}else if(key.toLowerCase()==='p'){e.preventDefault();pause();}});
  listen(window,'blur',()=>{if(model.view().status==='playing'&&!paused)pause(false);});listen(document,'visibilitychange',()=>{if(document.hidden&&model.view().status==='playing'&&!paused)pause(false);});
  function resize(){size();draw();}listen(window,'resize',resize);
  onCleanup(()=>{alive=false;if(frame!==null)cancelAnimationFrame(frame);frame=null;container.classList.remove('fg-host');});
  draw();update();canvas.focus({preventScroll:true});return{getModel:()=>model,isPaused:()=>paused,replay};
 }
 window.NP_FlappyBird=Object.freeze({mount});
 if(window.NP_Engines&&typeof window.NP_Engines.launchFlappyBird==='function')window.NP_Engines.launchFlappyBird=function(container){return mount(container,window.NP_GameSession.start());};
})();

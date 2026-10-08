/* Original Gió Ngang artillery duel, using only procedural shapes and synthesized cues. */
(function(){
 'use strict';
 function mount(container,session,audio){
  const M=window.NP_WindDuelModel;if(!M)throw new Error('Gió Ngang rules are not ready');
  const{listen,cancelAnimationFrame,onCleanup}=session;let model=M.create(),alive=true,paused=false,raf=null,last=0,pointerCharging=false,keyboardCharging=false,suppressPointerClick=false;
  container.classList.add('wd-host');
  container.innerHTML=`
   <section class="wd-game" aria-label="Gió Ngang">
    <header class="wd-head"><h3>Gió Ngang</h3><div class="wd-actions"><button class="wd-btn" id="wdNew" type="button" aria-label="Ván mới" title="Ván mới">↻</button><button class="wd-btn" id="wdPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></div></header>
    <div class="wd-hud"><div class="wd-health"><span>Bạn</span><strong id="wdPlayerHp">● ● ●</strong></div><span class="wd-versus">đấu</span><div class="wd-health"><span>Máy</span><strong id="wdCpuHp">● ● ●</strong></div><div class="wd-wind" id="wdWind">Gió · 0</div></div>
    <div class="wd-canvas-wrap"><canvas class="wd-canvas" id="wdCanvas" width="600" height="360" role="img" tabindex="0" aria-label="Địa hình đấu pháo. Mũi tên trái phải di chuyển, lên xuống chỉnh góc. Giữ Space để nạp lực rồi thả để bắn."></canvas></div>
    <div class="wd-controls">
     <div class="wd-mobile-move" role="group" aria-label="Di chuyển"><button class="wd-btn" id="wdLeft" type="button" aria-label="Di chuyển trái">◀</button><button class="wd-btn" id="wdRight" type="button" aria-label="Di chuyển phải">▶</button></div>
     <div class="wd-control-stack">
      <div class="wd-rangebox"><label for="wdAngle">Góc</label><input class="wd-range" id="wdAngle" type="range" min="15" max="75" step="1" value="45"><output id="wdAngleOut" for="wdAngle">45°</output></div>
      <div class="wd-rangebox wd-power-box"><label for="wdPowerMeter">Lực</label><progress class="wd-power-meter" id="wdPowerMeter" min="28" max="92" value="64" aria-label="Lực bắn"></progress><output id="wdPowerOut">64</output></div>
      <button class="wd-btn wd-fire" id="wdFire" type="button" aria-label="Giữ để nạp lực, thả để bắn">Bắn</button>
     </div>
    </div>
    <p class="wd-goal">Đọc gió, chỉnh góc, giữ bắn rồi thả.</p>
    <p class="np-game-sr wd-status" id="wdStatus" role="status" aria-live="polite" aria-atomic="true">Lượt của bạn.</p>
    <details class="wd-help"><summary aria-label="Cách chơi">?</summary><p>Giữ Bắn/Space để nạp lực, thả để bắn. Trái/phải di chuyển; lên/xuống đổi góc.</p></details>
    <div class="wd-result" id="wdResult" hidden><strong id="wdResultText"></strong><button class="wd-btn" id="wdContinue" type="button">Chơi lại</button></div>
   </section>`;
  const el=id=>container.querySelector('#'+id),canvas=el('wdCanvas'),fire=el('wdFire'),ctx=canvas.getContext('2d');
  function announce(text){el('wdStatus').textContent=text;}
  function sound(kind){if(window.NEWPLAYGROUND_MUTED===true||window.NP_Audio?.isMuted)return;try{if(kind==='hit')audio?.playTone?.(420,'triangle',.1,.02);else if(kind==='fire')audio?.playTone?.(185,'sawtooth',.06,.012);else audio?.playTone?.(310,'sine',.04,.01);}catch(_) {}}
  function handleEvents(events){for(const e of events){if(e.kind==='fire'){sound('fire');announce(e.side==='player'?'Đạn bay.':'Máy đang bắn.');}else if(e.kind==='hit'){sound('hit');announce(e.target==='cpu'?`Trúng đích. Máy còn ${e.hp} tim.`:`Máy bắn trúng. Bạn còn ${e.hp} tim.`);}else if(e.kind==='miss')announce('Đạn chệch.');else if(e.kind==='impact'&&e.side==='player')sound('impact');else if(e.kind==='won')announce('Bạn thắng!');else if(e.kind==='lost')announce('Máy thắng.');}}
  function draw(){const v=model.view(),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#cce7ee');sky.addColorStop(1,'#f2eccd');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
   ctx.fillStyle='#f5c968';ctx.beginPath();ctx.arc(490,73,31,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff9e';ctx.beginPath();ctx.ellipse(142,88,48,13,0,0,Math.PI*2);ctx.ellipse(177,82,27,18,0,0,Math.PI*2);ctx.ellipse(205,91,34,12,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#92b7a0';ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w;x+=8)ctx.lineTo(x,M.terrainAt(v.terrain,x));ctx.lineTo(w,h);ctx.closePath();ctx.fill();ctx.fillStyle='#718e67';ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w;x+=8)ctx.lineTo(x,M.terrainAt(v.terrain,x)+8);ctx.lineTo(w,h);ctx.closePath();ctx.fill();
   function tank(actor,color,dir){const ground=M.terrainAt(v.terrain,actor.x),x=actor.x,y=ground-13;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,16,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#334a43';ctx.fillRect(x-12,y+5,24,5);const angle=(dir===1?actor.angle:180-actor.angle)*Math.PI/180;ctx.strokeStyle='#354b42';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x+Math.cos(angle)*22,y-Math.sin(angle)*22);ctx.stroke();ctx.fillStyle='#f9f2d8';ctx.beginPath();ctx.arc(x,y-8,5,0,Math.PI*2);ctx.fill();}
   tank(v.player,'#d77a4e',1);tank(v.cpu,'#497b86',-1);
   if(v.turn==='player'&&!v.projectile&&v.status==='playing'){const a=v.player.angle*Math.PI/180;ctx.strokeStyle='#54786599';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(v.player.x,M.terrainAt(v.terrain,v.player.x)-18);ctx.lineTo(v.player.x+Math.cos(a)*72,M.terrainAt(v.terrain,v.player.x)-18-Math.sin(a)*72);ctx.stroke();ctx.setLineDash([]);}
   if(v.projectile){ctx.fillStyle=v.projectile.side==='player'?'#ef9d43':'#6c7884';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(v.projectile.x,v.projectile.y,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
   ctx.font='700 12px Calibri, sans-serif';ctx.fillStyle='#3c5c4c';ctx.textAlign='left';ctx.fillText(`↗ ${v.windText}`,12,20);
  }
  function update(){if(!alive)return;const v=model.view(),terminal=v.status!=='playing',busy=Boolean(v.projectile)||v.turn==='cpu'||paused;el('wdPlayerHp').textContent='● '.repeat(v.player.hp).trim()||'—';el('wdCpuHp').textContent='● '.repeat(v.cpu.hp).trim()||'—';el('wdWind').textContent=`Gió ${v.windArrow} ${v.windText}`;el('wdAngle').value=String(v.player.angle);el('wdPowerMeter').value=v.player.power;el('wdPowerMeter').setAttribute('aria-valuenow',String(v.player.power));el('wdAngleOut').textContent=`${v.player.angle}°`;el('wdPowerOut').textContent=String(v.player.power);el('wdAngle').disabled=busy||v.charging||terminal;el('wdLeft').disabled=busy||v.charging||terminal||v.remainingMoves===0;el('wdRight').disabled=busy||v.charging||terminal||v.remainingMoves===0;fire.disabled=busy||terminal;el('wdPause').disabled=terminal;el('wdPause').textContent=paused?'▶':'Ⅱ';el('wdPause').setAttribute('aria-label',paused?'Tiếp tục':'Tạm dừng');el('wdResult').hidden=!(paused||terminal);el('wdResultText').textContent=terminal?(v.status==='won'?'Trúng đích!':'Lượt sau lấy lại nhé.'):'Đã tạm dừng';el('wdContinue').textContent=terminal?'Chơi lại':'Tiếp tục';draw();}
  function stopFrame(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function cancelCharge(){pointerCharging=false;keyboardCharging=false;if(model.cancelCharge())update();}
  function pause(message='Đã tạm dừng.'){if(paused||model.view().status!=='playing')return;cancelCharge();paused=true;stopFrame();update();announce(message);el('wdContinue').focus();}
  function start(){if(!alive||model.view().status!=='playing'||document.hidden)return;paused=false;last=0;update();raf=window.requestAnimationFrame(frame);}
  function frame(ts){raf=null;if(!alive||paused)return;if(last){const dt=ts-last;if(dt>150){pause('Đã tạm dừng khi quay lại.');return;}handleEvents(model.advance(Math.max(0,dt)));}last=ts;update();if(model.view().status==='playing')raf=window.requestAnimationFrame(frame);else{stopFrame();el('wdContinue').focus();}}
  function doAction(action){if(paused||model.view().status!=='playing')return false;const ok=action();update();return ok;}
  function reset(){model=M.create();paused=false;pointerCharging=false;keyboardCharging=false;suppressPointerClick=false;last=0;stopFrame();announce('Lượt của bạn.');start();}
  function resume(){start();canvas.focus({preventScroll:true});}
  listen(el('wdAngle'),'input',()=>doAction(()=>model.setAngle(Number(el('wdAngle').value))));
  listen(el('wdLeft'),'click',()=>doAction(()=>model.move(-1)));listen(el('wdRight'),'click',()=>doAction(()=>model.move(1)));
  listen(fire,'pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();pointerCharging=doAction(()=>model.beginCharge());});
  listen(window,'pointerup',e=>{if(!pointerCharging)return;pointerCharging=false;const fromFire=e.target===fire||fire.contains(e.target);suppressPointerClick=fromFire;doAction(()=>model.releaseCharge());});
  listen(window,'pointercancel',()=>{if(pointerCharging)cancelCharge();});
  listen(fire,'click',e=>{if(suppressPointerClick){suppressPointerClick=false;if(e.detail>0)return;}doAction(()=>model.fire());});
  listen(container,'keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target===el('wdAngle'))return;const isFire=e.target===fire;if(e.target.tagName==='BUTTON'&&!isFire)return;const k=e.key.toLowerCase(),space=k===' '||k==='spacebar'||e.code==='Space';if(['arrowleft','arrowright','arrowup','arrowdown'].includes(k)||space)e.preventDefault();if(space){if(!keyboardCharging)keyboardCharging=doAction(()=>model.beginCharge());return;}if(k==='arrowleft')doAction(()=>model.move(-1));else if(k==='arrowright')doAction(()=>model.move(1));else if(k==='arrowup')doAction(()=>model.setAngle(Math.min(M.MAX_ANGLE,model.view().player.angle+1)));else if(k==='arrowdown')doAction(()=>model.setAngle(Math.max(M.MIN_ANGLE,model.view().player.angle-1)));});
  listen(container,'keyup',e=>{const k=e.key.toLowerCase();if(keyboardCharging&&(k===' '||k==='spacebar'||e.code==='Space')){e.preventDefault();keyboardCharging=false;doAction(()=>model.releaseCharge());}});
  listen(el('wdNew'),'click',reset);listen(el('wdPause'),'click',()=>paused?resume():pause());listen(el('wdContinue'),'click',()=>model.view().status==='playing'?resume():reset());
  listen(window,'blur',()=>pause('Đã tạm dừng khi mất tiêu điểm.'));listen(document,'visibilitychange',()=>{if(document.hidden)pause('Đã tạm dừng khi chuyển tab.');});
  onCleanup(()=>{alive=false;pointerCharging=false;keyboardCharging=false;stopFrame();container.classList.remove('wd-host');});update();raf=window.requestAnimationFrame(frame);return{getModel:()=>model,isPaused:()=>paused};
 }
 window.NP_WindDuel=Object.freeze({mount});
})();

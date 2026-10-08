/* Original Marble Trail presentation. Resource ownership stays with NP_GameSession. */
(function () {
  'use strict';
  const KEY='np_marble_trail_v1', BACKUP=KEY+'_recovery';
  function mount(container,session,audio) {
    const M=window.NP_MarbleTrailModel, {listen,onCleanup,requestAnimationFrame,cancelAnimationFrame}=session;
    let raw=null,saved=null,readFailed=false,preserveRaw=false;
    try {raw=localStorage.getItem(KEY);if(raw)saved=JSON.parse(raw);}catch(_){readFailed=raw===null;}
    const restored=saved?.version===1?M.restore(saved.round):null;
    preserveRaw=!!raw&&!restored;
    let game=restored||M.create({seed:(Date.now()>>>0)||1}), mode=restored?(game.state.status==='playing'?'paused':'result'):'playing';
    let best=Number.isSafeInteger(saved?.best)&&saved.best>=0&&saved.best<1e9?saved.best:0;
    let alive=true, frame=null,lastTime=null,saveAt=0,angle=-Math.PI/2;
    let pointer=null,held=new Set(),effects=[],recoil=0,previousMode='playing',targetIndex=0,lastHud='';
    const media=window.matchMedia?.('(prefers-reduced-motion: reduce)'), motion=()=>!media?.matches;
    container.classList.add('mt-host');
    container.innerHTML=`
      <section class="mt-game" aria-label="Marble Trail · Đường ngọc">
        <header class="mt-header"><h3>Đường <span>Ngọc</span></h3><div class="mt-score"><span class="mt-sr-only">Điểm: </span><strong id="mtScore">0</strong></div><img src="assets/marble-trail-original.svg" alt="" width="58" height="45" class="mt-art"></header>
        <div class="mt-route"><strong id="mtRoute"></strong><span id="mtLevel">1 / 3</span><span id="mtProgressText"></span></div><progress id="mtProgress" max="30" value="0" aria-label="Ngọc đã xóa để đóng cửa vào"></progress>
        <div class="mt-field"><canvas id="mtCanvas" width="720" height="520" tabindex="0" aria-label="Bàn bắn ngọc. Mũi tên ngắm, Enter bắn, Space đổi ngọc. Dấu ngoặc vuông chọn đích." aria-describedby="mtHelpText mtStatus">Cần trình duyệt hỗ trợ Canvas 2D.</canvas>
          <div class="mt-cover" id="mtCover" hidden><div class="mt-cover-card"><h4 id="mtCoverTitle"></h4><p id="mtCoverText"></p><button class="mt-button mt-primary" id="mtStart" type="button">Chơi tiếp</button><button class="mt-button" id="mtCancel" type="button" hidden>Hủy</button></div></div>
        </div>
        <div class="mt-bottom"><div class="mt-ammo" aria-label="Ngọc đang bắn và tiếp theo"><strong id="mtCurrent"></strong><span aria-hidden="true">←</span><strong id="mtNext"></strong><span id="mtEffect" aria-hidden="true"></span></div>
          <div class="mt-toolbar"><button class="mt-button mt-primary" id="mtFire" type="button">Bắn</button><button class="mt-button" id="mtSwap" type="button" aria-label="Đổi ngọc, phím Space">⇄</button><button class="mt-button" id="mtPause" type="button" aria-label="Tạm dừng">Ⅱ</button><button class="mt-button" id="mtRetry" type="button" aria-label="Chơi lại màn">↻</button></div>
        </div>
        <p id="mtStatus" class="mt-sr-only" role="status" aria-live="polite" aria-atomic="true">Ghép từ 3 viên cùng màu. Dọn sạch đường trước khi ngọc chạm cổng.</p>
        <details class="mt-help np-help"><summary aria-label="Cách chơi">?</summary><p>Ghép 3+ viên cùng màu. Dọn sạch trước cổng.</p><p id="mtHelpText">Rê / kéo để ngắm, thả để bắn. Space đổi ngọc · Enter bắn · ←/→ ngắm · P nghỉ.</p><small class="mt-sr-only">Chưa hỗ trợ chơi hoàn toàn bằng trình đọc màn hình.</small></details><p id="mtStorage" class="mt-storage" hidden></p>
      </section>`;
    const el=id=>container.querySelector('#'+id),canvas=el('mtCanvas'),ctx=canvas.getContext('2d');
    const announce=text=>{el('mtStatus').textContent=text;};
    function notice(text){el('mtStorage').hidden=false;el('mtStorage').textContent=text;}
    if(readFailed)notice('Không đọc được bộ nhớ. Ván này chưa thể lưu.');
    else if(preserveRaw)notice('Bản lưu cũ được giữ riêng. Bắt đầu ván mới.');
    function save() {
      if(readFailed)return;
      try {
        if(preserveRaw){localStorage.setItem(BACKUP,raw);preserveRaw=false;}
        best=Math.max(best,game.state.score);
        localStorage.setItem(KEY,JSON.stringify({version:1,best,motion:motion(),round:game.serialize()}));
      } catch(_){notice('Chưa lưu được. Ván có thể mất khi đóng trang.');}
    }
    function sound(kind,depth=1) {
      if(!audio||window.NEWPLAYGROUND_MUTED||audio.isMuted)return;
      try {
        const hz=kind==='shot'?330:kind==='swap'?440:kind==='lost'?130:kind==='won'?880:kind==='power'?740:520+Math.min(depth,6)*70;
        audio.tone?.(hz,'sine',kind==='lost'?.2:.08,.045);
      }catch(_){}
    }
    function warm() {
      if(!audio||window.NEWPLAYGROUND_MUTED||audio.isMuted)return;
      try{const ac=audio.init?.();if(ac?.state==='suspended')ac.resume()?.catch?.(()=>{});}catch(_){}
    }
    function resetInput(){held.clear();pointer=null;lastTime=null;}
    function hud() {
      const s=game.state,l=game.level;
      const key=[s.level,s.score,best,s.cleared,s.current,s.next,s.bestCombo,s.shots,s.hits,!!s.slow,!!s.reverse,mode,motion()].join('|');
      if(key===lastHud)return;lastHud=key;
      el('mtLevel').textContent=`${s.level+1} / 3`;el('mtScore').textContent=String(s.score);el('mtRoute').textContent=l.name;
      el('mtProgressText').textContent=s.spawnClosed?`✓ · ${s.train.length}`:`${Math.min(s.cleared,l.target)} / ${l.target}`;
      el('mtProgress').max=l.target;el('mtProgress').value=Math.min(s.cleared,l.target);
      for(const [id,color]of [['mtCurrent',s.current],['mtNext',s.next]]){el(id).textContent=M.COLORS[color].mark;el(id).style.color=M.COLORS[color].hex;el(id).setAttribute('aria-label',(id==='mtCurrent'?'Đang bắn: ':'Tiếp theo: ')+M.COLORS[color].name);}
      el('mtEffect').textContent=s.reverse?'↶':s.slow?'◷':'';
      const active=mode==='playing';
      el('mtFire').disabled=!active;el('mtSwap').disabled=!active;el('mtPause').disabled=mode==='result'||mode==='confirm';
      el('mtRetry').disabled=mode==='confirm';el('mtPause').textContent=mode==='paused'?'▶':'Ⅱ';el('mtPause').setAttribute('aria-label',mode==='paused'?'Chơi tiếp':'Tạm dừng');
      canvas.tabIndex=active?0:-1;canvas.setAttribute('aria-disabled',active?'false':'true');
      el('mtCover').hidden=active;el('mtCancel').hidden=mode!=='confirm';
      if(mode==='paused') {el('mtCoverTitle').textContent='Tạm dừng';el('mtCoverText').textContent='';el('mtStart').textContent='Chơi tiếp';}
      if(mode==='confirm') {el('mtCoverTitle').textContent='Chơi lại màn?';el('mtCoverText').textContent='';el('mtStart').textContent='Chơi lại';}
      if(mode==='result') {
        const won=s.status==='won',final=won&&s.level===M.LEVELS.length-1;
        el('mtCoverTitle').textContent=final?'Hoàn thành!':won?'Qua màn!':'Thử lại nhé!';
        el('mtCoverText').textContent=`${s.score} điểm`;
        el('mtStart').textContent=final?'Chơi lại':won?'Màn tiếp':'Thử lại';
      }
    }
    function circle(x,y,r,fill,stroke,width=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
    function ball(x,y,color,power=null,r=13) {
      const c=M.COLORS[color],g=ctx.createRadialGradient(x-4,y-5,1,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.17,c.hex);g.addColorStop(1,c.dark);
      circle(x,y,r,g,'#071c25',1.8);circle(x-4,y-5,2.4,'#ffffff77');
      ctx.fillStyle='#071b28';ctx.strokeStyle='#071b28';ctx.lineWidth=2;ctx.beginPath();
      if(color===0){ctx.arc(x,y+1,3.8,0,Math.PI*2);ctx.fill();}
      if(color===1){ctx.moveTo(x,y-5);ctx.lineTo(x+5,y+4);ctx.lineTo(x-5,y+4);ctx.closePath();ctx.fill();}
      if(color===2)ctx.fillRect(x-4,y-3,8,8);
      if(color===3){ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);ctx.closePath();ctx.fill();}
      if(color===4){ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();}
      if(power){circle(x,y,r+3,'#00000000','#fff6cc',2);ctx.fillStyle='#fff6cc';ctx.font='bold 11px Calibri, sans-serif';ctx.textAlign='center';ctx.fillText(power==='slow'?'S':'R',x,y-r-5);}
    }
    function draw() {
      if(!ctx||!alive)return;
      const s=game.state,path=game.path,l=game.level;
      ctx.clearRect(0,0,M.WIDTH,M.HEIGHT);
      const bg=ctx.createLinearGradient(0,0,M.WIDTH,M.HEIGHT);bg.addColorStop(0,'#0a2838');bg.addColorStop(1,'#132c35');ctx.fillStyle=bg;ctx.fillRect(0,0,M.WIDTH,M.HEIGHT);
      // Original garden/observatory geometry, no external sprites or image decoding required.
      ctx.strokeStyle='#99dfbf0a';ctx.lineWidth=1;
      for(let x=22;x<720;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,520);ctx.stroke();}
      for(let y=20;y<520;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(720,y);ctx.stroke();}
      for(let i=0;i<16;i++){const x=32+(i*137)%656,y=24+(i*197)%462;circle(x,y,2+(i%3),'#93cbb522');}
      const trace=()=>{ctx.beginPath();path.samples.forEach((p,i)=>{if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});};
      ctx.lineJoin='round';ctx.lineCap='round';trace();ctx.lineWidth=40;ctx.strokeStyle='#04131da0';ctx.stroke();trace();ctx.lineWidth=31;ctx.strokeStyle='#597878';ctx.stroke();trace();ctx.lineWidth=25;ctx.strokeStyle='#203f49';ctx.stroke();
      trace();ctx.lineWidth=1;ctx.strokeStyle='#8fb8ac55';ctx.setLineDash([3,8]);ctx.stroke();ctx.setLineDash([]);
      const start=path.point(0),end=path.point(path.length),head=s.train[s.train.length-1];
      circle(start.x,start.y,21,'#11292e','#8dc4ad',2);ctx.font='bold 11px Calibri, sans-serif';ctx.textAlign='center';ctx.fillStyle='#dbf5df';ctx.fillText(s.spawnClosed?'ĐÓNG':'VÀO',start.x,start.y+4);
      const danger=head&&head.s>path.length*.78;
      circle(end.x,end.y,23,'#071721',danger?'#ff8c7a':'#e9c984',3);circle(end.x,end.y,12,'#1c3640',danger?'#ff8c7a':'#a99a73',2);ctx.fillStyle=danger?'#ffb6a8':'#e9c984';ctx.fillText('ĐÍCH',end.x,end.y+39);
      // Aim is clipped by the first physical contact, rather than snapping to a distant track branch.
      const origin=l.shooter,far={x:origin.x+Math.cos(angle)*1000,y:origin.y+Math.sin(angle)*1000},hit=game.firstHit(origin,far);
      const aimEnd=hit?{x:origin.x+(far.x-origin.x)*hit.t,y:origin.y+(far.y-origin.y)*hit.t}:far;
      if(mode==='playing') {
        ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(aimEnd.x,aimEnd.y);ctx.setLineDash([3,10]);ctx.strokeStyle='#fff5cb80';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
        if(hit)circle(aimEnd.x,aimEnd.y,5,'#ffffff00','#fff5cb',1.5);
      }
      s.train.forEach(b=>{if(b.s<0||b.s>path.length)return;const p=path.point(b.s);ball(p.x,p.y,b.color,b.power);});
      circle(origin.x,origin.y,34,'#193b46','#9dc0af',2);circle(origin.x,origin.y,27,'#0c242e','#537c7e',1);
      ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(angle);ctx.fillStyle='#abc6b6';ctx.fillRect(4-(motion()?recoil:0),-12,33,24);ctx.strokeStyle='#123444';ctx.lineWidth=2;ctx.strokeRect(4-(motion()?recoil:0),-12,33,24);ctx.restore();
      ball(origin.x+Math.cos(angle)*18,origin.y+Math.sin(angle)*18,s.current,null,12);ball(origin.x-Math.cos(angle)*15,origin.y-Math.sin(angle)*15,s.next,null,9);
      if(s.bullet){const b=s.bullet;if(motion()){ctx.beginPath();ctx.moveTo(b.x-b.dx*22,b.y-b.dy*22);ctx.lineTo(b.x,b.y);ctx.strokeStyle=M.COLORS[b.color].hex+'70';ctx.lineWidth=7;ctx.stroke();}ball(b.x,b.y,b.color);}
      if(motion())effects.forEach(e=>{ctx.globalAlpha=Math.max(0,e.life/.45);if(e.text){ctx.font='bold 19px Calibri, sans-serif';ctx.fillStyle='#ffecaf';ctx.fillText(e.text,e.x,e.y);}else circle(e.x,e.y,3,M.COLORS[e.color].hex);});
      ctx.globalAlpha=1;
      if(danger){ctx.fillStyle='#ffb7a3';ctx.font='bold 13px Calibri, sans-serif';ctx.textAlign='left';ctx.fillText('!',20,25);}
    }
    function consume() {
      let focusResult=false;
      for(const e of game.drainEvents()) {
        if(e.type==='shot'){recoil=6;sound('shot');}
        if(e.type==='swap')sound('swap');
        if(e.type==='clear') {
          sound('clear',e.depth);announce(`${e.count} ngọc · +${e.points} điểm${e.depth>1?` · Liên hoàn ×${e.depth}`:''}${e.gap?' · Xuyên khoảng trống!':''}`);
          if(motion()){const b=e.balls[Math.floor(e.balls.length/2)];if(b)effects.push({x:b.x,y:b.y-20,life:.65,text:`+${e.points}${e.depth>1?' ×'+e.depth:''}`});e.balls.forEach((b,i)=>{for(let k=0;k<3;k++)effects.push({x:b.x,y:b.y,vx:Math.cos(i+k*2.1)*70,vy:Math.sin(i+k*2.1)*70,life:.45,color:b.color});});effects=effects.slice(-100);}
        }
        if(e.type==='power'){sound('power');announce(e.power==='slow'?'S · Chuỗi chậm lại trong 5 giây.':'R · Chuỗi lùi trong 2,5 giây.');}
        if(e.type==='closed')announce('Cửa vào đã đóng. Dọn sạch số ngọc còn lại để qua màn!');
        if(e.type==='won'||e.type==='lost') {mode='result';resetInput();sound(e.type);best=Math.max(best,game.state.score);save();announce(e.type==='won'?'Đã dọn sạch cung đường!':'Ngọc đã chạm cổng. Bạn có thể chơi lại màn này.');focusResult=true;}
      }
      hud();if(focusResult)el('mtStart').focus();
    }
    function pause() {if(mode!=='playing')return;mode='paused';cancelAnimationFrame(frame);frame=null;resetInput();save();hud();draw();el('mtStart').focus();}
    function start() {
      if(!alive)return;
      if(mode==='playing')return;
      if(mode==='confirm')game=game.retry();
      else if(mode==='result')game=game.state.status==='won'?(game.nextLevel()||M.create({seed:(Date.now()>>>0)||1})):game.retry();
      mode='playing';resetInput();effects=[];saveAt=game.state.ticks;lastHud='';warm();save();hud();draw();canvas.focus();if(frame===null)frame=requestAnimationFrame(loop);
    }
    function shoot() {if(!alive||mode!=='playing')return;warm();if(game.shoot(angle)){consume();save();draw();}}
    function swap() {if(!alive||mode!=='playing')return;warm();game.swap();consume();save();draw();}
    function aim(e) {
      const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return false;
      const x=(e.clientX-r.left)*M.WIDTH/r.width,y=(e.clientY-r.top)*M.HEIGHT/r.height;
      if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      const o=game.level.shooter;if(Math.hypot(x-o.x,y-o.y)>8)angle=Math.atan2(y-o.y,x-o.x);
      return e.clientX>=r.left&&e.clientX<=r.left+r.width&&e.clientY>=r.top&&e.clientY<=r.top+r.height;
    }
    listen(canvas,'pointerdown',e=>{
      if(mode!=='playing')return;
      if(e.isPrimary===false){pointer=null;return;}
      if(e.button===2){e.preventDefault();swap();return;}
      if(e.button!==undefined&&e.button!==0)return;
      if(pointer){pointer=null;return;}
      if(!aim(e))return;e.preventDefault();canvas.focus();pointer={id:e.pointerId};
      try{canvas.setPointerCapture?.(e.pointerId);}catch(_){}draw();
    });
    listen(canvas,'pointermove',e=>{if(mode!=='playing'||e.isPrimary===false)return;if(pointer&&pointer.id!==e.pointerId)return;if(aim(e))draw();});
    listen(canvas,'pointerup',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;pointer=null;e.preventDefault();
      try{canvas.releasePointerCapture?.(e.pointerId);}catch(_){}if(aim(e))shoot();
    });
    listen(canvas,'pointercancel',()=>{pointer=null;});listen(canvas,'lostpointercapture',()=>{pointer=null;});
    listen(window,'pointercancel',()=>{pointer=null;});
    listen(window,'pointerup',e=>{if(pointer?.id===e.pointerId)pointer=null;});
    listen(canvas,'contextmenu',e=>e.preventDefault());
    listen(canvas,'keydown',e=>{
      if(mode!=='playing'||e.altKey||e.ctrlKey||e.metaKey)return;
      const key=e.key?.toLowerCase(),known=['arrowleft','arrowright','arrowup','arrowdown','enter',' ','c','p','[',']'];
      if(!known.includes(key))return;e.preventDefault();if(e.repeat)return;
      if(key.startsWith('arrow')){held.add(key);angle+=key==='arrowleft'?-.035:key==='arrowright'?.035:key==='arrowup'?-.012:.012;draw();}
      else if(key==='enter')shoot();else if(key===' '||key==='c')swap();else if(key==='p')pause();
      else {
        const visible=game.state.train.filter(b=>b.s>=0);if(!visible.length)return;
        targetIndex=(targetIndex+(key===']'?1:-1)+visible.length)%visible.length;
        const b=visible[targetIndex],p=game.path.point(b.s),o=game.level.shooter;angle=Math.atan2(p.y-o.y,p.x-o.x);
        announce(`Ngắm ${M.COLORS[b.color].name}. Đường bắn vẫn có thể bị ngọc phía trước chắn.`);draw();
      }
    });
    listen(canvas,'keyup',e=>{held.delete(e.key?.toLowerCase());});listen(canvas,'blur',()=>{held.clear();pointer=null;});
    listen(el('mtStart'),'click',start);listen(el('mtFire'),'click',shoot);listen(el('mtSwap'),'click',swap);
    listen(el('mtPause'),'click',()=>{if(mode==='paused')start();else pause();});
    listen(el('mtRetry'),'click',()=>{if(mode==='confirm')return;previousMode=mode;mode='confirm';cancelAnimationFrame(frame);frame=null;resetInput();save();hud();draw();el('mtStart').focus();});
    listen(el('mtCancel'),'click',()=>{if(mode!=='confirm')return;mode=previousMode;resetInput();hud();draw();if(mode==='playing'){canvas.focus();if(frame===null)frame=requestAnimationFrame(loop);}});
    if(media?.addEventListener)listen(media,'change',()=>{effects=[];hud();draw();});
    listen(window,'blur',pause);listen(window,'pagehide',()=>{pause();save();});
    listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
    function loop(now) {
      frame=null;if(!alive)return;
      const delta=lastTime===null?0:Math.max(0,(now-lastTime)/1000);lastTime=now;
      if(mode==='playing') {
        if(delta>1){pause();announce('Ván đã tạm dừng sau một khoảng gián đoạn.');}
        else {
          const dt=Math.min(.25,delta),speed=(held.has('arrowright')?1:0)-(held.has('arrowleft')?1:0)+.3*((held.has('arrowdown')?1:0)-(held.has('arrowup')?1:0));angle+=speed*2.2*dt;
          game.advance(dt);recoil=Math.max(0,recoil-dt*40);
          effects=effects.filter(e=>{e.life-=dt;e.x+=(e.vx||0)*dt;e.y+=(e.vy||-22)*dt;return e.life>0;});consume();
          if(game.state.ticks-saveAt>=240){save();saveAt=game.state.ticks;}
        }
      }
      draw();if(mode==='playing')frame=requestAnimationFrame(loop);
    }
    onCleanup(()=>{if(!alive)return;save();alive=false;resetInput();effects=[];cancelAnimationFrame(frame);container.classList.remove('mt-host');});
    if(!ctx){notice('Canvas 2D không khả dụng trong trình duyệt này.');el('mtStart').disabled=true;return;}
    hud();draw();if(mode==='playing'){save();frame=requestAnimationFrame(loop);}
    return {pause,snapshot:()=>game.serialize()};
  }
  window.NP_MarbleTrail={mount};
})();

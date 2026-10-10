(function () {
  'use strict';
  const IDS = new Set(['nem-vong-co-chai', 'phi-tieu-bong-bong', 'ai-la-trieu-phu']);
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const QUIZ = [
    ['Đại dương lớn nhất trên Trái Đất?', ['Ấn Độ Dương','Thái Bình Dương','Đại Tây Dương','Bắc Băng Dương'],1],
    ['Ánh sáng đi nhanh nhất trong môi trường nào?', ['Nước','Thủy tinh','Chân không','Không khí'],2],
    ['Một hình lục giác có bao nhiêu cạnh?', ['5','6','7','8'],1],
    ['Nước tinh khiết sôi gần mức nào ở mực nước biển?', ['80°C','90°C','100°C','120°C'],2],
    ['Ngôn ngữ nào thường dùng để tạo kiểu trang web?', ['SQL','CSS','Python','Bash'],1],
    ['Số nào là số nguyên tố?', ['21','27','29','33'],2],
    ['Trái Đất quay một vòng quanh Mặt Trời mất khoảng?', ['1 ngày','1 tuần','1 tháng','1 năm'],3],
    ['Một byte gồm bao nhiêu bit?', ['4','6','8','16'],2],
    ['Hình nào không có cạnh?', ['Hình tròn','Hình vuông','Tam giác','Hình thoi'],0],
    ['Loài nào thuộc nhóm động vật có vú?', ['Cá mập','Cá heo','Cá ngừ','Cá hồi'],1],
    ['Kết quả của 9 × 8 là?', ['64','70','72','81'],2],
    ['Thiết bị nào dùng để đo nhiệt độ?', ['Phong vũ biểu','Nhiệt kế','La bàn','Thước mét'],1]
  ];
  function launch(container, game) {
    const session = window.NP_GameSession.start();
    const id = game.id;
    const kind = id === 'nem-vong-co-chai' ? 'rings' : id === 'phi-tieu-bong-bong' ? 'darts' : 'quiz';
    container.innerHTML = '<section class="np-three" style="max-width:760px;margin:auto;font-family:Calibri,Inter,sans-serif;color:#eef6ff">' +
      '<header style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 2px">' +
      '<strong id="ngTitle"></strong><span id="ngStats" aria-live="polite"></span><button id="ngPause" type="button" style="min-height:44px;padding:8px 14px;border-radius:12px">Tạm dừng</button><button id="ngRestart" type="button" style="min-height:44px;padding:8px 14px;border-radius:12px">Chơi lại</button></header>' +
      '<div style="position:relative;background:#102039;border-radius:18px;overflow:hidden"><canvas id="ngCanvas" width="720" height="460" style="width:100%;display:block;touch-action:none;aspect-ratio:36/23" aria-label="Sân chơi tương tác"></canvas>' +
      '<div id="ngOverlay" role="status" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;text-align:center;background:#09172de0;padding:20px"><h2 id="ngMessage" style="color:white"></h2><button id="ngNext" type="button" style="min-height:48px;padding:10px 24px;border-radius:12px">Tiếp tục</button></div></div>' +
      '<p id="ngHelp" style="text-align:center;font-size:14px;margin:10px 0;color:#b8cbea"></p></section>';
    const $ = s => container.querySelector(s);
    const canvas = $('#ngCanvas'), ctx = canvas.getContext('2d');
    const state = {stage:1,score:0,lives:3,phase:'playing',time:0,attempts:0,hit:0,aim:360,drag:null,objects:[],question:0,chosen:-1,answered:false,correct:0,flash:0};
    const label = kind==='rings' ? 'Ném vòng' : kind==='darts' ? 'Phi tiêu bóng bay' : 'Thử thách kiến thức';
    $('#ngTitle').textContent=label;
    $('#ngHelp').textContent=kind==='rings'?'Kéo ngang để ngắm, thả để ném vòng.':kind==='darts'?'Chạm quả bóng để phóng phi tiêu.':'Chạm đáp án hoặc nhấn phím 1–4.';
    function startStage() {
      state.phase='playing';state.time=0;state.attempts=0;state.hit=0;state.aim=360;state.drag=null;state.chosen=-1;state.answered=false;state.flash=0;
      state.objects=kind==='rings'?Array.from({length:5},(_,i)=>({x:150+i*105,y:222,hit:false})):
        kind==='darts'?Array.from({length:5+Math.min(5,state.stage)},(_,i)=>({x:70+(i%5)*138,y:98+Math.floor(i/5)*118,phase:i*1.72,hit:false})):[];
      $('#ngOverlay').style.display='none';updateHUD();
    }
    function updateHUD(){$('#ngStats').textContent='Màn '+state.stage+'  •  Điểm '+state.score+'  •  Lượt '+Math.max(0,(kind==='quiz'?3:kind==='rings'?8:10)-state.attempts);$('#ngPause').textContent=state.phase==='paused'?'Tiếp tục':'Tạm dừng';}
    function finish(won) {
      state.phase=won?'won':'lost';
      $('#ngOverlay').style.display='flex';
      $('#ngMessage').textContent=won?'Qua màn '+state.stage+'!':'Hết lượt!';
      $('#ngNext').textContent=won?'Màn tiếp theo':'Thử lại';
      updateHUD();
    }
    function roundOutcome(){
      const target=kind==='rings'?Math.min(5,2+Math.ceil(state.stage/2)):state.objects.length;
      const limit=kind==='rings'?8:10;
      if(state.hit>=target){finish(true);return;}
      if(state.attempts>=limit)finish(false);
    }
    function ringThrow(x){
      if(state.phase!=='playing')return;
      state.aim=clamp(x,55,665);state.attempts++;
      const nearest=state.objects.filter(o=>!o.hit).sort((a,b)=>Math.abs(a.x-state.aim)-Math.abs(b.x-state.aim))[0];
      if(nearest && Math.abs(nearest.x-state.aim)<32){nearest.hit=true;state.hit++;state.score+=100*state.stage;}
      state.flash=.28;roundOutcome();updateHUD();
    }
    function dartThrow(x,y){
      if(state.phase!=='playing')return;
      state.attempts++;
      const target=state.objects.find(o=>!o.hit&&Math.hypot(o.x+Math.sin(state.time*1.4+o.phase)*(25+state.stage*3)-x,o.y+Math.cos(state.time+o.phase)*15-y)<33);
      if(target){target.hit=true;state.hit++;state.score+=100*state.stage;}
      state.flash=.2;roundOutcome();updateHUD();
    }
    function answer(i){
      if(state.phase!=='playing'||state.answered)return;
      const question=QUIZ[(state.question)%QUIZ.length];
      state.chosen=i;state.answered=true;state.attempts++;
      if(i===question[2]){state.hit++;state.correct++;state.score+=100*state.stage;}else state.lives--;
      state.flash=.65;updateHUD();
      session.setTimeout(()=>{
        if(state.phase!=='playing')return;
        state.answered=false;state.question++;
        if(state.hit>=4+Math.min(3,state.stage)){finish(true);return;}
        if(state.lives<=0){finish(false);return;}
        updateHUD();
      },650);
    }
    function eventPoint(e){
      const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*720/r.width,y:(e.clientY-r.top)*460/r.height};
    }
    session.listen(canvas,'pointerdown',e=>{
      if(state.phase!=='playing')return;
      const p=eventPoint(e);
      if(kind==='rings'){state.drag=p;state.aim=p.x;canvas.setPointerCapture?.(e.pointerId);}
      else if(kind==='darts')dartThrow(p.x,p.y);
      else {const i=Math.floor((p.y-190)/56);if(p.x>110&&p.x<610&&i>=0&&i<4)answer(i);}
    });
    session.listen(canvas,'pointermove',e=>{if(kind==='rings'&&state.drag&&state.phase==='playing')state.aim=clamp(eventPoint(e).x,55,665);});
    session.listen(canvas,'pointerup',e=>{if(kind==='rings'&&state.drag){ringThrow(eventPoint(e).x);state.drag=null;}});
    session.listen(canvas,'pointercancel',()=>{state.drag=null;});
    session.listen(window,'keydown',e=>{
      if(state.phase!=='playing'||!container.isConnected)return;
      if(kind==='quiz'&&/^[1-4]$/.test(e.key)){answer(Number(e.key)-1);return;}
      if(kind==='rings'&&['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){
        if(e.target && /INPUT|TEXTAREA|BUTTON/.test(e.target.tagName))return;
        e.preventDefault();if(e.key==='ArrowLeft')state.aim=clamp(state.aim-25,55,665);else if(e.key==='ArrowRight')state.aim=clamp(state.aim+25,55,665);else ringThrow(state.aim);
      }
    });
    session.listen($('#ngPause'),'click',()=>{if(state.phase==='playing')state.phase='paused';else if(state.phase==='paused')state.phase='playing';updateHUD();});
    session.listen($('#ngRestart'),'click',()=>{state.stage=1;state.score=0;state.lives=3;state.question=0;startStage();});
    session.listen($('#ngNext'),'click',()=>{if(state.phase==='won'){state.stage++;state.lives=Math.min(3,state.lives+1);}else{state.lives=3;}startStage();});
    function roundRect(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
    function text(t,x,y,size=22,color='#fff',align='center'){ctx.fillStyle=color;ctx.textAlign=align;ctx.font='bold '+size+'px Calibri, sans-serif';ctx.fillText(t,x,y);}
    function draw(){
      ctx.clearRect(0,0,720,460);
      const bg=ctx.createLinearGradient(0,0,0,460);bg.addColorStop(0,'#142b53');bg.addColorStop(1,'#10182b');ctx.fillStyle=bg;ctx.fillRect(0,0,720,460);
      if(kind==='rings'){
        roundRect(40,258,640,108,22,'#324566');roundRect(40,348,640,18,8,'#cb895f');
        state.objects.forEach(o=>{
          roundRect(o.x-15,204,30,94,9,o.hit?'#67e9a7':'#9bcbff');
          ctx.fillStyle=o.hit?'#133f37':'#4568a0';ctx.beginPath();ctx.ellipse(o.x,210,17,8,0,0,7);ctx.fill();
          if(o.hit){ctx.strokeStyle='#f5d177';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(o.x,258,25,9,0,0,7);ctx.stroke();}
        });
        ctx.strokeStyle='#ffe18f';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(state.aim,408,26,12,0,0,7);ctx.stroke();
        ctx.setLineDash([6,9]);ctx.strokeStyle='#eff7ff88';ctx.beginPath();ctx.moveTo(state.aim,393);ctx.lineTo(state.aim,170);ctx.stroke();ctx.setLineDash([]);
        text('Trúng '+state.hit+' / '+Math.min(5,2+Math.ceil(state.stage/2)),360,65,26);
      } else if(kind==='darts'){
        state.objects.forEach((o,i)=>{
          if(o.hit)return;
          const x=o.x+Math.sin(state.time*1.4+o.phase)*(25+state.stage*3),y=o.y+Math.cos(state.time+o.phase)*15;
          ctx.fillStyle=['#fd7f9c','#64d9ec','#f9cb68','#9f9cff'][i%4];
          ctx.beginPath();ctx.ellipse(x,y,25,31,0,0,7);ctx.fill();
          ctx.strokeStyle='#dbeafa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+29);ctx.quadraticCurveTo(x+8,y+47,x-3,y+64);ctx.stroke();
        });
        text('Bắn trúng '+state.hit+' / '+state.objects.length,360,40,24);
      } else {
        const q=QUIZ[state.question%QUIZ.length];
        roundRect(55,60,610,100,18,'#274b74');text(q[0],360,117,23);
        q[1].forEach((a,i)=>{
          const y=190+i*56;
          const color=state.answered&&i===q[2]?'#237959':state.answered&&i===state.chosen?'#963d57':'#29466a';
          roundRect(110,y,500,47,14,color);text((i+1)+'. '+a,360,y+30,21);
        });
        text('Đúng '+state.hit+' / '+(4+Math.min(3,state.stage))+'   •   Mạng '+state.lives,360,43,20);
      }
      if(state.flash>0){ctx.fillStyle='rgba(255,255,255,'+(state.flash*.13)+')';ctx.fillRect(0,0,720,460);}
      if(state.phase==='paused'){roundRect(230,190,260,70,18,'#081b34d9');text('Tạm dừng',360,236,30);}
    }
    let last=0;
    function frame(t){
      const dt=last?Math.min(.05,(t-last)/1000):0;last=t;
      if(state.phase==='playing'){state.time+=dt;state.flash=Math.max(0,state.flash-dt);}
      draw();
      session.requestAnimationFrame(frame);
    }
    startStage();session.requestAnimationFrame(frame);
  }
  if(window.NP_Engines){
    const original=window.NP_Engines.launchRetroArcade;
    window.NP_Engines.launchRetroArcade=function(container,game){
      if(IDS.has(game?.id))return launch(container,game);
      return original(container,game);
    };
  }
  window.NP_OriginalBatch={launch,ids:[...IDS]};
})();
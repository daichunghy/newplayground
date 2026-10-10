/* Móc Quà — original skill-based crane with deterministic grabs and three stages. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NP_MocQua=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const W=760,H=500, STAGES=[
    [{x:215,c:'#ffb96f',r:25},{x:385,c:'#9eebd2',r:24},{x:555,c:'#bda1ff',r:25}],
    [{x:185,c:'#ffd67f',r:23},{x:345,c:'#fa98bd',r:21},{x:582,c:'#87d9ff',r:22}],
    [{x:245,c:'#f8aa78',r:20},{x:417,c:'#8ce4af',r:20},{x:605,c:'#c7a8ff',r:19}]
  ];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function create(){
    let s;
    function makeStage(i){return STAGES[i].map((p,id)=>({...p,id,taken:false}));}
    function reset(){s={status:'ready',stage:0,score:0,won:0,attempts:5,
      t:0,cursor:380,target:380,clawY:65,phase:'aim',progress:0,held:null,
      last:'',prizes:makeStage(0)};}
    reset();
    function view(){return {...s,prizes:s.prizes.map(p=>({...p})),held:s.held?{...s.held}:null};}
    function finishGrab(){
      let pick=s.prizes.filter(p=>!p.taken).sort((a,b)=>Math.abs(a.x-s.cursor)-Math.abs(b.x-s.cursor))[0];
      if(pick&&Math.abs(pick.x-s.cursor)<=pick.r+5){pick.taken=true;s.held={...pick};s.last='Đã gắp được!';}
      else{s.held=null;s.last='Hụt rồi, canh lại nhé.';}
    }
    function complete(){
      if(s.held){s.won++;s.score+=120+Math.floor(Math.max(0,s.attempts)*20)+s.stage*60;s.held=null;}
      if(s.won===3){
        if(s.stage===2){s.status='won';s.last='Cả ba kệ đã hoàn tất!';return;}
        s.stage++;s.won=0;s.attempts=5;s.prizes=makeStage(s.stage);s.cursor=380;s.target=380;s.last='Kệ tiếp theo!';
      }
      if(s.attempts===0){s.status='lost';s.last='Hết lượt gắp.';}
      s.phase='aim';s.progress=0;s.clawY=65;
    }
    return {view,restart:reset,
      start(){if(s.status!=='ready')return false;s.status='playing';return true;},
      pause(){if(s.status!=='playing')return false;s.status='paused';return true;},
      resume(){if(s.status!=='paused')return false;s.status='playing';return true;},
      target(x){if(s.status!=='playing'||s.phase!=='aim'||!Number.isFinite(x))return false;s.target=clamp(x,80,690);return true;},
      grab(){if(s.status!=='playing'||s.phase!=='aim'||s.attempts<1)return false;s.attempts--;s.phase='down';s.progress=0;s.target=s.cursor;s.last='Đang hạ móc…';return true;},
      advance(dt){
        if(s.status!=='playing'||!Number.isFinite(dt)||dt<=0)return view();
        dt=Math.min(.05,dt);s.t+=dt;
        if(s.phase==='aim'){let diff=s.target-s.cursor;s.cursor+=Math.sign(diff)*Math.min(Math.abs(diff),370*dt);}
        else{
          s.progress+=dt;
          if(s.phase==='down'){s.clawY=65+300*Math.min(1,s.progress/.75);if(s.progress>=.75){s.phase='close';s.progress=0;finishGrab();}}
          else if(s.phase==='close'&&s.progress>=.3){s.phase='up';s.progress=0;}
          else if(s.phase==='up'){s.clawY=365-300*Math.min(1,s.progress/.8);if(s.progress>=.8){s.phase='deliver';s.progress=0;}}
          else if(s.phase==='deliver'){
            s.cursor+=(75-s.cursor)*Math.min(1,dt*4.6);
            if(s.progress>=.9)complete();
          }
        }
        return view();
      }
    };
  }
  function mount(container,session){
    if(!container||!session?.listen||!session?.requestAnimationFrame)throw Error('Móc Quà needs a managed session');
    const doc=container.ownerDocument,w=doc.defaultView||window;
    container.innerHTML='<section class="n6-game n6-claw"><header class="n6-head"><div><small>TIỆM QUÀ NHỎ</small><h2>Móc Quà</h2></div><div class="n6-tools"><button data-act="pause" aria-label="Tạm dừng">Ⅱ</button><button data-act="restart" aria-label="Chơi lại">↻</button><details class="n6-help"><summary aria-label="Luật chơi">?</summary><p>Trượt để ngắm tâm món quà, rồi nhấn GẮP. Mỗi kệ có 5 lượt để lấy đủ 3 món; qua ba kệ là thắng.</p></details></div></header><div class="n6-stats"><span>Điểm <b data-stat="score">0</b></span><span>Kệ <b data-stat="stage">1 / 3</b></span><span>Đã lấy <b data-stat="won">0 / 3</b></span><span>Lượt <b data-stat="attempts">5</b></span></div><div class="n6-stage"><canvas width="760" height="500" aria-label="Máy gắp quà ba kệ, cần gắp và vị trí phần thưởng"></canvas><div class="n6-screen" data-screen><div class="n6-card"><h3 data-screen-title>Móc Quà</h3><p data-screen-text>Trượt chọn vị trí, nhấn GẮP để hạ móc.</p><button class="n6-primary" data-act="play">Bắt đầu</button></div></div></div><div class="n6-actions"><button class="n6-arrow" data-act="left" aria-label="Dịch móc sang trái">←</button><button class="n6-primary n6-grab" data-act="grab">GẮP QUÀ</button><button class="n6-arrow" data-act="right" aria-label="Dịch móc sang phải">→</button></div><p class="n6-feedback" data-feedback role="status" aria-live="polite">Chạm hoặc kéo để ngắm vị trí.</p></section>';
    const q=s=>container.querySelector(s),canvas=q('canvas'),ctx=canvas.getContext('2d'),model=create();
    let last='',previous=null,alive=true,hold=0;
    function sync(){
      const v=model.view();for(const[k,value]of Object.entries({score:v.score,stage:v.stage+1+' / 3',won:v.won+' / 3',attempts:v.attempts}))q('[data-stat="'+k+'"]').textContent=value;
      q('[data-feedback]').textContent=v.last||'Trượt chọn vị trí, nhấn GẮP.';
      q('[data-act="pause"]').textContent=v.status==='paused'?'▶':'Ⅱ';
      q('[data-act="grab"]').disabled=v.status!=='playing'||v.phase!=='aim';
      const screen=q('[data-screen]');screen.hidden=v.status==='playing';
      if(v.status!==last){
        q('[data-screen-title]').textContent=v.status==='won'?'Trọn bộ quà!':v.status==='lost'?'Hết lượt gắp':v.status==='paused'?'Đã tạm dừng':'Móc Quà';
        q('[data-screen-text]').textContent=v.status==='won'?'Bạn đã hoàn thành 3 kệ. Điểm '+v.score:v.status==='lost'?'Hoàn thành '+v.stage+' kệ, thử lại nhé.':v.status==='paused'?'Giữ tay vững để tiếp tục.':'Trượt chọn vị trí, nhấn GẮP để hạ móc.';
        q('[data-act="play"]').textContent=v.status==='paused'?'Tiếp tục':v.status==='ready'?'Bắt đầu':'Chơi lại';
      }
      last=v.status;
    }
    function action(name){
      let v=model.view();
      if(name==='play'){if(v.status==='paused')model.resume();else{model.restart();model.start();}}
      else if(name==='restart'){model.restart();model.start();}
      else if(name==='pause'){if(v.status==='playing')model.pause();else if(v.status==='paused')model.resume();}
      else if(name==='grab')model.grab();
      else if(name==='left'||name==='right')model.target(v.cursor+(name==='left'?-55:55));
      sync();
    }
    function plush(x,y,r,c,highlight){
      ctx.save();ctx.translate(x,y);ctx.shadowColor='rgba(19,25,58,.3)';ctx.shadowBlur=10;ctx.shadowOffsetY=6;
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(-r*.58,-r*.72,r*.43,0,Math.PI*2);ctx.arc(r*.58,-r*.72,r*.43,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#253852';ctx.beginPath();ctx.arc(-r*.34,-r*.13,2.7,0,7);ctx.arc(r*.34,-r*.13,2.7,0,7);ctx.fill();
      ctx.strokeStyle='#253852';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,4,4,0,Math.PI);ctx.stroke();
      if(highlight){ctx.strokeStyle='#f9ec87';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r+6,0,7);ctx.stroke();}
      ctx.restore();
    }
    function draw(v){
      if(!ctx)return;
      const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#253a72');bg.addColorStop(1,'#111c46');
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      for(let i=0;i<15;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(233,145,240,.05)';ctx.fillRect(i*54,0,26,H);}
      ctx.fillStyle='#617bb2';ctx.beginPath();ctx.roundRect(24,20,712,438,22);ctx.fill();
      ctx.fillStyle='#1b2751';ctx.beginPath();ctx.roundRect(40,36,680,401,14);ctx.fill();
      ctx.fillStyle='#6d83ae';ctx.fillRect(40,378,680,32);
      ctx.fillStyle='#f8b27c';ctx.fillRect(60,403,640,10);
      ctx.fillStyle='#152348';ctx.beginPath();ctx.roundRect(42,425,676,30,10);ctx.fill();
      ctx.fillStyle='#f9cf8e';ctx.font='700 22px Calibri, Inter, sans-serif';ctx.fillText('GIỮ ĐÚNG TÂM',52,76);
      ctx.fillStyle='#304873';ctx.beginPath();ctx.roundRect(48,330,78,74,10);ctx.fill();
      ctx.fillStyle='#f9dc8c';ctx.font='700 13px Calibri, Inter, sans-serif';ctx.fillText('KHE QUÀ',56,422);
      for(const p of v.prizes)if(!p.taken)plush(p.x,358,p.r,p.c,false);
      ctx.strokeStyle='rgba(198,227,255,.35)';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(v.cursor,39);ctx.lineTo(v.cursor,v.clawY);ctx.stroke();
      ctx.fillStyle='#f6c36d';ctx.beginPath();ctx.roundRect(v.cursor-29,24,58,28,10);ctx.fill();
      ctx.fillStyle='#fef7d4';ctx.beginPath();ctx.arc(v.cursor,v.clawY,15,0,7);ctx.fill();
      ctx.strokeStyle='#93dbea';ctx.lineCap='round';ctx.lineWidth=9;
      const spread=v.phase==='close'||v.phase==='up'||v.phase==='deliver'?11:23;
      ctx.beginPath();ctx.moveTo(v.cursor-11,v.clawY+8);ctx.lineTo(v.cursor-spread,v.clawY+48);ctx.lineTo(v.cursor-spread+9,v.clawY+55);
      ctx.moveTo(v.cursor+11,v.clawY+8);ctx.lineTo(v.cursor+spread,v.clawY+48);ctx.lineTo(v.cursor+spread-9,v.clawY+55);ctx.stroke();
      if(v.held)plush(v.phase==='deliver'?v.cursor:v.cursor,v.clawY+65,v.held.r*.8,v.held.c,true);
      if(v.phase==='aim'){ctx.strokeStyle='#f6cc7b';ctx.setLineDash([7,8]);ctx.beginPath();ctx.moveTo(v.cursor,90);ctx.lineTo(v.cursor,322);ctx.stroke();ctx.setLineDash([]);}
    }
    session.listen(container,'click',e=>{const b=e.target.closest('button');if(b&&container.contains(b)&&b.dataset.act)action(b.dataset.act);});
    function point(e){const r=canvas.getBoundingClientRect();model.target((e.clientX-r.left)/r.width*760);}
    session.listen(canvas,'pointerdown',e=>{if(model.view().status!=='playing')return;point(e);try{canvas.setPointerCapture(e.pointerId);}catch(_){}});
    session.listen(canvas,'pointermove',e=>{if(e.buttons||e.pointerType==='touch')point(e);});
    session.listen(w,'keydown',e=>{
      if(!container.isConnected||/input|textarea|select/i.test(e.target?.tagName||''))return;
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();hold=e.key==='ArrowLeft'?-1:1;}
      else if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)action('grab');}
      else if(e.key.toLowerCase()==='p'||e.key==='Escape'){e.preventDefault();action('pause');}
    });
    session.listen(w,'keyup',e=>{if((e.key==='ArrowLeft'&&hold<0)||(e.key==='ArrowRight'&&hold>0))hold=0;});
    session.listen(doc,'visibilitychange',()=>{if(doc.hidden&&model.view().status==='playing'){model.pause();hold=0;sync();}});
    session.listen(w,'blur',()=>{hold=0;if(model.view().status==='playing'){model.pause();sync();}});
    function frame(ts){if(!alive)return;const dt=previous===null?0:Math.min(.05,(ts-previous)/1000);previous=ts;
      if(hold&&model.view().phase==='aim'){const v=model.view();model.target(v.cursor+hold*270*dt);}
      model.advance(dt);const v=model.view();draw(v);
      if(v.status!==last||v.status==='playing')sync();session.requestAnimationFrame(frame);
    }
    session.onCleanup(()=>{alive=false;hold=0;container.innerHTML='';});
    sync();session.requestAnimationFrame(frame);
    return model;
  }
  return Object.freeze({create,mount,STAGES});
});

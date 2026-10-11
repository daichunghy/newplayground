/* NewPlayground original games, rev 2. Isolated exact-ID gameplay and procedural art. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.NP_OriginalBatch = api;
    if (root.NP_Engines && typeof root.NP_Engines.launchRetroArcade === 'function') {
      const previous = root.NP_Engines.launchRetroArcade;
      root.NP_Engines.launchRetroArcade = function (container, game) {
        if (api.ids.includes(game && game.id)) return api.launch(container, game);
        return previous(container, game);
      };
    }
  }
})(typeof window === 'undefined' ? null : window, function (root) {
  'use strict';
  const W = 720, H = 460;
  const ids = ['nem-vong-co-chai', 'phi-tieu-bong-bong', 'ai-la-trieu-phu'];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rngFrom = seed => {
    let value = (seed >>> 0) || 0x53a41d29;
    return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  // A thrown ring crosses the bottle plane after a fixed, predictable flight.
  // Wind is disclosed to players, never an invisible random miss modifier.
  function makeRings(seed = 1) {
    const random = rngFrom(seed);
    const s = { kind:'rings', stage:1, score:0, best:0, phase:'playing', paused:false, time:0,
      throws:0, limit:7, goal:2, hits:0, combo:0, wind:0, aimX:360, aimY:225,
      bottles:[], projectile:null, result:'', effects:[], event:0,
      perfects:0, bestCombo:0, stageMedal:0, medals:0 };
    function stageInit() {
      s.phase='playing'; s.paused=false; s.time=0; s.throws=0; s.hits=0; s.combo=0;
      s.perfects=0; s.bestCombo=0; s.stageMedal=0;
      s.goal=Math.min(5,2+Math.floor((s.stage-1)/2));
      s.limit=Math.min(10,7+Math.floor(s.stage/3));
      s.wind=s.stage===1?0:Math.round((random()-.5)*Math.min(33,6+s.stage*4));
      s.checkpoint=s.score;s.aimX=360; s.aimY=225; s.projectile=null; s.result=''; s.effects=[]; s.event++;
      const bonusIndex=s.stage>=2?Math.floor(random()*5):-1;
      s.bottles=Array.from({length:5},(_,i)=>({
        x:120+i*120, y:(i%2 ? 268 : 212), collected:false,
        bonus:i===bonusIndex,
        drift:s.stage<3?0:(8+Math.min(20,s.stage*2)),
        phase:random()*Math.PI*2
      }));
    }
    const bottleX = (bottle,time=s.time) => bottle.x + Math.sin(time*(1.2+Math.min(.9,s.stage*.075)) + bottle.phase)*bottle.drift;
    function point(x,y) { if(s.phase==='playing'&&!s.paused){s.aimX=clamp(x,52,668);s.aimY=clamp(y,192,285);} }
    function throwRing(){
      if(s.phase!=='playing'||s.paused||s.projectile||s.throws>=s.limit)return false;
      s.throws++;
      s.projectile={elapsed:0,duration:.66,x:s.aimX,y:s.aimY,wind:s.wind};
      s.phase='flight'; s.event++;return true;
    }
    function land(){
      const p=s.projectile;
      const actualX=clamp(p.x+p.wind,45,675), actualY=p.y;
      const possible=s.bottles.filter(b=>!b.collected).map(b=>({b,dist:Math.hypot((bottleX(b)-actualX), (b.y-actualY)*1.05)})).sort((a,b)=>a.dist-b.dist);
      const nearest=possible[0];
      if(nearest&&nearest.dist<=24){
        nearest.b.collected=true;s.hits++;s.combo++;
        const perfect=nearest.dist<11;
        if(perfect)s.perfects++;
        s.bestCombo=Math.max(s.bestCombo,s.combo);
        const gained=(perfect?180:120)*Math.min(4,s.combo)+(nearest.b.bonus?150:0);
        if(nearest.b.bonus)s.limit=Math.min(11,s.limit+1);
        s.score+=gained;s.result=(nearest.b.bonus?'Chai vàng! ':perfect?'Chuẩn xác! ':'Trúng vòng! ')+'+'+gained;
        s.effects.push({x:bottleX(nearest.b),y:nearest.b.y,age:0,color:'#caff69'});
      }else{
        s.combo=0;s.result=nearest&&nearest.dist<46?'Suýt trúng!':'Trượt rồi';
        s.effects.push({x:actualX,y:actualY,age:0,color:'#fb9e70'});
      }
      s.projectile=null;s.event++;
      if(s.hits>=s.goal){
        s.phase='won';s.best=Math.max(s.best,s.stage);
        s.stageMedal=s.perfects>=s.goal?3:s.throws<=s.goal+1?2:1;
        s.medals+=s.stageMedal;
        const remaining=s.limit-s.throws;
        const bonus=remaining*35;
        s.score+=bonus;s.result='Hoàn thành · thưởng '+bonus+' điểm';
      }else if(s.throws>=s.limit)s.phase='lost';
      else {
        s.phase='playing';
        // The next gust is rolled only after landing and immediately disclosed in the HUD.
        s.wind=s.stage===1?0:Math.round((random()-.5)*Math.min(33,6+s.stage*4));
      }
    }
    function tick(dt){
      if(s.paused||s.phase==='won'||s.phase==='lost')return;
      dt=clamp(dt,0,.05);s.time+=dt;
      for(const fx of s.effects)fx.age+=dt;
      s.effects=s.effects.filter(fx=>fx.age<.75);
      if(s.projectile){s.projectile.elapsed+=dt;if(s.projectile.elapsed>=s.projectile.duration)land();}
    }
    function next(){if(s.phase!=='won')return false;s.stage++;stageInit();return true;}
    function retry(){const checkpoint=s.checkpoint;stageInit();s.score=checkpoint;s.checkpoint=checkpoint;return true;}
    function reset(){s.stage=1;s.score=0;s.best=0;s.medals=0;stageInit();}
    stageInit();return {s,point,throwRing,tick,next,retry,reset,bottleX};
  }

  function makeDarts(seed=11){
    const random=rngFrom(seed);
    const s={kind:'darts',stage:1,score:0,best:0,phase:'playing',paused:false,time:0,
      seconds:31,shots:0,ammo:14,popped:0,goal:7,combo:0,balls:[],dart:null,
      aimX:360,aimY:210,spawnIn:0,result:'',effects:[],event:0,nextId:1,
      accurate:0,bestCombo:0,timeBonuses:0,stageMedal:0,medals:0};
    function spawn(){
      if(s.balls.length>=6+Math.min(3,s.stage))return;
      const variant=random();const kind=variant<.10?'gold':variant<.18&&s.stage>=2?'clock':variant>.85&&s.stage>=3?'tough':'normal';
      const index=s.nextId++;
      let candidate={x:92+random()*535,y:104+random()*220};
      for(let tries=0;tries<14;tries++){
        const sample={x:92+random()*535,y:104+random()*220};
        candidate=sample;
        if(s.balls.every(b=>Math.hypot(position(b).x-sample.x,position(b).y-sample.y)>78))break;
      }
      s.balls.push({id:index,baseX:candidate.x,baseY:candidate.y,
        phase:random()*6.28,pattern:index%3, speed:.7+s.stage*.11+random()*.35,
        radius:kind==='gold'?22:27,hp:kind==='tough'?2:1,kind,
        born:s.time,color:['#fa7984','#71e3de','#f5b765','#9a9af0'][index%4]});
    }
    function position(b, time=s.time){
      const t=(time-b.born)*b.speed+b.phase;
      if(b.pattern===0)return {x:clamp(b.baseX+Math.sin(t)*46,55,665),y:b.baseY};
      if(b.pattern===1)return {x:clamp(b.baseX+Math.sin(t*.8)*28,55,665),y:clamp(b.baseY+Math.cos(t)*38,65,340)};
      return {x:clamp(b.baseX+Math.sin(t*.65)*64,55,665),y:clamp(b.baseY+Math.sin(t*1.6)*24,65,340)};
    }
    function stageInit(){
      s.phase='playing';s.paused=false;s.time=0;s.goal=Math.min(15,5+s.stage*2);
      s.seconds=Math.max(18,31-Math.min(12,(s.stage-1)*2));s.ammo=s.goal+7;
      s.checkpoint=s.score;s.shots=0;s.popped=0;s.combo=0;s.accurate=0;s.bestCombo=0;
      s.timeBonuses=0;s.stageMedal=0;s.balls=[];s.dart=null;
      s.result='';s.effects=[];s.spawnIn=.3;s.aimX=360;s.aimY=210;
      for(let i=0;i<5;i++)spawn();s.event++;
    }
    function aim(x,y){if(s.phase==='playing'&&!s.paused){s.aimX=clamp(x,28,692);s.aimY=clamp(y,42,400);}}
    function fire(x=s.aimX,y=s.aimY,scale=1){
      if(s.phase!=='playing'||s.paused||s.dart||s.shots>=s.ammo||s.seconds<=0)return false;
      aim(x,y);s.shots++;
      s.dart={x:s.aimX,y:s.aimY,elapsed:0,duration:.18,scale:clamp(Number(scale)||1,.25,2),from:{x:360,y:433}};
      s.event++;return true;
    }
    function dartLand(){
      const d=s.dart;let best=null;
      // On a narrow touch screen the hit target must still be about 44 CSS pixels.
      const scale=clamp(Number(d.scale)||1,.25,2);
      for(const ball of s.balls){
        // 44 CSS pixels minimum, but never add an entire second balloon on mobile.
        const tolerance=clamp(22/scale-ball.radius,0,60);
        const p=position(ball),distance=Math.hypot(p.x-d.x,p.y-d.y);
        if(distance<=ball.radius+tolerance&&(!best||distance<best.distance))best={ball,distance,p};
      }
      if(best){
        const b=best.ball;s.accurate++;b.hp--;
        if(b.hp<=0){
          s.balls=s.balls.filter(x=>x!==b);s.popped++;s.combo++;
          s.bestCombo=Math.max(s.bestCombo,s.combo);
          if(b.kind==='clock'){s.seconds=Math.min(36,s.seconds+3);s.timeBonuses++;}
          const value=(b.kind==='gold'?220:b.kind==='clock'?140:100)*Math.min(4,s.combo)*s.stage;
          s.score+=value;s.result=(b.kind==='clock'?'+3 giây · ':'')+'+'+value;
          s.effects.push({x:best.p.x,y:best.p.y,age:0,color:b.color});
        }else{s.result='Vỡ lớp chắn';s.effects.push({x:best.p.x,y:best.p.y,age:0,color:'#ffffff'});}
      }else{s.combo=0;s.result='Trượt';s.effects.push({x:d.x,y:d.y,age:0,color:'#9ca8c5'});}
      s.dart=null;s.event++;
      if(s.popped>=s.goal){
        s.phase='won';s.best=Math.max(s.best,s.stage);
        s.stageMedal=s.shots<=s.goal+1?3:s.shots<=s.goal+4?2:1;
        s.medals+=s.stageMedal;
        const bonus=Math.round((s.ammo-s.shots)*35+s.seconds*10);
        s.score+=bonus;s.result='Vượt màn · thưởng '+bonus+' điểm';
      }else if(s.shots>=s.ammo||s.seconds<=0)s.phase='lost';
    }
    function tick(dt){
      if(s.paused||s.phase==='lost'||s.phase==='won')return;
      dt=clamp(dt,0,.05);s.time+=dt;s.seconds=Math.max(0,s.seconds-dt);
      s.spawnIn-=dt;if(s.spawnIn<=0){spawn();s.spawnIn=Math.max(.3,.86-s.stage*.055);}
      s.effects.forEach(fx=>fx.age+=dt);s.effects=s.effects.filter(fx=>fx.age<.65);
      if(s.dart){s.dart.elapsed+=dt;if(s.dart.elapsed>=s.dart.duration)dartLand();}
      // Let a dart already airborne at the deadline resolve before judging the result.
      if(s.seconds===0&&s.phase==='playing'&&!s.dart){s.phase='lost';s.event++;}
    }
    function next(){if(s.phase!=='won')return false;s.stage++;stageInit();return true;}
    function retry(){const checkpoint=s.checkpoint;stageInit();s.score=checkpoint;s.checkpoint=checkpoint;}
    function reset(){s.stage=1;s.score=0;s.best=0;s.medals=0;stageInit();}
    stageInit();return {s,position,aim,fire,tick,next,retry,reset};
  }

  // Curated fact questions, split into progressive, non-repeating 10-question sets.
  // [question, four answers, correct index]. All original writing; no game-show art.
  const QUESTIONS=[
    [
      ['Một năm thường có bao nhiêu tháng?', ['10','11','12','13'],2],
      ['Số nào là số chẵn?', ['15','21','28','33'],2],
      ['Hành tinh gần Mặt Trời nhất?', ['Sao Thủy','Sao Hỏa','Sao Mộc','Trái Đất'],0],
      ['Công cụ dùng để đo nhiệt độ?', ['La bàn','Nhiệt kế','Thước thẳng','Đồng hồ'],1],
      ['1 ki-lô-mét bằng bao nhiêu mét?', ['100','500','1000','10000'],2],
      ['Tam giác có mấy cạnh?', ['2','3','4','5'],1],
      ['Số nguyên tố nhỏ nhất?', ['0','1','2','4'],2],
      ['Biểu tượng H₂O chỉ chất nào?', ['Muối','Nước','Không khí','Sắt'],1],
      ['Một ngày có bao nhiêu giờ?', ['12','18','24','30'],2],
      ['Ngôn ngữ nào dùng làm cấu trúc trang web?', ['HTML','SQL','CSS','Bash'],0],
      ['Động vật nào thuộc lớp thú?', ['Cá hồi','Cá heo','Cá đuối','Cá thu'],1],
      ['Một thế kỷ có bao nhiêu năm?', ['10','50','100','1000'],2]
    ],
    [
      ['Số 144 là bình phương của số nào?', ['10','11','12','14'],2],
      ['Âm thanh không truyền qua môi trường nào?', ['Nước','Không khí','Chân không','Thép'],2],
      ['Kim loại phổ biến trong dây dẫn điện?', ['Đồng','Gỗ','Nhựa','Thủy tinh'],0],
      ['Trái Đất tự quay một vòng mất khoảng?', ['1 giờ','1 ngày','1 tháng','1 năm'],1],
      ['CSS chủ yếu đảm nhiệm điều gì?', ['Lưu dữ liệu','Kiểu trình bày','Truy vấn','Bảo mật mạng'],1],
      ['Đơn vị cường độ dòng điện?', ['Vôn','Ampe','Oát','Jun'],1],
      ['Một byte thông thường có bao nhiêu bit?', ['4','6','8','16'],2],
      ['Đại dương lớn nhất trên Trái Đất?', ['Thái Bình Dương','Ấn Độ Dương','Đại Tây Dương','Bắc Băng Dương'],0],
      ['Giá trị của 2 mũ 5?', ['10','16','32','64'],2],
      ['Cơ quan nào bơm máu ở người?', ['Gan','Phổi','Tim','Thận'],2],
      ['Ánh sáng trắng qua lăng kính có thể tách thành?', ['Một màu','Nhiều màu','Âm thanh','Dòng điện'],1],
      ['Một vòng tròn có bao nhiêu độ?', ['90','180','270','360'],3]
    ],
    [
      ['pH bằng 7 biểu thị dung dịch thế nào ở 25°C?', ['Axit','Trung tính','Bazơ','Bão hòa'],1],
      ['Căn bậc hai số học của 169?', ['11','12','13','14'],2],
      ['Vệ tinh tự nhiên lớn nhất của Trái Đất?', ['Mặt Trăng','Mặt Trời','Sao Kim','Sao Hỏa'],0],
      ['Hệ nhị phân sử dụng các chữ số nào?', ['0 và 1','1 và 2','2 và 3','0 đến 9'],0],
      ['Quy tắc nào mô tả quan hệ V, I, R?', ['Ohm','Newton I','Pascal','Archimedes'],0],
      ['Trong DNA, A bắt cặp với bazơ nào?', ['C','G','T','U'],2],
      ['Nước tinh khiết đóng băng gần bao nhiêu °C ở 1 atm?', ['-10','0','10','100'],1],
      ['Có bao nhiêu mặt của khối lập phương?', ['4','6','8','12'],1],
      ['Dãy Fibonacci bắt đầu 0, 1, 1, 2, 3, ... Số tiếp theo?', ['4','5','6','8'],1],
      ['Tỷ lệ 25% bằng phân số nào?', ['1/2','1/3','1/4','1/5'],2],
      ['Mạch điện hở có dòng điện ổn định chạy qua không?', ['Có','Không','Chỉ ban đêm','Tùy màu dây'],1],
      ['Ánh sáng đi nhanh nhất trong môi trường nào?', ['Nước','Thủy tinh','Chân không','Không khí'],2]
    ]
  ];
  const EXPLANATIONS=[
    [
      "Một năm dương lịch có 12 tháng.",
      "28 chia hết cho 2 nên là số chẵn.",
      "Sao Thủy nằm gần Mặt Trời nhất.",
      "Nhiệt kế đo nhiệt độ, còn la bàn chỉ hướng.",
      "Một ki-lô-mét bằng 1.000 mét.",
      "Tam giác là đa giác có ba cạnh.",
      "2 là số nguyên tố nhỏ nhất và là số chẵn duy nhất nguyên tố.",
      "H₂O gồm hai nguyên tử hydro và một nguyên tử oxy.",
      "Một ngày có 24 giờ.",
      "HTML tạo cấu trúc, còn CSS trình bày giao diện.",
      "Cá heo là động vật có vú, thở bằng phổi.",
      "Một thế kỷ gồm 100 năm."
    ],
    [
      "Lấy 12 nhân với 12 sẽ được 144.",
      "Âm thanh cần môi trường vật chất để lan truyền.",
      "Đồng dẫn điện tốt và được dùng rộng rãi làm dây dẫn.",
      "Trái Đất tự quay quanh trục trong khoảng 24 giờ.",
      "CSS quy định màu sắc, bố cục và kiểu hiển thị.",
      "Ampe (A) là đơn vị cường độ dòng điện.",
      "Một byte được quy ước gồm 8 bit.",
      "Thái Bình Dương có diện tích lớn nhất.",
      "2 mũ 5 bằng 32.",
      "Tim co bóp để bơm máu khắp cơ thể.",
      "Lăng kính tán sắc ánh sáng trắng thành nhiều màu.",
      "Một vòng tròn tương ứng 360 độ."
    ],
    [
      "Ở 25°C, pH 7 của dung dịch nước được coi là trung tính.",
      "Lấy 13 nhân với 13 sẽ được 169.",
      "Mặt Trăng là vệ tinh tự nhiên của Trái Đất.",
      "Hệ nhị phân chỉ sử dụng 0 và 1.",
      "Định luật Ohm mô tả quan hệ U = I × R.",
      "Trong DNA, adenine (A) bắt cặp với thymine (T).",
      "Ở áp suất khí quyển tiêu chuẩn, nước tinh khiết đóng băng gần 0°C.",
      "Khối lập phương có sáu mặt vuông.",
      "Sau 0, 1, 1, 2, 3 là 5 vì mỗi số bằng tổng hai số trước.",
      "25% = 25/100 = 1/4.",
      "Mạch điện hở không tạo đường dẫn kín cho dòng điện ổn định.",
      "Ánh sáng truyền nhanh nhất trong chân không."
    ]
  ];
  function makeQuiz(seed=23){
    const random=rngFrom(seed);
    const s={kind:'quiz',stage:1,score:0,best:0,phase:'playing',paused:false,
      questions:[],index:0,selected:null,remaining:24,lives:3,streak:0,
      lifelines:{half:1,skip:1},hidden:[],feedback:'',feedbackTime:0,
      correct:0,totalCorrect:0,bestStreak:0,stars:0,stageStars:0,timeLimit:25,checkpoint:null,event:0};
    function createQuestions(level){
      const tier=Math.min(2,level-1);
      const pool=QUESTIONS[tier].map((q,i)=>({q,id:i}));
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      return pool.slice(0,10).map(({q,id})=>{
        const options=q[1].map((value,index)=>({value,isCorrect:index===q[2]}));
        for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
        return {text:q[0],choices:options.map(o=>o.value),correct:options.findIndex(o=>o.isCorrect),explanation:EXPLANATIONS[tier][id]};
      });
    }
    const question=()=>s.questions[s.index]||null;
    function stageInit(){
      s.checkpoint={score:s.score,lives:s.lives,stars:s.stars,totalCorrect:s.totalCorrect,
        lifelines:{...s.lifelines}};
      s.questions=createQuestions(s.stage);s.index=0;s.selected=null;
      s.timeLimit=Math.max(13,25-(s.stage-1)*4);s.remaining=s.timeLimit;
      s.streak=0;s.hidden=[];s.feedback='';s.feedbackTime=0;s.correct=0;s.stageStars=0;
      s.phase='playing';s.paused=false;s.event++;
    }
    function finishAnswer(){
      s.selected=null;s.feedback='';s.hidden=[];s.index++;
      if(s.lives<=0){s.phase='lost';}
      else if(s.index>=s.questions.length){
        s.phase=s.stage>=3?'complete':'won';s.best=Math.max(s.best,s.stage);
        s.stageStars=s.correct===10&&s.lives===3?3:s.correct>=8?2:1;
        s.stars+=s.stageStars;
      }else {s.remaining=s.timeLimit;s.phase='playing';}
      s.event++;
    }
    function answer(choice){
      if(s.phase!=='playing'||s.paused||!question())return false;
      if(choice>=0&&(choice>3||s.hidden.includes(choice)))return false;
      const q=question(),correct=choice===q.correct;
      s.selected=choice;s.phase='feedback';s.feedbackTime=correct?1.15:2.2;
      if(correct){
        s.correct++;s.totalCorrect++;s.streak++;s.bestStreak=Math.max(s.bestStreak,s.streak);
        const points=(100+s.stage*50)*Math.min(4,s.streak)+Math.floor(s.remaining*3);
        s.score+=points;s.feedback='Đúng! +'+points+' · '+q.explanation;
      }else {
        s.lives--;s.streak=0;
        s.feedback=(choice<0?'Hết giờ. ':'Chưa đúng. ')+'Đáp án '+q.choices[q.correct]+'. '+q.explanation;
      }
      s.event++;return true;
    }
    function half(){
      if(s.phase!=='playing'||s.paused||!s.lifelines.half)return false;
      const misses=[0,1,2,3].filter(i=>i!==question().correct);
      const keep=misses[Math.floor(random()*misses.length)];
      s.hidden=misses.filter(i=>i!==keep);s.lifelines.half--;s.event++;return true;
    }
    function skip(){
      if(s.phase!=='playing'||s.paused||!s.lifelines.skip)return false;
      s.lifelines.skip--;s.streak=0;s.selected=-2;s.feedback='Đã bỏ qua';s.feedbackTime=.45;s.phase='feedback';s.event++;return true;
    }
    function tick(dt){
      if(s.paused||!['playing','feedback'].includes(s.phase))return;
      dt=clamp(dt,0,.05);
      if(s.phase==='feedback'){s.feedbackTime-=dt;if(s.feedbackTime<=0)finishAnswer();}
      else {s.remaining=Math.max(0,s.remaining-dt);if(s.remaining===0)answer(-1);}
    }
    function next(){if(s.phase!=='won')return false;s.stage++;s.lives=Math.min(3,s.lives+1);stageInit();return true;}
    function retry(){
      if(s.phase!=='lost')return false;
      const checkpoint=s.checkpoint;
      s.score=checkpoint.score;s.lives=Math.max(2,checkpoint.lives);
      s.stars=checkpoint.stars;s.totalCorrect=checkpoint.totalCorrect;
      s.lifelines={...checkpoint.lifelines};
      stageInit();return true;
    }
    function reset(){s.stage=1;s.score=0;s.best=0;s.lives=3;s.stars=0;s.totalCorrect=0;
      s.bestStreak=0;s.lifelines={half:1,skip:1};stageInit();}
    stageInit();return {s,question,answer,half,skip,tick,next,retry,reset};
  }

  const STYLE = `
  .np-deep{color:#eaf3ff;background:#102039;border-radius:18px;padding:12px;font-family:Calibri,Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;box-sizing:border-box}
  .np-deep *{box-sizing:border-box}
  .np-deep button{font:inherit;font-weight:700;cursor:pointer;border:1px solid #66809e;color:#eaf3ff;background:#234469;border-radius:12px;min-height:44px;padding:8px 12px}
  .np-deep button:disabled{cursor:default;opacity:.4}
  .np-deep button:focus-visible,.np-deep canvas:focus-visible{outline:3px solid #d0ff74;outline-offset:2px}
  .np-deep-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
  .np-deep-header strong{font-size:18px;margin-right:auto}
  .np-deep-meta{font-size:14px;color:#c8dcf0;font-variant-numeric:tabular-nums}
  .np-deep-stage{position:relative;overflow:hidden;border:1px solid #49617c;border-radius:15px;background:#132d4f}
  .np-deep canvas{display:block;width:100%;aspect-ratio:36/23;touch-action:none;outline:none}
  .np-deep .np-deep-shade{position:absolute;inset:0;background:#071525df;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;text-align:center;padding:18px}
  .np-deep .np-deep-shade.show{display:flex}
  .np-deep-shade h2{font-size:26px;line-height:1.2;margin:0}
  .np-deep-shade p{font-size:15px;color:#c8dcf0;margin:0}
  .np-deep .np-deep-primary{border-color:#caff69;background:#caff69;color:#102039}
  .np-deep-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:40px;color:#c8dcf0;font-size:14px}
  .np-deep-footer span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .np-deep-help[hidden]{display:none}
  .np-deep-help{margin:6px 0 0;padding:10px;font-size:14px;color:#b9d2ea}
  .np-deep-quiz{padding:15px;min-height:430px;display:flex;flex-direction:column;gap:10px;background:#132b48}
  .np-quiz-progress{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#c8d7ef;font-size:14px}
  .np-quiz-time{height:6px;border-radius:5px;background:#2e4d70;overflow:hidden}
  .np-quiz-time span{display:block;height:100%;background:#caff69;transition:width .12s linear}
  .np-quiz-time span.urgent{background:#ff827d}
  .np-quiz-question{font-size:clamp(19px,3vw,25px);min-height:76px;line-height:1.4;display:flex;align-items:center}
  .np-quiz-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1}
  .np-deep .np-quiz-options button{min-height:70px;text-align:left;font-weight:600;line-height:1.3;word-break:break-word;padding:12px;transition:background .1s ease}
  .np-deep .np-quiz-options button.correct{background:#277357;border-color:#78d5a6}
  .np-deep .np-quiz-options button.wrong{background:#953d58;border-color:#ef9db0}
  .np-quiz-tools{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  .np-quiz-tools p{margin:0;font-size:14px;color:#c8d7ef;flex:1 1 260px;min-width:0;line-height:1.45;overflow-wrap:anywhere}
  .np-quiz-tools div{display:flex;gap:8px}
  @media(max-width:490px){.np-deep{padding:8px;border-radius:10px}.np-deep-header strong{width:100%;font-size:17px}.np-deep-meta{margin-right:auto}.np-quiz-options{grid-template-columns:1fr}.np-deep .np-quiz-options button{min-height:52px}.np-deep-quiz{padding:10px;min-height:520px}.np-quiz-question{min-height:67px}}
  @media(prefers-reduced-motion:reduce){.np-deep *{transition:none!important}}
  `;
  function launch(container,game){
    if(!root||!root.NP_GameSession)throw Error('NewPlayground game-session dependency missing');
    const session=root.NP_GameSession.start();
    const kind=game.id===ids[0]?'rings':game.id===ids[1]?'darts':'quiz';
    const engine=kind==='rings'?makeRings(Date.now()):kind==='darts'?makeDarts(Date.now()):makeQuiz(Date.now());
    const {s}=engine;
    const title=kind==='rings'?'Ném vòng':kind==='darts'?'Phi tiêu':'Đấu trí';
    container.innerHTML='<section class="np-deep"><style>'+STYLE+'</style><header class="np-deep-header">'+
      '<strong>'+title+'</strong><span class="np-deep-meta" data-a="meta"></span>'+
      '<button data-a="help" type="button" aria-label="Hướng dẫn">?</button>'+
      '<button data-a="pause" type="button">Tạm dừng</button><button data-a="reset" type="button">Chơi lại</button></header>'+
      '<div class="np-deep-stage" data-a="stage" '+(kind==='quiz'?'tabindex="0"':'')+'>'+
      (kind==='quiz'?'<div class="np-deep-quiz"><div class="np-quiz-progress"><span data-a="step"></span><span data-a="lives"></span></div><div class="np-quiz-time"><span data-a="timebar"></span></div><div class="np-quiz-question" data-a="question"></div><div class="np-quiz-options" data-a="answers"></div><div class="np-quiz-tools"><p data-a="quiz-status" role="status" aria-live="polite"></p><div><button data-a="half" type="button">50/50</button><button data-a="skip" type="button">Bỏ qua</button></div></div></div>':
      '<canvas data-a="canvas" tabindex="0" aria-label="Sân chơi '+title+'"></canvas>')+
      '<div class="np-deep-shade" data-a="shade" role="status" aria-live="polite"><h2 data-a="headline"></h2><p data-a="description"></p><button class="np-deep-primary" data-a="next" type="button"></button></div></div>'+
      '<div class="np-deep-footer"><span data-a="hint"></span><span data-a="feedback" aria-live="polite"></span></div><p class="np-deep-help" data-a="instructions" hidden></p></section>';
    const el=name=>container.querySelector('[data-a="'+name+'"]');
    const messages={rings:'Chạm để ngắm, thả để ném; phím mũi tên và Space cũng dùng được. Chai vàng thưởng thêm lượt ném, còn gió thay đổi sau mỗi vòng.',darts:'Chạm bóng để ném; phím mũi tên và Space cũng dùng được. Bóng đồng hồ cộng ba giây, bóng viền trắng cần hai phi tiêu.',quiz:'Chọn đáp án trong thời gian quy định; trả lời nhanh và đúng liên tiếp được thưởng điểm. Mỗi quyền 50/50 và bỏ qua chỉ dùng một lần trong hành trình.'};
    el('hint').textContent=kind==='rings'?'Kéo ngắm • thả ném':kind==='darts'?'Chạm bóng để ném':'Chọn đáp án đúng';
    el('instructions').textContent=messages[kind];
    session.listen(el('help'),'click',()=>{el('instructions').hidden=!el('instructions').hidden;});
    const safeBest=()=>{try{return Math.max(0,Number(root.localStorage.getItem('np_original_best_'+game.id))||0);}catch(_){return 0;}};
    const saveBest=()=>{try{const key='np_original_best_'+game.id;root.localStorage.setItem(key,String(Math.max(s.score,safeBest())));}catch(_){}};
    let lastPhase='',lastEvent=-1,lastQuizIndex=-1,lastHidden='',lastStats='';
    function updateUI(force=false){
      const meta='Màn '+s.stage+' · '+s.score+' điểm'+(kind==='rings'?' · '+(s.limit-s.throws)+' vòng':kind==='darts'?' · '+(s.ammo-s.shots)+' phi tiêu':'');
      if(force||lastStats!==meta){el('meta').textContent=meta;lastStats=meta;}
      el('pause').textContent=s.paused?'Tiếp tục':'Tạm dừng';
      el('pause').disabled=['won','lost','complete'].includes(s.phase);
      if(s.phase!==lastPhase||force){
        const over=['won','lost','complete'].includes(s.phase);
        el('shade').classList.toggle('show',over);
        if(over){
          saveBest();el('headline').textContent=s.phase==='lost'?'Hết lượt chơi':s.phase==='complete'?'Hoàn thành hành trình!':'Qua màn '+s.stage;
          el('description').textContent='Đạt '+s.score+' điểm · '+(kind==='quiz'?s.stars:s.medals)+' sao · Kỷ lục '+safeBest();
          el('next').textContent=s.phase==='won'?'Màn tiếp':'Thử lại';
        }
        lastPhase=s.phase;
      }
      if(s.event!==lastEvent||force){
        el('feedback').textContent=kind==='quiz'?'':(s.result||'');
        lastEvent=s.event;
      }
      if(kind==='quiz')renderQuiz(force);
    }
    function renderQuiz(force=false){
      const q=engine.question();if(!q)return;
      el('step').textContent='Câu '+(s.index+1)+'/10 · Chặng '+s.stage+'/3 · Liên tiếp '+s.streak;
      el('lives').textContent='Mạng '+s.lives;
      el('timebar').style.width=String(clamp(s.remaining/s.timeLimit*100,0,100))+'%';
      el('timebar').classList.toggle('urgent',s.remaining<=5);
      el('timebar').setAttribute?.('aria-valuenow',String(Math.ceil(s.remaining)));
      el('lives').textContent='Mạng '+s.lives+' · '+Math.ceil(s.remaining)+'s';
      const hidden=s.hidden.join(',');
      if(force||lastQuizIndex!==s.index||lastHidden!==hidden){
        lastQuizIndex=s.index;lastHidden=hidden;
        el('question').textContent=q.text;
        el('answers').replaceChildren(...q.choices.map((v,i)=>{
          const b=root.document.createElement('button');b.type='button';b.textContent=(i+1)+'. '+v;b.dataset.choice=String(i);
          b.disabled=s.hidden.includes(i);
          return b;
        }));
      }
      const feedback=s.phase==='feedback';
      for(const b of el('answers').children){
        const n=Number(b.dataset.choice);
        b.disabled=feedback||s.paused||s.hidden.includes(n);
        b.classList.toggle('correct',feedback&&n===q.correct);
        b.classList.toggle('wrong',feedback&&n===s.selected&&n!==q.correct);
      }
      el('half').disabled=feedback||s.paused||!s.lifelines.half;
      el('skip').disabled=feedback||s.paused||!s.lifelines.skip;
      el('quiz-status').textContent=s.feedback||('Đúng '+s.correct+' câu · '+s.stars+' sao');
    }
    session.listen(el('pause'),'click',()=>{
      if(['playing','flight','feedback'].includes(s.phase)){s.paused=!s.paused;updateUI(true);}
    });
    session.listen(el('reset'),'click',()=>{engine.reset();lastQuizIndex=-1;updateUI(true);});
    session.listen(el('next'),'click',()=>{
      if(s.phase==='won')engine.next();else if(s.phase==='complete')engine.reset();else if(s.phase==='lost')engine.retry();
      lastQuizIndex=-1;updateUI(true);
    });
    if(kind==='quiz'){
      session.listen(el('answers'),'click',e=>{
        const b=e.target.closest('button[data-choice]');if(b&&!b.disabled){engine.answer(Number(b.dataset.choice));updateUI(true);}
      });
      session.listen(el('half'),'click',()=>{engine.half();updateUI(true);});
      session.listen(el('skip'),'click',()=>{engine.skip();updateUI(true);});
      session.listen(el('stage'),'keydown',e=>{
        if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;
        if(/^[1-4]$/.test(e.key)&&kind==='quiz'){
          e.preventDefault();engine.answer(Number(e.key)-1);updateUI(true);
        }
      });
    } else {
      const canvas=el('canvas'),ctx=canvas.getContext('2d');
      const fit=()=>{
        const r=canvas.getBoundingClientRect(),dpr=clamp(root.devicePixelRatio||1,1,2);
        const width=Math.max(1,Math.round(r.width*dpr));
        const height=Math.max(1,Math.round(r.height*dpr));
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
        ctx.setTransform(width/W,0,0,height/H,0,0);
      };
      fit();session.listen(root,'resize',fit);
      if(typeof root.ResizeObserver==='function'){
        const observer=new root.ResizeObserver(fit);observer.observe(canvas);session.onCleanup(()=>observer.disconnect());
      }
      const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/Math.max(1,r.width),y:(e.clientY-r.top)*H/Math.max(1,r.height),scale:r.width/W};};
      let dragging=false,activePointer=null,keys=new Set();
      session.listen(canvas,'pointerdown',e=>{
        if(s.paused||s.phase!=='playing')return;
        canvas.focus({preventScroll:true});const p=point(e);
        if(kind==='rings'){
          if(dragging)return;
          dragging=true;activePointer=e.pointerId;
          engine.point(p.x,p.y);try{canvas.setPointerCapture(e.pointerId);}catch(_){}
        }
        else{engine.fire(p.x,p.y,p.scale);updateUI(true);}
      });
      session.listen(canvas,'pointermove',e=>{
        if(kind==='rings'&&dragging&&e.pointerId===activePointer&&!s.paused){const p=point(e);engine.point(p.x,p.y);}
      });
      session.listen(canvas,'pointerup',e=>{
        if(kind==='rings'&&dragging&&e.pointerId===activePointer){
          dragging=false;activePointer=null;const p=point(e);
          engine.point(p.x,p.y);engine.throwRing();updateUI(true);
        }
      });
      session.listen(canvas,'pointercancel',e=>{if(e.pointerId===activePointer){dragging=false;activePointer=null;}});
      session.listen(canvas,'lostpointercapture',e=>{if(e.pointerId===activePointer){dragging=false;activePointer=null;}});
      session.listen(canvas,'keydown',e=>{
        if(s.paused||s.phase!=='playing')return;
        if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key))e.preventDefault();
        if(e.repeat&&[' ','Enter'].includes(e.key))return;
        if(e.key===' '||e.key==='Enter'){
          if(kind==='rings')engine.throwRing();else engine.fire(s.aimX,s.aimY,canvas.getBoundingClientRect().width/W);
          updateUI(true);
        }else keys.add(e.key);
      });
      session.listen(canvas,'keyup',e=>keys.delete(e.key));
      session.listen(canvas,'blur',()=>{keys.clear();dragging=false;activePointer=null;});
      session.onCleanup(()=>{keys.clear();dragging=false;activePointer=null;});
      let previous=0;
      function frame(t){
        const dt=previous?clamp((t-previous)/1000,0,.05):0;previous=t;
        if(!s.paused&&s.phase==='playing'){
          const dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);
          const dy=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
          if(dx||dy){const x=s.aimX+dx*250*dt,y=s.aimY+dy*250*dt;kind==='rings'?engine.point(x,y):engine.aim(x,y);}
        }
        engine.tick(dt);
        if(kind==='rings')drawRings(ctx,engine);else drawDarts(ctx,engine);
        updateUI();session.requestAnimationFrame(frame);
      }
      session.requestAnimationFrame(frame);
    }
    if(kind==='quiz'){
      let previous=0;
      function quizFrame(t){const dt=previous?clamp((t-previous)/1000,0,.05):0;previous=t;
        engine.tick(dt);updateUI();session.requestAnimationFrame(quizFrame);}
      session.requestAnimationFrame(quizFrame);
    }
    session.listen(root.document,'visibilitychange',()=>{if(root.document.hidden){s.paused=true;updateUI(true);}});
    session.listen(root,'blur',()=>{s.paused=true;updateUI(true);});
    updateUI(true);
    return engine;
  }

  function box(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function line(ctx,x,y,tx,ty,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();}
  function label(ctx,str,x,y,size=18,color='#fff',align='center'){
    ctx.fillStyle=color;ctx.textAlign=align;ctx.font='600 '+size+'px Calibri,Inter,sans-serif';ctx.fillText(str,x,y);
  }
  function backdrop(ctx){
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#163b61');sky.addColorStop(.55,'#122b4c');sky.addColorStop(1,'#0b192e');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    for(let i=0;i<7;i++){line(ctx,0,58+i*62,W,58+i*62,1,'#ffffff0c');}
    box(ctx,0,0,W,66,0,'#183659');
    box(ctx,25,67,670,1,0,'#5c85a045');
  }
  function drawRings(ctx,engine){
    const {s,bottleX}=engine;backdrop(ctx);
    box(ctx,37,308,646,67,12,'#9c5b41');box(ctx,37,369,646,16,5,'#d4a070');
    box(ctx,58,307,604,7,3,'#ecc38b');
    s.bottles.forEach(b=>{
      const x=bottleX(b),y=b.y;
      ctx.fillStyle='#061f39aa';ctx.beginPath();ctx.ellipse(x,310,34,10,0,0,7);ctx.fill();
      box(ctx,x-13,y-7,26,100,8,b.collected?'#78bc99':b.bonus?'#efc16c':'#72d1dc');
      box(ctx,x-9,y-14,18,22,5,'#e8fbff');
      box(ctx,x-9,y-20,18,7,2,'#447991');
      box(ctx,x-11,y+20,22,38,4,b.collected?'#45876a':b.bonus?'#aa6f34':'#2780a5');
      if(b.bonus&&!b.collected)label(ctx,'★',x,y-35,17,'#ffe096');
      if(b.collected){ctx.strokeStyle='#f9d37a';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(x,y+9,24,10,0,0,Math.PI*2);ctx.stroke();}
    });
    ctx.save();ctx.setLineDash([6,8]);line(ctx,s.aimX+s.wind,s.aimY,s.aimX+s.wind,340,2,'#d8ff8f88');ctx.restore();
    ctx.strokeStyle='#d3ff76';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(s.aimX+s.wind,s.aimY,26,10,0,0,Math.PI*2);ctx.stroke();
    label(ctx,'Trúng '+s.hits+'/'+s.goal,40,40,22,'#eaf3ff','left');
    if(s.combo>1)label(ctx,'×'+s.combo,360,40,20,'#d0ff7a');
    label(ctx,'Gió '+(s.wind===0?'0':(s.wind>0?'→ ':'← ')+Math.abs(s.wind)),680,40,18,'#d4ebfa','right');
    if(s.projectile){const p=s.projectile,t=clamp(p.elapsed/p.duration,0,1);
      const x=lerp(360,p.x+p.wind,t),y=lerp(424,p.y,t)-Math.sin(t*Math.PI)*142;
      ctx.strokeStyle='#ffe2a3';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(x,y,lerp(30,25,t),lerp(15,9,t),0,0,Math.PI*2);ctx.stroke();
    }else{
      ctx.strokeStyle='#ffe0a0';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(360,424,28,14,0,0,Math.PI*2);ctx.stroke();
      ctx.save();ctx.setLineDash([4,9]);line(ctx,360,424,s.aimX+s.wind,s.aimY,2,'#c5e4ff9c');ctx.restore();
    }
    for(const fx of s.effects){ctx.strokeStyle=fx.color;ctx.lineWidth=4*(1-fx.age/.75);ctx.beginPath();ctx.arc(fx.x,fx.y,18+fx.age*80,0,7);ctx.stroke();}
    if(s.paused){box(ctx,234,176,250,75,14,'#0c1d33eb');label(ctx,'Tạm dừng',359,226,29);}
  }
  function drawDarts(ctx,engine){
    const {s,position}=engine;backdrop(ctx);
    box(ctx,30,78,660,313,20,'#204665');
    for(let i=0;i<9;i++){line(ctx,30,104+i*32,690,104+i*32,1,'#ffffff10');}
    for(const b of s.balls){const p=position(b);
      ctx.fillStyle='#0b2c4d8c';ctx.beginPath();ctx.ellipse(p.x+7,p.y+5,b.radius+3,b.radius+7,0,0,7);ctx.fill();
      ctx.fillStyle=b.kind==='gold'?'#ffcd63':b.kind==='clock'?'#8bdbff':b.color;
      ctx.beginPath();ctx.ellipse(p.x,p.y,b.radius,b.radius*1.22,0,0,7);ctx.fill();
      ctx.fillStyle='#ffffff8c';ctx.beginPath();ctx.ellipse(p.x-9,p.y-9,5,10,-.5,0,7);ctx.fill();
      line(ctx,p.x,p.y+b.radius*1.22,p.x+5,p.y+b.radius*1.22+21,1.6,'#d6f1fc');
      if(b.kind==='tough'){ctx.strokeStyle='#e3eeff';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,p.y,b.radius+4,b.radius*1.22+4,0,0,7);ctx.stroke();}
      if(b.kind==='gold')label(ctx,'★',p.x,p.y+6,19,'#6e512c');
      if(b.kind==='clock')label(ctx,'+3',p.x,p.y+5,15,'#18446c');
    }
    label(ctx,'Bóng '+s.popped+'/'+s.goal,45,38,22,'#eaf3ff','left');
    if(s.combo>1)label(ctx,'×'+s.combo,360,38,19,'#d0ff7a');
    label(ctx,Math.ceil(s.seconds)+'s',674,38,22,s.seconds<8?'#ff9595':'#eaf3ff','right');
    box(ctx,235,70,250,4,2,'#314967');
    box(ctx,235,70,250*(1-s.shots/s.ammo),4,2,'#bdec7d');
    ctx.strokeStyle='#caff69';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.aimX,s.aimY,18,0,7);ctx.stroke();
    line(ctx,s.aimX-28,s.aimY,s.aimX-9,s.aimY,2,'#caff69');line(ctx,s.aimX+9,s.aimY,s.aimX+28,s.aimY,2,'#caff69');
    if(s.dart){const t=clamp(s.dart.elapsed/s.dart.duration,0,1);const x=lerp(360,s.dart.x,t),y=lerp(425,s.dart.y,t);
      line(ctx,x,y,x-8,y+24,5,'#f5d58c');line(ctx,x,y,x+4,y+9,2,'#ffffff');}
    for(const fx of s.effects){ctx.strokeStyle=fx.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(fx.x,fx.y,15+fx.age*76,0,7);ctx.stroke();}
    if(s.paused){box(ctx,234,176,250,75,14,'#0c1d33eb');label(ctx,'Tạm dừng',359,226,29);}
  }
  return {ids,launch,makeRings,makeDarts,makeQuiz,QUESTIONS};
});
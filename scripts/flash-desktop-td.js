/* Desktop Tower Defense (2007) homage: desk backdrop, build-your-own mazes, BFS
 * rerouting, wave spawning, independent tower attacks, upgrades and money. */
(function(){
 'use strict';
 window.NP_ClassicWeb.register('desktop-tower-defense',function(a){
  const {W,H,TAU,clamp,rect,circle,line,label,round,dist,polygon}=a;
  const X=37,Y=79,T=31,COLS=17,ROWS=12,WIDTH=COLS*T,HEIGHT=ROWS*T;
  const choices=[
   {name:'PELLET',cost:5,damage:7,range:77,rate:.55,col:'#9a9992',ground:true,air:true},
   {name:'SQUIRT',cost:15,damage:6,range:89,rate:.16,col:'#5a9db0',ground:true,air:true},
   {name:'DART',cost:20,damage:17,range:113,rate:1.1,col:'#d2b269',ground:true,air:false,splash:42},
   {name:'SWARM',cost:30,damage:28,range:105,rate:.68,col:'#9eb7c7',ground:false,air:true,splash:30},
   {name:'FROST',cost:40,damage:4,range:88,rate:.82,col:'#a7d9e2',ground:true,air:true,slow:.55},
   {name:'BASH',cost:50,damage:26,range:62,rate:1.18,col:'#d1978d',ground:true,air:false,splash:55,stun:.21}
  ];
  let money=75,life=20,wave=0,score=0,choice=0,chosen=-1,
   grid=[], towers=[],creeps=[],effects=[],cooldown=0,spawning=0,spawnDelay=0,
   queues=[],path=[],state='ready',pointerPos={x:0,y:0},message='Place towers to build a maze.',best=a.getBest(),t=0;
  function reset(){
   money=75;life=20;wave=0;score=0;choice=0;chosen=-1;
   grid=Array.from({length:ROWS},()=>Array(COLS).fill(0));
   towers=[];creeps=[];effects=[];queues=[];cooldown=0;spawning=0;spawnDelay=0;
   state='ready';path=route(grid);message='Place towers; click SEND NEXT LEVEL.';t=0;
  }
  function center(cx,cy){return{x:X+(cx+.5)*T,y:Y+(cy+.5)*T};}
  function route(cells) {
   const start={x:0,y:Math.floor(ROWS/2)},end={x:COLS-1,y:Math.floor(ROWS/2)};
   const queue=[start],seen=new Set([start.y*COLS+start.x]),prev=new Map();
   let reached=false;
   for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(p.x===end.x&&p.y===end.y){reached=true;break;}
    for(const [dx,dy] of [[1,0],[0,-1],[0,1],[-1,0]]){
     const nx=p.x+dx,ny=p.y+dy,key=ny*COLS+nx;
     if(nx<0||ny<0||nx>=COLS||ny>=ROWS||cells[ny][nx]||seen.has(key))continue;
     seen.add(key);prev.set(key,p);queue.push({x:nx,y:ny});
    }
   }
   if(!reached)return null;
   const result=[end];let at=end;
   while(!(at.x===start.x&&at.y===start.y)){
    at=prev.get(at.y*COLS+at.x);result.push(at);
   }
   result.reverse();return result;
  }
  function cellFor(px,py){
   return{x:Math.floor((px-X)/T),y:Math.floor((py-Y)/T)};
  }
  function place(x,y){
   if(state==='lost'||state==='won')return;
   if(x<=0||x>=COLS-1||y<0||y>=ROWS){message='Keep spawn and exit columns open.';return;}
   if(grid[y][x]){chosen=towers.findIndex(o=>o.x===x&&o.y===y);return;}
   const kind=choices[choice];
   if(money<kind.cost){message='Not enough gold for '+kind.name+'.';return;}
   const test=grid.map(row=>[...row]);test[y][x]=1;
   const newPath=route(test);
   if(!newPath){message='Cannot completely block the creeps!';return;}
   // Place only if all living enemies can still reach exit.
   for(const cr of creeps){
    if(cr.air)continue;
    const source=cellFor(cr.x,cr.y);
    const snap={x:clamp(source.x,0,COLS-1),y:clamp(source.y,0,ROWS-1)};
    if(!routeFrom(test,snap)){message='This blocks a moving creep.';return;}
   }
   grid=test;path=newPath;towers.push({x,y,kind:choice,level:1,cooldown:0});
   money-=kind.cost;chosen=towers.length-1;message=kind.name+' TOWER PLACED.';
   reroute();
  }
  function routeFrom(cells,start){
   if(cells[start.y]?.[start.x])return null;
   const queue=[start],seen=new Set([start.y*COLS+start.x]);
   const endX=COLS-1,endY=Math.floor(ROWS/2);
   let current=null;
   for(let i=0;i<queue.length;i++){
    const v=queue[i];
    if(v.x===endX&&v.y===endY){current=v;break;}
    for(const [dx,dy] of [[1,0],[0,1],[0,-1],[-1,0]]){
     const x=v.x+dx,y=v.y+dy,key=y*COLS+x;
     if(x<0||y<0||x>=COLS||y>=ROWS||cells[y][x]||seen.has(key))continue;
     seen.add(key);queue.push({x,y,from:v});
    }
   }
   if(!current)return null;
   const out=[];
   while(current){out.push(current);current=current.from;}
   return out.reverse();
  }
  function reroute(){
   for(const creep of creeps){
    if(creep.air)continue;
    const source=cellFor(creep.x,creep.y);
    const sx=clamp(source.x,0,COLS-1),sy=clamp(source.y,0,ROWS-1);
    creep.path=routeFrom(grid,{x:sx,y:sy})||path;
    creep.next=1;
   }
  }
  function upgrade(){
   const tw=towers[chosen];if(!tw)return;
   const price=choices[tw.kind].cost*tw.level;
   if(money<price){message='Need '+price+' gold to upgrade.';return;}
   if(tw.level>=6){message='Tower is maxed out.';return;}
   money-=price;tw.level++;message='Tower upgraded to '+tw.level+'.';
  }
  function sell(){
   const tw=towers[chosen];if(!tw)return;
   money+=Math.round(choices[tw.kind].cost*(tw.level+1)*.37);
   grid[tw.y][tw.x]=0;
   towers.splice(chosen,1);chosen=-1;path=route(grid);reroute();message='Tower sold.';
  }
  function nextWave(){
   if(state==='won'||state==='lost'||wave>=50)return;
   const overlap=state==='running';
   wave++;state='running';
   queues.push({level:wave,kind:creepType(wave),
     remaining:8+Math.floor(wave*.9),timer:.2});
   if(overlap)score+=20+Math.round(wave/2);
   message='WAVE '+wave+'/50 • '+creepType(wave).toUpperCase()+
     (overlap?' • EARLY SEND BONUS':'');
  }
  function creepType(current) {
    if(current%10===0)return 'boss';
    if(current%7===0)return 'flying';
    if(current%6===0)return 'immune';
    if(current%5===0)return 'group';
    if(current%3===0)return 'fast';
    return 'normal';
  }
  function action(id){
   if(id==='restart'){reset();return;}
   if(id==='send'){nextWave();return;}
   if(id==='upgrade'){upgrade();return;}
   if(id==='sell'){sell();return;}
   if(id[0]==='t'){
    choice=clamp(Number(id.slice(1)),0,choices.length-1);message=choices[choice].name+' selected.';
   }
  }
  function pointer(type,px,py){
   if(type!=='down')return;
   pointerPos={x:px,y:py};
   if(px>X&&px<X+WIDTH&&py>Y&&py<Y+HEIGHT){
    const cell=cellFor(px,py);place(cell.x,cell.y);return;
   }
   if(px>589&&px<744&&py>80&&py<371){
    const index=Math.floor((py-82)/46);
    if(index>=0&&index<choices.length)action('t'+index);
   }
  }
  function update(dt){
   if(state==='lost'||state==='won')return;
   t+=dt;
   for(const e of effects)e.life-=dt;effects=effects.filter(e=>e.life>0);
   if(state!=='running')return;
   // Original Desktop Tower Defense allows a next wave to be sent before
   // the previous one has disappeared, trading risk for an early-send bonus.
   for(const group of queues){
     group.timer-=dt;
     if(group.remaining>0&&group.timer<=0){
       group.remaining--;
       group.timer=.76*Math.max(.43,1-group.level*.012);
       const kind=group.kind,air=kind==='flying',p=center(0,Math.floor(ROWS/2));
       const health=Math.floor((17+group.level*12)*
         (kind==='boss'?7:kind==='immune'?1.8:kind==='group'?.67:1));
       const speed=(35+Math.min(33,group.level*1.5))*
         (kind==='fast'?1.8:kind==='boss'?.72:1);
       creeps.push({x:p.x,y:p.y,health,max:health,speed,
         path:air?[{x:0,y:Math.floor(ROWS/2)},{x:COLS-1,y:Math.floor(ROWS/2)}]:path,
         next:1,reward:3+Math.floor(group.level/3),air,kind,slowLeft:0,stunLeft:0});
     }
   }
   queues=queues.filter(q=>q.remaining>0);
   for(const cr of creeps){
    const next=cr.path[cr.next];
    if(!next){cr.passed=true;life--;continue;}
    const goal=center(next.x,next.y),length=dist(goal.x,goal.y,cr.x,cr.y);
    cr.slowLeft=Math.max(0,cr.slowLeft-dt);
    cr.stunLeft=Math.max(0,cr.stunLeft-dt);
    const step=cr.stunLeft>0?0:cr.speed*(cr.slowLeft>0?.57:1)*dt;
    if(length<=step){
      cr.x=goal.x;cr.y=goal.y;cr.next++;
      if(cr.next>=cr.path.length){cr.passed=true;life--;}
    }else{
      cr.x+=(goal.x-cr.x)*step/length;
      cr.y+=(goal.y-cr.y)*step/length;
    }
   }
   for(const tw of towers){
    tw.cooldown-=dt;
    if(tw.cooldown>0)continue;
    const k=choices[tw.kind],loc=center(tw.x,tw.y),
     target=creeps.filter(cr=>!cr.passed&&cr.health>0 &&
       (cr.air?k.air:k.ground) &&
       dist(cr.x,cr.y,loc.x,loc.y)<k.range+(tw.level-1)*9)
       .sort((v,z)=>z.next-v.next)[0];
    if(!target)continue;
    const damage=k.damage*(1+(tw.level-1)*.58);
    const hit=(cr,power)=>{
      cr.health-=power*(cr.kind==='immune'?.64:1);
      if(k.slow)cr.slowLeft=Math.max(cr.slowLeft,1.35);
      if(k.stun&&Math.random()<.24)cr.stunLeft=.34;
    };
    hit(target,damage);
    if(k.splash)creeps.forEach(cr=>{
      if(cr!==target && cr.health>0 && (cr.air?k.air:k.ground) &&
        dist(cr.x,cr.y,target.x,target.y)<k.splash)hit(cr,damage*.65);
    });
    effects.push({from:loc,to:{x:target.x,y:target.y},life:.17,color:k.col});
    tw.cooldown=k.rate/Math.pow(1.15,tw.level-1);
   }
   for(const cr of creeps)if(cr.health<=0&&!cr.passed){
    cr.passed=true;money+=cr.reward;score+=10+wave*2;
   }
   creeps=creeps.filter(cr=>!cr.passed);
   if(life<=0){state='lost';a.saveBest(Math.max(a.getBest(),wave-1));message='The creeps reached your desktop!';}
   if(queues.length===0&&creeps.length===0&&state==='running'){
    state=wave>=50?'won':'ready';money+=5+Math.floor(wave*.8);
    if(state==='won'){a.saveBest(Math.max(a.getBest(),50));message='You survived all 20 waves!';}
    else message='Wave cleared! Bonus gold. Build and send another.';
   }
  }
  function draw(c){
   // Distinctive late-2000s desktop wallpaper, wooden desk, torn note and simple icons.
   rect(c,0,0,W,H,'#cbb58a');
   for(let x=0;x<W;x+=40)line(c,x,0,x+23,H,'rgba(111,83,49,.13)',5);
   round(c,12,9,540,55,4,'#e8e6cf','#686858');
   label(c,'DESKTOP TOWER DEFENSE',25,28,25,'#403d30');
   label(c,'LIVES '+life+'    GOLD '+money+'    WAVE '+wave+'/50    SCORE '+score,24,52,13,'#594b34');
   round(c,X-4,Y-4,WIDTH+8,HEIGHT+8,2,'#f0eee4','#999b81');
   for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    rect(c,X+x*T,Y+y*T,T,T,(x+y)%2===0?'#edece1':'#f4f2e7');
    c.strokeStyle='#c8c7b4';c.lineWidth=.7;c.strokeRect(X+x*T,Y+y*T,T,T);
   }
   for(let i=0;i<path.length;i++){
    const p=center(path[i].x,path[i].y);
    circle(c,p.x,p.y,3,'rgba(163,173,128,.37)');
   }
   const entry=center(0,Math.floor(ROWS/2)),exit=center(COLS-1,Math.floor(ROWS/2));
   circle(c,entry.x,entry.y,12,'#9bd269','#426744',2);
   circle(c,exit.x,exit.y,12,'#e9b18c','#8a4432',2);
   label(c,'IN',entry.x,entry.y,10,'#193b25','center');
   label(c,'OUT',exit.x,exit.y,9,'#4e211f','center');
   towers.forEach((tw,i)=>{
    const centerPos=center(tw.x,tw.y),k=choices[tw.kind];
    if(i===chosen){
      circle(c,centerPos.x,centerPos.y,k.range,'rgba(93,118,125,.06)','#8ab7c6',1);
    }
    round(c,centerPos.x-13,centerPos.y-13,26,26,3,'#e5e1cc','#52665e');
    circle(c,centerPos.x,centerPos.y,9,k.col,'#414b4c',2);
    line(c,centerPos.x,centerPos.y,centerPos.x+11,centerPos.y-8,'#263d42',3);
    label(c,tw.level,centerPos.x,centerPos.y+17,10,'#18353a','center');
   });
   for(const cr of creeps){
    circle(c,cr.x+2,cr.y+2,8,'rgba(15,31,27,.14)');
    const col={normal:'#79ad60',fast:'#e6bc5a',immune:'#9c9caf',
      flying:'#62bfd9',group:'#aa72bc',boss:'#b66c5a'}[cr.kind]||'#79ad60';
    circle(c,cr.x,cr.y,cr.kind==='boss'?12:8,col,'#385947',2);
    if(cr.air)line(c,cr.x-14,cr.y-6,cr.x+14,cr.y-6,'#d9f9fb',2);
    if(cr.slowLeft>0)circle(c,cr.x,cr.y,11,null,'#abedf2',1);
    rect(c,cr.x-9,cr.y-13,18,3,'#e1a99a');
    rect(c,cr.x-9,cr.y-13,18*clamp(cr.health/cr.max,0,1),3,'#68cf71');
   }
   for(const e of effects)line(c,e.from.x,e.from.y,e.to.x,e.to.y,e.color,3);
   round(c,591,9,155,477,6,'#e3ddc8','#726c58');
   label(c,'TOWERS',668,34,21,'#3f463e','center');
   choices.forEach((k,i)=>{
    const y=82+i*46;
    round(c,600,y,137,43,4,i===choice?'#f5e8aa':'#f1ebd6',i===choice?'#a18432':'#a9a58b');
    circle(c,616,y+19,10,k.col,'#57655e',2);
    label(c,(i+1)+'. '+k.name,635,y+14,12,'#3d4641');
    label(c,'$'+k.cost+'  DMG '+k.damage,634,y+32,11,'#776d54');
   });
   round(c,602,373,132,37,4,'#e6a94a');
   label(c,'SEND NEXT LEVEL',668,392,13,'#463b27','center');
   label(c,'U: UPGRADE',602,430,13,'#62574a');
   label(c,'S: SELL',602,451,13,'#62574a');
   rect(c,11,464,557,28,'#e7ddc1');
   label(c,message.slice(0,72),18,478,14,'#5a5343');
   if(state==='won'||state==='lost'){
    rect(c,24,107,535,334,'rgba(245,242,214,.86)');
    label(c,state==='won'?'WELL DONE!':'GAME OVER',292,209,37,'#4f543a','center');
    label(c,'SCORE '+score+' • WAVE '+wave+'/50',292,259,22,'#535746','center');
    label(c,'Press CHƠI LẠI to restart',292,294,16,'#6d6851','center');
   }
  }
  reset();
  return{
   controls:[
    {id:'t0',label:'1 • PELLET'},{id:'t1',label:'2 • SQUIRT'},
    {id:'t2',label:'3 • DART'},{id:'t3',label:'4 • SWARM'},
    {id:'t4',label:'5 • FROST'},{id:'t5',label:'6 • BASH'},
        {id:'send',label:'SEND NEXT WAVE'},{id:'upgrade',label:'U • UPGRADE'},
    {id:'sell',label:'S • SELL'}
   ],
   hint:'Desktop Tower Defense (2007): chọn tháp (1–6), chạm ô để đặt, u nâng cấp, s bán, gửi đợt quái.',
   keyMap:{Digit1:'t0',Digit2:'t1',Digit3:'t2',Digit4:'t3',Digit5:'t4',Digit6:'t5',
     KeyU:'upgrade',KeyS:'sell'},
   draw,update,pointer,action,
   getState(){return {wave,life,money,score,state,grid,towers,creeps,path,queues,choice,choices};}
  };
 });
})();
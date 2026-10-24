/* RED BALL / classic 2008 Flash-inspired recreation.
 * 12 named main stages + 5 bonus stages, each with distinct geometry / mechanics.
 * No copyrighted SWF or sprites are included. */
(function(){
 'use strict';
 window.NP_ClassicWeb.register('red-ball-flash',function(a){
  const{W,H,TAU,clamp,rect,circle,line,label,round,polygon,dist}=a;
  const RAD=17,GRAVITY=920,JUMP=400,MAX_SPEED=266,WIDTHS=[265,230,228,235,245,280];
  const SPECS=[
   {name:'Move and jump',heights:[355,355,345,355,355,350],gaps:[10,24,35,34,20],feature:'intro'},
   {name:'Funny ball',heights:[355,343,355,335,353,345],gaps:[15,28,22,29,18],feature:'boulders'},
   {name:'Lifts and thorns',heights:[358,305,335,306,345,330],gaps:[22,40,35,38,25],feature:'lifts'},
   {name:'Axes',heights:[355,340,342,339,345,350],gaps:[29,35,24,35,18],feature:'axes'},
   {name:'Jump!',heights:[355,324,295,332,290,340],gaps:[35,52,55,44,20],feature:'jumps'},
   {name:'Springboards',heights:[354,283,315,274,304,348],gaps:[55,50,60,55,18],feature:'springs'},
   {name:'Box bridge',heights:[355,355,346,343,352,345],gaps:[36,64,50,50,27],feature:'boxes'},
   {name:'Car',heights:[355,356,355,345,355,350],gaps:[21,39,30,32,20],feature:'car'},
   {name:'Ninja on the bridge',heights:[354,342,331,340,328,349],gaps:[32,38,32,44,23],feature:'ninja'},
   {name:'Red ball on the ball',heights:[358,345,334,348,325,342],gaps:[30,50,42,55,20],feature:'boulders'},
   {name:'Train',heights:[355,345,349,339,351,350],gaps:[50,66,53,60,18],feature:'train'},
   {name:'Sleep slope',heights:[363,338,307,337,298,358],gaps:[20,30,40,40,25],feature:'slope'},
   {name:'Pacman',heights:[355,343,343,355,336,350],gaps:[26,41,31,37,21],feature:'pacman'},
   {name:'Catapult',heights:[354,260,327,254,315,348],gaps:[60,80,62,66,22],feature:'catapult'},
   {name:'Shop burglary',heights:[357,354,342,343,334,348],gaps:[24,34,29,32,20],feature:'switch'},
   {name:'Short cut',heights:[351,320,342,295,324,340],gaps:[45,56,43,45,21],feature:'shortcut'},
   {name:'The King',heights:[352,342,333,323,323,351],gaps:[35,49,52,44,21],feature:'king'}
  ];
  let level=1,unlocked=clamp(Math.floor(a.getBest())+1,1,17),
      phase='menu',ball=null,stage=null,time=0,camera=0,tries=0,
      world=1650,goalX=1540,heldJump=false,fingerJump=false,prevSupport=null,
      message='Roll, jump and reach the flag.',deathCount=0;
  function initScene(){
   stage={name:SPECS[level-1].name,feature:SPECS[level-1].feature,
     platforms:[],spikes:[],springs:[],axes:[],crates:[],boulders:[],
     enemies:[],switches:[],doors:[],lifts:[],trains:[]};
   const spec=SPECS[level-1];let x=0;
   for(let i=0;i<6;i++){
    const p={x,y:spec.heights[i],w:WIDTHS[i],h:160,kind:'earth'};
    stage.platforms.push(p);
    x+=WIDTHS[i]+(spec.gaps[i]||0);
   }
   world=stage.platforms[5].x+stage.platforms[5].w;
   goalX=world-50;
   const base=stage.platforms;
   const addSpike=(i,f)=>stage.spikes.push({x:base[i].x+base[i].w*f,y:base[i].y});
   const addSpring=(i,f,power=590)=>stage.springs.push({
     x:base[i].x+base[i].w*f,y:base[i].y,power,flash:0
   });
   const addBoulder=(i,f)=>stage.boulders.push({
     x:base[i].x+base[i].w*f,y:base[i].y-23,r:21,
     baseX:base[i].x+base[i].w*f,amplitude:32,speed:1.2+i*.1
   });
   const addAxe=(i,f)=>stage.axes.push({
     x:base[i].x+base[i].w*f,y:base[i].y-156,length:90,phase:i*.9
   });
   const addCrate=(i,f)=>stage.crates.push({
     x:base[i].x+base[i].w*f,y:base[i].y-43,w:42,h:43,moveable:true
   });
   const addEnemy=(i,f,color)=>stage.enemies.push({
     x:base[i].x+base[i].w*f,y:base[i].y-22,
     baseX:base[i].x+base[i].w*f,speed:1+i*.18,range:44,col:color
   });
   switch(spec.feature){
    case 'intro': break;
    case 'boulders':addBoulder(1,.52);addBoulder(3,.49);addSpike(4,.7);break;
    case 'lifts':
      addSpike(1,.55);addSpike(3,.68);
      for(const i of [0,2,4])stage.lifts.push({
        x:base[i].x+base[i].w*.8,y:base[i].y-56,baseY:base[i].y-56,
        w:74,h:12,range:32+level,speed:.75+i*.2,kind:'lift'});
      break;
    case 'axes':addAxe(1,.52);addAxe(2,.67);addAxe(4,.45);break;
    case 'jumps':addSpike(2,.7);addSpike(3,.64);break;
    case 'springs':
      addSpring(0,.73);addSpring(2,.68);addSpring(4,.63);
      addSpike(3,.77);break;
    case 'boxes':addCrate(0,.73);addCrate(1,.83);addCrate(2,.7);addCrate(4,.49);break;
    case 'car':addCrate(1,.46);addCrate(3,.38);addSpike(3,.79);break;
    case 'ninja':addEnemy(1,.55,'#292b3c');addEnemy(2,.58,'#292b3c');addEnemy(4,.55,'#292b3c');break;
    case 'train':
      stage.trains.push({x:base[1].x+10,y:base[1].y-52,w:165,h:29,
        min:base[1].x+10,max:base[3].x+70,speed:85,direction:1});
      addSpike(3,.74);addSpring(0,.72,535);break;
    case 'slope':
      for(let i=1;i<5;i++)stage.platforms[i].slope=(i%2?-24:22);
      addBoulder(3,.59);break;
    case 'pacman':addEnemy(1,.53,'#ffe84c');addEnemy(3,.6,'#ffe84c');addSpike(4,.68);break;
    case 'catapult':addSpring(0,.82,690);addSpring(2,.52,720);addSpring(4,.56,690);break;
    case 'switch':
      stage.switches.push({x:base[1].x+65,y:base[1].y-9,active:false});
      stage.doors.push({x:base[4].x+108,y:base[4].y-87,w:23,h:88,open:false});break;
    case 'shortcut':addSpring(1,.67,610);addAxe(3,.64);addSpike(4,.64);break;
    case 'king':addSpike(1,.65);addAxe(2,.62);addEnemy(3,.57,'#b22732');
      addBoulder(4,.45);addSpring(4,.75,540);break;
   }
   if(level>=8&&level!==8&&level!==12)addSpike(2,.82);
   time=0;camera=0;prevSupport=null;heldJump=false;fingerJump=false;
   ball={x:55,y:base[0].y-RAD-1,vx:0,vy:0,spin:0,onGround:true};
   message='Level '+level+' • '+stage.name;
  }
  function groundY(p,x){
   return p.slope? p.y + (x-p.x)/p.w*p.slope:p.y;
  }
  function die(){
   tries++;deathCount++;prevSupport=null;
   ball={x:55,y:stage.platforms[0].y-RAD-1,vx:0,vy:0,spin:0,onGround:true};
   camera=0;message='Try again. Avoid hazards.';
  }
  function finish(){
   if(level===17){phase='won';unlocked=17;a.saveBest(17);return;}
   phase='clear';unlocked=Math.max(unlocked,level+1);
   a.saveBest(Math.max(a.getBest(),level));
  }
  function next(){
   if(level<17){level++;initScene();phase='playing';}
   else phase='won';
  }
  function reset(){initScene();phase='playing';tries=0;}
  function action(id){
   if(id==='restart'){reset();return;}
   if(id==='levels'){phase=phase==='select'?'menu':'select';return;}
   if(id==='start'){
     if(phase==='clear'){next();return;}
     if(phase==='won'){level=1;reset();return;}
     if(phase==='menu'||phase==='select'){level=clamp(level,1,unlocked);reset();return;}
   }
   if(id==='enter'){
     if(phase==='clear'){next();return;}
     if(phase!=='playing')reset();
   }
  }
  function update(dt,keys){
   if(phase!=='playing')return;
   time+=dt;
   const oldPositions=new Map();
   for(const p of stage.lifts){
     oldPositions.set(p,p.y);
     p.y=p.baseY+Math.sin(time*p.speed)*p.range;
   }
   for(const train of stage.trains){
     oldPositions.set(train,train.y);
     train.x+=train.speed*train.direction*dt;
     if(train.x>train.max){train.x=train.max;train.direction=-1;}
     if(train.x<train.min){train.x=train.min;train.direction=1;}
   }
   for(const b of stage.boulders){
     b.x=b.baseX+Math.sin(time*b.speed)*b.amplitude;
   }
   for(const enemy of stage.enemies){
     enemy.x=enemy.baseX+Math.sin(time*enemy.speed)*enemy.range;
   }
   if(prevSupport&&oldPositions.has(prevSupport)&&ball.onGround){
     ball.y+=prevSupport.y-oldPositions.get(prevSupport);
   }
   const steer=Number(keys.has('right'))-Number(keys.has('left'));
   ball.vx=clamp(ball.vx+steer*(ball.onGround?980:495)*dt,-MAX_SPEED,MAX_SPEED);
   if(!steer)ball.vx*=Math.exp(-dt*(ball.onGround?4.7:.45));
   const jump=keys.has('up')||keys.has('space')||fingerJump;
   if(!jump)heldJump=false;
   if(jump&&!heldJump&&ball.onGround){
     ball.vy=-JUMP;ball.onGround=false;prevSupport=null;heldJump=true;
   }
   ball.vy=clamp(ball.vy+GRAVITY*dt,-680,760);
   const oldX=ball.x,oldY=ball.y;
   const proposedX=ball.x+ball.vx*dt;
   ball.x=clamp(proposedX,RAD,world-RAD);
   ball.y+=ball.vy*dt;ball.spin+=(ball.x-oldX)/RAD;
   ball.onGround=false;prevSupport=null;
   const solid=[...stage.platforms,...stage.lifts,...stage.trains];
   for(const crate of stage.crates)solid.push(crate);
   for(const p of solid){
     const top=p.slope?groundY(p,ball.x):p.y;
     if(ball.x+RAD<p.x||ball.x-RAD>p.x+p.w)continue;
     if(oldY+RAD<=top+Math.max(9,Math.abs(ball.vy)*dt)&&ball.y+RAD>=top&&ball.vy>=0){
       ball.y=top-RAD;ball.vy=0;ball.onGround=true;prevSupport=p;
     }else if(!p.slope&&ball.y+RAD>top+8&&ball.y-RAD<p.y+p.h
       &&oldY>top-RAD+6&&Math.abs(ball.vx)>1){
       if(p.moveable){
         p.x=clamp(p.x+ball.vx*dt*.7,0,world-p.w);
       }else if(oldX+RAD<=p.x||oldX-RAD>=p.x+p.w){
         ball.x=oldX;ball.vx=0;
       }
     }
   }
   for(const spring of stage.springs){
     if(ball.vy>=0&&ball.onGround&&
       Math.abs(ball.x-spring.x)<27&&Math.abs(ball.y+RAD-spring.y)<12){
       ball.vy=-spring.power;ball.onGround=false;prevSupport=null;
       spring.flash=.21;
     }
     spring.flash=Math.max(0,spring.flash-dt);
   }
   if(stage.switches.some(sw=>Math.abs(ball.x-sw.x)<20&&
        Math.abs(ball.y+RAD-sw.y)<26))stage.doors.forEach(d=>d.open=true);
   for(const door of stage.doors)if(!door.open&&
        ball.x+RAD>door.x&&ball.x-RAD<door.x+door.w&&
        ball.y+RAD>door.y&&ball.y-RAD<door.y+door.h){
     ball.x=oldX;ball.vx=0;
   }
   const hazards=[
     ...stage.spikes.map(o=>({x:o.x,y:o.y-13,r:19})),
     ...stage.boulders.map(o=>({x:o.x,y:o.y,r:o.r})),
     ...stage.enemies.map(o=>({x:o.x,y:o.y,r:20})),
     ...stage.axes.map(o=>({x:o.x+Math.sin(time*1.65+o.phase)*o.length*.6,
       y:o.y+Math.cos(time*1.65+o.phase)*o.length,r:22}))
   ];
   if(hazards.some(h=>dist(ball.x,ball.y,h.x,h.y)<RAD+h.r-6)
      ||ball.y>H+120){die();return;}
   if(ball.x>=goalX){finish();return;}
   camera=clamp(ball.x-195,0,Math.max(0,world-W));
  }
  function background(c){
   const gradient=c.createLinearGradient(0,0,0,500);
   gradient.addColorStop(0,'#43ccf0');gradient.addColorStop(.65,'#c5f5fb');
   gradient.addColorStop(1,'#e9f9b5');
   rect(c,0,0,W,H,gradient);
   circle(c,674,72,46,'#fff0a7');
   for(let i=0;i<9;i++){
     const cx=i*185+45-camera*.13;
     for(let j=0;j<3;j++)circle(c,cx+j*21,100+Math.sin(i*6)*27,25-j*2,'rgba(255,255,255,.9)');
   }
   polygon(c,[[0,351],[113,277],[240,354],[372,271],[526,360],[673,262],[W,343],[W,H],[0,H]],'#a6dda6');
   polygon(c,[[0,402],[153,329],[326,405],[498,311],[707,400],[W,354],[W,H],[0,H]],'#80c681');
  }
  function draw(c){
   background(c);
   c.save();c.translate(-camera,0);
   if(stage) {
    for(const p of stage.platforms){
     polygon(c,[[p.x,p.y],[p.x+p.w,p.y+(p.slope||0)],
       [p.x+p.w,p.y+p.h],[p.x,p.y+p.h]],'#986a3d');
     polygon(c,[[p.x,p.y],[p.x+p.w,p.y+(p.slope||0)],
       [p.x+p.w,p.y+14+(p.slope||0)],[p.x,p.y+14]],'#62d448');
     for(let x=p.x+16;x<p.x+p.w-9;x+=46)
       circle(c,x,groundY(p,x)+4,5,'#93ef75');
     for(let x=p.x+20;x<p.x+p.w;x+=40)
       circle(c,x,p.y+36+(x%3)*12,5,'rgba(66,40,23,.15)');
    }
    for(const p of [...stage.lifts,...stage.trains]){
     round(c,p.x,p.y,p.w,p.h,4,p.kind==='lift'?'#8a9a9a':'#636a72','#dce6df');
     for(let i=8;i<p.w-4;i+=15)rect(c,p.x+i,p.y+3,6,3,'#c5d5d8');
    }
    for(const box of stage.crates){
     rect(c,box.x,box.y,box.w,box.h,'#a67746');
     rect(c,box.x+5,box.y+5,box.w-10,box.h-10,'#d29d62');
     line(c,box.x+4,box.y+4,box.x+box.w-4,box.y+box.h-4,'#815d38',3);
    }
    for(const sw of stage.switches){
     round(c,sw.x-16,sw.y-9,32,9,4,stage.doors.every(d=>d.open)?'#8bef7e':'#ffda6e','#5b5037');
    }
    for(const d of stage.doors)if(!d.open){
     rect(c,d.x,d.y,d.w,d.h,'#5296b6');
     for(let y=d.y+11;y<d.y+d.h;y+=14)
       line(c,d.x+4,y,d.x+d.w-4,y,'#b8f0fc',2);
    }
    for(const spring of stage.springs){
     rect(c,spring.x-23,spring.y-12,46,11,spring.flash?'#fafc90':'#6f84b6');
     for(let i=0;i<4;i++)line(c,spring.x-16+i*11,spring.y-8,
       spring.x-12+i*11,spring.y-15,'#fff5cf',2);
    }
    for(const spike of stage.spikes)
      polygon(c,[[spike.x-19,spike.y],[spike.x,spike.y-34],
       [spike.x+19,spike.y]],'#a0a5b0','#53616a',2);
    for(const axe of stage.axes){
     line(c,axe.x,axe.y,axe.x+Math.sin(time*1.65+axe.phase)*axe.length*.6,
       axe.y+Math.cos(time*1.65+axe.phase)*axe.length,'#666c78',5);
     circle(c,axe.x+Math.sin(time*1.65+axe.phase)*axe.length*.6,
       axe.y+Math.cos(time*1.65+axe.phase)*axe.length,22,'#c5cdd3','#5c6772',4);
    }
    for(const b of stage.boulders)circle(c,b.x,b.y,b.r,'#8f9da9','#4d5961',4);
    for(const enemy of stage.enemies){
     circle(c,enemy.x,enemy.y,21,enemy.col,'#343443',2);
     circle(c,enemy.x-6,enemy.y-4,4,'#fff');
     circle(c,enemy.x+6,enemy.y-4,4,'#fff');
    }
    line(c,goalX,230,goalX,stage.platforms[5].y,'#35383d',5);
    polygon(c,[[goalX,236],[goalX+63,251],[goalX,272]],'#f04c45');
    circle(c,goalX,230,6,'#f5d366');
    if(ball){
     c.save();c.translate(ball.x,ball.y);c.rotate(ball.spin);
     circle(c,0,0,RAD,'#df1721','#96111a',2.5);
     circle(c,-6,-3,5,'#fff');circle(c,6,-3,5,'#fff');
     circle(c,-5,-2,2,'#131b29');circle(c,7,-2,2,'#131b29');
     c.beginPath();c.arc(0,3,8,.3,Math.PI-.3);
     c.strokeStyle='#78252a';c.lineWidth=2;c.stroke();c.restore();
    }
   }
   c.restore();
   if(phase==='playing'){
     round(c,11,9,280,57,10,'rgba(255,255,255,.9)');
     label(c,'RED BALL',24,29,24,'#cf1e2c');
     label(c,'LEVEL '+level+'/17  •  DIES '+deathCount+'  •  '+SPECS[level-1].name,24,53,13,'#344d60');
   } else if(phase==='menu'){
     round(c,90,38,580,388,14,'rgba(255,255,255,.85)','#fff');
     label(c,'RED BALL 1',380,103,60,'#cf1b24','center');
     circle(c,528,236,72,'#e21c24','#951721',4);
     circle(c,509,216,17,'#fff');circle(c,547,216,17,'#fff');
     circle(c,512,217,6,'#152132');circle(c,550,217,6,'#152132');
     label(c,'PLAY',244,227,46,'#1a2530','center');
     label(c,'SELECT LEVEL',244,306,25,'#263341','center');
     label(c,'The classic 17-level Flash platformer',380,375,16,'#627681','center');
   } else if(phase==='select'){
     round(c,84,43,592,395,13,'rgba(255,255,255,.95)');
     label(c,'SELECT LEVEL',380,79,31,'#d5232c','center');
     for(let i=0;i<17;i++){
       const x=121+(i%6)*90,y=123+Math.floor(i/6)*82,active=i+1<=unlocked;
       round(c,x,y,72,59,7,active?'#7cd68d':'#c9d2d6',active?'#3c965a':'#879398');
       label(c,active?i+1:'LOCK',x+36,y+21,20,active?'#183b2e':'#66717c','center');
       label(c,SPECS[i].name.slice(0,11),x+36,y+45,9,'#30404b','center');
     }
     label(c,'BACK',380,414,18,'#314956','center');
   } else {
     rect(c,0,0,W,H,'rgba(16,31,48,.54)');
     round(c,150,156,460,185,14,'#fff','#8bbf9d');
     label(c,phase==='won'?'ALL 17 LEVELS COMPLETE!':'LEVEL '+level+' CLEAR!',380,213,34,'#cf1d2b','center');
     label(c,phase==='clear'?'NEXT LEVEL →':'PLAY AGAIN →',380,277,25,'#243c4a','center');
   }
  }
  function pointer(type,x,y){
   if(type==='up'||type==='cancel'){fingerJump=false;return;}
   if(type!=='down')return;
   if(phase==='menu'){
     if(y>=170&&y<=275)action('start');
     else if(y>=280&&y<=348)action('levels');
   }else if(phase==='select'){
     if(y>=115&&y<=353){
       const col=Math.floor((x-121)/90),row=Math.floor((y-123)/82),i=row*6+col;
       if(col>=0&&col<6&&row>=0&&i>=0&&i<17&&i+1<=unlocked){level=i+1;reset();}
     }else if(y>380)phase='menu';
   }else if(phase==='clear'||phase==='won')action('start');
   else if(phase==='playing')fingerJump=true;
  }
  return{
   controls:[{id:'left',label:'← LĂN',hold:true},{id:'right',label:'LĂN →',hold:true},
     {id:'up',label:'↑ NHẢY',hold:true},{id:'start',label:'PLAY / NEXT'},
     {id:'levels',label:'SELECT LEVEL'}],
   keys:['left','right','up','space','enter'],
   hint:'Red Ball Flash: ←/→ lăn, ↑ nhảy; 12 màn chính và 5 màn bonus. PLAY / NEXT để vào màn, SELECT LEVEL để mở bản đồ.',
   update,draw,pointer,action,
   getState(){return {level,unlocked,phase,ball,stage,camera,goalX,deathCount,stageCount:SPECS.length};}
  };
 });
})();
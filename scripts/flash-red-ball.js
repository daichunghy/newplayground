/* Red Ball: 17-stage grassy Flash platformer with rolling momentum, jumps and flags. */
(function(){
 'use strict';
 window.NP_ClassicWeb.register('red-ball-flash',function(a){
  const {W,H,TAU,clamp,rect,circle,line,label,round,polygon,dist}=a;
  let level=1,unlocked=Math.max(1,a.getBest()),dead=0,ball,
    platforms=[],spikes=[],crates=[],flagX=1475,camera=0,finished=false,readyJump=true,t=0;
  const radius=17,world=1510;
  function reset(){
   ball={x:65,y:274,vx:0,vy:0,rot:0,onGround:false};finished=false;readyJump=true;t=0;camera=0;
   platforms=[
    {x:0,y:353,w:268,h:68},{x:305,y:331,w:202,h:67},
    {x:544,y:363,w:220,h:61},{x:815,y:330,w:209,h:60},
    {x:1080,y:349,w:430,h:63}
   ];
   if(level===1)platforms=[
    {x:0,y:348,w:585,h:70},{x:618,y:348,w:225,h:70},
    {x:886,y:332,w:210,h:70},{x:1119,y:343,w:391,h:70}
   ];
   if(level>1)platforms.forEach((p,i)=>{
    if(i>0)p.y+=Math.sin(level*1.1+i)*Math.min(27,level*2);
   });
   spikes=level>1?Array.from({length:Math.min(2+Math.floor(level/4),5)},(_,i)=>{
    const p=platforms[(i+1)%platforms.length];
    return {x:p.x+p.w*.65,y:p.y};
   }):[];
   crates=level>2?Array.from({length:Math.min(1+Math.floor(level/6),3)},(_,i)=>{
    const p=platforms[(i+1)%platforms.length];return {x:p.x+p.w*.3,y:p.y-36,w:34,h:36};
   }):[];
  }
  function lose(){
   dead++;ball={x:65,y:274,vx:0,vy:0,rot:0,onGround:false};camera=0;
   if(dead>0&&dead%5===0)level=Math.max(1,level-1);
  }
  function nextLevel(){
   if(level>=17){finished=true;unlocked=17;a.saveBest(17);}
   else{level++;unlocked=Math.max(unlocked,level);a.saveBest(unlocked);reset();}
  }
  function update(dt,held){
   if(finished)return;t+=dt;
   const steer=Number(held.has('right'))-Number(held.has('left'));
   ball.vx+=steer*(ball.onGround?810:400)*dt;
   ball.vx=clamp(ball.vx,-235,235);
   if(!steer)ball.vx*=Math.exp(-dt*(ball.onGround?5.3:.6));
   const jump=held.has('up')||held.has('space');
   if(!jump)readyJump=true;
   if(jump&&readyJump&&ball.onGround){
    ball.vy=-420;ball.onGround=false;readyJump=false;
   }
   ball.vy=clamp(ball.vy+970*dt,-440,750);
   ball.x=clamp(ball.x+ball.vx*dt,17,world-17);
   const previousY=ball.y;
   ball.y+=ball.vy*dt;
   ball.rot+=ball.vx*dt/radius;
   ball.onGround=false;
   for(const p of platforms){
    if(ball.x+radius>p.x&&ball.x-radius<p.x+p.w &&
      previousY+radius<=p.y+8 && ball.y+radius>=p.y&&ball.vy>=0){
      ball.y=p.y-radius;ball.vy=0;ball.onGround=true;
    }
   }
   for(const box of crates){
    if(ball.x+radius>box.x&&ball.x-radius<box.x+box.w &&
      previousY+radius<=box.y+7&&ball.y+radius>=box.y&&ball.vy>=0){
      ball.y=box.y-radius;ball.vy=0;ball.onGround=true;
    }
   }
   if(spikes.some(p=>Math.abs(ball.x-p.x)<radius+12&&Math.abs(ball.y-(p.y-11))<radius+10)
     ||ball.y>H+100){lose();return;}
   if(ball.x>flagX)nextLevel();
   camera=clamp(ball.x-185,0,world-W);
  }
  function draw(c){
   // Simple blue-sky / white-cloud / bright-grass artwork of the first Flash Red Ball.
   rect(c,0,0,W,H,'#b9e8fb');
   circle(c,645,78,37,'#ffefaa');
   for(let i=0;i<8;i++){
    const cloudX=i*216+70-camera*.14;
    for(let j=0;j<3;j++)circle(c,cloudX+j*23,105+(i%3)*33+Math.sin(t*.2+i)*3,
      27-j*3,'rgba(255,255,255,.85)');
   }
   polygon(c,[[0,340],[165,251],[318,345],[485,249],[690,346],[W,265],[W,H],[0,H]],'#96c89e');
   polygon(c,[[0,385],[151,318],[319,393],[532,322],[W,398],[W,H],[0,H]],'#70b786');
   c.save();c.translate(-camera,0);
   for(const p of platforms){
    rect(c,p.x,p.y+13,p.w,p.h,'#8c623b');
    rect(c,p.x,p.y,p.w,16,'#64d34b');
    rect(c,p.x,p.y+14,p.w,9,'#4aa943');
    for(let x=p.x+17;x<p.x+p.w-4;x+=37){
      circle(c,x,p.y+3,5,'#83ed69');
      rect(c,x,p.y+32,4,13,'rgba(60,36,16,.13)');
    }
    rect(c,p.x,p.y+p.h-6,p.w,6,'#685039');
   }
   for(const x of [290,527,785,1055]){
    rect(c,x,414,18,85,'#8dbdd6');
    circle(c,x+9,426,26,'rgba(144,212,235,.25)');
   }
   for(const box of crates){
    rect(c,box.x,box.y,box.w,box.h,'#b47c47');
    rect(c,box.x+4,box.y+4,box.w-8,box.h-8,'#cf9863');
    line(c,box.x+4,box.y+4,box.x+box.w-4,box.y+box.h-4,'#86603c',4);
   }
   for(const spike of spikes){
    polygon(c,[[spike.x-17,spike.y],[spike.x,spike.y-29],
      [spike.x+17,spike.y]],'#959ca5','#59656d',2);
   }
   line(c,flagX,231,flagX,346,'#594b43',5);
   polygon(c,[[flagX,234],[flagX+54,250],[flagX,269]],'#fb634f');
   circle(c,flagX,231,6,'#ffcf56');
   c.save();c.translate(ball.x,ball.y);c.rotate(ball.rot);
   circle(c,0,0,17,'#cb0d14','#8d0f1b',2);
   circle(c,-5,-5,6,'rgba(255,255,255,.3)');
   // Two eyes and mischievous line smile, like the original red sphere.
   circle(c,-6,-2,4.3,'#fff');circle(c,6,-2,4.3,'#fff');
   circle(c,-5,-1,1.7,'#242333');circle(c,7,-1,1.7,'#242333');
   c.beginPath();c.arc(0,3,8,.15,Math.PI-.15);
   c.strokeStyle='#5b101b';c.lineWidth=2;c.stroke();
   c.restore();c.restore();
   round(c,17,12,220,60,6,'rgba(255,255,255,.9)','#7ebca2');
   label(c,'RED BALL',28,30,20,'#a21c24');
   label(c,'LEVEL '+level+'/17   •   DIES '+dead,28,54,15,'#354d58');
   round(c,562,12,180,48,6,'rgba(255,255,255,.85)');
   label(c,'STAGE '+level+': '+Math.round(ball.x/world*100)+'%',653,36,16,'#345962','center');
   if(finished){
    round(c,183,160,394,164,7,'#fff','#287d50');
    label(c,'YOU WIN!',380,223,40,'#e22f43','center');
    label(c,'ALL 17 LEVELS COMPLETED',380,275,18,'#2e6b50','center');
   }
  }
  reset();
  return{
   controls:[{id:'left',label:'← LĂN',hold:true},{id:'right',label:'LĂN →',hold:true},
     {id:'up',label:'↑ NHẢY',hold:true}],
   keys:['left','right','up','space'],
   hint:'Red Ball (17 màn Flash): lăn trái/phải, nhảy qua hố, tránh gai và chạm cờ đỏ về đích.',
   update,draw,action(id){if(id==='restart'){level=1;dead=0;reset();}},
   getState(){return {level,dead,ball,finished,unlocked};}
  };
 });
})();
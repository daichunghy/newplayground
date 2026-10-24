/* QWOP (2008): four independent muscle pairs, balance and a 100-metre runway. */
(function(){
 'use strict';
 window.NP_ClassicWeb.register('qwop-flash',function(a){
  const{W,H,TAU,clamp,rect,circle,line,label,round,polygon,dist}=a;
  let progress=0,velocity=0,y=311,vy=0,lean=-.04,leanV=0,clock=0,fallen=false,
      best=a.getBest(),won=false,legA={thigh:-.15,knee:.45},legB={thigh:.12,knee:.45};
  const ground=414,segment1=72,segment2=76;
  const keyAngle=val=>clamp(val,-1.15,1.15);
  function calculateLeg(hipX,hipY,upper,lower){
    const knee={x:hipX+Math.sin(upper)*segment1,y:hipY+Math.cos(upper)*segment1};
    const shinAngle=upper+lower;
    return{hip:{x:hipX,y:hipY},knee,
      foot:{x:knee.x+Math.sin(shinAngle)*segment2,y:knee.y+Math.cos(shinAngle)*segment2}};
  }
  function reset(){
   progress=0;velocity=0;y=310;vy=0;lean=-.04;leanV=0;clock=0;fallen=false;won=false;
   legA={thigh:-.15,knee:.45};legB={thigh:.12,knee:.45};
  }
  function update(dt,held){
   if(fallen||won)return;
   clock+=dt;
   const q=Number(held.has('q')),w=Number(held.has('w')),
      o=Number(held.has('o')),p=Number(held.has('p'));
   const muscles=(q-w);
   const calf=(o-p);
   const aimA=keyAngle(-.09+muscles*.75),aimB=keyAngle(.09-muscles*.75),
      kneeA=clamp(.34+calf*.75,-.65,1.4),
      kneeB=clamp(.34-calf*.75,-.65,1.4);
   const smoothing=1-Math.exp(-dt*9.3);
   legA.thigh+=(aimA-legA.thigh)*smoothing;
   legB.thigh+=(aimB-legB.thigh)*smoothing;
   legA.knee+=(kneeA-legA.knee)*smoothing;
   legB.knee+=(kneeB-legB.knee)*smoothing;
   const hipX=183, feet=[
    calculateLeg(hipX,y,legA.thigh+lean*.28,legA.knee),
    calculateLeg(hipX,y,legB.thigh+lean*.28,legB.knee)
   ];
   const contact=feet.map(leg=>Math.max(0,Math.min(1,(leg.foot.y-ground+9)/17)));
   const stride=muscles*(1-Math.abs(calf)*.25);
   const anklePush=contact[0]*Math.max(0,-legA.thigh)
     +contact[1]*Math.max(0,legB.thigh);
   let drive=(stride*.8+anklePush*.8)*30;
   // No automatic running: any forward movement must result from active muscle controls.
   if(!(q||w||o||p))drive=0;
   velocity+=drive*dt;
   velocity*=Math.exp(-dt*(contact[0]+contact[1]>.3?1.4:2.9));
   velocity=clamp(velocity,-5,30);
   progress=Math.max(-3,progress+velocity*dt);
   vy+=(contact[0]+contact[1]>.05?-210:530)*dt;
   const support=Math.max(contact[0],contact[1]);
   if(support>.1&&vy>0)vy*=Math.exp(-dt*11);
   y=clamp(y+vy*dt,283,408);
   const imbalance=(legA.thigh+legB.thigh)*.3+velocity*.004+
     (contact[0]-contact[1])*.06;
   leanV+=(imbalance*5 + (lean*.2) -leanV*2)*dt;
   // Leg movement alone can also stabilize the torso when timed in alternating phases.
   if(q!==w&&o!==p)leanV-=lean*.6*dt;
   lean=clamp(lean+leanV*dt,-1.8,1.8);
   if(Math.abs(lean)>1.35||y>376 || progress < -2.5){
    fallen=true;velocity=0;
    if(progress>best){best=Number(progress.toFixed(1));a.saveBest(best);}
   }
   if(progress>=100){won=true;best=100;a.saveBest(100);}
  }
  function limb(c,from,to,width,shade){
   line(c,from.x+2,from.y+3,to.x+2,to.y+3,'rgba(24,20,27,.5)',width+4);
   line(c,from.x,from.y,to.x,to.y,shade,width);
   circle(c,to.x,to.y,width/2,shade);
  }
  function draw(c){
   const grad=c.createLinearGradient(0,0,0,H);
   grad.addColorStop(0,'#45647c');grad.addColorStop(.53,'#79a7bf');
   grad.addColorStop(.555,'#1990b8');grad.addColorStop(.60,'#63a13e');
   grad.addColorStop(.74,'#7a9c30');grad.addColorStop(.745,'#ce5341');grad.addColorStop(1,'#d64a32');
   rect(c,0,0,W,H,grad);
   rect(c,0,375,W,15,'#e4e3bb');
   rect(c,0,399,W,9,'#f6efda');
   const offset=(progress*115)%155;
   for(let i=-1;i<8;i++){
    const x=i*155-offset+140;
    line(c,x,411,x-100,500,'#f2e8d3',5);
   }
   // Athlete shadows and track lines mimic the original browser game scene.
   c.save();
   c.translate(7,Math.max(0,(y-300)*.01));
   c.fillStyle='rgba(33,22,25,.32)';c.beginPath();c.ellipse(185,429,105,15,0,0,TAU);c.fill();
   c.restore();
   const hip={x:183,y},rear=calculateLeg(hip.x,hip.y,legB.thigh+lean*.28,legB.knee);
   const front=calculateLeg(hip.x,hip.y,legA.thigh+lean*.28,legA.knee);
   const bodyVector={x:Math.sin(lean)*79,y:-Math.cos(lean)*79};
   const shoulder={x:hip.x+bodyVector.x,y:hip.y+bodyVector.y};
   const head={x:shoulder.x+Math.sin(lean)*28,y:shoulder.y-Math.cos(lean)*28};
   const skin='#b66b48',darker='#8c4c37';
   limb(c,rear.hip,rear.knee,19,darker);limb(c,rear.knee,rear.foot,16,darker);
   limb(c,front.hip,front.knee,21,skin);limb(c,front.knee,front.foot,17,skin);
   for(const foot of [rear.foot,front.foot]){
    c.save();c.translate(foot.x,foot.y);
    polygon(c,[[-7,-4],[14,-6],[25,5],[-8,6]],'#d8e8f1','#f4f8fb',2);c.restore();
   }
   // Runner's red singlet, white shorts, swinging arms, face and hair.
   limb(c,hip,shoulder,36,'#c32f43');
   circle(c,hip.x,hip.y,19,'#f5f4e4');
   line(c,shoulder.x-4,shoulder.y+10,shoulder.x+25,shoulder.y+33,skin,13);
   line(c,shoulder.x+25,shoulder.y+33,shoulder.x+17,shoulder.y-9,skin,11);
   line(c,shoulder.x-7,shoulder.y+7,shoulder.x-29,shoulder.y+40,darker,13);
   line(c,shoulder.x-29,shoulder.y+40,shoulder.x-3,shoulder.y+46,darker,11);
   circle(c,head.x,head.y,22,skin);
   c.beginPath();c.arc(head.x-6,head.y-9,21,Math.PI*.97,TAU*.97);
   c.strokeStyle='#402520';c.lineWidth=9;c.stroke();
   circle(c,head.x+10,head.y-1,2,'#2a2223');
   line(c,head.x+12,head.y+13,head.x+19,head.y+13,'#703b37',2);
   label(c,'QWOP',380,22,17,'#e9eaeb','center');
   label(c,'Inspired by Bennett Foddy • 2008',380,43,14,'#dce8f0','center','400');
   label(c,Math.max(0,progress).toFixed(1)+' metres',380,85,38,'#fff','center');
   if(best>0)label(c,'BEST: '+best.toFixed(1)+' metres',380,117,17,'#d9eaf2','center');
   for(const [i,key] of ['Q','W','O','P'].entries()){
    const x=16+i*51;
    round(c,x,12,42,44,5,'#e2e4dd','#34383c');
    label(c,key,x+21,34,23,'#18252c','center');
   }
   if(fallen||won){
    round(c,242,147,324,111,8,'rgba(11,25,38,.86)');
    label(c,won?'100 METRES!':'YOU FELL OVER',404,184,27,'#fff','center');
    label(c,'Press R / CHƠI LẠI to restart',404,226,16,'#d5e3ed','center');
   }
   if(!clock){
    label(c,'USE Q W O P TO RUN',380,152,19,'#e3f5fc','center');
   }
  }
  reset();
  return{
   controls:[{id:'q',label:'Q • ĐÙI',hold:true},{id:'w',label:'W • ĐÙI',hold:true},
     {id:'o',label:'O • CẲNG CHÂN',hold:true},{id:'p',label:'P • CẲNG CHÂN',hold:true}],
   keys:['q','w','o','p'],keyMap:{KeyQ:'q',KeyW:'w',KeyO:'o',KeyP:'p'},
   hint:'QWOP (Bennett Foddy, 2008): Q/W điều khiển hai đùi ngược chiều; O/P điều khiển hai cẳng chân. Chạy 100 mét.',
   update,draw,action(id){if(id==='restart')reset();},
   getState(){return{progress,fallen,won,lean,legA,legB};}
  };
 });
})();
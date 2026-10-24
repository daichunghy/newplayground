/* Helicopter Game: classic lime tunnel, soot trail and press-to-rise flight. */
(function(){
 'use strict';
 window.NP_ClassicWeb.register('helicopter-game',function(a){
  const {W,H,TAU,rect,line,circle,label,polygon,clamp}=a;
  const stepW=19,scale=136;let height=200,velocity=0,press=false,
    distance=0,best=a.getBest(),lost=false,started=false,time=0,obstacles=[],
    smoke=[],terrain=[],spawn=4;
  function reset(){
   height=220;velocity=0;distance=0;lost=false;started=false;
   time=0;spawn=3;press=false;smoke=[];obstacles=[];
   terrain=Array.from({length:47},(_,i)=>({x:i*stepW,top:70+Math.sin(i*.19)*15,
     bottom:426+Math.cos(i*.18)*21}));
  }
  function crashed(){
   lost=true;started=false;press=false;
   if(distance>best){best=Math.floor(distance);a.saveBest(best);}
  }
  function update(dt,keys){
   if(lost)return;
   const power=press||keys.has('space')||keys.has('up');
   if(!started){if(power)started=true;else return;}
   time+=dt;
   velocity+= (power?-620:500)*dt;
   velocity=clamp(velocity,-240,295);
   height+=velocity*dt;
   const speed=190+Math.min(165,time*7);
   const dx=speed*dt;
   distance+=dx/9;
   for(const tile of terrain)tile.x-=dx;
   while(terrain[0].x < -stepW){
    terrain.shift();
    const prev=terrain[terrain.length-1];
    const mod=Math.sin(time*.81)*.9+Math.cos(time*.31)*.8;
    const top=clamp(prev.top+(Math.random()-.5)*16 +mod,42,174);
    const bottom=clamp(prev.bottom+(Math.random()-.5)*16+mod,347,456);
    terrain.push({x:prev.x+stepW,top,bottom:Math.max(top+158,bottom)});
   }
   const atX=terrain.find(p=>p.x>=210)||terrain[10];
   if(height-14<=atX.top||height+14>=atX.bottom){crashed();return;}
   spawn-=dt;
   if(spawn<0){
    spawn=2.0-Math.min(.9,time*.012);
    const oTop=Math.random()<.5;
    const p=terrain[terrain.length-1];
    const room=p.bottom-p.top;
    obstacles.push({x:W+10,width:31,top:oTop,
      y:oTop?p.top+room*.39:p.bottom-room*.38,
      height:room*.20});
   }
   obstacles.forEach(o=>{
    o.x-=dx;
    if(210+26>o.x && 210-27<o.x+o.width &&
       height+12>o.y-o.height/2 && height-12<o.y+o.height/2)crashed();
   });
   obstacles=obstacles.filter(o=>o.x>-55);
   smoke.push({x:183,y:height+3,life:1,r:2+Math.random()*2});
   smoke.forEach(p=>{p.x-=dx;p.life-=dt*1.4;p.y+=(Math.random()-.5)*5;});
   smoke=smoke.filter(p=>p.life>0).slice(-65);
  }
  function draw(c){
   rect(c,0,0,W,H,'#000');
   const upper=[[0,0],[W,0]],lower=[[0,H],[W,H]];
   for(let i=terrain.length-1;i>=0;i--){
    upper.push([terrain[i].x,terrain[i].top]);
    lower.push([terrain[i].x,terrain[i].bottom]);
   }
   polygon(c,upper,'#54ff50');polygon(c,lower,'#54ff50');
   for(let i=0;i<terrain.length;i++){
    const p=terrain[i];
    line(c,p.x,6,p.x+stepW,6,'rgba(0,110,0,.15)');
    for(let j=10;j<p.top;j+=12)
      line(c,p.x,j,p.x+stepW,j,'rgba(0,110,0,.1)');
    for(let j=p.bottom+4;j<H;j+=12)
      line(c,p.x,j,p.x+stepW,j,'rgba(0,110,0,.1)');
   }
   for(const o of obstacles){
    rect(c,o.x,o.y-o.height/2,o.width,o.height,'#54ff50');
    line(c,o.x+3,o.y-o.height/2+4,o.x+3,o.y+o.height/2-4,'#a9ffa9',3);
   }
   for(const p of smoke){
    circle(c,p.x,p.y,p.r+p.life*2,'rgba(179,184,175,'+(.55*p.life)+')');
   }
   c.save();c.translate(210,height);c.rotate(clamp(velocity/400,-.25,.25));
   // Recognizable blue body and main rotor / silver cockpit.
   c.fillStyle='#124dc3';c.beginPath();c.ellipse(4,3,32,13,-.15,0,TAU);c.fill();
   rect(c,-45,-1,28,4,'#1b58d0');rect(c,-48,-8,4,14,'#486aaf');
   c.fillStyle='#e7f6ff';c.beginPath();c.ellipse(18,3,16,9,0,0,TAU);c.fill();
   line(c,-18,-12,18,-12,'#b3dcfd',3);
   line(c,-42,-15,31,-15,'#87a0b7',3);
   line(c,0,-11,0,-15,'#dce7ed',3);
   line(c,-8,15,22,15,'#bacad0',3);
   line(c,-6,12,-6,16,'#bacad0',2);
   line(c,20,12,20,16,'#bacad0',2);
   c.restore();
   label(c,'DISTANCE: '+Math.floor(distance),18,472,21,'#ffffff');
   label(c,'BEST: '+Math.max(best,Math.floor(distance)),745,472,20,'#ffffff','right');
   if(!started){
    rect(c,0,156,W,155,'rgba(0,0,0,.78)');
    label(c,lost?'GAME OVER':'THE HELICOPTER GAME',380,194,32,'#67fa56','center');
    label(c,lost?'DISTANCE: '+Math.floor(distance):'Hold mouse / SPACE to go up',380,244,22,'#fff','center');
    label(c,lost?'Press and hold to try again':'Release to fall. Avoid the walls!',380,279,18,'#ccc','center');
   }
  }
  reset();
  return{
   controls:[{id:'space',label:'GIỮ ĐỂ BAY ↑',hold:true}],
   keys:['space','up'],
   hint:'Helicopter Game (Flash, 2002–2004): giữ chuột/chạm hoặc Space để bay lên, thả để rơi xuống. Tránh tường xanh.',
   draw,update,
   action(id){if(id==='space'||id==='up'){if(lost){reset();started=true;}}if(id==='restart')reset();},
   pointer(type){if(type==='down'){if(lost){reset();started=true;}press=true;}if(type==='up'||type==='cancel')press=false;},
   getState(){return{distance,lost,height,best};}
  };
 });
})();
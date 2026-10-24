/* The World's Hardest Game — original 2007 look and checkpoint/coin/avoidance rules. */
(function () {
 'use strict';
 window.NP_ClassicWeb.register('worlds-hardest-game', function (a) {
  const { W,H,rect,circle,line,label,clamp,dist,round }=a;
  let level=1,deaths=0, won=false, elapsed=0, player={x:100,y:250},orbs=[],coins=[],stage;
  const playerSize=22, SPEED=178, start={x:48,y:166,w:115,h:170},
        end={x:597,y:166,w:115,h:170}, field={x:163,y:190,w:434,h:126};
  function initLevel() {
    player={x:95,y:250}; elapsed=0; won=false;
    stage=level;
    const count=Math.min(4+Math.floor((level-1)/2),14);
    orbs=Array.from({length:count},(_,i)=>{
      const cols=4+Math.floor((level-1)/4), lane=i%cols;
      return {x:198+lane*(364/Math.max(1,cols-1)), y:250,
        r:10, lane, flip:(i%2===0?1:-1),
        speed:1.0+level*.053+i*.04, phase:i*1.1, period:48+level*1.0};
    });
    coins=level===1?[]:Array.from({length:Math.min(1+Math.floor(level/5),4)},(_,i)=>({
      x:260+ i*(Math.min(1+Math.floor(level/5),4)===1?0:215/(Math.min(1+Math.floor(level/5),4)-1)),
      y:225+((level+i)%2)*42, got:false
    }));
  }
  function allowed(x,y) {
    const half=playerSize/2;
    const inside=(r)=>x-half>=r.x && x+half<=r.x+r.w && y-half>=r.y && y+half<=r.y+r.h;
    // Margin on all edges creates a completely traversable horizontal lane.
    return inside(start)||inside(end)||inside(field);
  }
  function die() {
    deaths++;
    player.x=95;player.y=250;
    coins.forEach(c=>c.got=false);
  }
  function update(dt,held) {
    if(won)return;
    elapsed+=dt;
    for(const o of orbs)
      o.y=250 + Math.sin(elapsed*o.speed*o.flip+o.phase)*o.period;
    let dx=Number(held.has('right'))-Number(held.has('left')),
        dy=Number(held.has('down'))-Number(held.has('up'));
    const norm=Math.max(1,Math.hypot(dx,dy)), nx=player.x+dx/norm*SPEED*dt, ny=player.y+dy/norm*SPEED*dt;
    if(allowed(nx,player.y))player.x=nx;
    if(allowed(player.x,ny))player.y=ny;
    if(orbs.some(o=>dist(player.x,player.y,o.x,o.y)<o.r+playerSize*.65)){
      die();return;
    }
    for(const coin of coins)if(!coin.got&&dist(player.x,player.y,coin.x,coin.y)<19)coin.got=true;
    if(player.x>624 && coins.every(c=>c.got)){
      if(level===30){won=true;a.saveBest(Math.max(a.getBest(),30));}
      else{level++;a.saveBest(Math.max(a.getBest(),level-1));initLevel();}
    }
  }
  function draw(c) {
    rect(c,0,0,W,H,'#b7b4f9');
    rect(c,0,0,W,37,'#000');
    label(c,'MENU',14,19,22,'#fff');
    label(c,level+'/30',380,19,22,'#fff','center');
    label(c,'DEATHS: '+deaths,747,19,22,'#fff','right');
    rect(c,0,470,W,30,'#000');
    label(c,'THE WORLD’S HARDEST GAME',10,485,17,'#fff');
    // Black outlines, checkerboard walkway, neon-green safe boxes.
    rect(c,45,163,120,176,'#000');
    rect(c,160,187,440,132,'#000');
    rect(c,594,163,121,176,'#000');
    for(let yy=0;yy<4;yy++)for(let xx=0;xx<14;xx++)
      rect(c,163+xx*31,190+yy*31.5,31,31.5,(xx+yy)%2?'#e9e8ff':'#f7f7ff');
    rect(c,48,166,115,170,'#adffb0');rect(c,597,166,115,170,'#adffb0');
    // Checkerboard under the safe zone is intentionally absent as in the Flash aesthetic.
    for(const coin of coins)if(!coin.got){
      circle(c,coin.x,coin.y,8,'#ffdf24','#9a7a00',2);
      circle(c,coin.x-2,coin.y-2,2,'#fffac7');
    }
    for(const o of orbs){
      circle(c,o.x,o.y,o.r,'#1119d8','#000',2);
      circle(c,o.x-3,o.y-3,3,'#416dff');
    }
    rect(c,player.x-11,player.y-11,22,22,'#000');
    rect(c,player.x-8,player.y-8,16,16,'#fa121e');
    if(won){
      rect(c,0,37,W,433,'rgba(0,0,0,.65)');
      round(c,175,178,410,154,5,'#adffb0','#000');
      label(c,'YOU WIN!',380,221,42,'#111','center');
      label(c,'DEATHS: '+deaths+'  •  30/30',380,273,23,'#151515','center');
      label(c,'Press RESTART to play again',380,310,15,'#292929','center');
    }
  }
  initLevel();
  return {
    controls:[{id:'left',label:'←',hold:true},{id:'up',label:'↑',hold:true},
      {id:'down',label:'↓',hold:true},{id:'right',label:'→',hold:true}],
    hint:'Bản dựng theo The World’s Hardest Game (2007): đưa ô vuông đỏ qua 30 màn, tránh chấm xanh, nhặt xu vàng.',
    update,draw,
    action(id){if(id==='restart'){level=1;deaths=0;initLevel();}},
    getState(){return {level,deaths,won,orbs,coins,player};}
  };
 });
})();
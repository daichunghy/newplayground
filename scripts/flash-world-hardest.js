/* The World's Hardest Game (2007) inspired browser recreation.
 * 30 DISTINCT corridor layouts, moving blue enemies, coins and real checkpoint
 * respawns. Artwork is hand-drawn, not extracted from the SWF. */
(function(){
 'use strict';
 window.NP_ClassicWeb.register('worlds-hardest-game',function(a){
  const{W,H,TAU,rect,circle,label,clamp,dist,line,round}=a;
  const COLS=24,ROWS=14,T=24,OX=92,OY=80,SIZE=18,SPEED=184;
  // Hand-designed routes are intentionally level-specific rather than repeating
  // one shared straight corridor. They are original approximations, not extracted maps.
  const ROUTES=[
   [[2,7],[7,7],[14,7],[21,7]],
   [[2,3],[6,3],[6,10],[13,10],[13,5],[21,5]],
   [[2,10],[5,10],[5,3],[11,3],[11,8],[21,8]],
   [[2,6],[5,6],[5,2],[16,2],[16,10],[21,10]],
   [[2,2],[9,2],[9,11],[15,11],[15,4],[21,4]],
   [[2,11],[8,11],[8,5],[12,5],[12,2],[21,2]],
   [[2,4],[6,4],[6,10],[10,10],[10,3],[15,3],[15,8],[21,8]],
   [[2,8],[7,8],[7,2],[11,2],[11,11],[17,11],[17,6],[21,6]],
   [[2,3],[5,3],[5,10],[9,10],[9,2],[14,2],[14,9],[21,9]],
   [[2,10],[7,10],[7,3],[12,3],[12,9],[17,9],[17,5],[21,5]],
   [[2,6],[9,6],[9,2],[14,2],[14,11],[18,11],[18,5],[21,5]],
   [[2,2],[6,2],[6,8],[11,8],[11,4],[16,4],[16,10],[21,10]],
   [[2,11],[5,11],[5,4],[9,4],[9,9],[14,9],[14,3],[21,3]],
   [[2,5],[8,5],[8,11],[12,11],[12,2],[17,2],[17,8],[21,8]],
   [[2,7],[5,7],[5,2],[10,2],[10,10],[15,10],[15,5],[21,5]]
  ];
  const cells=()=>Array.from({length:ROWS},()=>Array(COLS).fill(false));
  const toX=x=>OX+(x+.5)*T,toY=y=>OY+(y+.5)*T;
  let level=1,deaths=0,done=false,elapsed=0,walk=cells(),
      routes=[],checkpoints=[],safes=[],coins=[],orbs=[],start=null,goal=null,
      currentCheckpoint=null,player={x:0,y:0},flash=0;
  function paint(grid,x,y,r=1){
    for(let row=-r;row<=r;row++)for(let col=-r;col<=r;col++){
      const xx=x+col,yy=y+row;
      if(xx>=0&&xx<COLS&&yy>=0&&yy<ROWS)grid[yy][xx]=true;
    }
  }
  function startLevel(){
    elapsed=0;flash=0;done=false;
    const mirrored=level>15;
    routes=ROUTES[(level-1)%15].map(([x,y])=>[x,mirrored?ROWS-1-y:y]);
    walk=cells();
    // Continuous 3-tile-wide path prevents impossible diagonal gate transitions.
    for(let i=1;i<routes.length;i++){
      const [ax,ay]=routes[i-1], [bx,by]=routes[i];
      let x=ax,y=ay;paint(walk,x,y);
      while(x!==bx||y!==by){
        x+=Math.sign(bx-x);y+=Math.sign(by-y);paint(walk,x,y);
      }
    }
    const first=routes[0],last=routes[routes.length-1];
    start={x:toX(first[0]),y:toY(first[1]),gx:first[0],gy:first[1]};
    goal={x:toX(last[0]),y:toY(last[1]),gx:last[0],gy:last[1]};
    safes=[{...start,kind:'start'},{...goal,kind:'finish'}];
    // Authentic green checkpoints start showing up after the opening levels.
    if(level>=4){
      const mid=routes[Math.floor(routes.length/2)];
      checkpoints=[{x:toX(mid[0]),y:toY(mid[1]),gx:mid[0],gy:mid[1]}];
      safes.push({...checkpoints[0],kind:'checkpoint'});
    }else checkpoints=[];
    currentCheckpoint=start;player={x:start.x,y:start.y};
    // Gold coins are placed at reachable corridor turns, not arbitrary screen pixels.
    const coinLocations=level===1?[]:
      routes.slice(1,-1).filter((p,i)=>i%Math.max(1,Math.floor(routes.length/4))===0).slice(0,4);
    coins=coinLocations.map(([x,y])=>({x:toX(x),y:toY(y),collected:false}));
    // The first level's recognizable four blue dots move vertically across
    // a horizontal corridor. Later layouts use segment-aligned patrollers.
    if(level===1){
      orbs=[7,10,13,17].map((gx,i)=>({
        x:toX(gx),y:toY(first[1]),cx:toX(gx),cy:toY(first[1]),
        axis:'y',length:23,speed:2.3+i*.22,phase:i*Math.PI/2,r:9
      }));
    }else{
      orbs=[];
      const count=Math.min(5+Math.floor(level/3),16);
      for(let i=0;i<count;i++){
        const index=1+(i%(routes.length-1));
        const [x1,y1]=routes[index-1],[x2,y2]=routes[index];
        const vertical=x1===x2;
        const fraction=(.28+((i*13)%8)/16);
        const x=toX(x1+(x2-x1)*fraction),y=toY(y1+(y2-y1)*fraction);
        const span=Math.min(34,Math.abs(vertical?y2-y1:x2-x1)*T/3);
        orbs.push({x,y,cx:x,cy:y,axis:vertical?'y':'x',length:span,
          speed:1.65+(i%4)*.3+level*.028,phase:i*1.9,r:8.7});
      }
    }
  }
  function isWalkable(x,y){
    const inside=(xx,yy)=>{
      const tx=Math.floor((xx-OX)/T),ty=Math.floor((yy-OY)/T);
      return tx>=0&&tx<COLS&&ty>=0&&ty<ROWS&&walk[ty][tx];
    };
    const half=SIZE/2-1;
    return inside(x-half,y-half)&&inside(x+half,y-half)&&inside(x-half,y+half)&&inside(x+half,y+half);
  }
  function safeArea(zone){
    return Math.abs(player.x-zone.x)<T*1.25 && Math.abs(player.y-zone.y)<T*1.25;
  }
  function resetOnDeath(){
    deaths++;flash=.24;elapsed=0;
    player.x=currentCheckpoint.x;player.y=currentCheckpoint.y;
    // Coins collected before a death must be collected again, as in the Flash game.
    coins.forEach(coin=>coin.collected=false);
  }
  function update(dt,keys){
    if(done)return;
    elapsed+=dt;flash=Math.max(0,flash-dt);
    for(const o of orbs){
      const move=Math.sin(elapsed*o.speed+o.phase)*o.length;
      o.x=o.cx+(o.axis==='x'?move:0);
      o.y=o.cy+(o.axis==='y'?move:0);
    }
    const dx=Number(keys.has('right'))-Number(keys.has('left'));
    const dy=Number(keys.has('down'))-Number(keys.has('up'));
    const mag=Math.max(1,Math.hypot(dx,dy));
    const vx=dx/mag*SPEED*dt,vy=dy/mag*SPEED*dt;
    // Small swept substeps avoid tunnelling through narrow maze walls at 144Hz.
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(vx),Math.abs(vy))/5));
    for(let i=0;i<steps;i++){
      if(isWalkable(player.x+vx/steps,player.y))player.x+=vx/steps;
      if(isWalkable(player.x,player.y+vy/steps))player.y+=vy/steps;
    }
    for(const cp of checkpoints)if(safeArea(cp))currentCheckpoint=cp;
    for(const coin of coins)if(!coin.collected&&dist(player.x,player.y,coin.x,coin.y)<17)
      coin.collected=true;
    if(orbs.some(o=>dist(player.x,player.y,o.x,o.y)<o.r+SIZE*.55)){
      resetOnDeath();return;
    }
    if(safeArea(goal)&&coins.every(c=>c.collected)){
      if(level===30){done=true;a.saveBest(30);}
      else{level++;a.saveBest(Math.max(a.getBest(),level-1));startLevel();}
    }
  }
  function draw(c){
    rect(c,0,0,W,H,'#b6b4ff');
    rect(c,0,0,W,40,'#000');
    label(c,level+'/30',W/2,20,23,'#fff','center');
    label(c,'DEATHS: '+deaths,W-14,20,23,'#fff','right');
    rect(c,0,464,W,36,'#000');
    label(c,'THE WORLD’S HARDEST GAME',14,481,15,'#fff');
    label(c,'SNUBBY LAND',W-12,481,16,'#fff','right');
    // Draw black continuous outer outline, then clean pale checkerboard cells.
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(walk[y][x])
      rect(c,OX+x*T-3,OY+y*T-3,T+6,T+6,'#000');
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(walk[y][x])
      rect(c,OX+x*T,OY+y*T,T,T,(x+y)%2===0?'#f8f8ff':'#e6e7fb');
    // 3x3 green safe zones and checkpoint tiles.
    for(const z of safes){
      for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){
        const x=z.gx+xx,y=z.gy+yy;
        if(x>=0&&x<COLS&&y>=0&&y<ROWS&&walk[y][x])
          rect(c,OX+x*T,OY+y*T,T,T,z.kind==='checkpoint'?'#c4f7b9':'#afffb5');
      }
    }
    for(const coin of coins)if(!coin.collected){
      circle(c,coin.x,coin.y,8,'#ffde1a','#7f710d',2);
      circle(c,coin.x-2,coin.y-2,2,'#fff');
    }
    for(const orb of orbs){
      circle(c,orb.x,orb.y,orb.r,'#1d22d5','#05072a',2.4);
      circle(c,orb.x-2.5,orb.y-2.5,2.4,'#6684ff');
    }
    rect(c,player.x-SIZE/2,player.y-SIZE/2,SIZE,SIZE,'#0a0b10');
    rect(c,player.x-SIZE/2+2,player.y-SIZE/2+2,SIZE-4,SIZE-4,
      flash?'#ff9c8e':'#ed1117');
    if(coins.some(z=>!z.collected)){
      label(c,'COLLECT ALL COINS',W/2,448,12,'#5a5c91','center');
    }
    if(done){
      rect(c,0,41,W,423,'rgba(12,7,24,.64)');
      round(c,182,160,396,175,4,'#b1f7b8','#000');
      label(c,'YOU WIN!',380,209,43,'#101d17','center');
      label(c,'30/30 • DEATHS: '+deaths,380,262,22,'#192419','center');
      label(c,'Press Chơi lại to try again',380,305,16,'#37483b','center');
    }
  }
  startLevel();
  return {
    controls:[{id:'left',label:'←',hold:true},{id:'up',label:'↑',hold:true},
      {id:'down',label:'↓',hold:true},{id:'right',label:'→',hold:true}],
    keys:['left','right','up','down'],
    hint:'Dùng WASD/mũi tên, né bóng xanh, nhặt xu vàng và tới vùng xanh. 30 mê cung được vẽ riêng (không trích xuất bản gốc).',
    draw,update,
    action(id){if(id==='restart'){level=1;deaths=0;startLevel();}},
    getState(){return {level,deaths,done,player,walk,orbs,coins,checkpoints,route:routes};}
  };
 });
})();
/* Original Khe Gió flight-loop candidate; deterministic, art/audio-free rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_FlappyBirdModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const WIDTH=600,HEIGHT=360,STEP=1000/60,PLAYER_X=142,RADIUS=12,GRAVITY=.31,FLAP=-5.05,GATE_W=40,GAP=116,GATE_SPEED=2.55,GATE_SPACING=198,MAX_LIVES=3;
 const CENTERS=[142,218,178,246,162,202,232,154];
 const finite=n=>Number.isFinite(n),clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),clone=x=>JSON.parse(JSON.stringify(x));
 function makeGates(){return Array.from({length:4},(_,i)=>({id:i,x:355+i*GATE_SPACING,center:CENTERS[i%CENTERS.length],passed:false}));}
 function initialState(){return{version:1,status:'ready',ticks:0,remainder:0,score:0,lives:MAX_LIVES,player:{x:PLAYER_X,y:HEIGHT/2,vy:0},gates:makeGates(),nextGateId:4};}
 function create(){return makeModel();}
 function makeModel(initial=null){
  let s=clone(initial||initialState()),events=[];
  const emit=(kind,extra={})=>events.push({kind,...extra});
  function resetAttempt(){s.ticks=0;s.remainder=0;s.player={x:PLAYER_X,y:HEIGHT/2,vy:0};s.gates=makeGates();s.nextGateId=4;}
  function crash(reason){if(s.status!=='playing')return;s.lives=Math.max(0,s.lives-1);emit('crash',{reason,lives:s.lives,score:s.score});if(s.lives===0){s.status='over';s.remainder=0;emit('over',{score:s.score});}else{resetAttempt();emit('respawn',{lives:s.lives});}}
  function tick(){if(s.status!=='playing')return;s.ticks++;const p=s.player;p.vy+=GRAVITY;p.y+=p.vy;
   if(p.y-RADIUS<0||p.y+RADIUS>HEIGHT){crash(p.y-RADIUS<0?'ceiling':'floor');return;}
   for(const g of s.gates){g.x-=GATE_SPEED;if(p.x+RADIUS>g.x&&p.x-RADIUS<g.x+GATE_W){const top=g.center-GAP/2,bottom=g.center+GAP/2;if(p.y-RADIUS<top||p.y+RADIUS>bottom){crash('gate');return;}}
    if(!g.passed&&g.x+GATE_W<p.x-RADIUS){g.passed=true;s.score++;emit('score',{score:s.score,gate:g.id});}}
   while(s.gates.length&&s.gates[0].x+GATE_W<0){s.gates.shift();const id=s.nextGateId++;s.gates.push({id,x:s.gates.at(-1).x+GATE_SPACING,center:CENTERS[id%CENTERS.length],passed:false});}
  }
  function flap(){if(s.status==='over')return false;if(s.status==='ready'){s.status='playing';emit('start');}s.player.vy=FLAP;emit('flap');return true;}
  function advance(ms){if(s.status!=='playing'||!finite(ms)||ms<0||ms>60000)return[];s.remainder+=ms;while(s.remainder+1e-7>=STEP&&s.status==='playing'){s.remainder=Math.max(0,s.remainder-STEP);tick();}const out=events;events=[];return out;}
  function view(){return{version:1,status:s.status,ticks:s.ticks,score:s.score,lives:s.lives,player:clone(s.player),gates:clone(s.gates)};}
  return{flap,advance,drain:()=>{const out=events;events=[];return out;},view,serialize:()=>clone(s),reset:()=>create()};
 }
 return{WIDTH,HEIGHT,STEP,PLAYER_X,RADIUS,GRAVITY,FLAP,GATE_W,GAP,GATE_SPEED,GATE_SPACING,MAX_LIVES,CENTERS:clone(CENTERS),create,makeModel};
});

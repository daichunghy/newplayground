/* Original Vòm Mây platformer rules. No copied levels, art, music or commercial code. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_CloudCanopyModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const STEP=16,WIDTH=640,HEIGHT=360,PLAYER_W=22,PLAYER_H=28,MAX_SPEED=3.5,GRAVITY=.43;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const LEVELS=[
  {name:'Bậc Gió',width:1600,sky:'#d8eff2',spawn:{x:48,y:284},checkpoint:{x:900,y:284},gate:{x:1516,y:266},
   platforms:[[0,312,300],[362,312,205],[610,312,205],[865,312,215],[1128,312,472],[145,250,112],[402,258,105],[660,224,120],[922,258,105],[1190,222,125],[1360,260,100]],
   bells:[[190,225],[696,199],[1252,196]],enemies:[[230,292,210,270,1],[486,292,420,548,-1],[1244,292,1200,1325,1]],winds:[[574,220,86,100,.12,-.06],[1010,205,120,105,.09,-.04]],color:'#76a98a'},
  {name:'Cầu Mây',width:1664,sky:'#e6e6f5',spawn:{x:48,y:284},checkpoint:{x:900,y:284},gate:{x:1580,y:266},
   platforms:[[0,312,260],[324,312,170],[548,312,205],[806,312,160],[1016,312,188],[1248,312,416],[104,250,105],[367,254,105],[603,226,108],[849,250,110],[1083,220,115],[1376,254,120]],
   bells:[[146,222],[652,200],[1424,228]],enemies:[[184,292,150,230,1],[684,292,640,735,-1],[1302,292,1260,1360,1]],winds:[[269,218,78,100,.1,-.05],[740,200,96,105,.1,-.08],[1165,190,70,120,.14,-.05]],color:'#8e8db6'},
  {name:'Đỉnh Lặng',width:1728,sky:'#d8e6f4',spawn:{x:48,y:284},checkpoint:{x:1010,y:284},gate:{x:1640,y:266},
   platforms:[[0,312,260],[329,312,183],[579,312,170],[811,312,190],[1060,312,184],[1298,312,430],[116,248,110],[370,218,112],[626,250,110],[858,222,112],[1113,250,112],[1400,218,130]],
   bells:[[157,220],[678,216],[1460,187]],enemies:[[190,292,150,232,-1],[675,292,630,720,1],[1162,292,1120,1210,-1],[1436,202,1400,1490,1]],winds:[[275,195,90,110,.12,-.09],[751,195,88,110,.1,-.05],[1230,194,84,100,.15,-.07]],color:'#75a9c2'}
 ];
 const finite=n=>Number.isFinite(n);
 const makeEnemy=(row,id)=>({id,x:row[0],y:row[1],min:row[2],max:row[3],dir:row[4],speed:1.12,alive:true});
 function levelState(stage,score,lives){const L=LEVELS[stage];return{version:1,stage,ticks:0,remainder:0,score,bankScore:score,lives,status:'playing',player:{x:L.spawn.x,y:L.spawn.y,vx:0,vy:0,grounded:false,facing:1,jumpHold:0,jumpBuffer:0,invulnerable:0,gustUsed:false,gustFrames:0,gustDirection:1},checkpoint:false,collected:Array(L.bells.length).fill(false),gustsUsed:0,enemies:L.enemies.map(makeEnemy),wasJump:false,wasGust:false,gateHint:0};}
 function validSave(s){
  if(!s||s.version!==1||!Number.isInteger(s.stage)||s.stage<0||s.stage>=LEVELS.length||!['playing','cleared','won','lost'].includes(s.status))return false;
  for(const k of ['ticks','score','bankScore','lives'])if(!Number.isSafeInteger(s[k])||s[k]<0)return false;
  if(s.score<s.bankScore||s.score>1e9||s.bankScore>1e9||s.lives>3||!finite(s.remainder)||s.remainder<0||s.remainder>=STEP||typeof s.checkpoint!=='boolean'||typeof s.wasJump!=='boolean'||(s.wasGust!==undefined&&typeof s.wasGust!=='boolean')||!Number.isInteger(s.gateHint)||s.gateHint<0||s.gateHint>90)return false;
  if(s.status==='lost'?s.lives!==0:s.lives===0)return false;
  const L=LEVELS[s.stage],p=s.player;
  if(!p||!['x','y','vx','vy'].every(k=>finite(p[k]))||p.x<0||p.x>L.width||p.y< -180||p.y>520||Math.abs(p.vx)>MAX_SPEED||p.vy< -11||p.vy>10||typeof p.grounded!=='boolean'||![1,-1].includes(p.facing)||!Number.isInteger(p.jumpHold)||p.jumpHold<0||p.jumpHold>10||!Number.isInteger(p.jumpBuffer)||p.jumpBuffer<0||p.jumpBuffer>8||!Number.isInteger(p.invulnerable)||p.invulnerable<0||p.invulnerable>60||(p.gustUsed!==undefined&&typeof p.gustUsed!=='boolean')||(p.gustFrames!==undefined&&(!Number.isInteger(p.gustFrames)||p.gustFrames<0||p.gustFrames>12))||(p.gustDirection!==undefined&&![1,-1].includes(p.gustDirection)))return false;
  if(!Array.isArray(s.collected)||s.collected.length!==L.bells.length||s.collected.some(x=>typeof x!=='boolean'))return false;
  if((s.gustsUsed!==undefined&&(!Number.isInteger(s.gustsUsed)||s.gustsUsed<0||s.gustsUsed>s.collected.filter(Boolean).length)))return false;
  if(!Array.isArray(s.enemies)||s.enemies.length!==L.enemies.length||s.enemies.some((e,i)=>!e||e.id!==i||!finite(e.x)||e.x<L.enemies[i][2]||e.x>L.enemies[i][3]||e.y!==L.enemies[i][1]||![-1,1].includes(e.dir)||typeof e.alive!=='boolean'))return false;
  if(s.status==='lost'&&s.lives!==0)return false;
  if((s.status==='cleared'||s.status==='won')&&(s.collected.some(x=>!x)||s.player.x+PLAYER_W<L.gate.x||(s.status==='won')!==(s.stage===LEVELS.length-1)))return false;
  return true;
 }
 function create({saved=null,stage=0,score=0,lives=3}={}){
  if(saved&&!validSave(saved))return null;
  if(!saved&&(!Number.isInteger(stage)||stage<0||stage>=LEVELS.length||!Number.isSafeInteger(score)||score<0||score>1e9||!Number.isInteger(lives)||lives<1||lives>3))throw new RangeError('Invalid initial campaign');
  let state=saved?clone(saved):levelState(stage,score,lives),events=[];
  // Version-one saves created before gusts existed remain playable.
  state.gustsUsed??=0;state.wasGust??=false;state.player.gustUsed??=false;state.player.gustFrames??=0;state.player.gustDirection??=state.player.facing;
  const emit=(kind,extra={})=>events.push({kind,...extra});
  const level=()=>LEVELS[state.stage],player=()=>state.player;
  const intersects=(a,b)=>a.x<b.x+b.w&&a.x+(a.w||PLAYER_W)>b.x&&a.y<b.y+b.h&&a.y+(a.h||PLAYER_H)>b.y;
  function respawn(){const L=level(),p=player(),spot=state.checkpoint?L.checkpoint:L.spawn;p.x=spot.x;p.y=spot.y;p.vx=0;p.vy=0;p.grounded=false;p.jumpHold=0;p.jumpBuffer=0;p.invulnerable=60;p.gustUsed=false;p.gustFrames=0;state.wasJump=false;state.wasGust=false;}
  function hurt(reason){if(player().invulnerable>0||state.status!=='playing')return;state.lives=Math.max(0,state.lives-1);emit('hurt',{reason,lives:state.lives});if(state.lives===0){state.status='lost';state.remainder=0;emit('lost');}else respawn();}
  function tick(input){
   state.ticks++;const L=level(),p=player(),left=!!input.left,right=!!input.right,jump=!!input.jump,gust=!!input.gust;
   if(jump&&!state.wasJump)p.jumpBuffer=8;
   if(!jump&&state.wasJump){p.jumpHold=0;if(p.vy< -2)p.vy*=.58;}
   state.wasJump=jump;
   if(gust&&!state.wasGust&&!p.grounded&&!p.gustUsed&&state.gustsUsed<state.collected.filter(Boolean).length){
    state.gustsUsed++;p.gustUsed=true;p.jumpHold=0;p.vy=-9.7;p.gustFrames=12;p.gustDirection=p.facing;p.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,p.vx+p.facing*2.7));emit('gust',{charges:state.collected.filter(Boolean).length-state.gustsUsed});
   }
   state.wasGust=gust;
   if(p.jumpBuffer>0&&p.grounded){p.vy=-8.25;p.grounded=false;p.jumpHold=10;p.jumpBuffer=0;emit('jump');}
   else if(p.jumpBuffer>0)p.jumpBuffer--;
   if(left!==right){p.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,p.vx+(left?-.46:.46)));p.facing=left?-1:1;}
   else {p.vx*=.76;if(Math.abs(p.vx)<.1)p.vx=0;}
   if(p.gustFrames>0){const push=left!==right?(left?-1:1):p.gustDirection;p.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,p.vx+push*.42));p.gustFrames--;}
   p.x=Math.max(0,Math.min(L.width-PLAYER_W,p.x+p.vx));
   if((p.x===0&&p.vx<0)||(p.x===L.width-PLAYER_W&&p.vx>0))p.vx=0;
   for(const [x,y,w,h]of L.platforms){const box={x,y,w,h};if(intersects({...p,y:p.y,w:PLAYER_W,h:PLAYER_H},box)){if(p.vx>0)p.x=x-PLAYER_W;else if(p.vx<0)p.x=x+w;p.vx=0;}}
   const oldY=p.y,oldBottom=oldY+PLAYER_H;
   let lift=0,windX=0;
   for(const [x,y,w,h,fx,fy]of L.winds)if(intersects({x:p.x,y:p.y,w:PLAYER_W,h:PLAYER_H},{x,y,w,h})){windX+=fx;lift+=fy;}
   p.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,p.vx+windX));
   if(p.vy<0&&jump&&p.jumpHold>0){p.vy=Math.max(-9.6,p.vy-.11);p.jumpHold--;}
   else p.vy=Math.min(9,p.vy+GRAVITY+lift);
   p.y+=p.vy;p.grounded=false;
   for(const [x,y,w,h]of L.platforms){
    const horizontal=p.x<x+w&&p.x+PLAYER_W>x;
    if(horizontal&&p.vy>=0&&oldBottom<=y+2&&p.y+PLAYER_H>=y){p.y=y-PLAYER_H;p.vy=0;p.grounded=true;p.gustUsed=false;p.gustFrames=0;}
    else if(horizontal&&p.vy<0&&oldY>=y+h&&p.y<y+h){p.y=y+h;p.vy=.4;p.jumpHold=0;}
   }
   if(p.grounded&&oldY+PLAYER_H< p.y+PLAYER_H)emit('land');
   if(state.gateHint>0)state.gateHint--;
   if(p.invulnerable>0)p.invulnerable--;
   for(const enemy of state.enemies){if(!enemy.alive)continue;enemy.x+=enemy.speed*enemy.dir;if(enemy.x<enemy.min||enemy.x>enemy.max){enemy.x=Math.max(enemy.min,Math.min(enemy.max,enemy.x));enemy.dir*=-1;}const e={x:enemy.x,y:enemy.y,w:18,h:18};if(intersects({...p,w:PLAYER_W,h:PLAYER_H},e)){hurt('mite');break;}}
   for(let i=0;i<L.bells.length;i++){if(state.collected[i])continue;const [x,y]=L.bells[i];if(intersects({x:p.x,y:p.y,w:PLAYER_W,h:PLAYER_H},{x:x-10,y:y-10,w:20,h:20})){state.collected[i]=true;state.score+=250;emit('bell',{index:i,score:state.score});}}
   if(!state.checkpoint&&p.x+PLAYER_W>=L.checkpoint.x){state.checkpoint=true;emit('checkpoint');}
   if(state.status!=='playing')return;
   if(p.y>HEIGHT+100){hurt('fall');return;}
   if(p.x+PLAYER_W>=L.gate.x&&p.y+PLAYER_H>=L.gate.y&&p.y<L.gate.y+52){if(state.collected.every(Boolean)){state.score+=500;state.status=state.stage===LEVELS.length-1?'won':'cleared';state.remainder=0;emit(state.status,{score:state.score});}else if(state.gateHint===0){state.gateHint=60;emit('locked',{remaining:state.collected.filter(x=>!x).length});}}
  }
  function advance(ms,input={}){if(state.status!=='playing'||!finite(ms)||ms<0||ms>60000)return[];state.remainder+=ms;while(state.remainder+1e-7>=STEP&&state.status==='playing'){state.remainder=Math.max(0,state.remainder-STEP);tick(input);}const out=events;events=[];return out;}
  function next(){return state.status==='cleared'?create({stage:state.stage+1,score:state.score,lives:state.lives}):null;}
  function retry(){return state.status==='lost'?create({stage:state.stage,score:state.bankScore,lives:3}):null;}
  function view(){const collectedCount=state.collected.filter(Boolean).length;return{...clone(state),level:{name:level().name,width:level().width,sky:level().sky,spawn:clone(level().spawn),gate:clone(level().gate),platforms:clone(level().platforms),bells:clone(level().bells),winds:clone(level().winds),checkpoint:clone(level().checkpoint)},bellCount:level().bells.length,collectedCount,remaining:level().bells.length-collectedCount,gustCharges:collectedCount-state.gustsUsed};}
  return{advance,view,serialize:()=>clone(state),next,retry};
 }
 return{STEP,WIDTH,HEIGHT,PLAYER_W,PLAYER_H,MAX_SPEED,GRAVITY,LEVELS:clone(LEVELS),validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});

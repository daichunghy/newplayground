/* Original NewPlayground garden bomb rules and arenas. No commercial code/maps/assets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_GardenBombsModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const SIZE=11,STEP=20,FUSE=120,FLAME=20,MOVE=8;
 const DIRS={up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]},ORDER=Object.keys(DIRS);
 const MAPS=[
 ['###########','#S..C.C..E#','#.#.#.#.#.#','#...C...P.#','#C#.###.#C#','#...C..H..#','#.#C#C#.#.#','#P..C.....#','#.#.#.#.#C#','#..BC..F..#','###########'],
 ['###########','#S..C....E#','#.#.###.#.#','#...C.P...#','###C#.#C#.#','#P....#...#','#.#C#C#.#.#','#...H...C.#','#.#.###.#.#','#.B..C.FP.#','###########'],
 ['###########','#S..C.C..E#','#.#.#.#.#.#','#...#..P..#','#C#.#C#C#.#','#...C..H..#','#.#C#.#.#C#','#P..C...P.#','#.#.#C#.#.#','#..B..F...#','###########'],
 ['###########','#S..C....E#','#.#.#C#.#.#','#...C.P...#','#C###.#C#.#','#...H.C...#','#.#C#.#.#C#','#P..C..H..#','#.#.###.#.#','#.B...C.F.#','###########'],
 ['###########','#S..C.C..E#','#.#.#.#.#.#','#...C.P.C.#','#C#.#C#.#.#','#..H...H..#','#.#C###C#.#','#P..C...P.#','#.#.#.#.#.#','#..B.C.F..#','###########']
 ];
 const clone=x=>JSON.parse(JSON.stringify(x)),key=(r,c)=>r*SIZE+c,inside=(r,c)=>r>=0&&c>=0&&r<SIZE&&c<SIZE;
 function arena(index){
  const rows=MAPS[index];if(!rows)throw new RangeError('Unknown arena');
  const grid=[],boxes={},enemies=[];let spawn,exit;
  rows.forEach((row,r)=>{grid[r]=[];[...row].forEach((v,c)=>{grid[r][c]=v==='#'?1:'CBF'.includes(v)?2:0;if(v==='B'||v==='F')boxes[key(r,c)]=v==='B'?'capacity':'range';if(v==='S')spawn={r,c};if(v==='E')exit={r,c};if(v==='P'||v==='H')enemies.push({id:enemies.length,r,c,fromR:r,fromC:c,movedAt:0,heading:'left',cooldown:v==='H'?12:14,kind:v==='H'?'hunter':'patrol',alive:true});});});
  return {grid,boxes,enemies,spawn,exit};
 }
 function validSave(s){
  if(!s||s.version!==1||!Number.isInteger(s.stage)||s.stage<0||s.stage>=MAPS.length||!['playing','cleared','won','lost'].includes(s.status))return false;
  for(const k of ['seed','startSeed','ticks','score','bank','nextBomb'])if(!Number.isSafeInteger(s[k])||s[k]<0)return false;
  if(s.seed>0xffffffff||s.startSeed>0xffffffff||s.score<s.bank||s.nextBomb<1||!Number.isFinite(s.remainder)||s.remainder<0||s.remainder>=STEP||s.wanted!==null&&!ORDER.includes(s.wanted))return false;
  const def=arena(s.stage);
  if(!Array.isArray(s.grid)||s.grid.length!==SIZE||Array.from(s.grid).some((row,r)=>!Array.isArray(row)||row.length!==SIZE||Array.from(row).some((v,c)=>!Number.isInteger(v)||v<0||v>2||(def.grid[r][c]===1?v!==1:def.grid[r][c]===0?v!==0:v===1))))return false;
  for(const k of ['capacity','startCapacity'])if(!Number.isInteger(s[k])||s[k]<1||s[k]>3)return false;
  for(const k of ['range','startRange'])if(!Number.isInteger(s[k])||s[k]<2||s[k]>4)return false;
  const actor=p=>p&&['r','c','fromR','fromC'].every(k=>Number.isInteger(p[k])&&p[k]>0&&p[k]<SIZE-1)&&s.grid[p.r][p.c]===0&&s.grid[p.fromR][p.fromC]===0&&Number.isInteger(p.movedAt)&&p.movedAt>=0&&p.movedAt<=s.ticks&&ORDER.includes(p.heading)&&Number.isInteger(p.cooldown)&&p.cooldown>=0&&p.cooldown<=14;
  if(!actor(s.player))return false;
  if(!Array.isArray(s.enemies)||s.enemies.length!==def.enemies.length||Array.from(s.enemies).some((e,i)=>!actor(e)||e.id!==i||e.kind!==def.enemies[i].kind||typeof e.alive!=='boolean'))return false;
  if(!Array.isArray(s.bombs)||s.bombs.length>s.capacity)return false;
  const cells=new Set(),ids=new Set();
  for(const b of Array.from(s.bombs)){
   if(!b||!Number.isInteger(b.id)||b.id<1||b.id>=s.nextBomb||ids.has(b.id)||!Number.isInteger(b.r)||!Number.isInteger(b.c)||!inside(b.r,b.c)||s.grid[b.r][b.c]!==0||cells.has(key(b.r,b.c))||!Number.isInteger(b.fuse)||b.fuse<1||b.fuse>FUSE||!Number.isInteger(b.range)||b.range<2||b.range>4)return false;cells.add(key(b.r,b.c));ids.add(b.id);
  }
  if(!Array.isArray(s.flames)||s.flames.length>SIZE*SIZE||Array.from(s.flames).some(f=>!f||!Number.isInteger(f.r)||!Number.isInteger(f.c)||!inside(f.r,f.c)||s.grid[f.r][f.c]!==0||!Number.isInteger(f.ttl)||f.ttl<1||f.ttl>FLAME)||new Set(s.flames.map(f=>key(f.r,f.c))).size!==s.flames.length)return false;
  if(!s.items||Array.isArray(s.items)||typeof s.items!=='object'||Object.entries(s.items).some(([k,v])=>!/^\d+$/.test(k)||!['capacity','range'].includes(v)||def.boxes[k]!==v||s.grid[Math.floor(+k/SIZE)]?.[+k%SIZE]!==0))return false;
  if((s.status==='cleared'||s.status==='won')&&(s.enemies.some(e=>e.alive)||s.player.r!==def.exit.r||s.player.c!==def.exit.c||(s.status==='won')!==(s.stage===MAPS.length-1)))return false;
  return true;
 }
 function create({seed=Date.now()>>>0,saved=null,stage=0,bank=0,capacity=1,range=2}={}){
  if(saved&&!validSave(saved))return null;
  if(!saved&&(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(stage)||stage<0||stage>=MAPS.length||!Number.isSafeInteger(bank)||bank<0||![1,2,3].includes(capacity)||![2,3,4].includes(range)))throw new RangeError('Invalid initial state');
  let state;if(saved)state=clone(saved);else{const a=arena(stage);state={version:1,stage,seed,startSeed:seed,grid:a.grid,enemies:a.enemies,player:{...a.spawn,fromR:a.spawn.r,fromC:a.spawn.c,movedAt:0,heading:'right',cooldown:0},items:{},bombs:[],flames:[],capacity,range,startCapacity:capacity,startRange:range,bank,score:bank,status:'playing',ticks:0,remainder:0,nextBomb:1,wanted:null};}
  let events=[];
  const emit=(kind,extra={})=>events.push({kind,...extra});
  const rand=()=>{state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/0x100000000;};
  const bombAt=(r,c)=>state.bombs.find(b=>b.r===r&&b.c===c),hot=(r,c)=>state.flames.some(f=>f.r===r&&f.c===c);
  const open=(r,c)=>inside(r,c)&&state.grid[r][c]===0&&!bombAt(r,c);
  function moveActor(actor,dir,delay){const [dr,dc]=DIRS[dir],r=actor.r+dr,c=actor.c+dc;if(!open(r,c))return false;actor.fromR=actor.r;actor.fromC=actor.c;actor.r=r;actor.c=c;actor.movedAt=state.ticks;actor.cooldown=delay;actor.heading=dir;return true;}
  function die(){if(state.status==='playing'){state.status='lost';state.wanted=null;emit('lost');}}
  function hazards(){
   for(const e of state.enemies)if(e.alive&&hot(e.r,e.c)){e.alive=false;state.score+=100;emit('enemy',{id:e.id});}
   if(hot(state.player.r,state.player.c)||state.enemies.some(e=>e.alive&&e.r===state.player.r&&e.c===state.player.c))die();
  }
  function collect(){const k=key(state.player.r,state.player.c),item=state.items[k];if(!item)return;state[item]=Math.min(item==='capacity'?3:4,state[item]+1);delete state.items[k];emit('item',{item});}
  function finishStage(){const exit=arena(state.stage).exit;if(state.status==='playing'&&!state.enemies.some(e=>e.alive)&&state.player.r===exit.r&&state.player.c===exit.c){state.score+=250;state.status=state.stage===MAPS.length-1?'won':'cleared';state.wanted=null;emit(state.status);}}
  function steer(dir){if(state.status!=='playing'||dir!==null&&!ORDER.includes(dir))return false;state.wanted=dir;if(dir&&state.player.cooldown===0){const moved=moveActor(state.player,dir,MOVE);if(moved){hazards();if(state.status==='playing'){collect();finishStage();}}return moved;}return false;}
  function place(){if(state.status!=='playing'||state.bombs.length>=state.capacity||bombAt(state.player.r,state.player.c))return false;state.bombs.push({id:state.nextBomb++,r:state.player.r,c:state.player.c,fuse:FUSE,range:state.range});emit('place');return true;}
  function detonate(initial){
   // All rays see this obstacle snapshot; crate destruction cannot open another ray in the same event.
   const grid=state.grid.map(r=>r.slice()),queue=initial.slice(),seen=new Set(),blast=new Set(),broken=new Set();
   const bombs=new Map(state.bombs.map(b=>[key(b.r,b.c),b]));
   while(queue.length){const b=queue.shift();if(seen.has(b.id))continue;seen.add(b.id);blast.add(key(b.r,b.c));
    for(const [dr,dc]of Object.values(DIRS))for(let n=1;n<=b.range;n++){
     const r=b.r+dr*n,c=b.c+dc*n;if(!inside(r,c)||grid[r][c]===1)break;const k=key(r,c);blast.add(k);
     if(grid[r][c]===2){broken.add(k);break;}const next=bombs.get(k);if(next){if(!seen.has(next.id))queue.push(next);break;}
    }
   }
   const existing=new Set(Object.keys(state.items).map(Number));for(const k of blast)if(existing.has(k))delete state.items[k];
   for(const k of broken){state.grid[Math.floor(k/SIZE)][k%SIZE]=0;state.score+=10;const item=arena(state.stage).boxes[k];if(item)state.items[k]=item;}
   state.bombs=state.bombs.filter(b=>!seen.has(b.id));
   const flames=new Map(state.flames.map(f=>[key(f.r,f.c),f]));for(const k of blast)flames.set(k,{r:Math.floor(k/SIZE),c:k%SIZE,ttl:FLAME});state.flames=[...flames.values()];emit('blast',{bombs:seen.size,crates:broken.size});
  }
  function pursuit(e){
   const queue=[[e.r,e.c,null]],seen=new Set([key(e.r,e.c)]),target=state.player;
   for(let i=0;i<queue.length;i++){const[r,c,first]=queue[i];if(r===target.r&&c===target.c)return first;for(const dir of ORDER){const[dr,dc]=DIRS[dir],nr=r+dr,nc=c+dc,k=key(nr,nc);if(!seen.has(k)&&open(nr,nc)&&!hot(nr,nc)){seen.add(k);queue.push([nr,nc,first||dir]);}}}return null;
  }
  function enemyMove(e){
   const possible=ORDER.filter(dir=>{const[dr,dc]=DIRS[dir];return open(e.r+dr,e.c+dc)&&!hot(e.r+dr,e.c+dc);});
   if(!possible.length){e.cooldown=4;return;}
   const dir=e.kind==='hunter'?pursuit(e):null;
   const selected=dir||(possible.includes(e.heading)&&rand()<.8?e.heading:possible[Math.floor(rand()*possible.length)]);
   moveActor(e,selected,e.kind==='hunter'?12:14);
  }
  function tick(){
   state.ticks++;state.flames=state.flames.filter(f=>--f.ttl>0);for(const b of state.bombs)b.fuse--;const triggered=state.bombs.filter(b=>b.fuse<=0||hot(b.r,b.c));if(triggered.length)detonate(triggered);
   hazards();if(state.status!=='playing')return;
   const p=state.player,before={r:p.r,c:p.c};if(p.cooldown>0)p.cooldown--;
   if(p.cooldown===0&&state.wanted){if(!moveActor(p,state.wanted,MOVE)&&state.wanted!==p.heading)moveActor(p,p.heading,MOVE);hazards();if(state.status==='playing')collect();}
   if(state.status!=='playing')return;
   for(const e of state.enemies){if(!e.alive)continue;if(e.cooldown>0)e.cooldown--;if(e.cooldown===0){const old={r:e.r,c:e.c};enemyMove(e);if(e.r===before.r&&e.c===before.c&&old.r===p.r&&old.c===p.c)die();}hazards();if(state.status!=='playing')break;}
   finishStage();
  }
  function advance(ms){if(state.status!=='playing'||!Number.isFinite(ms)||ms<0||ms>60000)return[];state.remainder+=ms;while(state.remainder+1e-7>=STEP&&state.status==='playing'){state.remainder=Math.max(0,state.remainder-STEP);tick();}if(state.status!=='playing')state.remainder=0;return drain();}
  function drain(){const out=events;events=[];return out;}
  function next(){if(state.status!=='cleared')return null;return create({seed:state.seed,stage:state.stage+1,bank:state.score,capacity:state.capacity,range:state.range});}
  function retry(){return create({seed:state.startSeed,stage:state.stage,bank:state.bank,capacity:state.startCapacity,range:state.startRange});}
  function view(){return{...clone(state),exit:arena(state.stage).exit,remaining:state.enemies.filter(e=>e.alive).length};}
  return{steer,place,advance,drain,view,serialize:()=>clone(state),next,retry};
 }
 return{SIZE,STEP,FUSE,FLAME,MOVE,DIRS,MAPS:clone(MAPS),arena,validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});

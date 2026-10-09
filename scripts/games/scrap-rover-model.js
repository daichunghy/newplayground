/* Original Xe Săn Bụi grid-tank skirmish; no Battle City maps/items or copied units. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_ScrapRoverModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const ROWS=9,COLS=9,MAX_TURNS=36,CORE_INTEGRITY=3,CORE={r:4,c:4};
 const DIRS=[{name:'up',dr:-1,dc:0,label:'Lên'},{name:'right',dr:0,dc:1,label:'Phải'},{name:'down',dr:1,dc:0,label:'Xuống'},{name:'left',dr:0,dc:-1,label:'Trái'}];
 const STAGES=[
  {name:'Mỏ Cạn',map:['#########','#.......#','#.#.#.#.#','#.......#','#..#.#..#','#.......#','#.#.#.#.#','#.......#','#########'],spawns:[[1,1],[7,1],[1,3],[7,3]]},
  {name:'Bãi Gió',map:['#########','#...#...#','#.#...#.#','#.......#','###.#.###','#.......#','#.#...#.#','#.......#','#########'],spawns:[[1,1],[7,1],[1,7],[7,7],[1,3]]},
  {name:'Lò Đá',map:['#########','#.......#','#.#.#.#.#','#.......#','#.#...#.#','#.......#','#.#.#.#.#','#.......#','#########'],spawns:[[1,1],[7,1],[1,7],[7,7],[3,1],[5,7]]}
 ];
 const clone=x=>JSON.parse(JSON.stringify(x)),safe=n=>Number.isSafeInteger(n)&&n>=0;
 const inside=(r,c)=>Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<ROWS&&c>=0&&c<COLS;
 const adjacent=(a,b)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;
 function create({saved=null,stage=0,score=0,bankScore=score,seed=0x53b057}={}){
  if(saved&&!validSave(saved))return null;
  if(!saved&&(!Number.isInteger(stage)||stage<0||stage>=STAGES.length||!safe(score)||!safe(bankScore)||bankScore>score||!Number.isInteger(seed)||seed<=0||seed>0xffffffff))throw new RangeError('Invalid Xe Săn Bụi start');
  let s=saved?clone(saved):{version:1,stage,score,bankScore,seed,player:{r:7,c:5,dir:0},core:CORE_INTEGRITY,breaches:0,moves:0,shots:0,kills:0,status:'playing',enemies:STAGES[stage].spawns.map((p,id)=>({id,r:p[0],c:p[1],spawn:{r:p[0],c:p[1]}}))};
  const events=[];const emit=(kind,extra={})=>events.push({kind,...extra});
  const blocked=(r,c)=>!inside(r,c)||STAGES[s.stage].map[r][c]==='#'||r===CORE.r&&c===CORE.c;
  function occupied(r,c,except=-1){return s.enemies.some(e=>e.id!==except&&e.r===r&&e.c===c);}
  function adjacentGoal(r,c){return adjacent({r,c},CORE);}
  function firstPathStep(start,target,except){
   const queue=[{r:start.r,c:start.c,first:null}],seen=new Set([`${start.r},${start.c}`]);
   for(let i=0;i<queue.length;i++){const cur=queue[i];if(adjacentGoal(cur.r,cur.c))return cur.first;
    for(let d=0;d<DIRS.length;d++){const dir=DIRS[d],r=cur.r+dir.dr,c=cur.c+dir.dc,key=`${r},${c}`;if(blocked(r,c)||seen.has(key)||(r===s.player.r&&c===s.player.c)||occupied(r,c,except))continue;seen.add(key);queue.push({r,c,first:cur.first===null?d:cur.first});}
   }
   return null;
  }
  function finishIfNeeded(){if(s.core<=0||s.moves>=MAX_TURNS&&s.enemies.length>0){s.status='lost';emit('lost',{core:s.core,moves:s.moves});return true;}if(s.enemies.length===0){s.status=s.stage===STAGES.length-1?'won':'cleared';emit(s.status,{stage:s.stage,score:s.score});return true;}if(s.moves>=MAX_TURNS){s.status='lost';emit('lost',{core:s.core,moves:s.moves});return true;}return false;}
  function enemyTurn(){for(const enemy of [...s.enemies].sort((a,b)=>a.id-b.id)){
    if(!s.enemies.some(e=>e.id===enemy.id))continue;
    if(adjacentGoal(enemy.r,enemy.c)){
      s.core--;s.breaches++;s.enemies=s.enemies.filter(e=>e.id!==enemy.id);emit('breach',{core:s.core});if(finishIfNeeded())return;continue;
    }
    const d=firstPathStep(enemy,s.player,enemy.id);if(d!==null){enemy.r+=DIRS[d].dr;enemy.c+=DIRS[d].dc;emit('drone',{id:enemy.id});}
   }
   finishIfNeeded();
  }
  function act(kind,value){
   if(s.status!=='playing')return false;
   if(kind==='move'&&Number.isInteger(value)&&value>=0&&value<DIRS.length){const d=DIRS[value],before={r:s.player.r,c:s.player.c};s.player.dir=value;const r=s.player.r+d.dr,c=s.player.c+d.dc;if(!blocked(r,c)&&!occupied(r,c)){s.player.r=r;s.player.c=c;}s.moves++;emit('move',{r:s.player.r,c:s.player.c,dir:value,moved:s.player.r!==before.r||s.player.c!==before.c});if(!finishIfNeeded())enemyTurn();return true;}
   if(kind==='fire'){
    s.shots++;s.moves++;const d=DIRS[s.player.dir];let r=s.player.r+d.dr,c=s.player.c+d.dc,target=null;
    while(!blocked(r,c)){target=s.enemies.find(e=>e.r===r&&e.c===c)||null;if(target)break;r+=d.dr;c+=d.dc;}
    if(target){s.enemies=s.enemies.filter(e=>e.id!==target.id);s.kills++;s.score+=100;emit('kill',{id:target.id,score:s.score});}else emit('miss');
    if(!finishIfNeeded())enemyTurn();return true;
   }
   return false;
  }
  function drain(){return events.splice(0);}
  function next(){return s.status==='cleared'?create({stage:s.stage+1,score:s.score,bankScore:s.score,seed:s.seed}):null;}
  function retry(){return s.status==='lost'?create({stage:s.stage,score:s.bankScore,bankScore:s.bankScore,seed:s.seed}):null;}
  function view(){return{...clone(s),map:STAGES[s.stage].map.slice(),coreCell:clone(CORE),stageInfo:{name:STAGES[s.stage].name,enemyCount:STAGES[s.stage].spawns.length},stages:STAGES.length,rows:ROWS,cols:COLS,maxTurns:MAX_TURNS,maxCore:CORE_INTEGRITY,directions:clone(DIRS)};}
  return{act,drain,view,serialize:()=>clone(s),next,retry};
 }
 function validSave(s){
  if(!s||s.version!==1||!safe(s.stage)||s.stage>=STAGES.length||!safe(s.score)||!safe(s.bankScore)||s.score<s.bankScore||!Number.isInteger(s.seed)||s.seed<=0||s.seed>0xffffffff||!safe(s.core)||s.core>CORE_INTEGRITY||!safe(s.breaches)||s.breaches>STAGES[s.stage].spawns.length||!safe(s.moves)||s.moves>MAX_TURNS||!safe(s.shots)||s.shots>s.moves||!safe(s.kills)||!['playing','cleared','won','lost'].includes(s.status)||!s.player||!inside(s.player.r,s.player.c)||!Number.isInteger(s.player.dir)||s.player.dir<0||s.player.dir>=DIRS.length||blockedAt(s.stage,s.player.r,s.player.c)||!Array.isArray(s.enemies))return false;
  const ids=new Set();for(const e of s.enemies){if(!e||!safe(e.id)||e.id>=STAGES[s.stage].spawns.length||ids.has(e.id)||!inside(e.r,e.c)||!e.spawn||!inside(e.spawn.r,e.spawn.c)||e.r===s.player.r&&e.c===s.player.c||e.r===CORE.r&&e.c===CORE.c||STAGES[s.stage].map[e.r][e.c]==='#')return false;const sp=STAGES[s.stage].spawns[e.id];if(e.spawn.r!==sp[0]||e.spawn.c!==sp[1])return false;ids.add(e.id);}
  if(new Set(s.enemies.map(e=>`${e.r},${e.c}`)).size!==s.enemies.length||s.kills+s.breaches+s.enemies.length!==STAGES[s.stage].spawns.length)return false;
  if(s.status==='playing'&&(s.core===0||s.moves>=MAX_TURNS||s.enemies.length===0)||s.status==='lost'&&s.core>0&&s.moves<MAX_TURNS||['cleared','won'].includes(s.status)&&(s.core===0||s.enemies.length!==0)||s.status==='cleared'&&s.stage===STAGES.length-1||s.status==='won'&&s.stage!==STAGES.length-1)return false;
  return true;
 }
 function blockedAt(stage,r,c){return !inside(r,c)||STAGES[stage].map[r][c]==='#'||r===CORE.r&&c===CORE.c;}
 return{ROWS,COLS,MAX_TURNS,CORE_INTEGRITY,CORE:clone(CORE),DIRS:clone(DIRS),STAGES:clone(STAGES),validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});

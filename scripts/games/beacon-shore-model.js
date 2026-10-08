/* Original Bờ Kè Sao lane-defense rules; deterministic fixed-step simulation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_BeaconShoreModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const STEP=20,ROWS=5,COLS=7,MAX_ENERGY=180,ENERGY_INTERVAL=120,ENERGY_GAIN=14;
 const DEVICES={lamp:{name:'Đèn dẫn',icon:'✦',cost:45,cooldown:55,damage:1,range:7},fan:{name:'Quạt gió',icon:'≋',cost:55,cooldown:125,slow:100,range:7},bell:{name:'Chuông vang',icon:'◉',cost:70,cooldown:155,damage:2,range:1.25}};
 const ENEMIES={mist:{name:'Mù sương',icon:'●',hp:3,speed:.0065,reward:12},gust:{name:'Gió lùa',icon:'◆',hp:2,speed:.011,reward:15},cloud:{name:'Mây dày',icon:'⬟',hp:7,speed:.004,reward:24}};
 // Times are simulation ticks (20 ms); every spawn lane is fixed for clear replay.
 const WAVES=[
  [[1,1,'mist'],[115,3,'mist'],[230,0,'mist'],[345,4,'mist'],[460,2,'gust']],
  [[1,1,'mist'],[90,4,'gust'],[180,2,'mist'],[270,0,'gust'],[360,3,'cloud'],[450,1,'mist']],
  [[1,2,'gust'],[80,4,'mist'],[160,3,'cloud'],[240,1,'mist'],[320,0,'gust'],[400,4,'cloud'],[480,2,'mist']],
  [[1,0,'cloud'],[70,2,'gust'],[140,4,'mist'],[210,1,'cloud'],[280,3,'gust'],[350,0,'mist'],[420,2,'cloud'],[490,4,'gust'],[560,1,'mist']]
 ];
 const clone=x=>JSON.parse(JSON.stringify(x)),finite=Number.isFinite,safe=n=>Number.isSafeInteger(n)&&n>=0,deviceKeys=Object.keys(DEVICES),enemyKeys=Object.keys(ENEMIES);
 function create({saved=null}={}){if(saved&&!validSave(saved))return null;let s=saved?clone(saved):{version:1,tick:0,remainder:0,waveIndex:0,waveTick:0,spawnIndex:0,energy:100,energyTick:0,lives:3,score:0,selectedType:'lamp',status:'playing',nextId:1,nextShotId:1,towers:[],enemies:[],shots:[]};let events=[];const emit=(kind,extra={})=>events.push({kind,...extra});
  function place(value){const row=typeof value==='number'?Math.floor(value/COLS):value?.row,col=typeof value==='number'?value%COLS:value?.col;if(!Number.isInteger(row)||row<0||row>=ROWS||!Number.isInteger(col)||col<0||col>=COLS)return false;const type=s.selectedType,d=DEVICES[type];if(s.towers.some(t=>t.row===row&&t.col===col)){emit('blocked',{reason:'occupied',row,col});return false;}if(s.energy<d.cost){emit('blocked',{reason:'energy',row,col});return false;}s.energy-=d.cost;s.towers.push({row,col,type,cooldown:0});emit('placed',{row,col,type,energy:s.energy});return true;}
  function act(action,value){if(s.status!=='playing')return false;if(action==='select'){if(!deviceKeys.includes(value))return false;s.selectedType=value;emit('selected',{type:value});return true;}if(action==='place')return place(value);return false;}
  function spawn(){while(s.spawnIndex<WAVES[s.waveIndex].length&&WAVES[s.waveIndex][s.spawnIndex][0]<=s.waveTick){const[,row,type]=WAVES[s.waveIndex][s.spawnIndex++],e=ENEMIES[type];s.enemies.push({id:s.nextId++,row,x:7.2,type,hp:e.hp,maxHp:e.hp,speed:e.speed,slowTicks:0});emit('spawn',{row,type});}}
  function damage(enemy,amount){if(!enemy||amount<=0)return;enemy.hp-=amount;if(enemy.hp<=0){s.score+=ENEMIES[enemy.type].reward;emit('pop',{enemyId:enemy.id,row:enemy.row,score:s.score});}}
  function tick(){if(s.status!=='playing')return;s.tick++;s.waveTick++;s.energyTick++;if(s.energyTick>=ENERGY_INTERVAL){s.energyTick=0;s.energy=Math.min(MAX_ENERGY,s.energy+ENERGY_GAIN);emit('energy',{energy:s.energy});}spawn();
   for(const e of s.enemies){if(e.slowTicks>0)e.slowTicks--;e.x-=e.speed*(e.slowTicks>0?.35:1);}
   const breached=s.enemies.filter(e=>e.x<=-.45);if(breached.length){s.enemies=s.enemies.filter(e=>e.x>-.45);s.lives=Math.max(0,s.lives-breached.length);emit('breach',{count:breached.length,lives:s.lives});if(s.lives===0){s.status='lost';emit('lost');return;}}
   for(const t of s.towers){if(t.cooldown>0)t.cooldown--;if(t.cooldown>0)continue;const d=DEVICES[t.type],targets=s.enemies.filter(e=>e.row===t.row&&e.x<t.col+.1&&t.col-e.x<=d.range).sort((a,b)=>b.x-a.x);if(!targets.length)continue;const target=targets[0];t.cooldown=d.cooldown;if(t.type==='lamp'){s.shots.push({id:s.nextShotId++,row:t.row,x:t.col-.1,targetId:target.id,damage:d.damage});emit('fire',{row:t.row,type:t.type});}else if(t.type==='fan'){target.slowTicks=Math.max(target.slowTicks, d.slow);emit('slow',{row:t.row,enemyId:target.id});}else{for(const e of s.enemies)if(e.row===t.row&&Math.abs(e.x-target.x)<=d.range)damage(e,d.damage);emit('ring',{row:t.row,type:t.type});}}
   const active=[];for(const b of s.shots){const target=s.enemies.find(e=>e.id===b.targetId);if(!target)continue;b.x-=.105;if(b.x<=target.x){damage(target,b.damage);emit('hit',{row:b.row,enemyId:target.id});}else active.push(b);}s.shots=active;s.enemies=s.enemies.filter(e=>e.hp>0);
   if(s.spawnIndex===WAVES[s.waveIndex].length&&s.enemies.length===0&&s.shots.length===0){const cleared=s.waveIndex;s.waveIndex++;if(s.waveIndex>=WAVES.length){s.status='won';emit('won',{score:s.score});}else{s.waveTick=0;s.spawnIndex=0;emit('wave',{wave:s.waveIndex,cleared});}}
  }
  function drain(){const out=events;events=[];return out;}
  function advance(ms){if(s.status!=='playing'||!finite(ms)||ms<0||ms>60000)return[];s.remainder+=ms;while(s.remainder+1e-7>=STEP&&s.status==='playing'){s.remainder=Math.max(0,s.remainder-STEP);if(s.remainder<1e-7)s.remainder=0;tick();}return drain();}
  function view(){return{...clone(s),devices:clone(DEVICES),enemies:clone(s.enemies),towers:clone(s.towers),shots:clone(s.shots),waves:WAVES.length,waveEvents:clone(WAVES[s.waveIndex]||[])};}
  return{act,advance,drain,view,serialize:()=>clone(s)};
 }
 function validSave(s){if(!s||s.version!==1||!['playing','won','lost'].includes(s.status))return false;for(const k of ['tick','waveIndex','waveTick','spawnIndex','energy','energyTick','lives','score','nextId','nextShotId'])if(!safe(s[k]))return false;if(s.waveIndex>WAVES.length||s.energy>MAX_ENERGY||s.energyTick>=ENERGY_INTERVAL||s.lives>3||s.score>1e9||s.nextId<1||s.nextShotId<1||!deviceKeys.includes(s.selectedType)||!finite(s.remainder)||s.remainder<0||s.remainder>=STEP||!Array.isArray(s.towers)||s.towers.length>ROWS*COLS||!Array.isArray(s.enemies)||s.enemies.length>32||!Array.isArray(s.shots)||s.shots.length>64)return false;
  if(s.status==='playing'&&s.waveIndex>=WAVES.length||s.status==='won'&&(s.waveIndex!==WAVES.length||s.enemies.length||s.shots.length)||s.status==='lost'&&s.lives!==0||s.status==='playing'&&s.lives===0)return false;
  if(s.waveIndex<WAVES.length){const schedule=WAVES[s.waveIndex];if(s.spawnIndex>schedule.length||schedule.slice(0,s.spawnIndex).some(e=>e[0]>s.waveTick)||schedule.slice(s.spawnIndex).some(e=>e[0]<=s.waveTick))return false;}
  const cells=new Set(),ids=new Set();for(const t of s.towers){if(!t||!Number.isInteger(t.row)||t.row<0||t.row>=ROWS||!Number.isInteger(t.col)||t.col<0||t.col>=COLS||!deviceKeys.includes(t.type)||!safe(t.cooldown)||t.cooldown>DEVICES[t.type].cooldown)return false;const key=t.row*COLS+t.col;if(cells.has(key))return false;cells.add(key);}
  for(const e of s.enemies){if(!e||!safe(e.id)||e.id<1||e.id>=s.nextId||ids.has(e.id)||!Number.isInteger(e.row)||e.row<0||e.row>=ROWS||!enemyKeys.includes(e.type)||!finite(e.x)||e.x<-.46||e.x>7.2||!Number.isInteger(e.hp)||e.hp<1||e.hp>ENEMIES[e.type].hp||e.maxHp!==ENEMIES[e.type].hp||e.speed!==ENEMIES[e.type].speed||!safe(e.slowTicks)||e.slowTicks>DEVICES.fan.slow)return false;ids.add(e.id);}
  const shotIds=new Set();for(const b of s.shots){if(!b||!safe(b.id)||b.id<1||b.id>=s.nextShotId||shotIds.has(b.id)||!Number.isInteger(b.row)||b.row<0||b.row>=ROWS||!finite(b.x)||b.x<-.5||b.x>=COLS||!ids.has(b.targetId)||b.damage!==DEVICES.lamp.damage)return false;shotIds.add(b.id);}
  return true;
 }
 return{STEP,ROWS,COLS,MAX_ENERGY,ENERGY_INTERVAL,ENERGY_GAIN,DEVICES:clone(DEVICES),ENEMIES:clone(ENEMIES),WAVES:clone(WAVES),validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});

/* Original aquarium care-and-defense loop; no Insaniquarium characters or art. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_SeaGardenModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const WIDTH=600,HEIGHT=360,ROUND_MS=60000,TICK_MS=20,GOAL=8,MAX_FOOD=4,START_FISH=3;
 const ZONES=Object.freeze([
  Object.freeze({name:'Rạn Nông',pearlGoal:2,fishSpeed:1,alienHp:3,alienInterval:12000}),
  Object.freeze({name:'Rạn Sâu',pearlGoal:3,fishSpeed:1.08,alienHp:4,alienInterval:9500}),
  Object.freeze({name:'Vịnh Ngọc',pearlGoal:3,fishSpeed:1.16,alienHp:5,alienInterval:7500})
 ]);
 const FISH_COLORS=['#f4a55c','#62c6bb','#f4d875'];
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
 const clone=x=>JSON.parse(JSON.stringify(x));
 function create({seed=0x5ea6a123}={}){
  if(!Number.isInteger(seed)||seed<=0||seed>0xffffffff)throw new RangeError('Invalid aquarium seed');
  const state={version:1,seed,rngState:seed,elapsedMs:0,zoneIndex:0,zonePearls:0,pearls:0,status:'playing',shots:0,fishEaten:0,nextId:10,nextAlienMs:9000,fish:[
   {id:1,x:115,y:105,dir:1,hp:2,fed:0,size:.88,color:FISH_COLORS[0]},
   {id:2,x:300,y:225,dir:-1,hp:2,fed:0,size:.9,color:FISH_COLORS[1]},
   {id:3,x:485,y:145,dir:1,hp:2,fed:0,size:.86,color:FISH_COLORS[2]}
  ],food:[],bubbles:[],aliens:[]};
  let remainder=0;const events=[];const emit=(kind,extra={})=>events.push({kind,...extra});
  function random(){state.rngState=(Math.imul(state.rngState,1664525)+1013904223)>>>0;return state.rngState/0x100000000;}
  function playing(){return state.status==='playing';}
  function setResult(status){if(!playing())return;state.status=status;emit(status,{pearls:state.pearls,fish:state.fish.length});}
  function dropFood(x,y){if(!playing()||state.food.length>=MAX_FOOD||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>WIDTH||y<0||y>HEIGHT)return false;const item={id:state.nextId++,x,y:clamp(y,18,HEIGHT-80),ageMs:0};state.food.push(item);emit('food-dropped',{id:item.id,x:item.x,y:item.y});return true;}
  function hitAlienAt(x,y){let target=null,best=62;for(const alien of state.aliens){const distance=Math.hypot(x-alien.x,y-alien.y);if(distance<best){best=distance;target=alien;}}if(!target)return false;target.hp--;target.flashMs=120;state.shots++;emit('zap',{id:target.id,hp:target.hp});if(target.hp<=0){state.aliens=state.aliens.filter(item=>item!==target);emit('alien-cleared',{id:target.id});}return true;}
  function actionAt(x,y){if(!playing()||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>WIDTH||y<0||y>HEIGHT)return false;if(hitAlienAt(x,y))return true;return dropFood(x,y);}
  function zapNearest(){if(!playing()||!state.aliens.length)return false;const target=state.aliens.reduce((best,item)=>Math.hypot(item.x-WIDTH/2,item.y-HEIGHT/2)<Math.hypot(best.x-WIDTH/2,best.y-HEIGHT/2)?item:best);return hitAlienAt(target.x,target.y);}
 function spawnAlien(){const zone=ZONES[state.zoneIndex],fromLeft=random()<.5,target=state.fish[Math.floor(random()*state.fish.length)],alien={id:state.nextId++,x:fromLeft?-18:WIDTH+18,y:40+random()*230,dir:fromLeft?1:-1,hp:zone.alienHp,targetId:target?.id??null,flashMs:0};state.aliens.push(alien);state.nextAlienMs=state.elapsedMs+zone.alienInterval;emit('alien-arrived',{id:alien.id,zone:state.zoneIndex});}
  function eatFood(fish,food){state.food=state.food.filter(item=>item!==food);fish.fed++;fish.size=Math.min(1.35,fish.size+.025);emit('fed',{fishId:fish.id,fed:fish.fed});if(fish.fed%2===0&&state.zonePearls+state.bubbles.length<ZONES[state.zoneIndex].pearlGoal){const pearl={id:state.nextId++,x:fish.x,y:fish.y,ageMs:0};state.bubbles.push(pearl);emit('pearl-made',{fishId:fish.id,id:pearl.id});}}
  function step(){if(!playing())return;state.elapsedMs+=TICK_MS;
   for(const food of state.food){food.ageMs+=TICK_MS;food.y+=.018*TICK_MS;}
   state.food=state.food.filter(food=>food.y<HEIGHT-18&&food.ageMs<9000);
   for(const fish of state.fish){
    const target=state.food.reduce((best,food)=>{const d=Math.hypot(food.x-fish.x,food.y-fish.y);return d<150&&(!best||d<best.distance)?{food,distance:d}:best;},null);
    const speed=ZONES[state.zoneIndex].fishSpeed;
    if(target){const food=target.food,dx=food.x-fish.x,dy=food.y-fish.y,stepX=Math.min(Math.abs(dx),.045*TICK_MS*speed);fish.dir=Math.sign(dx)||fish.dir;fish.x+=fish.dir*stepX;fish.y+=clamp(dy,-.032*TICK_MS*speed,.032*TICK_MS*speed);if(Math.hypot(food.x-fish.x,food.y-fish.y)<19)eatFood(fish,food);}
    else{fish.x+=fish.dir*.018*TICK_MS*speed;if(fish.x<35||fish.x>WIDTH-35){fish.x=clamp(fish.x,35,WIDTH-35);fish.dir*=-1;}fish.y+=Math.sin((state.elapsedMs/540)+(fish.id*1.7))*.012*TICK_MS*speed;fish.y=clamp(fish.y,40,HEIGHT-52);}
   }
   for(const bubble of state.bubbles){bubble.ageMs+=TICK_MS;bubble.y-=.032*TICK_MS;}
   for(const bubble of [...state.bubbles])if(bubble.y<18||bubble.ageMs>=1600){state.bubbles=state.bubbles.filter(item=>item!==bubble);state.pearls++;state.zonePearls++;emit('pearl-collected',{id:bubble.id,total:state.pearls,zone:state.zoneIndex,zonePearls:state.zonePearls,zoneGoal:ZONES[state.zoneIndex].pearlGoal});if(state.zonePearls>=ZONES[state.zoneIndex].pearlGoal){if(state.zoneIndex===ZONES.length-1){setResult('won');return;}state.zoneIndex++;state.zonePearls=0;state.nextAlienMs=Math.min(state.nextAlienMs,state.elapsedMs+ZONES[state.zoneIndex].alienInterval);emit('zone-change',{zone:state.zoneIndex,name:ZONES[state.zoneIndex].name});}}
   if(!state.aliens.length&&state.fish.length&&state.elapsedMs>=state.nextAlienMs)spawnAlien();
   for(const alien of [...state.aliens]){
    alien.flashMs=Math.max(0,alien.flashMs-TICK_MS);let target=state.fish.find(fish=>fish.id===alien.targetId);if(!target&&state.fish.length){target=state.fish[0];alien.targetId=target.id;}
    if(!target)continue;const dx=target.x-alien.x,dy=target.y-alien.y,speed=1+state.zoneIndex*.1;alien.x+=Math.sign(dx)*Math.min(Math.abs(dx),.048*TICK_MS*speed);alien.y+=clamp(dy,-.026*TICK_MS*speed,.026*TICK_MS*speed);
    if(Math.hypot(target.x-alien.x,target.y-alien.y)<24){target.hp--;state.aliens=state.aliens.filter(item=>item!==alien);emit('fish-bitten',{fishId:target.id,hp:target.hp});if(target.hp<=0){state.fish=state.fish.filter(fish=>fish!==target);state.fishEaten++;emit('fish-lost',{fishId:target.id,left:state.fish.length});}state.nextAlienMs=state.elapsedMs+10000;}
   }
   if(!state.fish.length){setResult('lost');return;}
   if(state.elapsedMs>=ROUND_MS)setResult('lost');
  }
  function advance(ms){if(!playing()||!Number.isFinite(ms)||ms<0||ms>30000)return[];remainder+=ms;while(remainder>=TICK_MS&&playing()){remainder-=TICK_MS;step();}return events.splice(0);}
  function view(){return{...clone(state),zoneNumber:state.zoneIndex+1,zone:ZONES[state.zoneIndex],zoneCount:ZONES.length,remainingMs:Math.max(0,ROUND_MS-state.elapsedMs),foodCount:state.food.length,alien:state.aliens[0]?clone(state.aliens[0]):null};}
  return{dropFood,actionAt,zapNearest,advance,view,serialize:()=>clone(state)};
 }
 return{WIDTH,HEIGHT,ROUND_MS,TICK_MS,GOAL,MAX_FOOD,START_FISH,ZONES,create};
});

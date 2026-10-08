/* Original fruit-sweep rules. This model advances on a fixed 60 Hz tick. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_FruitSweepModel=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const W=640,H=420,STEP=1/60;
 const COURSES=Object.freeze([
  Object.freeze({name:'Mầm Non',spawnEvery:1.3,spawnJitter:.5,groupSize:2,extraGroupChance:.25,bombChance:.08,drift:96,crosswind:0,sway:0,lift:520,liftRange:140}),
  Object.freeze({name:'Gió Ngang',spawnEvery:1.15,spawnJitter:.35,groupSize:3,extraGroupChance:0,bombChance:.14,drift:112,crosswind:24,sway:38,lift:540,liftRange:150}),
  Object.freeze({name:'Mưa Quả',spawnEvery:.95,spawnJitter:.3,groupSize:3,extraGroupChance:.4,bombChance:.18,drift:130,crosswind:42,sway:66,lift:565,liftRange:165})
 ]);
 function courseAt(time,roundSeconds){return Math.min(COURSES.length-1,Math.floor(time/(roundSeconds/COURSES.length)));}
 function create({seed=0x51ce,roundSeconds=60}={}){
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Invalid seed');
  if(!Number.isSafeInteger(roundSeconds)||roundSeconds<10||roundSeconds>180)throw new RangeError('Invalid round duration');
  let rng=(seed>>>0)||1,status='ready',time=0,score=0,misses=0,objects=[],nextId=1,spawnAt=.35,tick=0,combo=0,stageIndex=0;
  const rand=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};
  function reset(){rng=(seed>>>0)||1;status='ready';time=0;score=0;misses=0;objects=[];nextId=1;spawnAt=.35;tick=0;combo=0;stageIndex=0;}
  function launch(){if(status!=='ready')return false;status='playing';return true;}
  function advance(dt=STEP){if(!Number.isFinite(dt)||Math.abs(dt-STEP)>1e-10)throw new RangeError('Fruit sweep uses fixed 60 Hz steps');if(status!=='playing')return view();tick++;time=Math.min(roundSeconds,tick*STEP);stageIndex=courseAt(time,roundSeconds);const course=COURSES[stageIndex];
   if(time+1e-10>=spawnAt){const count=course.groupSize+(rand()<course.extraGroupChance?1:0),center=85+rand()*470;for(let i=0;i<count;i++){const bomb=i>0&&rand()<course.bombChance,side=i%2?1:-1;objects.push({id:nextId++,kind:bomb?'bomb':'fruit',fruit:Math.floor(rand()*5),x:center+(i-(count-1)/2)*48,y:H+18,vx:(rand()-.5)*course.drift+side*course.crosswind,vy:-course.lift-rand()*course.liftRange,r:17+rand()*4,age:0,sway:course.sway});}spawnAt+=course.spawnEvery+rand()*course.spawnJitter;}
   for(const o of objects){o.age+=STEP;o.x+=(o.vx+Math.sin(o.age*3+o.id)*o.sway*.45)*STEP;o.y+=o.vy*STEP;o.vy+=828*STEP;}const kept=[];for(const o of objects){if(o.y>H+35){if(o.kind==='fruit')misses++;}else kept.push(o);}objects=kept;if(misses>=3)status='lost';if(time>=roundSeconds&&status==='playing')status='won';return view();}
  function pointSegDist(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l)):0;return Math.hypot(px-x1-t*dx,py-y1-t*dy);}
  function slice(x1,y1,x2,y2){if(status!=='playing'||![x1,y1,x2,y2].every(Number.isFinite))return{hit:0,score,misses,status};let hit=0;objects=objects.filter(o=>{if(pointSegDist(o.x,o.y,x1,y1,x2,y2)>o.r+8)return true;hit++;if(o.kind==='bomb'){status='lost';combo=0;}else if(status==='playing'){combo++;score+=10+Math.min(20,(combo-1)*2);}return false;});if(!hit)combo=0;return{hit,score,misses,status};}
  function restart(nextSeed){if(nextSeed!==undefined){if(!Number.isSafeInteger(nextSeed)||nextSeed<0||nextSeed>0xffffffff)throw new RangeError('Invalid seed');seed=nextSeed>>>0;}reset();return view();}
  function view(){return{width:W,height:H,status,timeLeft:Math.max(0,roundSeconds-time),roundSeconds,stageIndex,stageNumber:stageIndex+1,stage:COURSES[stageIndex],score,misses,lives:Math.max(0,3-misses),combo,objects:objects.map(o=>({...o}))};}
  reset();return Object.freeze({launch,advance,slice,restart,view});
 }
 return Object.freeze({W,H,STEP,COURSES,courseAt,create});
});

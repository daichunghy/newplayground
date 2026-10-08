const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/sea-garden-model.js');
function advanceDefending(g,ms,events=[],alienHp){for(let elapsed=0;elapsed<ms&&g.view().status==='playing';elapsed+=M.TICK_MS){for(const alien of g.view().aliens){alienHp?.add(alien.hp);if(alien.x<0||alien.x>M.WIDTH)continue;for(let hit=0;hit<alien.hp;hit++)g.actionAt(alien.x,alien.y);}events.push(...g.advance(M.TICK_MS));}return events;}
function feedOne(g,id=1,events=[]){const fish=g.view().fish.find(item=>item.id===id);assert.ok(fish);const before=fish.fed;assert.equal(g.dropFood(fish.x,fish.y),true);for(let i=0;i<100&&g.view().fish.find(item=>item.id===id)?.fed===before;i++)advanceDefending(g,M.TICK_MS,events);assert.equal(g.view().fish.find(item=>item.id===id)?.fed,before+1);}
function earnPearl(g,id=1,events=[]){feedOne(g,id,events);feedOne(g,id,events);advanceDefending(g,1800,events);}

test('Bể Sao starts as a compact original tank with a fixed goal and healthy fish',()=>{
 const a=M.create(),b=M.create(),v=a.view();assert.deepEqual(v,b.view());assert.equal(v.fish.length,M.START_FISH);assert.equal(v.pearls,0);assert.equal(v.status,'playing');assert.equal(v.remainingMs,M.ROUND_MS);assert.ok(v.fish.every(f=>f.hp===2));
});

test('food placement is bounded, limited to four pellets and rejects terminal input',()=>{
 const g=M.create();assert.equal(g.dropFood(-1,20),false);assert.equal(g.dropFood(10,400),false);for(let i=0;i<M.MAX_FOOD;i++)assert.equal(g.dropFood(20+i*12,40),true);assert.equal(g.dropFood(80,50),false);assert.equal(g.view().foodCount,M.MAX_FOOD);g.advance(9000);assert.ok(g.view().alien);
});

test('fish seek and eat food; every second meal makes a pearl that auto-collects',()=>{
 const g=M.create(),fish=g.view().fish[0];assert.equal(g.dropFood(fish.x+60,fish.y+40),true);for(let i=0;i<240&&g.view().fish[0].fed===0;i++)g.advance(M.TICK_MS);assert.equal(g.view().fish[0].fed,1);assert.equal(g.view().bubbles.length,0);feedOne(g);assert.equal(g.view().bubbles.length,1);g.advance(1600);assert.equal(g.view().pearls,1);assert.equal(g.view().bubbles.length,0);
});

test('touching an alien zaps it, three hits clear it, and the click does not drop food',()=>{
 const g=M.create();g.advance(9600);const v=g.view(),alien=v.alien;assert.ok(alien);assert.ok(alien.x>0&&alien.x<M.WIDTH);for(let i=0;i<3;i++)assert.equal(g.actionAt(alien.x,alien.y),true);assert.equal(g.view().aliens.length,0);assert.equal(g.view().foodCount,0);assert.equal(g.view().shots,3);
});

test('an ignored alien can bite a fish and reduce its health',()=>{
 const g=M.create({seed:0x12345678});g.advance(30000);const v=g.view();assert.ok(v.fish.some(f=>f.hp<2)||v.fish.length<M.START_FISH);assert.ok(v.fishEaten>=0);
});

test('pearl quotas gate authored reef progression and the complete set is winnable',()=>{
 assert.deepEqual(M.ZONES.map(zone=>zone.pearlGoal),[2,3,3]);assert.equal(M.ZONES.reduce((sum,zone)=>sum+zone.pearlGoal,0),M.GOAL);
 const idle=M.create();idle.advance(8000);assert.equal(idle.view().zoneIndex,0,'time alone cannot skip the first reef');assert.equal(idle.view().pearls,0);
 const g=M.create(),events=[];
 for(let pearl=0;pearl<M.GOAL;pearl++){
  earnPearl(g,1,events);
  if(pearl===1){assert.equal(g.view().zoneIndex,1);assert.equal(g.view().zonePearls,0);}
  if(pearl===4){assert.equal(g.view().zoneIndex,2);assert.equal(g.view().zonePearls,0);}
  if(pearl<M.GOAL-1)assert.equal(g.view().status,'playing');
 }
 assert.deepEqual(events.filter(event=>event.kind==='zone-change').map(event=>event.name),['Rạn Sâu','Vịnh Ngọc']);
 assert.equal(g.view().status,'won');assert.equal(g.view().pearls,M.GOAL);assert.equal(g.view().zonePearls,3);assert.equal(g.view().remainingMs>0,true);assert.equal(g.dropFood(20,20),false);
 const l=M.create({seed:0x12345678});l.advance(30000);l.advance(30000);assert.equal(l.view().status,'lost');assert.equal(l.zapNearest(),false);
});

test('fixed-step updates are deterministic across frame partitions and invalid deltas do nothing',()=>{
 const a=M.create(),b=M.create();for(const g of [a,b])g.dropFood(180,130);for(let i=0;i<100;i++)a.advance(20);for(let i=0;i<50;i++)b.advance(40);assert.deepEqual(a.view(),b.view());const before=a.serialize();for(const ms of [-1,NaN,Infinity,30001])a.advance(ms);assert.deepEqual(a.serialize(),before);
});

test('invalid seeds and out-of-bounds clicks reject without changing the tank',()=>{
 for(const seed of [0,-1,NaN,Infinity,1.5,0x100000000])assert.throws(()=>M.create({seed}),RangeError);const g=M.create(),before=g.serialize();assert.equal(g.actionAt(-1,2),false);assert.equal(g.actionAt(1000,1000),false);assert.deepEqual(g.serialize(),before);
});

test('feeding unlocks deeper reef pressure and alien health rises with each zone',()=>{
 assert.deepEqual(M.ZONES.map(zone=>zone.name),['Rạn Nông','Rạn Sâu','Vịnh Ngọc']);
 const g=M.create({seed:0x12345678}),alienHp=new Set();
 advanceDefending(g,10000,[],alienHp);assert.equal(g.view().zoneNumber,1);
 for(let i=0;i<4;i++)feedOne(g,1);advanceDefending(g,1800);assert.equal(g.view().zoneNumber,2);
 advanceDefending(g,12000,[],alienHp);assert.equal(g.view().zoneNumber,2);
 for(let i=0;i<6;i++)feedOne(g,1);advanceDefending(g,1800);assert.equal(g.view().zoneNumber,3);
 advanceDefending(g,12000,[],alienHp);assert.equal(g.view().zoneNumber,3);
 assert.deepEqual([...alienHp].sort(),[3,4,5]);
 assert.deepEqual(M.ZONES.map(zone=>zone.alienInterval),[12000,9500,7500]);
 assert.ok(M.ZONES[0].fishSpeed<M.ZONES[1].fishSpeed&&M.ZONES[1].fishSpeed<M.ZONES[2].fishSpeed);
});

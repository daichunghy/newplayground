const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/garden-bombs-model.js');
const actor=(r,c)=>({r,c,fromR:r,fromC:c,movedAt:0,heading:'right',cooldown:0});
function fixture(change={}){const s=M.create({seed:42}).serialize();s.enemies.forEach(e=>e.alive=false);Object.assign(s,change);const g=M.restore(s);assert.ok(g,'valid fixture');return g;}
const bomb=(id,r,c,fuse=1,range=2)=>({id,r,c,fuse,range});
const hot=(s,r,c)=>s.flames.some(f=>f.r===r&&f.c===c);

test('five original maps have connected floors after crates and a two-turn safe opening',()=>{
 for(let stage=0;stage<M.MAPS.length;stage++){
  const a=M.arena(stage);assert.equal(a.grid.length,11);const q=[a.spawn],seen=new Set([a.spawn.r*11+a.spawn.c]);
  for(const p of q)for(const[dr,dc]of Object.values(M.DIRS)){const r=p.r+dr,c=p.c+dc,k=r*11+c;if(a.grid[r]?.[c]!==undefined&&a.grid[r][c]!==1&&!seen.has(k)){seen.add(k);q.push({r,c});}}
  assert.equal(seen.size,a.grid.flat().filter(v=>v!==1).length);assert.ok(seen.has(a.exit.r*11+a.exit.c));
  const s=M.create({stage,seed:2}).serialize();s.enemies.forEach(e=>e.alive=false);const g=M.restore(s);assert.equal(g.place(),true);g.steer('right');g.advance(160);g.steer('down');g.advance(160);g.steer(null);g.advance(2400);assert.equal(g.view().status,'playing');assert.equal(g.view().player.c,3);assert.equal(g.view().player.r,2);
 }
});
test('bomb capacity, overlap and exit from own bomb are enforced',()=>{
 const g=fixture();assert.equal(g.place(),true);assert.equal(g.place(),false);assert.equal(g.steer('right'),true);g.steer(null);g.advance(160);assert.equal(g.steer('left'),false);assert.equal(g.place(),false);assert.equal(g.view().bombs.length,1);
});
test('walls stop before entry, crates stop after destruction, frozen range belongs to each bomb',()=>{
 const g=fixture({player:actor(5,1),bombs:[bomb(1,1,3,1,4)],nextBomb:2});g.advance(20);const s=g.view();assert.equal(s.grid[1][4],0);assert.equal(hot(s,1,4),true);assert.equal(hot(s,1,5),false);assert.equal(hot(s,2,2),false);assert.equal(s.grid[2][2],1);assert.equal(s.bombs.length,0);
 const h=fixture({capacity:2,range:2});h.place();const snap=h.serialize();snap.range=4;const upgraded=M.restore(snap);assert.equal(upgraded.view().bombs[0].range,2);
});
test('chain reactions detonate exactly once and release capacity without crossing bombs',()=>{
 const g=fixture({player:actor(5,1),capacity:3,bombs:[bomb(1,1,1),bomb(2,1,2,90),bomb(3,1,3,100)],nextBomb:4});const events=g.advance(20);assert.equal(g.view().bombs.length,0);assert.equal(events.filter(e=>e.kind==='blast').length,1);assert.equal(events.find(e=>e.kind==='blast').bombs,3);assert.equal(g.place(),true);
});
test('simultaneous blasts share obstacle snapshot, independent of bomb array order',()=>{
 const results=[];for(const reverse of [false,true]){const bombs=[bomb(1,7,3,1,2),bomb(2,9,1,1,4)];if(reverse)bombs.reverse();const g=fixture({capacity:2,bombs,nextBomb:3});g.advance(20);const s=g.view();assert.equal(s.grid[9][3],0);assert.equal(s.grid[9][4],2);assert.equal(hot(s,9,4),false);results.push({grid:s.grid,items:s.items,flames:s.flames.map(f=>f.r*11+f.c).sort((a,b)=>a-b)});}assert.deepEqual(results[0],results[1]);
});
test('newly revealed upgrades survive revealing blast, later blasts remove existing items',()=>{
 const g=fixture({bombs:[bomb(1,7,3,1,2)],nextBomb:2});g.advance(20);assert.equal(g.view().items[102],'capacity');const s=g.serialize();s.bombs=[bomb(2,7,3,1,2)];s.nextBomb=3;const h=M.restore(s);h.advance(20);assert.equal(h.view().items[102],undefined);
});
test('capacity and range collection obey caps and award once',()=>{
 for(const [r,c,item,max]of [[9,3,'capacity',3],[9,7,'range',4]]){const s=M.create({seed:1}).serialize();s.enemies.forEach(e=>e.alive=false);s.grid[r][c]=0;s.items[r*11+c]=item;s.player=actor(r,c-1);s[item]=max;const g=M.restore(s);assert.ok(g);g.steer('right');assert.equal(g.view()[item],max);assert.equal(g.view().items[r*11+c],undefined);assert.equal(g.drain().filter(e=>e.kind==='item').length,1);}
});
test('blast lifetime is exact and death freezes simulation',()=>{
 const g=fixture({player:actor(5,1),bombs:[bomb(1,1,3)],nextBomb:2});g.advance(20);assert.ok(g.view().flames.length);g.advance((M.FLAME-1)*20);assert.ok(g.view().flames.length);g.advance(20);assert.equal(g.view().flames.length,0);
 const dead=fixture();dead.place();dead.advance(2400);assert.equal(dead.view().status,'lost');const s=dead.serialize();dead.advance(500);assert.equal(dead.place(),false);assert.equal(dead.steer('right'),false);assert.deepEqual(dead.serialize(),s);
});
test('enemy blast rewards cannot be earned twice',()=>{
 const s=M.create({seed:1}).serialize();s.enemies.forEach(e=>e.alive=false);s.enemies[0]={...s.enemies[0],...actor(1,2),alive:true};s.player=actor(5,1);s.bombs=[bomb(1,1,1)];s.nextBomb=2;const g=M.restore(s);g.advance(20);const score=g.view().score;assert.equal(g.view().enemies[0].alive,false);assert.equal(score,100);g.advance(100);assert.equal(g.view().score,score);
});
test('last-enemy removal unlocks exit; death wins over exit completion',()=>{
 const g=fixture({player:actor(1,8)});g.steer('right');assert.equal(g.view().status,'cleared');assert.equal(g.view().score,250);assert.ok(g.next());const s=g.serialize();g.advance(500);g.steer('left');assert.deepEqual(g.serialize(),s);
 const h=fixture({player:actor(1,8),bombs:[bomb(1,1,9)],nextBomb:2});h.steer('right');assert.equal(h.view().player.c,8);h.advance(20);assert.equal(h.view().status,'lost');assert.equal(h.next(),null);
});
test('five-stage campaign closes, banking rewards once and retry removes current-stage gains',()=>{
 let g=M.create({seed:22});for(let stage=0;stage<5;stage++){let s=g.serialize();s.enemies.forEach(e=>e.alive=false);s.player=actor(1,8);g=M.restore(s);g.steer('right');assert.equal(g.view().score,(stage+1)*250);assert.equal(g.view().status,stage===4?'won':'cleared');if(stage<4){g=g.next();assert.equal(g.view().stage,stage+1);}}
 assert.equal(g.next(),null);const h=fixture({bank:100,score:150,capacity:3,range:4,startCapacity:1,startRange:2});const r=h.retry().view();assert.equal(r.score,100);assert.equal(r.capacity,1);assert.equal(r.range,2);assert.equal(r.seed,42);
});
test('frame partition and save restore preserve exact movement and random AI',()=>{
 const states=[];for(const rate of [30,60,120]){const g=M.create({seed:47});g.steer('right');for(let n=0;n<rate*8;n++)g.advance(1000/rate);const s=g.serialize();s.remainder=0;states.push(s);}assert.deepEqual(states[0],states[1]);assert.deepEqual(states[1],states[2]);
 const a=M.create({seed:778});a.advance(700);const b=M.restore(a.serialize());for(let i=0;i<70;i++){assert.deepEqual(a.advance(40),b.advance(40));assert.deepEqual(a.serialize(),b.serialize());}
});
test('buffered turn happens at the next open tile; release stops future movement',()=>{
 const g=fixture();g.steer('right');g.steer('down');g.advance(160);assert.equal(g.view().player.c,3);assert.equal(g.view().player.r,1);g.advance(160);assert.equal(g.view().player.r,2);g.steer(null);const pos=g.view().player;g.advance(400);assert.equal(g.view().player.r,pos.r);assert.equal(g.view().player.c,pos.c);
});
test('corrupt, sparse, future, impossible and aliased snapshots are rejected safely',()=>{
 const s=M.create({seed:6}).serialize();for(const mutate of [x=>x.version=9,x=>x.grid[0][0]=0,x=>delete x.grid[1][1],x=>x.player.r=0,x=>x.enemies[0].kind='unknown',x=>x.items={'9999':'range'},x=>x.remainder=20,x=>x.startSeed=-1,x=>x.bombs=[null],x=>x.status='won']){const b=structuredClone(s);mutate(b);assert.equal(M.restore(b),null);}
 const a=M.restore(s);a.steer('right');assert.deepEqual(s,M.create({seed:6}).serialize());for(const ms of [-1,NaN,Infinity,60001]){const before=a.serialize();a.advance(ms);assert.deepEqual(a.serialize(),before);}
});

const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/sun-garden-model.js');

test('the original garden has three readable crop tradeoffs and nine plots',()=>{
 assert.equal(M.PLOTS,9);assert.equal(M.DAY_MS,45000);assert.equal(M.TARGET,108);
 assert.deepEqual(Object.keys(M.CROPS),['bean','berry','bloom']);
 assert.deepEqual(Object.values(M.CROPS).map(c=>[c.growMs,c.yield]),[[3000,1],[5000,2],[7000,3]]);
});

test('empty plots accept one known crop; filled, invalid and terminal plant actions do nothing',()=>{
 const g=M.create();assert.equal(g.plant(0,'bean'),true);assert.equal(g.plant(0,'berry'),false);assert.equal(g.plant(1,'unknown'),false);assert.equal(g.plant(-1,'bean'),false);assert.equal(g.plant(9,'bean'),false);
 assert.equal(g.view().plots[0].crop.id,'bean');assert.equal(g.view().plots[1].crop,null);
});

test('short bean crop grows, auto-harvests into the basket, and frees its soil',()=>{
 const g=M.create();g.plant(4,'bean');assert.equal(g.advance(2999).some(e=>e.kind==='harvested'),false);assert.equal(g.view().plots[4].progress,99);const events=g.advance(1);
 assert.equal(events.filter(e=>e.kind==='harvested').length,1);assert.equal(g.view().baskets,1);assert.equal(g.view().plots[4].crop,null);
});

test('different crops mature independently and award only their authored yield',()=>{
 const g=M.create();g.plant(0,'bean');g.plant(1,'berry');g.plant(2,'bloom');g.advance(3000);
 assert.equal(g.view().baskets,1);assert.equal(g.view().plots[0].crop,null);assert.equal(g.view().plots[1].progress,60);assert.equal(g.view().plots[2].progress,42);
 g.advance(2000);assert.equal(g.view().baskets,3);assert.equal(g.view().plots[1].crop,null);assert.equal(g.view().plots[2].progress,71);
 g.advance(2000);assert.equal(g.view().baskets,6);assert.equal(g.view().status,'playing');
});

test('nine ripe flowers deliver a satisfying full basket and win exactly at the quota',()=>{
 const g=M.create();for(let i=0;i<M.PLOTS;i++)assert.equal(g.plant(i,'bloom'),true);const events=g.advance(7000);
 assert.equal(events.filter(e=>e.kind==='harvested').length,9);assert.equal(g.view().baskets,27);assert.equal(g.view().status,'playing');
 for(let wave=0;wave<3;wave++){for(let i=0;i<M.PLOTS;i++)g.plant(i,'bloom');g.advance(7000);}
 assert.equal(g.view().baskets,108);assert.equal(g.view().status,'won');assert.equal(g.view().remainingMs,17000);assert.equal(g.plant(0,'bean'),false);
});

test('the sunset closes an unfinished day at 45 seconds with a loss event',()=>{
 const g=M.create();g.plant(0,'berry');g.advance(30000);const events=g.advance(M.DAY_MS-30000);assert.equal(g.view().status,'lost');assert.equal(g.view().remainingMs,0);assert.equal(g.view().elapsedMs,M.DAY_MS);assert.ok(events.some(e=>e.kind==='day-ended'));
});

test('a crop that ripens exactly at sunset is collected before the result is decided',()=>{
 const g=M.create();g.advance(30000);g.advance(M.DAY_MS-M.CROPS.bloom.growMs-30000);g.plant(0,'bloom');g.advance(M.CROPS.bloom.growMs-1);assert.equal(g.view().plots[0].progress,99);g.advance(1);
 assert.equal(g.view().baskets,3);assert.equal(g.view().status,'lost');
});

test('views and serialized snapshots do not expose mutable simulation state',()=>{
 const g=M.create();g.plant(0,'berry');const v=g.view();v.plots[0].crop.name='tampered';v.plots[1].crop={id:'bean'};const s=g.serialize();s.plants[0].cropId='bean';assert.equal(g.view().plots[0].crop.name,'Dâu');assert.equal(g.view().plots[1].crop,null);assert.equal(g.serialize().plants[0].cropId,'berry');
});

test('fixed-time outcomes are deterministic across frame partitions',()=>{
 const a=M.create(),b=M.create();for(let i=0;i<9;i++){a.plant(i,'bloom');b.plant(i,'bloom');}
 for(let i=0;i<70;i++)a.advance(100);for(let i=0;i<140;i++)b.advance(50);assert.deepEqual(a.view(),b.view());
});

test('invalid and oversized frame deltas cannot advance the day',()=>{
 const g=M.create();g.plant(0,'berry');const before=g.serialize();for(const dt of [-1,NaN,Infinity,30001])g.advance(dt);assert.deepEqual(g.serialize(),before);
});

test('large valid updates are capped at sunset and never accumulate hidden time',()=>{
 const g=M.create();g.plant(0,'bean');g.advance(30000);const first=g.view().elapsedMs;g.advance(30000);assert.equal(first,30000);assert.equal(g.view().elapsedMs,M.DAY_MS);assert.equal(g.view().status,'lost');
});

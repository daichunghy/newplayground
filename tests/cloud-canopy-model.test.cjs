const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/cloud-canopy-model.js');
const step=(game,n,input={})=>{for(let i=0;i<n;i++)game.advance(M.STEP,input);return game.view();};
function fixture(edit){const s=M.create({score:120,lives:3}).serialize();edit(s);const g=M.restore(s);assert.ok(g,'fixture is valid');return g;}

test('three original routes have distinct safe platforms, three bells, wind zones and an exit',()=>{
 assert.equal(M.LEVELS.length,3);const signatures=new Set();
 for(const L of M.LEVELS){signatures.add(JSON.stringify(L.platforms));assert.ok(L.width>M.WIDTH);assert.equal(L.bells.length,3);assert.ok(L.winds.length>0);assert.ok(L.gate.x<L.width);for(const [x,y,w]of L.platforms){assert.ok(x>=0&&y>0&&w>0&&x+w<=L.width);}}
 assert.equal(signatures.size,3);
});

test('movement accelerates, brakes and stays inside the authored world',()=>{
 const g=M.create();step(g,2);const x=g.view().player.x;step(g,12,{right:true});assert.ok(g.view().player.x>x+25);step(g,30,{left:true});assert.ok(g.view().player.x>=0&&g.view().player.vx<0);step(g,30,{left:true});assert.equal(g.view().player.x,0);assert.equal(g.view().player.vx,0);
});

test('holding jump changes the arc; release cuts lift; jump cannot retrigger from held repeat',()=>{
 function peak(hold){const g=M.create();step(g,2);for(let i=0;i<hold;i++)g.advance(M.STEP,{jump:true});let min=g.view().player.y;for(let i=0;i<45;i++){g.advance(M.STEP,{jump:i<hold});min=Math.min(min,g.view().player.y);}return min;}
 assert.ok(peak(12)<peak(1)-8,'held jump rises higher than a tap');
 const g=M.create();step(g,2);g.advance(M.STEP,{jump:true});const first=g.view().player.vy;step(g,3,{jump:true});assert.ok(g.view().player.vy<0);assert.ok(g.view().player.jumpBuffer<=8);assert.ok(first<0);
});

test('one-way landings, ceiling collision and platform gaps do not tunnel',()=>{
 const g=fixture(s=>{s.player.x=170;s.player.y=160;s.player.vy=7;s.player.grounded=false;});step(g,8);assert.equal(g.view().player.y,222);assert.equal(g.view().player.grounded,true);assert.equal(g.view().player.vy,0);
 const c=fixture(s=>{s.player.x=174;s.player.y=270;s.player.vy=-9;s.player.grounded=false;});step(c,2);assert.ok(c.view().player.y<270);assert.ok(c.view().player.y>=0);
});

test('wind zones add their authored impulse without changing controls or world bounds',()=>{
 const plain=fixture(s=>{s.player.x=300;s.player.y=238;s.player.vx=0;s.player.vy=0;s.player.grounded=false;}),wind=fixture(s=>{s.player.x=590;s.player.y=238;s.player.vx=0;s.player.vy=0;s.player.grounded=false;});
 step(plain,5);step(wind,5);assert.ok(wind.view().player.vx>plain.view().player.vx);assert.ok(wind.view().player.vy<plain.view().player.vy);
});

test('bells are unique, score once, and the gate stays locked until all bells are collected',()=>{
 const g=fixture(s=>{s.player.x=178;s.player.y=211;s.player.vx=0;s.player.vy=0;});let events=g.advance(M.STEP);assert.equal(events.filter(e=>e.kind==='bell').length,1);const score=g.view().score;g.advance(M.STEP);assert.equal(g.view().score,score);
 const locked=fixture(s=>{s.player.x=1510;s.player.y=284;s.player.vx=0;s.player.vy=0;s.player.grounded=true;});events=locked.advance(M.STEP);assert.equal(locked.view().status,'playing');assert.equal(events.filter(e=>e.kind==='locked').length,1);
 const open=fixture(s=>{s.collected.fill(true);s.player.x=1510;s.player.y=284;s.player.vx=0;s.player.vy=0;s.player.grounded=true;});open.advance(M.STEP);assert.equal(open.view().status,'cleared');assert.ok(open.next());
});

test('checkpoint unlocks once and a hazard respawn returns to checkpoint with invulnerability',()=>{
 const g=fixture(s=>{s.player.x=900;s.player.y=284;s.player.vx=0;s.player.vy=0;s.player.grounded=true;});const events=g.advance(M.STEP);assert.equal(events.filter(e=>e.kind==='checkpoint').length,1);assert.equal(g.view().checkpoint,true);
 const snap=g.serialize();snap.player.x=snap.enemies[0].x;snap.player.y=snap.enemies[0].y-M.PLAYER_H;snap.player.vy=1;snap.player.grounded=false;snap.player.invulnerable=0;
 const danger=M.restore(snap);assert.ok(danger);const hurt=danger.advance(M.STEP).find(e=>e.kind==='hurt');assert.ok(hurt);assert.equal(danger.view().lives,2);assert.equal(danger.view().player.x,M.LEVELS[0].checkpoint.x);assert.ok(danger.view().player.invulnerable>0);
});

test('falling hazards, life loss and retry preserve only banked score',()=>{
 const g=fixture(s=>{s.player.y=500;s.player.vy=9;s.score=370;s.bankScore=120;});g.advance(M.STEP);assert.equal(g.view().lives,2);assert.equal(g.view().player.x,M.LEVELS[0].spawn.x);
 const lost=fixture(s=>{s.lives=1;s.player.y=500;s.player.vy=9;});lost.advance(M.STEP);assert.equal(lost.view().status,'lost');assert.equal(lost.retry().view().score,lost.view().bankScore);assert.equal(lost.retry().view().lives,3);
});

test('campaign clear banks score, carries lives, and finishes after all three routes',()=>{
 let g=M.create({score:50,lives:2});for(let stage=0;stage<3;stage++){const s=g.serialize();s.collected.fill(true);s.player.x=M.LEVELS[stage].gate.x;s.player.y=M.LEVELS[stage].gate.y;s.player.vx=0;s.player.vy=0;g=M.restore(s);assert.ok(g);g.advance(M.STEP);assert.equal(g.view().status,stage===2?'won':'cleared');if(stage<2){g=g.next();assert.equal(g.view().stage,stage+1);assert.equal(g.view().lives,2);}}
 assert.equal(g.next(),null);
});

test('fixed-step outcomes and checkpoints replay deterministically across frame partitions',()=>{
 const a=M.create({stage:1}),b=M.restore(a.serialize());for(let i=0;i<60*5;i++)a.advance(1000/60,{right:true,jump:i<20});for(let i=0;i<120*5;i++)b.advance(1000/120,{right:true,jump:i<40});assert.deepEqual(a.serialize(),b.serialize());
 const restored=M.restore(a.serialize());assert.ok(restored);for(let i=0;i<30;i++){assert.deepEqual(a.advance(32,{left:true}),restored.advance(32,{left:true}));assert.deepEqual(a.serialize(),restored.serialize());}
});

test('corrupt, future and impossible saves reject; returned snapshots are isolated',()=>{
 const s=M.create().serialize();for(const edit of [x=>x.version=9,x=>x.stage=9,x=>x.player.x=-1,x=>x.lives=8,x=>x.lives=0,x=>x.collected=[true],x=>x.enemies[0].x=1e9,x=>x.status='won',x=>x.remainder=M.STEP]){const bad=structuredClone(s);edit(bad);assert.equal(M.restore(bad),null);}
 const g=M.restore(s);g.view().player.x=999;assert.equal(g.view().player.x,s.player.x);for(const ms of [-1,NaN,Infinity,60001]){const before=g.serialize();g.advance(ms,{});assert.deepEqual(g.serialize(),before);}
});

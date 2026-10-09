const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/wind-duel-model.js');
function settleProjectile(g){for(let i=0;i<400&&g.view().projectile;i++)g.advance(M.STEP_MS);assert.equal(g.view().projectile,null);}
function settleCpu(g){for(let i=0;i<220&&g.view().turn==='cpu'&&g.view().status==='playing';i++)g.advance(M.STEP_MS);}
function chargeTo(g,power){assert.equal(g.beginCharge(),true);for(let i=0;i<120&&g.view().player.power<power;i++)g.advance(M.STEP_MS);assert.ok(g.view().player.power>=power);}

test('Gió Ngang has bounded original hills, a player and a single opposing artillery cart',()=>{
 const g=M.create(),v=g.view();assert.equal(M.WIDTH,600);assert.equal(M.HEIGHT,360);assert.equal(v.terrain.length,M.TERRAIN_COUNT);assert.ok(v.wind>=-3&&v.wind<=3);assert.ok(v.player.x<v.cpu.x);assert.equal(v.player.hp,3);assert.equal(v.cpu.hp,3);assert.equal(v.turn,'player');assert.equal(v.status,'playing');assert.ok(v.terrain.every(y=>Number.isInteger(y)&&y>=238&&y<=326));
});

test('same seed replays identical wind; a new wind seed keeps the authored field',()=>{
 const a=M.create({seed:0x1234}).view(),b=M.create({seed:0x1234}).view(),c=M.create({seed:0x0100}).view(),d=M.create({seed:0x0200}).view();assert.deepEqual(a.terrain,b.terrain);assert.equal(a.wind,b.wind);assert.deepEqual(a.terrain,c.terrain);assert.notEqual(c.wind,d.wind);
});

test('movement is bounded, costs a turn action, and stops after two steps',()=>{
 const g=M.create(),x=g.view().player.x;assert.equal(g.move(-1),true);assert.equal(g.view().player.x,x-16);assert.equal(g.move(-1),true);assert.equal(g.move(-1),false);assert.equal(g.view().remainingMoves,0);assert.equal(g.move(0),false);assert.equal(g.move(1),false);
});

test('angle bounds, hold charge, release and cancel preserve one-action turns',()=>{
 const g=M.create();assert.equal(g.setAngle(15),true);assert.equal(g.setAngle(75),true);assert.equal(g.setAngle(76),false);assert.equal(g.beginCharge(),true);assert.equal(g.view().player.power,M.MIN_POWER);assert.equal(g.setAngle(45),false);assert.equal(g.move(1),false);g.advance(480);assert.ok(g.view().player.power>M.MIN_POWER);assert.ok(g.view().player.power<M.MAX_POWER);g.advance(5000);assert.equal(g.view().player.power,M.MAX_POWER);assert.equal(g.releaseCharge(),true);assert.ok(g.view().projectile);assert.equal(g.view().charging,false);assert.equal(g.fire(),false);settleProjectile(g);assert.equal(g.view().turn,'cpu');assert.equal(g.setAngle(45),false);
 const c=M.create();c.beginCharge();c.advance(240);assert.equal(c.cancelCharge(),true);assert.equal(c.view().charging,false);assert.equal(c.view().player.power,64);assert.equal(c.view().shots,0);
});

test('wind changes the arc; one adjusted shot damages a target once and deforms terrain',()=>{
 const g=M.create();chargeTo(g,66);const before=g.view().terrain;assert.equal(g.releaseCharge(),true);let events=[];for(let i=0;i<300&&g.view().turn==='player';i++)events.push(...g.advance(M.STEP_MS));const v=g.view();assert.equal(v.cpu.hp,2);assert.equal(v.turn,'cpu');assert.ok(events.some(e=>e.kind==='hit'&&e.damage===1));assert.ok(events.some(e=>e.kind==='impact'));assert.notDeepEqual(v.terrain,before);
});

test('a close miss still carves a crater without awarding health damage',()=>{
 const g=M.create();const hp=g.view().cpu.hp,before=g.view().terrain;g.fire();settleProjectile(g);assert.equal(g.view().cpu.hp,hp);assert.notDeepEqual(g.view().terrain,before);assert.equal(g.view().turn,'cpu');
});

test('shot starts from the selected cart, follows a deterministic arc and stops at ground/bounds',()=>{
 const a=M.create(),b=M.create();for(const g of [a,b])chargeTo(g,66);a.releaseCharge();b.releaseCharge();let aa=[],bb=[];while(a.view().projectile){aa.push(a.view().projectile);a.advance(M.STEP_MS);}while(b.view().projectile){bb.push(b.view().projectile);b.advance(M.STEP_MS);}assert.deepEqual(aa,bb);assert.ok(aa.length>8&&aa.length<120);assert.ok(aa[0].x>a.view().player.x);assert.equal(a.view().projectile,null);
});

test('each shot yields exactly one turn and controls are locked until the opponent finishes',()=>{
 const g=M.create();g.fire();assert.equal(g.fire(),false);settleProjectile(g);assert.equal(g.view().turn,'cpu');assert.equal(g.move(1),false);assert.equal(g.fire(),false);settleCpu(g);assert.equal(g.view().turn,'player');assert.equal(g.view().player.moves,0);assert.equal(g.fire(),true);
});

test('the CPU pauses briefly, chooses a valid angle and launches deterministic return fire',()=>{
 const a=M.create(),b=M.create();for(const g of [a,b]){chargeTo(g,66);g.releaseCharge();settleProjectile(g);}assert.equal(a.view().turn,'cpu');a.advance(544);b.advance(544);assert.equal(a.view().projectile,null);assert.equal(b.view().projectile,null);const ae=a.advance(16),be=b.advance(16);assert.deepEqual(ae,be);assert.equal(a.view().projectile.side,'cpu');assert.ok(a.view().projectile.vx<0);assert.ok(a.view().projectile.vy<0);
});

test('three accurate shots can win a duel; no post-result action changes the outcome',()=>{
 const g=M.create({seed:0x1234});for(let i=0;i<3&&g.view().status==='playing';i++){g.fire();settleProjectile(g);if(g.view().status==='playing')settleCpu(g);}
 assert.equal(g.view().status,'won');assert.equal(g.view().cpu.hp,0);const before=g.serialize();assert.equal(g.fire(),false);assert.equal(g.move(1),false);g.advance(800);assert.deepEqual(g.serialize(),before);
});

test('CPU can win when the player repeatedly ignores the angle and wind',()=>{
 const g=M.create();for(let i=0;i<4&&g.view().status==='playing';i++){g.fire();settleProjectile(g);if(g.view().status==='playing')settleCpu(g);}assert.equal(g.view().status,'lost');assert.equal(g.view().player.hp,0);
});

test('fixed-step outcomes are deterministic across frame partitions, including held charge',()=>{
 const a=M.create(),b=M.create();for(const g of [a,b])g.beginCharge();for(let i=0;i<15;i++)a.advance(16);for(let i=0;i<10;i++)b.advance(24);assert.deepEqual(a.view(),b.view());assert.equal(a.view().player.power,b.view().player.power);a.releaseCharge();b.releaseCharge();for(let i=0;i<80;i++)a.advance(16);for(let i=0;i<40;i++)b.advance(32);assert.deepEqual(a.view(),b.view());const before=a.serialize();for(const ms of [-1,NaN,Infinity,30001])a.advance(ms);assert.deepEqual(a.serialize(),before);
});

test('invalid, future and zero seeds reject instead of creating unstable physics',()=>{
 for(const seed of [0,-1,NaN,Infinity,1.5,0x100000000])assert.throws(()=>M.create({seed}),RangeError);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../scripts/games/flappy-bird-model.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(change){const state=copy(M.makeModel().serialize());change(state);return M.makeModel(state);}

test('new flight begins ready with three tries and a deterministic sequence of gates',()=>{
 const a=M.create(),b=M.create();assert.equal(a.view().status,'ready');assert.equal(a.view().lives,3);assert.deepEqual(a.view(),b.view());assert.equal(a.view().gates[0].center,M.CENTERS[0]);
});

test('one flap starts play and gives the glider an upward impulse; waiting adds gravity',()=>{
 const m=M.makeModel();assert.equal(m.flap(),true);assert.equal(m.view().status,'playing');assert.equal(m.view().player.vy,M.FLAP);m.drain();m.advance(M.STEP);assert.ok(m.view().player.vy>M.FLAP);assert.ok(m.view().player.y<M.HEIGHT/2);
});

test('simulation is fixed-step and independent of frame chunking',()=>{
 const a=M.makeModel(),b=M.makeModel();a.flap();b.flap();a.drain();b.drain();for(let i=0;i<12;i++)a.advance(M.STEP);b.advance(M.STEP*12);assert.deepEqual(a.view(),b.view());
});

test('a passed gap scores once and the next gate follows the fixed center pattern',()=>{
 const m=M.create(),events=[];for(let i=0;i<160;i++){if(i%32===0){m.flap();m.drain();}events.push(...m.advance(M.STEP));}assert.equal(m.view().score,1);assert.equal(events.filter(e=>e.kind==='score').length,1);assert.equal(m.view().gates.length,4);assert.equal(m.view().gates[3].id,4);assert.equal(m.view().gates[3].center,M.CENTERS[4]);assert.ok(m.view().gates.every(g=>Number.isFinite(g.x)));
});

test('gate and floor collisions spend a try, reset the course, and end after the last try',()=>{
 const gate=fixture(s=>{s.status='playing';s.gates[0].x=M.PLAYER_X;s.gates[0].center=100;});const events=gate.advance(M.STEP);assert.ok(events.some(e=>e.kind==='crash'&&e.reason==='gate'));assert.equal(gate.view().lives,2);assert.equal(gate.view().status,'playing');assert.equal(gate.view().gates[0].x,355);
 const last=fixture(s=>{s.status='playing';s.lives=1;s.player.y=M.HEIGHT-M.RADIUS+1;});const end=last.advance(M.STEP);assert.equal(last.view().status,'over');assert.equal(last.view().lives,0);assert.ok(end.some(e=>e.kind==='over'));
});

test('replay resets score, lives, player and gate course',()=>{
 const m=fixture(s=>{s.status='over';s.score=8;s.lives=0;s.player.y=12;});const replay=m.reset();assert.equal(replay.view().status,'ready');assert.equal(replay.view().score,0);assert.equal(replay.view().lives,3);assert.equal(replay.view().player.y,M.HEIGHT/2);
});

test('invalid, negative, excessive or terminal advances do not mutate state',()=>{
 const m=M.makeModel(),before=m.view();assert.deepEqual(m.advance(-1),[]);assert.deepEqual(m.advance(60001),[]);assert.deepEqual(m.advance(NaN),[]);assert.deepEqual(m.view(),before);m.flap();m.drain();const active=m.view();m.advance(Infinity);assert.deepEqual(m.view(),active);
});

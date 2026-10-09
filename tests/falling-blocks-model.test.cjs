const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/falling-blocks-model.js');
const fresh=()=>M.create({seed:42}).serialize();
function fixture(active,change={}){return M.restore({...fresh(),active,...change});}
const empty=()=>Array.from({length:22},()=>Array(10).fill(0));

test('all pieces conserve four cells and matrix rotations return after four turns',()=>{
 for(const type of M.TYPES){const first=M.matrix(type);assert.equal(first.flat().filter(Boolean).length,4);for(let i=1;i<4;i++)assert.equal(M.matrix(type,i).flat().filter(Boolean).length,4);assert.deepEqual(M.matrix(type,4),first);}
});
test('seven-bag is deterministic, bounded, complete and preserved through holds/restores',()=>{
 for(let seed=0;seed<30;seed++){
  const a=M.create({seed}),b=M.create({seed}),s=a.view();assert.deepEqual(a.serialize(),b.serialize());
  assert.deepEqual([s.active.type,...s.queue.slice(0,6)].sort(),M.TYPES.slice().sort());assert.deepEqual(s.queue.slice(6,13).sort(),M.TYPES.slice().sort());
  a.hold();b.hold();assert.deepEqual(a.serialize(),b.serialize());const restored=M.restore(a.serialize());assert.ok(restored);
  for(let i=0;i<12&&a.view().status==='playing';i++){assert.deepEqual(a.hardDrop(),restored.hardDrop());assert.deepEqual(a.serialize(),restored.serialize());}
 }
});
test('hold is once per piece, swaps in spawn orientation, resets after lock',()=>{
 const g=M.create({seed:11}),a=g.view();assert.equal(g.hold(),true);const b=g.view();assert.equal(b.hold,a.active.type);assert.equal(b.active.type,a.queue[0]);assert.equal(g.hold(),false);
 g.hardDrop();assert.equal(g.view().holdUsed,false);const before=g.view();assert.equal(g.hold(),true);assert.equal(g.view().active.type,b.hold);assert.equal(g.view().hold,before.active.type);assert.equal(g.view().active.rotation,0);
});
test('hold detects immediate block-out instead of allowing an overlapping active piece',()=>{
 const s=fresh();s.active={type:'O',rotation:0,x:0,y:20};s.hold='T';s.grid[2][4]='J';const g=M.restore(s);assert.ok(g);assert.equal(g.hold(),true);assert.equal(g.view().status,'lost');
});
test('wall/floor rotation kicks stay inside bounds; failed rotation preserves state',()=>{
 for(const type of M.TYPES.filter(t=>t!=='O')){
  for(const x of [-2,-1,0,7,8,9])for(let rotation=0;rotation<4;rotation++){
   const p={type,rotation,x,y:17},grid=empty();if(M.collision(grid,p))continue;const g=fixture(p);assert.ok(g);g.rotate(1);assert.equal(M.collision(g.view().grid,g.view().active),false);
  }
 }
 const grid=empty(),p={type:'T',rotation:0,x:3,y:8};
 for(let r=3;r<15;r++){grid[r].fill('J');grid[r][0]=0;}for(const[r,c]of M.cells(p))grid[r][c]=0;
 const g=fixture(p,{grid});assert.ok(g);const old=g.serialize();assert.equal(g.rotate(1),false);assert.deepEqual(g.serialize(),old);assert.equal(g.rotate(-1),false);assert.deepEqual(g.serialize(),old);
});
test('hard drop lands at ghost, counts distance once and locks immediately',()=>{
 const g=M.create({seed:7}),s=g.view(),distance=s.ghostY-s.active.y,r=g.hardDrop();assert.equal(r.dropDistance,distance);assert.equal(g.view().pieces,1);assert.equal(g.view().score,distance*2);assert.equal(g.view().grid.flat().filter(Boolean).length,4);
});
test('soft drop moves one row and cannot bypass floor or reset grounded delay',()=>{
 const g=fixture({type:'O',rotation:0,x:4,y:19});assert.equal(g.softDrop(),true);assert.equal(g.view().score,1);assert.equal(g.softDrop(),false);g.advance(480);assert.equal(g.softDrop(),false);g.advance(20);assert.equal(g.view().pieces,1);
});
test('clears one through four rows and scores against pre-clear level',()=>{
 for(let count=1;count<=4;count++){
  const grid=empty();for(let r=22-count;r<22;r++){grid[r].fill('O');grid[r][4]=0;}
  const p=count===1?{type:'O',rotation:0,x:4,y:20}:{type:'I',rotation:1,x:2,y:17};
  if(count===1){grid[21][5]=0;}
  const g=fixture(p,{grid,lines:9});assert.ok(g);const e=g.hardDrop();assert.equal(e.cleared,count);assert.equal(g.view().lines,9+count);assert.equal(g.view().level,2);assert.equal(e.scoreDelta,[0,100,300,500,800][count]);
 }
});
test('sprint wins at forty lines, endless continues, terminal mutations are blocked',()=>{
 const grid=empty();for(let r=18;r<22;r++){grid[r].fill('O');grid[r][4]=0;}
 for(const mode of ['sprint','endless']){
  const g=fixture({type:'I',rotation:1,x:2,y:17},{grid,lines:38,mode});g.hardDrop();assert.equal(g.view().status,mode==='sprint'?'won':'playing');assert.equal(g.view().score,3200);
  assert.ok(M.validSave(g.serialize()));if(mode==='sprint'){const end=g.serialize();assert.equal(g.move(1),false);assert.equal(g.rotate(),false);assert.equal(g.hold(),false);assert.equal(g.hardDrop(),null);g.advance(100);assert.deepEqual(g.serialize(),end);}
 }
});
test('lock delay is 500ms and movement can only reset it fifteen times',()=>{
 const g=fixture({type:'O',rotation:0,x:4,y:20});g.advance(480);assert.equal(g.view().pieces,0);g.advance(20);assert.equal(g.view().pieces,1);
 const h=fixture({type:'O',rotation:0,x:4,y:20});for(let i=0;i<15;i++){h.advance(480);assert.equal(h.move(i%2?-1:1),true);assert.equal(h.view().pieces,0);}
 assert.equal(h.view().lockResets,15);h.advance(480);h.move(-1);h.advance(20);assert.equal(h.view().pieces,1);
});
test('same elapsed time partitioned at 30/60/120Hz produces equivalent simulation',()=>{
 const states=[];for(const rate of [30,60,120]){const g=M.create({seed:39});for(let i=0;i<rate*12;i++)g.advance(1000/rate);const s=g.serialize();assert.ok(s.remainder<1e-6);s.remainder=0;states.push(s);}
 assert.deepEqual(states[0],states[1]);assert.deepEqual(states[1],states[2]);
});
test('save corruption, sparse grids and future schema reject without touching input',()=>{
 const good=fresh(),bad=[null,{}, {...good,version:2},{...good,seed:-1},{...good,grid:Array(22)},{...good,queue:Array(8)},{...good,queue:['bad']},{...good,score:-1},{...good,active:{type:'X',rotation:0,x:0,y:0}},{...good,active:{...good.active,x:999}},{...good,status:'won'},{...good,lockResets:16},{...good,remainder:100},{...good,elapsedMs:1}];
 for(const x of bad)assert.equal(M.restore(x),null);
 const g=M.restore(good);good.grid[21][0]='Z';assert.equal(g.view().grid[21][0],0);const v=g.view();v.grid[21][0]='Z';assert.equal(g.view().grid[21][0],0);
});
test('soft-drop timing mode and deterministic progression survive serialization',()=>{
 const a=M.create({seed:77});a.advance(233,true);const b=M.restore(a.serialize());assert.ok(b);assert.deepEqual(a.serialize(),b.serialize());
 for(let i=0;i<30;i++){a.advance(31,i%2===0);b.advance(31,i%2===0);assert.deepEqual(a.serialize(),b.serialize());}
});
test('invalid deltas, terminal timers and numeric inputs do not advance',()=>{
 const g=M.create({seed:3}),before=g.serialize();for(const dt of [-1,NaN,Infinity,60001])g.advance(dt);assert.equal(g.move(0),false);assert.equal(g.rotate(3),false);assert.deepEqual(g.serialize(),before);
});

test('seeded mixed-play invariants and bit-exact restore across 100 campaigns',()=>{
 let random=993;const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random;};
 for(let seed=0;seed<100;seed++){
  const a=M.create({seed,mode:'endless'});
  for(let step=0;step<500&&a.view().status==='playing';step++){
   const b=M.restore(a.serialize());assert.ok(b);const n=next()%7;
   const act=g=>n<2?g.move(n?-1:1):n<4?g.rotate(n===2?1:-1):n===4?g.hardDrop():n===5?g.hold():g.advance(100,true);
   assert.deepEqual(act(a),act(b));assert.deepEqual(a.serialize(),b.serialize());assert.ok(M.validSave(a.serialize()));
   const v=a.view();assert.equal(v.grid.length,22);assert.equal(v.grid.every(r=>r.length===10),true);if(v.status==='playing')assert.equal(M.collision(v.grid,v.active),false);
  }
 }
});

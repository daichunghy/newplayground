const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../scripts/games/marble-trail-model.js');
function fixture(colors,positions,extra={}) {
  const g=M.create({seed:444});
  g.state.train=colors.map((color,i)=>({id:i+1,color,s:positions?.[i]??200+i*M.SPACING,power:null}));
  g.state.nextId=colors.length+1;g.state.pending=[];g.state.bullet=null;g.state.current=0;g.state.next=1;
  Object.assign(g.state,extra);g.drainEvents();return g;
}
function advance(g,seconds,rate=120){for(let i=0;i<Math.round(seconds*rate);i++)g.advance(1/rate);}
function invariant(g) {
  const s=g.state;assert.ok(s.train.every((b,i)=>Number.isFinite(b.s)&&(!i||b.s-s.train[i-1].s>=M.SPACING-.051)));
  assert.equal(new Set(s.train.map(b=>b.id)).size,s.train.length);
  assert.ok(s.train.length<=160);assert.ok(M.restore(g.serialize()),'every live model serializes into a valid restorable round');
}

test('three authored paths use arc length with finite positions and distinct routes',()=>{
  assert.equal(M.LEVELS.length,3);
  const lengths=[];
  M.PATHS.forEach((p,index)=>{
    lengths.push(Math.round(p.length));assert.ok(p.length>1300);assert.ok(p.samples.length>200);
    for(let s=0;s<p.length-10;s+=10){const a=p.point(s),b=p.point(s+10);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<=10.001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>9.5);}
    const l=M.LEVELS[index];assert.ok(p.samples.every(p=>Math.hypot(p.x-l.shooter.x,p.y-l.shooter.y)>45),'track does not intersect shooter');
  });assert.equal(new Set(lengths).size,3);
});
test('same seed creates same train/ammo, different seeds vary train',()=>{
  assert.deepEqual(M.create({seed:123}).serialize(),M.create({seed:123}).serialize());
  assert.notDeepEqual(M.create({seed:123}).state.train,M.create({seed:124}).state.train);
});
test('simulation is identical at 30, 60, 120 and 144 Hz for equal elapsed time',()=>{
  const games=[30,60,120,144].map(rate=>{const g=M.create({seed:8});advance(g,8,rate);return g;});
  for(const g of games){assert.equal(g.state.ticks,960);g.state.accumulator=0;}
  games.slice(1).forEach(g=>assert.deepEqual(g.serialize(),games[0].serialize()));
});
test('bad deltas ignored; long deltas bounded to 30 fixed steps',()=>{
  const g=M.create();const before=g.serialize();[NaN,Infinity,-1,0].forEach(d=>g.advance(d));assert.deepEqual(g.serialize(),before);
  assert.equal(g.advance(100),30);assert.equal(g.state.ticks,30);
});
test('tail movement uses pixels per second and inserts new balls with spacing',()=>{
  const g=M.create({seed:10});const head=g.state.train.at(-1).s;advance(g,1);assert.ok(Math.abs(g.state.train.at(-1).s-head-g.level.speed)<1e-6);invariant(g);
});
test('before and after insertion preserve order and stop pushing once a gap absorbs space',()=>{
  const g=fixture([0,1,2],[100,126,210]);g.insert(1,-1,2);assert.deepEqual(g.state.train.map(b=>b.color),[0,2,1,2]);assert.deepEqual(g.state.train.map(b=>b.s),[100,126,152,210]);
  const h=fixture([0,1,2],[100,126,152]);h.insert(1,1,0);assert.deepEqual(h.state.train.map(b=>b.color),[0,1,0,2]);assert.deepEqual(h.state.train.map(b=>b.s),[100,126,152,178]);
});
test('inserted third color clears only connected match, counts points and progress',()=>{
  const g=fixture([1,0,0,2]);g.insert(2,1,0);assert.deepEqual(g.state.train.map(b=>b.color),[1,2]);assert.equal(g.state.score,30);assert.equal(g.state.cleared,3);assert.equal(g.state.pending.length,1);
});
test('same-colored balls separated by gap cannot clear together',()=>{
  const g=fixture([0,0,0],[100,126,205]);assert.equal(g.resolve(0),false);assert.equal(g.state.train.length,3);assert.equal(g.state.score,0);
});
test('matching front edge pulls backward while differently colored front stops',()=>{
  const g=fixture([0,0],[100,220]);g.advance(M.STEP);assert.ok(g.state.train.find(b=>b.id===2).s<220);assert.ok(g.state.train.find(b=>b.id===1).s>100);
  const h=fixture([0,1],[100,220]);h.advance(M.STEP);assert.equal(h.state.train.find(b=>b.id===2).s,220);assert.ok(h.state.train.find(b=>b.id===1).s>100);
});
test('gap reconnect cascade awards ×2, then finishes without phantom respawn when closed',()=>{
  const g=fixture([1,0,0,0,1,1],[100,126,152,178,204,230],{cleared:27});
  assert.equal(g.resolve(2),true);assert.equal(g.state.spawnClosed,true);assert.equal(g.state.train.length,3);
  advance(g,1);assert.equal(g.state.status,'won');assert.equal(g.state.bestCombo,2);assert.equal(g.state.score,30+60+250);assert.equal(g.state.train.length,0);assert.equal(g.state.pending.length,0);
});
test('three-stage cascade carries lineage across nested gaps',()=>{
  const g=fixture([2,2,1,0,0,0,1,1,2],[100,126,152,178,204,230,256,282,308],{cleared:27});g.resolve(4);advance(g,2);
  assert.equal(g.state.status,'won');assert.equal(g.state.bestCombo,3);assert.equal(g.state.score,30+60+90+250);
});
test('nonmatching edges reconnect naturally without clearing',()=>{
  const g=fixture([0,1],[100,153]);advance(g,.5);assert.equal(g.state.cleared,0);assert.equal(g.state.train.length>=2,true);
});
test('power activates only on clear and timers last fixed duration',()=>{
  const g=fixture([0,0,0,1]);g.state.train[1].power='slow';g.resolve(1);assert.equal(g.state.slow,600);advance(g,1);assert.equal(g.state.slow,480);
  const h=fixture([0,0,0,1]);h.state.train[1].power='reverse';h.resolve(1);assert.equal(h.state.reverse,300);const head=h.state.train.at(-1).s;advance(h,.5);assert.ok(h.state.train.at(-1).s<head);
});
test('spawn gate closes exactly on clear quota and cannot reopen',()=>{
  const g=fixture([0,0,0,1],[100,126,152,230],{cleared:27});g.resolve(1);assert.equal(g.state.spawnClosed,true);const count=g.state.train.length;advance(g,2);assert.equal(g.state.train.length,count);assert.equal(g.state.status,'playing');
});
test('empty early board replenishes; final empty board wins once and banks bonus once',()=>{
  const g=fixture([0,0,0]);g.resolve(1);assert.equal(g.state.status,'playing');g.advance(M.STEP);assert.equal(g.state.train.length,1);
  const h=fixture([0,0,0],undefined,{cleared:27});h.resolve(1);assert.equal(h.state.status,'won');const score=h.state.score;advance(h,5);h.checkEnd();assert.equal(h.state.score,score);
});
test('one bullet at a time, cooldown, swap and off-field misses',()=>{
  const g=fixture([0,1],[100,126]);assert.equal(g.shoot(Math.PI/2),true);assert.equal(g.shoot(0),false);assert.equal(g.state.shots,1);assert.equal(g.swap(),true);
  advance(g,1);assert.equal(g.state.bullet,null);assert.equal(g.state.cooldown,0);assert.equal(g.shoot(NaN),false);
});
test('swept segment-circle catches tunneling and selects nearest physical contact',()=>{
  assert.equal(M.segmentCircle({x:0,y:0},{x:100,y:0},{x:50,y:0},10),.4);
  assert.equal(M.segmentCircle({x:0,y:20},{x:100,y:20},{x:50,y:0},10),null);
  const g=fixture([0,1],[100,400]),p=g.path.point(100),n=g.path.tangent(100);
  const hit=g.firstHit({x:p.x-n.x*80,y:p.y-n.y*80},{x:p.x+n.x*80,y:p.y+n.y*80});assert.equal(hit.ball.id,1);
});
test('ray crosses a real empty path span but not occupied endpoints',()=>{
  const g=fixture([0,1],[100,260]),p=g.path.point(180),t=g.path.tangent(180);
  assert.equal(g.crossesGap({x:p.x+t.y*50,y:p.y-t.x*50},{x:p.x-t.y*50,y:p.y+t.x*50}),true);
  const h=fixture([0,1],[100,126]);assert.equal(h.crossesGap({x:0,y:0},{x:700,y:500}),false);
});
test('gap bonus only awarded with a successful insertion match',()=>{
  const g=fixture([0,0,1]);g.insert(1,1,0,true);assert.equal(g.state.score,90);
  const h=fixture([0,1]);h.insert(0,1,2,true);assert.equal(h.state.score,0);
});
test('loss blocks actions, retry preserves completed-level score and same round seed',()=>{
  const g=M.create({level:1,seed:88,score:900});g.state.train.at(-1).s=g.path.length;g.checkEnd();assert.equal(g.state.status,'lost');assert.equal(g.shoot(1),false);assert.equal(g.swap(),false);
  const h=g.retry();assert.equal(h.state.score,900);assert.deepEqual(h.serialize(),M.create({level:1,seed:88,score:900}).serialize());
});
test('campaign advances only after complete clear and stops after all three routes',()=>{
  const g=M.create({seed:5});assert.equal(g.nextLevel(),null);
  let current=g;for(let level=0;level<3;level++){current.state.train=[];current.state.cleared=current.level.target;current.state.spawnClosed=true;current.checkEnd();assert.equal(current.state.status,'won');if(level<2){const next=current.nextLevel();assert.equal(next.state.level,level+1);assert.equal(next.state.levelStartScore,current.state.score);current=next;}else assert.equal(current.nextLevel(),null);}
});
test('save/resume preserves in-flight projectile, fractional timestep and random sequence',()=>{
  const g=M.create({seed:345});g.shoot(0);g.advance(.019);const h=M.restore(g.serialize());assert.ok(h);assert.deepEqual(h.serialize(),g.serialize());
  advance(g,2,60);advance(h,2,60);assert.deepEqual(h.serialize(),g.serialize());
});
test('closed-round ammo never uses extinct colors',()=>{
  const g=fixture([2,2],[100,126],{cleared:30,spawnClosed:true,current:0,next:1});g.normalizeAmmo();assert.equal(g.state.current,2);assert.equal(g.state.next,2);for(let i=0;i<20;i++)assert.equal(g.pickAmmo(),2);
});
test('corrupt, future, nonfinite and structurally impossible saves are rejected',()=>{
  const valid=M.create({seed:9}).serialize();
  const edits=[s=>s.version=2,s=>s.rules='other',s=>s.level=20,s=>s.rng=0,s=>s.current=-1,s=>s.train[1].id=s.train[0].id,s=>s.train[1].s=s.train[0].s,s=>s.train[0].s=NaN,s=>s.bullet={x:1,y:2,dx:9,dy:0,color:0,gap:false},s=>s.accumulator=20,s=>s.spawnClosed=true,s=>s.pending=[{left:55,right:66,depth:2}],s=>s.status='won',s=>s.train=Array(161).fill(s.train[0])];
  for(const edit of edits){const s=JSON.parse(JSON.stringify(valid));edit(s);assert.equal(M.restore(s),null);}
  for(const raw of [null,{},'x',[]])assert.equal(M.restore(raw),null);
});
test('300 seeded actions retain spacing, valid saves, finite state and bounded resources',()=>{
  for(let seed=1;seed<=12;seed++) {
    const g=M.create({level:seed%3,seed});
    for(let turn=0;turn<300&&g.state.status==='playing';turn++) {
      if(turn%3===0)g.swap();g.shoot((turn*2.399963+seed)% (Math.PI*2));g.advance(.1);g.drainEvents();invariant(g);
    }
  }
});
test('repeated gap insert/clear cannot accumulate duplicate pending links or poison saves',()=>{
  const g=fixture([0,1],[100,1600]);
  for(let n=0;n<200;n++){g.insert(0,1,2);g.insert(1,1,2);g.insert(2,1,2);assert.ok(g.state.pending.length<=1);}
  assert.ok(M.restore(g.serialize()));
});

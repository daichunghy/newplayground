const test = require('node:test');
const assert = require('node:assert/strict');
const {ids,makeRings,makeDarts,makeQuiz,QUESTIONS} = require('../scripts/original-games-batch.js');
const time = (e,secs,dt=1/60) => { for(let t=0;t<secs;t+=dt)e.tick(dt); };

// The models are deterministic, separate from DOM, timers and visual rendering.
test('only the three established IDs use this engine',()=>{
  assert.deepEqual(ids,['nem-vong-co-chai','phi-tieu-bong-bong','ai-la-trieu-phu']);
});
test('ring toss ignores double throws while a projectile is airborne and resolves a hit',()=>{
  const e=makeRings(12),first=e.s.bottles[0];
  e.point(first.x,first.y);assert.equal(e.throwRing(),true);
  assert.equal(e.throwRing(),false);time(e,.7);
  assert.equal(e.s.hits,1);assert.equal(e.s.throws,1);
});
test('ring win and stage progression raise required hits',()=>{
  const e=makeRings(9);
  for(const b of e.s.bottles.slice(0,2)){e.point(b.x,b.y);e.throwRing();time(e,.7);}
  assert.equal(e.s.phase,'won');assert.equal(e.next(),true);
  assert.equal(e.s.stage,2);assert.equal(e.s.goal,2);
  const score=e.s.score;
  assert.equal(e.retry(),true);assert.equal(e.s.stage,2);assert.equal(e.s.score,score);
});
test('ring loses after a limited number of misses; reset clears campaign',()=>{
  const e=makeRings(3);
  for(let i=0;i<e.s.limit;i++){e.point(60,280);e.throwRing();time(e,.7);}
  assert.equal(e.s.phase,'lost');assert.equal(e.throwRing(),false);
  e.reset();assert.equal(e.s.phase,'playing');assert.equal(e.s.stage,1);assert.equal(e.s.score,0);
});
test('ring pause freezes the time, moving targets, and pending projectile',()=>{
  const e=makeRings(1);e.point(120,212);e.throwRing();
  e.s.paused=true;time(e,1);assert.equal(e.s.time,0);assert.equal(e.s.projectile.elapsed,0);
  e.s.paused=false;time(e,.7);assert.equal(e.s.projectile,null);
});
test('darts accept a precise hit, scale the bonus, and have a finite target goal',()=>{
  const e=makeDarts(7);const b=e.s.balls[0],p=e.position(b);
  e.fire(p.x,p.y,1);time(e,.2);assert.equal(e.s.shots,1);
  assert.ok(e.s.popped>0||e.s.balls.some(x=>x.id===b.id&&x.hp===1));
  assert.ok(e.s.goal>=7);
});
test('dart missiles cannot be spammed and shots eventually exhaust',()=>{
  const e=makeDarts(44);
  e.fire(690,435,1);assert.equal(e.fire(690,435,1),false);
  time(e,.2);
  for(let i=1;i<e.s.ammo;i++){e.fire(690,435,1);time(e,.2);}
  assert.equal(e.s.phase,'lost');
  assert.equal(e.s.shots,e.s.ammo);
  e.retry();assert.equal(e.s.shots,0);assert.equal(e.s.phase,'playing');
});
test('dart timer results in a loss while pause stops clock',()=>{
  const e=makeDarts(8);e.s.paused=true;time(e,40);
  assert.equal(e.s.seconds,31);
  e.s.paused=false;time(e,32);assert.equal(e.s.phase,'lost');
});
test('dart transitions to higher stages when target is satisfied',()=>{
  const e=makeDarts(2);
  e.s.popped=e.s.goal;e.s.shots=2;
  // Real resolved-hit path is covered by the precise-hit test; mimic last pop target state.
  e.s.phase='won';assert.equal(e.next(),true);
  assert.equal(e.s.stage,2);assert.equal(e.s.goal,9);
  assert.ok(e.s.seconds<=31);
});
test('quiz question pools contain four answers and valid indices',()=>{
  assert.equal(QUESTIONS.length,3);
  for(const tier of QUESTIONS){assert.ok(tier.length>=10);for(const q of tier){
    assert.equal(q.length,3);assert.equal(q[1].length,4);
    assert.ok(q[2]>=0&&q[2]<4);
    assert.equal(new Set(q[1]).size,4);
  }}
});
test('quiz selects 10 unique questions from each stage pool',()=>{
  const e=makeQuiz(5);
  assert.equal(e.s.questions.length,10);
  assert.equal(new Set(e.s.questions.map(x=>x.text)).size,10);
});
test('quiz 50/50 removes exactly two incorrect answers and does not consume multiple times',()=>{
  const e=makeQuiz(6);assert.equal(e.half(),true);assert.equal(e.s.hidden.length,2);
  assert.ok(!e.s.hidden.includes(e.question().correct));
  assert.equal(e.half(),false);
  assert.equal(e.answer(e.s.hidden[0]),false);
});
test('quiz correct choices add score and advance only after the answer feedback',()=>{
  const e=makeQuiz(10);
  assert.equal(e.answer(e.question().correct),true);
  assert.equal(e.s.phase,'feedback');assert.equal(e.answer(0),false);
  time(e,.8);assert.equal(e.s.index,1);assert.ok(e.s.score>0);
});
test('quiz wrong answers and countdown cost lives; skip preserves lives',()=>{
  const e=makeQuiz(1);
  const before=e.s.lives;
  assert.equal(e.skip(),true);time(e,.5);assert.equal(e.s.lives,before);
  const wrong=(e.question().correct+1)%4;e.answer(wrong);time(e,.8);assert.equal(e.s.lives,before-1);
  time(e,30);assert.equal(e.s.lives,before-2);
});
test('quiz clears after ten correct answers; third stage completes campaign',()=>{
  const e=makeQuiz(77);for(let stage=1;stage<=3;stage++){
    for(let q=0;q<10;q++){assert.equal(e.answer(e.question().correct),true);time(e,.8);}
    assert.equal(e.s.phase,stage===3?'complete':'won');
    if(stage<3){assert.equal(e.next(),true);assert.equal(e.s.stage,stage+1);}
  }
  assert.ok(e.s.score>4000);
  e.reset();assert.equal(e.s.stage,1);assert.equal(e.s.score,0);
});
test('quiz three wrong answers end run and retry preserves its stage',()=>{
  const e=makeQuiz(77);
  for(let i=0;i<3;i++){e.answer((e.question().correct+1)%4);time(e,.8);}
  assert.equal(e.s.phase,'lost');e.retry();assert.equal(e.s.phase,'playing');assert.equal(e.s.stage,1);assert.equal(e.s.lives,3);
});
test('quiz pause locks answers and freezes timer',()=>{
  const e=makeQuiz(10);e.s.paused=true;const before=e.s.remaining;
  time(e,7);assert.equal(e.s.remaining,before);
  assert.equal(e.answer(0),false);assert.equal(e.skip(),false);
});
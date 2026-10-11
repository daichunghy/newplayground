const test = require('node:test');
const assert = require('node:assert/strict');
const {makeRings,makeDarts,makeQuiz,QUESTIONS} = require('../scripts/original-games-batch.js');
const advance=(model,seconds)=>{for(let elapsed=0;elapsed<seconds;elapsed+=1/60)model.tick(1/60);};
const hitRing=(e,b)=>{e.point(b.x,b.y);assert.equal(e.throwRing(),true);advance(e,.72);};
const missRing=e=>{e.point(55,282);assert.equal(e.throwRing(),true);advance(e,.72);};
const missDart=e=>{assert.equal(e.fire(690,435,1),true);advance(e,.23);};
const respond=(e,correct=true)=>{
  const q=e.question();
  assert.ok(q);
  assert.equal(e.answer(correct?q.correct:(q.correct+1)%4),true);
  advance(e,correct?1.3:2.35);
};

test('ring medals reflect accuracy, without retaining a paused reset',()=>{
  const e=makeRings(17);
  hitRing(e,e.s.bottles[0]);hitRing(e,e.s.bottles[1]);
  assert.equal(e.s.phase,'won');
  assert.equal(e.s.stageMedal,3);
  assert.equal(e.s.medals,3);
  e.s.paused=true;e.reset();
  assert.equal(e.s.paused,false);
  assert.equal(e.s.stage,1);
  assert.equal(e.s.medals,3,'cumulative medals are history, not an unearned current award');
});

test('ring special targets grant a ring, while misses break combo',()=>{
  const e=makeRings(3);
  hitRing(e,e.s.bottles[0]);hitRing(e,e.s.bottles[1]);
  assert.equal(e.next(),true);
  const bonus=e.s.bottles.find(b=>b.bonus);
  assert.ok(bonus);
  const available=e.s.limit;
  const current=e.bottleX(bonus);
  e.point(current-e.s.wind,bonus.y);
  e.throwRing();advance(e,.72);
  assert.equal(e.s.hits,1);
  assert.equal(e.s.limit,available+1);
  assert.ok(e.s.score>0);
  missRing(e);
  assert.equal(e.s.combo,0);
});

test('ring repeated retry rolls score back to the same checkpoint',()=>{
  const e=makeRings(6);
  hitRing(e,e.s.bottles[0]);
  assert.ok(e.s.score>0);
  while(e.s.phase==='playing')missRing(e);
  assert.equal(e.s.phase,'lost');
  assert.equal(e.retry(),true);
  assert.equal(e.s.score,0);
  while(e.s.phase==='playing')missRing(e);
  e.retry();
  assert.equal(e.s.score,0);
});

test('dart hit testing keeps desktop shots distinct from misses',()=>{
  const e=makeDarts(9),b=e.s.balls[0],p=e.position(b);
  e.fire(p.x+72,p.y,1);advance(e,.25);
  assert.equal(e.s.popped,0);
  assert.equal(e.s.accurate,0);
  assert.equal(e.s.combo,0);
});

test('dart clock balloon is a real time pickup',()=>{
  const e=makeDarts(14),b=e.s.balls[0];
  b.kind='clock';b.hp=1;e.s.seconds=7;
  const p=e.position(b);
  e.fire(p.x,p.y,1);advance(e,.25);
  assert.equal(e.s.timeBonuses,1);
  assert.ok(e.s.seconds>9,'bonus must exceed flight time');
});

test('dart fired before expiry resolves before deadline loss',()=>{
  const e=makeDarts(5);
  e.s.seconds=.045;
  const p=e.position(e.s.balls[0]);
  e.fire(p.x,p.y,1);
  advance(e,.055);
  assert.equal(e.s.seconds,0);
  assert.equal(e.s.phase,'playing');
  assert.ok(e.s.dart);
  advance(e,.25);
  assert.equal(e.s.dart,null);
  assert.equal(e.s.phase,'lost');
});

test('dart retry cannot farm points by repeating the same stage',()=>{
  const e=makeDarts(2);
  const p=e.position(e.s.balls[0]);
  e.fire(p.x,p.y,1);advance(e,.25);
  assert.ok(e.s.score>0);
  while(e.s.phase==='playing')missDart(e);
  assert.equal(e.s.phase,'lost');
  e.retry();assert.equal(e.s.score,0);
  while(e.s.phase==='playing')missDart(e);
  e.retry();assert.equal(e.s.score,0);
});

test('quiz answers are shuffled with matching correctness and specific explanations',()=>{
  const e=makeQuiz(7);
  for(let stage=0;stage<3;stage++){
    for(const q of e.s.questions){
      const original=QUESTIONS[stage].find(x=>x[0]===q.text);
      assert.ok(original);
      assert.equal(q.choices[q.correct],original[1][original[2]]);
      assert.ok(q.explanation.length>=15);
    }
    for(let i=0;i<10;i++)respond(e);
    if(stage<2)assert.equal(e.next(),true);
  }
  assert.equal(e.s.phase,'complete');
  assert.equal(e.s.stars,9);
});

test('quiz faster correct responses earn extra points',()=>{
  const fast=makeQuiz(42),slow=makeQuiz(42);
  slow.tick(.05);advance(slow,8);
  fast.answer(fast.question().correct);
  slow.answer(slow.question().correct);
  assert.ok(fast.s.score>slow.s.score);
});

test('quiz wrong answers give the correct option and reason',()=>{
  const e=makeQuiz(10),q=e.question();
  e.answer((q.correct+1)%4);
  assert.match(e.s.feedback,/Đáp án/);
  assert.ok(e.s.feedback.includes(q.choices[q.correct]));
  assert.ok(e.s.feedback.includes(q.explanation));
});

test('quiz retry in stage two preserves prior stage, points and lifeline checkpoint',()=>{
  const e=makeQuiz(51);
  for(let i=0;i<10;i++)respond(e);
  const earned=e.s.score;
  assert.equal(e.next(),true);
  assert.equal(e.s.stage,2);
  const half=e.s.lifelines.half;
  e.half();
  respond(e);
  for(let i=0;i<3;i++)respond(e,false);
  assert.equal(e.s.phase,'lost');
  assert.equal(e.retry(),true);
  assert.equal(e.s.stage,2);
  assert.equal(e.s.score,earned);
  assert.equal(e.s.lifelines.half,half);
  assert.ok(e.s.lives>=2);
});

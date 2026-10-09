const test=require('node:test'),assert=require('node:assert/strict'),M=require('../scripts/games/chem-hoa-qua-model.js');
test('same seed produces same launches and invalid times are rejected',()=>{const a=M.create({seed:42}),b=M.create({seed:42});assert.deepEqual(a.view(),b.view());a.launch();b.launch();for(let i=0;i<100;i++){a.advance();b.advance();}assert.deepEqual(a.view(),b.view());assert.throws(()=>a.advance(.1),RangeError);const before=a.view().objects[0];assert.ok(before);const y=before.y,vy=before.vy;a.advance(M.STEP);assert.ok(Math.abs(a.view().objects.find(o=>o.id===before.id).y-(y+vy*M.STEP))<1e-9);});
test('swipe slices fruit, awards points, and bomb ends round',()=>{const g=M.create({seed:7});g.launch();for(let i=0;i<60;i++)g.advance();const fruit=g.view().objects.find(o=>o.kind==='fruit');const bomb=g.view().objects.find(o=>o.kind==='bomb');assert.ok(fruit&&bomb);assert.ok(g.slice(fruit.x-40,fruit.y,fruit.x+40,fruit.y).hit>=1);assert.ok(g.view().score>=10);g.slice(bomb.x-40,bomb.y,bomb.x+40,bomb.y);assert.equal(g.view().status,'lost');});
test('three missed fruit end game and restart is deterministic',()=>{const g=M.create({seed:91});g.launch();for(let i=0;i<1200&&g.view().status==='playing';i++)g.advance();assert.equal(g.view().status,'lost');assert.equal(g.view().misses,3);const first=g.restart(91);assert.equal(first.status,'ready');g.launch();for(let i=0;i<30;i++)g.advance();const a=g.view();g.restart(91);g.launch();for(let i=0;i<30;i++)g.advance();assert.deepEqual(g.view(),a);});
test('round duration ends cleanly and invalid options fail',()=>{assert.throws(()=>M.create({roundSeconds:2}),RangeError);const g=M.create({roundSeconds:10});g.launch();for(let i=0;i<600&&g.view().status==='playing';i++){g.advance();for(const o of g.view().objects)if(o.kind==='fruit')g.slice(o.x,o.y,o.x+.1,o.y+.1);}assert.equal(g.view().status,'won');assert.equal(g.view().timeLeft,0);});

test('invalid seeds and non-finite slash coordinates do not mutate a run',()=>{assert.throws(()=>M.create({seed:-1}),RangeError);const g=M.create({seed:9});g.launch();for(let i=0;i<30;i++)g.advance();const before=g.view();assert.equal(g.slice(NaN,0,10,10).hit,0);assert.deepEqual(g.view(),before);assert.throws(()=>g.restart(-2),RangeError);});

test('three authored courses change pace, hazards, and fruit motion at fixed checkpoints',()=>{
  const g=M.create({seed:2026});
  assert.deepEqual(M.COURSES.map(course=>course.name),['Mầm Non','Gió Ngang','Mưa Quả']);
  assert.ok(M.COURSES[0].spawnEvery>M.COURSES[1].spawnEvery&&M.COURSES[1].spawnEvery>M.COURSES[2].spawnEvery);
  assert.ok(M.COURSES[0].bombChance<M.COURSES[1].bombChance&&M.COURSES[1].bombChance<M.COURSES[2].bombChance);
  assert.ok(M.COURSES[0].sway<M.COURSES[1].sway&&M.COURSES[1].sway<M.COURSES[2].sway);
  g.launch();
  const checkpoints=[];
  for(let i=0;i<3600;i++){
    const view=g.advance();
    for(const object of view.objects)if(object.kind==='fruit')g.slice(object.x,object.y,object.x+.1,object.y+.1);
    if(i===1198||i===2398||i===3599)checkpoints.push(g.view());
  }
  assert.deepEqual(checkpoints.map(view=>view.stageIndex),[0,1,2]);
  assert.deepEqual(checkpoints.map(view=>view.stageNumber),[1,2,3]);
  assert.deepEqual(checkpoints.map(view=>view.stage.name),['Mầm Non','Gió Ngang','Mưa Quả']);
  assert.equal(checkpoints[2].status,'won');
});

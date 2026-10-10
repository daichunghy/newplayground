const test=require('node:test');
const assert=require('node:assert/strict');
const rhythm=require('../scripts/games/phim-sao.js');
const claw=require('../scripts/games/moc-qua.js');
const dig=require('../scripts/games/dao-ngoc.js');

function advanceTo(game,target){let guard=0;while(game.view().t+.025<target&&guard++<2500)game.advance(.025);assert.ok(guard<2500,'time progressed');}

test('Phím Sao has an accurate 36-note finish, graduated tempo and restart',()=>{
  const game=rhythm.create();assert.equal(game.view().status,'ready');
  assert.ok(game.start());const notes=game.view().notes;
  assert.equal(notes.length,36);
  assert.ok(notes[12].time-notes[11].time<notes[1].time-notes[0].time);
  for(const note of notes){advanceTo(game,note.time);assert.equal(game.hit(note.lane),true,'correct lane inside timing window');}
  assert.equal(game.view().status,'won');assert.equal(game.view().hits,36);
  assert.ok(game.view().score>3000);game.restart();assert.equal(game.view().score,0);assert.equal(game.view().status,'ready');
});

test('Phím Sao penalizes wrong lanes and cannot advance when paused',()=>{
  const game=rhythm.create();game.start();game.advance(.06);game.pause();
  const t=game.view().t;game.advance(.08);assert.equal(game.view().t,t);
  game.resume();for(let k=0;k<3;k++)assert.equal(game.hit(3),false);
  assert.equal(game.view().status,'lost');assert.equal(game.view().lives,0);
});

function driveClawUntil(game, predicate, limit=800){for(let i=0;i<limit;i++){if(predicate(game.view()))return true;game.advance(.05);}return predicate(game.view());}
test('Móc Quà can clear all three authored prize stages with precise aim',()=>{
  const game=claw.create();game.start();
  for(let stage=0;stage<3;stage++){
    for(let i=0;i<3;i++){
      const v=game.view(),p=v.prizes.find(item=>!item.taken);
      assert.ok(p);assert.equal(game.target(p.x),true);
      assert.ok(driveClawUntil(game,u=>Math.abs(u.cursor-p.x)<1&&u.phase==='aim'));
      assert.ok(game.grab());
      assert.ok(driveClawUntil(game,u=>u.status==='won'||u.status==='lost'||u.phase==='aim'));
      assert.notEqual(game.view().status,'lost');
    }
  }
  assert.equal(game.view().status,'won');assert.equal(game.view().stage,2);assert.ok(game.view().score>900);
  game.restart();assert.equal(game.view().status,'ready');
});
test('Móc Quà has a real failure state after five missed crane drops',()=>{
  const game=claw.create();game.start();
  for(let i=0;i<5;i++){
    game.target(690);assert.ok(driveClawUntil(game,v=>Math.abs(v.cursor-690)<1));
    assert.ok(game.grab());
    assert.ok(driveClawUntil(game,v=>v.phase==='aim'||v.status==='lost'));
  }
  assert.equal(game.view().status,'lost');assert.equal(game.view().won,0);
});
test('Đào Ngọc collects gems, opens the exit, and restarts from the start',()=>{
  const m=dig.create([['######','#P*.E#','######']]);m.start();
  assert.equal(m.move('right'),true);assert.equal(m.view().gems,0);
  assert.equal(m.move('right'),true);assert.equal(m.move('right'),true);
  assert.equal(m.view().status,'won');m.restart();assert.equal(m.view().status,'ready');
  assert.equal(m.view().gems,1);
});
test('Đào Ngọc loses when rock falls onto player after a legal move',()=>{
  const m=dig.create([['######','# O  #','#P *.E#','######']]);m.start();
  assert.ok(m.move('right'));assert.equal(m.view().status,'lost');
  assert.match(m.view().last,/Đá rơi/);
});
test('Đào Ngọc treats walls as impassable and cannot escape before collecting gems',()=>{
  const m=dig.create([['######','#P.E*#','######']]);m.start();
  assert.equal(m.move('up'),false);
  m.move('right');assert.equal(m.move('right'),false);
  assert.equal(m.view().status,'playing');
});

test('Đào Ngọc all three shipped maps have a legal, deterministic completion route',()=>{
  const model=dig.create();model.start();
  const paths=['RDDUURRRRRRDDDDDDDLLRRRRUUUUUUU','RRRRDDDDDRRDDRRRUUUUUUU','RRDDLDDDRRRRDDRRURRDLUUUUURUU'];
  const moves={R:'right',D:'down',L:'left',U:'up'};
  for(let level=0;level<3;level++){
    for(const ch of paths[level])assert.equal(model.move(moves[ch]),true,
      'cave '+(level+1)+' must accept '+ch+' at step '+model.view().steps+' state '+model.view().last);
    assert.equal(model.view().level,level===2?2:level+1,'cave advances correctly');
    assert.equal(model.view().status,level===2?'won':'playing');
  }
  assert.ok(model.view().score>500);
});

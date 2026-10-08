// Deterministic model reachability, not human playtesting or reference-game parity.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/marble-trail-model.js');
function finishRound(level,seed) {
  let game=M.create({level,seed}),turns=0;
  for(;turns<180&&game.state.status==='playing';turns++) {
    while(game.state.cooldown||game.state.bullet)game.advance(1/60);
    const origin=game.level.shooter,angles=[];
    for(const ball of game.state.train.filter(b=>b.s>=0)) {
      const p=game.path.point(ball.s),t=game.path.tangent(ball.s);
      for(const side of [-1,1])angles.push(Math.atan2(p.y+t.y*side*16-origin.y,p.x+t.x*side*16-origin.x));
    }
    let best=null;
    for(const swap of [false,true])for(const angle of angles) {
      const candidate=M.restore(game.serialize());if(swap)candidate.swap();candidate.shoot(angle);let frames=0;
      do{candidate.advance(1/60);frames++;}while(candidate.state.bullet&&frames<150&&candidate.state.status==='playing');
      for(let i=0;i<8&&candidate.state.status==='playing';i++){candidate.advance(1/60);frames++;}
      const train=candidate.state.train;let pairs=0;for(let i=1;i<train.length;i++)if(train[i].color===train[i-1].color)pairs++;
      const value=(candidate.state.status==='won'?1e8:candidate.state.status==='lost'?-1e8:0)+(candidate.state.cleared-game.state.cleared)*1000+pairs*15-(train.length-game.state.train.length)*10-(train.at(-1)?.s||0)*.02;
      if(!best||value>best.value)best={value,candidate,swap,angle,frames};
    }
    if(!best){game.advance(.25);continue;}
    // Replay the chosen input in the real model; prediction is not allowed to mutate it.
    if(best.swap)game.swap();assert.equal(game.shoot(best.angle),true);
    for(let i=0;i<best.frames;i++)game.advance(1/60);
    assert.deepEqual(game.serialize(),best.candidate.serialize());game.drainEvents();
  }
  return {game,turns};
}
for(let level=0;level<3;level++)test(`legal shot-and-swap sequence can finish original route ${level+1}`,()=>{
  const {game,turns}=finishRound(level,20261007);
  assert.equal(game.state.status,'won');assert.equal(game.state.train.length,0);assert.ok(game.state.cleared>=game.level.target);assert.ok(turns<180);assert.ok(M.restore(game.serialize()));
});

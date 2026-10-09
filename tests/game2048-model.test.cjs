const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/game2048-model.js');
const blank = () => Array.from({ length: 4 }, () => [0,0,0,0]);
const save = (board, props = {}) => ({ version:1, board, score:0, moves:0, won:false, keepPlaying:false, over:!M.hasMoves(board), ...props });
const restore = (board, props = {}, rng = () => 0) => M.restore(save(board, props), rng);
const clean = x => JSON.parse(JSON.stringify(x));
const directions = ['up','right','down','left'];
function referenceLine(line) {
  const out = [], values = line.filter(Boolean); let score = 0;
  while (values.length) {
    let n = values.shift();
    if (values[0] === n) { values.shift(); n *= 2; score += n; }
    out.push(n);
  }
  return { row: out.concat(Array(4-out.length).fill(0)), score };
}
test('independent oracle matches all 5184 line/direction cases', () => {
  const values = [0,2,4,8,16,32]; let cases = 0;
  for (let n=0;n<6**4;n++) {
    let q=n; const row=Array.from({length:4},()=>{const v=values[q%6];q=Math.floor(q/6);return v;});
    for(const dir of directions) {
      const board=blank(), expected=blank(); let input=row.slice();
      if(dir==='right'||dir==='down') input.reverse();
      const oracle=referenceLine(input); let output=oracle.row;
      if(dir==='right'||dir==='down') output.reverse();
      if(dir==='left'||dir==='right'){board[1]=row.slice();expected[1]=output;}
      else for(let i=0;i<4;i++){board[i][1]=row[i];expected[i][1]=output[i];}
      const result=M.slide(board,dir);
      assert.deepEqual(result.board,expected);assert.equal(result.scoreDelta,oracle.score);
      assert.equal(result.board.flat().reduce((a,b)=>a+b,0),board.flat().reduce((a,b)=>a+b,0));cases++;
    }
  }
  assert.equal(cases,5184);
});
test('merge destination metadata is correct right/down and results merge at most once',()=>{
  for(const dir of ['right','down']){
    const b=blank();if(dir==='right') b[0]=[2,2,2,2];else for(let i=0;i<4;i++)b[i][0]=2;
    const r=M.slide(b,dir); assert.equal(r.scoreDelta,8);
    assert.deepEqual(r.merges.map(x=>x.at),dir==='right'?[[0,3],[0,2]]:[[3,0],[2,0]]);
    assert.equal(r.movements.length,4); assert.deepEqual(b,dir==='right'?[[2,2,2,2],[0,0,0,0],[0,0,0,0],[0,0,0,0]]:[[2,0,0,0],[2,0,0,0],[2,0,0,0],[2,0,0,0]]);
  }
  const b=blank();b[0]=[2,2,4,0];assert.deepEqual(M.slide(b,'left').board[0],[4,4,0,0]);
});
test('initial state has two distinct tiles, RNG boundaries and column-first selection',()=>{
  for(const value of [0,.899999,.9,1,NaN,Infinity,-2]){
    const g=M.create(()=>value), s=g.state();assert.equal(s.board.flat().filter(Boolean).length,2);
    assert.ok(s.board.flat().filter(Boolean).every(n=>n===(Number.isFinite(value)&&value>=.9?4:2)));
    assert.equal(s.score,0);assert.equal(s.status,'playing');
  }
  let samples=[.1,.2,.95,.9999];const g=M.create(()=>samples.shift());
  assert.equal(g.state().board[3][0],2);assert.equal(g.state().board[3][3],4);
});
test('no-op and invalid direction do not spawn, score, move count or consume RNG',()=>{
  const b=blank();b[0]=[2,4,8,16];let calls=0;const g=restore(b,{},()=>{calls++;return 0;});
  const before=g.serialize();assert.equal(g.move('left').changed,false);assert.equal(g.move('bad').changed,false);
  assert.deepEqual(g.serialize(),before);assert.equal(calls,0);
});
test('valid move spawns once, preserves mass plus spawn, and reports score',()=>{
  const b=blank();b[0]=[2,2,4,0];let calls=0;const g=restore(b,{},()=>{calls++;return 0;});
  const r=g.move('left');assert.equal(r.changed,true);assert.equal(r.score,4);assert.equal(r.moves,1);assert.equal(calls,2);
  assert.equal(r.board.flat().reduce((a,b)=>a+b,0),10);assert.deepEqual(r.spawned,{at:[1,0],value:2});
});
test('win stops moves, continue persists immediately, and 4096 retains won state',()=>{
  const b=blank();b[0]=[1024,1024,0,0];const g=restore(b);
  assert.equal(g.move('left').status,'won');const before=g.serialize();assert.equal(g.move('right').changed,false);assert.deepEqual(g.serialize(),before);
  assert.equal(g.continueGame(),true);assert.equal(g.continueGame(),false);assert.equal(g.serialize().keepPlaying,true);
  const resumed=M.restore(g.serialize());assert.equal(resumed.state().status,'playing');
  const c=blank();c[0]=[2048,2048,0,0];const larger=restore(c,{won:true,keepPlaying:true});larger.move('left');
  assert.equal(larger.state().board[0][0],4096);assert.equal(larger.state().won,true);assert.ok(M.restore(larger.serialize()));
});
test('loss is full board without orthogonal merge; terminal input is locked',()=>{
  const dead=[[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]];assert.equal(M.hasMoves(dead),false);
  const g=restore(dead);assert.equal(g.state().status,'lost');assert.equal(g.move('up').changed,false);assert.equal(g.continueGame(),false);
  const b=clean(dead);b[0][0]=4;assert.equal(M.hasMoves(b),true);b[0][0]=0;assert.equal(M.hasMoves(b),true);
});
test('a move causing win and loss retains both flags and loss has display priority',()=>{
  const b=[[1024,1024,8,16],[8,16,32,64],[16,32,64,128],[32,64,128,256]];
  const g=restore(b,{},()=>.99);const r=g.move('left');assert.equal(r.won,true);assert.equal(r.over,true);assert.equal(r.status,'lost');
});
test('corrupt, sparse and inconsistent saved states reject; valid copies are independent',()=>{
  const g=M.create(()=>0), good=g.serialize();assert.ok(M.restore(good));
  const bads=[null,{}, {...good,version:3},{...good,board:Array(4)},{...good,board:[Array(4),[0,0,0,0],[0,0,0,0],[2,2,0,0]]},
    {...good,undo:{...good,draws:[1]}},{...good,randomReplay:[NaN]},{...good,score:NaN},{...good,score:-4},{...good,score:3},{...good,moves:-1},{...good,won:true},{...good,keepPlaying:true},{...good,over:true},
    {...good,board:blank()},{...good,board:[[3,2,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]}];
  for(const bad of bads){assert.equal(M.restore(bad),null,JSON.stringify(bad));}
  const r=M.restore(good);good.board[0][0]=999;assert.notEqual(r.state().board[0][0],999);const view=r.state();view.board[0][0]=888;assert.notEqual(r.state().board[0][0],888);
});

test('one-step undo restores score, board and move count; replay reuses the consumed random draws', () => {
  const b=blank();b[0]=[2,2,0,0];
  const game=restore(b,{},()=>0);const first=game.move('left');
  assert.equal(first.undoAvailable,true);assert.equal(first.score,4);assert.equal(first.moves,1);
  const saved=game.serialize();assert.equal(saved.version,2);assert.equal(saved.undo.moves,0);assert.deepEqual(saved.undo.draws,[0,0]);
  const loaded=M.restore(saved,()=>.99);assert.ok(loaded);assert.equal(loaded.state().undoAvailable,true);
  const undone=loaded.undo();assert.equal(undone.changed,true);assert.deepEqual(undone.board,b);assert.equal(undone.score,0);assert.equal(undone.moves,0);
  assert.equal(loaded.state().undoAvailable,false);assert.equal(loaded.undo().changed,false);
  assert.deepEqual(loaded.move('left'),first,'undo restores the random position as well as the board');
});

test('undo follows only the last changed move and can recover a terminal win or loss', () => {
  const pair=blank();pair[0]=[2,2,0,0];const game=restore(pair);
  game.move('left');const after=game.serialize();assert.equal(game.move('down').changed,true);
  assert.equal(game.state().undoAvailable,true);game.undo();assert.equal(game.state().moves,1);
  assert.equal(game.move('right').changed,true);assert.equal(game.state().undoAvailable,true);
  assert.equal(game.serialize().moves,2);

  const win=blank();win[0]=[1024,1024,0,0];const finishing=restore(win);
  assert.equal(finishing.move('left').status,'won');assert.equal(finishing.undo().status,'playing');
  assert.equal(finishing.state().board[0][0],1024);assert.equal(finishing.state().board[0][1],1024);
  assert.equal(M.restore(after).state().undoAvailable,true);
});
test('deterministic replay survives serialize/restore and continues the same transactions',()=>{
  function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  const a=M.create(rng(2048)), b=M.create(rng(2048));
  for(let i=0;i<200;i++){const dir=directions[i%4];assert.deepEqual(a.move(dir),b.move(dir));if(a.state().status==='won'){a.continueGame();b.continueGame();}}
  assert.deepEqual(a.serialize(),b.serialize());assert.ok(M.restore(a.serialize()));
});

test('4000 deterministic full-board directional comparisons against an independent oracle',()=>{
  let seed=0x2048;const values=[0,2,4,8,16,32];
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  let cases=0;
  for(let n=0;n<1000;n++){
    const board=Array.from({length:4},()=>Array.from({length:4},()=>values[Math.floor(random()*6)]));
    for(const dir of directions){
      let b=clean(board),score=0;
      const vertical=dir==='up'||dir==='down',reverse=dir==='right'||dir==='down';
      if(vertical)b=b[0].map((_,i)=>b.map(row=>row[i]));
      b=b.map(row=>{const r=referenceLine(reverse?row.slice().reverse():row);score+=r.score;return reverse?r.row.reverse():r.row;});
      if(vertical)b=b[0].map((_,i)=>b.map(row=>row[i]));
      const actual=M.slide(board,dir);assert.deepEqual(actual.board,b);assert.equal(actual.scoreDelta,score);cases++;
    }
  }
  assert.equal(cases,4000);
});

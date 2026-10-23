const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read } = require('./helpers/game-harness.cjs');

function loadPack() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/fidelity-cards.js'), h.context, { filename: 'scripts/fidelity-cards.js' });
  return h;
}
const ids = ['hearts-trick', 'spades-contract', 'crazy-eights', 'golf-solitaire', 'pyramid-solitaire', 'tripeaks-solitaire', 'accordion-solitaire', 'yukon-solitaire', 'yahtzee-dice', 'farkle-dice'];
const model = (h, id) => h.context.NP_Fidelity.get(id).model;
const seeded = () => { let n = 17; return () => ((n = (n * 48271) % 2147483647) - 1) / 2147483646; };

test('registers all ten exact card and dice IDs with functional model APIs', () => {
  const h = loadPack();
  assert.deepEqual([...h.context.NP_Fidelity.entries()].map(x => x.id), ids);
  for (const id of ids) {
    const definition=h.context.NP_Fidelity.get(id);
    assert.equal(typeof model(h, id).newGame, 'function', id);
    assert.equal(definition.newGame,true);
    assert.equal(definition.catalog.id,id);
    assert.equal(definition.catalog.section,'quick');
    assert.ok(definition.reference.url.startsWith('https://'));
  }
});

test('Hearts enforces follow suit and scores completed tricks and points', () => {
  const h = loadPack(), m = model(h, 'hearts-trick'), s = m.newGame(seeded());
  s.players[0] = [{ rank: 2, suit: 'C' }, { rank: 5, suit: 'H' }];
  s.players[1] = [{ rank: 4, suit: 'C' }, { rank: 10, suit: 'H' }];
  s.players[2] = [{ rank: 8, suit: 'C' }, { rank: 3, suit: 'H' }];
  s.players[3] = [{ rank: 9, suit: 'C' }, { rank: 12, suit: 'S' }];
  s.leader = 0; s.handNo = 4; s.trickNo = 1; s.passDone = true;
  assert.equal(m.play(s, 0, 1).ok, false, 'must follow clubs while holding clubs');
  for (let p = 0; p < 4; p++) assert.equal(m.play(s, p, 0).ok, true);
  assert.equal(s.scores.reduce((a, b) => a + b, 0), 0);
  assert.equal(s.trickHistory.length, 1);
  s.players[0] = [{ rank: 5, suit: 'H' }]; s.players[1] = [{ rank: 12, suit: 'S' }];
  s.players[2] = [{ rank: 4, suit: 'H' }]; s.players[3] = [{ rank: 3, suit: 'H' }];
  s.leader = 0; s.trick = []; s.trickNo = 1;
  for (let p = 0; p < 4; p++) assert.equal(m.play(s, p, 0).ok, true);
  assert.equal(s.handPoints.reduce((a, b) => a + b, 0), 16);
  assert.equal(s.handPoints[0], 16);
});

test('Hearts forbids avoidable first-trick point discards while void, but permits forced points', () => {
  const h=loadPack(),m=model(h,'hearts-trick'),s=m.newGame(seeded());
  s.passDone=true;s.trickNo=0;s.leader=0;
  s.players[0]=[{rank:2,suit:'C'}];
  s.players[1]=[{rank:3,suit:'C'}];
  s.players[2]=[{rank:4,suit:'C'}];
  s.players[3]=[{rank:5,suit:'C'}];
  s.trick=[{player:0,card:s.players[0][0]},{player:1,card:s.players[1][0]},{player:2,card:s.players[2][0]}];
  s.leader=0;
  s.players[3]=[{rank:5,suit:'D'},{rank:3,suit:'H'},{rank:12,suit:'S'}];
  const avoidable=m.legalCards(s,3);
  assert.deepEqual(avoidable.map(c=>c.suit+c.rank),['D5']);
  s.players[3]=[{rank:3,suit:'H'},{rank:12,suit:'S'}];
  const forced=m.legalCards(s,3);
  assert.deepEqual(forced.map(c=>c.suit+c.rank),['H3','S12']);
});

test('Hearts passes three cards, reverses a moon shot, and rejects post-game plays', () => {
  const h=loadPack(),m=model(h,'hearts-trick'),s=m.newGame(seeded());
  assert.equal(m.pass(s).ok,false);
  assert.equal(m.selectPass(s,[0,1,2]).ok,true);assert.equal(m.pass(s).ok,true);
  assert.ok(s.players.every(hand=>hand.length===13));assert.equal(s.passDone,true);
  s.handPoints=[26,0,0,0];s.trickNo=12;s.leader=0;s.players=[[{rank:2,suit:'C'}],[{rank:3,suit:'C'}],[{rank:4,suit:'C'}],[{rank:5,suit:'C'}]];
  for(let p=0;p<4;p++)assert.equal(m.play(s,p,0).ok,true);
  assert.deepEqual(Array.from(s.scores),[0,26,26,26]);
  s.over=true;assert.equal(m.play(s,0,0).ok,false);
});

test('Spades scores contracts, bags, nil, and rejects off-suit plays', () => {
  const h = loadPack(), m = model(h, 'spades-contract'), s = m.newGame(seeded());
  assert.equal(m.bid(s, 0, 14).ok, false);
  for (let p = 0; p < 4; p++) m.bid(s, p, p === 0 ? 1 : 0);
  s.players[0] = [{ rank: 2, suit: 'C' }, { rank: 14, suit: 'S' }];
  s.players[1] = [{ rank: 3, suit: 'C' }, { rank: 4, suit: 'S' }];
  s.players[2] = [{ rank: 5, suit: 'C' }, { rank: 5, suit: 'S' }];
  s.players[3] = [{ rank: 6, suit: 'C' }, { rank: 6, suit: 'S' }];
  s.leader = 0; s.handNo = 1; s.bidsDone = true;
  assert.equal(m.play(s, 0, 1).ok, false);
  for (let p = 0; p < 4; p++) assert.equal(m.play(s, p, 0).ok, true);
  assert.equal(s.trickNo, 1);
  assert.equal(s.trickHistory[0].winner, 3);
});

test('Spades completes 13 legal tricks and applies nil plus the ten-bag penalty', () => {
  const h=loadPack(),m=model(h,'spades-contract'),s=m.newGame(seeded());
  s.bids=[1,0,0,0];s.players=Array.from({length:4},(_,p)=>Array.from({length:13},(_,i)=>({id:`${p}-${i}`,rank:i+2,suit:'C'})));
  for(let trick=0;trick<13;trick++)for(let turn=0;turn<4;turn++){const p=(s.leader+s.trick.length)%4;assert.equal(m.play(s,p,0).ok,true);}
  assert.equal(s.awaitingNext,true);assert.deepEqual(Array.from(s.bags),[2,0]);assert.deepEqual(Array.from(s.teamScores),[22,200]);
  assert.equal(m.play(s,0,0).ok,false);assert.equal(m.nextHand(s).ok,true);assert.equal(s.handNo,2);
});

test('Spades nil tricks stay outside a failed partner contract but add team bags', () => {
  const h=loadPack(),m=model(h,'spades-contract'),s=m.newGame(seeded());
  s.bids=[1,1,0,1];
  const winners=[2,2,1,3,3,3,3,3,3,3,3,3,3];
  s.players=Array.from({length:4},(_,p)=>winners.map((winner,t)=>({id:`${p}-${t}`,suit:'C',rank:p===winner?14:p+2})));
  for(let trick=0;trick<13;trick++)for(let turn=0;turn<4;turn++){
    const p=(s.leader+s.trick.length)%4;
    assert.equal(m.play(s,p,0).ok,true);
  }
  assert.deepEqual(Array.from(s.tricks),[0,1,2,10]);
  assert.deepEqual(Array.from(s.bags),[2,9]);
  assert.deepEqual(Array.from(s.teamScores),[-110,29]);
  assert.equal(s.awaitingNext,true);
});

test('Crazy Eights validates suit/rank, wild suit, draws, and terminal play', () => {
  const h = loadPack(), m = model(h, 'crazy-eights'), s = m.newGame(seeded());
  s.players[0] = [{ rank: 8, suit: 'H' }, { rank: 2, suit: 'D' }]; s.players[1] = [{ rank: 4, suit: 'C' }]; s.discard = [{ rank: 4, suit: 'D' }]; s.stock=[{rank:3,suit:'H'}];
  assert.equal(m.play(s, 0, 0).ok, false, 'an eight must choose a suit');
  assert.equal(m.play(s, 0, 0, 'H').ok, true);
  assert.equal(s.activeSuit, 'H');
  assert.equal(m.play(s, 1).ok, false);
  assert.equal(m.draw(s, 1).ok, true);
  s.players[0]=[{rank:4,suit:'H'},{rank:8,suit:'C'}];s.turn=0;s.discard=[{rank:4,suit:'H'}];s.activeSuit='H';s.stock=[{rank:2,suit:'D'}];
  assert.equal(m.draw(s,0).ok,true,'Bicycle permits drawing even while a playable card is held');
  assert.equal(s.players[0].length,3);
  assert.equal(s.turn,0,'the player keeps the turn and may choose a playable card');
  s.players[0] = [{ rank: 4, suit: 'H' }]; s.turn = 0;
  assert.equal(m.play(s, 0, 0).ok, true);
  assert.equal(s.over, true);
  assert.equal(m.draw(s, 1).ok, false);
});

test('Golf only exposes column tops, moves +/-1 without ace wrap, and detects loss', () => {
  const h = loadPack(), m = model(h, 'golf-solitaire'), s = m.newGame(seeded());
  assert.equal(s.columns.length, 7); assert.ok(s.columns.every(c => c.length === 5));
  assert.equal(s.columns.flat().length+s.stock.length+s.waste.length,52);
  assert.equal(new Set([...s.columns.flat(),...s.stock,...s.waste].map(c=>c.id)).size,52);
  s.columns = [[{rank:14,suit:'S'},{rank:5,suit:'C'}], ...Array.from({length:6},()=>[])]; s.waste = [{rank:13,suit:'H'}];
  assert.equal(m.remove(s, 0, 0).ok, false, 'covered card');
  assert.equal(m.remove(s, 0, 1).ok, false, 'ace cannot wrap to two');
  s.waste = [{rank:4,suit:'D'}]; assert.equal(m.remove(s,0,1).ok,true);
  s.stock = []; s.waste = [{rank:9,suit:'D'}]; s.columns = [[{rank:2,suit:'C'}], ...Array.from({length:6},()=>[])];
  assert.equal(m.status(s), 'loss');
});

test('Pyramid blocks covered cards, removes kings alone, and permits one redeal', () => {
  const h = loadPack(), m = model(h, 'pyramid-solitaire'), s = m.newGame(seeded());
  assert.equal(s.pyramid.length, 28);
  const covered = s.pyramid.find(c => c.row === 0); assert.equal(m.removePair(s, covered.id, null).ok, false);
  s.pyramid = [{id:'covered-king',rank:13,suit:'S',row:0,col:0,removed:false},{id:'block-a',rank:2,suit:'C',row:1,col:0,removed:false},{id:'block-b',rank:3,suit:'D',row:1,col:1,removed:false}];
  assert.equal(m.removeKing(s,'covered-king').ok,false);
  s.pyramid = [{id:'k',rank:13,suit:'S',row:6,col:0,removed:false}];
  assert.equal(m.removeKing(s,'k').ok,true); assert.equal(m.status(s),'win');
  const t = m.newGame(seeded()); t.stock=[]; t.waste=[{rank:4,suit:'D'}];
  assert.equal(m.redeal(t).ok,true); assert.equal(t.redeals,1); assert.equal(m.redeal(t).ok,false);
});

test('TriPeaks requires both blockers removed and allows stated king-ace wrap', () => {
  const h = loadPack(), m = model(h, 'tripeaks-solitaire'), s = m.newGame(seeded());
  assert.equal(s.tableau.length, 28);
  assert.equal(s.tableau.length+s.stock.length+s.waste.length,52);
  const card = s.tableau.find(c => c.row === 3); assert.equal(m.remove(s, card.id).ok, false);
  s.tableau = [{id:'a',rank:14,suit:'S',row:0,col:0,removed:false}]; s.stock=[]; s.waste=[{rank:13,suit:'H'}];
  assert.equal(m.remove(s,'a').ok,true);
  s.tableau=[]; assert.equal(m.status(s),'win');
  const noWrap={tableau:[{id:'a',rank:14,suit:'S',row:0,col:0,removed:false}],stock:[],waste:[{rank:3,suit:'H'}],over:false};
  assert.equal(m.remove(noWrap,'a').ok,false,'Ace is adjacent to King by the selected wrap, not to three');
  const loss={tableau:[{id:'legal',rank:3,suit:'C',row:0,col:0,removed:false},{id:'blocked',rank:8,suit:'D',row:0,col:1,removed:false}],stock:[],waste:[{rank:2,suit:'H'}],over:false};
  assert.equal(m.remove(loss,'legal').ok,true);assert.equal(loss.over,true);assert.equal(m.status(loss),'blocked');
});

test('Accordion moves whole piles only by one or three left when rank or suit matches', () => {
  const h = loadPack(), m = model(h, 'accordion-solitaire'), s = m.newGame(seeded());
  s.piles = [[{rank:4,suit:'C'},{rank:8,suit:'H'}],[{rank:2,suit:'D'}],[{rank:9,suit:'S'}],[{rank:8,suit:'D'}]];
  assert.equal(m.move(s,3,1).ok,false);
  assert.equal(m.move(s,3,0).ok,true);
  assert.equal(s.piles.length,3); assert.equal(s.piles[0].length,3);
  assert.equal(m.move(s,0,0).ok,false);
});

test('Yukon moves a face-up tail as a unit, requires opposite colour rank, and exposes cards', () => {
  const h = loadPack(), m = model(h, 'yukon-solitaire'), s = m.newGame(seeded());
  assert.equal(s.columns.reduce((n,c)=>n+c.length,0),52);
  s.columns = [[{rank:6,suit:'S',faceUp:true},{rank:2,suit:'H',faceUp:true}], [{rank:7,suit:'H',faceUp:true}], ...Array.from({length:5},()=>[])];
  assert.equal(m.move(s,0,0,1).ok,true); assert.equal(s.columns[1].length,3);
  s.columns[2] = [{rank:7,suit:'S',faceUp:true}]; s.columns[0] = [{rank:8,suit:'D',faceUp:true}];
  assert.equal(m.move(s,0,0,2).ok,false, 'same-colour destination');
  s.columns[0] = [{rank:4,suit:'C',faceUp:false},{rank:3,suit:'S',faceUp:true}];
  assert.equal(m.move(s,0,1,3).ok,false, 'cannot move hidden card');
  s.foundations.C=[];s.columns[0]=[{rank:7,suit:'D',faceUp:false},{rank:14,suit:'C',faceUp:true}];
  assert.equal(m.toFoundation(s,0,1).ok,true,'Ace starts its foundation');assert.equal(s.columns[0][0].faceUp,true,'the hidden top is exposed after a foundation move');
});

test('Yahtzee rolls five dice at most three times and scores real categories once', () => {
  const h = loadPack(), m = model(h, 'yahtzee-dice'), s = m.newGame(seeded());
  assert.equal(s.dice.length,0); m.roll(s, []); assert.equal(s.dice.length,5); assert.equal(s.rollsLeft,2);
  m.roll(s, []); m.roll(s, []); assert.equal(s.rollsLeft,0); assert.equal(m.roll(s, []).ok, false);
  s.dice=[]; assert.equal(m.score(s,'fullHouse').ok, false);
  s.dice = [2,2,2,5,5]; assert.equal(m.score(s,'fullHouse').ok,true); assert.equal(s.scorecard.fullHouse,25);
  assert.equal(m.score(s,'fullHouse').ok,false);
  for (let i=0;i<12;i++) { s.dice=[1,2,3,4,6]; assert.equal(m.score(s, m.availableCategories(s)[0]).ok,true); }
  assert.equal(s.over,true); assert.equal(m.roll(s,[]).ok,false);
});

test('Yahtzee applies Joker ordering without mutating rejected score attempts', () => {
  const h=loadPack(),m=model(h,'yahtzee-dice'),s=m.newGame(seeded());
  s.scorecard.yahtzee=50;s.scorecard.ones=3;s.dice=[6,6,6,6,6];
  assert.equal(m.score(s,'chance').ok,false);assert.equal(s.yahtzeeBonus,0);assert.equal(s.scorecard.chance,null);
  assert.equal(m.score(s,'sixes').ok,true);assert.equal(s.yahtzeeBonus,100);assert.equal(s.scorecard.sixes,30);
  s.dice=[2,2,2,2,2];assert.equal(m.score(s,'twos').ok,true);assert.equal(s.scorecard.twos,10);assert.equal(s.yahtzeeBonus,200);
});

test('Farkle only banks scoring dice, bust loses turn points, and hot dice refresh', () => {
  const h = loadPack(), m = model(h, 'farkle-dice'), s = m.newGame(seeded());
  s.phase='select';
  s.dice=[2,3,4,6,2,3];
  assert.equal(m.select(s,[0]).ok,false);
  s.dice=[1,1,1,2];assert.equal(m.select(s,[0,1,2,3]).ok,false,'non-scoring dice cannot be included in the selection');
  s.dice=[1,5,2,3,4,6]; assert.equal(m.select(s,[0]).ok,true); assert.equal(s.turnPoints,100);
  assert.equal(m.bank(s).ok,false, 'opening threshold is 500');
  s.turnPoints=500; assert.equal(m.bank(s).ok,true);
  s.players[0].score=500;
  s.dice=[2,3,4,6,2,3]; let rollIndex=0; const bustRoll=[.2,.4,.55,.9,.2,.4]; assert.equal(m.roll(s, ()=>bustRoll[rollIndex++]).ok,true); assert.equal(s.busts,1); assert.equal(s.turnPoints,0);
  s.phase='select';
  s.dice=[1,1,1,5,5,5]; assert.equal(m.select(s,[0,1,2,3,4,5]).ok,true); assert.equal(s.dice.length,0);
  assert.equal(m.roll(s, seeded()).ok,true); assert.equal(s.dice.length,6);
});

test('Farkle requires scoring the current roll before reroll and guards its visible roll button', () => {
  const h=loadPack(),m=model(h,'farkle-dice'),s=m.newGame();
  assert.equal(m.roll(s,()=>0).ok,true);
  assert.equal(s.dice.length,6);
  assert.equal(m.roll(s,()=>0).ok,false,'must resolve the all-ones roll first');
  assert.deepEqual(Array.from(s.dice),[1,1,1,1,1,1]);
  assert.equal(m.select(s,[0,1,2,3,4,5]).ok,true);
  assert.equal(m.roll(s,()=>0).ok,true,'all six selected is hot dice and permits a fresh six-die roll');

  const ui=loadPack();vm.runInContext('Math.random=()=>0',ui.context);
  const def=ui.context.NP_Fidelity.get('farkle-dice'),session=def.launch(ui.container,{id:'farkle-dice',title:'Farkle'});
  const root=ui.container.children[0],roll=root.querySelectorAll('button').find(button=>button.textContent==='Roll dice');
  assert.equal(roll.disabled,false);
  ui.frame(16);roll.dispatch('click');ui.frame(16);
  assert.equal(roll.disabled,true,'roll control is disabled while dice need scoring');
  const canvas=root.querySelector('canvas');
  const pointer=(x,y)=>canvas.dispatch('pointerdown',{clientX:x,clientY:y});
  for(let i=0;i<6;i++)pointer(55+i*105,190);
  root.querySelectorAll('button').find(button=>button.textContent==='Score selected dice').dispatch('click');ui.frame(16);
  assert.equal(roll.disabled,false,'scoring hot dice enables the next roll');
  session.stop();
});

test('every card/dice game launches, draws a frame, pauses/resumes, and cleans up', () => {
  for (const id of ids) {
    const h=loadPack();
    const def=h.context.NP_Fidelity.get(id);
    assert.equal(typeof def.model.newGame, 'function');
    const session=def.launch(h.container,{id,title:def.title});
    h.frame(16);
    const stageRoot=h.container.children[0];
    assert.ok(stageRoot.querySelector('canvas'));
    assert.ok(stageRoot.querySelectorAll('button').length >= 2, `${id} has usable controls`);
    assert.ok(session && typeof session.pause === 'function');
    session.pause(); assert.equal(session.isPaused(),true); session.resume(); assert.equal(session.isPaused(),false);
    const canvas=stageRoot.querySelector('canvas');canvas.dispatch('pointerdown',{clientX:50,clientY:60});
    if(id==='accordion-solitaire'){
      assert.ok(canvas.height>=710,'the fifth row of 52 face-up piles is fully visible');
      canvas.dispatch('pointerdown',{clientX:280,clientY:650});
    }
    stageRoot.querySelectorAll('button')[0].dispatch('click');
    h.frame(16); assert.deepEqual(h.errors,[],`${id} draws without errors`);
    session.stop(); assert.equal(h.frames.size,0,`${id} stops frame loop`);assert.equal(session.isActive(),false,`${id} ends its session`);
    h.container.replaceChildren();
  }
});

test('Hearts pass and Yahtzee roll controls drive their visible launch state', () => {
  const h=loadPack(), hearts=h.context.NP_Fidelity.get('hearts-trick'), hs=hearts.launch(h.container,{id:'hearts-trick',title:'Hearts'});
  let root=h.container.children[0],canvas=root.querySelector('canvas');
  const pointer=(target,x,y)=>{const rect=target.getBoundingClientRect();target.dispatch('pointerdown',{clientX:x*rect.width/target.width,clientY:y*rect.height/target.height});};
  [55,125,195].forEach(x=>pointer(canvas,x,405));
  root.querySelectorAll('button').find(button=>button.textContent==='Pass selected 3').dispatch('click');
  h.frame(16);
  assert.match(root.querySelector('.np-fidelity-status').textContent,/2♣ leads/);
  hs.stop();h.container.replaceChildren();

  const yahtzee=h.context.NP_Fidelity.get('yahtzee-dice'),ys=yahtzee.launch(h.container,{id:'yahtzee-dice',title:'Yahtzee'});
  root=h.container.children[0];root.querySelectorAll('button').find(button=>button.textContent==='Roll / reroll held dice').dispatch('click');h.frame(16);
  assert.match(root.querySelector('.np-fidelity-status').textContent,/Roll 1 of 3/);
  canvas=root.querySelector('canvas');pointer(canvas,70,190);
  root.querySelectorAll('button').find(button=>button.textContent==='Roll / reroll held dice').dispatch('click');h.frame(16);
  assert.match(root.querySelector('.np-fidelity-status').textContent,/Roll 2 of 3/);
  ys.stop();h.container.replaceChildren();
});

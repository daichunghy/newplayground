// Controller contract tests use DOM doubles; visual/device gates remain separate.
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,assertStopped,read}=require('./support/browser-harness.cjs');
const Model=require('../scripts/games/game2048-model.js');
const KEY='np_2048_state_v1',BEST='np_2048_best_v1';
const el=(h,id)=>h.container.querySelector('#'+id);
const b=()=>[[2,2,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
const fixture=(board=b(),extra={})=>({version:1,board,score:0,moves:0,won:false,keepPlaying:false,over:!Model.hasMoves(board),...extra});
function launch(value=fixture(),extras=[]){const h=harness({storage:new Map([[KEY,JSON.stringify(value)],...extras])});h.context.openGameById('tro-choi-2048');assert.deepEqual(h.errors,[]);return h;}
const saved=h=>JSON.parse(h.stored.get(KEY));
const click=(h,id)=>el(h,id).dispatch('click');
const key=(h,k,extras={})=>h.container.dispatch('keydown',{target:el(h,'g2048Grid'),key:k,...extras});
const pointer=(h,type,x,y,extras={})=>el(h,'g2048Grid').dispatch(type,{pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,...extras});

test('restores board without extra spawn; move, no-op, D-pad and score commit correctly',()=>{
 const h=launch();assert.deepEqual(saved(h).board,b());const first=h.stored.get(KEY);
 key(h,'ArrowUp');assert.equal(h.stored.get(KEY),first);click(h,'g2048Left');
 assert.equal(saved(h).score,4);assert.equal(saved(h).moves,1);assert.equal(el(h,'g2048Best').textContent,'4');
 assert.equal(el(h,'g2048Readable').querySelectorAll('td').length,16);
 h.context.closeGameModal();assertStopped(h);
});
test('modifier shortcuts and editable controls never become game moves',()=>{
 const h=launch(),before=h.stored.get(KEY);
 for(const modifier of ['ctrlKey','altKey','metaKey','shiftKey'])key(h,'ArrowLeft',{[modifier]:true});
 h.container.dispatch('keydown',{target:{closest:()=>({})},key:'a'});assert.equal(h.stored.get(KEY),before);
 key(h,'a');assert.equal(saved(h).score,4);h.context.closeGameModal();assertStopped(h);
});
test('swipe starts at zero, has >10px threshold, vertical ties and one commit',()=>{
 const h=launch(),swipe=h.context.NP_2048.directionForSwipe;
 assert.equal(swipe(10,0),null);assert.equal(swipe(10.1,0),'right');assert.equal(swipe(15,15),'down');
 pointer(h,'pointerdown',0,0);pointer(h,'pointerup',-30,0);assert.equal(saved(h).score,4);assert.equal(saved(h).moves,1);
 pointer(h,'pointerup',-60,0);assert.equal(saved(h).moves,1);h.context.closeGameModal();assertStopped(h);
});
test('cancel, lost capture, second finger and wrong pointer never commit swipes',()=>{
 for(const cancel of ['pointercancel','lostpointercapture','second','wrong']){
  const h=launch();pointer(h,'pointerdown',0,0);
  if(cancel==='second')pointer(h,'pointerdown',0,0,{pointerId:2,isPrimary:false});
  else if(cancel==='wrong')pointer(h,'pointerup',-30,0,{pointerId:2});else pointer(h,cancel,0,0);
  if(cancel!=='wrong')pointer(h,'pointerup',-30,0);
  assert.equal(saved(h).moves,0,cancel);h.context.closeGameModal();assertStopped(h);
 }
});
test('win/continue save immediately, reload won state and restart do not reuse old callbacks',()=>{
 const board=b();board[0]=[1024,1024,0,0];const h=launch(fixture(board));key(h,'ArrowLeft');
 assert.equal(saved(h).won,true);assert.equal(el(h,'g2048Overlay').hidden,false);assert.equal(el(h,'g2048Continue').hidden,false);
 const before=h.stored.get(KEY);key(h,'ArrowRight');assert.equal(h.stored.get(KEY),before);
 h.context.closeGameModal();h.context.openGameById('tro-choi-2048');assert.equal(el(h,'g2048Overlay').hidden,false);
 click(h,'g2048Continue');assert.equal(saved(h).keepPlaying,true);assert.equal(el(h,'g2048Overlay').hidden,true);
 click(h,'g2048NewBtn');assert.equal(el(h,'g2048Confirm').hidden,false);click(h,'g2048ConfirmNo');assert.equal(saved(h).won,true);
 click(h,'g2048NewBtn');click(h,'g2048ConfirmYes');h.flushTimeouts();assert.equal(saved(h).won,false);assert.equal(saved(h).moves,0);assert.equal(el(h,'g2048Overlay').hidden,true);
 h.context.closeGameModal();assertStopped(h);
});
test('loss clears active save, retains best and has no delayed old-game overlay',()=>{
 const dead=[[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]];
 const h=launch(fixture(dead,{score:128,moves:12}));assert.equal(h.stored.has(KEY),false);assert.equal(h.stored.get(BEST),'128');
 assert.equal(el(h,'g2048Overlay').hidden,false);click(h,'g2048Again');h.flushTimeouts();
 assert.equal(el(h,'g2048Overlay').hidden,true);assert.equal(saved(h).moves,0);assert.equal(h.stored.get(BEST),'128');
 h.context.closeGameModal();assertStopped(h);
});
test('pause, hidden tab and cleanup cancel gestures and preserve board',()=>{
 const h=launch();key(h,'ArrowLeft');const before=h.stored.get(KEY);click(h,'g2048Pause');key(h,'ArrowDown');
 assert.equal(h.stored.get(KEY),before);assert.equal(el(h,'g2048Grid').inert,true);click(h,'g2048Resume');
 pointer(h,'pointerdown',0,0);h.document.hidden=true;h.document.dispatch('visibilitychange');pointer(h,'pointerup',-30,0);
 assert.equal(h.stored.get(KEY),before);assert.equal(el(h,'g2048PauseOverlay').hidden,false);
 h.context.closeGameModal();assertStopped(h);h.flushTimeouts();assertStopped(h);
});
test('stale tab lifecycle saves preserve the external board until a local move commits',()=>{
 const h=launch(),external=fixture([[8,0,0,0],[0,4,0,0],[0,0,0,0],[0,0,0,0]],{score:4,moves:2});
 const externalRaw=JSON.stringify(external);h.stored.set(KEY,externalRaw);h.window.dispatch('storage',{key:KEY,newValue:externalRaw});
 h.window.dispatch('blur');assert.equal(h.stored.get(KEY),externalRaw,'blur auto-pause must not overwrite a newer tab save');
 click(h,'g2048Resume');h.window.dispatch('pagehide');assert.equal(h.stored.get(KEY),externalRaw,'pagehide must also preserve the newer save');
 key(h,'ArrowLeft');assert.notEqual(h.stored.get(KEY),externalRaw,'a committed local move intentionally takes ownership');
 assert.equal(saved(h).score,4);assert.equal(saved(h).moves,1);
 h.context.closeGameModal();assertStopped(h);
});
test('invalid/corrupt best migrates safely; storage failure and future saves are non-destructive',()=>{
 const h=launch(fixture(),[['np_2048_high','1200'],[BEST,'NaN']]);assert.equal(h.stored.get(BEST),'1200');
 h.context.localStorage.setItem=()=>{throw new Error('quota');};key(h,'ArrowLeft');assert.match(el(h,'g2048Storage').textContent,/Không lưu/);assert.equal(el(h,'g2048Score').textContent,'4');
 h.context.closeGameModal();assertStopped(h);
 const future={...fixture(),version:2};const f=launch(future);key(f,'ArrowLeft');assert.deepEqual(JSON.parse(f.stored.get(KEY)),future);f.context.closeGameModal();assertStopped(f);
 const invalid=launch({...fixture(),board:'bad'});assert.ok(Array.isArray(saved(invalid).board));invalid.context.closeGameModal();assertStopped(invalid);
});
test('animation cancellation never drops rapid model moves and close cancels active effects',()=>{
 const h=launch();const proto=Object.getPrototypeOf(el(h,'g2048Tiles')),old=proto.animate;let cancelled=0;
 proto.animate=function(){return{cancel(){cancelled++;}};};
 try{
  key(h,'ArrowLeft');key(h,'ArrowDown');assert.equal(saved(h).moves,2);assert.ok(cancelled>0);
  click(h,'g2048NewBtn');click(h,'g2048ConfirmYes');h.flushTimeouts();assert.equal(saved(h).moves,0);assert.equal(el(h,'g2048Overlay').hidden,true);
  key(h,'ArrowRight');h.context.closeGameModal();assertStopped(h);assert.equal(h.timers.size,0);
 }finally{if(old)proto.animate=old;else delete proto.animate;}
});
test('CSS and integration preserve zoom, contrast-friendly numbers, native direction alternatives',()=>{
 assert.match(read('scripts/games/game2048.css'),/touch-action: pinch-zoom/);assert.match(read('scripts/games/game2048.css'),/prefers-reduced-motion/);
 assert.doesNotMatch(read('index.html'),/user-scalable=no/);const h=launch();
 for(const id of ['g2048Up','g2048Down','g2048Left','g2048Right'])assert.match(el(h,id).getAttribute('aria-label'),/Trượt/);
 h.context.closeGameModal();assertStopped(h);
});

test('shared synthesized tones are released by their owning game session',()=>{
 const h=launch();const stops=[],disconnects=[];
 h.context.NEWPLAYGROUND_MUTED=false;h.context.NP_Audio={isMuted:false};
 h.context.AudioContext=class{
  constructor(){this.currentTime=0;this.destination={};}
  createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},start(){},stop(t){stops.push(t);},disconnect(){disconnects.push('osc');}};}
  createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){disconnects.push('gain');}};}
 };
 key(h,'ArrowLeft');assert.ok(stops.some(n=>n===.09));h.context.closeGameModal();
 assert.ok(stops.includes(undefined));assert.deepEqual(disconnects,['osc','gain']);assertStopped(h);
});

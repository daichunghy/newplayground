// DOM/Canvas contract doubles: not rendered browser or device QA.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,read,assertStopped}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/falling-blocks-model.js'),Input=require('../scripts/games/falling-blocks-input.js');
const KEY='np_falling_blocks_v1',el=(h,id)=>h.container.querySelector('#'+id),saved=h=>JSON.parse(h.stored.get(KEY));
function launch(storage=new Map()){
 const h=harness({loadEngines:false,loadApp:false,storage});
 for(const n of ['model','input','']){const file='scripts/games/falling-blocks'+(n?'-'+n:'')+'.js';vm.runInContext(read(file),h.context,{filename:file});}
 h.context.NP_FallingBlocks.mount(h.container,h.context.NP_GameSession.start(),null);return h;
}
function close(h){h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.equal(h.timers.size,0);assert.deepEqual(h.errors,[]);}
const click=(h,id,detail=0)=>el(h,id).dispatch('click',{detail});
const key=(h,k,extra={})=>h.container.dispatch('keydown',{target:el(h,'fbCanvas'),key:k,code:k,...extra});
const up=(h,k)=>h.window.dispatch('keyup',{key:k,code:k});
const frames=(h,n)=>{for(let i=0;i<n;i++)h.frame();};
test('fresh play is instant and compact; saved round reopens paused without mutation',()=>{
 const h=launch();assert.equal(saved(h).game.mode,'endless');assert.equal(el(h,'fbOverlay').hidden,true);assert.equal(h.frames.size,1);
 for(const id of ['fbHold','fbCCW','fbDown','fbRecords'])assert.equal(el(h,id).hidden,true);
 click(h,'fbDrop');assert.equal(saved(h).game.pieces,1);const state=saved(h).game;close(h);
 const r=launch(h.stored);assert.deepEqual(saved(r).game,state);assert.equal(el(r,'fbOverlay').hidden,false);assert.equal(r.frames.size,0);click(r,'fbResume');assert.equal(r.frames.size,1);close(r);
});
test('DAS/ARR has one initial press, deterministic repeat and last-key priority',()=>{
 const i=Input.create();assert.equal(i.press('a','left'),'left');assert.equal(i.press('a','left'),null);assert.deepEqual(i.tick(159),[]);assert.deepEqual(i.tick(1),['left']);assert.deepEqual(i.tick(45),['left']);
 assert.equal(i.press('b','right'),'right');assert.deepEqual(i.tick(159),[]);assert.equal(i.release('b'),'left');assert.deepEqual(i.tick(160),['left']);i.release('a');assert.deepEqual(i.tick(999),[]);i.reset();assert.deepEqual(i.held(),[]);
});
test('horizontal holds repeat by elapsed time; release and hard-drop OS repeat are safe',()=>{
 const h=launch(),x=saved(h).game.active.x;key(h,'ArrowLeft');assert.equal(saved(h).game.active.x,x-1);frames(h,14);assert.ok(saved(h).game.active.x<x-1);up(h,'ArrowLeft');const stopped=saved(h).game.active.x;frames(h,10);assert.equal(saved(h).game.active.x,stopped);
 key(h,' ');assert.equal(saved(h).game.pieces,1);key(h,' ',{repeat:true});assert.equal(saved(h).game.pieces,1);close(h);
});
test('pointer cancellation releases its owner and suppresses the compatibility click',()=>{
 const h=launch(),b=el(h,'fbLeft'),x=saved(h).game.active.x;b.dispatch('pointerdown',{pointerId:1,button:0});assert.equal(saved(h).game.active.x,x-1);
 h.window.dispatch('pointercancel',{pointerId:1});click(h,'fbLeft',1);assert.equal(saved(h).game.active.x,x-1);frames(h,15);assert.equal(saved(h).game.active.x,x-1);click(h,'fbLeft',0);assert.equal(saved(h).game.active.x,x-2);close(h);
 const i=Input.create();i.press('pointer:1','down');i.press('key:down','down');i.release('pointer:1');assert.equal(i.soft(),true);i.release('key:down');assert.equal(i.soft(),false);
});
test('blur, hidden tab and long frame gaps pause rather than catch up',()=>{
 for(const reason of ['blur','hidden','gap']){const h=launch();frames(h,4);if(reason==='blur')h.window.dispatch('blur');else if(reason==='hidden'){h.document.hidden=true;h.document.dispatch('visibilitychange');}else{h.advance(1000);h.frame();}
 assert.equal(el(h,'fbOverlay').hidden,false);assert.equal(h.frames.size,0);const elapsed=saved(h).game.elapsedMs;assert.equal(elapsed,40);frames(h,40);assert.equal(saved(h).game.elapsedMs,elapsed);close(h);}
});
test('restart confirmation is reversible and repeated restart keeps one loop',()=>{
 const h=launch();click(h,'fbDrop');const before=saved(h).game;click(h,'fbNew');assert.equal(el(h,'fbConfirm').hidden,false);assert.equal(h.frames.size,0);key(h,' ');assert.deepEqual(saved(h).game,before);click(h,'fbConfirmNo');assert.equal(h.frames.size,1);assert.deepEqual(saved(h).game,before);
 for(let i=0;i<4;i++){click(h,'fbNew');if(!el(h,'fbConfirm').hidden)click(h,'fbConfirmYes');assert.equal(saved(h).game.pieces,0);assert.equal(h.frames.size,1);}close(h);h.flushTimeouts();assertStopped(h);
});
test('terminal rounds cannot mutate and restart preserves the legacy record',()=>{
 const model=M.create({seed:4,mode:'endless'});for(let n=0;n<100&&model.view().status==='playing';n++)model.hardDrop();assert.equal(model.view().status,'lost');
 const h=launch(new Map([[KEY,JSON.stringify({version:1,game:model.serialize()})],['np_tetris_high_score','4321']]));assert.equal(h.frames.size,0);const before=saved(h).game;key(h,' ');assert.deepEqual(saved(h).game,before);click(h,'fbResume');assert.equal(saved(h).game.status,'playing');assert.equal(h.stored.get('np_tetris_high_score'),'4321');close(h);
});
test('corrupt saves are backed up; future wrapper or model saves are never overwritten',()=>{
 const bad=launch(new Map([[KEY,'{broken']]));assert.equal(bad.stored.get(KEY+'_recovery'),'{broken');assert.equal(saved(bad).game.status,'playing');close(bad);
 for(const future of [{version:8},{version:1,game:{version:8}}]){const raw=JSON.stringify(future),h=launch(new Map([[KEY,raw]]));click(h,'fbDrop');assert.equal(h.stored.get(KEY),raw);close(h);assert.equal(h.stored.get(KEY),raw);}
 const h=launch();h.context.localStorage.setItem=()=>{throw new Error('quota');};click(h,'fbDrop');assert.match(el(h,'fbStorage').textContent,/Không lưu/);assert.notEqual(el(h,'fbScore').textContent,'0');close(h);
});
test('shortcuts respect modifiers, editable targets and native button Space',()=>{
 const h=launch(),before=h.stored.get(KEY);for(const mod of ['ctrlKey','metaKey','altKey'])key(h,' ',{[mod]:true});key(h,'ArrowLeft',{target:{closest:()=>({})}});key(h,' ',{target:el(h,'fbDrop')});assert.equal(h.stored.get(KEY),before);click(h,'fbDrop');assert.equal(saved(h).game.pieces,1);close(h);
});
test('read-board pauses with nonvisual state; controls and zoom retain alternatives',()=>{
 const h=launch();click(h,'fbRead');assert.equal(h.frames.size,0);assert.equal(el(h,'fbSnapshot').hidden,false);assert.match(el(h,'fbSnapshot').textContent,/Hàng 20/);assert.ok(el(h,'fbSnapshot').classList.contains('np-game-sr'));assert.match(el(h,'fbCanvas').getAttribute('aria-label'),/Bàn 10 cột, 20 hàng/);
 assert.match(read('scripts/games/falling-blocks.css'),/min-height:44px/);assert.match(read('scripts/games/falling-blocks.css'),/touch-action:pan-y pinch-zoom/);close(h);
});

test('natural top-out reveals the result before moving keyboard focus to replay',()=>{
 const h=launch();let focusedWhileHidden=false,focused=0;
 el(h,'fbResume').focus=()=>{focused++;focusedWhileHidden ||= el(h,'fbOverlay').hidden;};
 for(let i=0;i<100&&saved(h).game.status==='playing';i++)click(h,'fbDrop');
 assert.equal(saved(h).game.status,'lost');assert.equal(el(h,'fbOverlay').hidden,false);assert.equal(h.frames.size,0);assert.equal(focused,1);assert.equal(focusedWhileHidden,false);close(h);
});

test('restart invalidates an in-flight pointer before its delayed compatibility click',()=>{
 const h=launch();el(h,'fbLeft').dispatch('pointerdown',{pointerId:9,button:0});click(h,'fbNew');if(!el(h,'fbConfirm').hidden)click(h,'fbConfirmYes');const fresh=saved(h).game.active.x;
 h.window.dispatch('pointerup',{pointerId:9});click(h,'fbLeft',1);assert.equal(saved(h).game.active.x,fresh);frames(h,14);assert.equal(saved(h).game.active.x,fresh);close(h);
});

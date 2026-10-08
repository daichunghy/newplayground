// DOM/canvas doubles validate contracts only; no browser rendering or input-latency claim.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/marble-trail-model.js');
const KEY='np_marble_trail_v1',el=(h,id)=>h.container.querySelector('#'+id),click=(h,id)=>el(h,id).dispatch('click');
function setup(options={}) {
  const storage=options.storage||new Map();
  if(options.round)storage.set(KEY,JSON.stringify({version:1,best:options.best||0,motion:options.motion!==false,round:options.round}));
  const h=harness({loadEngines:false,loadApp:false,storage,reducedMotion:options.reduced});
  h.media={matches:!!options.reduced,addEventListener(){},removeEventListener(){}};h.context.matchMedia=()=>h.media;
  for(const file of ['scripts/games/marble-trail-model.js','scripts/games/marble-trail.js'])vm.runInContext(read(file),h.context,{filename:file});
  if(options.before)options.before(h);
  h.mount=()=>h.api=h.context.NP_MarbleTrail.mount(h.container,h.context.NP_GameSession.start(),options.audio);
  h.close=()=>{h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.equal(h.timers.size,0);assert.deepEqual(h.errors,[]);};
  h.mount();h.canvas=el(h,'mtCanvas');if(options.start!==false)click(h,'mtStart');return h;
}
function pointer(h,type,extra={}){h.canvas.dispatch(type,{clientX:320,clientY:35,pointerId:1,isPrimary:true,pointerType:'mouse',button:0,...extra});}
function key(h,key,extra={}){h.canvas.dispatch('keydown',{key,...extra});}
const plain=v=>JSON.parse(JSON.stringify(v));

test('fresh launch plays immediately with one RAF, symbolic ammo and compact optional help',()=>{
  const h=setup({start:false});assert.equal(h.frames.size,1);assert.match(h.container.innerHTML,/Marble Trail/);assert.equal(h.canvas.tabIndex,0);assert.equal(el(h,'mtCover').hidden,true);
  assert.equal(el(h,'mtStatus').getAttribute('aria-live'),'polite');assert.equal(el(h,'mtStatus').className,'mt-sr-only');assert.match(el(h,'mtCurrent').getAttribute('aria-label'),/Đang bắn/);
  assert.equal(el(h,'mtMotion'),null);assert.equal(el(h,'mtStats'),null);assert.ok(read('scripts/games/marble-trail.js').match(/<p id="mtHelpText">([^<]+)/)[1].length<150);
  click(h,'mtStart');assert.equal(h.frames.size,1);h.close();
});
test('pointer release fires once; synthetic click cannot duplicate a shot',()=>{
  const h=setup();pointer(h,'pointerdown');assert.equal(h.api.snapshot().shots,0);pointer(h,'pointerup');assert.equal(h.api.snapshot().shots,1);h.canvas.dispatch('click');pointer(h,'pointerup');assert.equal(h.api.snapshot().shots,1);h.close();
});
test('touch drag updates aim, cancel/outside/multitouch never fire',()=>{
  for(const scenario of ['drag','cancel','outside','multitouch','lostcapture','windowcancel']) {
    const h=setup();pointer(h,'pointerdown',{pointerType:'touch'});
    if(scenario==='drag')pointer(h,'pointermove',{clientX:600,clientY:250,pointerType:'touch'});
    if(scenario==='cancel')pointer(h,'pointercancel');
    if(scenario==='outside')pointer(h,'pointermove',{clientX:-10});
    if(scenario==='multitouch')pointer(h,'pointerdown',{pointerId:2,isPrimary:false});
    if(scenario==='lostcapture')pointer(h,'lostpointercapture');
    if(scenario==='windowcancel')h.window.dispatch('pointercancel');
    pointer(h,'pointerup',scenario==='outside'?{clientX:-10}:scenario==='drag'?{clientX:600,clientY:250}:{});
    assert.equal(h.api.snapshot().shots,scenario==='drag'?1:0,scenario);h.close();
  }
});
test('client coordinates scale using CSS rectangle, independent of intrinsic canvas pixels',()=>{
  const h=setup();h.canvas.getBoundingClientRect=()=>({left:50,top:20,width:360,height:260});
  const o=M.LEVELS[0].shooter;pointer(h,'pointerdown',{clientX:50+(o.x+200)/2,clientY:20+o.y/2});pointer(h,'pointerup',{clientX:50+(o.x+200)/2,clientY:20+o.y/2});
  assert.ok(Math.abs(h.api.snapshot().bullet.dx-1)<1e-8);assert.ok(Math.abs(h.api.snapshot().bullet.dy)<1e-8);h.close();
});
test('mouse right button swaps exactly once without shooting or context-menu duplicate',()=>{
  const g=M.create({seed:44});g.state.current=0;g.state.next=1;const h=setup({round:g.serialize()});
  pointer(h,'pointerdown',{button:2});h.canvas.dispatch('contextmenu');pointer(h,'pointerup',{button:2});
  assert.equal(h.api.snapshot().current,1);assert.equal(h.api.snapshot().next,0);assert.equal(h.api.snapshot().shots,0);h.close();
});
test('keyboard local scope, repeat protection, swap, arrow movement and target selection',()=>{
  const g=M.create({seed:44});g.state.current=0;g.state.next=1;const h=setup({round:g.serialize()});
  h.window.dispatch('keydown',{key:'Enter'});assert.equal(h.api.snapshot().shots,0);
  key(h,' ',{repeat:true});assert.equal(h.api.snapshot().current,0);key(h,' ');assert.equal(h.api.snapshot().current,1);
  key(h,']');assert.match(el(h,'mtStatus').textContent,/Ngắm/);key(h,'ArrowRight');h.frame();h.frame();h.canvas.dispatch('keyup',{key:'ArrowRight'});key(h,'Enter');assert.equal(h.api.snapshot().shots,1);h.close();
});
test('pause stops simulation and RAF, blocks actions, and resumes without backlog',()=>{
  const h=setup();h.frame();h.frame();click(h,'mtPause');const before=h.api.snapshot();assert.equal(h.frames.size,0);assert.equal(h.canvas.tabIndex,-1);
  pointer(h,'pointerdown');pointer(h,'pointerup');key(h,'Enter');click(h,'mtFire');h.advance(30000);h.frame();assert.deepEqual(h.api.snapshot(),before);
  click(h,'mtStart');assert.equal(h.frames.size,1);h.frame();assert.equal(h.api.snapshot().ticks,before.ticks);h.frame();assert.ok(h.api.snapshot().ticks>before.ticks);h.close();
});
test('blur, hidden document and pagehide pause safely; visible alone does not resume',()=>{
  for(const event of ['blur','visibilitychange','pagehide']) {
    const h=setup();pointer(h,'pointerdown');key(h,'ArrowRight');
    if(event==='visibilitychange'){h.document.hidden=true;h.document.dispatch(event);}else h.window.dispatch(event);
    assert.equal(h.frames.size,0);assert.equal(el(h,'mtCover').hidden,false);pointer(h,'pointerup');assert.equal(h.api.snapshot().shots,0);
    h.document.hidden=false;h.document.dispatch('visibilitychange');assert.equal(h.frames.size,0);h.close();
  }
});
test('long active-frame interruption pauses rather than simulating offline time',()=>{
  const h=setup();h.frame();h.advance(5000);h.frame();assert.equal(h.api.snapshot().ticks,0);assert.equal(h.frames.size,0);assert.match(el(h,'mtStatus').textContent,/gián đoạn/);h.close();
});
test('save retains projectile and partial step; reopening waits for explicit resume',()=>{
  const h=setup();pointer(h,'pointerdown');pointer(h,'pointerup');h.frame();h.frame();h.close();const stored=JSON.parse(h.stored.get(KEY));assert.ok(stored.round.bullet);
  h.mount();h.canvas=el(h,'mtCanvas');assert.equal(h.frames.size,0);assert.equal(el(h,'mtCover').hidden,false);assert.deepEqual(plain(h.api.snapshot()),stored.round);click(h,'mtStart');assert.equal(h.frames.size,1);h.close();
});
test('retry confirmation freezes play, No preserves round, Yes resets only current route',()=>{
  const g=M.create({level:1,score:500,seed:22});const h=setup({round:g.serialize()});key(h,'Enter');const before=h.api.snapshot();click(h,'mtRetry');assert.equal(h.frames.size,0);assert.equal(el(h,'mtCancel').hidden,false);click(h,'mtFire');assert.deepEqual(h.api.snapshot(),before);
  click(h,'mtCancel');assert.equal(h.frames.size,1);assert.deepEqual(h.api.snapshot(),before);click(h,'mtRetry');click(h,'mtStart');assert.equal(h.api.snapshot().level,1);assert.equal(h.api.snapshot().score,500);assert.equal(h.api.snapshot().shots,0);h.close();
});
test('cancelling a retry requested while paused remains paused',()=>{
  const h=setup();click(h,'mtPause');click(h,'mtRetry');click(h,'mtCancel');assert.equal(h.frames.size,0);assert.equal(el(h,'mtStart').textContent,'Chơi tiếp');h.close();
});
test('natural loss exposes result before focus and replay stays on same route',()=>{
  const g=M.create({level:1,score:500});const shift=g.path.length-M.RADIUS-.01-g.state.train.at(-1).s;g.state.train.forEach(b=>b.s+=shift);
  const h=setup({round:g.serialize()});let focusedWhenVisible=false;el(h,'mtStart').focus=()=>{focusedWhenVisible=el(h,'mtCover').hidden===false;};h.frame();h.frame();assert.equal(h.api.snapshot().status,'lost');assert.equal(focusedWhenVisible,true);assert.equal(h.frames.size,0);assert.match(el(h,'mtStart').textContent,/Thử lại/);click(h,'mtStart');assert.equal(h.api.snapshot().level,1);h.close();
});
test('all clear advances and final campaign result offers a fresh campaign',()=>{
  for(const level of [0,2]) {
    const g=M.create({level});g.state.cleared=g.level.target;g.state.spawnClosed=true;g.state.train=[];g.checkEnd();const h=setup({round:g.serialize(),start:false});
    assert.match(el(h,'mtCoverTitle').textContent,level===2?/Hoàn thành/:/Qua màn/);click(h,'mtStart');assert.equal(h.api.snapshot().level,level===2?0:1);assert.equal(h.api.snapshot().status,'playing');h.close();
  }
});
test('unknown/corrupt save is backed up before replacement; failed backup never overwrites',()=>{
  const raw='{"version":900,"doNotLose":true}',storage=new Map([[KEY,raw]]);const h=setup({storage});assert.equal(h.stored.get(KEY+'_recovery'),raw);assert.equal(JSON.parse(h.stored.get(KEY)).version,1);h.close();
  const other=new Map([[KEY,raw]]),k=setup({storage:other,before:h=>{const original=h.context.localStorage.setItem;h.context.localStorage.setItem=(key,val)=>{if(key.endsWith('_recovery'))throw Error('quota');original(key,val);};}});
  assert.equal(k.stored.get(KEY),raw);assert.match(el(k,'mtStorage').textContent,/Chưa lưu/);k.close();assert.equal(k.stored.get(KEY),raw);
});
test('unreadable storage disables persistence without blocking play; quota also remains playable',()=>{
  const h=setup({before:h=>{h.context.localStorage.getItem=()=>{throw Error('denied');};h.context.localStorage.setItem=()=>{throw Error('must not write');};}});click(h,'mtFire');assert.equal(h.api.snapshot().shots,1);assert.match(el(h,'mtStorage').textContent,/Không đọc/);h.close();
  const k=setup({before:h=>{h.context.localStorage.setItem=()=>{throw Error('quota');};}});click(k,'mtFire');assert.equal(k.api.snapshot().shots,1);assert.match(el(k,'mtStorage').textContent,/Chưa lưu/);k.close();
});
test('reduced motion is automatic without extra settings and missing audio never blocks',()=>{
  const h=setup({reduced:true,audio:{init(){throw Error('audio');},tone(){throw Error('audio');}}});h.context.NEWPLAYGROUND_MUTED=false;assert.equal(el(h,'mtMotion'),null);click(h,'mtFire');assert.equal(h.api.snapshot().shots,1);assert.equal(JSON.parse(h.stored.get(KEY)).motion,false);h.close();
});
test('twenty mount/pause/retry cycles do not accumulate global listeners, RAF or timers',()=>{
  const h=setup();const counts=[h.window.listenerCount(),h.document.listenerCount()];h.close();
  for(let i=0;i<20;i++){h.mount();h.canvas=el(h,'mtCanvas');click(h,'mtStart');click(h,'mtRetry');click(h,'mtStart');assert.deepEqual([h.window.listenerCount(),h.document.listenerCount()],counts);assert.equal(h.frames.size,1);h.close();}
});
test('buttons have 44px minimum, scoped typography and no third-party branding art in view',()=>{
  const css=read('scripts/games/marble-trail.css'),view=read('scripts/games/marble-trail.js');assert.match(css,/min-height:44px/);assert.match(css,/'Calibri'/);assert.doesNotMatch(view,/zuma_intro|PopCap|Ếch Thần|frog|startBGM/);assert.match(view,/trình đọc màn hình/);
});

test('supported shared tone API sounds only when unmuted and receives original notes',()=>{
  const notes=[],h=setup({audio:{init(){return null;},tone(...args){notes.push(args);}}});
  h.context.NEWPLAYGROUND_MUTED=false;click(h,'mtSwap');click(h,'mtFire');assert.deepEqual(notes.map(n=>n[0]),[440,330]);
  h.context.NEWPLAYGROUND_MUTED=true;click(h,'mtSwap');assert.equal(notes.length,2);h.close();
});
test('release outside canvas clears stale pointer even when pointer capture is unavailable',()=>{
  const h=setup();pointer(h,'pointerdown');h.window.dispatch('pointerup',{pointerId:1});pointer(h,'pointerdown');pointer(h,'pointerup');assert.equal(h.api.snapshot().shots,1);h.close();
});

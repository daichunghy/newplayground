// DOM and event doubles cover the service flow and cleanup, not a real browser or device.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const{harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/tea-service-model.js');
const KEY='np_tea_service_v1',el=(h,id)=>h.container.querySelector('#'+id),stored=h=>JSON.parse(h.stored.get(KEY)),view=h=>h.mountResult.getModel().view();
const click=(h,id,detail=0)=>el(h,id).dispatch('click',{detail});
function close(h){h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.equal(h.timers.size,0);assert.deepEqual(h.errors,[]);}
function launch(storage=new Map()){
 const h=harness({loadEngines:false,loadApp:false,storage});vm.runInContext(read('scripts/games/tea-service.js'),h.context,{filename:'scripts/games/tea-service.js'});
 h.mount=()=>{h.mountResult=h.context.NP_TeaService.mount(h.container,h.context.NP_GameSession.start(),null);return h.mountResult;};h.mount();return h;
}
function saved(game){return new Map([[KEY,JSON.stringify({version:1,best:0,game})]]);}
function stateWithParty(size){const s=M.create().serialize();s.ticks=1;s.scheduleIndex=1;s.queue=[1];s.customers=[{id:1,size,patience:540,maxPatience:540,recipe:0,status:'queue',tableIndex:null,arrivedAt:0}];s.nextId=2;return s;}

test('Tiệm Lá Trà starts immediately with a compact service board and usable tap targets',()=>{
 const h=launch();assert.equal(el(h,'tsOverlay').hidden,true);assert.equal(h.frames.size,1);assert.equal(el(h,'tsShift').textContent,'1 / 3');
 for(const id of ['tsGuest0','tsGuest1','tsGuest2','tsKitchen','tsTable0','tsTable1','tsTable2','tsNew','tsPause'])assert.ok(el(h,id),id);
 assert.match(read('scripts/games/tea-service.css'),/min-height:44px/);assert.match(read('scripts/games/tea-service.css'),/prefers-reduced-motion/);assert.equal(el(h,'tsStatus').getAttribute('aria-live'),'polite');close(h);
});

test('one table completes seat, order, cook, pickup and serve with automatic meal scoring and table turnover',()=>{
 const h=launch();for(let i=0;i<2;i++)h.frame();assert.equal(view(h).queue.length,1);click(h,'tsGuest0');assert.ok(view(h).selectedCustomerId);click(h,'tsTable0');assert.equal(view(h).tables[0].state,'order');click(h,'tsTable0');assert.equal(view(h).tables[0].state,'ordered');
 for(let i=0;i<M.RECIPES[view(h).tickets[0].recipe].cook;i++)h.frame();assert.equal(view(h).tickets[0].status,'ready');click(h,'tsKitchen');assert.ok(view(h).heldTicket);click(h,'tsTable0');assert.equal(view(h).tables[0].state,'eating');
 const score=view(h).score,eating=view(h).tables[0].eatLeft;for(let i=0;i<eating;i++)h.frame();assert.equal(view(h).tables[0].state,'empty');assert.ok(view(h).score>score);assert.ok(stored(h).game);close(h);
});

test('party capacity feedback preserves the selected group until it fits a table',()=>{
 const h=launch(saved(stateWithParty(3)));click(h,'tsContinue');click(h,'tsGuest0');click(h,'tsTable0');assert.equal(view(h).tables[0].state,'empty');assert.equal(view(h).selectedCustomerId,1);assert.match(el(h,'tsStatus').textContent,/không đủ chỗ/);
 click(h,'tsTable2');assert.equal(view(h).tables[2].state,'order');assert.equal(view(h).selectedCustomerId,null);close(h);
});

test('pause/reopen is safe, restart cancellation preserves the same service state',()=>{
 const s=stateWithParty(1),h=launch(saved(s));assert.equal(h.frames.size,0);click(h,'tsContinue');assert.equal(h.frames.size,1);const before=stored(h).game;click(h,'tsNew');assert.equal(el(h,'tsOverlay').hidden,false);assert.equal(el(h,'tsConfirm').hidden,false);assert.equal(el(h,'tsContinue').hidden,true);assert.match(read('scripts/games/tea-service.js'),/class="ts-card"[\s\S]*?id="tsConfirm"/);click(h,'tsConfirmNo');assert.equal(h.frames.size,1);assert.deepEqual(stored(h).game,before);click(h,'tsNew');click(h,'tsConfirmYes');assert.equal(view(h).ticks,0);assert.equal(view(h).customers.length,0);assert.equal(h.frames.size,1);close(h);
});

test('exact catalog route installs the original service module and releases timers/listeners on close',()=>{
 const h=harness();assert.equal(h.context.openGameById('diner-dash'),true);assert.ok(h.container.querySelector('#tsTable0'));h.frame();h.context.closeGameModal();assertStopped(h);h.flushTimeouts();assert.deepEqual(h.errors,[]);close(h);
 assert.doesNotMatch(read('scripts/games/tea-service.js').replace(/launchDinerDash/g,''),/Diner Dash|Flo|Hometown Hero|Glu/);
 assert.match(read('app.js'),/'diner-dash': 'assets\/tea-service-original\.svg'/);
});

test('corrupt, future and unavailable storage retain play without silent overwrite',()=>{
 const broken=launch(new Map([[KEY,'{broken']]));assert.equal(broken.stored.get(KEY+'_recovery'),'{broken');assert.equal(stored(broken).game.status,'playing');assert.match(el(broken,'tsStorage').textContent,/Bản lưu lỗi/);close(broken);
 const raw=JSON.stringify({version:2,game:{version:2}}),future=launch(new Map([[KEY,raw]]));click(future,'tsGuest0');assert.equal(future.stored.get(KEY),raw);assert.match(el(future,'tsStorage').textContent,/mới hơn/);close(future);
 const blocked=launch();blocked.context.localStorage.setItem=()=>{throw new Error('quota');};for(let i=0;i<60;i++)blocked.frame();assert.match(el(blocked,'tsStorage').textContent,/Không lưu/);assert.equal(view(blocked).status,'playing');close(blocked);
});

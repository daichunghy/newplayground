// DOM/event doubles exercise controls and cleanup; no real browser is simulated.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const{harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/beacon-shore-model.js');
const KEY='np_beacon_shore_v1',el=(h,id)=>h.container.querySelector('#'+id),view=h=>h.mountResult.getModel().view();
const click=(h,id)=>el(h,id).dispatch('click',{detail:1});
function close(h){h.context.NP_GameSession.stop();h.container.innerHTML='';h.flushTimeouts();assertStopped(h);assert.deepEqual(h.errors,[]);}
function launch(storage=new Map()){
 const h=harness({loadEngines:false,loadApp:false,storage});vm.runInContext(read('scripts/games/beacon-shore.js'),h.context,{filename:'scripts/games/beacon-shore.js'});
 h.mount=()=>{h.mountResult=h.context.NP_BeaconShore.mount(h.container,h.context.NP_GameSession.start());return h.mountResult;};h.mount();h.flushTimeouts();return h;
}
function saved(game){return new Map([[KEY,JSON.stringify({version:1,best:game.score||0,game})]]);}

test('Bờ Kè Sao opens directly on five simple lanes with useful device and live controls',()=>{
 const h=launch();assert.equal(h.frames.size,1);assert.equal(el(h,'bsWave').textContent,'1 / 4');assert.equal(el(h,'bsEnergy').textContent,'100');for(const id of ['bsCell-0-0','bsCell-4-6','bsSelect-lamp','bsSelect-fan','bsSelect-bell','bsNew','bsPause'])assert.ok(el(h,id),id);assert.equal(h.container.querySelectorAll('.bs-cell').length,35);assert.equal(el(h,'bsStatus').getAttribute('aria-live'),'polite');assert.match(read('scripts/games/beacon-shore.css'),/min-height:44px/);assert.match(read('scripts/games/beacon-shore.css'),/prefers-reduced-motion/);assert.match(read('scripts/games/beacon-shore.css'),/overflow-x:auto/);close(h);
});

test('choosing and placing a device is immediate; occupied and unaffordable taps give concise feedback',()=>{
 const h=launch();click(h,'bsSelect-fan');click(h,'bsCell-2-4');assert.equal(view(h).selectedType,'fan');assert.deepEqual([...view(h).towers].map(t=>[t.row,t.col,t.type]),[[2,4,'fan']]);assert.equal(view(h).energy,45);click(h,'bsCell-2-4');assert.match(el(h,'bsStatus').textContent,/Ô đã có khí cụ/);click(h,'bsSelect-bell');click(h,'bsCell-0-0');assert.match(el(h,'bsStatus').textContent,/Thiếu đèn năng lượng/);assert.equal(view(h).towers.length,1);assert.deepEqual(h.errors,[]);close(h);
});

test('energy regenerates without collecting anything and pause/reopen restores a paused board',()=>{
 const storage=new Map(),h=launch(storage);click(h,'bsCell-1-1');assert.equal(view(h).energy,55);click(h,'bsPause');assert.equal(h.frames.size,0);assert.equal(el(h,'bsCell-1-1').disabled,true);assert.ok(storage.get(KEY));close(h);const again=launch(storage);assert.equal(view(again).towers.length,1);assert.equal(again.mountResult.isPaused(),true);click(again,'bsContinue');assert.equal(again.frames.size,1);for(let i=0;i<152;i++)again.frame();assert.equal(view(again).energy,69);close(again);
});

test('restart prompt is over the controls; cancel resumes and confirm clears the whole lane board',()=>{
 const h=launch();click(h,'bsCell-1-2');click(h,'bsNew');assert.equal(el(h,'bsOverlay').hidden,false);assert.equal(el(h,'bsConfirm').hidden,false);assert.equal(el(h,'bsContinue').hidden,true);assert.match(read('scripts/games/beacon-shore.js'),/class="bs-card"[\s\S]*?id="bsConfirm"/);click(h,'bsConfirmNo');assert.equal(h.frames.size,1);assert.equal(view(h).towers.length,1);click(h,'bsNew');click(h,'bsConfirmYes');assert.equal(view(h).tick,0);assert.equal(view(h).towers.length,0);assert.equal(h.frames.size,1);close(h);
});

test('corrupt, future-version and unavailable storage keep play without overwriting snapshots',()=>{
 const bad=launch(new Map([[KEY,'bad json']]));assert.equal(bad.stored.get(KEY+'_recovery'),'bad json');assert.match(el(bad,'bsStorage').textContent,/Bản lưu lỗi/);close(bad);const raw=JSON.stringify({version:2,game:{version:2}}),future=launch(new Map([[KEY,raw]]));click(future,'bsSelect-fan');assert.equal(future.stored.get(KEY),raw);assert.match(el(future,'bsStorage').textContent,/mới hơn/);close(future);const blocked=launch();blocked.context.localStorage.setItem=()=>{throw new Error('quota');};for(let i=0;i<140;i++)blocked.frame();assert.match(el(blocked,'bsStorage').textContent,/Không lưu/);assert.equal(view(blocked).status,'playing');close(blocked);
});

test('exact route installs original Bờ Kè Sao module and close removes the owned loop',()=>{
 const h=harness();assert.equal(h.context.openGameById('plants-vs-zombies-2d'),true);assert.ok(h.container.querySelector('#bsCell-2-3'));h.frame();h.context.closeGameModal();assertStopped(h);h.flushTimeouts();assert.deepEqual(h.errors,[]);close(h);assert.match(read('app.js'),/assets\/beacon-shore-original\.svg/);assert.doesNotMatch(read('scripts/games/beacon-shore.js').replace(/launchPvZ/g,''),/Plants vs|Zomb|Peashoot|Sunflower|PopCap/i);assert.doesNotMatch(read('scripts/engines-classics.js'),/Plants vs Zombies|pvzCanvas|pvzSun|peashooter|Cherry Bùm/i);
});

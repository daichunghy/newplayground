// DOM/Canvas doubles verify controls and cleanup; browser/device acceptance is separate.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const{harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/cloud-canopy-model.js');
const KEY='np_cloud_canopy_v1',el=(h,id)=>h.container.querySelector('#'+id),stored=h=>JSON.parse(h.stored.get(KEY)),view=h=>h.mountResult.getModel().view();
const click=(h,id,detail=0)=>el(h,id).dispatch('click',{detail});
function key(h,k,extra={}){h.container.dispatch('keydown',{key:k,code:k,target:el(h,'ccCanvas'),...extra});}
function keyup(h,k){h.window.dispatch('keyup',{key:k,code:k});}
function close(h){h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.equal(h.timers.size,0);assert.deepEqual(h.errors,[]);}
function launch(storage=new Map()){
 const h=harness({loadEngines:false,loadApp:false,storage});vm.runInContext(read('scripts/games/cloud-canopy.js'),h.context,{filename:'scripts/games/cloud-canopy.js'});
 h.mount=()=>{h.mountResult=h.context.NP_CloudCanopy.mount(h.container,h.context.NP_GameSession.start(),null);return h.mountResult;};h.mount();return h;
}
function saved(state){return new Map([[KEY,JSON.stringify({version:1,best:0,game:state})]]);}
function fixture(edit){const s=M.create({score:80,lives:3}).serialize();edit(s);return s;}

test('new Vòm Mây opens immediately with original route, compact HUD and touch controls',()=>{
 const h=launch();assert.equal(el(h,'ccOverlay').hidden,true);assert.equal(h.frames.size,1);assert.equal(el(h,'ccStage').textContent,'1 / 3');assert.equal(el(h,'ccBells').textContent,'0 / 3');
 for(const id of ['ccLeft','ccRight','ccJump','ccPause','ccNew','ccCanvas'])assert.ok(el(h,id));assert.match(el(h,'ccCanvas').getAttribute('aria-label'),/Vòm Mây/);assert.equal(el(h,'ccStatus').getAttribute('aria-live'),'polite');
 click(h,'ccJump');assert.ok(view(h).player.y<286);close(h);
});

test('arrow keys and d-pad hold move immediately; release and cancel clear only their owners',()=>{
 const h=launch();key(h,'ArrowRight');for(let i=0;i<7;i++)h.frame();assert.ok(view(h).player.x>48);keyup(h,'ArrowRight');for(let i=0;i<28;i++)h.frame();const stop=view(h).player.x;assert.equal(view(h).player.vx,0);for(let i=0;i<5;i++)h.frame();assert.equal(view(h).player.x,stop);
 const left=el(h,'ccLeft');key(h,'ArrowRight');left.dispatch('pointerdown',{pointerId:4,button:0});h.window.dispatch('pointercancel',{pointerId:4});click(h,'ccLeft',1);for(let i=0;i<5;i++)h.frame();assert.ok(view(h).player.vx>0);keyup(h,'ArrowRight');close(h);
});

test('held jump gives a higher arc; one press does not auto-repeat after release',()=>{
 const h=launch();for(let i=0;i<3;i++)h.frame();key(h,' ');for(let i=0;i<6;i++)h.frame();const high=view(h).player.y;keyup(h,' ');for(let i=0;i<35;i++)h.frame();assert.ok(view(h).player.grounded||view(h).player.y>high);assert.equal(el(h,'ccJump').disabled,false);close(h);
});

test('chime charges power a touch-first midair gust and a confirmed new game clears them',()=>{
 const s=fixture(x=>{x.collected[0]=true;x.player.x=300;x.player.y=190;x.player.vx=0;x.player.vy=0;x.player.grounded=false;});
 const h=launch(saved(s));assert.ok(el(h,'ccGust'));assert.equal(el(h,'ccGust').disabled,true);assert.match(el(h,'ccGust').getAttribute('aria-label'),/luồng gió/);click(h,'ccContinue');assert.equal(el(h,'ccGust').disabled,false);
 el(h,'ccGust').dispatch('pointerdown',{pointerId:19,button:0});h.frame();h.frame();h.window.dispatch('pointerup',{pointerId:19});
 assert.equal(view(h).gustCharges,0);assert.equal(view(h).player.gustUsed,true);assert.ok(view(h).player.vy< -9);assert.equal(el(h,'ccGust').disabled,true);
 click(h,'ccPause');click(h,'ccNew');assert.equal(el(h,'ccConfirm').hidden,false);click(h,'ccConfirmYes');assert.equal(view(h).gustCharges,0);assert.equal(view(h).player.gustUsed,false);assert.equal(h.frames.size,1);
 const css=read('scripts/games/cloud-canopy.css');assert.match(css,/\.cc-gust[^\n]*min-width:70px/);assert.match(css,/\.cc-button\s*\{[^}]*min-height:44px/);close(h);
});

test('checkpoint, locked gate and stage continuation expose the current objective',()=>{
 const s=fixture(x=>{x.collected=[true,true,false];x.player.x=1500;x.player.y=284;x.player.vx=0;x.player.vy=0;x.player.grounded=true;});
 const h=launch(saved(s));click(h,'ccContinue');for(let i=0;i<3;i++)h.frame();assert.equal(view(h).status,'playing');assert.match(el(h,'ccStatus').textContent,/Còn 1 chuông/);close(h);
 const goal=fixture(x=>{x.collected.fill(true);x.player.x=M.LEVELS[0].gate.x;x.player.y=M.LEVELS[0].gate.y;x.player.vx=0;x.player.vy=0;});
 const w=launch(saved(goal));click(w,'ccContinue');for(let i=0;i<3;i++)w.frame();assert.equal(view(w).status,'cleared');click(w,'ccContinue');assert.equal(view(w).stage,1);close(w);
});

test('saved round reopens paused; restart cancellation preserves either running or paused state',()=>{
 const s=fixture(x=>{x.player.x=100;x.ticks=2;});const h=launch(saved(s));assert.equal(h.frames.size,0);click(h,'ccContinue');click(h,'ccPause');assert.equal(h.frames.size,0);click(h,'ccNew');assert.equal(el(h,'ccConfirm').hidden,false);click(h,'ccConfirmNo');assert.equal(h.frames.size,0);assert.equal(el(h,'ccOverlay').hidden,false);close(h);
 const r=launch();click(r,'ccJump');for(let i=0;i<2;i++)r.frame();click(r,'ccNew');assert.equal(el(r,'ccConfirm').hidden,false);click(r,'ccConfirmNo');assert.equal(r.frames.size,1);close(r);
});

test('loss and retry, future-save preservation, and close cleanup are deterministic',()=>{
 const doomed=fixture(x=>{x.lives=1;x.player.y=500;x.player.vy=9;});const h=launch(saved(doomed));click(h,'ccContinue');for(let i=0;i<3;i++)h.frame();assert.equal(view(h).status,'lost');const final=stored(h).game;assert.equal(final.lives,0);click(h,'ccContinue');assert.equal(view(h).status,'playing');assert.equal(view(h).ticks,0);close(h);
});

test('corrupt/future saves are preserved and storage failure does not disable play',()=>{
 const broken=launch(new Map([[KEY,'{broken']]));assert.equal(broken.stored.get(KEY+'_recovery'),'{broken');assert.equal(stored(broken).game.status,'playing');assert.match(el(broken,'ccStorage').textContent,/Bản lưu lỗi/);close(broken);
 const raw=JSON.stringify({version:2,game:{version:2}}),future=launch(new Map([[KEY,raw]]));click(future,'ccJump');assert.equal(future.stored.get(KEY),raw);assert.match(el(future,'ccStorage').textContent,/mới hơn/);close(future);
 const blocked=launch();blocked.context.localStorage.setItem=()=>{throw new Error('quota');};click(blocked,'ccJump');for(let i=0;i<60;i++)blocked.frame();assert.match(el(blocked,'ccStorage').textContent,/Không lưu/);assert.doesNotThrow(()=>view(blocked));close(blocked);
});

test('blur and long-frame suspension pause and save without processing unattended hazards',()=>{
 const h=launch();h.frame();h.frame();h.advance(400);h.frame();assert.equal(h.frames.size,0);assert.equal(el(h,'ccOverlay').hidden,false);const snapshot=stored(h).game;
 click(h,'ccContinue');h.window.dispatch('blur');assert.equal(h.frames.size,0);assert.deepEqual(stored(h).game,snapshot);close(h);
});

test('exact catalog route uses the original wrapper and no copied Nintendo assets enter the new module',()=>{
 const h=harness();assert.equal(h.context.openGameById('mario-co-dien'),true);assert.ok(h.container.querySelector('#ccCanvas'));h.context.closeGameModal();assertStopped(h);h.flushTimeouts();assert.deepEqual(h.errors,[]);
 assert.doesNotMatch(read('scripts/games/cloud-canopy.js').replace(/launchMario/g,''),/Mario|Nintendo|Bowser|Mushroom|Goomba|Pipe|Question block/);
 assert.match(read('app.js'),/'mario': 'assets\/cloud-canopy-original\.svg'/);close(h);
});

// DOM/Canvas doubles cover input and lifecycle contracts, not visual/device acceptance.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/garden-bombs-model.js');
const KEY='np_garden_bombs_v1',el=(h,id)=>h.container.querySelector('#'+id),save=h=>JSON.parse(h.stored.get(KEY)),view=h=>h.mountResult.getModel().view();
const click=(h,id,detail=0)=>el(h,id).dispatch('click',{detail});
function key(h,k,extra={}){h.container.dispatch('keydown',{key:k,code:k,target:el(h,'gbCanvas'),...extra});}
function keyup(h,k){h.window.dispatch('keyup',{key:k,code:k});}
function close(h){h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.equal(h.timers.size,0);assert.deepEqual(h.errors,[]);}
function actor(r,c,ticks=0){return{r,c,fromR:r,fromC:c,movedAt:ticks,heading:'right',cooldown:0};}
function snapshot({player,bombs=[],ticks=0,capacity=1,range=2}={}){
 const s=M.create({seed:42}).serialize();s.enemies.forEach(e=>e.alive=false);s.ticks=ticks;s.player=player||actor(1,1,ticks);s.bombs=bombs;s.nextBomb=bombs.reduce((n,b)=>Math.max(n,b.id+1),1);s.capacity=capacity;s.range=range;return s;
}
function launch(storage=new Map()){
 const h=harness({loadEngines:false,loadApp:false,storage});
 vm.runInContext(read('scripts/games/garden-bombs.js'),h.context,{filename:'scripts/games/garden-bombs.js'});
 h.mount=()=>{h.mountResult=h.context.NP_GardenBombs.mount(h.container,h.context.NP_GameSession.start(),null);return h.mountResult;};
 h.mount();return h;
}
function savedRun(state){return new Map([[KEY,JSON.stringify({version:1,best:0,game:state})]]);}

test('new run opens instantly with compact original art and accessible controls',()=>{
 const h=launch();assert.equal(el(h,'gbOverlay').hidden,true);assert.equal(h.frames.size,1);assert.equal(el(h,'gbCanvas').width,352);
 assert.equal(el(h,'gbStage').textContent,'1 / 5');assert.equal(el(h,'gbPests').textContent,'3');
 for(const id of ['gbUp','gbDown','gbLeft','gbRight','gbPlace','gbPause','gbNew'])assert.ok(el(h,id),id);
 assert.match(el(h,'gbCanvas').getAttribute('aria-label'),/màn 1 trên 5/);assert.equal(el(h,'gbStatus').getAttribute('aria-live'),'polite');
 assert.match(read('scripts/games/garden-bombs.css'),/min-height:48px/);assert.match(read('scripts/games/garden-bombs.css'),/prefers-reduced-motion/);
 click(h,'gbPlace');assert.equal(save(h).game.bombs.length,1);assert.equal(save(h).game.bombs[0].range,2);close(h);
});

test('arrow/WASD movement responds immediately, repeats while held and stops on release',()=>{
 const h=launch(),start=view(h).player.c;key(h,'ArrowRight');assert.equal(view(h).player.c,start+1);
 for(let i=0;i<15;i++)h.frame();assert.ok(view(h).player.c>=start+2);keyup(h,'ArrowRight');const stop=view(h).player.c;
 for(let i=0;i<12;i++)h.frame();assert.equal(view(h).player.c,stop);assert.equal(save(h).game.player.c,stop);close(h);
});

test('Space is edge-triggered and restart confirmation is reversible in either pause state',()=>{
 const h=launch();key(h,' ');assert.equal(save(h).game.bombs.length,1);key(h,' ',{repeat:true});assert.equal(save(h).game.bombs.length,1);
 const active=save(h).game;click(h,'gbNew');assert.equal(el(h,'gbConfirm').hidden,false);assert.equal(h.frames.size,0);
 click(h,'gbConfirmNo');assert.deepEqual(save(h).game,active);assert.equal(h.frames.size,1);close(h);
 const p=launch(savedRun(snapshot({ticks:3})));assert.equal(p.frames.size,0);click(p,'gbContinue');click(p,'gbPause');assert.equal(p.frames.size,0);click(p,'gbNew');click(p,'gbConfirmNo');assert.equal(p.frames.size,0);assert.equal(el(p,'gbOverlay').hidden,false);close(p);
});

test('pointer cancel and synthetic click suppression preserve independent held owners',()=>{
 const s=snapshot({player:actor(1,3)}),h=launch(savedRun(s));click(h,'gbContinue');key(h,'ArrowRight');
 const down=el(h,'gbDown');down.dispatch('pointerdown',{pointerId:7,button:0});assert.equal(view(h).wanted,'down');
 h.window.dispatch('pointercancel',{pointerId:7});click(h,'gbDown',1);assert.equal(view(h).wanted,'right');assert.equal(view(h).player.c,3);
 keyup(h,'ArrowRight');assert.equal(view(h).wanted,null);close(h);
});

test('saved active game reopens paused; pause, visibility and interrupted frames do not simulate unattended time',()=>{
 const state=snapshot({ticks:6,player:actor(1,2,6)}),h=launch(savedRun(state));assert.equal(h.frames.size,0);assert.equal(el(h,'gbOverlay').hidden,false);
 click(h,'gbContinue');assert.equal(h.frames.size,1);h.window.dispatch('blur');assert.equal(h.frames.size,0);const paused=save(h).game;
 h.document.hidden=true;h.document.dispatch('visibilitychange');assert.deepEqual(save(h).game,paused);
 click(h,'gbContinue');h.advance(500);h.frame();assert.equal(h.frames.size,0);assert.equal(el(h,'gbOverlay').hidden,false);close(h);
});

test('clear opens gate and proceeds one stage; loss can retry without mutating a terminal run',()=>{
 const s=snapshot({player:actor(1,8)}),h=launch(savedRun(s));click(h,'gbContinue');key(h,'ArrowRight');
 assert.equal(save(h).game.status,'cleared');assert.equal(el(h,'gbOverlay').hidden,false);assert.match(el(h,'gbOverlayTitle').textContent,/Mở cổng/);
 click(h,'gbContinue');assert.equal(save(h).game.stage,1);assert.equal(save(h).game.status,'playing');close(h);
 const fail=snapshot({player:actor(5,1),bombs:[{id:1,r:5,c:2,fuse:1,range:2}]});fail.nextBomb=2;
 const lost=launch(savedRun(fail));click(lost,'gbContinue');for(let i=0;i<4;i++)lost.frame();assert.equal(save(lost).game.status,'lost');const terminal=save(lost).game;
 assert.equal(el(lost,'gbOverlay').hidden,false);click(lost,'gbContinue');assert.equal(save(lost).game.status,'playing');assert.equal(save(lost).game.ticks,0);assert.notDeepEqual(save(lost).game,terminal);close(lost);
});

test('corrupt saves are backed up; future-version saves and quota failures are never overwritten',()=>{
 const corrupt=launch(new Map([[KEY,'{broken']]));assert.equal(corrupt.stored.get(KEY+'_recovery'),'{broken');assert.equal(save(corrupt).game.status,'playing');assert.match(el(corrupt,'gbStorage').textContent,/Bản lưu lỗi/);close(corrupt);
 const raw=JSON.stringify({version:2,game:{version:2}}),future=launch(new Map([[KEY,raw]]));click(future,'gbPlace');assert.equal(future.stored.get(KEY),raw);assert.match(el(future,'gbStorage').textContent,/mới hơn/);close(future);
 const blocked=launch();blocked.context.localStorage.setItem=()=>{throw new Error('quota');};click(blocked,'gbPlace');assert.match(el(blocked,'gbStorage').textContent,/Không lưu/);assert.equal(el(blocked,'gbPests').textContent,'3');close(blocked);
});

test('close and exact catalog routing clean canvas loop and release all listeners',()=>{
 const h=harness();assert.equal(h.context.openGameById('dat-bom-bomberman'),true);assert.ok(h.container.querySelector('#gbCanvas'));
 h.frame();h.context.closeGameModal();assertStopped(h);h.flushTimeouts();assertStopped(h);closeDirect(h);
 function closeDirect(x){x.container.innerHTML='';x.context.NP_GameSession.stop();assertStopped(x);assert.equal(x.errors.length,0);}
});

test('campaign stage outcome and canvas title remain original rather than branded assets',()=>{
 const source=read('scripts/games/garden-bombs.js');assert.match(source,/Original, lightweight Bom Vườn/);
 assert.doesNotMatch(source,/Bomberman|Bazzi|B'n'B|Konami/);assert.match(read('index.html'),/garden-bombs\.css/);assert.match(read('index.html'),/garden-bombs-model\.js/);
 const games=JSON.parse(read('data/games.json')),item=games.find(g=>g.id==='dat-bom-bomberman');assert.equal(item.title,'Bom Vườn');assert.equal(item.players,'1 người');
 assert.match(read('app.js'),/'dat-bom': 'assets\/garden-bombs-original\.svg'/);assert.match(read('assets/ASSET_MANIFEST.json'),/assets\/garden-bombs-original\.svg/);
 assert.match(read('scripts/release-preflight.mjs'),/dat_bom_cover\.png.*datbom_intro\.jpg/);
});

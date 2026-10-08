const test=require('node:test'),assert=require('node:assert/strict');
const{harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/sun-garden-model.js');
const el=(h,id)=>h.container.querySelector('#'+id),click=(h,id)=>el(h,id).dispatch('click',{detail:1});
function close(h){h.context.closeGameModal();assertStopped(h);assert.deepEqual(h.errors,[]);}
function direct(storage=new Map()){
 const h=harness({loadApp:false,storage});h.mountResult=h.context.NP_SunGarden.mount(h.container,h.context.NP_GameSession.start(),h.context.NP_AudioEngine);return h;
}
function closeDirect(h){h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.deepEqual(h.errors,[]);}

test('the exact catalog route launches Vườn Nắng directly with a compact nine-bed field',()=>{
 const h=harness();assert.equal(h.context.openGameById('nong-trai-vui-ve'),true);assert.ok(el(h,'sgBoard'));assert.equal(h.frames.size,1);assert.equal(el(h,'sgClock').textContent,'45s');
 assert.equal(h.container.querySelector('#nfPlotsGrid'),null);assert.equal(h.container.querySelectorAll('.sg-plot').length,9);assert.equal(el(h,'sgOverlay').hidden,true);assert.equal(el(h,'sgStatus').getAttribute('aria-live'),'polite');
 assert.match(read('app.js'),/'nong-trai-vui-ve': 'assets\/sun-garden-original\.svg'/);close(h);
});

test('planting and seed changes update the real field; ripe crops auto-collect and free plots',()=>{
 const h=harness();h.context.openGameById('nong-trai-vui-ve');click(h,'sgSeedBloom');assert.equal(el(h,'sgSeedBloom').getAttribute('aria-pressed'),'true');
 for(let i=0;i<M.PLOTS;i++)click(h,`sgPlot${i}`);
 assert.equal(el(h,'sgIcon0').textContent,'🌻');assert.equal(el(h,'sgPlot0').classList.contains('sg-growing'),true);
 for(let i=0;i<439;i++)h.frame();assert.equal(el(h,'sgBaskets').textContent,'27 / 108');assert.equal(el(h,'sgIcon0').textContent,'＋');assert.equal(el(h,'sgPlot0').classList.contains('sg-empty'),true);close(h);
});

test('the timed garden can reach the quota through repeated plant-grow-harvest loops',()=>{
 const h=harness();h.context.openGameById('nong-trai-vui-ve');click(h,'sgSeedBloom');
 for(let wave=0;wave<4;wave++){for(let i=0;i<M.PLOTS;i++)click(h,`sgPlot${i}`);for(let i=0;i<439;i++)h.frame();}
 assert.equal(el(h,'sgBaskets').textContent,'108 / 108');assert.equal(el(h,'sgOverlay').hidden,false);assert.match(el(h,'sgOverlayTitle').textContent,/Đủ giỏ/);click(h,'sgContinue');assert.equal(el(h,'sgBaskets').textContent,'0 / 108');assert.equal(h.frames.size,1);close(h);
});

test('pause freezes crops and timer, resume starts with a fresh frame baseline, restart does not duplicate RAF',()=>{
 const h=harness();h.context.openGameById('nong-trai-vui-ve');click(h,'sgSeedBloom');click(h,'sgPlot0');h.frame();click(h,'sgPause');assert.equal(h.frames.size,0);const saved=el(h,'sgClock').textContent;h.advance(5000);h.frame();assert.equal(el(h,'sgClock').textContent,saved);click(h,'sgContinue');assert.equal(h.frames.size,1);h.frame();assert.equal(h.frames.size,1);click(h,'sgNew');assert.equal(el(h,'sgBaskets').textContent,'0 / 108');assert.equal(h.frames.size,1);close(h);
});

test('a sunset result is clear, replay works, and losing focus pauses instead of advancing unattended',()=>{
 const h=direct();h.mountResult.getModel().advance(30000);h.mountResult.getModel().advance(M.DAY_MS-30000);h.frame();assert.equal(el(h,'sgOverlay').hidden,false);assert.match(el(h,'sgOverlayTitle').textContent,/Hết nắng/);click(h,'sgContinue');assert.equal(el(h,'sgOverlay').hidden,true);assert.equal(el(h,'sgBaskets').textContent,'0 / 108');
 h.window.dispatch('blur');assert.equal(h.frames.size,0);assert.match(el(h,'sgOverlayTitle').textContent,/tạm dừng/i);click(h,'sgContinue');assert.equal(h.frames.size,1);closeDirect(h);
});

test('a short run needs no storage; close cancels the active animation frame',()=>{
 const h=direct();h.context.localStorage.getItem=()=>{throw new Error('storage unavailable');};assert.doesNotThrow(()=>click(h,'sgPlot0'));assert.equal(h.frames.size,1);closeDirect(h);
});

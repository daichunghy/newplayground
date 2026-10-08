const test=require('node:test'),assert=require('node:assert/strict');
const{harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/sea-garden-model.js');
const el=(h,id)=>h.container.querySelector('#'+id),click=(h,id)=>el(h,id).dispatch('click',{detail:1});
function close(h){h.context.closeGameModal();assertStopped(h);assert.deepEqual(h.errors,[]);}
function direct(){const h=harness({loadApp:false});h.mountResult=h.context.NP_SeaGarden.mount(h.container,h.context.NP_GameSession.start(),h.context.NP_AudioEngine);return h;}
function closeDirect(h){h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.deepEqual(h.errors,[]);}
function pointer(h,x,y){const rect=el(h,'seaCanvas').getBoundingClientRect();el(h,'seaCanvas').dispatch('pointerdown',{button:0,clientX:rect.left+x,clientY:rect.top+y});}

test('the exact catalog route opens Bể Sao immediately with a short goal and original artwork',()=>{
 const h=harness();assert.equal(h.context.openGameById('nuoi-ca-nemo'),true);assert.ok(el(h,'seaCanvas'));assert.equal(h.frames.size,1);assert.equal(el(h,'seaPearls').textContent,`0 / ${M.GOAL}`);assert.equal(el(h,'seaFish').textContent,'3');for(const id of ['seaNew','seaPause','seaContinue'])assert.ok(el(h,id));assert.match(read('app.js'),/'nuoi-ca-nemo': 'assets\/sea-garden-original\.svg'/);assert.doesNotMatch(h.container.innerHTML,/Nemo|Insaniquarium|coins|upgrade/i);close(h);
});

test('tap drops food for fish to chase and auto-collected pearls update the short score',()=>{
 const h=direct(),fish=h.mountResult.getModel().view().fish[0];pointer(h,fish.x+20,fish.y+10);assert.equal(h.mountResult.getModel().view().foodCount,1);for(let i=0;i<240&&h.mountResult.getModel().view().fish[0].fed===0;i++)h.frame();assert.equal(h.mountResult.getModel().view().fish[0].fed,1);const current=h.mountResult.getModel().view().fish[0];pointer(h,current.x,current.y);for(let i=0;i<240&&h.mountResult.getModel().view().fish[0].fed<2;i++)h.frame();assert.equal(h.mountResult.getModel().view().fish[0].fed,2);for(let i=0;i<120&&h.mountResult.getModel().view().pearls===0;i++)h.frame();assert.equal(h.mountResult.getModel().view().pearls,1);assert.match(el(h,'seaPearls').textContent,/1 \/ 8/);closeDirect(h);
});

test('tap on a visible alien zaps it and leaves the food count alone',()=>{
 const h=direct(),g=h.mountResult.getModel();for(let i=0;i<820&&(!g.view().alien||g.view().alien.x<=0||g.view().alien.x>=M.WIDTH);i++)h.frame();assert.ok(g.view().alien);const alien=g.view().alien;assert.ok(alien.x>0&&alien.x<M.WIDTH);for(let i=0;i<3;i++)pointer(h,alien.x,alien.y);assert.equal(g.view().aliens.length,0);assert.equal(g.view().shots,3);assert.equal(g.view().foodCount,0);closeDirect(h);
});

test('Space feeds or zaps, and pause/restart, blur and close release the owned frame',()=>{
 const h=direct();el(h,'seaCanvas').dispatch('keydown',{key:' ',code:'Space'});assert.equal(h.mountResult.getModel().view().foodCount,1);el(h,'seaCanvas').dispatch('keydown',{key:' ',code:'Space',repeat:true});assert.equal(h.mountResult.getModel().view().foodCount,1);click(h,'seaPause');assert.equal(h.frames.size,0);assert.equal(h.mountResult.isPaused(),true);click(h,'seaContinue');assert.equal(h.frames.size,1);click(h,'seaNew');assert.equal(h.mountResult.getModel().view().foodCount,0);h.window.dispatch('blur');assert.equal(h.frames.size,0);click(h,'seaContinue');assert.equal(h.frames.size,1);closeDirect(h);
});

test('canvas input and controls keep touch space, help stays optional and legacy art is excluded',()=>{
 const h=harness();h.context.openGameById('nuoi-ca-nemo');assert.equal(el(h,'seaCanvas').getAttribute('tabindex'),'0');assert.equal(el(h,'seaCanvas').getAttribute('aria-live'),null);close(h);assert.match(read('scripts/games/sea-garden.css'),/\.sea-btn\{[^}]*min-width:44px;min-height:44px/);assert.match(read('scripts/games/sea-garden.css'),/\.sea-tank\{[^}]*touch-action:none/);assert.match(read('scripts/release-preflight.mjs'),/'nuoi_ca_cover\.png'/);
});

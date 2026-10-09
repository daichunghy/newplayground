const test=require('node:test'),assert=require('node:assert/strict');
const{harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/wind-duel-model.js');
const el=(h,id)=>h.container.querySelector('#'+id),click=(h,id)=>el(h,id).dispatch('click',{detail:1});
function close(h){h.context.closeGameModal();assertStopped(h);assert.deepEqual(h.errors,[]);}
function direct(){const h=harness({loadApp:false});h.mountResult=h.context.NP_WindDuel.mount(h.container,h.context.NP_GameSession.start(),h.context.NP_AudioEngine);return h;}
function closeDirect(h){h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.deepEqual(h.errors,[]);}

test('the exact legacy route opens original Gió Ngang directly with health, wind and compact hold-to-fire controls',()=>{
 const h=harness();assert.equal(h.context.openGameById('gunny-2d'),true);assert.ok(el(h,'wdCanvas'));assert.equal(h.frames.size,1);assert.equal(el(h,'wdPlayerHp').textContent,'● ● ●');assert.equal(el(h,'wdPowerOut').textContent,'64');assert.equal(el(h,'wdStatus').getAttribute('aria-live'),'polite');
 for(const id of ['wdLeft','wdRight','wdAngle','wdPowerMeter','wdFire','wdPause','wdNew'])assert.ok(el(h,id));assert.equal(el(h,'wdPower'),null);assert.equal(h.container.querySelector('#gnBuffPOW'),null);assert.match(read('app.js'),/'gunny-2d': 'assets\/wind-duel-original\.svg'/);close(h);
});

test('movement, angle and pointer hold fill the power bar; release fires once through the CPU return turn',()=>{
 const h=direct();click(h,'wdLeft');assert.equal(h.mountResult.getModel().view().player.x,46);el(h,'wdAngle').value='45';el(h,'wdAngle').dispatch('input');assert.equal(h.mountResult.getModel().view().player.angle,45);el(h,'wdFire').dispatch('pointerdown',{button:0});assert.equal(h.mountResult.getModel().view().charging,true);for(let i=0;i<20;i++)h.frame();assert.ok(Number(el(h,'wdPowerMeter').value)>M.MIN_POWER);h.window.dispatch('pointerup',{button:0,target:el(h,'wdFire')});assert.equal(h.mountResult.getModel().view().charging,false);assert.ok(h.mountResult.getModel().view().projectile);click(h,'wdFire');assert.equal(h.mountResult.getModel().view().shots,1);
 for(let i=0;i<400&&(h.mountResult.getModel().view().turn!=='player'||h.mountResult.getModel().view().projectile);i++)h.frame();assert.equal(h.mountResult.getModel().view().turn,'player');assert.equal(h.mountResult.getModel().view().projectile,null);assert.equal(h.frames.size,1);assert.equal(el(h,'wdFire').disabled,false);closeDirect(h);
});

test('arrow keys move and aim; Space charges until keyup while angle-slider arrows stay native',()=>{
 const h=direct();h.container.dispatch('keydown',{key:'ArrowRight',code:'ArrowRight',target:el(h,'wdCanvas')});assert.equal(h.mountResult.getModel().view().player.x,78);h.container.dispatch('keydown',{key:'ArrowUp',code:'ArrowUp',target:el(h,'wdCanvas')});assert.equal(h.mountResult.getModel().view().player.angle,46);const before=h.mountResult.getModel().view().player.angle;h.container.dispatch('keydown',{key:'ArrowUp',code:'ArrowUp',target:el(h,'wdAngle')});assert.equal(h.mountResult.getModel().view().player.angle,before);
 h.container.dispatch('keydown',{key:' ',code:'Space',target:el(h,'wdCanvas')});assert.equal(h.mountResult.getModel().view().charging,true);for(let i=0;i<14;i++)h.frame();h.container.dispatch('keyup',{key:' ',code:'Space',target:el(h,'wdCanvas')});assert.equal(h.mountResult.getModel().view().charging,false);assert.ok(h.mountResult.getModel().view().projectile);closeDirect(h);
});

test('keyboard or assistive click fires once at the default power without a pointer hold',()=>{
 const h=direct();el(h,'wdFire').dispatch('click',{detail:0});const fireEvent=h.mountResult.getModel().drain().find(e=>e.kind==='fire');assert.equal(fireEvent.power,64);assert.ok(h.mountResult.getModel().view().projectile);assert.equal(h.mountResult.getModel().view().shots,1);closeDirect(h);
});

test('pause cancels a held shot; resume keeps one loop and restart resets the opening power',()=>{
 const h=direct();el(h,'wdFire').dispatch('pointerdown',{button:0});for(let i=0;i<7;i++)h.frame();click(h,'wdPause');assert.equal(h.frames.size,0);assert.equal(h.mountResult.getModel().view().charging,false);assert.equal(h.mountResult.getModel().view().shots,0);assert.equal(h.mountResult.getModel().view().player.power,64);const state=h.mountResult.getModel().serialize();h.advance(4000);h.frame();assert.deepEqual(h.mountResult.getModel().serialize(),state);click(h,'wdContinue');assert.equal(h.frames.size,1);click(h,'wdFire');assert.ok(h.mountResult.getModel().view().projectile);click(h,'wdNew');assert.equal(h.mountResult.getModel().view().player.power,64);assert.equal(h.frames.size,1);closeDirect(h);
});

test('pointer cancellation, blur, reopen and close never fire a stale held action',()=>{
 const h=direct();el(h,'wdFire').dispatch('pointerdown',{button:0});for(let i=0;i<5;i++)h.frame();h.window.dispatch('pointercancel');assert.equal(h.mountResult.getModel().view().charging,false);assert.equal(h.mountResult.getModel().view().shots,0);assert.equal(h.mountResult.getModel().view().player.power,64);
 el(h,'wdFire').dispatch('pointerdown',{button:0});h.window.dispatch('blur');assert.equal(h.frames.size,0);assert.equal(h.mountResult.getModel().view().charging,false);assert.match(el(h,'wdResultText').textContent,/tạm dừng/i);click(h,'wdContinue');assert.equal(h.frames.size,1);el(h,'wdFire').dispatch('pointerdown',{button:0});for(let i=0;i<4;i++)h.frame();h.context.NP_GameSession.stop();h.container.innerHTML='';assertStopped(h);assert.deepEqual(h.errors,[]);
});

test('compact help is optional, controls meet touch minimums and legacy cover is excluded',()=>{
 const h=harness();h.context.openGameById('gunny-2d');assert.equal(el(h,'wdCanvas').getAttribute('aria-label').includes('Giữ Space'),true);close(h);assert.match(read('scripts/release-preflight.mjs'),/'gunny_cover\.png'/);assert.match(read('scripts/games/wind-duel.css'),/\.wd-range\{[^}]*height:44px/);assert.match(read('scripts/games/wind-duel.css'),/\.wd-btn\{[^}]*min-height:44px/);assert.match(read('scripts/games/wind-duel.css'),/\.wd-power-meter\{[^}]*height:16px/);
});

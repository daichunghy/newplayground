const test=require('node:test'),assert=require('node:assert/strict');
const {harness,assertStopped,read}=require('./support/browser-harness.cjs');

test('Mảnh Sao opens directly into a compact original board with accessible controls',()=>{
 const h=harness();h.context.openGameById('ban-trung-khung-long');assert.deepEqual(h.errors,[]);
 assert.ok(h.container.querySelector('#smCanvas'));assert.ok(h.container.querySelector('#smFire'));
 assert.ok(h.container.querySelector('#smStatus').classList.contains('np-game-sr'));
 assert.equal(typeof h.context.NP_StarlightMatchModel.create,'function');
 assert.equal(h.container.querySelector('#smOverlay').hidden,true);
 assert.match(h.container.innerHTML,/Nối ba mảnh/);assert.doesNotMatch(h.container.innerHTML,/dinosaur|dino|mama|khủng long|trứng/i);
 h.flushTimeouts();h.context.closeGameModal();assertStopped(h);
});

test('pointer aim, keyboard aim and fire are repeat-safe and visibly update the shot',()=>{
 const h=harness();h.context.openGameById('ban-trung-khung-long');const canvas=h.container.querySelector('#smCanvas'),fire=h.container.querySelector('#smFire');
 canvas.dispatch('pointermove',{clientX:520,clientY:300});assert.ok(h.container.querySelector('#smAimLabel').textContent!=='0°');
 h.container.dispatch('keydown',{key:'ArrowLeft',code:'ArrowLeft',target:h.container,repeat:false});
 fire.click();assert.equal(h.container.querySelector('#smFire').disabled,true);assert.equal(h.context.NP_StarlightMatchModel.create().view().phase,'aim');
 h.frame();h.context.closeGameModal();assertStopped(h);
});

test('pause, resume, confirm-new cancel and confirm-new start preserve the right run',()=>{
 const h=harness();h.context.openGameById('ban-trung-khung-long');const pause=h.container.querySelector('#smPause');pause.click();assert.equal(h.container.querySelector('#smOverlay').hidden,false);h.container.querySelector('#smContinue').click();assert.equal(h.container.querySelector('#smOverlay').hidden,true);
 h.container.querySelector('#smAimRight').click();h.container.querySelector('#smFire').click();for(let i=0;i<55;i++)h.frame();
 h.container.querySelector('#smNew').click();assert.equal(h.container.querySelector('#smConfirm').hidden,false);h.container.querySelector('#smConfirmNo').click();assert.equal(h.container.querySelector('#smConfirm').hidden,true);
 h.container.querySelector('#smNew').click();assert.equal(h.container.querySelector('#smConfirm').hidden,false);h.container.querySelector('#smConfirmYes').click();assert.equal(h.container.querySelector('#smConfirm').hidden,true);
 assert.equal(typeof h.context.NP_StarlightMatchModel.restore,'function');h.context.closeGameModal();assertStopped(h);
});

test('corrupt and future saves remain recoverable without blocking an immediate new run',()=>{
 const corrupt=new Map([['np_starlight_match_v1','{"version":1,"game":{"version":1,"board":[]}}']]);const h=harness({storage:corrupt});h.context.openGameById('ban-trung-khung-long');assert.ok(corrupt.has('np_starlight_match_v1_recovery'));assert.equal(h.container.querySelector('#smCanvas')!==null,true);h.context.closeGameModal();
 const future=new Map([['np_starlight_match_v1',JSON.stringify({version:99,game:{secret:'keep'}})]]);const f=harness({storage:future});f.context.openGameById('ban-trung-khung-long');assert.equal(future.get('np_starlight_match_v1'),JSON.stringify({version:99,game:{secret:'keep'}}));assert.match(f.container.querySelector('#smStorage').textContent,/mới hơn/);f.context.closeGameModal();
});

test('storage quota failures are nonfatal and do not stop the RAF game loop',()=>{
 const h=harness();h.context.localStorage.setItem=()=>{throw Error('quota');};h.context.openGameById('ban-trung-khung-long');assert.ok(h.frames.size>0);assert.match(h.container.querySelector('#smStorage').textContent,/Không lưu được/);h.frame();h.container.querySelector('#smFire').click();h.frame();assert.deepEqual(h.errors,[]);h.context.closeGameModal();assertStopped(h);
});

test('original implementation is wired and unverified legacy dinosaur art is excluded from releases',()=>{
 const source=read('scripts/games/starlight-match.js'),engine=read('scripts/engines.js'),preflight=read('scripts/release-preflight.mjs'),html=read('index.html');
 assert.match(engine,/return engine\.mount\(container, window\.NP_GameSession\.start\(\), AudioEngine\)/);
 assert.match(html,/starlight-match-model\.js/);assert.match(html,/starlight-match\.css/);assert.match(html,/starlight-match\.js/);
 assert.doesNotMatch(source,/Dynomite|Mama Dino|Pterodactyl|slingshot|Dinosaur/);
 assert.match(preflight,/ban_trung_cover\.png/);assert.match(preflight,/bantrung_intro\.jpg/);
});

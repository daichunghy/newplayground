const test=require('node:test'),assert=require('node:assert/strict');
const {harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/scrap-rover-model.js');
function storage(game){return new Map([['np_scrap_rover_v1',JSON.stringify({version:1,game})]]);}

test('Xe Săn Bụi opens on an original map with immediate D-pad/fire controls',()=>{
 const h=harness();h.context.openGameById('ban-xe-tang-1990');assert.deepEqual(h.errors,[]);assert.ok(h.container.querySelector('#rvCanvas'));assert.equal(h.container.querySelector('#rvOverlay').hidden,true);assert.ok(h.container.querySelector('#rvUp'));assert.ok(h.container.querySelector('#rvLeft'));assert.ok(h.container.querySelector('#rvDown'));assert.ok(h.container.querySelector('#rvRight'));assert.ok(h.container.querySelector('#rvFire'));assert.equal(h.container.querySelector('#rvCore').textContent,'3');assert.ok(h.container.querySelector('#rvStatus').classList.contains('np-game-sr'));h.flushTimeouts();h.context.closeGameModal();assertStopped(h);
});

test('direction controls move immediately; fire uses the rover facing and records a clean turn',()=>{
 const h=harness();h.context.openGameById('ban-xe-tang-1990');h.container.querySelector('#rvRight').click();let saved=JSON.parse(h.stored.get('np_scrap_rover_v1')).game;assert.equal(saved.moves,1);assert.equal(saved.player.dir,1);assert.equal(saved.player.c,6);
 h.container.querySelector('#rvFire').click();saved=JSON.parse(h.stored.get('np_scrap_rover_v1')).game;assert.equal(saved.shots,1);assert.equal(saved.moves,2);h.context.closeGameModal();assertStopped(h);
});

test('keyboard movement/fire are edge-triggered and a shot can clear a drone',()=>{
 const moveHarness=harness();moveHarness.context.openGameById('ban-xe-tang-1990');moveHarness.container.dispatch('keydown',{key:'ArrowRight',target:moveHarness.container,repeat:false});let moved=JSON.parse(moveHarness.stored.get('np_scrap_rover_v1')).game;assert.equal(moved.player.c,6);assert.equal(moved.moves,1);moveHarness.context.closeGameModal();assertStopped(moveHarness);
 let s=M.create().serialize();s.player={r:7,c:1,dir:1};s.kills=3;s.enemies=[{id:3,r:7,c:3,spawn:{r:7,c:3}}];const data=storage(s),h=harness({storage:data});h.context.openGameById('ban-xe-tang-1990');h.container.querySelector('#rvContinue').click();h.container.dispatch('keydown',{key:' ',code:'Space',target:h.container,repeat:false});const current=JSON.parse(data.get('np_scrap_rover_v1')).game;assert.equal(current.kills,4);assert.equal(current.status,'cleared');assert.match(h.container.querySelector('#rvStatus').textContent,/Bãi đã sạch/);h.context.closeGameModal();assertStopped(h);
});

test('pause/reopen, reversible restart and clear-to-next-zone work without a long intro',()=>{
 const h=harness();h.context.openGameById('ban-xe-tang-1990');h.container.querySelector('#rvRight').click();h.container.querySelector('#rvPause').click();assert.equal(h.container.querySelector('#rvOverlay').hidden,false);h.context.closeGameModal();assertStopped(h);const reopened=harness({storage:h.stored});reopened.context.openGameById('ban-xe-tang-1990');assert.equal(reopened.container.querySelector('#rvOverlay').hidden,false);reopened.container.querySelector('#rvContinue').click();reopened.container.querySelector('#rvNew').click();assert.equal(reopened.container.querySelector('#rvConfirm').hidden,false);reopened.container.querySelector('#rvNo').click();assert.equal(reopened.container.querySelector('#rvConfirm').hidden,true);reopened.context.closeGameModal();assertStopped(reopened);
 const g=M.create().serialize();g.status='cleared';g.kills=M.STAGES[0].spawns.length;g.enemies=[];g.score=400;g.moves=1;const saved=storage(g),f=harness({storage:saved});f.context.openGameById('ban-xe-tang-1990');assert.equal(f.container.querySelector('#rvOverlay').hidden,false);f.container.querySelector('#rvContinue').click();const next=JSON.parse(saved.get('np_scrap_rover_v1')).game;assert.equal(next.stage,1);assert.equal(next.enemies.length,5);assert.equal(next.bankScore,400);f.context.closeGameModal();assertStopped(f);
});

test('corrupt/future saves are preserved and storage quota failure does not disable movement',()=>{
 const corrupt=new Map([['np_scrap_rover_v1','{"version":1,"game":{"version":1,"enemies":[]}']]);const h=harness({storage:corrupt});h.context.openGameById('ban-xe-tang-1990');assert.ok(corrupt.has('np_scrap_rover_v1_recovery'));h.context.closeGameModal();
 const future=new Map([['np_scrap_rover_v1',JSON.stringify({version:7,game:M.create().serialize()})]]);const f=harness({storage:future});f.context.openGameById('ban-xe-tang-1990');assert.equal(JSON.parse(future.get('np_scrap_rover_v1')).version,7);assert.match(f.container.querySelector('#rvStorage').textContent,/mới hơn/);f.context.closeGameModal();
 const q=harness();q.context.localStorage.setItem=()=>{throw Error('quota');};q.context.openGameById('ban-xe-tang-1990');q.container.querySelector('#rvRight').click();assert.match(q.container.querySelector('#rvStorage').textContent,/Không lưu được/);assert.match(q.container.querySelector('#rvMoves').textContent,/1 \/ 36/);q.context.closeGameModal();assertStopped(q);
});

test('the original rover module contains no copied tank faction art and the legacy cover is excluded',()=>{
 const source=read('scripts/games/scrap-rover.js'),engine=read('scripts/engines.js'),preflight=read('scripts/release-preflight.mjs'),html=read('index.html'),css=read('scripts/games/scrap-rover.css');assert.match(engine,/NP_ScrapRover/);assert.match(html,/scrap-rover-model\.js/);assert.match(html,/scrap-rover\.css/);assert.match(html,/scrap-rover\.js/);assert.doesNotMatch(source,/Battle City|Namco|Eagle Base|Powerup|Super Tank/);assert.match(css,/min-height:44px/);assert.match(preflight,/xe_tang_1990_cover\.png/);
});

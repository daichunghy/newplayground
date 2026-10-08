const test=require('node:test'),assert=require('node:assert/strict');
const {harness,assertStopped,read}=require('./support/browser-harness.cjs');
const M=require('../scripts/games/mosaic-match-model.js');
function findMove(board){for(let r=0;r<M.ROWS;r++)for(let c=0;c<M.COLS;c++)for(const[dr,dc]of [[0,1],[1,0]]){const nr=r+dr,nc=c+dc;if(nr>=M.ROWS||nc>=M.COLS)continue;const b=structuredClone(board);[b[r][c],b[nr][nc]]=[b[nr][nc],b[r][c]];if(M.findMatches(b).length)return{r,c,nr,nc};}throw Error('seeded board has no match move');}
function tapMove(h,move){const cells=h.container.querySelectorAll('.kk-cell');cells[move.r*M.COLS+move.c].click();cells[move.nr*M.COLS+move.nc].click();}

test('Kính Khảm opens directly on an accessible 6×6 window board with compact goals',()=>{
 const h=harness();h.context.openGameById('kim-cuong-bejeweled');assert.deepEqual(h.errors,[]);assert.equal(h.container.querySelectorAll('.kk-cell').length,36);assert.equal(h.container.querySelector('#kkOverlay').hidden,true);assert.ok(h.container.querySelector('#kkStatus').classList.contains('np-game-sr'));assert.match(h.container.querySelector('.kk-cell').getAttribute('aria-label'),/Hàng 1, cột 1/);assert.equal(h.stored.get('np_mosaic_match_v1')!==undefined,true);h.context.closeGameModal();assertStopped(h);
});

test('two adjacent taps match automatically; invalid taps do not spend a move',()=>{
 const h=harness();h.context.openGameById('kim-cuong-bejeweled');const before=JSON.parse(h.stored.get('np_mosaic_match_v1')).game;const good=findMove(before.board);tapMove(h,good);let saved=JSON.parse(h.stored.get('np_mosaic_match_v1')).game;assert.equal(saved.moves,1);assert.ok(saved.cleared>=3);assert.equal(M.findMatches(saved.board).length,0);
 const badPair=(()=>{for(let r=0;r<M.ROWS;r++)for(let c=0;c<M.COLS;c++)for(const[dr,dc]of [[0,1],[1,0]]){const nr=r+dr,nc=c+dc;if(nr>=M.ROWS||nc>=M.COLS)continue;const b=structuredClone(saved.board);[b[r][c],b[nr][nc]]=[b[nr][nc],b[r][c]];if(!M.findMatches(b).length)return{r,c,nr,nc};}return null;})();assert.ok(badPair);tapMove(h,badPair);saved=JSON.parse(h.stored.get('np_mosaic_match_v1')).game;assert.equal(saved.moves,1);assert.match(h.container.querySelector('#kkStatus').textContent,/Không ghép/);h.context.closeGameModal();assertStopped(h);
});

test('keyboard grid navigation, Escape deselect and pause/resume are reversible',()=>{
 const h=harness();h.context.openGameById('kim-cuong-bejeweled');const cell=h.container.querySelectorAll('.kk-cell')[16];cell.click();assert.equal(cell.getAttribute('aria-pressed'),'true');h.container.dispatch('keydown',{key:'ArrowRight',target:cell,repeat:false});assert.ok(h.container.querySelectorAll('.kk-cell')[17].focused);h.container.dispatch('keydown',{key:'Escape',target:h.container.querySelectorAll('.kk-cell')[17],repeat:false});assert.equal(h.container.querySelectorAll('.kk-cell')[16].getAttribute('aria-pressed'),'false');
 h.container.querySelector('#kkPause').click();assert.equal(h.container.querySelector('#kkOverlay').hidden,false);h.container.querySelector('#kkContinue').click();assert.equal(h.container.querySelector('#kkOverlay').hidden,true);h.context.closeGameModal();assertStopped(h);
});

test('restart confirmation can be cancelled without changing a progressed board',()=>{
 const h=harness();h.context.openGameById('kim-cuong-bejeweled');tapMove(h,findMove(M.create().view().board));const before=h.stored.get('np_mosaic_match_v1');h.container.querySelector('#kkNew').click();assert.equal(h.container.querySelector('#kkConfirm').hidden,false);h.container.querySelector('#kkNo').click();assert.equal(h.container.querySelector('#kkConfirm').hidden,true);assert.equal(h.stored.get('np_mosaic_match_v1'),before);h.container.querySelector('#kkNew').click();h.container.querySelector('#kkYes').click();assert.equal(JSON.parse(h.stored.get('np_mosaic_match_v1')).game.moves,0);h.context.closeGameModal();assertStopped(h);
});

test('corrupt/future saves are preserved and quota failure does not block play',()=>{
 const corrupt=new Map([['np_mosaic_match_v1','{"version":1,"game":{"version":1,"board":[]}}']]);const h=harness({storage:corrupt});h.context.openGameById('kim-cuong-bejeweled');assert.ok(corrupt.has('np_mosaic_match_v1_recovery'));h.context.closeGameModal();
 const future=new Map([['np_mosaic_match_v1',JSON.stringify({version:9,game:{keep:true}})]]);const f=harness({storage:future});f.context.openGameById('kim-cuong-bejeweled');assert.equal(future.get('np_mosaic_match_v1'),JSON.stringify({version:9,game:{keep:true}}));assert.match(f.container.querySelector('#kkStorage').textContent,/mới hơn/);f.context.closeGameModal();
 const q=harness();q.context.localStorage.setItem=()=>{throw Error('quota');};q.context.openGameById('kim-cuong-bejeweled');tapMove(q,findMove(M.create().view().board));assert.match(q.container.querySelector('#kkStorage').textContent,/Không lưu được/);assert.equal(q.stored.has('np_mosaic_match_v1'),false);q.context.closeGameModal();assertStopped(q);
});

test('original route and authored artwork replace the unverified Bejeweled cover',()=>{
 const source=read('scripts/games/mosaic-match.js'),engine=read('scripts/engines.js'),preflight=read('scripts/release-preflight.mjs'),html=read('index.html'),css=read('scripts/games/mosaic-match.css');
 assert.match(engine,/NP_MosaicMatch/);assert.match(html,/mosaic-match-model\.js/);assert.match(html,/mosaic-match\.css/);assert.match(html,/mosaic-match\.js/);assert.doesNotMatch(source,/Bejeweled|PopCap|EA Games/);assert.match(css,/min-height:44px/);assert.match(preflight,/kim_cuong_cover\.png/);
});

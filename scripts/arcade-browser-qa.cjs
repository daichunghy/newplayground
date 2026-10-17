'use strict';
// Real Chromium. Catalog smoke is not a claim of completing 150 campaigns.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.NP_QA_OUTPUT||'/tmp/arcade-review';
fs.mkdirSync(out,{recursive:true});
const report={capturedAt:new Date().toISOString(),checks:[],smoke:[],screenshots:[],geometry:[],errors:[],externalRequests:[]};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{
  let file;try{const url=new URL(req.url,'http://localhost');file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));}catch(_){res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/games.json'),'utf8'));
const ids=['tro-choi-2048','do-min-minesweeper','hang-rong','ran-san-moi-snake','xep-gach-tetris','pong-1972','line-98','ban-trung-khung-long','day-thung-sokoban','pha-gach-dx-ball','flappy-bird','boom-online-bnb','co-caro'];
async function check(name,fn){try{await fn();report.checks.push({name,passed:true});}catch(e){report.checks.push({name,passed:false,error:e.message});console.error('CHECK',name,e.message);}}
async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');}
async function openGame(page,id){assert.equal(await page.evaluate(id=>window.openGameById(id),id),true,id);await page.waitForTimeout(110);}
async function closeGame(page){await page.evaluate(()=>window.closeGameModal());await page.waitForTimeout(40);}
function resources(){
  const frames=new Set(),intervals=new Set(),raf=window.requestAnimationFrame.bind(window),caf=window.cancelAnimationFrame.bind(window),si=window.setInterval.bind(window),ci=window.clearInterval.bind(window);
  window.requestAnimationFrame=fn=>{let id;id=raf(t=>{frames.delete(id);fn(t);});frames.add(id);return id;};
  window.cancelAnimationFrame=id=>{frames.delete(id);return caf(id);};
  window.setInterval=(...args)=>{const id=si(...args);intervals.add(id);return id;};
  window.clearInterval=id=>{intervals.delete(id);return ci(id);};
  window.__npQAResources=()=>({frames:frames.size,intervals:intervals.size,session:!!window.NP_GameSession?.getCurrent()});
}
async function geometry(page,name,id){
  const data=await page.evaluate(({name,id})=>{
    const b=document.querySelector('#gameModal .modal-window').getBoundingClientRect();
    return {viewport:name,id,width:innerWidth,bodyWidth:document.body.scrollWidth,modal:{x:b.x,right:b.right,width:b.width},canvases:[...document.querySelectorAll('#modalGameContainer canvas')].map(c=>{const r=c.getBoundingClientRect();return{id:c.id,width:r.width,height:r.height,x:r.x,right:r.right,ratioError:c.width&&r.height?Math.abs((r.width/r.height)/(c.width/c.height)-1):0};})};
  },{name,id});report.geometry.push(data);
  assert.ok(data.bodyWidth<=data.width+1,`${id}: horizontal page overflow`);
  assert.ok(data.modal.x>=-1&&data.modal.right<=data.width+1,`${id}: modal clipped`);
  for(const c of data.canvases){assert.ok(c.ratioError<.035,`${id}/${c.id}: stretched canvas ${c.ratioError}`);assert.ok(c.x>=-2&&c.right<=data.width+2,`${id}/${c.id}: canvas outside viewport`);}
}
async function journeys(page,name,touch){
  const act=async selector=>{await page.locator(selector).first()[touch?'tap':'click']();await page.waitForTimeout(touch?90:30);};
  const text=selector=>page.locator(selector).textContent();
  const number=async selector=>Number(await text(selector));
  const capture=label=>shot(page,name+'-'+label+'-playing');
  const zoom=async()=>{await act('.arcade-board-zoom');assert.equal(await page.locator('.arcade-board-zoom').getAttribute('aria-pressed'),'true');await act('.arcade-board-zoom');};
  await check(name+' search, pagination, category and bookmark persistence',async()=>{
    assert.equal(await page.locator('#gridAll .game-card').count(),24);await act('#loadMoreBtn');assert.equal(await page.locator('#gridAll .game-card').count(),48);
    await page.locator('#searchInput').fill('ran san moi');assert.equal(await page.locator('#gridAll .game-card').count(),1);assert.equal(await page.locator('#gridAll .game-card').getAttribute('data-id'),'ran-san-moi-snake');
    await act('#clearSearchBtn');await act('.arcade-categories [data-filter="Quản lý"]');assert.ok(await page.locator('#gridAll .game-card').count()>0);assert.ok((await page.locator('#gridAll .card-category').allTextContents()).every(t=>t.includes('Quản lý')));
    await act('.arcade-categories [data-filter="all"]');await act('#gridAll [data-id="tro-choi-2048"] .card-save');assert.equal(await page.locator('#gameModal').isVisible(),false);
    await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#gridAll [data-id="tro-choi-2048"] .card-save').getAttribute('aria-pressed'),'true');await act('[data-filter="favorites"]:visible');assert.equal(await page.locator('#gridAll .game-card').count(),1);await act('.arcade-categories [data-filter="all"]');
  });
  await check(name+' natural card launch, focus return and modal isolation',async()=>{
    await act('#gridAll [data-id="tro-choi-2048"] .game-launch');assert.equal(await page.evaluate(()=>document.getElementById('portalRoot').inert),true);assert.match(page.url(),/#play\/tro-choi-2048$/);
    await page.locator('#closeModalBtn').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.querySelector('#gameModal').contains(document.activeElement)),true);
    await act('#closeModalBtn');assert.equal(await page.evaluate(()=>document.getElementById('portalRoot').inert),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.play),'tro-choi-2048');
  });
  await check(name+' 2048 real move, undo, touch swipe and saved-board restore',async()=>{
    await openGame(page,'tro-choi-2048');const board=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('np_2048_state')).board);let before=await board(),changed=false;
    for(const key of ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown']){before=await board();await page.locator('#modalGameContainer').focus();await page.keyboard.press(key);if(JSON.stringify(await board())!==JSON.stringify(before)){changed=true;break;}}
    assert.ok(changed);await act('#g2048UndoBtn');assert.deepEqual(await board(),before);
    if(touch){const b=await page.locator('#g2048Grid').boundingBox(),cdp=await page.context().newCDPSession(page),x=b.x+b.width*.8,y=b.y+b.height*.55;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-b.width*.6,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    const saved=await board();await capture('2048');await closeGame(page);await openGame(page,'tro-choi-2048');assert.deepEqual(await board(),saved);await closeGame(page);
  });
  await check(name+' Minesweeper flag, safe reveal, timer, zoom and difficulty',async()=>{
    await openGame(page,'do-min-minesweeper');await act('#dmFlagToggleBtn');await page.waitForFunction(()=>document.getElementById('dmFlagStatus').textContent==='BẬT');
    await act('#dmGrid button');await page.waitForFunction(()=>document.querySelector('#dmGrid button').getAttribute('aria-label')==='Ô đã cắm cờ');
    await act('#dmGrid button');await act('#dmFlagToggleBtn');await page.waitForFunction(()=>document.getElementById('dmFlagStatus').textContent==='TẮT');await act('#dmGrid button');
    await page.waitForFunction(()=>/^Ô \d/.test(document.querySelector('#dmGrid button').getAttribute('aria-label')));await page.waitForTimeout(1100);assert.ok(await number('#dmTimer')>=1);
    await zoom();await capture('mines');await page.locator('#dmDifficulty').selectOption('expert');assert.equal(await page.locator('#dmGrid button').count(),480);assert.ok(await page.locator('#dmGridWrap').evaluate(e=>e.scrollWidth>e.clientWidth));await act('#dmFaceBtn');assert.equal(await number('#dmTimer'),0);await closeGame(page);
  });
  await check(name+' Tetris hard drop, pause, replay and actual personal record',async()=>{
    await openGame(page,'xep-gach-tetris');await act('#tetHardDropBtn');assert.ok(await number('#tetScore')>0);await act('#tetPauseBtn');assert.match(await text('#tetPauseBtn'),/Tiếp tục/i);await capture('tetris');await act('#tetRestartBtn');assert.equal(await number('#tetScore'),0);await closeGame(page);
    assert.match(await text('#gridAll [data-id="xep-gach-tetris"] .personal-record'),/Cao nhất/);
  });
  await check(name+' Snake pause, directional input and restart with random food unchanged',async()=>{
    await openGame(page,'ran-san-moi-snake');await act('#snkPauseBtn');assert.match(await text('#snkPauseBtn'),/Tiếp tục/i);await page.waitForTimeout(150);
    const image=()=>page.locator('#snkCanvas').evaluate(c=>c.toDataURL());const paused=await image();await page.waitForTimeout(220);assert.equal(await image(),paused,'paused board is stable');
    await act('#snkPauseBtn');await act('#snkDown');await page.waitForTimeout(220);assert.notEqual(await image(),paused);await capture('snake');await act('#snkRestartBtn');assert.equal(await number('#snkScore'),0);await closeGame(page);
  });
  await check(name+' Sokoban legal step, undo and restart',async()=>{
    await openGame(page,'day-thung-sokoban');for(const id of ['skRight','skDown','skLeft','skUp']){await act('#'+id);if(await number('#skMoves')>0)break;}assert.ok(await number('#skMoves')>0);await act('#skUndoBtn');assert.equal(await number('#skMoves'),0);await act('#skResetBtn');await capture('sokoban');await closeGame(page);
  });
  await check(name+' Line98 legal move, undo and zoom',async()=>{
    await openGame(page,'line-98');const pair=await page.evaluate(()=>{const a=[...document.querySelectorAll('#l98Grid .line98-cell')];for(let i=0;i<a.length;i++){if(!a[i].querySelector('.line98-ball'))continue;for(const d of [-9,9,-1,1]){const j=i+d;if(j<0||j>=81||Math.abs(i%9-j%9)+Math.abs(Math.floor(i/9)-Math.floor(j/9))!==1)continue;if(!a[j].querySelector('.line98-ball'))return[i,j];}}return null;});assert.ok(pair);
    const old=await page.locator('#l98Grid').innerHTML();const cells=page.locator('#l98Grid .line98-cell');await cells.nth(pair[0])[touch?'tap':'click']();await cells.nth(pair[1])[touch?'tap':'click']();await page.waitForTimeout(400);assert.notEqual(await page.locator('#l98Grid').innerHTML(),old);await act('#l98UndoBtn');assert.equal(await page.locator('#l98Grid .line98-ball').count(),3);await zoom();await capture('line98');await closeGame(page);
  });
  await check(name+' Caro player move, bot reply, undo and zoom',async()=>{
    await openGame(page,'co-caro');await page.locator('#caroGrid .caro-cell').nth(112)[touch?'tap':'click']();await page.waitForTimeout(650);assert.equal(await page.locator('#caroGrid .caro-piece').count(),2);await act('#caroUndoBtn');assert.equal(await page.locator('#caroGrid .caro-piece').count(),0);await zoom();await capture('caro');await closeGame(page);
  });
  await check(name+' Hang Rong cooking and shop tabs',async()=>{
    await openGame(page,'hang-rong');await act('#hrRecipeBtns .btn-cook-action');await page.waitForTimeout(250);assert.ok(await page.locator('#hrCookingSlots .np-stall-burner:not(.empty)').count()>0);await capture('hang-rong');await act('.engine-tab-btn[data-tab="market"]');assert.ok(await page.locator('#hrTabViewport button').count()>0);await act('.engine-tab-btn[data-tab="stall"]');assert.ok(await page.locator('#hrCookingSlots').count()>0);await closeGame(page);
  });
  await check(name+' Egg shooter start, fire and swap input',async()=>{
    await openGame(page,'ban-trung-khung-long');await act('#btStartGameBtn');await act('#btFireBtn');await act('#btSwapEggBtn');await page.waitForTimeout(350);assert.equal(await page.locator('#btStartGameBtn').isVisible(),false);assert.equal(await page.locator('#btRestartInGameBtn').isVisible(),true);await capture('eggs');await closeGame(page);
  });
  await check(name+' Pong and DXBall native pause and restart',async()=>{
    for(const [id,pause,restart] of [['pong-1972','pongPause','pongRestart'],['pha-gach-dx-ball','dxPauseBtn','dxRestartBtn']]){
      await openGame(page,id);if(id==='pha-gach-dx-ball'){await page.locator('#modalGameContainer').focus();await page.keyboard.press('Space');}await page.waitForTimeout(120);await act('#'+pause);assert.match(await text('#'+pause),/Tiếp tục/i);await capture(id);await act('#'+restart);await closeGame(page);
    }
  });
  await check(name+' Flappy and Boom primary input',async()=>{
    await openGame(page,'flappy-bird');await act('#fbFlapBtn');await act('#fbPauseBtn');assert.match(await text('#fbPauseBtn'),/Tiếp tục/i);await capture('flappy');await closeGame(page);
    await openGame(page,'boom-online-bnb');await page.locator('#modalGameContainer').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');await act('#bnbDrop');await page.waitForTimeout(200);await capture('boom');assert.equal(await page.locator('.game-launch-error').count(),0);await closeGame(page);
  });
}
(async()=>{
  await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true});
  try{
    for(const [name,viewport,touch] of [['desktop',{width:1365,height:900},false],['mobile',{width:390,height:844},true]]){
      const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});await context.addInitScript(resources);const page=await context.newPage();page.setDefaultTimeout(4500);
      page.on('pageerror',e=>report.errors.push({viewport:name,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({viewport:name,message:m.text()});});
      page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8765/')&&!r.url().startsWith('data:'))report.externalRequests.push(r.url());});
      await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelectorAll('#gridAll .game-card').length>0);await shot(page,name+'-portal');
      for(const id of ids)await check(name+' initial geometry '+id,async()=>{await openGame(page,id);await geometry(page,name,id);await shot(page,name+'-'+id);await closeGame(page);});
      await closeGame(page);await journeys(page,name,touch);await closeGame(page);
      await check(name+' dark theme, recent library and touch target sizes',async()=>{
        await page.locator('#themeToggleBtn').click();assert.equal(await page.evaluate(()=>document.body.classList.contains('dark-theme')),true);await page.evaluate(()=>window.scrollTo(0,0));await shot(page,name+'-portal-dark');assert.ok(await page.locator('#recentGames .game-card').count()>0);await page.locator('#themeToggleBtn').click();
        await openGame(page,'tro-choi-2048');const sizes=await page.locator('.play-header button:visible').evaluateAll(a=>a.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));assert.ok(sizes.every(s=>s.w>=44&&s.h>=44));await closeGame(page);
      });
      for(const game of catalog){
        const result={id:game.id,viewport:name};try{result.opened=await page.evaluate(id=>window.openGameById(id),game.id);await page.waitForTimeout(35);result.errorPanel=await page.locator('.game-launch-error').count();await closeGame(page);result.resources=await page.evaluate(()=>window.__npQAResources());result.passed=result.opened&&result.errorPanel===0&&!result.resources.session&&!result.resources.frames&&!result.resources.intervals;}catch(e){result.passed=false;result.error=e.message;await closeGame(page).catch(()=>{});}report.smoke.push(result);
      }
      await context.close();
    }
    const narrow=await browser.newContext({viewport:{width:320,height:740},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await narrow.newPage();await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});await shot(page,'narrow-portal');
    for(const id of ['tro-choi-2048','do-min-minesweeper','line-98','co-caro','xep-gach-tetris'])await check('320px geometry '+id,async()=>{await openGame(page,id);await geometry(page,'320px',id);await shot(page,'narrow-'+id);await closeGame(page);});await narrow.close();
    const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked for QA');},configurable:true});});const bp=await blocked.newPage();bp.setDefaultTimeout(4500);
    await check('blocked storage portal and guarded 2048 remain usable',async()=>{await bp.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});assert.equal(await bp.locator('#gridAll .game-card').count(),24);await openGame(bp,'tro-choi-2048');await closeGame(bp);});await blocked.close();
    const deep=await browser.newPage();await check('direct game link works on a fresh page',async()=>{await deep.goto('http://127.0.0.1:8765/#play/tro-choi-2048',{waitUntil:'networkidle'});assert.equal(await deep.locator('#gameModal').isVisible(),true);assert.equal(await deep.locator('#modalGameTitle').textContent(),'2048');await closeGame(deep);});await deep.close();
  }catch(e){report.errors.push({fatal:e.stack||e.message});}
  finally{
    fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));const failed=report.checks.filter(x=>!x.passed),smokeFailed=report.smoke.filter(x=>!x.passed);
    const summary={checks:report.checks.length,failedChecks:failed,smokeLaunches:report.smoke.length,failedSmoke:smokeFailed,screenshots:report.screenshots.length,errors:report.errors,externalRequests:[...new Set(report.externalRequests)]};fs.writeFileSync(path.join(out,'review-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
    if(failed.length||smokeFailed.length||report.errors.length||report.smoke.length!==300)process.exitCode=1;await browser.close();server.close();
  }
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

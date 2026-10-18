'use strict';
// Real browser evidence for desktop-first play. No direct live-state writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(process.env.NP_QA_OUTPUT||'/tmp/arcade-review','desktop-depth');
fs.mkdirSync(out,{recursive:true});
const report={time:new Date().toISOString(),checks:[],screenshots:[],geometry:[],errors:[],requests:[],campaigns:[]};
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{let file;try{const u=new URL(req.url,'http://localhost');file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));}catch(_){res.writeHead(400).end();return;}if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});});
const ids=['thap-ha-noi-tower','noi-ong-nuoc-pipemania','piano-tiles-phim-nhac','dr-mario-diet-khuan','xep-bai-solitaire','xep-bai-freecell','xep-bai-nhen-spider','peggle-pachinko','asteroids-tau-ban-thien-thach','frogger-ech-bang-qua-duong','bong-bong-nuoc-bubble-trouble','dap-chuot-chui'];
let page;
async function run(name,fn){try{await fn();report.checks.push({name,passed:true});}catch(e){report.checks.push({name,passed:false,error:e.stack?.slice(0,3500)||e.message});await shot('failed-'+name.replace(/[^a-z0-9]+/gi,'-')).catch(()=>{});}finally{await page.evaluate(()=>window.closeGameModal()).catch(()=>{});}}
async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');}
async function open(id){assert.equal(await page.evaluate(id=>window.openGameById(id),id),true);await page.waitForTimeout(140);assert.equal(await page.locator('.game-launch-error').count(),0);}
const state=()=>page.locator('#depthSurface').evaluate(e=>e.depthSnapshot());
async function clickWorld(x,y){const b=await page.locator('#depthCanvas').boundingBox();await page.mouse.click(b.x+x*b.width/960,b.y+y*b.height/580);}
async function keyboard(key){await page.locator('#depthSurface').focus();await page.keyboard.press(key);}
async function measure(id,viewport){const g=await page.evaluate(({id,viewport})=>{const m=document.querySelector('#gameModal .modal-window').getBoundingClientRect(),s=document.querySelector('#depthSurface')?.getBoundingClientRect();return{id,viewport,innerWidth,innerHeight,bodyWidth:document.body.scrollWidth,modal:{x:m.x,right:m.right,width:m.width},surface:s?{width:s.width,height:s.height,x:s.x,right:s.right}:null,helpVisible:document.querySelector('#gameHelp').getClientRects().length>0,canvases:[...document.querySelectorAll('#modalGameContainer canvas')].map(c=>{const b=c.getBoundingClientRect();return {id:c.id,x:b.x,right:b.right,width:b.width,height:b.height,ratioError:b.height&&c.height?Math.abs((b.width/b.height)/(c.width/c.height)-1):0};})};},{id,viewport});report.geometry.push(g);assert.ok(g.bodyWidth<=g.innerWidth+2);assert.ok(g.modal.x>=-1&&g.modal.right<=g.innerWidth+1);assert.equal(g.helpVisible,false);for(const c of g.canvases){assert.ok(c.ratioError<.03,id+' aspect');assert.ok(c.x>=-2&&c.right<=g.innerWidth+2,id+' canvas outside viewport');}}
async function desktopJourneys(){
 await run('Hanoi full three-disc campaign with legal input and undo',async()=>{
  await open('thap-ha-noi-tower');const moves=[];function solve(n,a,b,c){if(!n)return;solve(n-1,a,c,b);moves.push([a,b]);solve(n-1,c,b,a);}solve(3,0,2,1);
  for(const [a,b] of moves){await page.locator(`[data-peg="${a}"]`).click();await page.locator(`[data-peg="${b}"]`).click();}
  assert.equal((await state()).won,true);assert.equal((await state()).moves,7);await shot('desktop-hanoi-won');
  await page.locator('#depthResult [data-undo]').click();assert.equal((await state()).won,false);assert.equal((await state()).moves,6);report.campaigns.push({game:'hanoi',method:'seven actual peg selections',complete:true,moves:7});
 });
 await run('Pipes complete reciprocal network through actual rotation buttons',async()=>{
  await open('noi-ong-nuoc-pipemania');const model=await state();for(let i=0;i<model.cells.length;i++){let mask=model.cells[i],count=0;while(mask!==model.solution[i]&&count<4){mask=((mask<<1)&15)|(mask>>3);count++;}for(let n=0;n<count;n++)await page.locator(`[data-pipe="${i}"]`).click();}
  assert.equal((await state()).won,true);await shot('desktop-pipes-won');report.campaigns.push({game:'pipes',method:'solution from read-only snapshot; actual button rotations',complete:true,humanPlaytest:false});
 });
 await run('Piano full 50-note keyboard round and wrong-key loss',async()=>{
  await open('piano-tiles-phim-nhac');await page.locator('#depthSurface').focus();for(let i=0;i<50;i++){const m=await state();await page.keyboard.press(['d','f','j','k'][m.rows[0]]);}
  assert.equal((await state()).phase,'won');assert.equal((await state()).hits,50);await shot('desktop-piano-won');report.campaigns.push({game:'piano',method:'read-only lane planner; 50 real key presses',complete:true,humanPlaytest:false});
  await page.locator('#depthResult [data-next]').click();const m=await state();await keyboard(['d','f','j','k'][(m.rows[0]+1)%4]);assert.equal((await state()).phase,'over');
 });
 await run('Dr Mario distinct bottle rotate ghost hard drop pause restart',async()=>{
  await open('dr-mario-diet-khuan');assert.equal((await state()).board.length,16);const before=await state();await keyboard('ArrowUp');assert.notEqual((await state()).pill.orientation,before.pill.orientation);await keyboard('ArrowLeft');await keyboard('Space');assert.ok((await state()).score>0);assert.ok((await state()).board.flat().some(c=>c&&!c.virus));
  await page.locator('#depthPause').click();const paused=await state();await page.waitForTimeout(350);assert.deepEqual((await state()).pill,paused.pill);await shot('desktop-capsules-paused');await page.locator('[data-resume]').click();await shot('desktop-capsules-playing');await page.locator('#depthNew').click();assert.equal((await state()).score,0);
 });
 for(const [id,kind] of [['xep-bai-solitaire','klondike'],['xep-bai-freecell','freecell'],['xep-bai-nhen-spider','spider']])await run(kind+' real legal move drag undo and deal semantics',async()=>{
  await open(id);const before=await state();let pair=await page.locator('#depthSurface').evaluate(e=>{const snapshot=e.depthSnapshot(),copy=new window.NP_DepthModels.Cards(snapshot.kind,snapshot.seed);Object.assign(copy,snapshot);return copy.hint();});
  if(pair){const source=page.locator(`[data-source='${JSON.stringify(pair.source)}']`),target=page.locator(`[data-dest='${JSON.stringify(pair.dest)}']`);
   await source.click({position:{x:12,y:8}});await target.click({position:{x:6,y:6}});assert.equal((await state()).moves,before.moves+1);await page.locator('#depthUndo').click();assert.deepEqual((await state()).columns,before.columns);
   const sb=await source.boundingBox(),tb=await target.boundingBox();await page.mouse.move(sb.x+12,sb.y+8);await page.mouse.down();await page.mouse.move(tb.x+8,tb.y+8,{steps:12});await page.mouse.up();await page.waitForTimeout(80);assert.equal((await state()).moves,before.moves+1);await page.locator('#depthUndo').click();
  }else assert.notEqual(kind,'freecell');
  if(kind!=='freecell'){const n=(await state()).stock.length;await page.locator('#depthStock').click();assert.equal((await state()).stock.length,n-(kind==='spider'?10:1));await page.locator('#depthUndo').click();assert.equal((await state()).stock.length,n);}
  await shot('desktop-'+kind+'-playing');
 });
 await run('Peggle launched ball hits actual pegs and resets',async()=>{
  await open('peggle-pachinko');await clickWorld(433,138);assert.equal((await state()).balls,9);await page.waitForTimeout(1100);assert.ok((await state()).score>0);await shot('desktop-peggle-shot');await page.locator('#depthNew').click();assert.equal((await state()).balls,10);
 });
 await run('Asteroids thrust inertia fire and paused position',async()=>{
  await open('asteroids-tau-ban-thien-thach');const before=await state();await page.locator('#depthSurface').focus();await page.keyboard.down('ArrowUp');await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('ArrowUp');await page.keyboard.up('Space');const after=await state();assert.notEqual(after.ship.y,before.ship.y);assert.ok(Math.hypot(after.ship.vx,after.ship.vy)>0);await shot('desktop-asteroids-playing');
  await page.locator('#depthPause').click();const p=await state();await page.waitForTimeout(300);assert.deepEqual((await state()).ship,p.ship);
 });
 await run('Frogger starts on safe bank and hops by keyboard',async()=>{
  await open('frogger-ech-bang-qua-duong');await keyboard('ArrowUp');await page.waitForTimeout(160);assert.equal((await state()).frog.row,9);await keyboard('ArrowLeft');await page.waitForTimeout(160);assert.equal((await state()).frog.x,420);await shot('desktop-frogger-playing');
 });
 await run('Bubble Trouble harpoon splits a real moving bubble',async()=>{
  await open('bong-bong-nuoc-bubble-trouble');let hit=false;for(let i=0;i<12;i++){const m=await state(),b=m.bubbles[0];if(m.score>0){hit=true;break;}await clickWorld(b.x,500);await page.waitForTimeout(200);}assert.ok(hit||(await state()).score>0);assert.ok((await state()).bubbles.some(b=>b.r<48));await shot('desktop-bubbles-playing');
 });
 await run('Moles directly clickable ready target score combo and timer',async()=>{
  await open('dap-chuot-chui');const before=await state();assert.equal(before.phase,'ready');assert.equal(before.time,45);await clickWorld(480,290);assert.ok((await state()).score>0);for(let i=0;i<4;i++){await page.waitForTimeout(600);const m=await state(),j=m.holes.findIndex(Boolean);if(j>=0)await clickWorld(240+j%3*240,130+Math.floor(j/3)*160);}assert.ok((await state()).time<45);await shot('desktop-moles-playing');
 });
 await run('2048 native model updates immediately while slide feedback is nonblocking',async()=>{
  await open('tro-choi-2048');const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('np_2048_state')));const before=await read();await page.locator('#modalGameContainer').focus();for(const k of ['ArrowLeft','ArrowUp','ArrowRight'])await page.keyboard.press(k);assert.notDeepEqual((await read()).board,before.board);await page.waitForTimeout(220);assert.equal(await page.locator('.depth-movement').count(),0);await shot('desktop-2048-playing');
 });
 await run('Hang Rong cooked tray selection does not discard native dish',async()=>{
  await open('hang-rong');await page.locator('#hrRecipeBtns .btn-cook-action').first().click();await page.waitForSelector('#hrCookingSlots .np-stall-burner[data-cook-phase="perfect"]',{timeout:6500});
  const burners=page.locator('#hrCookingSlots .np-stall-burner:not(.empty)');assert.ok(await burners.count()>0);await burners.first().click();await page.waitForTimeout(100);
  const occupied=()=>page.locator('#hrTraySlots .tray-box').evaluateAll(a=>a.filter(e=>e.querySelector('svg')).length);assert.ok(await occupied()>0,'cooking must produce a tray dish');const n=await occupied();const dish=page.locator('#hrTraySlots .tray-box:has(svg)').first();await dish.click();assert.equal(await occupied(),n);assert.ok(await dish.evaluate(e=>e.classList.contains('selected')));await shot('desktop-hang-rong-selected');
  const coins=Number(await page.locator('#hrCoinsText').textContent());
  await page.locator('.stall-scene-serve.is-servable').first().click();await page.waitForTimeout(100);assert.equal(await occupied(),n-1);assert.ok(Number(await page.locator('#hrCoinsText').textContent())>coins,'serving the character must pay the player');
  await page.locator('#hrRecipeBtns .btn-cook-action').first().click();await page.waitForSelector('#hrCookingSlots .np-stall-burner[data-cook-phase="perfect"]',{timeout:6500});await burners.first().click();await page.locator('#hrTraySlots .tray-box:has(svg)').first().click();const beforeDiscard=await occupied();await page.locator('[data-dish-discard]').click();assert.equal(await occupied(),beforeDiscard-1);
 });
}
(async()=>{
 await new Promise(r=>server.listen(8766,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'no-preference'});page=await context.newPage();page.setDefaultTimeout(4500);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8766/')&&!r.url().startsWith('data:'))report.requests.push(r.url());});
  await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});await shot('homepage-unchanged');
  for(const id of ids)await run('1440 initial '+id,async()=>{await open(id);assert.equal(await page.locator('.depth-game').count(),1);await measure(id,'1440x960');await shot('desktop-'+id);});
  await desktopJourneys();
  for(const size of [{width:1366,height:768},{width:390,height:844}]){await page.setViewportSize(size);for(const id of [...ids,'hang-rong','tro-choi-2048','ban-trung-khung-long'])await run(`${size.width} geometry ${id}`,async()=>{await open(id);await measure(id,size.width+'x'+size.height);if(['hang-rong','xep-bai-solitaire','dr-mario-diet-khuan','peggle-pachinko'].includes(id))await shot(size.width+'-'+id);});}
  await context.close();
 }catch(e){report.errors.push(e.stack||e.message);}
 finally{const summary={checks:report.checks.length,failed:report.checks.filter(c=>!c.passed),screenshots:report.screenshots.length,errors:report.errors,externalRequests:[...new Set(report.requests)],campaigns:report.campaigns};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(summary.failed.length||summary.errors.length)process.exitCode=1;await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

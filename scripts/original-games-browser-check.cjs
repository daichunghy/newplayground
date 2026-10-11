'use strict';
// Runs ONLY in ephemeral GitHub Actions review QA. No browser dependency is shipped to players.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const PORT=8977, BASE='http://127.0.0.1:'+PORT;
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'review-artifacts','original-games');
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
async function ready(){
  for(let i=0;i<50;i++){
    if(server.exitCode!==null)throw Error('HTTP server exited before startup');
    try {const r=await fetch(BASE+'/index.html');if(r.ok)return;}catch(_){}
    await sleep(150);
  }
  throw Error('Local static server failed');
}
async function tapCanvas(page,canvas,x,y,mobile){
  const bounds=await canvas.boundingBox();
  if(!bounds||bounds.width<=0)throw Error('Invisible game canvas');
  const pos={x:x*bounds.width/720,y:y*bounds.height/460};
  if(mobile)await canvas.tap({position:pos});else await canvas.click({position:pos});
}
function tickEngine(){
  const e=window.__npReviewEngine;
  for(let i=0;i<150;i++)e.tick(1/60);
}
async function run(){
  await ready();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const summary=[];
  try{
    for(const view of [
      {label:'desktop',width:1280,height:800,mobile:false},
      {label:'touch-320',width:320,height:740,mobile:true}
    ]){
      const context=await browser.newContext({
        viewport:{width:view.width,height:view.height},
        isMobile:view.mobile,hasTouch:view.mobile,deviceScaleFactor:view.mobile?2:1,
        locale:'vi-VN'
      });
      const page=await context.newPage();
      const errors=[],staticErrors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('requestfailed',r=>{if(r.url().startsWith(BASE)&&/\.(js|css|json)(\?|$)/.test(r.url()))staticErrors.push(r.url());});
      await page.goto(BASE,{waitUntil:'domcontentloaded'});
      await page.locator('.game-card').first().waitFor({timeout:15000});
      await page.evaluate(()=>{
        const old=window.NP_OriginalBatch.launch;
        window.NP_OriginalBatch.launch=function(container,game){
          const engine=old(container,game);window.__npReviewEngine=engine;return engine;
        };
      });
      let previous=null;
      for(const [id,kind] of [
        ['nem-vong-co-chai','rings'],
        ['phi-tieu-bong-bong','darts'],
        ['ai-la-trieu-phu','quiz']
      ]){
        if(previous){
          await page.evaluate(()=>window.__npPreviousSession=window.NP_GameSession.getCurrent());
        }
        const opened=await page.evaluate(id=>window.openGameById(id),id);
        assert.equal(opened,true,'catalog route '+id);
        await page.locator('.np-deep').waitFor();
        assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.kind),kind);
        if(previous){
          assert.equal(await page.evaluate(()=>window.NP_GameSession.getCurrent()!==window.__npPreviousSession),true,
            'new game owns a new session');
        }
        const pause=page.locator('[data-a="pause"]');
        await pause.click();
        assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.paused),true,'pause');
        await pause.click();
        assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.paused),false,'resume');
        const help=page.locator('[data-a="help"]');
        await help.click();
        assert.equal(await page.locator('[data-a="instructions"]').isVisible(),true,'help');
        await help.click();
        if(kind==='rings'){
          const canvas=page.locator('[data-a="canvas"]');
          await canvas.waitFor();
          for(let n=0;n<2;n++){
            const target=await page.evaluate(i=>window.__npReviewEngine.s.bottles[i],n);
            await tapCanvas(page,canvas,target.x,target.y,view.mobile);
            await page.waitForFunction(i=>window.__npReviewEngine.s.hits>=i,{timeout:3000},n+1);
          }
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.phase),'won','ring round win');
          await page.locator('[data-a="next"]').click();
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.stage),2,'ring next stage');
          await page.evaluate(()=>{
            const e=window.__npReviewEngine;
            while(e.s.phase==='playing'){
              e.point(55,285);e.throwRing();
              for(let i=0;i<45;i++)e.tick(1/60);
            }
          });
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.phase),'lost','ring round loss');
          await page.locator('[data-a="next"]').click();
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.stage),2,'ring retry retains stage');
        }else if(kind==='darts'){
          const canvas=page.locator('[data-a="canvas"]');
          const target=await page.evaluate(()=>{
            const e=window.__npReviewEngine;return e.position(e.s.balls[0]);
          });
          await tapCanvas(page,canvas,target.x,target.y,view.mobile);
          await page.waitForFunction(()=>window.__npReviewEngine.s.shots>=1,{timeout:3000});
          await page.waitForTimeout(300);
          await page.evaluate(()=>{
            const e=window.__npReviewEngine;
            while(e.s.phase==='playing'){
              e.fire(690,430,1);for(let i=0;i<17;i++)e.tick(1/60);
            }
          });
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.phase),'lost','darts round loss');
          await page.locator('[data-a="next"]').click();
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.shots),0,'darts retry');
        }else{
          const answer=await page.evaluate(()=>window.__npReviewEngine.question().correct);
          await page.locator('[data-a="answers"] button').nth(answer).click();
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.phase),'feedback');
          assert.match(await page.locator('[data-a="quiz-status"]').innerText(),/Đúng/);
          await page.waitForFunction(()=>window.__npReviewEngine.s.index===1,{timeout:4500});
          await page.locator('[data-a="half"]').click();
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.hidden.length),2);
          await page.evaluate(()=>{
            const e=window.__npReviewEngine;
            for(let level=1;level<=3;level++){
              while(e.s.phase==='playing'||e.s.phase==='feedback'){
                if(e.s.phase==='playing')e.answer(e.question().correct);
                for(let i=0;i<140;i++)e.tick(1/60);
              }
              if(e.s.phase==='won')e.next();
            }
          });
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.phase),'complete','all quiz rounds');
          await page.locator('[data-a="next"]').click();
          assert.equal(await page.evaluate(()=>window.__npReviewEngine.s.stage),1,'quiz replay');
        }
        await page.locator('.np-deep').screenshot({path:path.join(OUT,view.label+'-'+kind+'.png')});
        const result=await page.evaluate(()=>({
          width:window.innerWidth,docWidth:document.documentElement.scrollWidth,
          canvasWidth:document.querySelector('.np-deep canvas')?.getBoundingClientRect().width||0,
          phase:window.__npReviewEngine.s.phase
        }));
        summary.push({viewport:view.label,game:kind,...result});
        previous=id;
      }
      await page.evaluate(()=>window.closeGameModal());
      assert.equal(await page.locator('.np-deep').count(),0,'close cleans game DOM');
      assert.equal(await page.evaluate(()=>window.NP_GameSession.getCurrent()),null,'close stops current game session');
      assert.deepEqual(errors,[],'browser JavaScript exceptions');
      assert.deepEqual(staticErrors,[],'failed site scripts/styles/data');
      await context.close();
    }
    fs.writeFileSync(path.join(OUT,'browser-review.json'),JSON.stringify(summary,null,2));
    console.log('Chromium desktop and touch-emulated gameplay checks passed');
    console.log(JSON.stringify(summary,null,2));
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.kill());

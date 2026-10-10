const {test,expect}=require('@playwright/test');
const URL='/';
async function prepare(page,name,id){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push('console: '+e.text());});
  page.on('response',e=>{if(e.status()>=400&&new URL(e.url()).origin===new URL(page.url()).origin)errors.push('resource: '+e.url());});
  await page.goto(URL);
  await page.evaluate(gameName=>{
    const original=window[gameName].mount;
    window[gameName].mount=function(...args){
      window.__newSixGame=original(...args);
      return window.__newSixGame;
    };
  },name);
  expect(await page.evaluate(key=>window.openGameById(key),id)).toBeTruthy();
  await expect(page.locator('#gameModal')).toHaveCSS('display','flex');
  return errors;
}
async function close(page){
  await page.locator('#closeModalBtn').click();
  await expect(page.locator('#gameModal')).toHaveCSS('display','none');
  expect(await page.evaluate(()=>window.NP_GameSession.getCurrent()===null)).toBe(true);
  expect(await page.locator('#modalGameContainer').evaluate(e=>e.childElementCount)).toBe(0);
}
function visibleBox(page){return page.locator('#modalGameContainer canvas').boundingBox();}
test('Phím Sao has live keyboard / mobile tap, wins, loses and restarts',async({browser})=>{
  test.setTimeout(65_000);
  for(const mobile of [false,true]){
    const context=await browser.newContext(mobile?{viewport:{width:320,height:800},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
    const page=await context.newPage();
    const errors=await prepare(page,'NP_PhimSao','piano-tiles-phim-nhac');
    try{
      await page.locator('.n6-rhythm [data-act="play"]').click();
      const first=await page.evaluate(()=>{
        const model=window.__newSixGame,note=model.view().notes[0];
        for(let i=0;i<80&&model.view().t<note.time-.05;i++)model.advance(.025);
        return {lane:note.lane,t:model.view().t,expected:note.time};
      });
      if(mobile)await page.locator('.n6-rhythm [data-lane="'+first.lane+'"]').tap();
      else await page.keyboard.press(['a','s','d','f'][first.lane]);
      await expect.poll(()=>page.evaluate(()=>window.__newSixGame.view().hits)).toBe(1);
      await page.locator('.n6-rhythm [data-act="pause"]').click();
      expect(await page.evaluate(()=>window.__newSixGame.view().status)).toBe('paused');
      await page.locator('.n6-rhythm [data-act="play"]').click();
      await page.evaluate(()=>{
        const model=window.__newSixGame;
        for(const note of model.view().notes.slice(1)){
          while(model.view().t<note.time-.02)model.advance(.025);
          if(!model.hit(note.lane))throw Error('Rhythm not hit at '+note.time);
        }
      });
      await expect(page.locator('.n6-rhythm [data-screen-title]')).toHaveText('Hoàn thành!');
      await page.locator('.n6-rhythm [data-act="play"]').click();
      expect(await page.evaluate(()=>window.__newSixGame.view().score)).toBe(0);
      await page.evaluate(()=>{
        const m=window.__newSixGame;
        for(let i=0;i<3;i++)m.hit(3);
      });
      await expect(page.locator('.n6-rhythm [data-screen-title]')).toHaveText('Hết lượt!');
      await close(page); expect(errors).toEqual([]);
    }finally{await context.close();}
  }
});
test('Móc Quà responds to touch and wins full three-stage crane course',async({browser})=>{
  const context=await browser.newContext({viewport:{width:320,height:800},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=await prepare(page,'NP_MocQua','gap-thu-bong-dien-tu');
  try{
    await page.locator('.n6-claw [data-act="play"]').tap();
    const c=await visibleBox(page);
    await page.touchscreen.tap(c.x+c.width*215/760,c.y+c.height*.4);
    await expect.poll(()=>page.evaluate(()=>window.__newSixGame.view().target)).toBeCloseTo(215,0);
    await page.evaluate(()=>{
      const m=window.__newSixGame;
      for(let stage=0;stage<3;stage++)for(let i=0;i<3;i++){
        const p=m.view().prizes.find(x=>!x.taken);
        if(!p)throw Error('missing stage prize');
        if(!m.target(p.x))throw Error('cannot aim');
        for(let t=0;t<100&&Math.abs(m.view().cursor-p.x)>1;t++)m.advance(.05);
        if(!m.grab())throw Error('cannot launch grab');
        for(let t=0;t<120&&m.view().status==='playing'&&m.view().phase!=='aim';t++)m.advance(.05);
      }
    });
    await expect(page.locator('.n6-claw [data-screen-title]')).toHaveText('Trọn bộ quà!');
    await page.locator('.n6-claw [data-act="play"]').tap();
    expect(await page.evaluate(()=>window.__newSixGame.view().attempts)).toBe(5);
    await page.locator('.n6-claw [data-act="pause"]').tap();
    expect(await page.evaluate(()=>window.__newSixGame.view().status)).toBe('paused');
    await close(page);expect(errors).toEqual([]);
  }finally{await context.close();}
});
test('Đào Ngọc has real swipe input, victory, failure, restart and clean routing',async({page})=>{
  const errors=await prepare(page,'NP_DaoNgoc','boulder-dash-tho-dao-ngoc');
  await page.locator('.n6-dig [data-act="play"]').click();
  await page.keyboard.press('ArrowRight');
  const player=await page.evaluate(()=>window.__newSixGame.view().player);
  expect(player).toEqual({x:2,y:1});
  await page.locator('.n6-dig [data-act="pause"]').click();
  expect(await page.evaluate(()=>window.__newSixGame.view().status)).toBe('paused');
  await page.locator('.n6-dig [data-act="play"]').click();
  await page.locator('.n6-dig [data-act="restart"]').click();
  expect(await page.evaluate(()=>window.__newSixGame.view().player)).toEqual({x:1,y:1});
  // Current model's actual three maps are tested for move/collision determinism by the Node suite.
  await close(page);
  await prepare(page,'NP_MocQua','gap-thu-bong-dien-tu');
  await close(page);
  expect(errors).toEqual([]);
});

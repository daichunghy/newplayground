'use strict';
// Development-only browser review. No production dependencies or deployment.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.NP_QA_OUTPUT || '/tmp/arcade-review';
fs.mkdirSync(out, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ogg':'audio/ogg' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(8765, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const report = { screenshots: [], pages: [], errors: [], capturedAt: new Date().toISOString() };
  try {
    const ids = ['tro-choi-2048','do-min-minesweeper','hang-rong','ran-san-moi-snake','xep-gach-tetris','pong-1972','line-98','ban-trung','day-thung-sokoban','pha-gach-dx-ball','flappy-bird','boom-online-bnb'];
    const catalog = JSON.parse(fs.readFileSync(path.join(root,'data/games.json'),'utf8'));
    const resolved = ids.map(id => catalog.find(g => g.id === id) || catalog.find(g => g.id.includes(id.replace('-minesweeper','').replace('-tetris','')))).filter(Boolean);
    for (const [name, viewport, touch] of [['desktop',{width:1365,height:900},false],['mobile',{width:390,height:844},true]]) {
      const context = await browser.newContext({viewport,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({viewport:name,message:error.message}));
      await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
      await page.waitForFunction(() => document.querySelectorAll('#gridAll .game-card').length > 0);
      await page.screenshot({path:path.join(out,`${name}-portal.png`)});
      report.screenshots.push(`${name}-portal.png`);
      for (const game of resolved) {
        await page.evaluate(id => window.openGameById(id), game.id);
        await page.waitForTimeout(300);
        const filename = `${name}-${game.id}.png`;
        await page.screenshot({path:path.join(out,filename)});
        report.screenshots.push(filename);
        report.pages.push(await page.evaluate(({id,name}) => ({id,viewport:name,modalTitle:document.querySelector('#modalGameTitle').textContent,bodyWidth:document.body.scrollWidth,viewportWidth:innerWidth,canvases:[...document.querySelectorAll('#modalGameContainer canvas')].map(c=>({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height})),buttons:[...document.querySelectorAll('#modalGameContainer button')].slice(0,12).map(b=>({id:b.id,text:b.textContent.trim().slice(0,70),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}),{id:game.id,name}));
        await page.evaluate(() => window.closeGameModal());
      }
      await context.close();
    }
    fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({captures:report.screenshots.length,games:report.pages.length,errors:report.errors}));
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});

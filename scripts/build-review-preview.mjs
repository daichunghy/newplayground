/** Export the four implemented P1A games into a self-contained, local review file.
 * This does not publish, run a browser, or certify device behavior. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const output=path.resolve(process.argv[2]||path.join(root,'review-preview-p1a.html'));
const css=read('scripts/games/play-ui.css')+'\n'+['minesweeper','game2048','line98','hangrong'].map(n=>read(`scripts/games/${n}.css`)).join('\n');
const engine=read('scripts/engines.js');
const sharedAudio=engine.slice(0,engine.indexOf('  // ========================================================================='))+'\n})();';
const modules=['minesweeper-model','minesweeper','game2048-model','game2048-view','line98-model','line98','hangrong-model','hangrong'].map(n=>{
 let source=read(`scripts/games/${n}.js`);
 if(n==='line98')source=source.replace('assets/line98-original.svg','data:image/svg+xml;base64,'+Buffer.from(read('assets/line98-original.svg')).toString('base64'));
 if(n==='hangrong')source=source.replace("const ART = 'assets/sprites/hangrong/atlas.svg';","const ART = ''; // The unchanged SVG symbol atlas is embedded in the preview document.");
 return source;
});
const controller=`
const mounts={minesweeper:window.NP_Minesweeper,game2048:window.NP_2048,line98:window.NP_Line98,hangrong:window.NP_HangRong};
const container=document.getElementById('previewGame');
function showGame(id){window.NP_GameSession.stop();container.innerHTML='';mounts[id].mount(container,window.NP_GameSession.start(),window.NP_AudioEngine);document.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.game===id)));}
document.querySelectorAll('[data-game]').forEach(button=>button.addEventListener('click',()=>showGame(button.dataset.game)));
document.getElementById('previewSound').addEventListener('click',function(){window.NEWPLAYGROUND_MUTED=!window.NEWPLAYGROUND_MUTED;this.textContent=window.NEWPLAYGROUND_MUTED?'Bật âm thanh':'Tắt âm thanh';this.setAttribute('aria-pressed',String(!window.NEWPLAYGROUND_MUTED));});
showGame('minesweeper');window.addEventListener('pagehide',()=>window.NP_GameSession.stop());`;
const scripts=['window.NEWPLAYGROUND_MUTED=true;',read('scripts/game-session.js'),sharedAudio,...modules,controller];
scripts.forEach((source,i)=>new vm.Script(source,{filename:`preview-script-${i}.js`}));
const atlas=read('assets/sprites/hangrong/atlas.svg').replace('<svg ','<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" ');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NewPlayground · 4 game P1A · Bản thử cục bộ</title><style>
*{box-sizing:border-box}body{margin:0;padding:16px;background:#eeeadd;color:#183d32;font-family:Calibri,Inter,-apple-system,sans-serif}.preview-header{max-width:840px;margin:0 auto 14px}.preview-header h1{font-size:1.5rem;margin:0 0 6px}.preview-header p{font-size:.88rem;line-height:1.4;margin:6px 0}.preview-nav{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.preview-nav button{min-height:44px;padding:9px 14px;border:1px solid #658176;border-radius:8px;background:#faf7ef;color:#183d32;font:700 .95rem Calibri,Inter,sans-serif;cursor:pointer}.preview-nav button[aria-pressed=true]{background:#183d32;color:#fff}.preview-nav button:focus-visible{outline:3px solid #1559a0;outline-offset:3px}#previewGame{max-width:840px;margin:auto;border-radius:12px;overflow:hidden}button,input,select{font:inherit}button{cursor:pointer}
${css}</style><header class="preview-header"><h1>NewPlayground</h1><p>Bản thử · chưa phát hành</p><nav class="preview-nav" aria-label="Chọn game"><button data-game="minesweeper" type="button">Dò Mìn</button><button data-game="game2048" type="button">2048</button><button data-game="line98" type="button">Line 98</button><button data-game="hangrong" type="button">Hàng Rong</button><button id="previewSound" type="button" aria-pressed="false">Bật âm thanh</button></nav></header>${atlas}<main id="previewGame"></main>${scripts.map(s=>'<script>\n'+s.replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n')}</html>`;
fs.writeFileSync(output,html);
console.log(JSON.stringify({output,bytes:Buffer.byteLength(html),scriptsSyntaxChecked:scripts.length,externalRuntimeDependencies:0,browserExecutionVerified:false},null,2));

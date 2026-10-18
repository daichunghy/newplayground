/* Desktop play adapters. The homepage and catalog layout are left untouched. */
(function(){
'use strict';
const modal=document.getElementById('gameModal'),stage=document.getElementById('modalGameContainer');if(!modal||!stage)return;
// Availability follows installed exact-ID games while keeping the portal design.
const C=window.NP_ArcadeCore,baseProfile=C.profile,baseSelect=C.select;
C.profile=g=>{const p=baseProfile(g);return window.NP_DepthGames?.has(g.id)?{...p,experimental:false}:p;};
C.select=(...args)=>{const list=baseSelect(...args);return args[2]==='experimental'?list.filter(g=>!window.NP_DepthGames?.has(g.id)):list;};
const detailStyle=document.createElement('style');detailStyle.textContent=`
#gameModal .depth-card-board{max-width:calc(var(--columns)*88px + (var(--columns) - 1)*28px)}
#gameModal .depth-card-columns{grid-template-columns:repeat(var(--columns),88px);justify-content:space-between}
#gameModal .playing-card{width:88px}
#gameModal .playing-column:before{width:88px}
#gameModal .playing-pips{position:absolute;inset:25px 18px;pointer-events:none}
#gameModal .playing-pips i{position:absolute;transform:translate(-50%,-50%);font:normal 21px/1 Georgia,serif}
#gameModal .playing-royal{position:absolute;inset:24px 20px;display:grid;place-items:center;border:1px solid currentColor;font:700 35px Georgia,serif;border-radius:4px;opacity:.8}
#gameModal.desktop-depth .np-stall-game #hrTabViewport>div:has(>#hrStreetCanvas){display:block!important;grid-column:1/-1;grid-row:1;background:#b19a72!important}
#gameModal.desktop-depth .np-stall-game #hrStreetCanvas{width:min(100%,1080px,max(520px,calc((100dvh - 490px)*600/190)))!important;max-width:100%!important;height:auto!important;display:block;margin:auto}
#gameModal.desktop-depth .np-stall-game.scene-servicing #hrTabViewport>div:has(>#hrCustomerRow){display:none!important}
#gameModal .stall-scene-actions{position:absolute;top:0;left:50%;transform:translateX(-50%);width:min(100%,1080px,max(520px,calc((100dvh - 490px)*600/190)));aspect-ratio:600/190;pointer-events:none}
#gameModal .stall-scene-serve{position:absolute;top:26%;width:11%;height:48%;min-width:44px;border:0;border-radius:9px;background:none;pointer-events:auto;transform:translateX(-50%);color:#553e2b;cursor:pointer;padding:0}
#gameModal .stall-scene-serve>span{position:absolute;top:0;left:0;width:100%;height:40%;background:#fff7df;border:2px solid #70573f;border-radius:8px;display:grid;place-items:center;pointer-events:none}
#gameModal .stall-scene-serve .scene-patience{position:absolute;bottom:0;left:0;height:5px;background:#60a56b;border-radius:3px;pointer-events:none}
#gameModal .stall-scene-serve svg{width:auto;height:90%;max-width:80%;display:block}
#gameModal .stall-scene-serve:hover,#gameModal .stall-scene-serve.is-servable{outline:3px solid #a5ce80;outline-offset:2px;background:#a4d88125}
#gameModal.desktop-depth .np-stall-game [data-dish-discard]{min-width:44px;min-height:44px}
#gameModal.desktop-depth .np-stall-game .np-stall-burner{min-height:140px}
@media(max-width:760px){#gameModal .depth-card-board{min-width:760px}#gameModal .playing-slot,#gameModal .depth-card-top>#depthStock{width:88px;flex-basis:88px}#gameModal .playing-slot>.playing-card{width:88px}#gameModal.desktop-depth .np-stall-game #hrStreetCanvas,#gameModal .stall-scene-actions{width:100%!important}}
`;document.head.appendChild(detailStyle);
function installCardArt(){
 const host=stage.querySelector('.depth-surface');if(!host)return;
 const layouts={1:[[50,50]],2:[[50,15],[50,85]],3:[[50,15],[50,50],[50,85]],4:[[15,15],[85,15],[15,85],[85,85]],5:[[15,15],[85,15],[50,50],[15,85],[85,85]],6:[[15,15],[85,15],[15,50],[85,50],[15,85],[85,85]],7:[[15,15],[85,15],[50,32],[15,50],[85,50],[15,85],[85,85]],8:[[15,15],[85,15],[50,32],[15,50],[85,50],[50,68],[15,85],[85,85]],9:[[15,8],[85,8],[15,36],[85,36],[50,50],[15,64],[85,64],[15,92],[85,92]],10:[[15,8],[85,8],[50,22],[15,36],[85,36],[15,64],[85,64],[50,78],[15,92],[85,92]]};
 function draw(){host.querySelectorAll('.playing-card.face').forEach(card=>{if(card.querySelector('.playing-pips,.playing-royal'))return;const [n,suit]=card.getAttribute('aria-label').split(' '),rank=Number(n),middle=card.querySelector('.playing-suit');if(!middle)return;const box=document.createElement('span');if(rank<=10){box.className='playing-pips';box.innerHTML=layouts[rank].map(([x,y])=>`<i style="left:${x}%;top:${y}%">${suit}</i>`).join('');}else{box.className='playing-royal';box.textContent=['J','Q','K'][rank-11];}middle.replaceWith(box);});}
 const observer=new MutationObserver(draw);observer.observe(host,{childList:true});cleanup.push(()=>observer.disconnect());draw();
}
let activeRoot=null,cleanup=[];const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const keysFor={launchSnake:['↑','←','↓','→'],launchTetris:['←','→','↑','SPACE'],launchPong:['MOUSE'],launchDXBall:['MOUSE'],launchBanTrung:['MOUSE','SPACE'],launchCaro:['MOUSE'],launchGame2048:['↑','←','↓','→'],launchMario:['←','→','SPACE'],launchPacMan:['↑','←','↓','→'],launchGunny:['MOUSE'],launchSokoban:['↑','←','↓','→'],launchChickenInvaders:['MOUSE','SPACE']};
function stop(){cleanup.forEach(fn=>{try{fn();}catch(_){}});cleanup=[];activeRoot=null;}
function installStall(session){
 let sceneSignature='';
 const signature=el=>el?.querySelector('svg')?.innerHTML||'';let selected=null,drag=null,bypass=false;
 function highlight(){
  const scene=stage.querySelector('#hrStreetCanvas')?.parentElement;
  if(scene){stage.querySelector('.np-stall-game')?.classList.add('scene-servicing');let layer=scene.querySelector('.stall-scene-actions');if(!layer){layer=document.createElement('div');layer.className='stall-scene-actions';scene.appendChild(layer);sceneSignature='';}
   const html=[...stage.querySelectorAll('.customer-slot')].map((c,i)=>`<button type="button" class="stall-scene-serve" data-scene-customer="${c.dataset.custId}" style="left:${(230+i*90)/6}%" aria-label="${C.escape(c.textContent.trim().replace(/\s+/g,' '))}"><span>${c.querySelector('svg')?.outerHTML||''}</span><i class="scene-patience"></i></button>`).join('');
   if(html!==sceneSignature){sceneSignature=html;layer.innerHTML=html;}
  }

  const dishes=[...stage.querySelectorAll('#hrTraySlots .tray-box')].map(signature).filter(Boolean);
  if(selected&&!dishes.includes(selected))selected=null;
  for(const box of stage.querySelectorAll('#hrTraySlots .tray-box')){box.classList.toggle('selected',!!selected&&signature(box)===selected);box.setAttribute('role','button');box.tabIndex=signature(box)?0:-1;box.setAttribute('aria-label',signature(box)?'Chọn món trên khay':'Đĩa trống');}
  for(const customer of stage.querySelectorAll('.customer-slot')){customer.classList.toggle('is-servable',selected?signature(customer)===selected:dishes.includes(signature(customer)));customer.setAttribute('role','button');customer.tabIndex=0;customer.setAttribute('aria-label','Phục vụ '+customer.textContent.trim().replace(/\s+/g,' '));}
  for(const button of stage.querySelectorAll('[data-scene-customer]')){const target=[...stage.querySelectorAll('.customer-slot')].find(c=>c.dataset.custId===button.dataset.sceneCustomer);button.classList.toggle('is-servable',target?.classList.contains('is-servable')||false);const meter=button.querySelector('.scene-patience'),native=target?.querySelector('.cook-progress-track>div');if(meter&&native){meter.style.width=native.style.width;meter.style.backgroundColor=native.style.background;}}
  const tray=stage.querySelector('#hrTraySlots');const counter=tray?.previousElementSibling;if(counter){const label=`Khay món ${dishes.length}/4`;if(counter.textContent!==label)counter.textContent=label;}
  if(tray&&!tray.parentNode.querySelector('[data-dish-discard]')){const b=document.createElement('button');b.type='button';b.dataset.dishDiscard='';b.textContent='×';b.title='Bỏ món đã chọn';b.setAttribute('aria-label','Bỏ món đã chọn');tray.after(b);}
  const trash=stage.querySelector('[data-dish-discard]');if(trash)trash.disabled=!selected;
 }
 function selectBox(box){selected=signature(box)||null;highlight();}
 const onClick=e=>{
  const sceneButton=e.target.closest('[data-scene-customer]');if(sceneButton){[...stage.querySelectorAll('.customer-slot')].find(c=>c.dataset.custId===sceneButton.dataset.sceneCustomer)?.click();return;}

  const burner=e.target.closest('.np-stall-burner:not(.empty)');if(burner&&!e.target.closest('button')){burner.querySelector('.btn-pickup-stove')?.click();return;}
  const box=e.target.closest('#hrTraySlots .tray-box');if(box&&!bypass){e.preventDefault();e.stopImmediatePropagation();selectBox(box);return;}
  const customer=e.target.closest('.customer-slot');if(customer&&selected&&signature(customer)!==selected){e.preventDefault();e.stopImmediatePropagation();if(!reduced())customer.animate?.([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'none'}],{duration:150});return;}
  if(e.target.closest('[data-dish-discard]')){const target=[...stage.querySelectorAll('#hrTraySlots .tray-box')].find(b=>signature(b)===selected);if(target){bypass=true;try{target.click();}finally{bypass=false;}selected=null;highlight();}}
 };
 session.listen(stage,'click',onClick,true);
 session.listen(stage,'keydown',e=>{const target=e.target.closest('.tray-box,.customer-slot');if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();target.click();}});
 session.listen(stage,'pointerdown',e=>{const box=e.target.closest('#hrTraySlots .tray-box');if(!box||!signature(box)||e.button!==0)return;selected=signature(box);drag={id:e.pointerId,x:e.clientX,y:e.clientY,active:false};highlight();});
 session.listen(window,'pointermove',e=>{if(drag&&e.pointerId===drag.id&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5){drag.active=true;if(!drag.ghost){const box=[...stage.querySelectorAll('.tray-box')].find(b=>signature(b)===selected);drag.ghost=document.createElement('div');drag.ghost.className='depth-drag-ghost';drag.ghost.innerHTML=box?.querySelector('svg')?.outerHTML||'';drag.ghost.style.cssText='position:fixed;left:0;top:0;width:64px;height:64px;z-index:500;pointer-events:none;display:grid;place-items:center;border-radius:50%';document.body.appendChild(drag.ghost);}drag.ghost.style.transform=`translate(${e.clientX-32}px,${e.clientY-32}px)`;}});
 session.listen(window,'pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const was=drag;drag=null;was.ghost?.remove();if(was.active){const target=document.elementFromPoint(e.clientX,e.clientY);const button=target?.closest('[data-scene-customer]');const customer=button?[...stage.querySelectorAll('.customer-slot')].find(c=>c.dataset.custId===button.dataset.sceneCustomer):target?.closest('.customer-slot');if(customer&&signature(customer)===selected)customer.click();}});
 session.listen(window,'pointercancel',()=>{drag?.ghost?.remove();drag=null;});session.onCleanup(()=>drag?.ghost?.remove());
 const o=new MutationObserver(highlight);o.observe(stage,{childList:true,subtree:true});cleanup.push(()=>o.disconnect());highlight();
}
function install2048(session){
 const grid=stage.querySelector('#g2048Grid');if(!grid)return;let pending=null,touch=null,animationCleanup=null;
 const finish=()=>{animationCleanup?.();animationCleanup=null;};
 function prepare(dir){if(reduced())return;finish();const items=[...grid.children].slice(0,16),values=items.map(c=>Number(c.textContent.trim())||0);if(items.length!==16)return;const rect=grid.getBoundingClientRect();const sources=items.map((el,i)=>{const b=el.getBoundingClientRect();return {i,value:values[i],html:el.cloneNode(true),x:b.left-rect.left,y:b.top-rect.top,w:b.width,h:b.height};});
  const transitions=[];for(let line=0;line<4;line++){const indices=Array.from({length:4},(_,j)=>dir==='left'?line*4+j:dir==='right'?line*4+3-j:dir==='up'?j*4+line:(3-j)*4+line),occupied=indices.filter(i=>values[i]);let destination=0;for(let j=0;j<occupied.length;j++){const a=occupied[j],b=occupied[j+1],dest=indices[destination++];transitions.push({source:sources[a],dest});if(b!==undefined&&values[a]===values[b]){transitions.push({source:sources[b],dest});j++;}}}
  pending=transitions;
 }
 session.listen(stage,'keydown',e=>{const map={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'};if(map[e.code])prepare(map[e.code]);},true);
 session.listen(grid,'pointerdown',e=>{touch={id:e.pointerId,x:e.clientX,y:e.clientY};},true);
 session.listen(grid,'pointerup',e=>{if(!touch||touch.id!==e.pointerId)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))>=18)prepare(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');},true);
 const observer=new MutationObserver(()=>{if(!pending)return;const transitions=pending;pending=null;const items=[...grid.children].slice(0,16);if(items.length!==16)return;const rect=grid.getBoundingClientRect(),moving=transitions.filter(t=>t.source.i!==t.dest);if(!moving.length)return;
  const layer=document.createElement('div');layer.className='depth-movement';layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:4;';const hidden=new Set();
  for(const t of transitions){const el=items[t.dest];if(!el)continue;hidden.add(el);el.style.visibility='hidden';const target=el.getBoundingClientRect(),ghost=t.source.html;ghost.style.cssText+=`;position:absolute;left:0;top:0;width:${t.source.w}px;height:${t.source.h}px;margin:0;animation:none;`;layer.appendChild(ghost);ghost.animate?.([{transform:`translate(${t.source.x}px,${t.source.y}px)`},{transform:`translate(${target.left-rect.left}px,${target.top-rect.top}px)`}],{duration:125,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});}
  grid.appendChild(layer);animationCleanup=()=>{layer.remove();hidden.forEach(el=>el.style.visibility='');};session.setTimeout(finish,135);
 });observer.observe(grid,{childList:true});cleanup.push(()=>{observer.disconnect();finish();});
}
function activate(){
 if(modal.hidden||modal.style.display==='none'){stop();return;}
 if(activeRoot===stage.firstElementChild)return;stop();activeRoot=stage.firstElementChild;modal.classList.add('desktop-depth');
 const session=window.NP_GameSession?.getCurrent();if(!session)return;
 const game=(window.__NP_GAMES_CACHE__||[]).find(g=>g.id===modal.dataset.game);if(!game)return;
 const method=window.NP_ArcadeCore.routeFor(game,window.NP_Retro50Engines);
 if(window.NP_DepthGames?.has(game.id)){document.getElementById('roomEdition').hidden=true;document.getElementById('editionNote').hidden=true;}
 // Key symbols are affordances beside the title, not an instruction paragraph.
 modal.querySelector('.desktop-key-ribbon')?.remove();const hints=keysFor[method];if(hints&&!window.NP_DepthGames?.has(game.id)){const div=document.createElement('div');div.className='desktop-key-ribbon';div.setAttribute('aria-hidden','true');div.innerHTML=hints.map(k=>`<kbd>${k}</kbd>`).join('');modal.querySelector('.play-header').insertBefore(div,modal.querySelector('.play-actions'));}
 if(stage.querySelector('.depth-card-board'))installCardArt();if(game.id==='hang-rong')installStall(session);if(game.id==='tro-choi-2048')install2048(session);
 // A pointer on a playfield returns keyboard ownership to it. Toolbar use never
 // triggers game shortcuts, and typing fields retain their native behavior.
 session.listen(stage,'pointerdown',e=>{if(e.target.closest('button,input,select,textarea,[role="button"]'))return;const target=e.target.closest('canvas,[tabindex]')||stage;target.focus?.({preventScroll:true});},true);
 // Legacy shooter has a ready page with paragraphs. Start from its actual board
 // without manufacturing a replacement click/shot or dismissing results.
 if(method==='launchBanTrung'){const start=stage.querySelector('#btStartGameBtn');if(start)start.click();}
 // Keep scores legible on both themes. Only changed numbers receive a brief
 // local flash; no whole-screen shake and no endless idle animation is added.
 if(!reduced()){const previous=new WeakMap();const o=new MutationObserver(records=>{for(const r of records){const node=(r.target.nodeType===3?r.target.parentElement:r.target)?.closest('.hud-pill,.np-egg-numbers b');if(!node)continue;const text=node.textContent;if(previous.get(node)!==text){previous.set(node,text);node.animate?.([{filter:'brightness(1.25)'},{filter:'brightness(1)'}],{duration:180});}}});o.observe(stage,{characterData:true,subtree:true});cleanup.push(()=>o.disconnect());}
}
const observer=new MutationObserver(activate);observer.observe(modal,{attributes:true,attributeFilter:['data-game','hidden','style']});const roots=new MutationObserver(()=>{if(activeRoot!==stage.firstElementChild)activate();});roots.observe(stage,{childList:true});activate();
})();

/* Desktop play adapters. The homepage and catalog layout are left untouched. */
(function(){
'use strict';
const modal=document.getElementById('gameModal'),stage=document.getElementById('modalGameContainer');if(!modal||!stage)return;
let activeRoot=null,cleanup=[];const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const keysFor={launchSnake:['↑','←','↓','→'],launchTetris:['←','→','↑','SPACE'],launchPong:['MOUSE'],launchDXBall:['MOUSE'],launchBanTrung:['MOUSE','SPACE'],launchCaro:['MOUSE'],launchGame2048:['↑','←','↓','→'],launchMario:['←','→','SPACE'],launchPacMan:['↑','←','↓','→'],launchGunny:['MOUSE'],launchSokoban:['↑','←','↓','→'],launchChickenInvaders:['MOUSE','SPACE']};
function stop(){cleanup.forEach(fn=>{try{fn();}catch(_){}});cleanup=[];activeRoot=null;}
function installStall(session){
 const signature=el=>el?.querySelector('svg')?.innerHTML||'';let selected=null,drag=null,bypass=false;
 function highlight(){
  const dishes=[...stage.querySelectorAll('#hrTraySlots .tray-box')].map(signature).filter(Boolean);
  if(selected&&!dishes.includes(selected))selected=null;
  for(const box of stage.querySelectorAll('#hrTraySlots .tray-box')){box.classList.toggle('selected',!!selected&&signature(box)===selected);box.setAttribute('role','button');box.tabIndex=signature(box)?0:-1;box.setAttribute('aria-label',signature(box)?'Chọn món trên khay':'Đĩa trống');}
  for(const customer of stage.querySelectorAll('.customer-slot')){customer.classList.toggle('is-servable',selected?signature(customer)===selected:dishes.includes(signature(customer)));customer.setAttribute('role','button');customer.tabIndex=0;customer.setAttribute('aria-label','Phục vụ '+customer.textContent.trim().replace(/\s+/g,' '));}
  const tray=stage.querySelector('#hrTraySlots');if(tray&&!tray.parentNode.querySelector('[data-dish-discard]')){const b=document.createElement('button');b.type='button';b.dataset.dishDiscard='';b.textContent='×';b.title='Bỏ món đã chọn';b.setAttribute('aria-label','Bỏ món đã chọn');tray.after(b);}
  const trash=stage.querySelector('[data-dish-discard]');if(trash)trash.disabled=!selected;
 }
 function selectBox(box){selected=signature(box)||null;highlight();}
 const onClick=e=>{
  const burner=e.target.closest('.np-stall-burner:not(.empty)');if(burner&&!e.target.closest('button')){burner.querySelector('.btn-pickup-stove')?.click();return;}
  const box=e.target.closest('#hrTraySlots .tray-box');if(box&&!bypass){e.preventDefault();e.stopImmediatePropagation();selectBox(box);return;}
  const customer=e.target.closest('.customer-slot');if(customer&&selected&&signature(customer)!==selected){e.preventDefault();e.stopImmediatePropagation();if(!reduced())customer.animate?.([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'none'}],{duration:150});return;}
  if(e.target.closest('[data-dish-discard]')){const target=[...stage.querySelectorAll('#hrTraySlots .tray-box')].find(b=>signature(b)===selected);if(target){bypass=true;try{target.click();}finally{bypass=false;}selected=null;highlight();}}
 };
 session.listen(stage,'click',onClick,true);
 session.listen(stage,'keydown',e=>{const target=e.target.closest('.tray-box,.customer-slot');if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();target.click();}});
 session.listen(stage,'pointerdown',e=>{const box=e.target.closest('#hrTraySlots .tray-box');if(!box||!signature(box)||e.button!==0)return;selected=signature(box);drag={id:e.pointerId,x:e.clientX,y:e.clientY,active:false};highlight();});
 session.listen(window,'pointermove',e=>{if(drag&&e.pointerId===drag.id&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.active=true;});
 session.listen(window,'pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const was=drag;drag=null;if(was.active){const customer=document.elementFromPoint(e.clientX,e.clientY)?.closest('.customer-slot');if(customer&&signature(customer)===selected)customer.click();}});
 session.listen(window,'pointercancel',()=>drag=null);
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
 if(game.id==='hang-rong')installStall(session);if(game.id==='tro-choi-2048')install2048(session);
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
const observer=new MutationObserver(activate);observer.observe(modal,{attributes:true,attributeFilter:['data-game','hidden','style']});activate();
})();

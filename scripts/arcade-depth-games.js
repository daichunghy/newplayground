/* Title-specific desktop games. Models are separate from view/input and own no DOM. */
(function(){
'use strict';
const M=window.NP_DepthModels;if(!M)return;
const registry={
 'thap-ha-noi-tower':'hanoi','noi-ong-nuoc-pipemania':'pipes','piano-tiles-phim-nhac':'piano',
 'dr-mario-diet-khuan':'capsules','xep-bai-solitaire':'klondike','xep-bai-freecell':'freecell',
 'xep-bai-nhen-spider':'spider','peggle-pachinko':'pegs','asteroids-tau-ban-thien-thach':'asteroids','frogger-ech-bang-qua-duong':'frogger','bong-bong-nuoc-bubble-trouble':'bubbles','dap-chuot-chui':'moles'
};
const colors=['#f29d48','#7ed2cc','#9aa1ed','#ee7496','#cfb159','#75b6ee','#a5ce80','#dfb9df'];
const escape=s=>window.NP_ArcadeCore.escape(s);
const round=(ctx,x,y,w,h,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
function launch(container,game){
 const kind=registry[game.id],s=window.NP_GameSession.start();let level=1,seed=Date.now()>>>0,model,paused=false,previous=0,clock=0,selection=null,drag=null,dropTick=0,closed=false;
 const keys={left:false,right:false,up:false,down:false,fire:false};let aim={x:480,y:300};let flashes=[];let best=0;const bestKey='np_depth_'+game.id;
 try{best=Number(localStorage.getItem(bestKey))||0;}catch(_){}
 container.innerHTML=`<section class="depth-game depth-${kind}" aria-label="${escape(game.title)}"><div class="depth-hud"><div id="depthStats" class="depth-stats"></div><div class="depth-actions"><button type="button" id="depthUndo" aria-label="Hoàn tác" title="Hoàn tác (Z)">↶</button><button type="button" id="depthPause" aria-label="Tạm dừng" title="Tạm dừng (P)">Ⅱ</button><button type="button" id="depthNew" aria-label="Ván mới" title="Ván mới">↻</button></div></div><div class="depth-surface" id="depthSurface" tabindex="0"></div><div id="depthResult" class="depth-result" hidden role="status"></div></section>`;
 const root=container.firstElementChild,surface=container.querySelector('#depthSurface'),stats=container.querySelector('#depthStats'),result=container.querySelector('#depthResult');
 const undoBtn=container.querySelector('#depthUndo'),pauseBtn=container.querySelector('#depthPause');
 const canvasKinds=['piano','capsules','pegs','asteroids','frogger','bubbles','moles'];let canvas=null,ctx=null;
 if(canvasKinds.includes(kind)){canvas=document.createElement('canvas');canvas.width=960;canvas.height=580;canvas.id='depthCanvas';canvas.setAttribute('aria-label',game.title);surface.appendChild(canvas);ctx=canvas.getContext('2d');}
 function sound(type='pop'){try{window.NP_Audio?.[type]?.();}catch(_){} }
 function save(){const n=model.score??model.hits??0;if(n>best){best=n;try{localStorage.setItem(bestKey,String(best));}catch(_){}}}
 function reset(next=false){Object.keys(keys).forEach(k=>keys[k]=false);drag?.ghost?.remove();drag=null;if(next)level++;else {level=1;seed=(seed+1)>>>0;}paused=false;selection=null;dropTick=0;flashes=[];clock=0;
  if(kind==='hanoi')model=new M.Hanoi(3+Math.min(5,level-1));
  else if(kind==='pipes')model=new M.Pipes(level,seed+level);
  else if(kind==='piano')model=new M.Piano(seed);
  else if(kind==='capsules')model=new M.Capsules(level,seed+level);
  else if(['klondike','freecell','spider'].includes(kind))model=new M.Cards(kind,seed);
  else if(kind==='pegs')model=new M.Pegs(level,seed);
  else if(kind==='asteroids')model=new M.Asteroids(seed);
  else if(kind==='frogger')model=new M.Frogger(seed);
  else if(kind==='bubbles')model=new M.Bubbles(level);
  else if(kind==='moles')model=new M.Moles(seed);
  result.hidden=true;pauseBtn.textContent='Ⅱ';undoBtn.hidden=!['hanoi','klondike','freecell','spider'].includes(kind);pauseBtn.hidden=['hanoi','pipes','klondike','freecell','spider'].includes(kind);
  root.dataset.phase=model.phase||'playing';updateDOM();surface.focus({preventScroll:true});
 }
 function phase(){return model.won?'won':model.phase||'playing';}
 let lastHUD='';
 function hud(){
  let data=[];
  if(kind==='hanoi')data=[['MÀN',level],['NƯỚC ĐI',model.moves],['TỐI ƯU',2**model.n-1]];
  if(kind==='pipes')data=[['MÀN',level],['ĐÃ NỐI',`${model.connected().size}/${model.cells.length}`],['LƯỢT XOAY',model.moves]];
  if(kind==='piano')data=[['NỐT',`${model.hits}/50`],['THỜI GIAN',model.elapsed.toFixed(2)+'s'],['KỶ LỤC',best]];
  if(kind==='capsules')data=[['MÀN',level],['VI KHUẨN',model.viruses()],['ĐIỂM',model.score]];
  if(['klondike','freecell','spider'].includes(kind))data=[['NƯỚC ĐI',model.moves],['ĐÃ XẾP',kind==='spider'?`${model.completed}/8`:`${model.foundation.flat().length}/52`],['ĐIỂM',model.score]];
  if(kind==='pegs')data=[['BÓNG',model.balls],['CAM',model.pegs.filter(p=>p.orange&&!p.hit).length],['ĐIỂM',model.score]];
  if(kind==='asteroids')data=[['ĐỢT',model.level],['MẠNG','♥'.repeat(model.lives)],['ĐIỂM',model.score]];
  if(kind==='frogger')data=[['MÀN',model.level],['MẠNG','♥'.repeat(model.lives)],['GIÂY',Math.ceil(model.time)],['VỀ ĐÍCH',model.homes.size+'/5']];
  if(kind==='bubbles')data=[['MÀN',level],['MẠNG','♥'.repeat(model.lives)],['GIÂY',Math.ceil(model.time)],['ĐIỂM',model.score]];
  if(kind==='moles')data=[['GIÂY',Math.max(0,Math.ceil(model.time))],['ĐIỂM',model.score],['LIÊN TIẾP',model.streak]];
  const markup=data.map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('');if(markup!==lastHUD){stats.innerHTML=markup;lastHUD=markup;}
  undoBtn.disabled=!model.history?.length;save();
 }
 function showResult(){
  const p=phase();root.dataset.phase=p;hud();
  if(paused){result.hidden=false;result.innerHTML='<div><strong>Tạm dừng</strong><button type="button" data-resume>▶</button></div>';return;}
  if(p!=='won'&&p!=='over'){result.hidden=true;return;}
  result.hidden=false;const next=['hanoi','pipes','capsules','pegs','bubbles'].includes(kind)&&p==='won';
  result.innerHTML=`<div><span class="depth-result-symbol">${p==='won'?'✓':'↻'}</span><strong>${p==='won'?'Hoàn thành!':'Thử thêm một ván?'}</strong><span>${kind==='piano'?`${model.hits} nốt · ${model.elapsed.toFixed(2)} giây`:model.score!==undefined?model.score+' điểm':model.moves+' nước đi'}</span><button type="button" data-next="${next}">${next?'Màn tiếp theo':'Chơi lại'}</button>${model.history?.length?'<button type="button" data-undo>Hoàn tác</button>':''}</div>`;
 }
 function togglePause(){if(['won','over'].includes(phase()))return;paused=!paused;Object.keys(keys).forEach(k=>keys[k]=false);pauseBtn.textContent=paused?'▶':'Ⅱ';pauseBtn.setAttribute('aria-label',paused?'Tiếp tục':'Tạm dừng');showResult();if(!paused)surface.focus();}
 function undo(){if(model.undo?.()){selection=null;showResult();updateDOM();sound('pop');surface.focus();}}
 s.listen(container.querySelector('#depthNew'),'click',()=>reset());s.listen(pauseBtn,'click',togglePause);s.listen(undoBtn,'click',undo);
 s.listen(result,'click',e=>{if(e.target.closest('[data-resume]'))togglePause();if(e.target.closest('[data-next]'))reset(e.target.closest('[data-next]').dataset.next==='true');if(e.target.closest('[data-undo]'))undo();});
 function statusPulse(el,valid){if(!el||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;el.animate?.(valid?[{filter:'brightness(1.35)'},{filter:'brightness(1)'}]:[{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:180});}
 function updateDOM(){hud();if(canvas)return;surface.replaceChildren();
  if(kind==='hanoi')renderHanoi();else if(kind==='pipes')renderPipes();else renderCards();showResult();
 }
 function renderHanoi(){
  const board=document.createElement('div');board.className='depth-hanoi-board';
  model.pegs.forEach((peg,i)=>{const p=document.createElement('button');p.type='button';p.className='depth-peg';p.dataset.peg=i;p.setAttribute('aria-label',`Cọc ${i+1}, ${peg.length} đĩa`);p.innerHTML=`<span class="depth-peg-rod"></span><span class="depth-peg-base"></span><span class="depth-peg-goal">${i===2?'◎':''}</span><span class="depth-peg-number">${i+1}</span>`;
   peg.forEach((n,j)=>{const disk=document.createElement('span');disk.className='depth-disk';disk.style.setProperty('--disk-color',colors[n-1]);disk.style.width=(32+n*8)+'%';disk.style.bottom=(28+j*30)+'px';disk.textContent=n;disk.dataset.disk=n;if(selection===i&&j===peg.length-1)disk.classList.add('selected');p.appendChild(disk);});board.appendChild(p);
  });surface.appendChild(board);
 }
 function hanoiAction(i){if(selection===null){if(model.pegs[i].length){selection=i;updateDOM();}}else if(selection===i){selection=null;updateDOM();}else {const ok=model.move(selection,i);if(ok){sound('match');selection=null;updateDOM();}else statusPulse(surface.querySelector(`[data-peg="${i}"]`),false);} }
 function renderPipes(){
  const n=model.n,water=model.connected(),board=document.createElement('div');board.className='depth-pipe-board';board.style.gridTemplateColumns=`repeat(${n},1fr)`;
  model.cells.forEach((mask,i)=>{const b=document.createElement('button');b.type='button';b.className='depth-pipe'+(water.has(i)?' wet':'');b.dataset.pipe=i;b.setAttribute('aria-label',`Ống hàng ${Math.floor(i/n)+1}, cột ${i%n+1}, xoay`);
   let d='';const ends=[[50,0],[100,50],[50,100],[0,50]];for(let k=0;k<4;k++)if(mask&(1<<k))d+=`M50 50L${ends[k][0]} ${ends[k][1]} `;
   b.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}" fill="none" stroke="#172a3d" stroke-width="29" stroke-linecap="round"/><path class="pipe-flow" d="${d}" fill="none" stroke="${water.has(i)?'#61dce5':'#90a4b5'}" stroke-width="17" stroke-linecap="round"/><circle cx="50" cy="50" r="12" fill="${water.has(i)?'#baf8f2':'#adbbc4'}"/>${i===model.start?'<circle cx="50" cy="50" r="8" fill="#16bbd7"/>':i===model.end?'<circle cx="50" cy="50" r="8" fill="#ffd168"/>':''}</svg>`;
   board.appendChild(b);
  });surface.appendChild(board);
 }
 const suits=['♠','♥','♣','♦'];
 function cardHTML(card){const r=M.rank(card.card),suit=M.suit(card.card),name=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][r];return `<span class="playing-corner">${name}<i>${suits[suit]}</i></span><span class="playing-suit">${suits[suit]}</span><span class="playing-corner bottom">${name}<i>${suits[suit]}</i></span>`;}
 function sourceFrom(el){try{return JSON.parse(el.dataset.source);}catch(_){return null;}}
 function destFrom(el){try{return JSON.parse(el.dataset.dest);}catch(_){return null;}}
 function cardEl(card,source){const b=document.createElement('button');b.type='button';b.className='playing-card '+(card.up?'face '+(M.red(card.card)?'red':'black'):'back');b.dataset.uid=card.uid;b.setAttribute('aria-label',card.up?`${M.rank(card.card)} ${suits[M.suit(card.card)]}`:'Lá úp');b.innerHTML=card.up?cardHTML(card):'<span class="card-back-mark">✦</span>';if(card.up)b.dataset.source=JSON.stringify(source);else b.disabled=true;return b;}
 function renderCards(){
  const board=document.createElement('div');board.className='depth-card-board';board.style.setProperty('--columns',model.columns.length);
  const top=document.createElement('div');top.className='depth-card-top';
  if(kind==='freecell'){for(let i=0;i<4;i++){const slot=document.createElement('div');slot.className='playing-slot';slot.dataset.dest=JSON.stringify({type:'free',index:i});slot.innerHTML='<span>◇</span>';if(model.free[i])slot.appendChild(cardEl(model.free[i],{type:'free',index:i}));top.appendChild(slot);}}
  else {const stock=document.createElement('button');stock.type='button';stock.id='depthStock';stock.className='playing-slot '+(model.stock.length?'playing-card back':'');stock.setAttribute('aria-label',model.stock.length?'Rút bài':'Lật lại chồng bài');stock.innerHTML=model.stock.length?`<span class="card-back-mark">✦</span><small>${model.stock.length}</small>`:'↻';top.appendChild(stock);const waste=document.createElement('div');waste.className='playing-slot waste';if(model.waste.length)waste.appendChild(cardEl(model.waste.at(-1),{type:'waste',index:0}));top.appendChild(waste);}
  const space=document.createElement('div');space.className='card-top-space';top.appendChild(space);
  for(let i=0;i<(kind==='spider'?8:4);i++){const slot=document.createElement('div');slot.className='playing-slot foundation';slot.dataset.dest=JSON.stringify({type:'foundation',index:i});slot.innerHTML=`<span>${kind==='spider'?'K':suits[i]}</span>`;if(kind!=='spider'&&model.foundation[i].length)slot.appendChild(cardEl(model.foundation[i].at(-1),{type:'foundation',index:i}));else if(kind==='spider'&&i<model.completed)slot.innerHTML='<span>✓</span>';top.appendChild(slot);}board.appendChild(top);
  const columns=document.createElement('div');columns.className='depth-card-columns';
  model.columns.forEach((cards,i)=>{const col=document.createElement('div');col.className='playing-column';col.dataset.dest=JSON.stringify({type:'column',index:i});let offset=0;
   cards.forEach((card,at)=>{const b=cardEl(card,{type:'column',index:i,at});b.style.top=offset+'px';b.style.zIndex=at+1;if(selection&&selection.type==='column'&&selection.index===i&&at>=selection.at)b.classList.add('selected');col.appendChild(b);offset+=card.up?Math.max(18,Math.min(31,270/Math.max(1,cards.length))):12;});col.style.height=Math.max(170,offset+120)+'px';columns.appendChild(col);});board.appendChild(columns);surface.appendChild(board);
  for(const el of board.querySelectorAll('[data-dest]')){const d=destFrom(el);el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',d.type==='column'?`Cột ${d.index+1}`:d.type==='free'?`Ô trống ${d.index+1}`:`Chồng đích ${d.index+1}`);if(selection)el.classList.toggle('legal-drop',model.can(selection,d));}
 }
 function paintSelection(){for(const el of surface.querySelectorAll('[data-source]')){const source=sourceFrom(el);el.classList.toggle('selected',!!selection&&source.type===selection.type&&source.index===selection.index&&(source.type!=='column'||source.at>=selection.at));}for(const el of surface.querySelectorAll('[data-dest]'))el.classList.toggle('legal-drop',!!selection&&model.can(selection,destFrom(el)));}
 function cardAction(e){const dest=e.target.closest('[data-dest]'),sourceEl=e.target.closest('[data-source]');if(selection&&dest&&model.move(selection,destFrom(dest))){selection=null;sound('match');updateDOM();return;}if(sourceEl){const source=sourceFrom(sourceEl);selection=model.moving(source).length?source:null;paintSelection();}else {selection=null;paintSelection();}}
 s.listen(surface,'click',e=>{if(drag?.suppress){drag=null;return;}if(paused||['won','over'].includes(phase()))return;
  if(kind==='hanoi'){const peg=e.target.closest('[data-peg]');if(peg)hanoiAction(Number(peg.dataset.peg));}
  else if(kind==='pipes'){const tile=e.target.closest('[data-pipe]');if(tile){const i=Number(tile.dataset.pipe);model.turn(i);sound('clack');updateDOM();surface.querySelector(`[data-pipe="${i}"]`)?.focus({preventScroll:true});}}
  else if(['klondike','freecell','spider'].includes(kind)){if(e.target.closest('#depthStock')){if(model.draw()){selection=null;updateDOM();sound('clack');}else statusPulse(e.target.closest('#depthStock'),false);}else cardAction(e);}
 });
 s.listen(surface,'keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-dest]')){e.preventDefault();e.stopPropagation();if(selection&&model.move(selection,destFrom(e.target))){selection=null;updateDOM();sound('cardSlide');}}});
 s.listen(surface,'dblclick',e=>{if(!['klondike','freecell'].includes(kind))return;const el=e.target.closest('[data-source]');if(!el)return;const source=sourceFrom(el);for(let i=0;i<4;i++)if(model.move(source,{type:'foundation',index:i})){selection=null;updateDOM();sound('match');break;}});
 s.listen(surface,'contextmenu',e=>{if(kind==='pipes'){const t=e.target.closest('[data-pipe]');if(t){e.preventDefault();model.turn(Number(t.dataset.pipe),true);updateDOM();}}});
 // Drag and click share legal-move validation; cancelled previews never mutate cards.
 s.listen(surface,'pointerdown',e=>{if(e.button!==0||paused)return;const el=e.target.closest('[data-source], [data-disk]');if(!el)return;
  const source=kind==='hanoi'?Number(el.closest('[data-peg]').dataset.peg):sourceFrom(el);if(kind!=='hanoi'&&!model.moving(source).length)return;
  if(kind==='hanoi'&&Number(el.dataset.disk)!==model.pegs[source].at(-1))return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,source,el,ghost:null,active:false};
 });
 s.listen(window,'pointermove',e=>{if(!drag||drag.id!==e.pointerId||!drag.el)return;if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){drag.active=true;if(kind!=='hanoi'){selection=drag.source;paintSelection();}drag.ghost=drag.el.cloneNode(true);drag.ghost.classList.add('depth-drag-ghost');const b=drag.el.getBoundingClientRect();Object.assign(drag.ghost.style,{width:b.width+'px',height:b.height+'px',position:'fixed',top:0,left:0,zIndex:500,pointerEvents:'none',margin:0});document.body.appendChild(drag.ghost);}
  if(drag.ghost){e.preventDefault();drag.ghost.style.transform=`translate(${e.clientX-40}px,${e.clientY-30}px)`;}
 });
 s.listen(window,'pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;drag.ghost?.remove();if(drag.active){e.preventDefault();const el=document.elementFromPoint(e.clientX,e.clientY);let ok=false;if(kind==='hanoi'){const p=el?.closest('[data-peg]');if(p)ok=model.move(drag.source,Number(p.dataset.peg));}else {const d=el?.closest('[data-dest]');if(d)ok=model.move(drag.source,destFrom(d));}selection=null;drag={suppress:true};s.setTimeout(()=>{if(drag?.suppress)drag=null;},0);updateDOM();sound(ok?'match':'clack');}else drag=null;});
 s.listen(window,'pointercancel',()=>{drag?.ghost?.remove();drag=null;});
 function point(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*960/b.width,y:(e.clientY-b.top)*580/b.height};}
 if(canvas){s.listen(canvas,'pointermove',e=>{if(paused||['won','over'].includes(phase()))return;aim=point(e);if(kind==='bubbles'&&e.pointerType==='mouse')model.player.x=M.clamp(aim.x,26,934);if(kind==='asteroids'&&e.pointerType==='mouse')model.ship.a=Math.atan2(aim.y-model.ship.y,aim.x-model.ship.x);});
  s.listen(canvas,'pointerdown',e=>{if(e.button!==0||paused)return;e.preventDefault();surface.focus({preventScroll:true});aim=point(e);
   if(phase()==='over'||phase()==='won')return;
   if(kind==='piano'){const lane=Math.floor((aim.x-220)/130);if(lane>=0&&lane<4){const y=385+model.offset*112;model.hit(aim.y>=y&&aim.y<=y+105?lane:-1);note(lane);}}
   if(kind==='pegs'){if(model.shoot(aim.x,aim.y))sound('pop');}
   if(kind==='frogger'){const dx=aim.x-model.frog.x,dy=aim.y-(24+model.frog.row*49);model.move(Math.abs(dx)>Math.abs(dy)?Math.sign(dx):0,Math.abs(dy)>=Math.abs(dx)?Math.sign(dy):0);}
   if(kind==='bubbles'){model.player.x=M.clamp(aim.x,26,934);model.fire();}
   if(kind==='moles'){const col=Math.round((aim.x-240)/240),row=Math.round((aim.y-130)/160);if(col>=0&&col<3&&row>=0&&row<3&&Math.abs(aim.x-(240+col*240))<75&&Math.abs(aim.y-(130+row*160))<65){if(model.hit(row*3+col))sound('pop');}}
   if(kind==='asteroids'){keys.fire=true;model.ship.a=Math.atan2(aim.y-model.ship.y,aim.x-model.ship.x);model.shoot();}
   showResult();
  });s.listen(window,'pointerup',()=>keys.fire=false);}
 function note(lane){try{window.NP_Audio?.tone?.([261.63,329.63,392,523.25][lane],'sine',.18,.065);}catch(_){} }
 function onKey(e){if(!container.contains(document.activeElement)||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='KeyP'&&!e.repeat&&!pauseBtn.hidden){e.preventDefault();togglePause();return;}
  if(e.code==='KeyZ'&&!undoBtn.hidden){e.preventDefault();undo();return;}
  if(paused||['over','won'].includes(phase()))return;
  const k=e.code;if(e.target.closest?.('button,[role="button"]')&&['Space','Enter'].includes(k))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','KeyF','KeyJ','KeyK'].includes(k))e.preventDefault();
  if(kind==='piano'&&!e.repeat){const lane=['KeyD','KeyF','KeyJ','KeyK'].indexOf(k);if(lane>=0){model.hit(lane);note(lane);showResult();}}
  if(kind==='capsules'){if(k==='ArrowLeft'||k==='KeyA')model.move(-1,0);if(k==='ArrowRight'||k==='KeyD')model.move(1,0);if(k==='ArrowDown'||k==='KeyS')model.fall();if((k==='ArrowUp'||k==='KeyW')&&!e.repeat)model.rotate();if(k==='Space'&&!e.repeat){model.drop();sound('clack');}showResult();}
  if(kind==='frogger'&&!e.repeat){const moves={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]};if(moves[k])model.move(...moves[k]);}
  if(kind==='asteroids'||kind==='bubbles'){if(k==='ArrowLeft'||k==='KeyA')keys.left=true;if(k==='ArrowRight'||k==='KeyD')keys.right=true;if(k==='ArrowUp'||k==='KeyW')keys.up=true;if(k==='Space')keys.fire=true;}
  if(kind==='hanoi'&&['Digit1','Digit2','Digit3'].includes(k)&&!e.repeat)hanoiAction(Number(k.slice(-1))-1);
 }
 s.listen(window,'keydown',onKey);s.listen(window,'keyup',e=>{if(['KeyA','ArrowLeft'].includes(e.code))keys.left=false;if(['KeyD','ArrowRight'].includes(e.code))keys.right=false;if(['KeyW','ArrowUp'].includes(e.code))keys.up=false;if(e.code==='Space')keys.fire=false;});
 s.listen(window,'blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);if(!pauseBtn.hidden&&!paused&&phase()==='playing')togglePause();});
 s.listen(document,'visibilitychange',()=>{if(document.hidden&&!pauseBtn.hidden&&!paused&&phase()==='playing')togglePause();});
 // Short actionable controls belong to the board, not a tutorial panel.
 if(['capsules','asteroids','bubbles','frogger'].includes(kind)){
  const controls=document.createElement('div');controls.className='depth-key-controls';
  const specs=kind==='capsules'?[['←','ArrowLeft','Trái'],['↻','ArrowUp','Xoay'],['→','ArrowRight','Phải'],['↓','ArrowDown','Hạ'],['⤓','Space','Thả']]:kind==='bubbles'?[['←','ArrowLeft','Sang trái'],['●','Space','Bắn'],['→','ArrowRight','Sang phải']]:kind==='frogger'?[['←','ArrowLeft','Sang trái'],['↑','ArrowUp','Tiến lên'],['↓','ArrowDown','Lùi xuống'],['→','ArrowRight','Sang phải']]:[['↶','ArrowLeft','Xoay trái'],['▲','ArrowUp','Đẩy'],['↷','ArrowRight','Xoay phải'],['●','Space','Bắn']];
  controls.innerHTML=specs.map(([symbol,key,label])=>`<button type="button" data-key="${key}" aria-label="${label}">${symbol}<kbd>${key==='Space'?'SPACE':symbol}</kbd></button>`).join('');root.appendChild(controls);
  const clear=()=>Object.keys(keys).forEach(k=>keys[k]=false);
  for(const b of controls.querySelectorAll('button')){const activate=()=>{surface.focus({preventScroll:true});onKey({code:b.dataset.key,target:surface,preventDefault(){},repeat:false});};s.listen(b,'pointerdown',e=>{e.preventDefault();activate();});s.listen(b,'click',e=>{if(e.detail===0){activate();s.setTimeout(clear,120);}});s.listen(b,'pointerup',clear);s.listen(b,'pointercancel',clear);s.listen(b,'pointerleave',clear);}
 }
 function text(t,x,y,size=20,color='#e8f0f6',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px Calibri, sans-serif`;ctx.textAlign=align;ctx.fillText(String(t),x,y);}
 function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 function drawPiano(){
  ctx.fillStyle='#e9ede9';ctx.fillRect(0,0,960,580);round(ctx,206,0,548,580,0,'#cbd4cb');
  for(let lane=0;lane<4;lane++){round(ctx,220+lane*130,0,128,580,0,'#fffef8');text(['D','F','J','K'][lane],285+lane*130,550,25,'#637567');}
  model.rows.forEach((lane,i)=>{const y=385-i*112+model.offset*112;if(y<-112||y>530)return;round(ctx,223+lane*130,y,122,105,6,i===0?'#327662':'#20313a');if(i===0){circle(284+lane*130,y+54,12,'#a5e2c4');}});
  ctx.fillStyle='#dd7352';ctx.fillRect(220,522,520,3);text('50',120,270,76,'#abbcaf');text('♪',840,300,96,'#bac9bf');
 }
 function capsule(x,y,color,virus=false,alpha=1){ctx.globalAlpha=alpha;const fill=['','#f28175','#7bb9f1','#f1d067'][color];round(ctx,x+2,y+2,26,26,virus?9:13,fill);if(virus){circle(x+10,y+12,2.5,'#192c43');circle(x+20,y+12,2.5,'#192c43');ctx.strokeStyle='#192c43';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+10,y+21);ctx.lineTo(x+19,y+21);ctx.stroke();}else {ctx.fillStyle='#ffffff77';ctx.fillRect(x+7,y+6,11,3);}ctx.globalAlpha=1;}
 function drawCapsules(){
  ctx.fillStyle='#172739';ctx.fillRect(0,0,960,580);round(ctx,348,30,264,520,28,'#91b4c3');round(ctx,356,38,248,504,20,'#263e54');
  const ox=360,oy=48;
  for(let y=0;y<16;y++)for(let x=0;x<8;x++){round(ctx,ox+x*30+1,oy+y*30+1,28,28,4,'#21364a');const c=model.board[y][x];if(c)capsule(ox+x*30,oy+y*30,c.color,c.virus);}
  if(model.phase==='playing'){let ghost={...model.pill};while(model.fits({...ghost,y:ghost.y+1}))ghost.y++;for(const [x,y,c] of model.positions(ghost))capsule(ox+x*30,oy+y*30,c,false,.2);for(const [x,y,c] of model.positions())capsule(ox+x*30,oy+y*30,c);}
  text('TIẾP THEO',730,170,13,'#9eb8c8');capsule(699,192,model.next[0]);capsule(729,192,model.next[1]);
  text(model.viruses(),225,267,80,'#d2e4ed');text('VI KHUẨN',225,298,13,'#8aa6b7');if(model.chain>1)text('×'+model.chain,730,350,48,'#eed076');
 }
 function drawPegs(){
  ctx.fillStyle='#1b2847';ctx.fillRect(0,0,960,580);
  for(let i=0;i<44;i++)circle((i*157)%960,35+(i*89)%520,i%3===0?2:1,'#354465');
  ctx.strokeStyle='#324364';ctx.lineWidth=20;ctx.strokeRect(-5,-5,970,600);
  for(const p of model.pegs){circle(p.x,p.y+3,p.r+2,p.orange?'#854e27':'#2c4773');circle(p.x,p.y,p.r,p.hit?'#fff6ce':p.orange?'#f7b14e':'#82b8f0');circle(p.x-3,p.y-4,3,'#ffffff91');}
  if(!model.ball&&model.phase==='playing'){let x=480,y=48,dx=aim.x-x,dy=Math.max(50,aim.y-y),len=Math.hypot(dx,dy),vx=dx/len*360,vy=dy/len*360;for(let i=0;i<38;i++){vy+=310*.018;x+=vx*.018;y+=vy*.018;if(x<9||x>951)vx=-vx;if(model.pegs.some(p=>Math.hypot(p.x-x,p.y-y)<p.r+8))break;if(i%3===0)circle(x,y,2,'#e4eef5');}}
  const a=Math.atan2(aim.y-48,aim.x-480);ctx.save();ctx.translate(480,45);ctx.rotate(a);round(ctx,-15,-12,58,24,8,'#96bdce');ctx.restore();circle(480,45,24,'#ddc074');
  round(ctx,model.bucket-55,558,110,17,7,'#78ccbe');round(ctx,model.bucket-46,559,92,7,3,'#214b52');
  if(model.ball){circle(model.ball.x,model.ball.y,9,'#fff3c7');circle(model.ball.x-2,model.ball.y-3,3,'#fff');}
  while(model.events.length){const e=model.events.shift();flashes.push({...e,t:.35});sound(e.orange?'coin':'pop');}
  flashes.forEach(f=>{ctx.globalAlpha=f.t/.35;ctx.strokeStyle='#ffdda6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,12+(1-f.t/.35)*24,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;});
 }
 function drawAsteroids(){
  ctx.fillStyle='#101e2e';ctx.fillRect(0,0,960,580);for(let i=0;i<80;i++)circle((i*173)%960,(i*83)%580,i%5===0?1.5:.7,'#516980');
  for(const r of model.rocks){ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.a);ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,rr=r.r*(i%2?.77:1);i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle='#24374b';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#829bac';ctx.stroke();ctx.restore();}
  model.bullets.forEach(b=>circle(b.x,b.y,3,'#ffe2a0'));
  const sh=model.ship;ctx.save();ctx.translate(sh.x,sh.y);ctx.rotate(sh.a);if(keys.up){ctx.fillStyle='#f1b672';ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(-25-4*Math.sin(clock*40),0);ctx.lineTo(-12,6);ctx.fill();}ctx.fillStyle='#b7e1dd';ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-14,-12);ctx.lineTo(-8,0);ctx.lineTo(-14,12);ctx.closePath();ctx.fill();ctx.restore();
  if(sh.shield){ctx.strokeStyle='#a4e4d47a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sh.x,sh.y,30,0,Math.PI*2);ctx.stroke();}
  while(model.events.length)flashes.push({...model.events.shift(),t:.3});for(const f of flashes){ctx.globalAlpha=f.t/.3;for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=(.3-f.t)*170;circle(f.x+Math.cos(a)*rr,f.y+Math.sin(a)*rr,2,'#eac28a');}ctx.globalAlpha=1;}
 }
 function drawFrogger(){
  ctx.fillStyle='#567747';ctx.fillRect(0,0,960,580);
  for(let row=0;row<11;row++){const y=8+row*49,river=row>0&&row<4,road=row>=5&&row<=8;ctx.fillStyle=river?'#376f8c':road?'#3b4653':row===0?'#345b42':'#719259';ctx.fillRect(88,y,784,49);if(road){ctx.strokeStyle='#74808a';ctx.setLineDash([20,20]);ctx.beginPath();ctx.moveTo(88,y);ctx.lineTo(872,y);ctx.stroke();ctx.setLineDash([]);}if(river){for(let x=108;x<860;x+=87){ctx.strokeStyle='#5894a1';ctx.beginPath();ctx.moveTo(x,y+30);ctx.lineTo(x+27,y+30);ctx.stroke();}}}
  [150,300,480,660,810].forEach((x,i)=>{round(ctx,x-26,10,52,41,10,model.homes.has(i)?'#b6d868':'#1c4d48');if(model.homes.has(i))circle(x,27,10,'#457f54');});
  for(const lane of model.lanes)for(const o of lane.objects){const y=16+lane.row*49;ctx.save();ctx.beginPath();ctx.rect(88,8,784,539);ctx.clip();if(lane.river){round(ctx,o.x-o.width/2,y,o.width,32,12,'#846044');round(ctx,o.x-o.width/2+7,y+5,o.width-14,6,3,'#b38c5b');}else{round(ctx,o.x-o.width/2,y,o.width,32,7,lane.row%2?'#e5a66c':'#85bec8');round(ctx,o.x-16,y+3,32,25,5,'#3b5867');round(ctx,o.x-o.width/2+7,y-3,15,5,2,'#223644');round(ctx,o.x+o.width/2-22,y+31,15,5,2,'#223644');}ctx.restore();}
  const f=model.frog,t=f.jump/.12,x=f.x+(f.fromX-f.x)*t,y=32+(f.row+(f.fromRow-f.row)*t)*49-Math.sin(t*Math.PI)*10;
  ctx.globalAlpha=f.safe>0?.72:1;circle(x,y,17,'#b4d969');circle(x-11,y-11,8,'#b4d969');circle(x+11,y-11,8,'#b4d969');circle(x-11,y-13,3,'#203a3c');circle(x+11,y-13,3,'#203a3c');round(ctx,x-10,y+3,20,6,3,'#e0edb0');ctx.globalAlpha=1;
 }
 function drawBubbles(){
  ctx.fillStyle='#e4d8bd';ctx.fillRect(0,0,960,580);for(let y=40;y<500;y+=65)for(let x=(Math.floor(y/65)%2)*65;x<960;x+=130){ctx.strokeStyle='#d6c6a7';ctx.strokeRect(x,y,129,64);}
  ctx.fillStyle='#748b73';ctx.fillRect(0,530,960,50);ctx.fillStyle='#4b6c5d';ctx.fillRect(0,530,960,8);
  for(const b of model.bubbles){circle(b.x,b.y,b.r,'#8dc6c3');circle(b.x,b.y,b.r-5,'#c4e7d9');circle(b.x-b.r*.28,b.y-b.r*.32,b.r*.21,'#f2f8db');ctx.strokeStyle='#568e8a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();}
  if(model.harpoon){ctx.strokeStyle='#b15f49';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(model.harpoon.x,528);ctx.lineTo(model.harpoon.x,model.harpoon.tip);ctx.stroke();ctx.fillStyle='#664638';ctx.beginPath();ctx.moveTo(model.harpoon.x,model.harpoon.tip-8);ctx.lineTo(model.harpoon.x-7,model.harpoon.tip+6);ctx.lineTo(model.harpoon.x+7,model.harpoon.tip+6);ctx.fill();}
  const x=model.player.x;ctx.globalAlpha=model.invulnerable>0?.7:1;round(ctx,x-14,498,28,28,6,'#446581');circle(x,488,12,'#ddb28a');round(ctx,x-13,478,26,6,3,'#ae694f');round(ctx,x-15,523,12,7,3,'#263f52');round(ctx,x+3,523,12,7,3,'#263f52');ctx.globalAlpha=1;
  while(model.events.length){flashes.push({...model.events.shift(),t:.3});sound('pop');}for(const f of flashes){ctx.globalAlpha=f.t/.3;ctx.strokeStyle='#93b58b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,(.3-f.t)*120,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 }
 function drawMoles(){
  ctx.fillStyle='#d3e2bd';ctx.fillRect(0,0,960,580);for(let i=0;i<9;i++){const x=240+(i%3)*240,y=130+Math.floor(i/3)*160;ctx.fillStyle='#a7be8e';ctx.beginPath();ctx.ellipse(x,y+30,84,31,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#584b3d';ctx.beginPath();ctx.ellipse(x,y+25,70,23,0,0,Math.PI*2);ctx.fill();const m=model.holes[i];if(m){ctx.save();ctx.beginPath();ctx.rect(x-75,y-75,150,106);ctx.clip();const pop=Math.min(1,(m.max-m.time)*9,m.time*7),cy=y+55-pop*63;round(ctx,x-37,cy-24,74,80,32,m.gold?'#dcb16a':'#a9815e');circle(x-27,cy-19,12,m.gold?'#dcb16a':'#a9815e');circle(x+27,cy-19,12,m.gold?'#dcb16a':'#a9815e');circle(x-12,cy-3,4,'#293d38');circle(x+12,cy-3,4,'#293d38');circle(x,cy+10,7,'#d7b59c');round(ctx,x-7,cy+21,14,10,3,'#fff5dd');ctx.restore();}}
  while(model.events.length){const e=model.events.shift();flashes.push({x:240+e.hole%3*240,y:100+Math.floor(e.hole/3)*160,value:e.value,t:.5});}for(const f of flashes){ctx.globalAlpha=f.t/.5;text('+'+f.value,f.x,f.y-(.5-f.t)*60,27,'#55854f');ctx.globalAlpha=1;}
 }
 function loop(now){if(closed)return;const dt=previous?Math.min(.04,(now-previous)/1000):0;previous=now;
  if(!paused){clock+=dt;flashes=flashes.map(f=>({...f,t:f.t-dt})).filter(f=>f.t>0);if(kind==='piano')model.step(dt);if(kind==='capsules'&&phase()==='playing'){dropTick+=dt;if(dropTick>Math.max(.2,.9-level*.06)){dropTick=0;model.fall();}}if(kind==='pegs')model.step(dt);if(kind==='asteroids'||kind==='bubbles')model.step(dt,keys);if(kind==='frogger'||kind==='moles')model.step(dt);}
  if(ctx){if(kind==='piano')drawPiano();if(kind==='capsules')drawCapsules();if(kind==='pegs')drawPegs();if(kind==='asteroids')drawAsteroids();if(kind==='frogger')drawFrogger();if(kind==='bubbles')drawBubbles();if(kind==='moles')drawMoles();}
  hud();if(root.dataset.phase!==phase())showResult();s.requestAnimationFrame(loop);
 }
 reset();if(canvas)s.requestAnimationFrame(loop);
 surface.depthSnapshot=()=>M.clone(model);
 s.onCleanup(()=>{closed=true;drag?.ghost?.remove();Object.keys(keys).forEach(k=>keys[k]=false);save();});
}
// Exact-ID overrides come before inherited aliases. Other engines stay unchanged.
for(const name of ['launchRetroArcade','launchSokoban','launchMario','launchDXBall']){const old=window.NP_Engines[name];if(typeof old==='function')window.NP_Engines[name]=function(c,g){if(registry[g.id])return launch(c,g);return old(c,g);};}
window.NP_DepthGames={registry,launch,has:id=>Object.hasOwn(registry,id)};
})();

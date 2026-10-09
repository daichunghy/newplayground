/* NewPlayground Xếp Khối rules. Rotation offset data adapted from tetr.js,
 * Copyright (c) 2012 Simon M. Laroche, MIT; see assets/licenses/tetr-js-MIT.txt.
 * Reference: github.com/simonlc/tetr.js @ 57e5d07b18920389024ffa2ed07ce309d3644706.
 * Other logic is original project code. This is not an official Tetris implementation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_FallingBlocksModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const COLS=10,ROWS=22,HIDDEN=2,STEP=20,LOCK_MS=500,MAX_RESETS=15;
 const TYPES=['I','J','L','O','S','T','Z'];
 const SHAPES={
  I:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]],O:[[1,1],[1,1]],
  S:[[0,1,1],[1,1,0],[0,0,0]],T:[[0,1,0],[1,1,1],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]]
 };
 const KICKS=[[[0,0],[0,0],[0,0],[0,0],[0,0]],[[0,0],[1,0],[1,1],[0,-2],[1,-2]],[[0,0],[0,0],[0,0],[0,0],[0,0]],[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]]];
 const I_KICKS=[[[0,0],[-1,0],[2,0],[-1,0],[2,0]],[[-1,0],[0,0],[0,0],[0,-1],[0,2]],[[-1,-1],[1,-1],[-2,-1],[1,0],[-2,0]],[[0,-1],[0,-1],[0,-1],[0,1],[0,-2]]];
 const clone=x=>JSON.parse(JSON.stringify(x));
 function matrix(type,rotation=0){let m=SHAPES[type].map(r=>r.slice());for(let n=0;n<rotation;n++)m=m[0].map((_,c)=>m.map(row=>row[c]).reverse());return m;}
 function cells(piece){const out=[];matrix(piece.type,piece.rotation).forEach((row,r)=>row.forEach((v,c)=>{if(v)out.push([piece.y+r,piece.x+c]);}));return out;}
 function collision(grid,piece){return cells(piece).some(([r,c])=>c<0||c>=COLS||r<0||r>=ROWS||grid[r][c]!==0);}
 function validSave(s){
  if(!s||s.version!==1||!['sprint','endless'].includes(s.mode)||!['playing','won','lost'].includes(s.status))return false;
  if(!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff||!Array.isArray(s.grid)||s.grid.length!==ROWS||Array.from(s.grid).some(row=>!Array.isArray(row)||row.length!==COLS||Array.from(row).some(v=>v!==0&&!TYPES.includes(v))))return false;
  for(const key of ['score','lines','pieces','serial','elapsedMs'])if(!Number.isSafeInteger(s[key])||s[key]<0)return false;
  if(s.serial<1||s.pieces>s.serial||s.elapsedMs%STEP!==0||s.score%1!==0)return false;
  if(!Array.isArray(s.queue)||s.queue.length<7||s.queue.length>13||Array.from(s.queue).some(t=>!TYPES.includes(t))||s.hold!==null&&!TYPES.includes(s.hold)||typeof s.holdUsed!=='boolean'||typeof s.softActive!=='boolean')return false;
  const p=s.active;if(!p||!TYPES.includes(p.type)||!Number.isInteger(p.rotation)||p.rotation<0||p.rotation>3||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x< -4||p.x>10||p.y< -4||p.y>22)return false;
  for(const [key,max] of [['gravityMs',800],['lockMs',LOCK_MS],['remainder',STEP]])if(!Number.isFinite(s[key])||s[key]<0||s[key]>max)return false;
  if(!Number.isInteger(s.lockResets)||s.lockResets<0||s.lockResets>MAX_RESETS)return false;
  if(s.status==='playing'&&(collision(s.grid,p)||s.grid.slice(0,HIDDEN).some(row=>row.some(Boolean))||s.grid.some(row=>row.every(Boolean))||s.mode==='sprint'&&s.lines>=40))return false;
  if(s.status==='won'&&(s.mode!=='sprint'||s.lines<40))return false;
  return true;
 }
 function create({seed=Math.floor(Math.random()*0x100000000),mode='sprint',saved=null}={}){
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!['sprint','endless'].includes(mode))throw new RangeError('Invalid seed or mode');
  let state;
  if(saved){if(!validSave(saved))return null;state=clone(saved);}else{
   state={version:1,mode,seed,grid:Array.from({length:ROWS},()=>Array(COLS).fill(0)),queue:[],active:null,hold:null,holdUsed:false,softActive:false,score:0,lines:0,pieces:0,serial:0,elapsedMs:0,gravityMs:0,lockMs:0,lockResets:0,remainder:0,status:'playing'};
  }
  let lastSoft=state.softActive;
  const level=()=>1+Math.floor(state.lines/10);
  const gravity=()=>Math.max(80,Math.round(800*Math.pow(.82,level()-1)));
  function random(){state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/0x100000000;}
  function fillQueue(){while(state.queue.length<7){const bag=TYPES.slice();for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}state.queue.push(...bag);}}
  function fits(p){return !collision(state.grid,p);}
  const grounded=()=>!fits({...state.active,y:state.active.y+1});
  function spawn(type){
   if(!type){fillQueue();type=state.queue.shift();fillQueue();}
   const m=matrix(type),firstRow=m.findIndex(row=>row.some(Boolean));
   state.active={type,rotation:0,x:Math.floor((COLS-m.length)/2),y:HIDDEN-firstRow};state.serial++;
   state.gravityMs=0;state.lockMs=0;state.lockResets=0;lastSoft=false;state.softActive=false;
   if(!fits(state.active))state.status='lost';
  }
  if(!saved)spawn();
  function resetLock(wasGrounded){if(wasGrounded&&state.lockResets<MAX_RESETS){state.lockMs=0;state.lockResets++;}}
  function move(dx){
   if(state.status!=='playing'||![-1,1].includes(dx))return false;
   const p={...state.active,x:state.active.x+dx};if(!fits(p))return false;
   const was=grounded();state.active=p;resetLock(was);return true;
  }
  function rotate(direction=1){
   if(state.status!=='playing'||![-1,1].includes(direction)||state.active.type==='O')return false;
   const current=state.active,rotation=(current.rotation+direction+4)%4,table=current.type==='I'?I_KICKS:KICKS;
   for(let n=0;n<table[0].length;n++){
    const p={...current,rotation,x:current.x+table[current.rotation][n][0]-table[rotation][n][0],y:current.y+table[current.rotation][n][1]-table[rotation][n][1]};
    if(fits(p)){const was=grounded();state.active=p;resetLock(was);return true;}
   }
   return false;
  }
  function softDrop(){if(state.status!=='playing')return false;const p={...state.active,y:state.active.y+1};if(!fits(p))return false;state.active=p;state.score++;state.gravityMs=0;state.lockMs=0;return true;}
  function hold(){
   if(state.status!=='playing'||state.holdUsed)return false;
   const previous=state.hold;state.hold=state.active.type;spawn(previous);state.holdUsed=true;return true;
  }
  function ghostY(){if(state.status!=='playing')return state.active.y;let p={...state.active};while(fits({...p,y:p.y+1}))p.y++;return p.y;}
  function lock(){
   const locked=cells(state.active),before=state.score;
   locked.forEach(([r,c])=>{if(r>=0&&r<ROWS&&c>=0&&c<COLS)state.grid[r][c]=state.active.type;});state.pieces++;
   if(locked.some(([r])=>r<HIDDEN)){state.status='lost';return{kind:'lost',cleared:0,scoreDelta:0};}
   const cleared=state.grid.filter(row=>row.every(Boolean)).length,oldLevel=level();
   if(cleared){state.grid=state.grid.filter(row=>!row.every(Boolean));while(state.grid.length<ROWS)state.grid.unshift(Array(COLS).fill(0));state.lines+=cleared;state.score+=([0,100,300,500,800][cleared]||0)*oldLevel;}
   state.holdUsed=false;
   if(state.mode==='sprint'&&state.lines>=40)state.status='won';else spawn();
   return{kind:state.status==='playing'?(cleared?'clear':'lock'):state.status,cleared,scoreDelta:state.score-before};
  }
  function hardDrop(){if(state.status!=='playing')return null;const y=ghostY(),distance=y-state.active.y;state.active.y=y;state.score+=distance*2;return{...lock(),dropDistance:distance};}
  function advance(ms,soft=false){
   if(state.status!=='playing'||!Number.isFinite(ms)||ms<0||ms>60000)return{changed:false,events:[]};
   if(soft!==lastSoft){state.gravityMs=0;lastSoft=soft;state.softActive=soft;}
   state.remainder+=ms;let changed=false;const events=[];
   while(state.remainder+1e-7>=STEP&&state.status==='playing'){
    state.remainder=Math.max(0,state.remainder-STEP);state.elapsedMs+=STEP;
    if(grounded()){
     state.lockMs+=STEP;state.gravityMs=0;
     if(state.lockMs>=LOCK_MS){events.push(lock());changed=true;}
    }else{
     state.lockMs=0;state.gravityMs+=STEP;const interval=soft?50:gravity();
     if(state.gravityMs>=interval){state.gravityMs-=interval;state.active.y++;if(soft)state.score++;changed=true;}
    }
   }
   if(state.status!=='playing')state.remainder=0;
   return{changed,events};
  }
  function view(){return{...clone(state),level:level(),gravityMsPerCell:gravity(),ghostY:ghostY(),activeCells:cells(state.active)};}
  return{move,rotate,softDrop,hardDrop,hold,advance,view,serialize:()=>clone(state)};
 }
 return{COLS,ROWS,HIDDEN,STEP,LOCK_MS,MAX_RESETS,TYPES:TYPES.slice(),matrix,cells,collision,validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});

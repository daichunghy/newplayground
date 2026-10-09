/* Original Kính Khảm three-window tile-matching rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_MosaicMatchModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const ROWS=6,COLS=6,CELL_COUNT=ROWS*COLS,MAX_MOVES=30,COLOR_COUNT=5;
 const COLORS=[
  {name:'Lam',symbol:'◆',tone:'#4e8cae'},
  {name:'Hồng',symbol:'✿',tone:'#c56f83'},
  {name:'Lá',symbol:'◇',tone:'#629a79'},
  {name:'Vàng',symbol:'☼',tone:'#d39a42'},
  {name:'Tím',symbol:'✦',tone:'#9078b6'}
 ];
 const STAGES=[{name:'Cửa Sớm',colors:4,target:45},{name:'Cửa Gió',colors:5,target:60},{name:'Cửa Trăng',colors:5,target:75}];
 const clone=x=>JSON.parse(JSON.stringify(x)),finite=Number.isFinite,safe=n=>Number.isSafeInteger(n)&&n>=0;
 const idx=(r,c)=>r*COLS+c;
 function validCell(r,c){return Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<ROWS&&c>=0&&c<COLS;}
 function adjacent(a,b){return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;}
 function findMatches(board){
  const hit=new Set();
  for(let r=0;r<ROWS;r++){let c=0;while(c<COLS){const color=board[r][c];let end=c+1;while(color!==null&&end<COLS&&board[r][end]===color)end++;if(color!==null&&end-c>=3)for(let x=c;x<end;x++)hit.add(idx(r,x));c=end;}}
  for(let c=0;c<COLS;c++){let r=0;while(r<ROWS){const color=board[r][c];let end=r+1;while(color!==null&&end<ROWS&&board[end][c]===color)end++;if(color!==null&&end-r>=3)for(let y=r;y<end;y++)hit.add(idx(y,c));r=end;}}
  return [...hit].sort((a,b)=>a-b);
 }
 function boardHasLegalMove(board){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)for(const [dr,dc] of [[0,1],[1,0]]){const nr=r+dr,nc=c+dc;if(nr>=ROWS||nc>=COLS||board[r][c]===board[nr][nc])continue;const copy=clone(board);[copy[r][c],copy[nr][nc]]=[copy[nr][nc],copy[r][c]];if(findMatches(copy).length)return true;}
  return false;
 }
 function initialBoard(random,colorCount){
  for(let attempt=0;attempt<250;attempt++){
   const b=Array.from({length:ROWS},()=>Array(COLS).fill(null));
   for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    let color,guard=0;
    do{color=Math.floor(random()*colorCount);guard++;}while(guard<20&&((c>=2&&b[r][c-1]===color&&b[r][c-2]===color)||(r>=2&&b[r-1][c]===color&&b[r-2][c]===color)));
    b[r][c]=color;
   }
   if(!findMatches(b).length&&boardHasLegalMove(b))return b;
  }
  throw new Error('Unable to deal a playable mosaic');
 }
 function create({saved=null,seed=0x4b4b13a9,stage=0,score=0,bankScore=score,rng=null}={}){
  if(saved&&!validSave(saved))return null;
  if(!saved&&(!Number.isInteger(stage)||stage<0||stage>=STAGES.length||!safe(score)||!safe(bankScore)||bankScore>score))throw new RangeError('Invalid Kính Khảm start');
  let s=saved?clone(saved):{version:1,seed:(seed>>>0)||0x4b4b13a9,rng:(rng>>>0)||((seed>>>0)||0x4b4b13a9),startRng:(rng>>>0)||((seed>>>0)||0x4b4b13a9),stage,score,bankScore,cleared:0,moves:0,board:null,selected:null,status:'playing'};
  const events=[];const emit=(kind,extra={})=>events.push({kind,...extra});
  function random(){let x=s.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
  function makeBoard(){s.board=initialBoard(random,STAGES[s.stage].colors);}
  if(!saved)makeBoard();
  function refill(){
   for(let c=0;c<COLS;c++){const kept=[];for(let r=ROWS-1;r>=0;r--)if(s.board[r][c]!==null)kept.push(s.board[r][c]);while(kept.length<ROWS)kept.push(Math.floor(random()*STAGES[s.stage].colors));for(let r=ROWS-1,i=0;r>=0;r--,i++)s.board[r][c]=kept[i];}
  }
  function ensurePlayable(){if(!boardHasLegalMove(s.board)){makeBoard();emit('shuffle');}}
  function clearMatches(){
   let chain=0,total=0,match;
   while((match=findMatches(s.board)).length&&chain<64){
    for(const i of match){const r=Math.floor(i/COLS),c=i%COLS;s.board[r][c]=null;}
    total+=match.length;s.score+=match.length*10*(chain+1);refill();chain++;
   }
   if(findMatches(s.board).length){makeBoard();emit('shuffle');}
   s.cleared+=total;emit('match',{count:total,chain,score:s.score});
   if(s.cleared>=STAGES[s.stage].target){s.status=s.stage===STAGES.length-1?'won':'cleared';s.selected=null;emit(s.status,{stage:s.stage,score:s.score});}
   else if(s.moves>=MAX_MOVES){s.status='lost';s.selected=null;emit('lost',{stage:s.stage});}
   else ensurePlayable();
  }
  function tap(r,c){
   if(s.status!=='playing'||!validCell(r,c))return false;
   if(!s.selected){s.selected={r,c};emit('select',{r,c});return true;}
   const first=s.selected;
   if(first.r===r&&first.c===c){s.selected=null;emit('deselect');return true;}
   if(!adjacent(first,{r,c})){s.selected={r,c};emit('select',{r,c});return true;}
   [s.board[first.r][first.c],s.board[r][c]]=[s.board[r][c],s.board[first.r][first.c]];
   if(!findMatches(s.board).length){[s.board[first.r][first.c],s.board[r][c]]=[s.board[r][c],s.board[first.r][first.c]];s.selected=null;emit('invalid');return true;}
   s.selected=null;s.moves++;clearMatches();return true;
  }
  function deselect(){if(s.status!=='playing'||!s.selected)return false;s.selected=null;emit('deselect');return true;}
  function drain(){const out=events.splice(0);return out;}
  function next(){if(s.status!=='cleared')return null;const next=create({stage:s.stage+1,score:s.score,bankScore:s.score,rng:s.rng,seed:s.seed});return next;}
  function retry(){return s.status==='lost'?create({stage:s.stage,score:s.bankScore,bankScore:s.bankScore,rng:s.startRng,seed:s.seed}):null;}
  function view(){return{...clone(s),stageInfo:clone(STAGES[s.stage]),stages:STAGES.length,colors:clone(COLORS),rows:ROWS,cols:COLS,maxMoves:MAX_MOVES};}
  return{tap,deselect,drain,view,serialize:()=>clone(s),next,retry};
 }
 function validSave(s){
  if(!s||s.version!==1||!safe(s.seed)||!s.seed||s.seed>0xffffffff||!safe(s.rng)||!s.rng||s.rng>0xffffffff||!safe(s.startRng)||!s.startRng||s.startRng>0xffffffff||!safe(s.stage)||s.stage>=STAGES.length||!safe(s.score)||!safe(s.bankScore)||s.score<s.bankScore||!safe(s.cleared)||!safe(s.moves)||s.moves>MAX_MOVES||!['playing','cleared','won','lost'].includes(s.status)||!Array.isArray(s.board)||s.board.length!==ROWS||s.board.some(row=>!Array.isArray(row)||row.length!==COLS||row.some(x=>x!==null&&(!Number.isInteger(x)||x<0||x>=STAGES[s.stage].colors)))||s.selected!==null&&(!s.selected||!validCell(s.selected.r,s.selected.c)))return false;
  const matches=findMatches(s.board);
  if(matches.length)return false;
  if(s.status==='playing'&&(s.moves>=MAX_MOVES||s.cleared>=STAGES[s.stage].target||!boardHasLegalMove(s.board)))return false;
  if(s.status==='lost'&&s.moves!==MAX_MOVES)return false;
  if((s.status==='cleared'||s.status==='won')&&s.cleared<STAGES[s.stage].target)return false;
  if(s.status==='cleared'&&s.stage===STAGES.length-1||s.status==='won'&&s.stage!==STAGES.length-1)return false;
  if(s.status!=='playing'&&s.selected!==null)return false;
  return true;
 }
 return{ROWS,COLS,CELL_COUNT,MAX_MOVES,COLOR_COUNT,COLORS:clone(COLORS),STAGES:clone(STAGES),findMatches,boardHasLegalMove,validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});

/* Original Sắc Chuyền hand-shedding game; deterministic 1v1 simulation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_SeasonShedModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const SUITS={spring:{name:'Lá non',symbol:'✿'},summer:{name:'Nắng',symbol:'☼'},autumn:{name:'Lá thu',symbol:'❋'},winter:{name:'Băng',symbol:'❄'}};
 const SUIT_KEYS=Object.keys(SUITS),CARDS=[];
 for(const suit of SUIT_KEYS){for(let value=1;value<=8;value++)for(let copy=0;copy<2;copy++)CARDS.push({id:`${suit}:n${value}:${copy}`,suit,value,kind:'number'});for(let copy=0;copy<2;copy++)CARDS.push({id:`${suit}:gust:${copy}`,suit,value:'gust',kind:'gust'});}
 for(let copy=0;copy<4;copy++)CARDS.push({id:`dew:${copy}`,suit:null,value:'dew',kind:'dew'});
 const CARD_BY_ID=new Map(CARDS.map(c=>[c.id,c])),CARD_TOTAL=CARDS.length,clone=x=>JSON.parse(JSON.stringify(x)),safe=n=>Number.isSafeInteger(n)&&n>=0;
 function makeDeck(){return CARDS.map(c=>c.id);}
 function random(s){let x=s.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
 function shuffle(a,s){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function create({seed=0x51ac2026,saved=null}={}){if(saved&&!validSave(saved))return null;let s=saved?clone(saved):{version:1,seed:(seed>>>0)||0x51ac2026,rng:(seed>>>0)||0x51ac2026,hands:[[],[]],drawPile:[],discard:[],activeSuit:'spring',turn:0,phase:'player',lastDrawId:null,status:'playing',winner:null};let events=[];const emit=(kind,extra={})=>events.push({kind,...extra});
  if(!saved){s.drawPile=shuffle(makeDeck(),s);for(let i=0;i<6;i++){s.hands[0].push(s.drawPile.pop());s.hands[1].push(s.drawPile.pop());}const held=[];let opening=null;while(s.drawPile.length){const id=s.drawPile.pop(),card=CARD_BY_ID.get(id);if(card.kind==='number'){opening=id;break;}held.push(id);}s.drawPile.push(...held);if(!opening)throw new Error('Unable to create an opening number card');s.discard.push(opening);s.activeSuit=CARD_BY_ID.get(opening).suit;}
  function card(id){return CARD_BY_ID.get(id)||null;}
  function playable(id){const c=card(id),top=card(s.discard.at(-1));return!!c&&!!top&&(c.kind==='dew'||c.suit===s.activeSuit||c.kind===top.kind&&c.kind==='gust'||c.kind==='number'&&top.kind==='number'&&c.value===top.value);}
  function reshuffle(){if(s.drawPile.length||s.discard.length<=1)return;const top=s.discard.pop();s.drawPile=shuffle(s.discard,s);s.discard=[top];emit('reshuffle',{count:s.drawPile.length});}
  function drawOne(){reshuffle();return s.drawPile.pop()||null;}
  function drawCards(player,count){let drawn=0;for(let i=0;i<count;i++){const id=drawOne();if(!id)break;s.hands[player].push(id);drawn++;}emit('draw',{player,count:drawn});}
  function endWinner(player){if(s.hands[player].length)return false;s.status=player===0?'won':'lost';s.winner=player;s.phase='over';s.turn=player;emit('finish',{winner:player});return true;}
  function resolve(id,player,chosenSuit){const c=card(id),hand=s.hands[player],idx=hand.indexOf(id);if(idx<0||!playable(id)||c.kind==='dew'&&!SUIT_KEYS.includes(chosenSuit))return false;hand.splice(idx,1);s.discard.push(id);s.activeSuit=c.kind==='dew'?chosenSuit:c.suit;s.lastDrawId=null;emit('play',{player,cardId:id,activeSuit:s.activeSuit});if(endWinner(player))return true;
   if(c.kind==='gust'){const next=1-player;drawCards(next,2);if(player===0){s.turn=0;s.phase='player';}else{s.turn=1;s.phase='ai';}emit('gust',{player:next});return true;}
   s.turn=1-player;s.phase=s.turn===0?'player':'ai';return true;
  }
  function act(action,value){if(s.status!=='playing'||s.turn!==0)return false;if(action==='play'){if(!['player','player-drawn'].includes(s.phase))return false;const id=typeof value==='string'?value:value?.cardId;if(s.phase==='player-drawn'&&id!==s.lastDrawId){emit('blocked',{reason:'drawn-card-only'});return false;}if(!playable(id)){emit('blocked',{reason:'not-playable'});return false;}const c=card(id),chosen=typeof value==='object'?value.suit:null;if(c.kind==='dew'&&!SUIT_KEYS.includes(chosen)){emit('blocked',{reason:'choose-suit'});return false;}return resolve(id,0,chosen);}
   if(action==='draw'&&s.phase==='player'){const id=drawOne();if(!id){s.turn=1;s.phase='ai';emit('empty-deck');return true;}s.hands[0].push(id);s.lastDrawId=id;if(playable(id)){s.phase='player-drawn';emit('drawn-playable',{cardId:id});}else{s.lastDrawId=null;s.turn=1;s.phase='ai';emit('drawn-pass',{cardId:id});}return true;}
   if(action==='pass'&&s.phase==='player-drawn'){s.lastDrawId=null;s.turn=1;s.phase='ai';emit('pass');return true;}return false;
  }
  function aiCard(){const hand=s.hands[1],plays=hand.filter(playable);if(!plays.length)return null;const gust=plays.find(id=>card(id).kind==='gust');if(gust&&s.hands[0].length<=3)return gust;const counts=Object.fromEntries(SUIT_KEYS.map(k=>[k,hand.filter(id=>card(id).suit===k).length]));return plays.find(id=>card(id).kind==='number'&&card(id).suit===s.activeSuit)||plays.find(id=>card(id).kind==='number')||gust||plays[0];}
  function aiWildSuit(){const hand=s.hands[1],counts=Object.fromEntries(SUIT_KEYS.map(k=>[k,hand.filter(id=>card(id).suit===k).length]));return SUIT_KEYS.reduce((best,k)=>counts[k]>counts[best]?k:best,SUIT_KEYS[0]);}
  function advanceAI(){if(s.status!=='playing'||s.phase!=='ai'||s.turn!==1)return[];let guard=0;while(s.status==='playing'&&s.phase==='ai'&&guard++<24){const id=aiCard();if(id){const c=card(id);resolve(id,1,c.kind==='dew'?aiWildSuit():null);continue;}const drawn=drawOne();if(!drawn){s.turn=0;s.phase='player';emit('empty-deck');break;}s.hands[1].push(drawn);emit('drawn',{player:1,cardId:drawn});if(playable(drawn)){const c=card(drawn);resolve(drawn,1,c.kind==='dew'?aiWildSuit():null);}else{s.turn=0;s.phase='player';break;}}
   if(guard>=24&&s.status==='playing'&&s.phase==='ai'){s.turn=0;s.phase='player';emit('safety-pass');}return drain();}
  function drain(){const out=events;events=[];return out;}
  function view(){const top=card(s.discard.at(-1)),hand=s.hands[0].map(card).filter(Boolean),playableIds=s.status==='playing'&&['player','player-drawn'].includes(s.phase)?hand.filter(c=>(s.phase!=='player-drawn'||c.id===s.lastDrawId)&&playable(c.id)).map(c=>c.id):[];return{version:1,status:s.status,winner:s.winner,phase:s.phase,turn:s.turn,activeSuit:s.activeSuit,topCard:clone(top),hand:clone(hand),playableIds:clone(playableIds),opponentCount:s.hands[1].length,drawCount:s.drawPile.length,discardCount:s.discard.length,lastDrawId:s.lastDrawId,suitInfo:clone(SUITS)};}
  return{act,advanceAI,drain,view,serialize:()=>clone(s)};
 }
 function validSave(s){if(!s||s.version!==1||!safe(s.seed)||s.seed===0||!safe(s.rng)||s.rng===0||!['playing','won','lost'].includes(s.status)||!['player','player-drawn','ai','over'].includes(s.phase)||!Number.isInteger(s.turn)||![0,1].includes(s.turn)||!SUIT_KEYS.includes(s.activeSuit)||!Array.isArray(s.hands)||s.hands.length!==2||!Array.isArray(s.drawPile)||!Array.isArray(s.discard)||!s.discard.length||s.drawPile.length>CARD_TOTAL||s.discard.length>CARD_TOTAL||s.hands.some(h=>!Array.isArray(h)||h.length>CARD_TOTAL)||!([null,...CARDS.map(c=>c.id)].includes(s.lastDrawId)))return false;
  const all=[...s.hands[0],...s.hands[1],...s.drawPile,...s.discard],ids=new Set(all);if(all.length!==CARD_TOTAL||ids.size!==CARD_TOTAL||all.some(id=>!CARD_BY_ID.has(id)))return false;
  const top=CARD_BY_ID.get(s.discard.at(-1));if(!top||top.kind!=='dew'&&top.suit!==s.activeSuit)return false;
  if(s.status==='playing'&&(s.phase==='over'||s.winner!==null)||s.status==='won'&&(s.phase!=='over'||s.winner!==0||s.hands[0].length!==0)||s.status==='lost'&&(s.phase!=='over'||s.winner!==1||s.hands[1].length!==0))return false;
  if(s.status==='playing'&&(s.phase==='player'||s.phase==='player-drawn')&&s.turn!==0||s.status==='playing'&&s.phase==='ai'&&s.turn!==1||s.status!=='playing'&&s.phase!=='over')return false;
  if(s.phase==='player-drawn'?(!s.lastDrawId||!s.hands[0].includes(s.lastDrawId)):s.lastDrawId!==null)return false;
  return true;
 }
 return{SUITS:clone(SUITS),SUIT_KEYS:clone(SUIT_KEYS),CARDS:clone(CARDS),CARD_TOTAL,validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});

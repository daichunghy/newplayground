/* Ten clean-room card and dice games. Rules models are the same objects used by the canvas UI. */
(function () {
  'use strict';
  const SUITS = ['C', 'D', 'H', 'S'];
  const SUIT_NAMES = { C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' };
  const RED = new Set(['D', 'H']);
  const rankName = rank => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rank] || String(rank));
  const cardText = card => `${rankName(card.rank)}${card.suit}`;
  const makeDeck = () => SUITS.flatMap(suit => Array.from({ length: 13 }, (_, index) => ({
  id: `${suit}${index + 2}`,
  suit,
  rank: index + 2
  })));

  function shuffle(items, rng = Math.random) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  const suitColor = suit => RED.has(suit) ? '#b91c1c' : '#172554';
  const rankDistance = (a, b) => Math.abs(a - b);

  function result(ok, reason = '') {
    return { ok, reason };
  }

  function takeCard(hand, index) {
    return hand.splice(index, 1)[0];
  }

  function heartsModel() {

    function newGame(rng = Math.random) {
      const deck = shuffle(makeDeck(), rng);
      const players = Array.from({ length: 4 }, (_, p) => deck.slice(p * 13, p * 13 + 13).sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank));
      return { players, scores: [0, 0, 0, 0], cumulative: [0, 0, 0, 0], handNo: 1, passDone: false, passDirection: 'left', passSelections: [], leader: players.findIndex(hand => hand.some(c => c.rank === 2 && c.suit === 'C')),
      trick: [], trickHistory: [], trickNo: 0, heartsBroken: false, handPoints: [0, 0, 0, 0], over: false, winner: null, awaitingNext: false, status: 'Choose three cards to pass left.' };
    }

    function selectPass(state, indices) {
      if (state.over || state.passDone || !['left', 'right', 'across'].includes(state.passDirection)) return result(false, 'Passing is closed.');
      if (!Array.isArray(indices) || indices.length !== 3 || new Set(indices).size !== 3 || indices.some(i => !Number.isInteger(i) || i < 0 || i >= state.players[0].length)) return result(false, 'Select exactly three distinct cards.');
      state.passSelections = indices.slice();
      return result(true);
    }

    function pass(state) {
      if (state.over || state.passDone) return result(false, 'Passing is closed.');
      if (state.passDirection === 'none') {
        state.passDone = true;
        state.status = 'No pass. The 2♣ leads.';
        return result(true);
      }
      if (state.passSelections.length !== 3) return result(false, 'Select three cards first.');
      const receivers = state.passDirection === 'left' ? [1, 2, 3, 0] : state.passDirection === 'right' ? [3, 0, 1, 2] : [2, 3, 0, 1];
      const sent = state.players.map((hand, p) => state.passSelections.slice().sort((a, b) => b - a).map(i => takeCard(hand, i)));
      for (let p = 0; p < 4; p++) state.players[receivers[p]].push(...sent[p]);
      state.players.forEach(hand => hand.sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank));
      state.passDone = true;
      state.passSelections = [];
      state.status = 'The 2♣ leads.';
      return result(true);
    }

    function legalCards(state, player) {
      const hand = state.players[player] || [];
      if (state.over || !state.passDone || state.awaitingNext || state.trick.length >= 4) return [];
      if (!state.trick.length) {
        if (state.trickNo === 0 && hand.some(c => c.rank === 2 && c.suit === 'C')) return hand.filter(c => c.rank === 2 && c.suit === 'C');
        let cards = hand.slice();
        if (!state.heartsBroken && cards.some(c => c.suit !== 'H')) cards = cards.filter(c => c.suit !== 'H');
        if (state.trickNo === 0 && cards.some(c => c.suit !== 'H' && !(c.rank === 12 && c.suit === 'S'))) cards = cards.filter(c => c.suit !== 'H' && !(c.rank === 12 && c.suit === 'S'));
        return cards.length ? cards : hand.slice();
      }
      const led = state.trick[0].card.suit;
      const following = hand.filter(c => c.suit === led);
      let options = following.length ? following : hand.slice();
      if (state.trickNo === 0 && !following.length) {
        const noPoints = options.filter(c => c.suit !== 'H' && !(c.suit === 'S' && c.rank === 12));
        if (noPoints.length) options = noPoints;
      }
      return options;
    }

    function resolve(state) {
      const led = state.trick[0].card.suit;
      const eligible = state.trick.filter(item => item.card.suit === led);
      const winner = eligible.reduce((best, item) => item.card.rank > best.card.rank ? item : best).player;
      const points = state.trick.reduce((sum, item) => sum + (item.card.suit === 'H' ? 1 : item.card.suit === 'S' && item.card.rank === 12 ? 13 : 0), 0);
      state.handPoints[winner] += points;
      state.trickHistory.push({ cards: state.trick.map(item => ({ player: item.player, card: item.card })), winner, points });
      state.leader = winner;
      state.trick = [];
      state.trickNo++;
      if (state.trickNo === 13) {
        const moon = state.handPoints.findIndex(score => score === 26);
        for (let p = 0; p < 4; p++) state.scores[p] = moon >= 0 ? (p === moon ? 0 : 26) : state.handPoints[p];
        state.cumulative = state.cumulative.map((score, p) => score + state.scores[p]);
        state.awaitingNext = true;
        if (state.cumulative.some(score => score >= 100)) {
          state.over = true;
          const low = Math.min(...state.cumulative);
          state.winner = state.cumulative.indexOf(low);
          state.status = `Game over. Player ${state.winner + 1} wins with ${low} points.`;
        }
        else state.status = `Hand ${state.handNo} complete. Press Next hand.`;
      }
    }

    function play(state, player, handIndex) {
      if (state.over || !state.passDone || state.awaitingNext || state.trick.length >= 4 || player !== (state.trick.length ? (state.leader + state.trick.length) % 4 : state.leader)) return result(false, 'Not this player’s turn.');
      const card = state.players[player]?.[handIndex];
      if (!card || !legalCards(state, player).some(c => c === card)) return result(false, 'Illegal card: follow suit and obey the lead rules.');
      if (card.suit === 'H') state.heartsBroken = true;
      state.trick.push({ player, card: takeCard(state.players[player], handIndex) });
      if (state.trick.length === 4) resolve(state);
      return result(true);
    }

    function nextHand(state, rng = Math.random) {
      if (state.over || !state.awaitingNext) return result(false, 'The hand has not ended.');
      if (state.players.some(hand => hand.length)) return result(false, 'A hand is still in progress.');
      state.handNo++;
      state.passDirection = ({ 1: 'right', 2: 'across', 3: 'none' }[((state.handNo - 1) % 4)] || 'left');
      if (state.passDirection === 'none') state.passDirection = 'none';
      const deck = shuffle(makeDeck(), rng);
      state.players = Array.from({ length: 4 }, (_, p) => deck.slice(p * 13, p * 13 + 13).sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank));
      state.leader = state.players.findIndex(hand => hand.some(c => c.rank === 2 && c.suit === 'C'));
      state.trickNo = 0;
      state.trick = [];
      state.trickHistory = [];
      state.heartsBroken = false;
      state.handPoints = [0, 0, 0, 0];
      state.awaitingNext = false;
      state.passDone = state.passDirection === 'none';
      state.passSelections = [];
      state.status = state.passDone ? 'No pass. The 2♣ leads.' : `Choose three cards to pass ${state.passDirection}.`;
      return result(true);
    }

    function botCard(state, player) {
      const cards = legalCards(state, player);
      if (!cards.length) return result(false, 'No legal bot card.');
      const index = state.players[player].findIndex(c => c.id === cards.slice().sort((a,b) => a.rank-b.rank)[0].id);
      return play(state, player, index);
    }
    return { newGame, selectPass, pass, legalCards, play, nextHand, botCard };
  }

  function spadesModel() {

    function newGame(rng = Math.random) {
      const deck = shuffle(makeDeck(), rng);
      const players = Array.from({ length: 4 }, (_, p) => deck.slice(p * 13, p * 13 + 13).sort((a,b)=>a.suit.localeCompare(b.suit)||a.rank-b.rank));
      return { players, teamScores:[0,0], bags:[0,0], bids:[null,null,null,null], tricks:[0,0,0,0], leader:0, trick:[], trickHistory:[], trickNo:0, spadesBroken:false, handNo:1, over:false, winner:null, awaitingNext:false, status:'Player 1: bid 0–13 (or nil).', rng };
    }

    function bid(s,p,value) {
      if (s.over || s.awaitingNext || p !== s.bids.findIndex(x=>x===null) || !Number.isInteger(value) || value < 0 || value > 13) return result(false,'Invalid or out-of-turn bid.');
      s.bids[p]=value;
      if (s.bids.every(x=>x!==null)) s.status='Player 1 leads.';
      else s.status=`Player ${s.bids.findIndex(x=>x===null)+1}: bid 0–13 (or nil).`;
      return result(true);
    }

    function legalCards(s,p) {
      const hand=s.players[p]||[];
      if(s.over||s.awaitingNext||s.trick.length>=4) return [];
      if(s.trick.length){
        const follow=hand.filter(c=>c.suit===s.trick[0].card.suit);
        if(follow.length)return follow;
      }
      if(!s.trick.length&&!s.spadesBroken&&hand.some(c=>c.suit!=='S')) return hand.filter(c=>c.suit!=='S');
      return hand.slice();
    }

    function finish(s) {
      const lead=s.trick[0].card.suit;
      const winner=s.trick.reduce((best,item)=>{
        const c=item.card,b=best.card; const cr=c.suit==='S'?2:c.suit===lead?1:0, br=b.suit==='S'?2:b.suit===lead?1:0;
        return cr>br||(cr===br&&c.rank>b.rank)?item:best;
      }).player;
      s.tricks[winner]++;
      s.trickHistory.push({cards:s.trick.map(x=>({...x})),winner});
      s.leader=winner;
      s.trick=[];
      s.trickNo++;
      if(s.trickNo===13){
        for(let t=0;t<2;t++){
          const members=[t,t+2], contract=members.reduce((sum,p)=>sum+s.bids[p],0), nils=members.filter(p=>s.bids[p]===0);
          const nilScore=nils.reduce((sum,p)=>sum+(s.tricks[p]===0?100:-100),0);
          const contractTricks=members.reduce((sum,p)=>sum+(s.bids[p]===0?0:s.tricks[p]),0);
          let handScore=contractTricks>=contract?contract*10+(contractTricks-contract): -contract*10;
          const allTeamTricks=members.reduce((sum,p)=>sum+s.tricks[p],0);
          const nilTricks=nils.reduce((sum,p)=>sum+s.tricks[p],0);
          const bags=nilTricks+Math.max(0,contractTricks-contract);
          s.bags[t]+=bags;
          if(s.bags[t]>=10){
            handScore-=100*Math.floor(s.bags[t]/10);
            s.bags[t]%=10;
          }
          s.teamScores[t]+=handScore+nilScore;
        }
        s.awaitingNext=true;
        if(s.teamScores.some(score=>score>=500)){
          s.over=true;
          s.winner=s.teamScores[0]===s.teamScores[1]?null:s.teamScores[0]>s.teamScores[1]?0:1;
          s.status=s.winner===null?'Game over: draw.':`Game over: Team ${s.winner+1} wins.`;
        }
        else s.status=`Hand ${s.handNo} complete. Press Next hand.`;
      }
    }

    function play(s,p,i){
      if(s.over||s.awaitingNext||s.bids.some(x=>x===null)||p!==(s.trick.length?(s.leader+s.trick.length)%4:s.leader))return result(false,'Not this player’s turn.');
      const c=s.players[p]?.[i];
      if(!c||!legalCards(s,p).some(x=>x===c))return result(false,'Illegal play: follow suit and obey spades lead.');
      if(c.suit==='S')s.spadesBroken=true;
      s.trick.push({player:p,card:takeCard(s.players[p],i)});
      if(s.trick.length===4)finish(s);
      return result(true);
    }

    function nextHand(s,rng=s.rng||Math.random){
      if(s.over||!s.awaitingNext||s.players.some(h=>h.length))return result(false,'Hand is not ready.');
      const deck=shuffle(makeDeck(),rng);
      s.players=Array.from({length:4},(_,p)=>deck.slice(p*13,p*13+13).sort((a,b)=>a.suit.localeCompare(b.suit)||a.rank-b.rank));
      s.bids=[null,null,null,null];
      s.tricks=[0,0,0,0];
      s.trick=[];
      s.trickHistory=[];
      s.trickNo=0;
      s.spadesBroken=false;
      s.handNo++;
      s.awaitingNext=false;
      s.status='Player 1: bid 0–13 (or nil).';
      return result(true);
    }

    function botBid(s,p){
      const strength=s.players[p].reduce((n,c)=>n+(c.suit==='S'?Math.max(1,(c.rank-10)*0.22):c.rank>=13?1:c.rank===12?0.55:0),0);
      return bid(s,p,Math.max(0,Math.min(13,Math.round(strength))));
    }

    function botCard(s,p){
      const options=legalCards(s,p);
      if(!options.length)return result(false,'No legal play.');
      const chosen=s.trick.length?options.slice().sort((a,b)=>a.rank-b.rank)[0]:options.slice().sort((a,b)=>b.rank-a.rank)[0];
      return play(s,p,s.players[p].findIndex(c=>c.id===chosen.id));
    }
    return {newGame,bid,legalCards,play,nextHand,botBid,botCard};
  }

  function crazyModel(){

    function newGame(rng=Math.random){
      const deck=shuffle(makeDeck(),rng),players=[deck.splice(0,7),deck.splice(0,7)];
      const top=deck.pop();
      return{players,stock:deck,discard:[top],activeSuit:top.suit,turn:0,drawn:0,over:false,winner:null,status:'Match rank or suit; 8 chooses the suit. You may draw voluntarily; if stuck, draw until playable.',rng};
    }

    function playable(s,c){
      const top=s.discard[s.discard.length-1];
      return !!c&&(c.rank===8||c.suit===s.activeSuit||c.rank===top.rank);
    }

    function recycle(s){
      if(s.stock.length||s.discard.length<2)return false;
      const top=s.discard.pop();
      s.stock=shuffle(s.discard,s.rng||Math.random);
      s.discard=[top];
      return s.stock.length>0;
    }

    function draw(s,p){
      if(s.over||p!==s.turn)return result(false,'Not this player’s turn.');
      let count=0,recycled=false;
      const hadPlayable=s.players[p].some(c=>playable(s,c));
      const drawOne=()=>{
        if(!s.stock.length){
          if(recycled||!recycle(s))return false;
          recycled=true;
        }
        if(!s.stock.length)return false;
        s.players[p].push(s.stock.pop());
        count++;
        return true;
      };
      if(hadPlayable){
        drawOne();
      }
      else{
        while(!s.players[p].some(c=>playable(s,c))){
          if(!drawOne())break;
        }
      }
      s.drawn=count;
      if(!s.players[p].some(c=>playable(s,c))){
        s.turn=1-p;
        s.drawn=0;
      }
      s.status=count?`Drew ${count} card${count===1?'':'s'}. Play any playable card or keep drawing.`:'No card drawn; the stock is empty.';
      return result(true);
    }

    function play(s,p,index,chosenSuit){
      if(s.over||p!==s.turn)return result(false,'Not this player’s turn.');
      const c=s.players[p]?.[index];
      if(!c||!playable(s,c))return result(false,'Card must match rank/suit or be an eight.');
      if(c.rank===8&&!SUITS.includes(chosenSuit))return result(false,'Choose a suit for the eight.');
      if(c.rank!==8&&chosenSuit)return result(false,'Only an eight chooses a suit.');
      s.players[p].splice(index,1);
      s.discard.push(c);
      s.activeSuit=c.rank===8?chosenSuit:c.suit;
      s.drawn=0;
      if(!s.players[p].length){
        s.over=true;
        s.winner=p;
        s.status=`Player ${p+1} wins.`;
      }
      else{
        s.turn=1-p;
        s.status=c.rank===8?`Suit is ${SUIT_NAMES[s.activeSuit]}.`:'Match rank or suit; you may draw voluntarily.';
      }
      return result(true);
    }

    function botTurn(s){
      if(s.over||s.turn!==1)return result(false,'Bot is not active.');
      let i=s.players[1].findIndex(c=>playable(s,c));
      if(i<0){
        const r=draw(s,1);
        if(s.over||s.turn!==1)return r;
        i=s.players[1].findIndex(c=>playable(s,c));
        if(i<0)return r;
      }
      const c=s.players[1][i],suit=c.rank===8?SUITS.map(x=>[x,s.players[1].filter(a=>a.suit===x).length]).sort((a,b)=>b[1]-a[1])[0][0]:undefined;
      return play(s,1,i,suit);
    }
    return{newGame,playable,draw,play,botTurn};
  }

  function golfModel(){

    function newGame(rng=Math.random){
      const deck=shuffle(makeDeck(),rng);
      const columns=Array.from({length:7},(_,i)=>deck.slice(i*5,i*5+5).map(c=>({...c,id:`g${c.id}`,faceUp:true})));
      const stock=deck.slice(35);
      return{columns,stock,waste:[stock.pop()],over:false,status:'Remove an exposed card one rank above or below the waste.'};
    }

    function status(s){
      if(s.columns.every(c=>!c.length))return'win';
      if(s.stock.length)return'playing';
      const top=s.waste.at(-1);
      return s.columns.some(c=>c.length&&adjacentGolf(c.at(-1).rank,top.rank))?'playing':'loss';
    }
    function adjacentGolf(a,b){return Math.abs((a===14?1:a)-(b===14?1:b))===1;}

    function remove(s,column,index){
      if(s.over||!Number.isInteger(column)||!Number.isInteger(index)||!s.columns[column]||index!==s.columns[column].length-1)return result(false,'Only uncovered column tops may be removed.');
      const c=s.columns[column][index],top=s.waste.at(-1);
      if(!adjacentGolf(c.rank,top.rank))return result(false,'Play one rank above or below; Ace is low and does not wrap to King.');
      s.waste.push(s.columns[column].pop());
      s.columns[column].forEach(card=>card.faceUp=true);
      if(status(s)==='win'){
        s.over=true;
        s.status='Golf cleared: you win.';
      }
      else if(status(s)==='loss'){
        s.over=true;
        s.status='No legal top remains after the stock: loss.';
      }
      return result(true);
    }

    function draw(s){
      if(s.over||!s.stock.length)return result(false,'The stock is empty.');
      s.waste.push(s.stock.pop());
      if(status(s)==='loss'){
        s.over=true;
        s.status='Stock exhausted with no legal top: loss.';
      }
      else s.status='Remove an exposed card one rank above or below the waste.';
      return result(true);
    }
    return{newGame,status,remove,draw};
  }

  function pyramidModel(){

    function newGame(rng=Math.random){
      const d=shuffle(makeDeck(),rng),pyramid=[];
      let k=0;
      for(let row=0;row<7;row++)for(let col=0;col<=row;col++)pyramid.push({...d[k++],id:`p${d[k-1]?.id||''}`,row,col,removed:false});
      return{pyramid,stock:d.slice(28),waste:[],redeals:0,maxRedeals:1,over:false,status:'Remove exposed pairs totaling 13. King removes alone.',rng};
    }

    function exposed(s,id){
      const c=s.pyramid.find(x=>x.id===id&&!x.removed);
      if(!c)return false;
      return !s.pyramid.some(x=>!x.removed&&x.row===c.row+1&&(x.col===c.col||x.col===c.col+1));
    }

    function sourceCard(s,id){
      if(id==='waste')return s.waste.at(-1)||null;
      return s.pyramid.find(c=>c.id===id&&exposed(s,id))||null;
    }

    function removePair(s,a,b){
      if(s.over||!a||!b||a===b)return result(false,'Choose two distinct exposed cards.');
      const x=sourceCard(s,a),y=sourceCard(s,b);
      if(!x||!y||x.rank+y.rank!==13)return result(false,'Both cards must be exposed and total 13.');
      if(a==='waste')s.waste.pop();
      else x.removed=true;
      if(b==='waste')s.waste.pop();
      else y.removed=true;
      if(!s.pyramid.some(c=>!c.removed)){
        s.over=true;
        s.status='Pyramid cleared: you win.';
      }
      else checkEnd(s);
      return result(true);
    }

    function removeKing(s,id){
      if(s.over||id==='waste')return result(false,'Select an exposed pyramid King.');
      const c=sourceCard(s,id);
      if(!c||c.rank!==13)return result(false,'Only an exposed King removes alone.');
      c.removed=true;
      if(!s.pyramid.some(x=>!x.removed)){
        s.over=true;
        s.status='Pyramid cleared: you win.';
      }
      else checkEnd(s);
      return result(true);
    }

    function draw(s){
      if(s.over||!s.stock.length)return result(false,'Stock is empty; use the redeal control if available.');
      s.waste.push(s.stock.pop());
      checkEnd(s);
      return result(true);
    }

    function redeal(s){
      if(s.over||s.stock.length||!s.waste.length||s.redeals>=s.maxRedeals)return result(false,'One redeal is allowed after the stock and waste cycle are used.');
      s.stock=s.waste.reverse();
      s.waste=[];
      s.redeals++;
      checkEnd(s);
      return result(true);
    }

    function hasMove(s){
      const available=s.pyramid.filter(c=>!c.removed&&exposed(s,c.id));
      if(available.some(card=>card.rank===13))return true;
      if(s.waste.length)available.push(s.waste.at(-1));
      for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++)if(available[i].rank+available[j].rank===13)return true;
      return false;
    }

    function status(s){
      if(s.pyramid.every(c=>c.removed))return 'win';
      if(s.stock.length||(s.redeals<s.maxRedeals&&s.waste.length)||hasMove(s))return 'playing';
      return 'blocked';
    }

    function checkEnd(s){
      if(status(s)==='blocked'){
        s.over=true;
        s.status='No exposed pair remains after the redeal: loss.';
      }
    }
    return{newGame,exposed,removePair,removeKing,draw,redeal,status};
  }

  function tripeaksModel(){

    function newGame(rng=Math.random){
      const deck=shuffle(makeDeck(),rng),tableau=[];
      let i=0;
      const rows=[3,6,9,10];
      for(let row=0;row<4;row++){
        for(let col=0;col<rows[row];col++){
          tableau.push({...deck[i++],id:`t${deck[i-1]?.id||''}`,row,col,removed:false});
        }
      }
      return{tableau,stock:deck.slice(28,51),waste:[deck[51]],over:false,status:'Remove exposed cards one rank above/below the waste; K↔A wraps.'};
    }

    function parentSlots(card){
      if(card.row===1)return [[0,Math.floor(card.col/2)]];
      if(card.row===2){
        const coverage=[[0,1],[1,2],[3,4],[4,5],[6,7],[7,8]];
        return coverage.flatMap((range,parent)=>range.includes(card.col)?[[1,parent]]:[]);
      }
      if(card.row===3)return [[2,card.col-1],[2,card.col]].filter(([,col])=>col>=0&&col<9);
      return [];
    }

    function blocked(s,c){
      return parentSlots(c).some(([row,col])=>s.tableau.some(parent=>!parent.removed&&parent.row===row&&parent.col===col));
    }

    function exposed(s,id){
      const c=s.tableau.find(x=>x.id===id&&!x.removed);
      return c&&!blocked(s,c);
    }
    const adjacent=(a,b)=>{
      const lowA=a===14?1:a,lowB=b===14?1:b;
      return Math.abs(lowA-lowB)===1||Math.abs(lowA-lowB)===12;
    };

    function remove(s,id){
      if(s.over)return result(false,'Game ended.');
      const c=s.tableau.find(x=>x.id===id);
      if(!c||!exposed(s,id))return result(false,'Card is covered.');
      if(!adjacent(c.rank,s.waste.at(-1).rank))return result(false,'Card must be one rank away; King wraps to Ace.');
      c.removed=true;
      s.waste.push(c);
      if(s.tableau.every(x=>x.removed)){
        s.over=true;
        s.status='All peaks cleared: you win.';
      }
      else checkEnd(s);
      return result(true);
    }

    function draw(s){
      if(s.over||!s.stock.length)return result(false,'Stock is empty.');
      s.waste.push(s.stock.pop());
      if(!s.tableau.some(x=>!x.removed&&exposed(s,x.id)&&adjacent(x.rank,s.waste.at(-1).rank))&&s.stock.length===0){
        checkEnd(s);
      }
      return result(true);
    }

    function status(s){
      if(s.tableau.every(x=>x.removed))return 'win';
      if(s.stock.length)return 'playing';
      return s.tableau.some(card=>!card.removed&&exposed(s,card.id)&&adjacent(card.rank,s.waste.at(-1).rank))?'playing':'blocked';
    }

    function checkEnd(s){
      if(status(s)==='blocked'){
        s.over=true;
        s.status='No legal card and stock empty: loss.';
      }
    }
    return{newGame,blocked,exposed,remove,draw,status,adjacent};
  }

  function accordionModel(){

    function newGame(rng=Math.random){
      return{piles:shuffle(makeDeck(),rng).map(c=>[{...c}]),over:false,status:'Move a whole pile one or three spaces left when top rank or suit matches.'};
    }

    function move(s,from,to){
      if(s.over||!Number.isInteger(from)||!Number.isInteger(to)||from<=0||from>=s.piles.length||(to!==from-1&&to!==from-3)||to<0)return result(false,'Move onto the immediately-left or third-left pile.');
      const source=s.piles[from],dest=s.piles[to];
      const a=source.at(-1),b=dest.at(-1);
      if(a.rank!==b.rank&&a.suit!==b.suit)return result(false,'Top cards must match rank or suit.');
      dest.push(...source);
      s.piles.splice(from,1);
      if(s.piles.length===1){
        s.over=true;
        s.status='One pile remains: you win.';
      }
      else if(!legalMoves(s).length){
        s.over=true;
        s.status=`No legal moves remain with ${s.piles.length} piles.`;
      }
      else s.status=`${s.piles.length} piles remain.`;
      return result(true);
    }

    function legalMoves(s){
      const moves=[];
      for(let i=1;i<s.piles.length;i++)for(const d of [1,3]){
        const to=i-d;
        if(to>=0){
          const a=s.piles[i].at(-1),b=s.piles[to].at(-1);
          if(a.rank===b.rank||a.suit===b.suit)moves.push([i,to]);
        }
      }
      return moves;
    }
    return{newGame,move,legalMoves};
  }

  function yukonModel(){

    function newGame(rng=Math.random){
      const deck=shuffle(makeDeck(),rng);
      let index=0;
      const columns=Array.from({length:7},(_,col)=>{
        const length=col===0?1:col+5;return Array.from({length},(_,i)=>({...deck[index++],faceUp:col<2||i>=col-1}));
      });
      return{columns,foundations:{C:[],D:[],H:[],S:[]},over:false,status:'Move any face-up tail; destination is opposite colour and one rank higher.',rng};
    }

    function move(s,from,index,to){
      if(s.over||!Number.isInteger(from)||!Number.isInteger(to)||!s.columns[from]||!s.columns[to]||from===to)return result(false,'Choose two different columns.');
      const source=s.columns[from],dest=s.columns[to],card=source[index];
      if(!card||!card.faceUp)return result(false,'A face-down card cannot move.');
      const moving=source.slice(index),top=dest.at(-1);
      if(top){
        if((RED.has(top.suit)===RED.has(card.suit))||top.rank!==card.rank+1)return result(false,'Place on opposite colour, one rank higher.');
      }
      else if(card.rank!==13)return result(false,'Only a King-led tail can enter an empty column.');
      dest.push(...moving);
      source.splice(index);
      if(source.length&&source.at(-1).faceUp===false)source.at(-1).faceUp=true;
      s.status='Move any face-up tail; destination is opposite colour and one rank higher.';
      return result(true);
    }

    function toFoundation(s,column,index){
      if(s.over)return result(false,'Game ended.');
      const c=s.columns[column]?.[index],pile=s.foundations[c?.suit],expected=pile?.length===0?14:(pile?.length||0)+1;
      if(!c||!c.faceUp||index!==s.columns[column].length-1||!pile||c.rank!==expected)return result(false,'Only a column top that extends its suit foundation may move.');
      s.columns[column].pop();
      pile.push(c);
      if(s.columns[column].length&&!s.columns[column].at(-1).faceUp)s.columns[column].at(-1).faceUp=true;
      if(s.columns.every(col=>!col.length)&&Object.values(s.foundations).every(p=>p.length===13)){
        s.over=true;
        s.status='All 52 cards are home: you win.';
      }
      return result(true);
    }
    return{newGame,move,toFoundation};
  }

  function yahtzeeModel(){
    const CATEGORIES=['ones','twos','threes','fours','fives','sixes','threeKind','fourKind','fullHouse','smallStraight','largeStraight','yahtzee','chance'];
    const freshCard=()=>Object.fromEntries(CATEGORIES.map(c=>[c,null]));

    function newGame(rng=Math.random){
      return{dice:[],held:[],rollsLeft:3,turn:0,scorecard:freshCard(),scores:[0,0],yahtzeeBonus:0,over:false,status:'Roll five dice; hold any dice between rolls.',rng};
    }

    function roll(s,keepIndices=[]){
      if(s.over||s.rollsLeft<=0)return result(false,'No rolls remain; choose a score category.');
      if(!Array.isArray(keepIndices)||new Set(keepIndices).size!==keepIndices.length||keepIndices.some(i=>!Number.isInteger(i)||i<0||i>=s.dice.length))return result(false,'Hold selection is invalid.');
      const held=keepIndices.map(i=>s.dice[i]);
      const n=5-held.length;
      const dice=held.concat(Array.from({length:n},()=>Math.floor((s.rng||Math.random)()*6)+1));
      s.dice=dice;
      s.held=held;
      s.rollsLeft--;
      s.status=`Roll ${3-s.rollsLeft} of 3. Choose a category when ready.`;
      return result(true);
    }
    const counts=d=>Array.from({length:7},(_,v)=>d.filter(x=>x===v).length);

    function scoreValue(s,cat){
      const d=s.dice;
      if(!d.length)return null;
      const count=counts(d),sum=d.reduce((a,b)=>a+b,0);
      if(cat==='chance')return sum;
      if(cat==='yahtzee')return count.some(n=>n===5)?50:0;
      if(cat==='threeKind')return count.some(n=>n>=3)?sum:0;
      if(cat==='fourKind')return count.some(n=>n>=4)?sum:0;
      if(cat==='fullHouse')return count.includes(3)&&count.includes(2)?25:0;
      if(cat==='smallStraight')return [[1,2,3,4],[2,3,4,5],[3,4,5,6]].some(run=>run.every(x=>count[x]>0))?30:0;
      if(cat==='largeStraight')return [[1,2,3,4,5],[2,3,4,5,6]].some(run=>run.every(x=>count[x]===1))?40:0;
      const faces={ones:1,twos:2,threes:3,fours:4,fives:5,sixes:6};
      const face=faces[cat];
      return face?count[face]*face:null;
    }

    function availableCategories(s){
      return CATEGORIES.filter(c=>s.scorecard[c]===null);
    }

    function score(s,cat){
      if(s.over||s.scorecard[cat]!==null||!CATEGORIES.includes(cat)||!s.dice.length)return result(false,'Choose an open category after rolling.');
      let value=scoreValue(s,cat);
      if(value===null)return result(false,'Invalid category.');
      const yahtzee=s.dice.every(x=>x===s.dice[0])&&s.dice.length===5;
      if(yahtzee&&s.scorecard.yahtzee===50){
        const upper=({1:'ones',2:'twos',3:'threes',4:'fours',5:'fives',6:'sixes'})[s.dice[0]];
        if(s.scorecard[upper]===null&&cat!==upper)return result(false,'Joker rule: fill the matching open upper box first.');
        s.yahtzeeBonus+=100;
        if(cat==='fullHouse')value=25;
        else if(cat==='smallStraight')value=30;
        else if(cat==='largeStraight')value=40;
      }
      s.scorecard[cat]=value;
      s.turn++;
      s.dice=[];
      s.held=[];
      s.rollsLeft=3;
      const upper=CATEGORIES.slice(0,6).reduce((sum,c)=>sum+(s.scorecard[c]||0),0);
      const lower=CATEGORIES.slice(6).reduce((sum,c)=>sum+(s.scorecard[c]||0),0);
      if(s.turn===13){
        s.scores[0]=upper+lower+s.yahtzeeBonus+(upper>=63?35:0);
        s.over=true;
        s.status=`Game complete: ${s.scores[0]} points${upper>=63?' (includes 35-point upper bonus)':''}.`;
      }
      else s.status=`Scored ${cat}: ${value}. Roll ${s.turn+1} of 13.`;
      return result(true);
    }

    function total(s){
      const upper=CATEGORIES.slice(0,6).reduce((sum,c)=>sum+(s.scorecard[c]||0),0);
      return upper+CATEGORIES.slice(6).reduce((sum,c)=>sum+(s.scorecard[c]||0),0)+s.yahtzeeBonus+(upper>=63?35:0);
    }
    return{newGame,roll,score,scoreValue,availableCategories,total,categories:CATEGORIES};
  }

  function farkleModel(){

    function newGame(rng=Math.random){
      return{players:[{score:0,entered:false},{score:0,entered:false}],turn:0,dice:[],turnPoints:0,selected:[],phase:'roll',over:false,winner:null,busts:0,status:'Roll six dice. Select scoring dice, then roll again or bank.',rng};
    }

    function dieScores(dice){
      const count=Array.from({length:7},(_,v)=>dice.filter(x=>x===v).length);
      const score=new Map();
      if(dice.length===6&&count.slice(1).every(n=>n===1))score.set('straight',1500);
      if(dice.length===6&&count.slice(1).filter(n=>n===2).length===3)score.set('three-pairs',1500);
      for(let face=1;face<=6;face++){
        const n=count[face];
        if(n>=3)score.set(String(face),face===1?1000:face*100);
        else if(face===1&&n)score.set('1',n*100);
        else if(face===5&&n)score.set('5',n*50);
      }
      return score;
    }

    function scoreSelection(dice,indices){
      if(!Array.isArray(indices)||!indices.length||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=dice.length))return null;
      const chosen=indices.map(i=>dice[i]),scores=dieScores(chosen);
      if(chosen.length===6&&scores.has('straight'))return 1500;
      if(chosen.length===6&&scores.has('three-pairs'))return 1500;
      const counts=Array.from({length:7},(_,v)=>chosen.filter(x=>x===v).length);
      let total=0,used=0;
      for(let v=1;v<=6;v++){
        if(counts[v]>=3){
          total+=(v===1?1000:v*100)*(counts[v]-2);
          used+=counts[v];
        }
        else if(v===1){
          total+=counts[v]*100;
          used+=counts[v];
        }
        else if(v===5){
          total+=counts[v]*50;
          used+=counts[v];
        }
      }
      return total&&used===chosen.length?total:null;
    }

    function select(s,indices){
      if(s.over||s.phase!=='select'||!s.dice.length)return result(false,'Roll before selecting dice.');
      const points=scoreSelection(s.dice,indices);
      if(!points)return result(false,'Selection has no scoring combination.');
      s.selected=indices.slice();
      s.turnPoints+=points;
      s.dice=s.dice.filter((_,i)=>!indices.includes(i));
      s.selected=[];
      if(!s.dice.length)s.hotDice=true;
      s.phase='roll';
      s.status=`Scored ${points}; turn total ${s.turnPoints}. Roll or bank.`;
      return result(true);
    }

    function roll(s,rng=s.rng||Math.random){
      if(s.over)return result(false,'Game ended.');
      if(s.phase!=='roll')return result(false,'Select scoring dice before rolling again.');
      const count=s.dice.length||6;
      s.dice=Array.from({length:count},()=>Math.floor(rng()*6)+1);
      if(!scoreSelection(s.dice,s.dice.map((_,i)=>i))){
        s.busts++;
        s.turnPoints=0;
        s.dice=[];
        s.turn=1-s.turn;
        s.hotDice=false;
        s.phase='roll';
        s.status=`Farkle! Turn points lost. Player ${s.turn+1} rolls.`;
        return result(true);
      }
      if(s.dice.length===6&&s.hotDice){
        s.hotDice=false;
      }
      s.phase='select';
      s.status='Select only scoring dice; then roll or bank.';
      return result(true);
    }

    function bank(s){
      if(s.over||s.phase!=='roll'||!s.turnPoints||s.dice.length&&s.selected.length)return result(false,'Select scoring dice and build a turn before banking.');
      const player=s.players[s.turn];
      if(!player.entered&&s.turnPoints<500)return result(false,'Opening bank requires 500 points.');
      player.entered=true;
      player.score+=s.turnPoints;
      const banked=s.turnPoints;
      s.turnPoints=0;
      s.dice=[];
      s.phase='roll';
      if(player.score>=10000){
        s.over=true;
        s.winner=s.turn;
        s.status=`Player ${s.turn+1} wins with ${player.score}.`;
      }
      else{
        s.turn=1-s.turn;
        s.status=`Banked ${banked}. Player ${s.turn+1} rolls.`;
      }
      return result(true);
    }

    function canSelect(s,indices){
      return !!scoreSelection(s.dice,indices);
    }
    return{newGame,dieScores,scoreSelection,select,roll,bank,canSelect};
  }

  function drawCard(ctx, card, x, y, width=66, height=92, selected=false, covered=false) {
    ctx.fillStyle=selected?'#fef08a':covered?'#64748b':'#fff';
    ctx.strokeStyle=selected?'#ca8a04':'#334155';
    ctx.lineWidth=selected?3:1.5;
    ctx.beginPath();
    ctx.roundRect(x,y,width,height,7);
    ctx.fill();
    ctx.stroke();
    if(card&&!covered){
      ctx.fillStyle=suitColor(card.suit);
      ctx.font='bold 18px Calibri, Inter, sans-serif';
      ctx.fillText(rankName(card.rank),x+7,y+24);
      ctx.font='bold 16px Calibri, Inter, sans-serif';
      ctx.fillText(card.suit,x+8,y+45);
      ctx.font='bold 24px Calibri, Inter, sans-serif';
      ctx.fillText(card.suit,x+width-25,y+height-9);
    }
    else {
      ctx.fillStyle='#e2e8f0';
      ctx.font='bold 18px Calibri, Inter, sans-serif';
      ctx.fillText('◆',x+width/2-8,y+height/2+6);
    }
  }

  function prepare(container,game,title,hint,height=700){
    const stage=window.NP_Fidelity.createStage(container,{...game,title},{width:960,height,hint});
    stage.ctx.lineCap='round';
    stage.ctx.lineJoin='round';
    return stage;
  }

  function background(ctx,title,subtitle,height=700){
    ctx.fillStyle='#0f172a';
    ctx.fillRect(0,0,960,height);
    ctx.fillStyle='#f8fafc';
    ctx.font='bold 25px Calibri, Inter, sans-serif';
    ctx.fillText(title,28,38);
    ctx.font='16px Calibri, Inter, sans-serif';
    ctx.fillStyle='#cbd5e1';
    ctx.fillText(subtitle,28,64);
  }

  function drawLabel(ctx,text,x,y,color='#e2e8f0',font='16px Calibri, Inter, sans-serif'){
    ctx.fillStyle=color;
    ctx.font=font;
    ctx.fillText(String(text),x,y);
  }

  function setStatus(stage,state){
    stage.status(state.status||'');
  }
  const drawSuitText=card=>`${rankName(card.rank)}${card.suit}`;

  function launchHearts(container,game){
    const m=window.NP_Fidelity.get('hearts-trick').model,s=m.newGame(),stage=prepare(container,game,'Hearts','Select three cards to pass; click a legal card to play. Follow suit.',700);
    let selected=[];
    const humanIndex=()=>s.players[0].length-1;

    function bots(){
      while(!s.over&&!s.awaitingNext&&s.passDone&&s.trick.length<4&&((s.trick.length?s.leader+s.trick.length:s.leader)%4)!==0){
        const p=(s.trick.length?s.leader+s.trick.length:s.leader)%4;
        m.botCard(s,p);
      }
    }

    function draw(ctx){
      background(ctx,'Hearts',`Hand ${s.handNo} · ${s.passDirection==='none'?'No pass':`pass ${s.passDirection}`} · trick ${Math.min(13,s.trickNo+1)}/13 · hearts ${s.heartsBroken?'broken':'not broken'}`);
      drawLabel(ctx,`Scores: ${s.cumulative.map((v,i)=>`P${i+1} ${v}`).join('   ')}`,28,94,'#fde68a','bold 17px Calibri, Inter, sans-serif');
      drawLabel(ctx,`Current hand points: ${s.handPoints.join(' · ')}`,28,120);
      drawLabel(ctx,'Table',28,160,'#fff','bold 18px Calibri, Inter, sans-serif');
      s.trick.forEach((item,i)=>{
        const x=375+i*78;drawCard(ctx,item.card,x,175,64,86,false,false);drawLabel(ctx,`P${item.player+1}`,x+7,278);
      });
      drawLabel(ctx,`Your hand (${s.players[0].length})`,28,345,'#fff','bold 17px Calibri, Inter, sans-serif');
      const hand=s.players[0],gap=Math.min(70,900/Math.max(1,hand.length));
      hand.forEach((c,i)=>drawCard(ctx,c,25+i*gap,365,62,86,selected.includes(i),false));
      drawLabel(ctx,'Recent tricks:',28,490,'#fff','bold 16px Calibri, Inter, sans-serif');
      s.trickHistory.slice(-4).forEach((t,i)=>drawLabel(ctx,`${s.trickHistory.length-4+i+1}. ${t.cards.map(x=>drawSuitText(x.card)).join('  ')} → P${t.winner+1} (+${t.points})`,28,518+i*27));
      drawLabel(ctx,s.status,28,660,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',event=>{
      const p=stage.point(event);const hand=s.players[0],gap=Math.min(70,900/Math.max(1,hand.length));if(p.y>=360&&p.y<=470){
        const i=Math.floor((p.x-25)/gap);if(i>=0&&i<hand.length){
          if(s.passDone){
            if(!s.over&&!s.awaitingNext&&((s.trick.length?s.leader+s.trick.length:s.leader)%4)===0){
              const r=m.play(s,0,i);if(r.ok)bots();
            }
          }
          else{
            selected=selected.includes(i)?selected.filter(x=>x!==i):selected.concat(i).slice(-3);if(selected.length===3)m.selectPass(s,selected);
          }
        }
      }
    });
    stage.button('Pass selected 3',()=>{
      if(m.selectPass(s,selected).ok){
        const r=m.pass(s);if(r.ok){
          selected=[];bots();
        }
      }
    });
    stage.button('Next hand',()=>{
      if(m.nextHand(s).ok){
        selected=[];bots();
      }
    });
    stage.button('Play selected legal card',()=>{
      if(s.passDone&&!s.over&&!s.awaitingNext){
        const p=(s.trick.length?s.leader+s.trick.length:s.leader)%4;if(p===0&&selected.length){
          const r=m.play(s,0,selected[0]);if(r.ok){
            selected=[];bots();
          }
        }
      }
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchSpades(container,game){
    const m=window.NP_Fidelity.get('spades-contract').model,s=m.newGame(),stage=prepare(container,game,'Spades','Bid 0–13 or nil, then play legal cards. Click a card to play.',700);
    let selected=-1;

    function bots(){
      while(!s.over&&!s.awaitingNext){
        if(s.bids.some(x=>x===null)){
          const p=s.bids.findIndex(x=>x===null);
          if(p===0)return;
          m.botBid(s,p);
          continue;
        }
        const p=(s.trick.length?s.leader+s.trick.length:s.leader)%4;
        if(p===0)return;
        m.botCard(s,p);
      }
    }

    function draw(ctx){
      background(ctx,'Spades · partnership',`Hand ${s.handNo} · bids ${s.bids.map(v=>v===null?'—':v===0?'nil':v).join(' / ')} · tricks ${s.tricks.join(' / ')} · spades ${s.spadesBroken?'broken':'not broken'}`);
      drawLabel(ctx,`Team 1 score ${s.teamScores[0]} · bags ${s.bags[0]}     Team 2 score ${s.teamScores[1]} · bags ${s.bags[1]}`,28,95,'#fde68a','bold 17px Calibri, Inter, sans-serif');
      s.trick.forEach((x,i)=>{
        const px=365+i*78;drawCard(ctx,x.card,px,155,64,86,false,false);drawLabel(ctx,`P${x.player+1}`,px+7,255);
      });
      drawLabel(ctx,'Your 13-card hand',28,320,'#fff','bold 17px Calibri, Inter, sans-serif');
      const gap=Math.min(70,900/Math.max(1,s.players[0].length));
      s.players[0].forEach((c,i)=>drawCard(ctx,c,25+i*gap,340,62,86,i===selected,false));
      drawLabel(ctx,s.status,28,500,'#93c5fd');
      drawLabel(ctx,'History: '+s.trickHistory.slice(-3).map(t=>`P${t.winner+1} won`).join(' · '),28,535);
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e),hand=s.players[0],gap=Math.min(70,900/Math.max(1,hand.length));if(p.y>=335&&p.y<435){
        const i=Math.floor((p.x-25)/gap);if(i>=0&&i<hand.length){
          selected=i;if(s.bids.every(x=>x!==null)&&!s.over&&!s.awaitingNext&&((s.trick.length?s.leader+s.trick.length:s.leader)%4)===0){
            const r=m.play(s,0,i);if(r.ok){
              selected=-1;bots();
            }
          }
        }
      }
    });
    const bidButtons=[];
    for(let bid=0;bid<=13;bid++){
      const value=bid;
      bidButtons.push(stage.button(value===0?'Bid nil':`Bid ${value}`,()=>{
        if(s.bids.findIndex(x=>x===null)===0){
          m.bid(s,0,value);bots();
        }
      }));
    }
    stage.button('Play selected card',()=>{
      if(selected>=0&&s.bids.every(x=>x!==null)){
        const p=(s.trick.length?s.leader+s.trick.length:s.leader)%4;if(p===0&&m.play(s,0,selected).ok){
          selected=-1;bots();
        }
      }
    });
    stage.button('Next hand',()=>{
      if(m.nextHand(s).ok){
        selected=-1;bots();
      }
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchCrazy(container,game){
    const m=window.NP_Fidelity.get('crazy-eights').model,s=m.newGame(),stage=prepare(container,game,'Crazy Eights','Click a playable card; an eight opens suit buttons. You may draw one card voluntarily, or draw until playable if stuck.',620);
    let selected=-1,chosen='';

    function bot(){
      if(s.turn===1&&!s.over){
        m.botTurn(s);
      }
    }

    function draw(ctx){
      background(ctx,'Crazy Eights',`Stock ${s.stock.length} · active suit ${SUIT_NAMES[s.activeSuit]} · top ${cardText(s.discard.at(-1))} · ${s.turn===0?'Your turn':'Bot turn'}`);
      drawCard(ctx,s.discard.at(-1),430,110,90,124,false,false);
      drawLabel(ctx,'Discard',425,255);
      drawLabel(ctx,`Bot: ${s.players[1].length} cards`,28,310);
      drawLabel(ctx,`Your hand (${s.players[0].length})`,28,350,'#fff','bold 17px Calibri, Inter, sans-serif');
      const gap=Math.min(88,900/Math.max(1,s.players[0].length));
      s.players[0].forEach((c,i)=>drawCard(ctx,c,24+i*gap,370,78,110,i===selected,false));
      drawLabel(ctx,s.status,28,525,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e),gap=Math.min(88,900/Math.max(1,s.players[0].length));if(p.y>=365&&p.y<500&&s.turn===0&&!s.over){
        const i=Math.floor((p.x-24)/gap);if(i>=0&&i<s.players[0].length){
          selected=i;const c=s.players[0][i];if(c.rank===8){
            if(chosen)m.play(s,0,i,chosen);else return;
          }
          else if(m.play(s,0,i).ok){
            selected=-1;bot();
          }
        }
      }
    });
    stage.button('Draw card / until playable',()=>{
      if(m.draw(s,0).ok&&s.turn===0)selected=-1;
    });
    for(const suit of SUITS)stage.button(`Choose ${SUIT_NAMES[suit]}`,()=>{
      chosen=suit;if(selected>=0&&s.players[0][selected]?.rank===8&&m.play(s,0,selected,suit).ok){
        selected=-1;chosen='';bot();
      }
    });
    stage.button('Play selected 8',()=>{
      if(selected>=0&&chosen&&m.play(s,0,selected,chosen).ok){
        selected=-1;chosen='';bot();
      }
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchGolf(container,game){
    const m=window.NP_Fidelity.get('golf-solitaire').model,s=m.newGame(),stage=prepare(container,game,'Golf Solitaire','Play exposed top cards one rank above/below the waste; Ace does not wrap.',640);

    function draw(ctx){
      background(ctx,'Golf Solitaire',`Stock ${s.stock.length} · Waste ${cardText(s.waste.at(-1))} · columns cleared ${s.columns.filter(c=>!c.length).length}/7`);
      drawCard(ctx,s.waste.at(-1),28,105,82,112,false,false);
      drawCard(ctx,s.stock.length?{rank:0,suit:'C'}:null,125,105,82,112,false,!!s.stock.length);
      drawLabel(ctx,'Waste',30,235);
      drawLabel(ctx,'Draw stock',127,235);
      s.columns.forEach((col,i)=>{
        drawLabel(ctx,`Column ${i+1} · ${col.length}`,32+i*130,300,'#e2e8f0','bold 15px Calibri, Inter, sans-serif');col.forEach((c,j)=>{
          const y=315+j*54;drawCard(ctx,c,32+i*130,y,76,96,j===col.length-1,false);
        });
      });
      drawLabel(ctx,s.status,28,650,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e);if(p.y>=100&&p.y<=220&&p.x>=120&&p.x<=215){
        m.draw(s);return;
      }
      if(p.y>=315){
        const col=Math.floor((p.x-32)/130),c=s.columns[col];if(c&&p.x>=32+col*130&&p.x<32+(col+1)*130){
          m.remove(s,col,c.length-1);
        }
      }
    });
    stage.button('Draw stock',()=>m.draw(s));
    stage.button('Restart deal',()=>Object.assign(s,m.newGame()));
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchPyramid(container,game){
    const m=window.NP_Fidelity.get('pyramid-solitaire').model,s=m.newGame(),stage=prepare(container,game,'Pyramid Solitaire','Select exposed cards totaling 13. Kings remove alone; one stock redeal is allowed.',650);
    let selected=null;

    function choose(id){
      if(s.over)return;
      if(selected===null){
        selected=id;
        return;
      }
      const a=selected,b=id;
      selected=null;
      if(a!=='waste'&&s.pyramid.find(c=>c.id===a)?.rank===13){
        m.removeKing(s,a);
        return;
      }
      if(b!=='waste'&&s.pyramid.find(c=>c.id===b)?.rank===13){
        m.removeKing(s,b);
        return;
      }
      m.removePair(s,a,b);
    }

    function draw(ctx){
      background(ctx,'Pyramid Solitaire',`Stock ${s.stock.length} · Waste ${s.waste.length?cardText(s.waste.at(-1)):'empty'} · Redeals ${s.redeals}/${s.maxRedeals}`);
      s.pyramid.filter(c=>!c.removed).forEach(c=>{
        const x=370+c.col*47-c.row*23,y=100+c.row*66;drawCard(ctx,c,x,y,62,82,selected===c.id,false);
      });
      drawLabel(ctx,'Stock',28,135);
      drawCard(ctx,s.stock.length?{rank:0,suit:'S'}:null,28,150,70,95,false,!!s.stock.length);
      drawLabel(ctx,'Waste',125,135);
      if(s.waste.length)drawCard(ctx,s.waste.at(-1),125,150,70,95,selected==='waste',false);
      drawLabel(ctx,s.status,28,625,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e);if(p.x>=120&&p.x<205&&p.y>=145&&p.y<255&&s.waste.length){
        choose('waste');return;
      }
      for(const c of [...s.pyramid].reverse()){
        const x=370+c.col*47-c.row*23,y=100+c.row*66;if(p.x>=x&&p.x<=x+62&&p.y>=y&&p.y<=y+82&&!c.removed){
          if(m.exposed(s,c.id))choose(c.id);return;
        }
      }
      if(p.x<105&&p.y>145&&p.y<255)m.draw(s);
    });
    stage.button('Draw stock',()=>m.draw(s));
    stage.button('Redeal once',()=>m.redeal(s));
    stage.button('Remove selected King',()=>{
      if(selected&&selected!=='waste'){
        m.removeKing(s,selected);selected=null;
      }
    });
    stage.button('Remove selected pair',()=>{
      if(selected!==null){
        m.removePair(s,selected,'waste');selected=null;
      }
    });
    stage.button('Restart deal',()=>{
      Object.assign(s,m.newGame());selected=null;
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchTripeaks(container,game){
    const m=window.NP_Fidelity.get('tripeaks-solitaire').model,s=m.newGame(),stage=prepare(container,game,'TriPeaks Solitaire','Remove exposed cards one rank up/down from waste; this variant wraps King↔Ace.',650);

    function draw(ctx){
      background(ctx,'TriPeaks Solitaire',`Stock ${s.stock.length} · Waste ${cardText(s.waste.at(-1))} · K↔A wrap enabled`);
      drawCard(ctx,s.waste.at(-1),28,118,78,108,false,false);
      drawLabel(ctx,'Waste',30,247);
      drawCard(ctx,s.stock.length?{rank:0,suit:'C'}:null,125,118,78,108,false,!!s.stock.length);
      drawLabel(ctx,'Stock',126,247);
      for(const c of s.tableau){
        if(c.removed)continue;
        const xs=[350,300,250,210][c.row],spacing=[105,95,78,68][c.row],x=xs+c.col*spacing,y=110+c.row*105;
        drawCard(ctx,c,x,y,64,84,false,false);
      }
      drawLabel(ctx,s.status,28,625,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e);if(p.x>120&&p.x<215&&p.y>110&&p.y<230){
        m.draw(s);return;
      }
      for(const c of [...s.tableau].reverse()){
        if(c.removed)continue;const xs=[350,300,250,210][c.row],spacing=[105,95,78,68][c.row],x=xs+c.col*spacing,y=110+c.row*105;if(p.x>=x&&p.x<x+64&&p.y>=y&&p.y<y+84){
          if(m.exposed(s,c.id))m.remove(s,c.id);return;
        }
      }
    });
    stage.button('Draw stock',()=>m.draw(s));
    stage.button('Restart deal',()=>Object.assign(s,m.newGame()));
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchAccordion(container,game){
    const m=window.NP_Fidelity.get('accordion-solitaire').model,s=m.newGame(),stage=prepare(container,game,'Accordion Solitaire','Select a pile, then a matching pile one or three places to its left.',760);
    let selected=-1;

    function draw(ctx){
      background(ctx,'Accordion Solitaire',`${s.piles.length} piles · move the entire source pile onto a matching top card`,760);
      s.piles.forEach((pile,i)=>{
        const col=i%12,row=Math.floor(i/12),x=22+col*78,y=100+row*130,top=pile.at(-1);drawCard(ctx,top,x,y,62,88,selected===i,false);drawLabel(ctx,`#${i+1} · ${pile.length}`,x,y+108,'#cbd5e1','13px Calibri, Inter, sans-serif');
      });
      drawLabel(ctx,s.status,28,744,'#93c5fd');
      setStatus(stage,s);
    }

    function activate(i){
      if(s.over)return;
      if(selected<0){
        selected=i;
        return;
      }
      if(i===selected){
        selected=-1;
        return;
      }
      if(m.move(s,selected,i).ok)selected=-1;
      else selected=i;
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e);if(p.y<100)return;const col=Math.floor((p.x-22)/78),row=Math.floor((p.y-100)/130),i=row*12+col;if(col>=0&&col<12&&row>=0&&row<5&&i<s.piles.length)activate(i);
    });
    stage.button('Move selected pile left 1',()=>{
      if(selected>0&&m.move(s,selected,selected-1).ok)selected=-1;
    });
    stage.button('Move selected pile left 3',()=>{
      if(selected>=3&&m.move(s,selected,selected-3).ok)selected=-1;
    });
    stage.button('Clear selection',()=>{
      selected=-1;
    });
    stage.button('Restart deal',()=>{
      Object.assign(s,m.newGame());selected=-1;
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchYukon(container,game){
    const m=window.NP_Fidelity.get('yukon-solitaire').model,s=m.newGame(),stage=prepare(container,game,'Yukon Solitaire','Move any face-up card with its full tail; opposite colour, one rank higher.',680);
    let selected=null;

    function draw(ctx){
      background(ctx,'Yukon Solitaire','All cards start in seven columns · no stock');
      drawLabel(ctx,Object.entries(s.foundations).map(([su,p])=>`${su}: ${p.length}`).join('     '),28,94,'#fde68a','bold 17px Calibri, Inter, sans-serif');
      s.columns.forEach((col,x)=>{
        drawLabel(ctx,`C${x+1}`,32+x*130,135);col.forEach((c,i)=>{
          const y=148+i*43;drawCard(ctx,c,28+x*130,y,88,70,selected?.from===x&&selected.index===i,!c.faceUp);
        });
      });
      drawLabel(ctx,s.status,28,670,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e);if(p.y<145)return;const col=Math.floor((p.x-28)/130);if(col<0||col>6)return;const row=Math.floor((p.y-148)/43),card=s.columns[col]?.[row];if(!card)return;if(!selected){
        if(card.faceUp)selected={from:col,index:row};return;
      }
      if(selected.from===col){
        selected={from:col,index:row};return;
      }
      if(m.move(s,selected.from,selected.index,col).ok)selected=null;
    });
    stage.button('Move selected to foundation',()=>{
      if(selected&&m.toFoundation(s,selected.from,selected.index).ok)selected=null;
    });
    stage.button('Clear selection',()=>{
      selected=null;
    });
    stage.button('Restart deal',()=>{
      Object.assign(s,m.newGame());selected=null;
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchYahtzee(container,game){
    const m=window.NP_Fidelity.get('yahtzee-dice').model,s=m.newGame(),stage=prepare(container,game,'Yahtzee','Hold dice by clicking them; roll up to three times, then fill one open score box.',630);
    let held=[];
    const labels={ones:'Ones',twos:'Twos',threes:'Threes',fours:'Fours',fives:'Fives',sixes:'Sixes',threeKind:'3 of a kind',fourKind:'4 of a kind',fullHouse:'Full house',smallStraight:'Small straight',largeStraight:'Large straight',yahtzee:'Yahtzee',chance:'Chance'};

    function draw(ctx){
      background(ctx,'Yahtzee',`Turn ${Math.min(13,s.turn+1)}/13 · rolls left ${s.rollsLeft} · total ${m.total(s)} · Yahtzee bonus ${s.yahtzeeBonus}`);
      drawLabel(ctx,'Dice (highlighted dice will be held)',28,125,'#fff','bold 17px Calibri, Inter, sans-serif');
      s.dice.forEach((d,i)=>{
        const x=28+i*112,y=150;
        ctx.fillStyle=held.includes(i)?'#fef08a':'#fff';
        ctx.strokeStyle='#475569';
        ctx.lineWidth=3;
        ctx.beginPath();
        ctx.roundRect(x,y,92,92,12);
        ctx.fill();
        ctx.stroke();
        drawLabel(ctx,d,x+37,y+58,'#0f172a','bold 34px Calibri, Inter, sans-serif');
      });
      drawLabel(ctx,'Scorecard (choose an open category)',28,290,'#fff','bold 17px Calibri, Inter, sans-serif');
      let y=322;
      for(let i=0;i<m.categories.length;i++){
        const cat=m.categories[i],score=s.scorecard[cat];
        drawLabel(ctx,`${labels[cat]}: ${score===null?'—':score}`,34+(i%3)*290,y+Math.floor(i/3)*40,score===null?'#e2e8f0':'#86efac','16px Calibri, Inter, sans-serif');
      }
      const upper=['ones','twos','threes','fours','fives','sixes'].reduce((a,c)=>a+(s.scorecard[c]||0),0);
      drawLabel(ctx,`Upper ${upper}/63 · bonus ${upper>=63?35:0} · total ${m.total(s)}`,28,520,'#fde68a');
      drawLabel(ctx,s.status,28,575,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e);if(p.y>=145&&p.y<=245&&s.dice.length){
        const i=Math.floor((p.x-28)/112);if(i>=0&&i<s.dice.length)held=held.includes(i)?held.filter(n=>n!==i):held.concat(i);
      }
    });
    stage.button('Roll / reroll held dice',()=>{
      if(m.roll(s,held).ok)held=held.map((_,i)=>i);
    });
    for(const cat of m.categories)stage.button(`${labels[cat]}`,()=>{
      if(m.score(s,cat).ok)held=[];
    });
    stage.button('Restart scorecard',()=>{
      Object.assign(s,m.newGame());held=[];
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  function launchFarkle(container,game){
    const m=window.NP_Fidelity.get('farkle-dice').model,s=m.newGame(),stage=prepare(container,game,'Farkle','Hot-seat for two: select scoring dice, score them, then roll or bank. Opening bank is 500.',620);
    let selected=[];
    let rollButton;

    function draw(ctx){
      if(rollButton)rollButton.disabled=s.over||s.phase!=='roll';
      background(ctx,'Farkle',`Player ${s.turn+1} · scores ${s.players[0].score} / ${s.players[1].score} · turn ${s.turnPoints} · target 10,000 · opening bank 500`);
      drawLabel(ctx,`Dice to roll ${s.dice.length||6} · busts ${s.busts} · ${s.hotDice?'HOT DICE — all six refreshed':''}`,28,120,'#fff','bold 17px Calibri, Inter, sans-serif');
      s.dice.forEach((d,i)=>{
        const x=28+i*105,y=155;
        ctx.fillStyle=selected.includes(i)?'#fef08a':'#fff';
        ctx.strokeStyle='#475569';
        ctx.lineWidth=3;
        ctx.beginPath();
        ctx.roundRect(x,y,84,84,10);
        ctx.fill();
        ctx.stroke();
        drawLabel(ctx,d,x+34,y+57,'#0f172a','bold 32px Calibri, Inter, sans-serif');
      });
      drawLabel(ctx,'Scoring dice only may be selected. 1=100 · 5=50 · triples: 1s=1000, others face×100.',28,290);
      drawLabel(ctx,'Four/five/six of a kind multiply triple score by 2/3/4; six-die straight or three pairs = 1500.',28,320);
      drawLabel(ctx,s.status,28,385,'#93c5fd');
      setStatus(stage,s);
    }
    stage.on('pointerdown',e=>{
      const p=stage.point(e);if(p.y>=150&&p.y<=250&&s.dice.length){
        const i=Math.floor((p.x-28)/105);if(i>=0&&i<s.dice.length)selected=selected.includes(i)?selected.filter(n=>n!==i):selected.concat(i);
      }
    });
    rollButton=stage.button('Roll dice',()=>{
      selected=[];m.roll(s);
    });
    rollButton.disabled=false;
    stage.button('Score selected dice',()=>{
      if(m.select(s,selected).ok)selected=[];
    });
    stage.button('Bank turn',()=>{
      if(m.bank(s).ok)selected=[];
    });
    stage.button('Restart game',()=>{
      Object.assign(s,m.newGame());selected=[];
    });
    stage.frame(()=>{
    },draw);
    return stage.session;
  }

  const games = [
    {
      id: 'hearts-trick', title: 'Hearts', category: 'Cards', model: heartsModel(),
      reference: { title: 'Bicycle — Hearts rules', url: 'https://bicyclecards.com/how-to-play/hearts' },
      players: '1–4', duration: '15 min', mechanic: 'Trick taking', badge: 'Mới', color: '#be123c', aliases: ['Hearts'], launch: launchHearts,
      coreMechanics: ['four-player 13-card deal', 'three-card pass rotation with no-pass hand', '2♣ lead and follow suit', 'hearts-breaking and first-trick point restrictions', 'heart and queen of spades scoring', 'shoot the moon and 100-point game']
    },
    {
      id: 'spades-contract', title: 'Spades', category: 'Cards', model: spadesModel(),
      reference: { title: 'Bicycle — Spades rules', url: 'https://bicyclecards.com/how-to-play/spades/' },
      players: '1–4', duration: '20 min', mechanic: 'Partnership tricks', badge: 'Mới', color: '#1e3a8a', aliases: ['Spades'], launch: launchSpades,
      coreMechanics: ['four-player partnership deal', '0–13 and nil bids', 'follow suit and broken-spade lead rule', 'trump trick comparison', 'contract, bags, nil, 500-point scoring']
    },
    {
      id: 'crazy-eights', title: 'Crazy Eights', category: 'Cards', model: crazyModel(),
      reference: { title: 'Bicycle — Crazy Eights rules', url: 'https://bicyclecards.com/how-to-play/crazy-eights' },
      players: '1–2', duration: '10 min', mechanic: 'Shedding', badge: 'Mới', color: '#7c3aed', aliases: ['Crazy Eights'], launch: launchCrazy,
      coreMechanics: ['seven-card hands', 'rank/suit match', 'eight wild with suit choice', 'draw until playable', 'recycle discard pile with top preserved', 'empty hand wins']
    },
    {
      id: 'golf-solitaire', title: 'Golf Solitaire', category: 'Cards', model: golfModel(),
      reference: { title: 'BieGames — Golf Solitaire rules', url: 'https://www.biegames.com/golf-solitaire/rules/' },
      players: '1', duration: '5 min', mechanic: 'Solitaire', badge: 'Mới', color: '#047857', aliases: ['Golf Solitaire'], launch: launchGolf,
      coreMechanics: ['seven columns of five', 'exposed tops only', 'rank difference one', 'no ace wrap', 'stock exhaustion loss']
    },
    {
      id: 'pyramid-solitaire', title: 'Pyramid Solitaire', category: 'Cards', model: pyramidModel(),
      reference: { title: 'BVS — Pyramid rules', url: 'https://www.bvssolitaire.com/rules/pyramid.htm' },
      players: '1', duration: '5 min', mechanic: 'Solitaire', badge: 'Mới', color: '#b45309', aliases: ['Pyramid Solitaire'], launch: launchPyramid,
      coreMechanics: ['28-card overlapping pyramid', 'exposed pair total 13', 'king removal', 'waste pairing', 'one explicit redeal', 'covered cards blocked']
    },
    {
      id: 'tripeaks-solitaire', title: 'TriPeaks Solitaire', category: 'Cards', model: tripeaksModel(),
      reference: { title: 'Nordic Card Games — TriPeaks', url: 'https://nordiccardgames.com/game/tripeaks' },
      players: '1', duration: '5 min', mechanic: 'Solitaire', badge: 'Mới', color: '#0e7490', aliases: ['TriPeaks'], launch: launchTripeaks,
      coreMechanics: ['28-card three-peak tableau', 'overlap blocking', 'adjacent ranks from waste', 'K-A wrap enabled', 'stock-exhaustion loss']
    },
    {
      id: 'accordion-solitaire', title: 'Accordion Solitaire', category: 'Cards', model: accordionModel(),
      reference: { title: 'Bicycle — Accordion rules', url: 'https://bicyclecards.com/how-to-play/accordion' },
      players: '1', duration: '10 min', mechanic: 'Solitaire', badge: 'Mới', color: '#475569', aliases: ['Accordion'], launch: launchAccordion,
      coreMechanics: ['52 face-up one-card piles', 'whole-pile moves', 'one or three left only', 'top rank or suit match', 'one pile wins']
    },
    {
      id: 'yukon-solitaire', title: 'Yukon Solitaire', category: 'Cards', model: yukonModel(),
      reference: { title: 'Nordic Card Games — Yukon', url: 'https://nordiccardgames.com/game/yukon' },
      players: '1', duration: '10 min', mechanic: 'Solitaire', badge: 'Mới', color: '#0369a1', aliases: ['Yukon'], launch: launchYukon,
      coreMechanics: ['52-card no-stock tableau', 'face-up tail movement', 'opposite-colour next-rank build', 'King-only empty columns', 'A-to-K suit foundations']
    },
    {
      id: 'yahtzee-dice', title: 'Yahtzee', category: 'Dice', model: yahtzeeModel(),
      reference: { title: 'Hasbro Yahtzee instructions', url: 'https://www.hasbro.com/common/instruct/yahtzee.pdf' },
      players: '1', duration: '15 min', mechanic: 'Dice scoring', badge: 'Mới', color: '#d97706', aliases: ['Yahtzee'], launch: launchYahtzee,
      coreMechanics: ['five dice and three rolls', 'hold selection', '13 exclusive categories', 'upper bonus at 63', 'Joker and extra-Yahtzee scoring']
    },
    {
      id: 'farkle-dice', title: 'Farkle', category: 'Dice', model: farkleModel(),
      reference: { title: 'PlayMonster Farkle rules', url: 'https://playmonster.com/wp-content/uploads/2018/06/Farkle-Rules.pdf' },
      players: '2', duration: '15 min', mechanic: 'Push your luck', badge: 'Mới', color: '#c2410c', aliases: ['Farkle'], launch: launchFarkle,
      coreMechanics: ['six dice', 'scoring combinations only', 'bust loses unbanked turn points', 'hot dice resets six', '500 opening bank', '10,000 target', 'two-player hotseat']
    }
  ];
  games.forEach(definition => {
    definition.newGame = true;
    definition.reference = { ...definition.reference, platform: 'Web rules reference' };
    definition.catalog = {
      id: definition.id,
      title: definition.title,
      tagline: definition.coreMechanics.slice(0, 2).join(' · '),
      category: definition.category,
      section: 'quick',
      players: definition.players,
      duration: definition.duration,
      mechanic: definition.mechanic,
      badge: definition.badge,
      color: definition.color,
      aliases: definition.aliases
    };
    window.NP_Fidelity.register(definition.id, definition);
  });
})();

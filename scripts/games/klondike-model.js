/* Deterministic, original Klondike rules model. No third-party code or assets. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_KlondikeModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SUITS = Object.freeze(['clubs', 'diamonds', 'hearts', 'spades']);
  const SUIT_MARKS = Object.freeze({ clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' });
  const RANK_MARKS = Object.freeze(['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

  function cardsInOrder() {
    return SUITS.flatMap(suit => Array.from({ length: 13 }, (_, index) => ({
      id: `${suit[0]}${index + 1}`, suit, rank: index + 1,
      color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black', faceUp: false
    })));
  }

  function hashSeed(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    const source = String(seed ?? Date.now());
    let hash = 2166136261;
    for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
    return hash || 1;
  }

  function makeRng(seed) {
    let state = hashSeed(seed);
    return () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function shuffledDeck(seed) {
    const deck = cardsInOrder();
    const rng = makeRng(seed);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.map(card => card.id);
  }

  function normalizeOrder(order) {
    const all = cardsInOrder();
    const byId = new Map(all.map(card => [card.id, card]));
    if (!Array.isArray(order) || order.length !== 52 || new Set(order).size !== 52 || order.some(id => !byId.has(id))) {
      throw new TypeError('A Klondike deal must contain each card ID exactly once.');
    }
    return order.map(id => ({ ...byId.get(id) }));
  }

  function cloneCard(card) { return { ...card }; }
  function clonePiles(piles) { return piles.map(pile => pile.map(cloneCard)); }
  function cloneFoundations(foundations) {
    return Object.fromEntries(SUITS.map(suit => [suit, foundations[suit].map(cloneCard)]));
  }

  function create(options = {}) {
    if (typeof options === 'number' || typeof options === 'string') options = { seed: options };
    const seed = options.seed ?? Date.now();
    const order = options.deckOrder ? [...options.deckOrder] : shuffledDeck(seed);
    const original = normalizeOrder(order).map(card => card.id);
    let deck = normalizeOrder(order);
    const tableaus = Array.from({ length: 7 }, () => []);
    for (let pile = 0; pile < 7; pile++) {
      for (let offset = 0; offset <= pile; offset++) {
        const card = deck.shift();
        card.faceUp = offset === pile;
        tableaus[pile].push(card);
      }
    }
    let stock = deck;
    let waste = [];
    let foundations = Object.fromEntries(SUITS.map(suit => [suit, []]));
    let recycleCount = 0;
    let moves = 0;
    let status = 'playing';
    let lastEvent = 'deal';
    const history = [];

    function snapshot() {
      return { tableaus: clonePiles(tableaus), stock: stock.map(cloneCard), waste: waste.map(cloneCard),
        foundations: cloneFoundations(foundations), recycleCount, moves, status, lastEvent };
    }
    function restore(state) {
      tableaus.splice(0, tableaus.length, ...clonePiles(state.tableaus));
      stock = state.stock.map(cloneCard);
      waste = state.waste.map(cloneCard);
      foundations = cloneFoundations(state.foundations);
      recycleCount = state.recycleCount;
      moves = state.moves;
      status = state.status;
      lastEvent = state.lastEvent;
    }

    function sourceCards(source) {
      if (!source || typeof source !== 'object') return null;
      if (source.zone === 'waste') return waste.length ? [waste[waste.length - 1]] : null;
      if (source.zone === 'foundation' && SUITS.includes(source.suit)) {
        const pile = foundations[source.suit];
        return pile.length ? [pile[pile.length - 1]] : null;
      }
      if (source.zone !== 'tableau' || !Number.isInteger(source.pile) || source.pile < 0 || source.pile > 6) return null;
      const pile = tableaus[source.pile];
      const index = source.index;
      if (!Number.isInteger(index) || index < 0 || index >= pile.length) return null;
      const run = pile.slice(index);
      if (!run.every(card => card.faceUp)) return null;
      for (let i = 1; i < run.length; i++) {
        if (run[i - 1].rank !== run[i].rank + 1 || run[i - 1].color === run[i].color) return null;
      }
      return run;
    }

    function canMove(source, target) {
      if (status !== 'playing') return false;
      const moving = sourceCards(source);
      if (!moving?.length || !target || typeof target !== 'object') return false;
      const first = moving[0];
      if (target.zone === 'tableau') {
        const destIndex = target.pile;
        if (!Number.isInteger(destIndex) || destIndex < 0 || destIndex > 6 || (source.zone === 'tableau' && source.pile === destIndex)) return false;
        const dest = tableaus[destIndex];
        const top = dest[dest.length - 1];
        return top ? top.rank === first.rank + 1 && top.color !== first.color : first.rank === 13;
      }
      if (target.zone === 'foundation' && SUITS.includes(target.suit) && moving.length === 1 && first.suit === target.suit) {
        const foundation = foundations[target.suit];
        return first.rank === foundation.length + 1;
      }
      return false;
    }

    function removeSource(source) {
      if (source.zone === 'waste') return [waste.pop()];
      if (source.zone === 'foundation') return [foundations[source.suit].pop()];
      const pile = tableaus[source.pile];
      const result = pile.splice(source.index);
      const newlyExposed = pile[pile.length - 1];
      if (newlyExposed && !newlyExposed.faceUp) newlyExposed.faceUp = true;
      return result;
    }

    function anyCardMove() {
      const sources = [];
      for (let pile = 0; pile < 7; pile++) {
        const cards = tableaus[pile];
        for (let index = 0; index < cards.length; index++) {
          if (cards[index].faceUp && sourceCards({ zone: 'tableau', pile, index })) sources.push({ zone: 'tableau', pile, index });
        }
      }
      for (const suit of SUITS) if (foundations[suit].length) sources.push({ zone: 'foundation', suit });
      if (waste.length) sources.push({ zone: 'waste' });
      for (const source of sources) {
        for (let pile = 0; pile < 7; pile++) if (canMove(source, { zone: 'tableau', pile })) return true;
        const moving = sourceCards(source);
        if (moving?.length === 1 && SUITS.some(suit => canMove(source, { zone: 'foundation', suit }))) return true;
      }
      return false;
    }

    function settle() {
      if (SUITS.every(suit => foundations[suit].length === 13)) {
        status = 'won';
        lastEvent = 'win';
      } else if (!anyCardMove() && !stock.length && (!waste.length || recycleCount >= 1)) {
        status = 'lost';
        lastEvent = 'no-moves';
      }
    }

    function view() {
      return {
        seed: String(seed), drawCount: 1, recycleLimit: 1, recyclesUsed: recycleCount,
        tableaus: clonePiles(tableaus), stockCount: stock.length, waste: waste.map(cloneCard),
        foundations: cloneFoundations(foundations), moves, status,
        outcome: status === 'lost' ? 'loss' : status,
        noCardMoves: !anyCardMove(),
        lastEvent, canUndo: history.length > 0,
        canDraw: status === 'playing' && stock.length > 0,
        canRecycle: status === 'playing' && stock.length === 0 && waste.length > 0 && recycleCount < 1,
        canRestart: true
      };
    }

    return Object.freeze({
      view,
      isMovable(source) { return status === 'playing' && Boolean(sourceCards(source)?.length); },
      canMove,
      draw() {
        if (status !== 'playing' || !stock.length) return false;
        history.push(snapshot());
        const card = stock.shift();
        card.faceUp = true;
        waste.push(card);
        moves++;
        lastEvent = 'draw';
        settle();
        return true;
      },
      recycle() {
        if (status !== 'playing' || stock.length || !waste.length || recycleCount >= 1) return false;
        history.push(snapshot());
        stock = waste.map(card => ({ ...card, faceUp: false }));
        waste = [];
        recycleCount++;
        moves++;
        lastEvent = 'recycle';
        settle();
        return true;
      },
      move(source, target) {
        if (!canMove(source, target)) return false;
        history.push(snapshot());
        const moving = removeSource(source);
        if (target.zone === 'foundation') foundations[target.suit].push(moving[0]);
        else tableaus[target.pile].push(...moving);
        moves++;
        lastEvent = target.zone === 'foundation' ? 'to-foundation' : 'to-tableau';
        settle();
        return true;
      },
      undo() {
        if (!history.length) return false;
        restore(history.pop());
        lastEvent = 'undo';
        return true;
      },
      restart() {
        deck = normalizeOrder(original);
        for (const pile of tableaus) pile.length = 0;
        for (let pile = 0; pile < 7; pile++) {
          for (let offset = 0; offset <= pile; offset++) {
            const card = deck.shift();
            card.faceUp = offset === pile;
            tableaus[pile].push(card);
          }
        }
        stock = deck;
        waste = [];
        foundations = Object.fromEntries(SUITS.map(suit => [suit, []]));
        recycleCount = 0;
        moves = 0;
        status = 'playing';
        lastEvent = 'restart';
        history.length = 0;
        return true;
      }
    });
  }

  return Object.freeze({ SUITS, SUIT_MARKS, RANK_MARKS, cardsInOrder, shuffledDeck, create });
});

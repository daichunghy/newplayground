/* Deterministic FreeCell rules model. All card/game code in this candidate is original. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_FreeCellModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SUITS = Object.freeze(['clubs', 'diamonds', 'hearts', 'spades']);
  const SUIT_MARKS = Object.freeze({ clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' });
  const SUIT_NAMES = Object.freeze({ clubs: 'Tép', diamonds: 'Rô', hearts: 'Cơ', spades: 'Bích' });
  const RANK_MARKS = Object.freeze(['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

  function cardsInOrder() {
    return SUITS.flatMap(suit => Array.from({ length: 13 }, (_, index) => ({
      id: `${suit[0]}${index + 1}`, suit, rank: index + 1,
      color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black', faceUp: true
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
    const byId = new Map(cardsInOrder().map(card => [card.id, card]));
    if (!Array.isArray(order) || order.length !== 52 || new Set(order).size !== 52 || order.some(id => !byId.has(id))) {
      throw new TypeError('A FreeCell deal must contain each card ID exactly once.');
    }
    return order.map(id => ({ ...byId.get(id) }));
  }

  const clonePiles = piles => piles.map(pile => pile.map(card => card && ({ ...card })));
  const cloneCells = cells => cells.map(card => card && ({ ...card }));
  const cloneFoundations = piles => Object.fromEntries(SUITS.map(suit => [suit, piles[suit].map(card => ({ ...card }))]));

  function isRun(run) {
    if (!run?.length) return false;
    for (let i = 1; i < run.length; i++) {
      if (run[i - 1].rank !== run[i].rank + 1 || run[i - 1].color === run[i].color) return false;
    }
    return true;
  }

  function create(options = {}) {
    if (typeof options === 'number' || typeof options === 'string') options = { seed: options };
    const seed = options.seed ?? Date.now();
    const originalOrder = options.deckOrder ? [...options.deckOrder] : shuffledDeck(seed);
    const original = normalizeOrder(originalOrder).map(card => card.id);
    let tableaus;
    let freeCells;
    let foundations;
    let moves = 0;
    let status = 'playing';
    let lastEvent = 'deal';
    const history = [];

    function deal() {
      const deck = normalizeOrder(original);
      tableaus = Array.from({ length: 8 }, () => []);
      deck.forEach((card, index) => tableaus[index % 8].push(card));
      freeCells = Array(4).fill(null);
      foundations = Object.fromEntries(SUITS.map(suit => [suit, []]));
      moves = 0;
      status = 'playing';
      lastEvent = 'deal';
      history.length = 0;
    }

    deal();

    function snapshot() {
      return { tableaus: clonePiles(tableaus), freeCells: cloneCells(freeCells), foundations: cloneFoundations(foundations), moves, status, lastEvent };
    }
    function restore(state) {
      tableaus = clonePiles(state.tableaus);
      freeCells = cloneCells(state.freeCells);
      foundations = cloneFoundations(state.foundations);
      moves = state.moves;
      status = state.status;
      lastEvent = state.lastEvent;
    }

    function sourceCards(source) {
      if (!source || typeof source !== 'object') return null;
      if (source.zone === 'cell') {
        return Number.isInteger(source.cell) && source.cell >= 0 && source.cell < 4 && freeCells[source.cell]
          ? [freeCells[source.cell]] : null;
      }
      if (source.zone !== 'tableau' || !Number.isInteger(source.pile) || source.pile < 0 || source.pile >= 8) return null;
      const pile = tableaus[source.pile];
      const index = source.index;
      if (!Number.isInteger(index) || index < 0 || index >= pile.length) return null;
      const run = pile.slice(index);
      return isRun(run) ? run : null;
    }

    function sequenceCapacity(target) {
      const emptyCells = freeCells.filter(card => !card).length;
      const targetIsEmpty = tableaus[target.pile].length === 0;
      const emptyColumns = tableaus.filter(pile => pile.length === 0).length - (targetIsEmpty ? 1 : 0);
      return (emptyCells + 1) * (2 ** Math.max(0, emptyColumns));
    }

    function canMove(source, target) {
      if (status !== 'playing') return false;
      const moving = sourceCards(source);
      if (!moving?.length || !target || typeof target !== 'object') return false;
      const first = moving[0];

      if (target.zone === 'cell') {
        return source.zone === 'tableau' && moving.length === 1 && source.index === tableaus[source.pile].length - 1
          && Number.isInteger(target.cell) && target.cell >= 0 && target.cell < 4 && !freeCells[target.cell];
      }
      if (target.zone === 'tableau') {
        const destIndex = target.pile;
        if (!Number.isInteger(destIndex) || destIndex < 0 || destIndex >= 8 || (source.zone === 'tableau' && source.pile === destIndex)) return false;
        const dest = tableaus[destIndex];
        const top = dest[dest.length - 1];
        if (top && (top.rank !== first.rank + 1 || top.color === first.color)) return false;
        return moving.length <= sequenceCapacity({ pile: destIndex });
      }
      if (target.zone === 'foundation' && SUITS.includes(target.suit) && moving.length === 1) {
        return first.suit === target.suit && first.rank === foundations[target.suit].length + 1;
      }
      return false;
    }

    function removeSource(source) {
      if (source.zone === 'cell') {
        const card = freeCells[source.cell];
        freeCells[source.cell] = null;
        return [card];
      }
      return tableaus[source.pile].splice(source.index);
    }

    function anyMove() {
      const sources = [];
      for (let pile = 0; pile < 8; pile++) {
        for (let index = 0; index < tableaus[pile].length; index++) sources.push({ zone: 'tableau', pile, index });
      }
      for (let cell = 0; cell < 4; cell++) if (freeCells[cell]) sources.push({ zone: 'cell', cell });
      for (const source of sources) {
        for (let pile = 0; pile < 8; pile++) if (canMove(source, { zone: 'tableau', pile })) return true;
        if (source.zone === 'tableau' && source.index === tableaus[source.pile].length - 1) {
          for (let cell = 0; cell < 4; cell++) if (canMove(source, { zone: 'cell', cell })) return true;
        }
        for (const suit of SUITS) if (canMove(source, { zone: 'foundation', suit })) return true;
      }
      return false;
    }

    function settle() {
      if (SUITS.every(suit => foundations[suit].length === 13)) {
        status = 'won';
        lastEvent = 'win';
      } else if (!anyMove()) {
        status = 'stuck';
        lastEvent = 'stuck';
      }
    }

    function view() {
      const cardsInFoundations = SUITS.reduce((sum, suit) => sum + foundations[suit].length, 0);
      return {
        seed: String(seed), tableaus: clonePiles(tableaus), freeCells: cloneCells(freeCells),
        foundations: cloneFoundations(foundations), cardsInFoundations, moves, status,
        lastEvent, canUndo: history.length > 0, canRestart: true, hasLegalMove: anyMove()
      };
    }

    return Object.freeze({
      view,
      isMovable(source) { return status === 'playing' && Boolean(sourceCards(source)); },
      canMove,
      move(source, target) {
        if (!canMove(source, target)) return false;
        history.push(snapshot());
        const moving = removeSource(source);
        if (target.zone === 'tableau') tableaus[target.pile].push(...moving);
        else if (target.zone === 'cell') freeCells[target.cell] = moving[0];
        else foundations[target.suit].push(moving[0]);
        moves++;
        lastEvent = moving.length > 1 ? 'supermove' : target.zone === 'foundation' ? 'to-foundation' : target.zone === 'cell' ? 'to-cell' : 'to-tableau';
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
        deal();
        lastEvent = 'restart';
        return true;
      }
    });
  }

  return Object.freeze({ SUITS, SUIT_MARKS, SUIT_NAMES, RANK_MARKS, cardsInOrder, shuffledDeck, create });
});

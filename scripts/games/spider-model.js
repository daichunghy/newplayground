/* Original, deterministic one-suit Spider rules model. No third-party code or assets. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_SpiderModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SUITS = Object.freeze(['spades']);
  const SUIT_MARKS = Object.freeze({ spades: '♠' });
  const SUIT_NAMES = Object.freeze({ spades: 'Bích' });
  const RANK_MARKS = Object.freeze(['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
  const RUN_LENGTH = 13;
  const COLUMN_COUNT = 10;
  const DECK_COUNT = 2;

  function cardsInOrder() {
    return Array.from({ length: DECK_COUNT }, (_, deck) =>
      Array.from({ length: 4 }, (_, packSuit) =>
        Array.from({ length: RUN_LENGTH }, (_, index) => ({
          id: `d${deck + 1}-p${packSuit + 1}-s${index + 1}`, deck: deck + 1, suit: 'spades', rank: index + 1,
          color: 'black', faceUp: false
        }))
      ).flat()
    ).flat();
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
    if (!Array.isArray(order) || order.length !== 104 || new Set(order).size !== 104 || order.some(id => !byId.has(id))) {
      throw new TypeError('A Spider deal must contain each of its 104 card IDs exactly once.');
    }
    return order.map(id => ({ ...byId.get(id) }));
  }

  const cloneCard = card => ({ ...card });
  const clonePiles = piles => piles.map(pile => pile.map(cloneCard));

  function isMovableRun(run) {
    if (!run?.length || run.some(card => !card?.faceUp)) return false;
    for (let i = 1; i < run.length; i++) {
      if (run[i - 1].rank !== run[i].rank + 1 || run[i - 1].suit !== run[i].suit) return false;
    }
    return true;
  }

  function completedRunAt(pile) {
    if (!Array.isArray(pile) || pile.length < RUN_LENGTH) return false;
    const run = pile.slice(-RUN_LENGTH);
    return run.every((card, index) => card.faceUp && card.suit === 'spades' && card.rank === RUN_LENGTH - index);
  }

  function findCompletedRuns(tableaus) {
    if (!Array.isArray(tableaus)) return [];
    const found = [];
    tableaus.forEach((pile, pileIndex) => {
      let remaining = pile.length;
      while (remaining >= RUN_LENGTH && completedRunAt(pile.slice(0, remaining))) {
        found.push({ pile: pileIndex, start: remaining - RUN_LENGTH });
        remaining -= RUN_LENGTH;
      }
    });
    return found;
  }

  function sweepCompletedRuns(tableaus) {
    const removed = [];
    for (const run of findCompletedRuns(tableaus)) {
      removed.push({ pile: run.pile, cards: tableaus[run.pile].splice(run.start, RUN_LENGTH) });
    }
    return removed;
  }

  function canDealStock(tableaus, stockCount) {
    return Number.isInteger(stockCount) && stockCount >= COLUMN_COUNT && Array.isArray(tableaus)
      && tableaus.length === COLUMN_COUNT && tableaus.every(pile => Array.isArray(pile) && pile.length > 0);
  }

  function resolveOutcome(completedRunCount, stockCount, hasLegalMove) {
    if (completedRunCount >= 8) return 'won';
    if (stockCount === 0 && !hasLegalMove) return 'stuck';
    return 'playing';
  }

  function create(options = {}) {
    if (typeof options === 'number' || typeof options === 'string') options = { seed: options };
    const seed = options.seed ?? Date.now();
    const originalOrder = options.deckOrder ? [...options.deckOrder] : shuffledDeck(seed);
    const original = normalizeOrder(originalOrder).map(card => card.id);
    let tableaus;
    let stock;
    let completedRuns = [];
    let moves = 0;
    let status = 'playing';
    let lastEvent = 'deal';
    const history = [];

    function deal() {
      const deck = normalizeOrder(original);
      tableaus = Array.from({ length: COLUMN_COUNT }, () => []);
      let cursor = 0;
      for (let pileIndex = 0; pileIndex < COLUMN_COUNT; pileIndex++) {
        const count = pileIndex < 4 ? 6 : 5;
        for (let offset = 0; offset < count; offset++) {
          const card = deck[cursor++];
          card.faceUp = offset === count - 1;
          tableaus[pileIndex].push(card);
        }
      }
      stock = deck.slice(cursor);
      completedRuns = [];
      moves = 0;
      status = 'playing';
      lastEvent = 'deal';
      history.length = 0;
    }

    deal();

    function snapshot() {
      return { tableaus: clonePiles(tableaus), stock: stock.map(cloneCard), completedRuns: completedRuns.map(run => ({ ...run })), moves, status, lastEvent };
    }
    function restore(state) {
      tableaus = clonePiles(state.tableaus);
      stock = state.stock.map(cloneCard);
      completedRuns = state.completedRuns.map(run => ({ ...run }));
      moves = state.moves;
      status = state.status;
      lastEvent = state.lastEvent;
    }
    function sourceRun(source) {
      if (!source || source.zone !== 'tableau' || !Number.isInteger(source.pile) || source.pile < 0 || source.pile >= COLUMN_COUNT) return null;
      const pile = tableaus[source.pile];
      if (!Number.isInteger(source.index) || source.index < 0 || source.index >= pile.length) return null;
      const run = pile.slice(source.index);
      return isMovableRun(run) ? run : null;
    }
    function canMove(source, target) {
      if (status !== 'playing') return false;
      const moving = sourceRun(source);
      if (!moving?.length || !target || target.zone !== 'tableau' || !Number.isInteger(target.pile)
        || target.pile < 0 || target.pile >= COLUMN_COUNT || target.pile === source.pile) return false;
      const destination = tableaus[target.pile];
      const top = destination[destination.length - 1];
      return !top || top.rank === moving[0].rank + 1;
    }
    function anyMove() {
      for (let from = 0; from < COLUMN_COUNT; from++) {
        for (let index = 0; index < tableaus[from].length; index++) {
          if (!sourceRun({ zone: 'tableau', pile: from, index })) continue;
          for (let to = 0; to < COLUMN_COUNT; to++) if (canMove({ zone: 'tableau', pile: from, index }, { zone: 'tableau', pile: to })) return true;
        }
      }
      return false;
    }
    function removeCompletedRuns() {
      const removed = sweepCompletedRuns(tableaus);
      completedRuns.push(...removed.map(run => ({ pile: run.pile, move: moves })));
      return removed.length;
    }
    function settle() {
      const nextStatus = resolveOutcome(completedRuns.length, stock.length, anyMove());
      if (nextStatus === 'won') {
        status = 'won';
        lastEvent = 'win';
      } else if (nextStatus === 'stuck') {
        status = 'stuck';
        lastEvent = 'stuck';
      }
    }
    function view() {
      return {
        seed: String(seed), suitCount: 1, tableaus: clonePiles(tableaus), stockCount: stock.length,
        completedRuns: completedRuns.length, moves, status, lastEvent,
        canUndo: history.length > 0, canRestart: true,
        canDeal: status === 'playing' && canDealStock(tableaus, stock.length),
        hasLegalMove: anyMove()
      };
    }

    return Object.freeze({
      view,
      isMovable(source) { return status === 'playing' && Boolean(sourceRun(source)); },
      canMove,
      move(source, target) {
        if (!canMove(source, target)) return false;
        history.push(snapshot());
        const moving = tableaus[source.pile].splice(source.index);
        const newlyExposed = tableaus[source.pile].at(-1);
        if (newlyExposed && !newlyExposed.faceUp) newlyExposed.faceUp = true;
        tableaus[target.pile].push(...moving);
        moves++;
        const removed = removeCompletedRuns();
        lastEvent = removed ? 'run-completed' : 'move';
        settle();
        return true;
      },
      dealStock() {
        if (status !== 'playing' || !canDealStock(tableaus, stock.length)) return false;
        history.push(snapshot());
        for (let pileIndex = 0; pileIndex < COLUMN_COUNT; pileIndex++) {
          const card = stock.shift();
          card.faceUp = true;
          tableaus[pileIndex].push(card);
        }
        moves++;
        const removed = removeCompletedRuns();
        lastEvent = removed ? 'run-completed' : 'stock-deal';
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

  return Object.freeze({ SUITS, SUIT_MARKS, SUIT_NAMES, RANK_MARKS, RUN_LENGTH, COLUMN_COUNT, cardsInOrder, shuffledDeck, completedRunAt, findCompletedRuns, removeCompletedRuns: sweepCompletedRuns, canDealStock, resolveOutcome, create });
});

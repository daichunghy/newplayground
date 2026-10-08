const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/spider-model.js');

function createDeckOrder(finalPiles) {
  const lengths = Array.from({ length: 10 }, (_, pile) => pile < 4 ? 6 : 5);
  const order = [];
  for (let pile = 0; pile < 10; pile++) order.push(...finalPiles[pile].slice(0, lengths[pile]));
  for (let row = 0; row < 5; row++) {
    for (let pile = 0; pile < 10; pile++) order.push(finalPiles[pile][lengths[pile] + row]);
  }
  return order;
}

function allUpFixtureOrder() {
  const cards = M.cardsInOrder();
  const byRank = new Map();
  for (const card of cards) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank).push(card.id);
  }
  const take = rank => byRank.get(rank).shift();
  const takeAny = () => {
    for (let rank = 1; rank <= 13; rank++) if (byRank.get(rank).length) return byRank.get(rank).shift();
    throw new Error('No cards remain');
  };
  const piles = Array.from({ length: 10 }, () => []);
  piles[0] = [...Array.from({ length: 6 }, takeAny), take(5), take(4), take(3), take(2), take(1)];
  const six = take(6);
  piles[1] = [...Array.from({ length: 10 }, takeAny), six];
  for (let pile = 2; pile < 10; pile++) {
    const count = pile < 4 ? 11 : 10;
    while (piles[pile].length < count) piles[pile].push(takeAny());
  }
  return createDeckOrder(piles);
}

function singleRunOrder() {
  const byRank = new Map();
  for (const card of M.cardsInOrder()) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank).push(card.id);
  }
  const take = rank => byRank.get(rank).shift();
  const takeAny = () => {
    for (let rank = 1; rank <= 13; rank++) if (byRank.get(rank).length) return byRank.get(rank).shift();
    throw new Error('No cards remain');
  };
  const targetRun = Array.from({ length: 6 }, (_, index) => take(13 - index));
  const sourceTops = Array.from({ length: 7 }, (_, index) => take(7 - index));
  const piles = Array.from({ length: 10 }, (_, pile) => {
    const count = pile < 4 ? 11 : 10;
    if (pile === 0) return [...Array.from({ length: count - targetRun.length }, takeAny), ...targetRun];
    if (pile < 8) return [...Array.from({ length: count - 1 }, takeAny), sourceTops[pile - 1]];
    return Array.from({ length: count }, takeAny);
  });
  return createDeckOrder(piles);
}

function openingRevealHintOrder() {
  const cards = M.cardsInOrder();
  const rankFive = cards.find(card => card.rank === 5).id;
  const rankSix = cards.find(card => card.rank === 6).id;
  const rest = M.shuffledDeck(77).filter(id => id !== rankFive && id !== rankSix);
  const order = Array(104);
  order[5] = rankFive;
  order[11] = rankSix;
  for (let index = 0, cursor = 0; index < order.length; index++) if (!order[index]) order[index] = rest[cursor++];
  return order;
}

test('seeded one-suit deal repeats exactly and uses two decks, ten columns and five stock rows', () => {
  const first = M.create({ seed: 'spider-seed' }).view();
  const again = M.create({ seed: 'spider-seed' }).view();
  assert.deepEqual(first, again);
  assert.equal(M.SUITS.length, 1);
  assert.deepEqual(first.tableaus.map(pile => pile.length), [6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
  assert.equal(first.tableaus.flat().length, 54);
  assert.equal(first.tableaus.flat().filter(card => card.faceUp).length, 10);
  assert.equal(first.stockCount, 50);
  assert.equal(first.completedRuns, 0);
  const all = M.cardsInOrder();
  assert.equal(all.length, 104);
  assert.equal(new Set(all.map(card => card.id)).size, 104);
  assert.deepEqual([...new Set(all.map(card => card.suit))], ['spades']);
  assert.equal(new Set(all.map(card => card.rank)).size, 13);
  for (let rank = 1; rank <= 13; rank++) assert.equal(all.filter(card => card.rank === rank).length, 8);
});

test('same-suit descending groups move together; wrong rank, covered card, and self-moves are rejected', () => {
  const game = M.create({ seed: 14, deckOrder: allUpFixtureOrder() });
  for (let i = 0; i < 5; i++) assert.equal(game.dealStock(), true);
  const before = game.view();
  const run = { zone: 'tableau', pile: 0, index: 6 };
  assert.equal(game.canMove(run, { zone: 'tableau', pile: 1 }), true, '5-4-3-2-A can move onto a 6');
  const wrongTarget = before.tableaus.findIndex((pile, index) => index !== 0 && pile.at(-1).rank !== 6);
  assert.notEqual(wrongTarget, -1);
  assert.equal(game.canMove(run, { zone: 'tableau', pile: wrongTarget }), false, 'the destination must be exactly one rank higher');
  assert.equal(game.canMove({ zone: 'tableau', pile: 0, index: 7 }, { zone: 'tableau', pile: 1 }), false, 'a broken suffix cannot move as a run');
  assert.equal(game.canMove({ zone: 'tableau', pile: 0, index: 6 }, { zone: 'tableau', pile: 0 }), false);
  assert.equal(game.move(run, { zone: 'tableau', pile: 1 }), true);
  assert.deepEqual(game.view().tableaus[1].slice(-6).map(card => card.rank), [6, 5, 4, 3, 2, 1]);
  assert.equal(game.view().tableaus[0].length, 6);
  assert.equal(game.view().tableaus[0].at(-1).faceUp, true);
  assert.equal(game.view().moves, 6);

  const hidden = M.create({ seed: 99 });
  const faceDown = hidden.view().tableaus[1][0];
  assert.equal(faceDown.faceUp, false);
  assert.equal(hidden.isMovable({ zone: 'tableau', pile: 1, index: 0 }), false);
  assert.equal(hidden.move({ zone: 'tableau', pile: 1, index: 0 }, { zone: 'tableau', pile: 0 }), false);
  assert.equal(before.stockCount, 0);
});

test('stock deals ten face-up cards and is blocked while any tableau column is empty', () => {
  const game = M.create({ seed: 2 });
  assert.equal(game.view().canDeal, true);
  const withGap = game.view().tableaus;
  withGap[4] = [];
  assert.equal(M.canDealStock(withGap, 50), false, 'a stock row cannot cover a gap in the tableau');
  assert.equal(M.canDealStock(game.view().tableaus, 0), false, 'the stock needs a full row of ten cards');
  assert.equal(game.dealStock(), true);
  assert.equal(game.view().stockCount, 40);
  assert.equal(game.view().tableaus.every(pile => pile.at(-1).faceUp), true);
  for (let i = 0; i < 4; i++) assert.equal(game.dealStock(), true);
  assert.equal(game.view().stockCount, 0);
  assert.equal(game.view().canDeal, false);
  assert.equal(game.dealStock(), false);
  assert.equal(game.view().tableaus.flat().length + game.view().completedRuns * 13, 104);
});

test('hint prefers a legal move that exposes a face-down card without mutating the deal', () => {
  const game = M.create({ seed: 77, deckOrder: openingRevealHintOrder() });
  const before = game.view();
  const hint = game.findHint();
  assert.equal(hint.kind, 'move');
  assert.equal(hint.revealsCard, true);
  assert.equal(game.canMove(hint.source, hint.target), true);
  assert.equal(before.tableaus[hint.source.pile][hint.source.index - 1].faceUp, false);
  assert.deepEqual(game.view(), before, 'looking at a hint does not spend a move or alter the board');
});

test('hint suggests the stock when no tableau move is available', () => {
  const game = M.create({ seed: 97 });
  assert.equal(game.view().hasLegalMove, false);
  assert.deepEqual(game.findHint(), { kind: 'deal' });
  assert.equal(game.view().stockCount, 50);
});

test('hint is unavailable after a terminal stuck position', () => {
  const game = M.create({ seed: 526 });
  for (let row = 0; row < 5; row++) assert.equal(game.dealStock(), true);
  assert.equal(game.view().status, 'stuck');
  assert.equal(game.findHint(), null);
});

test('a completed run auto-removes and undo or restart restores the position', () => {
  const game = M.create({ seed: 'one-run', deckOrder: singleRunOrder() });
  for (let i = 0; i < 5; i++) assert.equal(game.dealStock(), true);
  assert.equal(game.view().stockCount, 0);
  assert.deepEqual(game.view().tableaus.map(pile => pile.length), [11, 11, 11, 11, 10, 10, 10, 10, 10, 10]);
  for (let rank = 7; rank >= 1; rank--) {
    const view = game.view();
    const sourcePile = view.tableaus.findIndex((pile, pileIndex) => pileIndex > 0 && pile.at(-1)?.rank === rank);
    assert.notEqual(sourcePile, -1, `rank ${rank} is exposed`);
    const source = { zone: 'tableau', pile: sourcePile, index: view.tableaus[sourcePile].length - 1 };
    const destination = { zone: 'tableau', pile: 0 };
    assert.equal(game.canMove(source, destination), true);
    assert.equal(game.move(source, destination), true);
  }
  assert.equal(game.view().completedRuns, 1);
  assert.equal(game.view().tableaus[0].length, 5);
  assert.equal(game.view().lastEvent, 'run-completed');
  assert.equal(game.undo(), true);
  assert.equal(game.view().completedRuns, 0);
  assert.equal(game.view().tableaus[0].length, 17);
  game.restart();
  assert.equal(game.view().stockCount, 50);
  assert.equal(game.view().completedRuns, 0);
  assert.equal(game.view().moves, 0);
  assert.deepEqual(game.view().tableaus.map(pile => pile.map(card => card.id)), M.create({ seed: 'one-run', deckOrder: singleRunOrder() }).view().tableaus.map(pile => pile.map(card => card.id)));
});

test('the run scanner recognizes every completed tableau run, including stacked runs', () => {
  const run = () => Array.from({ length: 13 }, (_, index) => ({ rank: 13 - index, suit: 'spades', faceUp: true }));
  const piles = Array.from({ length: 8 }, run);
  piles.push([...run(), ...run()]);
  assert.equal(M.findCompletedRuns(piles).length, 10);
  assert.deepEqual(M.findCompletedRuns([[{ rank: 13, suit: 'spades', faceUp: false }, ...run().slice(1)]]), []);
  const removed = M.removeCompletedRuns(piles);
  assert.equal(removed.length, 10);
  assert.deepEqual(piles.map(pile => pile.length), Array(9).fill(0));
});

test('outcome rules distinguish a win, an exhausted stuck deal, and a recoverable position', () => {
  assert.equal(M.resolveOutcome(8, 0, false), 'won');
  assert.equal(M.resolveOutcome(3, 0, false), 'stuck');
  assert.equal(M.resolveOutcome(3, 0, true), 'playing');
  assert.equal(M.resolveOutcome(3, 10, false), 'playing');
});

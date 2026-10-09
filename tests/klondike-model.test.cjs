const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/klondike-model.js');

function makeDeck(assignments = {}) {
  const base = M.cardsInOrder().map(card => card.id);
  const fixed = new Set(Object.values(assignments));
  const order = Array(52);
  for (const [index, id] of Object.entries(assignments)) order[Number(index)] = id;
  const remaining = base.filter(id => !fixed.has(id));
  for (let index = 0; index < order.length; index++) if (!order[index]) order[index] = remaining.shift();
  return order;
}

function winningDeck() {
  const starts = [1, 1, 1, 4, 3, 2, 1];
  const rankSuitIndex = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i + 1, 0]));
  const tableauOrder = [];
  for (let pile = 0; pile < 7; pile++) {
    const count = pile + 1;
    for (let offset = 0; offset < count; offset++) {
      const rank = starts[pile] + count - 1 - offset;
      const suit = M.SUITS[rankSuitIndex[rank]++];
      tableauOrder.push(`${suit[0]}${rank}`);
    }
  }
  const stockOrder = [];
  for (let rank = 8; rank <= 13; rank++) for (const suit of M.SUITS) stockOrder.push(`${suit[0]}${rank}`);
  return [...tableauOrder, ...stockOrder];
}

function hasTableauMove(game) {
  const view = game.view();
  for (let from = 0; from < 7; from++) {
    const pile = view.tableaus[from];
    for (let index = 0; index < pile.length; index++) {
      const source = { zone: 'tableau', pile: from, index };
      for (let to = 0; to < 7; to++) if (game.canMove(source, { zone: 'tableau', pile: to })) return true;
      for (const suit of M.SUITS) if (game.canMove(source, { zone: 'foundation', suit })) return true;
    }
  }
  return false;
}

test('a seeded deal is repeatable and contains the complete 52-card Klondike layout', () => {
  const first = M.create({ seed: 2086 }).view();
  const again = M.create({ seed: 2086 }).view();
  assert.deepEqual(first, again);
  assert.deepEqual(first.tableaus.map(pile => pile.length), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(first.stockCount, 24);
  assert.equal(first.waste.length, 0);
  assert.deepEqual(first.foundations, { clubs: [], diamonds: [], hearts: [], spades: [] });
  assert.equal(first.tableaus.flat().filter(card => card.faceUp).length, 7);
  const ids = [...first.tableaus.flat(), ...first.waste].map(card => card.id);
  assert.equal(ids.length, 28);
  assert.equal(new Set([...ids, ...M.shuffledDeck(2086).slice(28)]).size, 52);
  assert.equal(M.shuffledDeck(2086).length, 52);
});

test('tableau builds alternate colors in descending order and move exposed runs as a unit', () => {
  const order = makeDeck({ 0: 'c5', 1: 'd2', 2: 'h6', 5: 'c7' });
  const game = M.create({ seed: 1, deckOrder: order });
  const c5 = { zone: 'tableau', pile: 0, index: 0 };
  assert.equal(game.canMove(c5, { zone: 'tableau', pile: 1 }), true);
  assert.equal(game.move(c5, { zone: 'tableau', pile: 1 }), true);
  const run = { zone: 'tableau', pile: 1, index: 1 };
  assert.equal(game.canMove(run, { zone: 'tableau', pile: 2 }), true);
  assert.equal(game.move(run, { zone: 'tableau', pile: 2 }), true);
  assert.deepEqual(game.view().tableaus[2].slice(-3).map(card => card.id), ['c7', 'h6', 'c5']);
  assert.equal(game.view().tableaus[1].length, 1);
  assert.equal(game.view().tableaus[1][0].faceUp, true, 'the newly exposed card turns face up');
  assert.equal(game.view().tableaus[1][0].id, 'd2');
});

test('same-color, wrong-rank, covered-card, and non-King empty-column moves are rejected', () => {
  const order = makeDeck({ 0: 'c5', 1: 'd2', 2: 'c6', 5: 'c7' });
  const game = M.create({ seed: 2, deckOrder: order });
  assert.equal(game.canMove({ zone: 'tableau', pile: 0, index: 0 }, { zone: 'tableau', pile: 1 }), false);
  assert.equal(game.canMove({ zone: 'tableau', pile: 0, index: 0 }, { zone: 'tableau', pile: 2 }), false);
  assert.equal(game.canMove({ zone: 'tableau', pile: 1, index: 0 }, { zone: 'tableau', pile: 2 }), false);
  assert.equal(game.canMove({ zone: 'tableau', pile: 0, index: 0 }, { zone: 'tableau', pile: 0 }), false);
  const king = M.create({ seed: 3, deckOrder: makeDeck({ 0: 'c5', 2: 'h6', 5: 's13' }) });
  assert.equal(king.move({ zone: 'tableau', pile: 0, index: 0 }, { zone: 'tableau', pile: 1 }), true);
  assert.equal(king.view().tableaus[0].length, 0);
  assert.equal(king.canMove({ zone: 'tableau', pile: 2, index: 2 }, { zone: 'tableau', pile: 0 }), true);
  const queen = M.create({ seed: 4, deckOrder: makeDeck({ 0: 'c5', 2: 'h6', 5: 'd12' }) });
  assert.equal(queen.move({ zone: 'tableau', pile: 0, index: 0 }, { zone: 'tableau', pile: 1 }), true);
  assert.equal(queen.view().tableaus[0].length, 0);
  assert.equal(queen.canMove({ zone: 'tableau', pile: 2, index: 2 }, { zone: 'tableau', pile: 0 }), false);
});

test('foundations accept only an Ace first and then the next card of the same suit', () => {
  const game = M.create({ seed: 5, deckOrder: makeDeck({ 0: 'h1', 28: 'h2', 29: 'c1' }) });
  const ace = { zone: 'tableau', pile: 0, index: 0 };
  assert.equal(game.canMove(ace, { zone: 'foundation', suit: 'hearts' }), true);
  assert.equal(game.canMove(ace, { zone: 'foundation', suit: 'clubs' }), false);
  assert.equal(game.move(ace, { zone: 'foundation', suit: 'hearts' }), true);
  assert.equal(game.draw(), true);
  assert.equal(game.view().waste.at(-1).id, 'h2');
  assert.equal(game.canMove({ zone: 'waste' }, { zone: 'foundation', suit: 'hearts' }), true);
  assert.equal(game.move({ zone: 'waste' }, { zone: 'foundation', suit: 'hearts' }), true);
  assert.deepEqual(game.view().foundations.hearts.map(card => card.rank), [1, 2]);
  assert.equal(game.move({ zone: 'waste' }, { zone: 'foundation', suit: 'clubs' }), false);
});

test('Draw-One stock order, one recycle, and undo preserve the full waste sequence', () => {
  const order = makeDeck({ 28: 'c5', 29: 'd8', 30: 'h10', 51: 's11' });
  const game = M.create({ seed: 6, deckOrder: order });
  assert.equal(game.view().drawCount, 1);
  assert.equal(game.view().recycleLimit, 1);
  assert.equal(game.draw(), true);
  assert.equal(game.view().waste.at(-1).id, 'c5');
  assert.equal(game.draw(), true);
  assert.equal(game.view().waste.at(-1).id, 'd8');
  assert.equal(game.undo(), true);
  assert.equal(game.view().stockCount, 23);
  assert.equal(game.view().waste.at(-1).id, 'c5');
  while (game.view().stockCount) game.draw();
  assert.equal(game.view().canRecycle, true);
  assert.equal(game.recycle(), true);
  assert.equal(game.view().recyclesUsed, 1);
  assert.equal(game.view().stockCount, 24);
  assert.equal(game.view().waste.length, 0);
  assert.equal(game.draw(), true);
  assert.equal(game.view().waste.at(-1).id, 'c5', 'recycling restores the original draw order');
  game.undo();
  assert.equal(game.view().stockCount, 24);
  assert.equal(game.view().recyclesUsed, 1);
  while (game.view().stockCount && game.view().status === 'playing') game.draw();
  assert.equal(game.view().canRecycle, false, 'the chosen variant allows one recycle only');
  assert.equal(game.recycle(), false);
});

test('no-placement states remain playable while the stock or one recycle can recover them', () => {
  const order = makeDeck({
    0: 'c2', 2: 's3', 5: 'h5', 9: 'd6', 14: 'c8', 20: 's9', 27: 'h11', 28: 'c13'
  });
  const game = M.create({ seed: 7, deckOrder: order });
  assert.equal(hasTableauMove(game), false);
  assert.equal(game.view().noCardMoves, true);
  assert.equal(game.view().canDraw, true);
  assert.equal(game.draw(), true);
  assert.equal(game.view().waste.at(-1).id, 'c13');
  assert.equal(game.view().noCardMoves, true);
  assert.equal(game.view().status, 'playing');
  assert.equal(game.undo(), true);
  assert.equal(game.view().stockCount, 24);
  assert.equal(game.view().waste.length, 0);
  assert.equal(game.view().status, 'playing');
});

test('a deterministic no-moves loss can be undone or restarted from the same deal', () => {
  const seed = 91;
  const game = M.create({ seed });
  assert.equal(game.view().noCardMoves, true);
  for (let i = 0; i < 24; i++) game.draw();
  assert.equal(game.view().canRecycle, true);
  assert.equal(game.recycle(), true);
  for (let i = 0; i < 24; i++) game.draw();
  const lost = game.view();
  assert.equal(lost.status, 'lost');
  assert.equal(lost.outcome, 'loss');
  assert.equal(lost.lastEvent, 'no-moves');
  assert.equal(lost.canUndo, true);
  assert.equal(game.undo(), true);
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().stockCount, 1);
  game.restart();
  assert.equal(game.view().moves, 0);
  assert.equal(game.view().stockCount, 24);
  assert.deepEqual(game.view().tableaus.map(pile => pile.map(card => card.id)), M.create({ seed }).view().tableaus.map(pile => pile.map(card => card.id)));
});

test('a complete deterministic deal reaches a four-foundation win and restart replays it', () => {
  const game = M.create({ seed: 8, deckOrder: winningDeck() });
  for (let rank = 1; rank <= 7; rank++) {
    for (let pile = 0; pile < 7; pile++) {
      const top = game.view().tableaus[pile].at(-1);
      if (!top || top.rank !== rank) continue;
      assert.equal(game.move({ zone: 'tableau', pile, index: game.view().tableaus[pile].length - 1 }, { zone: 'foundation', suit: top.suit }), true);
    }
    for (const suit of M.SUITS) {
      const top = game.view().tableaus.findIndex(pile => pile.at(-1)?.rank === rank && pile.at(-1)?.suit === suit);
      if (top >= 0) assert.equal(game.move({ zone: 'tableau', pile: top, index: game.view().tableaus[top].length - 1 }, { zone: 'foundation', suit }), true);
    }
  }
  for (let rank = 8; rank <= 13; rank++) {
    for (const suit of M.SUITS) {
      assert.equal(game.draw(), true);
      assert.equal(game.view().waste.at(-1).rank, rank);
      assert.equal(game.move({ zone: 'waste' }, { zone: 'foundation', suit }), true);
    }
  }
  const won = game.view();
  assert.equal(won.status, 'won');
  assert.equal(won.outcome, 'won');
  assert.equal(M.SUITS.reduce((count, suit) => count + won.foundations[suit].length, 0), 52);
  assert.equal(game.draw(), false);
  game.restart();
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().moves, 0);
});

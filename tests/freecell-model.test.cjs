const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/freecell-model.js');

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
  const order = Array(52);
  for (let pile = 0; pile < 8; pile++) {
    const suit = M.SUITS[pile % 4][0];
    const ranks = pile < 4
      ? Array.from({ length: 7 }, (_, i) => 7 - i)
      : Array.from({ length: 6 }, (_, i) => 13 - i);
    ranks.forEach((rank, row) => { order[pile + row * 8] = `${suit}${rank}`; });
  }
  return order;
}

function emptyColumnDeck() {
  const picks = {};
  const assign = (pile, row, id) => { picks[pile + row * 8] = id; };
  [7, 6, 5, 4, 3, 2, 1].forEach((rank, row) => assign(0, row, `c${rank}`));
  assign(1, 0, 'h9');
  ['d7', 's6', 'd5', 's4', 'd3', 's2'].forEach((id, i) => assign(1, i + 1, id));
  assign(2, 6, 's8');
  return makeDeck(picks);
}

test('seeded FreeCell deals are repeatable and expose all 52 cards across 8 columns', () => {
  const first = M.create({ seed: 4408 }).view();
  const again = M.create({ seed: 4408 }).view();
  assert.deepEqual(first, again);
  assert.deepEqual(first.tableaus.map(pile => pile.length), [7, 7, 7, 7, 6, 6, 6, 6]);
  assert.deepEqual(first.freeCells, [null, null, null, null]);
  assert.deepEqual(first.foundations, { clubs: [], diamonds: [], hearts: [], spades: [] });
  const cards = first.tableaus.flat();
  assert.equal(cards.length, 52);
  assert.ok(cards.every(card => card.faceUp));
  assert.equal(new Set(cards.map(card => card.id)).size, 52);
});

test('tableau requires descending alternate colors and an exposed valid sequence', () => {
  const game = M.create({ seed: 1, deckOrder: makeDeck({ 40: 'c8', 48: 'h7', 49: 'd9', 41: 'd6' }) });
  const run = { zone: 'tableau', pile: 0, index: 5 };
  assert.equal(game.canMove(run, { zone: 'tableau', pile: 1 }), true);
  assert.equal(game.move(run, { zone: 'tableau', pile: 1 }), true);
  assert.deepEqual(game.view().tableaus[1].slice(-2).map(card => card.id), ['c8', 'h7']);
  assert.equal(game.view().moves, 1, 'the two-card supermove is one logical move');
  assert.equal(game.view().lastEvent, 'supermove');

  const invalid = M.create({ seed: 2, deckOrder: makeDeck({ 40: 'c8', 48: 'c7', 49: 'd9' }) });
  assert.equal(invalid.canMove({ zone: 'tableau', pile: 0, index: 5 }, { zone: 'tableau', pile: 1 }), false,
    'same-color sequences cannot move as a group');
  assert.equal(invalid.canMove({ zone: 'tableau', pile: 0, index: 0 }, { zone: 'tableau', pile: 1 }), false,
    'a suffix that is not a valid alternating run cannot move');
});

test('a single exposed card uses one free cell; occupied cells reject another card', () => {
  const game = M.create({ seed: 3, deckOrder: makeDeck({ 48: 'c1', 49: 'd1', 40: 'h4' }) });
  const ace = { zone: 'tableau', pile: 0, index: 6 };
  assert.equal(game.canMove(ace, { zone: 'cell', cell: 0 }), true);
  assert.equal(game.move(ace, { zone: 'cell', cell: 0 }), true);
  assert.equal(game.view().freeCells[0].id, 'c1');
  assert.equal(game.move({ zone: 'tableau', pile: 1, index: 6 }, { zone: 'cell', cell: 0 }), false);
  assert.equal(game.move({ zone: 'cell', cell: 0 }, { zone: 'foundation', suit: 'clubs' }), true);
  assert.equal(game.view().foundations.clubs[0].id, 'c1');
  assert.equal(game.view().freeCells[0], null);
  assert.equal(game.move({ zone: 'tableau', pile: 0, index: 5 }, { zone: 'foundation', suit: 'clubs' }), false,
    'a 2 cannot skip its Ace');
});

test('free-cell count limits supermoves, while a cleared column increases capacity', () => {
  const fullCellsDeck = makeDeck({
    40: 'c8', 48: 'h7', 49: 'd9', 46: 's8',
    50: 'h5', 51: 'd10', 44: 'c4', 45: 'h6', 47: 'd7'
  });
  const fullCells = M.create({ seed: 4, deckOrder: fullCellsDeck });
  for (const [cell, source] of [
    [0, { zone: 'tableau', pile: 2, index: 6 }],
    [1, { zone: 'tableau', pile: 3, index: 6 }],
    [2, { zone: 'tableau', pile: 4, index: 5 }],
    [3, { zone: 'tableau', pile: 5, index: 5 }]
  ]) assert.equal(fullCells.move(source, { zone: 'cell', cell }), true);
  const run = { zone: 'tableau', pile: 0, index: 5 };
  assert.equal(fullCells.canMove(run, { zone: 'tableau', pile: 1 }), false,
    'with four occupied cells and no empty columns only one card can move');
  assert.equal(fullCells.canMove({ zone: 'tableau', pile: 0, index: 6 }, { zone: 'tableau', pile: 6 }), true,
    'an individual card remains movable within the same capacity');

  const game = M.create({ seed: 5, deckOrder: emptyColumnDeck() });
  for (const rank of [1, 2, 3, 4, 5, 6, 7]) {
    const exposed = game.view().tableaus[0].length - 1;
    assert.equal(game.move({ zone: 'tableau', pile: 0, index: exposed }, { zone: 'foundation', suit: 'clubs' }), true);
    assert.equal(game.view().foundations.clubs.at(-1).rank, rank);
  }
  assert.equal(game.view().tableaus[0].length, 0);
  const sixCardRun = { zone: 'tableau', pile: 1, index: 1 };
  assert.equal(game.canMove(sixCardRun, { zone: 'tableau', pile: 2 }), true,
    'four open cells and one usable empty column allow up to ten cards onto a nonempty pile');
  assert.equal(game.canMove(sixCardRun, { zone: 'tableau', pile: 0 }), false,
    'the empty destination cannot also count as temporary storage; capacity is five');
  assert.equal(game.canMove({ zone: 'tableau', pile: 2, index: 6 }, { zone: 'tableau', pile: 0 }), true,
    'FreeCell empty columns accept any card, including a non-King');
});

test('foundations build one suit upward through King and all 52 cards produce a win', () => {
  const game = M.create({ seed: 6, deckOrder: winningDeck() });
  for (let rank = 1; rank <= 13; rank++) {
    for (let suitIndex = 0; suitIndex < 4; suitIndex++) {
      const view = game.view();
      let source = null;
      for (let p = 0; p < 8 && !source; p++) {
        const index = view.tableaus[p].length - 1;
        if (index >= 0 && view.tableaus[p][index].rank === rank && view.tableaus[p][index].suit === M.SUITS[suitIndex]) {
          source = { zone: 'tableau', pile: p, index };
        }
      }
      if (!source) {
        const cell = view.freeCells.findIndex(card => card?.rank === rank && card.suit === M.SUITS[suitIndex]);
        if (cell >= 0) source = { zone: 'cell', cell };
      }
      assert.ok(source, `rank ${rank} ${M.SUITS[suitIndex]} should be exposed in the deterministic winning deal`);
      assert.equal(game.move(source, { zone: 'foundation', suit: M.SUITS[suitIndex] }), true);
    }
  }
  assert.equal(game.view().status, 'won');
  assert.equal(game.view().cardsInFoundations, 52);
  assert.equal(game.view().moves, 52);
  assert.equal(game.undo(), true);
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().cardsInFoundations, 51);
});

test('undo, restart, and new seeded deal preserve deterministic state', () => {
  const game = M.create({ seed: 'vietnamese-freecell' });
  const start = game.view();
  const source = { zone: 'tableau', pile: 0, index: 6 };
  const destination = { zone: 'cell', cell: 0 };
  assert.equal(game.move(source, destination), true);
  assert.equal(game.undo(), true);
  assert.deepEqual(game.view().tableaus, start.tableaus);
  assert.equal(game.view().moves, 0);
  assert.equal(game.move(source, destination), true);
  game.restart();
  assert.deepEqual(game.view().tableaus, start.tableaus);
  assert.deepEqual(game.view().freeCells, [null, null, null, null]);
  assert.equal(game.view().moves, 0);
});

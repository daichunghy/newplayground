const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/cupcake-studio-model.js');

function makePerfect(model) {
  const recipe = model.view().recipe;
  model.selectFrosting(recipe.frosting);
  recipe.pattern.forEach((topping, index) => {
    model.selectTool(topping || M.ERASER);
    model.place(index);
  });
  return model.submit();
}

test('recipe match scores icing and all nine positions, including blank spaces', () => {
  const game = M.create(), recipe = game.view().recipe;
  game.selectFrosting(recipe.frosting);
  recipe.pattern.forEach((topping, index) => {
    game.selectTool(topping || M.ERASER);
    game.place(index);
  });
  assert.equal(game.view().match, M.SCORE_PER_ORDER);
  assert.equal(game.view().starsForOrder, 3);
  assert.deepEqual(game.submit(), {
    accepted: true, customer: 'Mây', points: 11, max: 11, stars: 3,
    totalStars: 3, completed: 1, status: 'playing'
  });
  assert.equal(game.view().round, 1);
  assert.equal(game.view().toppings.every(value => value === null), true);
});

test('all three authored orders can be completed for a stable win', () => {
  const game = M.create();
  const results = [makePerfect(game), makePerfect(game), makePerfect(game)];
  assert.deepEqual(results.map(result => result.customer), ['Mây', 'Nắng', 'Rêu']);
  assert.equal(game.view().status, 'won');
  assert.equal(game.view().stars, 9);
  assert.equal(game.view().results.length, M.ORDER_COUNT);
  assert.equal(game.submit().accepted, false);
  assert.equal(game.place(0), false);
});

test('low-match shift loses after three orders and leaves replayable results', () => {
  const game = M.create();
  game.submit(); game.submit();
  const final = game.submit();
  assert.equal(final.status, 'lost');
  assert.ok(final.totalStars < M.WIN_STARS);
  assert.equal(game.view().results.length, 3);
  assert.equal(game.pause(), false);
  game.restart();
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().round, 0);
  assert.equal(game.view().stars, 0);
});

test('undo restores the latest icing and decoration changes; clear is undoable', () => {
  const game = M.create();
  assert.equal(game.selectFrosting('berry'), true);
  assert.equal(game.selectTool('star'), true);
  game.place(4);
  assert.equal(game.view().toppings[4], 'star');
  assert.equal(game.undo(), true);
  assert.equal(game.view().toppings[4], null);
  assert.equal(game.undo(), true);
  assert.equal(game.view().frosting, 'vanilla');
  game.selectFrosting('mint'); game.selectTool('leaf'); game.place(0); game.clear();
  assert.equal(game.view().frosting, 'vanilla');
  assert.equal(game.view().toppings[0], null);
  assert.equal(game.undo(), true);
  assert.equal(game.view().frosting, 'mint');
  assert.equal(game.view().toppings[0], 'leaf');
});

test('invalid commands and terminal commands are harmless', () => {
  const game = M.create();
  assert.equal(game.selectFrosting('blue'), false);
  assert.equal(game.selectTool('dragon'), false);
  assert.equal(game.place(-1), false);
  assert.equal(game.place(9), false);
  assert.equal(game.undo(), false);
  assert.equal(game.clear(), true);
  game.pause();
  assert.equal(game.selectTool('berry'), false);
  assert.equal(game.place(0), false);
  assert.equal(game.resume(), true);
  makePerfect(game); makePerfect(game); makePerfect(game);
  assert.equal(game.clear(), false);
  assert.equal(game.undo(), false);
});

test('pause, resume and restart are stable and repeatable', () => {
  const game = M.create();
  assert.equal(game.pause(), true);
  assert.equal(game.pause(), false);
  assert.equal(game.resume(), true);
  assert.equal(game.resume(), false);
  game.selectTool('choc'); game.place(2);
  game.restart(); game.restart();
  assert.equal(game.view().status, 'playing');
  assert.equal(game.view().toppings.some(Boolean), false);
  assert.equal(game.view().round, 0);
});

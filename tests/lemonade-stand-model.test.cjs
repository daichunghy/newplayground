const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/lemonade-stand-model.js');

const schedule = ['sunny', 'mild', 'rain'];
const plan = {
  sunny: ['tart', 15],
  mild: ['balanced', 13],
  rain: ['sweet', 12]
};

function playAdaptiveShift(model) {
  while (model.view().status === 'playing') {
    const view = model.view();
    const [recipe, price] = plan[view.weather];
    model.setRecipe(recipe);
    model.setPrice(price);
    model.tick(1);
  }
  return model.view();
}

function bestFiveSecondPlanGain(dayIndex, seed, blockIndex) {
  const day = M.DAYS[dayIndex];
  let best = 0;
  for (const recipe of M.RECIPE_IDS) for (let price = M.MIN_PRICE; price <= M.MAX_PRICE; price++) {
    const model = M.create({ seed: `${seed}-${dayIndex}`, weatherOrder: day.weatherOrder, targetProfit: 100000 });
    let startProfit = 0, gain = 0;
    for (let second = 0; second < M.SHIFT_SECONDS; second++) {
      if (second % 5 === 0) {
        const block = second / 5, weather = day.weatherOrder[Math.floor(second / 15)];
        const [baseRecipe, basePrice] = plan[weather];
        model.setRecipe(baseRecipe); model.setPrice(basePrice);
        if (block === blockIndex) {
          startProfit = model.view().profit;
          model.setRecipe(recipe); model.setPrice(price);
        }
      }
      model.tick(1);
      if (second === blockIndex * 5 + 4) gain = model.view().profit - startProfit;
    }
    best = Math.max(best, gain);
  }
  return best;
}

test('starts instantly with one small shift and only three recipe choices', () => {
  const v = M.create({ seed: 'start', weatherOrder: schedule }).view();
  assert.equal(v.status, 'playing');
  assert.equal(v.elapsed, 0);
  assert.equal(v.remaining, M.SHIFT_SECONDS);
  assert.equal(v.target, M.TARGET_PROFIT);
  assert.deepEqual(M.RECIPE_IDS, ['tart', 'balanced', 'sweet']);
  assert.equal(v.price, 12);
  assert.equal(v.recipeMix, '3/2/2');
  assert.equal(v.customers, 0);
  assert.equal(v.sold, 0);
});

test('the five authored campaign days rotate weather and raise the visible profit goal', () => {
  assert.equal(M.DAYS.length, 5);
  assert.deepEqual(M.DAYS.map(day => day.targetProfit), [100, 110, 115, 120, 125]);
  assert.equal(new Set(M.DAYS.map(day => day.weatherOrder.join(','))).size, M.DAYS.length);
  for (let index = 0; index < M.DAYS.length; index++) {
    const view = M.createDay(index, { seed: `campaign-${index}` }).view();
    assert.equal(view.target, M.DAYS[index].targetProfit);
    assert.equal(view.weather, M.DAYS[index].weatherOrder[0]);
    assert.equal(view.remaining, M.SHIFT_SECONDS);
  }
  assert.throws(() => M.createDay(-1), /Day index is invalid/);
});

test('weather-matched recipe and price choices keep every campaign day beatable across seeded customer runs', () => {
  for (let day = 0; day < M.DAYS.length; day++) {
    let wins = 0;
    for (let seed = 1; seed <= 500; seed++) {
      const model = M.createDay(day, { seed: `${seed}-${day}` });
      while (model.view().status === 'playing') {
        const [recipe, price] = plan[model.view().weather];
        model.setRecipe(recipe); model.setPrice(price); model.tick(1);
      }
      if (model.view().status === 'won') wins++;
    }
    assert.ok(wins >= 425, `${M.DAYS[day].name} won ${wins}/500 seeded shifts`);
  }
});

test('a bounded five-second strategy search finds a winning route for sampled shifts lost by the simple policy', () => {
  let failedSeeds = 0;
  for (let day = 0; day < M.DAYS.length; day++) for (let seed = 1; seed <= 500; seed++) {
    const baseline = M.createDay(day, { seed: `${seed}-${day}` });
    const result = playAdaptiveShift(baseline);
    if (result.status !== 'lost') continue;
    failedSeeds++;
    let bestProfit = 0;
    for (let block = 0; block < M.SHIFT_SECONDS / 5; block++) bestProfit += bestFiveSecondPlanGain(day, seed, block);
    assert.ok(bestProfit >= M.DAYS[day].targetProfit,
      `${M.DAYS[day].name} seed ${seed} has bounded five-second route ${bestProfit}/${M.DAYS[day].targetProfit}`);
  }
  assert.ok(failedSeeds > 0, 'the search exercises real losses from the simple policy');
});

test('price and recipe choices validate, clamp at the edges, and stop after the shift', () => {
  const m = M.create({ seed: 1, weatherOrder: schedule });
  assert.equal(m.setPrice(M.MIN_PRICE - 1), false);
  assert.equal(m.setPrice(M.MAX_PRICE + 1), false);
  assert.equal(m.setPrice(12.5), false);
  assert.equal(m.setRecipe('unknown'), false);
  assert.equal(m.adjustPrice(-1), true);
  assert.equal(m.view().price, 11);
  assert.equal(m.setRecipe('tart'), true);
  assert.equal(m.view().recipeMix, '3/1/3');
  assert.equal(m.view().recipeCost, 4);
  assert.equal(m.setRecipe('sweet'), true);
  assert.equal(m.view().recipeMix, '2/3/2');
  assert.equal(m.view().recipeCost, 6);
  assert.equal(m.setRecipe('balanced'), true);
  assert.equal(m.setPrice(M.MIN_PRICE), true);
  assert.equal(m.adjustPrice(-1), true);
  assert.equal(m.view().price, M.MIN_PRICE);
  assert.equal(m.setPrice(M.MAX_PRICE), true);
  assert.equal(m.adjustPrice(1), true);
  assert.equal(m.view().price, M.MAX_PRICE);
  m.tick(M.SHIFT_SECONDS);
  assert.equal(m.view().status, 'lost');
  const done = m.view();
  assert.equal(m.adjustPrice(-1), false);
  assert.equal(m.setRecipe('tart'), false);
  assert.equal(m.tick(1), false);
  assert.deepEqual(m.view(), done);
});

test('weather turns at the 15 and 30 second marks, including fractional ticks', () => {
  const m = M.create({ seed: 2, weatherOrder: schedule });
  assert.equal(m.tick(14.5), true);
  assert.equal(m.view().elapsed, 14);
  assert.equal(m.view().weather, 'sunny');
  m.tick(.5);
  assert.equal(m.view().elapsed, 15);
  assert.equal(m.view().weather, 'mild');
  m.tick(15);
  assert.equal(m.view().elapsed, 30);
  assert.equal(m.view().weather, 'rain');
  m.tick(15);
  assert.equal(m.view().weather, 'rain');
  assert.equal(m.view().status, 'lost');
});

test('seeded weather order always includes sun, cloud and rain once each', () => {
  const orders = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const m = M.create({ seed });
    const order = [m.view().weather];
    m.tick(15); order.push(m.view().weather);
    m.tick(15); order.push(m.view().weather);
    assert.deepEqual([...order].sort(), ['mild', 'rain', 'sunny']);
    const repeated = M.create({ seed });
    assert.equal(repeated.view().weather, order[0]);
    repeated.tick(15); assert.equal(repeated.view().weather, order[1]);
    repeated.tick(15); assert.equal(repeated.view().weather, order[2]);
    orders.add(order.join(','));
  }
  assert.ok(orders.size > 1, 'weather order varies with the seed');
});

test('a simple weather-matched price and recipe policy clears four of five seeded shifts per order', () => {
  const orders = [
    ['sunny', 'mild', 'rain'], ['sunny', 'rain', 'mild'],
    ['mild', 'sunny', 'rain'], ['mild', 'rain', 'sunny'],
    ['rain', 'sunny', 'mild'], ['rain', 'mild', 'sunny']
  ];
  for (const weatherOrder of orders) {
    let wins = 0;
    for (let seed = 1; seed <= 500; seed++) {
      const model = M.create({ seed, weatherOrder });
      while (model.view().status === 'playing') {
        const [recipe, price] = plan[model.view().weather];
        model.setRecipe(recipe);
        model.setPrice(price);
        model.tick(1);
      }
      if (model.view().status === 'won') wins++;
    }
    assert.ok(wins >= 400, `${weatherOrder.join(',')} won ${wins}/500 seeded shifts`);
  }
});

test('same seed repeats customer decisions and restart restores the same shift', () => {
  const a = M.create({ seed: 'replay', weatherOrder: schedule });
  const b = M.create({ seed: 'replay', weatherOrder: schedule });
  for (let i = 0; i < 25; i++) {
    const [recipe, price] = plan[a.view().weather];
    a.setRecipe(recipe); b.setRecipe(recipe);
    a.setPrice(price); b.setPrice(price);
    a.tick(1); b.tick(1);
    assert.deepEqual(a.view(), b.view());
  }
  const first = playAdaptiveShift(a);
  const repeat = playAdaptiveShift(b);
  assert.deepEqual(repeat, first);
  assert.equal(a.restart(), true);
  assert.equal(a.view().elapsed, 0);
  assert.equal(a.view().weather, 'sunny');
  playAdaptiveShift(a);
  assert.equal(a.view().profit, first.profit);
  assert.equal(a.view().sold, first.sold);
  assert.equal(a.view().status, first.status);
});

test('weather-aware play can reach the goal, while an overpriced recipe can run out the clock', () => {
  const winner = M.create({ seed: 1, weatherOrder: schedule });
  const won = playAdaptiveShift(winner);
  assert.equal(won.status, 'won');
  assert.ok(won.profit >= M.TARGET_PROFIT);
  assert.ok(won.elapsed < M.SHIFT_SECONDS);

  const loser = M.create({ seed: 1, weatherOrder: ['rain', 'rain', 'rain'] });
  loser.setPrice(M.MAX_PRICE);
  loser.tick(M.SHIFT_SECONDS);
  const lost = loser.view();
  assert.equal(lost.status, 'lost');
  assert.equal(lost.remaining, 0);
  assert.equal(lost.lastEvent, 'close');
  assert.ok(lost.profit < M.TARGET_PROFIT);
});

test('tick rejects invalid or oversized jumps without changing state', () => {
  const m = M.create({ seed: 9, weatherOrder: schedule });
  const before = m.view();
  for (const delta of [0, -1, NaN, Infinity, M.SHIFT_SECONDS + 0.01]) assert.equal(m.tick(delta), false);
  assert.deepEqual(m.view(), before);
});

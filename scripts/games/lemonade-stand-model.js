/* Deterministic, one-shift recipe-and-price management puzzle. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_LemonadeStandModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RECIPES = Object.freeze({
    tart: Object.freeze({ name: 'Chua dịu', lemons: 3, sugar: 1, ice: 3, cost: 4, likes: 'sunny' }),
    balanced: Object.freeze({ name: 'Vừa miệng', lemons: 3, sugar: 2, ice: 2, cost: 5, likes: 'mild' }),
    sweet: Object.freeze({ name: 'Ngọt thanh', lemons: 2, sugar: 3, ice: 2, cost: 6, likes: 'rain' })
  });
  const RECIPE_IDS = Object.freeze(Object.keys(RECIPES));
  const WEATHER = Object.freeze({
    sunny: Object.freeze({ name: 'Nắng', mark: '☀', traffic: 0.92, priceLimit: 18 }),
    mild: Object.freeze({ name: 'Mây nhẹ', mark: '☁', traffic: 0.72, priceLimit: 14 }),
    rain: Object.freeze({ name: 'Mưa nhẹ', mark: '☂', traffic: 0.48, priceLimit: 11 })
  });
  const SHIFT_SECONDS = 45, TARGET_PROFIT = 120, MIN_PRICE = 4, MAX_PRICE = 24;
  const DAYS = Object.freeze([
    Object.freeze({ name: 'Mở Quầy', targetProfit: 100, weatherOrder: Object.freeze(['sunny', 'mild', 'rain']) }),
    Object.freeze({ name: 'Mưa Trước', targetProfit: 110, weatherOrder: Object.freeze(['rain', 'mild', 'sunny']) }),
    Object.freeze({ name: 'Mây Nắng', targetProfit: 115, weatherOrder: Object.freeze(['mild', 'sunny', 'rain']) }),
    Object.freeze({ name: 'Ngày Chợ', targetProfit: 120, weatherOrder: Object.freeze(['sunny', 'rain', 'mild']) }),
    Object.freeze({ name: 'Chốt Tuần', targetProfit: 125, weatherOrder: Object.freeze(['rain', 'sunny', 'mild']) })
  ]);

  function hashSeed(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let h = 2166136261;
    for (const char of String(seed ?? Date.now())) h = Math.imul(h ^ char.charCodeAt(0), 16777619) >>> 0;
    return h || 1;
  }
  function rngFor(seed) {
    let state = hashSeed(seed);
    return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function createDay(index, options = {}) {
    const day = DAYS[index];
    if (!day) throw new RangeError('Day index is invalid.');
    return create({ ...options, seed: options.seed ?? `${Date.now()}-${index}`,
      weatherOrder: day.weatherOrder, targetProfit: day.targetProfit });
  }

  function create(options = {}) {
    const seed = options.seed ?? Date.now();
    const target = options.targetProfit ?? TARGET_PROFIT;
    if (!Number.isSafeInteger(target) || target < 1 || target > 100000) throw new TypeError('Profit target is invalid.');
    const weatherRandom = rngFor(seed);
    const weatherOrder = options.weatherOrder ? [...options.weatherOrder] : ['sunny', 'mild', 'rain'];
    if (!options.weatherOrder) {
      for (let i = weatherOrder.length - 1; i > 0; i--) {
        const j = Math.floor(weatherRandom() * (i + 1));
        [weatherOrder[i], weatherOrder[j]] = [weatherOrder[j], weatherOrder[i]];
      }
    }
    if (weatherOrder.length !== 3 || weatherOrder.some(value => !Object.hasOwn(WEATHER, value))) throw new TypeError('Weather schedule is invalid.');
    let random, weatherIndex, weather, recipe, price, elapsed, carry, customers, sold, revenue, cost, status, lastEvent;

    function reset() {
      random = rngFor(seed);
      weatherIndex = 0; weather = weatherOrder[0]; recipe = 'balanced'; price = 12;
      elapsed = 0; carry = 0; customers = 0; sold = 0; revenue = 0; cost = 0;
      status = 'playing'; lastEvent = 'open';
    }
    reset();

    function view() {
      const profit = revenue - cost;
      return {
        seed: String(seed), weather, weatherName: WEATHER[weather].name, weatherMark: WEATHER[weather].mark,
        recipe, recipeName: RECIPES[recipe].name, recipeCost: RECIPES[recipe].cost,
        recipeMix: `${RECIPES[recipe].lemons}/${RECIPES[recipe].sugar}/${RECIPES[recipe].ice}`, price,
        elapsed, remaining: Math.max(0, SHIFT_SECONDS - elapsed), customers, sold,
        revenue, cost, profit, target, status, lastEvent,
        canAdjust: status === 'playing'
      };
    }
    function settleEvent() {
      const profit = revenue - cost;
      if (profit >= target) { status = 'won'; lastEvent = 'target'; }
      else if (elapsed >= SHIFT_SECONDS) { status = 'lost'; lastEvent = 'close'; }
    }
    function second() {
      const conditions = WEATHER[weather];
      let event = 'quiet';
      if (random() < conditions.traffic) {
        customers++;
        const taste = RECIPES[recipe].likes === weather ? 1 : 0.67;
        const priceFit = clamp((conditions.priceLimit + 7 - price) / 16, 0.08, 1);
        if (random() < taste * priceFit) {
          sold++;
          revenue += price;
          cost += RECIPES[recipe].cost;
          event = 'sale';
        } else event = 'pass';
      }
      elapsed++;
      if (elapsed % 15 === 0 && weatherIndex < 2) {
        weather = weatherOrder[++weatherIndex];
        if (event === 'quiet') event = 'weather';
      }
      lastEvent = event;
      settleEvent();
    }

    return Object.freeze({
      view,
      adjustPrice(delta) {
        if (status !== 'playing' || !Number.isInteger(delta) || ![-1, 1].includes(delta)) return false;
        price = clamp(price + delta, MIN_PRICE, MAX_PRICE); lastEvent = 'price'; return true;
      },
      setPrice(value) {
        if (status !== 'playing' || !Number.isInteger(value) || value < MIN_PRICE || value > MAX_PRICE) return false;
        price = value; lastEvent = 'price'; return true;
      },
      setRecipe(value) {
        if (status !== 'playing' || !Object.hasOwn(RECIPES, value)) return false;
        recipe = value; lastEvent = 'recipe'; return true;
      },
      tick(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > SHIFT_SECONDS || status !== 'playing') return false;
        carry += seconds;
        while (carry >= 1 && status === 'playing') { carry -= 1; second(); }
        return true;
      },
      restart() { reset(); return true; }
    });
  }
  return Object.freeze({ RECIPES, RECIPE_IDS, WEATHER, DAYS, SHIFT_SECONDS, TARGET_PROFIT, MIN_PRICE, MAX_PRICE, createDay, create });
});

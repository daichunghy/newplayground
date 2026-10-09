/* Original, low-pressure cupcake pattern-matching rules for Tiệm Bánh Ngọt Cupcake. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_CupcakeStudioModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FROSTINGS = Object.freeze(['vanilla', 'berry', 'mint']);
  const TOPPINGS = Object.freeze(['berry', 'star', 'choc', 'leaf']);
  const ERASER = 'erase';
  const ORDER_COUNT = 3;
  const SCORE_PER_ORDER = 11; // Two points for icing, one for each of the nine top positions.
  const WIN_STARS = 6; // Two of three stars on average is a clear, friendly shop-day goal.
  const RECIPES = Object.freeze([
    Object.freeze({ name: 'Mây', frosting: 'berry', pattern: Object.freeze(['star', null, 'berry', null, 'choc', null, 'berry', null, 'star']) }),
    Object.freeze({ name: 'Nắng', frosting: 'vanilla', pattern: Object.freeze(['berry', null, 'berry', null, 'leaf', null, 'star', null, 'star']) }),
    Object.freeze({ name: 'Rêu', frosting: 'mint', pattern: Object.freeze(['choc', 'choc', 'choc', null, 'berry', null, 'leaf', null, 'leaf']) })
  ]);
  const valid = (value, options) => options.includes(value);

  function create() {
    let state;

    function beginOrder() {
      state.frosting = 'vanilla';
      state.toppings = Array(9).fill(null);
      state.selectedTool = 'berry';
      state.undoStack = [];
    }

    function reset() {
      state = {
        status: 'playing', round: 0, stars: 0, score: 0, orders: [],
        lastEvent: 'start', frosting: 'vanilla', selectedTool: 'berry',
        toppings: Array(9).fill(null), undoStack: []
      };
    }

    function remember() {
      state.undoStack.push({ frosting: state.frosting, toppings: state.toppings.slice(), selectedTool: state.selectedTool });
      if (state.undoStack.length > 30) state.undoStack.shift();
    }

    function quality() {
      const recipe = RECIPES[state.round];
      const icing = state.frosting === recipe.frosting ? 2 : 0;
      const positions = recipe.pattern.reduce((sum, target, index) => sum + (target === state.toppings[index] ? 1 : 0), 0);
      const points = icing + positions;
      const stars = points >= 10 ? 3 : points >= 8 ? 2 : points >= 6 ? 1 : 0;
      return { points, max: SCORE_PER_ORDER, icing, positions, stars };
    }

    function view() {
      const recipe = RECIPES[state.round] || null;
      const result = state.status === 'playing' ? quality() : null;
      return {
        status: state.status,
        round: state.round,
        orderNumber: Math.min(ORDER_COUNT, state.round + 1),
        orderCount: ORDER_COUNT,
        customer: recipe ? recipe.name : null,
        recipe: recipe ? { frosting: recipe.frosting, pattern: recipe.pattern.slice() } : null,
        frosting: state.frosting,
        toppings: state.toppings.slice(),
        selectedTool: state.selectedTool,
        match: result ? result.points : 0,
        matchMax: SCORE_PER_ORDER,
        icingMatch: result ? result.icing : 0,
        positionMatches: result ? result.positions : 0,
        starsForOrder: result ? result.stars : 0,
        score: state.score,
        stars: state.stars,
        winStars: WIN_STARS,
        results: state.orders.map(order => ({ ...order })),
        canUndo: state.undoStack.length > 0,
        lastEvent: state.lastEvent
      };
    }

    reset();

    return Object.freeze({
      view,
      selectFrosting(value) {
        if (state.status !== 'playing' || !valid(value, FROSTINGS)) return false;
        if (state.frosting === value) return true;
        remember(); state.frosting = value; state.lastEvent = 'frosting'; return true;
      },
      selectTool(value) {
        if (state.status !== 'playing' || !(valid(value, TOPPINGS) || value === ERASER)) return false;
        state.selectedTool = value; state.lastEvent = 'tool'; return true;
      },
      place(index) {
        if (state.status !== 'playing' || !Number.isInteger(index) || index < 0 || index >= 9) return false;
        const next = state.selectedTool === ERASER ? null : state.selectedTool;
        if (state.toppings[index] === next) return true;
        remember(); state.toppings[index] = next; state.lastEvent = next ? 'decorate' : 'erase'; return true;
      },
      clear() {
        if (state.status !== 'playing') return false;
        if (state.frosting === 'vanilla' && state.toppings.every(value => value === null)) return true;
        remember(); state.frosting = 'vanilla'; state.toppings = Array(9).fill(null); state.lastEvent = 'clear'; return true;
      },
      undo() {
        if (state.status !== 'playing' || state.undoStack.length === 0) return false;
        const previous = state.undoStack.pop();
        state.frosting = previous.frosting; state.toppings = previous.toppings; state.selectedTool = previous.selectedTool;
        state.lastEvent = 'undo'; return true;
      },
      submit() {
        if (state.status !== 'playing') return { accepted: false, status: state.status };
        const result = quality(), recipe = RECIPES[state.round];
        const order = { customer: recipe.name, points: result.points, max: SCORE_PER_ORDER, stars: result.stars };
        state.orders.push(order); state.stars += result.stars; state.score += result.points; state.lastEvent = 'order';
        state.round++;
        if (state.round >= ORDER_COUNT) {
          state.status = state.stars >= WIN_STARS ? 'won' : 'lost';
        } else beginOrder();
        return { accepted: true, ...order, totalStars: state.stars, completed: state.round, status: state.status };
      },
      pause() {
        if (state.status !== 'playing') return false;
        state.status = 'paused'; state.lastEvent = 'paused'; return true;
      },
      resume() {
        if (state.status !== 'paused') return false;
        state.status = 'playing'; state.lastEvent = 'resume'; return true;
      },
      restart() { reset(); return true; }
    });
  }

  return Object.freeze({ FROSTINGS, TOPPINGS, ERASER, ORDER_COUNT, SCORE_PER_ORDER, WIN_STARS, RECIPES, create });
});

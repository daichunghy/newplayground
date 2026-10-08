/* Hàng Rong: original, deterministic street-stall simulation. MIT, see LICENSE. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_HangRongModel = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const VERSION = 3, TICK = 50, MAX_STOCK = Number.MAX_SAFE_INTEGER, MAX_COINS = Number.MAX_SAFE_INTEGER;
  const INGREDIENTS = {
    bread: { name: 'Bánh mì', price: 4 }, egg_pate: { name: 'Trứng & pa-tê', price: 3 },
    tea: { name: 'Trà', price: 1 }, ice: { name: 'Đá sạch', price: 1 },
    peanut: { name: 'Lạc', price: 2 }, sugar: { name: 'Đường', price: 1 },
    skewer: { name: 'Cá viên', price: 7 }, oil: { name: 'Dầu ăn', price: 1 },
    sugarcane: { name: 'Mía', price: 5 }, ricepaper: { name: 'Bánh tráng', price: 6 },
    sausage: { name: 'Nem chua', price: 9 }, lime: { name: 'Chanh', price: 2 },
    milk: { name: 'Sữa', price: 4 }, pearl: { name: 'Trân châu', price: 3 },
    broth: { name: 'Nước dùng', price: 5 }
  };
  const RECIPES = {
    banhmi_trung: { name: 'Bánh mì trứng', time: 4500, price: 15, xp: 12, level: 1, requires: { bread: 1, egg_pate: 1 } },
    tra_da: { name: 'Trà đá', time: 2500, price: 6, xp: 8, level: 1, requires: { tea: 1, ice: 1 } },
    keo_lac: { name: 'Kẹo lạc', time: 3000, price: 8, xp: 10, level: 1, requires: { peanut: 1, sugar: 1 } },
    cavien_chien: { name: 'Cá viên chiên', time: 5000, price: 25, xp: 18, level: 4, requires: { skewer: 1, oil: 1 } },
    nuoc_mia: { name: 'Nước mía', time: 4000, price: 18, xp: 16, level: 4, requires: { sugarcane: 1, ice: 1 } },
    banhtrang_nuong: { name: 'Bánh tráng nướng', time: 5500, price: 28, xp: 22, level: 4, requires: { ricepaper: 1, egg_pate: 1 } },
    nemchua_ran: { name: 'Nem chua rán', time: 5000, price: 32, xp: 24, level: 8, requires: { sausage: 1, oil: 1 } },
    tra_chanh: { name: 'Trà chanh', time: 3500, price: 20, xp: 18, level: 8, requires: { tea: 1, lime: 1, sugar: 1, ice: 1 } },
    trasua_topping: { name: 'Trà sữa trân châu', time: 5000, price: 42, xp: 30, level: 15, requires: { tea: 1, milk: 1, pearl: 1, ice: 1 } },
    lau_ly: { name: 'Lẩu ly', time: 6500, price: 65, xp: 38, level: 15, requires: { skewer: 1, sausage: 1, broth: 1 } }
  };
  const STAGES = [
    { level: 1, name: 'Gánh tre', location: 'Góc ngõ buổi sớm' },
    { level: 4, name: 'Xe đẩy', location: 'Con phố tan tầm' },
    { level: 8, name: 'Quán cóc', location: 'Góc phố hẹn nhau' },
    { level: 15, name: 'Phố ẩm thực', location: 'Một dãy quầy lên đèn' },
    { level: 25, name: 'Phố đi bộ', location: 'Quầy quen giữa phố đông' }
  ];
  const UPGRADES = {
    extraChair: { name: 'Thêm ghế', cost: 150, desc: '4 chỗ đợi thay vì 2.' },
    fastStove: { name: 'Bếp nhanh', cost: 250, desc: 'Thời gian chế biến giảm 40%.' },
    umbrella: { name: 'Mái che', cost: 180, desc: 'Mưa không làm khách sốt ruột hơn.' },
    speaker: { name: 'Biển hiệu', cost: 280, desc: 'Thêm 2 đơn mỗi ca; lịch khách dày hơn.' },
    cooler: { name: 'Tủ mát', cost: 220, desc: 'Món chờ được 60 giây thay vì 30 giây.' }
  };
  const CUSTOMERS = [
    { name: 'Khách đi làm', patience: 32000 }, { name: 'Khách ghé phố', patience: 38000 },
    { name: 'Khách mua mang về', patience: 30000 }, { name: 'Khách quen', patience: 42000 }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const int = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
  const stageFor = level => STAGES.reduce((n, stage, i) => level >= stage.level ? i : n, 0);
  const xpNeeded = level => Math.min(360, 100 + (level - 1) * 12);
  const recipeCost = id => Object.entries(RECIPES[id]?.requires || {}).reduce((n, [k, count]) => n + INGREDIENTS[k].price * count, 0);
  function random(seed) {
    let n = seed >>> 0 || 1;
    return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
  }
  function fresh(seed = 261007) {
    return { level: 1, xp: 0, coins: 100, reputation: 10, shifts: 0, wins: 0,
      seed: int(seed, 1, 4294967295) ? seed : 261007, tutorial: false,
      inventory: Object.fromEntries(Object.keys(INGREDIENTS).map(k => [k, ({ bread: 6, egg_pate: 6, tea: 8, ice: 8, peanut: 4, sugar: 4 })[k] || 0])),
      upgrades: Object.fromEntries(Object.keys(UPGRADES).map(k => [k, false])),
      menu: ['banhmi_trung', 'tra_da', 'keo_lac'], best: [0, 0, 0, 0, 0], lastResult: null };
  }
  function validStock(s) { return s && typeof s === 'object' && Object.keys(INGREDIENTS).every(k => int(s[k], 0, MAX_STOCK)); }
  function validProfile(p) {
    return p && int(p.level, 1, 99) && int(p.xp, 0, xpNeeded(p.level) - 1) && int(p.coins, 0, MAX_COINS) &&
      int(p.reputation, 0, 100) && int(p.shifts, 0, 1000000) && int(p.wins, 0, p.shifts) && int(p.seed, 1, 4294967295) &&
      typeof p.tutorial === 'boolean' && validStock(p.inventory) && p.upgrades && Object.keys(UPGRADES).every(k => typeof p.upgrades[k] === 'boolean') &&
      Array.isArray(p.menu) && p.menu.length >= 1 && p.menu.length <= 3 && new Set(p.menu).size === p.menu.length &&
      p.menu.every(id => Object.hasOwn(RECIPES, id) && RECIPES[id].level <= p.level) &&
      Array.isArray(p.best) && p.best.length === 5 && p.best.every(n => int(n, 0, 3));
  }
  function migrate(legacy) {
    if (!legacy || !int(legacy.level, 1, 99) || !int(legacy.coins, 0, MAX_COINS)) return null;
    const p = fresh(); p.level = legacy.level; p.coins = legacy.coins;
    p.xp = int(legacy.exp, 0, MAX_COINS) ? Math.min(xpNeeded(p.level) - 1, Math.floor((legacy.exp / Math.max(1, Number(legacy.expNeeded) || 100)) * xpNeeded(p.level))) : 0;
    p.reputation = int(legacy.reputation, 0, 100) ? legacy.reputation : 10;
    for (const k of Object.keys(INGREDIENTS)) p.inventory[k] = int(legacy.inventory?.[k], 0, MAX_STOCK) ? legacy.inventory[k] : 0;
    // Old tea_milk represented both drinks. Split only into their corresponding stock; never trust old stageIndex.
    const teaMilk = int(legacy.inventory?.tea_milk, 0, MAX_STOCK) ? legacy.inventory.tea_milk : 0;
    p.inventory.tea = teaMilk; p.inventory.milk = teaMilk; p.inventory.ice = teaMilk;
    for (const k of Object.keys(UPGRADES)) p.upgrades[k] = legacy.upgrades?.[k] === true;
    p.tutorial = p.level > 1;
    return p;
  }
  function makePlan(p) {
    const stage = stageFor(p.level), count = 8 + stage * 2 + (p.upgrades.speaker ? 2 : 0);
    const duration = 60000 + stage * 10000, rng = random((p.seed + p.shifts * 2654435761) >>> 0);
    const orders = Array.from({ length: count }, (_, i) => ({ recipe: p.menu[i % p.menu.length], person: Math.floor(rng() * CUSTOMERS.length) }));
    // Opening tutorial always uses the first menu dish; all other orders are seed-shuffled.
    for (let i = orders.length - 1; i > 1; i--) { const j = 1 + Math.floor(rng() * i); [orders[i], orders[j]] = [orders[j], orders[i]]; }
    return { stage, duration, grace: 20000, quota: Math.ceil(count * 0.6), orders,
      interval: Math.floor((duration - 15000) / (count - 1) / TICK) * TICK,
      rainAt: stage > 0 && p.shifts % 3 === 2 ? Math.floor(duration * 0.45 / TICK) * TICK : null };
  }
  function requiredStock(plan) {
    const needed = Object.fromEntries(Object.keys(INGREDIENTS).map(k => [k, 0]));
    for (const order of plan.orders) for (const [k, n] of Object.entries(RECIPES[order.recipe].requires)) needed[k] += n;
    return needed;
  }
  function create(options = {}) {
    let p = options.profile && validProfile(options.profile) ? clone(options.profile) : fresh(options.seed);
    let phase = 'prep', shift = null, result = null, carry = 0, events = [];
    const emit = (type, extra = {}) => { events.push({ type, ...extra }); if (events.length > 100) events.shift(); };
    const fail = reason => ({ ok: false, reason });
    const success = extra => ({ ok: true, ...extra });
    const active = () => phase === 'playing';
    const supply = () => {
      const needs = requiredStock(makePlan(p));
      const missing = Object.fromEntries(Object.keys(needs).map(k => [k, Math.max(0, needs[k] - p.inventory[k])]));
      const cost = Object.entries(missing).reduce((n, [k, count]) => n + INGREDIENTS[k].price * count, 0);
      return { missing, cost, assistance: Math.max(0, cost - p.coins) };
    };
    function spawn() {
      if (shift.next >= shift.plan.orders.length) return;
      const index = shift.next++, order = shift.plan.orders[index];
      const seat = Array.from({ length: p.upgrades.extraChair ? 4 : 2 }, (_, i) => i).find(i => !shift.customers.some(c => c.seat === i));
      if (seat === undefined) { shift.missed++; shift.combo = 0; emit('miss', { reason: 'full' }); return; }
      const max = CUSTOMERS[order.person].patience - shift.plan.stage * 1500;
      shift.customers.push({ id: index + 1, seat, recipe: order.recipe, person: order.person, remaining: max, max });
      emit('arrival', { recipe: order.recipe });
    }
    function finish(reason) {
      if (!shift || phase === 'result') return;
      shift.missed += shift.customers.length + shift.plan.orders.length - shift.next;
      for (const dish of shift.jobs.concat(shift.tray).filter(Boolean)) shift.waste += recipeCost(dish.recipe);
      const count = shift.plan.orders.length, won = shift.served >= shift.plan.quota;
      const stars = !won ? 0 : shift.served === count && shift.waste === 0 ? 3 : shift.served / count >= 0.8 ? 2 : 1;
      const bonus = stars * (15 + shift.plan.stage * 5), previousLevel = p.level;
      let earnedXP = shift.xp + (won ? 25 + shift.plan.stage * 10 : 0), levelBonus = 0;
      p.xp += earnedXP;
      while (p.level < 99 && p.xp >= xpNeeded(p.level)) { p.xp -= xpNeeded(p.level); p.level++; levelBonus += 30; }
      if (p.level === 99) p.xp = Math.min(p.xp, xpNeeded(99) - 1);
      p.coins = Math.min(MAX_COINS, p.coins + shift.revenue + shift.tips + bonus + levelBonus);
      p.inventory = clone(shift.stock); p.shifts = Math.min(1000000, p.shifts + 1); p.wins = Math.min(p.shifts, p.wins + (won ? 1 : 0)); p.tutorial = true;
      p.reputation = Math.max(0, Math.min(100, p.reputation + (won ? stars : -2)));
      p.best[shift.plan.stage] = Math.max(p.best[shift.plan.stage], stars);
      result = { won, stars, reason, served: shift.served, total: count, missed: shift.missed, revenue: shift.revenue,
        tips: shift.tips, ingredientCost: shift.usedCost, waste: shift.waste, bonus, levelBonus,
        profit: shift.revenue + shift.tips - shift.usedCost, earnedXP, previousLevel, level: p.level,
        unlocked: STAGES.filter(s => s.level > previousLevel && s.level <= p.level).map(s => s.name) };
      p.lastResult = clone(result); phase = 'result'; carry = 0; emit('result', { won, stars });
    }
    function tick() {
      if (!active()) return;
      const tutorial = !p.tutorial && shift.served === 0;
      if (!tutorial) shift.elapsed += TICK;
      const rain = shift.plan.rainAt !== null && shift.elapsed >= shift.plan.rainAt && shift.elapsed < shift.plan.rainAt + 12000;
      if (rain && !shift.rainNotified) { shift.rainNotified = true; emit('rain'); }
      shift.jobs.forEach(job => {
        if (!job) return;
        if (job.remaining > 0) {
          job.remaining = Math.max(0, job.remaining - TICK);
          if (job.remaining === 0) emit('ready', { recipe: job.recipe });
        } else job.age += TICK;
      });
      shift.tray.forEach(dish => { dish.age += TICK; });
      const shelf = p.upgrades.cooler ? 60000 : 30000;
      const expire = dish => { if (dish && dish.remaining === 0 && dish.age >= shelf) { shift.waste += recipeCost(dish.recipe); emit('waste'); return true; } return false; };
      shift.jobs = shift.jobs.map(job => expire(job) ? null : job); shift.tray = shift.tray.filter(dish => !expire(dish));
      if (!tutorial) {
        for (const customer of shift.customers) customer.remaining -= TICK * (rain && !p.upgrades.umbrella ? 1.5 : 1);
        const lost = shift.customers.filter(c => c.remaining <= 0);
        if (lost.length) { shift.missed += lost.length; shift.combo = 0; emit('miss', { reason: 'patience', count: lost.length }); }
        shift.customers = shift.customers.filter(c => c.remaining > 0);
        while (shift.next < shift.plan.orders.length && shift.elapsed >= shift.next * shift.plan.interval) spawn();
      }
      if (shift.next === shift.plan.orders.length && shift.customers.length === 0) finish('orders-complete');
      else if (shift.elapsed >= shift.plan.duration + shift.plan.grace) finish('time');
    }
    const api = {
      view() {
        const plan = shift && phase !== 'prep' ? shift.plan : makePlan(p);
        return clone({ version: VERSION, phase, profile: p, stageIndex: stageFor(p.level), plan, shift, result,
          supply: phase === 'prep' ? supply() : null, xpNeeded: xpNeeded(p.level) });
      },
      drainEvents() { const out = events; events = []; return out; },
      menu(id) {
        if (phase !== 'prep') return fail('phase');
        if (!Object.hasOwn(RECIPES, id) || RECIPES[id].level > p.level) return fail('locked');
        if (p.menu.includes(id)) { if (p.menu.length === 1) return fail('last-recipe'); p.menu = p.menu.filter(r => r !== id); }
        else { if (p.menu.length === 3) return fail('menu-full'); p.menu.push(id); }
        return success();
      },
      restock() {
        if (phase !== 'prep') return fail('phase');
        const quote = supply();
        for (const [k, n] of Object.entries(quote.missing)) p.inventory[k] += n;
        p.coins = Math.max(0, p.coins - quote.cost);
        // No debt and no real money: a disclosed, non-resellable ingredient grant prevents bankruptcy soft-locks.
        emit('restock', { cost: quote.cost, assistance: quote.assistance }); return success(quote);
      },
      buy(id) {
        if (phase !== 'prep') return fail('phase');
        if (!Object.hasOwn(UPGRADES, id)) return fail('invalid');
        if (p.upgrades[id]) return fail('owned');
        if (p.coins < UPGRADES[id].cost) return fail('money');
        p.coins -= UPGRADES[id].cost; p.upgrades[id] = true; emit('upgrade', { id }); return success();
      },
      begin() {
        if (phase !== 'prep') return fail('phase');
        if (supply().cost > 0) return fail('stock');
        shift = { plan: makePlan(p), stock: clone(p.inventory), elapsed: 0, next: 0, customers: [], jobs: [null, null], tray: [],
          serial: 1, served: 0, missed: 0, combo: 0, revenue: 0, tips: 0, xp: 0, usedCost: 0, waste: 0, rainNotified: false };
        phase = 'playing'; result = null; carry = 0; spawn(); emit('start'); return success();
      },
      ensureIngredients(id) {
        if (!active()) return fail('phase');
        if (!p.menu.includes(id) || !shift.customers.some(c => c.recipe === id)) return fail('recipe');
        const missing = Object.entries(RECIPES[id].requires).map(([k, n]) => [k, Math.max(0, n - shift.stock[k])]);
        const cost = missing.reduce((sum, [k, n]) => sum + INGREDIENTS[k].price * n, 0);
        const assistance = Math.max(0, cost - p.coins);
        for (const [k, n] of missing) { shift.stock[k] += n; p.inventory[k] += n; }
        p.coins = Math.max(0, p.coins - cost);
        return success({ cost, assistance });
      },
      cook(id) {
        if (!active()) return fail('phase');
        if (!p.menu.includes(id)) return fail('recipe');
        const slot = shift.jobs.findIndex(job => !job); if (slot < 0) return fail('busy');
        const r = RECIPES[id];
        if (Object.entries(r.requires).some(([k, n]) => shift.stock[k] < n)) return fail('stock');
        for (const [k, n] of Object.entries(r.requires)) shift.stock[k] -= n;
        const time = Math.ceil(r.time * (p.upgrades.fastStove ? 0.6 : 1) / TICK) * TICK;
        shift.jobs[slot] = { id: shift.serial++, recipe: id, remaining: time, total: time, age: 0 };
        shift.usedCost += recipeCost(id); emit('cook', { recipe: id }); return success({ slot });
      },
      collect(slot) {
        if (!active()) return fail('phase');
        if (!int(slot, 0, 1) || !shift.jobs[slot]) return fail('empty');
        if (shift.jobs[slot].remaining > 0) return fail('cooking');
        if (shift.tray.length >= 4) return fail('tray-full');
        const dish = shift.jobs[slot]; shift.tray.push(dish); shift.jobs[slot] = null;
        emit('collect', { recipe: dish.recipe }); return success({ id: dish.id });
      },
      serve(dishId, customerId) {
        if (!active()) return fail('phase');
        const dish = shift.tray.find(d => d.id === dishId), customer = shift.customers.find(c => c.id === customerId);
        if (!dish || !customer) return fail('empty');
        if (dish.recipe !== customer.recipe) return fail('wrong');
        shift.tray = shift.tray.filter(d => d !== dish); shift.customers = shift.customers.filter(c => c !== customer);
        shift.served++; shift.combo++;
        const r = RECIPES[dish.recipe], tip = customer.remaining > customer.max / 2 ? Math.min(5, Math.floor(shift.combo / 3) + 1) : 0;
        shift.revenue += r.price; shift.tips += tip; shift.xp += r.xp;
        emit('serve', { recipe: dish.recipe, amount: r.price + tip, combo: shift.combo });
        if (shift.next === shift.plan.orders.length && shift.customers.length === 0) finish('orders-complete');
        return success({ tip });
      },
      discard(id) {
        if (!active()) return fail('phase');
        const dish = shift.tray.find(d => d.id === id); if (!dish) return fail('empty');
        shift.waste += recipeCost(dish.recipe); shift.tray = shift.tray.filter(d => d !== dish); emit('waste'); return success();
      },
      step(ms) {
        if (!active() || !Number.isFinite(ms) || ms <= 0 || ms > 600000) return;
        carry += ms;
        while (carry >= TICK && active()) { carry -= TICK; tick(); }
      },
      pause() { if (phase !== 'playing') return fail('phase'); phase = 'paused'; return success(); },
      resume() { if (phase !== 'paused') return fail('phase'); phase = 'playing'; return success(); },
      end() { if (!['playing', 'paused'].includes(phase)) return fail('phase'); finish('ended'); return success(); },
      next() { if (phase !== 'result') return fail('phase'); phase = 'prep'; shift = null; result = null; return success(); },
      serialize() {
        return clone({ version: VERSION, profile: p, phase, shift: ['playing', 'paused'].includes(phase) ? shift : null,
          result: phase === 'result' ? result : null, carry });
      },
      _restore(data) { phase = data.phase; shift = clone(data.shift); result = clone(data.result); carry = data.carry || 0; }
    };
    return api;
  }
  function validShift(s, p) {
    if (!s || !validStock(s.stock) || JSON.stringify(s.plan) !== JSON.stringify(makePlan(p)) || !int(s.elapsed, 0, s.plan.duration + s.plan.grace) ||
      !int(s.next, 1, s.plan.orders.length) || !int(s.serial, 1, 10000) || !Array.isArray(s.jobs) || s.jobs.length !== 2 ||
      !Array.isArray(s.tray) || s.tray.length > 4 || !Array.isArray(s.customers) || s.customers.length > (p.upgrades.extraChair ? 4 : 2)) return false;
    if (!['served', 'missed', 'combo', 'revenue', 'tips', 'xp', 'usedCost', 'waste'].every(k => int(s[k], 0, MAX_COINS)) ||
      s.served + s.missed + s.customers.length !== s.next || s.served > s.plan.orders.length || s.combo > s.served || typeof s.rainNotified !== 'boolean') return false;
    const ids = new Set(), seats = new Set();
    for (const c of s.customers) {
      if (!c || typeof c !== 'object') return false;
      const order = s.plan.orders[c.id - 1];
      if (!int(c.id, 1, s.next) || ids.has(c.id) || !int(c.seat, 0, p.upgrades.extraChair ? 3 : 1) || seats.has(c.seat) ||
        !order || c.recipe !== order.recipe || c.person !== order.person || c.max !== CUSTOMERS[c.person].patience - s.plan.stage * 1500 ||
        !Number.isFinite(c.remaining) || c.remaining <= 0 || c.remaining > c.max) return false;
      ids.add(c.id); seats.add(c.seat);
    }
    ids.clear();
    for (const d of s.jobs.concat(s.tray).filter(Boolean)) {
      if (!int(d.id, 1, s.serial - 1) || ids.has(d.id) || !p.menu.includes(d.recipe) || !int(d.total, 1, 6500) ||
        d.total !== Math.ceil(RECIPES[d.recipe].time * (p.upgrades.fastStove ? 0.6 : 1) / TICK) * TICK ||
        !int(d.remaining, 0, d.total) || !int(d.age, 0, p.upgrades.cooler ? 59999 : 29999)) return false;
      ids.add(d.id);
    }
    if (s.jobs.some(d => d !== null && (!d || typeof d !== 'object'))) return false;
    if (s.tray.some(d => !d || d.remaining !== 0)) return false;
    if (s.jobs.concat(s.tray).filter(Boolean).reduce((sum, d) => sum + recipeCost(d.recipe), 0) + s.waste > s.usedCost) return false;
    // Counter bounds and stock accounting reject damaged snapshots, not a promise of anti-cheat.
    const used = Object.keys(INGREDIENTS).reduce((sum, k) => sum + (p.inventory[k] - s.stock[k]) * INGREDIENTS[k].price, 0);
    return Object.keys(INGREDIENTS).every(k => s.stock[k] <= p.inventory[k]) && s.usedCost === used &&
      s.waste <= s.usedCost && s.revenue <= s.served * 65 && s.tips <= s.served * 5 && s.xp <= s.served * 38;
  }
  function restore(data) {
    if (!data || data.version !== VERSION || !validProfile(data.profile) || !['prep', 'playing', 'paused', 'result'].includes(data.phase)) return null;
    const model = create({ profile: data.profile });
    if (['playing', 'paused'].includes(data.phase)) {
      if (!validShift(data.shift, data.profile) || !Number.isFinite(data.carry) || data.carry < 0 || data.carry >= TICK) return null;
      model._restore({ phase: 'paused', shift: data.shift, result: null, carry: data.carry });
    }
    // Settled results never replay rewards on reload. Return to prep with the persistent receipt.
    return model;
  }
  return { VERSION, TICK, INGREDIENTS, RECIPES, STAGES, UPGRADES, CUSTOMERS, stageFor, xpNeeded, recipeCost, create, restore, migrate, validProfile, makePlan, requiredStock };
});

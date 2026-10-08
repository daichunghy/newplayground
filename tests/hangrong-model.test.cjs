// Pure simulation tests. No browser rendering, timing, or device claims.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/hangrong-model.js');
const profile = (level = 1, extra = {}) => ({ ...M.create().view().profile, level, tutorial: true, ...extra });
function ready(p) { const m = M.create(p ? { profile: p } : {}); m.restock(); assert.ok(m.begin().ok); return m; }
function cookServe(m, id) {
  const c = m.view().shift.customers.find(c => !id || c.recipe === id);
  assert.ok(c, 'customer present');
  const cooked = m.cook(c.recipe); assert.ok(cooked.ok);
  m.step(M.RECIPES[c.recipe].time); const dish = m.collect(cooked.slot); assert.ok(dish.ok);
  assert.ok(m.serve(dish.id, c.id).ok);
}
// A deterministic immediate-action player; never pre-cooks speculative orders.
function play(m, target = Infinity) {
  let ticks = 0;
  while (m.view().phase === 'playing' && ticks++ < 4000) {
    let s = m.view().shift;
    for (const d of s.tray) {
      const c = m.view().shift.customers.find(c => c.recipe === d.recipe);
      if (c && m.view().shift.served < target) m.serve(d.id, c.id);
    }
    if (m.view().phase !== 'playing') break;
    s = m.view().shift;
    for (let i = 0; i < 2; i++) if (s.jobs[i]?.remaining === 0) m.collect(i);
    s = m.view().shift;
    const pending = s.jobs.concat(s.tray).filter(Boolean).map(d => d.recipe);
    for (const c of s.customers) {
      const i = pending.indexOf(c.recipe);
      if (i >= 0) pending.splice(i, 1);
      else if (s.served + s.jobs.filter(Boolean).length + s.tray.length < target) m.cook(c.recipe);
    }
    m.step(50);
  }
  assert.equal(m.view().phase, 'result', `shift must terminate in <=200 seconds, ticks=${ticks}`);
  return m.view().result;
}

test('five exact stage thresholds, including corrupted legacy stageIndex', () => {
  for (const [level, index] of [[1, 0], [3, 0], [4, 1], [7, 1], [8, 2], [14, 2], [15, 3], [24, 3], [25, 4], [99, 4]]) {
    assert.equal(M.stageFor(level), index);
    const p = M.migrate({ level, exp: 0, coins: 372, reputation: 23, stageIndex: 99, inventory: {}, upgrades: { fastStove: true } });
    const m = M.create({ profile: p }); assert.equal(m.view().stageIndex, index); assert.equal(m.view().profile.coins, 372);
    assert.equal(m.view().profile.upgrades.fastStove, true);
  }
});

test('all ten recipes have real positive-cost ingredients and positive unit margins', () => {
  assert.equal(Object.keys(M.RECIPES).length, 10);
  for (const [id, r] of Object.entries(M.RECIPES)) {
    assert.ok(Object.keys(r.requires).length > 0, id);
    for (const [k, n] of Object.entries(r.requires)) { assert.ok(M.INGREDIENTS[k], `${id}/${k}`); assert.ok(n > 0); }
    assert.ok(M.recipeCost(id) > 0); assert.ok(M.recipeCost(id) < r.price);
  }
  assert.equal(M.RECIPES.tra_da.requires.milk, undefined, 'iced tea is not milk tea');
  assert.deepEqual(Object.keys(M.RECIPES.keo_lac.requires), ['peanut', 'sugar']);
});

test('menu rejects locked/invalid/repeated entries and maintains one to three dishes', () => {
  const m = M.create();
  assert.equal(m.menu('lau_ly').reason, 'locked'); assert.equal(m.menu('__proto__').reason, 'locked');
  assert.ok(m.menu('keo_lac').ok); assert.ok(m.menu('tra_da').ok); assert.equal(m.menu('banhmi_trung').reason, 'last-recipe');
  assert.equal(m.view().profile.menu.length, 1);
  const high = M.create({ profile: profile(25) }); assert.equal(high.menu('lau_ly').reason, 'menu-full');
  assert.ok(high.menu('keo_lac').ok); assert.ok(high.menu('lau_ly').ok);
  high.restock(); high.begin(); assert.equal(high.menu('tra_da').reason, 'phase');
});

test('stock forecast exactly covers the finite menu; restock is atomic and idempotent', () => {
  for (const level of [1, 4, 8, 15, 25]) {
    const p = profile(level); p.inventory = Object.fromEntries(Object.keys(M.INGREDIENTS).map(k => [k, 0]));
    p.menu = Object.keys(M.RECIPES).filter(id => M.RECIPES[id].level <= level).slice(-3);
    const m = M.create({ profile: p }); assert.equal(m.begin().reason, 'stock');
    const q = m.view().supply; assert.deepEqual(q.missing, M.requiredStock(m.view().plan));
    assert.ok(m.restock().ok); assert.equal(m.view().supply.cost, 0);
    const after = m.serialize(); m.restock(); assert.deepEqual(m.serialize(), after);
    assert.ok(m.begin().ok); assert.equal(m.restock().reason, 'phase');
    assert.equal(play(m).served, m.view().result.total, `all planned recipes cookable at level ${level}`);
  }
});

test('zero coins, empty inventory and failed shifts never permanently block a new shift', () => {
  let p = profile(); p.coins = 0; for (const k in p.inventory) p.inventory[k] = 0;
  const m = M.create({ profile: p }); const grant = m.restock(); assert.ok(grant.assistance > 0); assert.equal(m.view().profile.coins, 0);
  for (let i = 0; i < 5; i++) { assert.ok(m.begin().ok); m.step(200000); assert.equal(m.view().phase, 'result'); assert.equal(m.view().result.won, false); m.next(); m.restock(); }
  m.begin(); const r = play(m); assert.ok(r.won); assert.ok(m.view().profile.coins > 0);
});

test('tutorial freezes only shift/patience; cooking works and first service releases clock', () => {
  const m = ready(); const first = m.view().shift.customers[0];
  m.step(100000); assert.equal(m.view().shift.elapsed, 0); assert.equal(m.view().shift.customers[0].remaining, first.remaining);
  cookServe(m); m.step(50); assert.equal(m.view().shift.elapsed, 50);
  m.end(); assert.equal(m.view().profile.tutorial, true);
});

test('wrong service, premature collection, double collection and repeated serving are safe', () => {
  const m = ready(); const customer = m.view().shift.customers[0]; const wrongId = m.view().profile.menu.find(id => id !== customer.recipe);
  const job = m.cook(wrongId); assert.equal(m.collect(job.slot).reason, 'cooking'); m.step(6000);
  const dish = m.collect(job.slot); assert.ok(dish.ok); assert.equal(m.collect(job.slot).reason, 'empty');
  const before = m.serialize(); assert.equal(m.serve(dish.id, customer.id).reason, 'wrong'); assert.deepEqual(m.serialize(), before);
  cookServe(m); assert.equal(m.serve(dish.id, customer.id).reason, 'empty');
});

test('two stations and four tray slots cannot overfill, stock is consumed once per cook', () => {
  const p = profile(); for (const k in p.inventory) p.inventory[k] = 40;
  const m = ready(p);
  for (let n = 0; n < 2; n++) {
    assert.ok(m.cook('tra_da').ok); assert.ok(m.cook('tra_da').ok); assert.equal(m.cook('tra_da').reason, 'busy');
    m.step(2500); assert.ok(m.collect(0).ok); assert.ok(m.collect(1).ok);
  }
  assert.equal(m.view().shift.tray.length, 4); m.cook('tra_da'); m.step(2500);
  assert.equal(m.collect(0).reason, 'tray-full'); assert.equal(m.view().shift.stock.tea, 35);
  const dish = m.view().shift.tray[0]; m.discard(dish.id); assert.equal(m.discard(dish.id).reason, 'empty');
  assert.ok(m.collect(0).ok); assert.equal(m.view().shift.tray.length, 4); assert.equal(m.view().shift.waste, 2);
});

test('shelf life counts ready station and tray time continuously, cooler doubles it', () => {
  for (const cooler of [false, true]) {
    const p = profile(1, { tutorial: false }); p.upgrades.cooler = cooler;
    const m = ready(p); m.cook('tra_da'); m.step(2500); m.step(10000); m.collect(0);
    const age = m.view().shift.tray[0].age; assert.equal(age, 10000);
    m.step((cooler ? 60000 : 30000) - 10000 - 50); assert.equal(m.view().shift.tray.length, 1);
    m.step(50); assert.equal(m.view().shift.tray.length, 0); assert.equal(m.view().shift.waste, 2);
  }
});

test('delta chunking is deterministic; pause discards hidden time; snapshots are detached', () => {
  const a = ready(profile(8)), b = ready(profile(8)); a.cook('banhmi_trung'); b.cook('banhmi_trung');
  a.step(7137); for (const n of [33, 17, 1250, 2, 2500, 2000, 1335]) b.step(n);
  assert.deepEqual(a.serialize(), b.serialize());
  a.pause(); const paused = a.serialize(); a.step(99999); assert.deepEqual(a.serialize(), paused);
  a.resume(); a.step(50); assert.equal(a.view().shift.elapsed, paused.shift.elapsed + 50);
  const v = a.view(); v.profile.coins = -100; assert.notEqual(a.view().profile.coins, -100);
  a.step(NaN); a.step(-1); a.step(Infinity); a.step(700000); assert.ok(Number.isFinite(a.view().shift.elapsed));
});

test('customer types, seat caps and published rain/umbrella effect are deterministic', () => {
  const a = ready(profile(8, { shifts: 2 })), p = profile(8, { shifts: 2 }); p.upgrades.umbrella = true;
  const b = ready(p); const rainAt = a.view().plan.rainAt;
  a.step(rainAt); b.step(rainAt);
  const aa = a.view().shift.customers, bb = b.view().shift.customers;
  assert.ok(aa.length <= 2); assert.ok(bb.length <= 2);
  const pair = aa.map(c => [c, bb.find(x => x.id === c.id)]).find(pair => pair[1]);
  assert.ok(pair); assert.equal(pair[1].remaining - pair[0].remaining, 25);
  const p4 = profile(); p4.upgrades.extraChair = true; const four = ready(p4); four.step(20000);
  assert.equal(four.view().shift.customers.length, 4);
});

test('all five upgrades affect their documented mechanics and cannot be bought twice', () => {
  const p = profile(25, { coins: 5000 }); const m = M.create({ profile: p }); const before = m.view().plan.orders.length;
  for (const id of Object.keys(M.UPGRADES)) { assert.ok(m.buy(id).ok); assert.equal(m.buy(id).reason, 'owned'); }
  assert.equal(m.view().plan.orders.length, before + 2); m.restock(); m.begin(); m.cook('banhmi_trung');
  assert.equal(m.view().shift.jobs[0].total, 2700); assert.equal(m.buy('extraChair').reason, 'phase');
  const poor = M.create({ profile: profile(1, { coins: 0 }) }); assert.equal(poor.buy('fastStove').reason, 'money'); assert.equal(poor.buy('__proto__').reason, 'invalid');
});

test('perfect shift settles cost/profit, rewards, XP and result exactly once', () => {
  const m = ready(), startCoins = m.view().profile.coins; const r = play(m);
  assert.equal(r.stars, 3); assert.equal(r.waste, 0); assert.equal(r.profit, r.revenue + r.tips - r.ingredientCost);
  assert.equal(m.view().profile.coins, startCoins + r.revenue + r.tips + r.bonus + r.levelBonus);
  assert.equal(m.view().profile.shifts, 1); assert.equal(m.view().profile.wins, 1);
  const saved = m.serialize(); m.end(); m.step(99999); assert.deepEqual(m.serialize(), saved);
  const restored = M.restore(saved); assert.equal(restored.view().phase, 'prep'); assert.equal(restored.view().profile.coins, m.view().profile.coins);
});

test('one/two/three-star service thresholds and failed result are explicit', () => {
  for (const [served, stars] of [[0, 0], [4, 0], [5, 1], [7, 2], [8, 3]]) {
    const m = ready(profile()); const result = play(m, served); assert.equal(result.stars, stars, `served ${served}`);
    assert.equal(result.served, served); assert.equal(result.missed, result.total - served);
  }
});

test('early finish accounts for all future orders and all leftover cooked/in-progress cost', () => {
  const m = ready(); m.cook('banhmi_trung'); m.cook('tra_da'); m.step(2500); m.collect(1);
  m.pause(); assert.ok(m.end().ok); const r = m.view().result;
  assert.equal(r.missed, 8); assert.equal(r.waste, 9); assert.equal(r.ingredientCost, 9); assert.equal(r.profit, -9);
  assert.equal(m.view().profile.inventory.tea, 7); assert.ok(m.next().ok); m.restock(); assert.ok(m.begin().ok);
});

test('active save round-trips paused, resumes exactly, and rejects damaged snapshots', () => {
  const a = ready(profile(4)); a.cook('banhmi_trung'); a.step(2137);
  const snapshot = a.serialize(), b = M.restore(snapshot); assert.ok(b); assert.equal(b.view().phase, 'paused');
  b.resume(); assert.deepEqual(a.serialize(), b.serialize()); a.step(6500); b.step(6500); assert.deepEqual(a.serialize(), b.serialize());
  const edits = [d => d.version = 88, d => d.profile.level = -1, d => d.profile.coins = Infinity, d => d.profile.menu = ['__proto__'],
    d => d.profile.inventory.tea = -1, d => d.shift.stock.tea++, d => d.shift.plan.quota = 1, d => d.shift.jobs[0].remaining = -1,
    d => d.shift.customers[0].person = 88, d => d.shift.served = 99, d => d.shift.revenue = 999999, d => d.shift.usedCost = 0,
    d => d.phase = 'unknown', d => d.carry = -1, d => d.shift.tray = [null]];
  for (const edit of edits) { const d = structuredClone(snapshot); edit(d); assert.equal(M.restore(d), null, String(edit)); }
});

test('v2 migration preserves legitimate balances, inventory and upgrades without source mutation', () => {
  const old = { level: 15, coins: 9000, exp: 90, expNeeded: 300, reputation: 46, stageIndex: 0,
    inventory: { bread: 42, egg_pate: 18, skewer: 11, sugarcane: 10, tea_milk: 9, ricepaper: 7, sausage: 3 }, upgrades: { cooler: true, fastStove: true, speaker: true } };
  const before = JSON.stringify(old), p = M.migrate(old); assert.equal(JSON.stringify(old), before);
  const large = M.migrate({ ...old, coins: 123456789, inventory: { ...old.inventory, bread: 54321 } });
  assert.equal(large.coins, 123456789); assert.equal(large.inventory.bread, 54321); assert.ok(M.validProfile(large));
  assert.equal(p.coins, 9000); assert.equal(p.level, 15); assert.equal(p.inventory.bread, 42); assert.equal(p.inventory.tea, 9); assert.equal(p.inventory.milk, 9);
  assert.equal(p.xp, Math.floor(.3 * M.xpNeeded(15))); assert.ok(M.validProfile(p));
  assert.equal(M.migrate({ level: '15', coins: 10 }), null); assert.equal(M.migrate({ level: 1, coins: -5 }), null);
});

test('all stages are reachable under bounded XP growth in an automated full progression', () => {
  const m = M.create(); let shifts = 0; const stages = new Set([0]);
  while (m.view().profile.level < 25 && shifts++ < 100) {
    const p = m.view().profile, desired = Object.keys(M.RECIPES).filter(id => M.RECIPES[id].level <= p.level).slice(-3);
    // Change the menu while keeping at least one current dish until a replacement fits.
    for (const id of [...p.menu]) if (!desired.includes(id) && m.view().profile.menu.length > 1) m.menu(id);
    for (const id of desired) { if (m.view().profile.menu.length === 3 && !m.view().profile.menu.includes(id)) m.menu(m.view().profile.menu.find(x => !desired.includes(x))); if (!m.view().profile.menu.includes(id)) m.menu(id); }
    for (const id of Object.keys(M.UPGRADES)) if (!m.view().profile.upgrades[id] && m.view().profile.coins >= M.UPGRADES[id].cost) m.buy(id);
    m.restock(); m.begin(); const r = play(m); assert.ok(r.won, `shift ${shifts}`); stages.add(m.view().stageIndex); m.next();
  }
  assert.ok(m.view().profile.level >= 25); assert.deepEqual([...stages], [0, 1, 2, 3, 4]);
  console.log(`Progression simulation: level ${m.view().profile.level} in ${shifts} perfect-action shifts; this is not human playtime.`);
});

test('malformed nested customer/dish/stock structures fail closed without throwing', () => {
  const m = ready(profile()); m.cook('banhmi_trung'); const source = m.serialize();
  for (const value of [null, false, true, 3, 'bad', [], {}]) {
    for (const field of ['customers', 'jobs', 'tray']) {
      const bad = structuredClone(source);
      if (field === 'jobs') { bad.shift.jobs = [value, null]; if (value === null) continue; }
      else bad.shift[field] = [value];
      assert.doesNotThrow(() => M.restore(bad), `${field}/${JSON.stringify(value)}`);
      assert.equal(M.restore(bad), null, `${field}/${JSON.stringify(value)}`);
    }
  }
});

test('all one-to-three recipe menus at every unlock have affordable positive-margin supply plans', () => {
  let checked = 0;
  for (const level of [1, 4, 8, 15, 25]) {
    const recipes = Object.keys(M.RECIPES).filter(id => M.RECIPES[id].level <= level);
    for (let mask = 1; mask < 1 << recipes.length; mask++) {
      const menu = recipes.filter((_, i) => mask & (1 << i)); if (menu.length > 3) continue;
      for (const speaker of [false, true]) {
        const p = profile(level, { menu, coins: 0 }); p.upgrades.speaker = speaker;
        for (const k in p.inventory) p.inventory[k] = 0;
        const m = M.create({ profile: p }), v = m.view(), cost = v.supply.cost;
        assert.ok(v.plan.orders.every(o => menu.includes(o.recipe)));
        assert.ok(v.plan.orders.reduce((sum, o) => sum + M.RECIPES[o.recipe].price, 0) > cost);
        m.restock(); assert.equal(m.view().supply.cost, 0); assert.ok(m.begin().ok); checked++;
      }
    }
  }
  assert.equal(checked, 980);
});

test('automatic single-dish supply recovers exhausted active stock and preserves snapshot accounting', () => {
  const m = ready(); const source = m.serialize();
  source.shift.stock.bread = 0; source.shift.stock.egg_pate = 0;
  source.shift.usedCost = source.profile.inventory.bread * 4 + source.profile.inventory.egg_pate * 3; source.shift.waste = source.shift.usedCost;
  source.profile.coins = 0; const recovered = M.restore(source); assert.ok(recovered); recovered.resume();
  assert.equal(recovered.ensureIngredients('lau_ly').reason, 'recipe');
  assert.ok(recovered.ensureIngredients('banhmi_trung').ok); const snapshot = recovered.serialize();
  assert.equal(recovered.ensureIngredients('banhmi_trung').cost, 0); assert.deepEqual(recovered.serialize(), snapshot);
  assert.ok(recovered.cook('banhmi_trung').ok); assert.ok(M.restore(recovered.serialize()));
  recovered.pause(); assert.equal(recovered.ensureIngredients('banhmi_trung').reason, 'phase');
});

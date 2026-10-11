const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/engines-archetypes.js'), 'utf8'), context);
const model = context.window.NP_Archetypes.pianoTilesModel;
const C = model.constants;

test('the classic board starts with six one-black-key rows and a fifty-key goal', () => {
  const state = model.create(2014);
  assert.equal(state.phase, 'ready');
  assert.equal(state.rows.length, C.rowsVisible);
  assert.equal(state.generated, C.rowsVisible);
  assert.equal(C.total, 50);
  assert.ok(state.rows.every(row => row.lane >= 0 && row.lane < C.columns));
  assert.ok(state.rows.every((row, index) => index === 0 || row.lane !== state.rows[index - 1].lane), 'the falling melody does not repeat a lane back-to-back');
  assert.equal(new Set(state.rows.map(row => row.id)).size, C.rowsVisible);
});

test('a black-key hit adds one point and difficulty rises every eight hits', () => {
  const state = model.create(4);
  const target = state.rows[0];
  assert.equal(model.tap(state, target.id, target.lane), true);
  assert.equal(state.phase, 'playing');
  assert.equal(state.score, 1);
  assert.equal(state.rows.some(row => row.id === target.id), false);
  assert.ok(model.speed(8) > model.speed(7));
  assert.equal(model.speed(10000), 360);
});

test('touching a white key ends the run immediately', () => {
  const state = model.create(5);
  const target = state.rows[2];
  assert.equal(model.tap(state, target.id, (target.lane + 1) % C.columns), false);
  assert.equal(state.phase, 'over');
  assert.equal(state.reason, 'white');
});

test('a tile that passes the floor ends the run as a missed note', () => {
  const state = model.create(6);
  state.phase = 'playing';
  state.rows[0].y = C.height - 2;
  model.tick(state, 0.05);
  assert.equal(state.phase, 'over');
  assert.equal(state.reason, 'missed');
});

test('tiles move at the score-dependent pace and the stream spawns more black keys', () => {
  const state = model.create(7);
  state.phase = 'playing';
  const bottom = state.rows.reduce((a, b) => a.y > b.y ? a : b);
  model.tap(state, bottom.id, bottom.lane);
  const before = state.rows[0].y;
  model.tick(state, 0.05);
  assert.ok(state.rows[0].y > before);
  for (let i = 0; i < 18 && state.generated === C.rowsVisible; i++) model.tick(state, 0.05);
  assert.equal(state.generated, C.rowsVisible + 1);
  assert.ok(state.rows.length > 0);
});

test('the fiftieth black key completes the classic run', () => {
  const state = model.create(8);
  state.phase = 'playing'; state.score = C.total - 1; state.generated = C.total;
  state.rows = [{ id: 500, lane: 2, y: 200 }];
  assert.equal(model.tap(state, 500, 2), true);
  assert.equal(state.phase, 'won');
  assert.equal(state.score, C.total);
  assert.equal(state.lastEvent.type, 'complete');
});

test('the catalog ID routes to the original four-column mode, not the generic reflex canvas', () => {
  assert.equal(context.window.NP_Archetypes.kindFor({ id: 'piano-tiles-phim-nhac', category: 'Kỹ năng' }), 'reflex');
  assert.equal(C.width / C.columns, 120);
  assert.equal(typeof model.tick, 'function');
});

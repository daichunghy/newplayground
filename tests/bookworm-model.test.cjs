const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../scripts/games/bookworm-model.js');

test('the three authored shelves open as a fixed-size hex board with a guaranteed first word', () => {
  for (const [seed, opening] of [[1, 'SHELF'], [7, 'GARDEN'], [99, 'LIBRARY']]) {
    const game = M.create({ seed });
    const view = game.view();
    assert.equal(view.rows, 6); assert.equal(view.cols, 6); assert.equal(view.board.length, 36);
    const route = M.LEVELS[0].path;
    assert.equal(route.map(index => view.board[index]).join(''), 'SHELF');
    assert.equal(view.stageIndex, 0); assert.equal(view.status, 'playing');
    assert.ok(view.fire.index >= 0 && view.fire.index < 36);
    assert.equal(game.isWord(opening), true);
  }
  assert.deepEqual(M.LEVELS.map(level => level.goal), [42, 68, 92]);
  assert.ok(M.WORDS.length < 1500, 'accepted words stay in a bounded offline set');
});

test('odd-row hex neighbors are symmetric, bounded, and distinguish from diagonal squares', () => {
  for (let index = 0; index < M.TILE_COUNT; index++) {
    const next = M.neighbors(index);
    assert.ok(next.length <= 6);
    assert.equal(new Set(next).size, next.length);
    for (const neighbor of next) assert.ok(M.neighbors(neighbor).includes(index));
  }
  assert.deepEqual(M.neighbors(-1), []);
  assert.deepEqual(M.neighbors(36), []);
  assert.equal(M.neighbors(0).includes(7), false);
  assert.equal(M.neighbors(0).includes(6), true);
});

test('a word needs unique adjacent letters and a listed word; invalid paths do not spend a turn', () => {
  const game = M.create({ seed: 1 }), before = game.view();
  assert.equal(M.pathIsValid([0, 1, 2, 3, 4], before.board), true);
  assert.equal(M.pathIsValid([0, 1, 2, 3, 5], before.board), false);
  assert.equal(M.pathIsValid([0, 1, 2, 1], before.board), false);
  assert.equal(M.pathIsValid([0, 1], before.board), false);
  assert.equal(M.pathIsValid([1, 2, 3], before.board), false);
  assert.equal(game.submit([0, 1, 2, 3, 5]).reason, 'invalid-word');
  assert.equal(game.submit([1, 2, 3]).reason, 'invalid-word');
  assert.equal(game.view().turns, before.turns);
  assert.deepEqual(game.view().board, before.board);
});

test('accepted words clear selected tiles, settle letters down their columns, score by length, and advance sparks', () => {
  const game = M.create({ seed: 1 }), opening = M.LEVELS[0].path.slice();
  const fireAtStart = game.view().fire.index;
  const first = game.submit(opening);
  assert.equal(first.ok, true); assert.equal(first.word, 'SHELF'); assert.equal(first.points, 25);
  assert.equal(first.doused, false);
  assert.equal(game.view().score, 25); assert.equal(game.view().turns, 1);
  assert.ok(game.view().board.every(letter => typeof letter === 'string'));
  assert.equal(game.view().fire.index, fireAtStart);
  assert.equal(game.view().fire.beatsLeft, 1);

  const next = M.create({ seed: 1 }), route = next.hint(), fireIndex = next.view().fire.index;
  assert.ok(route.includes(fireIndex));
  const result = next.submit(route);
  assert.equal(result.ok, true); assert.equal(result.doused, true);
  assert.equal(result.points, result.word.length ** 2 + M.FIRE_BONUS);
  assert.equal(next.view().fire.row, 0);
  assert.notEqual(next.view().fire.index, fireIndex);
});

test('bounded shelf goals advance in order, final clear wins, and terminal play rejects more words', () => {
  const game = M.create({ seed: 3 });
  let guard = 0;
  while (game.view().stageIndex === 0 && guard++ < 12) {
    const route = game.hint(); assert.ok(route);
    game.submit(route);
  }
  assert.equal(game.view().stageIndex, 1);
  assert.equal(game.view().score, 0); assert.equal(game.view().turns, 0);
  assert.equal(game.view().board.slice(0, 6).join(''), 'GARDEN');

  while (game.view().status === 'playing' && guard++ < 36) {
    const route = game.hint(); assert.ok(route);
    game.submit(route);
  }
  const final = game.view();
  assert.equal(final.status, 'won'); assert.equal(final.stageIndex, 2);
  assert.ok(final.totalScore >= 42 + 68 + 92);
  const terminal = game.submit(game.hint() || []);
  assert.deepEqual(terminal, { ok: false, reason: 'won' });
});

test('the descending fire and turn ceiling produce a reachable loss state', () => {
  const dictionary = new Set(M.WORDS);
  const shortestSafeWord = view => {
    let best = null; const path = [], used = new Set();
    const walk = (index, word) => {
      path.push(index); used.add(index);
      if (word.length >= 3 && dictionary.has(word) && !path.includes(view.fire.index) && (!best || word.length < best.length)) best = path.slice();
      if (word.length < 7 && (!best || word.length < best.length)) {
        for (const next of M.neighbors(index)) if (!used.has(next)) walk(next, word + view.board[next]);
      }
      used.delete(index); path.pop();
    };
    for (let i = 0; i < M.TILE_COUNT; i++) if (view.board[i]) walk(i, view.board[i]);
    return best;
  };
  const game = M.create({ seed: 1 });
  for (let count = 0; count < 12 && game.view().status === 'playing'; count++) {
    const route = shortestSafeWord(game.view()); assert.ok(route, `safe word on turn ${count + 1}`);
    assert.equal(game.submit(route).doused, false);
  }
  assert.equal(game.view().status, 'lost');
  assert.ok(game.view().turns <= game.view().turnLimit);
});

test('CommonJS and browser-global builds expose the same deterministic rules without DOM APIs', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/games/bookworm-model.js'), 'utf8');
  const window = {}; const context = vm.createContext({ window });
  vm.runInContext(source, context);
  assert.equal(typeof window.NP_BookwormModel.create, 'function');
  assert.deepEqual(Array.from(window.NP_BookwormModel.create({ seed: 5 }).view().board), M.create({ seed: 5 }).view().board);
});

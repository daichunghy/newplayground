const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/ke-sach-ky-uc-model.js');

function solveCurrent(model, answer) {
  let view = model.view();
  for (let target = 0; target < answer.length; target++) {
    while (view.order.indexOf(answer[target]) > target) {
      assert.equal(model.move(answer[target], -1).accepted, true);
      view = model.view();
    }
  }
  return model.view();
}

function adjacentDistance(order, answer) {
  const rank = new Map(answer.map((id, index) => [id, index]));
  let distance = 0;
  for (let left = 0; left < order.length; left++) {
    for (let right = left + 1; right < order.length; right++) {
      if (rank.get(order[left]) > rank.get(order[right])) distance++;
    }
  }
  return distance;
}

test('all three authored clue boards have one and only one solution', () => {
  assert.deepEqual(M.STAGES.map(stage => stage.books.length), [5, 6, 7]);
  for (let index = 0; index < M.STAGES.length; index++) {
    const stage = M.STAGES[index], solutions = M.solutionsForStage(index);
    assert.equal(solutions.length, 1, `${stage.name} must have exactly one satisfying order`);
    assert.deepEqual(solutions[0], stage.answer);
    assert.equal(new Set(stage.books).size, stage.books.length);
    assert.ok(stage.clues.every(clue => typeof clue.text === 'string' && clue.text.length < 90));
    assert.ok(stage.clues.every(clue => !('answer' in clue)));
  }
  assert.equal(new Set(M.BOOKS.map(book => book.title)).size, M.BOOKS.length);
  assert.ok(M.BOOKS.every(book => book.title.length > 2 && !/\b(Harry Potter|Hunger Games|Lord of the Rings)\b/i.test(book.title)));
});

test('seeded campaigns are repeatable, visibly scrambled, and every stage has a constructive route within budget', () => {
  for (const seed of [1, 7, 17, 2026, 0x4b534b55, 0xffffffff]) {
    const a = M.create({ seed }), b = M.create({ seed });
    assert.deepEqual(a.view().order, b.view().order);
    for (let index = 0; index < M.STAGES.length; index++) {
      const stage = M.STAGES[index], view = a.view();
      assert.notDeepEqual(view.order, stage.answer, `${stage.name} starts unsolved`);
      const solved = solveCurrent(a, stage.answer);
      assert.ok(solved.moves <= stage.budget, `${stage.name} route fits its cap`);
      assert.ok(['stage-clear', 'won'].includes(solved.status));
      if (index < M.STAGES.length - 1) assert.equal(a.nextStage(), true);
    }
    assert.equal(a.view().status, 'won');
  }
  assert.notDeepEqual(M.create({ seed: 1 }).view().order, M.create({ seed: 2 }).view().order);
});

test('each stage starts exactly its advertised adjacent moves from its unique answer', () => {
  for (let seed = 1; seed <= 32; seed++) {
    const model = M.create({ seed });
    for (let index = 0; index < M.STAGES.length; index++) {
      const stage = M.STAGES[index], view = model.view();
      assert.equal(adjacentDistance(view.order, stage.answer), stage.scramble, `${stage.name}, seed ${seed}`);
      assert.ok(stage.scramble < stage.budget);
      solveCurrent(model, stage.answer);
      if (index < M.STAGES.length - 1) assert.equal(model.nextStage(), true);
    }
  }
});

test('the view reports which clues currently match without exposing the answer', () => {
  const model = M.create({ seed: 817 }), view = model.view(), stage = M.STAGES[view.stageIndex];
  assert.deepEqual(view.clues.map(clue => clue.satisfied), stage.clues.map(clue => M.clueSatisfied(clue, view.order)));
  assert.ok(view.clues.every(clue => !('answer' in clue)));
});

test('a move shifts one book to its adjacent slot and invalid, edge, and terminal moves do nothing', () => {
  const model = M.create({ seed: 27 }), start = model.view();
  const first = start.order[0], second = start.order[1];
  const unchanged = model.view();
  assert.equal(model.move(first, -1).accepted, false);
  assert.deepEqual(model.view(), unchanged);
  assert.equal(model.move('not-a-book', 1).accepted, false);
  assert.equal(model.move(first, 1).accepted, true);
  const shifted = model.view();
  assert.deepEqual(shifted.order.slice(0, 2), [second, first]);
  assert.equal(shifted.moves, 1);
  assert.equal(model.move(first, 0).accepted, false);
  assert.equal(model.move(first, 1.5).accepted, false);
});

test('pause freezes actions, resume restores play, and restart replays the same campaign seed', () => {
  const model = M.create({ seed: 808 }), initial = model.view();
  assert.equal(model.pause(), true);
  assert.equal(model.view().status, 'paused');
  const paused = model.view();
  assert.equal(model.move(initial.order[0], 1).accepted, false);
  assert.deepEqual(model.view(), paused);
  assert.equal(model.resume(), true);
  assert.equal(model.view().status, 'playing');
  assert.equal(model.move(initial.order[0], 1).accepted, true);
  assert.equal(model.restart(), true);
  assert.equal(model.view().status, 'playing');
  assert.equal(model.view().stageIndex, 0);
  assert.equal(model.view().moves, 0);
  assert.deepEqual(model.view().order, initial.order);
});

test('using the move budget without meeting the clues loses and blocks further play', () => {
  const model = M.create({ seed: 91 });
  const start = model.view(), stage = M.STAGES[start.stageIndex];
  let pair = null;
  for (let index = 0; index < start.order.length - 1; index++) {
    const order = start.order.slice();
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    if (!M.satisfiesClues(stage, order)) { pair = [start.order[index], start.order[index + 1]]; break; }
  }
  assert.ok(pair, 'find an adjacent toggle that remains unsolved');
  for (let move = 0; move < start.budget; move++) {
    const direction = move % 2 === 0 ? 1 : -1;
    const id = direction === 1 ? pair[0] : pair[0];
    const result = model.move(id, direction);
    assert.equal(result.accepted, true);
  }
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().moves, start.budget);
  const after = model.view();
  assert.equal(model.move(after.order[0], 1).accepted, false);
  assert.deepEqual(model.view(), after);
  assert.equal(model.nextStage(), false);
});

test('a cleared stage advances once, and the final stage cannot advance past campaign win', () => {
  const model = M.create({ seed: 122 });
  solveCurrent(model, M.STAGES[0].answer);
  assert.equal(model.view().status, 'stage-clear');
  assert.equal(model.nextStage(), true);
  assert.equal(model.view().stageIndex, 1);
  assert.equal(model.view().moves, 0);
  assert.equal(model.nextStage(), false);
  solveCurrent(model, M.STAGES[1].answer);
  assert.equal(model.nextStage(), true);
  solveCurrent(model, M.STAGES[2].answer);
  assert.equal(model.view().status, 'won');
  assert.equal(model.nextStage(), false);
});

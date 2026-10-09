const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/noi-hinh-model.js');

function turns(path) {
  let count = 0;
  let previous = null;
  for (let i = 1; i < path.length; i++) {
    const direction = [path[i].r - path[i - 1].r, path[i].c - path[i - 1].c].join(',');
    if (previous !== null && direction !== previous) count++;
    previous = direction;
  }
  return count;
}

function clearPair(game, pair) {
  assert.equal(game.tap(pair.a), true);
  assert.equal(game.tap(pair.b), true);
  return game.drain();
}

function makeStuckSave(seed = 441) {
  const game = M.create({ stage: 6, seed });
  const witness = game.view().witness;
  for (const pair of witness.slice(0, -3)) clearPair(game, pair);
  const state = game.serialize();
  const symbols = [...new Set(state.board.filter(value => value !== null))];
  assert.equal(symbols.length, 3);
  const fixture = '.BCA...AB..C.............';
  assert.equal(fixture.length, state.board.length);
  state.board = fixture.split('').map(char => char === '.' ? null : symbols[char.charCodeAt(0) - 65]);
  state.status = 'stuck';
  state.selected = null;
  assert.equal(M.legalPairs(state.board, 6).length, 0);
  assert.equal(M.validSave(state), true);
  return state;
}

test('every campaign stage deals deterministically with a bounded, verified full-clear witness', () => {
  assert.equal(M.CAMPAIGN.length, 6);
  assert.deepEqual(new Set(M.CAMPAIGN.map(stage => `${stage.rows}x${stage.cols}`)).size > 1, true);
  let sawLargeBoard = false;
  for (const stage of M.CAMPAIGN) {
    const seen = new Set();
    for (const seed of [1, 2, 3, 17, 73, 0x12345678]) {
      const first = M.makeDeal(stage.stage, seed);
      const second = M.makeDeal(stage.stage, seed);
      assert.deepEqual(first, second, `stage ${stage.stage} seed ${seed} is replayable`);
      assert.equal(first.board.length, stage.rows * stage.cols);
      assert.equal(first.board.filter(value => value !== null).length, stage.active.length);
      assert.ok(first.work <= M.MAX_GENERATION_WORK, `stage ${stage.stage} work ${first.work} stays bounded`);
      assert.ok(first.stats.attempts <= M.MAX_GENERATION_ATTEMPTS);
      assert.ok(first.stats.maxCandidateWork <= M.MAX_CANDIDATE_SOLVER_WORK);
      assert.ok(first.stats.maxCandidateStates <= M.MAX_SOLVER_STATES);
      assert.ok(first.stats.solverWork <= first.stats.attempts * M.MAX_CANDIDATE_SOLVER_WORK);
      assert.ok(first.stats.solverStates <= first.stats.attempts * M.MAX_SOLVER_STATES);
      assert.equal(M.verifyWitness(first.board, first.witness, stage.stage), true);
      assert.equal(first.witness.length, stage.active.length / 2);
      const solved = M.solveBoard(first.board, stage.stage, () => 0.375);
      assert.ok(solved.states <= M.MAX_SOLVER_STATES);
      assert.ok(solved.work <= M.MAX_CANDIDATE_SOLVER_WORK);
      if (solved.witness) assert.equal(M.verifyWitness(first.board, solved.witness, stage.stage), true);
      for (let symbol = 0; symbol < M.ICONS.length; symbol++) {
        const count = first.board.filter(value => value === symbol).length;
        assert.ok(count === 0 || count === 2);
      }
      let board = first.board.slice();
      for (const pair of first.witness) {
        const path = M.findPath(board, pair.a, pair.b, stage.stage);
        assert.ok(path, `stage ${stage.stage} witness pair has a legal route`);
        assert.ok(turns(path) <= 2);
        board[pair.a] = null;
        board[pair.b] = null;
      }
      assert.equal(board.every(value => value === null), true);
      seen.add(first.board.join(','));
    }
    assert.ok(seen.size > 1, `stage ${stage.stage} is generated from more than one arrangement`);
    if (stage.active.length > M.CELL_COUNT) sawLargeBoard = true;
  }
  assert.equal(sawLargeBoard, true, 'the 5×5 finale fits 12 pairs and the generated board is tested at its full capacity');
});

test('every embedded per-stage deal entry has a unique verified witness and stable indexed replay', () => {
  assert.equal(M.CERTIFIED_DEAL_COUNT, 64);
  for (const stage of M.CAMPAIGN) {
    const boards = new Set();
    for (let index = 0; index < M.CERTIFIED_DEAL_COUNT; index++) {
      const seed = M.seedForStage(0x4e6f6948, stage.stage, index);
      const first = M.makeDeal(stage.stage, seed, index);
      const replay = M.makeDeal(stage.stage, seed, index);
      assert.deepEqual(first, replay);
      assert.equal(first.stats.source, 'certified-template');
      assert.equal(M.validBoard(first.board, stage.stage), true);
      assert.equal(M.verifyWitness(first.board, first.witness, stage.stage), true);
      assert.equal(first.witness.length, stage.active.length / 2);
      boards.add(first.board.join(','));
    }
    assert.equal(boards.size, M.CERTIFIED_DEAL_COUNT, `stage ${stage.stage} catalog entries are distinct`);
    const wrapped = M.makeDeal(stage.stage, M.seedForStage(0x4e6f6948, stage.stage, 0), M.CERTIFIED_DEAL_COUNT);
    assert.deepEqual(wrapped.board, M.makeDeal(stage.stage, 0x4e6f6948, 0).board);
  }
});

test('bounded adjacent-pair fallback remains certified and varies across seeded deals', () => {
  for (const stage of M.CAMPAIGN) {
    let fallbackCount = 0;
    const fallbackBoards = new Set();
    for (let index = 1; index <= 200; index++) {
      const seed = (Math.imul(stage.stage, 0x9e3779b1) + index * 0x85ebca6b) >>> 0 || 1;
      const deal = M.makeSolverDeal(stage.stage, seed);
      assert.equal(M.verifyWitness(deal.board, deal.witness, stage.stage), true);
      assert.ok(deal.work <= M.MAX_GENERATION_WORK);
      assert.ok(deal.stats.maxCandidateWork <= M.MAX_CANDIDATE_SOLVER_WORK);
      if (deal.stats.fallback) {
        fallbackCount++;
        fallbackBoards.add(deal.board.join(','));
      }
    }
    assert.ok(fallbackCount > 0, `stage ${stage.stage} exercises its certified fallback`);
    assert.ok(fallbackBoards.size > 1, `stage ${stage.stage} fallback layouts vary by seed`);
  }
});

test('edge-case seeds stay inside solver, fallback, and total synchronous work bounds', () => {
  const seeds = [0, 1, 2, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff, 0xdeadbeef];
  for (const stage of M.CAMPAIGN) {
    for (const seed of seeds) {
      const deal = M.makeSolverDeal(stage.stage, seed);
      assert.equal(M.verifyWitness(deal.board, deal.witness, stage.stage), true);
      assert.ok(deal.work <= M.MAX_GENERATION_WORK);
      assert.ok(deal.stats.attempts <= M.MAX_GENERATION_ATTEMPTS);
      assert.ok(deal.stats.maxCandidateWork <= M.MAX_CANDIDATE_SOLVER_WORK);
      assert.ok(deal.stats.maxCandidateStates <= M.MAX_SOLVER_STATES);
      if (deal.stats.fallback) assert.ok(deal.stats.matchingNodes <= M.MAX_MATCHING_NODES);
    }
  }
});

test('deal indexes produce distinct deterministic seeds while retries keep the original seed', () => {
  const base = 0x3456789a;
  const firstSeed = M.seedForStage(base, 3, 0);
  const nextSeed = M.seedForStage(base, 3, 1);
  assert.notEqual(firstSeed, nextSeed);
  assert.deepEqual(M.makeDeal(3, firstSeed, 0), M.makeDeal(3, firstSeed, 0));
  assert.notDeepEqual(M.makeDeal(3, firstSeed, 0).board, M.makeDeal(3, nextSeed, 1).board);
});

test('Connect paths stay orthogonal, allow at most two turns, and may use one outside lane', () => {
  const straight = Array(M.CELL_COUNT).fill(null);
  straight[5] = 0;
  straight[9] = 0;
  const straightPath = M.findPath(straight, 5, 9, 3);
  assert.ok(straightPath);
  assert.equal(turns(straightPath), 0);

  const outside = Array(M.CELL_COUNT).fill(1);
  outside[1] = 0;
  outside[3] = 0;
  outside[2] = 2;
  for (let c = 0; c < M.COLS; c++) outside[M.COLS + c] = 3;
  const edgePath = M.findPath(outside, 1, 3, 3);
  assert.ok(edgePath);
  assert.ok(turns(edgePath) <= 2);
  assert.equal(edgePath.some(point => point.r === -1), true);

  const boxedCorners = Array(M.CELL_COUNT).fill(1);
  boxedCorners[0] = 0;
  boxedCorners[M.CELL_COUNT - 1] = 0;
  assert.equal(M.findPath(boxedCorners, 0, M.CELL_COUNT - 1, 3), null);
  assert.equal(M.findPath(boxedCorners, 0, 0, 3), null);
});

test('a legal pair clears exactly two tiles and undo restores a replayable save', () => {
  const game = M.create({ stage: 5, seed: 73 });
  const before = game.view();
  const pair = before.legalPairs[0];
  const events = clearPair(game, pair);
  const view = game.view();
  const match = events.find(event => event.kind === 'match');
  assert.ok(match);
  assert.ok(match.path.length >= 2);
  assert.ok(turns(match.path) <= 2);
  assert.equal(view.board[pair.a], null);
  assert.equal(view.board[pair.b], null);
  assert.equal(view.cleared, 1);
  assert.equal(view.moves, 1);
  assert.equal(view.board.filter(value => value !== null).length, 18);

  const restored = M.restore(game.serialize());
  assert.ok(restored);
  assert.equal(restored.undo(), true);
  assert.deepEqual(restored.view().board, before.board);
  assert.equal(restored.view().status, 'playing');
  assert.equal(restored.undo(), false);
});

test('a stuck save can only reshuffle at zero legal moves and keeps every remaining pair', () => {
  const stuck = M.restore(makeStuckSave());
  assert.ok(stuck);
  const before = stuck.view();
  const counts = before.icons.map((_, symbol) => before.board.filter(value => value === symbol).length);
  assert.equal(stuck.reshuffle(987654), true);
  const after = stuck.view();
  assert.equal(after.status, 'playing');
  assert.ok(after.legalPairs.length > 0);
  assert.deepEqual(after.icons.map((_, symbol) => after.board.filter(value => value === symbol).length), counts);
  assert.equal(after.board.filter(value => value !== null).length, before.board.filter(value => value !== null).length);
  assert.equal(M.verifyWitness(after.originBoard, after.witness, after.stage), true);
  assert.equal(M.validSave(stuck.serialize()), true);

  const active = M.create({ stage: 6, seed: 91 });
  const unchanged = active.serialize();
  assert.equal(active.reshuffle(987654), false);
  assert.deepEqual(active.serialize(), unchanged);
});

test('versioned saves and campaign progress reject malformed and future data', () => {
  const campaignSeed = 123;
  const game = M.create({ stage: 1, seed: M.seedForStage(campaignSeed, 1, 0) });
  const source = game.serialize();
  assert.equal(M.validSave(source), true);
  const progress = { version: M.PROGRESS_VERSION, campaignSeed, unlockedStage: 1, activeStage: 1,
    dealNumbers: Array(M.CAMPAIGN.length).fill(0), game: source };
  assert.equal(M.validProgress(progress), true);
  assert.equal(M.validProgress({ ...progress, activeStage: 2 }), false);
  assert.equal(M.validProgress({ ...progress, unlockedStage: 2, activeStage: 2 }), false);

  for (const edit of [
    state => { state.version = M.SAVE_VERSION + 1; },
    state => { state.seed = 0; },
    state => { state.stage = 99; },
    state => { state.moves = M.CAMPAIGN[0].active.length / 2 + 1; },
    state => { state.board[0] = 99; },
    state => { state.board.pop(); },
    state => { state.board[1] = null; },
    state => { state.status = 'won'; },
    state => { state.selected = state.board.length + 1; },
    state => { state.witness.pop(); },
    state => { state.originBoard[0] = 99; }
  ]) {
    const bad = structuredClone(source);
    edit(bad);
    const before = structuredClone(bad);
    assert.equal(M.restore(bad), null);
    assert.deepEqual(bad, before);
  }
});

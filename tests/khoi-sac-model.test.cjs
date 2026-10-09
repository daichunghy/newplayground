const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/khoi-sac-model.js');

function faceletsOf(cube) { return M.facelets(cube); }

function parse(token) {
  const match = /^([UDFBRL])([2']?)$/.exec(token);
  assert.ok(match, `valid face-turn token: ${token}`);
  return { face: match[1], turns: match[2] === "'" ? -1 : match[2] === '2' ? 2 : 1 };
}

function inverse(move) { return { face: move.face, turns: -move.turns }; }

function solveStageWitness(model) {
  const before = model.view(), scramble = model.scramble();
  const route = scramble.slice().reverse().map(inverse).concat(M.STAGES[before.stageIndex].targetSequence.map(parse));
  let used = 0;
  for (const move of route) {
    if (model.view().stageIndex !== before.stageIndex || model.view().status !== 'playing') break;
    const result = model.turn(move.face, move.turns);
    assert.equal(result.accepted, true);
    used++;
  }
  return { before, used, after: model.view() };
}

function solveCampaign(model) {
  const solvedStages = [];
  while (model.view().status === 'playing') {
    const result = solveStageWitness(model);
    solvedStages.push(result);
    assert.ok(result.after.stageIndex > result.before.stageIndex || result.after.status === 'won',
      `stage ${result.before.stage} must have a witnessed route to its target`);
    assert.ok(result.used <= result.before.moveBudget, `stage ${result.before.stage} route fits its move budget`);
  }
  return solvedStages;
}

test('the six legal quarter turns have inverses and four-turn identity; half turns equal two quarters', () => {
  const solved = M.createSolvedCube();
  assert.equal(solved.length, 24);
  assert.equal(M.isSolved(solved), true);
  for (const face of M.FACES) {
    const turned = M.applyMove(solved, face);
    assert.ok(turned);
    assert.deepEqual(faceletsOf(M.applyMove(turned, `${face}'`)), faceletsOf(solved), `${face} inverse`);
    let four = solved;
    for (let i = 0; i < 4; i++) four = M.applyMove(four, face);
    assert.deepEqual(faceletsOf(four), faceletsOf(solved), `${face} four-turn identity`);
    assert.deepEqual(faceletsOf(M.applyMove(solved, `${face}2`)),
      faceletsOf(M.applyMove(M.applyMove(solved, face), face)), `${face} half turn`);
  }
});

test('turns preserve a legal 2×2×2 sticker state and reject malformed moves', () => {
  let cube = M.createSolvedCube();
  const sequence = ['R', 'U', "F'", 'L2', 'D', "B'", 'U2', 'R'];
  cube = M.applySequence(cube, sequence);
  const faces = faceletsOf(cube);
  assert.equal(Object.keys(faces).length, 6);
  for (const face of M.FACES) assert.equal(faces[face].length, 4);
  assert.equal(cube.every(sticker => sticker.position.every(v => v === -1 || v === 1)
    && sticker.normal.filter(v => v !== 0).length === 1), true);
  assert.equal(M.applyMove(cube, 'X'), null);
  assert.equal(M.applyMove(cube, 'U3'), null);
  assert.equal(M.applyMove(cube, { face: 'U', turns: 0 }), null);
});

test('seeded starts are reproducible, differ across seeds, and never begin at the requested motif', () => {
  const first = M.create({ seed: 'harbor-17' }), replay = M.create({ seed: 'harbor-17' });
  assert.deepEqual(first.view().faces, replay.view().faces);
  assert.deepEqual(first.scramble(), replay.scramble());
  assert.notDeepEqual(first.view().faces, M.create({ seed: 'harbor-18' }).view().faces);
  for (let stage = 0; stage < M.STAGES.length; stage++) {
    const target = M.stageTargets(stage), start = M.applySequence(M.createSolvedCube(), first.scramble(stage));
    const progress = M.targetProgress(start, target);
    assert.equal(progress.complete, false);
    assert.ok(progress.total - progress.matches >= Math.ceil(progress.total / 2), `stage ${stage + 1} must not start nearly solved`);
    assert.deepEqual(target, M.stageTargets(stage));
    for (const face of M.STAGES[stage].targetFaces) assert.ok(new Set(target[face]).size > 1, 'motifs are not solved-color faces');
  }
});

test('seeded starts keep at least half of each target pattern to solve across a wider seed sample', () => {
  for (let seed = 1; seed <= 128; seed++) {
    for (let stage = 0; stage < M.STAGES.length; stage++) {
      const start = M.applySequence(M.createSolvedCube(), M.scrambleForStage(stage, seed));
      const progress = M.targetProgress(start, M.stageTargets(stage));
      assert.ok(progress.total - progress.matches >= Math.ceil(progress.total / 2), `seed ${seed}, stage ${stage + 1}`);
    }
  }
});

test('all three original motif targets have answerable seeded routes within their explicit move budgets', () => {
  for (const seed of [1, 42, 'harbor-17', 'violet-signal', 20261009, 'another-seed']) {
    const model = M.create({ seed });
    const stages = solveCampaign(model);
    assert.equal(stages.length, M.STAGES.length);
    assert.equal(model.view().status, 'won');
    assert.deepEqual(stages.map(stage => stage.before.moveBudget), [10, 15, 20]);
  }
});

test('campaign timeout is a loss, stops turns, and pause freezes the clock', () => {
  const model = M.create({ seed: 8, campaignTimeMs: 1000 });
  assert.equal(model.advance(200), true);
  const remaining = model.view().timeLeft;
  assert.equal(model.pause(), true);
  assert.equal(model.advance(500), false);
  assert.equal(model.view().timeLeft, remaining);
  assert.equal(model.resume(), true);
  assert.equal(model.advance(remaining), true);
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().lastEvent, 'timeout');
  assert.equal(model.turn('U').accepted, false);
});

test('exceeding the current motif move budget loses; restart and replay reset the same seeded campaign', () => {
  const model = M.create({ seed: 'move-cap' });
  const initial = model.view();
  for (let move = 0; move < initial.moveBudget; move++) {
    const face = M.FACES[move % M.FACES.length];
    const result = model.turn(face, move % 2 ? -1 : 1);
    if (result.status !== 'playing') break;
  }
  assert.equal(model.view().status, 'lost');
  assert.equal(model.view().lastEvent, 'moves');
  assert.equal(model.restart(), true);
  assert.equal(model.view().status, 'playing');
  assert.deepEqual(model.view().faces, initial.faces);
  assert.equal(model.view().stageMoves, 0);
  assert.equal(model.view().timeLeft, initial.campaignTimeMs);
});

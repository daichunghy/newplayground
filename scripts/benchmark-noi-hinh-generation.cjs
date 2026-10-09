#!/usr/bin/env node
/* Reproducible local Node timing/work check; not a browser or mobile benchmark. */
const os = require('node:os');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const M = require('../scripts/games/noi-hinh-model.js');
const { harness, read } = require('../tests/support/browser-harness.cjs');

function sampleCount(args) {
  const raw = args.find(value => value.startsWith('--samples='))?.slice('--samples='.length);
  const value = raw === undefined ? 500 : Number(raw);
  if (!Number.isSafeInteger(value) || value < 20 || value > 10000) throw new Error('--samples must be an integer from 20 through 10000');
  return value;
}

function percentile(values, fraction) {
  const sorted = values.slice().sort((a, b) => a - b);
  return Number(sorted[Math.ceil(fraction * sorted.length) - 1].toFixed(3));
}

function summary(values) {
  return { p50: percentile(values, 0.5), p95: percentile(values, 0.95), max: Number(Math.max(...values).toFixed(3)) };
}

function benchmarkInitialMount(samples) {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(read('scripts/games/noi-hinh-certified-deals.js'), h.context, { filename: 'noi-hinh-certified-deals.js' });
  vm.runInContext(read('scripts/games/noi-hinh-model.js'), h.context, { filename: 'noi-hinh-model.js' });
  vm.runInContext(read('scripts/games/noi-hinh.js'), h.context, { filename: 'noi-hinh.js' });
  const latency = [];
  for (let index = 0; index < samples; index++) {
    const session = h.context.NP_GameSession.start();
    const started = performance.now();
    h.context.NP_NoiHinh.mount(h.container, session);
    latency.push(performance.now() - started);
    session.stop();
    if (h.errors.length) throw new Error(`DOM-double mount error: ${h.errors.join('; ')}`);
  }
  return summary(latency);
}

function benchmark(samples) {
  const cpu = os.cpus()[0];
  const result = {
    scope: 'Local Node.js timing only; not browser, mobile, or human-play evidence.',
    command: `node scripts/benchmark-noi-hinh-generation.cjs --samples=${samples}`,
    runtime: {
      node: process.version, platform: process.platform, arch: process.arch, kernel: os.release(),
      cpuModel: cpu?.model || 'unreported', logicalCpus: os.cpus().length,
      availableParallelism: os.availableParallelism?.() || null
    },
    bounds: {
      maxGenerationWork: M.MAX_GENERATION_WORK,
      maxSolverWorkPerCandidate: M.MAX_CANDIDATE_SOLVER_WORK,
      maxSolverStatesPerCandidate: M.MAX_SOLVER_STATES,
      maxCandidateAttempts: M.MAX_GENERATION_ATTEMPTS
    },
    initialUiMountDomDoubleMs: benchmarkInitialMount(Math.min(samples, 100)),
    stages: []
  };

  for (const stage of M.CAMPAIGN) {
    for (let index = 0; index < 30; index++) {
      const seed = 0x1000 + stage.stage * 1000 + index;
      M.makeDeal(stage.stage, seed, index);
      M.makeSolverDeal(stage.stage, seed);
    }
    const templateLatency = [];
    const templateWork = [];
    const templateBoards = new Set();
    const solverLatency = [];
    const solverWork = [];
    const solverStates = [];
    const maxCandidateWork = [];
    const maxCandidateStates = [];
    const candidateAttempts = [];
    const solverBoards = new Set();
    const fallbackBoards = new Set();
    let fallbackCount = 0;

    for (let index = 1; index <= samples; index++) {
      const seed = (Math.imul(stage.stage, 0x9e3779b1) + index * 0x85ebca6b) >>> 0 || 1;
      const started = performance.now();
      const deal = M.makeDeal(stage.stage, seed, index - 1);
      templateLatency.push(performance.now() - started);
      if (deal.stats.source !== 'certified-template' || !M.verifyWitness(deal.board, deal.witness, stage.stage)) {
        throw new Error(`Invalid certified template at stage ${stage.stage}, index ${index - 1}`);
      }
      if (deal.work > M.MAX_GENERATION_WORK) throw new Error(`Template selection work bound exceeded at stage ${stage.stage}`);
      templateWork.push(deal.work);
      templateBoards.add(deal.board.join(','));

      const solverStarted = performance.now();
      const solvedDeal = M.makeSolverDeal(stage.stage, seed);
      solverLatency.push(performance.now() - solverStarted);
      if (!M.verifyWitness(solvedDeal.board, solvedDeal.witness, stage.stage)) throw new Error(`Invalid solver witness at stage ${stage.stage}, seed ${seed}`);
      if (solvedDeal.work > M.MAX_GENERATION_WORK || solvedDeal.stats.maxCandidateWork > M.MAX_CANDIDATE_SOLVER_WORK ||
          solvedDeal.stats.maxCandidateStates > M.MAX_SOLVER_STATES || solvedDeal.stats.attempts > M.MAX_GENERATION_ATTEMPTS) {
        throw new Error(`Generation bound exceeded at stage ${stage.stage}, seed ${seed}`);
      }
      solverWork.push(solvedDeal.work);
      solverStates.push(solvedDeal.stats.solverStates);
      maxCandidateWork.push(solvedDeal.stats.maxCandidateWork);
      maxCandidateStates.push(solvedDeal.stats.maxCandidateStates);
      candidateAttempts.push(solvedDeal.stats.attempts);
      const boardKey = solvedDeal.board.join(',');
      solverBoards.add(boardKey);
      if (solvedDeal.stats.fallback) {
        fallbackCount++;
        fallbackBoards.add(boardKey);
      }
    }

    result.stages.push({
      stage: stage.stage,
      layout: `${stage.rows}x${stage.cols}`,
      activeCells: stage.active.length,
      pairs: stage.active.length / 2,
      samples,
      certifiedTemplateSelectionMs: summary(templateLatency),
      certifiedTemplateLookupWorkUnits: summary(templateWork),
      templatePoolSize: M.CERTIFIED_DEAL_COUNT,
      distinctSelectedTemplates: templateBoards.size,
      offlineSolverAndReshuffleWorkLatencyMs: summary(solverLatency),
      offlineSolverAndReshuffleWorkUnits: summary(solverWork),
      solverStates: summary(solverStates),
      maxCandidateSolverWorkUnits: summary(maxCandidateWork),
      maxCandidateSolverStates: summary(maxCandidateStates),
      candidateAttempts: summary(candidateAttempts),
      fallbacks: { count: fallbackCount, ratePercent: Number((fallbackCount * 100 / samples).toFixed(1)), distinctBoards: fallbackBoards.size },
      distinctSolverBoards: solverBoards.size
    });
  }
  return result;
}

try {
  process.stdout.write(`${JSON.stringify(benchmark(sampleCount(process.argv.slice(2))), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
}

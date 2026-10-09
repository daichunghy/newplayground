/* Original Nối Hình connect-pairs rules and certified campaign deals. */
(function (root, factory) {
  const certifiedDeals = typeof module === 'object' && module.exports ? require('./noi-hinh-certified-deals.js') : root?.NP_NoiHinhCertifiedDeals;
  const api = factory(certifiedDeals);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_NoiHinhModel = api;
})(typeof window === 'object' ? window : null, function (certifiedDeals) {
  'use strict';

  const ROWS = 4;
  const COLS = 5;
  const CELL_COUNT = ROWS * COLS;
  const ICONS = [
    { name: 'Giọt', color: '#277e83' },
    { name: 'Mầm', color: '#568254' },
    { name: 'Nắng', color: '#b87536' },
    { name: 'Sóng', color: '#3e6f9c' },
    { name: 'Hoa', color: '#a65d79' },
    { name: 'Trăng', color: '#6d6b9c' },
    { name: 'Núi', color: '#8c6446' },
    { name: 'Mây', color: '#547e88' },
    { name: 'Cánh diều', color: '#b05b4f' },
    { name: 'Ốc biển', color: '#85713f' },
    { name: 'Lá non', color: '#64834f' },
    { name: 'Đốm lửa', color: '#bd6048' }
  ];
  const PAIR_COUNT = CELL_COUNT / 2;
  const SAVE_VERSION = 3;
  const PROGRESS_VERSION = 3;
  const MAX_GENERATION_ATTEMPTS = 2;
  const MAX_GENERATION_WORK = 32000;
  const MAX_SOLVER_STATES = 4096;
  const MAX_MATCHING_NODES = 4096;
  const MAX_CANDIDATE_SOLVER_WORK = 18000;
  const DIRECTIONS = [
    { r: -1, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 0, c: -1 }
  ];
  const MAX_LAYOUT_ROUTE_STATES = 7 * 7 * DIRECTIONS.length * 3;
  const CAMPAIGN = [
    { stage: 1, name: 'Mầm non', rows: 3, cols: 4, mask: ['1111', '1111', '1111'] },
    { stage: 2, name: 'Vạt nắng', rows: 4, cols: 4, mask: ['1111', '1111', '1111', '1111'] },
    { stage: 3, name: 'Vườn xanh', rows: 4, cols: 5, mask: ['11111', '11111', '11111', '11111'] },
    { stage: 4, name: 'Cánh cung', rows: 4, cols: 5, mask: ['11111', '11111', '11110', '11110'] },
    { stage: 5, name: 'Mặt hồ', rows: 5, cols: 4, mask: ['1111', '1111', '1111', '1111', '1111'] },
    { stage: 6, name: 'Vòm lá', rows: 5, cols: 5, mask: ['11111', '11111', '11011', '11111', '11111'] }
  ].map(stage => ({ ...stage, mask: stage.mask.slice(), cells: stage.rows * stage.cols,
    active: stage.mask.join('').split('').map((bit, index) => bit === '1' ? index : -1).filter(index => index >= 0) }));
  const CERTIFIED_DEALS = Array.isArray(certifiedDeals) ? certifiedDeals : [];
  const CERTIFIED_DEAL_COUNT = CERTIFIED_DEALS[0]?.length || 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const safe = value => Number.isSafeInteger(value) && value >= 0;
  const uint32 = value => safe(value) && value > 0 && value <= 0xffffffff;
  const cellIndex = (r, c, layout) => r * layout.cols + c;
  const inside = (r, c, layout) => r >= 0 && r < layout.rows && c >= 0 && c < layout.cols;
  const stageInfo = stage => Number.isInteger(stage) ? CAMPAIGN[stage - 1] || null : null;

  function normalizeSeed(seed) {
    const value = uint32(seed) ? seed >>> 0 : 0x4e6f6948;
    return (value >>> 0) || 1;
  }

  function seedForStage(campaignSeed, stage, dealIndex = 0) {
    const serial = safe(dealIndex) ? dealIndex : 0;
    let value = (normalizeSeed(campaignSeed) ^ Math.imul(stage, 0x9e3779b9) ^ Math.imul(serial, 0x85ebca6b)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d) >>> 0;
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b) >>> 0;
    value ^= value >>> 16;
    return (value >>> 0) || 1;
  }

  function makeRandom(seed) {
    let value = normalizeSeed(seed);
    return function random() {
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      value >>>= 0;
      return value / 0x100000000;
    };
  }

  function routeBetween(board, start, end, layout, metrics = null) {
    if (!layout || !Array.isArray(board) || board.length !== layout.cells || !safe(start) || !safe(end) ||
        start >= layout.cells || end >= layout.cells || start === end) return null;

    const startR = Math.floor(start / layout.cols);
    const startC = start % layout.cols;
    const endR = Math.floor(end / layout.cols);
    const endC = end % layout.cols;
    const queue = [{ r: startR, c: startC, direction: -1, turns: 0, path: [{ r: startR, c: startC }] }];
    const seen = new Set();

    for (let head = 0; head < queue.length; head++) {
      if (metrics) {
        if (metrics.limit !== undefined && metrics.work >= metrics.limit) { metrics.exceeded = true; return null; }
        metrics.work++;
      }
      const state = queue[head];
      for (let direction = 0; direction < DIRECTIONS.length; direction++) {
        const step = DIRECTIONS[direction];
        const r = state.r + step.r;
        const c = state.c + step.c;
        const turns = state.turns + (state.direction >= 0 && state.direction !== direction ? 1 : 0);
        if (turns > 2 || r < -1 || r > layout.rows || c < -1 || c > layout.cols) continue;

        const isEnd = r === endR && c === endC;
        if (inside(r, c, layout) && !isEnd && board[cellIndex(r, c, layout)] !== null) continue;

        const path = [...state.path, { r, c }];
        if (isEnd) return path;

        const key = `${r},${c},${direction},${turns}`;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({ r, c, direction, turns, path });
      }
    }
    return null;
  }

  function findPath(board, start, end, stage = 3) {
    const layout = stageInfo(stage);
    if (!layout || !Array.isArray(board) || board[start] === null || board[start] === undefined || board[start] !== board[end]) return null;
    return routeBetween(board, start, end, layout);
  }

  function legalPairs(board, layout) {
    if (!layout || !Array.isArray(board) || board.length !== layout.cells) return [];
    const positions = Array.from({ length: ICONS.length }, () => []);
    for (let i = 0; i < board.length; i++) if (board[i] !== null) positions[board[i]]?.push(i);
    const pairs = [];
    for (const cells of positions) {
      for (let a = 0; a < cells.length; a++) {
        for (let b = a + 1; b < cells.length; b++) {
          const path = routeBetween(board, cells[a], cells[b], layout);
          if (path) pairs.push({ a: cells[a], b: cells[b], path });
        }
      }
    }
    return pairs;
  }

  function symbolCounts(board) {
    const counts = Array(ICONS.length).fill(0);
    for (const value of board) if (value !== null && Number.isInteger(value) && value >= 0 && value < ICONS.length) counts[value]++;
    return counts;
  }

  function solveBoard(board, stage, random = () => 0.5, workLimit = MAX_CANDIDATE_SOLVER_WORK) {
    const layout = stageInfo(stage);
    if (!layout || !validBoard(board, layout)) return { witness: null, work: 0, states: 0 };
    const positions = Array.from({ length: ICONS.length }, () => []);
    board.forEach((symbol, index) => { if (symbol !== null) positions[symbol].push(index); });
    const pairs = positions.map((cells, symbol) => cells.length === 2 ? { symbol, a: cells[0], b: cells[1] } : null).filter(Boolean);
    const fullMask = (1 << pairs.length) - 1;
    const failed = new Set();
    const metrics = { work: 0, limit: workLimit };
    let states = 0;
    let exhausted = false;

    function search(mask) {
      if (mask === 0) return [];
      if (failed.has(mask)) return null;
      if (states >= MAX_SOLVER_STATES || metrics.work >= workLimit) { exhausted = true; return null; }
      states++;
      const current = Array(layout.cells).fill(null);
      for (let index = 0; index < pairs.length; index++) {
        if (mask & (1 << index)) {
          current[pairs[index].a] = pairs[index].symbol;
          current[pairs[index].b] = pairs[index].symbol;
        }
      }
      const options = [];
      for (let index = 0; index < pairs.length; index++) {
        if (!(mask & (1 << index))) continue;
        const pair = pairs[index];
        if (metrics.work >= workLimit) { exhausted = true; return null; }
        metrics.work++;
        if (routeBetween(current, pair.a, pair.b, layout, metrics)) options.push({ pair, index });
        if (metrics.exceeded) { exhausted = true; return null; }
      }
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      for (const option of options) {
        const rest = search(mask & ~(1 << option.index));
        if (rest) return [{ a: option.pair.a, b: option.pair.b }, ...rest];
        if (exhausted) return null;
      }
      failed.add(mask);
      return null;
    }

    return { witness: search(fullMask), work: metrics.work, states };
  }

  function validBoard(board, layout) {
    if (!layout || !Array.isArray(board) || board.length !== layout.cells) return false;
    const active = new Set(layout.active);
    for (let index = 0; index < board.length; index++) {
      const value = board[index];
      if (!active.has(index)) {
        if (value !== null) return false;
      } else if (value !== null && (!Number.isInteger(value) || value < 0 || value >= ICONS.length)) return false;
    }
    return symbolCounts(board).every(count => count === 0 || count === 2);
  }

  function verifyWitness(board, witness, stage, metrics = null) {
    const layout = stageInfo(stage);
    if (!layout || !validBoard(board, layout) || !Array.isArray(witness)) return false;
    const remaining = board.slice();
    const count = remaining.filter(value => value !== null).length / 2;
    if (!Number.isInteger(count) || witness.length !== count) return false;
    for (const pair of witness) {
      if (metrics) metrics.work++;
      if (!pair || !safe(pair.a) || !safe(pair.b) || pair.a >= remaining.length || pair.b >= remaining.length ||
          pair.a === pair.b || remaining[pair.a] === null || remaining[pair.a] !== remaining[pair.b] ||
          !routeBetween(remaining, pair.a, pair.b, layout, metrics)) return false;
      remaining[pair.a] = null;
      remaining[pair.b] = null;
    }
    return remaining.every(value => value === null);
  }

  function buildCertifiedDeal(stage, seed, pairSymbols = null) {
    const layout = stageInfo(stage);
    if (!layout) throw new Error('Unknown Nối Hình stage');
    const random = makeRandom(seed);
    const dealSeed = normalizeSeed(seed);
    const symbols = pairSymbols ? pairSymbols.slice() : Array.from({ length: layout.active.length / 2 }, (_, i) => i);
    if (!symbols.length || symbols.length > ICONS.length || symbols.some(value => !Number.isInteger(value) || value < 0 || value >= ICONS.length)) {
      throw new Error('Invalid Nối Hình pair list');
    }
    for (let symbol = 0; symbol < ICONS.length; symbol++) {
      if (symbols.filter(value => value === symbol).length > 1) throw new Error('A deal cannot contain more than one pair of a symbol');
    }

    let work = 0;
    let attempts = 0;
    let solverStates = 0;
    let solverWork = 0;
    let maxCandidateStates = 0;
    let maxCandidateWork = 0;
    // Reserve room for one full candidate search and its witness replay before
    // starting another synchronous attempt, plus the full certified fallback.
    const witnessReserve = symbols.length * (MAX_LAYOUT_ROUTE_STATES + 1);
    const fallbackReserve = MAX_MATCHING_NODES + symbols.length * 2;
    const nextAttemptReserve = MAX_GENERATION_WORK - MAX_CANDIDATE_SOLVER_WORK - witnessReserve - fallbackReserve;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS && work < nextAttemptReserve; attempt++) {
      attempts = attempt + 1;
      const candidate = Array(layout.cells).fill(null);
      const cells = layout.active.slice();
      const order = symbols.slice();
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (let i = 0; i < order.length; i++) {
        candidate[cells[i * 2]] = order[i];
        candidate[cells[i * 2 + 1]] = order[i];
      }
      const solved = solveBoard(candidate, stage, random);
      solverStates += solved.states;
      solverWork += solved.work;
      maxCandidateStates = Math.max(maxCandidateStates, solved.states);
      maxCandidateWork = Math.max(maxCandidateWork, solved.work);
      work += solved.work;
      if (work > MAX_GENERATION_WORK) throw new Error('Nối Hình deal work bound exceeded');
      if (!solved.witness) continue;
      const check = { work: 0 };
      if (!verifyWitness(candidate, solved.witness, stage, check)) throw new Error('Nối Hình solver returned an invalid witness');
      work += check.work;
      if (work > MAX_GENERATION_WORK) throw new Error('Nối Hình deal work bound exceeded');
      return { board: candidate, witness: solved.witness, seed: dealSeed, work,
        stats: { attempts, solverStates, solverWork, maxCandidateStates, maxCandidateWork, fallback: false } };
    }

    // Adjacent pairs are a bounded, always-connectable certificate fallback.
    // The campaign masks all have a domino matching, so it also handles sparse reshuffles.
    let matchingNodes = 0;
    const failed = new Set();
    function completeMatching(remaining) {
      if (!remaining.length) return [];
      if (++matchingNodes > MAX_MATCHING_NODES) throw new Error('Nối Hình matching bound exceeded');
      const key = remaining.join(',');
      if (failed.has(key)) return null;
      const first = remaining[0];
      const r = Math.floor(first / layout.cols), c = first % layout.cols;
      const neighbors = [[r, c + 1], [r + 1, c], [r, c - 1], [r - 1, c]]
        .filter(([nr, nc]) => inside(nr, nc, layout))
        .map(([nr, nc]) => cellIndex(nr, nc, layout))
        .filter(index => remaining.includes(index));
      for (let i = neighbors.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
      }
      for (const next of neighbors) {
        const tail = completeMatching(remaining.filter(index => index !== first && index !== next));
        if (tail) return [[first, next], ...tail];
      }
      failed.add(key);
      return null;
    }
    const matching = completeMatching(layout.active.slice());
    if (!matching || matching.length !== layout.active.length / 2) throw new Error('Unable to certify this Nối Hình layout');
    const fallback = Array(layout.cells).fill(null);
    const witness = [];
    const fallbackPairs = matching.slice();
    const fallbackSymbols = symbols.slice();
    for (const order of [fallbackPairs, fallbackSymbols]) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    for (let i = 0; i < fallbackSymbols.length; i++) {
      const pair = fallbackPairs[i];
      const [a, b] = pair;
      fallback[a] = fallbackSymbols[i];
      fallback[b] = fallbackSymbols[i];
      witness.push({ a, b });
    }
    const check = { work: 0 };
    if (!verifyWitness(fallback, witness, stage, check)) throw new Error('Nối Hình fallback witness failed');
    work += check.work + matchingNodes;
    if (work > MAX_GENERATION_WORK) throw new Error('Nối Hình deal work bound exceeded');
    return { board: fallback, witness, seed: dealSeed, work,
      stats: { attempts, solverStates, solverWork, maxCandidateStates, maxCandidateWork, matchingNodes, fallback: true } };
  }

  function makeSolverDeal(stage, seed, pairSymbols = null) {
    const layout = stageInfo(stage);
    if (!layout) throw new Error('Unknown Nối Hình stage');
    return buildCertifiedDeal(stage, seed, pairSymbols);
  }

  function makeDeal(stage, seed, dealIndex = seed) {
    const layout = stageInfo(stage);
    if (!layout) throw new Error('Unknown Nối Hình stage');
    const pool = CERTIFIED_DEALS[stage - 1];
    if (!Array.isArray(pool) || !pool.length) throw new Error('Nối Hình certified deals are not loaded');
    const sourceIndex = safe(dealIndex) ? dealIndex % pool.length : normalizeSeed(seed) % pool.length;
    const template = pool[sourceIndex];
    if (!Array.isArray(template) || template.length !== 3 || !Array.isArray(template[1]) || !Array.isArray(template[2])) {
      throw new Error(`Invalid certified Nối Hình deal at stage ${stage}, index ${sourceIndex}`);
    }
    return {
      board: template[1].slice(),
      witness: template[2].map(([a, b]) => ({ a, b })),
      seed: normalizeSeed(seed),
      work: 1,
      stats: { attempts: 0, solverStates: 0, solverWork: 0, maxCandidateStates: 0, maxCandidateWork: 0,
        fallback: false, source: 'certified-template', sourceSeed: template[0], dealIndex: sourceIndex }
    };
  }

  function validSnapshot(snapshot, expectedMoves, stage) {
    if (!snapshot || !safe(snapshot.moves) || snapshot.moves !== expectedMoves ||
        !safe(snapshot.cleared) || snapshot.cleared !== expectedMoves || !uint32(snapshot.seed) ||
        !safe(snapshot.originCleared) || snapshot.originCleared > snapshot.cleared ||
        !safe(snapshot.shuffleCount) || !validBoard(snapshot.board, stageInfo(stage)) ||
        !validBoard(snapshot.originBoard, stageInfo(stage)) ||
        snapshot.originBoard.filter(value => value !== null).length !== (stageInfo(stage).active.length / 2 - snapshot.originCleared) * 2 ||
        !verifyWitness(snapshot.originBoard, snapshot.witness, stage)) return false;
    const currentCounts = symbolCounts(snapshot.board);
    const originCounts = symbolCounts(snapshot.originBoard);
    return snapshot.board.filter(value => value !== null).length === (stageInfo(stage).active.length / 2 - snapshot.cleared) * 2 &&
      currentCounts.every((count, symbol) => count <= originCounts[symbol] && (originCounts[symbol] - count) % 2 === 0) &&
      originCounts.reduce((sum, count, symbol) => sum + count - currentCounts[symbol], 0) === (snapshot.cleared - snapshot.originCleared) * 2;
  }

  function validSave(state) {
    const layout = state && stageInfo(state.stage);
    if (!state || state.version !== SAVE_VERSION || !layout || !uint32(state.seed) || !uint32(state.dealSeed) ||
        !safe(state.dealIndex) || state.dealIndex > 0x7fffffff ||
        !safe(state.moves) || !safe(state.cleared) || state.cleared !== state.moves ||
        state.cleared > layout.active.length / 2 || !safe(state.originCleared) || state.originCleared > state.cleared ||
        !safe(state.shuffleCount) || !validBoard(state.board, layout) || !validBoard(state.originBoard, layout) ||
        !verifyWitness(state.originBoard, state.witness, state.stage) ||
        !Array.isArray(state.history) || state.history.length !== state.moves ||
        !state.history.every((snapshot, index) => validSnapshot(snapshot, index, state.stage))) return false;

    const remaining = state.board.filter(value => value !== null).length;
    const currentCounts = symbolCounts(state.board);
    const originCounts = symbolCounts(state.originBoard);
    if (remaining !== (layout.active.length / 2 - state.cleared) * 2 ||
        state.originBoard.filter(value => value !== null).length !== (layout.active.length / 2 - state.originCleared) * 2 ||
        !currentCounts.every((count, symbol) => count <= originCounts[symbol] && (originCounts[symbol] - count) % 2 === 0) ||
        originCounts.reduce((sum, count, symbol) => sum + count - currentCounts[symbol], 0) !== (state.cleared - state.originCleared) * 2) return false;
    if (state.selected !== null && (!safe(state.selected) || state.selected >= layout.cells || state.board[state.selected] === null)) return false;
    if (state.status !== 'playing' && state.selected !== null) return false;
    if (state.status === 'playing') return remaining > 0 && legalPairs(state.board, layout).length > 0;
    if (state.status === 'stuck') return remaining > 0 && legalPairs(state.board, layout).length === 0;
    return state.status === 'won' && remaining === 0 && state.cleared === layout.active.length / 2;
  }

  function validProgress(progress) {
    return !!progress && progress.version === PROGRESS_VERSION && uint32(progress.campaignSeed) &&
      safe(progress.unlockedStage) && progress.unlockedStage >= 1 && progress.unlockedStage <= CAMPAIGN.length &&
      safe(progress.activeStage) && progress.activeStage >= 1 && progress.activeStage <= progress.unlockedStage &&
      Array.isArray(progress.dealNumbers) && progress.dealNumbers.length === CAMPAIGN.length &&
      progress.dealNumbers.every(value => safe(value) && value <= 0x7fffffff) &&
      progress.game?.dealSeed === seedForStage(progress.campaignSeed, progress.activeStage, progress.dealNumbers[progress.activeStage - 1]) &&
      progress.game?.dealIndex === progress.dealNumbers[progress.activeStage - 1] &&
      validSave(progress.game) && progress.game.stage === progress.activeStage;
  }

  function snapshotOf(state) {
    return {
      board: state.board.slice(), originBoard: state.originBoard.slice(), witness: clone(state.witness),
      originCleared: state.originCleared, seed: state.seed, moves: state.moves, cleared: state.cleared,
      shuffleCount: state.shuffleCount
    };
  }

  function create({ saved = null, seed = 0x4e6f6948, stage = 3, dealIndex = 0 } = {}) {
    if (saved && !validSave(saved)) return null;
    const layout = stageInfo(saved ? saved.stage : stage);
    if (!layout) throw new Error('Unknown Nối Hình stage');
    if (!saved && (!safe(dealIndex) || dealIndex > 0x7fffffff)) throw new Error('Invalid Nối Hình deal index');
    const initial = saved ? clone(saved) : (() => {
      const generated = makeDeal(layout.stage, seed, dealIndex);
      return {
        version: SAVE_VERSION,
        stage: layout.stage,
        seed: generated.seed,
        dealSeed: generated.seed,
        dealIndex,
        board: generated.board,
        originBoard: generated.board.slice(),
        witness: generated.witness,
        originCleared: 0,
        selected: null,
        moves: 0,
        cleared: 0,
        shuffleCount: 0,
        history: [],
        status: 'playing'
      };
    })();
    const state = initial;
    const events = [];
    const emit = (kind, details = {}) => events.push({ kind, ...details });

    function tap(index) {
      const active = layout.active.includes(index);
      if (state.status !== 'playing' || !active || !safe(index) || index >= layout.cells || state.board[index] === null) return false;
      if (state.selected === null) {
        state.selected = index;
        emit('select', { index, symbol: state.board[index] });
        return true;
      }
      if (state.selected === index) {
        state.selected = null;
        emit('deselect');
        return true;
      }

      const first = state.selected;
      const path = state.board[first] === state.board[index] ? routeBetween(state.board, first, index, layout) : null;
      if (!path) {
        if (state.board[first] === state.board[index]) emit('blocked', { first, second: index });
        else {
          state.selected = index;
          emit('select', { index, symbol: state.board[index] });
        }
        return true;
      }

      state.history.push(snapshotOf(state));
      state.board[first] = null;
      state.board[index] = null;
      state.selected = null;
      state.moves++;
      state.cleared++;
      if (state.board.every(value => value === null)) state.status = 'won';
      else if (legalPairs(state.board, layout).length === 0) state.status = 'stuck';
      emit('match', { first, second: index, path: clone(path), cleared: state.cleared });
      if (state.status === 'won') emit('won');
      else if (state.status === 'stuck') emit('stuck');
      return true;
    }

    function deselect() {
      if (state.status !== 'playing' || state.selected === null) return false;
      state.selected = null;
      emit('deselect');
      return true;
    }

    function undo() {
      if (!state.history.length) return false;
      const previous = state.history.pop();
      Object.assign(state, clone(previous));
      state.selected = null;
      state.status = state.board.every(value => value === null) ? 'won' : legalPairs(state.board, layout).length ? 'playing' : 'stuck';
      emit('undo', { moves: state.moves });
      return true;
    }

    function reshuffle(seed = (state.seed + state.shuffleCount + 1) >>> 0) {
      if (state.status !== 'stuck') return false;
      const counts = symbolCounts(state.board);
      const symbols = [];
      counts.forEach((count, symbol) => { for (let i = 0; i < count / 2; i++) symbols.push(symbol); });
      const generated = makeSolverDeal(layout.stage, seed, symbols);
      if (generated.board.filter(value => value !== null).length !== state.board.filter(value => value !== null).length ||
          symbolCounts(generated.board).some((count, symbol) => count !== counts[symbol])) return false;
      state.board = generated.board;
      state.seed = generated.seed;
      state.originBoard = generated.board.slice();
      state.witness = generated.witness;
      state.originCleared = state.cleared;
      state.shuffleCount++;
      state.selected = null;
      state.status = 'playing';
      emit('reshuffle', { count: generated.board.filter(value => value !== null).length / 2, work: generated.work });
      return true;
    }

    function drain() { return events.splice(0); }

    function view() {
      return { ...clone(state), rows: layout.rows, cols: layout.cols, cells: layout.cells,
        mask: layout.mask.slice(), active: Array.from({ length: layout.cells }, (_, index) => layout.active.includes(index)),
        stageName: layout.name, stageCount: CAMPAIGN.length, pairCount: layout.active.length / 2,
        icons: clone(ICONS), legalPairs: legalPairs(state.board, layout).map(pair => ({ a: pair.a, b: pair.b })) };
    }

    return { tap, deselect, undo, reshuffle, drain, view, serialize: () => clone(state) };
  }

  return {
    ROWS, COLS, CELL_COUNT, ICONS: clone(ICONS), PAIR_COUNT, SAVE_VERSION, PROGRESS_VERSION,
    CAMPAIGN: clone(CAMPAIGN), CERTIFIED_DEAL_COUNT, MAX_GENERATION_ATTEMPTS, MAX_GENERATION_WORK, MAX_SOLVER_STATES, MAX_MATCHING_NODES, MAX_CANDIDATE_SOLVER_WORK,
    findPath, legalPairs: (board, stage = 3) => legalPairs(board, stageInfo(stage)), validBoard: (board, stage = 3) => validBoard(board, stageInfo(stage)),
    verifyWitness, makeDeal, makeSolverDeal, solveBoard, seedForStage, validSave, validProgress, create,
    restore: state => validSave(state) ? create({ saved: state }) : null
  };
});

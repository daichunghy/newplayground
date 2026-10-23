/* Exact-ID playable overrides for four legacy games with corrected core rules. */
(function () {
  'use strict';

  const COLORS = ['red', 'yellow', 'blue'];
  const CHUZZLE_COLORS = ['coral', 'gold', 'sky', 'mint', 'violet', 'orange'];
  const COLOR_HEX = {
    red: '#e85b63', yellow: '#f4c542', blue: '#55a8e8',
    coral: '#f17689', gold: '#ffc857', sky: '#59bce3',
    mint: '#6fd0a0', violet: '#ad82e8', orange: '#f49b4a'
  };

  function makeRandom(seed) {
    let value = (Number(seed) || 1) >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function pick(random, items) {
    return items[Math.floor(random() * items.length)];
  }

  function makeGrid(rows, columns) {
    return Array.from({ length: rows }, () => Array(columns).fill(null));
  }

  // Dr. Mario: immutable viruses, connected capsule halves, simultaneous runs,
  // split-piece gravity, and repeated clears are all handled by this one model.
  function createDrMarioState(options = {}) {
    const random = makeRandom(options.seed ?? 73);
    const virusCount = Math.max(0, Math.min(40, Number(options.virusCount ?? 12)));
    const state = {
      grid: makeGrid(16, 8), viruses: 0, score: 0, level: 1,
      startingViruses: virusCount, everHadViruses: virusCount > 0,
      speed: options.speed || 'Vừa', phase: 'playing', current: null,
      next: null, random, nextPairId: 1, fallClock: 0, chain: 0,
      message: 'Ghép bốn ô cùng màu để dọn lọ virus.'
    };
    let placed = 0;
    for (let row = 8; row < 16 && placed < virusCount; row++) {
      for (let column = 0; column < 8 && placed < virusCount; column++) {
        if ((row + column) % 2 !== 0) continue;
        const virus = { type: 'virus', color: pick(random, COLORS), pairId: null, half: null };
        state.grid[row][column] = virus;
        if (wouldMakeDrMarioRun(state.grid, row, column, virus.color, 4)) {
          state.grid[row][column] = null;
          continue;
        }
        placed++;
      }
    }
    state.viruses = placed;
    state.everHadViruses = placed > 0;
    state.next = makeCapsule(state);
    spawnDrMarioCapsule(state);
    return state;
  }

  function wouldMakeDrMarioRun(grid, row, column, color, limit) {
    for (const [dy, dx] of [[0, 1], [1, 0]]) {
      let run = 1;
      for (const sign of [-1, 1]) {
        let y = row + dy * sign, x = column + dx * sign;
        while (grid[y]?.[x]?.color === color) {
          run++;
          y += dy * sign;
          x += dx * sign;
        }
      }
      if (run >= limit) return true;
    }
    return false;
  }

  function makeCapsule(state) {
    return { colors: [pick(state.random, COLORS), pick(state.random, COLORS)] };
  }

  function capsuleOffsets(orientation) {
    return [[0, 1], [1, 0], [0, -1], [-1, 0]][orientation];
  }

  function drMarioCells(capsule) {
    if (!capsule) return [];
    const [dx, dy] = capsuleOffsets(capsule.orientation);
    return [
      { x: capsule.x, y: capsule.y, color: capsule.colors[0], half: 0 },
      { x: capsule.x + dx, y: capsule.y + dy, color: capsule.colors[1], half: 1 }
    ];
  }

  function canPlaceDrMario(state, capsule) {
    return drMarioCells(capsule).every(cell =>
      cell.x >= 0 && cell.x < 8 && cell.y >= 0 && cell.y < 16 && !state.grid[cell.y][cell.x]);
  }

  function spawnDrMarioCapsule(state) {
    if (state.phase !== 'playing' || state.current) return false;
    state.current = { x: 3, y: 0, orientation: 0, colors: state.next.colors.slice() };
    state.next = makeCapsule(state);
    if (!canPlaceDrMario(state, state.current)) {
      state.current = null;
      state.phase = 'lost';
      state.message = 'Cổ lọ bị chặn. Hãy chơi lại nhé.';
      return false;
    }
    return true;
  }

  function findDrMarioMatches(state) {
    const marked = new Set();
    for (let row = 0; row < 16; row++) {
      for (let column = 0; column < 8; column++) {
        const cell = state.grid[row][column];
        if (!cell) continue;
        for (const [dy, dx] of [[0, 1], [1, 0]]) {
          const run = [{ row, column }];
          let y = row + dy, x = column + dx;
          while (state.grid[y]?.[x]?.color === cell.color) {
            run.push({ row: y, column: x });
            y += dy;
            x += dx;
          }
          if (run.length >= 4) run.forEach(position => marked.add(`${position.row},${position.column}`));
        }
      }
    }
    return [...marked].map(key => {
      const [row, column] = key.split(',').map(Number);
      return { row, column };
    });
  }

  function settleDrMario(state) {
    let moved = true;
    let passes = 0;
    while (moved && passes++ < 128) {
      moved = false;
      const pairs = new Map();
      for (let row = 15; row >= 0; row--) {
        for (let column = 0; column < 8; column++) {
          const cell = state.grid[row][column];
          if (cell?.pairId) pairs.set(cell.pairId, (pairs.get(cell.pairId) || []).concat({ row, column }));
        }
      }
      for (const positions of pairs.values()) {
        if (positions.length !== 2) continue;
        positions.sort((a, b) => b.row - a.row);
        const [lower, upper] = positions;
        const verticalPair = upper.column === lower.column && upper.row === lower.row - 1;
        const horizontalPair = upper.row === lower.row && Math.abs(upper.column - lower.column) === 1;
        if (!verticalPair && !horizontalPair) continue;
        const destinations = positions.map(position => ({ row: position.row + 1, column: position.column }));
        if (destinations.every(position => position.row < 16 &&
          (!state.grid[position.row][position.column] || positions.some(source =>
            source.row === position.row && source.column === position.column)))) {
          const cells = positions.map(position => state.grid[position.row][position.column]);
          positions.forEach(position => {
            state.grid[position.row][position.column] = null;
          });
          destinations.forEach((position, index) => {
            state.grid[position.row][position.column] = cells[index];
          });
          moved = true;
        }
      }
      for (let row = 14; row >= 0; row--) {
        for (let column = 0; column < 8; column++) {
          const cell = state.grid[row][column];
          if (!cell || cell.type !== 'capsule' || cell.pairId) continue;
          if (!state.grid[row + 1][column]) {
            state.grid[row + 1][column] = cell;
            state.grid[row][column] = null;
            moved = true;
          }
        }
      }
    }
    return moved;
  }

  function resolveDrMario(state) {
    let totalCleared = 0;
    let chain = 0;
    let runs;
    do {
      runs = findDrMarioMatches(state);
      if (!runs.length) break;
      chain++;
      let virusClears = 0;
      for (const { row, column } of runs) {
        const cell = state.grid[row][column];
        if (cell?.type === 'virus') virusClears++;
        state.grid[row][column] = null;
      }
      state.viruses = Math.max(0, state.viruses - virusClears);
      const remainingPairs = new Map();
      for (const row of state.grid) for (const cell of row) {
        if (cell?.pairId) remainingPairs.set(cell.pairId, (remainingPairs.get(cell.pairId) || 0) + 1);
      }
      for (const row of state.grid) for (const cell of row) {
        if (cell?.pairId && remainingPairs.get(cell.pairId) < 2) cell.pairId = null;
      }
      totalCleared += runs.length;
      settleDrMario(state);
    } while (chain < 32);
    if (totalCleared) {
      state.score += totalCleared * 100 * chain;
      state.chain = chain;
      state.message = chain > 1 ? `Liên hoàn ${chain} lần! Dọn được ${totalCleared} ô.` : `Dọn được ${totalCleared} ô.`;
    }
    if (state.viruses === 0 && state.everHadViruses) {
      state.phase = 'won';
      state.current = null;
      state.message = 'Đã dọn sạch virus! Màn chơi hoàn tất.';
    }
    return { cleared: totalCleared, chain, viruses: state.viruses };
  }

  function moveDrMario(state, dx, dy = 0) {
    if (state.phase !== 'playing' || !state.current) return false;
    const candidate = { ...state.current, x: state.current.x + dx, y: state.current.y + dy };
    if (!canPlaceDrMario(state, candidate)) return false;
    state.current = candidate;
    if (dx) state.message = dx < 0 ? 'Viên nang đã sang trái.' : 'Viên nang đã sang phải.';
    return true;
  }

  function rotateDrMario(state) {
    if (state.phase !== 'playing' || !state.current) return false;
    for (let turn = 1; turn <= 4; turn++) {
      const candidate = { ...state.current, orientation: (state.current.orientation + turn) % 4 };
      if (canPlaceDrMario(state, candidate)) {
        state.current = candidate;
        state.message = 'Đã xoay viên nang.';
        return true;
      }
    }
    return false;
  }

  function lockDrMarioCapsule(state) {
    if (state.phase !== 'playing' || !state.current || !canPlaceDrMario(state, state.current)) return false;
    const pairId = `capsule-${state.nextPairId++}`;
    for (const cell of drMarioCells(state.current)) {
      state.grid[cell.y][cell.x] = { type: 'capsule', color: cell.color, pairId, half: cell.half };
    }
    state.current = null;
    resolveDrMario(state);
    if (state.phase === 'playing') spawnDrMarioCapsule(state);
    return true;
  }

  const drMarioModel = {
    createState: createDrMarioState,
    findMatches: findDrMarioMatches,
    settle: settleDrMario,
    resolve: resolveDrMario,
    spawn: spawnDrMarioCapsule,
    move: moveDrMario,
    rotate: rotateDrMario,
    lock: lockDrMarioCapsule,
    drop(state) {
      if (state.phase !== 'playing' || !state.current) return false;
      while (moveDrMario(state, 0, 1)) {}
      return lockDrMarioCapsule(state);
    },
    update(state, elapsed) {
      if (state.phase !== 'playing' || !state.current) return;
      state.fallClock += elapsed;
      const interval = state.speed === 'Nhanh' ? 0.24 : state.speed === 'Chậm' ? 0.72 : 0.48;
      if (state.fallClock < interval) return;
      state.fallClock = 0;
      if (!moveDrMario(state, 0, 1)) lockDrMarioCapsule(state);
    }
  };

  // Towers of Hanoi: disks are stored bottom-to-top on three real peg stacks.
  function createHanoiState(options = {}) {
    const diskCount = Math.max(3, Math.min(7, Math.floor(Number(options.diskCount) || 4)));
    return {
      diskCount, pegs: [Array.from({ length: diskCount }, (_, index) => diskCount - index), [], []],
      moves: 0, minimumMoves: 2 ** diskCount - 1, selectedPeg: null,
      phase: 'playing', history: [], message: 'Chọn cọc có đĩa trên cùng, rồi chọn cọc đích.'
    };
  }

  function moveHanoi(state, from, to) {
    if (state.phase !== 'playing' || from === to || !state.pegs[from] || !state.pegs[to]) return false;
    const source = state.pegs[from];
    const target = state.pegs[to];
    const disk = source[source.length - 1];
    const top = target[target.length - 1];
    if (!disk || (top && top < disk)) {
      state.message = 'Nút không thể đặt lên đĩa nhỏ hơn.';
      return false;
    }
    state.history.push({ pegs: state.pegs.map(peg => peg.slice()), moves: state.moves });
    source.pop();
    target.push(disk);
    state.moves++;
    state.selectedPeg = null;
    if (target.length === state.diskCount) {
      state.phase = 'won';
      state.message = `Tháp đã chuyển sau ${state.moves} lượt.`;
    } else {
      state.message = `Đã chuyển đĩa ${disk}. Còn tối thiểu ${Math.max(0, state.minimumMoves - state.moves)} lượt theo mốc ban đầu.`;
    }
    return true;
  }

  const hanoiModel = {
    createState: createHanoiState,
    move: moveHanoi,
    undo(state) {
      if (!state.history.length) return false;
      const previous = state.history.pop();
      state.pegs = previous.pegs.map(peg => peg.slice());
      state.moves = previous.moves;
      state.phase = 'playing';
      state.message = 'Đã hoàn tác một lượt.';
      return true;
    },
    reset(state, diskCount = state.diskCount) {
      const fresh = createHanoiState({ diskCount });
      Object.assign(state, fresh);
      return state;
    }
  };

  // Peggle: discrete, session-stepped ball physics and a moving free-ball bucket.
  const PEGGLE_WIDTH = 640;
  const PEGGLE_HEIGHT = 600;

  function buildPegglePegs() {
    const pegs = [];
    let nextId = 1;
    for (let row = 0; row < 7; row++) {
      const columns = 7;
      const offset = row % 2 ? 34 : 0;
      for (let column = 0; column < columns; column++) {
        const specialIndex = (row * 3 + column * 5) % 13;
        const type = specialIndex === 0 ? 'green' : (specialIndex % 4 === 0 ? 'orange' : 'blue');
        pegs.push({
          id: `peg-${nextId++}`, x: 104 + column * 72 + offset,
          y: 122 + row * 58, radius: 11, type, active: true
        });
      }
    }
    const orangePegs = pegs.filter(peg => peg.type === 'orange');
    orangePegs.slice(0, 10).forEach(peg => {
      peg.type = 'blue';
    });
    const required = [pegs[9], pegs[15], pegs[20], pegs[26], pegs[30], pegs[35], pegs[38], pegs[44], pegs[46], pegs[48]];
    required.forEach(peg => {
      peg.type = 'orange';
    });
    pegs[17].type = 'green';
    pegs[31].type = 'green';
    return pegs;
  }

  function createPeggleState() {
    const pegs = buildPegglePegs();
    return {
      width: PEGGLE_WIDTH, height: PEGGLE_HEIGHT, pegs,
      remainingOranges: pegs.filter(peg => peg.type === 'orange').length,
      remainingBalls: 10, score: 0, phase: 'playing', ball: null,
      angle: Math.PI / 2, bucket: { x: PEGGLE_WIDTH / 2, width: 102, direction: 1 },
      shotHits: 0, guideNextShot: false, usedGuide: false,
      message: 'Ngắm rồi bắn: dọn chốt cam trước khi dùng hết 10 quả bóng.'
    };
  }

  function predictPeggleGuide(state) {
    if (!state.guideNextShot || state.ball || state.phase !== 'playing') return [];
    const path = [];
    const predictedBall = {
      x: state.width / 2,
      y: 60,
      vx: Math.cos(state.angle) * 470,
      vy: Math.sin(state.angle) * 470
    };
    const hitPegIds = new Set();
    const stepTime = 1 / 30;
    for (let step = 0; step < 75; step++) {
      path.push({ x: predictedBall.x, y: predictedBall.y });
      predictedBall.vy += 620 * stepTime;
      predictedBall.x += predictedBall.vx * stepTime;
      predictedBall.y += predictedBall.vy * stepTime;
      if (predictedBall.x < 9) {
        predictedBall.x = 9;
        predictedBall.vx = Math.abs(predictedBall.vx) * 0.94;
      }
      if (predictedBall.x > state.width - 9) {
        predictedBall.x = state.width - 9;
        predictedBall.vx = -Math.abs(predictedBall.vx) * 0.94;
      }
      for (const peg of state.pegs) {
        if (!peg.active || hitPegIds.has(peg.id)) continue;
        const dx = predictedBall.x - peg.x;
        const dy = predictedBall.y - peg.y;
        const distance = Math.hypot(dx, dy);
        const minimum = peg.radius + 6;
        if (distance > minimum) continue;
        const nx = dx / (distance || 1);
        const ny = dy / (distance || 1);
        const dot = predictedBall.vx * nx + predictedBall.vy * ny;
        predictedBall.vx -= 2 * dot * nx;
        predictedBall.vy -= 2 * dot * ny;
        predictedBall.x = peg.x + nx * (minimum + 0.5);
        predictedBall.y = peg.y + ny * (minimum + 0.5);
        hitPegIds.add(peg.id);
      }
      if (predictedBall.y > state.height) break;
    }
    return path;
  }

  function hitPegglePeg(state, ball, peg) {
    if (!peg.active || ball.hitIds.includes(peg.id)) return false;
    const dx = ball.x - peg.x, dy = ball.y - peg.y;
    const distance = Math.hypot(dx, dy);
    const minimum = peg.radius + 6;
    if (distance > minimum) return false;
    const nx = dx / (distance || 1), ny = dy / (distance || 1);
    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;
    if (distance < minimum) {
      ball.x = peg.x + nx * (minimum + 0.5);
      ball.y = peg.y + ny * (minimum + 0.5);
    }
    peg.active = false;
    ball.hitIds.push(peg.id);
    state.shotHits++;
    state.score += peg.type === 'orange' ? 100 : peg.type === 'green' ? 75 : 10;
    if (peg.type === 'orange') state.remainingOranges = Math.max(0, state.remainingOranges - 1);
    if (peg.type === 'green') {
      state.guideNextShot = true;
      state.message = 'Chốt xanh đã mở đường ngắm cho lượt tiếp theo.';
    }
    return true;
  }

  const peggleModel = {
    createState: createPeggleState,
    aim(state, angle) {
      if (state.phase !== 'playing' || state.ball) return false;
      state.angle = Math.max(0.14, Math.min(Math.PI - 0.14, angle));
      return true;
    },
    shoot(state) {
      if (state.phase !== 'playing' || state.ball || state.remainingBalls <= 0) return false;
      state.remainingBalls--;
      state.shotHits = 0;
      state.usedGuide = state.guideNextShot;
      state.guideNextShot = false;
      const speed = 470;
      state.ball = {
        x: state.width / 2, y: 60,
        vx: Math.cos(state.angle) * speed,
        vy: Math.sin(state.angle) * speed,
        hitIds: []
      };
      state.message = state.usedGuide ? 'Đã bắn bóng; đường ngắm gợi ý được bật.' : 'Bóng đang bay. Chờ bóng rơi hoặc được giỏ hứng.';
      return true;
    },
    step(state, elapsed) {
      if (state.phase !== 'playing') return;
      const ball = state.ball;
      state.bucket.x += state.bucket.direction * 135 * elapsed;
      if (state.bucket.x < 60 || state.bucket.x > state.width - 60) state.bucket.direction *= -1;
      state.bucket.x = Math.max(60, Math.min(state.width - 60, state.bucket.x));
      if (!ball) return;
      const steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
      const dt = Math.min(elapsed, 0.05) / steps;
      for (let step = 0; step < steps && state.ball; step++) {
        const activeBall = state.ball;
        activeBall.vy += 620 * dt;
        activeBall.x += activeBall.vx * dt;
        activeBall.y += activeBall.vy * dt;
        if (activeBall.x < 9) {
          activeBall.x = 9;
          activeBall.vx = Math.abs(activeBall.vx) * 0.94;
        }
        if (activeBall.x > state.width - 9) {
          activeBall.x = state.width - 9;
          activeBall.vx = -Math.abs(activeBall.vx) * 0.94;
        }
        for (const peg of state.pegs) hitPegglePeg(state, activeBall, peg);
        if (state.remainingOranges === 0) {
          state.phase = 'won';
          state.message = `Đã dọn hết mục tiêu cam! Điểm: ${state.score}.`;
          return;
        }
        const nearBucket = activeBall.y >= state.height - 28 &&
          Math.abs(activeBall.x - state.bucket.x) <= state.bucket.width / 2;
        if (nearBucket) {
          state.remainingBalls++;
          state.ball = null;
          state.message = state.guideNextShot
            ? 'Giỏ đã hứng bóng: được trả lại một quả. Chốt xanh mở đường ngắm lượt tới.'
            : 'Giỏ đã hứng bóng: được trả lại một quả.';
          return;
        }
        if (activeBall.y > state.height + 10) {
          state.ball = null;
          if (state.remainingBalls <= 0) {
            state.phase = 'lost';
            state.message = 'Hết bóng trước khi dọn mục tiêu cam.';
          } else if (state.guideNextShot) {
            state.message = `Chốt xanh mở đường ngắm lượt tới; trúng ${state.shotHits} chốt.`;
          } else {
            state.message = state.shotHits ? `Lượt xong; trúng ${state.shotHits} chốt. Hãy ngắm quả tiếp.` : 'Bóng rơi ngoài giỏ. Hãy chỉnh góc ngắm.';
          }
        }
      }
    },
    updateBucket(state, elapsed) {
      state.bucket.x += state.bucket.direction * 135 * elapsed;
      if (state.bucket.x < 60 || state.bucket.x > state.width - 60) state.bucket.direction *= -1;
      state.bucket.x = Math.max(60, Math.min(state.width - 60, state.bucket.x));
    },
    guidePath: predictPeggleGuide
  };

  // Chuzzle: connected same-color groups, cyclic strip shifts, lock barriers,
  // gravity and cascades. There is no adjacent-gem swap operation here.
  function chuzzleMatches(board) {
    const visited = new Set();
    const groups = [];
    for (let row = 0; row < 6; row++) {
      for (let column = 0; column < 6; column++) {
        const key = `${row},${column}`;
        if (visited.has(key) || !board[row][column]) continue;
        const color = board[row][column].color;
        const group = [];
        const queue = [{ row, column }];
        visited.add(key);
        while (queue.length) {
          const position = queue.pop();
          group.push(position);
          for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nextRow = position.row + dy, nextColumn = position.column + dx;
            const nextKey = `${nextRow},${nextColumn}`;
            if (nextRow < 0 || nextRow >= 6 || nextColumn < 0 || nextColumn >= 6 || visited.has(nextKey)) continue;
            if (board[nextRow][nextColumn]?.color !== color) continue;
            visited.add(nextKey);
            queue.push({ row: nextRow, column: nextColumn });
          }
        }
        if (group.length >= 3) groups.push(group);
      }
    }
    return groups;
  }

  function createChuzzleState(options = {}) {
    const random = makeRandom(options.seed ?? 29);
    const board = makeGrid(6, 6);
    let attempts = 0;
    do {
      for (let row = 0; row < 6; row++) {
        for (let column = 0; column < 6; column++) {
          board[row][column] = { color: pick(random, CHUZZLE_COLORS), locked: false };
        }
      }
      attempts++;
    } while (chuzzleMatches(board).length && attempts < 500);
    if (options.locks !== false) {
      const lockRow = Math.floor(random() * 6), lockColumn = Math.floor(random() * 6);
      board[lockRow][lockColumn].locked = true;
    }
    return {
      board, random, level: 1, popped: 0, target: 24, score: 0,
      selected: { row: 2, column: 2 }, phase: 'playing',
      message: 'Kéo cả hàng hoặc cột. Ghép ba sinh vật cùng màu liền nhau.'
    };
  }

  function refillChuzzle(state) {
    for (let column = 0; column < 6; column++) {
      const survivors = [];
      for (let row = 5; row >= 0; row--) {
        if (state.board[row][column]) survivors.push(state.board[row][column]);
      }
      for (let row = 5; row >= 0; row--) {
        state.board[row][column] = survivors[5 - row] || { color: pick(state.random, CHUZZLE_COLORS), locked: false };
      }
    }
  }

  function resolveChuzzle(state) {
    let popped = 0, cascades = 0, groups;
    do {
      groups = chuzzleMatches(state.board);
      if (!groups.length) break;
      cascades++;
      const remove = new Set();
      groups.forEach(group => group.forEach(position => remove.add(`${position.row},${position.column}`)));
      for (const key of remove) {
        const [row, column] = key.split(',').map(Number);
        state.board[row][column] = null;
      }
      popped += remove.size;
      refillChuzzle(state);
    } while (cascades < 16);
    if (popped) {
      state.popped += popped;
      state.score += popped * 25 * cascades;
      if (state.popped >= state.target) {
        state.level++;
        state.target += 24;
        state.popped = 0;
        state.message = `Nivel ${state.level}: nueva meta de ${state.target} criaturas.`;
      } else {
        state.message = cascades > 1 ? `${popped} criaturas y ${cascades} cascadas.` : `${popped} criaturas eliminadas.`;
      }
    }
    return { popped, cascades };
  }

  function chuzzleShift(state, axis, index, direction) {
    if (state.phase !== 'playing' || !['row', 'column'].includes(axis) || index < 0 || index >= 6 || !direction) {
      return { valid: false, popped: 0, reason: 'invalid' };
    }
    const strip = axis === 'row'
      ? state.board[index]
      : state.board.map(row => row[index]);
    if (strip.some(cell => cell?.locked)) {
      state.message = 'Una criatura con candado bloquea toda esta línea.';
      return { valid: false, popped: 0, reason: 'locked' };
    }
    const original = strip.slice();
    const amount = ((Math.trunc(direction) % 6) + 6) % 6 || 1;
    const shifted = strip.map((_, position) => strip[(position - amount + 6) % 6]);
    if (axis === 'row') state.board[index] = shifted;
    else shifted.forEach((cell, row) => {
      state.board[row][index] = cell;
    });
    const groups = chuzzleMatches(state.board);
    if (!groups.length) {
      if (axis === 'row') state.board[index] = original;
      else original.forEach((cell, row) => {
        state.board[row][index] = cell;
      });
      state.message = 'Cách dịch này không tạo nhóm; dải đã trở về vị trí cũ.';
      return { valid: false, popped: 0, reason: 'no-match' };
    }
    const result = resolveChuzzle(state);
    return { valid: true, ...result };
  }

  const chuzzleModel = {
    createState: createChuzzleState,
    findMatches(state) { return chuzzleMatches(state.board); },
    resolve: resolveChuzzle,
    shift: chuzzleShift
  };

  function drawBackdrop(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#101a32');
    gradient.addColorStop(1, '#182d47');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawDrMario(ctx, state) {
    drawBackdrop(ctx, 640, 600);
    const left = 76, top = 42, cellSize = 31;
    ctx.fillStyle = '#dce8f5';
    ctx.font = 'bold 17px Calibri, Inter, sans-serif';
    ctx.fillText('BOTELLA', left, 28);
    ctx.fillStyle = '#0c1425';
    ctx.fillRect(left, top, cellSize * 8, cellSize * 16);
    ctx.strokeStyle = 'rgba(199,219,244,.22)';
    ctx.lineWidth = 1;
    for (let row = 0; row <= 16; row++) {
      ctx.beginPath();
      ctx.moveTo(left, top + row * cellSize);
      ctx.lineTo(left + cellSize * 8, top + row * cellSize);
      ctx.stroke();
    }
    for (let column = 0; column <= 8; column++) {
      ctx.beginPath();
      ctx.moveTo(left + column * cellSize, top);
      ctx.lineTo(left + column * cellSize, top + cellSize * 16);
      ctx.stroke();
    }
    const drawCell = (column, row, cell, radius = 12) => {
      const x = left + column * cellSize + cellSize / 2, y = top + row * cellSize + cellSize / 2;
      ctx.fillStyle = COLOR_HEX[cell.color];
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cell.type === 'virus' ? '#fff2bc' : 'rgba(255,255,255,.65)';
      ctx.lineWidth = cell.type === 'virus' ? 2 : 1;
      ctx.stroke();
      if (cell.type === 'virus') {
        ctx.fillStyle = '#20223a';
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 1.8, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + 3, 4, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }
    };
    state.grid.forEach((row, y) => row.forEach((cell, x) => {
      if (cell) drawCell(x, y, cell);
    }));
    drMarioCells(state.current).forEach(cell => drawCell(cell.x, cell.y, { ...cell, type: 'capsule' }));
    ctx.fillStyle = '#dce8f5';
    ctx.font = 'bold 16px Calibri, Inter, sans-serif';
    ctx.fillText('TIẾP THEO', 370, 70);
    const nextColors = state.next?.colors || [];
    nextColors.forEach((color, index) => {
      ctx.fillStyle = COLOR_HEX[color];
      ctx.beginPath();
      ctx.arc(399 + index * 30, 106, 12, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.font = '15px Calibri, Inter, sans-serif';
    ctx.fillStyle = '#c4d5ee';
    ctx.fillText(`Virus: ${state.viruses}`, 370, 158);
    ctx.fillText(`Tốc độ: ${state.speed}`, 370, 184);
    ctx.fillText(`Điểm: ${state.score}`, 370, 210);
    if (state.phase !== 'playing') {
      ctx.fillStyle = 'rgba(6,12,24,.77)';
      ctx.fillRect(left, top + 210, cellSize * 8, 85);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 25px Calibri, Inter, sans-serif';
      ctx.fillText(state.phase === 'won' ? 'ĐÃ SẠCH VIRUS' : 'CỔ LỌ BỊ CHẶN', left + 15, top + 258);
    }
  }

  function drawHanoi(ctx, state) {
    drawBackdrop(ctx, 640, 480);
    const centers = [140, 320, 500], baseY = 394, diskHeight = 28;
    ctx.fillStyle = '#e4d4a8';
    ctx.fillRect(60, baseY, 520, 13);
    centers.forEach((center, index) => {
      if (index === 2) {
        ctx.strokeStyle = '#f6d470';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(center, 132, 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center, 121);
        ctx.lineTo(center, 143);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center - 7, 136);
        ctx.lineTo(center, 143);
        ctx.lineTo(center + 7, 136);
        ctx.stroke();
      }
      ctx.fillStyle = state.selectedPeg === index ? '#fff0a8' : '#b08c63';
      ctx.fillRect(center - 7, 151, 14, baseY - 151);
      ctx.fillStyle = '#dce8f5';
      ctx.font = 'bold 16px Calibri, Inter, sans-serif';
      ctx.fillText(index === 2 ? 'ĐÍCH' : `CỌC ${index + 1}`, center - 29, 438);
      state.pegs[index].forEach((disk, level) => {
        const width = 52 + disk * 19;
        const x = center - width / 2, y = baseY - (level + 1) * diskHeight;
        ctx.fillStyle = ['#41b6cb', '#4d9ed5', '#8278db', '#bc75c7', '#e48d86', '#f0af5d', '#a7c76b'][disk - 1];
        ctx.beginPath();
        ctx.moveTo(x + 9, y);
        ctx.lineTo(x + width - 9, y);
        ctx.lineTo(x + width, y + diskHeight - 4);
        ctx.lineTo(x + width - 5, y + diskHeight);
        ctx.lineTo(x + 5, y + diskHeight);
        ctx.lineTo(x, y + diskHeight - 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff7dd';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
    ctx.fillStyle = '#e5eefb';
    ctx.font = 'bold 18px Calibri, Inter, sans-serif';
    ctx.fillText(`Lượt ${state.moves} / tối thiểu ${state.minimumMoves}`, 196, 74);
    if (state.phase === 'won') {
      ctx.fillStyle = 'rgba(6,12,24,.78)';
      ctx.fillRect(105, 190, 430, 83);
      ctx.fillStyle = '#f6d470';
      ctx.font = 'bold 30px Calibri, Inter, sans-serif';
      ctx.fillText('THÁP ĐÃ CHUYỂN!', 202, 242);
    }
  }

  function drawPeggle(ctx, state) {
    drawBackdrop(ctx, state.width, state.height);
    ctx.fillStyle = '#d5e2f1';
    ctx.font = 'bold 15px Calibri, Inter, sans-serif';
    ctx.fillText('PHAO', 296, 31);
    ctx.save();
    ctx.translate(state.width / 2, 60);
    ctx.rotate(state.angle - Math.PI / 2);
    ctx.fillStyle = '#c4d1e2';
    ctx.fillRect(-9, -23, 18, 46);
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,215,255,.18)';
    ctx.lineWidth = 1;
    for (let y = 86; y <= 520; y += 58) {
      ctx.beginPath();
      ctx.moveTo(55, y);
      ctx.lineTo(585, y);
      ctx.stroke();
    }
    const guidePath = peggleModel.guidePath(state);
    if (guidePath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(guidePath[0].x, guidePath[0].y);
      guidePath.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      ctx.strokeStyle = 'rgba(144, 245, 171, .92)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    state.pegs.forEach(peg => {
      if (!peg.active) return;
      ctx.fillStyle = peg.type === 'orange' ? '#f28a3d' : peg.type === 'green' ? '#69ca7c' : '#5f9fdc';
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (peg.type === 'green') {
        ctx.fillStyle = '#143b2b';
        ctx.font = 'bold 12px Calibri, sans-serif';
        ctx.fillText('★', peg.x - 4, peg.y + 4);
      }
    });
    ctx.fillStyle = '#dce8f5';
    ctx.fillRect(state.bucket.x - state.bucket.width / 2, state.height - 22, state.bucket.width, 14);
    ctx.fillStyle = '#182438';
    ctx.fillRect(state.bucket.x - state.bucket.width / 2 + 8, state.height - 20, state.bucket.width - 16, 9);
    if (state.ball) {
      ctx.fillStyle = '#fff2b2';
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#dce8f5';
    ctx.font = 'bold 16px Calibri, Inter, sans-serif';
    ctx.fillText(`Cam: ${state.remainingOranges}`, 36, 34);
    ctx.fillText(`Bóng: ${state.remainingBalls}`, 470, 34);
    ctx.fillText(`Điểm: ${state.score}`, 265, 34);
    if (state.phase !== 'playing') {
      ctx.fillStyle = 'rgba(6,12,24,.78)';
      ctx.fillRect(125, 244, 390, 88);
      ctx.fillStyle = '#f4d274';
      ctx.font = 'bold 28px Calibri, Inter, sans-serif';
      ctx.fillText(state.phase === 'won' ? 'MỤC TIÊU ĐÃ DỌN!' : 'HẾT BÓNG', 220, 298);
    }
  }

  function drawChuzzle(ctx, state) {
    drawBackdrop(ctx, 640, 600);
    const left = 115, top = 72, cellSize = 68;
    ctx.fillStyle = '#dce8f5';
    ctx.font = 'bold 17px Calibri, Inter, sans-serif';
    ctx.fillText(`MÀN ${state.level}`, left, 38);
    ctx.fillText(`Tiến độ ${state.popped} / ${state.target}`, left + 160, 38);
    state.board.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
      const x = left + columnIndex * cellSize, y = top + rowIndex * cellSize;
      ctx.fillStyle = 'rgba(245,248,255,.055)';
      ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      ctx.fillStyle = COLOR_HEX[cell.color];
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.34)';
      ctx.beginPath();
      ctx.arc(x + 14, y + 16, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#243148';
      ctx.beginPath();
      ctx.arc(x + 27, y + 29, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 40, y + 29, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = state.selected.row === rowIndex && state.selected.column === columnIndex ? '#fff4a6' : '#e8f1fc';
      ctx.lineWidth = state.selected.row === rowIndex && state.selected.column === columnIndex ? 4 : 1.5;
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, 28, 0, Math.PI * 2);
      ctx.stroke();
      if (cell.locked) {
        ctx.fillStyle = '#ffe49a';
        ctx.fillRect(x + 44, y + 4, 17, 17);
        ctx.strokeStyle = '#55452b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 48, y + 9, 9, 9);
      }
    }));
    if (state.phase === 'won') {
      ctx.fillStyle = 'rgba(6,12,24,.76)';
      ctx.fillRect(left, 215, cellSize * 6, 90);
      ctx.fillStyle = '#f6d470';
      ctx.font = 'bold 27px Calibri, Inter, sans-serif';
      ctx.fillText('MỤC TIÊU HOÀN TẤT!', left + 50, 270);
    }
  }

  function makeStage(container, game, options, model, state, draw, update) {
    const stage = window.NP_Fidelity.createStage(container, game, options);
    const refresh = message => {
      if (message) state.message = message;
      stage.status(state.message);
      stage.setHUD(state.phase === 'playing' ? `Đang chơi · ${state.message}` : state.message);
    };
    stage.frame(dt => {
      if (update) update(dt);
      refresh();
    }, ctx => draw(ctx, state));
    return { stage, refresh };
  }

  function launchDrMario(container, game) {
    const model = drMarioModel;
    const state = model.createState();
    const { stage, refresh } = makeStage(container, game, {
      width: 640, height: 600,
      hint: '←/→ di chuyển · Xoay để đổi chiều · Thả nhanh để khóa viên nang.'
    }, model, state, drawDrMario, dt => model.update(state, dt));
    const act = action => {
      action();
      refresh();
    };
    stage.button('← Trái', () => act(() => model.move(state, -1)));
    stage.button('Phải →', () => act(() => model.move(state, 1)));
    stage.button('Xoay', () => act(() => model.rotate(state)));
    stage.button('Rơi nhanh', () => act(() => model.drop(state)));
    stage.button('Chơi lại', () => act(() => Object.assign(state, model.createState())));
    stage.on('keydown', event => {
      if (event.key === 'ArrowLeft') model.move(state, -1);
      else if (event.key === 'ArrowRight') model.move(state, 1);
      else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'x') model.rotate(state);
      else if (event.key === 'ArrowDown') model.update(state, 0.8);
      else if (event.key === ' ') model.drop(state);
      refresh();
    });
    stage.canvas.focus();
  }

  function launchHanoi(container, game) {
    const state = hanoiModel.createState();
    const { stage, refresh } = makeStage(container, game, {
      width: 640, height: 480,
      hint: 'Chọn cọc nguồn rồi cọc đích; mỗi lượt chỉ chuyển đĩa trên cùng.'
    }, hanoiModel, state, drawHanoi);
    function restart(count = state.diskCount) {
      hanoiModel.reset(state, count);
      state.message = `Đã bắt đầu tháp ${state.diskCount} đĩa. Chọn cọc nguồn.`;
    }
    for (let count = 3; count <= 7; count++) {
      stage.button(`${count} đĩa`, () => {
        restart(count);
        refresh();
      });
    }
    stage.button('Hoàn tác', () => {
      hanoiModel.undo(state);
      refresh();
    });
    stage.button('Làm mới', () => {
      restart();
      refresh();
    });
    stage.on('pointerdown', event => {
      const point = stage.point(event);
      const centers = [140, 320, 500];
      const peg = centers.reduce((closest, center, index) =>
        Math.abs(center - point.x) < Math.abs(centers[closest] - point.x) ? index : closest, 0);
      if (point.y < 120 || point.y > 420) return;
      if (state.selectedPeg === null) {
        if (state.pegs[peg].length) {
          state.selectedPeg = peg;
          state.message = `Cọc ${peg + 1} được chọn; chạm cọc đích.`;
        } else state.message = 'Cọc này đang trống.';
      } else if (state.pegs[peg].length || peg !== state.selectedPeg) {
        const from = state.selectedPeg;
        if (!hanoiModel.move(state, from, peg)) state.selectedPeg = from;
      }
      refresh();
    });
    stage.canvas.focus();
    refresh();
  }

  function launchPeggle(container, game) {
    const state = peggleModel.createState();
    const { stage, refresh } = makeStage(container, game, {
      width: state.width, height: state.height,
      hint: 'Chạm bảng để ngắm, rồi bắn. Chỉ bắn lại khi bóng rơi hoặc vào giỏ.'
    }, peggleModel, state, drawPeggle, dt => peggleModel.step(state, dt));
    stage.button('Bắn bóng', () => {
      peggleModel.shoot(state);
      refresh();
    });
    stage.button('Ngắm ←', () => {
      peggleModel.aim(state, state.angle - 0.08);
      refresh();
    });
    stage.button('Ngắm →', () => {
      peggleModel.aim(state, state.angle + 0.08);
      refresh();
    });
    stage.button('Chơi lại', () => {
      Object.assign(state, peggleModel.createState());
      refresh();
    });
    stage.on('pointermove', event => {
      if (state.ball || state.phase !== 'playing') return;
      const point = stage.point(event);
      peggleModel.aim(state, Math.atan2(point.y - 60, point.x - state.width / 2));
      refresh();
    });
    stage.on('pointerdown', event => {
      if (state.ball || state.phase !== 'playing') return;
      const point = stage.point(event);
      peggleModel.aim(state, Math.atan2(point.y - 60, point.x - state.width / 2));
      refresh();
    });
    stage.on('keydown', event => {
      if (event.key === 'ArrowLeft') peggleModel.aim(state, state.angle - 0.08);
      if (event.key === 'ArrowRight') peggleModel.aim(state, state.angle + 0.08);
      if (event.key === ' ' || event.key === 'Enter') peggleModel.shoot(state);
      refresh();
    });
    stage.canvas.focus();
    refresh();
  }

  function launchChuzzle(container, game) {
    const state = chuzzleModel.createState();
    const { stage, refresh } = makeStage(container, game, {
      width: 640, height: 600,
      hint: 'Chọn sinh vật rồi dịch cả hàng hoặc cột bằng các nút mũi tên.'
    }, chuzzleModel, state, drawChuzzle);
    function shift(axis, direction) {
      const index = axis === 'row' ? state.selected.row : state.selected.column;
      chuzzleModel.shift(state, axis, index, direction);
      refresh();
    }
    stage.button('Hàng ←', () => shift('row', -1));
    stage.button('Hàng →', () => shift('row', 1));
    stage.button('Cột ↑', () => shift('column', -1));
    stage.button('Cột ↓', () => shift('column', 1));
    stage.button('Chơi lại', () => {
      Object.assign(state, chuzzleModel.createState());
      refresh();
    });
    stage.on('pointerdown', event => {
      const point = stage.point(event);
      const column = Math.floor((point.x - 115) / 68);
      const row = Math.floor((point.y - 72) / 68);
      if (row >= 0 && row < 6 && column >= 0 && column < 6) {
        state.selected = { row, column };
        state.message = `Đã chọn hàng ${row + 1}, cột ${column + 1}. Dịch cả dải bằng nút bên dưới.`;
        refresh();
      }
    });
    stage.canvas.focus();
    refresh();
  }

  const definitions = [
    {
      id: 'dr-mario-diet-khuan', title: 'Dr. Mario · Diệt khuẩn', category: 'Xếp hình',
      reference: { title: 'Dr. Mario instruction manual', url: 'https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAXE_en.pdf', platform: 'NES' },
      coreMechanics: ['8×16 chai thuốc', 'viên nang hai nửa liên kết', 'virus đứng yên', 'xóa hàng/dọc từ bốn ô cùng màu', 'tách đôi và trọng lực', 'liên hoàn', 'thắng khi hết virus; thua khi nghẽn cổ chai'],
      model: drMarioModel, launch: launchDrMario
    },
    {
      id: 'thap-ha-noi-tower', title: 'Tháp Hà Nội', category: 'Giải đố',
      reference: { title: 'Tower of Hanoi', url: 'https://library.ethz.ch/en/collections-and-archives/platforms/virtual-exhibitions/Its-all-math-and-games/tower-of-hanoi.html', platform: 'Puzzle' },
      coreMechanics: ['ba cọc', 'ba đến bảy đĩa', 'chỉ chuyển đĩa trên cùng', 'không đặt đĩa lớn lên đĩa nhỏ', 'đếm lượt và mốc 2^n−1', 'hoàn tác và làm lại'],
      model: hanoiModel, launch: launchHanoi
    },
    {
      id: 'peggle-pachinko', title: 'Peggle · Bắn bi', category: 'Arcade',
      reference: { title: 'Peggle 2 Game Help', url: 'https://dlassets-ssl.xboxlive.com/public/content/efd011ea-47b6-4b61-9e86-08063a3e1cfa/GameManual/2968fc9a-311b-4beb-8ee6-3903d1bc8643/en-GB/index.html', platform: 'Arcade' },
      coreMechanics: ['ngắm và bắn bóng chịu trọng lực', 'va chạm chốt phản lực', 'chốt mục tiêu màu cam', 'tối đa mười bóng', 'cesto chuyển động hoàn bóng', 'chốt xanh mở hướng dẫn ngắm lượt kế', 'thắng khi hết chốt cam'],
      model: peggleModel, launch: launchPeggle
    },
    {
      id: 'chuzzle', title: 'Chuzzle', category: 'Giải đố',
      reference: { title: 'Chuzzle Deluxe', url: 'https://store.steampowered.com/app/3310/Chuzzle_Deluxe/', platform: 'PC' },
      coreMechanics: ['sinh vật nhiều màu trên bảng 6×6', 'dịch cả dải hàng hoặc cột vòng quanh', 'nhóm cùng màu liền nhau từ ba ô', 'nổ, rơi, nạp lại và liên hoàn', 'khóa cản dải', 'tiến độ mục tiêu theo màn'],
      model: chuzzleModel, launch: launchChuzzle
    }
  ];

  definitions.forEach(definition => {
    window.NP_Fidelity.register(definition.id, {
      ...definition,
      newGame: false
    });
  });
})();

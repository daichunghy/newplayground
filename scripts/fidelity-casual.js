/* Ten self-contained casual/logic classics. Models are also the live UI state. */
(function () {
  'use strict';

  const F = window.NP_Fidelity;
  const coord = (row, col) => `${row},${col}`;
  const parseCoord = value => Array.isArray(value) ? value : String(value).split(',').map(Number);
  const randomFrom = (list, random = Math.random) => list[Math.floor(random() * list.length)];
  const choice = (list, count, random = Math.random) => {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  };

  function makeSimon() {
    const model = {
      create(sequence = null) {
        return { sequence: sequence ? sequence.slice() : [Math.floor(Math.random() * 4)], cursor: 0,
          phase: 'playback', result: null, round: 1 };
      },
      beginInput(game) { if (!game.result) { game.phase = 'input'; game.cursor = 0; } },
      beginPlayback(game) { if (!game.result) { game.phase = 'playback'; game.cursor = 0; } },
      press(game, pad) {
        if (game.result || game.phase !== 'input' || !Number.isInteger(pad) || pad < 0 || pad > 3) return { accepted: false };
        if (game.sequence[game.cursor] !== pad) { game.result = 'lost'; game.phase = 'done'; return { accepted: true, result: 'wrong' }; }
        game.cursor++;
        if (game.cursor === game.sequence.length) {
          game.sequence.push(Math.floor(Math.random() * 4)); game.round++; game.phase = 'playback'; game.cursor = 0;
          return { accepted: true, roundComplete: true };
        }
        return { accepted: true };
      }
    };
    return model;
  }

  const ENGLISH_WORDS = ['apple', 'river', 'stone', 'light', 'plant', 'cloud', 'house', 'music', 'dream', 'chair', 'bread', 'flame', 'grape', 'smile', 'train', 'crown', 'beach', 'clock', 'lemon', 'tiger', 'planet', 'orange', 'castle', 'bridge', 'flower', 'rocket', 'window', 'puzzle'];
  function makeHangman() {
    const model = {
      words: ENGLISH_WORDS,
      create(word = randomFrom(ENGLISH_WORDS)) { return { word: word.toLowerCase(), guesses: new Set(), misses: 0, result: null }; },
      view(game) { return [...game.word].map(letter => letter === ' ' ? ' ' : game.guesses.has(letter) ? letter.toUpperCase() : '_').join(' '); },
      guess(game, raw) {
        const letter = String(raw).toLowerCase();
        if (game.result || !/^[a-z]$/.test(letter)) return { valid: false };
        if (game.guesses.has(letter)) return { valid: true, repeated: true, misses: game.misses };
        game.guesses.add(letter);
        if (!game.word.includes(letter)) game.misses++;
        if ([...game.word].every(char => char === ' ' || game.guesses.has(char))) game.result = 'won';
        else if (game.misses >= 6) game.result = 'lost';
        return { valid: true, misses: game.misses, result: game.result };
      }
    };
    return model;
  }

  const SEARCH_WORDS = ['PLANET', 'ORANGE', 'CASTLE', 'BRIDGE', 'FLOWER', 'ROCKET', 'WINDOW', 'PUZZLE'];
  function makeWordSearch() {
    const model = {
      words: SEARCH_WORDS,
      create(seed = Date.now()) {
        let state = seed >>> 0;
        const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
        const grid = Array.from({ length: 10 }, () => Array(10).fill(''));
        const placements = {};
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const word of SEARCH_WORDS) {
          let placed = false;
          for (let attempt = 0; attempt < 500 && !placed; attempt++) {
            const [dr, dc] = dirs[Math.floor(random() * dirs.length)];
            const r = Math.floor(random() * 10), c = Math.floor(random() * 10);
            const cells = Array.from({ length: word.length }, (_, i) => [r + dr * i, c + dc * i]);
            if (cells.some(([row, col]) => row < 0 || row >= 10 || col < 0 || col >= 10 ||
              (grid[row][col] && grid[row][col] !== word[cells.findIndex(cell => cell[0] === row && cell[1] === col)]))) continue;
            cells.forEach(([row, col], i) => { grid[row][col] = word[i]; });
            placements[word] = { cells };
            placed = true;
          }
          if (!placed) throw new Error(`Could not place ${word}`);
        }
        for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if (!grid[r][c]) grid[r][c] = String.fromCharCode(65 + Math.floor(random() * 26));
        return { grid, words: SEARCH_WORDS.slice(), placements, found: new Set(), result: null };
      },
      select(game, from, to) {
        if (game.result) return { valid: false };
        const [r1, c1] = parseCoord(from), [r2, c2] = parseCoord(to);
        const drRaw = r2 - r1, dcRaw = c2 - c1;
        const distance = Math.max(Math.abs(drRaw), Math.abs(dcRaw));
        if (!distance || (drRaw && dcRaw && Math.abs(drRaw) !== Math.abs(dcRaw))) return { valid: false };
        const dr = Math.sign(drRaw), dc = Math.sign(dcRaw);
        const letters = Array.from({ length: distance + 1 }, (_, i) => {
          const r = r1 + dr * i, c = c1 + dc * i;
          return game.grid[r]?.[c] ?? '';
        }).join('');
        const word = game.words.find(item => !game.found.has(item) && (item === letters || item === [...letters].reverse().join('')));
        if (!word) return { valid: false };
        game.found.add(word);
        if (game.found.size === game.words.length) game.result = 'won';
        return { valid: true, word, result: game.result };
      }
    };
    return model;
  }

  const WORDLE_ALLOWED = new Set(ENGLISH_WORDS.filter(word => word.length === 5).concat(['eagle', 'allee', 'hello', 'crane', 'slate', 'stare', 'tears', 'react', 'trace', 'cater', 'later', 'alert', 'adieu', 'arise', 'raise', 'audio', 'sugar', 'night', 'thing', 'there', 'their', 'other', 'world', 'words', 'guess', 'games', 'green', 'apple', 'peach', 'grape', 'lemon', 'train', 'crown', 'beach', 'clock', 'tiger', 'smile', 'bread', 'flame', 'plant', 'cloud', 'house', 'music', 'dream', 'chair']));
  function makeWordle() {
    const model = {
      allowed: WORDLE_ALLOWED,
      create(answer = randomFrom([...WORDLE_ALLOWED].filter(word => word.length === 5))) {
        return { answer: answer.toLowerCase(), guesses: [], result: null };
      },
      evaluate(answer, guess) {
        const result = Array(5).fill('gray'), remaining = {};
        for (let i = 0; i < 5; i++) if (guess[i] === answer[i]) result[i] = 'green';
        for (let i = 0; i < 5; i++) if (result[i] !== 'green') remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
        for (let i = 0; i < 5; i++) {
          if (result[i] === 'green') continue;
          if (remaining[guess[i]] > 0) { result[i] = 'yellow'; remaining[guess[i]]--; }
        }
        return result;
      },
      submit(game, raw) {
        const guess = String(raw).toLowerCase();
        if (game.result || !/^[a-z]{5}$/.test(guess) || !WORDLE_ALLOWED.has(guess)) return { valid: false };
        const colors = model.evaluate(game.answer, guess);
        game.guesses.push({ word: guess, colors });
        if (guess === game.answer) game.result = 'won';
        else if (game.guesses.length === 6) game.result = 'lost';
        return { valid: true, colors, result: game.result };
      }
    };
    return model;
  }

  function makeThrees() {
    const model = {
      create(random = Math.random) {
        const board = Array(16).fill(0);
        board[Math.floor(random() * 16)] = random() < 0.5 ? 1 : 2;
        return { board, next: random() < 0.5 ? 1 : 2, score: 0, result: null, random };
      },
      tileScore(value) {
        if (value < 3) return value;
        let rank = 3, score = 3;
        while (rank < value) { rank *= 2; score *= 3; }
        return score;
      },
      move(game, direction) {
        if (game.result || !['left', 'right', 'up', 'down'].includes(direction)) return { valid: false };
        const old = game.board.slice(), next = old.slice(), merged = new Set();
        const lines = [];
        for (let outer = 0; outer < 4; outer++) {
          const line = [];
          for (let inner = 0; inner < 4; inner++) {
            const r = direction === 'up' ? inner : direction === 'down' ? 3 - inner : outer;
            const c = direction === 'left' ? inner : direction === 'right' ? 3 - inner : outer;
            line.push(r * 4 + c);
          }
          lines.push(line);
        }
        for (const line of lines) {
          for (let p = 1; p < 4; p++) {
            const from = line[p], to = line[p - 1];
            if (!next[from]) continue;
            if (!next[to]) { next[to] = next[from]; next[from] = 0; continue; }
            const a = next[from], b = next[to];
            const canMerge = (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b);
            if (canMerge && !merged.has(to)) {
              next[to] = a + b; next[from] = 0; merged.add(to); game.score += model.tileScore(a + b);
            }
          }
        }
        if (next.every((value, index) => value === old[index])) return { valid: false };
        game.board = next;
        const trailing = direction === 'left' ? [3, 7, 11, 15] : direction === 'right' ? [0, 4, 8, 12] : direction === 'up' ? [12, 13, 14, 15] : [0, 1, 2, 3];
        const open = trailing.filter(index => !game.board[index]);
        const empties = game.board.map((value, index) => value ? -1 : index).filter(index => index >= 0);
        if (empties.length && open.length) {
          const spawn = randomFrom(open, game.random || Math.random);
          game.board[spawn] = game.next;
          game.next = Math.random() < 1 / 3 ? 1 : Math.random() < 0.5 ? 2 : 3;
        }
        if (!model.canMove(game)) game.result = 'lost';
        return { valid: true };
      },
      canMove(game) {
        if (game.board.includes(0)) return true;
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          const a = game.board[r * 4 + c];
          for (const [dr, dc] of [[1, 0], [0, 1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 4 || nc >= 4) continue;
            const b = game.board[nr * 4 + nc];
            if ((a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b)) return true;
          }
        }
        return false;
      }
    };
    return model;
  }

  function make3DTicTacToe() {
    const lines = new Set();
    for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, -1, 0], [1, 0, 1], [1, 0, -1], [0, 1, 1], [0, 1, -1], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1]]) {
        const end = [x + 2 * dx, y + 2 * dy, z + 2 * dz];
        if (end.every(value => value >= 0 && value < 3)) lines.add([[x, y, z], [x + dx, y + dy, z + dz], end].map(([a, b, c]) => c * 9 + b * 3 + a).join(','));
      }
    }
    const winningLines = [...lines].map(line => line.split(',').map(Number));
    const model = {
      winningLines,
      create() { return { cells: Array(27).fill(null), turn: 'X', result: null }; },
      play(game, cell) {
        if (game.result || !Number.isInteger(cell) || cell < 0 || cell >= 27 || game.cells[cell]) return { valid: false };
        game.cells[cell] = game.turn;
        if (winningLines.some(line => line.every(index => game.cells[index] === game.turn))) game.result = game.turn;
        else if (game.cells.every(Boolean)) game.result = 'draw';
        else game.turn = game.turn === 'X' ? 'O' : 'X';
        return { valid: true, result: game.result };
      }
    };
    return model;
  }

  function makeUltimate() {
    const model = {
      create() { return { boards: Array.from({ length: 9 }, () => Array(9).fill(null)), closed: Array(9).fill(null), turn: 'X', forcedBoard: null, result: null }; },
      boardResult(board) {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const mark of ['X', 'O']) if (lines.some(line => line.every(index => board[index] === mark))) return mark;
        return board.every(Boolean) ? 'draw' : null;
      },
      play(game, board, cell) {
        if (game.result || !Number.isInteger(board) || board < 0 || board > 8 || !Number.isInteger(cell) || cell < 0 || cell > 8 || game.closed[board] || game.boards[board][cell]) return { valid: false };
        if (game.forcedBoard !== null && !game.closed[game.forcedBoard] && board !== game.forcedBoard) return { valid: false };
        game.boards[board][cell] = game.turn;
        game.closed[board] = model.boardResult(game.boards[board]);
        const global = model.boardResult(game.closed);
        if (global === 'X' || global === 'O') game.result = global;
        else if (game.closed.every(Boolean)) game.result = 'draw';
        else {
          const target = cell;
          game.forcedBoard = game.closed[target] ? null : target;
          game.turn = game.turn === 'X' ? 'O' : 'X';
        }
        return { valid: true, result: game.result };
      }
    };
    return model;
  }

  function makeSet() {
    const model = {
      deck() { return Array.from({ length: 81 }, (_, id) => [id % 3, Math.floor(id / 3) % 3, Math.floor(id / 9) % 3, Math.floor(id / 27) % 3]); },
      isSet(cards) {
        return cards.length === 3 && cards[0].every((_, feature) => {
          const values = new Set(cards.map(card => card[feature]));
          return values.size === 1 || values.size === 3;
        });
      },
      create(random = Math.random) {
        const deck = model.deck();
        for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        const table = deck.splice(0, 12);
        const game = { deck, table, selected: [], result: null, score: 0 };
        if (!model.hasSet(table)) model.addThree(game);
        return game;
      },
      hasSet(cards) { for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) for (let c = b + 1; c < cards.length; c++) if (model.isSet([cards[a], cards[b], cards[c]])) return true; return false; },
      select(game, index) {
        if (game.result || !Number.isInteger(index) || !game.table[index]) return { valid: false };
        if (game.selected.includes(index)) { game.selected = game.selected.filter(value => value !== index); return { valid: true, removed: true }; }
        game.selected.push(index);
        if (game.selected.length < 3) return { valid: true };
        const cards = game.selected.map(i => game.table[i]);
        if (!model.isSet(cards)) { game.selected = []; return { valid: false, set: false }; }
        const selected = game.selected.slice().sort((a, b) => b - a);
        for (const i of selected) game.table.splice(i, 1);
        game.score++;
        const refill = Math.min(3, Math.max(0, 12 - game.table.length), game.deck.length);
        for (let i = 0; i < refill; i++) game.table.push(game.deck.pop());
        game.selected = [];
        if (!game.deck.length && !model.hasSet(game.table)) game.result = 'won';
        return { valid: true, set: true, result: game.result };
      },
      addThree(game) {
        if (game.result || game.deck.length === 0 || model.hasSet(game.table)) return false;
        game.table.push(...game.deck.splice(-Math.min(3, game.deck.length)));
        if (!game.deck.length && !model.hasSet(game.table)) game.result = 'won';
        return true;
      }
    };
    return model;
  }

  function makePeg() {
    const holes = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if ((r >= 2 && r <= 4) || (c >= 2 && c <= 4)) holes.push([r, c]);
    const model = {
      holes,
      create() { return { holes: holes.map(([r, c]) => [r, c]), pegs: new Set(holes.map(([r, c]) => coord(r, c)).filter(key => key !== '3,3')), history: [], result: null }; },
      move(game, fromValue, toValue) {
        if (game.result) return { valid: false };
        const [r1, c1] = parseCoord(fromValue), [r2, c2] = parseCoord(toValue);
        const mid = [((r1 + r2) / 2), ((c1 + c2) / 2)];
        const a = coord(r1, c1), b = coord(r2, c2), jumped = coord(...mid);
        const validHole = key => holes.some(([r, c]) => coord(r, c) === key);
        if (!validHole(a) || !validHole(b) || Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 2 || game.pegs.has(b) || !game.pegs.has(a) || !game.pegs.has(jumped)) return { valid: false };
        game.history.push([...game.pegs]);
        game.pegs.delete(a); game.pegs.delete(jumped); game.pegs.add(b);
        if (game.pegs.size === 1 && game.pegs.has('3,3')) game.result = 'won';
        else if (!model.hasMove(game)) game.result = 'lost';
        return { valid: true, result: game.result };
      },
      hasMove(game) {
        for (const key of game.pegs) {
          const [r, c] = key.split(',').map(Number);
          for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) if (game.pegs.has(coord(r + dr, c + dc)) && !game.pegs.has(coord(r + 2 * dr, c + 2 * dc)) && holes.some(([hr, hc]) => hr === r + 2 * dr && hc === c + 2 * dc)) return true;
        }
        return false;
      },
      undo(game) { if (!game.history.length) return false; game.pegs = new Set(game.history.pop()); game.result = null; return true; }
    };
    return model;
  }

  const RUSH_BOARDS = [
    [
      { id: 'red', row: 2, col: 0, len: 2, axis: 'h', red: true },
      { id: 'block', row: 1, col: 2, len: 2, axis: 'v' },
      { id: 'blue', row: 0, col: 2, len: 2, axis: 'h' },
      { id: 'parked', row: 5, col: 0, len: 2, axis: 'h' }
    ],
    [
      { id: 'red', row: 2, col: 0, len: 2, axis: 'h', red: true },
      { id: 'block', row: 1, col: 3, len: 2, axis: 'v' },
      { id: 'green', row: 0, col: 3, len: 2, axis: 'h' },
      { id: 'parked', row: 5, col: 3, len: 2, axis: 'h' }
    ],
    [
      { id: 'red', row: 2, col: 0, len: 2, axis: 'h', red: true },
      { id: 'block', row: 1, col: 4, len: 2, axis: 'v' },
      { id: 'gold', row: 0, col: 4, len: 2, axis: 'h' },
      { id: 'parked', row: 5, col: 0, len: 3, axis: 'h' }
    ]
  ];
  function makeRush() {
    const model = {
      boards: RUSH_BOARDS,
      create(index = 0) { return { cars: RUSH_BOARDS[index % RUSH_BOARDS.length].map(car => ({ ...car })), moves: 0, history: [], result: null }; },
      occupied(cars, ignoreId = null) {
        const cells = new Map();
        for (const car of cars) if (car.id !== ignoreId) for (let i = 0; i < car.len; i++) {
          const r = car.row + (car.axis === 'v' ? i : 0), c = car.col + (car.axis === 'h' ? i : 0);
          cells.set(coord(r, c), car.id);
        }
        return cells;
      },
      move(game, id, delta) {
        if (game.result || !Number.isInteger(delta) || !delta) return { valid: false };
        const car = game.cars.find(item => item.id === id);
        if (!car) return { valid: false };
        const step = Math.sign(delta), count = Math.abs(delta);
        let moved = 0;
        for (let n = 0; n < count; n++) {
          const nextRow = car.row + (car.axis === 'v' ? step : 0), nextCol = car.col + (car.axis === 'h' ? step : 0);
          const endRow = nextRow + (car.axis === 'v' ? car.len - 1 : 0), endCol = nextCol + (car.axis === 'h' ? car.len - 1 : 0);
          if (car.red && step > 0 && endCol === 6 && nextRow === 2) { game.history.push(game.cars.map(item => ({ ...item }))); car.row = nextRow; car.col = nextCol; game.moves++; game.result = 'won'; return { valid: true, result: 'won' }; }
          if (nextRow < 0 || nextCol < 0 || endRow > 5 || endCol > 5) return moved ? { valid: true } : { valid: false };
          const occupied = model.occupied(game.cars, car.id);
          if (occupied.has(coord(step > 0 ? endRow : nextRow, step > 0 ? endCol : nextCol))) return moved ? { valid: true } : { valid: false };
          if (car.red && nextRow === 2 && nextCol >= 6) return moved ? { valid: true } : { valid: false };
          game.history.push(game.cars.map(item => ({ ...item })));
          car.row = nextRow; car.col = nextCol; game.moves++;
          moved++;
        }
        return { valid: true };
      },
      solve(board) {
        const start = board.map(car => ({ ...car }));
        const key = cars => cars.map(car => `${car.row}${car.col}`).join('|');
        const queue = [start], seen = new Set([key(start)]);
        for (let q = 0; q < queue.length && q < 20000; q++) {
          const cars = queue[q], red = cars.find(car => car.red);
          if (red.col + red.len >= 6 && !cars.some(car => car.id !== red.id && car.row === 2 && car.axis === 'v' && red.col + red.len <= car.col && car.col < 6)) return true;
          for (const car of cars) for (const direction of [-1, 1]) {
            const moved = cars.map(item => ({ ...item })), item = moved.find(value => value.id === car.id);
            item[car.axis === 'h' ? 'col' : 'row'] += direction;
            const endRow = item.row + (item.axis === 'v' ? item.len - 1 : 0), endCol = item.col + (item.axis === 'h' ? item.len - 1 : 0);
            if (item.row < 0 || item.col < 0 || endRow > 5 || endCol > 5) continue;
            const occ = model.occupied(moved, item.id);
            let collision = false;
            for (let i = 0; i < item.len; i++) if (occ.has(coord(item.row + (item.axis === 'v' ? i : 0), item.col + (item.axis === 'h' ? i : 0)))) collision = true;
            if (!collision && !seen.has(key(moved))) { seen.add(key(moved)); queue.push(moved); }
          }
        }
        return false;
      },
      undo(game) { if (!game.history.length || game.result) return false; game.cars = game.history.pop(); game.moves = Math.max(0, game.moves - 1); return true; }
    };
    return model;
  }

  const models = {
    'simon-memory': makeSimon(), 'hangman-words': makeHangman(), 'word-search-grid': makeWordSearch(),
    'wordle-five': makeWordle(), 'threes-tiles': makeThrees(), 'tic-tac-toe-3d': make3DTicTacToe(),
    'ultimate-tic-tac-toe': makeUltimate(), 'set-card-triples': makeSet(), 'peg-solitaire-cross': makePeg(),
    'rush-hour-sliding': makeRush()
  };
  const colors = ['#e84c4f', '#4d9e61', '#f1c340', '#4786df'];
  const titles = {
    'simon-memory': 'Simon Memory', 'hangman-words': 'Hangman Words', 'word-search-grid': 'Word Search',
    'wordle-five': 'Wordle Five', 'threes-tiles': 'Threes', 'tic-tac-toe-3d': '3D Tic-Tac-Toe',
    'ultimate-tic-tac-toe': 'Ultimate Tic-Tac-Toe', 'set-card-triples': 'SET', 'peg-solitaire-cross': 'Peg Solitaire',
    'rush-hour-sliding': 'Rush Hour'
  };

  function ink(ctx, text, x, y, size = 18, color = '#26334a', align = 'center') {
    ctx.fillStyle = color; ctx.font = `600 ${size}px Calibri, Inter, -apple-system, sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(String(text), x, y);
  }
  function rect(ctx, x, y, w, h, fill, stroke = '#d6dce6', radius = 8) {
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); ctx.stroke();
  }
  function launchGame(id, container, game) {
    const model = models[id];
    const stage = F.createStage(container, game, { width: 640, height: 540, hint: hintFor(id) });
    let rushBoard = 0;
    let state = fresh();
    let message = 'Ready';
    let selected = null;
    let dragStart = null;
    let playTimers = [];
    let playbackToken = 0;
    let wordleInput = '';
    let rushPointerStart = null;
    function fresh() {
      if (id === 'simon-memory') return model.create();
      if (id === 'hangman-words') return model.create();
      if (id === 'word-search-grid') return model.create();
      if (id === 'wordle-five') return model.create();
      if (id === 'threes-tiles') return model.create();
      if (id === 'tic-tac-toe-3d' || id === 'ultimate-tic-tac-toe') return model.create();
      if (id === 'set-card-triples') return model.create();
      if (id === 'peg-solitaire-cross') return model.create();
      return model.create(rushBoard);
    }
    function cancelPlayback() {
      playbackToken++;
      playTimers.forEach(timer => stage.session.clearTimeout(timer));
      playTimers = [];
    }
    function startPlayback() {
      cancelPlayback();
      model.beginPlayback(state);
      const token = playbackToken;
      state.phase = 'playback';
      state.cursor = 0;
      const sequence = state.sequence.slice();
      sequence.forEach((pad, index) => {
        const timer = stage.session.setTimeout(() => {
          if (token !== playbackToken || !stage.session.isActive()) return;
          state.cursor = index;
          tone(pad);
          message = `Listen · ${index + 1}/${sequence.length}`;
          if (index === sequence.length - 1) {
            const finish = stage.session.setTimeout(() => {
              if (token !== playbackToken) return;
              state.cursor = 0; model.beginInput(state); message = 'Your turn';
            }, 280);
            playTimers.push(finish);
          }
        }, 350 + index * 600);
        playTimers.push(timer);
      });
    }
    function tone(pad) {
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        const audio = launchGame.audio || (launchGame.audio = new Audio());
        if (audio.state === 'suspended') audio.resume();
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.frequency.value = [261.6, 329.6, 392, 523.3][pad];
        oscillator.type = 'sine'; gain.gain.setValueAtTime(0.001, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, audio.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.23);
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.24);
      } catch (error) { /* audio is optional; color and shape remain distinct */ }
    }
    function restart() {
      if (id === 'simon-memory') cancelPlayback();
      if (id === 'rush-hour-sliding') { rushBoard = (rushBoard + 1) % model.boards.length; }
      state = fresh(); selected = null; dragStart = null; wordleInput = ''; message = 'Ready';
      if (id === 'simon-memory') startPlayback();
    }
    stage.button('New game', restart);
    if (id === 'rush-hour-sliding') {
      stage.button('Board 1', () => { rushBoard = 0; state = model.create(0); selected = null; message = 'Board 1'; });
      stage.button('Board 2', () => { rushBoard = 1; state = model.create(1); selected = null; message = 'Board 2'; });
      stage.button('Board 3', () => { rushBoard = 2; state = model.create(2); selected = null; message = 'Board 3'; });
      stage.button('Undo', () => { if (model.undo(state)) message = 'Move undone'; });
      stage.button('Reset board', () => { state = model.create(rushBoard); selected = null; message = 'Board reset'; });
      for (const [label, delta, axis] of [['←', -1, 'h'], ['→', 1, 'h'], ['↑', -1, 'v'], ['↓', 1, 'v']]) stage.button(`Slide ${label}`, () => {
        const car = state.cars.find(item => item.id === selected);
        if (car && car.axis === axis) { const result = model.move(state, selected, delta); message = result.valid ? (result.result === 'won' ? 'Car escaped!' : 'Vehicle slid') : 'Blocked'; }
      });
    } else if (id === 'peg-solitaire-cross') {
      stage.button('Undo jump', () => { if (model.undo(state)) { selected = null; message = 'Jump undone'; } });
    } else if (id === 'set-card-triples') {
      stage.button('Add 3 (only if no SET)', () => { message = model.addThree(state) ? 'Three cards added' : 'A SET exists or the deck is short'; });
    }

    function pressSimon(pad) {
      const result = model.press(state, pad);
      if (!result.accepted) return;
      tone(pad);
      if (result.result === 'wrong') { cancelPlayback(); message = 'Wrong pad · start a new game'; }
      else if (result.roundComplete) { message = `Round ${state.round} · watch`; startPlayback(); }
      else message = `Good · ${state.cursor}/${state.sequence.length}`;
    }
    function submitWordle() {
      const result = model.submit(state, wordleInput);
      if (!result.valid) { message = 'Not in the local word list'; return; }
      wordleInput = '';
      message = result.result === 'won' ? 'Solved!' : result.result === 'lost' ? `Answer: ${state.answer.toUpperCase()}` : 'Guess submitted';
    }
    function hangmanGuess(letter) {
      const result = model.guess(state, letter);
      message = result.repeated ? 'Letter already tried' : result.result === 'won' ? 'You found the word!' : result.result === 'lost' ? `Word: ${state.word.toUpperCase()}` : result.valid ? `${6 - state.misses} misses left` : message;
    }
    if (id === 'simon-memory') {
      ['Circle', 'Triangle', 'Square', 'Diamond'].forEach((shape, pad) => stage.button(shape, () => pressSimon(pad)));
      stage.button('Play sequence', startPlayback);
      if (state.phase === 'playback') startPlayback();
    }
    if (id === 'hangman-words') for (const letter of 'abcdefghijklmnopqrstuvwxyz') stage.button(letter.toUpperCase(), () => hangmanGuess(letter));
    if (id === 'hangman-words') stage.on('keydown', event => {
      if (/^[a-z]$/i.test(event.key)) hangmanGuess(event.key.toLowerCase());
    });
    if (id === 'wordle-five') {
      for (const letter of 'qwertyuiopasdfghjklzxcvbnm') stage.button(letter.toUpperCase(), () => { if (!state.result && wordleInput.length < 5) wordleInput += letter; });
      stage.button('Delete', () => { wordleInput = wordleInput.slice(0, -1); });
      stage.button('Enter', submitWordle);
      stage.on('keydown', event => {
        if (/^[a-z]$/i.test(event.key) && wordleInput.length < 5) wordleInput += event.key.toLowerCase();
        else if (event.key === 'Backspace') wordleInput = wordleInput.slice(0, -1);
        else if (event.key === 'Enter') submitWordle();
      });
    }
    if (id === 'threes-tiles') stage.on('keydown', event => {
      const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (keys[event.key]) { const result = model.move(state, keys[event.key]); message = result.valid ? `Score ${state.score}` : 'No slide'; }
    });
    if (id === 'threes-tiles') for (const direction of ['left', 'right', 'up', 'down']) stage.button(`Slide ${direction}`, () => {
      const result = model.move(state, direction); message = result.valid ? `Score ${state.score}` : 'No slide';
    });
    if (id === 'tic-tac-toe-3d') stage.on('pointerdown', event => {
      const { x, y } = stage.point(event);
      const col = Math.floor((x - 96) / 112), layer = Math.floor((y - 68) / 150);
      if (col >= 0 && col < 3 && layer >= 0 && layer < 3) {
        const localRow = Math.floor((y - 68 - layer * 150) / 38);
        if (localRow < 0 || localRow >= 3) return;
        const cell = layer * 9 + localRow * 3 + col;
        const result = model.play(state, cell); message = result.valid ? (state.result ? `Result: ${state.result}` : `${state.turn} to move`) : 'That space is unavailable';
      }
    });
    if (id === 'ultimate-tic-tac-toe') stage.on('pointerdown', event => {
      const { x, y } = stage.point(event), col = Math.floor((x - 32) / 192), row = Math.floor((y - 36) / 156);
      if (col < 0 || col > 2 || row < 0 || row > 2) return;
      const localCol = Math.floor(((x - 32) % 192) / 58), localRow = Math.floor(((y - 36) % 156) / 44);
      const result = model.play(state, row * 3 + col, localRow * 3 + localCol);
      message = result.valid ? (state.result ? `Result: ${state.result}` : state.forcedBoard === null ? `${state.turn}: choose an open board` : `${state.turn}: board ${state.forcedBoard + 1}`) : 'Choose a playable empty cell';
    });
    if (id === 'word-search-grid') {
      stage.on('pointerdown', event => { const { x, y } = stage.point(event), col = Math.floor((x - 30) / 40), row = Math.floor((y - 45) / 40); if (row >= 0 && row < 10 && col >= 0 && col < 10 && !dragStart) dragStart = [row, col]; });
      stage.on('pointerup', event => {
        if (!dragStart) return;
        const { x, y } = stage.point(event), col = Math.floor((x - 30) / 40), row = Math.floor((y - 45) / 40);
        if (row === dragStart[0] && col === dragStart[1]) { message = 'Start selected · drag or tap an end'; return; }
        const result = model.select(state, dragStart, [row, col]); dragStart = null;
        message = result.valid ? `Found ${result.word}` : 'Select a straight word line';
      });
    }
    if (id === 'threes-tiles') stage.on('pointerdown', event => {
      const { x, y } = stage.point(event), col = Math.floor((x - 130) / 90), row = Math.floor((y - 70) / 90);
      if (row >= 0 && row < 4 && col >= 0 && col < 4) {
        if (!dragStart) dragStart = [row, col];
        else {
          const [r, c] = dragStart, dr = row - r, dc = col - c;
          const direction = Math.abs(dc) >= Math.abs(dr) ? dc < 0 ? 'left' : 'right' : dr < 0 ? 'up' : 'down';
          const result = model.move(state, direction); dragStart = null; message = result.valid ? `Score ${state.score}` : 'No slide';
        }
      }
    });
    if (id === 'peg-solitaire-cross') stage.on('pointerdown', event => {
      const { x, y } = stage.point(event), c = Math.round((x - 140) / 48), r = Math.round((y - 75) / 48), key = coord(r, c);
      if (!model.holes.some(([hr, hc]) => hr === r && hc === c)) return;
      if (!selected) { selected = key; message = 'Select a landing hole'; }
      else { const result = model.move(state, selected, key); selected = null; message = result.valid ? result.result === 'won' ? 'One peg in the center · solved!' : 'Jump complete' : 'Illegal jump'; }
    });
    if (id === 'set-card-triples') stage.on('pointerdown', event => {
      const { x, y } = stage.point(event), col = Math.floor((x - 20) / 148), row = Math.floor((y - 42) / 112), index = row * 4 + col;
      if (row >= 0 && col >= 0 && col < 4 && index < state.table.length) {
        const result = model.select(state, index); message = result.valid ? result.set ? 'SET found!' : 'Card selected' : result.set === false ? 'Not a SET · try another trio' : 'Card unavailable';
      }
    });
    if (id === 'rush-hour-sliding') stage.on('pointerdown', event => {
      const { x, y } = stage.point(event), col = Math.floor((x - 170) / 50), row = Math.floor((y - 50) / 50);
      const cells = model.occupied(state.cars);
      selected = cells.get(coord(row, col)) || null;
      rushPointerStart = selected ? { x, y, id: selected } : null;
      message = selected ? `${selected}: use the arrow along its lane` : 'Select a vehicle';
    });
    if (id === 'rush-hour-sliding') stage.on('pointerup', event => {
      if (!rushPointerStart) return;
      const { x, y } = stage.point(event), car = state.cars.find(item => item.id === rushPointerStart.id);
      const pixels = car?.axis === 'h' ? x - rushPointerStart.x : y - rushPointerStart.y;
      const delta = Math.trunc(pixels / 50);
      rushPointerStart = null;
      if (delta) { const result = model.move(state, selected, delta); message = result.valid ? result.result === 'won' ? 'Car escaped!' : 'Vehicle slid' : 'Blocked'; }
    });

    stage.frame(() => {}, (ctx, target) => {
      ctx.clearRect(0, 0, 640, 540);
      ink(ctx, titles[id], 320, 25, 24);
      if (id === 'simon-memory') drawSimon(ctx);
      else if (id === 'hangman-words') drawHangman(ctx);
      else if (id === 'word-search-grid') drawSearch(ctx);
      else if (id === 'wordle-five') drawWordle(ctx);
      else if (id === 'threes-tiles') drawThrees(ctx);
      else if (id === 'tic-tac-toe-3d') draw3DTic(ctx);
      else if (id === 'ultimate-tic-tac-toe') drawUltimate(ctx);
      else if (id === 'set-card-triples') drawSet(ctx);
      else if (id === 'peg-solitaire-cross') drawPeg(ctx);
      else drawRush(ctx);
      target.setHUD(`${message}${state.score !== undefined ? ` · Score ${state.score}` : ''}`);
      target.status(message);
    });
    function drawSimon(ctx) {
      const labels = ['○', '△', '□', '◇'];
      for (let i = 0; i < 4; i++) {
        const x = 150 + (i % 2) * 178, y = 85 + Math.floor(i / 2) * 178;
        rect(ctx, x, y, 150, 150, state.cursor === i && state.phase === 'playback' ? '#fff3c6' : colors[i], '#334155', 32);
        ink(ctx, labels[i], x + 75, y + 70, 60, '#ffffff');
        ink(ctx, ['Red circle', 'Green triangle', 'Yellow square', 'Blue diamond'][i], x + 75, y + 126, 16, '#ffffff');
      }
      ink(ctx, `Round ${state.round} · ${state.phase}`, 320, 510, 18);
    }
    function drawHangman(ctx) {
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(80, 370); ctx.lineTo(230, 370); ctx.moveTo(130, 370); ctx.lineTo(130, 85); ctx.lineTo(300, 85); ctx.lineTo(300, 125); ctx.stroke();
      if (state.misses > 0) { ctx.beginPath(); ctx.arc(300, 155, 30, 0, Math.PI * 2); ctx.stroke(); }
      if (state.misses > 1) { ctx.beginPath(); ctx.moveTo(300, 185); ctx.lineTo(300, 275); ctx.stroke(); }
      if (state.misses > 2) { ctx.beginPath(); ctx.moveTo(300, 205); ctx.lineTo(260, 245); ctx.stroke(); }
      if (state.misses > 3) { ctx.beginPath(); ctx.moveTo(300, 205); ctx.lineTo(340, 245); ctx.stroke(); }
      if (state.misses > 4) { ctx.beginPath(); ctx.moveTo(300, 275); ctx.lineTo(265, 330); ctx.stroke(); }
      if (state.misses > 5) { ctx.beginPath(); ctx.moveTo(300, 275); ctx.lineTo(335, 330); ctx.stroke(); }
      ink(ctx, model.view(state), 420, 260, 36); ink(ctx, `Misses ${state.misses}/6`, 420, 320, 20);
      if (state.result) ink(ctx, state.result === 'won' ? state.word.toUpperCase() : 'Round over', 420, 380, 22);
    }
    function drawSearch(ctx) {
      const foundCells = new Set();
      for (const word of state.found) for (const [r, c] of state.placements[word].cells) foundCells.add(coord(r, c));
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        const x = 30 + c * 40, y = 45 + r * 40;
        rect(ctx, x, y, 38, 38, foundCells.has(coord(r, c)) ? '#a8e0bb' : '#ffffff', '#d2dbe7', 3);
        ink(ctx, state.grid[r][c], x + 19, y + 19, 20);
      }
      ink(ctx, 'Find these words', 515, 70, 18);
      state.words.forEach((word, i) => ink(ctx, `${state.found.has(word) ? '✓ ' : ''}${word}`, 500, 112 + i * 38, 18, state.found.has(word) ? '#378652' : '#26334a'));
    }
    function drawWordle(ctx) {
      state.guesses.forEach((guess, row) => drawWordRow(ctx, guess.word, guess.colors, row));
      if (state.guesses.length < 6 && !state.result) drawWordRow(ctx, wordleInput.padEnd(5, ' '), [], state.guesses.length);
      ink(ctx, `${state.guesses.length}/6 guesses`, 320, 410, 18);
      if (state.result === 'lost') ink(ctx, `Answer: ${state.answer.toUpperCase()}`, 320, 455, 22);
    }
    function drawWordRow(ctx, word, result, row) {
      for (let col = 0; col < 5; col++) {
        const x = 185 + col * 68, y = 55 + row * 52, fill = result[col] === 'green' ? '#65a85e' : result[col] === 'yellow' ? '#d9b53e' : result[col] === 'gray' ? '#87909b' : '#fff';
        rect(ctx, x, y, 58, 44, fill, '#c8d0da', 4); ink(ctx, (word[col] || '').toUpperCase(), x + 29, y + 22, 24, result[col] ? '#fff' : '#26334a');
      }
    }
    function drawThrees(ctx) {
      for (let i = 0; i < 16; i++) {
        const x = 140 + (i % 4) * 90, y = 75 + Math.floor(i / 4) * 90, value = state.board[i];
        rect(ctx, x, y, 80, 80, value ? value === 1 ? '#d9efff' : value === 2 ? '#e7edff' : '#fff1cc' : '#edf0f4', '#bbc5d3', 9);
        if (value) ink(ctx, value, x + 40, y + 40, 30, '#26334a');
      }
      ink(ctx, `Next ${state.next}`, 320, 465, 19);
      ink(ctx, 'Use arrows or tap two cells to choose a direction', 320, 505, 16);
    }
    function draw3DTic(ctx) {
      for (let layer = 0; layer < 3; layer++) {
        ink(ctx, `Level ${layer + 1}`, 32, 92 + layer * 150, 16, '#596579', 'left');
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const x = 96 + c * 112, y = 68 + layer * 150 + r * 38, index = layer * 9 + r * 3 + c;
          rect(ctx, x, y, 98, 34, state.cells[index] ? state.cells[index] === 'X' ? '#f6d7d7' : '#d8e7fb' : '#fff', '#adb8c8', 4);
          ink(ctx, state.cells[index] || '·', x + 49, y + 17, 21);
        }
      }
      ink(ctx, state.result ? `Result ${state.result}` : `${state.turn} to move`, 320, 532, 18);
    }
    function drawUltimate(ctx) {
      for (let board = 0; board < 9; board++) {
        const bx = 32 + (board % 3) * 192, by = 36 + Math.floor(board / 3) * 156;
        const playable = !state.closed[board] && (state.forcedBoard === null || state.closed[state.forcedBoard] || state.forcedBoard === board);
        rect(ctx, bx, by, 184, 148, playable ? '#edf7ff' : '#f1f2f5', board === state.forcedBoard ? '#2879cf' : '#bcc6d4', 6);
        for (let cell = 0; cell < 9; cell++) {
          const x = bx + 5 + (cell % 3) * 58, y = by + 5 + Math.floor(cell / 3) * 44;
          rect(ctx, x, y, 54, 40, '#fff', '#d6dce6', 3);
          ink(ctx, state.boards[board][cell] || '', x + 27, y + 20, 20);
        }
        if (state.closed[board]) ink(ctx, state.closed[board] === 'draw' ? 'Draw' : state.closed[board], bx + 92, by + 74, 26, '#2463a3');
      }
      ink(ctx, state.result ? `Result ${state.result}` : state.forcedBoard === null ? `${state.turn} · choose any open board` : `${state.turn} · board ${state.forcedBoard + 1}`, 320, 510, 18);
    }
    function drawSet(ctx) {
      state.table.forEach((card, index) => {
        const x = 20 + (index % 4) * 148, y = 42 + Math.floor(index / 4) * 112;
        rect(ctx, x, y, 136, 100, state.selected.includes(index) ? '#dcecff' : '#fff', state.selected.includes(index) ? '#2879cf' : '#bcc6d4', 8);
        const count = card[0] + 1, fill = ['#b32636', '#16743b', '#5937a6'][card[3]];
        for (let n = 0; n < count; n++) {
          const sx = x + 68 + (n - (count - 1) / 2) * 30, sy = y + 43;
          drawSetSymbol(ctx, card[1], card[2], fill, sx, sy);
        }
        ink(ctx, `${count} · ${['oval', 'diamond', 'squiggle'][card[1]]} · ${['solid', 'striped', 'open'][card[2]]}`, x + 68, y + 78, 12);
        ink(ctx, ['red', 'green', 'purple'][card[3]], x + 68, y + 92, 11, fill);
      });
      ink(ctx, `${state.table.length} cards · ${state.deck.length} in deck`, 320, 502, 18);
    }
    function drawSetSymbol(ctx, shape, shading, color, x, y) {
      const width = 21, height = 34;
      const path = () => {
        ctx.beginPath();
        if (shape === 0) {
          ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        } else if (shape === 1) {
          ctx.moveTo(x, y - height); ctx.lineTo(x + width, y); ctx.lineTo(x, y + height);
          ctx.lineTo(x - width, y); ctx.closePath();
        } else {
          ctx.moveTo(x - width, y - height * 0.4);
          ctx.bezierCurveTo(x - width * 0.1, y - height * 0.9, x + width * 0.45, y - height * 0.6, x + width, y - height * 0.35);
          ctx.bezierCurveTo(x + width * 0.35, y + height * 0.1, x - width * 0.1, y + height * 0.75, x - width, y + height * 0.4);
          ctx.bezierCurveTo(x - width * 0.3, y, x - width * 0.2, y - height * 0.2, x - width, y - height * 0.4);
          ctx.closePath();
        }
      };
      ctx.lineWidth = 2.5;
      if (shading === 0) {
        path(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = color; ctx.stroke();
      } else if (shading === 2) {
        path(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = color; ctx.stroke();
      } else {
        ctx.save();
        path(); ctx.clip(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2;
        for (let stripeY = y - height + 2; stripeY < y + height; stripeY += 6) {
          ctx.beginPath(); ctx.moveTo(x - width - 1, stripeY); ctx.lineTo(x + width + 1, stripeY); ctx.stroke();
        }
        ctx.restore();
        path(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      }
    }
    function drawPeg(ctx) {
      for (const [r, c] of model.holes) {
        const x = 140 + c * 48, y = 74 + r * 48, key = coord(r, c), hasPeg = state.pegs.has(key);
        ctx.fillStyle = hasPeg ? '#5780bd' : '#edf1f7'; ctx.strokeStyle = selected === key ? '#e09d35' : '#aeb9c9'; ctx.lineWidth = selected === key ? 4 : 2;
        ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ink(ctx, `${state.pegs.size} pegs · jump orthogonally`, 320, 470, 18);
      if (state.result) ink(ctx, state.result === 'won' ? 'Solved!' : 'No moves · undo to retry', 320, 510, 18);
    }
    function drawRush(ctx) {
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) rect(ctx, 170 + c * 50, 50 + r * 50, 48, 48, '#f3f5f8', '#c8d0da', 2);
      for (const car of state.cars) {
        const x = 172 + car.col * 50, y = 52 + car.row * 50, w = (car.axis === 'h' ? car.len : 1) * 46, h = (car.axis === 'v' ? car.len : 1) * 46;
        rect(ctx, x, y, w, h, car.red ? '#df5351' : car.id === selected ? '#f4c456' : '#6e9aca', '#334c68', 7);
        ink(ctx, car.red ? 'EXIT →' : car.id, x + w / 2, y + h / 2, 14, '#fff');
      }
      ink(ctx, `Board ${rushBoard + 1} · ${state.moves} moves`, 320, 390, 20);
      if (state.result) ink(ctx, 'Car escaped!', 320, 430, 24, '#39834c');
    }
  }

  function hintFor(id) {
    const hints = {
      'simon-memory': 'Watch the shapes, then repeat the sequence in order.',
      'hangman-words': 'Guess English letters; six misses end the round.',
      'word-search-grid': 'Drag from first to last letter along a straight line.',
      'wordle-five': 'Enter a five-letter word; colors show exact and misplaced letters.',
      'threes-tiles': 'Slide one cell per tile; new cards enter at the trailing edge.',
      'tic-tac-toe-3d': 'Place X and O across the three labeled levels.',
      'ultimate-tic-tac-toe': 'Your cell sends the next player to its matching board.',
      'set-card-triples': 'Choose three cards with each feature all same or all different.',
      'peg-solitaire-cross': 'Jump over one peg into an empty orthogonal hole.',
      'rush-hour-sliding': 'Select a car, then slide it along its own lane.'
    };
    return hints[id];
  }

  const metadata = {
    'simon-memory': ['Classic Simon', 'Electronic memory sequence', 'Hasbro Simon', 'https://instructions.hasbro.com/en-us/instruction/simon-game'],
    'hangman-words': ['Hangman', 'Guess the hidden English word', 'Hasbro Hangman', 'https://instructions.hasbro.com/en-us/instruction/hangman-game-instructions'],
    'word-search-grid': ['Word Search', 'Find eight straight-line words', 'Common word-search convention', 'https://iread.education/resources/vocabulary-and-memory/do-word-searches-teach-vocabulary'],
    'wordle-five': ['Wordle', 'Five letters · six guesses', 'NYT Wordle rules overview', 'https://www.nytimes.com/games/wordle/index.html'],
    'threes-tiles': ['Threes', 'Slide and combine numbered cards', 'Asher Vollmer Threes', 'https://asherv.com/threes/support/'],
    'tic-tac-toe-3d': ['3D Tic-Tac-Toe', 'Win on a line through three levels', 'NRICH Tic-Tac-Toe investigation', 'https://nrich.maths.org/problems/tic-tac-toe'],
    'ultimate-tic-tac-toe': ['Ultimate Tic-Tac-Toe', 'Win the big board through local boards', 'Ultimate game rules', 'https://minimax.dev/docs/ultimate/the-game/'],
    'set-card-triples': ['SET', 'Find cards with four matching/different features', 'SET / PlayMonster product summary', 'https://playmonster.com/product/set/'],
    'peg-solitaire-cross': ['Peg Solitaire', 'Jump pegs toward the center', 'Peg Solitaire rules', 'https://pegsolitaire.app/rules/'],
    'rush-hour-sliding': ['Rush Hour', 'Slide cars to clear the red car exit', 'ThinkFun Rush Hour', 'https://www.ravensburger.us/en-US/pdp/76582']
  };
  for (const [id, model] of Object.entries(models)) {
    const [refTitle, tagline, title, url] = metadata[id];
    F.register(id, {
      title: titles[id], category: 'Casual', newGame: true,
      reference: { title, url, platform: 'Browser adaptation' },
      coreMechanics: [tagline], model,
      catalog: { id, title: titles[id], tagline, category: 'Casual', section: 'quick', players: '1', duration: '5–15 min', mechanic: tagline, badge: 'Mới', color: '#5977b8', aliases: [refTitle] },
      launch(container, game) { launchGame(id, container, game || { title: titles[id] }); }
    });
  }
})();


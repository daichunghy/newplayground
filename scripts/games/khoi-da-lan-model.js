/* Rules and original level data for Khối Đá Lăn. No reference-game maps or assets are used. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_KhoiDaLanModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LEVELS = Object.freeze([
    Object.freeze({
      id: 'mam-reu', name: 'Mầm Rêu', par: 3,
      rows: Object.freeze([
        '........',
        '..####..',
        '..=###..',
        '..###O..',
        '..####..',
        '........'
      ]), start: Object.freeze({ x: 2, y: 2 })
    }),
    Object.freeze({
      id: 'bac-may', name: 'Bậc Mây', par: 5,
      rows: Object.freeze([
        '.........',
        '.........',
        '.=###....',
        '.######O.',
        '.######..',
        '..##.....',
        '.........'
      ]), start: Object.freeze({ x: 1, y: 4 })
    }),
    Object.freeze({
      id: 'vanh-sao', name: 'Vành Sao', par: 12,
      rows: Object.freeze([
        '...........',
        '..######...',
        '..=#####...',
        '......###..',
        '...######O.',
        '...######..',
        '...........'
      ]), start: Object.freeze({ x: 2, y: 2 })
    }),
    Object.freeze({
      id: 'cong-reu', name: 'Cổng Rêu', par: 15,
      rows: Object.freeze([
        '#######.',
        '#######.',
        '####.###',
        '##.#####',
        '.....#..',
        '.....##.',
        '.....O#.'
      ]), start: Object.freeze({ x: 7, y: 2 })
    }),
    Object.freeze({
      id: 'hoc-suong', name: 'Hốc Sương', par: 17,
      rows: Object.freeze([
        '##.###',
        '######',
        '######',
        '##..#.',
        '#...O.'
      ]), start: Object.freeze({ x: 0, y: 0 })
    }),
    Object.freeze({
      id: 'da-luon', name: 'Đá Lượn', par: 18,
      rows: Object.freeze([
        '#=#####',
        '#######',
        '##.###.',
        '##.##..',
        '#####..',
        '#..#...',
        '##.....',
        '#......',
        'O......'
      ]), start: Object.freeze({ x: 1, y: 0 })
    }),
    Object.freeze({
      id: 'vet-trang', name: 'Vệt Trăng', par: 19,
      rows: Object.freeze([
        '##=###',
        '###...',
        '##....',
        '###...',
        '####O.',
        '.##...',
        '.#....'
      ]), start: Object.freeze({ x: 2, y: 0 })
    }),
    Object.freeze({
      id: 'bo-da', name: 'Bờ Đá', par: 20,
      rows: Object.freeze([
        '########.',
        '####.####',
        '#####.#O#',
        '.#######.',
        '...#...#.',
        '...#.....'
      ]), start: Object.freeze({ x: 0, y: 1 })
    }),
    Object.freeze({
      id: 'mach-nuoc', name: 'Mạch Nước', par: 22,
      rows: Object.freeze([
        '########.',
        '#######O#',
        '##...##..',
        '##=......',
        '###......',
        '##.......',
        '.#.......'
      ]), start: Object.freeze({ x: 2, y: 3 })
    }),
    Object.freeze({
      id: 'dinh-may', name: 'Đỉnh Mây', par: 23,
      rows: Object.freeze([
        '##...',
        '##...',
        '##...',
        '###..',
        '###..',
        '.###.',
        '..###',
        '.##O.',
        '.#...'
      ]), start: Object.freeze({ x: 0, y: 2 })
    })
  ]);

  const DIRECTIONS = Object.freeze(['left', 'right', 'up', 'down']);

  function compileLevel(level) {
    const width = Math.max(...level.rows.map(row => row.length));
    const height = level.rows.length;
    const tiles = new Map();
    let goal = null;
    for (let y = 0; y < height; y++) {
      const row = level.rows[y].padEnd(width, '.');
      for (let x = 0; x < width; x++) {
        const mark = row[x];
        if (mark === '#') tiles.set(`${x},${y}`, 'stone');
        else if (mark === '=') tiles.set(`${x},${y}`, 'bridge');
        else if (mark === 'O') {
          tiles.set(`${x},${y}`, 'goal');
          goal = { x, y };
        }
      }
    }
    if (!goal || !tiles.has(`${level.start.x},${level.start.y}`)) throw new Error(`Invalid authored board: ${level.id}`);
    return { width, height, tiles, goal };
  }

  function moved(block, direction) {
    const { x, y, orientation } = block;
    switch (direction) {
      case 'left':
        return orientation === 'stand' ? { x: x - 2, y, orientation: 'wide' }
          : orientation === 'wide' ? { x: x - 1, y, orientation: 'stand' }
            : { x: x - 1, y, orientation: 'tall' };
      case 'right':
        return orientation === 'stand' ? { x: x + 1, y, orientation: 'wide' }
          : orientation === 'wide' ? { x: x + 2, y, orientation: 'stand' }
            : { x: x + 1, y, orientation: 'tall' };
      case 'up':
        return orientation === 'stand' ? { x, y: y - 2, orientation: 'tall' }
          : orientation === 'tall' ? { x, y: y - 1, orientation: 'stand' }
            : { x, y: y - 1, orientation: 'wide' };
      case 'down':
        return orientation === 'stand' ? { x, y: y + 1, orientation: 'tall' }
          : orientation === 'tall' ? { x, y: y + 2, orientation: 'stand' }
            : { x, y: y + 1, orientation: 'wide' };
      default: return null;
    }
  }

  function occupied(block) {
    if (block.orientation === 'wide') return [{ x: block.x, y: block.y }, { x: block.x + 1, y: block.y }];
    if (block.orientation === 'tall') return [{ x: block.x, y: block.y }, { x: block.x, y: block.y + 1 }];
    return [{ x: block.x, y: block.y }];
  }

  function create(startLevel = 0, options = {}) {
    const saved = options && options.progress && typeof options.progress === 'object' ? options.progress : {};
    const savedCount = Number.isInteger(saved.unlockedCount) ? saved.unlockedCount : 1;
    let unlockedCount = Math.max(1, Math.min(LEVELS.length, savedCount));
    const bestMoves = LEVELS.map((_, index) => {
      const best = Array.isArray(saved.bestMoves) ? saved.bestMoves[index] : null;
      return Number.isInteger(best) && best > 0 ? best : null;
    });
    let levelIndex = Number.isInteger(startLevel) && startLevel >= 0 && startLevel < unlockedCount ? startLevel : 0;
    let board = compileLevel(LEVELS[levelIndex]);
    let block = { ...LEVELS[levelIndex].start, orientation: 'stand' };
    let moves = 0;
    let falls = 0;
    let status = 'playing';
    let lastEvent = 'start';
    const history = [];

    function snapshot() { return { block: { ...block }, moves, falls, status, lastEvent }; }
    function restore(saved) {
      block = { ...saved.block };
      moves = saved.moves;
      falls = saved.falls;
      status = saved.status;
      lastEvent = saved.lastEvent;
    }
    function resetForLevel(index) {
      levelIndex = index;
      board = compileLevel(LEVELS[levelIndex]);
      block = { ...LEVELS[levelIndex].start, orientation: 'stand' };
      moves = 0;
      falls = 0;
      status = 'playing';
      lastEvent = 'start';
      history.length = 0;
    }
    function view() {
      return {
        levelIndex, levelCount: LEVELS.length, levelId: LEVELS[levelIndex].id,
        levelName: LEVELS[levelIndex].name, par: LEVELS[levelIndex].par,
        bestMoves: bestMoves[levelIndex], unlockedCount, width: board.width, height: board.height,
        start: { ...LEVELS[levelIndex].start }, goal: { ...board.goal },
        tiles: Array.from(board.tiles, ([key, kind]) => {
          const [x, y] = key.split(',').map(Number);
          return { x, y, kind };
        }),
        block: { ...block, cells: occupied(block) }, moves, falls, status, lastEvent,
        canUndo: history.length > 0, canNext: status === 'won' && levelIndex + 1 < unlockedCount
      };
    }
    return Object.freeze({
      view,
      move(direction) {
        if (!DIRECTIONS.includes(direction) || status !== 'playing') return false;
        const next = moved(block, direction);
        history.push(snapshot());
        moves++;
        const cells = occupied(next);
        const won = next.orientation === 'stand' && next.x === board.goal.x && next.y === board.goal.y;
        const safe = won || cells.every(cell => board.tiles.has(`${cell.x},${cell.y}`));
        if (!safe) {
          falls++;
          block = { ...LEVELS[levelIndex].start, orientation: 'stand' };
          lastEvent = 'fall';
          return true;
        }
        block = next;
        if (won) {
          status = 'won';
          lastEvent = 'win';
          bestMoves[levelIndex] = bestMoves[levelIndex] === null
            ? moves : Math.min(bestMoves[levelIndex], moves);
          unlockedCount = Math.max(unlockedCount, Math.min(LEVELS.length, levelIndex + 2));
        }
        else lastEvent = 'roll';
        return true;
      },
      undo() {
        if (!history.length) return false;
        restore(history.pop());
        lastEvent = 'undo';
        return true;
      },
      restart() { resetForLevel(levelIndex); lastEvent = 'restart'; return true; },
      selectLevel(index) {
        if (!Number.isInteger(index) || index < 0 || index >= unlockedCount) return false;
        resetForLevel(index);
        lastEvent = 'selected';
        return true;
      },
      nextLevel() {
        if (status !== 'won' || levelIndex + 1 >= unlockedCount) return false;
        resetForLevel(levelIndex + 1);
        lastEvent = 'selected';
        return true;
      },
      progress() { return { unlockedCount, bestMoves: [...bestMoves] }; }
    });
  }

  return Object.freeze({ LEVELS, DIRECTIONS, create, occupied, moved });
});

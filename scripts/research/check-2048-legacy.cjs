// Research-only probe. Pins reference source and old local revision; not a production script or CI network dependency.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

async function main() {
  const SHA = '478b6ec346e3787f589e4af751378d06ded4cbbc';
  const files = ['js/grid.js', 'js/tile.js', 'js/game_manager.js'];
  const sourceParts = await Promise.all(files.map(async file => {
    const url = 'https://raw.githubusercontent.com/gabrielecirulli/2048/' + SHA + '/' + file;
    if (process.env.NP_2048_REFERENCE_DIR) return fs.readFileSync(require('node:path').join(process.env.NP_2048_REFERENCE_DIR, file), 'utf8');
    const response = await fetch(url);
    assert.equal(response.ok, true, 'Không đọc được ' + url);
    return response.text();
  }));
  const ref = {};
  vm.createContext(ref);
  vm.runInContext(sourceParts.join('\n'), ref);

  const source = process.env.NP_2048_LEGACY_SOURCE ? fs.readFileSync(process.env.NP_2048_LEGACY_SOURCE, 'utf8') : require('node:child_process').execFileSync('git', ['show', '78b598dbf6055bc0b70374cc4324fa6117092199:scripts/engines-classics.js'], { encoding: 'utf8' });
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(hash, 'f9d7d1460ee960ba3d7be7a6d47d86ba6452963fa3613f043271236a0666cf7f',
    'Engine khác snapshot nghiên cứu; cần rà lại adapter trước khi so sánh.');
  const start = source.indexOf('  function launchGame2048(');
  const next = source.indexOf('  function launchDXBall(', start);
  assert.ok(start >= 0 && next > start);
  let fn = source.slice(start, next);
  fn = fn.slice(0, fn.lastIndexOf('}') + 1);
  const end = fn.lastIndexOf('}');
  fn = fn.slice(0, end) + [
    'return {',
    '  set(b) { board = b.map(r => r.slice()); score = 0; mergedPositions = []; },',
    '  get() { return { board: board.map(r => r.slice()), score }; },',
    '  move',
    '};'
  ].join('\n') + fn.slice(end);
  const spawnAndRender = 'spawnTile();\n        render();';
  assert.equal(fn.split(spawnAndRender).length - 1, 1);
  fn = fn.replace(spawnAndRender, 'render();');

  const grid = {
    style: {}, innerHTML: '',
    addEventListener() {}, removeEventListener() {}, appendChild() {}
  };
  const button = { addEventListener() {} };
  const container = {
    innerHTML: '',
    querySelector(selector) {
      return selector === '#g2048Grid' ? grid :
        selector === '#g2048Score' ? {} : button;
    }
  };
  const session = {
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    requestAnimationFrame() {}, cancelAnimationFrame() {},
    listen() {}, onCleanup() {}
  };
  const currentContext = {
    window: { NP_GameSession: { start: () => session } },
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {}
  };
  vm.createContext(currentContext);
  vm.runInContext(fn + '\nglobalThis.launch = launchGame2048;', currentContext);
  const current = currentContext.launch(container, {});

  function expected(board, direction) {
    const game = Object.create(ref.GameManager.prototype);
    Object.assign(game, {
      size: 4, grid: new ref.Grid(4), score: 0,
      over: false, won: false, keepPlaying: false,
      addRandomTile() {}, actuate() {}
    });
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (board[y][x]) {
          game.grid.insertTile(new ref.Tile({ x, y }, board[y][x]));
        }
      }
    }
    game.move(direction);
    return {
      board: Array.from({ length: 4 }, (_, y) =>
        Array.from({ length: 4 }, (_, x) => game.grid.cells[x][y]?.value || 0)),
      score: game.score
    };
  }

  const values = [0, 2, 4, 8, 16, 32];
  const directions = ['up', 'right', 'down', 'left'];
  let cases = 0;
  function compare(board, direction) {
    current.set(board);
    current.move(directions[direction]);
    assert.deepEqual(JSON.parse(JSON.stringify(current.get())),
      expected(board, direction), JSON.stringify({ board, direction }));
    cases++;
  }

  for (let n = 0; n < 6 ** 4; n++) {
    let q = n;
    const line = Array.from({ length: 4 }, () => {
      const value = values[q % 6];
      q = Math.floor(q / 6);
      return value;
    });
    for (let direction = 0; direction < 4; direction++) {
      const board = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
      if (direction % 2) board[1] = line.slice();
      else for (let y = 0; y < 4; y++) board[y][1] = line[y];
      compare(board, direction);
    }
  }

  let seed = 0x2048;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let n = 0; n < 1000; n++) {
    const board = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => values[Math.floor(random() * values.length)]));
    for (let direction = 0; direction < 4; direction++) compare(board, direction);
  }
  assert.equal(cases, 9184);
  console.log(JSON.stringify({
    status: 'pass', cases, lineDirectionCases: 5184, fullBoardDirectionCases: 4000,
    upstream: SHA, currentFileSHA256: hash,
    scope: 'slide/merge/score only; spawn disabled; no browser/device QA'
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

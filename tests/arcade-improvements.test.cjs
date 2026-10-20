const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read } = require('./helpers/game-harness.cjs');

function archetype(kind) {
  const h = harness({ loadEngines: false, loadApp: false });
  const ids = { shooter: 'asteroids', runner: 'crossy-road', reflex: 'dap-chuot', puzzle: 'solitaire', management: 'lemonade', quiz: 'trieu-phu', duel: 'street-fighter' };
  // Expose simulation state in the test VM only; the shipped engine has no debug globals.
  vm.runInContext(read('scripts/engines-archetypes.js').replace(
    'let raf = null;',
    'window.__arc = { state, step, resetGame, openCard, togglePause, cardBounds }; let raf = null;'
  ), h.context);
  h.context.NP_Archetypes.launch(h.container, { id: ids[kind], title: 'Arcade test' });
  return Object.assign(h, h.context.__arc);
}

test('shooter and runner survive advancing a stage while several hazards remain', () => {
  for (const kind of ['shooter', 'runner']) {
    const h = archetype(kind);
    h.state.spawnIn = 999;
    h.state.points = kind === 'shooter' ? 5 : 6;
    if (kind === 'shooter') {
      h.state.hazards = [{ x: 500, y: 60, radius: 18, vy: 0 }, { x: 320, y: 100, radius: 18, vy: 0 }];
      h.state.bullets = [{ x: 320, y: 110 }];
    } else {
      h.state.hazards = [{ lane: 0, y: 90, passed: false }, { lane: 0, y: 340, passed: false }];
    }
    assert.doesNotThrow(() => h.step(1), kind);
    assert.equal(h.state.stage, 2, kind);
    assert.equal(h.state.hazards.length, 0, 'next stage owns a clean playfield');
    h.context.NP_GameSession.stop();
  }
});

test('puzzle mismatches pause in place and never hide cards from a restarted game', () => {
  const h = archetype('puzzle');
  h.state.cards = [0, 1, 0, 1];
  h.openCard(0); h.openCard(1);
  assert.equal(h.state.busy, true);
  h.togglePause();
  for (let i = 0; i < 100; i++) h.frame();
  assert.equal(h.state.flipped.length, 2, 'both cards stay visible while paused');
  h.resetGame();
  h.openCard(0);
  for (let i = 0; i < 100; i++) h.frame();
  h.flushTimeouts();
  assert.equal(h.state.flipped.length, 1, 'no previous-round timer changes the new board');
  assert.equal(h.state.flipped[0], 0);
  h.context.NP_GameSession.stop();
});

test('an archetype local pause resumes through the shared session without leaving a hidden pause', () => {
  const h = archetype('shooter');
  const session = h.context.NP_GameSession.getCurrent();
  const button = h.container.querySelector('#arcPause');
  h.frame(16);
  button.dispatch('click');
  assert.equal(session.isPaused(), true);
  assert.equal(h.state.phase, 'paused');
  assert.equal(button.textContent, 'Tiếp tục');
  const elapsed = h.state.elapsed;
  h.frame(10000);
  assert.equal(h.state.elapsed, elapsed);
  session.resume();
  assert.equal(h.state.phase, 'playing');
  assert.equal(button.textContent, 'Tạm dừng');
  h.frame(16);
  assert.ok(h.state.elapsed > elapsed, 'the shared resume really advances gameplay again');
  assert.ok(h.state.elapsed - elapsed < 0.1, 'resume does not catch up the paused time');
  h.state.phase = 'over';
  session.pause(); session.resume();
  assert.equal(h.state.phase, 'over', 'opening help on a result cannot revive the ended round');
  assert.equal(button.disabled, true);
  h.context.NP_GameSession.stop();
});

test('memory cards have native buttons and keep the same tap targets while a pair is revealed', () => {
  const h = archetype('puzzle'); h.frame();
  const grid = h.container.querySelector('#arcCardGrid');
  const buttons = [...grid.children];
  assert.equal(buttons.length, 12);
  assert.equal(buttons[0].tagName, 'BUTTON');
  buttons[0].dispatch('click');
  h.frame();
  assert.equal(grid.children[0], buttons[0], 'rendering does not replace the pointer target every frame');
  assert.equal(h.state.flipped[0], 0);
  assert.match(buttons[0].getAttribute('aria-label'), /Thẻ 1,/);
  h.context.NP_GameSession.stop();
});

test('reflex targets above and below the center are reachable by keyboard', () => {
  const h = archetype('reflex');
  h.state.target = { x: 320, y: 100, radius: 30, time: 5 };
  h.window.dispatch('keydown', { key: 'ArrowUp', code: 'ArrowUp' });
  for (let i = 0; i < 16; i++) h.frame(1000 / 60);
  h.window.dispatch('keyup', { key: 'ArrowUp', code: 'ArrowUp' });
  assert.ok(h.state.crossY < 125, 'aim moves vertically');
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  assert.ok(h.state.score > 0, 'keyboard can hit an off-center target');
  h.context.NP_GameSession.stop();
});

test('shooter drag tracks pointer identity even when Safari reports buttons=0', () => {
  const h = archetype('shooter');
  const canvas = h.container.querySelector('#arcCanvas');
  canvas.dispatch('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 120, clientY: 300, buttons: 0 });
  canvas.dispatch('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 480, clientY: 300, buttons: 0 });
  assert.equal(h.state.playerX, 480);
  canvas.dispatch('pointermove', { pointerId: 8, clientX: 200, clientY: 300, buttons: 0 });
  assert.equal(h.state.playerX, 480, 'another finger cannot steal the drag');
  canvas.dispatch('pointercancel', { pointerId: 7 });
  canvas.dispatch('pointermove', { pointerId: 7, clientX: 200, clientY: 300, buttons: 0 });
  assert.equal(h.state.playerX, 480, 'cancelled touches release the ship');
  h.context.NP_GameSession.stop();
});

test('focused buttons retain native keyboard activation without firing in the game', () => {
  const h = archetype('shooter');
  let prevented = false;
  h.window.dispatch('keydown', { key: ' ', code: 'Space', target: h.container.querySelector('#arcRestart'), preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(h.state.bullets.length, 0);
  h.context.NP_GameSession.stop();
});

test('management and quiz accept taps only inside their visible choice buttons', () => {
  const h = archetype('management');
  const canvas = h.container.querySelector('#arcCanvas');
  h.state.order = 0;
  canvas.dispatch('pointerdown', { clientX: 100, clientY: 70 });
  assert.equal(h.state.score, 0, 'tapping an instruction cannot serve food');
  canvas.dispatch('pointerdown', { clientX: 100, clientY: 260 });
  assert.ok(h.state.score > 0, 'the visible menu item works');
  h.context.NP_GameSession.stop();
  const q = archetype('quiz');
  const before = q.state.qIndex;
  q.container.querySelector('#arcCanvas').dispatch('pointerdown', { clientX: 20, clientY: 180 });
  assert.equal(q.state.qIndex, before, 'the outside margin cannot answer a question');
  q.context.NP_GameSession.stop();
});

test('runner rewards collecting a gold coin instead of treating it as a collision', () => {
  const h = archetype('runner');
  h.state.spawnIn = 999;
  h.state.hazards = [{ lane: 1, y: 340, passed: false, bonus: true }];
  h.step(1);
  assert.equal(h.state.lives, 3);
  assert.equal(h.state.score, 30);
  h.context.NP_GameSession.stop();
});

test('duel healing at full health or during cooldown does not spend a damaging turn', () => {
  const h = archetype('duel');
  h.state.selected = 2;
  h.container.querySelector('#arcAction').dispatch('pointerdown');
  assert.equal(h.state.hp, 100);
  h.state.hp = 50; h.state.healCooldown = 2;
  h.container.querySelector('#arcAction').dispatch('pointerdown');
  assert.equal(h.state.hp, 50);
  h.context.NP_GameSession.stop();
});

function retro(name, expose) {
  const h = harness({ loadEngines: false, loadApp: false });
  const source = read('scripts/engines-retro50.js');
  const start = source.indexOf('  function ' + name + '(');
  let end = source.indexOf('\n  function launch', start + 1);
  if (end < 0) end = source.length;
  const part = source.slice(start, end).replace('    let animId = null;', '    window.__retro = ' + expose + ';\n    let animId = null;');
  vm.runInContext(source.slice(0, start) + part + source.slice(end), h.context);
  h.context.NP_Engines[name](h.container, { id: name, title: 'Retro test' });
  return Object.assign(h, h.context.__retro);
}

test('Road Rash driving covers the same distance at 60Hz and 120Hz', () => {
  const distances = [];
  for (const fps of [60, 120]) {
    const h = retro('launchRoadRash', '({ readState: () => ({ distance, speed, playerX }) })');
    h.window.dispatch('keydown', { key: 'ArrowUp', code: 'ArrowUp' });
    for (let i = 0; i < fps; i++) h.frame(1000 / fps);
    distances.push(h.readState().distance);
    h.context.NP_GameSession.stop();
  }
  assert.ok(distances[0] > 0);
  assert.ok(Math.abs(distances[0] - distances[1]) < 0.0001, 'driving physics use elapsed time');
});

test('Road Rash pointer cancellation releases the accelerator', () => {
  const h = retro('launchRoadRash', '({ readState: () => ({ speed }), keys })');
  const gas = h.container.querySelector('#rrGas');
  gas.dispatch('pointerdown', { pointerId: 11 });
  for (let i = 0; i < 10; i++) h.frame(1000 / 60);
  assert.ok(h.readState().speed > 0);
  gas.dispatch('pointercancel', { pointerId: 11 });
  assert.equal(h.keys.ArrowUp, false);
  h.context.NP_GameSession.stop();
});

test('Mega Man enemy shots hurt the player and charged shots damage a boss only once', () => {
  const h = retro('launchMegaMan', '({ player, getBoss: () => boss, bullets, readPhase: () => phase })');
  h.player.x = 100; h.player.y = 304;
  h.bullets.push({ x: 115, y: 315, vx: 0, damage: 15, radius: 6, isEnemy: true });
  h.frame(1000 / 60);
  assert.equal(h.player.hp, 85);
  assert.equal(h.bullets.length, 0);
  const boss = h.getBoss();
  h.bullets.push({ x: boss.x + 10, y: boss.y + 10, vx: 0, damage: 60, radius: 14, isMega: true, isEnemy: false });
  for (let i = 0; i < 4; i++) h.frame(1000 / 60);
  assert.equal(boss.hp, 40, 'one charged projectile applies one 60-damage hit');
  h.context.NP_GameSession.stop();
});

test('Bubble Bobble can jump from touch, keeps new bubbles alive and releases expired trapped enemies', () => {
  const h = retro('launchBubbleBobble', '({ player, shootBubble, readState: () => ({ bubbles, enemies, lives, phase }) })');
  h.player.y = 312; h.player.isGrounded = true;
  const jump = h.container.querySelector('#bbJump');
  jump.dispatch('pointerdown', { pointerId: 2 });
  h.frame(1000 / 60);
  assert.ok(h.player.vy < 0, 'the touch jump button maps to a jump action');
  jump.dispatch('pointerup', { pointerId: 2 });
  h.shootBubble(); h.frame(1000 / 60);
  assert.equal(h.readState().bubbles.length, 1, 'a newly fired bubble does not immediately hit its owner');
  const { bubbles, enemies } = h.readState();
  enemies[0].trapped = true;
  bubbles[0].trappedEnemy = enemies[0]; bubbles[0].x = 500; bubbles[0].y = 50; bubbles[0].life = 1;
  h.frame(1000 / 60);
  assert.equal(enemies[0].trapped, false, 'an expired bubble cannot strand a live monster');
  h.context.NP_GameSession.stop();
});

test('Duck Hunt shoots at the tapped point without needing a previous mouse move', () => {
  const h = retro('launchDuckHunt', '({ readState: () => ({ targets, score, bullets, phase }) })');
  const canvas = h.container.querySelector('#dhCanvas');
  const target = h.readState().targets[0];
  canvas.dispatch('pointerdown', { pointerId: 4, pointerType: 'touch', clientX: target.x, clientY: target.y * (480 / 400) });
  assert.equal(h.readState().score, 500);
  assert.equal(target.falling, true);
  assert.equal(h.readState().bullets, 2);
  h.context.NP_GameSession.stop();
});

test('Duck Hunt completes its tenth wave once and preserves the result', () => {
  const h = retro('launchDuckHunt', '({ readState: () => ({ targets, score, round, phase }) })');
  const canvas = h.container.querySelector('#dhCanvas');
  for (let wave = 0; wave < 10; wave++) {
    for (const target of [...h.readState().targets]) {
      canvas.dispatch('pointerdown', { pointerId: 4, pointerType: 'touch', clientX: target.x, clientY: target.y * (480 / 400) });
    }
    for (let i = 0; i < 8; i++) h.frame(1000 / 60);
    h.flushTimeouts();
  }
  assert.equal(h.readState().round, 10);
  assert.equal(h.readState().phase, 'won');
  const score = h.readState().score;
  for (let i = 0; i < 90; i++) h.frame(1000 / 60);
  assert.equal(h.readState().score, score);
  assert.equal(h.readState().targets.length, 0);
  h.context.NP_GameSession.stop();
});

test('Audition preserves notes typed early in a bar and accepts only one judgement per bar', () => {
  const h = retro('launchAudition', '({ handleArrow, handleSpace, readState: () => ({ sequence, score, currentInputIdx, measureResolved }) })');
  const first = h.readState().sequence[0];
  h.handleArrow(first.key);
  h.frame(20);
  assert.equal(h.readState().currentInputIdx, 1, 'early input is not erased on every frame near the bar start');
  for (const note of h.readState().sequence.slice(1)) h.handleArrow(note.key);
  h.frame(2092);
  h.handleSpace();
  const score = h.readState().score;
  assert.ok(score > 0, 'the completed sequence can score at the beat');
  h.handleSpace();
  assert.equal(h.readState().score, score, 'one beat cannot award a second score');
  h.context.NP_GameSession.stop();
});

test('Street Fighter survives clearing a match with several fireballs in flight', () => {
  const h = retro('launchStreetFighter', '({ enemy, fireballs, readState: () => ({ matchIdx, phase }) })');
  h.enemy.hp = 10;
  h.fireballs.push({ x: 30, y: 310, vx: 8, damage: 25 }, { x: h.enemy.x - 2, y: 310, vx: 8, damage: 25 });
  assert.doesNotThrow(() => h.frame(1000 / 60));
  assert.equal(h.readState().matchIdx, 1);
  assert.equal(h.fireballs.length, 0);
  h.context.NP_GameSession.stop();
});

test('Age of War resolves defeat once and stops changing gameplay state afterward', () => {
  const h = retro('launchAgeOfWar', '({ prepareLoss: () => { baseHp = 5; enemyUnits.push({ x: 80, y: 310, hp: 100, maxHp: 100, dmg: 12, range: 25, speed: -1, isEnemy: true, attackTimer: 49 }); }, readState: () => ({ phase, gold, baseHp }) })');
  h.prepareLoss(); h.frame(1000 / 60);
  assert.equal(h.readState().phase, 'lost');
  assert.equal(h.readState().baseHp, 0);
  const gold = h.readState().gold;
  for (let i = 0; i < 120; i++) h.frame(1000 / 60);
  assert.equal(h.readState().gold, gold, 'passive gold no longer runs behind the result screen');
  h.context.NP_GameSession.stop();
});

test('all five Bloxorz layouts have a valid route and falling plus undo restore safe states', () => {
  const h = retro('launchBloxorz', '({ STAGES, readState: () => ({ block, moves, phase, currentStage }), roll })');
  function moved(b, d) {
    const { x, y, state: s } = b;
    if (d === 'left') return { x: x - (s === 'stand' ? 2 : 1), y, state: s === 'stand' ? 'flatX' : s === 'flatX' ? 'stand' : s };
    if (d === 'right') return { x: x + (s === 'flatX' ? 2 : 1), y, state: s === 'stand' ? 'flatX' : s === 'flatX' ? 'stand' : s };
    if (d === 'up') return { x, y: y - (s === 'stand' ? 2 : 1), state: s === 'stand' ? 'flatY' : s === 'flatY' ? 'stand' : s };
    return { x, y: y + (s === 'flatY' ? 2 : 1), state: s === 'stand' ? 'flatY' : s === 'flatY' ? 'stand' : s };
  }
  function solve(level) {
    const start = { ...level.start, state: 'stand' };
    const queue = [[start, []]], visited = new Set([JSON.stringify(start)]);
    for (let q = 0; q < queue.length; q++) {
      const [b, path] = queue[q];
      if (b.state === 'stand' && level.grid[b.y]?.[b.x] === 2) return path;
      for (const d of ['left', 'right', 'up', 'down']) {
        const n = moved(b, d), cells = [[n.x, n.y]];
        if (n.state === 'flatX') cells.push([n.x + 1, n.y]);
        if (n.state === 'flatY') cells.push([n.x, n.y + 1]);
        if (!cells.every(([x, y]) => level.grid[y]?.[x] > 0) || (n.state === 'stand' && level.grid[n.y][n.x] === 3)) continue;
        const id = JSON.stringify(n);
        if (!visited.has(id)) { visited.add(id); queue.push([n, [...path, d]]); }
      }
    }
    return null;
  }
  assert.equal(h.STAGES.length, 5);
  h.roll('left');
  assert.equal(h.readState().block.x, 1, 'unsupported cells cause a fall back to the start');
  h.container.querySelector('#blxUndo').dispatch('click');
  assert.equal(h.readState().moves, 0);
  for (let i = 0; i < h.STAGES.length; i++) {
    const path = solve(h.STAGES[i]);
    assert.ok(path && path.length, 'stage ' + (i + 1) + ' must be solvable');
    for (const direction of path) h.roll(direction);
    assert.equal(h.readState().currentStage, Math.min(i + 1, 4));
  }
  assert.equal(h.readState().phase, 'won', 'the full campaign can finish through real move inputs');
  h.context.NP_GameSession.stop();
});

function uno() {
  const h = harness({ loadEngines: false, loadApp: false });
  let source = read('scripts/engines-popcap.js');
  const pos = source.lastIndexOf('    render();\n\n    onCleanup');
  source = source.slice(0, pos) + `    window.__uno = {
    initGame, PLAYERS, applyCardEffect, drawCards, playHumanCard,
    readState: () => ({ turn, gameState, drawPile, discardPile, activeColor, pendingWild, winner }),
    setDrawPile: cards => { drawPile = cards; }
  };\n` + source.slice(pos);
  vm.runInContext(source, h.context);
  h.context.NP_Engines.launchDanhBaiUno(h.container, { id: 'uno', title: 'Uno' });
  h.container.querySelector('#unoStartGameBtn').dispatch('click');
  return Object.assign(h, h.context.__uno);
}

function marbles() {
  const h = harness({ loadEngines: false, loadApp: false });
  let source = read('scripts/engines-popcap.js');
  const start = source.indexOf('  function launchBanBiVe(');
  const end = source.indexOf('  function launchDanhBaiUno(', start);
  const part = source.slice(start, end).replace('    animId = requestAnimationFrame(loop);\n\n    onCleanup', `    window.__marbles = {
    initRound, shooter,
    readState: () => ({ gameState, shotsLeft, score, round, shotPending, marbles }),
    prepareLastShot: () => {
      shotsLeft = 0; shotPending = true;
      shooter.isMoving = true; shooter.vx = 0.01; shooter.vy = 0;
      marbles = [{ x: 450, y: 230, vx: 0.25, vy: 0, radius: 12, inRing: true, pts: 200, color: '#10B981', swirl: '#FFFFFF' }];
    }
  };
    animId = requestAnimationFrame(loop);\n\n    onCleanup`);
  vm.runInContext(source.slice(0, start) + part + source.slice(end), h.context);
  h.context.NP_Engines.launchBanBiVe(h.container, { id: 'ban-bi-ve', title: 'Bắn bi' });
  h.container.querySelector('#bvStartGameBtn').dispatch('click');
  return Object.assign(h, h.context.__marbles);
}

function chess() {
  const h = harness({ loadEngines: false, loadApp: false });
  const source = read('scripts/engines-popcap.js').replace('    loadPuzzle(0);\n\n    onCleanup', `    window.__chess = {
    PUZZLES, getValidMovesFor,
    readState: () => ({ boardState, puzzleSolved }),
    playMove: move => {
      handleBoardClick(padX + move.from.c * cellW, padY + move.from.r * cellH);
      handleBoardClick(padX + move.to.c * cellW, padY + move.to.r * cellH);
    },
    moveRook: () => {
      handleBoardClick(padX + cellW, padY + 8 * cellH);
      handleBoardClick(padX + cellW, padY);
    },
    showResult: () => { puzzleSolved = true; clearOverlay.style.display = 'flex'; }
  };
    loadPuzzle(0);\n\n    onCleanup`);
  vm.runInContext(source, h.context);
  h.context.NP_Engines.launchCoTuong(h.container, { id: 'co-tuong', title: 'Cờ Tướng' });
  return Object.assign(h, h.context.__chess);
}

test('Cờ Tướng replay dismisses intro or old victory overlays and restores a playable board', () => {
  const h = chess();
  const game = h;
  const intro = h.container.querySelector('#ctIntroOverlay');
  const clear = h.container.querySelector('#ctClearOverlay');
  const restart = h.container.querySelector('#ctResetBtn');
  assert.notEqual(intro.style.display, 'none', 'first launch keeps its introduction');
  restart.dispatch('click');
  assert.equal(intro.style.display, 'none', 'the shared replay target starts a playable round');
  game.moveRook();
  assert.equal(game.readState().boardState[0][1].type, 'R');
  game.showResult();
  restart.dispatch('click');
  assert.equal(clear.style.display, 'none', 'an old victory cannot cover the reset board');
  assert.equal(game.readState().puzzleSolved, false);
  assert.equal(game.readState().boardState[8][1].type, 'R');
  game.moveRook();
  assert.equal(game.readState().boardState[0][1].type, 'R', 'moves work after replay');
  h.context.NP_GameSession.stop();
});

test('all five Cờ Tướng scripted solutions are legal and finish through the real move generator', () => {
  const h = chess();
  h.container.querySelector('#ctStartGameBtn').dispatch('click');
  assert.equal(h.PUZZLES.length, 5);
  h.PUZZLES.forEach((puzzle, index) => {
    puzzle.solution.forEach((move, step) => {
      const legal = h.getValidMovesFor(move.from.r, move.from.c);
      assert.ok(legal.some(to => to.r === move.to.r && to.c === move.to.c), 'puzzle ' + (index + 1) + ', step ' + (step + 1) + ' must be legal');
      h.playMove(move);
    });
    assert.equal(h.readState().puzzleSolved, true, 'puzzle ' + (index + 1) + ' can finish');
    assert.equal(h.container.querySelector('#ctClearOverlay').style.display, 'flex');
    h.container.querySelector('#ctNextPuzzleBtn').dispatch('click');
  });
  h.context.NP_GameSession.stop();
});

test('marbles wait for the last moving target before deciding whether the final shot wins', () => {
  const h = marbles();
  const canvas = h.container.querySelector('#bvCanvas');
  canvas.dispatch('pointerdown', { pointerId: 2, clientX: 100 * 640 / 600, clientY: 370 * 480 / 460 });
  canvas.dispatch('pointermove', { pointerId: 2, clientX: 50 * 640 / 600, clientY: 430 * 480 / 460 });
  canvas.dispatch('pointercancel', { pointerId: 2 });
  assert.equal(h.readState().shotsLeft, 8, 'cancelling a drag never spends a shot');
  assert.equal(h.shooter.isMoving, false);
  h.prepareLastShot();
  h.frame(1000 / 60);
  assert.equal(h.readState().gameState, 'PLAYING', 'a stopped shooter does not end a moving shot');
  assert.equal(h.readState().shotPending, true);
  for (let i = 0; i < 90; i++) h.frame(1000 / 60);
  assert.equal(h.readState().gameState, 'STAGE_CLEAR', 'the final target can roll out after the shooter stops');
  assert.equal(h.readState().score, 200);
  h.container.querySelector('#bvResetBtn').dispatch('click');
  assert.equal(h.container.querySelector('#bvClearOverlay').style.display, 'none', 'restart clears the result overlay');
  h.initRound(3); h.prepareLastShot();
  for (let i = 0; i < 90; i++) h.frame(1000 / 60);
  assert.equal(h.readState().gameState, 'WON', 'the third round finishes the campaign');
  h.container.querySelector('#bvNextRoundBtn').dispatch('click');
  assert.equal(h.readState().round, 1, 'the final result starts a new campaign rather than repeating round three');
  assert.equal(h.readState().score, 0);
  h.context.NP_GameSession.stop();
});

test('UNO human wild cards wait for a chosen color and advance only after selection', () => {
  const h = uno();
  h.PLAYERS[0].hand = [{ color: 'WILD', val: 'wild', type: 'WILD' }, { color: 'GREEN', val: 2, type: 'NUM' }, { color: 'GREEN', val: 3, type: 'NUM' }];
  h.playHumanCard(0);
  assert.equal(h.readState().gameState, 'COLOR');
  assert.equal(h.readState().turn, 0);
  h.container.querySelector('#unoColorGREEN').dispatch('click');
  assert.equal(h.readState().gameState, 'PLAYING');
  assert.equal(h.readState().activeColor, 'GREEN');
  assert.equal(h.readState().turn, 1);
  h.context.NP_GameSession.stop();
});

test('UNO restarting a completed game or pending AI turn starts a fresh playable round', () => {
  const h = uno();
  h.PLAYERS[0].hand = [];
  h.applyCardEffect({ color: 'RED', val: 3, type: 'NUM' }, h.PLAYERS[0]);
  assert.equal(h.readState().gameState, 'GAMEOVER');
  h.container.querySelector('#unoNewGameBtn').dispatch('click');
  assert.equal(h.readState().gameState, 'PLAYING');
  assert.equal(h.PLAYERS[0].hand.length, 7);
  h.applyCardEffect({ color: 'RED', val: 3, type: 'NUM' }, h.PLAYERS[0]);
  assert.equal(h.readState().turn, 1);
  h.container.querySelector('#unoNewGameBtn').dispatch('click');
  const before = h.PLAYERS.map(p => p.hand.length);
  h.flushTimeouts();
  assert.deepEqual(h.PLAYERS.map(p => p.hand.length), before, 'old AI callbacks cannot play in the new round');
  assert.equal(h.readState().turn, 0);
  h.context.NP_GameSession.stop();
});

test('UNO recycles only discarded cards when the draw pile runs out', () => {
  const h = uno();
  // Move the original draw pile into hands, preserving the actual 108-card deck.
  const state = h.readState();
  h.PLAYERS[1].hand.push(...state.drawPile.splice(0));
  const card = h.PLAYERS[0].hand.pop();
  h.applyCardEffect(card, h.PLAYERS[0], 'BLUE');
  h.drawCards(h.PLAYERS[0], 6);
  const after = h.readState();
  const total = h.PLAYERS.reduce((count, player) => count + player.hand.length, 0) + after.drawPile.length + after.discardPile.length;
  assert.equal(total, 108, 'drawing never fabricates a fresh duplicate deck');
  assert.equal(after.discardPile.length, 1, 'the active top card stays on the table');
  h.context.NP_GameSession.stop();
});

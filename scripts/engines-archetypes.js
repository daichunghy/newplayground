/**
 * Multi-genre fallback for catalog entries without dedicated engines.
 * A shared game loop is NOT evidence that an individual retro game has been
 * reproduced. Each fallback has real input, failure, restart and stage loops.
 */
(function () {
  'use strict';

  var W = 640;
  var H = 400;
  var clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  var random = (lo, hi) => lo + Math.random() * (hi - lo);
  var pick = items => items[Math.floor(Math.random() * items.length)];

  function kindFor(game) {
    const id = String(game.id || '').toLowerCase();
    const category = String(game.category || '').toLowerCase();
    if (/lemonade|pizza|pizzeria|banh-ngot|tiem-sach|tycoon|restaurant/.test(id) || category === 'quản lý') return 'management';
    if (/trieu-phu|doan-chu|impossible-quiz|typer-shark|duo-hinh|bookworm|skribbl|among-us/.test(id) || category === 'trí tuệ') return 'quiz';
    if (/khoang-cach|no[ih]-ong|rubik|solitaire|freecell|spider|atomix|cut-the-rope|bridge-builder|boulder-dash|khac-biet|hop-chu|xep-bai|lua-va-nuoc/.test(id) || category === 'giải đố' || category === 'chill') return 'puzzle';
    if (/street-fighter|dau-vat|kung-fu|electric-man|mortal|rong-den|double-dragon|golden-axe|cadillacs|gun-mayhem|stick-war|worms|co-ty-phu|co-ca-ngua|tam-cuc|tien-len|keo-co|lac-bau|yie-ar/.test(id) || category === 'đối kháng' || category === 'chiến thuật' || category === 'party') return 'duel';
    if (/crossy|frogger|excitebike|dua-xe|truc-thang|chay|sonic|adventure-island|prince-of-persia|donkey-kong|fancy-pants|icy-tower|hamsterball|chip-dale|tiny-toon|circus-charlie|ice-climber|mappy|line-rider|xe-dap|xe-dung|qua-duong|elevator-action/.test(id)) return 'runner';
    if (/dap-chuot|dap-ruoi|phi-tieu|nem-vong|piano-tiles|thoi-bong|tap-lon|tat-lon|nem-lon|moorhuhn|pooyan|reflex|bong-bong-nuoc/.test(id) || category === 'kéo thả') return 'reflex';
    return 'shooter';
  }

  // Asteroids-inspired vector arcade loop. The reference mechanics are
  // rotation, thrust with retained inertia, wrapped space, firing and rocks
  // that split into smaller targets. All art below is drawn from original
  // geometric paths rather than copied cabinet graphics.
  const ASTEROIDS = Object.freeze({ width: 960, height: 720 });

  function asteroidRandom(state) {
    state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
    return state.rng / 0x100000000;
  }

  function asteroidWrap(value, span) {
    return ((value % span) + span) % span;
  }

  function asteroidDistance(a, b) {
    const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    return Math.hypot(Math.min(dx, ASTEROIDS.width - dx), Math.min(dy, ASTEROIDS.height - dy));
  }

  function asteroidRock(state, size, x, y, vx, vy) {
    const radius = size === 3 ? 31 : size === 2 ? 19 : 11;
    const points = Array.from({ length: 10 }, () => 0.74 + asteroidRandom(state) * 0.48);
    return { size, radius, x, y, vx, vy, angle: asteroidRandom(state) * Math.PI * 2,
      spin: (asteroidRandom(state) - 0.5) * 0.9, points };
  }

  function asteroidSpawnWave(state) {
    const count = Math.min(11, 3 + state.stage);
    const positions = [[115, 130], [800, 150], [160, 590], [790, 565], [500, 100], [500, 620], [90, 360], [870, 360], [310, 110], [650, 600], [340, 650]];
    state.rocks = Array.from({ length: count }, (_, i) => {
      const [x, y] = positions[i];
      const angle = asteroidRandom(state) * Math.PI * 2;
      const speed = 22 + Math.min(25, state.stage * 1.6) + asteroidRandom(state) * 15;
      return asteroidRock(state, 3, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
    });
    state.waveRemaining = 0;
  }

  function createAsteroidsState(seed = 0x1979) {
    const state = { rng: (Number(seed) >>> 0) || 1, phase: 'playing', stage: 1,
      score: 0, lives: 3, nextExtraLife: 10000, elapsed: 0, waveRemaining: 0,
      ship: { x: 480, y: 360, vx: 0, vy: 0, angle: -Math.PI / 2 }, rocks: [],
      bullets: [], fireCooldown: 0, invulnerable: 1.8, hyperspaceCooldown: 0,
      saucer: null, saucerShots: [], saucerTimer: 12, fx: [], lastEvent: null };
    asteroidSpawnWave(state);
    return state;
  }

  function asteroidFire(state) {
    if (state.phase !== 'playing' || state.fireCooldown > 0 || state.bullets.length >= 4) return false;
    const ship = state.ship, nose = 17;
    const vx = Math.cos(ship.angle), vy = Math.sin(ship.angle);
    state.bullets.push({ x: asteroidWrap(ship.x + vx * nose, ASTEROIDS.width),
      y: asteroidWrap(ship.y + vy * nose, ASTEROIDS.height),
      vx: ship.vx + vx * 390, vy: ship.vy + vy * 390, life: 1.45 });
    state.fireCooldown = 0.19;
    return true;
  }

  function asteroidHyperspace(state) {
    if (state.phase !== 'playing' || state.hyperspaceCooldown > 0) return false;
    state.ship.x = asteroidRandom(state) * ASTEROIDS.width;
    state.ship.y = asteroidRandom(state) * ASTEROIDS.height;
    state.ship.vx = state.ship.vy = 0;
    state.invulnerable = Math.max(state.invulnerable, 0.75);
    state.hyperspaceCooldown = 5;
    return true;
  }

  function asteroidLoseShip(state) {
    state.lives = Math.max(0, state.lives - 1);
    state.lastEvent = { type: 'lost-ship', lives: state.lives };
    if (!state.lives) { state.phase = 'over'; return; }
    state.ship = { x: 480, y: 360, vx: 0, vy: 0, angle: -Math.PI / 2 };
    state.invulnerable = 1.8;
  }

  function asteroidTick(state, input = {}, dt = 1 / 60) {
    const seconds = Math.min(0.05, Math.max(0, Number(dt) || 0));
    if (!seconds || state.phase === 'over') return;
    if (state.phase === 'wave-clear') {
      state.waveRemaining -= seconds;
      if (state.waveRemaining <= 0) {
        state.stage++;
        asteroidSpawnWave(state);
        state.phase = 'playing';
        state.invulnerable = 1.4;
        state.lastEvent = { type: 'wave-start', stage: state.stage };
      }
      return;
    }
    state.elapsed += seconds;
    state.invulnerable = Math.max(0, state.invulnerable - seconds);
    state.fireCooldown = Math.max(0, state.fireCooldown - seconds);
    state.hyperspaceCooldown = Math.max(0, state.hyperspaceCooldown - seconds);
    const ship = state.ship;
    if (input.left) ship.angle -= 4.6 * seconds;
    if (input.right) ship.angle += 4.6 * seconds;
    if (input.thrust) {
      ship.vx += Math.cos(ship.angle) * 205 * seconds;
      ship.vy += Math.sin(ship.angle) * 205 * seconds;
    }
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 350) { ship.vx *= 350 / speed; ship.vy *= 350 / speed; }
    const drag = Math.pow(0.994, seconds * 60);
    ship.vx *= drag; ship.vy *= drag;
    ship.x = asteroidWrap(ship.x + ship.vx * seconds, ASTEROIDS.width);
    ship.y = asteroidWrap(ship.y + ship.vy * seconds, ASTEROIDS.height);
    if (input.fire) asteroidFire(state);
    if (input.hyperspace) asteroidHyperspace(state);

    for (const bullet of state.bullets) {
      bullet.x = asteroidWrap(bullet.x + bullet.vx * seconds, ASTEROIDS.width);
      bullet.y = asteroidWrap(bullet.y + bullet.vy * seconds, ASTEROIDS.height);
      bullet.life -= seconds;
    }
    state.bullets = state.bullets.filter(bullet => bullet.life > 0);
    for (const rock of state.rocks) {
      rock.x = asteroidWrap(rock.x + rock.vx * seconds, ASTEROIDS.width);
      rock.y = asteroidWrap(rock.y + rock.vy * seconds, ASTEROIDS.height);
      rock.angle += rock.spin * seconds;
    }

    if (!state.saucer) {
      state.saucerTimer -= seconds;
      if (state.saucerTimer <= 0) {
        const fromLeft = asteroidRandom(state) < 0.5;
        const size = state.stage >= 4 ? 'small' : 'large';
        state.saucer = { x: fromLeft ? -24 : ASTEROIDS.width + 24,
          y: 70 + asteroidRandom(state) * (ASTEROIDS.height - 140),
          vx: (fromLeft ? 1 : -1) * (size === 'small' ? 94 : 62),
          size, fireCooldown: size === 'small' ? 1.2 : 1.8 };
      }
    } else {
      const saucer = state.saucer;
      saucer.x += saucer.vx * seconds;
      saucer.fireCooldown -= seconds;
      if (saucer.fireCooldown <= 0) {
        const aim = Math.atan2(state.ship.y - saucer.y, state.ship.x - saucer.x);
        const velocity = saucer.size === 'small' ? 230 : 165;
        state.saucerShots.push({ x: saucer.x, y: saucer.y,
          vx: Math.cos(aim) * velocity, vy: Math.sin(aim) * velocity, life: 2.5 });
        saucer.fireCooldown = saucer.size === 'small' ? 1.1 : 1.8;
      }
      if (saucer.x < -42 || saucer.x > ASTEROIDS.width + 42) {
        state.saucer = null;
        state.saucerTimer = 11 + asteroidRandom(state) * 7;
      }
    }
    for (const shot of state.saucerShots) {
      shot.x += shot.vx * seconds; shot.y += shot.vy * seconds; shot.life -= seconds;
    }
    state.saucerShots = state.saucerShots.filter(shot => shot.life > 0 && shot.x >= -8 && shot.x <= ASTEROIDS.width + 8 && shot.y >= -8 && shot.y <= ASTEROIDS.height + 8);

    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const bullet = state.bullets[bi];
      const ri = state.rocks.findIndex(rock => asteroidDistance(bullet, rock) < rock.radius);
      if (ri < 0) continue;
      const [rock] = state.rocks.splice(ri, 1);
      state.bullets.splice(bi, 1);
      state.score += rock.size === 3 ? 20 : rock.size === 2 ? 50 : 100;
      while (state.score >= state.nextExtraLife) {
        if (state.lives < 6) state.lives++;
        state.nextExtraLife += 10000;
      }
      if (rock.size > 1) {
        for (const side of [-1, 1]) {
          const angle = Math.atan2(rock.vy, rock.vx) + side * (0.48 + asteroidRandom(state) * 0.35);
          const velocity = Math.hypot(rock.vx, rock.vy) + 28;
          state.rocks.push(asteroidRock(state, rock.size - 1, rock.x, rock.y,
            Math.cos(angle) * velocity, Math.sin(angle) * velocity));
        }
      }
    }

    if (state.saucer) {
      const radius = state.saucer.size === 'small' ? 12 : 20;
      const hitIndex = state.bullets.findIndex(bullet => asteroidDistance(bullet, state.saucer) < radius);
      if (hitIndex >= 0) {
        state.bullets.splice(hitIndex, 1);
        state.score += state.saucer.size === 'small' ? 1000 : 200;
        state.saucer = null;
        state.saucerTimer = 9 + asteroidRandom(state) * 6;
        while (state.score >= state.nextExtraLife) {
          if (state.lives < 6) state.lives++;
          state.nextExtraLife += 10000;
        }
        state.lastEvent = { type: 'saucer-hit', score: state.score };
      }
    }

    if (state.invulnerable <= 0 && state.rocks.some(rock => asteroidDistance(ship, rock) < rock.radius + 11)) {
      asteroidLoseShip(state);
    }
    if (state.phase === 'playing' && state.invulnerable <= 0 && state.saucerShots.some(shot => asteroidDistance(ship, shot) < 13)) asteroidLoseShip(state);
    if (!state.rocks.length && state.phase === 'playing') {
      state.phase = 'wave-clear';
      state.waveRemaining = 1.2;
      state.lastEvent = { type: 'wave-clear', stage: state.stage };
    }
  }

  // Classic Piano Tiles mode: hit only black keys, clear 50 notes as quickly
  // as possible, and lose on a white-key hit or a tile that reaches the floor.
  const PIANO_TILES = Object.freeze({ width: 480, height: 780, columns: 4, rowsVisible: 6, cellHeight: 130, total: 50 });

  function pianoRandom(state) {
    state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
    return state.rng / 0x100000000;
  }

  function pianoSpeed(score) { return Math.min(360, 145 + Math.floor(score / 8) * 24); }

  function pianoSpawn(state, y) {
    let lane = Math.floor(pianoRandom(state) * PIANO_TILES.columns);
    for (let attempt = 0; lane === state.lastLane && attempt < 3; attempt++) lane = Math.floor(pianoRandom(state) * PIANO_TILES.columns);
    state.lastLane = lane;
    state.rows.push({ id: state.nextId++, lane, y });
    state.generated++;
  }

  function createPianoTilesState(seed = 0x2014) {
    const state = { rng: (Number(seed) >>> 0) || 1, phase: 'ready', score: 0, elapsed: 0,
      generated: 0, nextId: 1, spawnRemaining: PIANO_TILES.cellHeight / pianoSpeed(0),
      rows: [], lastEvent: null, reason: null };
    for (let row = 0; row < PIANO_TILES.rowsVisible; row++) pianoSpawn(state, row * PIANO_TILES.cellHeight);
    return state;
  }

  function pianoEnd(state, reason) {
    if (!['ready', 'playing'].includes(state.phase)) return;
    state.phase = reason === 'complete' ? 'won' : 'over';
    state.reason = reason;
    state.lastEvent = { type: reason === 'complete' ? 'complete' : 'mistake', reason, score: state.score };
  }

  function pianoTap(state, tileId, lane) {
    if (!['ready', 'playing'].includes(state.phase)) return false;
    if (state.phase === 'ready') state.phase = 'playing';
    const index = state.rows.findIndex(row => row.id === tileId);
    if (index < 0 || state.rows[index].lane !== lane) {
      pianoEnd(state, 'white');
      return false;
    }
    state.rows.splice(index, 1);
    state.score++;
    state.lastEvent = { type: 'note', lane, score: state.score };
    if (state.score >= PIANO_TILES.total) pianoEnd(state, 'complete');
    return true;
  }

  function pianoTick(state, dt = 1 / 60) {
    const seconds = Math.min(0.05, Math.max(0, Number(dt) || 0));
    if (!seconds || state.phase !== 'playing') return;
    state.elapsed += seconds;
    const speed = pianoSpeed(state.score);
    for (const row of state.rows) row.y += speed * seconds;
    if (state.rows.some(row => row.y >= PIANO_TILES.height)) {
      pianoEnd(state, 'missed');
      return;
    }
    state.spawnRemaining -= seconds;
    if (state.spawnRemaining <= 0 && state.generated < PIANO_TILES.total) {
      const top = state.rows.length ? Math.min(...state.rows.map(row => row.y)) : 0;
      pianoSpawn(state, top - PIANO_TILES.cellHeight);
      state.spawnRemaining += Math.max(0.32, PIANO_TILES.cellHeight / pianoSpeed(state.score));
    }
  }

  // Galaga-inspired fixed shooter. The 1981 Namco reference specifies about
  // forty enemies, three ranks, a two-shot cap, lateral movement, dives and
  // the Boss Galaga capture/rescue that unlocks a larger dual fighter.
  const GALAGA = Object.freeze({ width: 600, height: 780, columns: 8, rows: 5, enemyCount: 40, maxShots: 2, playerY: 708 });

  function galagaRandom(state) {
    state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
    return state.rng / 0x100000000;
  }

  function galagaEnemy(state, id, row, column) {
    const type = row === 0 && (column === 3 || column === 4) ? 'boss' :
      (row < 2 && (column < 2 || column > 5)) ? 'guard' : 'grunt';
    const baseX = 48 + column * 72;
    const baseY = 114 + row * 48;
    return { id, type, hp: type === 'boss' ? 2 : 1, x: baseX, y: -35 - row * 24,
      baseX, baseY, row, column, phase: galagaRandom(state) * Math.PI * 2,
      mode: 'entry', modeTime: 0, shotCooldown: 2 + galagaRandom(state) * 3,
      beamCooldown: 8 + galagaRandom(state) * 5, beamTime: 0, carrying: false };
  }

  function galagaSpawnStage(state) {
    const challenge = state.stage >= 3 && (state.stage - 3) % 4 === 0;
    let carrierAssigned = false;
    state.waveMode = challenge ? 'challenge' : 'formation';
    state.phase = 'entry';
    state.phaseRemaining = 1.5;
    state.waveRemaining = challenge ? 18 : 0;
    state.diveRemaining = 1.2;
    state.challengePerfect = true;
    state.enemies = Array.from({ length: GALAGA.enemyCount }, (_, index) => {
      const row = Math.floor(index / GALAGA.columns), column = index % GALAGA.columns;
      const enemy = galagaEnemy(state, index + 1, row, column);
      if (state.capturedFighter && enemy.type === 'boss' && !carrierAssigned) { enemy.carrying = true; carrierAssigned = true; }
      return enemy;
    });
    state.shots = [];
    state.enemyShots = [];
    state.beams = [];
    state.lastEvent = { type: 'wave-start', stage: state.stage, challenge };
  }

  function createGalagaState(seed = 0x1981) {
    const state = { rng: (Number(seed) >>> 0) || 1, phase: 'entry', waveMode: 'formation',
      stage: 1, score: 0, lives: 3, nextExtraLife: 20000, elapsed: 0,
      player: { x: GALAGA.width / 2, y: GALAGA.playerY }, dual: false,
      capturedFighter: false, invulnerable: 1.6, shotCooldown: 0,
      enemies: [], shots: [], enemyShots: [], lastEvent: null,
      phaseRemaining: 1.5, waveRemaining: 0, diveRemaining: 1.2, challengePerfect: true };
    galagaSpawnStage(state);
    return state;
  }

  function galagaFire(state) {
    if (!['entry', 'playing', 'challenge'].includes(state.phase) ||
        state.shotCooldown > 0 || state.shots.length >= GALAGA.maxShots) return false;
    const offsets = state.dual ? [-13, 13] : [0];
    if (state.shots.length + offsets.length > GALAGA.maxShots) return false;
    for (const offset of offsets) state.shots.push({ x: state.player.x + offset, y: state.player.y - 20, vy: -520 });
    state.shotCooldown = 0.24;
    return true;
  }

  function galagaCapture(state, boss) {
    if (state.phase === 'over' || state.capturedFighter || state.dual || !boss || boss.type !== 'boss') return false;
    state.lives = Math.max(0, state.lives - 1);
    state.capturedFighter = true;
    boss.carrying = true;
    boss.beamTime = 0;
    state.invulnerable = 1.1;
    state.lastEvent = { type: 'captured', lives: state.lives };
    if (!state.lives) state.phase = 'over';
    return true;
  }

  function galagaLoseShip(state, reason = 'shot') {
    if (state.phase === 'over') return;
    state.lives = Math.max(0, state.lives - 1);
    state.dual = false;
    state.player.x = GALAGA.width / 2;
    state.invulnerable = 1.6;
    state.lastEvent = { type: 'lost-ship', reason, lives: state.lives };
    if (!state.lives) state.phase = 'over';
  }

  function galagaScoreKill(state, enemy) {
    const base = enemy.type === 'boss' ? 150 : enemy.type === 'guard' ? 80 : 50;
    state.score += enemy.mode === 'formation' ? base : base * 2;
    if (enemy.type === 'boss' && enemy.carrying) {
      enemy.carrying = false;
      state.capturedFighter = false;
      state.dual = true;
      state.lives = Math.min(6, state.lives + 1);
      state.lastEvent = { type: 'rescued', score: state.score, lives: state.lives };
    } else state.lastEvent = { type: 'enemy-hit', score: state.score };
    while (state.score >= state.nextExtraLife) {
      state.lives = Math.min(6, state.lives + 1);
      state.nextExtraLife += 20000;
    }
  }

  function galagaTick(state, input = {}, dt = 1 / 60) {
    const seconds = Math.min(0.05, Math.max(0, Number(dt) || 0));
    if (!seconds || state.phase === 'over') return;
    if (state.phase === 'cleared') {
      state.phaseRemaining -= seconds;
      if (state.phaseRemaining <= 0) {
        state.stage++;
        galagaSpawnStage(state);
      }
      return;
    }

    state.elapsed += seconds;
    state.invulnerable = Math.max(0, state.invulnerable - seconds);
    state.shotCooldown = Math.max(0, state.shotCooldown - seconds);
    if (Number.isFinite(input.pointerX)) state.player.x = Math.max(22, Math.min(GALAGA.width - 22, input.pointerX));
    else state.player.x = Math.max(22, Math.min(GALAGA.width - 22,
      state.player.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 390 * seconds));
    if (input.fire) galagaFire(state);

    if (state.phase === 'entry') {
      state.phaseRemaining -= seconds;
      const progress = Math.max(0, Math.min(1, 1 - state.phaseRemaining / 1.5));
      const ease = progress * progress * (3 - 2 * progress);
      for (const enemy of state.enemies) {
        enemy.x += (enemy.baseX - enemy.x) * ease;
        enemy.y += (enemy.baseY - enemy.y) * ease;
      }
      if (state.phaseRemaining <= 0) {
        for (const enemy of state.enemies) { enemy.x = enemy.baseX; enemy.y = enemy.baseY; enemy.mode = state.waveMode === 'challenge' ? 'challenge' : 'formation'; enemy.modeTime = 0; }
        state.phase = state.waveMode === 'challenge' ? 'challenge' : 'playing';
        state.lastEvent = { type: state.waveMode === 'challenge' ? 'challenge-start' : 'formation-ready', stage: state.stage };
      }
      return;
    }

    for (const shot of state.shots) shot.y += shot.vy * seconds;
    state.shots = state.shots.filter(shot => shot.y > -12);
    for (const shot of state.enemyShots) { shot.x += shot.vx * seconds; shot.y += shot.vy * seconds; }
    state.enemyShots = state.enemyShots.filter(shot => shot.y < GALAGA.height + 12 && shot.x > -12 && shot.x < GALAGA.width + 12);

    if (state.phase === 'playing') {
      state.diveRemaining -= seconds;
      if (state.diveRemaining <= 0) {
        const candidates = state.enemies.filter(enemy => enemy.mode === 'formation');
        if (candidates.length) {
          const enemy = candidates[Math.floor(galagaRandom(state) * candidates.length)];
          enemy.mode = 'diving'; enemy.modeTime = 0; enemy.diveStartX = enemy.x;
          enemy.beamCooldown = Math.max(0, enemy.beamCooldown);
        }
        state.diveRemaining = Math.max(0.9, 1.9 - Math.min(0.7, state.stage * 0.025)) + galagaRandom(state) * 0.7;
      }
    }

    for (const enemy of state.enemies) {
      if (enemy.mode === 'formation') {
        enemy.x = enemy.baseX + Math.sin(state.elapsed * 0.8 + enemy.phase) * 7;
        enemy.y = enemy.baseY + Math.sin(state.elapsed * 1.1 + enemy.phase) * 2;
      } else if (enemy.mode === 'diving') {
        enemy.modeTime += seconds;
        const t = Math.min(1, enemy.modeTime / 3.3);
        enemy.x = Math.max(28, Math.min(GALAGA.width - 28, enemy.diveStartX + Math.sin(t * Math.PI * 2 + enemy.phase) * 180));
        enemy.y = enemy.baseY + Math.sin(t * Math.PI) * 500;
        if (enemy.shotCooldown <= 0) {
          const dx = state.player.x - enemy.x;
          const velocity = 255 + Math.min(50, state.stage * 5);
          state.enemyShots.push({ x: enemy.x, y: enemy.y + 12, vx: Math.max(-90, Math.min(90, dx * 0.17)), vy: velocity });
          enemy.shotCooldown = 1.1 + galagaRandom(state) * 1.2;
        }
        if (enemy.type === 'boss' && !state.dual && !state.capturedFighter && enemy.beamCooldown <= 0 && enemy.modeTime < 1.5) {
          enemy.beamTime = 0.85;
          enemy.beamCooldown = 12;
        }
        if (enemy.beamTime > 0) {
          enemy.beamTime = Math.max(0, enemy.beamTime - seconds);
          if (Math.abs(enemy.x - state.player.x) < 27 && state.player.y > enemy.y + 70) galagaCapture(state, enemy);
        }
        if (Math.abs(enemy.x - state.player.x) < (state.dual ? 34 : 22) && Math.abs(enemy.y - state.player.y) < 22 && state.invulnerable <= 0) galagaLoseShip(state, 'collision');
        if (t >= 1 && enemy.mode === 'diving') { enemy.mode = 'formation'; enemy.modeTime = 0; enemy.x = enemy.baseX; enemy.y = enemy.baseY; }
      } else if (enemy.mode === 'challenge') {
        enemy.modeTime += seconds;
        const t = enemy.modeTime / 5.5;
        enemy.x = Math.max(24, Math.min(GALAGA.width - 24, enemy.baseX + Math.sin(t * Math.PI * 2 + enemy.phase) * 166));
        enemy.y = enemy.baseY + t * 570;
        if (enemy.y > GALAGA.height + 30) { state.challengePerfect = false; enemy.mode = 'escaped'; }
      }
      enemy.shotCooldown -= seconds;
      enemy.beamCooldown -= seconds;
    }
    state.enemies = state.enemies.filter(enemy => enemy.mode !== 'escaped');

    for (let si = state.shots.length - 1; si >= 0; si--) {
      const shot = state.shots[si];
      const index = state.enemies.findIndex(enemy => Math.hypot(enemy.x - shot.x, enemy.y - shot.y) < (enemy.type === 'boss' ? 22 : 18));
      if (index < 0) continue;
      const enemy = state.enemies[index];
      state.shots.splice(si, 1);
      enemy.hp--;
      if (enemy.hp <= 0) { state.enemies.splice(index, 1); galagaScoreKill(state, enemy); }
    }

    if (state.invulnerable <= 0 && state.enemyShots.some(shot => Math.abs(shot.x - state.player.x) < (state.dual ? 25 : 16) && Math.abs(shot.y - state.player.y) < 18)) {
      galagaLoseShip(state, 'enemy-fire');
      state.enemyShots = state.enemyShots.filter(shot => Math.abs(shot.x - state.player.x) > 40 || Math.abs(shot.y - state.player.y) > 40);
    }
    if (state.phase === 'over') return;

    if (state.phase === 'challenge') {
      state.waveRemaining -= seconds;
      if (state.waveRemaining <= 0) {
        for (const enemy of state.enemies) { if (enemy.mode !== 'escaped') state.challengePerfect = false; }
        state.enemies = [];
      }
    }
    if (!state.enemies.length && ['playing', 'challenge'].includes(state.phase)) {
      if (state.waveMode === 'challenge' && state.challengePerfect) { state.score += 1000; state.lastEvent = { type: 'challenge-perfect', score: state.score }; }
      state.phase = 'cleared'; state.phaseRemaining = 1.3;
      if (!state.lastEvent || !['challenge-perfect', 'rescued', 'lost-ship'].includes(state.lastEvent.type)) state.lastEvent = { type: 'wave-clear', stage: state.stage };
    }
  }

  function launchAsteroids(container, game) {
    const session = window.NP_GameSession.start();
    const { listen } = session;
    const key = 'np_asteroids_record_v1';
    const state = createAsteroidsState((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    let best = 0, raf = null, lastFrame = 0, paused = false, lastScore = 0, announcedEvent = null;
    const held = { left: false, right: false, thrust: false, fire: false };
    const pointers = new Map();
    try { best = Math.max(0, Number(JSON.parse(localStorage.getItem(key) || '{}').score) || 0); } catch (error) {}
    container.innerHTML = `
      <style>
        #gameModal:has(.np-asteroids-shell) .modal-window { width:min(98vw,980px); max-width:980px; min-width:0; }
        #gameModal:has(.np-asteroids-shell) .modal-body,#gameModal:has(.np-asteroids-shell) .modal-title-group { min-width:0; }
        .np-asteroids-shell { width:min(100%,860px); margin:auto; display:grid; gap:8px; color:#d9edf2; font-family:Calibri,Inter,sans-serif; }
        .np-asteroids-hud { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:42px; padding:0 10px; color:#46616a; letter-spacing:.08em; text-transform:uppercase; font-size:12px; }
        .np-asteroids-hud strong { color:#152f38; font-size:18px; letter-spacing:.02em; }
        .np-asteroids-lives { color:#4c781c!important; letter-spacing:.18em!important; }
        .np-asteroids-board { display:block; width:100%; height:auto; aspect-ratio:4/3; border:1px solid #34505e; border-radius:6px; background:#07131e; touch-action:none; }
        .np-asteroids-controls { display:grid; grid-template-columns:repeat(7,minmax(44px,1fr)); gap:7px; width:min(100%,710px); margin:auto; }
        .np-asteroids-controls button { min-width:44px; min-height:48px; border:1px solid #4b7381; border-radius:8px; background:#142b37; color:#e2f1ed; font:700 13px Calibri,Inter,sans-serif; touch-action:none; user-select:none; }
        .np-asteroids-controls button[data-control="fire"] { color:#07131e; background:#bef264; border-color:#d5f99a; }
        .np-asteroids-controls button:active { transform:translateY(2px); }
        .np-asteroids-help { min-height:18px; margin:0; color:#829ba3; text-align:center; font-size:12px; }
        @media(max-width:560px) { .np-asteroids-hud { padding:0 2px; font-size:10px; } .np-asteroids-hud strong { font-size:15px; } .np-asteroids-controls { gap:4px; } .np-asteroids-controls button { min-height:46px; padding:2px; font-size:11px; } }
        @media(max-width:360px) { .np-asteroids-controls { grid-template-columns:repeat(4,minmax(44px,1fr)); width:min(100%,280px); } }
        @media(prefers-reduced-motion:reduce) { .np-asteroids-controls button { transition:none; } }
      </style>
      <section class="np-asteroids-shell" aria-label="Phi thuyền và vành đai thiên thạch">
        <div class="np-asteroids-hud"><span>Điểm <strong id="asScore">0</strong></span><span>Làn sóng <strong id="asWave">1</strong></span><span class="np-asteroids-lives" id="asLives">● ● ●</span><span>Kỷ lục <strong id="asBest">0</strong></span></div>
        <canvas id="asCanvas" class="np-asteroids-board" width="960" height="720" tabindex="0" aria-label="Điều khiển phi thuyền, phá thiên thạch lớn thành mảnh nhỏ và sống sót qua các làn sóng."></canvas>
        <div class="np-asteroids-controls" aria-label="Điều khiển phi thuyền">
          <button type="button" data-control="left" aria-label="Xoay trái">⟲</button><button type="button" data-control="thrust" aria-label="Tăng tốc">ĐẨY</button><button type="button" data-control="right" aria-label="Xoay phải">⟳</button><button type="button" data-control="fire" aria-label="Bắn">BẮN</button><button type="button" data-control="hyperspace" aria-label="Nhảy không gian">NHẢY</button><button type="button" id="asPause" aria-label="Tạm dừng">DỪNG</button><button type="button" id="asRestart" aria-label="Chơi lại">LẠI</button>
        </div>
        <p id="asHelp" class="np-asteroids-help" role="status" aria-live="polite">← → xoay · ↑ đẩy · Space bắn · Shift nhảy không gian</p>
      </section>`;
    const canvas = container.querySelector('#asCanvas'), ctx = canvas.getContext('2d');
    const scoreEl = container.querySelector('#asScore'), waveEl = container.querySelector('#asWave'), livesEl = container.querySelector('#asLives'), bestEl = container.querySelector('#asBest'), help = container.querySelector('#asHelp');
    const setRecord = () => { if (state.score <= best) return; best = state.score; try { localStorage.setItem(key, JSON.stringify({ score: best })); } catch (error) {} };
    bestEl.textContent = String(best);
    function drawRock(rock, offsetX = 0, offsetY = 0) {
      ctx.save(); ctx.translate(rock.x + offsetX, rock.y + offsetY); ctx.rotate(rock.angle); ctx.beginPath();
      for (let i = 0; i < rock.points.length; i++) { const a = i / rock.points.length * Math.PI * 2, r = rock.radius * rock.points[i]; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
      ctx.closePath(); ctx.strokeStyle = rock.size === 3 ? '#9bb2a9' : rock.size === 2 ? '#bdd1c2' : '#d1ded0'; ctx.lineWidth = rock.size === 1 ? 1.5 : 2; ctx.stroke(); ctx.restore();
    }
    function draw() {
      ctx.clearRect(0,0,ASTEROIDS.width,ASTEROIDS.height); ctx.fillStyle='#07131e'; ctx.fillRect(0,0,ASTEROIDS.width,ASTEROIDS.height);
      for (let i=0;i<95;i++){const x=(i*137.5+17)%ASTEROIDS.width,y=(i*83.1+11)%ASTEROIDS.height;ctx.fillStyle=i%7?'rgba(179,215,211,.32)':'rgba(190,242,100,.62)';ctx.fillRect(x,y,i%7?1:2,i%7?1:2);}
      for (const rock of state.rocks) for (const dx of [-ASTEROIDS.width,0,ASTEROIDS.width]) for (const dy of [-ASTEROIDS.height,0,ASTEROIDS.height]) {
        if ((dx===0||rock.x<rock.radius||rock.x>ASTEROIDS.width-rock.radius) && (dy===0||rock.y<rock.radius||rock.y>ASTEROIDS.height-rock.radius)) drawRock(rock,dx,dy);
      }
      ctx.fillStyle='#dff5dd'; for (const bullet of state.bullets) for (const dx of [-ASTEROIDS.width,0,ASTEROIDS.width]) for (const dy of [-ASTEROIDS.height,0,ASTEROIDS.height]) { if((dx===0||bullet.x<4||bullet.x>ASTEROIDS.width-4)&&(dy===0||bullet.y<4||bullet.y>ASTEROIDS.height-4)){ctx.beginPath();ctx.arc(bullet.x+dx,bullet.y+dy,2.2,0,Math.PI*2);ctx.fill();} }
      ctx.fillStyle='#ff8a76'; for(const shot of state.saucerShots){ctx.beginPath();ctx.arc(shot.x,shot.y,3,0,Math.PI*2);ctx.fill();}
      if(state.saucer&&state.saucer.x>=-28&&state.saucer.x<=988){ctx.save();ctx.translate(state.saucer.x,state.saucer.y);ctx.strokeStyle=state.saucer.size==='small'?'#ff8a76':'#ffca70';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-21,2);ctx.lineTo(-14,8);ctx.lineTo(14,8);ctx.lineTo(21,2);ctx.lineTo(11,-1);ctx.lineTo(-11,-1);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.ellipse(0,-2,9,6,0,Math.PI,Math.PI*2);ctx.stroke();ctx.restore();}
      const ship=state.ship;
      if (state.lives>0 && !(state.invulnerable>0 && Math.floor(state.elapsed*12)%2===0)) {
        for (const dx of [-ASTEROIDS.width,0,ASTEROIDS.width]) for (const dy of [-ASTEROIDS.height,0,ASTEROIDS.height]) { if((dx===0||ship.x<24||ship.x>ASTEROIDS.width-24)&&(dy===0||ship.y<24||ship.y>ASTEROIDS.height-24)){ctx.save();ctx.translate(ship.x+dx,ship.y+dy);ctx.rotate(ship.angle);ctx.beginPath();ctx.moveTo(19,0);ctx.lineTo(-13,-11);ctx.lineTo(-8,0);ctx.lineTo(-13,11);ctx.closePath();ctx.strokeStyle='#bff46b';ctx.lineWidth=2.5;ctx.stroke();if(held.thrust&&state.phase==='playing'){ctx.beginPath();ctx.moveTo(-11,-5);ctx.lineTo(-22+(Math.random()*5),0);ctx.lineTo(-11,5);ctx.strokeStyle='#ffab59';ctx.stroke();}ctx.restore();} }
      }
      const centerY=ASTEROIDS.height/2;
      if (state.phase==='wave-clear') { ctx.fillStyle='#d8edbe';ctx.font='600 27px Calibri, sans-serif';ctx.textAlign='center';ctx.fillText('VÀNH ĐAI ĐÃ DỌN SẠCH',480,centerY-18);ctx.font='15px Calibri, sans-serif';ctx.fillStyle='#8ca9ad';ctx.fillText('LÀN SÓNG TIẾP THEO',480,centerY+18); }
      if (state.phase==='over') { ctx.fillStyle='#ffcf8c';ctx.font='700 38px Calibri, sans-serif';ctx.textAlign='center';ctx.fillText('PHI THUYỀN MẤT TÍCH',480,centerY-18);ctx.font='16px Calibri, sans-serif';ctx.fillStyle='#9dbac2';ctx.fillText('Nhấn Enter hoặc LẠI để quay lại vành đai',480,centerY+20); }
      if (paused) { ctx.fillStyle='rgba(3,12,19,.7)';ctx.fillRect(0,0,ASTEROIDS.width,ASTEROIDS.height);ctx.fillStyle='#dff5dd';ctx.font='700 34px Calibri, sans-serif';ctx.textAlign='center';ctx.fillText('TẠM DỪNG',480,centerY); }
    }
    function updateHud() { scoreEl.textContent=String(state.score); waveEl.textContent=String(state.stage); livesEl.textContent=Array.from({length:state.lives},()=> '●').join(' ') || '—'; bestEl.textContent=String(best); }
    function pressControl(name, down) { if (name in held) held[name]=down; else if (name==='hyperspace' && down) asteroidHyperspace(state); }
    const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'thrust',KeyW:'thrust',Space:'fire'};
    listen(window,'keydown',event=>{ if(event.code==='Escape'){event.preventDefault();togglePause();return;}const control=keyMap[event.code];if(control){event.preventDefault();held[control]=true;}if(event.code==='ShiftLeft'||event.code==='ShiftRight'){event.preventDefault();asteroidHyperspace(state);}if(event.code==='Enter'&&state.phase==='over'){event.preventDefault();reset();} });
    listen(window,'keyup',event=>{const control=keyMap[event.code];if(control){event.preventDefault();held[control]=false;}});
    listen(window,'blur',()=>{for(const key of Object.keys(held))held[key]=false;pointers.clear();});
    container.querySelectorAll('[data-control]').forEach(button=>{
      const name=button.dataset.control;
      listen(button,'pointerdown',event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,name);pressControl(name,true);});
      const release=event=>{if(pointers.get(event.pointerId)!==name)return;pointers.delete(event.pointerId);if(name in held)held[name]=Array.from(pointers.values()).includes(name);};
      listen(button,'pointerup',release);listen(button,'pointercancel',release);listen(button,'lostpointercapture',release);
    });
    function reset(){Object.assign(state,createAsteroidsState((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0));for(const key of Object.keys(held))held[key]=false;paused=false;lastScore=0;announcedEvent=null;pauseButton.textContent='DỪNG';help.textContent='← → xoay · ↑ đẩy · Space bắn · Shift nhảy không gian';updateHud();}
    listen(container.querySelector('#asRestart'),'click',reset);
    const pauseButton=container.querySelector('#asPause');
    const togglePause=()=>{if(state.phase==='over')return;paused=!paused;for(const key of Object.keys(held))held[key]=false;pauseButton.textContent=paused?'TIẾP':'DỪNG';help.textContent=paused?'Tạm dừng':'← → xoay · ↑ đẩy · Space bắn · Shift nhảy không gian';};
    listen(pauseButton,'click',togglePause);
    function frame(timestamp){const dt=lastFrame?Math.min(.05,Math.max(0,(timestamp-lastFrame)/1000)):1/60;lastFrame=timestamp;const prior=state.phase;if(!paused)asteroidTick(state,held,dt);setRecord();updateHud();if(state.score>lastScore){if(window.NP_Audio&&typeof window.NP_Audio.explosion==='function')window.NP_Audio.explosion(false);lastScore=state.score;}if(state.lastEvent&&state.lastEvent!==announcedEvent){announcedEvent=state.lastEvent;if(state.lastEvent.type==='lost-ship'){help.textContent=state.lives?'Tàu bị phá hủy · còn '+state.lives:'Mất tàu · Enter hoặc LẠI để thử lại';if(window.NP_Audio&&typeof window.NP_Audio.alarm==='function')window.NP_Audio.alarm();}if(state.lastEvent.type==='wave-start'){help.textContent='Làn sóng '+state.stage+' · tốc độ thiên thạch tăng';if(window.NP_Audio&&typeof window.NP_Audio.win==='function')window.NP_Audio.win();}}if(state.phase!==prior&&state.phase==='over')help.textContent='Mất tàu · Enter hoặc LẠI để thử lại';draw();raf=session.requestAnimationFrame(frame);}
    updateHud();draw();raf=session.requestAnimationFrame(frame);
    session.onCleanup(()=>{if(raf!==null)session.cancelAnimationFrame(raf);for(const key of Object.keys(held))held[key]=false;pointers.clear();setRecord();});
  }

  function launchPianoTiles(container, game) {
    const session = window.NP_GameSession.start();
    const { listen } = session;
    const recordKey = 'np_piano_tiles_record_v1';
    let state = createPianoTilesState((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    let bestScore = 0, fastest = 0, paused = false, raf = null, lastFrame = 0, announcedEvent = null;
    try {
      const record = JSON.parse(localStorage.getItem(recordKey) || '{}');
      bestScore = Math.max(0, Number(record.score) || 0);
      fastest = Math.max(0, Number(record.fastest) || 0);
    } catch (error) {}
    container.innerHTML = `
      <style>
        #gameModal:has(.np-piano-shell) .modal-window { width:min(98vw,620px); max-width:620px; min-width:0; }
        #gameModal:has(.np-piano-shell) .modal-body,#gameModal:has(.np-piano-shell) .modal-title-group { min-width:0; }
        .np-piano-shell { width:min(100%,500px); margin:auto; display:grid; justify-items:center; gap:8px; color:#16181b; font-family:Calibri,Inter,sans-serif; }
        .np-piano-hud { width:min(100%,480px); display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px; color:#77766f; font-size:11px; letter-spacing:.1em; text-transform:uppercase; }
        .np-piano-hud span:last-child { text-align:right; }
        .np-piano-hud strong { display:block; color:#111317; font-size:18px; letter-spacing:0; font-variant-numeric:tabular-nums; }
        .np-piano-board { display:block; width:min(100%,460px,calc((100dvh - 270px) * .6154)); height:auto; aspect-ratio:8/13; background:#e5e2da; border:1px solid #c8c2b5; border-radius:5px; touch-action:manipulation; }
        .np-piano-controls { width:min(100%,460px); display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .np-piano-controls button { min-height:42px; border:1px solid #c6c0b4; border-radius:5px; background:#f3f0e8; color:#242529; font:700 12px Calibri,Inter,sans-serif; }
        .np-piano-controls button:active { background:#e7d19b; }
        .np-piano-controls button:focus-visible { outline:3px solid #c89942; outline-offset:2px; }
        .np-piano-status { min-height:16px; margin:0; color:#74716a; text-align:center; font-size:12px; }
        @media(max-width:700px) { .np-piano-board { width:min(100%,460px,calc((100dvh - 240px) * .6154)); } }
        @media(max-width:560px) { .np-piano-shell { gap:6px; } .np-piano-hud { font-size:10px; } .np-piano-hud strong { font-size:16px; } .np-piano-controls { gap:6px; } }
        @media(prefers-reduced-motion:reduce) { .np-piano-controls button { transition:none; } }
      </style>
      <section class="np-piano-shell" aria-label="Piano Tiles, chế độ 50 phím cổ điển">
        <div class="np-piano-hud"><span>Điểm <strong id="ptScore">0/50</strong></span><span>Thời gian <strong id="ptTime">0.0</strong></span><span>Tốt nhất <strong id="ptBest">0</strong></span></div>
        <canvas id="ptCanvas" class="np-piano-board" width="480" height="780" tabindex="0" aria-label="Chạm phím đen. Chạm phím trắng hoặc để phím đen rơi qua đáy sẽ kết thúc lượt chơi."></canvas>
        <div class="np-piano-controls"><button type="button" id="ptPause" aria-label="Tạm dừng">DỪNG</button><button type="button" id="ptRestart" aria-label="Chơi lại">LẠI</button></div>
        <p id="ptStatus" class="np-piano-status" role="status" aria-live="polite">Chạm phím đen · bàn phím D F J K</p>
      </section>`;
    const canvas = container.querySelector('#ptCanvas'), ctx = canvas.getContext('2d');
    const scoreEl = container.querySelector('#ptScore'), timeEl = container.querySelector('#ptTime');
    const bestEl = container.querySelector('#ptBest'), status = container.querySelector('#ptStatus');
    const pauseButton = container.querySelector('#ptPause');
    const keyLanes = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
    const tones = [261.63, 293.66, 349.23, 392.0];

    function saveRecord() {
      let changed = false;
      if (state.score > bestScore) { bestScore = state.score; changed = true; }
      if (state.phase === 'won' && (!fastest || state.elapsed < fastest)) { fastest = state.elapsed; changed = true; }
      if (changed) { try { localStorage.setItem(recordKey, JSON.stringify({ score: bestScore, fastest })); } catch (error) {} }
    }
    function reset() {
      state = createPianoTilesState((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
      paused = false; announcedEvent = null; lastFrame = 0;
      pauseButton.textContent = 'DỪNG';
      status.textContent = 'Chạm phím đen · bàn phím D F J K';
      updateHud(); draw();
    }
    function updateHud() {
      scoreEl.textContent = state.score + '/' + PIANO_TILES.total;
      timeEl.textContent = state.elapsed.toFixed(1);
      bestEl.textContent = fastest ? fastest.toFixed(1) + 's' : String(bestScore);
    }
    function draw() {
      const cellWidth = PIANO_TILES.width / PIANO_TILES.columns;
      ctx.fillStyle = '#d9d5cc'; ctx.fillRect(0, 0, PIANO_TILES.width, PIANO_TILES.height);
      for (const row of state.rows) {
        if (row.y < -PIANO_TILES.cellHeight || row.y > PIANO_TILES.height) continue;
        for (let lane = 0; lane < PIANO_TILES.columns; lane++) {
          const x = lane * cellWidth, y = row.y;
          ctx.fillStyle = lane === row.lane ? '#111317' : '#faf8f2';
          ctx.fillRect(x + 1, y + 1, cellWidth - 2, PIANO_TILES.cellHeight - 2);
          if (lane === row.lane) {
            ctx.fillStyle = 'rgba(255,255,255,.08)';
            ctx.fillRect(x + 5, y + 5, cellWidth - 10, 3);
          } else {
            ctx.strokeStyle = '#d6d1c6'; ctx.lineWidth = 1;
            ctx.strokeRect(x + 1.5, y + 1.5, cellWidth - 3, PIANO_TILES.cellHeight - 3);
          }
        }
      }
      ctx.strokeStyle = '#c4bdaF'; ctx.lineWidth = 2;
      for (let col = 1; col < PIANO_TILES.columns; col++) ctx.beginPath(), ctx.moveTo(col * cellWidth, 0), ctx.lineTo(col * cellWidth, PIANO_TILES.height), ctx.stroke();
      if (state.phase === 'ready') {
        ctx.fillStyle = 'rgba(250,248,242,.9)'; ctx.fillRect(52, PIANO_TILES.height / 2 - 39, PIANO_TILES.width - 104, 78);
        ctx.fillStyle = '#15171a'; ctx.textAlign = 'center'; ctx.font = '700 24px Calibri, sans-serif'; ctx.fillText('CHẠM PHÍM ĐEN', PIANO_TILES.width / 2, PIANO_TILES.height / 2 + 8);
      } else if (state.phase === 'over' || state.phase === 'won' || paused) {
        ctx.fillStyle = 'rgba(250,248,242,.92)'; ctx.fillRect(52, PIANO_TILES.height / 2 - 62, PIANO_TILES.width - 104, 124);
        ctx.fillStyle = state.phase === 'over' ? '#a8443e' : '#15171a'; ctx.textAlign = 'center';
        ctx.font = '700 27px Calibri, sans-serif';
        ctx.fillText(paused ? 'TẠM DỪNG' : state.phase === 'won' ? 'HOÀN THÀNH' : state.reason === 'missed' ? 'BỎ LỠ PHÍM' : 'CHẠM PHÍM TRẮNG', PIANO_TILES.width / 2, PIANO_TILES.height / 2 - 7);
        ctx.fillStyle = '#65615b'; ctx.font = '15px Calibri, sans-serif';
        ctx.fillText(state.phase === 'won' ? '50 phím · ' + state.elapsed.toFixed(2) + ' giây' : paused ? 'Tiếp tục hoặc chơi lại' : state.phase === 'over' ? state.score + ' / 50 · nhấn LẠI để tiếp tục' : 'Tiếp tục chạm phím đen', PIANO_TILES.width / 2, PIANO_TILES.height / 2 + 23);
      }
    }
    function playLane(lane, tileId = null) {
      if (paused || !['ready', 'playing'].includes(state.phase)) return;
      if (tileId === null) {
        const matching = state.rows.filter(row => row.lane === lane && row.y >= 0 && row.y < PIANO_TILES.height - PIANO_TILES.cellHeight);
        const target = matching.sort((a, b) => b.y - a.y)[0];
        tileId = target ? target.id : -1;
      }
      const before = state.phase;
      const correct = pianoTap(state, tileId, lane);
      if (correct) {
        if (window.NP_Audio?.tone) window.NP_Audio.tone(tones[lane], 'sine', 0.14, 0.1);
        status.textContent = state.phase === 'won' ? '50 phím · ' + state.elapsed.toFixed(2) + ' giây' : 'Tiếp tục · phím đen ' + (state.score + 1) + ' / 50';
      } else if (before !== state.phase && state.phase === 'over') {
        status.textContent = state.reason === 'white' ? 'Phím trắng · lượt chơi kết thúc' : 'Lượt chơi kết thúc';
      }
      saveRecord(); updateHud(); draw();
    }
    function pointerTap(event) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width) * PIANO_TILES.width;
      const y = (event.clientY - rect.top) / Math.max(1, rect.height) * PIANO_TILES.height;
      const lane = Math.max(0, Math.min(PIANO_TILES.columns - 1, Math.floor(x / (PIANO_TILES.width / PIANO_TILES.columns))));
      const row = state.rows.find(item => y >= item.y && y < item.y + PIANO_TILES.cellHeight);
      playLane(lane, row ? row.id : -1);
    }
    function togglePause() {
      if (!['ready', 'playing'].includes(state.phase)) return;
      paused = !paused; pauseButton.textContent = paused ? 'TIẾP' : 'DỪNG';
      status.textContent = paused ? 'Tạm dừng' : state.phase === 'ready' ? 'Chạm phím đen · bàn phím D F J K' : 'Tiếp tục · phím đen ' + (state.score + 1) + ' / 50';
      draw();
    }
    listen(canvas, 'pointerdown', pointerTap);
    listen(window, 'keydown', event => {
      if (event.code === 'Escape') { event.preventDefault(); togglePause(); return; }
      if ((event.code === 'Enter' || event.code === 'Space') && ['over', 'won'].includes(state.phase)) { event.preventDefault(); reset(); return; }
      if (event.repeat) return;
      if (Object.prototype.hasOwnProperty.call(keyLanes, event.code)) { event.preventDefault(); playLane(keyLanes[event.code]); }
    });
    listen(pauseButton, 'click', togglePause);
    listen(container.querySelector('#ptRestart'), 'click', reset);
    function frame(timestamp) {
      const dt = lastFrame ? Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000)) : 1 / 60;
      lastFrame = timestamp;
      if (!paused) pianoTick(state, dt);
      if (state.lastEvent && state.lastEvent !== announcedEvent) {
        announcedEvent = state.lastEvent;
        if (state.lastEvent.type === 'mistake') {
          status.textContent = state.lastEvent.reason === 'missed' ? 'Một phím rơi khỏi bàn · lượt chơi kết thúc' : 'Phím trắng · lượt chơi kết thúc';
          if (window.NP_Audio?.alarm) window.NP_Audio.alarm();
        }
        if (state.lastEvent.type === 'complete') { status.textContent = 'Hoàn thành 50 phím · ' + state.elapsed.toFixed(2) + ' giây'; if (window.NP_Audio?.win) window.NP_Audio.win(); }
      }
      saveRecord(); updateHud(); draw();
      raf = session.requestAnimationFrame(frame);
    }
    updateHud(); draw(); raf = session.requestAnimationFrame(frame);
    session.onCleanup(() => { if (raf !== null) session.cancelAnimationFrame(raf); saveRecord(); });
  }

  function launchGalaga(container, game) {
    const session = window.NP_GameSession.start();
    const { listen } = session;
    const storageKey = 'np_galaga_record_v1';
    const state = createGalagaState((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    const keys = { left: false, right: false, fire: false };
    const pointers = new Map();
    let best = 0, raf = null, lastFrame = 0, paused = false, pointerX = null, announcedEvent = null;
    try { best = Math.max(0, Number(JSON.parse(localStorage.getItem(storageKey) || '{}').score) || 0); } catch (error) {}
    container.innerHTML = `
      <style>
        #gameModal:has(.np-galaga-shell) .modal-window { width:min(98vw,720px); max-width:720px; min-width:0; }
        #gameModal:has(.np-galaga-shell) .modal-body,#gameModal:has(.np-galaga-shell) .modal-title-group { min-width:0; }
        .np-galaga-shell { width:min(100%,660px); margin:auto; display:grid; justify-items:center; gap:8px; color:#dce8f0; font-family:Calibri,Inter,sans-serif; }
        .np-galaga-hud { width:min(100%,500px); display:grid; grid-template-columns:1fr auto auto 1fr; align-items:center; gap:8px; color:#55717c; font-size:12px; letter-spacing:.08em; text-transform:uppercase; }
        .np-galaga-hud span:last-child { text-align:right; }
        .np-galaga-hud strong { color:#122c3d; font-size:16px; letter-spacing:0; }
        .np-galaga-board { display:block; width:min(100%,470px); height:auto; max-height:68vh; aspect-ratio:10/13; border:1px solid #496477; border-radius:5px; background:#06121e; touch-action:none; }
        .np-galaga-controls { width:min(100%,500px); display:grid; grid-template-columns:repeat(5,minmax(44px,1fr)); gap:6px; }
        .np-galaga-controls button { min-width:44px; min-height:46px; border:1px solid #31536a; border-radius:7px; background:#10293a; color:#e3edf0; font:700 12px Calibri,Inter,sans-serif; touch-action:none; user-select:none; }
        .np-galaga-controls button[data-galaga-control="fire"] { color:#071421; background:#e9bb61; border-color:#f3d58c; }
        .np-galaga-controls button:active { transform:translateY(2px); }
        .np-galaga-status { min-height:18px; margin:0; color:#81949c; text-align:center; font-size:12px; }
        @media(max-width:560px) { .np-galaga-shell { gap:6px; } .np-galaga-hud { font-size:10px; } .np-galaga-hud strong { font-size:14px; } .np-galaga-controls { gap:4px; } .np-galaga-controls button { padding:2px; font-size:11px; } }
        @media(prefers-reduced-motion:reduce) { .np-galaga-controls button { transition:none; } }
      </style>
      <section class="np-galaga-shell" aria-label="Phi đội Galaga">
        <div class="np-galaga-hud"><span>Điểm <strong id="gaScore">0</strong></span><span>Đợt <strong id="gaStage">1</strong></span><span>Tàu <strong id="gaLives">3</strong></span><span>Kỷ lục <strong id="gaBest">0</strong></span></div>
        <canvas id="gaCanvas" class="np-galaga-board" width="600" height="780" tabindex="0" aria-label="Di chuyển ngang, bắn tối đa hai đạn, giải cứu tàu bị Boss Galaga bắt để tăng hỏa lực."></canvas>
        <div class="np-galaga-controls" aria-label="Điều khiển phi thuyền">
          <button type="button" data-galaga-control="left" aria-label="Di chuyển trái">←</button><button type="button" data-galaga-control="fire" aria-label="Bắn liên tục">BẮN</button><button type="button" data-galaga-control="right" aria-label="Di chuyển phải">→</button><button type="button" id="gaPause" aria-label="Tạm dừng">DỪNG</button><button type="button" id="gaRestart" aria-label="Chơi lại">LẠI</button>
        </div>
        <p id="gaStatus" class="np-galaga-status" role="status" aria-live="polite">← → di chuyển · Space bắn · chạm/kéo để lái</p>
      </section>`;

    const canvas = container.querySelector('#gaCanvas'), ctx = canvas.getContext('2d');
    const scoreEl = container.querySelector('#gaScore'), stageEl = container.querySelector('#gaStage'), livesEl = container.querySelector('#gaLives'), bestEl = container.querySelector('#gaBest'), status = container.querySelector('#gaStatus');
    const pauseButton = container.querySelector('#gaPause');
    const setRecord = () => {
      if (state.score <= best) return;
      best = state.score;
      try { localStorage.setItem(storageKey, JSON.stringify({ score: best })); } catch (error) {}
    };
    function syncHeld() {
      const down = [...pointers.values()];
      state.input = { left: keys.left || down.includes('left'), right: keys.right || down.includes('right'),
        fire: keys.fire || down.includes('fire') || down.includes('board'), pointerX: pointerX === null ? undefined : pointerX };
    }
    function eventPoint(event) {
      const rect = canvas.getBoundingClientRect();
      pointerX = Math.max(22, Math.min(GALAGA.width - 22, (event.clientX - rect.left) / Math.max(1, rect.width) * GALAGA.width));
    }
    listen(canvas, 'pointerdown', event => { event.preventDefault(); canvas.setPointerCapture?.(event.pointerId); pointers.set(event.pointerId, 'board'); eventPoint(event); syncHeld(); });
    listen(canvas, 'pointermove', event => { if (pointers.get(event.pointerId) === 'board') { event.preventDefault(); eventPoint(event); syncHeld(); } });
    const releasePointer = event => {
      if (!pointers.has(event.pointerId)) return;
      const wasBoard = pointers.get(event.pointerId) === 'board';
      pointers.delete(event.pointerId);
      if (wasBoard && ![...pointers.values()].includes('board')) pointerX = null;
      syncHeld();
    };
    listen(canvas, 'pointerup', releasePointer); listen(canvas, 'pointercancel', releasePointer); listen(canvas, 'lostpointercapture', releasePointer);
    container.querySelectorAll('[data-galaga-control]').forEach(button => {
      const name = button.dataset.galagaControl;
      listen(button, 'pointerdown', event => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); pointers.set(event.pointerId, name); syncHeld(); });
      listen(button, 'pointerup', releasePointer); listen(button, 'pointercancel', releasePointer); listen(button, 'lostpointercapture', releasePointer);
    });
    const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fire' };
    listen(window, 'keydown', event => {
      if (event.code === 'Escape') { event.preventDefault(); togglePause(); return; }
      const action = keyMap[event.code];
      if (action) { event.preventDefault(); keys[action] = true; syncHeld(); }
      if (event.code === 'Enter' && state.phase === 'over') { event.preventDefault(); reset(); }
    });
    listen(window, 'keyup', event => { const action = keyMap[event.code]; if (action) { event.preventDefault(); keys[action] = false; syncHeld(); } });
    listen(window, 'blur', () => { for (const key of Object.keys(keys)) keys[key] = false; pointers.clear(); pointerX = null; syncHeld(); });

    function drawFighter(x, y) {
      ctx.save(); ctx.translate(x, y); ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(9, -2); ctx.lineTo(21, 8); ctx.lineTo(18, 12); ctx.lineTo(5, 8); ctx.lineTo(0, 15);
      ctx.lineTo(-5, 8); ctx.lineTo(-18, 12); ctx.lineTo(-21, 8); ctx.lineTo(-9, -2); ctx.closePath();
      ctx.fillStyle = '#62d4df'; ctx.fill(); ctx.strokeStyle = '#d7f4ea'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(3, 1); ctx.lineTo(-3, 1); ctx.closePath(); ctx.fillStyle = '#f2cd76'; ctx.fill(); ctx.restore();
    }
    function drawEnemy(enemy) {
      const colors = { boss: '#ed7898', guard: '#edbd67', grunt: '#72d4bc' };
      ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(enemy.mode === 'diving' ? Math.sin(enemy.modeTime * 4 + enemy.phase) * 0.28 : 0);
      ctx.fillStyle = colors[enemy.type]; ctx.strokeStyle = '#f1ecd7'; ctx.lineWidth = 1.3; ctx.beginPath();
      if (enemy.type === 'boss') {
        ctx.moveTo(0, 13); ctx.lineTo(-8, 7); ctx.lineTo(-18, 10); ctx.lineTo(-20, 3); ctx.lineTo(-12, -5); ctx.lineTo(-7, -10); ctx.lineTo(0, -6); ctx.lineTo(7, -10); ctx.lineTo(12, -5); ctx.lineTo(20, 3); ctx.lineTo(18, 10); ctx.lineTo(8, 7); ctx.closePath();
      } else if (enemy.type === 'guard') {
        ctx.moveTo(0, 11); ctx.lineTo(-7, 6); ctx.lineTo(-17, 10); ctx.lineTo(-13, 0); ctx.lineTo(-9, -8); ctx.lineTo(0, -5); ctx.lineTo(9, -8); ctx.lineTo(13, 0); ctx.lineTo(17, 10); ctx.lineTo(7, 6); ctx.closePath();
      } else {
        ctx.moveTo(0, 10); ctx.lineTo(-6, 5); ctx.lineTo(-13, 9); ctx.lineTo(-10, 0); ctx.lineTo(-7, -7); ctx.lineTo(0, -3); ctx.lineTo(7, -7); ctx.lineTo(10, 0); ctx.lineTo(13, 9); ctx.lineTo(6, 5); ctx.closePath();
      }
      ctx.fill(); ctx.stroke(); ctx.fillStyle = '#102a40'; ctx.fillRect(-4, -1, 2, 3); ctx.fillRect(2, -1, 2, 3);
      if (enemy.carrying) { ctx.strokeStyle = '#f6dc91'; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 22); ctx.stroke(); ctx.fillStyle = '#62d4df'; ctx.fillRect(-3, 19, 6, 4); }
      if (enemy.beamTime > 0) { ctx.strokeStyle = 'rgba(245,219,132,.58)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(state.player.x - enemy.x, state.player.y - enemy.y); ctx.stroke(); }
      ctx.restore();
    }
    function draw() {
      ctx.fillStyle = '#06121e'; ctx.fillRect(0, 0, GALAGA.width, GALAGA.height);
      for (let i = 0; i < 72; i++) { const x = (i * 157 + 29) % GALAGA.width, y = (i * 89 + 17) % GALAGA.height; ctx.fillStyle = i % 8 === 0 ? 'rgba(242,205,118,.8)' : 'rgba(179,218,228,.38)'; ctx.fillRect(x, y, i % 8 === 0 ? 2 : 1, i % 8 === 0 ? 2 : 1); }
      ctx.fillStyle = 'rgba(53,111,135,.12)'; ctx.fillRect(26, 38, GALAGA.width - 52, GALAGA.height - 76); ctx.strokeStyle = 'rgba(102,160,176,.16)'; ctx.strokeRect(26, 38, GALAGA.width - 52, GALAGA.height - 76);
      for (const enemy of state.enemies) if (enemy.mode !== 'escaped') drawEnemy(enemy);
      ctx.fillStyle = '#f7d982'; for (const shot of state.shots) ctx.fillRect(shot.x - 2, shot.y - 8, 4, 13);
      ctx.fillStyle = '#ff8d82'; for (const shot of state.enemyShots) { ctx.beginPath(); ctx.ellipse(shot.x, shot.y, 3.2, 5.5, 0, 0, Math.PI * 2); ctx.fill(); }
      if (state.lives > 0 && !(state.invulnerable > 0 && Math.floor(state.elapsed * 12) % 2 === 0)) {
        if (state.dual) { drawFighter(state.player.x - 13, state.player.y); drawFighter(state.player.x + 13, state.player.y); }
        else drawFighter(state.player.x, state.player.y);
      }
      ctx.textAlign = 'center';
      if (state.phase === 'entry') { ctx.fillStyle = '#e8d28e'; ctx.font = '600 18px Calibri,sans-serif'; ctx.fillText(state.waveMode === 'challenge' ? 'ĐỢT THỬ THÁCH' : 'PHI ĐỘI ĐANG TIẾN VÀO', GALAGA.width / 2, 48); }
      if (state.phase === 'challenge') { ctx.fillStyle = '#e8d28e'; ctx.font = '600 15px Calibri,sans-serif'; ctx.fillText('ĐỢT THỬ THÁCH · HẠ CÀNG NHIỀU CÀNG TỐT', GALAGA.width / 2, 48); }
      if (state.phase === 'cleared') { ctx.fillStyle = '#f1dda2'; ctx.font = '700 25px Calibri,sans-serif'; ctx.fillText('ĐÃ DỌN SẠCH PHI ĐỘI', GALAGA.width / 2, GALAGA.height / 2); }
      if (state.phase === 'over') { ctx.fillStyle = '#ffb0a2'; ctx.font = '700 30px Calibri,sans-serif'; ctx.fillText('HẾT PHI THUYỀN', GALAGA.width / 2, GALAGA.height / 2 - 12); ctx.font = '15px Calibri,sans-serif'; ctx.fillStyle = '#aac2ca'; ctx.fillText('Nhấn Enter hoặc LẠI để chơi tiếp', GALAGA.width / 2, GALAGA.height / 2 + 23); }
      if (paused) { ctx.fillStyle = 'rgba(2,10,17,.74)'; ctx.fillRect(0, 0, GALAGA.width, GALAGA.height); ctx.fillStyle = '#e6f3e8'; ctx.font = '700 31px Calibri,sans-serif'; ctx.fillText('TẠM DỪNG', GALAGA.width / 2, GALAGA.height / 2); }
    }
    function updateHud() { scoreEl.textContent = String(state.score); stageEl.textContent = String(state.stage); livesEl.textContent = String(state.lives) + (state.dual ? ' · ĐÔI' : ''); bestEl.textContent = String(best); }
    function reset() {
      Object.assign(state, createGalagaState((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0));
      for (const key of Object.keys(keys)) keys[key] = false;
      pointers.clear(); pointerX = null; paused = false; announcedEvent = null; pauseButton.textContent = 'DỪNG';
      status.textContent = '← → di chuyển · Space bắn · chạm/kéo để lái'; syncHeld(); updateHud();
    }
    const togglePause = () => { if (state.phase === 'over') return; paused = !paused; for (const key of Object.keys(keys)) keys[key] = false; pointers.clear(); pointerX = null; syncHeld(); pauseButton.textContent = paused ? 'TIẾP' : 'DỪNG'; status.textContent = paused ? 'Tạm dừng' : '← → di chuyển · Space bắn · chạm/kéo để lái'; };
    listen(container.querySelector('#gaRestart'), 'click', reset); listen(pauseButton, 'click', togglePause);
    function frame(timestamp) {
      const dt = lastFrame ? Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000)) : 1 / 60;
      lastFrame = timestamp;
      const before = state.phase;
      if (!paused) galagaTick(state, state.input || {}, dt);
      setRecord(); updateHud();
      if (state.lastEvent && state.lastEvent !== announcedEvent) {
        announcedEvent = state.lastEvent;
        if (state.lastEvent.type === 'captured') { status.textContent = 'Tàu bị Boss bắt · hạ Boss đang giữ tàu để mở hỏa lực đôi'; if (window.NP_Audio?.alarm) window.NP_Audio.alarm(); }
        if (state.lastEvent.type === 'rescued') { status.textContent = 'Đã giải cứu tàu · hỏa lực đôi, nhưng thân tàu lớn hơn'; if (window.NP_Audio?.powerup) window.NP_Audio.powerup(); }
        if (state.lastEvent.type === 'lost-ship') { status.textContent = state.lives ? 'Mất một phi thuyền · còn ' + state.lives : 'Hết phi thuyền · Enter hoặc LẠI'; if (window.NP_Audio?.alarm) window.NP_Audio.alarm(); }
        if (state.lastEvent.type === 'enemy-hit' && window.NP_Audio?.hit) window.NP_Audio.hit();
        if (state.lastEvent.type === 'challenge-perfect') status.textContent = 'Hoàn hảo · thưởng 1.000 điểm';
        if (state.lastEvent.type === 'wave-clear' || state.lastEvent.type === 'challenge-perfect' || state.lastEvent.type === 'rescued' && state.phase === 'cleared') { if (window.NP_Audio?.win) window.NP_Audio.win(); }
        if (state.lastEvent.type === 'wave-start' && state.stage > 1) status.textContent = 'Đợt ' + state.stage + ' · phi đội mới đang vào vị trí';
      }
      if (before !== 'over' && state.phase === 'over') status.textContent = 'Hết phi thuyền · Enter hoặc LẠI để chơi lại';
      draw(); raf = session.requestAnimationFrame(frame);
    }
    updateHud(); draw(); raf = session.requestAnimationFrame(frame);
    session.onCleanup(() => { if (raf !== null) session.cancelAnimationFrame(raf); for (const key of Object.keys(keys)) keys[key] = false; pointers.clear(); pointerX = null; setRecord(); });
  }

  const descriptions = {
    shooter: 'A/D hoặc phím trái/phải để di chuyển, giữ Space để bắn. Chạm hoặc kéo tàu trên điện thoại.',
    runner: 'Trái/phải đổi làn, Space kích hoạt khiên. Né vật cản, vượt chướng ngại để qua màn.',
    reflex: 'Chạm đúng mục tiêu trước khi hết giờ. Di chuyển tâm ngắm, Space để bắn.',
    puzzle: 'Lật hai ô cùng hình để ghép cặp. Dùng phím trái/phải và Space hoặc chạm thẻ.',
    management: 'Chọn món bằng trái/phải, nhấn Space để phục vụ đúng yêu cầu trước khi khách bỏ đi.',
    quiz: 'Chọn đáp án bằng trái/phải, nhấn Space xác nhận hoặc chạm trực tiếp.',
    duel: 'Chọn Tấn công, Phòng thủ hoặc Hồi phục rồi nhấn Space. Thắng đối thủ để sang vòng tiếp.'
  };

  // Frogger is a lane-crossing game, not the shared three-lane runner below.
  // Keep its rules in a small deterministic model so the renderer stays thin
  // and the arcade loop can be checked without a browser.
  const FROGGER = Object.freeze({
    cols: 11, rows: 11, cellW: 60, cellH: 50,
    width: 660, height: 550, homes: [1, 3, 5, 7, 9],
    timeLimit: 28, maxLives: 5
  });

  function froggerWrap(value, span) {
    return ((value % span) + span) % span;
  }

  function froggerRandom(state) {
    state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
    return state.rng / 0x100000000;
  }

  function froggerLane(state, row) {
    return state.lanes.find(lane => lane.row === row) || null;
  }

  function froggerTimeLimit(stage) {
    return Math.max(18, FROGGER.timeLimit - (stage - 1) * 0.6);
  }

  function froggerContains(lane, x, padding = 0) {
    for (const item of lane.items) {
      for (const shift of [-lane.wrap, 0, lane.wrap]) {
        if (x >= item.x + shift - padding && x <= item.x + shift + item.width + padding) return item;
      }
    }
    return null;
  }

  function createFroggerState(seed = 0x4f1bbcdc) {
    const state = {
      rng: (Number(seed) >>> 0) || 1,
      stage: 1, score: 0, lives: 3, phase: 'playing',
      homes: Array(FROGGER.homes.length).fill(false),
      frog: { x: FROGGER.cellW * 5.5, row: FROGGER.rows - 1 },
      hopAnimation: null,
      highestRow: FROGGER.rows - 1,
      remaining: FROGGER.timeLimit, hopCooldown: 0, invulnerable: 1.45,
      transitionRemaining: 0, lastClearedStage: 0, lastEvent: null,
      nextExtraLife: 10000, elapsed: 0, lanes: []
    };

    const logSpeeds = [-34, 39, -46, 52];
    for (let i = 0; i < 4; i++) {
      const row = i + 1;
      const width = FROGGER.cellW * [2.35, 2.05, 2.55, 2.2][i];
      const count = 3;
      const gap = FROGGER.width / count;
      const items = Array.from({ length: count }, (_, index) => ({
        x: index * gap + (index % 2 ? 14 : -width * 0.35),
        width,
        color: ['#9b6746', '#bb8452', '#a86d47'][index]
      }));
      state.lanes.push({ kind: 'river', row, speed: logSpeeds[i], wrap: FROGGER.width, items });
    }

    const roadSpecs = [
      { speed: 72, widths: [76, 104, 82] },
      { speed: -91, widths: [92, 70, 112] },
      { speed: 108, widths: [106, 74, 92] },
      { speed: -78, widths: [78, 116, 86] }
    ];
    for (let i = 0; i < roadSpecs.length; i++) {
      const row = i + 6;
      const spec = roadSpecs[i];
      const gap = FROGGER.width / spec.widths.length;
      const items = spec.widths.map((width, index) => ({
        x: index * gap + (index % 2 ? 16 : -width * 0.4),
        width,
        color: ['#f17663', '#f4cb62', '#60c8bd', '#c68bd7', '#e6eee1'][(row + index) % 5],
        cabin: index % 2 === 0
      }));
      state.lanes.push({ kind: 'road', row, speed: spec.speed, wrap: FROGGER.width, items });
    }
    return state;
  }

  function froggerResetFrog(state) {
    state.frog.x = FROGGER.cellW * 5.5;
    state.frog.row = FROGGER.rows - 1;
    state.highestRow = FROGGER.rows - 1;
    state.remaining = froggerTimeLimit(state.stage);
    state.hopCooldown = 0;
    state.invulnerable = 0.9;
    state.hopAnimation = null;
  }

  function froggerLoseLife(state, reason) {
    if (state.phase !== 'playing') return false;
    state.lives = Math.max(0, state.lives - 1);
    state.lastEvent = { type: 'lost-life', reason, lives: state.lives };
    if (state.lives === 0) {
      state.phase = 'over';
      return true;
    }
    froggerResetFrog(state);
    return true;
  }

  function froggerAward(state, points) {
    state.score += Math.max(0, Math.floor(points));
    let extraLives = 0;
    while (state.score >= state.nextExtraLife) {
      if (state.lives < FROGGER.maxLives) {
        state.lives++;
        extraLives++;
      }
      state.nextExtraLife += 10000;
    }
    return extraLives;
  }

  function froggerHomeAt(x) {
    const column = Math.round(x / FROGGER.cellW - 0.5);
    const index = FROGGER.homes.indexOf(column);
    if (index < 0 || Math.abs(x - FROGGER.cellW * (column + 0.5)) > 17) return -1;
    return index;
  }

  function froggerHop(state, dx, dy) {
    if (state.phase !== 'playing' || state.hopCooldown > 0) return false;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const nextX = state.frog.x + dx * FROGGER.cellW;
    const nextRow = state.frog.row + dy;
    if (nextX < FROGGER.cellW * 0.5 || nextX > FROGGER.width - FROGGER.cellW * 0.5 ||
        nextRow < 0 || nextRow >= FROGGER.rows) return false;

    const fromX = state.frog.x;
    const fromRow = state.frog.row;
    state.hopCooldown = 0.105;
    state.frog.x = nextX;
    state.frog.row = nextRow;

    if (nextRow === 0) {
      const home = froggerHomeAt(nextX);
      if (home < 0 || state.homes[home]) {
        froggerLoseLife(state, home < 0 ? 'Sai ổ' : 'Ổ đã kín');
        return true;
      }
      state.homes[home] = true;
      const extraLives = froggerAward(state, 50 + Math.floor(state.remaining * 5));
      state.lastEvent = { type: 'home', home: home + 1, filled: state.homes.filter(Boolean).length, extraLives };
      if (state.homes.every(Boolean)) {
        state.lastClearedStage = state.stage;
        state.phase = 'stage-clear';
        state.transitionRemaining = 1.15;
        state.lastEvent = { type: 'stage-clear', stage: state.stage, extraLives };
      } else {
        froggerResetFrog(state);
      }
      return true;
    }

    if (nextRow < state.highestRow) {
      state.highestRow = nextRow;
      const extraLives = froggerAward(state, 10);
      state.lastEvent = { type: 'hop', row: nextRow, score: state.score, extraLives };
    }

    if (nextRow >= 1 && nextRow <= 4) {
      const lane = froggerLane(state, nextRow);
      if (!lane || !froggerContains(lane, nextX, 12)) {
        froggerLoseLife(state, 'Rơi xuống nước');
      }
    } else if (nextRow >= 6 && nextRow <= 9 && state.invulnerable <= 0) {
      const lane = froggerLane(state, nextRow);
      if (lane && froggerContains(lane, nextX, 18)) froggerLoseLife(state, 'Va vào xe');
    }
    if (state.phase === 'playing' && state.frog.x === nextX && state.frog.row === nextRow) {
      state.hopAnimation = {
        fromX, fromRow, toX: nextX, toRow: nextRow, elapsed: 0, duration: 0.095
      };
    }
    return true;
  }

  function tickFrogger(state, dt) {
    const seconds = Math.max(0, Number(dt) || 0);
    if (state.phase === 'stage-clear') {
      state.transitionRemaining -= seconds;
      if (state.transitionRemaining <= 0) {
        state.stage++;
        state.homes.fill(false);
        state.phase = 'playing';
        froggerResetFrog(state);
        state.lastEvent = { type: 'stage-start', stage: state.stage };
      }
      return;
    }
    if (state.phase !== 'playing' || !seconds) return;

    state.elapsed += seconds;
    state.hopCooldown = Math.max(0, state.hopCooldown - seconds);
    state.invulnerable = Math.max(0, state.invulnerable - seconds);
    state.remaining -= seconds;
    if (state.hopAnimation) {
      state.hopAnimation.elapsed += seconds;
      if (state.hopAnimation.elapsed >= state.hopAnimation.duration) state.hopAnimation = null;
    }

    const speedScale = 1 + Math.min(20, state.stage - 1) * 0.075;
    for (const lane of state.lanes) {
      const wrap = lane.wrap;
      for (const item of lane.items) {
        item.x = froggerWrap(item.x + lane.speed * speedScale * seconds + item.width * 0.4, wrap) - item.width * 0.4;
      }
    }

    const row = state.frog.row;
    if (row >= 1 && row <= 4) {
      const lane = froggerLane(state, row);
      const platform = lane && froggerContains(lane, state.frog.x, 10);
      if (!platform) {
        froggerLoseLife(state, 'Rơi khỏi bè');
        return;
      }
      state.frog.x += lane.speed * speedScale * seconds;
      if (state.hopAnimation) state.hopAnimation.toX = state.frog.x;
      if (state.frog.x < 10 || state.frog.x > FROGGER.width - 10 ||
          !froggerContains(lane, state.frog.x, 8)) {
        froggerLoseLife(state, 'Trôi khỏi bè');
        return;
      }
    } else if (row >= 6 && row <= 9 && state.invulnerable <= 0) {
      const lane = froggerLane(state, row);
      if (lane && froggerContains(lane, state.frog.x, 17)) {
        froggerLoseLife(state, 'Va vào xe');
        return;
      }
    }

    if (state.remaining <= 0) froggerLoseLife(state, 'Hết giờ');
  }

  const QUESTIONS = [
    ['Số tiếp theo của dãy 2, 4, 8, 16 là?', ['20', '24', '32', '36'], 2],
    ['Một giờ có bao nhiêu giây?', ['600', '1800', '3600', '6000'], 2],
    ['Hình vuông có bao nhiêu cạnh?', ['3', '4', '5', '6'], 1],
    ['12 chia 3 bằng bao nhiêu?', ['3', '4', '6', '9'], 1],
    ['Trong bảng chữ cái, chữ nào đứng sau M?', ['N', 'O', 'L', 'P'], 0],
    ['Đơn vị dùng để đo nhiệt độ là gì?', ['Mét', 'Giây', 'Độ C', 'Kilôgam'], 2],
    ['Một tá tương đương bao nhiêu vật?', ['6', '10', '12', '20'], 2],
    ['Tam giác có tổng số đo ba góc bằng?', ['90 độ', '120 độ', '180 độ', '360 độ'], 2],
    ['Hành tinh nào gần Mặt Trời nhất?', ['Sao Thủy', 'Sao Mộc', 'Trái Đất', 'Sao Hải Vương'], 0],
    ['Từ nào là từ chỉ màu sắc?', ['Chiều cao', 'Xanh', 'Nhanh', 'Chạy'], 1],
    ['Số nguyên tố nhỏ nhất là?', ['0', '1', '2', '4'], 2],
    ['Một tuần có bao nhiêu ngày?', ['5', '6', '7', '8'], 2],
    ['10% của 200 bằng?', ['2', '10', '20', '40'], 2],
    ['Nước đóng băng ở bao nhiêu độ C tại áp suất chuẩn?', ['0', '10', '50', '100'], 0],
    ['Con vật nào thuộc lớp thú?', ['Cá vàng', 'Ếch', 'Cá heo', 'Chim sẻ'], 2],
    ['Vật nào dùng để xem phương hướng?', ['Nhiệt kế', 'La bàn', 'Thước kẻ', 'Đồng hồ'], 1],
    ['Một phần tư của 100 là?', ['20', '25', '40', '50'], 1],
    ['Số nào là số chẵn?', ['17', '21', '30', '35'], 2],
    ['Sắp xếp 3, 1, 2 tăng dần là?', ['3, 2, 1', '1, 2, 3', '2, 1, 3', '1, 3, 2'], 1],
    ['Việt Nam nằm ở châu lục nào?', ['Châu Á', 'Châu Âu', 'Châu Phi', 'Châu Mỹ'], 0]
  ];

  function launchFrogger(container, game) {
    const session = window.NP_GameSession.start();
    const { listen } = session;
    const model = {
      create: createFroggerState,
      hop: froggerHop,
      tick: tickFrogger,
      constants: FROGGER
    };
    const gameId = String(game.id || 'frogger-ech-bang-qua-duong');
    const storeKey = 'np_frogger_record_v1_' + gameId.replace(/[^a-z0-9_-]/gi, '');
    const state = model.create((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    let bestScore = 0;
    let bestStage = 1;
    let frameId = null;
    let lastFrame = 0;
    const pointers = new Map();

    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || '{}');
      bestScore = Math.max(0, Number(saved.score) || 0);
      bestStage = Math.max(1, Number(saved.stage) || 1);
    } catch (error) { /* local storage may be disabled or contain old data */ }

    container.innerHTML = `
      <style>
        #gameModal:has(.np-frogger-shell) .modal-window { width:min(98vw,900px); max-width:900px; min-width:0; }
        #gameModal:has(.np-frogger-shell) .modal-header,
        #gameModal:has(.np-frogger-shell) .modal-title-group,
        #gameModal:has(.np-frogger-shell) .modal-body { min-width:0; }
        #gameModal:has(.np-frogger-shell) .modal-game-title { white-space:normal; overflow-wrap:anywhere; }
        @media(max-width:700px) {
          #gameModal:has(.np-frogger-shell) .modal-window { width:100vw; max-width:100vw; min-width:0; }
          #gameModal:has(.np-frogger-shell) .modal-header { gap:6px; }
          #gameModal:has(.np-frogger-shell) .modal-header-actions { flex:0 0 auto; }
          #gameModal:has(.np-frogger-shell) .modal-title-group { flex:1 1 auto; }
          #gameModal:has(.np-frogger-shell) .modal-game-title { font-size:clamp(15px,4.2vw,21px); }
        }
        .np-frogger-shell { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; max-width:780px; min-width:0; margin:0 auto; color:#f4f6e8; font-family:Calibri,Inter,-apple-system,sans-serif; }
        .np-frogger-hud { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; width:100%; }
        .np-frogger-stat { min-width:0; padding:7px 10px; border:1px solid rgba(235,248,215,.16); border-radius:9px; background:#20392f; text-align:center; color:#b8d4b4; font-size:12px; letter-spacing:.035em; }
        .np-frogger-stat strong { display:block; color:#fff8d5; font-size:17px; line-height:1.15; font-weight:800; }
        .np-frogger-time { display:flex; align-items:center; gap:9px; width:100%; color:#d4e1c5; font-size:12px; }
        .np-frogger-time-track { flex:1; height:7px; overflow:hidden; border-radius:999px; background:#243c40; }
        .np-frogger-time-fill { width:100%; height:100%; border-radius:inherit; background:#c4dd64; transition:width .12s linear; }
        .np-frogger-board { display:block; width:min(100%,780px); max-width:100%; height:auto; aspect-ratio:6/5; border:2px solid #c7df9a; border-radius:12px; background:#24734e; box-shadow:0 12px 32px rgba(8,27,20,.24); touch-action:none; }
        .np-frogger-controls { display:grid; grid-template-columns:repeat(6,minmax(44px,1fr)); gap:6px; width:min(100%,432px); }
        .np-frogger-controls button { min-width:44px; min-height:48px; padding:4px; border:1px solid #a7c774; border-radius:12px; background:#f0f2d8; color:#234433; font:700 24px/1 Calibri,Inter,sans-serif; box-shadow:0 3px 0 #a2b96f; touch-action:manipulation; }
        .np-frogger-controls button:active { transform:translateY(2px); box-shadow:0 1px 0 #a2b96f; }
        .np-frogger-controls button:focus-visible { outline:3px solid #efa85a; outline-offset:2px; }
        .np-frogger-status { min-height:20px; margin:0; color:#476a4d; font-size:13px; text-align:center; }
        .np-frogger-sr { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }
        @media(max-width:520px) { .np-frogger-hud { gap:4px; } .np-frogger-stat { padding:6px 3px; font-size:11px; } .np-frogger-stat strong { font-size:15px; } .np-frogger-controls { gap:5px; } }
        @media(prefers-reduced-motion:reduce) { .np-frogger-time-fill,.np-frogger-controls button { transition:none; } }
      </style>
      <section class="np-frogger-shell" aria-label="Chú Ếch Sang Sông">
        <div class="np-frogger-hud" aria-label="Trạng thái ván chơi">
          <div class="np-frogger-stat">Màn<strong id="arcLevel">1</strong></div>
          <div class="np-frogger-stat">Điểm<strong id="arcScore">0</strong><span id="arcBest" class="np-frogger-sr"></span></div>
          <div class="np-frogger-stat">Mạng<strong id="arcLives">3</strong></div>
          <div class="np-frogger-stat">Ổ<strong id="arcProgress">0/5</strong></div>
        </div>
        <div class="np-frogger-time"><span>Giờ</span><div class="np-frogger-time-track" id="froggerTimeTrack" role="progressbar" aria-label="Thời gian còn lại" aria-valuemin="0" aria-valuemax="28" aria-valuenow="28"><div class="np-frogger-time-fill" id="froggerTimeFill"></div></div><strong id="froggerTime">28s</strong></div>
        <canvas class="np-frogger-board" id="arcCanvas" width="660" height="550" tabindex="0" aria-label="Bàn chơi Frogger: đi lên từng ô, tránh xe, cưỡi bè qua sông và đưa ếch vào năm ổ trên cùng."></canvas>
        <div class="np-frogger-controls" aria-label="Điều khiển">
          <button type="button" data-hop="left" aria-label="Nhảy sang trái">←</button>
          <button type="button" data-hop="up" aria-label="Nhảy lên">↑</button>
          <button type="button" data-hop="down" aria-label="Nhảy xuống">↓</button>
          <button type="button" data-hop="right" aria-label="Nhảy sang phải">→</button>
          <button type="button" id="arcPause" aria-label="Tạm dừng">Ⅱ</button>
          <button type="button" id="arcRestart" aria-label="Chơi lại">↻</button>
        </div>
        <p class="np-frogger-status" id="froggerStatus" role="status" aria-live="polite">Né xe, nhảy lên bè, lấp năm ổ.</p>
        <span class="np-frogger-sr" id="arcHelp">Dùng phím mũi tên hoặc W A S D để nhảy một ô. Trên màn hình cảm ứng, vuốt để đổi hướng hoặc dùng các nút điều khiển. Mỗi lượt có thời hạn; tránh xe và đứng trên bè khi qua sông.</span>
      </section>`;

    const canvas = container.querySelector('#arcCanvas');
    const ctx = canvas.getContext('2d');
    const status = container.querySelector('#froggerStatus');
    const timeTrack = container.querySelector('#froggerTimeTrack');
    const timeFill = container.querySelector('#froggerTimeFill');
    const setText = (selector, value) => {
      const element = container.querySelector(selector);
      const next = String(value);
      if (element && element.textContent !== next) element.textContent = next;
    };
    canvas.style.touchAction = 'none';

    function persist() {
      const nextScore = Math.max(bestScore, state.score);
      const nextStage = Math.max(bestStage, state.stage);
      if (nextScore === bestScore && nextStage === bestStage) return;
      bestScore = nextScore;
      bestStage = nextStage;
      try { localStorage.setItem(storeKey, JSON.stringify({ score: bestScore, stage: bestStage })); }
      catch (error) { /* score chase remains playable in private browsing */ }
    }

    function sound(name) {
      if (window.NP_Audio && typeof window.NP_Audio[name] === 'function') window.NP_Audio[name]();
    }

    function announce(event) {
      if (!event) return;
      if (event.type === 'lost-life') {
        status.textContent = event.lives ? event.reason + ' · còn ' + event.lives + ' mạng' : event.reason + ' · hết mạng';
        sound('alarm');
        if (window.NP_Juice) window.NP_Juice.vibrate([25, 35, 35]);
      } else if (event.type === 'hop') {
        sound('pop');
      } else if (event.type === 'home') {
        status.textContent = 'Về ổ ' + event.home + ' · ' + event.filled + '/5';
        sound('coin');
        if (window.NP_Juice) window.NP_Juice.vibrate(14);
      } else if (event.type === 'stage-clear') {
        status.textContent = 'Qua màn ' + event.stage + ' · xe chạy nhanh hơn';
        sound('win');
        if (window.NP_Juice) window.NP_Juice.vibrate([20, 30, 20]);
      } else if (event.type === 'stage-start') {
        status.textContent = 'Màn ' + event.stage;
      }
      if (event.extraLives > 0) {
        status.textContent = 'Thêm ' + event.extraLives + ' mạng';
        sound('powerup');
      }
    }

    function updateHud() {
      setText('#arcLevel', state.stage);
      setText('#arcScore', state.score);
      setText('#arcLives', state.lives);
      let filledHomes = 0;
      for (const filled of state.homes) if (filled) filledHomes++;
      setText('#arcProgress', filledHomes + '/5');
      setText('#froggerTime', Math.ceil(state.remaining) + 's');
      setText('#arcBest', 'Kỷ lục ' + bestScore + ' · màn ' + bestStage);
      const stageTime = froggerTimeLimit(state.stage);
      const percent = Math.max(0, Math.min(100, state.remaining / stageTime * 100));
      timeFill.style.width = percent + '%';
      timeTrack.setAttribute('aria-valuemax', String(Math.ceil(stageTime)));
      timeTrack.setAttribute('aria-valuenow', String(Math.max(0, Math.ceil(state.remaining))));
      const pause = container.querySelector('#arcPause');
      if (pause) pause.setAttribute('aria-label', state.phase === 'paused' ? 'Tiếp tục' : 'Tạm dừng');
      if (pause) pause.textContent = state.phase === 'paused' ? '▶' : 'Ⅱ';
    }

    function restart() {
      const fresh = model.create((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
      Object.assign(state, fresh);
      status.textContent = 'Né xe, nhảy lên bè, lấp năm ổ.';
      updateHud();
      canvas.focus({ preventScroll: true });
    }

    function togglePause() {
      if (state.phase === 'over') return;
      if (state.phase === 'paused') {
        state.phase = state.pauseReturnPhase || 'playing';
        state.lastEvent = { type: 'resume' };
        lastFrame = 0;
        status.textContent = 'Tiếp tục.';
      } else if (state.phase === 'playing' || state.phase === 'stage-clear') {
        state.pauseReturnPhase = state.phase;
        state.phase = 'paused';
        status.textContent = 'Đã tạm dừng.';
      }
      updateHud();
    }

    function act(dx, dy) {
      if (state.phase !== 'playing') return;
      const previous = state.lastEvent;
      const moved = model.hop(state, dx, dy);
      if (!moved) return;
      if (state.lastEvent !== previous) announce(state.lastEvent);
      else sound('pop');
      persist();
      updateHud();
      draw();
    }

    function roundRect(x, y, width, height, radius, fill, stroke) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r); ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }

    function ellipse(x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }

    function drawRoad(row) {
      const y = row * FROGGER.cellH;
      ctx.fillStyle = row % 2 ? '#34434a' : '#3b4850';
      ctx.fillRect(0, y, FROGGER.width, FROGGER.cellH);
      ctx.fillStyle = 'rgba(231,218,162,.68)';
      for (let x = 0; x < FROGGER.width; x += 94) ctx.fillRect(x + 13, y + 24, 34, 2);
      ctx.fillStyle = 'rgba(16,29,30,.35)';
      ctx.fillRect(0, y, FROGGER.width, 1);
    }

    function drawWater(row) {
      const lane = froggerLane(state, row);
      const y = row * FROGGER.cellH;
      ctx.fillStyle = row % 2 ? '#177f99' : '#16849b';
      ctx.fillRect(0, y, FROGGER.width, FROGGER.cellH);
      ctx.strokeStyle = 'rgba(158,237,224,.22)';
      ctx.lineWidth = 1.5;
      const drift = state.elapsed * 18 * (lane ? Math.sign(lane.speed) : 1);
      for (let x = -42; x < FROGGER.width + 55; x += 92) {
        const waveX = froggerWrap(x + drift, FROGGER.width + 92) - 46;
        ctx.beginPath(); ctx.moveTo(waveX, y + 13); ctx.quadraticCurveTo(waveX + 16, y + 8, waveX + 34, y + 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(waveX + 38, y + 37); ctx.quadraticCurveTo(waveX + 54, y + 32, waveX + 73, y + 37); ctx.stroke();
      }
    }

    function drawPlatform(lane) {
      const y = lane.row * FROGGER.cellH + 8;
      for (const item of lane.items) {
        for (const shift of [-lane.wrap, 0, lane.wrap]) {
          const x = item.x + shift;
          if (x > FROGGER.width || x + item.width < 0) continue;
          roundRect(x, y + 4, item.width, 31, 13, item.color, '#714d39');
          ctx.strokeStyle = 'rgba(68,45,34,.52)'; ctx.lineWidth = 2;
          for (let mark = 18; mark < item.width - 12; mark += 30) {
            ctx.beginPath(); ctx.moveTo(x + mark, y + 9); ctx.lineTo(x + mark - 3, y + 31); ctx.stroke();
          }
          ellipse(x + 12, y + 20, 4, 8, '#80543c');
          ellipse(x + item.width - 12, y + 20, 4, 8, '#80543c');
        }
      }
    }

    function drawCar(lane, item) {
      const y = lane.row * FROGGER.cellH + 8;
      for (const shift of [-lane.wrap, 0, lane.wrap]) {
        const x = item.x + shift;
        if (x > FROGGER.width || x + item.width < 0) continue;
        roundRect(x + 2, y + 7, item.width - 4, 27, 7, item.color, 'rgba(19,39,42,.7)');
        if (item.cabin) {
          const cabinW = Math.max(22, item.width * 0.39);
          roundRect(x + item.width * 0.32, y + 10, cabinW, 16, 4, '#d8eee1', 'rgba(26,57,54,.35)');
          ctx.fillStyle = 'rgba(22,52,57,.42)';
          ctx.fillRect(x + item.width * 0.32 + cabinW * 0.52, y + 11, 2, 14);
        } else {
          ctx.fillStyle = 'rgba(255,244,204,.75)';
          ctx.fillRect(x + 8, y + 13, 5, 3);
          ctx.fillRect(x + item.width - 13, y + 13, 5, 3);
        }
        ctx.fillStyle = '#1c292d';
        ctx.fillRect(x + 11, y + 29, 13, 6);
        ctx.fillRect(x + item.width - 24, y + 29, 13, 6);
      }
    }

    function drawHome(index) {
      const x = FROGGER.cellW * (FROGGER.homes[index] + 0.5);
      const y = FROGGER.cellH * 0.5;
      ellipse(x, y + 2, 22, 15, state.homes[index] ? '#b8d55c' : '#4a9154');
      ctx.strokeStyle = state.homes[index] ? '#eef6a0' : '#9bcf72';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y + 2, 16, Math.PI * 0.12, Math.PI * 1.82); ctx.stroke();
      if (state.homes[index]) drawFrog(x, y - 2, 0.32, false);
      else {
        ctx.strokeStyle = 'rgba(232,247,177,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x + 2, y - 2); ctx.lineTo(x + 8, y + 4); ctx.stroke();
      }
    }

    function drawFrog(x, y, scale = 1, flash = false, stretchX = 1, stretchY = 1) {
      const blink = flash && state.invulnerable > 0 && Math.floor(state.elapsed * 12) % 2 === 0;
      if (blink) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(scale * stretchX, scale * stretchY);
      ellipse(0, 7, 17, 12, '#38774c');
      ellipse(0, 1, 15, 13, '#8cce62');
      ellipse(-8, -8, 6.5, 7, '#9bdb6a'); ellipse(8, -8, 6.5, 7, '#9bdb6a');
      ellipse(-8, -9, 3.2, 3.8, '#f7f5dc'); ellipse(8, -9, 3.2, 3.8, '#f7f5dc');
      ellipse(-7.5, -9, 1.5, 2.2, '#21392e'); ellipse(8.5, -9, 1.5, 2.2, '#21392e');
      ctx.strokeStyle = '#4b8a4d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-12, 9); ctx.lineTo(-19, 13); ctx.moveTo(12, 9); ctx.lineTo(19, 13); ctx.stroke();
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, FROGGER.width, FROGGER.height);
      ctx.fillStyle = '#5b9852'; ctx.fillRect(0, 0, FROGGER.width, FROGGER.cellH);
      for (let row = 1; row <= 4; row++) drawWater(row);
      ctx.fillStyle = '#75af5a'; ctx.fillRect(0, FROGGER.cellH * 5, FROGGER.width, FROGGER.cellH);
      for (let row = 6; row <= 9; row++) drawRoad(row);
      ctx.fillStyle = '#71ad5a'; ctx.fillRect(0, FROGGER.cellH * 10, FROGGER.width, FROGGER.cellH);
      ctx.fillStyle = 'rgba(242,252,178,.24)';
      for (let x = 16; x < FROGGER.width; x += 48) {
        ctx.beginPath(); ctx.arc(x, FROGGER.cellH * 5 + 12 + (x % 3) * 7, 2, 0, Math.PI * 2); ctx.fill();
      }
      for (const lane of state.lanes) {
        if (lane.kind === 'river') drawPlatform(lane);
        else for (const item of lane.items) drawCar(lane, item);
      }
      for (let i = 0; i < FROGGER.homes.length; i++) drawHome(i);
      if (state.phase !== 'stage-clear' && state.phase !== 'over') {
        let frogX = state.frog.x;
        let frogY = state.frog.row * FROGGER.cellH + FROGGER.cellH * 0.5;
        let stretchX = 1;
        let stretchY = 1;
        if (state.hopAnimation) {
          const progress = clamp(state.hopAnimation.elapsed / state.hopAnimation.duration, 0, 1);
          const eased = progress * progress * (3 - 2 * progress);
          const sourceY = state.hopAnimation.fromRow * FROGGER.cellH + FROGGER.cellH * 0.5;
          const targetY = state.hopAnimation.toRow * FROGGER.cellH + FROGGER.cellH * 0.5;
          frogX = state.hopAnimation.fromX + (state.hopAnimation.toX - state.hopAnimation.fromX) * eased;
          frogY = sourceY + (targetY - sourceY) * eased - Math.sin(progress * Math.PI) * 11;
          stretchX = 1 + Math.sin(progress * Math.PI) * 0.1;
          stretchY = 1 - Math.sin(progress * Math.PI) * 0.08;
        }
        drawFrog(frogX, frogY, 1, true, stretchX, stretchY);
      }

      if (state.phase === 'paused' || state.phase === 'stage-clear' || state.phase === 'over') {
        ctx.fillStyle = 'rgba(13,31,32,.76)'; ctx.fillRect(0, 0, FROGGER.width, FROGGER.height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#f5f4dc'; ctx.font = '800 32px Calibri, sans-serif';
        const headline = state.phase === 'paused' ? 'TẠM DỪNG' : state.phase === 'over' ? 'HẾT MẠNG' : 'QUA MÀN ' + state.lastClearedStage;
        ctx.fillText(headline, FROGGER.width / 2, 262);
        ctx.fillStyle = '#d5e8bc'; ctx.font = '17px Calibri, sans-serif';
        const subline = state.phase === 'over' ? 'Nhấn ↻ để sang đường lần nữa' : state.phase === 'paused' ? 'Nhấn ▶ để tiếp tục' : 'Bè và xe sẽ chạy nhanh hơn';
        ctx.fillText(subline, FROGGER.width / 2, 296);
      }
    }

    function frame(timestamp) {
      const dt = lastFrame ? Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000)) : 0;
      lastFrame = timestamp || 0;
      const previous = state.lastEvent;
      model.tick(state, dt);
      if (state.lastEvent !== previous) {
        announce(state.lastEvent);
        persist();
      }
      updateHud();
      draw();
      frameId = session.requestAnimationFrame(frame);
    }

    const directions = {
      left: [-1, 0], up: [0, -1], down: [0, 1], right: [1, 0]
    };
    for (const button of container.querySelectorAll('[data-hop]')) {
      const direction = directions[button.getAttribute('data-hop')];
      listen(button, 'pointerdown', event => {
        event.preventDefault();
        if (button.setPointerCapture && event.pointerId !== undefined) {
          try { button.setPointerCapture(event.pointerId); } catch (error) { /* pointer may already be canceled */ }
        }
        act(direction[0], direction[1]);
      });
      listen(button, 'click', event => {
        if (event.detail !== 0) return;
        act(direction[0], direction[1]);
      });
    }
    listen(container.querySelector('#arcPause'), 'click', togglePause);
    listen(container.querySelector('#arcRestart'), 'click', restart);
    listen(window, 'keydown', event => {
      const key = String(event.key || '');
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target && event.target.tagName)) return;
      if (key === 'p' || key === 'P') {
        if (!event.repeat) togglePause();
        return;
      }
      const direction = ({ ArrowLeft: 'left', a: 'left', A: 'left', ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down', ArrowRight: 'right', d: 'right', D: 'right' })[key];
      if (direction && !event.repeat) {
        event.preventDefault();
        const [dx, dy] = directions[direction];
        act(dx, dy);
      } else if ((key === ' ' || event.code === 'Space' || key === 'Enter') &&
                 !(event.target && event.target.tagName === 'BUTTON')) {
        event.preventDefault();
        act(0, -1);
      }
    });
    listen(document, 'visibilitychange', () => {
      if (document.hidden && state.phase !== 'paused' && state.phase !== 'over') togglePause();
    });
    listen(window, 'blur', () => {
      if (state.phase === 'playing' || state.phase === 'stage-clear') togglePause();
    });
    listen(canvas, 'pointerdown', event => {
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* pointer may have left the canvas */ }
      }
    });
    listen(canvas, 'pointerup', event => {
      const start = pointers.get(event.pointerId);
      pointers.delete(event.pointerId);
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) act(0, -1);
      else if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? -1 : 1, 0);
      else act(0, dy < 0 ? -1 : 1);
    });
    for (const name of ['pointercancel', 'lostpointercapture']) {
      listen(canvas, name, event => pointers.delete(event.pointerId));
    }

    updateHud();
    draw();
    frameId = session.requestAnimationFrame(frame);
    session.onCleanup(() => {
      if (frameId !== null) session.cancelAnimationFrame(frameId);
      pointers.clear();
      persist();
    });
  }

  function launch(container, game) {
    const id = String(game && game.id || '').toLowerCase();
    if (id === 'frogger-ech-bang-qua-duong') {
      launchFrogger(container, game);
      return;
    }
    if (id === 'asteroids-tau-ban-thien-thach') {
      launchAsteroids(container, game);
      return;
    }
    if (id === 'ban-ruoi-galaga') {
      launchGalaga(container, game);
      return;
    }
    if (id === 'piano-tiles-phim-nhac') {
      launchPianoTiles(container, game);
      return;
    }
    const session = window.NP_GameSession.start();
    const { listen, requestAnimationFrame, cancelAnimationFrame, setTimeout } = session;
    const kind = kindFor(game);
    const keys = Object.create(null);
    const state = {
      kind, stage: 1, points: 0, score: 0, lives: 3,
      bestStage: 1, highScore: 0, phase: 'playing',
      elapsed: 0, lastFrame: 0, banner: 1.5, cooldown: 0,
      playerX: W / 2, targetX: W / 2, lane: 1,
      bullets: [], hazards: [], gems: [], spawnIn: 0.5,
      nextShot: 0, shield: 0, shieldCooldown: 0,
      selected: 0, patience: 8, order: 0,
      cards: [], flipped: [], matched: new Set(), busy: false, cursor: 0,
      goal: 0, target: null, crossX: W / 2, crossY: H / 2,
      qIndex: 0, enemyHP: 100, enemyMax: 100,
      hp: 100, guarded: false, healCooldown: 0,
      fx: [], lastAction: ''
    };
    const key = 'np_archetype_' + String(game.id || 'unknown').replace(/[^a-z0-9-_]/gi, '');
    try {
      const previous = JSON.parse(localStorage.getItem(key) || '{}');
      if (Number.isFinite(previous.score)) state.highScore = Math.max(0, previous.score);
      if (Number.isFinite(previous.stage)) state.bestStage = Math.max(1, previous.stage);
    } catch (error) { /* disabled or corrupted storage */ }

    container.innerHTML = '<div class="canvas-game-box np-arc-box">' +
      '<div class="canvas-game-hud np-arc-hud">' +
      '<div class="hud-pill">Màn <span id="arcLevel">1</span> <small id="arcBest"></small></div>' +
      '<div class="hud-pill">Điểm <span id="arcScore">0</span></div>' +
      '<div class="hud-pill">Mạng <span id="arcLives">3</span></div>' +
      '<div class="hud-pill">Tiến độ <span id="arcProgress">0/1</span></div></div>' +
      '<canvas class="canvas-main-viewport np-arc-canvas" id="arcCanvas" width="640" height="400" aria-label="Khu vực chơi game"></canvas>' +
      '<p class="np-arc-help" id="arcHelp"></p>' +
      '<div class="canvas-controls-bar np-arc-controls">' +
      '<button class="btn-canvas-action" id="arcLeft" type="button" aria-label="Sang trái">◀ Trái</button>' +
      '<button class="btn-canvas-action np-arc-action" id="arcAction" type="button">Hành động</button>' +
      '<button class="btn-canvas-action" id="arcRight" type="button" aria-label="Sang phải">Phải ▶</button>' +
      '<button class="btn-canvas-action" id="arcPause" type="button">Tạm dừng</button>' +
      '<button class="btn-canvas-action" id="arcRestart" type="button">Chơi lại</button>' +
      '<button class="btn-canvas-action" id="arcContinue" type="button">Tiếp tục màn cao nhất</button>' +
      '</div><div class="np-arc-announcement" id="arcAnnouncement" role="status" aria-live="polite"></div></div>';

    const canvas = container.querySelector('#arcCanvas');
    const ctx = canvas.getContext('2d');
    const text = (id, value) => { const el = container.querySelector(id); if (el) el.textContent = value; };
    text('#arcHelp', descriptions[kind] + ' Đây là chế độ arcade theo thể loại, chưa mô phỏng đầy đủ luật game gốc.');
    const labels = { shooter: 'Bắn', runner: 'Khiên', reflex: 'Bắn trúng', puzzle: 'Lật thẻ', management: 'Phục vụ', quiz: 'Trả lời', duel: 'Ra đòn' };
    text('#arcAction', labels[kind]);
    canvas.style.touchAction = 'none';

    function notify(message) {
      state.lastAction = message;
      text('#arcAnnouncement', message);
    }
    function sound(name) {
      if (window.NP_Audio && typeof window.NP_Audio[name] === 'function') {
        window.NP_Audio[name]();
      }
    }
    function vibrate(pattern) {
      try {
        if (window.NP_Juice && typeof window.NP_Juice.vibrate === 'function') window.NP_Juice.vibrate(pattern);
      } catch (error) { /* hardware vibration may be unavailable */ }
    }
    function persist() {
      if (state.score <= state.highScore && state.stage <= state.bestStage) return;
      state.highScore = Math.max(state.highScore, state.score);
      state.bestStage = Math.max(state.bestStage, state.stage);
      try { localStorage.setItem(key, JSON.stringify({ score: state.highScore, stage: state.bestStage })); }
      catch (error) { /* private browsing */ }
    }
    function needed() {
      if (kind === 'puzzle' || kind === 'duel') return 1;
      return 4 + state.stage * (kind === 'runner' ? 3 : 2);
    }
    function updateHUD() {
      text('#arcLevel', state.stage);
      text('#arcBest', '(cao nhất ' + state.bestStage + ')');
      text('#arcScore', state.score);
      text('#arcLives', state.lives);
      text('#arcProgress', Math.min(state.points, needed()) + '/' + needed());
      const pause = container.querySelector('#arcPause');
      if (pause) pause.textContent = state.phase === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
      const continueBtn = container.querySelector('#arcContinue');
      if (continueBtn) continueBtn.style.display = state.bestStage > 1 ? '' : 'none';
    }
    function preparePuzzle() {
      const pairs = Math.min(12, 5 + state.stage);
      const values = Array.from({ length: pairs }, (_, i) => i % 12);
      state.cards = [...values, ...values];
      for (let i = state.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.cards[i], state.cards[j]] = [state.cards[j], state.cards[i]];
      }
      state.flipped = [];
      state.matched = new Set();
      state.busy = false;
      state.cursor = 0;
    }
    function prepareTarget() {
      state.target = { x: random(70, W - 70), y: random(85, H - 65),
        time: Math.max(0.75, 2.6 - state.stage * 0.115),
        radius: Math.max(27, 39 - state.stage * 0.65) };
    }
    function prepareOrder() {
      state.order = Math.floor(Math.random() * 3);
      state.patience = Math.max(3.5, 10 - state.stage * 0.38);
    }
    function prepareDuel() {
      state.enemyMax = 70 + state.stage * 22;
      state.enemyHP = state.enemyMax;
      state.guarded = false;
      state.cooldown = 0;
      state.hp = Math.min(100, state.hp + 25);
    }
    function resetGame() {
      state.stage = 1; state.points = 0; state.score = 0; state.lives = 3;
      state.phase = 'playing'; state.elapsed = 0; state.lastFrame = 0;
      state.banner = 1.5; state.cooldown = 0; state.shield = 0;
      state.shieldCooldown = 0; state.playerX = W / 2; state.targetX = W / 2;
      state.lane = 1; state.nextShot = 0; state.healCooldown = 0;
      state.hp = 100; state.selected = 0; state.spawnIn = 0.6;
      state.hazards = []; state.bullets = []; state.gems = []; state.fx = [];
      for (const k of Object.keys(keys)) keys[k] = false;
      if (kind === 'puzzle') preparePuzzle();
      if (kind === 'reflex') prepareTarget();
      if (kind === 'management') prepareOrder();
      if (kind === 'duel') prepareDuel();
      state.qIndex = Math.floor(Math.random() * QUESTIONS.length);
      notify('Màn 1 bắt đầu. Chúc bạn chơi vui!');
      updateHUD();
    }
    function finish() {
      if (state.phase === 'over') return;
      state.phase = 'over';
      persist();
      notify('Hết lượt! Bạn đạt ' + state.score + ' điểm, tới màn ' + state.stage + '. Nhấn Chơi lại.');
      sound('alarm');
      updateHUD();
    }
    function loseLife() {
      if (state.phase !== 'playing' || state.cooldown > 0) return;
      state.lives -= 1;
      state.cooldown = 0.75;
      vibrate([30, 50, 30]);
      if (state.lives <= 0) finish();
      else notify('Mất một mạng! Còn ' + state.lives + ' lượt.');
      updateHUD();
    }
    function nextStage() {
      state.stage++;
      state.points = 0;
      state.banner = 1.8;
      state.lives = Math.min(5, state.lives + (state.stage % 3 === 0 ? 1 : 0));
      state.bullets.length = 0;
      state.hazards.length = 0;
      state.gems.length = 0;
      state.spawnIn = 0.8;
      state.cooldown = 0.8;
      if (kind === 'puzzle') preparePuzzle();
      if (kind === 'reflex') prepareTarget();
      if (kind === 'management') prepareOrder();
      if (kind === 'duel') prepareDuel();
      persist();
      sound('win');
      vibrate([20, 35, 20]);
      notify('Qua màn! Màn ' + state.stage + ' có thử thách khó hơn.');
      updateHUD();
    }
    function reward(value, progress = 1) {
      if (state.phase !== 'playing') return;
      state.score += value;
      state.points += progress;
      if (state.points >= needed()) nextStage();
      else { persist(); updateHUD(); }
    }

    function shoot() {
      if (state.phase !== 'playing' || state.nextShot > 0) return;
      state.nextShot = Math.max(0.12, 0.29 - state.stage * 0.012);
      state.bullets.push({ x: state.playerX - 12, y: H - 67 }, { x: state.playerX + 12, y: H - 67 });
      if (state.bullets.length > 35) state.bullets.splice(0, state.bullets.length - 35);
      sound('laser');
      vibrate(8);
    }
    function moveChoice(delta) {
      if (state.phase !== 'playing') return;
      if (kind === 'runner') {
        state.lane = clamp(state.lane + delta, 0, 2);
        state.targetX = W * (0.25 + state.lane * 0.25);
      } else if (kind === 'management' || kind === 'duel') {
        state.selected = (state.selected + delta + 3) % 3;
      } else if (kind === 'quiz') {
        state.selected = (state.selected + delta + 4) % 4;
      } else if (kind === 'puzzle') {
        state.cursor = (state.cursor + delta + state.cards.length) % state.cards.length;
      } else if (kind === 'reflex') {
        state.crossX = clamp(state.crossX + 70 * delta, 25, W - 25);
      }
    }
    function openCard(index) {
      if (state.phase !== 'playing' || state.busy || index < 0 ||
          index >= state.cards.length || state.matched.has(index) ||
          state.flipped.includes(index)) return;
      state.flipped.push(index);
      sound('pop');
      vibrate(8);
      if (state.flipped.length === 2) {
        const [a, b] = state.flipped;
        if (state.cards[a] === state.cards[b]) {
          state.matched.add(a); state.matched.add(b);
          state.flipped = [];
          state.score += 20;
          if (state.matched.size === state.cards.length) nextStage();
          else { persist(); updateHUD(); }
        } else {
          state.busy = true;
          setTimeout(() => { state.flipped = []; state.busy = false; }, 380);
        }
      }
    }
    function selectQuiz(index) {
      if (state.phase !== 'playing') return;
      const q = QUESTIONS[state.qIndex % QUESTIONS.length];
      state.selected = clamp(index, 0, 3);
      if (state.selected === q[2]) {
        sound('coin');
        reward(25);
      } else {
        loseLife();
      }
      state.qIndex++;
    }
    function doAction() {
      if (state.phase !== 'playing') return;
      vibrate(8);
      if (kind === 'shooter') shoot();
      else if (kind === 'runner') {
        if (state.shieldCooldown <= 0) {
          state.shield = 1.2;
          state.shieldCooldown = 4.0;
          sound('powerup');
        }
      } else if (kind === 'reflex') hitTarget(state.crossX, state.crossY);
      else if (kind === 'puzzle') openCard(state.cursor);
      else if (kind === 'quiz') selectQuiz(state.selected);
      else if (kind === 'management') {
        if (state.selected === state.order) {
          sound('coin');
          reward(20 + Math.round(state.patience * 3));
          prepareOrder();
        } else {
          state.patience -= 2;
          sound('alarm');
          if (state.patience <= 0) { loseLife(); prepareOrder(); }
        }
      } else if (kind === 'duel') {
        if (state.cooldown > 0) return;
        if (state.selected === 0) {
          state.enemyHP -= 16 + Math.min(22, state.stage * 2);
          sound('hit');
        } else if (state.selected === 1) {
          state.guarded = true;
          sound('pop');
        } else if (state.healCooldown <= 0) {
          state.hp = Math.min(100, state.hp + 24);
          state.healCooldown = 2;
          sound('powerup');
        }
        if (state.enemyHP <= 0) {
          reward(100);
          return;
        }
        const damage = 7 + Math.min(24, state.stage * 2);
        state.hp -= state.guarded ? Math.ceil(damage * 0.15) : damage;
        state.guarded = false;
        if (state.hp <= 0) {
          state.hp = 100;
          state.cooldown = 0; // Damage must count even immediately after the enemy attacks.
          loseLife();
          if (state.phase === 'playing') prepareDuel();
        } else {
          state.cooldown = 0.45;
        }
      }
    }
    function hitTarget(x, y) {
      if (state.phase !== 'playing' || !state.target) return;
      const t = state.target;
      if (Math.hypot(x - t.x, y - t.y) <= t.radius + 7) {
        sound('coin');
        reward(20 + Math.round(t.time * 10));
        prepareTarget();
      } else {
        sound('pop');
      }
    }

    const controls = [
      ['#arcLeft', 'left', -1], ['#arcRight', 'right', 1], ['#arcAction', 'action', 0]
    ];
    controls.forEach(([selector, name, direction]) => {
      const button = container.querySelector(selector);
      if (!button) return;
      // Pointer events unify mouse, touch and stylus without synthetic duplicate clicks.
      listen(button, 'pointerdown', event => {
        event.preventDefault();
        if (button.setPointerCapture && event.pointerId !== undefined) {
          try { button.setPointerCapture(event.pointerId); } catch (error) {}
        }
        keys[name] = true;
        if (name === 'action') doAction();
        else if (kind !== 'shooter') moveChoice(direction);
      });
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(button, eventName, () => { keys[name] = false; });
      }
      // Keyboard-generated button clicks remain accessible.
      listen(button, 'click', event => {
        if (event.detail !== 0) return;
        if (name === 'action') doAction();
        else moveChoice(direction);
      });
    });
    listen(window, 'pointerup', () => { keys.left = false; keys.right = false; keys.action = false; });
    listen(window, 'blur', () => { keys.left = false; keys.right = false; keys.action = false; if (state.phase === 'playing') togglePause(); });
    listen(document, 'visibilitychange', () => {
      if (document.hidden && state.phase === 'playing') togglePause();
    });
    listen(window, 'keydown', event => {
      const focused = event.target && event.target.tagName;
      if (focused === 'INPUT' || focused === 'TEXTAREA') return;
      const k = event.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        event.preventDefault();
        keys.left = true;
        if (!event.repeat && kind !== 'shooter') moveChoice(-1);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        event.preventDefault();
        keys.right = true;
        if (!event.repeat && kind !== 'shooter') moveChoice(1);
      } else if (k === ' ' || event.code === 'Space' || k === 'Enter') {
        event.preventDefault();
        keys.action = true;
        if (!event.repeat) doAction();
      } else if (k === 'p' || k === 'P') {
        if (!event.repeat) togglePause();
      }
    });
    listen(window, 'keyup', event => {
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = false;
      if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = false;
      if (event.key === ' ' || event.code === 'Space' || event.key === 'Enter') keys.action = false;
    });
    listen(canvas, 'pointerdown', event => {
      event.preventDefault();
      const p = pointerCoords(event);
      if (kind === 'shooter') { state.playerX = clamp(p.x, 24, W - 24); shoot(); }
      else if (kind === 'reflex') { state.crossX = p.x; state.crossY = p.y; hitTarget(p.x, p.y); }
      else if (kind === 'puzzle') { const index = cardAt(p.x, p.y); if (index !== -1) openCard(index); }
      else if (kind === 'quiz') {
        const index = Math.floor((p.y - 134) / 56);
        if (index >= 0 && index < 4) selectQuiz(index);
      } else if (kind === 'runner') {
        state.lane = clamp(Math.round((p.x / W - 0.25) * 4), 0, 2);
        state.targetX = W * (0.25 + state.lane * 0.25);
      }
      else if (kind === 'management' || kind === 'duel') {
        const index = Math.floor((p.x - 70) / 170);
        if (index >= 0 && index < 3) { state.selected = index; doAction(); }
      }
    });
    listen(canvas, 'pointermove', event => {
      const p = pointerCoords(event);
      if (kind === 'shooter' && event.buttons) state.playerX = clamp(p.x, 24, W - 24);
      if (kind === 'reflex') { state.crossX = p.x; state.crossY = p.y; }
    });
    function pointerCoords(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * W / (rect.width || W),
        y: (event.clientY - rect.top) * H / (rect.height || H)
      };
    }
    function togglePause() {
      if (state.phase === 'over') return;
      state.phase = state.phase === 'paused' ? 'playing' : 'paused';
      state.lastFrame = 0; // Never catch up a hidden tab with hundreds of simulation steps.
      updateHUD();
      notify(state.phase === 'paused' ? 'Đã tạm dừng.' : 'Tiếp tục chơi.');
    }
    const pauseButton = container.querySelector('#arcPause');
    const restartButton = container.querySelector('#arcRestart');
    listen(pauseButton, 'click', togglePause);
    listen(restartButton, 'click', resetGame);
    listen(container.querySelector('#arcContinue'), 'click', () => {
      if (state.bestStage <= 1) return;
      const checkpoint = state.bestStage;
      resetGame();
      state.stage = checkpoint;
      state.points = 0;
      state.banner = 1.6;
      if (kind === 'puzzle') preparePuzzle();
      if (kind === 'reflex') prepareTarget();
      if (kind === 'management') prepareOrder();
      if (kind === 'duel') prepareDuel();
      notify('Tiếp tục từ màn ' + checkpoint + '.');
      updateHUD();
    });

    function cardBounds(index) {
      const rows = Math.ceil(state.cards.length / 4);
      const size = Math.min(60, (270 - 9 * rows) / rows);
      const gap = 9;
      const x0 = (W - 4 * (size + gap) + gap) / 2;
      return { x: x0 + (index % 4) * (size + gap),
        y: 72 + Math.floor(index / 4) * (size + gap), size };
    }
    function cardAt(x, y) {
      for (let i = 0; i < state.cards.length; i++) {
        const b = cardBounds(i);
        if (x >= b.x && x <= b.x + b.size && y >= b.y && y <= b.y + b.size) return i;
      }
      return -1;
    }
    function step(dt) {
      state.elapsed += dt / 60;
      state.cooldown = Math.max(0, state.cooldown - dt / 60);
      state.banner = Math.max(0, state.banner - dt / 60);
      state.nextShot = Math.max(0, state.nextShot - dt / 60);
      state.shield = Math.max(0, state.shield - dt / 60);
      state.shieldCooldown = Math.max(0, state.shieldCooldown - dt / 60);
      state.healCooldown = Math.max(0, state.healCooldown - dt / 60);

      if (kind === 'shooter') {
        if (keys.left) state.playerX -= 6.3 * dt;
        if (keys.right) state.playerX += 6.3 * dt;
        state.playerX = clamp(state.playerX, 24, W - 24);
        if (keys.action) shoot();
        state.spawnIn -= dt / 60;
        if (state.spawnIn <= 0) {
          if (state.hazards.length < 18) state.hazards.push({
            x: random(28, W - 28), y: -22, radius: random(13, 23),
            vy: (1.4 + Math.min(state.stage, 15) * 0.18) * random(0.9, 1.3)
          });
          state.spawnIn = Math.max(0.22, 0.92 - state.stage * 0.038);
        }
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          state.bullets[i].y -= 10 * dt;
          if (state.bullets[i].y < -20) state.bullets.splice(i, 1);
        }
        for (let i = state.hazards.length - 1; i >= 0; i--) {
          const h = state.hazards[i];
          h.y += h.vy * dt;
          let destroyed = false;
          for (let j = state.bullets.length - 1; j >= 0; j--) {
            const b = state.bullets[j];
            if (Math.hypot(h.x - b.x, h.y - b.y) < h.radius + 6) {
              state.bullets.splice(j, 1);
              state.hazards.splice(i, 1);
              sound('pop');
              reward(20);
              destroyed = true; break;
            }
          }
          if (destroyed) continue;
          if (Math.hypot(h.x - state.playerX, h.y - (H - 45)) < h.radius + 13) {
            state.hazards.splice(i, 1);
            loseLife();
          } else if (h.y > H + 30) state.hazards.splice(i, 1);
        }
      } else if (kind === 'runner') {
        state.playerX += (state.targetX - state.playerX) * Math.min(1, 0.25 * dt);
        state.spawnIn -= dt / 60;
        if (state.spawnIn <= 0) {
          state.hazards.push({ lane: Math.floor(Math.random() * 3), y: -40, passed: false,
            bonus: Math.random() < 0.23 });
          state.spawnIn = Math.max(0.48, 1.35 - state.stage * 0.065);
        }
        for (let i = state.hazards.length - 1; i >= 0; i--) {
          const o = state.hazards[i];
          o.y += (3.1 + Math.min(16, state.stage) * 0.32) * dt;
          const x = W * (0.25 + o.lane * 0.25);
          if (!o.passed && o.y >= H - 58) {
            o.passed = true;
            if (Math.abs(x - state.playerX) < 46 && !state.shield) {
              loseLife();
            } else {
              reward(o.bonus ? 30 : 10);
            }
          }
          if (o.y > H + 50) state.hazards.splice(i, 1);
        }
      } else if (kind === 'reflex') {
        if (state.target) {
          state.target.time -= dt / 60;
          if (state.target.time <= 0) {
            loseLife();
            prepareTarget();
          }
        }
      } else if (kind === 'management') {
        state.patience -= dt / 60;
        if (state.patience <= 0) {
          loseLife();
          prepareOrder();
        }
      }
    }
    function background() {
      ctx.fillStyle = '#101827';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }
    function label(t, x, y, size = 19, color = '#fff') {
      ctx.fillStyle = color; ctx.font = 'bold ' + size + 'px Calibri, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(String(t), x, y);
    }
    function bar(x, y, width, value, color) {
      ctx.fillStyle = '#334155'; ctx.fillRect(x, y, width, 9);
      ctx.fillStyle = color; ctx.fillRect(x, y, width * clamp(value, 0, 1), 9);
    }
    function draw() {
      background();
      label(String(game.title || 'NewPlayground'), W / 2, 27, 17, '#CBD5E1');
      if (kind === 'shooter') {
        for (const b of state.bullets) { ctx.fillStyle = '#38BDF8'; ctx.fillRect(b.x - 2, b.y - 10, 4, 15); }
        for (const o of state.hazards) {
          ctx.fillStyle = '#F97316'; ctx.beginPath();
          ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = state.cooldown > 0 ? '#93C5FD' : '#5EEAD4';
        ctx.beginPath(); ctx.moveTo(state.playerX, H - 70);
        ctx.lineTo(state.playerX - 18, H - 28); ctx.lineTo(state.playerX + 18, H - 28);
        ctx.closePath(); ctx.fill();
        label('Phá mục tiêu để mở màn tiếp theo', W / 2, 66, 14, '#94A3B8');
      } else if (kind === 'runner') {
        for (let i = 1; i <= 2; i++) {
          ctx.strokeStyle = '#64748B'; ctx.setLineDash([10, 14]);
          ctx.beginPath(); ctx.moveTo(W * (0.125 + i * 0.25), 64);
          ctx.lineTo(W * (0.125 + i * 0.25), H); ctx.stroke(); ctx.setLineDash([]);
        }
        for (const o of state.hazards) {
          ctx.fillStyle = o.bonus ? '#FBBF24' : '#F87171';
          ctx.fillRect(W * (0.25 + o.lane * 0.25) - 22, o.y - 18, 44, 36);
        }
        ctx.fillStyle = state.shield > 0 ? '#5EEAD4' : '#60A5FA';
        ctx.fillRect(state.playerX - 21, H - 67, 42, 42);
        label(state.shield > 0 ? 'KHIÊN' : 'Né xe và chướng ngại', W / 2, 68, 15, '#CBD5E1');
        label(state.shieldCooldown > 0 ? 'Khiên hồi: ' + state.shieldCooldown.toFixed(1) + 's' : 'Khiên sẵn sàng', W / 2, 92, 14, '#5EEAD4');
      } else if (kind === 'reflex') {
        const t = state.target;
        if (t) {
          ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FDE68A'; ctx.beginPath(); ctx.arc(t.x, t.y, t.radius * 0.58, 0, Math.PI * 2); ctx.fill();
          bar(t.x - t.radius, t.y + t.radius + 12, t.radius * 2, t.time / Math.max(0.75, 2.6 - state.stage * 0.115), '#5EEAD4');
        }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(state.crossX, state.crossY, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(state.crossX - 20, state.crossY); ctx.lineTo(state.crossX + 20, state.crossY);
        ctx.moveTo(state.crossX, state.crossY - 20); ctx.lineTo(state.crossX, state.crossY + 20); ctx.stroke();
      } else if (kind === 'puzzle') {
        label('Tìm hai thẻ cùng hình', W / 2, 52, 15, '#94A3B8');
        const symbols = ['★', '◆', '●', '☀', '☂', '♥', '♣', '♠', '▲', '✿', '♫', '☯'];
        state.cards.forEach((value, i) => {
          const b = cardBounds(i);
          const open = state.flipped.includes(i);
          const found = state.matched.has(i);
          ctx.fillStyle = found ? '#065F46' : open ? '#2563EB' : '#334155';
          ctx.fillRect(b.x, b.y, b.size, b.size);
          if (state.cursor === i && !found) {
            ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 3;
            ctx.strokeRect(b.x - 2, b.y - 2, b.size + 4, b.size + 4);
          }
          label(found ? '✓' : open ? symbols[value] : '?',
            b.x + b.size / 2, b.y + b.size / 2 + 8, 24, found ? '#34D399' : '#FFFFFF');
        });
        label('Đã ghép ' + (state.matched.size / 2) + '/' + (state.cards.length / 2) + ' cặp', W / 2, H - 17, 16, '#5EEAD4');
      } else if (kind === 'management') {
        const choices = ['Nước trái cây', 'Bánh nóng', 'Món ăn nhẹ'];
        const colors = ['#38BDF8', '#FB923C', '#A78BFA'];
        label('Khách cần: ' + choices[state.order], W / 2, 100, 25, '#FDE68A');
        bar(98, 132, W - 196, state.patience / Math.max(3.5, 10 - state.stage * 0.38), '#34D399');
        choices.forEach((name, i) => {
          const x = 70 + i * 170;
          ctx.fillStyle = colors[i]; ctx.fillRect(x, 190, 140, 96);
          if (i === state.selected) {
            ctx.strokeStyle = '#FDE68A'; ctx.lineWidth = 5;
            ctx.strokeRect(x - 4, 186, 148, 104);
          }
          label(name, x + 70, 238, 16, '#0F172A');
        });
        label('Chọn món đúng rồi bấm Phục vụ', W / 2, H - 38, 17, '#CBD5E1');
      } else if (kind === 'quiz') {
        const q = QUESTIONS[state.qIndex % QUESTIONS.length];
        label(q[0], W / 2, 95, 20, '#FDE68A');
        q[1].forEach((answer, i) => {
          const y = 134 + i * 56;
          ctx.fillStyle = i === state.selected ? '#2563EB' : '#334155';
          ctx.fillRect(68, y, W - 136, 47);
          label(String.fromCharCode(65 + i) + '. ' + answer, W / 2, y + 31, 17);
        });
      } else if (kind === 'duel') {
        label('Nhân vật', 170, 105, 19, '#5EEAD4');
        label('Đối thủ màn ' + state.stage, 470, 105, 19, '#FCA5A5');
        bar(70, 120, 200, state.hp / 100, '#34D399');
        bar(370, 120, 200, state.enemyHP / state.enemyMax, '#F87171');
        ctx.fillStyle = '#5EEAD4'; ctx.fillRect(120, 170, 85, 95);
        ctx.fillStyle = '#F87171'; ctx.fillRect(430, 170, 85, 95);
        ['Tấn công', 'Phòng thủ', 'Hồi phục'].forEach((action, i) => {
          const x = 70 + i * 170;
          ctx.fillStyle = i === state.selected ? '#2563EB' : '#334155';
          ctx.fillRect(x, 306, 140, 50);
          label(action, x + 70, 338, 18);
        });
      }
      bar(18, H - 12, W - 36, state.points / needed(), '#A3E635');
      if (state.banner > 0 && state.phase === 'playing') {
        ctx.fillStyle = 'rgba(15,23,42,0.78)'; ctx.fillRect(120, 149, 400, 87);
        label('MÀN ' + state.stage, W / 2, 185, 27, '#A3E635');
        label('Độ khó tăng theo từng màn', W / 2, 214, 15, '#FFF');
      }
      if (state.phase !== 'playing') {
        ctx.fillStyle = 'rgba(8,13,22,0.81)'; ctx.fillRect(0, 0, W, H);
        label(state.phase === 'paused' ? 'TẠM DỪNG' : 'HẾT LƯỢT', W / 2, 166, 33, '#A3E635');
        label(state.phase === 'paused' ? 'Bấm Tiếp tục để chơi' : 'Bấm Chơi lại để thử lần nữa', W / 2, 204, 18, '#fff');
      }
    }

    let raf = null;
    function loop(timestamp) {
      let dt = state.lastFrame ? clamp((timestamp - state.lastFrame) / (1000 / 60), 0, 2) : 1;
      state.lastFrame = timestamp || 0;
      if (state.phase === 'playing') step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    resetGame();
    raf = requestAnimationFrame(loop);
    session.onCleanup(() => {
      cancelAnimationFrame(raf);
      keys.left = keys.right = keys.action = false;
    });
  }

  window.NP_Archetypes = {
    launch,
    kindFor,
    froggerModel: { create: createFroggerState, hop: froggerHop, tick: tickFrogger, constants: FROGGER },
    asteroidsModel: { create: createAsteroidsState, fire: asteroidFire, hyperspace: asteroidHyperspace, tick: asteroidTick, constants: ASTEROIDS },
    galagaModel: { create: createGalagaState, fire: galagaFire, capture: galagaCapture, tick: galagaTick, constants: GALAGA },
    pianoTilesModel: { create: createPianoTilesState, tap: pianoTap, tick: pianoTick, speed: pianoSpeed, constants: PIANO_TILES }
  };
})();

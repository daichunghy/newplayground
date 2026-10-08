/* Deterministic rules for the original Mầm Gió bubble-trap platform arcade. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BubbleTrapModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const VERSION = 1;
  const WIDTH = 760;
  const HEIGHT = 430;
  const GROUND_Y = 392;
  const STEP = 1 / 60;
  const GRAVITY = 920;
  const PLAYER_SPEED = 218;
  const JUMP_SPEED = 428;
  const MAX_LIVES = 3;
  const STAGES = [
    {
      id: 'dew-garden', name: 'Sân Sương Non', theme: 'dawn',
      platforms: [
        { id: 'reed-left', x: 78, y: 310, width: 202, trim: '#b6ddbd' },
        { id: 'reed-mid', x: 315, y: 228, width: 183, trim: '#f4c78d' },
        { id: 'reed-right', x: 522, y: 310, width: 174, trim: '#b6ddbd' }
      ],
      enemies: [
        { id: 'moss-1', x: 600, platform: 'ground', pace: 43, behavior: 'stalker', color: '#9b6ca5' },
        { id: 'moss-2', x: 143, platform: 'reed-left', pace: 38, behavior: 'pacer', color: '#d98175' },
        { id: 'moss-3', x: 612, platform: 'reed-right', pace: 40, behavior: 'pacer', color: '#7e9b71' }
      ]
    },
    {
      id: 'lantern-orchard', name: 'Vườn Đèn Hạt', theme: 'firefly',
      platforms: [
        { id: 'orchard-low', x: 46, y: 320, width: 174, trim: '#e2c681' },
        { id: 'orchard-mid', x: 260, y: 246, width: 186, trim: '#b6ddbd' },
        { id: 'orchard-high', x: 486, y: 172, width: 224, trim: '#f4c78d' },
        { id: 'orchard-bridge', x: 278, y: 346, width: 198, trim: '#d99a91' }
      ],
      enemies: [
        { id: 'moss-4', x: 690, platform: 'ground', pace: 50, behavior: 'stalker', color: '#b46c8a' },
        { id: 'moss-5', x: 110, platform: 'orchard-low', pace: 44, behavior: 'pacer', color: '#d99061' },
        { id: 'moss-6', x: 382, platform: 'orchard-mid', pace: 47, behavior: 'sprinter', color: '#829b70' },
        { id: 'moss-7', x: 612, platform: 'orchard-high', pace: 48, behavior: 'pacer', color: '#a0719c' }
      ]
    },
    {
      id: 'rain-roofs', name: 'Mái Ngói Mưa', theme: 'violet',
      platforms: [
        { id: 'roof-left', x: 34, y: 320, width: 172, trim: '#e3a58f' },
        { id: 'roof-mid', x: 226, y: 246, width: 178, trim: '#e7c879' },
        { id: 'roof-high', x: 430, y: 172, width: 185, trim: '#b7d1a7' },
        { id: 'roof-cap', x: 625, y: 246, width: 104, trim: '#d6a6d1' }
      ],
      enemies: [
        { id: 'moss-8', x: 675, platform: 'ground', pace: 55, behavior: 'sprinter', color: '#b46c8a' },
        { id: 'moss-9', x: 126, platform: 'roof-left', pace: 50, behavior: 'pacer', color: '#d99061' },
        { id: 'moss-10', x: 358, platform: 'roof-mid', pace: 52, behavior: 'stalker', color: '#829b70' },
        { id: 'moss-11', x: 568, platform: 'roof-high', pace: 54, behavior: 'pacer', color: '#a0719c' },
        { id: 'moss-12', x: 683, platform: 'roof-cap', pace: 56, behavior: 'sprinter', color: '#d98175' }
      ]
    }
  ];

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const copy = value => JSON.parse(JSON.stringify(value));

  function enemyIntent(enemy, player) {
    const distance = player.x - enemy.x;
    if (enemy.behavior === 'pacer' || player.platformId !== enemy.platform) return { direction: enemy.direction, multiplier: 1 };
    const range = enemy.behavior === 'sprinter' ? 320 : 265;
    if (Math.abs(distance) >= range) return { direction: enemy.direction, multiplier: enemy.behavior === 'sprinter' ? 0.86 : 1 };
    return { direction: distance < 0 ? -1 : 1, multiplier: enemy.behavior === 'sprinter' ? 1.32 : 1 };
  }

  function create() {
    let accumulator = 0;
    let nextBubbleId = 1;
    const events = [];
    const state = {
      version: VERSION, tick: 0, elapsed: 0, roundIndex: 0, score: 0, lives: MAX_LIVES,
      status: 'playing', player: null, enemies: [], bubbles: [], attackCooldown: 0,
      invulnerable: 1.15, roundClearTimer: null, chain: 0, lastPopAt: -99,
      traps: 0, pops: 0, misses: 0, hitsTaken: 0
    };

    const stage = () => STAGES[state.roundIndex];
    const stagePlatforms = () => stage().platforms;
    const surfaceY = id => id === 'ground' ? GROUND_Y : stagePlatforms().find(p => p.id === id)?.y ?? GROUND_Y;
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });

    function loadRound() {
      state.player = {
        x: 56, y: GROUND_Y - 36, vx: 0, vy: 0, width: 28, height: 36,
        facing: 1, grounded: true, platformId: 'ground', ridingBubble: null
      };
      state.enemies = stage().enemies.map((enemy, index) => ({
        ...enemy, direction: index % 2 ? -1 : 1, mode: 'alive', bubbleId: null, size: 28
      }));
      state.bubbles = [];
      state.attackCooldown = 0;
      state.invulnerable = 1.05;
      state.roundClearTimer = null;
    }

    loadRound();

    function enemyCenterY(enemy) { return surfaceY(enemy.platform) - 14; }
    function playerCenterY(player = state.player) { return player.y + player.height / 2; }
    function bubbleById(id) { return state.bubbles.find(b => b.id === id && b.kind === 'trap') || null; }

    function popBubble(bubble, bounced = false) {
      const enemy = state.enemies.find(e => e.id === bubble.targetId);
      if (!enemy || enemy.mode !== 'trapped') return false;
      enemy.mode = 'dead'; enemy.bubbleId = null;
      const chainable = state.elapsed - state.lastPopAt <= 1.8;
      state.chain = chainable ? state.chain + 1 : 1;
      state.lastPopAt = state.elapsed;
      state.pops++;
      const points = 300 + Math.min(600, (state.chain - 1) * 150);
      state.score += points;
      state.bubbles = state.bubbles.filter(b => b.id !== bubble.id);
      if (state.player.ridingBubble === bubble.id) {
        state.player.ridingBubble = null;
        state.player.grounded = false;
        state.player.platformId = null;
        state.player.vy = bounced ? -354 : -330;
      }
      emit('pop', { id: enemy.id, points, chain: state.chain, bounced });
      return true;
    }

    function act(action) {
      if (state.status !== 'playing' || state.roundClearTimer !== null) return false;
      const player = state.player;
      if (action === 'jump') {
        if (!player.grounded) return false;
        player.vy = player.ridingBubble ? -JUMP_SPEED * 0.92 : -JUMP_SPEED;
        player.grounded = false;
        player.platformId = null;
        player.ridingBubble = null;
        emit('jump');
        return true;
      }
      if (action !== 'bubble' || state.attackCooldown > 0) return false;
      state.attackCooldown = 0.38;
      const cx = player.x;
      const cy = playerCenterY();
      const nearby = state.bubbles
        .filter(b => b.kind === 'trap' && Math.abs(b.x - cx) <= 76 && Math.abs(b.y - cy) <= 66)
        .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx) || a.id - b.id)[0];
      if (nearby) return popBubble(nearby, player.ridingBubble === nearby.id);

      const originX = player.x + player.facing * 22;
      state.bubbles.push({ id: nextBubbleId++, kind: 'shot', x: originX, y: cy - 2, vx: player.facing * 355, life: 1.05 });
      state.misses++;
      emit('breathe');
      return true;
    }

    function landOnSurface(oldBottom, nextBottom, oldBubbleTops) {
      const player = state.player;
      let best = null;
      const surfaces = [
        ...stagePlatforms().map(p => ({ id: p.id, x: p.x, width: p.width, y: p.y })),
        { id: 'ground', x: 0, width: WIDTH, y: GROUND_Y },
        ...state.bubbles.filter(b => b.kind === 'trap').map(b => ({ id: `bubble:${b.id}`, bubbleId: b.id, x: b.x - 19, width: 38, y: b.y - 18 }))
      ];
      for (const surface of surfaces) {
        const priorTop = surface.bubbleId ? oldBubbleTops.get(surface.bubbleId) ?? surface.y : surface.y;
        const overlapsX = player.x + player.width / 2 > surface.x && player.x - player.width / 2 < surface.x + surface.width;
        if (!overlapsX || oldBottom > priorTop + 4 || nextBottom < surface.y) continue;
        if (!best || surface.y < best.y) best = surface;
      }
      if (!best) return false;
      player.y = best.y - player.height;
      player.vy = 0;
      player.grounded = true;
      player.platformId = best.bubbleId ? null : best.id;
      player.ridingBubble = best.bubbleId || null;
      return true;
    }

    function damagePlayer() {
      if (state.invulnerable > 0) return;
      state.lives--;
      state.hitsTaken++;
      state.chain = 0;
      state.invulnerable = 1.5;
      state.player.x = 56; state.player.y = GROUND_Y - state.player.height;
      state.player.vx = 0; state.player.vy = 0; state.player.grounded = true;
      state.player.platformId = 'ground'; state.player.ridingBubble = null;
      emit('ouch', { lives: state.lives });
      if (state.lives <= 0) {
        state.status = 'lost';
        emit('lost', { score: state.score, round: state.roundIndex + 1 });
      }
    }

    function updateEnemy(enemy, dt) {
      if (enemy.mode !== 'alive') return;
      const player = state.player;
      const bounds = enemy.platform === 'ground'
        ? { left: 26, right: WIDTH - 26 }
        : (() => { const p = stagePlatforms().find(item => item.id === enemy.platform); return { left: p.x + 15, right: p.x + p.width - 15 }; })();
      const intent = enemyIntent(enemy, player);
      enemy.direction = intent.direction;
      enemy.x += intent.direction * enemy.pace * intent.multiplier * (1 + state.roundIndex * 0.08) * dt;
      if (enemy.x <= bounds.left) { enemy.x = bounds.left; enemy.direction = 1; }
      if (enemy.x >= bounds.right) { enemy.x = bounds.right; enemy.direction = -1; }
    }

    function updateBubbles(dt) {
      const oldBubbleTops = new Map();
      for (const bubble of state.bubbles) {
        if (bubble.kind === 'trap') oldBubbleTops.set(bubble.id, bubble.y - 18);
      }
      for (const bubble of [...state.bubbles]) {
        bubble.life -= dt;
        if (bubble.kind === 'shot') {
          bubble.x += bubble.vx * dt;
          const target = state.enemies
            .filter(e => e.mode === 'alive' && Math.abs(enemyCenterY(e) - bubble.y) < 34 && Math.abs(e.x - bubble.x) <= 22)
            .sort((a, b) => Math.abs(a.x - bubble.x) - Math.abs(b.x - bubble.x) || a.id.localeCompare(b.id))[0];
          if (target) {
            bubble.kind = 'trap'; bubble.targetId = target.id; bubble.vx = 0; bubble.life = 6.8; bubble.age = 0;
            bubble.x = target.x; bubble.y = enemyCenterY(target) - 1;
            target.mode = 'trapped'; target.bubbleId = bubble.id;
            state.traps++;
            emit('trap', { id: target.id });
          }
        } else {
          bubble.age += dt;
          const enemy = state.enemies.find(e => e.id === bubble.targetId && e.mode === 'trapped');
          if (enemy) {
            bubble.y = Math.max(72, bubble.y - 24 * dt);
            bubble.x = clamp(bubble.x + Math.sin(bubble.age * 1.7) * 1.2 * dt, 25, WIDTH - 25);
          }
          if (bubble.life <= 0 && enemy) {
            enemy.mode = 'alive'; enemy.bubbleId = null;
            enemy.x = clamp(bubble.x, 30, WIDTH - 30);
            state.bubbles = state.bubbles.filter(b => b.id !== bubble.id);
            emit('escape', { id: enemy.id });
          }
        }
        if (bubble.kind === 'shot' && (bubble.life <= 0 || bubble.x < 0 || bubble.x > WIDTH)) {
          state.bubbles = state.bubbles.filter(b => b.id !== bubble.id);
        }
      }
      return oldBubbleTops;
    }

    function step(input) {
      if (state.status !== 'playing') return;
      state.tick++;
      state.elapsed += STEP;
      const dt = STEP;
      state.attackCooldown = Math.max(0, state.attackCooldown - dt);
      state.invulnerable = Math.max(0, state.invulnerable - dt);
      const player = state.player;
      const oldBottom = player.y + player.height;
      const oldBubbleTops = updateBubbles(dt);

      if (player.ridingBubble) {
        const bubble = bubbleById(player.ridingBubble);
        const oldTop = oldBubbleTops.get(player.ridingBubble);
        if (bubble && oldTop !== undefined) player.y += (bubble.y - 18) - oldTop;
        else { player.ridingBubble = null; player.grounded = false; player.platformId = null; }
      }

      const move = clamp(Number(input.move) || 0, -1, 1);
      player.vx = move * PLAYER_SPEED;
      if (move) player.facing = move > 0 ? 1 : -1;
      player.x = clamp(player.x + player.vx * dt, 18, WIDTH - 18);
      if (player.grounded && !player.ridingBubble && player.platformId !== 'ground') {
        const support = stagePlatforms().find(p => p.id === player.platformId);
        const staysOnSupport = support && player.y + player.height >= support.y - 1 && player.y + player.height <= support.y + 4 &&
          player.x + player.width / 2 > support.x && player.x - player.width / 2 < support.x + support.width;
        if (!staysOnSupport) { player.grounded = false; player.platformId = null; }
      }
      if (!player.grounded) player.vy += GRAVITY * dt;
      else if (!player.ridingBubble) player.vy = 0;
      const beforeY = player.y;
      player.y += player.vy * dt;
      if (player.vy >= 0) landOnSurface(beforeY + player.height, player.y + player.height, oldBubbleTops);

      for (const enemy of state.enemies) updateEnemy(enemy, dt);
      if (state.invulnerable <= 0) {
        const touching = state.enemies.some(e => e.mode === 'alive' && e.platform === player.platformId && Math.abs(e.x - player.x) < 25 && Math.abs(enemyCenterY(e) - playerCenterY()) < 28);
        if (touching) damagePlayer();
      }

      if (state.roundClearTimer === null && state.enemies.every(e => e.mode === 'dead')) {
        state.roundClearTimer = 1.25;
        emit('round-clear', { round: state.roundIndex + 1, score: state.score });
      } else if (state.roundClearTimer !== null) {
        state.roundClearTimer -= dt;
        if (state.roundClearTimer <= 0) {
          if (state.roundIndex + 1 >= STAGES.length) {
            state.status = 'won';
            emit('won', { score: state.score, rounds: STAGES.length });
          } else {
            state.roundIndex++;
            loadRound();
            emit('round-start', { round: state.roundIndex + 1, name: stage().name });
          }
        }
      }
    }

    function advance(seconds, input = {}) {
      if (!Number.isFinite(seconds) || seconds <= 0 || state.status !== 'playing') return view();
      accumulator += Math.min(seconds, 0.25);
      const controls = { move: input.move };
      while (accumulator + 1e-10 >= STEP && state.status === 'playing') {
        step(controls);
        accumulator = Math.max(0, accumulator - STEP);
      }
      return view();
    }

    function drain() { return events.splice(0); }
    function view() {
      const current = stage();
      return {
        ...copy(state),
        round: state.roundIndex + 1,
        roundCount: STAGES.length,
        stage: { id: current.id, name: current.name, theme: current.theme },
        world: { width: WIDTH, height: HEIGHT, groundY: GROUND_Y },
        platforms: copy(current.platforms),
        enemies: state.enemies.map(e => ({ ...copy(e), y: surfaceY(e.platform) - e.size, centerY: enemyCenterY(e) })),
        bubbles: copy(state.bubbles),
        enemiesRemaining: state.enemies.filter(e => e.mode !== 'dead').length,
        attackReady: state.attackCooldown <= 0,
        maxLives: MAX_LIVES
      };
    }

    function replay() { return state.status === 'playing' ? null : create(); }
    return { advance, act, drain, view, replay };
  }

  return Object.freeze({ VERSION, WIDTH, HEIGHT, GROUND_Y, STEP, MAX_LIVES, STAGES: copy(STAGES), enemyIntent, create });
});

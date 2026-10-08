const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/mam-chop-model.js');

test('the authored stage, patrols, and input replay deterministically', () => {
  const a = M.create(), b = M.create();
  assert.equal(a.status, 'playing');
  assert.ok(M.PLATFORMS.some(p => p.kind === 'ground' && p.x > 0));
  assert.ok(M.PLATFORMS.some(p => p.kind === 'ledge'));
  for (const state of [a, b]) {
    M.setButton(state, 'right', true); M.stepTicks(state, 25); M.setButton(state, 'right', false);
    M.setButton(state, 'jump', true); M.stepTicks(state, 12); M.setButton(state, 'jump', false);
    M.setButton(state, 'fire', true); M.stepTicks(state, 9); M.setButton(state, 'fire', false);
    M.stepTicks(state, 20);
  }
  assert.deepEqual(M.view(a), M.view(b));
  assert.ok(Math.abs(a.player.x - (66 + 25 * 3.35)) < 1e-9);
  assert.ok(a.player.y < 428, 'jump arc is still in flight after twelve ticks');
  assert.ok(a.shots.some(shot => shot.kind === 'normal'));
});

test('jump buffer fires on landing and coyote time forgives a late platform-edge press', () => {
  const buffered = M.create();
  buffered.enemies.forEach(enemy => { enemy.alive = false; });
  buffered.player.x = 100; buffered.player.y = 420; buffered.player.vy = 8;
  buffered.player.grounded = false; buffered.player.coyoteTicks = 0;
  M.setButton(buffered, 'jump', true);
  M.tick(buffered);
  assert.equal(buffered.player.grounded, true, 'the descending player lands before the grace window ends');
  M.setButton(buffered, 'jump', false);
  const landedJump = M.tick(buffered);
  assert.ok(landedJump.some(event => event.kind === 'jump'), 'the buffered tap jumps on landing');
  assert.ok(buffered.player.vy < 0);

  const edge = M.create();
  edge.enemies.forEach(enemy => { enemy.alive = false; });
  const floor = M.STAGES[0].platforms.find(platform => platform.kind === 'ground');
  edge.player.x = floor.x + floor.w - 3;
  edge.player.y = floor.y - edge.player.h; edge.player.grounded = true;
  M.setButton(edge, 'right', true); M.tick(edge);
  assert.equal(edge.player.grounded, false, 'the horizontal step leaves the ledge');
  assert.ok(edge.player.coyoteTicks > 0);
  M.setButton(edge, 'jump', true);
  assert.ok(M.tick(edge).some(event => event.kind === 'jump'), 'a late press still jumps briefly after leaving the ledge');
  assert.ok(edge.player.vy < 0);
});

test('restoring older snapshots defaults transient jump grace and cancels all input safely', () => {
  const current = M.create();
  const snapshot = M.serialize(current);
  delete snapshot.state.player.coyoteTicks;
  delete snapshot.state.player.jumpBufferTicks;
  const restored = M.restore(snapshot);
  assert.ok(restored);
  assert.equal(restored.player.coyoteTicks, M.COYOTE_TICKS);
  assert.equal(restored.player.jumpBufferTicks, 0);
  for (const button of ['left', 'right', 'jump', 'fire']) M.setButton(restored, button, true);
  assert.equal(M.cancelInputs(restored), true);
  assert.equal(restored.shots.length, 0, 'cancelling a held charge does not fire it');
  assert.ok(Object.values(restored.input).every(value => value === false || value === 0));
});

test('a short tap fires one seed and clears a crawler on a visible lane', () => {
  const s = M.create(); s.player.x = 200;
  M.setButton(s, 'fire', true); M.setButton(s, 'fire', false);
  assert.equal(s.shots.length, 1); assert.equal(s.shots[0].kind, 'normal');
  const events = M.stepTicks(s, 25);
  assert.ok(events.some(event => event.kind === 'enemy-cleared' && event.enemy === 'pebble-a'));
  assert.equal(s.enemies.find(enemy => enemy.id === 'pebble-a').alive, false);
});

test('holding the shot button produces one stronger charge shot; release does not double fire', () => {
  const s = M.create(); s.player.x = 200; s.player.face = -1;
  M.setButton(s, 'fire', true);
  const events = M.stepTicks(s, M.CHARGE_TICKS);
  assert.equal(events.filter(event => event.kind === 'charge-shot').length, 1);
  assert.equal(s.shots.filter(shot => shot.kind === 'charged').length, 1);
  M.setButton(s, 'fire', false);
  assert.equal(s.shots.filter(shot => shot.kind === 'charged').length, 1);
  assert.equal(s.shots.filter(shot => shot.kind === 'normal').length, 0);
});

test('a crawler patrol remains inside its authored bounds and the sentry telegraphs before firing', () => {
  const s = M.create(), crawler = s.enemies[0];
  M.stepTicks(s, 150);
  assert.ok(crawler.x >= crawler.min && crawler.x <= crawler.max);
  assert.notEqual(crawler.dir, -1, 'the edge turns the crawler around');

  const sentry = s.enemies.find(enemy => enemy.type === 'sentry');
  s.player.x = 2100; s.player.y = 428; s.player.vy = 0; s.player.grounded = true;
  sentry.shotIn = 1;
  let events = M.stepTicks(s, 1);
  assert.ok(events.some(event => event.kind === 'enemy-warning' && event.ticks === 30));
  assert.equal(s.shots.some(shot => shot.team === 'enemy'), false);
  events = M.stepTicks(s, 29);
  assert.equal(events.some(event => event.kind === 'enemy-shot'), false);
  events = M.stepTicks(s, 1);
  assert.ok(events.some(event => event.kind === 'enemy-shot'));
  assert.ok(s.shots.some(shot => shot.team === 'enemy'));
});

test('contact costs one heart, invulnerability prevents rapid repeat hits, and falling respawns at the last marker', () => {
  const s = M.create(), crawler = s.enemies[0];
  s.player.x = crawler.x; s.player.y = crawler.y + crawler.h - s.player.h;
  M.stepTicks(s, 1);
  assert.equal(s.player.health, 3);
  M.stepTicks(s, 10);
  assert.equal(s.player.health, 3);
  s.player.checkpoint = 1; s.player.y = M.VIEW_H + 60;
  const events = M.stepTicks(s, 1);
  assert.equal(s.player.health, 2);
  assert.equal(s.player.x, M.CHECKPOINTS[1] + 42);
  assert.ok(events.some(event => event.kind === 'checkpoint-respawn'));
});

test('the last fall ends cleanly and releases every held control', () => {
  const s = M.create();
  s.player.health = 1; s.player.y = M.VIEW_H + 60;
  for (const button of ['left', 'right', 'jump', 'fire']) M.setButton(s, button, true);
  M.stepTicks(s, 1);
  assert.equal(s.status, 'lost');
  assert.deepEqual(s.input, { left: false, right: false, jump: false, fire: false,
    jumpEdge: false, chargeTicks: 0, fireShot: false });
});

test('the run reaches a clear or a loss and a fresh run restores its health and stage', () => {
  const clear = M.create(); clear.player.x = M.WORLD_W - 40;
  M.stepTicks(clear, 1);
  assert.equal(clear.status, 'won');
  assert.ok(clear.events.some(event => event.kind === 'stage-clear'));

  const lost = M.create(), crawler = lost.enemies[0];
  lost.player.health = 1; lost.player.x = crawler.x; lost.player.y = crawler.y + crawler.h - lost.player.h;
  M.stepTicks(lost, 1);
  assert.equal(lost.status, 'lost');
  assert.equal(M.create().player.health, 4);
  assert.equal(M.create().status, 'playing');
});

test('elapsed-time stepping is fixed-step and rejects invalid elapsed time', () => {
  const a = M.create(), b = M.create();
  assert.deepEqual(M.advance(a, 40), [...M.tick(b), ...M.tick(b)]);
  assert.equal(a.tick, b.tick);
  assert.deepEqual(M.advance(a, -10), []);
  assert.deepEqual(M.advance(a, Number.NaN), []);
});

test('every authored ground gap has a deterministic safe jump or platform landing', () => {
  assert.equal(M.STAGES.length, 3);
  assert.equal(new Set(M.STAGES.map(stage => stage.id)).size, 3);
  for (let index = 0; index < M.STAGES.length; index++) {
    const stage = M.STAGES[index], grounds = stage.platforms.filter(p => p.kind === 'ground').slice().sort((a, b) => a.x - b.x);
    assert.ok(stage.exitX < stage.worldWidth);
    for (const checkpoint of stage.checkpoints) {
      assert.ok(grounds.some(platform => checkpoint + 42 >= platform.x && checkpoint + 42 < platform.x + platform.w), stage.id + ' checkpoint has floor');
    }
    for (let n = 1; n < grounds.length; n++) {
      const gap = grounds[n].x - (grounds[n - 1].x + grounds[n - 1].w);
      assert.ok(gap >= 0 && gap <= 100, stage.id + ' ground gap ' + gap + ' is within the measured jump allowance');
      if (!gap) continue;
      const game = M.create(index, { unlockedStage: index });
      game.enemies.forEach(enemy => { enemy.alive = false; });
      const left = grounds[n - 1], right = grounds[n], player = game.player;
      player.x = left.x + left.w - player.w - 5;
      player.y = left.y - player.h; player.vy = 0; player.grounded = true;
      M.setButton(game, 'right', true); M.setButton(game, 'jump', true); M.tick(game);
      M.setButton(game, 'jump', false);
      let landedAcrossGap = false;
      for (let tick = 0; tick < 60; tick++) {
        M.tick(game);
        if (player.grounded && player.x + player.w >= right.x && player.y + player.h <= right.y) {
          landedAcrossGap = true; break;
        }
      }
      assert.ok(landedAcrossGap, stage.id + ' gap before x=' + right.x + ' remains reachable');
      assert.equal(game.status, 'playing', stage.id + ' gap does not cause a softlock');
      assert.equal(player.health, M.MAX_HEALTH, stage.id + ' gap does not damage the player');
    }
  }
});

test('campaign unlocks one stage at a time and replay keeps stage records', () => {
  const game = M.create();
  assert.equal(game.unlockedStage, 0);
  assert.equal(M.selectStage(game, 1), false);
  game.player.x = M.STAGES[0].exitX - game.player.w - 1;
  M.setButton(game, 'right', true);
  const cleared = M.tick(game);
  assert.equal(game.status, 'won');
  assert.ok(cleared.some(event => event.kind === 'stage-clear'));
  assert.equal(game.unlockedStage, 1);
  assert.equal(game.bestTicks[0], 1);
  assert.equal(M.nextStage(game), true);
  assert.equal(game.stageIndex, 1);
  assert.equal(game.player.health, M.MAX_HEALTH);
  assert.equal(M.selectStage(game, 2), false);
  assert.equal(M.restart(game), true);
  assert.equal(game.stageIndex, 1);
  assert.equal(game.unlockedStage, 1);
  assert.equal(game.bestTicks[0], 1);
  assert.equal(M.selectStage(game, 0), true);
});

test('warning vents give a deterministic dodge window and respawn at the stage-specific marker', () => {
  const game = M.create(1, { unlockedStage: 1 }), hazard = M.STAGES[1].hazards[0];
  game.enemies.forEach(enemy => { enemy.alive = false; });
  game.player.x = hazard.x; game.player.y = 468 - game.player.h; game.player.vy = 0; game.player.grounded = true;
  game.tick = hazard.period - hazard.warningTicks - hazard.offset - 1;
  const warning = M.tick(game);
  assert.ok(warning.some(event => event.kind === 'hazard-warning' && event.hazard === hazard.id));
  assert.equal(M.view(game).hazards[0].state, 'warning');
  const activeEvents = M.stepTicks(game, hazard.warningTicks);
  assert.ok(activeEvents.some(event => event.kind === 'player-hit'));
  assert.equal(game.player.health, 3);
  M.stepTicks(game, 20);
  assert.equal(game.player.health, 3, 'the invulnerability window prevents repeated damage');

  game.player.checkpoint = 1; game.player.y = M.VIEW_H + 60;
  const respawn = M.tick(game);
  assert.equal(game.player.health, 2);
  assert.equal(game.player.x, M.STAGES[1].checkpoints[1] + 42);
  assert.ok(respawn.some(event => event.kind === 'checkpoint-respawn'));
});

test('the last stage telegraphs its guardian, opens a weak point, and blocks the exit until defeat', () => {
  const game = M.create(2, { unlockedStage: 2 }), stage = M.STAGES[2];
  const boss = game.enemies.find(enemy => enemy.type === 'guardian');
  game.enemies.filter(enemy => enemy !== boss).forEach(enemy => { enemy.alive = false; });
  game.player.x = boss.x - 110; game.player.y = 468 - game.player.h; game.player.vy = 0; game.player.grounded = true;

  const armoredHp = boss.hp;
  M.setButton(game, 'fire', true); M.setButton(game, 'fire', false);
  M.stepTicks(game, 12);
  assert.equal(boss.hp, armoredHp, 'the shut shell rejects seed shots');
  game.shots = [];

  boss.attackAfter = 1;
  const warning = M.tick(game);
  assert.ok(warning.some(event => event.kind === 'guardian-warning' && event.ticks === 44));
  const opening = M.stepTicks(game, 44);
  assert.ok(opening.some(event => event.kind === 'guardian-open'));
  assert.equal(boss.state, 'open');
  assert.equal(game.shots.filter(shot => shot.team === 'enemy').length, 3);
  game.shots = [];

  game.player.x = stage.exitX - game.player.w - 2;
  M.setButton(game, 'right', true);
  const blocked = M.tick(game); M.setButton(game, 'right', false);
  assert.ok(blocked.some(event => event.kind === 'exit-blocked'));
  assert.ok(game.player.x + game.player.w < stage.exitX, 'the guardian keeps the final gate closed');
  game.player.x = boss.x - 110;

  let defeatEvents = [];
  for (let hit = 0; hit < 3; hit++) {
    boss.state = 'open'; boss.openTicks = 105;
    M.setButton(game, 'fire', true); M.stepTicks(game, M.CHARGE_TICKS); M.setButton(game, 'fire', false);
    defeatEvents.push(...M.stepTicks(game, 12));
  }
  assert.equal(boss.alive, false);
  assert.ok(defeatEvents.some(event => event.kind === 'guardian-defeated'));
  game.player.x = stage.exitX - game.player.w - 2;
  M.setButton(game, 'right', true); M.tick(game); M.setButton(game, 'right', false);
  assert.equal(game.status, 'won');
  assert.equal(game.unlockedStage, 2);
});

test('versioned local snapshot resumes an exact stage, validates corruption, and clears held keys', () => {
  const game = M.create(1, { unlockedStage: 2, bestTicks: [120, null, 900] });
  game.player.x = 1000; game.player.checkpoint = 1; M.setButton(game, 'right', true);
  M.setButton(game, 'fire', true); M.stepTicks(game, 7);
  const snapshot = M.serialize(game), resumed = M.restore(snapshot);
  assert.ok(resumed);
  assert.equal(resumed.stageIndex, 1);
  assert.equal(resumed.unlockedStage, 2);
  assert.deepEqual(resumed.bestTicks, [120, null, 900]);
  assert.equal(resumed.player.x, game.player.x);
  assert.equal(resumed.input.right, false);
  assert.equal(resumed.input.fire, false);
  assert.equal(resumed.input.chargeTicks, 0);
  assert.deepEqual(M.view(resumed), { ...M.view(game), charging: false, charge: 0 });
  assert.equal(M.restore({ ...snapshot, version: 999 }), null);
  assert.equal(M.restore({ ...snapshot, state: { ...snapshot.state, stageId: 'wrong-stage' } }), null);
  assert.equal(M.restore({ ...snapshot, bestTicks: [1, -1, 2] }), null);
  assert.equal(M.restore(null), null);
});

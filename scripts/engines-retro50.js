/* NewPlayground retro engine pack. These are local prototypes and legacy engines;
 * they do not claim reference parity or release completeness.
 */

(function () {
  'use strict';

  // --- AUDIO PROXIES ---
  const Audio = window.NP_Audio || {
    tone: () => {},
    explosion: () => {},
    hit: () => {},
    crunch: () => {},
    pop: () => {},
    coin: () => {},
    powerup: () => {},
    whoosh: () => {},
    thud: () => {},
    laser: () => {},
    alarm: () => {},
    win: () => {}
  };

  const Juice = window.NP_Juice || {
    createCameraShake: () => ({ trauma: 0, addTrauma: () => {}, getOffset: () => ({ x: 0, y: 0 }) }),
    screenShake: () => {},
    triggerHitstop: () => {},
    isFrozen: () => false,
    createPopupManager: () => ({ add: () => {}, updateAndDraw: () => {}, clear: () => {} }),
    createParticleSystem: () => ({ spawn: () => {}, updateAndDraw: () => {} })
  };

  function playSfx(type, ...args) {
    if (window.NEWPLAYGROUND_MUTED) return;
    try {
      if (typeof Audio[type] === 'function') {
        Audio[type](...args);
      } else if (typeof Audio.tone === 'function') {
        Audio.tone(440, 'triangle', 0.1);
      }
    } catch (e) {}
  }

  // =========================================================================
  // 1. BOOM ONLINE (BnB / CRAZY ARCADE) - ĐẦY ĐỦ 3 MÀN, THÚ CƯỠI, TRÙM CUỐI
  // =========================================================================
  // Original local bubble-arena candidate for the historical catalog route.
  function launchDauTruongNuoc(container, game) {
    const engine = window.NP_TidegridArena;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Đấu Trường Bọt Nước chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start());
  }

  function launchNhipMay(container, game) {
    if (!window.NP_NhipMay || !window.NP_GameSession) throw new Error('Nhịp Mây chưa sẵn sàng');
    const title = document.getElementById('modalGameTitle');
    if (title) title.textContent = 'Nhịp Mây';
    return window.NP_NhipMay.mount(container, window.NP_GameSession.start());
  }

  // =========================================================================
  // 3. ROAD RASH - 3 CHẶNG ĐUA, VŨ KHÍ, CẢNH SÁT, NITRO BOOST
  // =========================================================================
  // Original short race for the historical motorcycle-combat catalog route.
  function launchDuaGio(container, game) {
    const engine = window.NP_RoadDuel;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Đua Gió chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
  }

  function launchMamChop(container, game) {
    const engine = window.NP_MamChop;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Mầm Chớp chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
  }

  function launchMucTieuBay(container, game) {
    const engine = window.NP_BanVitBay;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Mục Tiêu Bay chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start());
  }

  // Deterministic, original Vietnamese 1v1 fighter. Only the broad duel loop is shared.
  const StreetDuelModel = (() => {
    const WIDTH = 900, FLOOR = 350, ROUND_MS = 45000;
    const MOVES = {
      punch: { name: 'Chớp Đòn', startup: 105, active: 80, recovery: 245, range: 76, damage: 8, push: 14 },
      kick: { name: 'Quét Mây', startup: 190, active: 95, recovery: 340, range: 112, damage: 13, push: 23 },
      special: { name: 'Vân Bộ', startup: 430, active: 105, recovery: 510, range: 166, damage: 20, push: 42 }
    };
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const clone = x => JSON.parse(JSON.stringify(x));
    const makeFighter = side => ({ side, x: side ? 645 : 255, y: 0, vy: 0, grounded: true, hp: 100, facing: side ? -1 : 1, guarding: false, action: null, hitFlashMs: 0 });
    function create(options = {}) {
      let seed = (Number(options.seed) >>> 0) || 0x4e41594c;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      let state, events = [], cpu = { ms: 0, move: 0, guard: false, attack: null };
      function startRound(n) {
        state.round = n; state.timeMs = ROUND_MS; state.status = 'playing'; state.message = n === 1 ? 'VÀO TRẬN!' : `HIỆP ${n}`;
        state.intermissionMs = 0; state.fighters = [makeFighter(0), makeFighter(1)]; cpu = { ms: 0, move: 0, guard: false, attack: null };
      }
      function reset(mode = state?.mode || 'cpu') {
        state = { mode: mode === 'local' ? 'local' : 'cpu', round: 1, wins: [0, 0], status: 'playing', timeMs: ROUND_MS, intermissionMs: 0, message: '', fighters: [] };
        startRound(1);
      }
      function attack(actor, kind) {
        if (!MOVES[kind] || actor.action) return;
        actor.guarding = false; actor.action = { kind, elapsed: 0, hit: false, dashed: false };
        events.push({ type: 'windup', side: actor.side, move: kind });
      }
      function hit(from, to, move) {
        const gap = (to.x - from.x) * from.facing;
        if (gap < -8 || gap > move.range || Math.abs(from.y - to.y) > 62) return;
        const blocked = to.guarding && to.facing === -from.facing;
        const damage = blocked ? Math.max(1, Math.ceil(move.damage * .22)) : move.damage;
        to.hp = Math.max(0, to.hp - damage); to.hitFlashMs = 130;
        to.x = clamp(to.x + from.facing * (blocked ? 7 : move.push), 65, WIDTH - 65);
        events.push({ type: blocked ? 'block' : 'hit', side: from.side, move: from.action.kind, damage });
      }
      function cpuInput(dt) {
        const a = state.fighters[0], b = state.fighters[1], gap = Math.abs(a.x - b.x);
        cpu.ms -= dt;
        if (cpu.ms <= 0) {
          cpu = { ms: 200 + random() * 150, move: 0, guard: false, attack: null };
          const warning = a.action && a.action.elapsed < MOVES[a.action.kind].startup;
          if (warning && gap < 150 && random() < .6) { cpu.guard = true; cpu.ms = 220; }
          else if (gap > 125) cpu.move = a.x < b.x ? -1 : 1;
          else if (!b.action) { const r = random(); cpu.attack = gap > 90 && r < .16 ? 'special' : r < .59 ? 'punch' : 'kick'; }
          else if (random() < .25) cpu.guard = true;
        }
        const attackKind = cpu.attack; cpu.attack = null;
        return { move: cpu.move, guard: cpu.guard, attack: attackKind };
      }
      function actorStep(a, b, input, dt) {
        a.facing = b.x >= a.x ? 1 : -1; a.hitFlashMs = Math.max(0, a.hitFlashMs - dt);
        a.guarding = !!input.guard && !a.action && a.grounded;
        if (!a.action) {
          if (input.jump && a.grounded) { a.vy = -470; a.grounded = false; events.push({ type: 'jump', side: a.side }); }
          if (!a.guarding) a.x = clamp(a.x + clamp(Number(input.move) || 0, -1, 1) * 235 * dt / 1000, 65, WIDTH - 65);
          if (input.attack) attack(a, input.attack);
        }
        if (!a.grounded) { a.vy += 1250 * dt / 1000; a.y += a.vy * dt / 1000; if (a.y >= 0) { a.y = 0; a.vy = 0; a.grounded = true; } }
        if (!a.action) return;
        const act = a.action, move = MOVES[act.kind], before = act.elapsed; act.elapsed += dt;
        if (act.kind === 'special' && !act.dashed && before < move.startup && act.elapsed >= move.startup) {
          a.x = clamp(a.x + a.facing * 54, 65, WIDTH - 65); act.dashed = true; events.push({ type: 'dash', side: a.side });
        }
        if (!act.hit && act.elapsed >= move.startup && act.elapsed < move.startup + move.active + dt) { act.hit = true; hit(a, b, move); }
        if (act.elapsed >= move.startup + move.active + move.recovery) a.action = null;
      }
      function endRound() {
        const [a, b] = state.fighters, winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
        if (winner >= 0) state.wins[winner]++;
        state.status = state.wins.some(n => n >= 2) ? 'matchOver' : 'intermission';
        state.message = winner < 0 ? 'HÒA HIỆP' : winner === 0 ? 'LINH THẮNG HIỆP!' : 'BẢO THẮNG HIỆP!'; state.intermissionMs = 1500;
        events.push({ type: 'roundEnd', winner });
      }
      reset(options.mode);
      return {
        step(dt = 16, input = {}) {
          events = []; dt = clamp(Number(dt) || 0, 0, 50);
          if (state.status === 'intermission') { state.intermissionMs -= dt; if (state.intermissionMs <= 0) startRound(state.round + 1); return { view: this.view(), events: [] }; }
          if (state.status !== 'playing') return { view: this.view(), events: [] };
          const left = input.p1 || {}, right = state.mode === 'cpu' ? cpuInput(dt) : (input.p2 || {});
          if (!state.fighters[0].action) state.fighters[0].guarding = !!left.guard && state.fighters[0].grounded;
          if (!state.fighters[1].action) state.fighters[1].guarding = !!right.guard && state.fighters[1].grounded;
          actorStep(state.fighters[0], state.fighters[1], left, dt); actorStep(state.fighters[1], state.fighters[0], right, dt);
          state.timeMs = Math.max(0, state.timeMs - dt);
          if (state.fighters.some(f => f.hp <= 0) || !state.timeMs) endRound();
          return { view: this.view(), events: events.slice() };
        },
        reset(mode = state.mode) { reset(mode); return this.view(); },
        view() { return clone({ ...state, timeSeconds: Math.ceil(state.timeMs / 1000), fighters: state.fighters.map(f => ({ ...f, action: f.action && { ...f.action } })) }); }
      };
    }
    return { create, MOVES, WIDTH, FLOOR, ROUND_MS };
  })();
  window.NP_StreetDuelModel = StreetDuelModel;

  function launchStreetFighter(container, game) {
    const session = window.NP_GameSession.start();
    const { requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = session;
    const W = StreetDuelModel.WIDTH, H = 440, F = StreetDuelModel.FLOOR;
    const title = document.getElementById('modalGameTitle'); if (title) title.textContent = 'Nảy Lửa';
    container.innerHTML = `<section class="nd-game" aria-label="Nảy Lửa, game đối kháng hai người">
      <style>
      .nd-game{font-family:Calibri,Inter,-apple-system,sans-serif;color:#f7f2e8;background:#111827;padding:12px;border-radius:14px}.nd-game *{box-sizing:border-box}
      .nd-top{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:900px;margin:0 auto 8px}.nd-brand{font-size:clamp(18px,3vw,26px);font-weight:900;color:#f9c784;letter-spacing:.04em}.nd-mode{min-height:44px;padding:8px 14px;border:1px solid #64748b;border-radius:10px;background:#253247;color:#fff;font:700 14px Calibri,Inter,sans-serif}
      .nd-hud{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;max-width:900px;margin:0 auto 8px}.nd-player{text-align:left}.nd-player.right{text-align:right}.nd-name{font-weight:800}.nd-bar{height:16px;border:2px solid #f5e8ca;border-radius:9px;background:#3c2730;overflow:hidden;margin-top:4px}.nd-fill{height:100%;width:100%;background:linear-gradient(90deg,#eaa348,#ffdc79)}.nd-player.right .nd-fill{margin-left:auto;background:linear-gradient(90deg,#55b8b1,#a6e3c4)}
      .nd-center{min-width:112px;text-align:center}.nd-clock{font-size:22px;font-weight:900;color:#f9c784;font-variant-numeric:tabular-nums}.nd-score{font-size:12px;color:#d6dce6;letter-spacing:.1em}.nd-stage{display:block;width:min(100%,900px);height:auto;aspect-ratio:45/22;margin:0 auto;border:1px solid #64748b;border-radius:12px;background:#192638;touch-action:none}
      .nd-help{max-width:900px;margin:8px auto 0;color:#cbd5e1;font-size:13px;line-height:1.4;text-align:center}.nd-help strong{color:#f9c784}.nd-touch{display:grid;grid-template-columns:repeat(4,minmax(44px,1fr));gap:6px;max-width:900px;margin:10px auto 0}.nd-touch button{min-height:46px;border:1px solid #607083;border-radius:10px;background:#233247;color:#fff;font:700 13px Calibri,Inter,sans-serif;touch-action:none}.nd-touch .nd-attack{background:#8c4d37}.nd-result{max-width:900px;margin:8px auto 0;text-align:center;color:#ffe0a1;font-weight:800;min-height:22px}
      @media(min-width:760px){.nd-touch{grid-template-columns:repeat(7,84px);justify-content:center}.nd-help{font-size:14px}}@media(prefers-reduced-motion:reduce){.nd-fill{transition:none}}
      </style>
      <div class="nd-top"><div class="nd-brand">NẢY LỬA</div><button class="nd-mode" id="ndMode" type="button" aria-label="Đổi chế độ đấu" aria-pressed="false">Đang đấu với máy · đổi sang 2 người</button></div>
      <div class="nd-hud" aria-live="polite"><div class="nd-player"><div class="nd-name">LINH · P1</div><div class="nd-bar" role="progressbar" aria-label="Máu Linh" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="nd-fill" id="ndLeftHp"></div></div></div>
      <div class="nd-center"><div class="nd-clock" id="ndClock">45</div><div class="nd-score" id="ndScore">HIỆP 1 · 0 — 0</div></div><div class="nd-player right"><div class="nd-name" id="ndRightName">BẢO · MÁY</div><div class="nd-bar" role="progressbar" aria-label="Máu Bảo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="nd-fill" id="ndRightHp"></div></div></div></div>
      <canvas class="nd-stage" id="ndStage" width="900" height="440" aria-label="Sàn đấu mái ngói bên sông lúc hoàng hôn"></canvas><div class="nd-result" id="ndResult" aria-live="off">Vào trận: đấm, đá hoặc áp sát bằng Vân Bộ.</div><p class="np-game-sr" id="ndLive" role="status" aria-live="polite" aria-atomic="true">Vào trận.</p><div style="text-align:center"><button class="nd-mode" id="ndReplay" type="button" hidden>Chơi lại</button></div>
      <div class="nd-help"><strong>P1:</strong> A/D đi · W nhảy · S đỡ · J đấm · K đá · L Vân Bộ <span id="ndP2Help" hidden>　<strong>P2:</strong> ←/→ đi · ↑ nhảy · ↓ đỡ · 1/2/3 ra đòn</span></div>
      <div class="nd-touch" aria-label="Nút điều khiển cảm ứng"><button type="button" data-nd-hold="left" aria-label="Đi trái">◀</button><button type="button" data-nd-hold="right" aria-label="Đi phải">▶</button><button type="button" data-nd-hold="jump" aria-label="Nhảy">NHẢY</button><button type="button" data-nd-hold="guard" aria-label="Đỡ">ĐỠ</button><button type="button" class="nd-attack" data-nd-tap="punch">ĐẤM</button><button type="button" class="nd-attack" data-nd-tap="kick">ĐÁ</button><button type="button" class="nd-attack" data-nd-tap="special">VÂN BỘ</button></div></section>`;
    const $ = s => container.querySelector(s), canvas = $('#ndStage'), ctx = canvas.getContext('2d');
    const model = StreetDuelModel.create({ mode: 'cpu', seed: 20261008 });
    let keys = new Set(), taps = [{}, {}], lastTime = 0, frame = null, audio = null, muted = false, flash = 0, hitText = '';
    const heldTouch = { left: false, right: false, guard: false };
    const keyMap = { KeyA:[0,'left'],KeyD:[0,'right'],KeyW:[0,'jump'],KeyS:[0,'guard'],KeyJ:[0,'punch'],KeyK:[0,'kick'],KeyL:[0,'special'],ArrowLeft:[1,'left'],ArrowRight:[1,'right'],ArrowUp:[1,'jump'],ArrowDown:[1,'guard'],Digit1:[1,'punch'],Digit2:[1,'kick'],Digit3:[1,'special'] };
    function sound(kind) {
      if (muted || window.NEWPLAYGROUND_MUTED) return;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { audio ||= new AC(); if (audio.state === 'suspended') audio.resume(); const now = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
        osc.type = kind === 'hit' ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(kind === 'hit' ? 125 : kind === 'special' ? 390 : 205, now); if (kind === 'special') osc.frequency.exponentialRampToValueAtTime(95, now + .18);
        gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(kind==='hit'?.12:.055,now+.012); gain.gain.exponentialRampToValueAtTime(.0001,now+.2); osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now+.21);
      } catch (_) {}
    }
    function background() {
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#283a5a');sky.addColorStop(.58,'#9b6570');sky.addColorStop(1,'#e6a974');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,225,165,.8)';ctx.beginPath();ctx.arc(720,105,42,0,Math.PI*2);ctx.fill();
      for(let i=0;i<12;i++){const x=i*86-8,bh=72+(i*41%92);ctx.fillStyle=i%2?'#344153':'#3b4554';ctx.fillRect(x,F-bh-30,58,bh);ctx.fillStyle='rgba(248,203,140,.55)';for(let y=F-bh-18;y<F-38;y+=22)for(let wx=x+9;wx<x+50;wx+=18)ctx.fillRect(wx,y,5,8);}
      ctx.fillStyle='#493a46';ctx.fillRect(0,F-25,W,25);ctx.fillStyle='#b57b5c';ctx.beginPath();ctx.moveTo(0,F-55);ctx.lineTo(185,F-95);ctx.lineTo(360,F-55);ctx.lineTo(540,F-91);ctx.lineTo(735,F-55);ctx.lineTo(W,F-81);ctx.lineTo(W,F-25);ctx.lineTo(0,F-25);ctx.fill();
      ctx.strokeStyle='rgba(255,218,165,.34)';ctx.lineWidth=3;for(let x=-20;x<W;x+=34){ctx.beginPath();ctx.moveTo(x,F-54);ctx.lineTo(x+17,F-30);ctx.stroke();}
      ctx.fillStyle='#342b37';ctx.fillRect(0,F,W,H-F);ctx.strokeStyle='rgba(232,185,133,.35)';ctx.lineWidth=2;for(let x=0;x<W;x+=90){ctx.beginPath();ctx.moveTo(x,F);ctx.lineTo(x-34,H);ctx.stroke();}for(let y=F+22;y<H;y+=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.fillStyle='#e7be82';ctx.fillRect(0,F-3,W,4);
    }
    function fighter(actor,index) {
      const x=actor.x,base=F+actor.y,face=actor.facing,kind=actor.action?.kind,act=actor.action,move=kind?StreetDuelModel.MOVES[kind]:null,warning=!!act&&act.elapsed<move.startup,active=!!act&&act.elapsed>=move.startup&&act.elapsed<move.startup+move.active;
      ctx.save();ctx.translate(x,base);ctx.scale(face,1);ctx.fillStyle='rgba(10,14,24,.38)';ctx.beginPath();ctx.ellipse(-2,1,actor.grounded?34:24,8,0,0,Math.PI*2);ctx.fill();
      if(warning){ctx.strokeStyle=kind==='special'?'rgba(255,222,133,.9)':'rgba(255,255,255,.65)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(27,-38,kind==='special'?39:26,47,0,-1.05,1.05);ctx.stroke();}
      const coat=index?'#247d80':'#b94e37',trim=index?'#f0d89f':'#f3be72',pants=index?'#e7d6bd':'#253449';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=12;ctx.strokeStyle=pants;
      ctx.beginPath();ctx.moveTo(-8,-34);ctx.lineTo(-16,-15);ctx.lineTo(-23,-1);ctx.stroke();ctx.beginPath();ctx.moveTo(8,-34);ctx.lineTo(15,-14);ctx.lineTo(20,-1);ctx.stroke();ctx.fillStyle='#171b27';ctx.beginPath();ctx.ellipse(-25,-1,13,5,-.12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(22,-1,13,5,.08,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(-19,-72);ctx.quadraticCurveTo(0,-80,19,-69);ctx.lineTo(15,-33);ctx.quadraticCurveTo(0,-25,-16,-34);ctx.closePath();ctx.fill();ctx.strokeStyle=trim;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(2,-74);ctx.lineTo(1,-37);ctx.stroke();ctx.fillStyle=trim;ctx.fillRect(-14,-39,28,5);ctx.strokeStyle=coat;ctx.lineWidth=10;
      if(actor.guarding){ctx.beginPath();ctx.moveTo(9,-62);ctx.lineTo(29,-66);ctx.lineTo(35,-54);ctx.stroke();ctx.beginPath();ctx.moveTo(-8,-60);ctx.lineTo(11,-53);ctx.stroke();}
      else if(active&&kind==='kick'){ctx.beginPath();ctx.moveTo(10,-56);ctx.lineTo(27,-52);ctx.stroke();ctx.strokeStyle=pants;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(12,-33);ctx.lineTo(34,-48);ctx.lineTo(61,-50);ctx.stroke();}
      else if(active){ctx.beginPath();ctx.moveTo(10,-58);ctx.lineTo(34,-54);ctx.lineTo(kind==='special'?60:47,-48);ctx.stroke();ctx.strokeStyle=trim;ctx.lineWidth=9;ctx.beginPath();ctx.arc(kind==='special'?64:50,-48,7,0,Math.PI*2);ctx.stroke();}
      else{ctx.beginPath();ctx.moveTo(11,-59);ctx.lineTo(25,-49);ctx.lineTo(31,-40);ctx.stroke();ctx.beginPath();ctx.moveTo(-10,-59);ctx.lineTo(-27,-50);ctx.lineTo(-31,-42);ctx.stroke();}
      ctx.fillStyle=index?'#dca985':'#efc39c';ctx.beginPath();ctx.arc(0,-88,16,0,Math.PI*2);ctx.fill();ctx.fillStyle=index?'#3d2d2a':'#1d2535';ctx.beginPath();ctx.arc(-1,-94,16,Math.PI,Math.PI*2);ctx.lineTo(14,-89);ctx.quadraticCurveTo(-2,-95,-16,-85);ctx.fill();ctx.fillStyle='#202433';ctx.beginPath();ctx.arc(14,-89,2,0,Math.PI*2);ctx.fill();
      if(actor.hitFlashMs>0){ctx.fillStyle='rgba(255,250,215,.52)';ctx.beginPath();ctx.arc(0,-57,37,0,Math.PI*2);ctx.fill();}ctx.restore();
      if(active){ctx.fillStyle=kind==='special'?'rgba(255,211,111,.9)':'rgba(253,238,196,.8)';ctx.beginPath();ctx.arc(x+face*(kind==='special'?66:50),base-52,kind==='special'?9:5,0,Math.PI*2);ctx.fill();}
    }
    function render(view) {
      background();fighter(view.fighters[0],0);fighter(view.fighters[1],1);
      if(flash>0){ctx.fillStyle=`rgba(255,236,187,${Math.min(.22,flash/90)})`;ctx.fillRect(0,0,W,H);flash=Math.max(0,flash-16);}
      ctx.textAlign='center';ctx.font='900 24px Calibri,sans-serif';ctx.fillStyle='#fff1d0';ctx.shadowColor='#191c2a';ctx.shadowBlur=5;
      if(view.status==='matchOver')ctx.fillText(view.wins[0]===view.wins[1]?'TRẬN ĐẤU HÒA':view.wins[0]>view.wins[1]?'LINH GIÀNH TRẬN!':'BẢO GIÀNH TRẬN!',W/2,94);else if(view.status==='intermission')ctx.fillText(view.message,W/2,94);else if(view.round===1&&view.timeSeconds===45)ctx.fillText('VÀO TRẬN!',W/2,98);ctx.shadowBlur=0;
      const left=view.fighters[0],right=view.fighters[1];$('#ndLeftHp').style.width=`${left.hp}%`;$('#ndRightHp').style.width=`${right.hp}%`;
      $('#ndLeftHp').parentNode.setAttribute('aria-valuenow',String(left.hp));$('#ndRightHp').parentNode.setAttribute('aria-valuenow',String(right.hp));$('#ndClock').textContent=String(view.timeSeconds).padStart(2,'0');$('#ndScore').textContent=`HIỆP ${view.round} · ${view.wins[0]} — ${view.wins[1]}`;
      $('#ndRightName').textContent=view.mode==='cpu'?'BẢO · MÁY':'BẢO · P2';$('#ndMode').textContent=view.mode==='cpu'?'Đang đấu với máy · đổi sang 2 người':'Hai người · trở lại đấu với máy';$('#ndMode').setAttribute('aria-pressed',String(view.mode==='local'));$('#ndP2Help').hidden=view.mode!=='local';
      const resultText=view.status==='playing'?(hitText||'Chờ nhịp, canh đỡ rồi phản công.'):view.message;
      if($('#ndResult').textContent!==resultText)$('#ndResult').textContent=resultText;
      $('#ndReplay').hidden=view.status!=='matchOver';
    }
    function inputFor(side) {
      const has=(code)=>keys.has(keyMap[code].join(':')),tap=taps[side];taps[side]={};
      const left=side===0?has('KeyA')||heldTouch.left:has('ArrowLeft'),right=side===0?has('KeyD')||heldTouch.right:has('ArrowRight');
      return {move:(right?1:0)-(left?1:0),guard:side===0?has('KeyS')||heldTouch.guard:has('ArrowDown'),jump:(side===0?has('KeyW'):has('ArrowUp'))||!!tap.jump,attack:tap.attack||null};
    }
    function clearInputs() { keys.clear(); taps=[{},{}]; Object.keys(heldTouch).forEach(k=>heldTouch[k]=false); }
    function schedule() {
      if(frame===null&&!document.hidden&&model.view().status!=='matchOver')frame=requestAnimationFrame(animate);
    }
    function stopLoop() {
      if(frame!==null)cancelAnimationFrame(frame);
      frame=null;lastTime=0;clearInputs();
    }
    function keydown(e) {
      const m=keyMap[e.code];
      if(!m){
        if(e.code==='Enter'&&model.view().status==='matchOver'){
          model.reset(model.view().mode);hitText='';clearInputs();render(model.view());schedule();e.preventDefault?.();
        }
        return;
      }
      e.preventDefault?.();const id=m.join(':');
      if(['punch','kick','special','jump'].includes(m[1])){if(!e.repeat){if(m[1]==='jump')taps[m[0]].jump=true;else taps[m[0]].attack=m[1];sound(m[1]==='special'?'special':'move');}}
      else keys.add(id);
    }
    function keyup(e){const m=keyMap[e.code];if(m)keys.delete(m.join(':'));}
    listen(window,'keydown',keydown);listen(window,'keyup',keyup);
    listen(window,'blur',stopLoop);listen(window,'focus',schedule);
    listen(document,'visibilitychange',()=>{if(document.hidden)stopLoop();else{lastTime=0;schedule();}});
    container.querySelectorAll('button').forEach(button=>{
      const name=button.getAttribute('data-nd-hold');
      if(name){const down=e=>{e.preventDefault?.();if(name==='jump')taps[0].jump=true;else heldTouch[name]=true;if(name==='jump')sound('move');},up=()=>{if(name!=='jump')heldTouch[name]=false;};session.listen(button,'pointerdown',down);session.listen(button,'pointerup',up);session.listen(button,'pointercancel',up);session.listen(button,'pointerleave',up);}
      const kind=button.getAttribute('data-nd-tap');
      if(kind)session.listen(button,'click',()=>{taps[0].attack=kind;sound(kind==='special'?'special':'move');});
    });
    session.listen($('#ndMode'),'click',()=>{model.reset(model.view().mode==='cpu'?'local':'cpu');hitText='';clearInputs();render(model.view());$('#ndLive').textContent=model.view().mode==='local'?'Đã chuyển sang đấu hai người.':'Đã chuyển sang đấu với máy.';schedule();});
    session.listen($('#ndReplay'),'click',()=>{model.reset(model.view().mode);hitText='';clearInputs();render(model.view());$('#ndLive').textContent='Ván mới. Vào trận!';schedule();});
    function animate(now) { frame=null;if(document.hidden)return;const dt=lastTime?Math.min(50,now-lastTime):16;lastTime=now;const result=model.step(dt,{p1:inputFor(0),p2:inputFor(1)});
      for(const event of result.events){if(event.type==='hit'||event.type==='block'){flash=event.type==='hit'?75:30;hitText=event.type==='block'?'ĐỠ ĐÚNG NHỊP!':StreetDuelModel.MOVES[event.move].name.toUpperCase()+'!';$('#ndLive').textContent=event.type==='block'?(event.side===0?'Linh đỡ được đòn.':'Bảo đỡ được đòn.'):(event.side===0?'Linh đánh trúng.':'Bảo đánh trúng.');sound(event.type);}else if(event.type==='roundEnd'){hitText='';const v=result.view;$('#ndLive').textContent=v.status==='matchOver'?v.message:(event.winner<0?'Hiệp đấu hòa.':event.winner===0?'Linh thắng hiệp.':'Bảo thắng hiệp.');sound('hit');}}
      render(result.view);schedule();
    }
    render(model.view());schedule();
    onCleanup(()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;clearInputs();try{audio?.close();}catch(_){}audio=null;});
    return { model, destroy: () => session.stop() };
  }

  // Original bubble-trap platform game for the historical Taito catalog route.
  function launchMamGio(container, game) {
    const engine = window.NP_BubbleTrap;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Mầm Gió chưa sẵn sàng.';
      return;
    }
    const title = document.getElementById('modalGameTitle');
    if (title) title.textContent = 'Mầm Gió';
    return engine.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
  }

  // Original compact artillery duel for the historical Raft Wars catalog route.
  function launchDauPhao(container, game) {
    const engine = window.NP_RaftDuel;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Đấu Phao chưa sẵn sàng.';
      return;
    }
    const title = document.getElementById('modalGameTitle');
    if (title) title.textContent = 'Đấu Phao';
    return engine.mount(container, window.NP_GameSession.start());
  }

  // =========================================================================
  // UNIVERSAL RETRO 50 ENGINE DISPATCHER & REGISTRY
  // =========================================================================
  const Retro50Engines = {
    hasGame(id) {
      const g = (id || '').toLowerCase();
      return (
        g.includes('boom-online') ||
        g.includes('audition') ||
        g.includes('road-rash') ||
        g.includes('rockman') || g.includes('mega-man') ||
        g.includes('duck-hunt') ||
        g.includes('street-fighter') ||
        g.includes('bubble-bobble') ||
        g.includes('raft-wars')
      );
    },

    launchGame(container, game) {
      const g = (game.id || '').toLowerCase();
      if (g.includes('boom-online')) launchDauTruongNuoc(container, game);
      else if (g.includes('audition')) launchNhipMay(container, game);
      else if (g.includes('road-rash')) launchDuaGio(container, game);
      else if (g.includes('rockman') || g.includes('mega-man')) launchMamChop(container, game);
      else if (g.includes('duck-hunt')) launchMucTieuBay(container, game);
      else if (g.includes('street-fighter')) launchStreetFighter(container, game);
      else if (g.includes('bubble-bobble')) launchMamGio(container, game);
      else if (g.includes('raft-wars')) launchDauPhao(container, game);
      else {
        if (window.NP_Engines && typeof window.NP_Engines.launchRetroArcade === 'function') {
          window.NP_Engines.launchRetroArcade(container, game);
        }
      }
    }
  };

  // Expose to window
  window.NP_Retro50Engines = Retro50Engines;
  if (!window.NP_Engines) window.NP_Engines = {};
  window.NP_Engines.launchDauTruongNuoc = launchDauTruongNuoc;
  window.NP_Engines.launchNhipMay = launchNhipMay;
  window.NP_Engines.launchDuaGio = launchDuaGio;
  window.NP_Engines.launchMamChop = launchMamChop;
  window.NP_Engines.launchMucTieuBay = launchMucTieuBay;
  window.NP_Engines.launchStreetFighter = launchStreetFighter;
  window.NP_Engines.launchMamGio = launchMamGio;
  window.NP_Engines.launchDauPhao = launchDauPhao;

})();


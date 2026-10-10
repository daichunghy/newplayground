/* Phím Sao — original three-part rhythm sprint. Canvas and synthesised tones only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_PhimSao = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LANES = 4, TOTAL = 36, HIT = 515, BASE_SPEED = 260;
  const PITCH = [261.63, 329.63, 392, 523.25];
  function chart() {
    const notes = []; let time = 1.6;
    for (let i = 0; i < TOTAL; i++) {
      if (i) time += i < 12 ? .83 : i < 24 ? .71 : .60;
      notes.push({ lane: (i * 7 + Math.floor(i / 3) * 3 + Math.floor(i / 9)) % LANES, time, hit: false });
    }
    return notes;
  }
  function create() {
    let s;
    function reset() {
      s = { status: 'ready', t: 0, score: 0, lives: 3, combo: 0, bestCombo: 0,
        resolved: 0, hits: 0, event: '', notes: chart() };
    }
    reset();
    function view() {
      return { status: s.status, t: s.t, score: s.score, lives: s.lives,
        combo: s.combo, bestCombo: s.bestCombo, resolved: s.resolved, hits: s.hits,
        total: TOTAL, event: s.event, notes: s.notes.map(n => ({ ...n })),
        level: s.resolved < 12 ? 1 : s.resolved < 24 ? 2 : 3 };
    }
    function fail(reason) {
      s.combo = 0; s.lives--; s.event = reason;
      if (s.lives <= 0) s.status = 'lost';
    }
    return {
      view, restart: reset,
      start() { if (s.status !== 'ready') return false; s.status = 'playing'; return true; },
      pause() { if (s.status !== 'playing') return false; s.status = 'paused'; return true; },
      resume() { if (s.status !== 'paused') return false; s.status = 'playing'; return true; },
      hit(lane) {
        if (s.status !== 'playing' || !Number.isInteger(lane) || lane < 0 || lane >= 4) return false;
        let next = s.notes.find(n => !n.hit);
        if (!next) return false;
        if (lane !== next.lane || Math.abs(s.t - next.time) > .29) {
          fail('Sai phím'); return false;
        }
        const delta = Math.abs(s.t - next.time);
        next.hit = true; s.hits++; s.resolved++; s.combo++;
        s.bestCombo = Math.max(s.combo, s.bestCombo);
        s.score += (delta < .10 ? 120 : delta < .20 ? 100 : 75) + Math.min(60, s.combo * 3);
        s.event = delta < .10 ? 'Hoàn hảo!' : 'Đúng nhịp!';
        if (s.resolved === TOTAL) s.status = 'won';
        return true;
      },
      advance(dt) {
        if (s.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return view();
        s.t += Math.min(.1, dt);
        // Every overdue note costs one heart; never remove a note until it is adjudicated.
        while (s.status === 'playing') {
          const next = s.notes.find(n => !n.hit);
          if (!next || s.t <= next.time + .30) break;
          next.hit = true; s.resolved++; fail('Lỡ nhịp');
          if (s.resolved >= TOTAL && s.status === 'playing') s.status = 'won';
        }
        return view();
      }
    };
  }
  function mount(container, session) {
    if (!container || !session?.listen || !session?.requestAnimationFrame) throw Error('Phím Sao needs a managed session');
    const doc = container.ownerDocument || window.document, w = doc.defaultView || window;
    container.innerHTML = '<section class="n6-game n6-rhythm" aria-label="Phím Sao"><header class="n6-head"><div><small>ĐƯỜNG PHÍM ÁNH SÁNG</small><h2>Phím Sao</h2></div><div class="n6-tools"><button data-act="pause" aria-label="Tạm dừng">Ⅱ</button><button data-act="restart" aria-label="Chơi lại">↻</button><details class="n6-help"><summary aria-label="Luật chơi">?</summary><p>Chạm đúng cột khi phím đến vạch sáng; lỡ hoặc sai quá ba lần sẽ thua. A S D F trên máy tính.</p></details></div></header><div class="n6-stats"><span>Điểm <b data-stat="score">0</b></span><span>Chuỗi <b data-stat="combo">0</b></span><span>Tim <b data-stat="lives">3</b></span><span data-stat="progress">0 / 36</span></div><div class="n6-stage"><canvas width="600" height="600" aria-label="Bốn cột phím đang rơi, vạch bắt nhịp"></canvas><div class="n6-screen" data-screen><div class="n6-card"><h3 data-screen-title>Phím Sao</h3><p data-screen-text>Chạm phím khi đến vạch sáng.</p><button class="n6-primary" data-act="play">Bắt đầu</button></div></div></div><div class="n6-lanes" aria-label="Bốn phím chơi"><button data-lane="0">A</button><button data-lane="1">S</button><button data-lane="2">D</button><button data-lane="3">F</button></div><p class="n6-feedback" data-feedback role="status" aria-live="polite">36 phím · 3 chặng</p></section>';
    const query = s => container.querySelector(s);
    const canvas = query('canvas'), ctx = canvas.getContext('2d');
    const model = create(); let previous = null, alive = true, lastStatus = '', audio = null;
    function tone(lane) {
      try {
        if (!audio) { const C = w.AudioContext || w.webkitAudioContext; if (!C) return; audio = new C(); }
        if (audio.state === 'suspended') audio.resume().catch(() => {});
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
        o.type = 'sine'; o.frequency.value = PITCH[lane];
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.075, t + .012);
        g.gain.exponentialRampToValueAtTime(.0001, t + .24);
        o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + .26);
      } catch (_) { /* Audio remains optional. */ }
    }
    function press(lane) {
      const before = model.view();
      if (before.status !== 'playing') return;
      if (model.hit(lane)) tone(lane);
      sync();
    }
    function action(name) {
      const v = model.view();
      if (name === 'restart') { model.restart(); model.start(); }
      else if (name === 'pause') { if (v.status === 'playing') model.pause(); else if (v.status === 'paused') model.resume(); }
      else if (name === 'play') { if (v.status === 'paused') model.resume(); else { model.restart(); model.start(); } }
      sync();
    }
    function sync() {
      const v = model.view();
      for (const [k, val] of Object.entries({score:v.score,combo:v.combo,lives:v.lives,progress:v.resolved+' / '+TOTAL})) query('[data-stat="'+k+'"]').textContent = String(val);
      query('[data-feedback]').textContent = v.status === 'playing' ? (v.event || 'Canh vạch sáng') : v.status === 'won' ? 'Hoàn tất ba chặng!' : v.status === 'lost' ? 'Hết tim, thử lại nhé.' : '36 phím · 3 chặng';
      query('[data-act="pause"]').textContent = v.status === 'paused' ? '▶' : 'Ⅱ';
      const show = v.status !== 'playing', screen = query('[data-screen]');
      screen.hidden = !show;
      if (show && (v.status !== lastStatus || !query('[data-screen-title]').textContent)) {
        query('[data-screen-title]').textContent = v.status === 'won' ? 'Hoàn thành!' : v.status === 'lost' ? 'Hết lượt!' : v.status === 'paused' ? 'Đã tạm dừng' : 'Phím Sao';
        query('[data-screen-text]').textContent = v.status === 'won' ? 'Điểm '+v.score+' · Chuỗi tốt nhất '+v.bestCombo : v.status === 'lost' ? 'Đã qua '+v.resolved+' / 36 phím.' : v.status === 'paused' ? 'Tiếp tục đúng nhịp nhé.' : 'Chạm phím khi đến vạch sáng.';
        query('[data-act="play"]').textContent = v.status === 'paused' ? 'Tiếp tục' : v.status === 'ready' ? 'Bắt đầu' : 'Chơi lại';
      }
      lastStatus = v.status;
    }
    function draw(v) {
      if (!ctx) return;
      const grad = ctx.createLinearGradient(0, 0, 0, 600);
      grad.addColorStop(0,'#0c1b3d'); grad.addColorStop(1,'#172550');
      ctx.fillStyle = grad;ctx.fillRect(0,0,600,600);
      for(let lane=0;lane<4;lane++){
        const x=42+lane*129;
        ctx.fillStyle=lane%2?'rgba(255,255,255,.045)':'rgba(255,255,255,.025)';
        ctx.beginPath();ctx.roundRect(x,14,122,566,14);ctx.fill();
        ctx.strokeStyle='rgba(175,202,255,.16)';ctx.strokeRect(x,14,122,566);
      }
      ctx.fillStyle='rgba(98,245,224,.20)';ctx.fillRect(36,HIT-2,538,50);
      ctx.fillStyle='#b0fff5';ctx.fillRect(36,HIT,538,4);
      ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='700 16px Calibri, Inter, sans-serif';
      ctx.fillText('NHỊP '+v.level+' / 3',46,38);
      for(const n of v.notes){
        if(n.hit)continue;
        const y=HIT-(n.time-v.t)*BASE_SPEED;
        if(y< -80 || y>620)continue;
        const x=48+n.lane*129;
        ctx.shadowColor=['#77e6ff','#b9a9ff','#ffc67b','#77f5cb'][n.lane];ctx.shadowBlur=18;
        ctx.fillStyle=['#42bde8','#9a7af4','#efb558','#4acda8'][n.lane];
        ctx.beginPath();ctx.roundRect(x,y-34,110,76,13);ctx.fill();
        ctx.shadowBlur=0;
        ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(x+9,y-26,92,3);
      }
      ctx.font='600 15px Calibri, Inter, sans-serif';ctx.textAlign='center';ctx.fillStyle='#b2caff';
      ctx.fillText('CHẠM KHI ĐẾN VẠCH',300,590);ctx.textAlign='left';
    }
    session.listen(container, 'click', e => {
      const btn=e.target.closest('button');
      if(!btn || !container.contains(btn))return;
      if(btn.dataset.lane!==undefined)press(Number(btn.dataset.lane));
      else if(btn.dataset.act) action(btn.dataset.act);
    });
    session.listen(canvas,'pointerdown',e=>{
      if(model.view().status!=='playing') return;
      const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*600/r.width;
      const lane=Math.floor((x-42)/129);
      if(lane>=0&&lane<4)press(lane);
    });
    session.listen(w,'keydown',e=>{
      if(e.altKey||e.ctrlKey||e.metaKey || !container.isConnected) return;
      if(/input|textarea|select/i.test(e.target?.tagName||''))return;
      const lane={a:0,s:1,d:2,f:3}[e.key.toLowerCase()];
      if(lane!==undefined){e.preventDefault();if(!e.repeat)press(lane);}
      else if(e.key.toLowerCase()==='p'||e.key==='Escape'){e.preventDefault();action('pause');}
    });
    session.listen(doc,'visibilitychange',()=>{if(doc.hidden&&model.view().status==='playing'){model.pause();sync();}});
    session.listen(w,'blur',()=>{if(model.view().status==='playing'){model.pause();sync();}});
    function frame(ts) {
      if(!alive)return;
      const dt=previous===null?0:Math.min(.05,(ts-previous)/1000);previous=ts;
      model.advance(dt);const v=model.view();draw(v);
      if(v.status!==lastStatus||v.status==='playing')sync();
      session.requestAnimationFrame(frame);
    }
    session.onCleanup(()=>{alive=false;if(audio)audio.close().catch(()=>{});container.innerHTML='';});
    sync();session.requestAnimationFrame(frame);
    return model;
  }
  return Object.freeze({create, mount, TOTAL, LANES});
});

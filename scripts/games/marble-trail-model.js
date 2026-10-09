/* Marble Trail: original deterministic marble-chain rules. No third-party game code/assets. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_MarbleTrailModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const VERSION = 1, RULES = 'marble-trail-2026-10', WIDTH = 720, HEIGHT = 520;
  const RADIUS = 13, SPACING = 26, STEP = 1 / 120, MAX_BALLS = 160;
  const COLORS = [
    { hex: '#ff7769', dark: '#913e39', name: 'đỏ · tròn', mark: '●' },
    { hex: '#66dba4', dark: '#27654c', name: 'lục · tam giác', mark: '▲' },
    { hex: '#67b8ff', dark: '#305c94', name: 'lam · vuông', mark: '■' },
    { hex: '#ffda71', dark: '#8b692c', name: 'vàng · thoi', mark: '◆' },
    { hex: '#cc9aff', dark: '#654794', name: 'tím · cộng', mark: '+' }
  ];
  const LEVELS = [
    { name: 'Vườn bình minh', colors: 3, target: 30, speed: 15, initial: 16, shooter: { x: 335, y: 320 },
      points: [[65,430],[58,225],[110,100],[280,62],[505,72],[642,170],[650,335],[560,439],[410,452],[265,416],[215,313],[260,220],[425,205],[507,275]] },
    { name: 'Khúc sông xanh', colors: 4, target: 45, speed: 18, initial: 20, shooter: { x: 382, y: 235 },
      points: [[60,415],[65,175],[160,65],[375,88],[635,75],[665,235],[585,340],[462,382],[370,333],[268,220],[174,218],[164,342],[250,450],[440,458],[571,423]] },
    { name: 'Đài quan sát', colors: 5, target: 60, speed: 21, initial: 24, shooter: { x: 342, y: 300 },
      points: [[80,450],[55,212],[125,72],[380,48],[620,85],[670,280],[611,437],[393,476],[212,426],[158,324],[194,220],[296,155],[439,159],[540,230],[518,320],[443,350]] }
  ];
  const copy = value => JSON.parse(JSON.stringify(value));
  const finite = (n, a, b) => Number.isFinite(n) && n >= a && n <= b;
  const int = (n, a, b) => Number.isSafeInteger(n) && n >= a && n <= b;

  function makePath(points) {
    const samples = [], at = i => points[Math.max(0, Math.min(points.length - 1, i))];
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const count = Math.max(12, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
      for (let j = i ? 1 : 0; j <= count; j++) {
        const t = j / count, t2 = t * t, t3 = t2 * t;
        const calc = d => .5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3);
        const p = { x: calc(0), y: calc(1), s: length };
        const prev = samples[samples.length - 1];
        if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y);
        p.s = length; samples.push(p);
      }
    }
    function point(s) {
      if (s <= 0) { const a = samples[0], b = samples[1], n = Math.hypot(b.x-a.x,b.y-a.y); return { x:a.x+(b.x-a.x)*s/n, y:a.y+(b.y-a.y)*s/n }; }
      if (s >= length) return { x: samples[samples.length-1].x, y: samples[samples.length-1].y };
      let lo = 0, hi = samples.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (samples[mid].s < s) lo = mid; else hi = mid; }
      const a = samples[lo], b = samples[hi], t = (s - a.s) / (b.s - a.s);
      return { x: a.x + (b.x-a.x)*t, y:a.y+(b.y-a.y)*t };
    }
    function tangent(s) { const a = point(s-1), b = point(Math.min(length,s+1)), n = Math.hypot(b.x-a.x,b.y-a.y) || 1; return { x:(b.x-a.x)/n, y:(b.y-a.y)/n }; }
    return { samples, length, point, tangent };
  }
  const PATHS = LEVELS.map(l => makePath(l.points));

  // Swept circle contact chooses the first actual collision, including around bends.
  function segmentCircle(a, b, center, radius) {
    const dx=b.x-a.x, dy=b.y-a.y, ox=a.x-center.x, oy=a.y-center.y, aa=dx*dx+dy*dy;
    const cc=ox*ox+oy*oy-radius*radius;
    if (cc <= 0) return 0;
    if (!aa) return null;
    const bb=2*(ox*dx+oy*dy), disc=bb*bb-4*aa*cc;
    if (disc < 0) return null;
    const t=(-bb-Math.sqrt(disc))/(2*aa);
    return t >= 0 && t <= 1 ? t : null;
  }
  function segmentsCross(a,b,c,d) {
    const cross=(x,y,u,v)=>x*v-y*u, rx=b.x-a.x, ry=b.y-a.y, sx=d.x-c.x, sy=d.y-c.y;
    const den=cross(rx,ry,sx,sy); if (Math.abs(den)<1e-9) return false;
    const t=cross(c.x-a.x,c.y-a.y,sx,sy)/den, u=cross(c.x-a.x,c.y-a.y,rx,ry)/den;
    return t>=0 && t<=1 && u>=0 && u<=1;
  }

  class Game {
    constructor({ level=0, seed=20261007, score=0 } = {}) {
      level=int(level,0,LEVELS.length-1)?level:0;
      seed=int(seed,1,0xffffffff)?seed:20261007;
      score=int(score,0,100000000)?score:0;
      this.state = { version:VERSION, rules:RULES, level, seed, rng:(seed ^ Math.imul(level+1,2654435761))>>>0 || 1,
        score, levelStartScore:score, cleared:0, shots:0, hits:0, bestCombo:0, ticks:0, accumulator:0,
        nextId:1, train:[], pending:[], bullet:null, current:0, next:0, cooldown:0, slow:0, reverse:0,
        spawnClosed:false, status:'playing' };
      this.events=[];
      for (let i=0;i<this.level.initial;i++) this.state.train.push(this.newBall(i*SPACING));
      this.state.current=this.pickAmmo(); this.state.next=this.pickAmmo();
    }
    get level() { return LEVELS[this.state.level]; }
    get path() { return PATHS[this.state.level]; }
    random() { let x=this.state.rng; x^=x<<13; x^=x>>>17; x^=x<<5; this.state.rng=x>>>0; return this.state.rng/4294967296; }
    newBall(s) {
      const id=this.state.nextId++, color=Math.floor(this.random()*this.level.colors);
      return { id, color, s, power:id%17===0?'reverse':id%11===0?'slow':null };
    }
    pickAmmo() {
      const colors=this.state.spawnClosed?[...new Set(this.state.train.map(b=>b.color))]:Array.from({length:this.level.colors},(_,i)=>i);
      return colors.length?colors[Math.floor(this.random()*colors.length)]:0;
    }
    normalizeAmmo() {
      if (!this.state.spawnClosed || !this.state.train.length) return;
      const colors=new Set(this.state.train.map(b=>b.color));
      if (!colors.has(this.state.current)) this.state.current=this.pickAmmo();
      if (!colors.has(this.state.next)) this.state.next=this.pickAmmo();
    }
    view() { return copy(this.state); }
    serialize() { return this.view(); }
    drainEvents() { const result=this.events; this.events=[]; return result; }
    emit(type, fields={}) { this.events.push({type,...fields}); }
    swap() {
      if (this.state.status!=='playing') return false;
      [this.state.current,this.state.next]=[this.state.next,this.state.current]; this.emit('swap'); return true;
    }
    shoot(angle) {
      const s=this.state;
      if (s.status!=='playing' || s.bullet || s.cooldown || !Number.isFinite(angle)) return false;
      const dx=Math.cos(angle), dy=Math.sin(angle), o=this.level.shooter;
      s.bullet={x:o.x+dx*30,y:o.y+dy*30,dx,dy,color:s.current,gap:false};
      s.current=s.next; s.next=this.pickAmmo(); s.cooldown=18; s.shots++; this.emit('shot'); return true;
    }
    connected(i,j) { return i>=0 && j<this.state.train.length && this.state.train[j].s-this.state.train[i].s<=SPACING+.05; }
    resolve(index, depth=1, gap=false) {
      const s=this.state, b=s.train[index]; if (!b) return false;
      let lo=index, hi=index;
      while (lo>0 && s.train[lo-1].color===b.color && this.connected(lo-1,lo)) lo--;
      while (hi<s.train.length-1 && s.train[hi+1].color===b.color && this.connected(hi,hi+1)) hi++;
      if (hi-lo+1<3) return false;
      depth=Math.min(12,depth);
      const removed=s.train.slice(lo,hi+1), left=s.train[lo-1], right=s.train[hi+1];
      const points=removed.length*10*depth+(gap?60:0);
      s.score+=points; s.cleared+=removed.length; s.bestCombo=Math.max(s.bestCombo,depth);
      s.train.splice(lo,removed.length);
      if(left&&right) s.pending.push({left:left.id,right:right.id,depth:depth+1});
      if(removed.some(x=>x.power==='slow')) { s.slow=600; this.emit('power',{power:'slow'}); }
      if(removed.some(x=>x.power==='reverse')) { s.reverse=300; this.emit('power',{power:'reverse'}); }
      this.emit('clear',{points,count:removed.length,depth,gap,balls:removed.map(x=>({...this.path.point(x.s),color:x.color}))});
      if(s.cleared>=this.level.target&&!s.spawnClosed) {s.spawnClosed=true;this.emit('closed');}
      this.cleanPending(); this.normalizeAmmo(); this.checkEnd(); return true;
    }
    cleanPending() {
      const positions=new Map(this.state.train.map((b,i)=>[b.id,i])), pairs=new Map();
      for(const p of this.state.pending) {
        if(!positions.has(p.left)||positions.get(p.right)!==positions.get(p.left)+1)continue;
        const key=p.left+':'+p.right,old=pairs.get(key);
        if(!old||p.depth>old.depth)pairs.set(key,p);
      }
      this.state.pending=[...pairs.values()];
    }
    insert(index, side, color, gap=false) {
      const s=this.state;
      if(s.status!=='playing'||!int(index,0,s.train.length-1)||!int(color,0,this.level.colors-1)) return false;
      if(s.train.length>=MAX_BALLS) { s.status='lost';s.bullet=null;this.emit('lost');return false; }
      const at=index+(side>0?1:0), ball={id:s.nextId++,color,s:s.train[index].s+(side>0?SPACING:0),power:null};
      s.train.splice(at,0,ball);
      for(let i=at+1;i<s.train.length;i++) {const min=s.train[i-1].s+SPACING;if(s.train[i].s>=min)break;s.train[i].s=min;}
      s.hits++;
      if(!this.resolve(at,1,gap)) this.emit('insert',{x:this.path.point(ball.s).x,y:this.path.point(ball.s).y});
      this.cleanPending();this.checkEnd();return true;
    }
    checkEnd() {
      const s=this.state;if(s.status!=='playing')return;
      if(s.train.length&&s.train[s.train.length-1].s>=this.path.length-RADIUS) {s.status='lost';s.bullet=null;this.emit('lost');}
      else if(s.spawnClosed&&!s.train.length) {s.status='won';s.bullet=null;s.score+=250+s.level*100;this.emit('won',{final:s.level===LEVELS.length-1});}
    }
    moveTrain() {
      const s=this.state, train=s.train;if(!train.length)return;
      const groups=[];let start=0;
      for(let i=1;i<=train.length;i++) if(i===train.length||!this.connected(i-1,i)){groups.push({start,end:i-1});start=i;}
      const speed=this.level.speed*(s.slow?0.4:1), joined=[];
      for(let g=0;g<groups.length;g++) {
        const group=groups[g], previous=g?groups[g-1]:null;
        let velocity=s.reverse?-70:(!g?speed:(train[group.start].color===train[previous.end].color?-110:0));
        let delta=velocity*STEP;
        if(previous) delta=Math.max(delta,train[previous.end].s+SPACING-train[group.start].s);
        // Reverse effects cannot push the train indefinitely behind the entrance.
        if(!previous)delta=Math.max(delta,-SPACING*(train.length+1)-train[group.start].s);
        for(let i=group.start;i<=group.end;i++)train[i].s+=delta;
        if(previous&&this.connected(previous.end,group.start))joined.push([train[previous.end].id,train[group.start].id]);
      }
      for(const [left,right] of joined) {
        const i=train.findIndex(b=>b.id===left), j=train.findIndex(b=>b.id===right);
        if(i<0||j!==i+1)continue;
        const pending=s.pending.find(p=>p.left===left&&p.right===right);
        s.pending=s.pending.filter(p=>p!==pending);
        this.resolve(i,pending?pending.depth:1);
      }
      this.cleanPending();
    }
    firstHit(a,b) {
      let hit=null;
      this.state.train.forEach((ball,index)=>{
        if(ball.s<0||ball.s>this.path.length)return;
        const center=this.path.point(ball.s),t=segmentCircle(a,b,center,RADIUS*2);
        if(t!==null&&(!hit||t<hit.t)){hit={index,t,center,ball};}
      });return hit;
    }
    crossesGap(a,b) {
      const train=this.state.train;
      for(let i=1;i<train.length;i++) {
        const lo=Math.max(0,train[i-1].s+SPACING),hi=Math.min(this.path.length,train[i].s-SPACING);
        if(hi<=lo)continue;
        let prev=this.path.point(lo);
        for(let d=lo+12;d<hi+12;d+=12) {const next=this.path.point(Math.min(d,hi));if(segmentsCross(a,b,prev,next))return true;prev=next;}
      }return false;
    }
    step() {
      const s=this.state;if(s.status!=='playing')return;
      s.ticks++;if(s.cooldown)s.cooldown--;if(s.slow)s.slow--;if(s.reverse)s.reverse--;
      this.moveTrain();
      if(s.status!=='playing')return;
      if(!s.spawnClosed&&(!s.train.length||s.train[0].s>=SPACING)) {
        const tail=s.train[0];
        // Preserve exact contact at the entrance; a clear farther along still leaves a real gap.
        const entry=tail&&tail.s<SPACING+1?tail.s-SPACING:0;
        s.train.unshift(this.newBall(entry));
      }
      if(s.bullet) {
        const shot=s.bullet,a={x:shot.x,y:shot.y},b={x:a.x+shot.dx*900*STEP,y:a.y+shot.dy*900*STEP};
        const hit=this.firstHit(a,b),end=hit?{x:a.x+(b.x-a.x)*hit.t,y:a.y+(b.y-a.y)*hit.t}:b;
        if(!shot.gap)shot.gap=this.crossesGap(a,end);
        if(hit) {
          const t=this.path.tangent(hit.ball.s),side=(end.x-hit.center.x)*t.x+(end.y-hit.center.y)*t.y>=0?1:-1;
          s.bullet=null;this.insert(hit.index,side,shot.color,shot.gap);
        } else {shot.x=b.x;shot.y=b.y;if(b.x<-30||b.y<-30||b.x>WIDTH+30||b.y>HEIGHT+30){s.bullet=null;this.emit('miss');}}
      }
      this.checkEnd();
    }
    advance(seconds) {
      if(this.state.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return 0;
      this.state.accumulator+=Math.min(.25,seconds);let steps=0;
      while(this.state.accumulator+1e-10>=STEP&&this.state.status==='playing') {this.state.accumulator=Math.max(0,this.state.accumulator-STEP);this.step();steps++;}
      if(this.state.status!=='playing')this.state.accumulator=0;
      return steps;
    }
    retry() { return new Game({level:this.state.level,seed:this.state.seed,score:this.state.levelStartScore}); }
    nextLevel() { return this.state.status==='won'&&this.state.level<LEVELS.length-1?new Game({level:this.state.level+1,seed:this.state.seed,score:this.state.score}):null; }
  }
  function restore(raw) {
    try {
      if(!raw||raw.version!==VERSION||raw.rules!==RULES||!int(raw.level,0,LEVELS.length-1))return null;
      const l=LEVELS[raw.level], path=PATHS[raw.level];
      if(!int(raw.seed,1,0xffffffff)||!int(raw.rng,1,0xffffffff)||!['playing','won','lost'].includes(raw.status)||typeof raw.spawnClosed!=='boolean')return null;
      for(const k of ['score','levelStartScore','cleared','shots','hits','ticks'])if(!int(raw[k],0,100000000))return null;
      if(raw.levelStartScore>raw.score||!int(raw.bestCombo,0,12)||!int(raw.nextId,1,100000001)||!finite(raw.accumulator,0,STEP+1e-9))return null;
      if(!int(raw.current,0,l.colors-1)||!int(raw.next,0,l.colors-1)||!int(raw.cooldown,0,18)||!int(raw.slow,0,600)||!int(raw.reverse,0,300))return null;
      if(raw.spawnClosed!==(raw.cleared>=l.target)||!Array.isArray(raw.train)||raw.train.length>MAX_BALLS||!Array.isArray(raw.pending)||raw.pending.length>MAX_BALLS)return null;
      const ids=new Set();let last=-Infinity;
      for(const b of raw.train) {
        if(!b||!int(b.id,1,raw.nextId-1)||ids.has(b.id)||!int(b.color,0,l.colors-1)||!finite(b.s,-SPACING*(MAX_BALLS+2),path.length+MAX_BALLS*SPACING)||b.s-last<SPACING-.05||![null,'slow','reverse'].includes(b.power))return null;
        ids.add(b.id);last=b.s;
      }
      if(raw.pending.some(p=>!p||!ids.has(p.left)||!ids.has(p.right)||p.left===p.right||!int(p.depth,2,13)))return null;
      if(raw.bullet) {
        const b=raw.bullet;
        if(!finite(b.x,-30,WIDTH+30)||!finite(b.y,-30,HEIGHT+30)||!finite(b.dx,-1,1)||!finite(b.dy,-1,1)||Math.abs(b.dx*b.dx+b.dy*b.dy-1)>.001||!int(b.color,0,l.colors-1)||typeof b.gap!=='boolean')return null;
      }
      if(raw.status==='won'&&(!raw.spawnClosed||raw.train.length||raw.bullet))return null;
      if(raw.status==='playing'&&((raw.spawnClosed&&!raw.train.length)||last>=path.length-RADIUS))return null;
      const g=new Game({level:raw.level,seed:raw.seed});g.state=copy(raw);g.normalizeAmmo();return g;
    } catch(_){return null;}
  }
  return {VERSION,RULES,WIDTH,HEIGHT,RADIUS,SPACING,STEP,COLORS,LEVELS,PATHS,Game,create:options=>new Game(options),restore,segmentCircle,segmentsCross,makePath};
});

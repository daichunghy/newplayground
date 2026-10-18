/* Pure game models. Original local implementations; no ROMs or copied levels. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NP_DepthModels=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function rng(seed=1){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const clone=x=>JSON.parse(JSON.stringify(x,(_,v)=>v instanceof Set?[...v]:v));
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
class Hanoi{
 constructor(n=3){this.n=clamp(Math.round(n),3,8);this.reset();}
 reset(){this.pegs=[Array.from({length:this.n},(_,i)=>this.n-i),[],[]];this.moves=0;this.history=[];this.won=false;}
 move(from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>2||to<0||to>2||from===to||this.won)return false;const a=this.pegs[from],b=this.pegs[to];if(!a.length||(b.length&&b.at(-1)<a.at(-1)))return false;this.history.push(clone(this.pegs));b.push(a.pop());this.moves++;this.won=this.pegs[2].length===this.n;return true;}
 undo(){if(!this.history.length)return false;this.pegs=this.history.pop();this.moves--;this.won=false;return true;}
}
const directions=[[-1,0],[0,1],[1,0],[0,-1]];
const rotateMask=m=>((m<<1)&15)|(m>>3);
class Pipes{
 constructor(level=1,seed=1){this.level=level;this.n=5+Math.min(2,Math.floor((level-1)/3));this.moves=0;this.won=false;const r=rng(seed),n=this.n;
  // A randomly mirrored serpentine route guarantees every generated board can
  // be solved. Distractors do not join the authored route by accident at start.
  const path=[];for(let y=0;y<n;y++){const reverse=y%2;for(let a=0;a<n;a++)path.push(y*n+(reverse?n-1-a:a));}
  if(r()>.5)for(let i=0;i<path.length;i++)path[i]=Math.floor(path[i]/n)*n+n-1-path[i]%n;
  this.path=path;this.start=path[0];this.end=path.at(-1);this.solution=Array(n*n).fill(0);
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],ay=Math.floor(a/n),by=Math.floor(b/n),ax=a%n,bx=b%n;const d=by<ay?0:bx>ax?1:by>ay?2:3;this.solution[a]|=1<<d;this.solution[b]|=1<<((d+2)%4);}
  this.cells=this.solution.map(m=>{for(let k=Math.floor(r()*4);k;k--)m=rotateMask(m);return m;});if(this.connected().size===n*n)this.cells[this.start]=rotateMask(this.cells[this.start]);
 }
 connected(){const seen=new Set([this.start]),q=[this.start],n=this.n;while(q.length){const i=q.shift(),y=Math.floor(i/n),x=i%n;for(let d=0;d<4;d++){if(!(this.cells[i]&(1<<d)))continue;const [dy,dx]=directions[d],ny=y+dy,nx=x+dx;if(ny<0||nx<0||ny>=n||nx>=n)continue;const j=ny*n+nx;if(this.cells[j]&(1<<((d+2)%4))&&!seen.has(j)){seen.add(j);q.push(j);}}}return seen;}
 turn(i,reverse=false){if(this.won||!Number.isInteger(i)||i<0||i>=this.cells.length)return false;for(let k=0;k<(reverse?3:1);k++)this.cells[i]=rotateMask(this.cells[i]);this.moves++;const connected=this.connected();this.won=connected.has(this.end)&&connected.size===this.cells.length;return true;}
}
class Piano{
 constructor(seed=1){this.random=rng(seed);this.reset();}
 reset(){this.rows=Array.from({length:7},()=>Math.floor(this.random()*4));this.hits=0;this.elapsed=0;this.phase='ready';this.offset=0;this.last=null;this.streak=0;}
 hit(lane){if(this.phase==='over'||this.phase==='won')return false;if(lane!==this.rows[0]){this.phase='over';this.last={lane,correct:false};return false;}this.phase='playing';this.rows.shift();this.rows.push(Math.floor(this.random()*4));this.offset=Math.max(0,this.offset-1);this.hits++;this.streak++;this.last={lane,correct:true};if(this.hits>=50)this.phase='won';return true;}
 step(dt){if(this.phase!=='playing')return;this.elapsed+=dt;this.offset+=dt*(1.15+Math.min(1.9,this.hits*.029));if(this.offset>=1.8)this.phase='over';}
}
class Capsules{
 constructor(level=1,seed=1){this.w=8;this.h=16;this.level=level;this.random=rng(seed);this.board=Array.from({length:16},()=>Array(8).fill(null));this.score=0;this.phase='playing';this.group=1;this.chain=0;
  const colors=3,count=6+Math.min(level,10)*2;let placed=0;while(placed<count){const x=Math.floor(this.random()*8),y=10+Math.floor(this.random()*6);if(!this.board[y][x]){this.board[y][x]={color:1+Math.floor(this.random()*colors),virus:true,id:0};placed++;}}
  // Keep generated starting virus runs shorter than four.
  for(const [x,y] of this.matches())this.board[y][x].color=this.board[y][x].color%3+1;
  this.next=[this.color(),this.color()];this.spawn();
 }
 color(){return 1+Math.floor(this.random()*3);}
 spawn(){this.pill={x:3,y:0,orientation:0,colors:this.next,id:this.group++};this.next=[this.color(),this.color()];if(!this.fits(this.pill))this.phase='over';}
 positions(p=this.pill){const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][p.orientation];return [[p.x,p.y,p.colors[0]],[p.x+dx,p.y+dy,p.colors[1]]];}
 fits(p){return this.positions(p).every(([x,y])=>x>=0&&x<8&&y>=0&&y<16&&!this.board[y][x]);}
 move(dx,dy){if(this.phase!=='playing')return false;const p={...this.pill,x:this.pill.x+dx,y:this.pill.y+dy};if(!this.fits(p))return false;this.pill=p;return true;}
 rotate(){if(this.phase!=='playing')return false;for(const dx of [0,-1,1]){const p={...this.pill,orientation:(this.pill.orientation+1)%4,x:this.pill.x+dx};if(this.fits(p)){this.pill=p;return true;}}return false;}
 fall(){if(this.phase!=='playing')return false;if(this.move(0,1))return true;this.lock();return false;}
 drop(){if(this.phase!=='playing')return;while(this.move(0,1))this.score++;this.lock();}
 matches(){const result=new Map();for(let y=0;y<16;y++)for(let x=0;x<8;x++){const c=this.board[y][x];if(!c)continue;for(const [dx,dy] of [[1,0],[0,1]]){if(x-dx>=0&&y-dy>=0&&this.board[y-dy][x-dx]?.color===c.color)continue;const run=[];let a=x,b=y;while(a<8&&b<16&&this.board[b][a]?.color===c.color){run.push([a,b]);a+=dx;b+=dy;}if(run.length>=4)run.forEach(p=>result.set(p.join(','),p));}}return [...result.values()];}
 gravity(){let moved=false;const seen=new Set();for(let y=15;y>=0;y--)for(let x=0;x<8;x++){const c=this.board[y][x];if(!c||c.virus||seen.has(c.id))continue;seen.add(c.id);const group=[];for(let yy=0;yy<16;yy++)for(let xx=0;xx<8;xx++)if(this.board[yy][xx]?.id===c.id&&!this.board[yy][xx].virus)group.push([xx,yy,this.board[yy][xx]]);
    if(group.every(([xx,yy])=>yy<15&&(!this.board[yy+1][xx]||this.board[yy+1][xx].id===c.id))){group.forEach(([xx,yy])=>this.board[yy][xx]=null);group.forEach(([xx,yy,cell])=>this.board[yy+1][xx]=cell);moved=true;}}
  return moved;
 }
 lock(){this.positions().forEach(([x,y,color])=>this.board[y][x]={color,virus:false,id:this.pill.id});this.chain=0;let run=this.matches();this.lastClear=[];while(run.length){this.chain++;this.lastClear.push(...run);for(const [x,y] of run){this.score+=(this.board[y][x].virus?100:20)*this.chain;this.board[y][x]=null;}for(let i=0;i<16&&this.gravity();i++);run=this.matches();}if(!this.viruses()){this.phase='won';return;}this.spawn();}
 viruses(){return this.board.flat().filter(c=>c?.virus).length;}
}
// Playing cards use explicit card identity. No implicit auto-moves or autoplay.
const rank=c=>c%13+1,suit=c=>Math.floor(c/13),red=c=>suit(c)%2===1;
class Cards{
 constructor(kind='klondike',seed=1){this.kind=kind;this.seed=seed;this.history=[];this.moves=0;this.score=0;this.completed=0;this.phase='playing';this.stock=[];this.waste=[];this.free=Array(4).fill(null);this.foundation=Array.from({length:4},()=>[]);const r=rng(seed);this.columns=Array.from({length:kind==='spider'?10:kind==='freecell'?8:7},()=>[]);
  const deck=shuffle(kind==='spider'?Array.from({length:104},(_,i)=>({card:i%13,up:false,uid:i})):Array.from({length:52},(_,i)=>({card:i,up:true,uid:i})),r);
  if(kind==='freecell'){deck.forEach((c,i)=>this.columns[i%8].push(c));}
  else if(kind==='spider'){for(let i=0;i<54;i++)this.columns[i%10].push(deck.pop());this.columns.forEach(c=>c.at(-1).up=true);this.stock=deck;}
  else {for(let i=0;i<7;i++)for(let j=0;j<=i;j++){const c=deck.pop();c.up=j===i;this.columns[i].push(c);}this.stock=deck;this.stock.forEach(c=>c.up=false);}
 }
 snapshot(){return clone({columns:this.columns,stock:this.stock,waste:this.waste,free:this.free,foundation:this.foundation,moves:this.moves,score:this.score,completed:this.completed,phase:this.phase});}
 checkpoint(){this.history.push(this.snapshot());if(this.history.length>80)this.history.shift();}
 undo(){if(!this.history.length)return false;Object.assign(this,this.history.pop());return true;}
 pile(source){return source.type==='column'?this.columns[source.index]:source.type==='waste'?this.waste:source.type==='foundation'?this.foundation[source.index]:source.type==='free'&&this.free[source.index]?[this.free[source.index]]:[];}
 validRun(cards){return cards.length>0&&cards.every((c,i)=>c.up&&(!i||(rank(cards[i-1].card)===rank(c.card)+1&&(this.kind==='spider'||red(cards[i-1].card)!==red(c.card)))));}
 moving(source){const pile=this.pile(source),at=source.type==='column'?source.at:pile.length-1;if(at<0||at>=pile.length)return [];const cards=pile.slice(at);return this.validRun(cards)?cards:[];}
 can(source,dest){const cards=this.moving(source);if(!cards.length||this.phase==='won')return false;if(source.type===dest.type&&source.index===dest.index)return false;const bottom=cards[0].card;
  if(dest.type==='free')return this.kind==='freecell'&&cards.length===1&&this.free[dest.index]===null;
  if(dest.type==='foundation'){if(this.kind==='spider'||cards.length!==1)return false;const pile=this.foundation[dest.index];return (!pile.length&&rank(bottom)===1&&suit(bottom)===dest.index)||(pile.length&&suit(pile.at(-1).card)===suit(bottom)&&rank(pile.at(-1).card)+1===rank(bottom));}
  if(dest.type!=='column'||!this.columns[dest.index])return false;const target=this.columns[dest.index];if(this.kind==='freecell'&&cards.length>1){const spaces=this.columns.filter((c,i)=>!c.length&&i!==dest.index).length,free=this.free.filter(c=>c===null).length;if(cards.length>(free+1)*2**spaces)return false;}
  if(!target.length)return this.kind!=='klondike'||rank(bottom)===13;
  const top=target.at(-1);return top.up&&rank(top.card)===rank(bottom)+1&&(this.kind==='spider'||red(top.card)!==red(bottom));
 }
 move(source,dest){if(!this.can(source,dest))return false;this.checkpoint();const moving=this.moving(source);if(source.type==='free')this.free[source.index]=null;else this.pile(source).splice(source.type==='column'?source.at:this.pile(source).length-1);
  if(dest.type==='free')this.free[dest.index]=moving[0];else if(dest.type==='foundation'){this.foundation[dest.index].push(...moving);this.score+=10;}else this.columns[dest.index].push(...moving);
  this.columns.forEach(c=>{if(c.length&&!c.at(-1).up){c.at(-1).up=true;this.score+=5;}});this.moves++;this.finish();return true;
 }
 draw(){if(this.kind==='freecell'||this.phase==='won')return false;if(this.kind==='spider'&&(!this.stock.length||this.columns.some(c=>!c.length)))return false;if(!this.stock.length&&!this.waste.length)return false;this.checkpoint();
  if(this.kind==='spider'){for(const col of this.columns){const card=this.stock.pop();card.up=true;col.push(card);}}
  else if(this.stock.length){const card=this.stock.pop();card.up=true;this.waste.push(card);}else {this.stock=this.waste.reverse();this.stock.forEach(c=>c.up=false);this.waste=[];}
  this.moves++;this.finish();return true;
 }
 finish(){if(this.kind==='spider'){for(const col of this.columns){if(col.length>=13){const run=col.slice(-13);if(run.every((c,i)=>c.up&&rank(c.card)===13-i)){col.splice(-13);this.completed++;this.score+=100;if(col.length)col.at(-1).up=true;}}}if(this.completed===8)this.phase='won';}else if(this.foundation.flat().length===52)this.phase='won';}
 sources(){const sources=[];this.columns.forEach((c,i)=>c.forEach((card,at)=>{if(card.up)sources.push({type:'column',index:i,at});}));if(this.waste.length)sources.push({type:'waste',index:0});this.free.forEach((c,i)=>{if(c)sources.push({type:'free',index:i});});return sources;}
 destinations(){return [...this.columns.map((_,i)=>({type:'column',index:i})),...(this.kind==='spider'?[]:this.foundation.map((_,i)=>({type:'foundation',index:i}))),...(this.kind==='freecell'?this.free.map((_,i)=>({type:'free',index:i})):[])];}
 hint(){for(const s of this.sources())for(const d of this.destinations())if(this.can(s,d))return {source:s,dest:d};return null;}
}
class Pegs{
 constructor(level=1,seed=1){this.random=rng(seed);this.level=level;this.w=960;this.h=580;this.ball=null;this.balls=10;this.score=0;this.phase='playing';this.bucket=480;this.clock=0;this.pegs=[];this.events=[];
  for(let y=0;y<6;y++)for(let x=0;x<10;x++)this.pegs.push({x:105+x*82+(y%2?26:0),y:138+y*55,r:12,orange:(x+y*3)%4===0,hit:false});
 }
 shoot(x,y){if(this.phase!=='playing'||this.ball||!this.balls||y<70)return false;const dx=x-480,dy=Math.max(50,y-44),len=Math.hypot(dx,dy);this.ball={x:480,y:48,vx:dx/len*360,vy:dy/len*360,age:0};this.balls--;return true;}
 step(dt){this.clock+=dt;this.bucket=480+Math.sin(this.clock*.85)*365;if(!this.ball)return;const count=Math.max(1,Math.ceil(dt/.008)),h=dt/count;for(let k=0;k<count&&this.ball;k++){const b=this.ball;b.age+=h;b.vy+=310*h;b.x+=b.vx*h;b.y+=b.vy*h;if(b.x<9||b.x>951){b.x=clamp(b.x,9,951);b.vx*=-.94;}if(b.y<10){b.y=10;b.vy=Math.abs(b.vy);}
  for(const p of this.pegs){const dx=b.x-p.x,dy=b.y-p.y,dist=Math.hypot(dx,dy),r=p.r+8;if(dist<r){const nx=dist?dx/dist:0,ny=dist?dy/dist:-1,dot=b.vx*nx+b.vy*ny;b.x=p.x+nx*(r+.2);b.y=p.y+ny*(r+.2);if(dot<0){b.vx-=1.85*dot*nx;b.vy-=1.85*dot*ny;}if(!p.hit){p.hit=true;this.score+=p.orange?100:10;this.events.push({x:p.x,y:p.y,orange:p.orange});}}}
  if(b.y>560||b.age>15){if(b.y>560&&Math.abs(b.x-this.bucket)<55){this.balls++;this.score+=50;}this.pegs=this.pegs.filter(p=>!p.hit);this.ball=null;if(!this.pegs.some(p=>p.orange))this.phase='won';else if(this.balls<=0)this.phase='over';}
 }}
}
class Asteroids{
 constructor(seed=1,level=1){this.random=rng(seed);this.level=level;this.w=960;this.h=580;this.ship={x:480,y:290,vx:0,vy:0,a:-Math.PI/2,shield:2};this.rocks=[];this.bullets=[];this.score=0;this.lives=3;this.cooldown=0;this.phase='playing';this.events=[];this.wave();}
 wave(){for(let i=0;i<3+this.level;i++){const angle=this.random()*Math.PI*2;this.rocks.push({x:this.random()<.5?40:920,y:this.random()*580,r:36,a:angle,vx:Math.cos(angle)*(30+this.level*8),vy:Math.sin(angle)*(30+this.level*8)});}}
 shoot(){if(this.cooldown>0||this.phase!=='playing')return;const s=this.ship;this.bullets.push({x:s.x+Math.cos(s.a)*20,y:s.y+Math.sin(s.a)*20,vx:s.vx+Math.cos(s.a)*560,vy:s.vy+Math.sin(s.a)*560,life:1.2});this.cooldown=.17;}
 step(dt,keys={}){if(this.phase!=='playing')return;dt=Math.min(.04,dt);const s=this.ship;if(keys.left)s.a-=3.8*dt;if(keys.right)s.a+=3.8*dt;if(keys.up){s.vx+=Math.cos(s.a)*255*dt;s.vy+=Math.sin(s.a)*255*dt;}const speed=Math.hypot(s.vx,s.vy);if(speed>360){s.vx*=360/speed;s.vy*=360/speed;}s.vx*=Math.exp(-.11*dt);s.vy*=Math.exp(-.11*dt);s.x=(s.x+s.vx*dt+960)%960;s.y=(s.y+s.vy*dt+580)%580;s.shield=Math.max(0,s.shield-dt);this.cooldown=Math.max(0,this.cooldown-dt);if(keys.fire)this.shoot();
  for(const r of this.rocks){r.x=(r.x+r.vx*dt+960)%960;r.y=(r.y+r.vy*dt+580)%580;r.a+=dt*.12;}
  for(const b of this.bullets){b.x=(b.x+b.vx*dt+960)%960;b.y=(b.y+b.vy*dt+580)%580;b.life-=dt;}
  for(const b of this.bullets){if(b.life<=0)continue;const i=this.rocks.findIndex(r=>Math.hypot(r.x-b.x,r.y-b.y)<r.r);if(i<0)continue;const r=this.rocks.splice(i,1)[0];b.life=0;this.score+=r.r>=30?20:r.r>=18?50:100;this.events.push({x:r.x,y:r.y});if(r.r>15)for(const d of [-1,1]){const a=this.random()*Math.PI*2;this.rocks.push({x:r.x,y:r.y,r:r.r*.58,a,vx:Math.cos(a)*(70+this.level*12),vy:Math.sin(a)*(70+this.level*12)});}}
  this.bullets=this.bullets.filter(b=>b.life>0);if(!s.shield&&this.rocks.some(r=>Math.hypot(s.x-r.x,s.y-r.y)<r.r+10)){this.lives--;Object.assign(s,{x:480,y:290,vx:0,vy:0,shield:2.5});if(!this.lives)this.phase='over';}
  if(!this.rocks.length){this.level++;this.wave();s.shield=2;}
 }
}

class Frogger{
 constructor(seed=1){this.level=1;this.score=0;this.lives=3;this.homes=new Set();this.phase='playing';this.clock=0;this.time=55;this.frog={x:480,row:10,fromX:480,fromRow:10,jump:0,safe:.5};this.lanes=[];this.makeLanes();}
 makeLanes(){this.lanes=[];for(const row of [1,2,3,5,6,7,8]){const river=row<4,speed=(row%2?1:-1)*(river?40:65)*(1+(this.level-1)*.13);const width=river?185:80;const objects=Array.from({length:3},(_,i)=>({x:i*310+(row*59)%170,width}));this.lanes.push({row,river,speed,objects});}}
 move(dx,dy){if(this.phase!=='playing'||this.frog.jump>.045)return false;const f=this.frog,nx=f.x+dx*60,nr=f.row+dy;if(nx<110||nx>850||nr<0||nr>10)return false;f.fromX=f.x;f.fromRow=f.row;f.x=nx;f.row=nr;f.jump=.12;return true;}
 die(){const f=this.frog;if(f.safe>0)return;this.lives--;Object.assign(f,{x:480,row:10,fromX:480,fromRow:10,jump:0,safe:1});this.time=55;if(this.lives<=0)this.phase='over';}
 step(dt){if(this.phase!=='playing')return;dt=Math.min(.04,dt);this.clock+=dt;this.time-=dt;const f=this.frog;f.jump=Math.max(0,f.jump-dt);f.safe=Math.max(0,f.safe-dt);
  for(const lane of this.lanes){for(const o of lane.objects){o.x+=lane.speed*dt;if(o.x>1050)o.x=-240;if(o.x<-240)o.x=1050;}
   if(f.row!==lane.row||f.jump>.035)continue;const on=lane.objects.some(o=>Math.abs(f.x-o.x)<o.width/2-(lane.river?5:-13));if(lane.river){if(!on){this.die();continue;}f.x+=lane.speed*dt;f.fromX+=lane.speed*dt;if(f.x<100||f.x>860)this.die();}else if(on)this.die();}
  if(f.row===0&&f.jump===0){const homes=[150,300,480,660,810];const id=homes.findIndex(x=>Math.abs(f.x-x)<29);if(id<0||this.homes.has(id))this.die();else{this.homes.add(id);this.score+=100+Math.round(this.time);Object.assign(f,{x:480,row:10,fromX:480,fromRow:10,jump:0,safe:.6});this.time=55;if(this.homes.size===5){this.level++;this.score+=500;this.homes.clear();this.makeLanes();}}}
  if(this.time<=0){f.safe=0;this.die();}
 }
}
class Bubbles{
 constructor(level=1){this.level=level;this.w=960;this.h=580;this.player={x:480,target:480};this.lives=3;this.time=70;this.score=0;this.phase='playing';this.invulnerable=1;this.cooldown=0;this.harpoon=null;this.events=[];this.bubbles=Array.from({length:Math.min(5,1+Math.floor(level/2))},(_,i)=>({x:150+i*165,y:180+(i%2)*60,vx:(i%2?1:-1)*(95+level*6),vy:-60,r:48}));}
 fire(){if(this.phase!=='playing'||this.harpoon||this.cooldown>0)return false;this.harpoon={x:this.player.x,tip:524,age:0};this.cooldown=.25;return true;}
 step(dt,keys={}){if(this.phase!=='playing')return;dt=Math.min(.04,dt);this.time-=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.player.x=clamp(this.player.x+((keys.right?1:0)-(keys.left?1:0))*320*dt,26,934);if(keys.fire)this.fire();
  if(this.harpoon){this.harpoon.tip-=850*dt;this.harpoon.age+=dt;if(this.harpoon.tip<22||this.harpoon.age>1)this.harpoon=null;}
  for(const b of this.bubbles){b.vy+=450*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<b.r||b.x>960-b.r){b.x=clamp(b.x,b.r,960-b.r);b.vx=-b.vx;}if(b.y>530-b.r){b.y=530-b.r;b.vy=-Math.sqrt(2*450*(b.r>=40?310:b.r>=25?220:130));}}
  const h=this.harpoon;if(h){const i=this.bubbles.findIndex(b=>Math.abs(b.x-h.x)<b.r+3&&b.y+b.r>=h.tip&&b.y-b.r<=530);if(i>=0){const b=this.bubbles.splice(i,1)[0];this.harpoon=null;this.score+=Math.round(240/b.r)*10;this.events.push({x:b.x,y:b.y});if(b.r>19)for(const d of [-1,1])this.bubbles.push({x:b.x+d*12,y:b.y,vx:d*(140+(48-b.r)*2),vy:-210,r:b.r>=40?29:17});}}
  if(!this.invulnerable&&this.bubbles.some(b=>Math.hypot(b.x-this.player.x,b.y-512)<b.r+16)){this.lives--;this.invulnerable=1.6;if(!this.lives)this.phase='over';}
  if(!this.bubbles.length){this.phase='won';this.score+=Math.ceil(this.time)*5;}if(this.time<=0)this.phase='over';
 }
}
class Moles{
 constructor(seed=1){this.random=rng(seed);this.score=0;this.hits=0;this.streak=0;this.time=45;this.phase='ready';this.holes=Array(9).fill(null);this.next=.1;this.events=[];}
 hit(i){if(this.phase==='over')return false;if(this.phase==='ready')this.phase='playing';const m=this.holes[i];if(!m){this.streak=0;return false;}this.holes[i]=null;this.streak++;this.hits++;const value=(m.gold?50:10)*(1+Math.min(2,Math.floor(this.streak/5)));this.score+=value;this.events.push({hole:i,value});return true;}
 step(dt){if(this.phase==='ready'){if(!this.holes.some(Boolean))this.holes[4]={time:1.65,max:2,gold:false};return;}if(this.phase!=='playing')return;this.time-=dt;if(this.time<=0){this.phase='over';return;}this.next-=dt;
  for(let i=0;i<9;i++){const m=this.holes[i];if(m){m.time-=dt;if(m.time<=0){this.holes[i]=null;this.streak=0;}}}
  if(this.next<=0){const empty=this.holes.map((h,i)=>h?null:i).filter(i=>i!==null);if(empty.length){const i=empty[Math.floor(this.random()*empty.length)],time=Math.max(.5,1.6-this.hits*.012);this.holes[i]={time,max:time,gold:this.hits%7===6};}this.next=Math.max(.24,.75-this.hits*.007);}
 }
}
return {clamp,rng,clone,shuffle,Hanoi,Pipes,Piano,Capsules,Cards,rank,suit,red,Pegs,Asteroids,Frogger,Bubbles,Moles,rotateMask};
});

const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/games/tea-service-model.js');
const step=(g,n)=>{for(let i=0;i<n;i++)g.advance(M.STEP);return g.view();};
function firstGuest(g){g.advance(M.STEP);const c=g.view().queue[0];assert.ok(c);return c;}
function seat(g,table=0){const c=firstGuest(g);assert.equal(g.act('queue',c.id),true);assert.equal(g.act('table',table),true);return c;}
function emptyEndState({shift=0,score=null,status='playing'}={}){const s=M.create({shift,score:120}).serialize();s.scheduleIndex=M.SHIFTS[shift].schedule.length;s.ticks=status==='lost'?M.SHIFTS[shift].duration:M.SHIFTS[shift].schedule.at(-1)[0]+1;s.score=score??s.bankScore+M.SHIFTS[shift].target;s.status=status;return M.restore(s);}

test('three original shifts define a finite service loop and table capacities',()=>{
 assert.equal(M.SHIFTS.length,3);assert.deepEqual(M.TABLE_CAPACITIES,[2,2,3]);assert.ok(M.SHIFTS.every(s=>s.duration>0&&s.schedule.length>=4&&s.target>0));
});

test('seating respects party size, matching table capacity and stays reversible on a block',()=>{
 const s=M.create().serialize();s.scheduleIndex=1;s.ticks=1;s.queue=[1];s.customers=[{id:1,size:3,patience:689,maxPatience:690,recipe:2,status:'queue',tableIndex:null,arrivedAt:0}];s.nextId=2;const g=M.restore(s);assert.ok(g);const large=g.view().queue[0];
 assert.equal(g.act('queue',large.id),true);assert.equal(g.act('table',0),false);assert.equal(g.view().tables[0].state,'empty');assert.equal(g.view().selectedCustomerId,large.id);
 assert.equal(g.act('table',2),true);assert.equal(g.view().tables[2].customerId,large.id);
});

test('complete table cycle is order, cook, pick up and serve; meal settlement and table turnover are automatic',()=>{
 const g=M.create(),c=seat(g,0);assert.equal(g.view().tables[0].state,'order');assert.equal(g.act('table',0),true);assert.equal(g.view().tickets[0].status,'cooking');
 const done=step(g,M.RECIPES[c.recipe].cook);assert.equal(done.tickets[0].status,'ready');assert.equal(g.act('kitchen'),true);assert.equal(g.view().heldTicket.customerId,c.id);
 assert.equal(g.act('table',0),true);assert.equal(g.view().tables[0].state,'eating');const score=g.view().score;let events=[];for(let i=0;i<92+32*c.size;i++)events.push(...g.advance(M.STEP));assert.ok(g.view().score>score);assert.equal(g.view().tables[0].state,'empty');assert.equal(g.view().customers.some(x=>x.id===c.id),false);assert.ok(events.some(e=>e.kind==='payment'&&e.customerId===c.id));
});

test('FIFO kitchen tickets cannot be served at the wrong table',()=>{
 const g=M.create();const a=seat(g,0);step(g,150);const b=g.view().queue[0];assert.ok(b);g.act('queue',b.id);g.act('table',1);g.act('table',0);g.act('table',1);
 assert.equal(g.view().tickets.length,2);step(g,M.RECIPES[a.recipe].cook);assert.equal(g.view().tickets[0].status,'ready');assert.equal(g.act('kitchen'),true);assert.equal(g.act('table',1),false);assert.equal(g.view().tables[1].state,'ordered');assert.equal(g.act('table',0),true);assert.equal(g.view().tables[0].state,'eating');
});

test('queued customers lose patience and three departures end the shift',()=>{
 const s=M.create().serialize();s.scheduleIndex=3;s.ticks=500;s.queue=[1,2,3];s.customers=[1,2,3].map((id,i)=>({id,size:1,patience:1,maxPatience:500,recipe:i%3,status:'queue',tableIndex:null,arrivedAt:0}));s.nextId=4;
 const g=M.restore(s);assert.ok(g);const events=g.advance(M.STEP);assert.equal(events.filter(e=>e.kind==='leave').length,3);assert.equal(g.view().missed,3);assert.equal(g.view().status,'lost');const terminal=g.serialize();g.advance(1000);assert.deepEqual(g.serialize(),terminal);
});

test('completed shift checks target; next stage banks score and retry drops current-shift gains',()=>{
 const g=emptyEndState({shift:0});assert.ok(g);g.advance(M.STEP);assert.equal(g.view().status,'cleared');const n=g.next();assert.equal(n.view().shift,1);assert.equal(n.view().bankScore,g.view().score);
 const lost=emptyEndState({shift:1,score:120,status:'lost'});assert.ok(lost);const retry=lost.retry();assert.equal(retry.view().shift,1);assert.equal(retry.view().score,120);assert.equal(retry.view().bankScore,120);
 const win=emptyEndState({shift:2});win.advance(M.STEP);assert.equal(win.view().status,'won');assert.equal(win.next(),null);
});

test('shift timer fails unfinished service and no order or payment is granted after terminal state',()=>{
 const s=M.create().serialize();s.ticks=M.SHIFTS[0].duration-1;s.scheduleIndex=M.SHIFTS[0].schedule.length;const g=M.restore(s);assert.ok(g);g.advance(M.STEP);assert.equal(g.view().status,'lost');const stop=g.serialize();assert.equal(g.act('kitchen'),false);g.advance(M.STEP*20);assert.deepEqual(g.serialize(),stop);
});

test('replay and save restore preserve ticket timers, table state and deterministic outcomes',()=>{
 const a=M.create();const c=seat(a,0);a.act('table',0);step(a,17);const b=M.restore(a.serialize());assert.ok(b);for(let i=0;i<80;i++){assert.deepEqual(a.advance(M.STEP),b.advance(M.STEP));assert.deepEqual(a.serialize(),b.serialize());}
 const x=M.create(),y=M.create();for(let i=0;i<60*12;i++)x.advance(1000/60);for(let i=0;i<120*6;i++)y.advance(1000/60);assert.deepEqual(x.serialize(),y.serialize());
});

test('corrupt, impossible and future snapshots are rejected without aliasing',()=>{
 const s=M.create().serialize();for(const edit of [x=>x.version=2,x=>x.shift=9,x=>x.score=-1,x=>x.tables[0].state='???',x=>x.queue=[999],x=>x.cookingId=500,x=>x.scheduleIndex=999]){const bad=structuredClone(s);edit(bad);assert.equal(M.restore(bad),null);}
 const g=M.restore(s);assert.ok(g);g.view().tables[0].state='dirty';assert.equal(g.view().tables[0].state,'empty');
});

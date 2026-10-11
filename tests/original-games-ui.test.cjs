const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../scripts/original-games-batch.js'), 'utf8');
class Node {
  constructor(tag='DIV'){this.tagName=tag;this.dataset={};this.style={};this.disabled=false;this.textContent='';this.hidden=false;this.children=[];
    this._listeners=new Map();this._classes=new Set();this.classList={toggle:(c,on)=>{if(on)this._classes.add(c);else this._classes.delete(c);},contains:c=>this._classes.has(c)};
  }
  addEventListener(type,fn){const list=this._listeners.get(type)||[];list.push(fn);this._listeners.set(type,list);}
  removeEventListener(type,fn){this._listeners.set(type,(this._listeners.get(type)||[]).filter(x=>x!==fn));}
  fire(type,more={}){const e={target:this,pointerId:1,clientX:0,clientY:0,key:'',repeat:false,preventDefault(){}, ...more};for(const f of this._listeners.get(type)||[])f(e);}
  replaceChildren(...kids){this.children=kids;}
  closest(selector){return selector.includes('[data-choice]')&&this.dataset.choice!==undefined?this:null;}
  getBoundingClientRect(){return {left:0,top:0,width:720,height:460};}
  setPointerCapture(){}
  focus(){}
}
function harness(){
  const doc=new Node('DOCUMENT');doc.hidden=false;doc.createElement=tag=>new Node(tag.toUpperCase());
  const win=new Node('WINDOW');win.devicePixelRatio=1;win.document=doc;
  const storage=new Map();win.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  const ctx=new Proxy({}, {get(t,k){if(k==='createLinearGradient')return ()=>({addColorStop(){}});return k in t?t[k]:()=>{};},set(t,k,v){t[k]=v;return true;}});
  const elem=new Node('SECTION'),nodes=new Map();
  Object.defineProperty(elem,'innerHTML',{set(s){nodes.clear();for(const m of s.matchAll(/data-a="([\w-]+)"/g)){const key=m[1];const node=new Node(key==='canvas'?'CANVAS':'DIV');if(key==='canvas'){node.width=720;node.height=460;node.getContext=()=>ctx;}nodes.set(key,node);}},get(){return 'fixture';}});
  elem.querySelector=selector=>nodes.get(selector.match(/data-a="([\w-]+)"/)?.[1]);
  let active,clock=0,count=0,fallback=[];
  win.NP_GameSession={start(){if(active)active.stop();const cleanup=[],pending=[];let stopped=false;
    active={listen(target,type,fn){target.addEventListener(type,fn);cleanup.push(()=>target.removeEventListener(type,fn));},
      onCleanup(fn){cleanup.push(fn);},requestAnimationFrame(fn){if(!stopped)pending.push(fn);},
      stop(){stopped=true;pending.splice(0);cleanup.splice(0).forEach(fn=>fn());},
      advance(frames=1){for(let i=0;i<frames;i++){clock+=16.667;const jobs=pending.splice(0);for(const fn of jobs)fn(clock);}},
      get stopped(){return stopped;}}
    return active;
  }};
  win.NP_Engines={launchRetroArcade(_c,g){fallback.push(g.id);}};
  vm.runInNewContext(script,{window:win,Math,Set,Array,Number,String,Date,console});
  return {window:win,container:elem,nodes,get:key=>nodes.get(key),fallback,session:()=>active,launch:id=>win.NP_Engines.launchRetroArcade(elem,{id})};
}
test('launches each exact-ID engine but forwards unrelated IDs',()=>{
  const h=harness();for(const id of h.window.NP_OriginalBatch.ids){const engine=h.launch(id);assert.ok(engine.s);assert.ok(h.get('meta'));h.session().advance(4);}
  h.launch('unknown-game');assert.deepEqual(h.fallback,['unknown-game']);
});
test('ring pointer mechanics render and update score after a flight',()=>{
  const h=harness(),engine=h.launch('nem-vong-co-chai');h.session().advance(2);
  const b=engine.s.bottles[0],cv=h.get('canvas');cv.fire('pointerdown',{clientX:b.x,clientY:b.y});cv.fire('pointerup',{clientX:b.x,clientY:b.y});
  h.session().advance(50);assert.equal(engine.s.hits,1);assert.match(h.get('meta').textContent,/điểm/);
  h.get('pause').fire('click');assert.equal(engine.s.paused,true);
  h.get('pause').fire('click');assert.equal(engine.s.paused,false);
});
test('keyboard dart and touch dart share ammunition budget; reset restores play',()=>{
  const h=harness(),engine=h.launch('phi-tieu-bong-bong');h.session().advance(2);
  const cv=h.get('canvas'),p=engine.position(engine.s.balls[0]);
  cv.fire('pointerdown',{clientX:p.x,clientY:p.y});h.session().advance(15);
  assert.equal(engine.s.shots,1);
  cv.fire('keydown',{key:' '});assert.equal(engine.s.shots,2);
  h.get('reset').fire('click');assert.equal(engine.s.shots,0);
});
test('quiz displays real semantic buttons, accepts answer and lifelines',()=>{
  const h=harness(),engine=h.launch('ai-la-trieu-phu');h.session().advance(2);
  assert.equal(h.get('answers').children.length,4);
  h.get('half').fire('click');assert.equal(engine.s.hidden.length,2);
  const correct=h.get('answers').children[engine.question().correct];
  h.get('answers').fire('click',{target:correct});assert.equal(engine.s.phase,'feedback');
  h.session().advance(83);assert.equal(engine.s.index,1);
  assert.equal(h.get('answers').children.length,4);
});
test('switching games stops the previous RAF and event listeners',()=>{
  const h=harness();h.launch('nem-vong-co-chai');const first=h.session(),oldCanvas=h.get('canvas');
  h.launch('ai-la-trieu-phu');assert.equal(first.stopped,true);
  assert.equal(oldCanvas._listeners.get('pointerdown').length,0);
  h.session().advance(4);assert.equal(h.get('answers').children.length,4);
});
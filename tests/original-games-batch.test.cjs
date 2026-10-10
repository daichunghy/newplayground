const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../scripts/original-games-batch.js'),'utf8');
function setup(id) {
  const handlers = new Map(), nodes=new Map(), frames=[];
  const canvas={style:{},width:720,height:460,
    getContext(){return new Proxy({createLinearGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}});},
    getBoundingClientRect(){return {left:0,top:0,width:720,height:460}},
    setPointerCapture(){}};
  function node(key){if(!nodes.has(key))nodes.set(key,key==='#ngCanvas'?canvas:{style:{},textContent:'',listeners:{}});return nodes.get(key);}
  const container={isConnected:true,innerHTML:'',querySelector:node};
  const listeners=[];
  const session={listen(target,event,handler){listeners.push({target,event,handler});},requestAnimationFrame(fn){frames.push(fn);},setTimeout(fn){fn();}};
  const window={NP_GameSession:{start(){return session;}},NP_Engines:{launchRetroArcade(){throw Error('fallback called')}}};
  vm.runInNewContext(source,{window,Math,Set,Array,Number,String});
  window.NP_Engines.launchRetroArcade(container,{id,title:id});
  function fire(target,event,data={}){for(const item of listeners)if(item.target===target&&item.event===event)item.handler({clientX:0,clientY:0,pointerId:1,target,preventDefault(){},...data});}
  return {window,container,canvas,fire,node,frames};
}
test('three catalog IDs have distinct original engines',()=>{
  const ids=['nem-vong-co-chai','phi-tieu-bong-bong','ai-la-trieu-phu'];
  for(const id of ids){
    const h=setup(id);
    assert.match(h.container.innerHTML,/ngCanvas/);
    assert.ok(h.frames.length>0);
    assert.match(h.node('#ngTitle').textContent,/Ném vòng|Phi tiêu|kiến thức/);
  }
});
test('ring game rewards accurate throws and proceeds through a win',()=>{
  const h=setup('nem-vong-co-chai');
  for(const x of [150,255,360]){
    h.fire(h.canvas,'pointerdown',{clientX:x,clientY:400});
    h.fire(h.canvas,'pointerup',{clientX:x,clientY:400});
  }
  assert.match(h.node('#ngMessage').textContent,/Qua màn/);
  h.fire(h.node('#ngNext'),'click');
  assert.match(h.node('#ngStats').textContent,/Màn 2/);
});
test('dart game loses after ten misses and restarts',()=>{
  const h=setup('phi-tieu-bong-bong');
  for(let i=0;i<10;i++)h.fire(h.canvas,'pointerdown',{clientX:700,clientY:440});
  assert.match(h.node('#ngMessage').textContent,/Hết lượt/);
  h.fire(h.node('#ngNext'),'click');
  assert.match(h.node('#ngStats').textContent,/Lượt 10/);
});
test('quiz answers, loses three lives, and restarts',()=>{
  const h=setup('ai-la-trieu-phu');
  for(let i=0;i<3;i++)h.fire(h.window,'keydown',{key:'1'});
  assert.match(h.node('#ngMessage').textContent,/Hết lượt/);
  h.fire(h.node('#ngRestart'),'click');
  assert.match(h.node('#ngStats').textContent,/Màn 1/);
});
test('pause, resume and restart controls are interactive',()=>{
  const h=setup('nem-vong-co-chai');
  h.fire(h.node('#ngPause'),'click');assert.equal(h.node('#ngPause').textContent,'Tiếp tục');
  h.fire(h.node('#ngPause'),'click');assert.equal(h.node('#ngPause').textContent,'Tạm dừng');
  h.fire(h.node('#ngRestart'),'click');assert.match(h.node('#ngStats').textContent,/Màn 1/);
});

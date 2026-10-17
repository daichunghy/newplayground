'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const C=require('../scripts/arcade-core.js');
const games=require('../data/games.json');
const legacy=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=legacy.indexOf('if (window.NP_Retro50Engines && window.NP_Retro50Engines.hasGame(gId))');
const end=legacy.indexOf('\n    } catch (error)',start);
assert.ok(start>0&&end>start,'legacy routing block must be found');
const calls=[];
const context={window:{},launchGameSandbox:()=>calls.push('launchRetroArcade')};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/engines-retro50.js'),'utf8'),context);
context.window.NP_Retro50Engines.launchGame=()=>calls.push('retro50');
context.window.NP_Engines=new Proxy({}, {get:(_,name)=>()=>calls.push(name)});
const oldDispatch=vm.runInNewContext(`(function(gId){const container={},game={id:gId};${legacy.slice(start,end)}})`,context);

test('new portal selects exactly the legacy engine for all 150 entries',()=>{
  assert.equal(games.length,150);
  for(const g of games){calls.length=0;oldDispatch(g.id);assert.equal(calls.length,1,g.id);assert.equal(C.routeFor(g,context.window.NP_Retro50Engines),calls[0],g.id);assert.equal(C.routeFor(g),calls[0],g.id+' pure classification');}
});
test('known route priorities do not silently change existing gameplay',()=>{
  assert.equal(C.routeFor({id:'bubble-bobble-khung-long-bong-bong'}),'retro50');
  assert.equal(C.routeFor({id:'dr-mario'}),'launchMario','the inherited alias issue is documented, not silently relabelled a dedicated Dr Mario game');
  assert.equal(C.routeFor({id:'lemonade-tycoon'}),'launchRetroArcade');
  assert.equal(C.profile(games.find(g=>g.id==='typer-shark')).experimental,false);
});
test('every game has a finite valid presentation profile and SVG cover',()=>{
  for(const g of games){const p=C.profile(g);assert.ok(p.title&&p.help&&p.objective,g.id);assert.match(p.surface,/^#[0-9a-f]{6}$/i);assert.match(p.accent,/^#[0-9a-f]{6}$/i);const svg=decodeURIComponent(C.cover(g).split(',').slice(1).join(','));assert.match(svg,/<svg[^>]+viewBox="0 0 400 260"/);assert.doesNotMatch(svg,/NaN|undefined|<script|https?:\/\/(?!www\.w3\.org)/);}
});
test('curated starting games exist and are not generic fallback routes',()=>{
  assert.equal(new Set(C.featured).size,C.featured.length);
  for(const id of C.featured){const game=games.find(g=>g.id===id);assert.ok(game,id);assert.equal(C.profile(game).experimental,false,id);}
});
test('Vietnamese search handles accents, đ and whitespace',()=>{
  assert.equal(C.normalize('  ĐẨY THÙNG  '),'day thung');
  assert.ok(C.select(games,'ran san moi','all',[],[]).some(g=>g.id==='ran-san-moi-snake'));
  assert.ok(C.select(games,'2048','all',[],[]).some(g=>g.id==='tro-choi-2048'));
  assert.equal(C.select(games,'no-such-game-xyz','all',[],[]).length,0);
});
test('filters and search intersect without mutating catalog order',()=>{
  const before=games.map(g=>g.id);const selected=C.select(games,'','Quản lý',[],[]);
  assert.ok(selected.length>0);assert.ok(selected.every(g=>g.category==='Quản lý'));
  assert.deepEqual(games.map(g=>g.id),before);
  assert.deepEqual(C.select(games,'','favorites',['tro-choi-2048'],[]).map(g=>g.id),['tro-choi-2048']);
});
test('recent library is validated, unique, most recent first and bounded at twelve',()=>{
  const ids=games.slice(0,40).map(g=>g.id);
  const recent=C.remember(ids,ids[8],games);
  assert.equal(recent.length,12);assert.equal(recent[0],ids[8]);assert.equal(new Set(recent).size,recent.length);
  assert.deepEqual(C.cleanIds(['unknown',null,4,ids[0],ids[0]],games),[ids[0]]);
  assert.deepEqual(C.cleanIds({id:'hang-rong'},games),[]);
  assert.deepEqual(C.select(games,'','recent',[],[ids[4],ids[1]]).map(g=>g.id),[ids[4],ids[1]]);
});
test('blocked storage and malformed JSON are recoverable',()=>{
  const blocked={getItem(){throw new Error('denied');},setItem(){throw new Error('quota');}};
  assert.deepEqual(C.read(blocked,'x',[]),[]);assert.equal(C.write(blocked,'x',[]),false);
  assert.deepEqual(C.read({getItem:()=>'{bad'},'x',[]),[]);
  assert.deepEqual(C.read(null,'x',[]),[]);
});
test('existing favorite storage values remain compatible',()=>{
  const map=new Map([['np_favorites','["hang-rong","tro-choi-2048"]']]);
  const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const ids=C.cleanIds(C.read(storage,'np_favorites',[]),games);
  assert.equal(ids.length,2);assert.equal(C.write(storage,'np_favorites',ids),true);
  assert.deepEqual(JSON.parse(map.get('np_favorites')),ids);
});
test('titles and attribute values cannot inject markup',()=>{
  assert.equal(C.escape('<img onerror="x">&\''),'&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;');
  assert.doesNotMatch(C.icon('unknown'),/undefined/);
});
test('new HTML has one portal entry and no third-party fallback images',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/scripts\/arcade-portal\.js/);assert.doesNotMatch(html,/<script[^>]+src="app\.js/);
  assert.doesNotMatch(html,/unsplash|onerror=/);assert.match(html,/aria-modal="true"/);
  assert.match(html,/viewport-fit=cover/);
});

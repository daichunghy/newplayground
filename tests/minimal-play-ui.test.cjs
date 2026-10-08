const test=require('node:test'),assert=require('node:assert/strict');
const {harness,read}=require('./support/browser-harness.cjs');
// Static initial-copy budget, not a rendered layout/screenshot measurement.
function visibleWords(html){
 const stack=[{tag:'root',hidden:false,details:false}],text=[];
 for(const part of html.match(/<[^>]*>|[^<]+/g)||[]){
  if(part.startsWith('</')){const tag=part.match(/^<\/([\w-]+)/)?.[1];for(let i=stack.length-1;i>0;i--)if(stack[i].tag===tag){stack.length=i;break;}continue;}
  if(part.startsWith('<')){
   if(part.startsWith('<!--'))continue;const tag=part.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
   const parent=stack[stack.length-1],selfHidden=/\shidden(?:\s|>|=)/.test(part)||/aria-hidden=["']true/.test(part)||/class=["'][^"']*(?:np-game-sr|sn-sr|tg-sr|sr-only)/.test(part)||['script','style','option'].includes(tag);
   const hidden=parent.hidden||selfHidden||(parent.details&&tag!=='summary');
   if(!/\/>$/.test(part)&&!['img','input','br','hr','meta','link','source','path','use'].includes(tag))stack.push({tag,hidden,details:tag==='details'});
  }else if(!stack[stack.length-1].hidden)text.push(part);
 }
 return text.join(' ').replace(/&[^;]+;/g,' ').match(/[\p{L}\p{N}]+/gu)||[];
}
for(const[id,max]of [['do-min-minesweeper',45],['tro-choi-2048',45],['line-98',40],['xep-gach-tetris',50],['dat-bom-bomberman',45],['mario-co-dien',45],['diner-dash',50],['plants-vs-zombies-2d',45],['danh-bai-uno',45],['dao-vang',45],['ban-trung-khung-long',45],['kim-cuong-bejeweled',45],['ban-xe-tang-1990',45],['nong-trai-vui-ve',45],['gunny-2d',45],['nuoi-ca-nemo',45],['co-caro',45],['co-tuong',45],['ban-bi-ve',50],['o-an-quan',35],['feeding-frenzy',35],['ran-san-moi-snake',45],['flappy-bird',55],['chem-hoa-qua',40],['pha-gach-dx-ball',50],['day-thung-sokoban',45],['pong-1972',50],['ban-ga-vu-tru',40],['lat-the-tri-nho',35],['audition-nhip-dieu',55],['boom-online-bnb',45],['duck-hunt-ban-vit',50],['rockman-mega-man',55],['street-fighter-2-doi-khang',55],['road-rash-dua-xe-moto',55],['raft-wars-ban-sung-phao',55],['bubble-bobble-khung-long-bong-bong',55],['age-of-war-thoi-dai-chien-tranh',55],['bloxorz-khoi-da-lan',55],['xep-bai-solitaire',55],['xep-bai-freecell',55],['xep-bai-nhen-spider',55],['arkanoid-dap-gach',55],['puzzle-bobble-khung-long',45],['dr-mario-diet-khuan',45],['peggle-pachinko',45]]){
 test(id+' starts with a small visible-copy budget and accessible live feedback',()=>{
  const h=harness();h.context.openGameById(id);assert.deepEqual(h.errors,[]);
  const words=visibleWords(h.container.innerHTML);assert.ok(words.length<=max,`${words.length} initial words: ${words.join(' ')}`);
  const statusIds={'do-min-minesweeper':'dmStatus','tro-choi-2048':'g2048Status','line-98':'l98Status','xep-gach-tetris':'fbStatus','dat-bom-bomberman':'gbStatus','mario-co-dien':'ccStatus','diner-dash':'tsStatus','plants-vs-zombies-2d':'bsStatus','danh-bai-uno':'ssAnnounce','dao-vang':'vrStatus','ban-trung-khung-long':'smStatus','kim-cuong-bejeweled':'kkStatus','ban-xe-tang-1990':'rvStatus','nong-trai-vui-ve':'sgStatus','gunny-2d':'wdStatus','nuoi-ca-nemo':'seaStatus','co-caro':'caroStatus','co-tuong':'xqStatus','ban-bi-ve':'bbvStatus','o-an-quan':'oaqStatus','feeding-frenzy':'feedingStatus','ran-san-moi-snake':'snStatus','flappy-bird':'fgStatus','chem-hoa-qua':'fsStatus','pha-gach-dx-ball':'dbStatus','pong-1972':'p72Status','ban-ga-vu-tru':'bgtStatus','lat-the-tri-nho':'nhStatus','audition-nhip-dieu':'nmFeedback','boom-online-bnb':'tgStatus','duck-hunt-ban-vit':'bvbLive','rockman-mega-man':'mcStatus','street-fighter-2-doi-khang':'ndLive','road-rash-dua-xe-moto':'ddLive','raft-wars-ban-sung-phao':'rpLive','bubble-bobble-khung-long-bong-bong':'mgLive','age-of-war-thoi-dai-chien-tranh':'efLive','bloxorz-khoi-da-lan':'kdStatus','xep-bai-solitaire':'klStatus','xep-bai-freecell':'fcStatus','xep-bai-nhen-spider':'spStatus','arkanoid-dap-gach':'ogStatus','puzzle-bobble-khung-long':'bvStatus','dr-mario-diet-khuan':'ttStatus','peggle-pachinko':'pcStatus'};
  const status=h.container.querySelector(id==='day-thung-sokoban'?'.np-soko-status':'#'+statusIds[id]);
  assert.equal(status.getAttribute('role'),'status');assert.equal(status.getAttribute('aria-live'),'polite');
  h.context.closeGameModal();
 });
}
test('legacy intro is started once; supporting instructions are not on the play surface',()=>{
 const h=harness();let started=0;
 h.context.NP_Engines.launchDinerDash=container=>{h.context.NP_GameSession.start();container.innerHTML='<button id="ddStartGameBtn">Play</button>';container.querySelector('#ddStartGameBtn').addEventListener('click',()=>started++);};
 h.context.openGameById('diner-dash');assert.equal(started,1);h.context.closeGameModal();
 assert.match(read('scripts/games/play-ui.css'),/\.canvas-controls-bar small/);assert.match(read('scripts/games/play-ui.css'),/\.intro-desc/);
 assert.doesNotMatch(read('app.js'),/class="game-card-tagline"/);assert.doesNotMatch(read('index.html'),/class="hero-subtitle"/);
});
test('shared quiet UI stylesheet is shipped and used by the offline review exporter',()=>{
 assert.match(read('index.html'),/scripts\/games\/play-ui\.css/);assert.match(read('scripts/build-review-preview.mjs'),/scripts\/games\/play-ui\.css/);
 assert.match(read('scripts/games/play-ui.css'),/\.np-game-sr/);
});

test('Hàng Rong starts directly with compact cooking and serving controls',()=>{
 const h=harness();h.context.openGameById('hang-rong');assert.deepEqual(h.errors,[]);
 const words=visibleWords(h.container.innerHTML);assert.ok(words.length<=40,`${words.length} words: ${words.join(' ')}`);
 assert.equal(h.container.querySelector('#hr3Prep'),null);assert.equal(h.container.querySelector('#hr3Restock'),null);assert.equal(h.container.querySelector('#hr3Upgrades'),null);
 assert.ok(h.container.querySelector('#hr3Cook0'));assert.ok(h.container.querySelector('#hr3Customer0'));
 h.context.closeGameModal();
});

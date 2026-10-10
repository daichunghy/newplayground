/* Đào Ngọc — original three-map dig-and-fall turn puzzle. No historic art. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NP_DaoNgoc=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const LEVELS=[
    ['############','#P...*... E#','#..O##.....#','#.*...O....#','#.###......#','#.......*..#','#...O......#','#..........#','#.....*....#','############'],
    ['############','#P..*.....E#','#.#O...#...#','#....*.....#','#..O..##...#','#.#........#','#....*..O..#','#...##.....#','#.......*..#','############'],
    ['############','#P.*......E#','#...##..O..#','#.*......*.#','#..O...#...#','#...#......#','#.*....O...#','#..#....*..#','#.........*#','############']
  ];
  const DIRECTIONS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  function create(maps=LEVELS){
    let s;
    function load(index){
      let raw=maps[index];if(!raw||!raw.length)throw Error('Đào Ngọc needs a cave');
      const cols=Math.max(...raw.map(r=>r.length)),rows=raw.length;
      const grid=raw.map(row=>row.padEnd(cols,'#').split(''));
      let player=null,exit=null,gems=0;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const c=grid[y][x];
        if(c==='P'){player={x,y};grid[y][x]=' ';}
        if(c==='E')exit={x,y};
        if(c==='*')gems++;
      }
      if(!player||!exit||!gems)throw Error('Cave requires player, exit and crystals');
      s={status:'ready',level:index,grid,cols,rows,player,exit,gems,initialGems:gems,
        steps:0,maxSteps:90+index*30,score:index? (s?.score||0):0,last:''};
    }
    load(0);
    function view(){return {...s,grid:s.grid.map(r=>r.slice()),player:{...s.player},exit:{...s.exit}};}
    function move(dir){
      if(s.status!=='playing'||!DIRECTIONS[dir])return false;
      const [dx,dy]=DIRECTIONS[dir],nx=s.player.x+dx,ny=s.player.y+dy;
      const at=(x,y)=>s.grid[y]?.[x]??'#';
      const target=at(nx,ny);
      if(target==='#'||target==='E'&&s.gems>0)return false;
      if(target==='O'){
        const to=at(nx+dx,ny+dy);
        if(dy!==0||to!==' ')return false;
        s.grid[ny][nx+dx]='O';s.grid[ny][nx]=' ';
      }
      const picked=target==='*';if(picked){s.gems--;s.score+=100;s.last='Nhặt được ngọc!';}
      else s.last=target==='.'?'Đã đào đất.':'Tiến lên!';
      s.grid[ny][nx]=' ';s.player={x:nx,y:ny};s.steps++;s.score+=2;
      if(target==='E'&&s.gems===0){
        s.score+=Math.max(0,s.maxSteps-s.steps)*5;
        if(s.level===maps.length-1){s.status='won';s.last='Thoát hang an toàn!';}
        else{const next=s.level+1,score=s.score;load(next);s.score=score;s.status='playing';s.last='Hang tiếp theo!';}
        return true;
      }
      // Gravity is turn-based, from bottom to top, so one rock drops one cell per turn.
      // Rocks may slide off another rock or wall if both side and diagonal are empty.
      const moved=new Set();
      for(let y=s.rows-2;y>=1;y--)for(let x=1;x<s.cols-1;x++){
        if(s.grid[y][x]!=='O'||moved.has(y+':'+x))continue;
        let tx=x,ty=y;
        if(at(x,y+1)===' '){ty=y+1;}
        else if(at(x,y+1)==='O'||at(x,y+1)==='#'){
          for(const side of [-1,1]){
            if(at(x+side,y)===' '&&at(x+side,y+1)===' '){tx=x+side;ty=y+1;break;}
          }
        }
        if(tx!==x||ty!==y){
          s.grid[y][x]=' ';s.grid[ty][tx]='O';moved.add(ty+':'+tx);
          if(tx===s.player.x&&ty===s.player.y){s.status='lost';s.last='Đá rơi trúng rồi!';}
        }
      }
      if(s.steps>=s.maxSteps&&s.status==='playing'){s.status='lost';s.last='Hết lượt di chuyển.';}
      return true;
    }
    return {view,move,
      start(){if(s.status!=='ready')return false;s.status='playing';return true;},
      pause(){if(s.status!=='playing')return false;s.status='paused';return true;},
      resume(){if(s.status!=='paused')return false;s.status='playing';return true;},
      restart(){load(0);return true;}
    };
  }
  function mount(container,session){
    if(!container||!session?.listen||!session?.requestAnimationFrame)throw Error('Đào Ngọc needs managed session');
    const doc=container.ownerDocument||window.document,w=doc.defaultView||window;
    container.innerHTML='<section class="n6-game n6-dig"><header class="n6-head"><div><small>HÀNH TRÌNH DƯỚI LÒNG ĐẤT</small><h2>Đào Ngọc</h2></div><div class="n6-tools"><button data-act="pause" aria-label="Tạm dừng">Ⅱ</button><button data-act="restart" aria-label="Chơi lại">↻</button><details class="n6-help"><summary aria-label="Luật chơi">?</summary><p>Đào đất, lấy hết ngọc để mở cửa. Đá rơi một ô sau mỗi bước và có thể đè bạn; đẩy đá sang ngang khi chỗ trống.</p></details></div></header><div class="n6-stats"><span>Điểm <b data-stat="score">0</b></span><span>Hang <b data-stat="level">1 / 3</b></span><span>Ngọc <b data-stat="gems">4</b></span><span>Bước <b data-stat="steps">0 / 90</b></span></div><div class="n6-stage"><canvas width="720" height="590" aria-label="Bản đồ hang, nhân vật, ngọc, đá, đất và cửa ra"></canvas><div class="n6-screen" data-screen><div class="n6-card"><h3 data-screen-title>Đào Ngọc</h3><p data-screen-text>Lấy hết ngọc để mở cửa.</p><button class="n6-primary" data-act="play">Bắt đầu</button></div></div></div><div class="n6-dpad" aria-label="Điều khiển di chuyển"><button data-dir="left" aria-label="Sang trái">←</button><button data-dir="up" aria-label="Lên">↑</button><button data-dir="down" aria-label="Xuống">↓</button><button data-dir="right" aria-label="Sang phải">→</button></div><p class="n6-feedback" data-feedback role="status" aria-live="polite">Dùng phím mũi tên hoặc vuốt.</p></section>';
    const q=s=>container.querySelector(s),canvas=q('canvas'),ctx=canvas.getContext('2d'),model=create();
    let alive=true,last='',startPoint=null,tick=0;
    function action(name){
      const v=model.view();
      if(name==='play'){if(v.status==='paused')model.resume();else{model.restart();model.start();}}
      if(name==='restart'){model.restart();model.start();}
      if(name==='pause'){if(v.status==='playing')model.pause();else if(v.status==='paused')model.resume();}
      sync();draw(model.view());
    }
    function step(dir){if(model.move(dir)){sync();draw(model.view());}}
    function sync(){
      const v=model.view();
      for(const[k,value]of Object.entries({score:v.score,level:v.level+1+' / '+LEVELS.length,gems:v.gems,steps:v.steps+' / '+v.maxSteps}))q('[data-stat="'+k+'"]').textContent=value;
      q('[data-feedback]').textContent=v.last||'Mũi tên hoặc vuốt để đi.';
      q('[data-act="pause"]').textContent=v.status==='paused'?'▶':'Ⅱ';
      q('[data-screen]').hidden=v.status==='playing';
      if(v.status!==last){
        q('[data-screen-title]').textContent=v.status==='won'?'Đã tìm được lối ra!':v.status==='lost'?'Chưa thoát hang':v.status==='paused'?'Tạm dừng':'Đào Ngọc';
        q('[data-screen-text]').textContent=v.status==='won'?'Điểm '+v.score+' · Hoàn thành '+LEVELS.length+' hang.':v.status==='lost'?v.last:v.status==='paused'?'Hãy xem đường đá rơi.':'Lấy hết ngọc để mở cửa.';
        q('[data-act="play"]').textContent=v.status==='paused'?'Tiếp tục':v.status==='ready'?'Bắt đầu':'Chơi lại';
      }
      last=v.status;
    }
    function draw(v){
      if(!ctx)return;
      ctx.clearRect(0,0,720,590);
      const grad=ctx.createLinearGradient(0,0,0,590);grad.addColorStop(0,'#202c4c');grad.addColorStop(1,'#0e1a2f');
      ctx.fillStyle=grad;ctx.fillRect(0,0,720,590);
      const tile=Math.min(48,548/v.rows,640/v.cols),ox=(720-v.cols*tile)/2,oy=(590-v.rows*tile)/2;
      for(let y=0;y<v.rows;y++)for(let x=0;x<v.cols;x++){
        const a=v.grid[y][x],px=ox+x*tile,py=oy+y*tile;
        ctx.fillStyle=(x+y)%2?'#23334b':'#293a53';ctx.fillRect(px+1,py+1,tile-2,tile-2);
        if(a==='#'){
          ctx.fillStyle='#536579';ctx.beginPath();ctx.roundRect(px+1,py+1,tile-2,tile-2,5);ctx.fill();
          ctx.strokeStyle='rgba(238,235,209,.13)';ctx.beginPath();ctx.moveTo(px+8,py+tile*.55);ctx.lineTo(px+tile*.8,py+tile*.25);ctx.stroke();
        }else if(a==='.'){
          ctx.fillStyle='#946d52';ctx.beginPath();ctx.roundRect(px+4,py+4,tile-8,tile-8,4);ctx.fill();
          ctx.fillStyle='#e5b074';for(let i=0;i<3;i++)ctx.fillRect(px+10+i*10,py+12+i*6,4,4);
        }else if(a==='O'){
          ctx.shadowColor='#131620';ctx.shadowBlur=8;ctx.fillStyle='#9ca9ba';ctx.beginPath();ctx.arc(px+tile/2,py+tile/2,tile*.36,0,7);ctx.fill();ctx.shadowBlur=0;
          ctx.strokeStyle='#e6ebeb';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px+tile/2,py+tile/2,tile*.23,3.4,5.6);ctx.stroke();
        }else if(a==='*'){
          const cx=px+tile/2,cy=py+tile/2+Math.sin(tick*.003+x)*2;
          ctx.shadowColor='#56f5d7';ctx.shadowBlur=14;ctx.fillStyle='#6df6d0';ctx.beginPath();ctx.moveTo(cx,cy-16);ctx.lineTo(cx+12,cy);ctx.lineTo(cx,cy+16);ctx.lineTo(cx-12,cy);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
        }else if(a==='E'){
          ctx.fillStyle=v.gems?'#48546a':'#55d9b0';ctx.beginPath();ctx.roundRect(px+5,py+3,tile-10,tile-5,5);ctx.fill();
          ctx.fillStyle='#162d3d';ctx.beginPath();ctx.roundRect(px+12,py+11,tile-24,tile-13,5);ctx.fill();
          ctx.fillStyle=v.gems?'#929eb5':'#fcf49a';ctx.font='700 18px Calibri, Inter, sans-serif';ctx.fillText(v.gems?'×':'✓',px+tile*.33,py+tile*.67);
        }
      }
      const px=ox+(v.player.x+.5)*tile,py=oy+(v.player.y+.5)*tile;
      ctx.fillStyle='#f8d58c';ctx.beginPath();ctx.arc(px,py-6,tile*.28,0,7);ctx.fill();
      ctx.fillStyle='#3fc5bd';ctx.beginPath();ctx.roundRect(px-tile*.23,py+tile*.05,tile*.46,tile*.28,5);ctx.fill();
      ctx.fillStyle='#163245';ctx.beginPath();ctx.arc(px-5,py-8,2.2,0,7);ctx.arc(px+5,py-8,2.2,0,7);ctx.fill();
    }
    session.listen(container,'click',e=>{
      const b=e.target.closest('button');if(!b||!container.contains(b))return;
      if(b.dataset.dir)step(b.dataset.dir);else if(b.dataset.act)action(b.dataset.act);
    });
    session.listen(w,'keydown',e=>{
      if(!container.isConnected||e.altKey||e.ctrlKey||e.metaKey||/input|textarea|select/i.test(e.target?.tagName||''))return;
      const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}[e.key];
      if(dir){e.preventDefault();step(dir);}
      else if(e.key.toLowerCase()==='p'||e.key==='Escape'){e.preventDefault();action('pause');}
    });
    session.listen(canvas,'pointerdown',e=>{startPoint={x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId);}catch(_){}});
    session.listen(canvas,'pointerup',e=>{
      if(!startPoint)return;const dx=e.clientX-startPoint.x,dy=e.clientY-startPoint.y;startPoint=null;
      if(Math.abs(dx)+Math.abs(dy)<14){
        const rect=canvas.getBoundingClientRect(),v=model.view(),tile=Math.min(48,548/v.rows,640/v.cols);
        const ox=(720-v.cols*tile)/2,oy=(590-v.rows*tile)/2;
        const x=Math.floor(((e.clientX-rect.left)*720/rect.width-ox)/tile);
        const y=Math.floor(((e.clientY-rect.top)*590/rect.height-oy)/tile);
        if(x===v.player.x+1&&y===v.player.y)step('right');
        else if(x===v.player.x-1&&y===v.player.y)step('left');
        else if(x===v.player.x&&y===v.player.y+1)step('down');
        else if(x===v.player.x&&y===v.player.y-1)step('up');
      }else step(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
    });
    session.listen(canvas,'pointercancel',()=>{startPoint=null;});
    session.listen(doc,'visibilitychange',()=>{if(doc.hidden&&model.view().status==='playing'){model.pause();sync();}});
    session.listen(w,'blur',()=>{if(model.view().status==='playing'){model.pause();sync();}});
    function frame(ts){if(!alive)return;tick=ts;if(model.view().status==='playing')draw(model.view());session.requestAnimationFrame(frame);}
    session.onCleanup(()=>{alive=false;startPoint=null;container.innerHTML='';});
    sync();draw(model.view());session.requestAnimationFrame(frame);return model;
  }
  return Object.freeze({create,mount,LEVELS,DIRECTIONS});
});

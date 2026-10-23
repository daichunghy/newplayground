(function () {
    'use strict';
    const colors = ['#f2c14e', '#4ecdc4', '#ef476f', '#8ecae6', '#b8e986', '#f78c6b'];
    const refs = {
        'space-invaders-1978': ['Space Invaders', 'https://atarionline.org/wp-content/uploads/2021/11/space-invaders-1978-atari-2600-game-instructions-manual.pdf', 'Atari 2600 manual scan; arcade-family adaptation'],
        'lunar-lander-1979': ['Lunar Lander', 'https://arcarc.xmission.com/archive/PDF_Arcade_Atari_Kee/Lunar_Lander/Lunar_Lander_TM-136_1st_Printing.pdf', 'Atari arcade'],
        'lode-runner-classic': ['Lode Runner', 'https://mocagh.org/broderbund/loderunner-manual.pdf', 'Computer original; manual scan'],
        'qix-territory': ['Qix', 'https://www.aurcade.com/games/manuals/00000172.pdf', 'Taito arcade manual scan'],
        'joust-arcade': ['Joust', 'https://arcadertfm.com/m/joust', 'Williams arcade; manual archive'],
        'pengo-ice-blocks': ['Pengo', 'https://arcadertfm.com/m/pengo', 'Sega arcade; manual archive'],
        'rally-x-maze': ['Rally-X', 'https://www.namcogames.com/game_detail.php?gid=39', 'Namco arcade'],
        'burgertime-platforms': ['BurgerTime', 'https://www.gamesdatabase.org/Media/SYSTEM/Arcade//Manual/formated/Burger_Time_-_1982_-_Data_East.pdf', 'Data East arcade manual scan'],
        'moon-patrol-rover': ['Moon Patrol', 'https://arcadertfm.com/m/mpatrol', 'Irem arcade; manual archive'],
        'missile-command-defense': ['Missile Command', 'https://atari.com/pages/missilecommand', 'Atari arcade game page']

  };
    function createSpace() {
        const rows = 5, cols = 9;
        const game = {
       player: 0.5, bullets: [], invaders: [], bunkers: [0.19, 0.40, 0.61, 0.82].map(x => ({
         x, hp: 4
      })), lives: 3, wave: 1, score: 0, dir: 1, elapsed: 0, over: false
    };
        function wave() {
       game.invaders = [];
       for (let r = 0;
       r < rows;
       r++) for (let c = 0;
       c < cols;
       c++) game.invaders.push({
         x: 0.12 + c * 0.095, y: 0.12 + r * 0.065, r, c, alive: true
      });

    }
        wave();
        return {
       game, move(dx, dt = 0.08) {
         if (!game.over) game.player = Math.max(0.05, Math.min(0.95, game.player + dx * dt));

      }, fire() {
         if (!game.over && game.bullets.filter(b => b.owner === 'p').length < 2) game.bullets.push({
           x: game.player, y: 0.87, vy: -0.8, owner: 'p'
        });

      }, step(dt) {
              if (game.over) return;
              game.elapsed += dt;
         const speed = 0.10 + (1 - game.invaders.length / 45) * 0.26;
              const xs = game.invaders.map(i => i.x);
         const edge = xs.length && (Math.max(...xs) > 0.92 || Math.min(...xs) < 0.08);
              if (edge) {
           game.dir *= -1;
           game.invaders.forEach(i => {
             i.y += 0.035;

          });

        }
              game.invaders.forEach(i => {
           i.x += game.dir * speed * dt;

        });
              if (Math.random() < dt * 0.28 && game.invaders.length) {
           const i = game.invaders[Math.floor(Math.random() * game.invaders.length)];
           game.bullets.push({
             x: i.x, y: i.y + 0.02, vy: 0.34, owner: 'e'
          });

        }
              game.bullets.forEach(b => {
           b.y += b.vy * dt;
           const bunker = game.bunkers.find(v => v.hp && Math.abs(v.x - b.x) < 0.045 && b.y > 0.72 && b.y < 0.86);
           if (bunker) {
             bunker.hp--;
             b.y = b.owner === 'p' ? -1 : 2;
           } else if (b.owner === 'p') {
             const target = game.invaders.find(i => i.alive && Math.abs(i.x - b.x) < 0.025 && Math.abs(i.y - b.y) < 0.035);
             if (target) {
               target.alive = false;
               game.score += 10;
               b.y = -1;

            }
          } else {
             if (b.y > 0.85 && Math.abs(game.player - b.x) < 0.04) {
               game.lives--;
               b.y = 2;
               if (!game.lives) game.over = true;

            }
          }
        });
              game.bullets = game.bullets.filter(b => b.y > 0 && b.y < 1.03);
         game.invaders = game.invaders.filter(i => i.alive);
              if (game.invaders.some(i => i.y > 0.83)) game.over = true;
              if (!game.invaders.length && !game.over) {
           game.wave++;
           wave();

        }

      }, restart() {
         Object.assign(game, {
           player: 0.5, bullets: [], lives: 3, wave: 1, score: 0, dir: 1, over: false
        });
         game.bunkers.forEach(b => b.hp = 4);
         wave();

      }
    };

  }
    function createLander() {
        const state = {
       x: 0.16, y: 0.2, vx: 0.08, vy: 0, angle: 0, fuel: 100, score: 0, status: 'flying', landed: false
    };
        const pad = {
       x1: 0.68, x2: 0.82, y: 0.78
    };
        const terrain = [[0, .82], [.28, .79], [.5, .85], [.67, .78], [.68, .78], [.82, .78], [1, .84]];
        function groundAt(x) {
            for (let i = 1; i < terrain.length; i++) {
                const [rightX, rightY] = terrain[i];
                if (x <= rightX) {
                    const [leftX, leftY] = terrain[i - 1];
                    const fraction = (x - leftX) / (rightX - leftX);
                    return leftY + (rightY - leftY) * fraction;
                }
            }
            return terrain[terrain.length - 1][1];
        }
        return {
       state, pad, step(dt, input = {
      }) {
         if (state.status !== 'flying') return;
         if (input.left) state.angle -= 1.8 * dt;
         if (input.right) state.angle += 1.8 * dt;
         if (input.thrust && state.fuel > 0) {
           state.vx += Math.sin(state.angle) * 0.48 * dt;
           state.vy -= Math.cos(state.angle) * 0.55 * dt;
           state.fuel = Math.max(0, state.fuel - 12 * dt);

        } state.vy += 0.20 * dt;
         state.x += state.vx * dt;
         state.y += state.vy * dt;
         if (state.x < 0.03 || state.x > 0.97) state.status = 'crashed';
         const onPad = state.x > pad.x1 && state.x < pad.x2;
         if (state.y >= (onPad ? pad.y : groundAt(state.x))) {
           const safe = onPad && Math.abs(state.vy) < 0.12 && Math.abs(state.vx) < 0.12 && Math.abs(state.angle) < 0.28;
           state.status = safe ? 'landed' : 'crashed';
           if (safe) {
             state.score += Math.round(100 + state.fuel);
             state.landed = true;

          }
        } if (state.y > 0.95) state.status = 'crashed';

      }, rotate(amount) {
         if (state.status === 'flying') state.angle += amount;

      }, restart() {
         Object.assign(state, {
           x: 0.16, y: 0.2, vx: 0.08, vy: 0, angle: 0, fuel: 100, score: 0, status: 'flying', landed: false
        });

      }
    };

  }
    function createLode(level = 0) {
        const layouts = ['##########|#G...H..X#|#####L####|#L...G...#|##########', '##########|#G.L....X#|###L######|#..L..G..#|##########'];
        let rows = layouts[level % 2].split('|').map(row => row.split(''));
        const state = {
       rows, x: 1, y: 1, gold: 0, total: 0, holes: [], lives: 3, fallClock: 0, guards: [{ x: 7, y: 3, trapped: 0 }], guardClock: 0, over: false, won: false, level: level + 1
    };
        rows.forEach(row => row.forEach(cell => {
       if (cell === 'G') state.total++;

    }));
        if (rows[1][1] === 'G') {
            rows[1][1] = '.';
            state.gold++;
        }
        function move(dx, dy) {
       if (state.over) return false;
       const x = state.x + dx, y = state.y + dy;
       if (!rows[y] || !rows[y][x] || rows[y][x] === '#') return false;
       if (dy !== 0 && !['L', 'H'].includes(rows[state.y][state.x]) && !['L', 'H'].includes(rows[y][x])) return false;
       if (state.guards.some(guard => guard.x === x && guard.y === y)) {
         state.lives--;
         state.x = 1;
         state.y = 1;
         if (!state.lives) state.over = true;
         return false;
       }
       if (rows[y][x] === 'G') {
         state.gold++;
         rows[y][x] = '.';

      } if (rows[y][x] === 'X') {
         if (state.gold === state.total) {
           state.over = true;
           state.won = true;

        } else return false;

      } state.x = x;
       state.y = y;
       return true;

    }
        return {
       state, move, dig(dx) {
         if (state.over || (dx !== -1 && dx !== 1)) return false;
         const x = state.x + dx, y = state.y + 1;
         if (!rows[y] || rows[y][x] !== '#') return false;
         rows[y][x] = '.';
         state.holes.push({
           x, y, time: 0
        });
         return true;

      }, step(dt) {
         if (state.over) return;
         state.fallClock += dt;
         if (state.fallClock >= .25) {
           state.fallClock = 0;
           const standingOnLadder = ['L', 'H'].includes(rows[state.y][state.x]);
           const below = rows[state.y + 1]?.[state.x];
           if (!standingOnLadder && below && below !== '#' && !['L', 'H'].includes(below)) state.y++;
         }
         state.holes.forEach(h => h.time += dt);
         state.holes = state.holes.filter(h => {
           if (h.time > 5) rows[h.y][h.x] = '#';
           return h.time <= 5;

        });
         state.guardClock += dt;
         state.guards.forEach(guard => {
           const hole = state.holes.find(item => item.x === guard.x && item.y === guard.y);
           if (hole) {
             guard.trapped += dt;
             if (guard.trapped > 3) {
               guard.y = Math.max(1, guard.y - 1);
               guard.trapped = 0;
             }
             return;
           }
           guard.trapped = 0;
           if (state.guardClock < .8) return;
           const dx = Math.sign(state.x - guard.x);
           const dy = Math.sign(state.y - guard.y);
           if (rows[guard.y]?.[guard.x + dx] !== '#') guard.x += dx;
           else if (rows[guard.y + dy]?.[guard.x] !== '#') guard.y += dy;
           if (guard.x === state.x && guard.y === state.y) {
             state.lives--;
             state.x = 1;
             state.y = 1;
             if (!state.lives) state.over = true;
           }
         });
         if (state.guardClock >= .8) state.guardClock = 0;

      }, nextLevel() {
         if (!state.won) return false;
         level++;
         rows = layouts[level % layouts.length].split('|').map(row => row.split(''));
         state.rows = rows;
         state.x = 1;
         state.y = 1;
         state.total = rows.flat().filter(cell => cell === 'G').length;
         state.gold = rows[1][1] === 'G' ? 1 : 0;
         if (state.gold) rows[1][1] = '.';
         state.holes = [];
         state.lives = 3;
         state.guards = [{ x: 7, y: 3, trapped: 0 }];
         state.guardClock = 0;
         state.fallClock = 0;
         state.level = level + 1;
         state.over = false;
         state.won = false;
         return true;
      }, restart() {
         rows = layouts[level % 2].split('|').map(row => row.split(''));
         Object.assign(state, {
           rows, x: 1, y: 1, gold: rows[1][1] === 'G' ? 1 : 0, holes: [], lives: 3, fallClock: 0, guards: [{ x: 7, y: 3, trapped: 0 }], guardClock: 0, over: false, won: false
        });
         if (rows[1][1] === 'G') rows[1][1] = '.';

      }
    };

  }
    function createQix() {
        const size = 12, state = {
       size, x: 0, y: 6, drawing: false, trail: [], captured: new Set(), qix: {
         x: 5.5, y: 5.5, vx: 2, vy: 1.4
      }, lives: 3, area: 0, over: false, won: false, sparkIndex: 0, sparkClock: 0, spark: { x: 1, y: 0 }
    };
        const sparkPath = [];
        for (let x = 1; x < size - 1; x++) sparkPath.push({ x, y: 0 });
        for (let y = 1; y < size - 1; y++) sparkPath.push({ x: size - 1, y });
        for (let x = size - 2; x > 0; x--) sparkPath.push({ x, y: size - 1 });
        for (let y = size - 2; y > 0; y--) sparkPath.push({ x: 0, y });
        const key = (x, y) => `${x},${y}`;
     const safe = (x, y) => x === 0 || y === 0 || x === size - 1 || y === size - 1 || state.captured.has(key(x, y));
        function move(dx, dy) {
       if (state.over) return false;
       const nx = state.x + dx, ny = state.y + dy;
       if (nx < 0 || ny < 0 || nx >= size || ny >= size) return false;
       if (state.drawing && safe(nx, ny)) {
         state.x = nx;
         state.y = ny;
         state.drawing = false;
         return capture();

      } if (state.drawing) state.trail.push(key(nx, ny));
       else if (!safe(nx, ny)) {
         state.drawing = true;
         state.trail = [key(nx, ny)];

      } state.x = nx;
       state.y = ny;
       return true;

    }
        function capture() {
       const trail = new Set(state.trail);
       const seen = new Set(), q = [[Math.max(1, Math.min(size - 2, Math.round(state.qix.x))), Math.max(1, Math.min(size - 2, Math.round(state.qix.y)))]];
       while (q.length) {
         const [x, y] = q.pop(), k = key(x, y);
         if (seen.has(k) || safe(x, y) || trail.has(k)) continue;
         seen.add(k);
         [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
           if (x+dx>0 && y+dy>0 && x+dx<size-1 && y+dy<size-1) q.push([x+dx,y+dy]);

        });

      } trail.forEach(k => state.captured.add(k));
       for (let y=1;
      y<size-1;
      y++) for(let x=1;
      x<size-1;
      x++) if(!seen.has(key(x,y))) state.captured.add(key(x,y));
       state.trail=[];
       state.area = state.captured.size / ((size-2)*(size-2));
       if(state.area >= .75) {
         state.over=true;
         state.won=true;

      } return true;

    }
        return {
       state, move, step(dt) {
         if (state.over) return;
         state.qix.x += state.qix.vx * dt;
         state.qix.y += state.qix.vy * dt;
         if (state.qix.x < 1 || state.qix.x > size-2) state.qix.vx *= -1;
         if (state.qix.y < 1 || state.qix.y > size-2) state.qix.vy *= -1;
       state.sparkClock += dt;
       if (state.sparkClock >= .25) {
         state.sparkClock = 0;
         state.sparkIndex = (state.sparkIndex + 1) % sparkPath.length;
         state.spark = sparkPath[state.sparkIndex];
       }
       if (state.spark.x === state.x && state.spark.y === state.y) {
         state.lives--;
         state.x = 0;
         state.y = 6;
         state.drawing = false;
         state.trail = [];
         if (!state.lives) state.over = true;
       }
         if (state.drawing && state.trail.some(k => {
           const [x,y]=k.split(',').map(Number);
           return Math.abs(x-state.qix.x)<.35 && Math.abs(y-state.qix.y)<.35;

        })) {
           state.lives--;
           state.x = 0;
           state.y = 6;
           state.trail=[];
           state.drawing=false;
           if(!state.lives) state.over=true;

        }
      }, capture, restart() {
         Object.assign(state, createQix().state);

      }
    };

  }
    function createJoust() {
        const state = {
       x: 0.5, y: 0.45, vy: 0, lives: 3, score: 0, wave: 1, enemies: [{
         x: 0.72, y: 0.45, vy: 0, egg: false, timer: 0
      }], over: false
    };
        return {
       state, flap() {
         if (!state.over) state.vy = -0.42;

      }, step(dt) {
         if (state.over) return;
         state.vy += 0.55*dt;
         state.y += state.vy*dt;
         state.x = Math.max(0.04, Math.min(0.96, state.x));
         if(state.y>0.82){
           state.y=.82;
           state.vy=0;

        } if(state.y<.08){
          state.y=.08;
           state.vy=0;
        } state.enemies.forEach(e => {
           if(e.egg){
            e.timer-=dt;
             if(e.timer<=0){
              e.egg=false;
              e.y=.3;
              e.vy=0;
            } return;
          } e.x += (state.x>e.x?1:-1)*.08*dt;
           e.vy += .45*dt;
          e.y+=e.vy*dt;
          if(e.y>.82){
            e.y=.82;
            e.vy=0;
          } if(Math.abs(e.x-state.x)<.06&&Math.abs(e.y-state.y)<.06){
            if(state.y<e.y-.015){
              e.egg=true;
              e.timer=3;
              state.score+=100;
            }else if(state.y>e.y+.015){
              state.lives--;
              if(!state.lives)state.over=true;
            }else{
              state.vy=-.3;
              e.vy=-.3;
            }
          }
        });

      }, collectEgg() {
         const i=state.enemies.findIndex(v=>v.egg&&Math.abs(v.x-state.x)<.08&&Math.abs(v.y-state.y)<.08);
         if(i<0||state.over)return false;
        state.enemies.splice(i,1);
        state.score+=500;
        if(!state.enemies.length){
          state.wave++;
          state.enemies=[{
            x:.25,y:.35,vy:0,egg:false,timer:0
          },{
            x:.75,y:.4,vy:0,egg:false,timer:0
          }];
        }return true;

      }, restart(){
        Object.assign(state,createJoust().state);
      }
    };

  }
    function createPengo() {
        const initial=['#########','#..E...##','#.D.D.D.#','#...B.E.#','#.......#','#########'];
    let grid=initial.map(r=>r.split(''));
        const state={
      grid,x:1,y:1,score:0,lives:3,wave:1,enemyClock:0,over:false
    };
        return {
      state,move(dx,dy){
        if(state.over)return false;
        const x=state.x+dx,y=state.y+dy,c=grid[y]?.[x];
        if(!c||c==='#')return false;
        if(c==='E'){
          state.lives--;
          if(!state.lives)state.over=true;
          else { state.x=1; state.y=1; }
          return false;
        }if(c==='B'||c==='D'){
          let bx=x,by=y;
          while(grid[by+dy]?.[bx+dx]==='.') {
            bx+=dx;
            by+=dy;
          }if(grid[by+dy]?.[bx+dx]==='E'){
            grid[by+dy][bx+dx]='.';
            state.score+=100;
          }else if(['#','B','D'].includes(grid[by+dy]?.[bx+dx])){
            if(bx===x&&by===y){
              if(c==='D')return false;
              grid[y][x]='.';
              state.score+=10;
              return true;
            }
          }else return false;
          grid[y][x]='.';
          grid[by][bx]=c;
          if(c==='D'){
            const diamonds=[];
            grid.forEach((row,diamondY)=>row.forEach((cell,diamondX)=>{
              if(cell==='D')diamonds.push({x:diamondX,y:diamondY});
            }));
            if(diamonds.length===3&&(diamonds.every(d=>d.y===diamonds[0].y)||diamonds.every(d=>d.x===diamonds[0].x)))state.score+=500;
          }
          return true;
        }state.x=x;
        state.y=y;
        return true;
      },step(dt=0){
        if(state.over)return;
        state.enemyClock+=dt;
        const es=[];
        grid.forEach((r,y)=>r.forEach((c,x)=>{
          if(c==='E')es.push([x,y]);
        }));
        if(es.length===0){
          state.wave++;
          grid[1][3]='E';
          grid[3][5]='E';
          return;
        }
        if(state.enemyClock>=.7){
          state.enemyClock=0;
          es.forEach(([oldX,oldY])=>{
            const dx=Math.sign(state.x-oldX),dy=Math.sign(state.y-oldY);
            const candidates=[[oldX+dx,oldY],[oldX,oldY+dy],[oldX-dx,oldY],[oldX,oldY-dy]];
            const [nextX,nextY]=candidates.find(([x,y])=>grid[y]?.[x]==='.'||x===state.x&&y===state.y)||[oldX,oldY];
            if(nextX===state.x&&nextY===state.y){
              state.lives--;
              if(!state.lives)state.over=true;
              state.x=1;
              state.y=1;
              grid[oldY][oldX]='E';
              return;
            }
            grid[oldY][oldX]='.';
            grid[nextY][nextX]='E';
          });
        }
      },restart(){
        grid=initial.map(r=>r.split(''));
        Object.assign(state,{
          grid,x:1,y:1,score:0,lives:3,wave:1,enemyClock:0,over:false
        });
      }
    };

  }
    function createRally() {
        const initial=['############','#F.F..#..F.F#','#.##..#.#..#','#F...F....F.#','#.##..#.#..#','#F....#..F..#','#....F.....#','############'];
    let map=initial.map(r=>r.split(''));
        const state={
      map,x:1,y:1,dir:1,flags:0,stage:1,fuel:100,smoke:2,stun:0,lives:3,over:false,enemyClock:0,enemies:[{
        x:10,y:6
      },{
        x:1,y:6
      }]
    };
        return {
      state,steer(dx,dy){
        if(state.over)return false;
        const x=state.x+dx,y=state.y+dy;
        if(map[y]?.[x]==='#')return false;
        state.x=x;
        state.y=y;
        if(map[y][x]==='F'){
          map[y][x]='.';
          state.flags++;
        }return true;
      },smoke(){
        if(state.over||state.smoke<=0)return false;
        state.smoke--;
        state.fuel=Math.max(0,state.fuel-8);
        state.stun=2;
        return true;
      },step(dt){
        if(state.over)return;
        state.fuel-=dt*1.2;
        state.stun=Math.max(0,state.stun-dt);
        state.enemyClock+=dt;
        if(state.stun===0&&state.enemyClock>=.65){
          state.enemyClock=0;
          state.enemies.forEach(enemy=>{
            const dx=Math.sign(state.x-enemy.x),dy=Math.sign(state.y-enemy.y);
            if(map[enemy.y]?.[enemy.x+dx]!=='#')enemy.x+=dx;
            else if(map[enemy.y+dy]?.[enemy.x]!=='#')enemy.y+=dy;
            if(enemy.x===state.x&&enemy.y===state.y){
              state.lives--;
              enemy.x=10;
              enemy.y=6;
              if(!state.lives)state.over=true;
            }
          });
        }if(state.fuel<=0||state.lives<=0)state.over=true;
        if(state.flags>=10){
          state.flags=0;
          state.stage++;
          map=initial.map(r=>r.split(''));
          state.map=map;
          state.fuel=100;
          state.lives++;
        }
      },restart(){
        map=initial.map(r=>r.split(''));
        Object.assign(state,{
          map,x:1,y:1,dir:1,flags:0,stage:1,fuel:100,smoke:2,stun:0,lives:3,over:false,enemyClock:0,enemies:[{
            x:10,y:6
          },{
            x:1,y:6
          }]
        });
      }
    };

  }
    function createBurger() {
        const state={
      x:0,y:0,segments:Array.from({
        length:3
      },()=>new Set()),ingredients:3,completedRows:new Set(),drops:[],stackCount:0,completedBurgers:0,stage:1,pepper:3,stun:0,enemy:{
        x:3,y:2
      },score:0,lives:3,over:false
    };
        state.segments[0].add(0);
        return {
      state,move(dx,dy){
        if(state.over)return false;
        state.x=Math.max(0,Math.min(4,state.x+dx));
        state.y=Math.max(0,Math.min(2,state.y+dy));
        state.segments[state.y].add(state.x);
        if(state.segments[state.y].size===5){
          state.segments[state.y].clear();
          if(!state.completedRows.has(state.y)){
            state.completedRows.add(state.y);
            state.ingredients--;
            state.drops.push({row:state.y,time:0,duration:.3+(2-state.y)*.35});
          }
        }if(state.x===state.enemy.x&&state.y===state.enemy.y&&state.stun<=0){
          state.lives--;
          state.x=0;
          state.y=0;
          if(!state.lives)state.over=true;
        }return true;
      },pepper(){
        if(state.over||state.pepper<=0)return false;
        state.pepper--;
        state.stun=2;
        return true;
      },step(dt){
        state.drops.forEach(drop=>drop.time+=dt);
        const landed=state.drops.filter(drop=>drop.time>=drop.duration).length;
        state.drops=state.drops.filter(drop=>drop.time<drop.duration);
        for(let index=0;index<landed;index++){
          state.stackCount++;
          if(state.stackCount===3){
            state.stackCount=0;
            state.completedBurgers++;
            state.score+=500;
            state.over=true;
          }
        }
        if(state.over)return;
        state.stun=Math.max(0,state.stun-dt);
        if(state.stun<=0){
          state.enemy.x += (state.enemy.x>state.x?-1:1)*dt;
          if(Math.abs(state.enemy.x-state.x)<.3&&state.enemy.y===state.y){
            state.lives--;
            if(state.lives<=0)state.over=true;
          }
        }
      },restart(){
        Object.assign(state,createBurger().state);
      },nextStage(){
        if(!state.over||state.completedBurgers===0)return false;
        state.stage++;
        state.x=0;
        state.y=0;
        state.segments=Array.from({length:3},()=>new Set());
        state.segments[0].add(0);
        state.completedRows=new Set();
        state.drops=[];
        state.stackCount=0;
        state.completedBurgers=0;
        state.ingredients=3;
        state.pepper=3;
        state.stun=0;
        state.enemy={x:3,y:2};
        state.lives=3;
        state.over=false;
        return true;
      }
    };

  }
    function createMoon() {
        const gaps=[{
      x:0.36,w:.12
    },{
      x:.75,w:.1
    }],state={
      x:.1,y:0,vx:.45,vy:0,grounded:true,distance:0,score:0,lives:3,over:false,shots:[],speed:1,threats:[{x:.58,y:-.08,kind:'UFO',active:true},{x:.91,y:0,kind:'rock',active:true}]
    };
        return {
      state,gaps,jump(){
        if(!state.over&&state.grounded){
          state.vy=-.72;
          state.grounded=false;
          return true;
        }return false;
      },setSpeed(value){
        if(!state.over)state.speed=Math.max(.3,Math.min(1.5,value));
      },fire(up=false){
        if(!state.over)state.shots.push({
          x:state.x,y:state.y+(up?-.03:0),vy:up?-.3:0,up
        });
      },step(dt){
        if(state.over)return;
        state.x+=state.vx*state.speed*dt;
        state.distance=state.x;
        state.vy+=1.5*dt;
        state.y+=state.vy*dt;
        if(state.y>=0){
          state.y=0;
          state.vy=0;
          state.grounded=true;
        }const gap=gaps.find(g=>state.x>g.x&&state.x<g.x+g.w);
        if(gap&&state.grounded){
          state.lives--;
          state.x=gap.x+gap.w+.01;
          if(!state.lives)state.over=true;
        }state.threats.forEach(threat=>{
          if(threat.active&&threat.kind==='UFO')threat.x-=dt*.12;
        });
        state.shots.forEach(shot=>{
          shot.x+=dt*1.2;
          shot.y+=shot.vy*dt;
          const target=state.threats.find(threat=>threat.active&&Math.abs(threat.x-shot.x)<.025&&Math.abs(threat.y-shot.y)<.08);
          if(target){target.active=false;shot.x=2;state.score+=50;}
        });
        state.shots=state.shots.filter(shot=>shot.x<state.x+.3);
        const collision=state.threats.find(threat=>threat.active&&Math.abs(threat.x-state.x)<.025&&(
          threat.kind==='rock'?state.y>-.025:state.y>-.04
        ));
        if(collision){
          collision.active=false;
          state.lives--;
          if(!state.lives)state.over=true;
        }
        if(state.x>1){
          state.x=.1;
          state.score+=1;
          gaps.forEach(g=>g.x=Math.max(.35,Math.min(.82,g.x+.08)));
          state.threats=[{x:.58,y:-.08,kind:'UFO',active:true},{x:.91,y:0,kind:'rock',active:true}];
        }
      },restart(){
        Object.assign(state,createMoon().state);
      }
    };

  }
    function createMissile() {
        const state={
      cities:[true,true,true,true,true,true],bases:[10,10,10],missiles:[],explosions:[],score:0,wave:1,over:false
    };
        function waveMissiles(){
      return state.cities.map((alive,targetCity)=>({
        targetCity,x:.08+targetCity*.16,y:0,targetX:(targetCity+.5)/6,vy:.12+(targetCity%2)*.01
      })).filter(missile=>state.cities[missile.targetCity]);
    }
        state.missiles=waveMissiles();
        function blast(x,y){
      if(state.over)return false;
      const positions=[.08,.5,.92];
      const base=state.bases.map((ammo,index)=>({
        ammo,index,distance:Math.abs(positions[index]-x)
      })).filter(item=>item.ammo>0).sort((a,b)=>a.distance-b.distance)[0];
      if(!base)return false;
      state.bases[base.index]--;
      state.explosions.push({
        x,y,r:.01,phase:1
      });
      return true;
    }
        return {
      state,blast,step(dt){
        if(state.over)return;
        state.missiles.forEach(m=>{
          const horizontalStep=Math.max(-.12*dt,Math.min(.12*dt,m.targetX-m.x));
          m.x+=horizontalStep;
          m.y+=m.vy*dt;
          if(m.y>=.88&&state.cities[m.targetCity]){
            state.cities[m.targetCity]=false;
            m.y=2;
          }
        });
        state.missiles=state.missiles.filter(m=>m.y<1.1);
        state.explosions.forEach(e=>{
          e.r+=e.phase*.45*dt;
          if(e.r>.18)e.phase=-1;
          if(e.r<0)e.phase=0;
        });
        state.explosions=state.explosions.filter(e=>e.phase!==0);
        for(const e of state.explosions)for(const m of state.missiles)if(Math.hypot(m.x-e.x,m.y-e.y)<e.r){
          m.y=2;
          state.score+=25;
        }state.missiles=state.missiles.filter(m=>m.y<1.1);
        if(!state.cities.some(Boolean))state.over=true;
        if(!state.missiles.length&&!state.over){
          state.wave++;
          state.bases=[10,10,10];
          state.missiles=waveMissiles();
        }
      },restart(){
        Object.assign(state,createMissile().state);
      }
    };

  }
    const builders = {
        'space-invaders-1978': createSpace, 'lunar-lander-1979': createLander, 'lode-runner-classic': createLode,
        'qix-territory': createQix, 'joust-arcade': createJoust, 'pengo-ice-blocks': createPengo,
        'rally-x-maze': createRally, 'burgertime-platforms': createBurger, 'moon-patrol-rover': createMoon,
        'missile-command-defense': createMissile

  };
    function drawGame(id, model, ctx, canvas) {
        const s = model.state || model.game;
     const w=canvas.width,h=canvas.height;
        ctx.fillStyle='#101a2b';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#dce7f5';
    ctx.font='16px Calibri, sans-serif';
        const text=(value,x,y)=>ctx.fillText(value,x,y);
        if(id==='space-invaders-1978'){
      const g=model.game;
      g.invaders.forEach(i=>{
        ctx.fillStyle=colors[i.r%colors.length];
        ctx.fillRect(i.x*w,i.y*h,18,12);
      });
      ctx.fillStyle='#7be0ad';
      ctx.fillRect(g.player*w-14,h*.9,28,12);
      g.bunkers.forEach(b=>{
        ctx.fillStyle=`rgba(80,220,140,${b.hp/4})`;
        ctx.fillRect((b.x-.04)*w,h*.78,48,15);
      });
      g.bullets.forEach(b=>{
        ctx.fillStyle=b.owner==='p'?'#fff':'#ff6978';
        ctx.fillRect(b.x*w,b.y*h,4,10);
      });
      text(`Score ${g.score}   Lives ${g.lives}   Wave ${g.wave}`,12,24);
    }
        else if(id==='lunar-lander-1979'){
      const a=s.angle;
      ctx.fillStyle='#58647a';
      ctx.beginPath();
      ctx.moveTo(0,h*.82);
      ctx.lineTo(w*.28,h*.79);
      ctx.lineTo(w*.5,h*.85);
      ctx.lineTo(w*.67,h*.78);
      ctx.lineTo(w,h*.84);
      ctx.lineTo(w,h);
      ctx.lineTo(0,h);
      ctx.fill();
      ctx.fillStyle='#f2c14e';
      ctx.fillRect(w*model.pad.x1,h*.78,w*(model.pad.x2-model.pad.x1),5);
      ctx.save();
      ctx.translate(s.x*w,s.y*h);
      ctx.rotate(a);
      ctx.fillStyle='#e8efff';
      ctx.beginPath();
      ctx.moveTo(0,-18);
      ctx.lineTo(13,12);
      ctx.lineTo(-13,12);
      ctx.fill();
      ctx.restore();
      text(`Fuel ${Math.floor(s.fuel)}  vx ${s.vx.toFixed(2)} vy ${s.vy.toFixed(2)}  ${s.status}`,12,24);
    }
        else if(id==='lode-runner-classic'){
      s.rows.forEach((r,y)=>r.forEach((c,x)=>{
        ctx.fillStyle=c==='#'?'#7b6654':c==='G'?'#f4cf5e':c==='X'?'#8be0b2':c==='H'?'#9ad6e8':'#1c2b43';
        ctx.fillRect(x*48+8,y*50+32,44,44);
        if(c==='G'){
          ctx.fillStyle='#fff1a5';
          ctx.fillRect(x*48+22,y*50+46,14,14);
        }
      }));
      ctx.fillStyle='#f78c6b';
      ctx.fillRect(s.x*48+18,s.y*50+36,22,34);
      s.guards.forEach(guard=>{
        ctx.fillStyle=guard.trapped>0?'#9da8b8':'#ed7768';
        ctx.fillRect(guard.x*48+18,guard.y*50+36,22,34);
      });
      text(`Gold ${s.gold}/${s.total}   Level ${s.level}   Lives ${s.lives}`,12,20);
    }
        else if(id==='qix-territory'){
      for(let y=0;
      y<s.size;
      y++)for(let x=0;
      x<s.size;
      x++){
        ctx.fillStyle=(x===0||y===0||x===s.size-1||y===s.size-1||s.captured.has(`${x},${y}`))?'#4ecdc4':'#23334b';
        if(s.trail.includes(`${x},${y}`))ctx.fillStyle='#f78c6b';
        ctx.fillRect(x*40+80,y*34+28,38,32);
      }ctx.fillStyle='#fff';
      ctx.beginPath();
      ctx.arc(s.qix.x*40+99,s.qix.y*34+44,8,0,7);
      ctx.fill();
      ctx.fillStyle='#f78c6b';
      ctx.fillRect(s.spark.x*40+91,s.spark.y*34+37,15,15);
      ctx.fillStyle='#f2c14e';
      ctx.fillRect(s.x*40+91,s.y*34+37,15,15);
      text(`Claimed ${Math.floor(s.area*100)}%   Lives ${s.lives}`,12,20);
    }
        else if(id==='joust-arcade'){
      ctx.fillStyle='#596579';
      [.3,.58,.82].forEach(y=>ctx.fillRect(0,y*h,w,5));
      ctx.fillStyle='#f2c14e';
      ctx.beginPath();
      ctx.arc(s.x*w,s.y*h,13,0,7);
      ctx.fill();
      s.enemies.forEach(e=>{
        ctx.fillStyle=e.egg?'#f78c6b':'#ef476f';
        ctx.beginPath();
        ctx.arc(e.x*w,e.y*h,12,0,7);
        ctx.fill();
      });
      text(`Score ${s.score}   Lives ${s.lives}   Wave ${s.wave}`,12,22);
    }
        else if(id==='pengo-ice-blocks'){
      s.grid.forEach((r,y)=>r.forEach((c,x)=>{
        ctx.fillStyle=c==='#'?'#46546a':c==='B'?'#83d5e8':c==='D'?'#d6b5ff':c==='E'?'#ef476f':'#17263b';
        ctx.fillRect(x*58+48,y*58+42,54,54);
      }));
      ctx.fillStyle='#f2c14e';
      ctx.fillRect(s.x*58+60,s.y*58+54,30,30);
      text(`Score ${s.score}   Lives ${s.lives}   Wave ${s.wave}`,12,22);
    }
        else if(id==='rally-x-maze'){
      s.map.forEach((r,y)=>r.forEach((c,x)=>{
        ctx.fillStyle=c==='#'?'#65758d':'#14263a';
        ctx.fillRect(x*48+12,y*48+32,44,44);
        if(c==='F'){
          ctx.fillStyle='#f2c14e';
          ctx.fillRect(x*48+27,y*48+42,12,25);
        }
      }));
      s.enemies.forEach(enemy=>{
        ctx.fillStyle=s.stun>0?'#7a8ba5':'#ef476f';
        ctx.fillRect(enemy.x*48+20,enemy.y*48+40,22,28);
      });
      ctx.fillStyle='#ef476f';
      ctx.fillRect(s.x*48+20,s.y*48+40,25,32);
      text(`Stage ${s.stage}   Flags ${s.flags}/10   Fuel ${Math.floor(s.fuel)}   Smoke ${s.smoke}`,12,20);
    }
        else if(id==='burgertime-platforms'){
      [0,1,2].forEach(y=>{
        ctx.fillStyle='#65758d';
        ctx.fillRect(70,130+y*100,500,8);
        for(let x=0;
        x<5;
        x++){
          if(!s.completedRows.has(y)){
            ctx.fillStyle=s.segments[y].has(x)?'#f2c14e':['#b97843','#d8a34a','#79bd68'][y]||'#b97843';
            ctx.fillRect(80+x*98,130+y*100-24,94,22);
          }
        }
      });
      ctx.fillStyle='#4ecdc4';
      ctx.fillRect(86+s.x*98,95+s.y*100,25,35);
      ctx.fillStyle='#ef476f';
      ctx.fillRect(86+s.enemy.x*98,95+s.enemy.y*100,25,35);
      s.drops.forEach(drop=>{
        const fall=Math.min(1,drop.time/drop.duration);
        const startY=106+drop.row*100;
        const y=startY+fall*(430-startY-s.stackCount*18);
        for(let segment=0;segment<5;segment++){
          ctx.fillStyle=['#b97843','#d8a34a','#79bd68'][drop.row];
          ctx.fillRect(80+segment*98,y,94,22);
        }
      });
      for(let stack=0;stack<s.stackCount;stack++){
        ctx.fillStyle=['#b97843','#d8a34a','#79bd68'][stack];
        ctx.fillRect(80,430-stack*18,480,16);
      }
      text(`Stage ${s.stage}   Ingredients ${s.ingredients}   Stack ${s.stackCount}/3   Pepper ${s.pepper}   Lives ${s.lives}`,12,20);
    }
        else if(id==='moon-patrol-rover'){
      ctx.fillStyle='#65758d';
      ctx.fillRect(0,h*.78,w,h*.22);
      model.gaps.forEach(g=>{
        ctx.fillStyle='#101a2b';
        ctx.fillRect(g.x*w,h*.78,g.w*w,h*.22);
      });
      s.threats.filter(threat=>threat.active).forEach(threat=>{
        ctx.fillStyle=threat.kind==='UFO'?'#b8e986':'#c28b5b';
        ctx.fillRect(threat.x*w,h*(.72+threat.y)-12,22,18);
      });
      ctx.fillStyle='#ef476f';
      ctx.fillRect(s.x*w,h*(.72+s.y)-22,36,22);
      s.shots.forEach(a=>{
        ctx.fillStyle='#fff';
        ctx.fillRect(a.x*w,h*(.72+a.y),8,4);
      });
      text(`Checkpoint ${Math.floor(s.distance*100)}   Lives ${s.lives}   Speed ${s.speed.toFixed(1)}`,12,22);
    }
        else {
      s.cities.forEach((alive,i)=>{
        ctx.fillStyle=alive?'#4ecdc4':'#424a5a';
        ctx.fillRect(70+i*90,h*.89,46,22);
      });
      s.missiles.forEach(m=>{
        ctx.fillStyle='#ef476f';
        ctx.fillRect(m.x*w,m.y*h,5,12);
      });
      s.explosions.forEach(e=>{
        ctx.strokeStyle='#f2c14e';
        ctx.lineWidth=4;
        ctx.beginPath();
        ctx.arc(e.x*w,e.y*h,e.r*w,0,7);
        ctx.stroke();
      });
      text(`Cities ${s.cities.filter(Boolean).length}   Score ${s.score}   Wave ${s.wave}   Ammo ${s.bases.join('/')}`,12,22);
    }
        if(s.over||s.status==='crashed'||s.status==='landed'){
      ctx.fillStyle='#fff';
      text(s.won||s.status==='landed'?'MISSION COMPLETE':'GAME OVER',w*.38,h*.48);
    }

  }
    function launchFor(id, container, game) {
        const title = game?.title || refs[id][0];
        const stage=window.NP_Fidelity.createStage(container,{
      title
    },{
      width:640,height:480,hint:'Dùng nút chạm hoặc phím mũi tên; giữ nút để tiếp tục di chuyển.'
    });
        const model=builders[id]();
    const held=new Set();
        const realTime=['space-invaders-1978','lunar-lander-1979','joust-arcade'].includes(id);
        const controls={
      left:()=>held.has('left'),right:()=>held.has('right'),up:()=>held.has('up'),thrust:()=>held.has('thrust')
    };
        function perform(name) {
            const dx=name==='left'?-1:name==='right'?1:0;
            const dy=name==='up'?-1:name==='down'?1:0;
            if(['left','right'].includes(name)&&realTime){
        const dx=name==='left'?-1:1;
        if(id==='space-invaders-1978')model.move(dx,.12);
        else if(id==='joust-arcade')model.state.x=Math.max(.04,Math.min(.96,model.state.x+dx*.04));
        else model.rotate(dx*.12);
      }
            else if(['left','right','up','down'].includes(name)) {
                if(id==='lode-runner-classic')model.move(dx,dy);
                else if(id==='qix-territory')model.move(dx,dy);
                else if(id==='pengo-ice-blocks')model.move(dx,dy);
                else if(id==='rally-x-maze')model.steer(dx,dy);
                else if(id==='burgertime-platforms')model.move(dx,dy);

      } else if(name==='fire') {
                if(id==='space-invaders-1978')model.fire();
                else if(id==='moon-patrol-rover')model.fire(false);

      } else if(name==='upshot')model.fire(true);
            else if(name==='jump')model.jump();
            else if(name==='flap')model.flap();
            else if(name==='egg')model.collectEgg();
            else if(name==='thrust'&&id==='lunar-lander-1979')model.step(.08,{
        thrust:true
      });
            else if(name==='smoke')model.smoke();
            else if(name==='pepper')model.pepper();
            else if(name==='digL')model.dig(-1);
            else if(name==='digR')model.dig(1);
            else if(name==='rotateL')model.rotate(-.12);
            else if(name==='rotateR')model.rotate(.12);
            else if(name==='brake')model.setSpeed(.55);
            else if(name==='accelerate')model.setSpeed(1.35);
            else if(name==='baseLeft')model.blast(.12,.55);
            else if(name==='baseCenter')model.blast(.5,.55);
            else if(name==='baseRight')model.blast(.88,.55);
      else if(name==='nextLevel')model.nextLevel();
      else if(name==='nextStage')model.nextStage();
            else if(name==='restart')model.restart();

    }
        function release() {
       held.clear();

    }
        const controlSets={
            'space-invaders-1978':[['Left','left'],['Right','right'],['Fire','fire']],
            'lunar-lander-1979':[['Rotate left','rotateL'],['Rotate right','rotateR'],['Thrust','thrust']],
            'lode-runner-classic':[['Left','left'],['Right','right'],['Climb','up'],['Descend','down'],['Dig left','digL'],['Dig right','digR'],['Next level','nextLevel']],
            'qix-territory':[['Left','left'],['Right','right'],['Up','up'],['Down','down']],
            'joust-arcade':[['Left','left'],['Right','right'],['Flap','flap'],['Collect egg','egg']],
            'pengo-ice-blocks':[['Left','left'],['Right','right'],['Up','up'],['Down','down']],
            'rally-x-maze':[['Left','left'],['Right','right'],['Up','up'],['Down','down'],['Smoke','smoke']],
            'burgertime-platforms':[['Left','left'],['Right','right'],['Up','up'],['Down','down'],['Pepper','pepper'],['Next stage','nextStage']],
            'moon-patrol-rover':[['Brake','brake'],['Accelerate','accelerate'],['Jump','jump'],['Fire','fire'],['Fire up','upshot']],
            'missile-command-defense':[['Fire left base','baseLeft'],['Fire center base','baseCenter'],['Fire right base','baseRight']]

    };
        const buttons=[...controlSets[id],['Restart','restart']];
        buttons.forEach(([label,name])=>{
      let pointerActivated=false;
      const button=stage.button(label,()=>{
        if(pointerActivated){
          pointerActivated=false;
          return;
        }perform(name);
      });
      stage.session.listen(button,'pointerdown',()=>{
        pointerActivated=true;
        if(realTime&&['left','right'].includes(name)){
          held.add(name);
          if(id==='lunar-lander-1979')held.add(name==='left'?'rotateLeft':'rotateRight');
        }else if(name==='thrust'&&id==='lunar-lander-1979'){
          held.add('thrust');
        }else perform(name);
      });
      stage.session.listen(button,'pointerup',release);
      stage.session.listen(button,'pointercancel',release);
    });
        stage.on('pointerup',release);
    stage.on('pointercancel',release);
    stage.session.listen(window,'blur',release);
        stage.session.listen(window,'keydown',e=>{
      if(e.repeat)return;
      const map={
        ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Space:'fire',KeyZ:'jump',KeyX:'thrust'
      };
      const key=map[e.code];
      if(realTime&&['left','right'].includes(key)){
        held.add(key);
        if(id==='lunar-lander-1979')held.add(key==='left'?'rotateLeft':'rotateRight');
      }else if(key==='thrust'&&id==='lunar-lander-1979')held.add('thrust');
      else if(key)perform(key);
    });
        stage.session.listen(window,'keyup',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyX'].includes(e.code))release();
    });
        stage.on('pointerdown',e=>{
      const p=stage.point(e);
      if(id==='missile-command-defense')model.blast(p.x/640,p.y/480);
      else if(id==='space-invaders-1978'&&p.y<360)model.fire();
      else if(id==='lode-runner-classic'||id==='pengo-ice-blocks'||id==='burgertime-platforms'||id==='rally-x-maze'){
        const cellX=id==='burgertime-platforms'?Math.round((p.x-86)/98):Math.floor((p.x-8)/(id==='pengo-ice-blocks'?58:48));
        const cellY=id==='burgertime-platforms'?Math.round((p.y-95)/100):Math.floor((p.y-32)/(id==='pengo-ice-blocks'?58:50));
        const dx=Math.sign(cellX-(model.state.x||0));
        const dy=Math.sign(cellY-(model.state.y||0));
        if(id==='rally-x-maze')model.steer(dx,dy);
        else model.move(dx,dy);
      }else if(id==='qix-territory'){
        const cellX=Math.max(0,Math.min(11,Math.round((p.x-99)/40)));
        const cellY=Math.max(0,Math.min(11,Math.round((p.y-44)/34)));
        model.move(Math.sign(cellX-model.state.x),Math.sign(cellY-model.state.y));
      }else if(id==='moon-patrol-rover')model.jump();
    });
        stage.frame((dt)=>{
      if(id==='space-invaders-1978'){
        if(controls.left())model.move(-1,dt);
        if(controls.right())model.move(1,dt);
        model.step(dt);
      }else if(id==='lunar-lander-1979'){
        model.step(dt,{
          left:held.has('rotateLeft'),right:held.has('rotateRight'),thrust:held.has('thrust')
        });
      }else if(id==='qix-territory')model.step(dt);
      else if(id==='joust-arcade'){
        if(controls.left())model.state.x-=dt*.4;
        if(controls.right())model.state.x+=dt*.4;
        model.step(dt);
      }else if(id==='rally-x-maze')model.step(dt);
      else if(id==='burgertime-platforms')model.step(dt);
      else if(id==='moon-patrol-rover')model.step(dt);
      else if(id==='missile-command-defense')model.step(dt);
      stage.setHUD(`Score ${model.game?.score ?? model.state.score ?? 0} · ${model.game?.over||model.state?.over?'Ended':'Playing'}`);
    },ctx=>drawGame(id,model,ctx,stage.canvas));
        stage.model=model;
    return stage;

  }
    Object.entries(builders).forEach(([id, build], index)=>{
        const [title,url,platform]=refs[id];
        window.NP_Fidelity.register(id,{
      title,category:'Arcade',newGame:true,reference:{
        title,url,platform
      },coreMechanics:[title,'original simulation model','touch and keyboard play'],model:build,catalog:{
        id,title,tagline:`${title} · ${platform}`,category:'Arcade',section:'quick',players:'1',duration:'5 phút',mechanic:title,badge:'Mới',color:colors[index%colors.length],aliases:[title]
      },launch(container,game){
        return launchFor(id,container,game);
      }
    });

  });
})();

/* Fire response: dynamic flame spread, hose aiming, water pressure and refill. */
(function () {
  'use strict';
  window.NP_LifeSim.register('doi-cuu-hoa-dem', function (s, a) {
    const { W, H, clamp, distance, rounded, rect, circle, text, gradient, banner, path } = a;
    const houses = [
      { x: 70, name: 'Nhà A', color: '#678b9b', safe: false },
      { x: 287, name: 'Nhà B', color: '#8d796c', safe: false },
      { x: 504, name: 'Nhà C', color: '#5c8880', safe: false }
    ];
    const cells = [];
    houses.forEach((h, building) => {
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        cells.push({
          building, row, col, x: h.x + 40 + col * 45, y: 191 + row * 64,
          fire: ((row + col + building) % 3 === 0 || (row === 1 && col === 1)) ? .73 : 0,
          heat: 0, smoke: row * .6 + col * .3
        });
      }
    });
    let aim = { x: 385, y: 266 };
    let spraying = false, pulse = 0, water = 100, integrity = 100, refill = 0, wind = .34;
    let elapsed = 0, pulseNoise = 0, sprayPoints = [], visibleSpray = false;
    function startRefill() {
      if (refill > 0) return;
      if (water >= 95) { s.say('Bình nước vẫn đầy, tập trung chữa cháy!'); return; }
      refill = 2.5; spraying = false; pulse = 0;
      s.say('Đang nạp nước từ trụ cứu hỏa, chờ 2,5 giây.');
    }
    function update(dt, keys) {
      elapsed += dt;
      wind = .34 + Math.sin(elapsed * .3) * .14;
      if (keys.has('left')) aim.x -= dt * 190;
      if (keys.has('right')) aim.x += dt * 190;
      if (keys.has('up')) aim.y -= dt * 190;
      if (keys.has('down')) aim.y += dt * 190;
      aim.x = clamp(aim.x, 20, W - 20); aim.y = clamp(aim.y, 105, 394);
      pulse = Math.max(0, pulse - dt);
      if (refill > 0) {
        refill -= dt;
        if (refill <= 0) { refill = 0; water = 100; s.say('Đã đầy bình, tiếp tục phun nước.'); }
      }
      const wet = (spraying || keys.has('primary') || pulse > 0) && refill <= 0 && water > 0;
      visibleSpray = wet;
      if (wet) {
        water = Math.max(0, water - dt * 19);
        pulseNoise += dt;
        if (pulseNoise > .034) {
          pulseNoise = 0;
          sprayPoints.push({ x: 100, y: 400, tx: aim.x + (Math.random() - .5) * 25,
            ty: aim.y + (Math.random() - .5) * 25, life: .28 });
        }
      }
      for (const cell of cells) {
        if (houses[cell.building].safe) continue;
        const neighbors = cells.filter(other => other.building === cell.building &&
          Math.abs(other.col - cell.col) + Math.abs(other.row - cell.row) === 1);
        const nearbyFire = neighbors.reduce((total, n) => total + n.fire, 0);
        if (cell.fire > 0) {
          cell.fire = Math.min(1, cell.fire + dt * (.026 + nearbyFire * .007));
        } else {
          cell.heat = clamp(cell.heat + dt * nearbyFire * (.052 + wind * .03) -
            dt * (nearbyFire ? 0 : .14), 0, 1);
          if (cell.heat >= .93) { cell.fire = .25; cell.heat = 0; }
        }
        if (wet && distance(aim.x, aim.y, cell.x, cell.y) < 88) {
          const strength = 1 - distance(aim.x, aim.y, cell.x, cell.y) / 120;
          cell.fire = Math.max(0, cell.fire - dt * (0.9 + strength * .9));
          cell.heat = Math.max(0, cell.heat - dt * 1.6);
        }
      }
      let burning = 0;
      houses.forEach((house, index) => {
        if (house.safe) return;
        const active = cells.filter(cell => cell.building === index).reduce((sum, cell) => sum + cell.fire, 0);
        burning += active;
        if (active < .025) {
          house.safe = true;
          s.progress++; s.add(420); s.say('Đã khống chế ' + house.name + ', chuyển sang nhà tiếp theo!');
          cells.filter(cell => cell.building === index).forEach(cell => { cell.fire = 0; cell.heat = 0; });
        }
      });
      integrity = Math.max(0, integrity - dt * burning * .11);
      if (integrity <= 0) s.finish(false, 'Kết cấu khu phố không còn an toàn.');
      if (s.progress === 3) s.finish(true, 'Cả ba căn nhà đã được cứu an toàn.');
      sprayPoints.forEach(dot => { dot.life -= dt; });
      sprayPoints = sprayPoints.filter(dot => dot.life > 0).slice(-38);
      if (water === 0 && refill === 0 && (spraying || keys.has('primary'))) {
        spraying = false; startRefill();
      }
    }
    function drawHouse(c, house, index) {
      rounded(c, house.x - 9, 143, 191, 256, 6, 'rgba(4,13,21,.4)');
      rounded(c, house.x - 12, 137, 189, 252, 6, house.color, '#233c46');
      rounded(c, house.x - 23, 132, 211, 23, 3, '#293f4b');
      rect(c, house.x + 80, 348, 33, 40, '#253946');
      circle(c, house.x + 105, 372, 2, '#d8b479');
      for (const cell of cells.filter(x => x.building === index)) {
        rounded(c, cell.x - 18, cell.y - 20, 36, 39, 3, '#172b3a', '#c1d1bf');
        rect(c, cell.x - 2, cell.y - 19, 3, 37, '#93b5ba');
        rect(c, cell.x - 18, cell.y - 1, 36, 2, '#93b5ba');
        if (cell.fire > 0) {
          rect(c, cell.x - 16, cell.y - 17, 32, 34, 'rgba(252,113,49,' + (cell.fire * .28) + ')');
          const h = 31 * cell.fire + Math.sin(elapsed * 12 + cell.col * 3) * 7;
          path(c, [[cell.x - 14, cell.y + 14], [cell.x - 17, cell.y - h * .4],
            [cell.x - 2, cell.y - h], [cell.x + 4, cell.y - h * .25],
            [cell.x + 14, cell.y - h * .73], [cell.x + 15, cell.y + 15]],
            '#ff7636');
          path(c, [[cell.x - 7, cell.y + 13], [cell.x - 3, cell.y - h * .56],
            [cell.x + 4, cell.y - h * .3], [cell.x + 10, cell.y + 13]], '#ffd373');
          for (let k = 0; k < 2; k++) {
            circle(c, cell.x + Math.sin(elapsed + k * 2) * 7,
              cell.y - h - k * 12 - (elapsed * 10 % 10), 7 + k * 4,
              'rgba(118,128,136,' + (.11 * cell.fire) + ')');
          }
        }
      }
      if (house.safe) {
        rounded(c, house.x + 32, 228, 113, 33, 8, '#194c43', '#72edb4');
        text(c, 'AN TOÀN', house.x + 89, 244, 19, '#a9fad1', 'center', '700');
      }
    }
    function draw(c) {
      rect(c, 0, 0, W, H, gradient(c, 0, H, [[0, '#0d243d'], [.64, '#283745'], [1, '#303738']]));
      circle(c, 662, 75, 33, '#d9debe');
      for (let i = 0; i < 37; i++) circle(c, i * 73 % 760, i * 101 % 130,
        i % 4 === 0 ? 1.5 : .8, 'rgba(227,241,236,.57)');
      rect(c, 0, 386, W, 74, '#29363c');
      rect(c, 0, 394, W, 3, '#748d83');
      houses.forEach((house, i) => drawHouse(c, house, i));
      // Truck with hose mounted to rotating boom.
      rounded(c, 12, 394, 151, 51, 12, '#e24d40', '#772b25');
      rounded(c, 22, 385, 59, 42, 7, '#f0714c', '#aa3026');
      rounded(c, 28, 392, 39, 20, 4, '#b9d8e3');
      rounded(c, 99, 388, 47, 26, 4, '#e7e6ca');
      circle(c, 42, 441, 16, '#171d21', '#8a9a9d');
      circle(c, 124, 441, 16, '#171d21', '#8a9a9d');
      for (let i = 0; i < 3; i++) rect(c, 106 + i * 12, 392, 6, 18, '#e9b95f');
      c.strokeStyle = '#262c30'; c.lineWidth = 11;
      c.beginPath(); c.moveTo(98, 400); c.lineTo(aim.x, aim.y); c.stroke();
      c.strokeStyle = '#d8d9cd'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(98, 400); c.lineTo(aim.x, aim.y); c.stroke();
      const shooting = visibleSpray;
      if (shooting && water > 0 && refill === 0) {
        c.strokeStyle = 'rgba(161,239,255,.6)'; c.lineWidth = 14;
        c.beginPath(); c.moveTo(100, 399); c.lineTo(aim.x, aim.y); c.stroke();
        c.strokeStyle = '#e2faff'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(100, 399); c.lineTo(aim.x, aim.y); c.stroke();
        for (const dot of sprayPoints) {
          circle(c, 100 + (dot.tx - 100) * (1 - dot.life / .28),
            400 + (dot.ty - 400) * (1 - dot.life / .28), 2.5, '#b4eef9');
        }
      }
      c.strokeStyle = '#d4f4e1'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(aim.x - 15, aim.y); c.lineTo(aim.x - 5, aim.y);
      c.moveTo(aim.x + 5, aim.y); c.lineTo(aim.x + 15, aim.y);
      c.moveTo(aim.x, aim.y - 15); c.lineTo(aim.x, aim.y - 5);
      c.moveTo(aim.x, aim.y + 5); c.lineTo(aim.x, aim.y + 15); c.stroke();
      rounded(c, 535, 15, 208, 85, 12, 'rgba(10,20,30,.9)');
      text(c, 'NƯỚC', 547, 33, 12, '#aac1cc');
      rounded(c, 605, 25, 121, 11, 5, '#3d505e');
      rounded(c, 605, 25, 121 * water / 100, 11, 5, '#6bd3f0');
      text(c, 'KẾT CẤU', 547, 55, 12, '#aac1cc');
      rounded(c, 605, 48, 121, 11, 5, '#3d505e');
      rounded(c, 605, 48, 121 * integrity / 100, 11, 5, integrity < 40 ? '#f18f68' : '#85e3aa');
      text(c, refill > 0 ? 'NẠP NƯỚC ' + refill.toFixed(1) + 's' : 'Gió ' + Math.round(wind * 100) + '%  /  còn ' + Math.round(water) + 'L',
        547, 80, 13, '#eddfaf');
      banner(c, 'ĐỘI CỨU HỎA', 'Di chuyển tâm ngắm, phun dập lửa từ các cửa sổ');
    }
    return {
      title: 'ĐỘI CỨU HỎA / FIRE WATCH', limit: 160,
      controls: [
        { id: 'left', label: '←', hold: true }, { id: 'up', label: '↑', hold: true },
        { id: 'down', label: '↓', hold: true }, { id: 'right', label: '→', hold: true },
        { id: 'primary', label: 'GIỮ ĐỂ PHUN', hold: true },
        { id: 'secondary', label: 'NẠP NƯỚC' }
      ],
      hint: 'Chạm và giữ trên sân để phun • WASD để ngắm • Space phun ngắn • R / E nạp nước',
      update, draw,
      pointer(type, x, y) {
        if (type === 'up') { spraying = false; return; }
        aim.x = x; aim.y = y; spraying = true;
      },
      action(id) { if (id === 'secondary') startRefill(); else if (id === 'primary') pulse = .38; },
      metric() { return 'Đã cứu ' + s.progress + '/3 nhà • Còn ' + Math.round(water) + 'L nước'; },
      reset() { s.goal = 3; s.say('Chạm vào ngọn lửa để phun; nạp nước kịp thời để cứu ba căn nhà.'); }
    };
  });
})();
/* Midnight Courier: rainy-city delivery with traffic, inertia and braking. */
(function () {
  'use strict';
  window.NP_LifeSim.register('pho-mua-giao-hang', function (s, a) {
    const { W, H, clamp, distance, rounded, rect, circle, text, gradient, random, banner } = a;
    const roadsX = [118, 365, 610], roadsY = [98, 254, 414];
    const stops = [
      { x: 610, y: 98, name: 'Quán ven hồ' }, { x: 365, y: 414, name: 'Tòa văn phòng' },
      { x: 118, y: 254, name: 'Chung cư cũ' }, { x: 610, y: 414, name: 'Nhà ga cuối' }
    ];
    const courier = { x: 118, y: 98, vx: 0, vy: 0, angle: 0, health: 100, stun: 0, brake: 0 };
    const traffic = [
      { x: 310, y: 98, speed: 48, dir: 1, color: '#f7ac62' },
      { x: 702, y: 254, speed: 42, dir: -1, color: '#d3e8f5' },
      { x: 470, y: 414, speed: 61, dir: 1, color: '#56c7cf' },
      { x: 50, y: 414, speed: 36, dir: -1, color: '#f280a6' }
    ];
    const rain = Array.from({ length: 130 }, (_, i) => ({
      x: (i * 131.1) % W, y: (i * 73.7) % H, speed: random(90, 175)
    }));
    let t = 0, delivered = 0, collisionCooldown = 0, signalCooldown = 0;

    function roadAt(x, y) {
      return roadsX.some(rx => Math.abs(x - rx) < 34) || roadsY.some(ry => Math.abs(y - ry) < 33);
    }
    function bump(message, severity) {
      if (collisionCooldown > 0) return;
      courier.health = Math.max(0, courier.health - severity);
      courier.vx *= -0.27; courier.vy *= -0.27;
      collisionCooldown = 0.85;
      s.say(message + ' Xe còn ' + courier.health + '% tình trạng.');
      if (!courier.health) s.finish(false, 'Xe hỏng, chuyến hàng chưa hoàn thành.');
    }
    function update(dt, keys) {
      t += dt;
      collisionCooldown = Math.max(0, collisionCooldown - dt);
      signalCooldown = Math.max(0, signalCooldown - dt);
      const accelerate = 265 * dt;
      if (keys.has('left')) courier.vx -= accelerate;
      if (keys.has('right')) courier.vx += accelerate;
      if (keys.has('up')) courier.vy -= accelerate;
      if (keys.has('down')) courier.vy += accelerate;
      const drag = Math.exp(-dt * (courier.brake > 0 ? 13 : 2.6));
      courier.vx *= drag; courier.vy *= drag;
      courier.brake = Math.max(0, courier.brake - dt);
      const speed = Math.hypot(courier.vx, courier.vy);
      if (speed > 134) {
        courier.vx *= 134 / speed; courier.vy *= 134 / speed;
      }
      const nextX = clamp(courier.x + courier.vx * dt, 22, W - 22);
      const nextY = clamp(courier.y + courier.vy * dt, 22, H - 22);
      if (roadAt(nextX, nextY)) {
        courier.x = nextX; courier.y = nextY;
      } else {
        bump('Va vào lề đường!', 7);
      }
      if (speed > 6) courier.angle = Math.atan2(courier.vy, courier.vx);
      for (const car of traffic) {
        car.x += car.dir * car.speed * dt;
        if (car.x > W + 34) car.x = -34;
        if (car.x < -34) car.x = W + 34;
        if (distance(car.x, car.y, courier.x, courier.y) < 24) bump('Quệt xe ở giao lộ!', 13);
      }
      const red = Math.floor(t / 5) % 2 === 0;
      if (red && speed > 55 && signalCooldown <= 0 &&
          roadsX.some(x => Math.abs(courier.x - x) < 21) &&
          roadsY.some(y => Math.abs(courier.y - y) < 21)) {
        signalCooldown = 6;
        s.score = Math.max(0, s.score - 50);
        s.say('Vượt đèn đỏ! Trừ 50 điểm an toàn.');
      }
      const stop = stops[delivered];
      if (stop && distance(courier.x, courier.y, stop.x, stop.y) < 30) {
        if (speed < 48) {
          delivered++; s.progress = delivered; s.goal = stops.length;
          s.add(240 + Math.ceil(courier.health / 5));
          s.say('Đã giao đơn ' + delivered + '/4 tại ' + stop.name + '.');
          if (delivered === stops.length) s.finish(true, 'Đủ bốn đơn, về đích an toàn!');
        } else if (collisionCooldown <= 0) {
          s.say('Đến điểm giao rồi, hãy giảm tốc để nhận đơn.');
        }
      }
    }
    function drawBuilding(c, x, y, w, h, i) {
      rounded(c, x + 3, y + 7, w, h, 9, 'rgba(0,0,0,.30)');
      rounded(c, x, y, w, h, 8, i % 3 ? '#1a3846' : '#244957', '#2e5968');
      for (let by = y + 11; by < y + h - 8; by += 19) {
        for (let bx = x + 13; bx < x + w - 11; bx += 22) {
          rect(c, bx, by, 10, 8, (Math.floor(bx * by / 100) % 4 === 0) ? '#f2ce74' : '#52707a');
        }
      }
      rect(c, x + 8, y + 6, w - 16, 3, '#315462');
    }
    function drawVehicle(c, x, y, angle, color, delivery) {
      c.save(); c.translate(x, y); c.rotate(angle);
      rounded(c, -13, -8, 26, 16, 5, 'rgba(0,0,0,.4)');
      rounded(c, -12, -10, 25, 17, 5, color, '#162831');
      rounded(c, 0, -7, 7, 14, 2, delivery ? '#fff5b2' : '#95b9d1');
      rect(c, -8, -12, 9, 2, '#111b24'); rect(c, -8, 10, 9, 2, '#111b24');
      rect(c, 11, -7, 3, 4, '#fff2c0'); rect(c, 11, 3, 3, 4, '#fff2c0');
      if (delivery) rounded(c, -11, -7, 8, 14, 2, '#e3b46c', '#faf0dd');
      c.restore();
    }
    function draw(c) {
      rect(c, 0, 0, W, H, gradient(c, 0, H, [[0, '#0b2335'], [1, '#142d36']]));
      for (let row = 0; row < roadsY.length - 1; row++) {
        for (let col = 0; col < roadsX.length + 1; col++) {
          const left = (roadsX[col - 1] ?? -42) + 43;
          const right = (roadsX[col] ?? W + 42) - 43;
          const top = roadsY[row] + 42, bottom = roadsY[row + 1] - 43;
          if (right - left > 38) drawBuilding(c, left, top, right - left, bottom - top, row * 4 + col);
        }
      }
      for (const y of roadsY) {
        rect(c, 0, y - 37, W, 74, '#263a46');
        rect(c, 0, y - 36, W, 2, '#50707b');
        rect(c, 0, y + 34, W, 2, '#50707b');
        c.strokeStyle = '#637680'; c.lineWidth = 2; c.setLineDash([22, 22]);
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); c.setLineDash([]);
      }
      for (const x of roadsX) {
        rect(c, x - 37, 0, 74, H, '#243944');
        rect(c, x - 36, 0, 2, H, '#50707b');
        rect(c, x + 34, 0, 2, H, '#50707b');
        c.strokeStyle = '#6e8490'; c.lineWidth = 2; c.setLineDash([20, 25]);
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); c.setLineDash([]);
      }
      const red = Math.floor(t / 5) % 2 === 0;
      for (const x of roadsX) for (const y of roadsY) {
        rect(c, x - 32, y - 32, 4, 64, '#9ab0b0');
        rect(c, x - 25, y - 32, 3, 64, '#9ab0b0');
        rounded(c, x + 24, y - 29, 10, 20, 3, '#101c22');
        circle(c, x + 29, y - 23, 3, red ? '#ff654b' : '#594542');
        circle(c, x + 29, y - 14, 3, red ? '#344b49' : '#9ce6a0');
      }
      const dest = stops[delivered];
      if (dest) {
        const pulse = 28 + Math.sin(t * 5) * 5;
        circle(c, dest.x, dest.y, pulse, 'rgba(253,196,91,.13)', '#ffd280');
        circle(c, dest.x, dest.y, 17, '#ffd381', '#fff8d7');
        text(c, String(delivered + 1), dest.x, dest.y + 1, 18, '#253e4d', 'center', '700');
        rounded(c, clamp(dest.x - 52, 8, W - 112), clamp(dest.y - 53, 6, H - 32), 104, 24, 6, '#172d37');
        text(c, 'GIAO HÀNG', clamp(dest.x, 60, W - 60), clamp(dest.y - 40, 20, H - 20), 11, '#ffe6a8', 'center', '700');
      }
      for (const car of traffic) drawVehicle(c, car.x, car.y, car.dir < 0 ? Math.PI : 0, car.color, false);
      if (courier.health > 0) {
        if (Math.hypot(courier.vx, courier.vy) > 55) {
          circle(c, courier.x - 10, courier.y + 8, 15, 'rgba(162,216,231,.13)');
        }
        drawVehicle(c, courier.x, courier.y, courier.angle, collisionCooldown > 0 ? '#f3e49b' : '#8ef0cc', true);
      }
      for (const drop of rain) {
        const y = (drop.y + t * drop.speed) % H;
        c.strokeStyle = 'rgba(172,213,236,.23)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(drop.x, y); c.lineTo(drop.x - 5, y + 12); c.stroke();
      }
      banner(c, 'PHỐ MƯA  /  GIAO HÀNG', 'Bốn địa điểm • tuân thủ tín hiệu • phanh trước khi dừng');
      rounded(c, 547, 14, 196, 59, 10, 'rgba(7,20,30,.82)');
      text(c, 'TÌNH TRẠNG XE', 560, 31, 12, '#b4cad2');
      rounded(c, 560, 48, 169, 10, 5, '#42555f');
      rounded(c, 560, 48, 169 * courier.health / 100, 10, 5,
        courier.health < 30 ? '#ff796f' : '#9bf0cd');
    }
    return {
      title: 'PHỐ MƯA: GIAO HÀNG', limit: 145,
      controls: [
        { id: 'left', label: '←', hold: true }, { id: 'up', label: '↑', hold: true },
        { id: 'down', label: '↓', hold: true }, { id: 'right', label: '→', hold: true },
        { id: 'primary', label: 'PHANH', hold: false }
      ],
      hint: 'WASD / mũi tên để lái • Space để phanh • giảm tốc khi giao hàng',
      update,
      draw,
      action(id) { if (id === 'primary') courier.brake = 0.65; },
      metric() { return 'Đã giao ' + delivered + '/4 đơn • Xe ' + courier.health + '%'; },
      reset() { s.goal = 4; s.say('Tăng tốc vừa phải trên đường mưa, dừng ở vị trí giao hàng.'); }
    };
  });
})();
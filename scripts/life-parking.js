/* Parking master: bicycle steering model, reverse gear and precision parking. */
(function () {
  'use strict';
  window.NP_LifeSim.register('do-xe-dung-chuan', function (s, a) {
    const { W, H, clamp, distance, rounded, rect, circle, text, gradient, banner, path } = a;
    const car = { x: 112, y: 305, angle: 0, speed: 0, steer: 0, gear: 1, health: 100 };
    const bays = [
      { x: 606, y: 158, angle: 0, label: 'A06' },
      { x: 328, y: 158, angle: 0, label: 'A03' },
      { x: 605, y: 384, angle: Math.PI, label: 'B06' }
    ];
    const parked = [
      { x: 110, y: 158, color: '#c66f5c' }, { x: 217, y: 158, color: '#abc4d2' },
      { x: 440, y: 158, color: '#77aa8b' }, { x: 714, y: 158, color: '#f4bb72' },
      { x: 112, y: 384, color: '#aec9dc' }, { x: 222, y: 384, color: '#d5a5a1' },
      { x: 330, y: 384, color: '#8aa4b8' }, { x: 445, y: 384, color: '#dfc48e' },
      { x: 716, y: 384, color: '#92b6b7' }
    ];
    let stage = 0, parkedFor = 0, collisionCooldown = 0, steeringTrail = [];
    function angleDistance(a1, a2) { return Math.atan2(Math.sin(a1 - a2), Math.cos(a1 - a2)); }
    function bump() {
      if (collisionCooldown > 0) return;
      collisionCooldown = 0.9; car.speed *= -0.25; car.health = Math.max(0, car.health - 13);
      s.say('Va chạm! Trừ tình trạng xe. Cần giữ khoảng cách.');
      if (car.health <= 0) s.finish(false, 'Xe hư hỏng quá mức.');
    }
    function invalid(x, y) {
      if (x < 36 || x > W - 36 || y < 97 || y > H - 34) return true;
      return parked.some(p => Math.abs(x - p.x) < 45 && Math.abs(y - p.y) < 31);
    }
    function update(dt, keys) {
      collisionCooldown = Math.max(0, collisionCooldown - dt);
      const steerTarget = keys.has('left') ? -0.62 : (keys.has('right') ? 0.62 : 0);
      car.steer += (steerTarget - car.steer) * Math.min(1, dt * 6);
      if (keys.has('up')) car.speed += 92 * car.gear * dt;
      if (keys.has('down')) {
        if (Math.abs(car.speed) < 2) car.speed = 0;
        else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 155 * dt);
      }
      car.speed *= Math.exp(-1.65 * dt);
      car.speed = clamp(car.speed, -63, 109);
      const nextAngle = car.angle + Math.tan(car.steer) * car.speed / 40 * dt;
      const nx = car.x + Math.cos(nextAngle) * car.speed * dt;
      const ny = car.y + Math.sin(nextAngle) * car.speed * dt;
      if (invalid(nx, ny)) bump();
      else { car.x = nx; car.y = ny; car.angle = nextAngle; }
      if (Math.abs(car.speed) > 8) {
        steeringTrail.push({ x: car.x - Math.cos(car.angle) * 17, y: car.y - Math.sin(car.angle) * 17, life: 2 });
      }
      steeringTrail.forEach(dot => { dot.life -= dt; });
      steeringTrail = steeringTrail.filter(dot => dot.life > 0).slice(-45);

      const target = bays[stage];
      if (target && distance(car.x, car.y, target.x, target.y) < 23 &&
          Math.abs(angleDistance(car.angle, target.angle)) < 0.27 && Math.abs(car.speed) < 7) {
        parkedFor += dt;
        if (parkedFor > 1.25) {
          stage++; s.progress = stage; s.add(320 + car.health * 2);
          parkedFor = 0;
          if (stage >= bays.length) {
            s.finish(true, 'Đỗ thành công cả ba ô, không cần hỗ trợ!');
          } else {
            s.say('Đỗ đúng ô ' + target.label + '. Chuyển sang vị trí tiếp theo.');
            car.x = 112; car.y = 305; car.angle = 0; car.speed = 0; car.steer = 0; car.gear = 1;
          }
        }
      } else parkedFor = 0;
    }
    function carDraw(c, x, y, angle, color, moving) {
      c.save(); c.translate(x, y); c.rotate(angle);
      rounded(c, -23 + 2, -13 + 4, 48, 28, 7, 'rgba(0,0,0,.28)');
      rounded(c, -24, -13, 48, 26, 8, color, '#2d424b');
      rounded(c, -5, -11, 17, 22, 4, '#b6d4e2');
      rect(c, 13, -10, 2, 20, '#ecf4ef');
      rect(c, -22, -11, 4, 6, '#fa6958'); rect(c, -22, 5, 4, 6, '#fa6958');
      rect(c, 21, -10, 4, 7, '#fff0b4'); rect(c, 21, 3, 4, 7, '#fff0b4');
      for (const yWheel of [-14, 14]) {
        rounded(c, -16, yWheel - 2, 12, 4, 2, '#131a1d');
        rounded(c, 9, yWheel - 2, 11, 4, 2, '#131a1d');
      }
      if (moving) {
        rect(c, -3, -12, 7, 2, '#b9ecf5');
        rect(c, -3, 10, 7, 2, '#b9ecf5');
      }
      c.restore();
    }
    function draw(c) {
      rect(c, 0, 0, W, H, gradient(c, 0, H, [[0, '#183e45'], [1, '#284951']]));
      rect(c, 0, 92, W, 340, '#303f45');
      for (let x = 6; x < W; x += 54) {
        rect(c, x, 91, 2, 341, 'rgba(255,255,255,.015)');
      }
      // Parking stripe rows and bay markers.
      for (const y of [158, 384]) {
        for (let i = 0; i < 7; i++) {
          const bx = 52 + i * 109;
          rect(c, bx, y - 33, 2, 68, '#e5d5a7');
          text(c, (y === 158 ? 'A' : 'B') + String(i + 1).padStart(2, '0'),
            bx + 53, y + (y === 158 ? -42 : 46), 11, '#adb9b6', 'center');
        }
        c.strokeStyle = '#c3c9ba'; c.lineWidth = 2; c.setLineDash([10, 7]);
        c.beginPath(); c.moveTo(42, y + (y === 158 ? 37 : -37));
        c.lineTo(750, y + (y === 158 ? 37 : -37)); c.stroke(); c.setLineDash([]);
      }
      for (const p of parked) carDraw(c, p.x, p.y, 0, p.color, false);
      // Moving path shadow.
      steeringTrail.forEach(dot => circle(c, dot.x, dot.y, 2, 'rgba(7,13,19,' + dot.life / 10 + ')'));
      const target = bays[stage];
      if (target) {
        c.save(); c.translate(target.x, target.y); c.rotate(target.angle);
        rounded(c, -40, -29, 80, 58, 5, 'rgba(104,242,185,.18)', '#98f3b5');
        c.setLineDash([5, 5]); c.strokeStyle = '#ecffb5'; c.lineWidth = 2;
        c.strokeRect(-27, -17, 54, 34); c.setLineDash([]);
        text(c, 'ĐỖ VÀO ĐÂY', 0, -45, 13, '#d4fff0', 'center', '700');
        c.restore();
      }
      carDraw(c, car.x, car.y, car.angle, collisionCooldown > 0 ? '#ffd29d' : '#69d4eb', true);
      rounded(c, 17, 368, 219, 74, 11, '#142630', '#395665');
      text(c, 'HỘP SỐ', 30, 387, 12, '#8fb1bd');
      rounded(c, 30, 399, 72, 31, 6, car.gear === 1 ? '#97e8c0' : '#f4c386');
      text(c, car.gear === 1 ? 'D • TIẾN' : 'R • LÙI', 66, 415, 14, '#153041', 'center', '700');
      text(c, 'TỐC ĐỘ ' + Math.round(Math.abs(car.speed) * 0.7) + ' km/h', 118, 400, 15, '#fff');
      text(c, 'XE ' + car.health + '%', 118, 423, 13, car.health < 40 ? '#ffb5a2' : '#a7f1ca');
      rounded(c, 557, 14, 186, 66, 11, '#142630');
      text(c, 'CANH GÓC XE', 570, 34, 12, '#a5c1ca');
      text(c, target ? target.label + ' • ' + Math.round(Math.abs(angleDistance(car.angle, target.angle)) * 57.3) + '°' : 'HOÀN TẤT',
        570, 58, 21, '#f4dbab', 'left', '700');
      banner(c, 'THỬ THÁCH ĐỖ XE', 'Lái chậm • đánh lái • vào ô đúng hướng');
      if (parkedFor > 0) {
        rounded(c, 278, 395, 207, 42, 9, '#153b3b');
        text(c, 'GIỮ XE ĐỨNG YÊN ' + Math.round(parkedFor / 1.25 * 100) + '%', 381, 417, 14, '#9df3cb', 'center');
      }
    }
    return {
      title: 'ĐỖ XE CHUẨN / PARKING', limit: 170,
      controls: [
        { id: 'left', label: '← LÁI', hold: true }, { id: 'up', label: '↑ GA', hold: true },
        { id: 'down', label: '↓ PHANH', hold: true }, { id: 'right', label: 'LÁI →', hold: true },
        { id: 'primary', label: 'D / R ĐỔI SỐ' }
      ],
      hint: '↑ ga • ↓ phanh • ← / → đánh lái • Space hoặc E đổi số tiến/lùi',
      update, draw,
      action(action) {
        if (action === 'primary' || action === 'secondary') {
          if (Math.abs(car.speed) > 9) { s.say('Dừng hẳn trước khi đổi số.'); return; }
          car.gear *= -1; s.say(car.gear === 1 ? 'Đã vào số tiến D.' : 'Đã vào số lùi R.');
        }
      },
      metric() { return 'Đã đỗ ' + stage + '/3 • Xe ' + car.health + '%'; },
      reset() { s.goal = 3; s.say('Đỗ đúng tâm và cùng hướng ô xanh, giữ xe đứng yên 1,3 giây.'); }
    };
  });
})();
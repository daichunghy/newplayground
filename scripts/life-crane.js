/* Harbor crane: trolley inertia, pendulum physics, hoist height and precision loads. */
(function () {
  'use strict';
  window.NP_LifeSim.register('cang-cau-container', function (s, a) {
    const { W, H, clamp, distance, rounded, rect, circle, text, gradient, banner, path } = a;
    const crane = { x: 174, vx: 0, length: 302, angle: .015, angularV: 0, carrying: false };
    const parcels = [
      { x: 175, y: 383, color: '#dc825d', code: 'HCM 2045' },
      { x: 276, y: 383, color: '#74bdad', code: 'SG 1182' },
      { x: 375, y: 383, color: '#6e9bd3', code: 'VN 6053' }
    ];
    const dock = { x: 641, y: 390, width: 102, height: 40 };
    let moved = 0, integrity = 100, cooldown = 0, t = 0, gust = 0, sparkleTimer = 0;
    let successes = [];
    function hook() {
      return {
        x: crane.x + Math.sin(crane.angle) * crane.length,
        y: 70 + Math.cos(crane.angle) * crane.length
      };
    }
    function handleLoad() {
      if (s.phase !== 'playing' || cooldown > 0) return;
      const point = hook();
      const crate = parcels[moved];
      if (!crate) return;
      if (!crane.carrying) {
        const d = distance(point.x, point.y, crate.x, crate.y - 5);
        if (d > 37) {
          s.say('Cần hạ móc vào gần tâm container. Còn cách ' + Math.round(d) + 'px.');
          return;
        }
        if (Math.abs(crane.vx) > 39) {
          s.say('Xe tời còn trượt! Giảm tốc trước khi móc container.');
          return;
        }
        crane.carrying = true; crane.angularV += Math.sign(crane.vx || 1) * .025;
        cooldown = .45;
        s.say('Đã khóa móc container ' + crate.code + '. Nâng hàng và di chuyển.');
        return;
      }
      const stable = Math.abs(crane.angle) < .22 && Math.abs(crane.angularV) < .5;
      const insideDock = Math.abs(point.x - dock.x) < 39 && point.y > 329 && point.y < 398;
      if (insideDock && stable && Math.abs(crane.vx) < 36) {
        const bonus = 300 + Math.floor(integrity * 2) + Math.max(0, 75 - Math.round(Math.abs(crane.angle) * 150));
        successes.push({ color: crate.color, code: crate.code });
        crane.carrying = false; moved++; s.progress = moved; s.add(bonus);
        s.say('Đã đặt container vào đúng cầu cảng. +' + bonus + ' điểm.');
        cooldown = .6;
        if (moved >= parcels.length) s.finish(true, 'Ba container đã xếp an toàn đúng vị trí.');
      } else {
        integrity = Math.max(0, integrity - 14);
        crane.carrying = false; cooldown = .65;
        s.say('Thả sai vị trí/góc nghiêng. Container bị xóc! Tình trạng cảng ' + integrity + '%.');
        if (!integrity) s.finish(false, 'Lỗi xếp dỡ vượt mức an toàn cho phép.');
      }
    }
    function update(dt, keys) {
      t += dt; cooldown = Math.max(0, cooldown - dt);
      gust = Math.sin(t * .79) * 16 + Math.sin(t * 1.87) * 9;
      const oldV = crane.vx;
      if (keys.has('left')) crane.vx -= dt * 140;
      if (keys.has('right')) crane.vx += dt * 140;
      crane.vx *= Math.exp(-2.5 * dt);
      crane.vx = clamp(crane.vx, -118, 118);
      crane.x = clamp(crane.x + crane.vx * dt, 50, W - 50);
      if (crane.x === 50 || crane.x === W - 50) crane.vx = 0;
      const acceleration = (crane.vx - oldV) / Math.max(.001, dt);
      crane.angularV += (-270 / crane.length * Math.sin(crane.angle) -
        acceleration / crane.length * Math.cos(crane.angle) + gust / crane.length * .35) * dt;
      crane.angularV *= Math.exp(-.43 * dt);
      crane.angle = clamp(crane.angle + crane.angularV * dt, -.75, .75);
      if (Math.abs(crane.angle) >= .75) crane.angularV *= -.2;
      if (keys.has('up')) crane.length = Math.max(112, crane.length - dt * 107);
      if (keys.has('down')) crane.length = Math.min(313, crane.length + dt * 107);
      if (crane.carrying && hook().y + 19 > 403 && cooldown <= 0) {
        integrity = Math.max(0, integrity - 8);
        cooldown = 1.1;
        s.say('Container chạm nền quá mạnh! Nhấc hàng lên.');
        if (!integrity) s.finish(false, 'Hàng hóa không còn an toàn.');
      }
      sparkleTimer += dt;
    }
    function cargo(c, x, y, color, code, shadow) {
      if (shadow) rounded(c, x - 39 + 3, y - 19 + 6, 78, 38, 4, 'rgba(0,0,0,.3)');
      rounded(c, x - 39, y - 19, 78, 38, 4, color, '#1c3b45');
      for (let i = 0; i < 7; i++) rect(c, x - 34 + i * 10, y - 16, 3, 31, 'rgba(0,0,0,.15)');
      rounded(c, x - 33, y - 9, 59, 18, 3, 'rgba(6,29,41,.26)');
      text(c, code, x, y, 12, '#fff7ea', 'center', '700');
      circle(c, x - 32, y - 12, 2, '#ddf4e5'); circle(c, x + 31, y - 12, 2, '#ddf4e5');
    }
    function draw(c) {
      rect(c, 0, 0, W, H, gradient(c, 0, H, [[0, '#17354e'], [.52, '#e9aa7e'], [1, '#294556']]));
      circle(c, 648, 100, 48, '#f3d49f');
      // Harbor skyline: terminal sheds, warehouses and distant cranes.
      for (let i = 0; i < 11; i++) {
        const x = i * 88;
        rect(c, x, 232 + (i % 3) * 10, 77, 80, '#496573');
        rect(c, x + 7, 238 + (i % 3) * 10, 18, 4, '#92aeb9');
      }
      for (let x = 32; x < W; x += 180) {
        c.strokeStyle = '#647b8b'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x, 259); c.lineTo(x, 163); c.lineTo(x + 78, 163);
        c.lineTo(x + 108, 183); c.stroke();
        c.beginPath(); c.moveTo(x + 78, 164); c.lineTo(x + 78, 218); c.stroke();
      }
      rect(c, 0, 302, W, 112, '#275169');
      for (let i = 0; i < 11; i++) {
        c.strokeStyle = 'rgba(222,227,212,.24)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(i * 94 - 15 + Math.sin(t * 1.3) * 8, 320 + i % 3 * 17);
        c.lineTo(i * 94 + 38 + Math.sin(t * 1.3) * 8, 320 + i % 3 * 17); c.stroke();
      }
      rect(c, 0, 397, W, 63, '#333d45');
      rect(c, 0, 397, W, 8, '#e3bf76');
      for (let x = 0; x < W; x += 40) rect(c, x, 405, 22, 4, '#d8ca99');
      // Dock safe placement bay.
      rounded(c, dock.x - 51, 339, 102, 63, 6, 'rgba(95,233,170,.17)', '#b8f2b2');
      c.strokeStyle = '#abebc1'; c.lineWidth = 2; c.setLineDash([5, 5]);
      c.strokeRect(dock.x - 45, 347, 90, 48); c.setLineDash([]);
      text(c, 'KHU XẾP HÀNG', dock.x, 329, 14, '#ddfaca', 'center', '700');
      parcels.slice(moved).forEach((crate, index) => {
        if (index === 0 && crane.carrying) return;
        cargo(c, crate.x, crate.y, crate.color, crate.code, true);
      });
      successes.forEach((crate, i) => cargo(c, dock.x, 378 - i * 37, crate.color, crate.code, false));
      // Crane gantry, articulated trolley and pendulum hook.
      rect(c, 20, 56, 715, 13, '#f2bf6f');
      for (let x = 25; x <= 710; x += 45) path(c,
        [[x, 53], [x + 22, 35], [x + 44, 53]], null, '#a27342', 2);
      rect(c, 29, 54, 12, 338, '#d4a75d');
      rect(c, 715, 54, 12, 338, '#d4a75d');
      for (let y = 84; y < 390; y += 52) {
        path(c, [[40, y], [40, y + 50], [75, y + 50]], null, '#825934', 2);
        path(c, [[715, y], [680, y + 50], [715, y + 50]], null, '#825934', 2);
      }
      rounded(c, crane.x - 24, 43, 48, 29, 4, '#355568', '#c7dfe3');
      for (const offset of [-14, 14]) circle(c, crane.x + offset, 72, 7, '#263948', '#b4c6c9');
      const h = hook();
      c.strokeStyle = '#172d35'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(crane.x, 70); c.lineTo(h.x, h.y); c.stroke();
      c.strokeStyle = '#d4d8c7'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(crane.x + 2, 70); c.lineTo(h.x + 2, h.y); c.stroke();
      path(c, [[h.x - 14, h.y - 9], [h.x + 14, h.y - 9],
        [h.x + 10, h.y + 3], [h.x - 10, h.y + 3]], '#b8c8ce', '#344f59');
      c.strokeStyle = '#dfd1ae'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(h.x, h.y + 3); c.lineTo(h.x, h.y + 13); c.stroke();
      c.beginPath(); c.arc(h.x + 3, h.y + 12, 7, 0, Math.PI);
      c.stroke();
      if (crane.carrying) cargo(c, h.x, h.y + 35, parcels[moved].color, parcels[moved].code, true);
      rounded(c, 541, 13, 204, 93, 11, '#152d3d');
      text(c, 'CƯỜNG ĐỘ GIÓ ' + Math.round(Math.abs(gust)) + ' km/h', 555, 34, 14, '#bdd6de');
      text(c, 'GÓC LẮC ' + Math.round(crane.angle * 57.3) + '°', 555, 57, 15,
        Math.abs(crane.angle) < .22 ? '#a5ebc0' : '#ffd098');
      text(c, 'AN TOÀN ' + integrity + '%', 555, 81, 15, '#e4f0ed');
      banner(c, 'CẨU CONTAINER', 'Móc vào tâm kiện • nâng • di chuyển • thả êm ở bến');
      if (crane.carrying) {
        rounded(c, 260, 110, 228, 32, 9, 'rgba(7,29,40,.75)');
        text(c, 'ĐANG NÂNG HÀNG / GIỮ CÂN BẰNG', 373, 126, 13, '#c6f6dc', 'center', '700');
      }
    }
    return {
      title: 'CẨU CONTAINER / PORT SIM', limit: 190,
      controls: [
        { id: 'left', label: '← TỜI', hold: true }, { id: 'up', label: '↑ NÂNG', hold: true },
        { id: 'down', label: '↓ HẠ', hold: true }, { id: 'right', label: 'TỜI →', hold: true },
        { id: 'primary', label: 'MÓC / THẢ' }
      ],
      hint: '←/→ di chuyển tời • ↑/↓ điều chỉnh cáp • Space móc hoặc thả container',
      update, draw,
      action(id) { if (id === 'primary') handleLoad(); },
      metric() { return 'Đã xếp ' + moved + '/3 container • An toàn ' + integrity + '%'; },
      reset() { s.goal = 3; s.say('Hạ móc vào container bên trái, nhấc lên và thả nhẹ trong khung xanh.'); }
    };
  });
})();
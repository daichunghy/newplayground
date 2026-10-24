/* Night-shift cashier: scan goods, collect payment, calculate real change. */
(function () {
  'use strict';
  window.NP_LifeSim.register('thu-ngan-ca-toi', function (s, a) {
    const { W, H, clamp, rounded, rect, circle, text, gradient, banner } = a;
    const products = [
      { name: 'Sữa tươi', price: 29000, color: '#e5ece3', accent: '#70b9d4' },
      { name: 'Bánh mì', price: 17000, color: '#d69a55', accent: '#f3d29c' },
      { name: 'Cà phê', price: 35000, color: '#654232', accent: '#d9ac75' },
      { name: 'Trái cây', price: 24000, color: '#eda85c', accent: '#a1d37f' },
      { name: 'Mì gói', price: 12000, color: '#f5bc4f', accent: '#e45e4a' },
      { name: 'Nước lọc', price: 9000, color: '#aed8ef', accent: '#6fb5d8' },
      { name: 'Sữa chua', price: 22000, color: '#f1e1ee', accent: '#d6b7e1' },
      { name: 'Bánh quy', price: 26000, color: '#d5a173', accent: '#f7e5b6' }
    ];
    const baskets = [
      [0, 1, 5], [2, 4, 7], [3, 5, 6, 1], [0, 2, 7, 3], [1, 4, 5, 6]
    ];
    const payments = [100000, 150000, 200000, 200000, 150000];
    let customer = 0, scanned = new Set(), phase = 'scan', paid = 0;
    let wrong = 0, patience = 50, scanFlash = 0, subtotal = 0, collected = 0;
    const money = n => (n / 1000).toLocaleString('vi-VN') + 'k';
    function total() { return baskets[customer].reduce((sum, p) => sum + products[p].price, 0); }
    function changeDue() { return payments[customer] - total(); }
    function scan(index) {
      if (phase !== 'scan') return;
      const basket = baskets[customer];
      if (index < 0 || index >= basket.length) return;
      if (scanned.has(index)) { s.say('Mặt hàng này đã quét rồi.'); return; }
      scanned.add(index); subtotal += products[basket[index]].price;
      scanFlash = .22; s.add(18);
      s.say('Đã quét ' + products[basket[index]].name + '. ' + scanned.size + '/' + basket.length + ' món.');
    }
    function handover() {
      if (phase === 'scan') {
        if (scanned.size !== baskets[customer].length) {
          s.say('Còn ' + (baskets[customer].length - scanned.size) + ' món chưa quét mã.');
          return;
        }
        phase = 'change'; paid = 0; collected = payments[customer];
        s.say('Khách đưa ' + money(collected) + '. Hãy trả lại đúng ' + money(changeDue()) + '.');
        return;
      }
      if (phase !== 'change') return;
      if (paid !== changeDue()) {
        wrong++;
        s.score = Math.max(0, s.score - 60);
        s.say('Sai tiền thừa! Cần ' + money(changeDue()) + ', bạn đưa ' + money(paid) + '.');
        if (wrong >= 3) s.finish(false, 'Sai tiền thừa ba lần, phải kết ca.');
        return;
      }
      customer++;
      s.progress = customer;
      s.add(250 + Math.floor(patience * 3));
      if (customer >= baskets.length) {
        s.finish(true, 'Kết ca đúng sổ quỹ, phục vụ đủ năm khách.');
        return;
      }
      phase = 'scan'; scanned = new Set(); subtotal = 0; paid = 0; patience = 50;
      s.say('Giao dịch chính xác! Khách tiếp theo đang chờ tại quầy.');
    }
    function update(dt) {
      scanFlash = Math.max(0, scanFlash - dt);
      patience -= dt;
      if (patience <= 0) {
        wrong++;
        s.score = Math.max(0, s.score - 80);
        patience = 32;
        s.say('Khách chờ quá lâu! Giữ nhịp quét nhanh hơn.');
        if (wrong >= 3) s.finish(false, 'Quầy quá tải, mất ba lượt phục vụ.');
      }
    }
    function action(id) {
      if (id === 'primary') { handover(); return; }
      if (id === 'secondary') {
        if (phase === 'change') { paid = 0; s.say('Đã làm lại tiền thừa.'); }
        return;
      }
      if (id[0] === 'k' && phase === 'change') {
        const amount = Number(id.slice(1)) * 1000;
        if (amount > 0) {
          paid += amount;
          if (paid > changeDue()) s.say('Đang trả dư! Xóa tiền để tính lại.');
        }
      }
    }
    function keyboard(key, event) {
      if (/^[1-6]$/.test(key)) {
        event.preventDefault?.();
        if (phase === 'scan') scan(Number(key) - 1);
        else action('k' + [1, 2, 5, 10, 20, 50][Number(key) - 1]);
      }
      if (key === 'Enter') { event.preventDefault?.(); handover(); }
      if (key === 'Backspace') { event.preventDefault?.(); action('secondary'); }
    }
    function pointer(type, x, y) {
      if (type !== 'down' || phase !== 'scan') return;
      const index = Math.floor((x - 28) / 132);
      if (y >= 213 && y <= 338 && x >= 28 && x <= 28 + 132 * baskets[customer].length) scan(index);
    }
    function drawProduct(c, item, x, y, i, done) {
      rounded(c, x + 3, y + 5, 116, 127, 10, 'rgba(0,0,0,.26)');
      rounded(c, x, y, 116, 127, 10, done ? '#3b5760' : '#f0ede1', done ? '#538778' : '#fff7d9');
      rounded(c, x + 32, y + 14, 53, 62, 7, item.color, '#acaba5');
      rect(c, x + 38, y + 23, 41, 11, item.accent);
      circle(c, x + 58, y + 49, 10, item.accent);
      for (let j = 0; j < 16; j++) {
        rect(c, x + 19 + j * 5, y + 85, (j % 3) + 1, 14, '#334451');
      }
      text(c, item.name, x + 58, y + 108, 12, done ? '#abf5cc' : '#182d39', 'center', '700');
      text(c, String(i + 1), x + 12, y + 17, 13, done ? '#8ed1c2' : '#31434a', 'center');
      if (done) {
        rounded(c, x + 77, y + 7, 30, 23, 5, '#1a8666');
        text(c, '✓', x + 92, y + 19, 18, '#fff', 'center');
      }
    }
    function draw(c) {
      rect(c, 0, 0, W, H, gradient(c, 0, H, [[0, '#183b44'], [.68, '#1d4249'], [1, '#173038']]));
      rect(c, 0, 79, 520, 45, '#203a40');
      for (let i = 0; i < 14; i++) {
        const x = 8 + i * 39;
        rounded(c, x, 90, 28, 26, 3, ['#d69a55', '#b4d3c7', '#ca8c80', '#a8c6d6'][i % 4]);
        rect(c, x + 5, 95, 18, 3, 'rgba(255,255,255,.32)');
      }
      rounded(c, 14, 142, 493, 239, 17, '#51616a', '#83999a');
      rounded(c, 24, 157, 472, 208, 14, '#243943');
      // Conveyor under item cards.
      rounded(c, 23, 337, 480, 27, 11, '#182b33');
      for (let x = 35; x < 500; x += 24) rect(c, x, 343, 2, 16, '#46616b');
      const basket = baskets[customer];
      basket.forEach((idx, i) => drawProduct(c, products[idx], 28 + i * 132, 207, i, scanned.has(i)));
      rounded(c, 20, 173, 480, 26, 5, scanFlash ? '#b1f5cb' : '#36525c');
      text(c, phase === 'scan' ? 'CHẠM MẶT HÀNG ĐỂ QUÉT MÃ VẠCH  /  PHÍM 1–4' :
        'ĐÃ QUÉT XONG • CHỌN MỆNH GIÁ TIỀN THỪA', 32, 186, 13,
        scanFlash ? '#1b4d43' : '#c4dde0', 'left', '700');
      // Real receipt / POS monitor on the right.
      rounded(c, 519, 93, 227, 315, 11, '#0e212b', '#6b9094');
      rounded(c, 530, 105, 206, 236, 6, '#e2eadf');
      text(c, 'POS  /  ĐƠN ' + String(customer + 1).padStart(3, '0'), 543, 127, 16, '#183b44', 'left', '700');
      rect(c, 542, 139, 181, 2, '#a9c3ba');
      const yStart = 161;
      basket.forEach((idx, i) => {
        text(c, (scanned.has(i) ? '✓ ' : '· ') + products[idx].name, 542, yStart + 22 * i,
          12, scanned.has(i) ? '#246e57' : '#536b71');
        text(c, money(products[idx].price), 724, yStart + 22 * i, 12, '#284652', 'right');
      });
      rect(c, 542, 255, 182, 2, '#a9c3ba');
      text(c, 'TẠM TÍNH', 544, 272, 12, '#5a777b');
      text(c, money(subtotal), 723, 273, 17, '#1b4751', 'right', '700');
      text(c, 'KHÁCH ĐƯA', 544, 291, 12, '#5a777b');
      text(c, phase === 'change' ? money(collected) : '—', 723, 291, 15, '#1b4751', 'right', '700');
      text(c, phase === 'change' ? 'TIỀN THỪA CẦN TRẢ' : 'CÒN PHẢI QUÉT',
        544, 308, 12, '#5a777b');
      text(c, phase === 'change' ? money(changeDue()) : (basket.length - scanned.size) + ' món',
        723, 323, 18, '#168166', 'right', '700');
      rounded(c, 537, 352, 190, 42, 6, phase === 'change' ? '#27594d' : '#29404a');
      text(c, phase === 'change' ? 'ĐÃ TRẢ   ' + money(paid) : 'CHỜ QUÉT HÀNG',
        632, 371, 17, '#d0fae6', 'center', '700');
      banner(c, 'THU NGÂN / CA TỐI', 'Quét đúng từng món • trả tiền thừa chính xác');
      rounded(c, 313, 15, 187, 52, 10, '#14333b');
      text(c, 'KHÁCH ' + (customer + 1) + '/5', 326, 32, 14, '#d7e9e4', 'left', '700');
      rounded(c, 325, 47, 159, 8, 4, '#6b7672');
      rounded(c, 325, 47, 159 * clamp(patience / 50, 0, 1), 8, 4,
        patience > 15 ? '#96e6a8' : '#eead76');
      text(c, 'Lỗi giao dịch: ' + wrong + '/3', 35, 416, 15, '#ffc7b4');
      text(c, 'Quầy số 03   •   22:18', 730, 434, 12, '#9ec3c4', 'right');
    }
    return {
      title: 'THU NGÂN SIÊU THỊ', limit: 190,
      controls: [
        { id: 'k1', label: '+1K' }, { id: 'k2', label: '+2K' }, { id: 'k5', label: '+5K' },
        { id: 'k10', label: '+10K' }, { id: 'k20', label: '+20K' }, { id: 'k50', label: '+50K' },
        { id: 'secondary', label: 'XÓA TIỀN' }, { id: 'primary', label: 'THANH TOÁN ✓' }
      ],
      hint: 'Nhấp hàng hóa hoặc phím 1–4 để quét • tính tiền bằng các mệnh giá • Enter / Space xác nhận',
      draw, update, action, pointer, key: keyboard,
      metric() {
        return 'Khách ' + (customer + 1) + '/5 • ' +
          (phase === 'change' ? 'Cần trả ' + money(changeDue()) : 'Đã quét ' + scanned.size + ' món');
      },
      reset() { s.goal = 5; s.say('Đúng đơn hàng, đúng tiền thừa. Bạn có tối đa ba lỗi.'); }
    };
  });
})();
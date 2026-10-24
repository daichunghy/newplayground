/** Player help follows the rendered game, since several catalog entries share a mode. */
(function () {
  'use strict';

  const buttonKeys = 'Tab để chọn nút, Enter hoặc Space để bấm.';
  const pointerKeys = 'Chọn vị trí bằng chuột; Tab và Enter để dùng các nút.';
  const entries = [
    {
      selector: '#hrStreetCanvas', persistent: true,
      objective: 'Nấu món đúng độ chín và giao đúng khách để kiếm xu, mua nguyên liệu và nâng cấp quầy.',
      keyboard: 'Space để xử lý nguy biến trên phố; Tab và Enter để dùng các nút.',
      touch: 'Chạm món để nấu, lấy món khi vào vùng xanh rồi chạm khách đang gọi món đó.'
    },
    {
      selector: '#dvCanvas',
      objective: 'Gắp vàng và vật quý để đạt số tiền yêu cầu trước khi hết giờ.',
      keyboard: '↓, S, Space hoặc Enter thả móc; ↑ hoặc W dùng thuốc nổ.',
      touch: 'Chạm sân hoặc Thả móc để gắp; dùng nút thuốc nổ khi đang kéo vật nặng.'
    },
    {
      selector: '#l98Grid', restartSelector: '#l98NewBtn',
      objective: 'Xếp ít nhất 5 bóng cùng màu thành hàng ngang, dọc hoặc chéo trước khi bàn đầy.',
      keyboard: 'Tab đến ô, Enter hoặc Space để chọn bóng rồi chọn ô đích.',
      touch: 'Chạm bóng rồi chạm ô trống có đường đi; dùng Hoàn tác khi cần.'
    },
    {
      selector: '#btCanvas', restartSelector: '#btRestartInGameBtn',
      objective: 'Bắn ghép từ 3 trứng cùng màu để dọn bàn trước khi trứng chạm vạch nguy hiểm.',
      keyboard: '←/→ chỉnh góc, Space đổi trứng; Enter bắn khi sân đang được chọn.',
      touch: 'Chạm và kéo trên sân để ngắm, thả để bắn; nút Đổi trứng đổi viên kế tiếp.'
    },
    {
      selector: '#kcGrid',
      objective: 'Đổi chỗ hai viên kề nhau để tạo hàng từ 3 viên cùng màu và đạt mục tiêu màn.',
      keyboard: pointerKeys,
      touch: 'Chạm một viên rồi viên kề ngang hoặc dọc; dùng Gợi ý khi chưa thấy nước đi.'
    },
    {
      selector: '#dbCanvas', restartSelector: '#dbRetryBtn',
      objective: 'Đặt bom phá thùng, hạ đối thủ và tìm cửa thoát để qua màn.',
      keyboard: 'Mũi tên hoặc WASD di chuyển; Space đặt bom; J dùng kim khi bị nhốt.',
      touch: 'Giữ các nút hướng để đi, chạm Đặt bom hoặc Kim tiêm và tránh vùng nổ.'
    },
    {
      selector: '#xtCanvas', restartSelector: '#xtRestartBtn',
      objective: 'Hạ hết xe tăng địch trong mỗi đợt và bảo vệ căn cứ của bạn.',
      keyboard: 'Mũi tên hoặc WASD di chuyển; giữ Space hoặc Enter để bắn.',
      touch: 'Giữ nút hướng và nút Bắn cùng lúc; thả từng nút để dừng hành động đó.'
    },
    {
      selector: '#caroGrid', restartSelector: '#caroResetBtn',
      objective: 'Tạo một hàng 5 quân liên tiếp hợp lệ trước đối thủ và chặn các đường thắng của họ.',
      keyboard: 'Tab đến ô trống, Enter hoặc Space để đặt quân.',
      touch: 'Chạm ô trống để đánh; chọn độ khó và chế độ luật trước ván.'
    },
    {
      selector: '#snkCanvas', restartSelector: '#snkRestartBtn',
      objective: 'Ăn thức ăn để rắn dài hơn và ghi điểm, tránh tường và thân mình.',
      keyboard: 'Mũi tên hoặc WASD đổi hướng; P hoặc Space tạm dừng.',
      touch: 'Vuốt trên sân để đổi hướng liên tục hoặc dùng bốn nút hướng.'
    },
    {
      selector: '#tetCanvas', restartSelector: '#tetRestartBtn',
      objective: 'Xếp kín các hàng ngang để ghi điểm và giữ khối gạch không chạm đỉnh.',
      keyboard: '←/→ di chuyển, ↓ hạ, ↑/X xoay, Space thả nhanh, C/Shift giữ khối, P tạm dừng.',
      touch: 'Chạm khối để xoay, kéo ngang hoặc xuống để di chuyển; dùng nút Thả và Giữ.'
    },
    {
      selector: '#fbCanvas',
      objective: 'Bay qua khoảng trống giữa các cặp ống để ghi điểm, tránh ống và mặt đất.',
      keyboard: 'Space hoặc ↑ vỗ cánh; P tạm dừng.',
      touch: 'Chạm sân hoặc Vỗ cánh; chọn Tập luyện nếu muốn khoảng trống dễ bay hơn.'
    },
    {
      selector: '#fnCanvas', restartSelector: '#fnRestartBtn',
      objective: 'Chém trái cây đang bay để ghi điểm và tạo combo, tránh bom đen.',
      keyboard: pointerKeys,
      touch: 'Giữ chuột hoặc vuốt ngón tay qua trái cây; chém nhiều quả trong cùng một nhát để có combo.'
    },
    {
      selector: '#dmGrid', restartSelector: '#dmFaceBtn',
      objective: 'Mở tất cả ô an toàn, dùng các con số để suy ra vị trí mìn.',
      keyboard: 'Tab đến ô rồi Enter để mở; bật Cắm cờ để đánh dấu bằng bàn phím.',
      touch: 'Chạm mở ô, chạm giữ để cắm cờ; chạm số đã mở để mở nhanh khi đủ cờ xung quanh.'
    },
    {
      selector: '#pkGrid', restartSelector: '#pkRestartBtn',
      objective: 'Nối hết các cặp hình giống nhau bằng đường có tối đa hai góc trước khi hết giờ.',
      keyboard: 'Tab đến hình rồi Enter hoặc Space để chọn cặp.',
      touch: 'Chạm hai hình giống nhau; dùng Gợi ý, Đổi chỗ hoặc Phóng to khi cần.'
    },
    {
      selector: '#pmCanvas',
      objective: 'Ăn hết chấm trong mê cung và tránh ma; chấm lớn giúp bạn tạm thời ăn được ma.',
      keyboard: 'Mũi tên hoặc WASD di chuyển.',
      touch: 'Vuốt để đổi hướng hoặc dùng các nút hướng dưới sân.'
    },
    {
      selector: '#mrCanvas', restartSelector: '#mrRestart',
      objective: 'Vượt hố và kẻ địch, thu xu rồi tới cột cờ để sang màn tiếp theo.',
      keyboard: '←/→ hoặc A/D di chuyển; ↑, W hoặc Space nhảy.',
      touch: 'Giữ các nút trái/phải và bấm Nhảy để vượt chướng ngại.'
    },
    {
      selector: '#gnCanvas',
      objective: 'Canh góc, lực và gió để bắn trúng đối thủ trong các lượt đấu.',
      keyboard: '←/→ di chuyển, ↑/↓ chỉnh góc; giữ rồi thả Space để bắn; 1/2/3 chọn hỗ trợ, B dùng POW.',
      touch: 'Chỉnh góc bằng thanh trượt, giữ rồi thả nút Bắn; POW dùng khi thanh nộ đầy.'
    },
    {
      selector: '#nfPlotsGrid', persistent: true,
      objective: 'Xới đất, gieo hạt, chăm cây và thu hoạch để kiếm xu và mở rộng nông trại.',
      keyboard: buttonKeys,
      touch: 'Chọn công cụ hoặc hạt giống rồi chạm luống; tưới, dọn cỏ và bắt sâu khi cần.'
    },
    {
      selector: '#ffCanvas',
      objective: 'Ăn cá nhỏ để lớn dần, né cá lớn và tranh thủ lấy ngọc khi vỏ sò mở.',
      keyboard: 'Space để lướt nhanh; điều hướng bơi bằng chuột.',
      touch: 'Rê chuột hoặc kéo tay để bơi; chạm Lướt nhanh để tăng tốc.'
    },
    {
      selector: '#pvzCanvas',
      objective: 'Trồng cây phòng thủ và ngăn các đợt zombie vượt qua khu vườn.',
      keyboard: pointerKeys,
      touch: 'Chọn cây đủ nắng rồi chạm ô trống để trồng; chạm mặt trời để thu nắng và dùng xẻng khi cần.'
    },
    {
      selector: '#ciCanvas',
      objective: 'Bắn hạ đàn gà và trùm, né đạn và thu vật phẩm để qua các đợt tấn công.',
      keyboard: 'Mũi tên hoặc WASD bay; giữ Space bắn; Shift dùng tên lửa khi còn.',
      touch: 'Kéo trên sân để bay và giữ để bắn, hoặc giữ nút Bắn; chạm Nuke để dùng tên lửa.'
    },
    {
      selector: '#g2048Grid', restartSelector: '#g2048NewBtn',
      objective: 'Gộp các ô cùng số để tạo ô 2048 và tiếp tục nâng điểm khi còn nước đi.',
      keyboard: 'Mũi tên hoặc WASD trượt bàn; Z hoặc Backspace hoàn tác.',
      touch: 'Vuốt theo bốn hướng để gộp số; dùng Hoàn tác hoặc Ván mới khi cần.'
    },
    {
      selector: '#dxCanvas', restartSelector: '#dxRestartBtn',
      objective: 'Dùng thanh đỡ giữ bóng trên sân và phá hết gạch ở mỗi màn.',
      keyboard: '←/→ hoặc A/D di chuyển; Space phát bóng; P tạm dừng.',
      touch: 'Rê chuột hoặc kéo tay để đỡ bóng; chạm sân để phát bóng.'
    },
    {
      selector: '#skBoard', restartSelector: '#skResetBtn',
      objective: 'Đẩy mọi thùng lên ô đích, tránh đẩy thùng vào góc không thể đưa ra.',
      keyboard: 'Mũi tên hoặc WASD di chuyển; Z hoặc Backspace hoàn tác.',
      touch: 'Vuốt bàn hoặc dùng nút hướng; chạm ô trống để tự đi tới, dùng Hoàn tác nếu đẩy nhầm.'
    },
    {
      selector: '#oaqBoard',
      objective: 'Rải và ăn sỏi để có nhiều điểm hơn máy khi hai ô quan đã được ăn hết.',
      keyboard: pointerKeys,
      touch: 'Chạm một ô dân ở hàng dưới rồi chọn chiều rải trái hoặc phải.'
    },
    {
      selector: '#ncCanvas', restartSelector: '#ncRestartBtn',
      objective: 'Nuôi cá, thu tiền, đẩy lùi quái vật và mua đủ ba mảnh trứng để thắng.',
      keyboard: pointerKeys,
      touch: 'Chạm bể để thả mồi, chạm xu để nhặt và chạm quái để bắn; mua nâng cấp bằng các nút.'
    },
    {
      selector: '#pongCanvas', restartSelector: '#pongRestart',
      objective: 'Đỡ bóng và đưa bóng qua thanh của máy để đạt điểm thắng trước.',
      keyboard: '↑/↓ hoặc W/S di chuyển thanh đỡ; Space tạm dừng.',
      touch: 'Rê chuột hoặc kéo tay lên xuống trên sân để điều khiển thanh đỡ.'
    },
    {
      selector: '#zmCanvas', restartSelector: '#zmRestartBtn',
      objective: 'Ghép ít nhất 3 viên cùng màu để dọn đoàn ngọc trước khi nó tới đầu lâu.',
      keyboard: '←/→ chỉnh góc, Enter bắn; Space hoặc C đổi ngọc.',
      touch: 'Rê chuột và nhấp để bắn; trên cảm ứng kéo để ngắm rồi thả, dùng Đổi ngọc khi cần.'
    },
    {
      selector: '#ddCanvas',
      objective: 'Phục vụ khách đúng quy trình để đạt doanh thu yêu cầu trước khi hết ca.',
      keyboard: pointerKeys,
      touch: 'Chọn khách rồi bàn trống; chạm bàn nhận món, lấy món ở bếp, phục vụ và thu tiền.'
    },
    {
      selector: '#ctCanvas', restartSelector: '#ctResetBtn',
      objective: 'Điều khiển quân đỏ để giải lần lượt các thế cờ tàn cuộc.',
      keyboard: pointerKeys,
      touch: 'Chạm quân đỏ rồi một ô đích được đánh dấu; dùng Gợi ý hoặc Làm lại khi cần.'
    },
    {
      selector: '#bvCanvas', restartSelector: '#bvResetBtn',
      objective: 'Búng tất cả bi ve ra ngoài vòng phấn trước khi hết lượt bắn.',
      keyboard: pointerKeys,
      touch: 'Kéo ngược từ bi cái màu xanh rồi thả để bắn; chờ mọi viên bi dừng trước lượt kế tiếp.'
    },
    {
      selector: '#unoCanvas', restartSelector: '#unoNewGameBtn',
      objective: 'Đánh hết bài bằng cách khớp màu, số hoặc ký hiệu với lá trên bàn.',
      keyboard: 'Tab và Enter dùng các nút chọn lá, Đánh lá, Rút bài, Hô UNO và chọn màu.',
      touch: 'Chạm lá hợp lệ; chọn màu khi đánh lá đổi màu, hô UNO trước khi đánh từ hai lá xuống một.'
    },
    {
      selector: '#bnbCanvas', restartSelector: '#bnbRestart',
      objective: 'Đặt bóng nước hạ đối thủ, tránh vụ nổ và vượt qua các màn đấu.',
      keyboard: 'Mũi tên hoặc WASD đi; Space đặt bóng; Ctrl dùng kim khi bị nhốt.',
      touch: 'Giữ nút hướng, chạm Đặt bóng và dùng nút Kim để tự cứu khi bị nhốt.'
    },
    {
      selector: '#auCanvas',
      objective: 'Nhập đúng chuỗi mũi tên rồi chốt nhịp khi thanh chạy tới vùng sáng để ghi điểm.',
      keyboard: 'Gõ chuỗi mũi tên; mũi tên đỏ phải gõ hướng ngược lại, rồi nhấn Space đúng nhịp.',
      touch: 'Chạm các nút mũi tên theo chuỗi rồi chạm SPACE khi vạch nhịp vào vùng sáng.'
    },
    {
      selector: '#rrCanvas',
      objective: 'Lái xe vượt các chặng, né đối thủ và giữ đủ máu để cán đích.',
      keyboard: '↑/W tăng ga, ←/→ hoặc A/D lách; Shift trái Nitro, Space tấn công, J đạp xe.',
      touch: 'Giữ Ga và nút hướng, kết hợp Nitro hoặc các nút tấn công khi áp sát đối thủ.'
    },
    {
      selector: '#mmCanvas',
      objective: 'Vượt chướng ngại, né đạn và bắn hạ các trùm qua ba màn.',
      keyboard: '←/→ hoặc A/D đi; ↑/W/Space nhảy; giữ rồi thả J bắn; ↓+Space trượt.',
      touch: 'Dùng nút hướng, Nhảy và Trượt; giữ rồi thả Bắn để tung đạn tích lực.'
    },
    {
      selector: '#dhCanvas',
      objective: 'Bắn trúng vịt trước khi chúng bay mất, giữ đủ đạn và mạng qua các đợt.',
      keyboard: 'Mũi tên hoặc WASD ngắm; Space bắn.',
      touch: 'Chạm ngay vào con vịt để bắn tại vị trí đó; mỗi đợt có số đạn giới hạn.'
    },
    {
      selector: '#sfCanvas', restartSelector: '#sfRestart',
      objective: 'Hạ ba đối thủ liên tiếp bằng các đòn đánh và giữ thanh máu của bạn.',
      keyboard: '←/→ hoặc A/D đi; J đấm, K đá, L Hadouken, I Shoryuken.',
      touch: 'Giữ nút trái/phải và chọn nút đòn đánh khi ở khoảng cách phù hợp.'
    },
    {
      selector: '#blxCanvas',
      objective: 'Lăn khối đứng vào ô đích; gạch cam chỉ chịu được khối đang nằm.',
      keyboard: 'Bốn phím mũi tên lăn khối; Tab và Enter dùng Hoàn tác.',
      touch: 'Chạm các nút hướng để lăn; dùng Hoàn tác để lấy lại bước trước khi rơi.'
    },
    {
      selector: '#aowCanvas',
      objective: 'Chiêu mộ quân và tiến hóa để phá căn cứ địch trước khi căn cứ của bạn bị hạ.',
      keyboard: buttonKeys,
      touch: 'Chạm loại quân để mua bằng vàng, tiến hóa bằng EXP và dùng Thiên thạch khi sẵn sàng.'
    },
    {
      selector: '#bbCanvas',
      objective: 'Nhốt quái vào bong bóng rồi chạm phá bóng để dọn mỗi màn.',
      keyboard: '←/→ hoặc A/D đi; ↑/W nhảy; giữ J hoặc Space bắn bong bóng.',
      touch: 'Dùng nút hướng, Nhảy và Bắn, sau đó tiến tới bong bóng đang nhốt quái để phá.'
    },
    {
      selector: '#rwCanvas', restartSelector: '#rwRestart',
      objective: 'Canh góc và lực để bắn hạ đối thủ trên bè qua bốn trận.',
      keyboard: 'Dùng chuột để ngắm; Tab và Enter dùng Sửa bè hoặc Nâng cấp.',
      touch: 'Kéo trên sân để chỉnh góc và lực rồi thả để bắn; dùng vàng sửa bè hoặc nâng cấp.'
    },
    {
      selector: '#tsCanvas', restartSelector: '#tsRestart',
      objective: 'Gõ hết từ trên cá mập trước khi chúng tới người lặn.',
      keyboard: 'Gõ các chữ của từ đang bơi; Backspace sửa chữ, Enter dùng Zapper khi đầy năng lượng.',
      touch: 'Chạm ô nhập hoặc sân để mở bàn phím, gõ từ; chạm Zapper khi thanh năng lượng đầy.'
    }
  ];

  const archetypes = {
    shooter: {
      objective: 'Bắn hạ mục tiêu và né vật cản để đủ tiến độ sang màn.',
      keyboard: '←/→ hoặc A/D di chuyển; giữ Space hoặc Enter để bắn.',
      touch: 'Giữ và kéo tàu trên sân để vừa di chuyển vừa bắn, hoặc dùng nút điều khiển.'
    },
    runner: {
      objective: 'Đổi làn né vật cản, thu xu và tích đủ tiến độ để qua màn.',
      keyboard: '←/→ hoặc A/D đổi làn; Space hoặc Enter kích hoạt khiên.',
      touch: 'Chạm làn muốn tới hoặc nút trái/phải; chạm Khiên khi sẵn sàng.'
    },
    reflex: {
      objective: 'Bắn trúng từng mục tiêu trước khi thời gian của nó cạn.',
      keyboard: 'Mũi tên hoặc WASD di chuyển tâm ngắm; Space hoặc Enter bắn.',
      touch: 'Chạm đúng mục tiêu để bắn ngay hoặc dùng bốn nút hướng và Bắn trúng.'
    },
    puzzle: {
      objective: 'Nhớ vị trí và lật hết các cặp thẻ giống nhau để qua màn.',
      keyboard: 'Mũi tên chọn thẻ, Space hoặc Enter lật; cũng có thể Tab đến từng thẻ.',
      touch: 'Chạm hai thẻ để tìm cặp; chờ cặp khác nhau úp lại trước khi chọn tiếp.'
    },
    management: {
      objective: 'Phục vụ đúng món khách yêu cầu trước khi họ hết kiên nhẫn.',
      keyboard: '←/→ hoặc A/D chọn món; Space hoặc Enter phục vụ.',
      touch: 'Chạm ô món ăn đúng yêu cầu hoặc dùng nút chọn món và Phục vụ.'
    },
    quiz: {
      objective: 'Chọn đáp án đúng để ghi điểm và tiến tới các màn tiếp theo.',
      keyboard: 'Mũi tên chọn đáp án; Space hoặc Enter xác nhận.',
      touch: 'Chạm trực tiếp đáp án muốn chọn hoặc dùng các nút điều khiển.'
    },
    duel: {
      objective: 'Kết hợp tấn công, phòng thủ và hồi phục để hạ đối thủ trước khi hết máu.',
      keyboard: '←/→ hoặc A/D chọn hành động; Space hoặc Enter thực hiện.',
      touch: 'Chạm ô Tấn công, Phòng thủ hoặc Hồi phục; theo dõi máu và thời gian hồi chiêu.'
    }
  };

  const generic = {
    objective: 'Chọn Bắt đầu nếu có, rồi hoàn thành mục tiêu hiển thị trong trò chơi.',
    keyboard: 'Dùng các phím được ghi cạnh nút điều khiển; Tab và Enter để chọn nút.',
    touch: 'Dùng các nút và hướng dẫn đang hiển thị trong khu vực chơi.'
  };

  function describe(container, game) {
    if (!container || typeof container.querySelector !== 'function') return { ...generic };
    if (container.querySelector('#flashCanvas')) {
      const byGame = {
        'worlds-hardest-game': {
          objective: 'Đưa ô vuông đỏ tới vùng xanh, né chấm xanh và nhặt đủ tiền vàng.',
          keyboard: 'WASD hoặc mũi tên di chuyển ô vuông đỏ; R đặt lại ván.',
          touch: 'Giữ bốn nút hướng ở dưới sân; tránh chấm xanh và đưa nhân vật tới cửa ra.'
        },
        'qwop-flash': {
          objective: 'Phối hợp hai cơ đùi và hai cẳng chân để chạy 100 mét mà không ngã.',
          keyboard: 'Q/W đùi, O/P cẳng chân, R khởi động lại; Esc tạm dừng.',
          touch: 'Giữ đồng thời các nút Q W O P để điều khiển chân.'
        },
        'helicopter-game': {
          objective: 'Bay qua đường hầm càng xa càng tốt, không chạm trần, sàn hoặc chướng ngại.',
          keyboard: 'Giữ Space hoặc ↑ để lên cao; thả để hạ thấp.',
          touch: 'Giữ tay trên canvas hoặc nút BAY để tăng lực nâng; thả để rơi.'
        },
        'red-ball-flash': {
          objective: 'Lăn bóng đỏ qua nền tảng, nhảy qua hố và gai, đến cờ đỏ để qua màn.',
          keyboard: '←/→ hoặc A/D di chuyển, ↑ hoặc Space để nhảy.',
          touch: 'Giữ ← hoặc → để lăn và nút ↑ để nhảy.'
        },
        'desktop-tower-defense': {
          objective: 'Xây tháp cản đường và tiêu diệt kẻ địch trước khi chúng thoát qua bàn.',
          keyboard: 'Nhấp chọn tháp, dùng chuột để đặt. Nút U nâng cấp, S bán và SEND để gọi đợt mới.',
          touch: 'Chọn loại tháp, chạm ô lưới để đặt rồi chạm GỬI ĐỢT.'
        }
      };
      return { ...(byGame[game && game.id] || generic), restartSelector: '#flashRestart' };
    }

    const entry = entries.find(item => container.querySelector(item.selector));
    if (entry) {
      const { selector, ...description } = entry;
      return { ...description };
    }

    const canvas = container.querySelector('#arcCanvas');
    if (canvas) {
      const help = container.querySelector('#arcHelp');
      // dataset.kind is assigned by the actual archetype launcher, independently of the title.
      const kind = canvas.dataset && canvas.dataset.kind;
      const description = archetypes[kind] || (help ? generic : archetypes.shooter);
      const helpText = String(help && help.textContent || '').trim();
      const modeNote = helpText.match(/Đây là chế độ arcade[^]*$/);
      return {
        ...description,
        ...(container.querySelector('#arcRestart') ? { restartSelector: '#arcRestart' } : {}),
        note: modeNote ? modeNote[0] : 'Đây là chế độ arcade theo thể loại, chưa mô phỏng đầy đủ luật game gốc.'
      };
    }
    return { ...generic };
  }

  window.NP_GameGuide = { describe };
})();

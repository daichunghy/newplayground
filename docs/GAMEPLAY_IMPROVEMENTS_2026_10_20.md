# NewPlayground — cải thiện gameplay và điều khiển ngày 20/10/2026

## Phạm vi

Đợt thay đổi này cải thiện toàn bộ 150 mục trong danh mục qua lớp phiên chơi/giao diện chung và sửa trực tiếp các nhóm engine. Kiểm kê hiện tại có **65 mục được định tuyến vào engine chuyên biệt hoặc biến thể** và **85 tên dùng chung 7 chế độ arcade theo thể loại**. Con số 65 tính theo mục trong danh mục, không phải số engine độc lập. Một số tên khác nhau vẫn dùng cùng luật chơi; đợt sửa này chưa tạo ra 150 bản tái hiện hoàn chỉnh của trò chơi gốc.

Giữ nguyên vanilla HTML/CSS/JavaScript, Canvas 2D, Web Audio, font Calibri, tài nguyên hiện có và cách chạy bằng máy chủ tĩnh. Không thêm runtime hay CDN dependency cho sản phẩm.

Mã sản phẩm chốt tại commit [`fdad08815e138687c3b5462af65fd518f67f9767`](https://github.com/daichunghy/newplayground/commit/fdad08815e138687c3b5462af65fd518f67f9767), với **129/129 test hồi quy đạt** và **20/20 ca bố cục đại diện trên trình duyệt đạt**. Đợt trình duyệt toàn bộ danh mục trước đó đã đạt **300/300 ca** ở commit `6ac72a9c74e236c8e721b0b98823a85c48bdf070`. Các mốc và phạm vi bằng chứng được tách rõ ở phần Kiểm tra.

## Dùng chung cho mọi game

- Thanh điều khiển ở cạnh sân chơi có Tạm dừng/Tiếp tục, Chơi lại hoặc Mở lại, Cách chơi.
- Nút tạm dừng trong từng game và thanh chung dùng cùng một phiên. Tiếp tục không để lại một trạng thái pause riêng bên dưới.
- Tạm dừng khi rời cửa sổ hoặc đổi tab; chỉ tiếp tục khi người chơi chọn. Esc/P điều khiển tạm dừng, không đóng mất ván đang chơi. P không bị bắt khi đang gõ vào trường nhập.
- Giữ thời gian còn lại của timeout/interval; dừng các RAF đang đợi; đồng hồ chủ động loại thời gian tạm dừng. Callback cũ không chạy lại sau pause/stop. Không ảnh hưởng timer của portal.
- Hủy thao tác kéo/giữ đang dang dở trước khi nhả phím, tránh kẹt hướng hoặc bắn ngoài ý muốn. Chặn cả input qua session và tương tác DOM của sân khi đang tạm dừng.
- Hướng dẫn lấy theo selector của game đang vẽ. Không lấy tên trên danh mục để đoán phím điều khiển. Mục arcade dùng chung có ghi rõ giới hạn luật.
- Focus vào sân hoặc ô nhập khi mở/tiếp tục, quay về nút trước đó khi đóng; Tab nằm trong hộp game. Nút chung tối thiểu 44 px, nhãn truy cập rõ.
- Canvas tính chiều rộng CSS theo chỗ trống và giữ chiều cao tự động theo tỉ lệ bitmap, kể cả khi CSS giới hạn thêm chiều rộng. Kích thước bitmap giữ nguyên khi đổi cỡ cửa sổ. Canvas trang trí như lớp nối hình Pikachu được giữ theo bàn và không nhận focus bàn phím.
- Tùy chọn giao diện không làm ứng dụng hỏng khi localStorage bị chặn. Các module đã sửa bảo vệ việc đọc điểm/số liệu lưu hỏng.
- Nhạc nền nhớ lựa chọn trong lúc tắt tiếng; hủy timer theo đúng phiên, không xóa nhầm timer portal. Tạm dừng âm thanh không thay đổi tùy chọn mute. Giảm chuyển động tắt rung màn hình và chuyển động trang trí.

## Sửa theo nhóm

| Nhóm | Sửa đổi chính |
| --- | --- |
| 7 arcade dùng chung, 85 mục | Sửa lỗi xóa mảng giữa vòng lặp khi qua màn; timer lật sai thẻ sau replay; ngắm hai trục bằng phím; pointer capture với Safari touch; mục tiêu và hitbox đúng. Có cảnh và bảng màu theo thể loại. Ghép cặp là lưới nút thật. |
| Đặt Bom | Qua màn không mất vòng RAF; spawn hữu hạn và không trùng; tốc độ chéo không nhanh hơn; reset đầy đủ nâng cấp; nút di chuyển/chức năng giữ và nhả riêng. |
| Xe Tăng | Qua đợt địch và bom tiêu diệt tên cuối đều tiến màn; hết mạng giữ điểm và cho chơi lại; giữ bắn; simulation không phụ thuộc Hz màn hình. |
| Chém Hoa Quả | Va chạm theo cả đoạn vuốt, không chỉ điểm cuối; không nối hai lần chạm thành một nhát; combo ổn định với mật độ sự kiện pointer. |
| Đào Vàng, Kim Cương, Hàng Rong | Kết quả Đào Vàng không biến mất sau một frame. Gợi ý Kim Cương không sửa bàn đang cascade; bàn mới luôn có nước đi và sinh bàn hữu hạn. Thanh mặc cả theo thời gian thực của phiên; dữ liệu Hàng Rong bị hỏng không làm lỗi khởi tạo. |
| Pac-Man | Spawn trên đường hợp lệ; ma rẽ đúng tâm ô, không xuyên tường, đi được hầm và quay lại ở ngõ cụt; một lần chạm không trừ nhiều mạng. |
| Gunny | Hai viên bắn đôi kết thúc đúng trước lượt bot; hoàn lại buff đã chọn; POW tiêu thụ đúng nộ; hủy giữ lực không tự bắn; kết quả ổn định. |
| Feeding Frenzy, PvZ, Chicken Invaders, Nemo | Chống mất điểm mỗi frame khi chạm sò; mặt trời tự hết hạn; thắng/thua không lặp; có phím di chuyển và giữ bắn; nuke hạ boss đúng; phát hiện bể cá không thể phục hồi và reset đầy đủ. |
| Typer Shark | Từ mục tiêu không trùng nhau; giữ shortcut trình duyệt; không tích chữ lúc pause; resume/replay đưa focus về ô gõ; Enter dùng Zapper. |
| Nông Trại | Lưu và khôi phục tiền, cấp/EXP, cây và thời điểm trồng, chăm sóc, dụng cụ, hàng xóm và trạng thái chó. Cây tiếp tục lớn khi đóng game; Mở lại giữ tiến trình. Nút đặt lại trong game tạo và lưu trang trại mới. Dữ liệu sai hoặc bộ nhớ bị chặn được xử lý an toàn. |
| Road Rash, Mega Man | Simulation 60 Hz; trạng thái kết thúc ổn định; đạn địch gây sát thương; một viên đạn tích lực chỉ trừ HP boss một lần. |
| Duck Hunt | Lần chạm đầu bắn đúng điểm chạm; ngắm bằng phím; kết thúc chiến dịch 10 đợt; thất bại sau ba lần bỏ lỡ; callback qua đợt bị hủy đúng. |
| Bubble Bobble, Age of War | Quái di chuyển, xuất hiện và gây sát thương; nhảy cảm ứng hoạt động; quái thoát khi bong bóng hết hạn; mỗi lính đánh một mục tiêu theo hồi chiêu; kết quả và tiền ngừng sau khi kết thúc. |
| Bloxorz | Năm bàn thực tế đã giải bằng tìm kiếm trạng thái và thao tác đầu vào; kiểm tra diện tích chân đế, rơi, ô mỏng; hoàn tác; vẽ đúng tư thế khối. |
| Audition, Street Fighter, Raft Wars | Gõ sớm không bị xóa mỗi frame; một nhịp chỉ chấm một lần. Qua trận không đọc tiếp mảng đạn đã xóa. Góc ngắm Raft tính radian đúng và nhận vị trí bắt đầu/kết thúc pointer thật. |
| Zuma, Diner Dash, Cờ Tướng, Bắn Bi | Thống nhất pointer. Combo Zuma gắn với đúng bàn/quả bóng. Bắn Bi chờ mọi bi dừng; hủy kéo không mất lượt; ba vòng kết thúc chiến dịch. |
| Cờ Tướng tàn cuộc | Chơi lại dọn lớp kết quả cũ. Sửa các chuỗi nước đi bị quân chắn ở thế 1 và 5; cả năm lời giải được kiểm tra từng nước bằng bộ luật di chuyển và thao tác bàn thật trong VM. |
| UNO | Chọn màu lá đổi màu; tái dùng đúng bài bỏ; lượt AI cũ không hồi sinh sau replay; có nút chọn/đánh bài cho bàn phím và bài nhiều; luật gọi UNO áp dụng. |
| Snake, Tetris, Flappy, Pong, DXBall, Minesweeper | Thống nhất pause thủ công với session chung, không bị dừng ngầm sau khi tiếp tục. Nhả thao tác đang giữ. Hủy long press Minesweeper trước pause để không tự cắm cờ khi tiếp tục. |

## Kiểm tra

Các suite dùng mã nguồn thật trong VM với DOM/Canvas/Audio mô phỏng. Chúng kiểm tra cả các ca cụ thể gây lỗi và mở/vẽ/đóng mọi mục trong danh mục. Những test về 60/120 Hz so sánh trạng thái mô phỏng qua lịch frame có kiểm soát, không đo FPS phần cứng.

```bash
node --test tests/*.test.cjs
```

Các nhóm test gồm game-flow, core-improvements, classic-improvements, arcade-improvements, session-improvements, audio-improvements và shell-improvements. `tests/helpers/game-harness.cjs` dùng chung giữa các suite. Các probe gameplay chỉ được chèn bởi VM khi kiểm tra; không xuất API cheat/debug trong sản phẩm.

[`tests/browser-smoke.html`](../tests/browser-smoke.html) kiểm tra trên trình duyệt thật ở **1280 × 800** và **390 × 844**: 150 game × 2 viewport. Trang này ghi lỗi JavaScript, kiểm tra tỉ lệ canvas, mở/vẽ, tạm dừng, mở hướng dẫn, tiếp tục và dọn phiên khi đóng. Mỗi ca là một lượt kiểm tra luồng chạy của một game tại một kích thước màn hình; 300 ca không có nghĩa là đã chơi hết 300 chiến dịch.

### Mốc đã xác minh trên toàn bộ danh mục

Các kết quả trong bảng dưới gắn với commit [`6ac72a9c74e236c8e721b0b98823a85c48bdf070`](https://github.com/daichunghy/newplayground/commit/6ac72a9c74e236c8e721b0b98823a85c48bdf070).

| Kiểm tra | Phạm vi | Kết quả đã xác minh | Bằng chứng |
| --- | --- | --- | --- |
| Hồi quy trên GitHub Actions, Node.js 22 | Bảy suite với DOM/Canvas/Audio mô phỏng | **128/128 test đạt**, 0 thất bại | [Lượt CI 39410504217](https://github.com/daichunghy/newplayground/actions/runs/39410504217) |
| Cú pháp và danh mục | JavaScript sản phẩm; 150 ID game duy nhất | Đạt trong cùng lượt CI | [Workflow](../.github/workflows/deploy.yml) |
| Trình duyệt, khung desktop 1280 × 800 | 150 ID game | **150/150 ca đạt** | [Báo cáo JSON đầy đủ](qa-2026-10-20/browser-all-150.json) |
| Trình duyệt, khung mobile 390 × 844 | Cùng 150 ID game | **150/150 ca đạt** | [Báo cáo JSON đầy đủ](qa-2026-10-20/browser-all-150.json) |
| Lỗi JavaScript trong đợt trình duyệt | Cả 300 ca | **0 lỗi được ghi nhận**; đợt chạy hoàn tất | [Báo cáo JSON đầy đủ](qa-2026-10-20/browser-all-150.json) |

Đợt chạy trình duyệt hoàn tất lúc **10:57:50 UTC ngày 20/10/2026**. JSON lưu SHA nguồn, URL trang kiểm tra, thời điểm bắt đầu/kết thúc và kết quả của từng ID ở từng chiều rộng. [Ảnh bảng Cách chơi trên desktop](qa-2026-10-20/shared-help-desktop.jpg) minh họa giao diện hướng dẫn và nút tiếp tục.

Mốc này có 128 test trước khi bổ sung ca hồi quy resize cuối cùng. Ngoài lượt tự động, Tetris đã được thao tác bằng phím trái/phải, xoay và thả nhanh: điểm tăng và khối được đặt trên bàn; pause trong game, tiếp tục chung và hướng dẫn dùng cùng một trạng thái.

### Sửa vòng lặp co giãn sau mốc trên

Phần chốt bố cục sửa trường hợp modal có chiều cao tự động khiến canvas nhỏ dần qua nhiều lần thông báo kích thước. Trần chiều cao sân nay lấy trực tiếp từ viewport, trừ header, thanh điều khiển và phần HUD/nút của game; kích thước của modal sau lần co trước không trở thành trần mới. Chiều cao canvas theo tỉ lệ bitmap qua `height: auto`, giúp giữ tỉ lệ khi một giới hạn `max-width` khác tiếp tục thu chiều rộng.

Các thông báo `ResizeObserver` được gộp vào **một RAF bố cục đang chờ**, thay vì sửa kích thước ngay trong callback quan sát. Khi đóng hoặc đổi game, observer được ngắt và RAF còn chờ được hủy. Kiểm tra hồi quy mới mô phỏng modal tự đổi chiều cao, nhiều thông báo liên tiếp và đóng game trước khi RAF chạy. Suite shell đã được xác minh riêng **13/13** sau bổ sung này.

Kết quả 300 ca ở trên xác minh commit `6ac72a9c74e236c8e721b0b98823a85c48bdf070`, trước phần sửa vòng lặp co giãn này. Lần xác minh cuối cho thay đổi bố cục được ghi riêng dưới đây để giữ đúng quan hệ giữa bằng chứng và mã nguồn.

### Phiên bản cuối đã xác minh

Commit mã sản phẩm cuối là [`fdad08815e138687c3b5462af65fd518f67f9767`](https://github.com/daichunghy/newplayground/commit/fdad08815e138687c3b5462af65fd518f67f9767), bao gồm sửa vòng lặp co giãn và ca hồi quy mới.

| Kiểm tra sau sửa bố cục | Phạm vi | Kết quả đã xác minh | Bằng chứng |
| --- | --- | --- | --- |
| GitHub Actions, Node.js 22 | Toàn bộ suite hồi quy | **129/129 test đạt**, 0 thất bại | [Lượt CI 39412987788](https://github.com/daichunghy/newplayground/actions/runs/39412987788), [job kiểm tra 118595080123](https://github.com/daichunghy/newplayground/actions/runs/39412987788/job/118595080123) |
| Trình duyệt, khung 1280 × 800 và 390 × 844 | 10 game đại diện bố cục × 2 viewport | **20/20 ca đạt**, **0 lỗi JavaScript được ghi nhận** | [Báo cáo bố cục cuối](qa-2026-10-20/browser-layout-final.json) |

129 test cuối gồm **game-flow 38, core 16, arcade 26, classic 16, session 12, shell 13 và audio 8**. Đợt trình duyệt tập trung vào bố cục chạy từ **11:09:51 đến 11:10:31 UTC ngày 20/10/2026**.

Bằng chứng bàn giao gồm [300 ca toàn bộ danh mục ở mốc trước](qa-2026-10-20/browser-all-150.json), [20 ca bố cục ở commit cuối](qa-2026-10-20/browser-layout-final.json), [ảnh bảng Cách chơi trên desktop](qa-2026-10-20/shared-help-desktop.jpg) và [ảnh arcade cuối ở chiều rộng 390 px](qa-2026-10-20/mobile-arcade-final.jpg), hiển thị đầy đủ các nút điều khiển và hướng dẫn với độ tương phản đã sửa. Lượt 20 ca xác minh bổ sung phần bố cục đã đổi; toàn bộ 150 game chưa được chạy lại thành 300 ca ở commit cuối.

## Giới hạn còn lại

- 85 tên trong danh mục tiếp tục dùng cơ chế theo thể loại. Muốn mỗi tên có luật, nội dung, progression và mỹ thuật độc lập cần các đợt triển khai riêng.
- Không bổ sung multiplayer online hay backend. Các chỉ dẫn nhiều người phải được hiểu theo mode hiện có trong engine.
- Các bản arcade là những phiên bản nhỏ của dự án, không phải mã nguồn hay nội dung đầy đủ của sản phẩm thương mại.
- Lượt trình duyệt kiểm tra luồng chạy ở hai viewport, chưa thay thế thử cảm ứng trên iPhone/Android vật lý, đo FPS phần cứng hay chơi hết mọi chiến dịch.
- Không tuyên bố FPS đảm bảo, hỗ trợ tất cả thiết bị, hay mọi luật cờ/bài/chiến dịch đã được chứng minh đúng.

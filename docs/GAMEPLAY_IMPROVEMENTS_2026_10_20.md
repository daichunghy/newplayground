# NewPlayground — cải thiện gameplay và điều khiển ngày 20/10/2026

## Phạm vi

Đợt thay đổi này cải thiện toàn bộ 150 mục trong danh mục qua lớp phiên chơi/giao diện chung và sửa trực tiếp các nhóm engine. Kiểm kê hiện tại có 65 mục được định tuyến vào engine chuyên biệt hoặc biến thể và 85 mục vào 7 chế độ arcade theo thể loại. Một số tên khác nhau vẫn dùng cùng luật chơi. Đây không phải 150 bản tái hiện hoàn chỉnh của trò chơi gốc.

Giữ nguyên vanilla HTML/CSS/JavaScript, Canvas 2D, Web Audio, font Calibri, tài nguyên hiện có và cách chạy bằng máy chủ tĩnh. Không thêm runtime hay CDN dependency cho sản phẩm.

## Dùng chung cho mọi game

- Thanh điều khiển ở cạnh sân chơi có Tạm dừng/Tiếp tục, Chơi lại hoặc Mở lại, Cách chơi.
- Nút tạm dừng trong từng game và thanh chung dùng cùng một phiên. Tiếp tục không để lại một trạng thái pause riêng bên dưới.
- Tạm dừng khi rời cửa sổ hoặc đổi tab; chỉ tiếp tục khi người chơi chọn. Esc/P điều khiển tạm dừng, không đóng mất ván đang chơi. P không bị bắt khi đang gõ vào trường nhập.
- Giữ thời gian còn lại của timeout/interval; dừng các RAF đang đợi; đồng hồ chủ động loại thời gian tạm dừng. Callback cũ không chạy lại sau pause/stop. Không ảnh hưởng timer của portal.
- Hủy thao tác kéo/giữ đang dang dở trước khi nhả phím, tránh kẹt hướng hoặc bắn ngoài ý muốn. Chặn cả input qua session và tương tác DOM của sân khi đang tạm dừng.
- Hướng dẫn lấy theo selector của game đang vẽ. Không lấy tên trên danh mục để đoán phím điều khiển. Mục arcade dùng chung có ghi rõ giới hạn luật.
- Focus vào sân hoặc ô nhập khi mở/tiếp tục, quay về nút trước đó khi đóng; Tab nằm trong hộp game. Nút chung tối thiểu 44 px, nhãn truy cập rõ.
- Canvas co cả hai chiều theo tỉ lệ bitmap, tránh kéo méo hình và lệch vị trí bấm. Không tăng độ phân giải bitmap mỗi lần resize.
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
| UNO | Chọn màu lá đổi màu; tái dùng đúng bài bỏ; lượt AI cũ không hồi sinh sau replay; có nút chọn/đánh bài cho bàn phím và bài nhiều; luật gọi UNO áp dụng. |
| Snake, Tetris, Flappy, Pong, DXBall, Minesweeper | Thống nhất pause thủ công với session chung, không bị dừng ngầm sau khi tiếp tục. Nhả thao tác đang giữ. Hủy long press Minesweeper trước pause để không tự cắm cờ khi tiếp tục. |

## Kiểm tra

Các suite dùng mã nguồn thật trong VM với DOM/Canvas/Audio mô phỏng. Chúng kiểm tra cả các ca cụ thể gây lỗi và mở/vẽ/đóng mọi mục trong danh mục. Những test về 60/120 Hz so sánh trạng thái mô phỏng qua lịch frame có kiểm soát, không đo FPS phần cứng.

```bash
node --test tests/*.test.cjs
```

Các nhóm test gồm game-flow, core-improvements, classic-improvements, arcade-improvements, session-improvements, audio-improvements và shell-improvements. `tests/helpers/game-harness.cjs` dùng chung giữa các suite. Các probe gameplay chỉ được chèn bởi VM khi kiểm tra; không xuất API cheat/debug trong sản phẩm.

`tests/browser-smoke.html` kiểm tra trên trình duyệt thật ở 1280 × 800 và 390 × 844: 150 game × 2 viewport. Trang này báo lỗi JavaScript, kiểm tra tỉ lệ canvas, mở/vẽ, pause/hướng dẫn/resume và dọn phiên. Nó không chứng nhận đã chơi hết 150 hành trình, không đo FPS thật và không thay thế thử trên iPhone/Android vật lý.

### Trạng thái xác minh

Đang hoàn thành vòng kiểm tra tích hợp và xem hình trong trình duyệt; kết quả cuối sẽ được ghi tại đây trước khi bàn giao.

## Giới hạn còn lại

- 85 tên trong danh mục tiếp tục dùng cơ chế theo thể loại. Muốn mỗi tên có luật, nội dung, progression và mỹ thuật độc lập cần các đợt triển khai riêng.
- Không bổ sung multiplayer online hay backend. Các chỉ dẫn nhiều người phải được hiểu theo mode hiện có trong engine.
- Các bản arcade là những phiên bản nhỏ của dự án, không phải mã nguồn hay nội dung đầy đủ của sản phẩm thương mại.
- Không tuyên bố FPS đảm bảo, hỗ trợ tất cả thiết bị, hay mọi luật cờ/bài/chiến dịch đã được chứng minh đúng.

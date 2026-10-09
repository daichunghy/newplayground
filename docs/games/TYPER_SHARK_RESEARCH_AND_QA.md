# Đốm Biển — hồ sơ nghiên cứu và QA

`typer-shark` là technical ID cũ được giữ nguyên để bảo toàn route và dữ liệu đã lưu. Tên hiển thị hiện tại là **Đốm Biển**. Nhân vật là một sên biển phát sáng do NewPlayground thiết kế bằng SVG, có hai tua sáng, đốm lân tinh và thân vây tròn.

## Cơ chế

- Gõ chín từ biển bằng bàn phím thật hoặc bàn phím cảm ứng; hoàn tất cả ba đợt để đưa Đốm về rạn san hô.
- Mỗi chữ đúng được 10 điểm. Hoàn tất từ sớm nhận thêm điểm theo thời gian còn lại.
- Từ trôi khỏi màn hình sẽ tốn một trong ba lượt; chữ sai làm ngắn thời gian còn lại của từ 220 ms.
- Mỗi từ có 10,5 giây ở đợt đầu, 8,9 giây ở đợt hai và 7,3 giây ở đợt cuối. Đồng hồ chung 75 giây cũng có thể kết thúc lượt chơi.
- Tạm dừng, tiếp tục, chơi lại và tự dừng khi rời cửa sổ, chuyển tab hoặc đóng trang đều được hỗ trợ.

## Nguồn hình ảnh

Đã rà trực tiếp SVG bìa trước đó và hình vẽ nội tuyến của renderer: cả hai được tạo từ các path/circle SVG trong repo, không tải sprite, font, thư viện hay hình ảnh từ bên ngoài. Tuy vậy, bìa cũ dùng dáng cá mập khái quát và tên gần với một game thương mại. Đã thay cả bìa và nhân vật trong game bằng hình sên biển phát sáng nguyên bản; màu, hình khối, biểu cảm và tua sáng dùng cùng một thiết kế. File ảnh vẫn ở `assets/covers/typer-shark-original.svg` để giữ nguyên đường dẫn tích hợp.

## Kiểm tra

- Unit và controller tests: `node --test tests/typer-shark-model.test.cjs tests/typer-shark-ui.test.cjs` — 13/13 pass.
- `node --check` cho model/view và `git diff --check` pass.
- Chromium thật qua route của ứng dụng ở 320×800 có touch và 1280×900 desktop: nhập chữ bằng phím cảm ứng lẫn phím vật lý; thắng; thua sau ba lượt; pause/tiếp tục/chơi lại; kiểm tra không tràn ngang, mọi nút ít nhất 44×44px, animation frame được hủy khi dừng và đóng; không có lỗi console/page.
- Unit/controller tests cũng kiểm tra delta lớn đi qua đủ deadline, chữ sai đúng tại deadline không cộng thời gian giả, số từ hoàn thành không tính từ bị lỡ, input không tác động khi đã terminal, và listener/RAF được dọn khi đóng.
- Chưa thử trên điện thoại vật lý hoặc đo latency bàn phím cảm ứng thật. Từ mục tiêu hiện dùng chữ tiếng Anh ASCII để không cần bố trí phím dấu; âm thanh và bảng điểm trực tuyến chưa có.

# Chuẩn nghiên cứu, phát triển và nghiệm thu từng game

Đây là quy trình hiện hành cho game trong NewPlayground. `AGENTS.md` tóm tắt yêu cầu dành cho người sửa mã; `README.md` dẫn tới trạng thái và chứng cứ. Danh mục, đặc tả cũ và game đã mở được không tự chứng minh rằng một tựa đã được nghiên cứu, chơi thử hoặc hoàn thiện.

## 1. Hồ sơ tham chiếu trước khi sửa

Chọn đúng một phiên bản có thể xác định: tên/edition, năm hoặc build, nền tảng, chế độ chơi, số người chơi và input. Ghi URL nguồn, ngày truy cập, thời điểm trong video nếu có, và quy tắc nào nguồn đó chứng minh. Ưu tiên manual, trang nhà phát hành, gameplay của đúng phiên bản hoặc bản chơi có thể quan sát. Khi chỉ có nguồn thứ cấp, ghi rõ mức chứng cứ và điều chưa xác minh; không điền số liệu suy đoán như thể là thông số gốc.

Hồ sơ game phải mô tả:

- Mục tiêu, core loop, trạng thái hợp lệ/không hợp lệ, thắng, thua, retry và điều kiện qua màn.
- Bố cục sân/bàn chơi, tỷ lệ giữa vùng chơi và HUD, vị trí/làn/ô/tài nguyên và thay đổi giữa các màn.
- HUD, ý nghĩa từng chỉ số, điểm, mạng, timer, combo, vật phẩm và điều kiện mở khóa.
- Bàn phím, chuột, cảm ứng, thao tác giữ/thả, thứ tự ưu tiên, vùng chạm và ngưỡng/độ nhạy có thể quan sát.
- Nhịp và timing: tốc độ mô phỏng, cooldown, animation lock, spawn/wave, timer và cách độ khó tăng.
- Màn đầu và ít nhất màn/round tiếp theo trong phạm vi đã chọn; ghi rõ phần campaign, boss, item hay chế độ còn ngoài phạm vi.
- Art direction theo chính game tham chiếu: silhouette, camera, màu theo chức năng, chuyển động, phản hồi và mức chữ cần thiết.

Nguồn nghiên cứu hiện có gồm [`50_GAMES_MASTER_SPEC.md`](./50_GAMES_MASTER_SPEC.md), [`50_NEW_GAMES_MASTER_SPEC_101_150.md`](./50_NEW_GAMES_MASTER_SPEC_101_150.md), catalog và audit. Chúng là đầu mối để chọn câu hỏi/source, không phải chứng cứ rằng mọi phiên bản, thông số hoặc luật trong đó đã được kiểm chứng. Trạng thái theo từng tựa nằm trong [sổ bao phủ game](./GAME_COVERAGE.md) và [ma trận gameplay](./GAMEPLAY_COMPLETENESS_AUDIT.md).

## 2. Trung thành cơ chế và quyền tài sản là hai việc riêng

Mục tiêu nghiên cứu là hiểu và kiểm tra hành vi chơi của phiên bản đã chọn. Điều đó không cho phép chép mã, ROM, sprite, animation, hình chụp, nhạc/hiệu ứng, bản đồ hoặc bố cục artwork độc quyền. Dùng hình/âm thanh tự tạo, tài sản có giấy phép đã xác minh hoặc tài sản có văn bản cho phép; ghi file, tác giả, URL nguồn, license/permission, attribution và chỉnh sửa trong asset manifest. Không suy rộng quyền từ một asset sang toàn bộ pack hoặc tự khẳng định đã clearance tên/nhãn hiệu.

Có thể ghi sai khác có chủ đích để hỗ trợ browser/mobile, nhưng phải nêu điều khác với reference và tác động tới luật/nhịp chơi. Không dùng “clean-room”, asset tạm, tên game hoặc một engine dùng chung để tuyên bố đã được pháp lý hay gameplay nghiệm thu.

## 3. Engine, giao diện và đầu vào

- Dự án hiện tại là HTML/CSS/vanilla JavaScript, Canvas 2D/DOM và Web Audio; giữ kiến trúc router/session hiện hữu. Tách model/game rules khỏi renderer khi phù hợp.
- Dùng chung lifecycle, audio, lưu trữ, input và phép toán khi hành vi thực sự chung. Archetype dùng làm prototype hoặc component; không đổi nhãn rồi coi từng game đã có luật riêng.
- Không ép mọi game vào cùng palette, card layout, canvas template, camera hay mật độ chữ. Chọn bố cục theo reference và mechanic. Bảo vệ diện tích vùng chơi và tỷ lệ bàn/camera trên điện thoại; cho cuộn/zoom có chủ đích nếu toàn bộ bàn không thể đọc được.
- Ưu tiên hình và phản hồi trực quan để chỉ ra hành động/trạng thái. Chỉ giữ chữ và biểu tượng trang trí cần cho mục tiêu, luật, giá trị, trợ năng hoặc thao tác; không xóa nhãn cần thiết để chơi.
- Keyboard, mouse và touch phải gọi cùng một luật chơi; không phát sinh thao tác kép. Hỗ trợ pointercancel, mất focus, resize và restart. Nút cảm ứng chính tối thiểu 44px; vùng game nhận gesture không cuộn trang ngoài ý muốn.
- Timer, spawn, movement và cooldown dùng simulation time/delta-time đã nêu trong hồ sơ, không phụ thuộc tốc độ render. Mọi RAF/timer/listener/audio/DOM game có owner và được dọn khi đóng hoặc đổi game.
- Lưu đúng nội dung đã nêu: kỷ lục không đồng nghĩa autosave campaign. Chặn dữ liệu hỏng/quota làm game không mở được; version hóa key khi schema đổi.

## 4. Checklist nghiệm thu theo game

Không gọi “hoàn chỉnh theo reference” nếu thiếu mục bắt buộc hoặc chưa có chứng cứ. Ghi một trong các trạng thái: **chưa nghiên cứu**, **prototype**, **đã kiểm thử model**, **đã chơi thử một phần**, **đã nghiệm thu phạm vi đã nêu**. Mọi khác biệt và thiếu sót vẫn phải được liệt kê sau khi nghiệm thu phạm vi nhỏ.

- [ ] Phiên bản, mode, URL/source và ngày quan sát đã chốt; rules/layout/HUD/input/timing/progression đã ghi.
- [ ] Luật thiết yếu và exception khớp reference; seed hoặc setup dùng để tái lập test được ghi.
- [ ] Có vòng chơi thực: thao tác chính, phản hồi, điểm/tài nguyên, thắng/thua, retry/pause và progression theo phạm vi.
- [ ] Có test deterministic cho model: bắt đầu, biên/va chạm, thao tác sai, thắng/thua, màn tiếp, persistence/cap nếu áp dụng. Test này chỉ chứng minh model.
- [ ] Mở bằng router thật trên browser; chơi bằng input thật ít nhất một ván/chuỗi mục tiêu qua trạng thái thắng hoặc thua, restart và màn tiếp theo nếu game có progression.
- [ ] Chụp screenshot trước/sau ở cùng desktop và mobile viewport; chứng cứ ghi đúng viewport, browser, phiên bản/reference, thao tác đã thực hiện và phần chưa chơi.
- [ ] Kiểm tra bàn phím/chuột/touch theo input được hỗ trợ, resize, giảm chuyển động, tương phản/nhãn cần thiết, audio/mute và trang không tải được asset ngoài.
- [ ] Đóng/đổi/mở lại/restart nhiều lần: không nhân listener/RAF, input cũ, âm thanh, timer hoặc state ngoài ý muốn; save/load/lỗi được thử nếu game lưu tiến trình.
- [ ] Đã đo/ghi giới hạn hiệu năng phù hợp. Không tuyên bố đạt FPS/input latency nếu chỉ chạy mock hoặc chưa đo thiết bị/browser tương ứng.
- [ ] Đã rà quyền từng tài sản/nguồn và ghi provenance; không có asset sao chép chưa được phép.
- [ ] Bảng bao phủ cập nhật: game nào sửa, model-tested, browser-played, screenshot, reference coverage và việc còn lại.

Nếu game không có level/round tiếp theo, thay bước đó bằng một run hoàn chỉnh theo điều kiện kết thúc tham chiếu và ghi rõ. Screenshot, test mock, source review hay việc mở game thành công không thể thay thế gameplay thực tế.

## 5. Chứng cứ và báo cáo

Lưu report và screenshot trong `docs/qa/<batch>/`. Ghi SHA nền/commit, branch/PR, danh sách game/file, reference, từng hành động đã chạy, kết quả test và giới hạn. Chỉ đánh dấu pass cho thao tác/browser/test đã chạy trong đúng build được nêu. Sau lần chỉnh code cuối, chạy lại cả suite hiện hành (`node --test tests/*.test.cjs`) và kiểm tra cú pháp/catalog; cập nhật đúng tổng số test. Không triển khai/merge nếu chưa được cho phép riêng.

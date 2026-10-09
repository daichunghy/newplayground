# Hàng Rong — hr3-simple

2026-10-07, cập nhật gameplay ngày 2026-10-09. Bản hr3 giữ instant play, không có prep hay bảng quản lý dài; đây là game quầy nguyên bản, không công bố parity thương mại.

## Cách chơi hiện tại

Mở game là có khách. **Chạm món để nấu → chạm khách để giao.**

- Hai món ở các khu đầu; tối đa ba món ở khu cuối. Bảng món được chọn tự động theo khu.
- Món xong tự lên khay; chạm khách tự lấy đúng món sẵn. Không phải chọn khay, kéo-thả hoặc lấy món thủ công.
- Chỉ cho nấu món khách đang cần, tính cả món đang nấu/sẵn, tránh thừa món do bấm lặp.
- Kho được bổ sung tự động, kể cả bản lưu cũ hết nguyên liệu trong phần hướng dẫn. Người chơi không phải quản lý vốn/kho.
- Không có màn prep, chợ, trang bị, XP, danh tiếng, forecast, thống kê tiền, hóa đơn hoặc hộp xác nhận kết ca/bỏ món.
- Màn chính có khu/địa điểm, mục tiêu ca, đồng hồ, hai bếp và hàng khách. Thẻ đơn đọc được số giây còn lại; khách gần hết kiên nhẫn đổi sang trạng thái đỏ. Nút món ghi thời gian nấu để người chơi cân nhắc lấp một hay hai bếp trước.
- Trên nửa thanh kiên nhẫn, thẻ khách báo chính xác tiền bo dự kiến; dưới ngưỡng thì nhãn tiền bo biến mất. Hai thẻ cùng lúc tạo lựa chọn giữa cứu khách gấp và giữ bo cho giao sớm.
- HUD giữ chuỗi phục vụ và tổng tiền bo; bỏ lỡ khách làm đứt chuỗi. Mưa có thông báo và đồng hồ đếm ngược vì nó làm khách sốt ruột hơn.
- Màn kết quả nêu số đơn giao/lỡ, tiền bo, chuỗi tốt nhất và tiến độ XP đến cấp kế. Nút `?` vẫn mở trợ giúp ngắn, tùy chọn; phím 1–3 nấu, Q/W/E/R giao, P pause.

## Tiến trình và tương thích

Giữ model v3: cấp mở khu **4/8/15/25**, lịch hữu hạn, nguyên liệu/cost, XP, trang bị đã mua và kết quả vẫn lưu dưới nền. Không tự mua trang bị mới. Không có giao dịch tiền thật.

Các giá trị model giữ lại để tương thích, không tạo thêm quyết định hay màn quản lý cho người chơi. Món cấp đầu được chọn bánh mì/trà đá; khu sau chọn 2–3 món tương ứng đã mở. Món khác trong model/atlas không phải lựa chọn cấu hình trên giao diện mới.

- Key `np_hangrong_save_v3` + `_backup` giữ nguyên schema. Key v2 không bị ghi/xóa.
- Best combo được thêm tùy chọn vào snapshot v3; save v3 cũ thiếu field vẫn khôi phục, lấy chuỗi hiện tại làm mốc tốt nhất đã biết.
- Bản v3 đang chơi mở lại paused, giữ nguyên menu/kho/bếp/khay/xu/đồng hồ; chỉ đổi thực đơn tự động khi sang ca mới.
- Migration v2 giữ cấp, xu, kho và trang bị hợp lệ; tính giai đoạn từ cấp thay vì stageIndex lỗi.
- Bổ sung một phần nguyên liệu khi thực sự cần trong ca; cập nhật cả kho đầu ca và kho hiện tại để hạch toán/restore không lệch. Hết vốn dùng cơ chế hỗ trợ nguyên liệu có sẵn, không tạo nợ.
- Bản lỗi/future được giữ nguyên; thử backup read-only, nếu không có thì chơi tạm. Storage/quota lỗi không chặn chơi.
- Blur/hidden/pagehide pause; cleanup lưu và hủy RAF/listener/nốt audio thuộc session.
- Bản lưu giữ nâng cấp bốn ghế từ phiên bản cũ; bốn nút khách dùng lưới bốn cột theo chiều rộng để không tràn khung ở màn hình hẹp.

## Hình ảnh và nguồn

Giữ atlas vector nguyên bản `assets/sprites/hangrong/atlas.svg` (10 món, 4 khách), CSS quầy và SFX sin tạo bằng mã. MIT theo `LICENSE` repo. Không lấy ảnh/nhạc thương mại. Atlas đã xem pixel qua librsvg/cairo; không phải screenshot gameplay.

Nguồn đọc ngày 2026-10-07:

- [Vietnam Tourism: street food](https://www.vietnam.travel/things-to-do/beginners-guide-vietnamese-street-food): quầy nhỏ, ghế thấp và thực đơn ít món; trà đá dùng trà/đá, không phải trà sữa.
- [Vietnam Tourism: drinks](https://www.vietnam.travel/things-to-do/cool-7-delightful-vietnamese-drinks): phân biệt nước mía và trà đá trong hình minh họa. Không dùng các tuyên bố sức khỏe.
- [CrazyGames quality](https://docs.crazygames.com/requirements/quality/): mục tiêu và thao tác dễ hiểu. [Poki fit test](https://developers.poki.com/guide/player-fit-test): test tự động ở đây không thay playtest người thật.
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [W3C Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html), [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): native click/tap, bàn phím thay thế và pause khi ẩn tab.
- Diner Dash FAQ trả 502 trong nghiên cứu cũ; không dùng để suy ra luật/parity.

## Kiểm thử và tích hợp

**40 test riêng pass: 22 model + 18 DOM-double.** Bao phủ mới ghi nhận ngưỡng bo/streak, reset khi lỡ khách, migration best-combo trong save v3 cũ, cue mưa/đếm ngược, trạng thái kết ca và reset ván mới.

Bao phủ mới: instant start, chỉ hai thao tác nấu/giao, tự lấy/match món, chặn nấu dư, phím tối giản, help tùy chọn, next/retry một nút, giữ nguyên active v3, v2 không bị ghi, cứu bản hướng dẫn cũ hết kho, quota/corrupt/cleanup. Các kiểm tra model giai đoạn/kinh tế cũ vẫn còn để bảo vệ save.

Các số 980 tổ hợp menu và bot 18 ca trong test model chỉ kiểm tra simulation cũ còn tương thích; **không phải nhịp chơi được đo của giao diện đơn giản mới**.

API không đổi: `NP_HangRong.mount(container, session, AudioEngine)`. Giữ thứ tự load model → view → engines và CSS/atlas đã tích hợp. Follow-up commit chỉ chạm module, test, hồ sơ và log; không sửa shared wrapper/index/manifest.

CI được bổ sung case Chromium 320×800 touch để mô phỏng một ca giao đủ món, xem cue bo/chuỗi/kết quả và bắt đầu ca mới; kết quả chạy vẫn chờ. Đây là kiểm tra đường input và bố cục tự động, không phải playtest người thật hoặc bằng chứng rằng độ khó/nhịp chơi thú vị. Local browser, thiết bị iOS/Android, screen reader, audio thực, FPS/latency và playtest người dùng vẫn cần nghiệm thu; quyền tên/tài sản và parity vẫn chưa được xác nhận. Các nút native ≥44px, tên món/aria labels có fallback, CSS reduced-motion/forced-colors vẫn giữ.

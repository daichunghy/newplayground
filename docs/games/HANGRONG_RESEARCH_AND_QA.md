# Hàng Rong — hr3-simple

2026-10-07. Bản sửa theo phản hồi mới nhất: bỏ nhiều chữ, bảng thống kê và thao tác chuẩn bị phức tạp. Đây là game quầy nguyên bản; chưa nghiệm thu browser/device, không công bố parity thương mại.

## Cách chơi hiện tại

Mở game là có khách. **Chạm món để nấu → chạm khách để giao.**

- Hai món ở các khu đầu; tối đa ba món ở khu cuối. Bảng món được chọn tự động theo khu.
- Món xong tự lên khay; chạm khách tự lấy đúng món sẵn. Không phải chọn khay, kéo-thả hoặc lấy món thủ công.
- Chỉ cho nấu món khách đang cần, tính cả món đang nấu/sẵn, tránh thừa món do bấm lặp.
- Kho được bổ sung tự động, kể cả bản lưu cũ hết nguyên liệu trong phần hướng dẫn. Người chơi không phải quản lý vốn/kho.
- Không có màn prep, chợ, trang bị, XP, danh tiếng, forecast, thống kê tiền, hóa đơn hoặc hộp xác nhận kết ca/bỏ món.
- Màn chính chỉ có khách, món, bếp/khay minh họa và đồng hồ. HUD ghi số đơn cùng mức cần giao để qua ca; kết ca chỉ hiện sao, kết quả ngắn và một nút chơi tiếp/thử lại.
- Nút `?` mở đúng một dòng hướng dẫn tùy chọn và tạm dừng. Phím 1–3 nấu; Q/W/E/R giao; P pause.

## Tiến trình và tương thích

Giữ model v3: cấp mở khu **4/8/15/25**, lịch hữu hạn, nguyên liệu/cost, XP, trang bị đã mua và kết quả vẫn lưu dưới nền. Không tự mua trang bị mới. Không có giao dịch tiền thật.

Các giá trị model giữ lại để tương thích, không tạo thêm quyết định hay màn quản lý cho người chơi. Món cấp đầu được chọn bánh mì/trà đá; khu sau chọn 2–3 món tương ứng đã mở. Món khác trong model/atlas không phải lựa chọn cấu hình trên giao diện mới.

- Key `np_hangrong_save_v3` + `_backup` giữ nguyên schema. Key v2 không bị ghi/xóa.
- Bản v3 đang chơi mở lại paused, giữ nguyên menu/kho/bếp/khay/xu/đồng hồ; chỉ đổi thực đơn tự động khi sang ca mới.
- Migration v2 giữ cấp, xu, kho và trang bị hợp lệ; tính giai đoạn từ cấp thay vì stageIndex lỗi.
- Bổ sung một phần nguyên liệu khi thực sự cần trong ca; cập nhật cả kho đầu ca và kho hiện tại để hạch toán/restore không lệch. Hết vốn dùng cơ chế hỗ trợ nguyên liệu có sẵn, không tạo nợ.
- Bản lỗi/future được giữ nguyên; thử backup read-only, nếu không có thì chơi tạm. Storage/quota lỗi không chặn chơi.
- Blur/hidden/pagehide pause; cleanup lưu và hủy RAF/listener/nốt audio thuộc session.

## Hình ảnh và nguồn

Giữ atlas vector nguyên bản `assets/sprites/hangrong/atlas.svg` (10 món, 4 khách), CSS quầy và SFX sin tạo bằng mã. MIT theo `LICENSE` repo. Không lấy ảnh/nhạc thương mại. Atlas đã xem pixel qua librsvg/cairo; không phải screenshot gameplay.

Nguồn đọc ngày 2026-10-07:

- [Vietnam Tourism: street food](https://www.vietnam.travel/things-to-do/beginners-guide-vietnamese-street-food): quầy nhỏ, ghế thấp và thực đơn ít món; trà đá dùng trà/đá, không phải trà sữa.
- [Vietnam Tourism: drinks](https://www.vietnam.travel/things-to-do/cool-7-delightful-vietnamese-drinks): phân biệt nước mía và trà đá trong hình minh họa. Không dùng các tuyên bố sức khỏe.
- [CrazyGames quality](https://docs.crazygames.com/requirements/quality/): mục tiêu và thao tác dễ hiểu. [Poki fit test](https://developers.poki.com/guide/player-fit-test): test tự động ở đây không thay playtest người thật.
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [W3C Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html), [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): native click/tap, bàn phím thay thế và pause khi ẩn tab.
- Diner Dash FAQ trả 502 trong nghiên cứu cũ; không dùng để suy ra luật/parity.

## Kiểm thử và tích hợp

**35 test riêng pass: 21 model + 14 DOM-double.** Full base-worktree 136 test pass. Log ở `docs/qa/hangrong-*-20261007.txt` được cập nhật theo bản đơn giản này.

Bao phủ mới: instant start, chỉ hai thao tác nấu/giao, tự lấy/match món, chặn nấu dư, phím tối giản, help tùy chọn, next/retry một nút, giữ nguyên active v3, v2 không bị ghi, cứu bản hướng dẫn cũ hết kho, quota/corrupt/cleanup. Các kiểm tra model giai đoạn/kinh tế cũ vẫn còn để bảo vệ save.

Các số 980 tổ hợp menu và bot 18 ca trong test model chỉ kiểm tra simulation cũ còn tương thích; **không phải nhịp chơi được đo của giao diện đơn giản mới**.

API không đổi: `NP_HangRong.mount(container, session, AudioEngine)`. Giữ thứ tự load model → view → engines và CSS/atlas đã tích hợp. Follow-up commit chỉ chạm module, test, hồ sơ và log; không sửa shared wrapper/index/manifest.

Chưa chạy browser thật, mobile Safari/Android, screen reader, đo tải/FPS/latency hoặc playtest. Cần kiểm tra bố cục 320px/zoom và audio thực. Native buttons ≥44px, tên món/aria labels còn đầy đủ khi SVG lỗi, CSS compact/reduced-motion/forced-colors có tests tĩnh. Không push, merge hay deploy trong task này.

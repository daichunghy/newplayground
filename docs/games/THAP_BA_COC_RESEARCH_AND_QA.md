# Tháp Ba Cọc: nghiên cứu, phạm vi và chứng cứ triển khai

Cập nhật: 08/10/2026. Catalog ID: `thap-ha-noi-tower`. Candidate build: `tbc1`, trên nhánh `codex/thap-ba-coc-100-20261008`, cơ sở `8a1927e` (tree `a6f1511`). **Đã có vòng chơi ứng viên và kiểm tra tự động; chưa nghiệm thu browser/device, playtest hoặc quyền phát hành đầy đủ.**

## 1. Phạm vi được chọn

Một người chơi, luật Tháp Hà Nội ba cọc cổ điển. Người chơi chuyển cả chồng đĩa từ Cọc A sang Cọc C, từng đĩa một. Chỉ được lấy đĩa trên cùng; không được đặt đĩa lớn lên đĩa nhỏ. Bản này không có giới hạn thời gian, điểm thưởng, thua cuộc, chướng ngại, vật phẩm, gợi ý trả phí, multiplayer, quảng cáo hoặc tài khoản.

Chiến dịch do NewPlayground thiết kế để tăng dần số đĩa:

| Chặng | Đĩa | Số nước tối ưu | Mở khóa |
|---|---:|---:|---|
| Bước đầu | 3 | 7 | Có sẵn |
| Vững vàng | 4 | 15 | Thắng chặng trước |
| Bền bỉ | 5 | 31 | Thắng chặng trước |
| Đỉnh tháp | 6 | 63 | Thắng chặng trước |

Chỉ ba quy tắc cổ điển chi phối nước đi. Nước không hợp lệ bị từ chối và không đổi trạng thái. Hoàn thành khi toàn bộ đĩa nằm trên Cọc C, theo đúng thứ tự. Không có trạng thái thua vì mọi cấu hình hợp lệ vẫn giải được. Người chơi có thể hoàn tác một nước hoặc yêu cầu một bước gợi ý; gợi ý chỉ đánh dấu nước kế tiếp trên đường ngắn nhất hiện có, không tự di chuyển đĩa.

## 2. Nguồn và mức chứng cứ

| Câu hỏi | Nguồn | Áp dụng |
|---|---|---|
| Cấu hình ba cọc và quy tắc đặt đĩa | [Wolfram MathWorld: Tower of Hanoi](https://mathworld.wolfram.com/TowerofHanoi.html) | Chồng đĩa chuyển giữa ba cọc; chỉ đặt đĩa nhỏ hơn lên đĩa lớn hơn. |
| Số nước tối thiểu | [NIST Dictionary of Algorithms and Data Structures: Towers of Hanoi](https://xlinux.nist.gov/dads/HTML/towersOfHanoi.html) | Số nước tối thiểu là `2ⁿ − 1`; HUD hiển thị chuẩn và độ lệch. Các chặng 3–6 đĩa tương ứng 7, 15, 31 và 63 nước. |
| Mục tiêu thao tác cảm ứng | [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Các nút điều khiển được đặt tối thiểu 44 × 44 CSS px theo chuẩn repo; bố cục ba cọc co lại trên màn nhỏ. |

Đây là desk research về luật, không phải quan sát hoặc đo một bản triển khai thương mại cụ thể. Không dùng mã, hình, âm thanh, font hoặc tên thương hiệu bên thứ ba. Việc dùng ID catalog cũ chỉ giữ liên kết dữ liệu; tên hiển thị, hướng hình ảnh và các tài sản mới là của NewPlayground. Quyền phát hành/tên ở các kênh phân phối vẫn cần được rà trước release.

## 3. Vòng chơi và xử lý lượt

1. Chọn một cọc có đĩa; đĩa trên cùng trở thành đĩa đang cầm.
2. Chọn một trong hai cọc còn lại. Cọc trống nhận mọi đĩa; cọc có đĩa chỉ nhận đĩa nhỏ hơn.
3. Lượt hợp lệ cập nhật số nước và trạng thái lưu ngay. Nước sai giải thích lý do, giữ nguyên đĩa và cho chọn đích khác.
4. Hoàn thành chặng khi toàn bộ chồng đĩa ở Cọc C. Lưu kỷ lục ít nước nhất và mở khóa chặng sau.
5. Chặng cuối có nút chơi lại. Có thể mở lại mọi chặng đã mở khóa và giữ trạng thái dở dang riêng của từng chặng.

Mô hình kiểm tra trạng thái đĩa, thứ tự chồng, nước đi, thắng, hoàn tác và khôi phục save. Tìm gợi ý dùng breadth-first search trên không gian trạng thái hợp lệ (tối đa `3⁶ = 729` vị trí), nên gợi ý tìm đường ngắn nhất từ cấu hình hiện tại chứ không giả định người chơi chưa đi nước vòng.

## 4. Điều khiển và phản hồi

| Hành động | Bàn phím | Chuột/chạm | Phản hồi |
|---|---|---|---|
| Chọn nguồn / đích | Enter hoặc Space kích hoạt nút cọc | Nhấp hoặc chạm cọc | Vạch sáng quanh nguồn; thông báo đọc được qua vùng trạng thái |
| Di chuyển điểm focus | Mũi tên trái/phải; Home/End | — | Focus chuyển giữa ba cọc, không cuộn trang |
| Hoàn tác | U | Nút Hoàn tác | Trả lại cấu hình trước nước đi gần nhất |
| Gợi ý | H | Nút Gợi ý | Tô cọc nguồn/đích và nêu đĩa cần chuyển |
| Bỏ chọn | Escape | Chạm lại cọc nguồn | Hủy lựa chọn hiện tại |
| Làm lại chặng | — | Nút Làm lại chặng | Xác nhận trước khi xóa một chặng đang chơi |

Mỗi nút cọc có nhãn số đĩa, đĩa trên cùng và trạng thái chọn cho trợ năng. Nút stage bị khóa có `disabled`; trạng thái thắng và lỗi thao tác đi qua `role=status`/`aria-live`. Không có animation khóa input, audio hoặc vòng RAF; CSS tắt chuyển động khi `prefers-reduced-motion` được bật. Chưa có số đo input-to-paint hoặc kiểm thử trình đọc màn hình.

## 5. Art và tài sản

Art direction là giấy ngà, gỗ nâu, xanh lá dịu và bốn đĩa có màu riêng. Bàn và đĩa được dựng bằng HTML/CSS; `assets/thap-ba-coc-original.svg` là ảnh bìa vector vẽ mới trong repo. Không thêm font, texture, sprite hoặc âm thanh ngoài. Asset đã được ghi vào `assets/ASSET_MANIFEST.json` và `docs/ASSET_OPERATIONS_REGISTER.csv`; nguồn là nội dung tự sáng tác trong repo, giấy phép dự án MIT.

## 6. Lưu và khôi phục

- Key: `np_thap_ba_coc_campaign_v1`; schema: phiên bản 1.
- Lưu `unlockedStage`, `activeStage`, `bests[4]` và cấu hình/undo history của từng chặng đã mở.
- Lưu sau nước đi, hoàn tác, chuyển chặng, làm lại và khi session đóng. Không gửi dữ liệu lên server.
- Khi JSON hoặc cấu hình đĩa không hợp lệ, giữ raw save ở `np_thap_ba_coc_campaign_v1_recovery` nếu slot recovery còn trống rồi mở chặng đầu mới.
- Save phiên bản mới hơn không bị ghi đè. Nếu storage bị chặn hoặc đầy, gameplay tiếp tục và giao diện thông báo giới hạn.
- Runtime không có timer, vòng lặp animation hoặc listener trên `window`; các handler thuộc `NP_GameSession` và được tháo khi đóng/chuyển game.

## 7. Kiểm tra và cổng còn mở

Đã chạy:

```text
node --test tests/thap-ba-coc-model.test.cjs tests/thap-ba-coc-ui.test.cjs tests/game-flow.test.cjs
30/30 pass
```

Bao phủ luật, nước bất hợp lệ, hint giải 4 chặng đúng số nước tối thiểu, undo, save/restore, recovery, phiên bản save mới hơn, điều khiển DOM double, mở khóa/chuyển/chơi lại, định tuyến chính xác và cleanup session. Đây là kiểm tra tự động với DOM mock; không phải browser, screen-reader, thiết bị cảm ứng hoặc playtest.

Chưa chạy ở thời điểm viết hồ sơ: `node scripts/release-preflight.mjs --prepare`. Cổng còn mở gồm browser QA responsive/visual, bàn phím và screen-reader thực tế, touch/pointer trên thiết bị, reload/quota/private mode trên browser, playtest với người mới, tải/hiệu năng thực tế và rà quyền tên/art theo kênh phát hành. Chưa được xem là release-ready hoặc replica đã nghiệm thu.

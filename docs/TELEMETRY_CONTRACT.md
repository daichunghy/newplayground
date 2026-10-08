# Hợp đồng dữ liệu vận hành — đề xuất triển khai tiếp

Hiện chưa có collector hoặc dashboard trong app. File này định nghĩa dữ liệu để developer triển khai nhất quán. Không gửi dữ liệu tới dịch vụ ngoài trong đợt chuẩn bị này.

## Envelope chung

`event_name`, `event_version`, `game_id`, `game_version`, `release_commit`, `session_id`, `sequence`, `timestamp`, `simulation_ms`, `visibility`, `input_type`, `viewport_class`, `distribution_channel`.

Session ID tạo theo phiên, không phải tài khoản. Không thu tên/email, nội dung nhập, thông tin thanh toán hoặc toàn bộ save. Cross-session retention cần thiết kế nhận diện/consent riêng theo kênh; session ID không đủ để tính D1/D7.

## Định nghĩa và payload

| Event | Khi phát | Payload/điểm cần chú ý |
|---|---|---|
| game_open | Người chọn game | `source`: search/category/featured/random; `catalog_status` |
| game_loaded | Launcher và tài sản cần cho màn đầu sẵn sàng | `load_ms`, `cache_state`; không đồng nghĩa bắt đầu chơi |
| gameplay_start | Engine chuyển vào playing | `mode`, `level_id`; không phát từ modal-open |
| first_action | Hành động gameplay hợp lệ đầu tiên | `action_type`, `time_since_loaded_ms`; không đếm click mute/close |
| round_start | Bắt đầu vòng/ca/màn | `round_id`, `attempt`, `mode`, `difficulty`, `level_id` |
| round_end | Vòng kết thúc | `round_id`, `result`, `reason_code`, `score`, `active_play_ms`; đúng một event mỗi vòng |
| retry | Người chọn chơi lại | `round_id`, `reason`; phân biệt restart giữa vòng và retry sau thua |
| progress_unlock | Mốc nội dung mở lần đầu | `content_id`, `previous_stage`, `new_stage`, `unlock_reason` |
| item_use | Dùng item | `item_id`, `count`, `effect`; không ghi toàn bộ kho/save |
| save_error | Thao tác save/migration thất bại | `operation`, `schema_version`, `error_code`; không gửi raw save |
| game_error | Lỗi có tác động chơi | `phase`, `error_code`, `fingerprint`; không đưa dữ liệu cá nhân vào stack |
| game_close | Đóng/chuyển game | `reason`, `wall_ms`, `active_play_ms`; loại thời gian menu/tab ẩn |
| ad_opportunity/request/impression/complete | Từng bước riêng của quảng cáo | `placement_id`, `ad_transaction_id`, `ad_type`, `result`; impression lấy từ SDK |
| reward_granted | Phần thưởng đã commit | `ad_transaction_id`, `reward_id`, `amount`; một giao dịch chỉ grant một lần |

## Chất lượng dữ liệu và báo cáo

- Dedupe theo session + sequence; round/ad transaction có ID riêng. Queue retry không nhân đôi event.
- Denominator funnel rõ: game_loaded/open; first_action/loaded; completed/started; retry/ended. Planned/unavailable không trộn với gameplay start.
- Frame sampling có giới hạn: p50/p95, số frame vượt ngân sách và device/input; không gửi mọi frame.
- Retention, playtime, progression và doanh thu phải phân đoạn game/version/device/channel; không dùng wall time modal thay active playtime.
- Dashboard hiển thị sample size, missing events và khoảng thời gian cohort. Không quyết định quảng cáo hay tăng 350 game chỉ từ vài session.
- Donation click chỉ là click; doanh thu phải đối soát giao dịch/net thực. SDK no-fill/timeout không được coi là impression/completion.

Trước triển khai collector, chọn công cụ, ngân sách, consent/retention policy và owner. Sau đó thêm hook vào engine state transitions; portal chỉ phát các event portal biết chắc.

# New-game balance and integration verification — 2026-10-09

## Batch results

- `node --test tests/dog-crossing-model.test.cjs tests/line-rider-model.test.cjs tests/soap-bubble-garden-model.test.cjs tests/game-flow.test.cjs`: **37/37 passed**. This includes 6 Dắt Cún tests, 5 Bút Vẽ tests, 5 soap-bubble model tests and exact route/catalog/session checks.
- `node --test --test-concurrency=1 tests/*.test.cjs`: **1,290/1,290 passed**.
- Final full Chromium portal rerun: **40/40 passed** with system Chromium and the Playwright runner provisioned under `/tmp/newplayground-playwright`; it opens and closes all **63 registered routes**. One earlier full rerun transiently timed out waiting for Bảy Cột’s stock-draw status (39/40); that test passed alone (1/1) and passed in the following full 40/40 run without source changes. New coverage includes:
  - Dắt Cún’s three-red-attempt loss at 320×800 touch emulation.
  - Bút Vẽ’s steep uphill rollback at 320×800, with the user-facing “Ván trượt ngược” explanation.
  - Thổi Bong Bóng Xà Phòng launched through its exact catalog registry route; held touch input completes all three fixed openings and wins at 320×800; keyboard input completes a win at 1280×900; pause, resume, restart, touch target size, responsive fit and session cleanup are checked.
  - Existing dog/line browser play at touch and desktop widths.
- Command: `NODE_PATH=/tmp/newplayground-playwright/node_modules /tmp/newplayground-playwright/node_modules/.bin/playwright test --config=/tmp/newplayground-current-source.config.cjs`. Touch was generated through Chromium CDP in mobile emulation, not on a physical phone.
- `node scripts/release-preflight.mjs --prepare`: **passed**. Catalog 150; prototype engines 63; planned entries 87; declared assets 140; source JavaScript 1,910,066 bytes; assets 19,887,450 bytes. This checks static inventory/registry consistency, asset declarations, JavaScript syntax and the static site build, not gameplay quality or rights.
- `git diff --check`: **passed**.

## Balance and gameplay changes

- **Dắt Cún Qua Đường:** the timer is now 20 seconds. A modeled first-time pace takes 0.8 seconds to read the signal, makes one recoverable red mistake, then takes 0.7 seconds to react on each green; it saves all five dogs in about 14.92 seconds with about 5.08 seconds left. The 6th model test protects that buffer.
- **Bút Vẽ Trượt Ván:** reverse motion is checked by speed magnitude, so a fast downhill-to-uphill rollback is reported as “Ván trượt ngược” instead of “Ván khựng lại.” The 5th model test protects the rollback result.
- **Thổi Bong Bóng Xà Phòng:** selected from an unimplemented catalog ID and added as an original continuous-pressure flight loop: hold to increase bubble size/lift, release to leak pressure, steer through three fixed openings. Thorn collision, overpressure and timeout lose; reaching the porch wins. It has an exact launcher, separate model/view/CSS, original cover and provenance entry. Its pressure values are game tuning and are not a quantitative soap-bubble simulation.

## Evidence limits

Browser evidence is Chromium on a 320px emulated touch viewport and 1280px desktop. It is not physical-device testing, a novice playtest, screen-reader acceptance, low-end-device performance evidence, or title-rights approval. All three games remain prototypes and release gates remain pending.

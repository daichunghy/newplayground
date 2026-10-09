# New games local verification — 2026-10-09

## Results

- `node --test tests/dog-crossing-model.test.cjs tests/line-rider-model.test.cjs`: **9/9 passed** (5 Dắt Cún model tests, 4 Bút Vẽ Trượt Ván model tests).
- `node --test --test-concurrency=1 tests/*.test.cjs`: **1282/1282 passed**.
- Focused Chromium test in `tests/browser/portal.spec.cjs`: **1/1 passed**, covering both games at 320×800 touch emulation and 1280×900 desktop. Dắt Cún crossed one dog safely and paused/resumed/restarted. Bút Vẽ Trượt Ván received a drawn line, rode to its finish, paused/resumed, and reached a scored win.
- Full Chromium portal suite: **38/38 passed**, including opening and closing all 62 registered routes. Browser was system Chromium with the Playwright runner provisioned in `/tmp/newplayground-playwright`; touch was emulated through Chromium input events, not tested on a physical phone.
- `node scripts/release-preflight.mjs --prepare`: **passed**. Catalog: 150; prototypes: 62; planned: 88; declared assets: 139. The preflight checks catalog/registry/inventory consistency, referenced JavaScript syntax, asset declarations, and builds `.pages-site`; it does not certify game feel or rights.
- `git diff --check`: **passed**.

## Evidence boundaries

The games have deterministic model tests and Chromium interaction coverage. No physical iOS/Android run, novice playtest, screen-reader acceptance, low-end device performance measurement, or distribution-rights approval for catalog titles has been performed. The light, track physics, scoring values, and fixed course sizes are original choices informed by genre references; neither game claims replica parity.

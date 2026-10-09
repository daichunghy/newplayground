# 50-game browser QA plan

Prepared 2026-10-08 against frozen integration checkpoint `c6793ea086f89f87590b3504095b6d189c7053c5`. This is a separate local-only follow-up commit. The workflow is pull-request-only and has not been pushed or triggered.

## Existing CI and cost boundary

The existing `.github/workflows/deploy.yml` runs the Node test suite and static release preflight on pull requests. It does not install or launch a browser. The repository metadata reports `visibility: public`; GitHub's billing docs say standard GitHub-hosted runners are free for public repositories. The new job uses the existing `ubuntu-latest` runner and Node 22, one worker, and only Chromium's headless shell. It uses no secrets, paid browser service, larger runner or artifact upload. Screenshot files are generated in the ephemeral runner workspace for the test run; they are not retained as workflow artifacts because the account's artifact-storage usage is not available here.

The tool versions and commands follow primary docs:

- Microsoft Playwright, [release v1.63.0](https://github.com/microsoft/playwright/releases/tag/v1.63.0), the latest stable release listed when checked on 2026-10-08.
- Microsoft Playwright, [CI setup](https://playwright.dev/docs/ci), including GitHub Actions, Node package installation, browser installation and single-worker CI guidance.
- Microsoft Playwright, [browser installation](https://playwright.dev/docs/browsers), including `install --with-deps --only-shell` for headless-shell-only CI.
- GitHub, [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), confirming standard runners are free for public repositories. Artifact storage is allowance-limited, so this workflow does not upload screenshots or reports.

## What the local workflow checks

- All 50 exact registry IDs open through the running application, display their expected catalog title, mount game content, and close with the session and modal DOM cleaned up.
- P1A gameplay paths in Chromium: Minesweeper active-save resume, deterministic last-safe-cell win and restart; a legal 2048 move plus a separate deterministic 2048 win, continue and page reload; Line98 selection, reachable move and Undo; Hàng Rong cook completion, automatic tray collection and customer service.
- Quầy Nước Chanh's catalog card, short recipe/price controls and visible profit target.
- Widths 320, 360, 768 and 1280 CSS pixels; catalog and game modal horizontal fit. The test writes catalog/game screenshots into `test-results/browser/` for that CI run.
- Chromium mobile emulation with touch input for 2048 and Quầy Nước Chanh.
- Page errors, console errors and failed same-origin requests across these routes and actions.

## Remaining acceptance

Playwright Chromium and touch emulation are real browser tests, but they do not establish physical iOS/Android behavior, VoiceOver/NVDA support, input latency on target hardware, battery/performance behavior or novice-player comprehension. Those remain separate. No browser tests have run yet. A bounded attempt to open the owned local preview in managed Chromium returned `net::ERR_BLOCKED_BY_CLIENT`; the server logged no request. The PR-only workflow remains local and will run only after a pull request is authorized.

## Local execution update — 2026-10-09

The branch's prepared static site was tested in this cloud workspace with Playwright 1.63.0 and Chromium 151. All 21 browser tests passed, including the 51-route lifecycle loop, the four priority game flows, responsive and mobile-emulation cases, plus the new 320px Dò Mìn/Line 98 board-pan check. The pan check verifies 44px controls, edge-to-edge scrolling and automatic hiding when the board fits. This supersedes the previous local-run status; it does not replace physical-device, assistive-technology, performance or human playtesting. The PR workflow will provide a separate GitHub runner result after the branch update.

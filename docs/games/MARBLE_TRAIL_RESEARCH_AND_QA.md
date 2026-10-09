# Marble Trail · original marble-chain campaign

Research/implementation date: 2026-10-07 (UTC). Legacy catalog route: `zuma-ech-ban-ngoc`.

**Status: implemented original-scope candidate; model and DOM/canvas-double checks passed. Browser/device acceptance, human playtesting and original commercial-game parity are not accepted.** This document does not certify the existing catalog, branding assets, or other launchers.

## 1. Reference choice and evidence

The historical comparison target is the original Zuma/Deluxe family, not Zuma’s Revenge, mobile sequels or an unspecified mix. The shipped presentation here is an original garden/observatory marble shooter named **Marble Trail / Đường ngọc**. Three original paths and a small closed campaign replace the previous three-stage prototype. No frog, temple/skull artwork, PopCap logo, branded audio, map, screenshot, executable or source code was imported.

Sources reviewed before implementation:

| Source, version, access date | What it supports | Evidence limit |
| --- | --- | --- |
| [EA: Zuma](https://www.ea.com/games/zuma/zuma), current publisher product page, 2026-10-07 | Basic match-three chain-clearing objective and endpoint loss condition; identity/publisher of the comparison game | Direct page text reviewed. Its current page identifies an Xbox release, so it does not establish exact PC Deluxe timing or edition parity. No artwork reused. |
| [PopCap Xbox Vol.1 manual](https://static-www.ec.popcap.com/support.popcap.com/sites/support.popcap.com/files/XBox_Vol1_manual.pdf), original Zuma section, printed pp. 6–7, 2026-10-07 | Swap control, progress meter stopping incoming balls, gap-shot rewards, special balls, and color-blind option | Official-host search-index excerpt reviewed. Full PDF open returned an accessibility error; no claim to have reviewed unseen pages or measured Xbox behavior. This is cross-platform support for the core loop, not a PC manual substitute. |
| [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), current API documentation, 2026-10-07 | Timestamp-driven updates; refresh rates differ and hidden tabs may suspend RAF | Direct documentation text reviewed. Motivates fixed-step simulation and explicit interruption handling. |
| [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), current API documentation, 2026-10-07 | Unified mouse/touch input, pointer capture, cancellation and primary-pointer handling | Direct documentation reviewed. Actual mobile event routing still requires device checks. |
| [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), current API documentation, 2026-10-07 | Visibility changes differ from window focus/blur | Direct documentation/search text reviewed. Both are handled. |
| [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), current API documentation, 2026-10-07 | Origin-local storage and unavailable/security-error scenarios | Direct documentation/search text reviewed. Storage failure paths are tested with doubles. |

Reference gap pullback, exact combo formulas, original powers and PC timings are **not externally verified** here. The explicit rules below are original design decisions, supported by executable tests. No unofficial fan article was used as technical authority. No live reference-game build or video was played/measured.

Repository context reviewed: `AGENTS.md`, `docs/GAME_OPERATING_STRATEGY.md`, `docs/game-profiles/zuma-ech-ban-ngoc.md`, old `launchZuma`, session lifecycle, shared audio API and existing game tests. The old frame-dependent distances, branded presentation and loose train handling were not carried forward.

## 2. Closed original gameplay scope

| Route | Colors | Initial train | Clear quota | Base speed | Original shape |
| --- | ---: | ---: | ---: | ---: | --- |
| Vườn bình minh | 3 | 16 | 30 | 15 px/s | Rounded outer loop turning inward |
| Khúc sông xanh | 4 | 20 | 45 | 18 px/s | River-like alternating bends |
| Đài quan sát | 5 | 24 | 60 | 21 px/s | Winding observatory spiral |

All paths are authored coordinate data, sampled with a Catmull–Rom spline and indexed by accumulated arc length. Marbles have radius 13 logical pixels and center spacing 26. The playfield is 720 × 520 logical pixels; rendering and pointer coordinates scale together.

Implemented rules:

- Fire the visible current color; see the next color and swap them without spending a shot. One projectile may be in flight, with an 18-tick minimum shot cooldown and 900 px/s projectile speed.
- Swept segment/circle collision selects the earliest physical contact. Path-tangent contact determines insertion before/after that marble. Forward neighbors are pushed only until available gap space absorbs the displacement. A physically nearer track branch blocks a farther one.
- Clear at least three touching marbles of one color. Same colors separated by a gap do not match prematurely. Connected color runs already in the initial train wait for an insertion or reconnection trigger.
- Clearing creates a real path gap. If its boundary colors match, the front segment pulls backward at 110 px/s; otherwise that segment waits for the rear to catch up. Reconnection may clear again. Nested cascades carry multipliers ×2 through ×12. Stale and duplicate gap links are pruned.
- Each removed marble earns 10 × cascade multiplier points. A shot crossing an empty path span before making a match adds 60 points. No bonus is awarded for merely crossing a gap or missing.
- Clear quotas count removed marbles, including the inserted marble. Upon reaching quota, no new marbles enter. Clear the remaining train to win. A head at path length minus its radius loses the round. There is no timer-based win or automatic removal of leftovers.
- Source marbles whose IDs are divisible by 11 contain Slow (S); divisible by 17 contain Reverse (R), taking precedence. An S in a cleared group slows the train to 40% for 600 ticks (5 s); R reverses it at 70 px/s for 300 ticks (2.5 s). Repeated activation resets the relevant duration. Normal gap pullback is distinct from the global reverse effect.
- After source closure, replacement ammo comes only from colors still in the train. This prevents an extinct-color endgame deadlock. A temporarily empty train before quota replenishes at the entrance.
- Route rewards are 250 / 350 / 450 points. A won route advances to the next one; route three ends the campaign. Retry restarts the current route with its original seed and completed-route score. Best score remains banked locally. No lives, payment, ads, accounts or online requests are introduced.

Deliberate departures / out of scope: exact reference levels, original life/economy system, gold coin targets, original progress/score values, Gauntlet/endless mode, bosses, sequel abilities, original power distribution, reference audio/visual timings. A permanent geometric aim line is an original accessibility/aim aid rather than an original power-up recreation. The 3-route scope is not full Zuma parity and must not be advertised as licensed Zuma.

## 3. Input, presentation and accessibility

Latest user direction (2026-10-07): make games immediate and low-text. Applied before handoff: fresh rounds start directly with no intro, onboarding step or tutorial overlay. Visible UI is the title, score, short route/progress indicators, symbolic current/next ammo and four compact controls (fire, swap, pause, retry). Detailed rules stay in this document; the optional in-game help is two short lines. No settings menu, effects toggle, visible shot statistics or verbose result copy. Returning saved rounds still wait for explicit resume, protecting an unattended in-flight state.

- Original deep-blue garden/observatory visual system, geometric launcher, warm metallic track and procedural shaded marbles. Every color has a distinct symbol (circle, triangle, square, diamond, plus) in the board and current/next readout.
- Mouse hover aims; left press/release fires once; right press swaps. No separate click handler duplicates a shot. Touch drag aims, release fires. Cancellation, multi-pointer cancellation on the canvas, lost capture and out-of-bounds release suppress shots. A window release clears stale input when capture is unavailable.
- Buttons are at least 44 CSS px high. Compact controls wrap only when needed. The canvas fits width; physical marble sizes on small screens still need human/device validation.
- On the focused canvas: left/right rotate, up/down rotate slowly, Enter fires, Space/C swaps, [/] cycles visible target positions, P pauses. Native buttons remain usable with the keyboard. Shortcuts do not intercept portal/window keys. A selected target is not guaranteed clear line of sight, and this is announced.
- Finite status announcements, focus-visible outlines and explicit result/resume focus. On natural result, the cover is exposed before the result button is focused. This is a real-time aiming game, **not fully playable non-visually**; that limitation is disclosed in the in-game help.
- Reduced-motion preference is applied automatically, without an extra setting. Decorative sparks, recoil and projectile trails are disabled; essential marble motion remains. Procedural audio uses the existing shared `NP_Audio.tone` API, respects mute and catches audio failures. No BGM, audio assets, vibration or delayed sound timers.

## 4. State, timing and resource behavior

- Pure seeded xorshift model, 120 Hz fixed timestep. `advance()` bounds each input delta to 250 ms. View timestamps use RAF; a gap greater than one second pauses rather than simulating unattended play. Nonfinite/negative deltas do nothing.
- Window blur, pagehide and hidden document pause play; visibility return does not resume automatically. Resume explicitly resets the frame clock and held input. RAF stops in paused, confirmation and result states. Fresh launch begins immediately.
- Versioned local key: `np_marble_trail_v1`; rule fingerprint: `marble-trail-2026-10`. Save includes route, seeded RNG, score checkpoint, individual train positions/IDs/powers, pending cascade links, current/next ammo, projectile, effect timers, accumulator and statistics. An in-flight shot resumes from the same state.
- Save after input, every 240 simulation ticks, pause, retry checkpoint and cleanup. A loaded active round opens paused. Save validation rejects unsupported versions, bad numbers, duplicated IDs, invalid spacing/colors, malformed bullets and impossible terminal/goal combinations.
- Corrupt/unknown data is copied unchanged to `np_marble_trail_v1_recovery` before replacement. If backup fails, the old raw save is not overwritten. If initial storage reading throws, persistence stays disabled for that mount to avoid replacing unseen data. Quota errors display a warning and keep gameplay usable. Old branded prototype save keys are not read or overwritten.
- All listeners and RAF ownership use the supplied `NP_GameSession`. Cleanup saves, marks inactive, clears transient input/effects, cancels RAF and removes the host class. No own interval, delayed callback, global key handler or retained render loop survives session stop.

## 5. Verification results

Commands run in isolated branch `codex/marble-trail-polish-20261007`, based on `0727af2`:

- `node --check scripts/games/marble-trail-model.js`
- `node --check scripts/games/marble-trail.js`
- `node --test tests/marble-trail-*.test.cjs` — **50 passed** (26 model, 21 DOM/canvas-double, 3 legal-input campaign checks).
- `node --test tests/*.test.cjs` — **211 passed** after the final implementation changes.
- `node scripts/release-preflight.mjs` — passed static consistency/syntax for the current, not-yet-integrated index. New source bytes are not counted by its linked-index totals until wiring.

Tests cover deterministic equivalence at 30/60/120/144 Hz, arc-length movement, spacing and source spawn contact, contact-side insertion, gap nonmatches, ×2/×3 cascades, power timers, clear quotas, end conditions, retry/next progression, swept collision, gap rewards, ammo exhaustion, save rejection/round trips, 3,600 seeded-action invariants, 200 repeated same-gap clear cycles, scaled pointer coordinates, duplicate click/repeat suppression, cancel/multitouch/outside release, local keyboard scope, pause/no-backlog, blur/visibility/pagehide, in-flight reopen, confirmation cancel/retry, result focus ordering, failed reads/writes/backups, automatic reduced motion/audio mute, instant launch/compact UI and 20 mount/teardown cycles.

The legal-input campaign tests use a deterministic short-lookahead bot and replay each selected shot/swap into the unmodified live model, asserting its result matches the prediction. For seed 20261007, it finished routes 1/2/3 in 17/51/51 shot decisions. This proves at least one legal completion sequence for each current route. It does **not** establish human difficulty, retention, latency or all-seed solvability.

An independent read-only review additionally exercised more than 2,400 before/after insertion cases across all three curved paths and 80 seeded natural-shot simulations. It identified result-focus ordering and duplicate gap-link accumulation; both were corrected and regression-tested. Own review also corrected the shared audio method name and entrance spawning contact.

### Gates still pending

- Supported real-browser preview, focus/keyboard behavior, pointer capture, responsive appearance and touch aim. Previous localhost/socket access denial remains respected; no alternate-port/file/data/browser route was used.
- Desktop Chromium/Firefox/Safari; iOS Safari/Android; 320/375/768/desktop layouts; high-DPI rendering and accessibility tooling.
- Visual game/art acceptance and readability at small sizes; scrolling and focus behavior inside the real portal modal/iframe.
- Real-device 30/60/120 Hz timing, input-to-shot latency, memory, load/network bytes and audio unlock/resume. No numerical device measurements are claimed.
- Human playtests for each route, power/gap teaching, completion rates, fair failure and difficulty progression; route counts/speeds remain tuning candidates.
- Licensed reference build/manual/video observation for any future original-feature parity claim, plus any branding/rights review.
- Integrator wiring and integrated portal tests; no publishing, pushing or deploying was performed by this scoped worker.

## 6. Asset provenance

| File / content | Origin | License / treatment |
| --- | --- | --- |
| `assets/marble-trail-original.svg` (1,172 bytes) | Newly authored coordinate/vector garden-orbit badge, 2026-10-07; no third-party input, tracing, fonts or embedded images | Original project contribution under repository MIT license; keep repository copyright/license. |
| Canvas art and paths in `scripts/games/marble-trail.js` / model | Newly authored primitives, symbols, tracks, gradients and launcher | Original project code/art under repository MIT. |
| Synthesized notes | Original note choices, shared `NP_Audio.tone` oscillator implementation | No downloaded/sample music or sound. |

The original SVG is decorative and is not required for gameplay. All playable graphics are procedural. Reference source URLs establish research provenance only; they grant no permission to reuse publisher imagery or audio.

## 7. Exact integration handoff

Owned files only: the model/view/CSS, three `tests/marble-trail-*.test.cjs` suites, this document and `assets/marble-trail-original.svg`. Shared engine/index/registry/manifests/inventory and test harness are untouched.

1. Link `scripts/games/marble-trail.css` from the page. Load `scripts/games/marble-trail-model.js`, then `scripts/games/marble-trail.js`, before any wrapper may call it.
2. Replace the body of the existing `launchZuma(container, game)` with a dedicated delegation that starts exactly one `NP_GameSession` and returns `window.NP_MarbleTrail.mount(container, session, window.NP_Audio)`. Do not start the previous branded BGM or create the old intro/canvas first. Keep the exact catalog ID → launcher relationship.
3. `mount(container, session, audio)` requires session `listen`, `onCleanup`, `requestAnimationFrame`, `cancelAnimationFrame`. It returns `{ pause, snapshot }` for control/testing. No second session is created inside mount.
4. In the integrator-owned asset manifest/register add the SVG with category `original-game-art`, local path above, source `Original NewPlayground vector artwork, authored 2026-10-07`, license `MIT (repository original contribution)`, and 1,172 byte size. Do not attach PopCap attribution/licensing to this original art.
5. User-visible catalog/launcher presentation should accurately say Marble Trail / Đường ngọc under the legacy ID, with scope “original three-route marble-chain candidate.” Remove old commercial-parity claims for this launcher. Keep acceptance status separate from implementation counts.
6. Extend integrated route/asset/session checks as needed in the shared harness (owned by integrator). Run all tests and preflight again on the final combined tree. Do not mark browser/device gates accepted from these doubles.

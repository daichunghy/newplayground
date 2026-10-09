# Mảnh Sao — research and scope

Updated 7 October 2026. Candidate `sm1` replaces the historical `ban-trung-khung-long` route with an original short-form star-fragment game. This is a prototype, not a completed remake or a claim of parity with another title.

## Reference reviewed

- [Electronic Arts — Dynomite!](https://www.ea.com/games/dynomite/dynomite), official product page, reviewed 7 October 2026. It lists the base game for PC/EA app and describes the high-level loop as aiming a slingshot to match at least three same-colour dinosaur eggs, with Mama Brontosaurus as a loss threat.
- The page does not provide a rulebook, level inventory, exact scoring, timing, controls beyond mouse/keyboard, or complete mode details. The specific historical build/edition has therefore not been established. This is a limited source review, not deep parity research.

## Original candidate scope

- Three authored star fields and five original icon families.
- Aim with pointer, touch buttons, or arrow keys; fire with a button or Space.
- Matching three adjacent icons clears the group; unsupported fragments fall.
- Four misses push one authored tide row upward. Fragments reaching the danger edge end the run.
- Clear the field to reach the next constellation; preserve banked score on retry.
- Project-authored SVG cover and procedural Canvas illustration; no EA images, characters, sounds, names, level layouts, or text are used.

All level patterns, colors, timing, scoring, and the tide-pressure rule are original design choices and are not attributed to EA. The original project title is shown to players. The legacy catalog ID is retained solely for exact-ID routing; permission to distribute the historic name/route is not asserted here.

## Verification and gaps

- `node --test tests/starlight-match-model.test.cjs tests/starlight-match-ui.test.cjs`: 19 focused tests, pending final rerun.
- Deterministic fixed-step model covers cluster matching, unsupported drops, misses, pressure, clear/loss/win, retry and save restoration.
- UI uses DOM/Canvas doubles for direct start, pointer/keyboard input, pause, cancel/confirm restart, corrupted/future/quota storage and cleanup. This is not browser visual testing.
- No public preview, real-browser, mobile-device, accessibility audit or human playtest has been completed. Those acceptance gates remain pending.

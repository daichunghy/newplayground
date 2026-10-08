# Quầy Nước Chanh: research, scope and QA

Reviewed 2026-10-08 UTC. Candidate build: `lemonade-stand-campaign-1`. Catalog ID: `lemonade-tycoon`.

## Reference boundary

The catalog supplies only a title and a short recipe/temperature description. EA's 2009 mobile announcement lists location, recipe, advertising, staff and weather as parts of its business-management version. Shockwave's archived product page describes the earlier Windows game as a lemonade stand with a recipe and business-growth goal. The target NewPlayground edition/build has not been identified; these sources support a broad management-game loop, not exact rules, art, campaign length or parity.

- Electronic Arts, [EA Mobile Unleashes Six New Games on Apple App Store](https://news.ea.com/press-releases/press-releases-details/2009/EA-Mobile-Unleashes-Six-New-Games-on-Apple-App-Store/default.aspx), 28 May 2009; reviewed 8 Oct 2026.
- Shockwave, [Lemonade Tycoon product page](https://www.shockwave.com/gamelanding/lemonade), archived title and broad description; reviewed 8 Oct 2026.

The candidate is called **Quầy Nước Chanh** and uses a project-authored recipe-and-price shift. It makes no claim to reproduce Lemonade Tycoon or any particular release.

## Chosen game loop

- Open directly into a five-day campaign, with each day a 45-second shift and a visible profit bar. There is no title/menu screen or setup form.
- Weather moves through sunny, mild and rainy periods once per shift. Each authored day uses a different order; the five goals rise from 100 to 125.
- Pick one of three quick ingredient-ratio presets (lemon / sugar / ice): Chua Dịu `3/1/3` (cost 4), Vừa Miệng `3/2/2` (cost 5), or Ngọt Thanh `2/3/2` (cost 6). The selected per-cup cost stays beside the selling price. Weather changes taste fit; recipe and price can be changed while the stand is open.
- Set a price from 4 to 24. Each second, traffic and a seeded customer check decide whether a visitor arrives and buys. A sale adds the posted price to revenue and automatically charges the preset's ingredient cost. No supply ordering or stock counter.
- Reach that day's profit goal to unlock the next. A lost day can be retried; unlocked days can be replayed. Local progress stores the best profit, the cups sold on that best-profit run, and the campaign seed so a completed day replays deterministically after reload.
- Mouse/touch buttons adjust price and choose a recipe. Left/right arrows change price; 1–3 choose recipes. The shift pauses while the page is blurred or hidden; progress is preserved and the loop resumes on focus/visibility return.
- Malformed saves receive a recovery copy; future-schema saves are left untouched; storage failure does not block the shift.

Weather orders are authored per day and customer arrivals remain seeded. Restart and a reload after a completed day repeat the same customer sequence. A new campaign seed is chosen for a fresh browser session; the active seed is saved with the day's result. The default orders include all three weather conditions to avoid an all-rain shift that cannot plausibly reach its goal. Traffic coefficients, recipe fit, prices, daily targets, time limit, art and UI are project-authored estimates, not measured or extracted from the reference build.

## Deliberate scope limits

Location selection, advertising, hiring, upgrades, news events, accounts, persistent currency, inventory purchasing and purchase orders are omitted. EA's release identifies some of those systems in its iPhone/iPod version, but the catalog does not identify that version and this project keeps the campaign focused on recipe and price choices. Automatic ingredient costs preserve a small business loop without adding stock bureaucracy. This is a limited prototype scope, not an assertion that the omitted reference features do not exist.

## Art and rights

The stand illustration, cover (`assets/quay-nuoc-chanh-original.svg`), UI, code, recipes, weather schedule and seeded customer model are original work for this project. No EA/Shockwave logo, screenshot, character, recording, source code or original game level is used. Project-authored work is covered by the repository's MIT license; rights to the historical catalog name/route are not confirmed.

## Automated checks

Run in this candidate worktree:

```text
node --test --test-concurrency=1 tests/lemonade-stand-model.test.cjs tests/lemonade-stand-ui.test.cjs
node --check scripts/games/lemonade-stand-model.js
node --check scripts/games/lemonade-stand.js
```

The five-day campaign has 11 model and 8 DOM-double UI tests. A deterministic weather-matched recipe/price policy won 492/500, 473/500, 460/500, 457/500 and 433/500 seeded shifts across the five days. The 185 sample runs lost by that simple policy were each cleared by a bounded model search that tries all 63 recipe/price pairs for each five-second decision block; this is seed-aware simulation evidence, not a human strategy or human-balance result. Tests also cover daily goals/weather order, input bounds, exact weather boundaries, seed/restart determinism, win/loss, saved best runs, unlock/replay, malformed/future saves, storage failure, touch/keyboard parity, focus/visibility suspension and cleanup. DOM doubles do not establish browser rendering or real input behavior. See `docs/qa/lemonade-stand-campaign-checks-20261008.txt` for the exact run record.

## Still pending

No real-browser, device, screen-reader, visual-contrast, latency, motion-feel or human playtest was run. Mobile card spacing, small viewport fit, recipe comprehension, fair pricing balance, session-close behavior through the site modal, and browser frame pacing need acceptance on a supported preview. Do not call the candidate release-ready or a faithful remake.

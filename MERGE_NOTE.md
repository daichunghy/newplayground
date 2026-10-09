# Merge note: Quầy Nước Chanh candidate

Candidate branch: `codex/lemonade-stand-original-20261008`
Base commit: `fa2048c` (Bật Chốt integration)
Catalog ID: `lemonade-tycoon`
Proposed launcher: `launchLemonadeStand`

## Candidate-owned files

- `scripts/games/lemonade-stand-model.js`
- `scripts/games/lemonade-stand.js`
- `scripts/games/lemonade-stand.css`
- `tests/lemonade-stand-model.test.cjs`
- `tests/lemonade-stand-ui.test.cjs`
- `assets/quay-nuoc-chanh-original.svg`
- `candidates/lemonade-stand/index.html` and `standalone.js`
- `docs/games/QUAY_NUOC_CHANH_RESEARCH_AND_QA.md`
- Asset manifest/register records and the backlog row

## Integration work still needed

The candidate intentionally does not change the shared app shell, exact-ID game registry, launcher inventory, generated operations JSON, static script-load lists, browser flow tests or release counts. Integrate those once the isolated candidate passes review. Suggested wiring name: `NP_LemonadeStand.mount(container, session, options)`.

## Verification

```text
node --test --test-concurrency=1 tests/lemonade-stand-model.test.cjs tests/lemonade-stand-ui.test.cjs
node --check scripts/games/lemonade-stand-model.js
node --check scripts/games/lemonade-stand.js
```

At this checkpoint all 12 focused automated checks and the full 988-test suite pass. They use Node model tests and a DOM double. The page is available at `/candidates/lemonade-stand/` from a static server started at the repository root; cross-process local browser reachability remains unverified. No browser/device acceptance or release claim is made. See `docs/qa/lemonade-stand-local-checks-20261008.txt`.

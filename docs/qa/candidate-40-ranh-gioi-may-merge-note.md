# Candidate 40 merge note: Ranh Giới Mây

- Candidate branch: `codex/candidate-40-age-war-20261008`
- Source-of-truth base: `726976609341f3daee653a1c67ef1d13f02eaccc`
- Local candidate commit: branch tip after final verification; hash is included in the task handoff
- Catalog ID: `age-of-war-thoi-dai-chien-tranh` (retained as the assigned route key)
- Visible title: `Ranh Giới Mây`

## Merge summary

The local integration wires the assigned ID to a standalone, deterministic garden lane battle with passive resources, three new unit roles, an automatic opposing bot, base health, win/loss, replay, pause and managed cleanup. Candidate art is procedural canvas drawing and one project-authored SVG cover. No franchise marks, units, sprites, layouts, code or sounds are used in the playable candidate. The old cover is preserved in source because its provenance is unknown and is excluded from the prepared artifact.

The catalog and operational records are updated for the candidate title and limited research scope. The research dossier distinguishes the 2007 Newgrounds Flash page from the separately remastered Max Games mobile listing and records the lack of build-level inspection. Historical title/route rights, browser/device QA, balance, accessibility and playtest remain pending; this is not a parity claim or release approval.

## Verification

- Focused model and DOM-double tests: 11 passed, 0 failed at concurrency 1
- Full repository test suite: 830 passed, 0 failed at concurrency 1
- Static release preflight: passed; 150 catalog entries, 42 prototypes, 108 planned, 121 declared assets
- Browser/device QA: not run
- Publication, PR and deployment: not requested

## Integration notes

The exact registry entry changes from `launchAgeOfWar` to `launchRanhGioiMay`; `scripts/engines-era-front.js` is wired with its paired model, view, CSS, cover and research/tests. The old Age of War block and dispatcher mapping are removed from `scripts/engines-retro50.js`. The old `assets/age_of_war_cover.jpg` remains in source without a manifest claim and is omitted from the prepared static artifact. This local integration does not complete browser/device or rights acceptance.

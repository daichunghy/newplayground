# Dr. Mario — NES, North American manual (1990 release)

**Reference scope:** one-player NES *Dr. Mario*, using Nintendo's North American English instruction booklet (NES-DR-USA). Primary source: [Nintendo-hosted instruction manual PDF](https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAXE.pdf), accessed 2026-10-11. The manual documents the falling two-color vitamin capsules, rotation, bottle viruses and the rule to match at least four same-color capsule/virus units horizontally or vertically. This profile does not cover later modes, ports, speed settings or multiplayer behavior.

## Local rules and adaptation

- An 8-column, 16-row bottle starts with colored viruses. A two-part capsule falls from above the bottle; its halves may differ in color. Left/right move it, rotate changes its orientation, and down accelerates it.
- On lock, groups of four or more matching colors in a horizontal or vertical run disappear. Virus count falls only when a virus cell is removed. Capsule halves detached from a cleared partner become separate pieces, unsupported capsule pieces fall, and any new run resolves as a cascade.
- The bottle clears when its viruses reach zero. A capsule that can no longer enter the bottle causes top-out. The browser build locally composes five increasingly populated bottles, awards score for cleared cells/viruses/cascades, and stores a best score; these stage layouts, speed values, scoring values and five-stage cap are not claimed as the NES game's original settings.
- The first bottle is an authored tutorial arrangement whose first vertical capsule can clear two rows. Later virus layouts use a deterministic seeded generator. No original stage pattern or ROM data is copied.
- Keyboard: Left/Right move, Up or X rotates clockwise, Z counter-rotates, Down soft-drops, Space hard-drops, P/Escape pauses. Buttons provide the same actions on touchscreens. The bottle is the largest canvas region; the next capsule and four compact status values sit alongside it.
- Loss, five local stage transitions, final win, restart and best-score persistence are modeled. The local version does not implement the original title screen, options menu, level/speed selection, multiplayer, full original animation/audio or exact scoring/level progression.

## Art and assets

Capsules, viruses, bottle and screen are newly drawn with Canvas/CSS primitives. No Nintendo sprites, sound, screenshots, maps, ROM/code or manual artwork are included in the implementation. Existing repository procedural tones are called for movement/lock/clear/loss/victory and respect the shared mute control.

## Verification boundary

See [`../qa/lemonade-dr-mario-batch-20261011/report.md`](../qa/lemonade-dr-mario-batch-20261011/report.md) for model/browser evidence and open checks. Model fixtures prove rules and end states, not human mastery or fidelity to every NES mode.

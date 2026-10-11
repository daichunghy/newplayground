# Piano Tiles — Classic 50-tile mode

**Reference scope:** One-player Classic mode described by the Apple App Store record for [Don't Tap The White Tile! HD](https://apps.apple.com/us/app/dont-tap-the-white-tile-hd/id861890667), listing ID `861890667`, version `2.3` (dated 2017-10-24 in its version history), accessed 2026-10-11. The page describes a 50-black-tile Classic run completed as fast as possible and the rule to avoid white tiles. The catalog entry does not identify a publisher/revision, so this is a pinned rules variant rather than a claim that the catalog names this exact app.

The separate [Piano Tiles listing from Kooapps](https://apps.apple.com/cz/app/piano-tiles/id848160327), ID `848160327`, also identifies the core rule: tap only black tiles and avoid white tiles; its current description advertises many modes. It does not specify the 50-key target, so the implementation uses the Classic target from the first listing and does not claim fidelity to Kooapps' current modes.

## Implemented rules and original presentation

The `piano-tiles-phim-nhac` catalog ID opens a four-lane portrait board. A stream of rows each contains one black tile and white tiles; a correct black tap earns one note, the pace increases after every eight hits, and the player must clear 50 notes as quickly as possible. Tapping white ends the run. Letting a black row fall off the board also ends the run. The game records both the best note count and fastest completed time locally.

Desktop keys D/F/J/K (or 1–4), pointer input, touch input, pause, restart and keyboard retry after a loss are supported. The four generated sine notes are original feedback; no copyrighted composition, sprite, screenshot or artwork was copied. The interface uses a restrained black/white tile field with a muted warm background and no decorative emoji or icon set.

The lane patterns, initial row count, tile speed, eight-note difficulty step, synthesized note pitches and miss boundary are local tuning choices. The source does not document these exact values. Its reported Classic goal and black/white rule are the reference; this prototype is not an exact clone of a specific mobile build.

## Browser record

See [`../qa/piano-tiles-batch-20261011.md`](../qa/piano-tiles-batch-20261011.md) for state-guided full completion, separate live keyboard/touch checks, seeded isolated fail cases, responsive screenshots, persistence, pause, and lifecycle results. A human-played difficulty calibration, physical devices, assistive-technology testing and comparison with the selected app build remain open.

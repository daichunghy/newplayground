# Nhịp Mây — research, scope and QA

**Catalog ID:** `audition-nhip-dieu` (#34)
**Displayed title:** Nhịp Mây
**Variant status:** Original three-song four-key rhythm set. The intended historical catalog edition remains unknown; no parity claim.

## Research and chosen loop

- [PlayPark's official Piano Mode guide](https://audition.playpark.com/th-th/news/piano-mode/) (posted 15 July 2026) lists solo 4-key, 6-key and 8-key modes. Its 4-key input uses D/F/J/K plus Spacebar. It describes single/double short and hold notes; Spacebar timing determines the dance move. This confirms a current service mode, not the catalog's historical edition.
- [PlayPark's official Beat Rush guide](https://audition.playpark.com/th-th/game-guide/mode/audition-beat-rush-mode/) (posted 20 July 2015) describes a four/eight-direction rhythm mode in which arrows are pressed at timing markers, with graded results and combo. It is a different mode and is not evidence that the target catalog entry used Beat Rush.
- The catalog's exact `Audition 4 Phím Space` version, original chart, scoring windows and progression are not identified. This candidate uses a short original set: **Mây Sớm** at 108 BPM teaches a steady four-beat phrase, **Đèn Phố** at 116 BPM adds half-beat notes, and **Mưa Nhịp** at 124 BPM uses denser off-beat patterns. Each four-beat phrase still resolves with one Space finish note. D/F/J/K is the primary mapping; arrow keys and touch buttons are alternatives.

## Candidate content and provenance

- Three hand-authored 32-beat charts at rising tempos. The first has 24 lane notes, the second 32, and the finale 45; each has eight Space finish notes. Results show a three-star accuracy grade per song and a combined set score. A single continue action carries the player through the set; replay starts from the opening chart.
- The prototype uses timing grades, misses, combo, pause and replay. It does not include stores, skins, chance modifiers, shared rooms, online systems or borrowed music.
- The chart, procedural rooftop/evening scene, SVG cover, interface and synthesized tones are original project content. No imported music, recordings, character, screenshot, logo, interface, chart or code is included. The old unverified `assets/audition_cover.jpg` is no longer used and is excluded from prepared artifacts.
- This is a local prototype and not a legal clearance. Historical route/title rights and the exact edition remain open.

## Verification and remaining gates

- Focused tests: all three chart patterns, rising BPM and off-beat notes, full-clear grade/results, D/F/J/K and arrow lane mapping, Space finish timing, grade/score/combo, misses, pause, reduced motion and session cleanup. The DOM/canvas harness checks each inter-song continue and final replay.
- The DOM/canvas harness does not verify rendered visual quality, real keyboard/touch latency, browser accessibility, device performance or audio output. Those checks and a novice playtest remain pending.
- Before any parity claim, pin the intended edition and compare its chart modes, short/hold note behavior, scoring and Space timing.

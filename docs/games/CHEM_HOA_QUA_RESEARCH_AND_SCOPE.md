# Vườn Bật Nảy: research and scope

Status: original candidate integrated locally under the retained catalog route. No exact-edition parity claim.

## Reference and uncertainty

The historical catalog title **Fruit Ninja** does not identify a platform, release, build, or settings profile. Exact edition, spawn cadence, hitboxes, scoring, and special fruit are therefore **unidentified**. The retained catalog route opens Vườn Bật Nảy, a small original arcade interpretation rather than a replica claim.

Halfbrick's support page describes Classic as slicing fruit while avoiding bombs, with three lives and no timer; its Arcade summary describes a 60-second score chase and penalty bombs. Those broad rules informed the candidate's fruit/bomb hazard and short timed round, while its three missed-fruit limit is a separately labeled tuning choice, not a verified rule for the user’s target edition.

Source: [Halfbrick Support, “What are the game modes?”](https://halfbrick.helpshift.com/hc/en/38-super-fruit-ninja/faq/1047-what-are-the-game-modes/?f=what-happened-to-fruit-ninja-hd&l=en&p=android&s=fruit-ninja-classic) (accessed 2026-10-07).

## Candidate scope

- Original title: **Vườn Bật Nảy**; no borrowed logo, characters, setting, blade, dojo, music, or source.
- Core: swipe through fruit launched in deterministic waves; earn points; avoid dark hazard orbs; three missed fruits end a run; 60-second round can finish with a score.
- Touch/mouse pointer swipes and keyboard arrow aiming plus Space slashes.
- Pause, restart, visibility/focus pause, and session cleanup.
- Procedural vector shapes, including the project-authored cover at `assets/covers/vuon-bat-nay.svg`; no external assets/audio.
- The rules model is fixed-step only: `advance()` accepts exactly one 60 Hz step per call, and the view accumulates frame time before stepping. Variable-duration model calls are rejected.

## Rights and acceptance caveats

The reference title appears in the catalog, but no trademark or naming clearance was performed. The candidate uses a distinct name and newly drawn geometric fruit/hazards; no asset, music, level, character, or code was copied. Review local naming/marketplace policy and obtain any needed legal clearance before public release. Eight focused tests pass (five deterministic model and three DOM-double UI/lifecycle). Browser/mobile playability, visual QA, touch-device behavior, accessibility, performance, playtest and rights review remain open.

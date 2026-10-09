# Rules and asset provenance

Research checked 2026-10-08 UTC.

## Chosen reference and limits

The rules reference is the 1987 North American NES instruction manual for Taito's *Arkanoid*, preserved as a scan in the [DigitPress manual library](https://www.digitpress.com/library/manuals/nes/Arkanoid.pdf). The document is a primary source for that NES edition; the online host is an archive, not Taito. Its text describes color, silver, and gold walls; silver walls take two hits in rounds 1–8; gold walls cannot be destroyed; color walls use eight point values from 50 through 120; and the dark-blue/purple capsule widens the Vaus controller. It also assigns 100 points to a captured capsule.

The original catalog key `arkanoid-dap-gach` does not identify a platform, region, date, or build. The candidate borrows a few rules from the NES manual only. It does not claim parity with that edition, any arcade board, a later port, or an unidentified catalog build. It uses three authored rounds, far fewer than the manual's described campaign; it omits the final fortress, floating hazards, laser/catch/multiball/warp capsules, story, named ships, and other enemies.

## Candidate choices

- Three original fields use distinct silhouettes and routes: an open rim with side lanes, staggered crossbars, then a narrow core with wider wings. Each uses one-hit color walls, two-hit silver walls, and two indestructible gold blockers; gold walls do not count toward the field-clear condition.
- The expansion carrier moves from the left-side lane in round 1 to the lower left-center in round 2, then the center in round 3, giving each field a different capsule route. Short field names and cues appear at serve time; they describe these original candidate patterns, not a source-game board set.
- Color rows use the NES manual's point schedule; silver walls score 50 times the candidate round when broken. Capturing an expansion capsule scores the manual's NES value of 100.
- One marked color wall per round releases an originalized falling capsule. The marker is a small double arrow drawn in the candidate canvas. Catching it widens the paddle for eight seconds. The fixed carrier, drop timing, one-effect scope, and eight-second duration are this candidate's design decisions: the NES manual does not document this schedule or duration.
- All three level layouts, the paddle/ship, ball, brick rendering, capsule artwork, cover, and visual effects were made for this candidate. No game screenshots, original sprites, logos, audio recordings, code, board data, or named characters were reused. Optional game sound uses short synthesized tones through the host audio interface; no audio files are included.

The campaign intentionally remains three rounds. Its launch speeds are 310, 324, and 338 px/s, below the 370 px/s cap, so the shipped loop does not cycle fields after reaching the speed cap. Extending the campaign would need additional authored fields or new mechanics rather than reusing these three unchanged.

## Integration and QA boundaries

The candidate commit stays separate from shared wiring, while the local integration now loads the copied model/view/CSS through the exact `arkanoid-dap-gach` catalog route with the original cover. The archive/source build is not bundled or modified. Candidate tests still use the standalone source files; portal integration has separate route and resource-cleanup coverage.

Automated model and DOM/event/canvas-double tests cover fixed-step determinism, collision, brick durability, capsule creation/collection/effect expiry, round clear, life loss, replay, keyboard and pointer input, reduced-motion rendering, and cleanup. A local headless-Chromium smoke check was attempted but the sandbox prevented startup (`socket()` returned `EPERM`), so no browser screenshot or device playtest is claimed. These checks do not establish real-browser layout quality, device touch feel, audio hardware output, balance, accessibility acceptance, or title/trademark clearance.

# Bật Chốt: research, rules and QA

Reviewed 2026-10-08 UTC. Candidate build: `bat-chot-campaign-1`. Catalog ID: `peggle-pachinko`.

## Reference scope

The catalog entry does not name an edition. EA's official Peggle pages describe a ball-bouncing peg puzzle focused on clearing orange pegs and scoring. PopCap's hosted Peggle DS manual includes a Free Ball Bucket section. Steam's Peggle Deluxe listing names PopCap/EA as developer/publisher and describes aiming, shooting and clearing orange pegs. These sources support the broad family loop, not the exact historic NewPlayground build:

- EA, [Peggle games](https://www.ea.com/games/peggle), reviewed 2026-10-08.
- EA, [Peggle Deluxe](https://www.ea.com/games/peggle/peggle), reviewed 2026-10-08.
- PopCap, [Peggle DS manual scan hosted on EA's static support site](https://static-www.ec.popcap.com/support.popcap.com/sites/support.popcap.com/files/0107_PEGDS_Manual_011609.pdf), reviewed 2026-10-08; search indexing exposes the bucket section, but the PDF endpoint returned 403 to the browser reader during this review.
- PopCap/EA, [Peggle Deluxe on Steam](https://store.steampowered.com/app/3480/Peggle_Deluxe/), reviewed 2026-10-08.

No exact catalog version or platform was identified; this candidate makes no parity claim.

## Chosen candidate rules and campaign

- Start instantly on one of five original boards; each uses its own authored peg map, orange target layout, ball budget and bucket pace. The target counts are 16, 16, 15, 20 and 27; the starting budgets are 10, 10, 9, 9 and 8 balls.
- The boards are **Vòm Nắng** (central canopy), **Hai Mỏm** (separated side banks), **Đường Gấp** (diagonal route), **Khe Đôi** (split outer rails) and **Mưa Sao** (dense alternating field). Bucket speed rises from 82 to 184 board units per second.
- Aim with pointer/touch or left/right keys. Shoot from the fixed top launcher; the ball falls under gravity, bounces from walls and pegs, then reaches the moving bucket or drains out.
- Orange pegs count toward the board-clear goal; blue pegs only score. Hit pegs are marked and stop colliding for the rest of that shot, then clear when the ball settles.
- The bucket catches a returning ball to grant one back. Clear every orange peg to win; lose when the ball supply reaches zero while orange pegs remain.
- A ball that is still bouncing after six seconds ends that shot, so a trapped trajectory cannot hold the round indefinitely.
- A board tap aims and fires in one action. Space/Bắn fires, arrows or touch buttons adjust aim, and R/Chơi lại restores the same authored board.
- Clear a board to unlock the next. Unlocked stages can be replayed; local progress keeps the best score and fewest shots for each board. Corrupt saves get a recovery copy, future-schema saves remain untouched, and storage failure does not block play.
- No score threshold extra balls, green powers, purple pegs, masters, shops, currency, accounts or external audio.

The exact peg counts/layouts, score values, bucket pace, ball physics and marked-peg behavior are project choices. An offline half-degree aim search found model trajectories that clear all five boards within 3/3/4/4/5 shots, below their 10/10/9/9/8 starting-ball budgets; this is a deterministic simulation witness, not human balance evidence. The candidate includes only generic pegs, ball physics, target clearing, bucket returns and a small authored progression. It uses no named characters, copied levels, illustrations, music, logos, screenshots or source code.

## Original work and provenance

The name **Bật Chốt**, peg field, board colors, icon shapes, vector cover, interface and source code were created for this candidate. The cover is `assets/chot-bi-cover.svg`. The optional product title in the catalog is not reproduced in the player title treatment.

## Automated checks

```text
node --test --test-concurrency=1 tests/pinball-pegs-model.test.cjs tests/pinball-pegs-ui.test.cjs
```

Result: 12 model and 7 DOM-double UI/lifecycle tests pass. Coverage includes the five different layouts and rising challenge, a deterministic clear witness for every stage, aim bounds, side-wall reflection, peg score and once-only hit, delayed hit-peg removal, orange-target win, bucket catch, last-ball loss, six-second shot timeout, frame chunking, stage unlock/replay/save recovery, future-schema preservation, storage-write failure, accessible controls, keyboard/pointer aim, close cleanup and terminal behavior.

DOM doubles and the aim search do not verify real rendering or human difficulty. Browser/device/touch, physics feel, bucket timing under player aim delay, screen-reader, reduced-motion feel and novice playtest remain pending. Historic title/route rights remain open.

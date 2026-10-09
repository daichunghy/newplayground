# Kéo Nhịp: research and implementation scope

**Planned catalog entry:** `keo-co-doi-khang` — `Kéo co đối kháng` (P3).
**Visible game title:** Kéo Nhịp.

## Reference and original rules

The [Tug of War International Federation Rules Manual (October 2022)](https://tugofwar-twif.org/wp-content/uploads/2022/11/TWIF-Rules-Manual-October-2022.pdf) describes the center rope mark aligned over the ground center line at the start (Rule 11). Kéo Nhịp uses only that familiar visual idea: a small light marker begins at the center of an abstract ribbon. This is not an implementation of TWIF competition rules and makes no claim of sport-rule parity.

All playable rules are authored for this arcade game. One player answers a sequence of alternating left/right rhythm cues against a seeded, deterministic rival pull. Two cues instead ask the player to rest. A correctly timed matching step advances the marker toward the player's bank; a perfect beat pulls farther than a merely good beat, and consecutive steps build a capped combo. A wrong step, a missed cue, or stepping during a rest cue raises fatigue or loses a pull; resting on cue recovers fatigue. The marker reaching either bank ends the round. If the twelve-cue sequence ends first, whichever side the marker favors wins (a tie favors the rival). The match ends when either side wins two of at most three rounds. The rival's pull profile increases by round and is seeded for deterministic replay/testing.

Controls are A / D or the left / right arrow keys, with large on-screen touch buttons. P or Escape pauses. Losing focus, hiding the page, or leaving the page pauses play; returning focus does not resume automatically. The pause overlay requires an explicit resume. Replay resets the entire match.

## Originality and exclusions

This is a rhythm-and-fatigue timing puzzle with a solo deterministic opponent, not a simulation of teams pulling a real rope. The fatigue curve, cue schedule, scoring, rest prompts, best-of-three match, art, and names are original to this implementation. The drawing uses abstract banks, a ribbon, and a lantern-like marker. It does not use TWIF marks or commercial game characters, graphics, audio, terminology, or branded identity. The TWIF source supports only the narrow center/start-marker context above; the game does not reproduce other federation requirements or scoring.

## Validation and limits

The scoped model and DOM-double UI tests cover round wins/losses, deterministic rival behavior, replay, keyboard and touch inputs, pause/resume, focus and visibility interruption, and session cleanup. The integrated Chromium browser suite (`tests/browser/portal.spec.cjs`) also opens/closes every registered route and exercises the live game at a 320px viewport; all 33 browser tests passed. Emulated viewport checks do not establish physical-device input feel, assistive-technology support, human balance, or distribution rights.

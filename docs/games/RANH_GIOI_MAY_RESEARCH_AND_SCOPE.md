# Ranh Giới Mây — research and scope

Updated 2026-10-08. This is an original NewPlayground candidate assigned through the historical catalog ID `age-of-war-thoi-dai-chien-tranh`. The visible game name, factions, units, vector cover and canvas art are original. The catalog ID is retained as an internal route key for work order 40; that is not a claim of affiliation, permission or gameplay parity.

## Reference edition and evidence limits

The primary historical source reviewed is the creator-authored [Newgrounds page for Age of War](https://www.newgrounds.com/portal/view/408209). It records an upload on 2007-10-31, classifies the game as real-time strategy, and the author comments describe defending one base while attacking the other, five ages, sixteen units and fifteen turrets. The comments also refer to a difficulty choice and Space pause. The page identifies Louissi and CyprusX in its credits.

The [Max Games Studios Google Play listing](https://play.google.com/store/apps/details?id=com.maxgames.ageofwar1&hl=en_US) describes a remastered mobile edition. It is kept separate from the 2007 Flash reference and was used only to avoid conflating editions. Neither source establishes the exact catalog build or revision. No downloadable historical build, full playthrough, manual, source code, frame timing, unit statistics or device behavior was inspected. The research therefore supports broad context only; it does not establish detailed rules, balance or parity.

## Candidate scope

Ranh Giới Mây is a short campaign across three garden bridges. Each bridge keeps the same two-base battle and three original units: Mầm Khiên is a sturdy close fighter, Nỏ Hạt attacks at range, and Bọ Sỏi is a durable heavy fighter. Units move and attack on their own; both sides regenerate seeds automatically. The first bridge introduces a mixed opponent. The second repeats a mixed shield → heavy → ranged wave; its deterministic counter cycle is Bọ Sỏi → Nỏ Hạt → Mầm Khiên. The final bridge sends a stronger, repeated Bọ Sỏi force. Mầm Khiên takes half damage from Nỏ Hạt; Nỏ Hạt deals triple damage to Bọ Sỏi; Bọ Sỏi deals triple damage to Mầm Khiên. These are NewPlayground-authored balance rules, not facts about the historical game. The result screen records each clear time, unlocks the next bridge, and supports replay or return to an unlocked bridge.

The middle bridge's mixed counter cycle wins within 60 seconds in the deterministic model, while shield-only, sling-only and beetle-only runs do not clear it within 90 seconds. The last bridge starts with a stronger rival seed reserve and income. A shield-only rush fails its pressure test, while repeated Nỏ Hạt deployments can win in the deterministic model. This makes the roster choice matter without adding another control or a manual resource step. The balance is still a model result; it needs novice playtesting and real-browser/device review before release.

The candidate intentionally has no historical era progression, turret building, special attacks, difficulty menu, multiplayer, copied character or unit names, screenshots, stage layout, sprites, source code, music or sound effects. Its three-bridge campaign, counter rules and continuous resource regeneration are product choices, not measurements of the reference. Progress is versioned in local storage; malformed saves are preserved under a recovery key, and saves from a newer schema are left untouched while a fresh match remains playable. No franchise-parity claim is made.

## Implementation and evidence

The model uses a fixed 1/60-second step and has no random inputs. Focused tests cover resource regeneration, deployment costs, stage-specific opponent pressure, all three counter rules, a feasible answer to each stage, a mixed policy against three single-unit baselines, the final stage's failed shield-only strategy, progression, clear-time records, replay, and equivalent model outcomes at 30, 60, 120 and 144 Hz. DOM-double tests cover the exact catalog route, concise counter labels, keyboard shortcuts, corrupted/future save recovery, saving a clear and resuming at the unlocked stage, storage-write failure, pause, tab visibility, replay and repeated cleanup. These tests do not verify browser rendering, touch hardware, audio, assistive technology, balance with people or playtest quality.

The original vector cover is `assets/ranh-gioi-may-original.svg`; all in-game scenery and units are drawn procedurally in the candidate canvas. The unverified Age of War cover stays in source but is excluded from the prepared artifact. The former Age of War engine block was removed, and the exact catalog ID now maps to the Ranh Giới Mây launcher.

## Rights and remaining review

The candidate does not copy source-game marks, unit names, artwork, stages, code or sounds. This statement describes the candidate files; it is not a legal opinion. Rights to the historical catalog identifier, any future public use of the source title and distribution strategy still need review. Distribution rights, browser/device QA, balance, accessibility review and novice playtest remain pending. Do not describe this candidate as a remake or faithful recreation.

## Source records

- Newgrounds creator page, uploaded 2007-10-31; accessed 2026-10-08: https://www.newgrounds.com/portal/view/408209
- Max Games Studios Google Play listing, remastered mobile edition; listing reports updated 2025-10-21; accessed 2026-10-08: https://play.google.com/store/apps/details?id=com.maxgames.ageofwar1&hl=en_US

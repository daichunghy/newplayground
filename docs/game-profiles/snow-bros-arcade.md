# Snow Bros. — Toaplan arcade original (1990)

## Reference and scope

- **Pinned reference:** Toaplan's 1990 arcade original, one-player mode. The rights-holder's [Toaplan Titles curated by Tatsujin page](https://www.toaplangames.co.jp/en/license/license-20.html) gives the fixed-screen format, controls, snow coverage, rolling snowballs, stage-clear rule, timed pumpkin enemy, lives and 50-stage campaign. Sources checked 2026-10-11.
- **Implemented scope:** an original five-wave browser adaptation using `nguoi-tuyet-snow-bros`. It is not a 50-stage conversion and includes none of Toaplan's sprites, tile maps, music, animation or stage layouts.

## Play model in this build

- **Goal and loop:** move and jump around a fixed arena. A snow shot needs three hits in this adaptation to freeze an enemy. Stand within range and keep firing to kick the frozen foe; the ball rolls across the platform, removes foes it hits and can start another ball when it hits a frozen enemy. Clear every foe to open the next wave; clear wave 5 to win.
- **Failure and restart:** touching an unfrozen foe or the pumpkin removes one of three lives. After a short invulnerability interval, play resumes at the lower-left. Zero lives ends the run. `LẠI` or `R` starts a new wave-1 run; `P`/Escape or `DỪNG` pauses.
- **Movement and fire:** arrows/A-D move, Space jumps, Up/W aims upward, Down/S aims downward and held `X`/`J` throws or kicks. Buttons and board touch use Pointer Events. The built-in five-area course introduces raised platforms in later waves; stage-specific platform rectangles and enemy counts vary.
- **Threat and items:** a 52-second local timer brings in an invincible pumpkin that pursues the player. Its exact appearance timer is not specified on the reference page; 52 seconds is an adaptation value. A small generated chance drops a speed potion worth temporary speed and points. Reference speed, snowpower, range and green-form potions, the letter/SNOW bonus, boss intervals, exact point awards and lives/continue tables are not included.
- **Screen and HUD:** fixed 9:8 playfield with layered blue snow scenery, platform silhouettes, snow accumulation/frozen ball states, compact score/wave/lives/record, and a visible timer strip. Mobile uses the same fixed arena with wide touch controls; the board is not forced into a landscape crop.
- **Timing/AI:** capped elapsed-time simulation; enemies walk toward the player while staying on their current platform. Shots, freeze intervals, pumpkin pursuit and ball travel are time-based. No measured-device FPS or original speed values are claimed.
- **Persistence and lifecycle:** best score and best wave persist in `np_snow_bros_slice_record_v1`. The current campaign itself does not autosave. Each launch's listeners and animation frame belong to `NP_GameSession` and are removed on close/replacement; storage failures are caught.

## Deliberate gaps

The reference has 50 stages and a richer item/bonus system. This adaptation has five waves, three snow hits to freeze, an approximate timer, one speed drop, no authentic stage boards or enemy classes, no boss every tenth level, no true 8-way movement, no two-player mode and no original art/audio. The snow-covered-to-ball-to-roll interaction and fixed-screen progression are modeled; this is not a full arcade reproduction.

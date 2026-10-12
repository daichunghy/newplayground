# Pac-Man — 1980 maze-chase adaptation

## Reference and scope

- **Pinned reference:** Namco's original 1980 arcade maze-chase, one player. The rights holder identifies the 1980 PuckMan introduction and describes its simple rules and intuitive controls on [Bandai Namco's PAC-MAN history](https://en.bandainamcoent.eu/pac-man). A [licensed PAC-MAN instruction sheet](https://www.basicfun.com/wp-content/uploads/2023/03/9530_ArcadeClassics_Pacman4C_Instructions_CustomerService.pdf), checked 2026-10-12, states the dot-clear objective, four corner power pellets, temporary frightened ghosts, level reset, life loss/reset and a 10,000-point extra life. It is evidence for core series rules, not a measurement of the original cabinet's timing.
- **Implemented scope:** an original, seeded 19×20 maze chase that repeats with increasing local speed. It uses no commercial maze, ROM, sprite, sound recording or external asset. The maze is carved procedurally from a fixed seed and includes one horizontal wrap corridor.
- **Research limit:** exact original maze, timing tables, ghost mode schedule, fruit/bonus sequence and score tables were not reverse-engineered. Local speed, staggered release, 7.5-second starting power effect, dot scores and ghost scores are adaptation values, not claimed as 1980 cabinet values.

## Play model in this build

- **Goal and loop:** steer through every dot while four maze wardens pursue. A power pellet turns them vulnerable briefly; touching one awards a doubling chain (200, 400, 800, 1,600). Clearing all dots advances the level, refills the same generated layout and raises enemy speed while shortening the frightened window. This is an endless score-chase, so there is no final campaign victory state.
- **Failure and restart:** three starting lives; a single extra life is awarded at 10,000 points, capped at four. A collision resets positions and consumes one life. Zero lives enters a visible game-over state; the score remains until the player chooses retry. Pause/resume is available from the button or P/Escape.
- **Movement and AI:** arrow/WASD input is buffered at tile centers and can reverse during a corridor. Touch D-pad buttons and canvas swipe use the same direction queue. Player speed is 128 px/s. Four wardens use shortest-path maze routing with distinct chase targets (direct, three-tile lead, reflected flank, and nearby-corner retreat); frightened movement chooses a longer escape route. Their opening release is staggered by 1.75 seconds per ghost. Enemy speed is 88 px/s initially, rises by 3 per level and caps at 116. Movement and frightened time use capped delta-time, independent of display refresh rate.
- **Screen and HUD:** 19:20 maze view; dots, power pellets, walls, characters and touch controls are drawn from original canvas geometry. Desktop places the 48px directional pad beside the tall board; mobile stacks it beneath a width-fit board. The HUD shows score, local record, level, remaining dots and life pips, with one short keyboard hint.
- **Persistence and lifecycle:** best score and best level persist under versioned key `np_pacman_maze_record_v1`; a storage exception does not block play. Visibility loss pauses the game and clears swipe tracking. RAF and all input/visibility listeners belong to `NP_GameSession`; closing/replacing the game cancels them.

## Deliberate gaps

This adaptation does not reproduce the original maze, exact ghost personalities/timing, fruit bonuses, intermissions, cabinet speed tables, sounds or proprietary art. It has not been tested on physical iOS/Android hardware or through an accessibility study. The per-title QA report records the browser run and remaining limits.

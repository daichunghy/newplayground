# Bắn Bi Ve: research and candidate scope

Research reviewed 2026-10-07. Candidate build: `ban-bi-ve-1`. This is an original solo-first marble-flick game with optional local multiplayer, not a recreation of a specific historical game edition.

## What the sources support

- **Saigon Giai Phong Sports, “Tết chơi đánh bi” (2017).** The first-person account says rules differ between countries and regions, then describes one “bi lồ” variant: players put marbles in a roughly 1 m circle, establish turn order with a line shot, and shoot from a marked distance to knock marbles out. A marble hit from another player can be claimed; play continues until the circle is empty. The article also documents thumb-flick and finger-flick techniques. This is a regional recollection, not a universal rulebook: https://thethao.sggp.org.vn/tet-choi-danh-bi-post368405.html
- **VnExpress, “Những trò chơi của trẻ em Việt ngày xưa” (2014).** Its photo caption corroborates that Vietnamese childhood “bắn bi” involved shooting opponents’ marbles as prizes and calls out movement and observation: https://vnexpress.net/ky-uc-tuoi-tho-voi-nhung-tro-choi-con-tre-ngay-xua-2945851-p2.html
- **Tạp chí Văn Hóa & Phát Triển, syndicated by Báo Mới, “Trò chơi của trẻ em ngày xưa” (2022).** It distinguishes Vietnamese `bi lỗ` (a shallow hole and possible agreed penalties), `bi hào` (a rectangular target with a local double-reward rule), and other variants. This supports keeping the candidate’s ring rules narrow and leaving hole penalties and bonus rules out: https://baomoi.com/tro-choi-cua-tre-em-ngay-xua-c42494175.epi
- **Museum Sonobudoyo Yogyakarta, “Marbles: A Timeless Traditional Game of Skill and Sportsmanship” (2026).** A museum account describes a comparable circle-and-flick variant and notes regional variation. This is cross-cultural corroboration for the broad physical loop, not evidence for a Vietnamese edition: https://sonobudoyo.jogjaprov.go.id/en/tulisan/read/kelereng-nekeran-atau-gundu--permainan-sederhana-yang-mengajarkan-ketangkasan-dan-sportivitas

No exact product, platform, or historic Bắn Bi Ve build appears in the catalog. The source-reviewed rules above do not establish fixed player counts, exact distances, one universal shot-turn rule, shooter-marble fouls, or a standard scoring system. Those details vary or are not fully stated in the available account.

## Chosen casual scope

- One short, solo match against a computer opponent by default, or a 2–4 player hot-seat match on one device. Each player contributes three target marbles to the same shared chalk ring.
- Players take turns pulling their shooter marble back and releasing it to flick toward the ring. Mouse, touch, and keyboard aiming are supported.
- A target marble whose center crosses out of the ring is captured for one point. Capturing at least one marble keeps the turn; a miss passes it to the next player. These turn details are product choices for a compact casual default because the Vietnamese sources do not fully specify turn rotation.
- The round ends when the ring is empty. Highest capture count wins; equal scores share the win. No stakes, inventory, currency, hole penalty, double reward, campaign, shop, or unlock system.
- A shooter is reset to the active player’s own outside mark after each completed turn. This deliberately keeps input immediate and avoids choosing a penalty for a shooter marooned in a target area.
- The computer always plays as player 2 in solo mode. Its deterministic policy tests at most 18 shots: three nearest target marbles, three small angle offsets, and two fixed power settings. Each candidate advances a private copy for at most 420 fixed physics steps; the selected shot prioritizes captures, then avoids pushing the remaining marbles outward. It commits only through the ordinary validated `shoot` path. After its first scoring shot, it takes any rule-granted extra shot at low power away from the ring, then yields on that legal miss. This bounded policy keeps the existing capture-retains-turn rule while giving the human more counterplay than a perfect-shot chain.
- Fixed-step local physics uses 120 Hz updates, damped collisions, and deterministic seeded placement. Friction and restitution are candidate feel parameters, not reference measurements.

## Originality and content

The module uses newly written code and canvas-drawn geometric marbles, highlights, chalk lines, and playground texture. Its catalog cover is the separate project-authored vector `assets/marble-ring-original.svg`, recorded in the asset manifest. It imports no external image, sound, font, or game code. Folk-game mechanics are used as the design reference; there is no commercial parity or historical-edition claim.

## Verification and limits

The candidate branch recorded 21 focused checks in `docs/qa/ban-bi-ve-local-checks-20261007.txt`. Integration adds a catalog launch and cleanup route check in `tests/ban-bi-ve-ui.test.cjs`; this solo iteration adds legal/repeatable bounded CPU-shot coverage and solo/local UI flow checks. Coverage includes seeded determinism, collision/capture/turn flow, win/tie, save validation, keyboard and pointer input, pause/reopen, interrupted frames, and global-listener/RAF cleanup.

Real-browser rendering, mobile touch feel, physical-device performance, screen-reader review, and human balance/playtest have not been run. Distribution-rights review of any historic art or brand treatment is not applicable to these original procedural visuals; release readiness remains pending other project gates.

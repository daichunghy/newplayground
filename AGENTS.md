# AGENTS.md — Agent & Codex Guidance for NewPlayground

Welcome! This repository is **NewPlayground** — a zero-friction, client-first collection of web games that run entirely in the browser without installations, accounts, or build steps.

This document guides AI coding assistants (OpenAI Codex, GitHub Copilot, Claude Code, and autonomous agents) to interact with and extend this codebase reliably.

---

## 1. Project Overview & Architecture

- **Stack**: Pure HTML5, Modern Vanilla CSS (Tokens & Flex/Grid), and Vanilla JavaScript (ES6+ Modules / Canvas 2D / Web Audio API).
- **Zero Build Step**: No webpack, vite, or npm compilation required. All files are served directly as static assets.
- **Client-First & Offline-Ready**: Fast initial load (< 20 MB total assets, ~1 MB code), local state persisted via `localStorage`.
- **Typography Standard**: All UI, HUD, and documentation strictly use **Calibri** font stack (`'Calibri', 'Inter', -apple-system, sans-serif`).

---

## 2. Directory Structure

```text
.
├── index.html               # Main single-page application shell, HUD, modal, and game viewport
├── style.css                # Global styling, themes, game canvas overlays, responsive layout (Calibri)
├── app.js                   # Application controller, router, modal manager, and UI state
├── games-data.js            # JavaScript catalogue definition of all games
├── data/
│   └── games.json           # Raw JSON metadata for all games in the platform
├── scripts/
│   ├── engines.js           # Core canvas game engines (Ca Phố, Kẹt Xe, Cà Phê, etc.)
│   ├── engines-classics.js  # Classic retro engines (Xếp gạch, Cờ tướng, Caro, etc.)
│   ├── engines-popcap.js    # Popcap-style arcade engines (Zuma, Bắn trứng, Kim cương, etc.)
│   ├── engines-retro50.js   # Retro 50 series game engines
│   ├── game-feel.js         # Juice & game feel utilities (screenshake, particles, audio chimes)
│   └── download_game_assets.py # Portable asset downloader (Kenney CC0 assets)
├── assets/                  # CC0 sprites, UI textures, sounds, and cover art
│   ├── sprites/             # Food, cards, generic items
│   ├── ui/                  # Clean Kenney UI buttons, dividers, arrows
│   ├── audio/               # Low-latency Web Audio sound effects (.ogg)
│   └── ASSET_MANIFEST.json  # Comprehensive provenance and attribution manifest
├── docs/                    # Research specs, per-game coverage, architecture and QA
└── .github/workflows/       # Automated GitHub Pages CI/CD pipeline
```

---

## 3. How to Run & Verify

Because this is a pure static web app, any static HTTP server works:

```bash
# Python 3 built-in server (recommended for Codex & cloud sandboxes)
python3 -m http.server 8080

# Or using Node
npx serve . -p 8080
```

Then navigate to `http://localhost:8080` or use your cloud sandbox port forward.

---

## 4. Coding Conventions for Codex & Agents

1. **Keep Engine Logic Decoupled**:
   - Separate game simulation state (ticks, positions, scores) from rendering.
   - Use `requestAnimationFrame` with delta-time (`dt`) calculation for smooth 60 FPS gameplay.
2. **Audio & Asset Fallbacks**:
   - Synthesize fallback procedural sounds using Web Audio API (`AudioContext`) if an `.ogg` file fails to load.
   - Draw procedural canvas shapes if image assets are unavailable.
3. **No External CDN Dependencies without Reason**:
   - Maintain pure vanilla JavaScript without heavy external runtimes unless specified.
4. **Mobile & Touch Responsiveness**:
   - Use Pointer Events for pointer-driven games; handle `pointercancel`, pointer capture, blur and cleanup. Do not bind touch and click paths that trigger the same action twice.
   - Keep primary touch targets ≥ 44px and preserve a useful game-board area at supported viewport sizes.
5. **Calibri Typography**:
   - Maintain `Calibri` as the primary font family for any canvas text renders and UI elements.

## 5. Game-specific research and implementation

Before changing a catalog title, identify the exact reference edition/build, platform and mode. Record source URL, observation date, rules, board/layout, HUD, input and timing, level/round progression, win/loss and restart behavior in the per-game QA/coverage record. Do not infer fidelity from the catalog title or successful routing.

Each game needs its own documented acceptance scope and game-specific rules. Shared utilities and components are welcome where behavior is genuinely shared; changing the title on a genre archetype does not make a faithful game. Keep the existing vanilla HTML/CSS/JavaScript, Canvas/DOM, router and `NP_GameSession` architecture unless a concrete requirement cannot reasonably fit it.

Choose the visual hierarchy for the referenced game. Do not force a common palette, card grid, HUD density, camera or canvas framing across genres. Give the playfield enough area and use concise labels/icons for essential state and decisions. Keep the reference's functional relationships while adapting dimensions for desktop and mobile.

Read [`docs/GAME_DEVELOPMENT_GUIDELINES.md`](./docs/GAME_DEVELOPMENT_GUIDELINES.md) before implementing or accepting a game. Use [`docs/GAME_COVERAGE.md`](./docs/GAME_COVERAGE.md) to record the per-title status and [`docs/GAMEPLAY_COMPLETENESS_AUDIT.md`](./docs/GAMEPLAY_COMPLETENESS_AUDIT.md) for router/fallback inventory.

## 6. Acceptance and evidence

- Keep deterministic model tests separate from browser playtesting. Unit tests prove modeled rules, not visual fidelity or an end-to-end game.
- Open the title through the real router in a browser, exercise its main input, failure/win, pause/restart and at least the next level/round when progression exists. Record anything outside scope.
- Save same-viewport before/after screenshots and a short QA record under `docs/qa/<batch>/`; state actual viewport, browser, reference and exact interactions.
- Verify lifecycle cleanup, keyboard/mouse/touch behavior, local persistence, responsive geometry and relevant performance limits. Do not report checks that were not run.
- Record asset provenance per file. Use original assets, verified licenses or permission; do not copy proprietary code, sprites, audio, maps or screenshots. A reference for mechanics is not permission to reuse its assets, and a listed asset pack is not evidence that every file shares one license.
- For a final game check, run `node --test tests/*.test.cjs`, syntax checks and catalog validation after the last code change. Current test mocks are not browser playthrough evidence.

Only describe a game as accepted for the stated reference and scope when the checklist and evidence in [`docs/GAME_DEVELOPMENT_GUIDELINES.md`](./docs/GAME_DEVELOPMENT_GUIDELINES.md) are complete. List deviations, unimplemented levels/assets and unsupported devices explicitly.

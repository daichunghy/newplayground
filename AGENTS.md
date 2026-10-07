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
├── docs/                    # Technical specs, architecture designs, and 100-game catalog
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
   - Ensure canvas handles `pointerdown`, `pointermove`, and `pointerup` smoothly alongside mouse events.
   - Keep touch targets ≥ 44px.
5. **Calibri Typography**:
   - Maintain `Calibri` as the primary font family for any canvas text renders and UI elements.

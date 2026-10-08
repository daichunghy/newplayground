# Vệ Tinh Giữ Quỹ Đạo

An original, solo-first paddle-and-ball candidate for catalog work item `arkanoid-dap-gach`.

## Play

- Move with ←/→ or A/D. Move the pointer over the board or drag on touch screens to steer.
- Press Space or tap the board to launch. Press P or Escape to pause.
- Clear three short rounds with distinct fields: an open rim with side lanes, staggered crossbars, then a narrow core with wider wings. Color walls break in one hit, silver walls in two, and gold walls bounce the ball without counting toward the clear.
- Break the marked carrier wall, then catch its falling capsule to widen the paddle for eight seconds. Its lane shifts from the left side, to the lower left-center, then to the center.
- Three lives. Restart is available at any time.

## Candidate files and verification

- `model.js` contains the deterministic 120 Hz rules, three authored brick silhouettes, round cues, and round-specific capsule lanes.
- `view.js` contains the canvas renderer, input, concise HUD, and session cleanup contract. It exports `window.NP_OrbitBrick.mount(container, session, audio)`.
- `style.css`, `cover.svg`, and `index.html` provide a fully original standalone play surface and cover.
- Tests: `node --test tests/arkanoid-model.test.cjs tests/arkanoid-view.test.cjs` from the repository root.
- Local preview: serve the repository root with `python3 -m http.server 8080`, then open `/candidates/arkanoid-dap-gach/`.

The historical catalog entry does not identify a platform, release, or build. This is a small rules-inspired candidate, not a parity claim for an unknown catalog build.

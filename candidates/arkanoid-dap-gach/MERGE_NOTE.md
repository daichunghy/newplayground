# Merge note

Candidate for catalog work item `arkanoid-dap-gach`, based on integration commit `b48d39857eb8540faeb81d1e1e2d16d825468e3f`.

The standalone route is `candidates/arkanoid-dap-gach/index.html`. The mount contract is `window.NP_OrbitBrick.mount(container, session, audio)`; load `model.js` before `view.js`, and include `style.css`. Candidate art is `cover.svg`. Focused automated checks are `tests/arkanoid-model.test.cjs` and `tests/arkanoid-view.test.cjs`.

No catalog, router, shared app shell, global style, or shared asset manifest changes are included. The integration entry's target platform/build remains unidentified, so the candidate makes no parity claim.

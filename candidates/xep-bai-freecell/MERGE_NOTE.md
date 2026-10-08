# Merge note: Bốn Ô / FreeCell

- Branch: `codex/freecell-original-20261008`
- Base: `fbc03af5551b0aefcfec7b2e41501a35b884ef6c`
- Candidate page: `candidates/xep-bai-freecell/index.html`
- Scope: original model, direct playable Vietnamese view, styles, focused model/DOM-double tests, and a research/QA dossier.

The candidate branch leaves the shared catalog, router, registry, app shell, and global script loading untouched. Local integration on `codex/deep-upgrades-20261007` adds the original cover, catalog title/category, exact-ID wrapper and registry mapping, script/style loading, and full portal harness coverage. The original candidate branch remains unchanged.

The standalone page starts a fixed seeded deal immediately. The local integration is not a public preview, PR, push, or deployment. Browser/device acceptance remains pending.

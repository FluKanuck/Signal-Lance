# Signal Lance

An ex-military company of exosuit operators lives aboard a flying ship over a grim hive city. You earn your intel, build your suits around it, and drop the lance alone into the dark. Then you live with whatever comes back.

**Pillar:** Prepare in depth, deploy under pressure, watch your plan succeed or fall apart, then learn why.

## Project docs (`claude/`)

| File | What it is |
|---|---|
| [`code-agent-brief.md`](claude/code-agent-brief.md) | How we build: every coding agent reads this first |
| [`playtest-method.md`](claude/playtest-method.md) | The debrief protocol |
| [`design-lead-brief.md`](claude/design-lead-brief.md) | The design lead's role and method |
| [`signal-lance-roadmap.md`](claude/signal-lance-roadmap.md) | Strands, gates, sequence, decisions, parked ideas |
| [`signal-lance-game-shape.md`](claude/signal-lance-game-shape.md) | One-page map of the whole game |
| `signal-lance-round<N>-brief.md` | The brief for each round |
| `signal-lance-round<N>.md` | The status report written after each round |
| [`signal-lance-chore-pages.md`](claude/signal-lance-chore-pages.md) | Chore brief: GitHub Pages full-screen copy |

[`STATUS.md`](STATUS.md) is the Round 1 status report, from when the game was a single HTML file.

**Current state:** Round 13, "Loud gets company", is written but not built. See the roadmap.

## Code

| Path | What it is |
|---|---|
| `signal-lance/` | TypeScript + Vite project. `src/sim/` holds the pure rules, `src/view/` holds rendering and input, and `src/tune.ts` holds the tuning values. `NOTES.md` is the TWEAK LOG and ASSUMPTIONS |
| `signal-lance/dist/signal-lance.html` | The built, self-contained game |
| `docs/` | GitHub Pages copy of the build, written by `npm run build` |
| `legacy/signal-lance.html` | The single-file game from before Round 6, kept for reference |
| `mods/signal-lance/` | Claude Code mod: round band, live runner pane, balance sweeps. Install with `/plugin install signal-lance --marketplace FluKanuck/Signal-Lance` ([details](mods/signal-lance/README.md)) |
| `mods/flu-statusline/` | Claude Code mod: colour-coded status line (repo/branch, context, 5h and weekly usage with resets). `/plugin install flu-statusline --marketplace FluKanuck/Signal-Lance` |

```sh
cd signal-lance
npm ci
npm run dev     # local dev server
npm run check   # typecheck
npm run build   # build dist/ and docs/index.html
npm run sim     # headless runner
```

**Play:** https://flukanuck.github.io/Signal-Lance/ (served by GitHub Pages from `main`, folder `/docs`).

This code was imported from [`FluKanuck/Prototype`](https://github.com/FluKanuck/Prototype) (branch `claude/signal-lance`) at build `r12-s1`.

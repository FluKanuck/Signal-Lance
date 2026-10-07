# Signal Lance mod (Claude Code)

A band above the prompt, a live runner pane and headless balance sweeps, for Claude Code sessions opened in this repo.

## Install

In a Claude Code terminal session:

```
/plugin install signal-lance --marketplace FluKanuck/Signal-Lance
```

Answer `y` to add the marketplace, then pick the user scope. It also loads in the desktop app's Code tab once installed.

## What you get

**The band** (above the prompt, refreshed after every turn):
`◆ R18 Fit for the job ●●○ r18-s2 · next: THERMAL · main ✓ · ⚙ 120/240 [Runner]`
Round and title from the newest brief, checkpoint dots, the BUILD tag, the next step, branch and uncommitted files, and any run in progress.

**Commands**
| Command | What it does |
|---|---|
| `/sl` | Refresh the band and open the runner pane |
| `/sl-balance item mortar.mortar.shells=4,6,8` | Base vs each value of an item row field (`--item`) |
| `/sl-balance tune MORTAR_DMG=1,2` | Base vs each value of a TUNE key (`--set`) |
| `/sl-balance fit scout,line,brawler` | Hangar templates or build codes side by side (`--fit`) |
| `/sl-sim --fit scout --mission bounty` | One live run with any runner flags |

Add `--contracts N` (default 60, about 0.3 s each) and any other runner flags to the end. Every variant plays the same seeds, three at a time.

**The runner pane** fills in as each contract finishes: win-rate bar per variant (green ≥60%, amber 40–60%, red below), its ±95% margin, the change against the base row (`~` = within noise), contracts completed, suits lost per hunt, what found the lance first, and any runner FLAG lines. Stop, Run again and Copy summary buttons.

**For Claude**: `balance` starts a run and `balance_results` reads it, so you can just ask "is the Hot core too strong?" and Claude can run the sweep itself.

## Needs

`npm ci` done in `signal-lance/`, and the runner flags `--json`, `--item` and `--from` (in `scripts/sim.ts` since 2026-10-06).

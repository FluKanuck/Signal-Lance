# flu-statusline (Claude Code mod)

A two-row powerline status line under the prompt, in the spirit of ccstatusline, built from Claude Code's own figures (no API calls, no script).

```
 ctx ████░░░░░░░░ 15% 155k/1.0M  5h █░░░░░░░░░░░ 11%  4h29m  wk ████░░░░░░░░ 38%  19h09m 
  Signal Lance · main ±15   Opus 5.5   12m $3.09   Q:\Signal Lance 
```

**Row 1, the meters**

| Block | Shows | Colour |
|---|---|---|
| `ctx` | context window used, tokens / window | green <50%, amber <80%, red ≥80% |
| `5h` / `wk` | 5-hour and weekly usage, time to reset | same; amber `↑N ahead` when you're N points ahead of an even burn, red `⚠ cap in …` when you'd hit 100% before the reset at this pace (only from 30% used, so one busy start doesn't cry wolf) |

**Row 2, where you are**: repo and branch (`✓` clean, `±N` changed files, `↑ahead ↓behind`), model, session time and cost, folder.

Bars widen on wide terminals. On a narrow one the lowest-priority blocks drop first (folder, session, model, weekly), and a block never splits mid-word. The mod leaves room for the engine's mode pill (`⏵⏵ bypass permissions on`) drawn to its left. While Claude works, `esc to interrupt` stays at the end of row 2. Usage blocks appear only on a Claude subscription, after the first reply. Colours live in `PAL` at the top of `hooks/logic.ts`.

## Needs

A Nerd Font in the terminal (the arrows and icons). JetBrainsMono Nerd Font is what it's tuned on; in VS Code set `terminal.integrated.fontFamily`.

## Install

```
/plugin install flu-statusline --marketplace FluKanuck/Signal-Lance
```

Draws in the terminal and the desktop Code tab. In VS Code's Claude panel it falls back to a plain-text status entry. Remove any `statusLine` entry in your settings (ccstatusline etc.) so only this one shows.

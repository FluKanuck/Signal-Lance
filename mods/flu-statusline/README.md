# flu-statusline (Claude Code mod + status line)

A two-row powerline status line above Claude Code's footer, in the spirit of ccstatusline.

```
 ctx ████░░░░░░░░ 16% 156k/1.0M  5h █░░░░░░░░░░░ 11%  4h29m  wk ████░░░░░░░░ 38%  19h40m 
 ⏵⏵ BYPASS   Signal Lance · main ±4   Opus 5.5 · medium   12m $3.10   Q:\Signal Lance 
```

**Row 1, the meters**

| Block | Shows | Colour |
|---|---|---|
| `ctx` | context window used, tokens / window | green <50%, amber <80%, red ≥80% |
| `5h` / `wk` | 5-hour and weekly usage, time to reset | same; amber `↑N ahead` when you're N points ahead of an even burn, red `⚠ cap in …` when you'd hit 100% before the reset at this pace (only from 30% used, so one busy start doesn't cry wolf) |

**Row 2, where you are**

| Block | Shows |
|---|---|
| mode | `⏵⏵ BYPASS` red, `⏵⏵ auto` purple, `⏵⏵ accept edits` amber, `⏸ plan` green, `◇ ask` slate |
| git | repo · branch, `✓` clean or `±N` changed files, `↑ahead ↓behind` |
| model | model and reasoning effort |
| session | time and cost |
| folder | last two parts of the working directory |

Bars widen on wide terminals; on a narrow one the lowest-priority blocks drop first (folder, session, model, weekly) and the mode block stays. Colours live in `PAL` / `MODES` at the top of `hooks/logic.ts`.

## How it's built

Two halves sharing `hooks/logic.ts`:

- **`statusline/statusline.ts`**, the line itself. Claude Code's `statusLine` setting runs it with the session's JSON on stdin; it prints two ANSI rows. That slot sits above the footer, where a mod can't draw.
- **The mod** (`hooks/register.tsx`) only notes the permission mode, which the statusLine JSON leaves out: it reads it from classic hook inputs and live from the footer's hint as shift+tab cycles, and writes it to `~/.claude/flu-statusline/mode-<session id>` for the script.

## Needs

- Node 23.6+ (runs the `.ts` directly).
- A Nerd Font in the terminal (arrows and icons). Tuned on JetBrainsMono Nerd Font; in VS Code set `terminal.integrated.fontFamily`.

## Install

```
/plugin install flu-statusline --marketplace FluKanuck/Signal-Lance
```

then in `~/.claude/settings.json` (replacing any ccstatusline entry), pointing at this folder in your clone:

```json
"statusLine": { "type": "command", "command": "node \"<clone>/mods/flu-statusline/statusline/statusline.ts\"", "refreshInterval": 5 }
```

Without the mod the line still draws, just with no mode block.

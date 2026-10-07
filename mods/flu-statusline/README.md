# flu-statusline (Claude Code mod)

A colour-coded status line under the prompt, in the spirit of ccstatusline, built from Claude Code's own figures (no API calls, no script).

```
⎇ Signal-Lance:main ✓ │ ◆ Opus 5.5 │ ctx ▰▰▱▱▱ 42% 84k/200k │ 5h ▰▰▱▱▱ 37% ⟳2h00m │ wk ▰▰▰▱▱ 61% ⟳3d4h │ $1.23 · ⏱ 47m
```

| Segment | Shows | Colour |
|---|---|---|
| `⎇ repo:branch` | repo folder, branch, `✓` clean or `±N` changed files, `↑ahead ↓behind` | dirty amber, behind red |
| `◆ model` | the session's model | |
| `ctx` | context window used, tokens / window | green <50%, amber <80%, red ≥80% |
| `5h` / `wk` | 5-hour and weekly usage, `⟳` time to reset | same, bumped to amber `↯+N` when you're N points ahead of an even burn, red `⚠cap in …` when you'd hit 100% before the reset at this pace |
| `$ · ⏱` | session cost and time | cost amber past $10 |

On a narrow terminal the lowest-priority segments drop first (session, model, weekly), keeping git, context and 5h. While Claude works or you're typing, the engine's own hint (`esc to interrupt`…) stays on the right. Usage segments appear only on a Claude subscription, after the first reply.

## Install

```
/plugin install flu-statusline --marketplace FluKanuck/Signal-Lance
```

Draws in the terminal and the desktop Code tab. In VS Code's Claude panel it falls back to a plain-text status entry. If you still have ccstatusline set as your `statusLine` in settings, both show; remove that entry to keep just this one.

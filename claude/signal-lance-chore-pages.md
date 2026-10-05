# Signal Lance: Chore brief — "No grey bar"

Read claude/code-agent-brief.md, then do this chore. It is **not a round**: no gameplay, TUNE, sim or debrief changes. Do it on its own, or before Round 7 starts. Don't mix it into a round.

## GOAL
Jamie can play the latest build full-screen on his phone from a home-screen icon, with no Claude viewer bar and no browser bars. The artifact URL keeps working exactly as now.

## CHANGE
1. **Pages folder.** At the repo root of `FluKanuck/Prototype` (branch `claude/signal-lance`), add `docs/`. After `npm run build`, the built file is also copied to `docs/index.html` (add the copy to the build script, so a normal build keeps both in sync). Commit `docs/` with every build from now on.
2. **Full-screen tags.** In the page `<head>` (source template, so it survives builds):
   - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">` (merge with the existing viewport tag)
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="mobile-web-app-capable" content="yes">`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
   - `<meta name="apple-mobile-web-app-title" content="Signal Lance">`
   - `<link rel="manifest" href="manifest.webmanifest">`
3. **Manifest.** Add `docs/manifest.webmanifest`: name and short_name "Signal Lance", `start_url` ".", `display` "fullscreen", `orientation` "landscape", plain dark `background_color` and `theme_color`. No icon this time (art is still forbidden); the phone's default is fine. On the artifact the manifest link is harmless if it doesn't load.
4. **Keep the top 56px clear** as now, since the artifact link still has the viewer bar. Respect safe-area insets on notched phones so nothing sits under the notch in full-screen.
5. **Turn on Pages.** If you can, use `gh` to enable Pages from branch `claude/signal-lance`, folder `/docs`. If not, give Jamie the one-line steps: repo Settings → Pages → Source: Deploy from a branch → `claude/signal-lance` / `docs`.
6. Republish the build to the artifact URL as usual.

## NOT IN THIS CHORE
- GitHub Actions or any CI workflow (deploying from a branch folder needs none)
- Service workers, offline mode, icons, splash screens, art
- Any gameplay, TUNE, layout or HUD change beyond the safe-area padding

## DONE
Report in 3 lines max: the Pages URL, the steps to add it to the home screen on Jamie's phone, and anything rough. Log a "chore" row in `NOTES.md`. No status report needed.

import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { asMode, modeFile, modeFromHint } from './logic.ts'

// The status line itself is statusline.ts, run by Claude Code's `statusLine` setting (it draws above the footer,
// where a mod can't). Its input carries everything but the permission mode, so this mod's one job is to note the
// mode where the script can read it: <claude dir>/flu-statusline/mode-<session id>.

const file = atom({ plugin: 'flu-statusline', key: 'file' } as const, '')
const mode = atom({ plugin: 'flu-statusline', key: 'mode' } as const, '')

async function noteMode($: any, m: string | null) {
  const path = await read($, file)
  if (!m || !path || m === (await read($, mode))) return
  await update($, mode, () => m)
  try { await $.fs.write(path, m) } catch { /* the script just shows no mode block */ }
}

// every classic hook input names the session, its transcript (so the claude dir) and the mode
async function fromHookInput($: any, e: any, next: any) {
  if (e?.transcript_path && e?.session_id) await update($, file, () => modeFile(e.transcript_path, e.session_id))
  await noteMode($, asMode(e?.permission_mode))
  return next(e)
}

export const register: Register = on => {
  on('classic.SessionStart', fromHookInput)
  on('classic.UserPromptSubmit', fromHookInput)
  on('classic.PostToolUse', fromHookInput)

  // shift+tab changes the hint line at once; the status line re-runs on a mode change, 300 ms later
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    await noteMode($, modeFromHint(e.props.hint))
    return next(e)
  })
}

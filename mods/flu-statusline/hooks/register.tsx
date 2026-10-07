import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { fit, parseGit, plain, segments, usageFrom } from './logic.ts'

const git = atom({ plugin: 'flu-statusline', key: 'git' } as const, null)
const usage = atom({ plugin: 'flu-statusline', key: 'usage' } as const, null)
const model = atom({ plugin: 'flu-statusline', key: 'model' } as const, '')
const now = atom({ plugin: 'flu-statusline', key: 'now' } as const, 0)

const TICK_MS = 30_000   // countdowns and git refresh

async function refreshGit($: any) {
  try {
    const cwd = await $.session.cwd()
    const top = await $.process.run(['git', '-C', cwd, 'rev-parse', '--show-toplevel'], { timeoutMs: 4000 })
    if (top.exitCode !== 0) { await update($, git, () => null); return }
    const st = await $.process.run(['git', '-C', cwd, 'status', '--porcelain=v2', '--branch'], { timeoutMs: 4000 })
    const info = parseGit(st.stdout, top.stdout.trim())
    await update($, git, () => info)
  } catch { /* not a repo, or git missing: leave the segment out */ }
}

async function refreshUsage($: any) {
  try {
    const u = usageFrom(await $.session.usage())
    await update($, usage, () => u)
    const m = await $.session.model()
    await update($, model, () => String(m ?? ''))
  } catch { /* keep the last reading */ }
}

/** Surfaces without a drawable hint row (VS Code's panel, mobile) get the plain-text status entry instead. */
async function mirrorPlain($: any) {
  const surface = await $.ui.surface().catch(() => null)
  if (surface === 'terminal' || surface === 'desktop' || surface == null) return
  const segs = segments(await read($, git), await read($, usage), await read($, model), await $.clock.now())
  $.ui.status(plain(segs))
}

async function tick($: any) {
  await update($, now, () => Date.now())
  await refreshGit($)
  await refreshUsage($)
  await mirrorPlain($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    void tick($)
    $.clock.every(TICK_MS, () => { void tick($) })
    return started
  })

  // the engine pushes context / rate-limit / cost changes here: no polling needed for those
  on('session.measure', async ($, e, next) => {
    await update($, usage, () => usageFrom(e))
    await update($, now, () => Date.now())
    void mirrorPlain($)
    return next(e)
  })

  // branch and dirty count move with tool calls; refresh once the turn settles
  on('turn.complete', async ($, e, next) => {
    void refreshGit($)
    return next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    const t = (await read($, now)) || Date.now()
    const all = segments(await read($, git), await read($, usage), await read($, model), t)
    if (!all.length) return next(e)
    const cols = (e.viewport?.columns ?? 120) - 2
    const hint = e.props.isWorking || e.props.isDraft ? e.props.hint : ''
    const room = hint ? cols - hint.length - 3 : cols
    const shown = fit(all, Math.max(20, room))
    return (
      <Box flexDirection="row">
        {shown.map((s, i) => (
          <Box key={s.key} flexDirection="row">
            {i > 0 ? <Text dimColor> │ </Text> : null}
            {s.parts.map((p, k) => (
              <Text key={`${s.key}${k}`} color={p.color} dimColor={p.dim} bold={p.bold}>{p.text}</Text>
            ))}
          </Box>
        ))}
        {hint ? <Text dimColor wrap="truncate-end">{'   '}{hint}</Text> : null}
      </Box>
    )
  })
}

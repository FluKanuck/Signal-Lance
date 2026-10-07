import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { G, PAL, fit, parseGit, pillWidth, plain, rows, usageFrom } from './logic.ts'
import type { Block } from './logic.ts'

const git = atom({ plugin: 'flu-statusline', key: 'git' } as const, null)
const usage = atom({ plugin: 'flu-statusline', key: 'usage' } as const, null)
const model = atom({ plugin: 'flu-statusline', key: 'model' } as const, '')
const cwd = atom({ plugin: 'flu-statusline', key: 'cwd' } as const, '')
const now = atom({ plugin: 'flu-statusline', key: 'now' } as const, 0)

const TICK_MS = 30_000   // countdowns and git refresh

async function refreshGit($: any) {
  try {
    const dir = await $.session.cwd()
    await update($, cwd, () => String(dir ?? ''))
    const top = await $.process.run(['git', '-C', dir, 'rev-parse', '--show-toplevel'], { timeoutMs: 4000 })
    if (top.exitCode !== 0) { await update($, git, () => null); return }
    const st = await $.process.run(['git', '-C', dir, 'status', '--porcelain=v2', '--branch'], { timeoutMs: 4000 })
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

async function current($: any, columns: number) {
  return rows({
    git: await read($, git), usage: await read($, usage), model: await read($, model),
    cwd: await read($, cwd), now: (await read($, now)) || Date.now(), columns,
  })
}

/** Surfaces without a drawable hint row (VS Code's panel, mobile) get the plain-text status entry instead. */
async function mirrorPlain($: any) {
  const surface = await $.ui.surface().catch(() => null)
  if (surface === 'terminal' || surface === 'desktop' || surface == null) return
  $.ui.status(plain(await current($, 120)))
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
    // the engine draws the mode pill ("⏵⏵ bypass permissions on ·") to our left, in the same row
    const cols = (e.viewport?.columns ?? 120) - 2 - pillWidth(e.props.hint)
    const all = await current($, cols)
    if (!all.length) return next(e)
    // only the hint worth a column while Claude works; the shift+tab reminder is noise here
    const hint = e.props.isWorking ? /esc to interrupt/.exec(e.props.hint)?.[0] ?? '' : ''

    // a block never breaks: a row too narrow moves whole blocks down instead of splitting words
    const block = (b: Block, nextBg?: string) => (
      <Box key={b.key} flexDirection="row" flexShrink={0}>
        <Text backgroundColor={b.bg}> </Text>
        {b.cells.map((c, k) => (
          <Text key={String(k)} backgroundColor={b.bg} color={c.fg ?? PAL.fg} bold={c.bold} wrap="truncate-end">{c.text}</Text>
        ))}
        <Text backgroundColor={b.bg}> </Text>
        <Text color={b.bg} backgroundColor={nextBg}>{G.sep}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column" flexShrink={1}>
        {all.map((row, r) => {
          const last = r === all.length - 1
          const kept = fit(row, Math.max(20, last && hint ? cols - hint.length - 2 : cols))
          return (
            <Box key={`row${r}`} flexDirection="row" flexWrap="wrap">
              {kept.map((b, i) => block(b, kept[i + 1]?.bg))}
              {last && hint ? <Text dimColor wrap="truncate-end">{'  '}{hint}</Text> : null}
            </Box>
          )
        })}
      </Box>
    )
  })
}

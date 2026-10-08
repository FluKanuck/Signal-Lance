// Signal Lance QA panel: the watch pane (claude/signal-lance-qa-harness.md, step 2b). Tails qa-runs/<batch>/live.jsonl
// and shows one row per tester; pick a row to follow that tester's actions, thoughts, findings and latest screenshot.
// Pause / Stop write qa-runs/<batch>/PAUSE and STOP (non-empty = on), which the lead checks before each spawn.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { emptyWatch, fold, header, parseTail, rowText, sevText } from './logic.ts'

const watch = atom({ plugin: 'signal-lance-qa', key: 'watch' } as const, null)
const follow = atom({ plugin: 'signal-lance-qa', key: 'follow' } as const, '')
const paused = atom({ plugin: 'signal-lance-qa', key: 'paused' } as const, false)

const PANE = 'sl-qa-watch'
let ticking: any = null

async function findRoot($: any): Promise<string | null> {
  const cwd: string = String(await $.session.cwd()).replace(/\\/g, '/')
  for (const dir of [cwd, cwd.replace(/\/[^/]+\/?$/, ''), cwd.replace(/\/[^/]+\/[^/]+\/?$/, '')]) {
    if (await $.fs.exists(`${dir}/mods/signal-lance-qa/tool/qa.mjs`)) return dir
  }
  return null
}
// The batch to watch: the one named, else qa-runs/CURRENT (the lead writes it), else the newest by name
async function pickBatch($: any, root: string, asked: string): Promise<string> {
  if (asked) return asked
  const cur = (await $.fs.read(`${root}/qa-runs/CURRENT`).catch(() => '')).trim()
  if (cur) return cur
  const dirs = ((await $.fs.list(`${root}/qa-runs`).catch(() => [])) as any[]).filter(d => d.kind === 'dir').map(d => d.name as string).sort()
  return dirs.at(-1) || ''
}

async function poll($: any) {
  const root = await findRoot($); if (!root) return
  const w = await read($, watch); if (!w || !w.batch) return
  const text = await $.fs.read(`${root}/qa-runs/${w.batch}/live.jsonl`).catch(() => '')
  const { events, offset } = parseTail(text, w.offset)
  if (events.length || offset !== w.offset) await update($, watch, cur => (cur && cur.batch === w.batch ? fold(offset < cur.offset ? emptyWatch(cur.batch) : cur, events, offset) : cur))
}

async function openWatch($: any, asked = '') {
  const root = await findRoot($)
  if (!root) return 'Not in the Signal Lance repo (no mods/signal-lance-qa/tool/qa.mjs here).'
  const batch = await pickBatch($, root, asked.trim())
  if (!batch) return 'No QA batch yet (qa-runs/ is empty). Start one with the sl-qa skill.'
  const cur = await read($, watch)
  if (!cur || cur.batch !== batch) { await update($, watch, () => emptyWatch(batch)); await update($, follow, () => '') }
  await update($, paused, () => false)
  await poll($)
  if (!ticking) ticking = $.clock.every(1500, () => { void poll($) })
  await $.ui.open({ id: PANE, title: 'QA panel · ' + batch })
  return 'Watching QA batch ' + batch + '.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sl-qa-watch', description: 'Watch a QA batch: one row per tester, follow one live (optional: batch name)' })
    return next(e)
  })

  on('command.run', { command: 'sl-qa-watch' }, async ($, e) => ({ text: await openWatch($, e.args ?? '') }))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const ui: any = $.ui.resolve(e)
    const w = await read($, watch), f = await read($, follow), isPaused = await read($, paused)
    if (!w) return <Box><Text dimColor>No batch. /sl-qa-watch [batch]</Text></Box>
    const root = (await findRoot($)) ?? ''
    const flag = async (name: string, isOn: boolean) => {
      await $.fs.write(`${root}/qa-runs/${w.batch}/${name}`, isOn ? new Date().toISOString() : '') // empty = off (no delete in $.fs)
    }
    const rows = [...w.rows].sort((a, b) => (a.state === b.state ? a.id.localeCompare(b.id) : a.state === 'running' ? -1 : 1))
    const lines = e.viewport?.rows ?? 30
    const sel = f ? w.rows.find(r => r.id === f) : null
    const feed = sel ? w.feed[sel.id] || [] : []
    const room = Math.max(4, lines - (sel ? 22 : 8) - (sel ? 0 : rows.length))
    const shotFile = sel && sel.shot ? `${root}/qa-runs/${sel.shot}` : ''
    const color = (icon: string) => (icon === '⚑' ? 'warning' : icon === '⚠' ? 'error' : icon === '…' ? 'suggestion' : icon === '↯' ? 'warning' : undefined)
    return (
      <Box flexDirection="column">
        <Text bold wrap="truncate-end">{header(w)}</Text>
        <Box flexDirection="row">
          <Button key="pause" label={isPaused ? 'Resume' : 'Pause'} onPress={async () => { const p = !(await read($, paused)); await update($, paused, () => p); await flag('PAUSE', p) }} />
          <Text> </Text>
          <Button key="stop" label="Stop batch" onPress={async () => { await flag('STOP', true); await update($, paused, () => true) }} />
          {sel ? <Text> </Text> : null}
          {sel ? <Button key="all" label="All testers" onPress={async () => { await update($, follow, () => '') }} /> : null}
        </Box>
        {isPaused ? <Text color="warning">Paused: no new testers start; running ones finish their session.</Text> : null}
        <Text> </Text>
        {!sel && rows.length === 0 ? <Text dimColor>No testers yet.</Text> : null}
        {!sel ? rows.map(r => (
          <Box key={'r' + r.id} flexDirection="column">
            <Box flexDirection="row">
              <Button key={'b' + r.id} label="follow" plain onPress={async () => { await update($, follow, () => r.id) }} />
              <Text color={r.state === 'running' ? 'suggestion' : 'inactive'} wrap="truncate-end"> {rowText(r)}</Text>
            </Box>
            {r.thought ? <Text dimColor wrap="truncate-end">   … {r.thought}</Text> : null}
            {r.last ? <Text dimColor wrap="truncate-end">   ▸ {r.last}</Text> : null}
          </Box>
        )) : null}
        {sel ? (
          <Box flexDirection="column">
            <Text bold wrap="truncate-end">{rowText(sel)}</Text>
            <Text dimColor>findings {sevText(sel.sev)} · oracle {sel.oracle} · {sel.state}</Text>
            {shotFile && e.surface === 'terminal' && ui.Image
              ? <ui.Image key="shot" source={{ file: shotFile, format: 'png' }} columns={Math.min(96, Math.max(30, (e.props?.bodyColumns ?? 80) - 2))} rows={14} alt={'latest screenshot ' + sel.shot} />
              : shotFile ? <Text dimColor wrap="truncate-end">latest screenshot: {shotFile}</Text> : null}
            <Text> </Text>
            {feed.slice(-room).map((l, k) => <Text key={'f' + k} color={color(l.icon)} wrap="truncate-end">{l.icon} {l.text}</Text>)}
          </Box>
        ) : null}
      </Box>
    )
  })
}

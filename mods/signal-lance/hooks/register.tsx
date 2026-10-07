import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { BandInfo, Job, Variant } from '../types'
import {
  argvFor, bandFrom, bar, delta, foldContract, margin, newJob, planFrom, simPlanFrom,
  splitLines, summary, topChannels, winRate,
} from './logic.ts'
import type { Plan } from './logic.ts'

const band = atom({ plugin: 'signal-lance', key: 'band' } as const, null)
const job = atom({ plugin: 'signal-lance', key: 'job' } as const, null)
const lastRun = atom({ plugin: 'signal-lance', key: 'lastRun' } as const, '')

const PANE = 'sl-runner'
const PARALLEL = 3          // runner processes at once
const DEFAULT_CONTRACTS = 60

let stop = false          // module level: set by the Stop button; each variant's loop checks it and leaves (which kills its child)
let running = false

// ---------- where's the repo, and where does the round stand ----------

async function findRoot($: any): Promise<string | null> {
  const cwd: string = String(await $.session.cwd()).replace(/\\/g, '/')   // Windows paths too
  for (const dir of [cwd, cwd.replace(/\/signal-lance\/?$/i, ''), cwd.replace(/\/[^/]+\/?$/, '')]) {
    if (await $.fs.exists(`${dir}/signal-lance/scripts/sim.ts`)) return dir
  }
  return null
}

async function git($: any, root: string, args: string[]) {
  try { const r = await $.process.run(['git', '-C', root, ...args], { timeoutMs: 5000 }); return r.exitCode === 0 ? r.stdout.trim() : '' }
  catch { return '' }
}

async function refreshBand($: any): Promise<BandInfo | null> {
  const root = await findRoot($)
  if (!root) { await update($, band, () => null); return null }
  const screens = await $.fs.read(`${root}/signal-lance/src/view/screens.ts`).catch(() => '')
  const docs = ((await $.fs.list(`${root}/claude`).catch(() => [])) as any[]).map(d => d.name as string)
  const nums = docs.map(d => /^signal-lance-round(\d+)-brief\.md$/.exec(d)).filter(Boolean).map(x => Number(x![1]))
  const brief = nums.length ? await $.fs.read(`${root}/claude/signal-lance-round${Math.max(...nums)}-brief.md`).catch(() => '') : ''
  const [branch, status, head] = await Promise.all([
    git($, root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    git($, root, ['status', '--porcelain']),
    git($, root, ['log', '-1', '--format=%s']),
  ])
  const info = bandFrom({ screens, docs, brief, branch: branch || '?', dirty: status ? status.split('\n').length : 0, head, root })
  await update($, band, () => info)
  return info
}

// ---------- running the headless runner ----------

async function setVariant($: any, i: number, fn: (v: Variant) => Variant) {
  await update($, job, j => (j ? { ...j, variants: j.variants.map((v, k) => (k === i ? fn(v) : v)) } : j))
}

async function runVariant($: any, root: string, plan: Plan, i: number) {
  await setVariant($, i, v => ({ ...v, status: 'running' }))
  let carry = '', errText = ''
  try {
    const spec = plan.variants[i]
    if (!spec) return
    const child = $.process.spawn({ argv: argvFor(plan, spec), cwd: `${root}/signal-lance` })
    for await (const { stream, text } of child) {
      if (stop) break
      if (stream === 'stderr') { errText = (errText + text).slice(-400); continue }
      const cut = splitLines(carry, text); carry = cut.carry
      const flags: string[] = [], tail: string[] = []
      let v = (await read($, job))?.variants[i]
      if (!v) return
      for (const line of cut.lines) {
        const folded = foldContract(v, line)
        if (folded) { v = folded; continue }
        if (/FLAG:|WARNING:/.test(line)) flags.push(`${spec.label}: ${line.trim()}`)
        else if (line.trim() && !line.startsWith('>')) tail.push(`${spec.label} │ ${line.trim()}`)
      }
      const now = v
      await update($, job, j => (j ? {
        ...j,
        variants: j.variants.map((x, k) => (k === i ? now : x)),
        flags: [...j.flags, ...flags].slice(-12),
        tail: [...j.tail, ...tail].slice(-40),
      } : j))
    }
    await setVariant($, i, v => ({ ...v, status: stop ? 'stopped' : v.done ? 'done' : 'error', err: v.done ? undefined : errText.trim().split('\n').pop() }))
  } catch (err: any) {
    await setVariant($, i, v => ({ ...v, status: 'error', err: String(err?.message ?? err).slice(0, 200) }))
  }
}

async function startJob($: any, plan: Plan): Promise<string> {
  if (running) return 'A run is already going: watch the Signal Lance runner pane, or press Stop there first.'
  const root = await findRoot($)
  if (!root) return 'No Signal Lance repo here: open the session in the Signal-Lance clone (the folder that holds signal-lance/scripts/sim.ts).'
  running = true; stop = false
  await update($, job, () => newJob(plan, Date.now()))
  await update($, lastRun, () => JSON.stringify(plan))
  void $.ui.open({ id: PANE, title: 'Signal Lance runner' })
  void (async () => {
    try {
      let nextI = 0
      const worker = async () => { while (!stop && nextI < plan.variants.length) await runVariant($, root, plan, nextI++) }
      await Promise.all(Array.from({ length: Math.min(PARALLEL, plan.variants.length) }, worker))
      await update($, job, j => (j ? { ...j, finishedAt: Date.now(), variants: j.variants.map(v => (v.status === 'queued' ? { ...v, status: 'stopped' as const } : v)) } : j))
      const j = await read($, job)
      if (j) $.ui.toast(stop ? 'Signal Lance run stopped.' : `Signal Lance run done: ${j.title}`)
    } finally { running = false }
  })()
  return `Started: ${plan.title} · ${plan.variants.length} variant${plan.variants.length > 1 ? 's' : ''} × ${plan.contracts} contracts. Results stream into the Signal Lance runner pane.`
}


export const register: Register = on => {
  // ---------- commands and tools ----------

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sl', description: 'Signal Lance: refresh the round band and open the runner pane' })
    await $.command.register({ name: 'sl-sim', description: 'Signal Lance: run the headless runner live (any runner flags)', argumentHint: '[--contracts 60] [--fit scout] [--mission bounty] …' })
    await $.command.register({ name: 'sl-balance', description: 'Signal Lance: compare variants side by side, live', argumentHint: 'item mortar.mortar.shells=4,6,8 | tune KEY=a,b | fit scout,line,brawler [--contracts N]' })
    await $.tool.register({
      name: 'balance',
      description: 'Start a Signal Lance headless balance run that streams live into the runner pane, then returns at once. kind "item" overrides an item row value (spec "row.path=a,b,c", e.g. "mortar.mortar.shells=4,6,8"); "tune" a TUNE value (spec "KEY=a,b"); "fit" compares hangar templates or build codes (spec "scout,line,brawler"); "sim" runs once with the extra flags. Item and tune runs include an unchanged base row. Same seeds per variant. Read results with balance_results.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['item', 'tune', 'fit', 'sim'] },
          spec: { type: 'string' },
          contracts: { type: 'number', description: 'contracts per variant (default 60; ~0.3 s each)' },
          extra: { type: 'array', items: { type: 'string' }, description: 'other runner flags, e.g. ["--mission", "bounty"]' },
        },
        required: ['kind'],
      },
    })
    await $.tool.register({
      name: 'balance_results',
      description: 'The Signal Lance runner pane\'s current results: per variant win rate with its 95% margin, change against the base row and whether it clears the noise, contracts completed, suits lost per hunt, what found the lance first, runner flags, and whether it is still running.',
      inputSchema: { type: 'object', properties: {} },
    })
    void refreshBand($)
    return next(e)
  })

  on('command.run', { command: 'sl' }, async $ => {
    const info = await refreshBand($)
    await $.ui.open({ id: PANE, title: 'Signal Lance runner' })
    return { text: info ? `R${info.round} ${info.title} · ${info.build} · next: ${info.next}` : 'No Signal Lance repo in this session.' }
  })

  on('command.run', { command: 'sl-sim' }, async ($, e) => {
    return { text: await startJob($, simPlanFrom(e.args, DEFAULT_CONTRACTS)) }
  })

  on('command.run', { command: 'sl-balance' }, async ($, e) => {
    const plan = planFrom(e.args, DEFAULT_CONTRACTS)
    return { text: typeof plan === 'string' ? plan : await startJob($, plan) }
  })

  on('tool.call', { tool: 'mcp__signal-lance__balance' }, async ($, e) => {
    const i = (e.input ?? {}) as any
    const extra = [...(i.contracts ? ['--contracts', String(i.contracts)] : []), ...(Array.isArray(i.extra) ? i.extra.map(String) : [])].join(' ')
    const plan = i.kind === 'sim' ? simPlanFrom(`${i.spec ?? ''} ${extra}`, DEFAULT_CONTRACTS) : planFrom(`${i.kind} ${i.spec ?? ''} ${extra}`, DEFAULT_CONTRACTS)
    return { result: typeof plan === 'string' ? plan : await startJob($, plan) }
  })

  on('tool.call', { tool: 'mcp__signal-lance__balance_results' }, async $ => {
    const j = await read($, job)
    if (!j) return { result: 'No run yet.', isReadOnly: true as const }
    return { result: summary(j) + (running ? '\n(still running)' : ''), isReadOnly: true as const }
  })

  // keep the band honest after each turn (git, BUILD and docs may have moved)
  on('turn.complete', async ($, e, next) => {
    void refreshBand($)
    return next(e)
  })

  // ---------- the band above the prompt ----------

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const info = await read($, band)
    if (!info || e.props.hasSurvey) return next(e)
    const j = await read($, job)
    const { Box, Text, Button } = $.ui.resolve(e)
    const wide = (e.props.bodyColumns ?? 100) >= 90
    const dots = info.cpTotal ? '●'.repeat(info.cp) + '○'.repeat(Math.max(0, info.cpTotal - info.cp)) : ''
    const prog = j ? j.variants.reduce((a, v) => a + v.done, 0) : 0
    const total = j ? j.variants.reduce((a, v) => a + v.n, 0) : 0
    const isLive = !!j && !j.finishedAt
    return (
      <Box flexDirection="row" flexWrap="wrap">
        <Text color="claude" bold>◆ R{info.round}</Text>
        {wide && info.title ? <Text> {info.title}</Text> : null}
        {dots ? <Text color="success"> {dots}</Text> : null}
        <Text dimColor> {info.build}</Text>
        <Text> · next: </Text><Text color="warning">{info.next}</Text>
        <Text dimColor> · {info.branch}</Text>
        {info.dirty ? <Text color="warning"> ±{info.dirty}</Text> : <Text color="success"> ✓</Text>}
        {j ? <Text color={isLive ? 'suggestion' : 'inactive'}> · {isLive ? '⚙' : '✓'} {prog}/{total}</Text> : null}
        <Text> </Text>
        <Button key="runner" label="Runner" plain onPress={() => { void $.ui.open({ id: PANE, title: 'Signal Lance runner' }) }} />
      </Box>
    )
  })

  // ---------- the runner pane ----------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const j = await read($, job)
    const cols = e.props.bodyColumns ?? 60
    if (!j) {
      return (
        <Box flexDirection="column">
          <Text bold>Signal Lance runner</Text>
          <Text dimColor>No run yet. Try:</Text>
          <Text>  /sl-balance item mortar.mortar.shells=4,6,8</Text>
          <Text>  /sl-balance fit scout,line,brawler</Text>
          <Text>  /sl-balance tune MORTAR_DMG=1,2 --mission bounty</Text>
          <Text>  /sl-sim --contracts 60</Text>
          <Text dimColor>Or ask Claude to balance something.</Text>
        </Box>
      )
    }
    const base = j.variants[0]
    const isLive = !j.finishedAt
    const secs = Math.round(((j.finishedAt ?? Date.now()) - j.startedAt) / 1000)
    const barW = Math.max(6, Math.min(20, cols - 46))
    const labelW = Math.min(16, Math.max(5, ...j.variants.map(v => v.label.length)))
    const room = Math.max(3, (e.viewport?.rows ?? 30) - 10 - j.variants.length * 2 - j.flags.length)
    return (
      <Box flexDirection="column">
        <Text bold>{j.title}</Text>
        <Text dimColor>{j.contracts} contracts each, same seeds · {isLive ? `running ${secs}s` : `finished in ${secs}s`}</Text>
        <Text> </Text>
        {j.variants.map((v, k) => {
          const w = winRate(v), d = delta(v, base)
          const winColor = !v.hunts ? 'inactive' : w >= 0.6 ? 'success' : w >= 0.4 ? 'warning' : 'error'
          const dColor = !d ? 'inactive' : !d.isReal ? 'inactive' : d.pts > 0 ? 'success' : 'error'
          const st = v.status === 'running' ? '⚙' : v.status === 'done' ? '✓' : v.status === 'error' ? '✗' : v.status === 'stopped' ? '■' : '·'
          return (
            <Box key={`v${k}`} flexDirection="column">
              <Box flexDirection="row">
                <Text color={v.status === 'error' ? 'error' : v.status === 'running' ? 'suggestion' : 'inactive'}>{st} </Text>
                <Text bold={k === 0}>{v.label.padEnd(labelW).slice(0, labelW)} </Text>
                <Text color={winColor}>{bar(w, barW)} {String(Math.round(100 * w)).padStart(3)}%</Text>
                <Text dimColor> ±{margin(v)}</Text>
                {d ? <Text color={dColor}> {d.pts >= 0 ? '+' : ''}{d.pts}{d.isReal ? '' : '~'}</Text> : <Text> </Text>}
                <Text dimColor> {v.done}/{v.n}</Text>
              </Box>
              <Text dimColor>
                {'   '}{v.status === 'error' ? (v.err || 'runner failed') : `complete ${v.complete}/${v.done} · lost ${(v.lost / Math.max(1, v.hunts)).toFixed(2)}/hunt${topChannels(v) ? ` · found by ${topChannels(v)}` : ''}`}
              </Text>
            </Box>
          )
        })}
        {j.flags.length ? <Text> </Text> : null}
        {j.flags.map((f, k) => <Text key={`f${k}`} color="warning">⚑ {f}</Text>)}
        <Text> </Text>
        <Text dimColor>~ = within noise (95%). Colour: win ≥60% green, 40–60% amber, below red.</Text>
        {j.tail.slice(-room).map((t, k) => <Text key={`t${k}`} dimColor wrap="truncate-end">{t}</Text>)}
        <Box flexDirection="row">
          {isLive
            ? <Button key="stop" label="Stop" onPress={() => { stop = true }} />
            : <Button key="again" label="Run again" onPress={async () => {
                const p = await read($, lastRun)
                if (p) await startJob($, JSON.parse(p) as Plan)
              }} />}
          <Text> </Text>
          <Button key="copy" label="Copy summary" onPress={async () => { const now = await read($, job); if (now) await $.ui.copy({ text: summary(now), surface: e.surface }) }} />
        </Box>
      </Box>
    )
  })
}

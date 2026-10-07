// Pure helpers for the Signal Lance mod: no `$`, so the tests can call them directly.
import type { BandInfo, Job, Variant } from '../types'

// ---------- the band: where the round stands ----------

/** Reads the round, checkpoint and next step from the BUILD tag, the newest brief and whether its report exists. */
export function bandFrom(input: {
  screens: string            // src/view/screens.ts
  docs: string[]             // file names in claude/
  brief: string              // the newest round brief's text ('' if none)
  branch: string
  dirty: number
  head: string               // last commit subject
  root: string
}): BandInfo {
  const m = /BUILD\s*=\s*'(r(\d+)-s(\d+))'/.exec(input.screens)
  const build = m?.[1] ?? '?'
  const buildRound = m ? Number(m[2]) : 0
  const step = m ? Number(m[3]) : 0
  const briefs = input.docs.map(d => /^signal-lance-round(\d+)-brief\.md$/.exec(d)).filter(Boolean).map(x => Number(x![1] ?? 0))
  const round = briefs.length ? Math.max(...briefs) : buildRound
  const hasReport = input.docs.includes(`signal-lance-round${round}.md`)
  const title = /—\s*"([^"]+)"/.exec(input.brief.split('\n')[0] || '')?.[1] ?? ''
  const cps = [...input.brief.matchAll(/^###\s*Checkpoint\s*(\d+):\s*(.+)$/gm)].map(x => ({ n: Number(x[1] ?? 0), name: tidy(x[2] ?? '') }))
  const cpTotal = cps.length
  const cp = buildRound === round ? Math.min(step, cpTotal || step) : 0
  let next: string
  if (hasReport) next = 'round done: design lead chat'
  else if (buildRound < round) next = cps[0] ? `start ${cps[0].name}` : 'start the build'
  else if (cpTotal && cp < cpTotal) next = cps.find(c => c.n === cp + 1)?.name ?? `checkpoint ${cp + 1}`
  else next = 'debrief + report'
  return { round, title, build, cp, cpTotal, next, branch: input.branch, dirty: input.dirty, head: input.head, root: input.root }
}

/** "THERMAL (Jamie plays)" -> "THERMAL"; "the suit budget (Jamie plays)" -> "the suit budget". */
function tidy(s: string) { return s.replace(/\s*\(.*?\)\s*/g, ' ').trim() }

// ---------- balance specs ----------

export type Plan = { title: string; variants: { label: string; args: string[] }[]; contracts: number; extra: string[] }

/**
 * Turns what was typed after /sl-balance into runner variants. Forms:
 *   item mortar.mortar.shells=4,6,8      base + one variant per value (--item)
 *   tune MORTAR_DMG=1,2                  base + one variant per value (--set)
 *   fit scout,line,brawler               one variant per template or build code (--fit)
 * Anything after the spec is passed to every variant (e.g. --contracts 60 --mission bounty).
 */
export function planFrom(text: string, defaultContracts = 40): Plan | string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return 'Usage: /sl-balance item <row.path>=a,b,c | tune <KEY>=a,b | fit a,b,c  [--contracts N] [other runner flags]'
  const [kind = '', spec = '', ...rest] = words
  let contracts = defaultContracts
  const extra: string[] = []
  for (let i = 0; i < rest.length; i++) {
    const w = rest[i] ?? ''
    if (w === '--contracts') { contracts = Number(rest[++i]) || defaultContracts; continue }
    if (w === '--json' || w === '--check') continue
    extra.push(w)
  }
  if (kind === 'fit') {
    const fits = spec.split(',').filter(Boolean)
    if (!fits.length) return 'fit: name at least one template or build code, e.g. fit scout,line,brawler'
    return { title: `fits: ${fits.join(' vs ')}`, contracts, extra, variants: fits.map(f => ({ label: f, args: ['--fit', f] })) }
  }
  if (kind === 'item' || kind === 'tune') {
    const eq = spec.indexOf('=')
    if (eq < 1) return `${kind}: write it as ${kind === 'item' ? 'row.path=a,b,c (e.g. mortar.mortar.shells=4,6,8)' : 'KEY=a,b (e.g. MORTAR_DMG=1,2)'}`
    const path = spec.slice(0, eq), values = spec.slice(eq + 1).split(',').filter(Boolean)
    if (!values.length) return `${kind}: give at least one value after =`
    const flag = kind === 'item' ? '--item' : '--set'
    const short = path.split('.').pop()!
    return {
      title: `${kind} ${path}`, contracts, extra,
      variants: [{ label: 'base', args: [] }, ...values.map(v => ({ label: `${short}=${v}`, args: [flag, `${path}=${v}`] }))],
    }
  }
  return `Unknown kind "${kind}": use item, tune or fit.`
}

/** /sl-sim: one variant with whatever runner flags were typed. */
export function simPlanFrom(text: string, defaultContracts = 40): Plan {
  const words = text.trim().split(/\s+/).filter(Boolean)
  let contracts = defaultContracts
  const extra: string[] = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? ''
    if (w === '--contracts') { contracts = Number(words[++i]) || defaultContracts; continue }
    if (w === '--json' || w === '--check') continue
    extra.push(w)
  }
  return { title: `sim ${extra.join(' ') || '(defaults)'}`, contracts, extra, variants: [{ label: 'run', args: [] }] }
}

export function argvFor(plan: Plan, v: { args: string[] }) {
  return ['node', '--experimental-strip-types', '--no-warnings', 'scripts/sim.ts',
    '--contracts', String(plan.contracts), ...plan.extra, ...v.args, '--json']
}

export function newJob(plan: Plan, now: number): NonNullable<Job> {
  return {
    title: plan.title, contracts: plan.contracts, startedAt: now, tail: [], flags: [],
    variants: plan.variants.map(v => ({ label: v.label, args: v.args, n: plan.contracts, done: 0, wins: 0, hunts: 0, complete: 0, lost: 0, chan: {}, status: 'queued' })),
  }
}

// ---------- reading the runner's output ----------

/** Splits streamed text into whole lines, keeping the unfinished end for the next piece. */
export function splitLines(carry: string, text: string): { lines: string[]; carry: string } {
  const all = (carry + text).split(/\r?\n/)
  return { carry: all.pop() ?? '', lines: all }
}

/** Folds one '@@SL {...}' contract line into a variant. Returns null for any other line. */
export function foldContract(v: Variant, line: string): Variant | null {
  if (!line.startsWith('@@SL ')) return null
  let c: any
  try { c = JSON.parse(line.slice(5)) } catch { return null }
  const hunts: any[] = Array.isArray(c.hunts) ? c.hunts : []
  const chan = { ...v.chan }
  for (const h of hunts) for (const f of h.found ?? []) if (f) { const k = String(f.ch).split(' ')[0] ?? '?'; chan[k] = (chan[k] ?? 0) + 1 }
  return {
    ...v,
    done: v.done + 1,
    hunts: v.hunts + hunts.length,
    wins: v.wins + hunts.filter(h => String(h.outcome).startsWith('WIN')).length,
    lost: v.lost + hunts.reduce((a, h) => a + (Number(h.lost) || 0), 0),
    complete: v.complete + (c.status === 'COMPLETE' ? 1 : 0),
    chan,
  }
}

// ---------- numbers for the pane ----------

export const winRate = (v: Variant) => (v.hunts ? v.wins / v.hunts : 0)

/** 95% margin on a win rate, in points: below it, a difference is noise. */
export function margin(v: Variant) {
  if (!v.hunts) return 0
  const p = winRate(v)
  return Math.round(196 * Math.sqrt(Math.max(p * (1 - p), 0.0625) / v.hunts))
}

/** Change against the base row in points, and whether it clears both rows' noise. */
export function delta(v: Variant, base: Variant | undefined): { pts: number; isReal: boolean } | null {
  if (!base || base === v || !v.hunts || !base.hunts) return null
  const pts = Math.round(100 * (winRate(v) - winRate(base)))
  const noise = Math.sqrt(margin(v) ** 2 + margin(base) ** 2)
  return { pts, isReal: Math.abs(pts) > noise }
}

export function bar(frac: number, width: number) {
  const n = Math.max(0, Math.min(width, Math.round(frac * width)))
  return '█'.repeat(n) + '░'.repeat(width - n)
}

/** Top channels that found the lance first, as "eyes 41% SND 30%". */
export function topChannels(v: Variant, k = 2) {
  const total = Object.values(v.chan).reduce((a, b) => a + b, 0)
  if (!total) return ''
  return Object.entries(v.chan).sort((a, b) => b[1] - a[1]).slice(0, k).map(([c, n]) => `${c} ${Math.round(100 * n / total)}%`).join(' ')
}

/** One-line summary per variant, for the tool's answer and the transcript. */
export function summary(job: NonNullable<Job>) {
  const base = job.variants[0]
  if (!base) return job.title
  return [
    `${job.title} · ${job.contracts} contracts each (same seeds)`,
    ...job.variants.map(v => {
      const d = delta(v, base)
      return `${v.label}: win ${Math.round(100 * winRate(v))}% ±${margin(v)} over ${v.hunts} hunts` +
        (d ? ` (${d.pts >= 0 ? '+' : ''}${d.pts} vs ${base.label}${d.isReal ? '' : ', within noise'})` : '') +
        ` · contracts complete ${v.complete}/${v.done} · lost ${(v.lost / Math.max(1, v.hunts)).toFixed(2)}/hunt` +
        (topChannels(v) ? ` · first found by ${topChannels(v)}` : '') +
        (v.status === 'error' ? ` · ERROR ${v.err ?? ''}` : v.status !== 'done' ? ` · ${v.status} ${v.done}/${v.n}` : '')
    }),
    ...(job.flags.length ? ['Runner flags: ' + job.flags.join(' | ')] : []),
  ].join('\n')
}

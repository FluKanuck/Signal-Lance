// Pure helpers for the status line: no `$`, so the tests call them directly.
import type { GitInfo, Usage } from '../types'

export type Tone = 'success' | 'warning' | 'error' | 'inactive'
export type Seg = { key: string; parts: { text: string; color?: string; dim?: boolean; bold?: boolean }[]; priority: number }

const HOUR = 3_600_000
export const WINDOW_MS: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }
const LABEL: Record<string, string> = { five_hour: '5h', seven_day: 'wk', spend_limit: '$lim' }

/** `git status --porcelain=v2 --branch` → branch, dirty files, ahead/behind. */
export function parseGit(porcelain: string, toplevel: string): GitInfo {
  let branch = '?', ahead = 0, behind = 0, dirty = 0
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('# branch.head ')) branch = line.slice(14).trim()
    else if (line.startsWith('# branch.ab ')) {
      const m = /\+(\d+) -(\d+)/.exec(line)
      if (m) { ahead = Number(m[1] ?? 0); behind = Number(m[2] ?? 0) }
    } else if (line.trim() && !line.startsWith('#')) dirty++
  }
  const repo = toplevel.replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() || '?'
  return { repo, branch: branch === '(detached)' ? 'detached' : branch, dirty, ahead, behind }
}

/** 0–100 used → green / amber / red. */
export function toneFor(pct: number, warn = 50, bad = 80): Tone {
  return pct >= bad ? 'error' : pct >= warn ? 'warning' : 'success'
}

export function bar(pct: number, width = 5) {
  const n = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return '▰'.repeat(n) + '▱'.repeat(width - n)
}

/** 2h14m, 3d4h, 9m, <1m. */
export function fmtLeft(ms: number) {
  if (ms <= 60_000) return '<1m'
  const m = Math.floor(ms / 60_000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d) return `${d}d${h % 24}h`
  if (h) return `${h}h${String(m % 60).padStart(2, '0')}m`
  return `${m}m`
}

/**
 * Pace: how far ahead of an even burn this window is, in points.
 * Positive = using faster than the window refills (you'll hit the cap before the reset).
 */
export function pace(kind: string, pct: number, resetsAt: number | null, now: number): number | null {
  const win = WINDOW_MS[kind]
  if (!win || resetsAt == null) return null
  const left = Math.max(0, Math.min(win, resetsAt - now))
  const elapsedPct = 100 * (1 - left / win)
  return Math.round(pct - elapsedPct)
}

/** When the window would hit 100% at the current pace, if before its reset. */
export function hitsCapIn(kind: string, pct: number, resetsAt: number | null, now: number): number | null {
  const win = WINDOW_MS[kind]
  if (!win || resetsAt == null || pct <= 0) return null
  const left = Math.max(0, resetsAt - now), elapsed = win - left
  if (elapsed <= 0) return null
  const rate = pct / elapsed                  // points per ms
  const toCap = (100 - pct) / rate
  return toCap < left ? toCap : null
}

export function fmtTokens(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
}

/** Short model name: "claude-opus-5-5" / "Opus 5.5 (1M context)" → "Opus 5.5". */
export function shortModel(m: string) {
  const s = m.replace(/^claude-/i, '').replace(/\s*\(.*\)\s*$/, '').replace(/-\d{8}$/, '')
  const x = /^(opus|sonnet|haiku|fable|mythos)[- ](\d+)(?:[-.](\d+))?/i.exec(s)
  if (x) return `${x[1]![0]!.toUpperCase()}${x[1]!.slice(1).toLowerCase()} ${x[2]}${x[3] ? '.' + x[3] : ''}`
  return s
}

/** The segments, left to right; `priority` decides what drops first on a narrow screen (lowest first). */
export function segments(git: GitInfo | null, usage: Usage | null, model: string, now: number): Seg[] {
  const out: Seg[] = []
  if (git) {
    const parts: Seg['parts'] = [
      { text: '⎇ ', color: 'suggestion' }, { text: git.repo, color: 'suggestion', bold: true },
      { text: ':', dim: true }, { text: git.branch, color: 'permission' },
    ]
    parts.push(git.dirty ? { text: ` ±${git.dirty}`, color: 'warning' } : { text: ' ✓', color: 'success' })
    if (git.ahead) parts.push({ text: ` ↑${git.ahead}`, color: 'warning' })
    if (git.behind) parts.push({ text: ` ↓${git.behind}`, color: 'error' })
    out.push({ key: 'git', parts, priority: 9 })
  }
  if (model) out.push({ key: 'model', parts: [{ text: '◆ ', color: 'claude' }, { text: shortModel(model), color: 'claude' }], priority: 3 })
  if (usage && usage.ctxPct != null) {
    const t = toneFor(usage.ctxPct, 50, 80)
    out.push({ key: 'ctx', priority: 8, parts: [
      { text: 'ctx ', dim: true }, { text: bar(usage.ctxPct), color: t }, { text: ` ${Math.round(usage.ctxPct)}%`, color: t, bold: true },
      ...(usage.ctxTokens != null ? [{ text: ` ${fmtTokens(usage.ctxTokens)}/${fmtTokens(usage.ctxWindow)}`, dim: true }] : []),
    ] })
  }
  for (const l of usage?.limits ?? []) {
    const label = LABEL[l.kind] ?? l.kind
    const p = pace(l.kind, l.pct, l.resetsAt, now)
    const cap = hitsCapIn(l.kind, l.pct, l.resetsAt, now)
    // colour by how full, bumped up a level when you're burning well ahead of pace
    let t = toneFor(l.pct, 50, 80)
    if (p != null && p > 15 && t === 'success') t = 'warning'
    if (cap != null && t !== 'error') t = 'error'
    const parts: Seg['parts'] = [
      { text: `${label} `, dim: true }, { text: bar(l.pct), color: t }, { text: ` ${Math.round(l.pct)}%`, color: t, bold: true },
    ]
    if (l.resetsAt != null) parts.push({ text: ` ⟳${fmtLeft(l.resetsAt - now)}`, dim: true })
    if (cap != null) parts.push({ text: ` ⚠cap in ${fmtLeft(cap)}`, color: 'error' })
    else if (p != null && p > 15) parts.push({ text: ` ↯+${p}`, color: 'warning' })
    out.push({ key: l.kind, parts, priority: l.kind === 'five_hour' ? 7 : 6 })
  }
  if (usage) {
    const mins = Math.max(0, Math.floor((now - usage.startedAt) / 60_000))
    const time = mins >= 60 ? `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m` : `${mins}m`
    const parts: Seg['parts'] = []
    if (usage.usd != null) parts.push({ text: `$${usage.usd.toFixed(2)}`, color: usage.usd >= 10 ? 'warning' : 'success' }, { text: ' · ', dim: true })
    parts.push({ text: `⏱ ${time}`, dim: true })
    out.push({ key: 'session', parts, priority: 2 })
  }
  return out
}

export const SEP = ' │ '
export const segWidth = (s: Seg) => s.parts.reduce((a, p) => a + [...p.text].length, 0)

/** Drop the lowest-priority segments until the line fits `columns`. */
export function fit(segs: Seg[], columns: number): Seg[] {
  const kept = [...segs]
  const width = () => kept.reduce((a, s) => a + segWidth(s), 0) + SEP.length * Math.max(0, kept.length - 1)
  while (kept.length > 1 && width() > columns) {
    let lo = 0
    kept.forEach((s, i) => { if (s.priority < kept[lo]!.priority) lo = i })
    kept.splice(lo, 1)
  }
  return kept
}

export const plain = (segs: Seg[]) => segs.map(s => s.parts.map(p => p.text).join('')).join(SEP)

export function usageFrom(u: any): Usage {
  return {
    ctxPct: typeof u?.context?.percent === 'number' ? u.context.percent : null,
    ctxTokens: typeof u?.context?.tokens === 'number' ? u.context.tokens : null,
    ctxWindow: Number(u?.context?.window) || 200_000,
    limits: (Array.isArray(u?.rateLimits) ? u.rateLimits : []).map((l: any) => ({
      kind: String(l.kind), pct: Number(l.percentUsed) || 0,
      resetsAt: l.resetsAt ? Date.parse(l.resetsAt) || null : null,
    })).sort((a: any, b: any) => (a.kind === 'five_hour' ? -1 : b.kind === 'five_hour' ? 1 : 0)),
    usd: typeof u?.cost?.usd === 'number' ? u.cost.usd : null,
    startedAt: Number(u?.startedAt) || Date.now(),
  }
}

// Pure helpers for the status line: no `$`, so the tests call them directly.
import type { GitInfo, Usage } from '../types'

export type Tone = 'success' | 'warning' | 'error' | 'inactive'
export type Cell = { text: string; fg?: string; bold?: boolean }
/** One powerline block: a background and the coloured runs on it. `priority` decides what drops first (lowest first). */
export type Block = { key: string; bg: string; cells: Cell[]; priority: number }

/** The colours: blocks in the teal/blue family ccstatusline had, fills that still read on them. Tune here. */
export const PAL = {
  bg: ['#0f4c5c', '#16687c', '#1f3f6e', '#2a5a96'],
  fg: '#eaf7fb', mute: '#a9cfd9', track: '#5f8f9c',
  success: '#7fe08e', warning: '#ffc857', error: '#ff6b6b', inactive: '#a9cfd9',
}
/** Glyphs: Nerd Font (JetBrainsMono Nerd Font has them all). */
export const G = { sep: '', branch: '', chip: '', clock: '', reset: '', folder: '', full: '█', empty: '░' }

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
  return G.full.repeat(n) + G.empty.repeat(width - n)
}

/** Bar width for the terminal: wider meters on wider screens. */
export function barWidth(columns: number) {
  return columns >= 150 ? 16 : columns >= 120 ? 12 : columns >= 95 ? 8 : 5
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

/** The last `n` parts of a path, Windows or POSIX, as written. */
export function shortPath(p: string, n = 2) {
  const sep = p.includes('\\') ? '\\' : '/'
  const parts = p.replace(/[\\/]+$/, '').split(/[\\/]/)
  return parts.length <= n ? parts.join(sep) : '…' + sep + parts.slice(-n).join(sep)
}

export type Input = { git: GitInfo | null; usage: Usage | null; model: string; cwd: string; now: number; columns: number }

/**
 * Two powerline rows.
 * Row 1, the meters: context, 5-hour, weekly, each with its bar, % and reset.
 * Row 2, where you are: branch and changes, model, session time and cost, folder.
 */
export function rows({ git, usage, model, cwd, now, columns }: Input): Block[][] {
  const w = barWidth(columns)
  const meters: Block[] = []
  const place: Block[] = []

  if (usage && usage.ctxPct != null) {
    const c = PAL[toneFor(usage.ctxPct, 50, 80)]
    meters.push({ key: 'ctx', bg: PAL.bg[0]!, priority: 9, cells: [
      { text: 'ctx ', fg: PAL.mute }, { text: bar(usage.ctxPct, w), fg: c },
      { text: ` ${Math.round(usage.ctxPct)}%`, fg: c, bold: true },
      ...(usage.ctxTokens != null ? [{ text: ` ${fmtTokens(usage.ctxTokens)}/${fmtTokens(usage.ctxWindow)}`, fg: PAL.mute }] : []),
    ] })
  }
  for (const l of usage?.limits ?? []) {
    const p = pace(l.kind, l.pct, l.resetsAt, now)
    // early in a window one busy half-hour extrapolates to "cap"; only warn once there's real usage behind it
    const cap = l.pct >= 30 ? hitsCapIn(l.kind, l.pct, l.resetsAt, now) : null
    // colour by how full, bumped a level when you're burning well ahead of pace
    let t = toneFor(l.pct, 50, 80)
    if (p != null && p > 15 && t === 'success') t = 'warning'
    if (cap != null) t = 'error'
    const cells: Cell[] = [
      { text: `${LABEL[l.kind] ?? l.kind} `, fg: PAL.mute }, { text: bar(l.pct, w), fg: PAL[t] },
      { text: ` ${Math.round(l.pct)}%`, fg: PAL[t], bold: true },
    ]
    if (l.resetsAt != null) cells.push({ text: ` ${G.reset} ${fmtLeft(l.resetsAt - now)}`, fg: PAL.mute })
    if (cap != null) cells.push({ text: ` ⚠ cap in ${fmtLeft(cap)}`, fg: PAL.error, bold: true })
    else if (p != null && p > 15) cells.push({ text: ` ↑${p} ahead`, fg: PAL.warning })
    const i = meters.length
    meters.push({ key: l.kind, bg: PAL.bg[i % 2]!, priority: l.kind === 'five_hour' ? 8 : 6, cells })
  }

  if (git) {
    const cells: Cell[] = [
      { text: `${G.branch} `, fg: PAL.mute }, { text: git.repo, fg: PAL.fg, bold: true },
      { text: ' · ', fg: PAL.mute }, { text: git.branch, fg: PAL.fg, bold: true },
      git.dirty ? { text: ` ±${git.dirty}`, fg: PAL.warning, bold: true } : { text: ' ✓', fg: PAL.success, bold: true },
    ]
    if (git.ahead) cells.push({ text: ` ↑${git.ahead}`, fg: PAL.warning })
    if (git.behind) cells.push({ text: ` ↓${git.behind}`, fg: PAL.error })
    place.push({ key: 'git', bg: PAL.bg[2]!, priority: 7, cells })
  }
  if (model) place.push({ key: 'model', bg: PAL.bg[3]!, priority: 4, cells: [{ text: `${G.chip} `, fg: PAL.mute }, { text: shortModel(model), fg: PAL.fg, bold: true }] })
  if (usage) {
    const mins = Math.max(0, Math.floor((now - usage.startedAt) / 60_000))
    const time = mins >= 60 ? `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m` : `${mins}m`
    const cells: Cell[] = [{ text: `${G.clock} `, fg: PAL.mute }, { text: time, fg: PAL.fg, bold: true }]
    if (usage.usd != null) cells.push({ text: ` $${usage.usd.toFixed(2)}`, fg: usage.usd >= 10 ? PAL.warning : PAL.mute })
    place.push({ key: 'session', bg: PAL.bg[place.length % 2 ? 3 : 2]!, priority: 3, cells })
  }
  if (cwd) place.push({ key: 'cwd', bg: PAL.bg[place.length % 2 ? 3 : 2]!, priority: 2, cells: [{ text: `${G.folder} `, fg: PAL.mute }, { text: shortPath(cwd), fg: PAL.fg }] })

  return [meters, place].filter(r => r.length)
}

/**
 * Columns the engine's mode pill takes to the left of the hint row ("⏵⏵ bypass permissions on · ").
 * Read off the hint text, which names the mode; a shift+tab reminder with no readable label still means a pill.
 */
export function pillWidth(hint: string) {
  const m = /(bypass permissions|accept edits|plan mode|auto[- ]mode|auto-accept edits)( on)?/i.exec(hint)
  if (m) return [...m[0]].length + 6
  return /shift\+tab/i.test(hint) ? 26 : 0
}

/** A block's drawn width: a space each side of its text, then its arrow. */
export const blockWidth = (b: Block) => 2 + b.cells.reduce((a, c) => a + [...c.text].length, 0) + 1

/** Drop the lowest-priority blocks until the row fits `columns`. */
export function fit(row: Block[], columns: number): Block[] {
  const kept = [...row]
  const width = () => kept.reduce((a, b) => a + blockWidth(b), 0)
  while (kept.length > 1 && width() > columns) {
    let lo = 0
    kept.forEach((b, i) => { if (b.priority < kept[lo]!.priority) lo = i })
    kept.splice(lo, 1)
  }
  return kept
}

/** Plain text, for surfaces that only take a status string. */
export const plain = (rs: Block[][]) => rs.map(r => r.map(b => b.cells.map(c => c.text).join('')).join(' │ ')).join(' │ ')

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

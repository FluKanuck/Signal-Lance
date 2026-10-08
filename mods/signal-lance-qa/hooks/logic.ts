// The watch pane's pure side: fold qa-runs/<batch>/live.jsonl events into one row per tester session.
import type { Feed, Row, Watch } from '../types'

export const SEV = ['blocker', 'major', 'minor', 'polish'] as const

export const emptyWatch = (batch: string): Watch => ({ batch, rows: [], feed: {}, planned: 0, oracle: 0, findings: 0, sev: {}, offset: 0 })

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

// One feed line per event, for the follow view
export function feedLine(e: any): Feed | null {
  switch (e.kind) {
    case 'start': return { t: e.t, icon: '●', text: 'start · ' + e.meta.persona + ' · ' + e.meta.model + ' · ' + e.meta.device + ' · seed ' + e.meta.seed + (e.meta.hand ? ' · hand ' + e.meta.hand : '') }
    case 'action': return { t: e.t, icon: '▸', text: e.cmd + ' ' + (e.target ?? '') + (e.result ? ' → ' + e.result : '') }
    case 'look': return { t: e.t, icon: '◉', text: 'look · ' + (e.screens || []).join('+'), shot: e.shot }
    case 'think': return { t: e.t, icon: '…', text: e.text }
    case 'note': return { t: e.t, icon: '⚑', text: e.severity + ' ' + e.category + ': ' + e.title }
    case 'fallback': return { t: e.t, icon: '↯', text: 'fallback ' + e.action + (e.why ? ' (' + e.why + ')' : '') }
    case 'oracle': return { t: e.t, icon: '⚠', text: 'oracle: ' + e.violations.join(' · ') }
    case 'checkpoint': return { t: e.t, icon: '↻', text: 'checkpoint ' + e.k }
    case 'end': return { t: e.t, icon: '■', text: 'end · ' + e.notes + ' notes · ' + e.summary }
  }
  return null
}

// Fold new events into the watch (pure: returns a new value). FEED_MAX lines kept per session.
export const FEED_MAX = 200
export function fold(w: Watch, events: any[], offset: number): Watch {
  const rows = new Map(w.rows.map(r => [r.id, { ...r, sev: { ...r.sev } }]))
  const feed: Record<string, Feed[]> = { ...w.feed }
  let { oracle, findings } = w
  const sev = { ...w.sev }
  for (const e of events) {
    if (e.kind === 'plan') { w = { ...w, planned: e.sessions }; continue }
    if (!e.session) continue
    let r = rows.get(e.session)
    if (!r) { r = { id: e.session, persona: '', model: '', device: '', state: 'running', screen: '', last: '', thought: '', notes: 0, sev: {}, oracle: 0, actions: 0, shot: '', t: e.t }; rows.set(e.session, r) }
    r.t = e.t
    if (e.kind === 'start') Object.assign(r, { persona: e.meta.persona, model: e.meta.model, device: e.meta.device, state: 'running' })
    if (e.kind === 'action' || e.kind === 'fallback') { r.actions++; r.last = short(feedLine(e)!.text, 80) }
    if (e.kind === 'look') { r.screen = (e.screens || []).join('+'); if (e.shot) r.shot = e.shot }
    const moved = e.kind === 'action' ? /screen \S+ → (\S+)/.exec(e.result || '') : null
    if (moved) r.screen = moved[1] ?? r.screen
    if (e.kind === 'think') r.thought = short(e.text, 100)
    if (e.kind === 'note') { r.notes++; r.sev[e.severity] = (r.sev[e.severity] || 0) + 1; findings++; sev[e.severity] = (sev[e.severity] || 0) + 1 }
    if (e.kind === 'oracle') { r.oracle += e.violations.length; oracle += e.violations.length }
    if (e.kind === 'end') r.state = 'done'
    const l = feedLine(e)
    if (l) feed[e.session] = [...(feed[e.session] || []), l].slice(-FEED_MAX)
  }
  return { ...w, rows: [...rows.values()], feed, oracle, findings, sev, offset }
}

// Parse the new tail of live.jsonl (from a byte/char offset); a half-written last line waits for the next read
export function parseTail(text: string, offset: number): { events: any[]; offset: number } {
  if (text.length < offset) offset = 0 // the file was replaced: start over
  const chunk = text.slice(offset), end = chunk.lastIndexOf('\n')
  if (end < 0) return { events: [], offset }
  const events: any[] = []
  for (const line of chunk.slice(0, end).split('\n')) { if (!line.trim()) continue; try { events.push(JSON.parse(line)) } catch { /* skip a bad line */ } }
  return { events, offset: offset + end + 1 }
}

export const sevText = (s: Record<string, number>) => SEV.filter(k => s[k]).map(k => k.charAt(0).toUpperCase() + s[k]).join(' ') || '—'
export function header(w: Watch) {
  const run = w.rows.filter(r => r.state === 'running').length, done = w.rows.filter(r => r.state === 'done').length
  const queued = Math.max(0, w.planned - w.rows.length)
  return 'batch ' + w.batch + ' · ' + run + ' running · ' + done + ' done' + (w.planned ? ' · ' + queued + ' queued' : '') + ' · ' + w.findings + ' findings (' + sevText(w.sev) + ') · oracle ' + w.oracle
}
export function rowText(r: Row) {
  return (r.state === 'running' ? '●' : '■') + ' ' + r.id + ' · ' + r.persona + ' · ' + r.model + ' · ' + r.device + ' · ' + (r.screen || '?') + ' · ' + r.actions + ' acts · ' + sevText(r.sev) + (r.oracle ? ' · ⚠' + r.oracle : '')
}

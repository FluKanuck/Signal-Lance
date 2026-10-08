import { describe, expect, test } from 'claude-code/testing'

import { emptyWatch, fold, header, parseTail, rowText } from '../hooks/logic.ts'

const ev = (o: any) => JSON.stringify({ t: '2026-10-08T03:00:00Z', ...o })
const LIVE = [
  ev({ kind: 'plan', sessions: 3 }),
  ev({ session: 's1', kind: 'start', step: 0, meta: { persona: 'fresh-recruit', model: 'sonnet', device: 'iphone', seed: 7 } }),
  ev({ session: 's1', kind: 'action', step: 1, cmd: 'tap', target: '[bCont] CONTINUE', result: 'tapped [bCont] CONTINUE: screen co+splash → co' }),
  ev({ session: 's1', kind: 'think', step: 2, text: 'No idea what fuel is for yet.' }),
  ev({ session: 's1', kind: 'note', step: 3, category: 'confusing', severity: 'major', title: 'Fuel is never explained' }),
  ev({ session: 's2', kind: 'start', step: 0, meta: { persona: 'breaker', model: 'haiku', device: 'ipad', seed: 9 } }),
  ev({ session: 's2', kind: 'oracle', step: 4, violations: ['hud: shows 3 AP pips, suit A has 4'] }),
  ev({ session: 's1', kind: 'end', step: 9, notes: 1, summary: 'done' }),
].join('\n') + '\n'

describe('the watch pane feed', () => {
  test('folds the live feed into rows, totals and feeds', async () => {
    const { events, offset } = parseTail(LIVE, 0)
    const w = fold(emptyWatch('b1'), events, offset)
    expect(w.rows.length).toBe(2)
    const s1 = w.rows.find(r => r.id === 's1')!
    expect(s1.state).toBe('done')
    expect(s1.screen).toBe('co')
    expect(s1.thought).toBe('No idea what fuel is for yet.')
    expect(s1.sev.major).toBe(1)
    expect(w.findings).toBe(1)
    expect(w.oracle).toBe(1)
    expect(w.feed.s1!.length).toBe(5)
    expect(header(w)).toBe('batch b1 · 1 running · 1 done · 1 queued · 1 findings (M1) · oracle 1')
    expect(rowText(w.rows.find(r => r.id === 's2')!)).toContain('⚠1')
  })
  test('reads only whole lines, and carries on from the offset', async () => {
    const half = LIVE + '{"session":"s3","kind":"st'
    const a = parseTail(half, 0)
    expect(a.events.length).toBe(8)
    const b = parseTail(half + 'art","meta":{"persona":"p","model":"m","device":"d","seed":1}}\n', a.offset)
    expect(b.events.length).toBe(1)
    expect(b.events[0].session).toBe('s3')
  })
  test('starts over when the file is replaced', async () => {
    const a = parseTail(LIVE, 0)
    const b = parseTail(ev({ session: 'x', kind: 'think', text: 'hi' }) + '\n', a.offset)
    expect(b.events.length).toBe(1)
  })
})

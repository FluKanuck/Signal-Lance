import { describe, expect, test } from 'claude-code/testing'

import { bar, fit, fmtLeft, hitsCapIn, pace, parseGit, plain, segments, shortModel, toneFor, usageFrom } from '../hooks/logic.ts'

const H = 3_600_000
const NOW = Date.parse('2026-10-06T19:00:00Z')

describe('pieces', () => {
  test('git porcelain v2 → repo, branch, dirty, ahead/behind', async () => {
    const g = parseGit('# branch.oid abc\n# branch.head main\n# branch.upstream origin/main\n# branch.ab +2 -1\n1 .M N... 100644 100644 100644 a b x.ts\n? new.ts\n', 'Q:\\Code\\Signal-Lance')
    expect(g).toEqual({ repo: 'Signal-Lance', branch: 'main', dirty: 2, ahead: 2, behind: 1 })
  })
  test('colours, bars and countdowns', async () => {
    expect(toneFor(20)).toBe('success')
    expect(toneFor(65)).toBe('warning')
    expect(toneFor(90)).toBe('error')
    expect(bar(40)).toBe('▰▰▱▱▱')
    expect(fmtLeft(2 * H + 14 * 60_000)).toBe('2h14m')
    expect(fmtLeft(76 * H)).toBe('3d4h')
    expect(fmtLeft(30_000)).toBe('<1m')
    expect(shortModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(shortModel('Sonnet 5.5 (1M context)')).toBe('Sonnet 5.5')
  })
  test('pace: 60% used one hour into five is well ahead, and hits the cap early', async () => {
    const resets = NOW + 4 * H
    expect(pace('five_hour', 60, resets, NOW)).toBe(40)
    expect(Math.round(hitsCapIn('five_hour', 60, resets, NOW)! / 60_000)).toBe(40)
    expect(pace('five_hour', 10, resets, NOW)).toBe(-10)
    expect(hitsCapIn('five_hour', 10, resets, NOW)).toBe(null)
  })
})

describe('the line', () => {
  const u = usageFrom({
    startedAt: NOW - 47 * 60_000,
    context: { window: 200_000, tokens: 84_000, percent: 42 },
    rateLimits: [
      { kind: 'seven_day', percentUsed: 61, resetsAt: new Date(NOW + 76 * H).toISOString() },
      { kind: 'five_hour', percentUsed: 37, resetsAt: new Date(NOW + 2 * H).toISOString() },
    ],
    cost: { usd: 1.234 },
  })
  const g = { repo: 'Signal-Lance', branch: 'main', dirty: 0, ahead: 0, behind: 0 }

  test('reads like the ccstatusline one', async () => {
    const line = plain(segments(g, u, 'claude-opus-5-5', NOW))
    expect(line).toBe('⎇ Signal-Lance:main ✓ │ ◆ Opus 5.5 │ ctx ▰▰▱▱▱ 42% 84k/200k │ 5h ▰▰▱▱▱ 37% ⟳2h00m │ wk ▰▰▰▱▱ 61% ⟳3d4h ⚠cap in 2d10h │ $1.23 · ⏱ 47m')
  })
  test('drops the least important segments first when narrow', async () => {
    const all = segments(g, u, 'claude-opus-5-5', NOW)
    const segs = fit(all, 60)
    expect(plain(segs).length).toBeLessThanOrEqual(60)
    expect(segs[0]?.key).toBe('git')
    const lowestKept = Math.min(...segs.map(s => s.priority))
    for (const s of all) if (!segs.includes(s)) expect(s.priority).toBeLessThanOrEqual(lowestKept)
  })
  test('no rate limits off a subscription: those segments just leave', async () => {
    const line = plain(segments(null, usageFrom({ startedAt: NOW, context: { window: 200_000 }, rateLimits: [] }), '', NOW))
    expect(line).toBe('⏱ 0m')
  })
})

describe('drawing', () => {
  test('before any reading it leaves the engine its own hint line', async ($, on) => {
    on('ui.render', { component: 'PromptHint' }, ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine hint</Text> })
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({
        plugin: 'flu-statusline', surface, component: 'PromptHint',
        props: { isDraft: false, isWorking: true, hint: 'esc to interrupt' },
      })
      expect(await ui.find({ type: 'Text', text: /engine hint/ })).toBeDefined()
      await ui.unmount()
    }
  })
})

import { describe, expect, test } from 'claude-code/testing'

import { G, MODES, ansi, bar, fromStatusInput, modeFile, modeFromHint, pillWidth, shade, blockWidth, fit, fmtLeft, hitsCapIn, pace, parseGit, plain, rows, shortModel, shortPath, toneFor, usageFrom } from '../hooks/logic.ts'

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
    expect(bar(40)).toBe('██░░░')
    expect(shortPath('Q:\\Code\\Signal Lance\\src')).toBe('…\\Signal Lance\\src')
    expect(fmtLeft(2 * H + 14 * 60_000)).toBe('2h14m')
    expect(fmtLeft(76 * H)).toBe('3d4h')
    expect(fmtLeft(30_000)).toBe('<1m')
    expect(pillWidth('bypass permissions on (shift+tab to cycle)')).toBe(27)
    expect(pillWidth('? for shortcuts')).toBe(0)
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

  const at = (columns: number) => rows({ git: g, usage: u, model: 'claude-opus-5-5', cwd: 'Q:\\Signal Lance', now: NOW, columns })

  test('two rows: the meters, then where you are', async () => {
    const [meters, place] = at(120)
    expect(meters!.map(b => b.key)).toEqual(['ctx', 'five_hour', 'seven_day'])
    expect(place!.map(b => b.key)).toEqual(['git', 'model', 'session', 'cwd'])
    expect(plain([meters!])).toBe(`ctx █████░░░░░░░ 42% 84k/200k │ 5h ████░░░░░░░░ 37% ${G.reset} 2h00m │ wk ███████░░░░░ 61% ${G.reset} 3d4h ⚠ cap in 2d10h`)
    expect(plain([place!])).toBe(`${G.branch} Signal-Lance · main ✓ │ ${G.chip} Opus 5.5 │ ${G.clock} 47m $1.23 │ ${G.folder} Q:\\Signal Lance`)
  })
  test('no cap alarm from one busy half-hour at the start of a window', async () => {
    const early = usageFrom({ startedAt: NOW, context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 11, resetsAt: new Date(NOW + 4.5 * H).toISOString() }] })
    expect(plain(rows({ git: null, usage: early, model: '', cwd: '', now: NOW, columns: 120 }))).not.toContain('cap')
  })
  test('the permission mode leads row 2, read live off the hint', async () => {
    expect(modeFromHint('⏵⏵ bypass permissions on (shift+tab to cycle)')).toBe('bypassPermissions')
    expect(modeFromHint('⏵⏵ accept edits on (shift+tab to cycle)')).toBe('acceptEdits')
    expect(modeFromHint('⏸ plan mode on (shift+tab to cycle)')).toBe('plan')
    expect(modeFromHint('? for shortcuts')).toBe('default')
    expect(modeFromHint('esc to interrupt')).toBe(null)
    const place = rows({ git: g, usage: u, model: '', cwd: '', now: NOW, columns: 120, mode: 'bypassPermissions' })[1]!
    expect(place[0]!.key).toBe('mode')
    expect(place[0]!.bg).toBe(MODES.bypassPermissions.bg)
    expect(fit(place, 10)[0]!.key).toBe('mode')
  })
  test('blocks re-shade after one drops, so neighbours still differ', async () => {
    const place = at(120)[1]!
    const kept = shade(place.filter(b => b.key !== 'model'), 1)
    for (let i = 1; i < kept.length; i++) expect(kept[i]!.bg).not.toBe(kept[i - 1]!.bg)
  })
  test('the statusLine JSON reads into the same rows', async () => {
    const s = fromStatusInput({
      session_id: 'abc', transcript_path: 'C:/Users/j/.claude/projects/Q--x/abc.jsonl', cwd: 'Q:/x',
      model: { id: 'claude-opus-5-5' }, effort: { level: 'medium' },
      cost: { total_cost_usd: 1.234, total_duration_ms: 47 * 60_000 },
      context_window: { context_window_size: 200_000, used_percentage: 42, current_usage: { input_tokens: 4_000, cache_read_input_tokens: 80_000 } },
      rate_limits: { five_hour: { used_percentage: 37, resets_at: (NOW + 2 * H) / 1000 } },
    }, NOW)
    expect(s.usage.ctxTokens).toBe(84_000)
    expect(s.usage.limits[0]).toEqual({ kind: 'five_hour', pct: 37, resetsAt: NOW + 2 * H })
    expect(s.effort).toBe('medium')
    expect(modeFile(s.transcriptPath, s.sessionId)).toBe('C:/Users/j/.claude/flu-statusline/mode-abc')
    const out = ansi(rows({ git: g, usage: s.usage, model: s.model, cwd: s.cwd, now: NOW, columns: 120, effort: s.effort }), 120)
    const text = out.replace(/\x1b\[[0-9;]*m/g, '')
    expect(text.split('\n').length).toBe(2)
    expect(text).toContain('Opus 5.5 · medium')
    expect(text).toContain('47m $1.23')
  })
  test('names from disk cannot inject terminal escapes', async () => {
    const evil = { ...g, repo: 'x\x1b]0;pwned\x07y', branch: 'main\x1b[2J' }
    const out = ansi(rows({ git: evil, usage: null, model: '', cwd: 'Q:/a\x1bb', now: NOW, columns: 120 }), 120)
    // every escape left is one of our own colour codes (ESC [ digits ; m); the BEL is gone too
    expect(out.replace(/\x1b\[[0-9;]*m/g, '')).not.toMatch(/[\x00-\x1f\x7f]/)
    expect(out).not.toContain('\x1b[2J')
    expect(out).toContain('x]0;pwnedy')
  })
  test('neighbouring blocks never share a background', async () => {
    for (const row of at(120)) for (let i = 1; i < row.length; i++) expect(row[i]!.bg).not.toBe(row[i - 1]!.bg)
  })
  test('drops the least important blocks first when narrow', async () => {
    const [, place] = at(60)
    const kept = fit(place!, 40)
    expect(kept.reduce((a, b) => a + blockWidth(b), 0)).toBeLessThanOrEqual(40)
    expect(kept[0]?.key).toBe('git')
    const lowestKept = Math.min(...kept.map(b => b.priority))
    for (const b of place!) if (!kept.includes(b)) expect(b.priority).toBeLessThanOrEqual(lowestKept)
  })
  test('no rate limits off a subscription: those blocks just leave', async () => {
    const r = rows({ git: null, usage: usageFrom({ startedAt: NOW, context: { window: 200_000 }, rateLimits: [] }), model: '', cwd: '', now: NOW, columns: 120 })
    expect(plain(r)).toBe(`${G.clock} 0m`)
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

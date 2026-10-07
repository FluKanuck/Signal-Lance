import { describe, expect, test } from 'claude-code/testing'

import { bandFrom, delta, foldContract, newJob, planFrom, simPlanFrom, splitLines, summary } from '../hooks/logic.ts'

const SCREENS = "export const BUILD = 'r18-s2';  // R18 checkpoint 2"
const BRIEF = `# Signal Lance: Round 18 brief — "Fit for the job"

### Step 0: bring the toy in
### Checkpoint 1: parity (no playtest; the runner proves it)
### Checkpoint 2: the suit budget (Jamie plays)
### Checkpoint 3: THERMAL (Jamie plays)
### Every step`
const DOCS = ['signal-lance-round17.md', 'signal-lance-round17-brief.md', 'signal-lance-round18-brief.md']

describe('the band', () => {
  test('reads round, checkpoint and next step', async () => {
    const b = bandFrom({ screens: SCREENS, docs: DOCS, brief: BRIEF, branch: 'main', dirty: 0, head: 'x', root: '/r' })
    expect(b.round).toBe(18)
    expect(b.title).toBe('Fit for the job')
    expect(b.build).toBe('r18-s2')
    expect(b.cp).toBe(2)
    expect(b.cpTotal).toBe(3)
    expect(b.next).toBe('THERMAL')
  })
  test('after the last checkpoint: debrief, and with a report: design lead', async () => {
    const s3 = bandFrom({ screens: "BUILD = 'r18-s3'", docs: DOCS, brief: BRIEF, branch: 'main', dirty: 0, head: '', root: '' })
    expect(s3.next).toBe('debrief + report')
    const done = bandFrom({ screens: "BUILD = 'r18-s3'", docs: [...DOCS, 'signal-lance-round18.md'], brief: BRIEF, branch: 'main', dirty: 0, head: '', root: '' })
    expect(done.next).toBe('round done: design lead chat')
  })
  test('a new brief not yet built starts at its first checkpoint', async () => {
    const b = bandFrom({ screens: "BUILD = 'r17-s5'", docs: DOCS, brief: BRIEF, branch: 'main', dirty: 2, head: '', root: '' })
    expect(b.cp).toBe(0)
    expect(b.next).toBe('start parity')
  })
})

describe('balance specs', () => {
  test('item values get a base row and --item flags', async () => {
    const p = planFrom('item mortar.mortar.shells=4,8 --contracts 30 --mission bounty')
    if (typeof p === 'string') throw new Error(p)
    expect(p.contracts).toBe(30)
    expect(p.extra).toEqual(['--mission', 'bounty'])
    expect(p.variants.map(v => v.label)).toEqual(['base', 'shells=4', 'shells=8'])
    expect(p.variants[2]?.args).toEqual(['--item', 'mortar.mortar.shells=8'])
  })
  test('fits compare templates without a base row', async () => {
    const p = planFrom('fit scout,line,brawler')
    if (typeof p === 'string') throw new Error(p)
    expect(p.variants.map(v => v.args)).toEqual([['--fit', 'scout'], ['--fit', 'line'], ['--fit', 'brawler']])
  })
  test('bad specs say how to write them', async () => {
    expect(typeof planFrom('item mortar')).toBe('string')
    expect(typeof planFrom('weird x=1')).toBe('string')
    expect(simPlanFrom('--contracts 10 --json --fit scout').extra).toEqual(['--fit', 'scout'])
  })
})

describe('reading the runner', () => {
  test('lines split across pieces are joined, and contracts fold in', async () => {
    const a = splitLines('', '@@SL {"c":1,"status":"COMPLETE","hunts":[{"outcome":"WIN CLEAR","lost":0,"found":[{"ch":"eyes","d":5}]},')
    expect(a.lines).toEqual([])
    const b = splitLines(a.carry, '{"outcome":"LOSS","lost":2,"found":[{"ch":"SND","d":4},null]}]}\n  FLAG: x\n')
    expect(b.lines.length).toBe(2)
    const job = newJob(planFrom('fit scout') as any, 0)
    const v = foldContract(job.variants[0]!, b.lines[0]!)!
    expect(v.done).toBe(1)
    expect(v.hunts).toBe(2)
    expect(v.wins).toBe(1)
    expect(v.lost).toBe(2)
    expect(v.complete).toBe(1)
    expect(v.chan).toEqual({ eyes: 1, SND: 1 })
    expect(foldContract(v, '  FLAG: x')).toBe(null)
  })
  test('a small difference is called noise, a big one is not', async () => {
    const mk = (wins: number, hunts: number) => ({ label: 'x', args: [], n: 1, done: 1, wins, hunts, complete: 0, lost: 0, chan: {}, status: 'done' as const })
    expect(delta(mk(52, 100), mk(50, 100))?.isReal).toBe(false)
    expect(delta(mk(80, 200), mk(40, 200))?.isReal).toBe(true)
    const job = { ...newJob(planFrom('tune A=1') as any, 0), variants: [mk(50, 100), mk(160, 200)] }
    expect(summary(job)).toMatch(/\+30 vs x/)
  })
})

describe('drawing', () => {
  test('the pane shows how to start before any run, on every surface', async $ => {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({
        plugin: 'signal-lance', surface, component: 'Pane', requestId: 'sl-runner',
        props: { title: 'Signal Lance runner', isFocused: false, bodyColumns: 70, placement: 'dock' } as any,
      })
      expect(await ui.find({ type: 'Text', text: /sl-balance item/ })).toBeDefined()
      await ui.unmount()
    }
  })
})

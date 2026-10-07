// Round 22: the after-action record. The three kinds are recorded, the always-in moments survive the cap, held the field
// shows the field's side and lost / bailed redacts it (text and highlight), a COST line points back to its moment, and an
// empty hunt still makes a page. Plus the two test-bed scenarios: the same events, ending two ways.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G, finishHunt } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { pickMoments, momentLine, aarLines, aarLogLines, costLines, highlight, heldField, compass, type AarEv } from '../src/sim/aar.ts';
import { scenarioByName, startScenario, leaveScenario, autoScenario } from '../src/sim/scenarios.ts';
import { startCompanyContract, newCompany } from '../src/sim/company.ts';
import { takeJob, rollJobs } from '../src/sim/contract.ts';
import { playOut } from '../src/sim/autoplay.ts';
import { startHunt } from './helpers.ts';

afterEach(() => { G.co = null; G.ct = null; G.crew = null; leaveScenario(); });

// a hand-made event (positions in tiles)
let n = 0;
function ev(p: Partial<AarEv> & { kind: AarEv['kind']; sub: string; side: 'P' | 'E' }, a?: [number, number], b?: [number, number]): AarEv {
  return { n: n++, turn: 1, a: '', b: '', ax: a ? (a[0] + 0.5) * T : NaN, ay: a ? (a[1] + 0.5) * T : NaN, bx: b ? (b[0] + 0.5) * T : NaN, by: b ? (b[1] + 0.5) * T : NaN,
    aName: '', bName: '', how: '', what: '', rear: false, known: false, ...p } as AarEv;
}
// the scripted lance plays seeded hunts until one has events of every kind
function playedHunts(k = 12) { const out: any[] = []; for (let s = 1; s <= k; s++) { startHunt(s, undefined, 'blocks'); playOut(80); out.push({ ev: [...G.aar], outcome: G.outcome }); } return out; }

describe('the after-action record (R22)', () => {
  it('records all three kinds over a few hunts, with an END on every finished hunt', () => {
    const H = playedHunts();
    const all = H.flatMap(h => h.ev);
    for (const k of ['SEEN', 'HIT', 'OBJ']) expect(all.some((e: AarEv) => e.kind === k)).toBe(true);
    for (const s of ['DETECT', 'KILL', 'END']) expect(all.some((e: AarEv) => e.sub === s)).toBe(true);
    expect(all.some((e: AarEv) => e.sub === 'DETECT' && e.side === 'E')).toBe(true); // the field finding the lance
    expect(all.some((e: AarEv) => e.sub === 'DETECT' && e.side === 'P')).toBe(true); // the lance finding the field
    for (const h of H) if (h.outcome) expect(h.ev.filter((e: AarEv) => e.sub === 'END').length).toBe(1);
    // a first detection is recorded once per pair
    for (const h of H) { const pk = h.ev.filter((e: AarEv) => e.sub === 'DETECT' && e.side === 'P').map((e: AarEv) => e.b); expect(new Set(pk).size).toBe(pk.length); }
  });
  it('the same seed records the same events', () => {
    startHunt(3, undefined, 'blocks'); playOut(80); const a = JSON.stringify(G.aar);
    startHunt(3, undefined, 'blocks'); playOut(80); expect(JSON.stringify(G.aar)).toBe(a);
  });
  it('the always-in moments (the end, KIA, suits down, the first time the lance was found) survive the cap', () => {
    const E: AarEv[] = [];
    E.push(ev({ kind: 'SEEN', sub: 'DETECT', side: 'P', a: 'A', b: 'U9', how: 'RADAR' }, [1, 1], [9, 9]));
    for (let i = 0; i < 12; i++) E.push(ev({ kind: 'HIT', sub: 'KILL', side: 'P', a: 'A', b: 'U' + i, turn: 2 + i }, [1, 1], [5, 5]));
    const first = ev({ kind: 'SEEN', sub: 'DETECT', side: 'E', a: 'U1', b: 'B', how: 'SOUND', turn: 3 }, [9, 1], [1, 1]); E.push(first);
    E.push(ev({ kind: 'SEEN', sub: 'DETECT', side: 'E', a: 'U2', b: 'A', how: 'EYES', turn: 4 }, [9, 1], [1, 1]));
    const down = ev({ kind: 'HIT', sub: 'DOWN', side: 'E', a: 'U1', b: 'B', what: 'CRITICAL', turn: 9 }, [9, 1], [1, 1]); E.push(down);
    const kia = ev({ kind: 'HIT', sub: 'KIA', side: 'P', b: 'B', what: 'Jok', turn: 15 }); E.push(kia);
    const end = ev({ kind: 'OBJ', sub: 'END', side: 'P', what: 'BAIL: extracted', turn: 15 }); E.push(end);
    const M = pickMoments(E);
    expect(M.length).toBe(TUNE.AAR_MAX_MOMENTS);
    for (const must of [first, down, kia, end]) expect(M.some(m => m.n === must.n)).toBe(true);
    for (let i = 1; i < M.length; i++) expect(M[i].turn).toBeGreaterThanOrEqual(M[i - 1].turn); // in turn order
    // more always-in than the cap: the end and the KIA still come first
    const many = [end, kia, first, ...Array.from({ length: 8 }, (_, i) => ev({ kind: 'HIT', sub: 'DOWN', side: 'E', b: 'A', turn: 5 + i }))];
    const M2 = pickMoments(many);
    expect(M2.length).toBe(TUNE.AAR_MAX_MOMENTS);
    expect(M2.some(m => m.n === end.n) && M2.some(m => m.n === kia.n) && M2.some(m => m.n === first.n)).toBe(true);
  });
  it('held the field shows the enemy side in full; lost or bailed redacts identity, range and position', () => {
    const e = ev({ kind: 'SEEN', sub: 'DETECT', side: 'E', a: 'U3', b: 'A', aName: 'patrol (heavy)', bName: 'A Kestrel', how: 'SOUND', what: 'SPRINT' }, [16, 4], [10, 10]);
    const held = momentLine(e, true), lost = momentLine(e, false);
    expect(held.redacted).toBe(false);
    expect(held.text).toContain('patrol (heavy)'); expect(held.text).toContain('sprinting'); expect(held.text).toMatch(/\d+ tiles NE/);
    expect(lost.redacted).toBe(true);
    expect(lost.text.startsWith('???')).toBe(true);
    expect(lost.text).not.toContain('patrol'); expect(lost.text).not.toContain('heavy'); expect(lost.text).not.toMatch(/\d+ tile/);
    expect(lost.text).toContain('A Kestrel'); expect(lost.text).toContain('(NE?)');
    // a hit taken: the shooter is unseen when lost
    const h = ev({ kind: 'HIT', sub: 'PART', side: 'E', a: 'U3', b: 'B', aName: 'turret (gun)', bName: 'B Rook', what: 'LEGS' }, [20, 10], [10, 10]);
    expect(momentLine(h, false).text).toBe('B Rook’s LEGS wrecked, hit from the E, shooter unseen');
    expect(momentLine(h, true).text).toContain('turret (gun) wrecked B Rook’s LEGS, 10 tiles E');
    // the lance's own side is never redacted, but it names a field unit only as the lance knew it
    const p = ev({ kind: 'SEEN', sub: 'DETECT', side: 'P', a: 'A', b: 'U3', aName: 'A', bName: 'patrol (heavy)', how: 'RADAR' }, [10, 10], [16, 10]);
    expect(momentLine(p, false).redacted).toBe(false);
    expect(momentLine(p, false).text).not.toContain('heavy');
    expect(momentLine(p, true).text).toContain('patrol (heavy)');
    expect(heldField('WIN UPLINK')).toBe(true); expect(heldField('BAIL')).toBe(false); expect(heldField('LOSS')).toBe(false); expect(heldField('FAIL')).toBe(false);
  });
  it('a KIA folds into its suit-down line (one line per suit); route picks rank below hits', () => {
    const down = ev({ kind: 'HIT', sub: 'DOWN', side: 'E', a: 'U1', b: 'B', aName: 'turret (gun)', bName: 'B Jok', what: 'CRITICAL', kia: true, turn: 4 }, [12, 10], [10, 10]);
    expect(momentLine(down, false).text).toBe('B Jok went down: CRITICAL, hit from the E, shooter unseen; left behind: KIA');
    const route = ev({ kind: 'OBJ', sub: 'ROUTE', side: 'P', what: 'NORTH at J1' }), part = ev({ kind: 'HIT', sub: 'PART', side: 'P', what: 'LEGS' });
    const M = pickMoments([route, part, down], 2);
    expect(M.some(m => m.n === down.n) && M.some(m => m.n === part.n)).toBe(true);
    // played: no hunt has both a DOWN and a KIA line for the same suit
    for (let s = 1; s <= 8; s++) { startHunt(s, undefined, 'blocks'); for (const m of G.lance) m.op = { id: 'o' + m.id, name: 'Op ' + m.id, skill: 'AIM', lvl: 1 }; playOut(80);
      for (const k of G.aar.filter((e: AarEv) => e.sub === 'KIA')) expect(G.aar.some((e: AarEv) => e.sub === 'DOWN' && e.b === k.b)).toBe(false); }
  });
  it('bearings round to AAR_REDACT_BEARING compass points', () => {
    expect(compass(0, 0, 0, -10)).toBe('N'); expect(compass(0, 0, 10, 0)).toBe('E'); expect(compass(0, 0, -10, 10)).toBe('SW');
    expect(compass(0, 0, 10, -4)).toBe('E'); // 68° → E on 8 points
    expect(compass(0, 0, 10, -4, 16)).toBe('ENE');
  });
  it('the highlight of a redacted moment holds no hidden enemy position; held shows it', () => {
    startHunt(1, undefined, 'blocks');
    const A = G.lance[0];
    const e = ev({ kind: 'HIT', sub: 'PART', side: 'E', a: 'U0', b: A.id, aName: 'turret (gun)', bName: 'A', what: 'LEGS' }, [30, 5], [Math.floor(A.x / T), Math.floor(A.y / T)]);
    const foe = { x: e.ax, y: e.ay };
    const R = highlight(e, false), Hd = highlight(e, true);
    const pts = (h: any) => [...h.own, ...h.foe, ...(h.spot ? [h.spot] : []), ...(h.line ? [{ x: h.line[0], y: h.line[1] }, { x: h.line[2], y: h.line[3] }] : [])];
    expect(R.foe.length).toBe(0); expect(R.line).toBe(null);
    expect(pts(R).some(p => p.x === foe.x && p.y === foe.y)).toBe(false);
    expect(R.bearing).not.toBe(null); expect(R.own.length).toBe(1);
    expect(Hd.foe.some(p => p.x === foe.x && p.y === foe.y)).toBe(true); expect(Hd.line).not.toBe(null); expect(Hd.bearing).toBe(null);
  });
  it('a COST line points back to the moment that caused it (hand-made)', () => {
    startHunt(1, undefined, 'blocks');
    const A = G.lance[0]; A.hits0 = A.hits; A.parts.LEGS = 0; A.partsLost = ['LEGS']; A.hits -= 2;
    G.outcome = 'BAIL';
    const C = costLines([{ turn: 7, sub: 'PART', b: A.id }, { turn: 9, sub: 'END' }]);
    const line = C.find(c => c.text.startsWith(A.id))!;
    expect(line.text).toContain('LEGS wrecked'); expect(line.ref).toBe(7);
    expect(costLines([{ turn: 9, sub: 'END' }]).find(c => c.text.startsWith(A.id))!.ref).toBe(null); // its moment not shown: no arrow
  });
  it('a COST line points back to a shown moment in a played company contract', () => {
    newCompany(2205); startCompanyContract(2205);
    let guard = 0;
    while (G.ct.status === 'ACTIVE' && guard++ < 6) {
      takeJob(0); playOut(80);
      const L = aarLines(), shown = pickMoments();
      const C = costLines(shown);
      expect(C.length).toBeGreaterThan(0);
      for (const c of C) if (c.ref !== null) expect(L.some(l => l.turn === c.ref)).toBe(true);
      const hurt = G.lance.find(m => !m.dead && m.hits < m.hits0 && (m.partsLost || []).some(p => p !== 'CORE'));
      const partShown = hurt && shown.find(m => m.sub === 'PART' && m.b === hurt.id);
      if (partShown) { expect(C.find(c => c.text.startsWith(hurt.id))!.ref).toBe(partShown.turn); break; }
      if (G.ct.status === 'ACTIVE') rollJobs();
    }
  });
  it('a hunt with no events still gives a valid page', () => {
    startHunt(1, undefined, 'blocks');
    expect(G.aar.length).toBe(0);
    expect(pickMoments([])).toEqual([]);
    expect(aarLines([], 'BAIL')).toEqual([]);
    finishHunt('BAIL'); // ended at once: only the END
    const L = aarLines();
    expect(L.length).toBe(1); expect(L[0].sub).toBe('END'); expect(L[0].text).toContain('BAIL');
    expect(aarLogLines(L)[0]).toMatch(/^\[AAR T1 OBJ held\] BAIL/);
    expect(Array.isArray(costLines([]))).toBe(true);
  });
  it('test bed: Held the field and Bailed play the same events and end two ways', () => {
    const run = (name: string) => { const s = scenarioByName(name)!; startScenario(s); autoScenario(); const out = { outcome: G.outcome, ev: G.aar.filter((e: AarEv) => e.sub !== 'END').map((e: AarEv) => e.sub + e.side + e.turn + e.a + e.b).join(' '), lines: aarLines() }; leaveScenario(); return out; };
    const H = run('Held the field'), B = run('Bailed');
    expect(H.outcome.startsWith('WIN')).toBe(true);
    expect(B.outcome).toBe('BAIL');
    expect(B.ev).toBe(H.ev);
    expect(H.lines.some(l => l.redacted)).toBe(false);
    expect(B.lines.some(l => l.redacted)).toBe(true);
    expect(H.lines.length).toBeGreaterThanOrEqual(3);
  });
});

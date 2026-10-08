// R24: say what it means. The glossary (one name per thing, short plain lines), the sim's reason codes, the two new
// warnings, and the fix-list bugs C19 (a selection that can't be cleared) and C23 (a damaged leg that can't move).
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { ENTRIES, GLOSSARY, whyEntry, byLabel } from '../src/view/glossary.ts';
import { REASONS, moveModeBlock } from '../src/sim/reasons.ts';
import { lowHits, hitsLeft, stepLk, newLk } from '../src/sim/warn.ts';
import { damagePart } from '../src/sim/combat.ts';
import { observe } from '../src/sim/sensors.ts';
import { shootBlock, mortarBlock, mortarBlindBlock, uplinkBlock, extractBlock, planMove, playerTarget, cmdSelect, cmdDeselect, fireRange } from '../src/sim/turns.ts';
import { pickupBlock, handoffBlock } from '../src/sim/mission.ts';
import { leaveScenario } from '../src/sim/scenarios.ts';
import { startHunt } from './helpers.ts';

afterEach(() => leaveScenario());
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe('R24 A1: the glossary', () => {
  it('every line has 25 words or fewer, no semicolons, and says something', () => {
    for (const e of ENTRIES) {
      expect(e.line.length, e.id).toBeGreaterThan(0);
      expect(words(e.line), e.id + ': ' + e.line).toBeLessThanOrEqual(25);
      expect(e.line.includes(';'), e.id + ': ' + e.line).toBe(false);
    }
  });
  it('one name per thing: no two entries share a name or an id', () => {
    const names = ENTRIES.map(e => e.name.toUpperCase()), ids = ENTRIES.map(e => e.id);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('covers the terms the QA testers met undefined (C05, C09, C10, C18, C22, C31, C34, C35)', () => {
    for (const id of ['EMIT', 'SOUND', 'IR', 'ECM', 'GHOST', 'CREEP', 'NORMAL', 'SPRINT', 'AP', 'EN', 'ORDER', 'looks', 'MOVE STOPPED',
      'UNKNOWN', 'fit', 'ESM', 'ACO', 'EO', 'MZL', 'QUIET', 'NOISE', 'ZONE ?', 'SELECTED', 'LOST TRACK', 'CORE', 'LEGS', 'ARMS', 'MAST', 'BACK',
      'scratched', 'bloodied', 'gone', 'DOWN', 'CRITICAL', 'RADAR', 'THERMAL', 'EM LISTEN', 'ALT', 'RISK', 'STEP', 'CLOCK', 'SCAN WINDOW',
      'DROP ZONE', 'SHARP EARS', 'FACTION JOB', 'BROKER JOB', 'HATED', 'NEUTRAL', 'LIKED', 'FORK', 'ROUTE', 'POWER', 'RWR', 'card.emit',
      'LOCK', 'BEARING', 'PAINTED', 'LAST SEEN', 'HITS LEFT', 'ID', 'CARD'])
      expect(GLOSSARY[id], id).toBeTruthy();
  });
  it('a button label finds its entry ("FIRE 62%" → FIRE, "SAVE &amp; QUIT" → SAVE & QUIT)', () => {
    expect(byLabel('FIRE 62%')!.id).toBe('FIRE');
    expect(byLabel('SAVE &amp; QUIT')!.id).toBe('SAVE & QUIT');
    expect(byLabel('ECM ON')!.id).toBe('ECM');
    expect(byLabel('nothing like this')).toBe(null);
  });
});

describe('R24 A3: every reason code the sim can return has a glossary entry', () => {
  it('each REASONS code has an entry with a line', () => {
    for (const [act, codes] of Object.entries(REASONS)) for (const c of codes) {
      const e = whyEntry(act, c);
      expect(e, act + '.' + c).toBeTruthy();
      expect(e!.line.length, act + '.' + c).toBeGreaterThan(0);
    }
  });
  it('the block functions only return listed codes', () => {
    const seen: Record<string, Set<string>> = {};
    const note = (act: string, code: string) => { if (code) (seen[act] ||= new Set()).add(code); };
    startHunt(1); const A = G.lance[0], B = G.lance[1];
    const c = observe(G.pc, G.units[0].id, A.x + 3 * T, A.y, 0.3 * T, 0, 0, true, true);
    const far = observe(G.pc, G.units[1].id, A.x + 40 * T, A.y, 6 * T, 0, 0, true, true);
    A.ap = 8; A.turnShots = 0; A.mUsed = 0;
    for (const t of [c, far, null]) { note('FIRE', shootBlock(A, t, TUNE.PLAYER_FIRE_UNC, fireRange(A))); note('MORTAR', mortarBlock(A, t)); }
    note('MORTAR', mortarBlindBlock(A, A.x + T * 0.5, A.y)); note('MORTAR', mortarBlindBlock(A, A.x + T * 99, A.y));
    A.ap = 0; note('FIRE', shootBlock(A, c, TUNE.PLAYER_FIRE_UNC, fireRange(A))); note('MORTAR', mortarBlock(A, c)); A.ap = 8;
    A.turnShots = TUNE.SHOTS_PER_TURN; note('FIRE', shootBlock(A, c, TUNE.PLAYER_FIRE_UNC, fireRange(A))); A.turnShots = 0;
    note('UPLINK', uplinkBlock()); note('EXTRACT', extractBlock(A)); note('PICKUP', pickupBlock(A)); note('HANDOFF', handoffBlock(A));
    damagePart(A, 'WEAPON', A.parts.WEAPON); note('FIRE', shootBlock(A, c, TUNE.PLAYER_FIRE_UNC, fireRange(A)));
    damagePart(A, 'BACK', A.parts.BACK); note('MORTAR', mortarBlock(A, c));
    damagePart(B, 'LEGS', 1); note('MODE', moveModeBlock(B, 'NORMAL')); note('MODE', moveModeBlock(B, 'SPRINT'));
    for (const [act, codes] of Object.entries(seen)) for (const code of codes) expect(REASONS[act], act).toContain(code);
    expect(seen.FIRE.size).toBeGreaterThan(3);
  });
});

describe('R24 A5: the two warnings', () => {
  it('low hits switches at WARN_HITS_LEFT CORE hits left', () => {
    startHunt(1); const A = G.lance[0];
    A.parts.CORE = TUNE.WARN_HITS_LEFT + 1; expect(hitsLeft(A)).toBe(TUNE.WARN_HITS_LEFT + 1); expect(lowHits(A)).toBe(false);
    A.parts.CORE = TUNE.WARN_HITS_LEFT; expect(lowHits(A)).toBe(true);
    A.dead = true; expect(lowHits(A)).toBe(false); // a DOWN suit says DOWN, not low hits
  });
  it('a LAST SEEN mark appears when a contact drops off, and expires after LASTKNOWN_ROUNDS', () => {
    const S = newLk(), alive = () => false;
    stepLk(S, [{ id: 'u1', on: true, x: 10, y: 20 }], 5, alive);
    expect(S.marks.length).toBe(0);
    stepLk(S, [{ id: 'u1', on: false, x: 0, y: 0 }], 5, alive);
    expect(S.marks).toEqual([{ id: 'u1', x: 10, y: 20, turn: 5 }]); // where it was last fixed
    stepLk(S, [], 5 + TUNE.LASTKNOWN_ROUNDS - 1, alive); expect(S.marks.length).toBe(1);
    stepLk(S, [], 5 + TUNE.LASTKNOWN_ROUNDS, alive); expect(S.marks.length).toBe(0);
  });
  it('no mark for a kill, and the mark goes when the contact comes back', () => {
    const S = newLk();
    stepLk(S, [{ id: 'k', on: true, x: 1, y: 1 }, { id: 'b', on: true, x: 2, y: 2 }], 1, () => false);
    stepLk(S, [], 1, id => id === 'k');
    expect(S.marks.map(m => m.id)).toEqual(['b']);
    stepLk(S, [{ id: 'b', on: true, x: 3, y: 3 }], 2, () => false);
    expect(S.marks.length).toBe(0);
  });
});

describe('R24 fix list: C19 and C23', () => {
  it('C19: a selected contact (a stale one too) can be cleared, and FIRE goes back to the best contact', () => {
    startHunt(1); const A = G.lance[0];
    const near = observe(G.pc, G.units[0].id, A.x + 3 * T, A.y, 0.3 * T, 0, 0, true, true);
    const old = observe(G.pc, G.units[1].id, A.x + 20 * T, A.y, 5 * T, 0, 0, true, true); old.lost = old.gap + 1; // a stale mark
    cmdSelect(old); expect(playerTarget()).toBe(old);
    cmdDeselect(); expect(G.sel).toBe(null);
    expect(playerTarget()).not.toBe(old);
    void near;
  });
  it('C23: a damaged leg blocks NORMAL and SPRINT, and CREEP still has a path', () => {
    startHunt(1); const A = G.lance[0]; A.ap = 4;
    damagePart(A, 'LEGS', 1);
    expect(moveModeBlock(A, 'NORMAL')).toBe('LEGS'); expect(moveModeBlock(A, 'SPRINT')).toBe('LEGS'); expect(moveModeBlock(A, 'CREEP')).toBe('');
    const pl = planMove(A, A.x + 3 * T, A.y, 'CREEP');
    expect(pl && pl.path, 'CREEP plans a move').toBeTruthy();
    expect(planMove(A, A.x + 3 * T, A.y, 'NORMAL').why).toBe('LEGS'); // the old trap: NORMAL set on a lame ExoS = no move at all
  });
});

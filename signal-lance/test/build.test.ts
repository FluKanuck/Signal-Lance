// Building toy rules (src/build/rules.ts).
import { describe, expect, it } from 'vitest';
import { ITEMS, byId } from '../src/build/data.ts';
import { emptyBuild, mount, totals, unmount, whyNot } from '../src/build/rules.ts';

const item = (id: string) => byId(ITEMS, id)!;

describe('building toy', () => {
  it('typed hardpoints take their type; O takes anything', () => {
    const b = emptyBuild('warden'); // CORE: I I O
    expect(whyNot(b, 'MAST', 0, item('autocannon'))).toMatch(/needs W/);
    expect(whyNot(b, 'CORE', 2, item('autocannon'))).toBeNull();
  });

  it('output − draw = net regen; no reactor is a problem', () => {
    let b = emptyBuild('warden');
    expect(totals(b).problems).toContain('No reactor in CORE');
    b = mount(b, 'CORE', 0, item('std'));
    b = mount(b, 'MAST', 0, item('lamp'));
    const t = totals(b);
    expect([t.output, t.draw, t.net]).toEqual([14, 2, 12]);
    expect(t.problems).toEqual([]);
  });

  it('a 2-hardpoint module takes two slots in one location and leaves as one', () => {
    let b = emptyBuild('lantern'); // MAST: S S S O
    b = mount(b, 'MAST', 0, item('df'));
    b = mount(b, 'MAST', 2, item('gradio'));
    expect(b.mounts.MAST).toEqual(['df', '^0', 'gradio', '^2']);
    expect(whyNot(b, 'MAST', 1, item('df'))).toBeNull(); // replacing the df's own half is fine
    b = unmount(b, 'MAST', 3);                             // tap the gradiometer's second half
    expect(b.mounts.MAST).toEqual(['df', '^0', null, null]);
  });

  it('one mod per location, and a mod only touches matching modules there', () => {
    let b = mount(emptyBuild('wisp'), 'MAST', 0, item('lamp'));
    b = mount(b, 'MAST', 1, item('m_cold'));
    expect(whyNot(b, 'MAST', 2, item('m_harness'))).toBe('one mod per location');
    const t = totals(b);
    expect(t.locSig.MAST.EM.e).toBeCloseTo(4 * 0.6);
    expect(t.draw).toBe(2 + 2);
  });

  it('a skin absorbs only what its own location contributes', () => {
    let b = mount(emptyBuild('warden'), 'MAST', 0, item('lamp'));
    const before = totals(b).sig.EM.e;
    b = { ...b, skin: { ...b.skin, ARMS: 's_multi' } };
    expect(totals(b).sig.EM.e).toBe(before);
  });
});

describe('building toy: signature split', () => {
  it('reactors are always on; guns, radar and legs only on use', () => {
    let b = emptyBuild('warden');
    b = mount(b, 'CORE', 0, item('std'));        // IR e1, EF e2: always on
    b = mount(b, 'ARMS', 0, item('autocannon')); // SND e6: per shot
    b = mount(b, 'LEGS', 0, item('servos'));     // SND e2: per move
    const t = totals(b);
    expect([t.sig.SND.e, t.sig.SND.u]).toEqual([8, 8]);
    expect([t.sig.EF.e, t.sig.EF.u]).toEqual([2, 0]);
  });
});

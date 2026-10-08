// R25 golden logs (port phase 0): rebuild every golden file and compare it with the committed one. A failure here means
// a rule (or a roll) changed. If that was meant, write them again (npm run sim -- --golden golden) and commit the diff:
// the Godot port is checked against these files.
import { describe, it, expect } from 'vitest';
import { golden, allRuns, stable, fileName } from '../scripts/golden.ts';

const fs = (globalThis as any).process.getBuiltinModule('node:fs');
const DIR = new URL('../golden/', import.meta.url);
const firstDiff = (a: string, b: string) => {
  const A = a.split('\n'), B = b.split('\n');
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return 'line ' + (i + 1) + ': file ' + JSON.stringify((A[i] || '').trim().slice(0, 120)) + ' · now ' + JSON.stringify((B[i] || '').trim().slice(0, 120));
  return '';
};

describe('golden logs (R25, port phase 0)', () => {
  const runs = [...allRuns()];
  it('there is one committed file per seeded run', () => {
    const have = new Set(fs.readdirSync(DIR).filter((f: string) => f.endsWith('.json')));
    for (const [k, s] of runs) expect(have.has(fileName(k, s)), fileName(k, s)).toBe(true);
    expect(have.size).toBe(runs.length);
  });
  for (const [k, s] of runs) it(`${fileName(k, s)} plays the same`, () => {
    const want = fs.readFileSync(new URL(fileName(k, s), DIR), 'utf8'), now = stable(golden(k, s)) + '\n';
    expect(firstDiff(want, now), fileName(k, s) + ' changed. Meant? Run: npm run sim -- --golden golden').toBe('');
  });
  it('a run is the same whatever ran before it', () => {
    const a = stable(golden('contract', 7));
    golden('company', 3003); golden('hunt', 2);
    expect(stable(golden('contract', 7))).toBe(a);
  });
});

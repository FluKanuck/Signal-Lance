// Dev check (not a test): print the hangar templates' load, power and signature.  node --experimental-strip-types scripts/fits.ts
import { HANGAR_TEMPLATES, fitStats, fitHits, fitText } from '../src/sim/kit.ts';
import { splitHits } from '../src/sim/combat.ts';
for (const t of HANGAR_TEMPLATES) {
  const f = t.fit(), s = fitStats(f), parts = splitHits('MECH', fitHits(f));
  console.log(t.role.padEnd(8), fitText(f));
  console.log('        load', s.load, '/', s.rated, 'max', s.max, '| over', JSON.stringify(s.over), '| regen', s.regen, 'pool', s.pool,
    '| EM', s.emBase.toFixed(2), '| hits', JSON.stringify(parts), s.problems.join('; '));
}

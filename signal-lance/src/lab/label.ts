// Visual lab: copy of view/render.ts contactLabel (render.ts grabs the game's #cv canvas on import, so the lab can't import it).
import { TUNE } from '../tune.ts';
import { G, unitById } from '../sim/state.ts';
import { matchVariants, hasReading } from '../sim/ids.ts';

export function contactLabel(c: any) {
  const o = G.obs[c.id], d = G.ids[c.id], u = unitById(c.id);
  const name = o && o.var && u ? u.type + ' ' + o.var : d ? d.v + '?' : c.snd ? '' : 'UNKNOWN';
  const fits = TUNE.ID_SHOW_FITS && !(o && o.var) && hasReading(o) ? ' · ' + matchVariants(o).length + ' fit' : '';
  return (c.snd ? (name ? name + ' · SOUND' : 'SOUND') : name) + fits;
}

// Round 13 step 1: Sound, separate from Emissions. Both sides, same rules.
// A unit's sound is ONE radius (tiles): the loudest event of its current activation, never a sum. It clears at the
// start of that unit's next activation, so every other unit gets exactly one round to hear it. Sound ignores walls.
// Any unit of the other side inside the radius gets a sound contact: true position + a held, seeded offset,
// SOUND_UNC tiles uncertain. A sound-only contact never qualifies for a gun lock or an aimed lob (c.snd).
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { rand } from './rng.ts';
import { G, isMech, isFriend, friends } from './state.ts';
import { observe } from './sensors.ts';
import { zoneType } from './zones.ts';
import { noteSound } from './ids.ts';

// Raise m's sound for this activation to event `kind` (a SOUND_RANGE key) if that is louder. The offset that
// listeners' contacts sit at is rolled when the sound grows, then held (so the contact doesn't jitter).
export function makeSound(m, kind: string) {
  const r = (m.snd || TUNE.SOUND_RANGE)[kind] || 0; // R14: a field unit's variant sets its own radii
  if (kind === 'SPRINT' && isMech(m)) m.sprints = (m.sprints || 0) + 1; // log line: sprints this hunt
  if (r <= (m.sound || 0)) return;
  m.sound = r; m.sndKind = kind; // R14: what made it (a step or a shot: the lance writes it down)
  const a = rand() * 6.2832, k = 0.7 * Math.sqrt(rand());
  m.sndOff = { x: Math.cos(a) * k, y: Math.sin(a) * k };
  m.loudest = Math.max(m.loudest || 0, r);
}
// Start of m's activation: last activation's sound is gone.
export function clearSound(m) { m.sound = 0; m.heardBy = []; }
// The radius others hear m at right now (tiles): QUIET ground muffles it, like Emissions.
export function soundRadius(m) { return (m.sound || 0) * (zoneType(m) === 'QUIET' ? TUNE.ZONE_TYPES.QUIET.SIG_MULT : 1); }

// Every sounding unit is heard by each living unit of the other side inside its radius.
export function hearSounds() {
  for (const s of [...friends(), ...G.units]) { // R15 s3: the Escort transport's steps are heard by the field
    if (s.dead || !(s.sound > 0)) continue;
    const r = soundRadius(s) * T, u = TUNE.SOUND_UNC * T;
    for (const l of isFriend(s) ? G.units : G.lance) {
      if (l.dead || Math.hypot(l.x - s.x, l.y - s.y) > r) continue;
      const list = isMech(l) ? G.pc : l.ec;
      // never loosen a better live fix: sound only says "something is over there"
      const have = list.find(c => c.on && c.id === s.id);
      if (have && !have.snd && have.lost <= have.gap && have.unc <= u) continue;
      observe(list, s.id, s.x + s.sndOff.x * u, s.y + s.sndOff.y * u, u, 0, 0, true, true, false, 'SOUND');
      const key = isMech(l) ? 'lance' : l.id; // the lance shares one contact picture, so it hears once
      if (isMech(l)) noteSound(s, soundRadius(s)); // R14: the lance writes down what it heard (step or shot, how far it carried)
      if (!s.heardBy.includes(key)) { s.heardBy.push(key); s.heardN = (s.heardN || 0) + 1; }
    }
  }
}

// " · loudest 12 · sprints 4 · heard 6×" for this hunt's log line (+ " · alarms 3" with the pack on)
export function soundText() {
  const loud = Math.max(0, ...G.lance.map(m => m.loudest || 0)), spr = G.lance.reduce((a, m) => a + (m.sprints || 0), 0);
  const heard = G.lance.reduce((a, m) => a + (m.heardN || 0), 0);
  return ' · loudest ' + loud + ' · sprints ' + spr + ' · heard ' + heard + '×' + (TUNE.PACK_ENABLED ? ' · alarms ' + G.alarmLog.length : '');
}

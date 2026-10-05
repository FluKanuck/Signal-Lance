// Building toy: role templates, a quick start before tuning your own suit.
// Each row lists what goes in each location; buildTemplate() places it through the same rules as a tap
// (typed hardpoints first, then OPEN), so a template can never hold an illegal fit.
// test/build.test.ts checks every template launches and sits within rated load.
import { ITEMS, byId } from './data.ts';
import type { Chassis, Loc } from './data.ts';
import { emptyBuild, frameOf, mount, whyNot } from './rules.ts';
import type { Build } from './rules.ts';

export interface Template {
  id: string; role: string; blurb: string;
  frame: string; chassis: Chassis;
  fit: [Loc, string][];
  plate?: Partial<Record<Loc, string>>;
  skin?: Partial<Record<Loc, string>>;
}

export const TEMPLATES: Template[] = [
  { id: 't_scout', role: 'Scout', frame: 'wisp', chassis: 'composite',
    blurb: 'Sees first. Needle radar for reach, long glass for eyes, quiet legs. Don’t trade shots.',
    fit: [['MAST', 'needle'], ['MAST', 'emarray'], ['MAST', 'longglass'], ['ARMS', 'carbinesup'],
      ['CORE', 'std'], ['CORE', 'battery'], ['LEGS', 'silent'], ['LEGS', 'servos']],
    plate: { CORE: 'p_comp' }, skin: { MAST: 's_ram' } },
  { id: 't_line', role: 'Line', frame: 'warden', chassis: 'steel',
    blurb: 'Today’s suit, fitted properly. Lamp radar, autocannon, mask for when you’re found.',
    fit: [['MAST', 'lamp'], ['MAST', 'emarray'], ['ARMS', 'autocannon'], ['CORE', 'std'], ['CORE', 'battery'],
      ['CORE', 'mask'], ['BACK', 'smoke'], ['LEGS', 'servos']],
    plate: { ARMS: 'p_steel', CORE: 'p_steel' } },
  { id: 't_brawler', role: 'Brawler', frame: 'bulwark', chassis: 'steel',
    blurb: 'Loud on every channel and doesn’t care. Hot core, three guns, plated arms and core.',
    fit: [['MAST', 'emarray'], ['ARMS', 'autocannon'], ['ARMS', 'autocannon'], ['ARMS', 'carbine'],
      ['CORE', 'hotcore'], ['CORE', 'ammobin'], ['BACK', 'smoke'], ['LEGS', 'servos'], ['LEGS', 'stabil']],
    plate: { ARMS: 'p_steel', CORE: 'p_steel' } },
  { id: 't_support', role: 'Fire support', frame: 'mule', chassis: 'steel',
    blurb: 'Hangs back and lobs. Heavy mortar on the back, Lamp to find targets, plate where flankers hit.',
    fit: [['MAST', 'lamp'], ['ARMS', 'carbine'], ['CORE', 'std'], ['CORE', 'battery'], ['CORE', 'ammobin'],
      ['BACK', 'hmortar'], ['BACK', 'smoke'], ['LEGS', 'servos']],
    plate: { CORE: 'p_steel', BACK: 'p_steel' } },
  { id: 't_ew', role: 'EW', frame: 'lantern', chassis: 'alloy',
    blurb: 'Big ears, no radar. Direction-finder for bearings and type, mask and ghost to confuse.',
    fit: [['MAST', 'df'], ['MAST', 'mask'], ['MAST', 'ghost'], ['ARMS', 'pulselaser'],
      ['CORE', 'hotcore'], ['CORE', 'battery'], ['CORE', 'battery'], ['LEGS', 'servos']],
    plate: { CORE: 'p_comp' }, skin: { MAST: 's_ram' } },
  { id: 't_infil', role: 'Infiltrator', frame: 'ferret', chassis: 'composite',
    blurb: 'Hears everything, is heard by nothing. Acoustic array, suppressed carbine, baffled legs.',
    fit: [['MAST', 'acoustic'], ['MAST', 'magneto'], ['ARMS', 'carbinesup'], ['CORE', 'cell'], ['BACK', 'smoke'],
      ['LEGS', 'silent'], ['LEGS', 'servos'], ['LEGS', 'm_baffles']],
    skin: { LEGS: 's_foam', CORE: 's_thermal' } },
  { id: 't_breach', role: 'Breacher', frame: 'sapper', chassis: 'alloy',
    blurb: 'Goes through the wall, not around it. Claw and breaching kit up close, a demo charge for the door.',
    fit: [['MAST', 'emarray'], ['ARMS', 'claw'], ['CORE', 'std'], ['CORE', 'battery'],
      ['BACK', 'breach'], ['BACK', 'demo'], ['BACK', 'vibro'], ['LEGS', 'servos']],
    plate: { ARMS: 'p_steel', CORE: 'p_reactive' } },
  { id: 't_stealth', role: 'Stealth', frame: 'wraith', chassis: 'composite',
    blurb: 'Switch the cloak on and the eyes lose you. Costs power and heat, and lidar and thermal still see you.',
    fit: [['MAST', 'cloak'], ['MAST', 'acoustic'], ['ARMS', 'carbinesup'], ['CORE', 'cell'], ['CORE', 'battery'],
      ['LEGS', 'silent'], ['LEGS', 'servos']],
    skin: { CORE: 's_thermal' } },
  { id: 't_drones', role: 'Drone carrier', frame: 'shepherd', chassis: 'steel',
    blurb: 'PLACEHOLDER. Sees through its drones: a hive of small ones, a spotter, and a datalink to share what they find.',
    fit: [['MAST', 'emarray'], ['MAST', 'datalink'], ['ARMS', 'carbine'], ['CORE', 'std'], ['CORE', 'battery'],
      ['BACK', 'd_hive'], ['BACK', 'd_spotter'], ['BACK', 'm_dronelink'], ['LEGS', 'servos']],
    plate: { CORE: 'p_steel' } },
];

/** Builds a template through the normal fit rules. Throws if a row can't be placed (the tests catch that). */
export function buildTemplate(t: Template): Build {
  let b = emptyBuild(t.frame, t.chassis);
  for (const [loc, id] of t.fit) {
    const item = byId(ITEMS, id);
    if (!item) throw new Error(`${t.id}: no item ${id}`);
    const slots = frameOf(b).slots[loc];
    const free = slots.map((s, i) => ({ s, i })).filter(x => b.mounts[loc][x.i] === null && !whyNot(b, loc, x.i, item));
    const pick = free.find(x => x.s !== 'O') ?? free[0];
    if (!pick) throw new Error(`${t.id}: ${item.name} doesn't fit in ${loc}`);
    b = mount(b, loc, pick.i, item);
  }
  b.plate = { ...b.plate, ...t.plate };
  b.skin = { ...b.skin, ...t.skin };
  return b;
}

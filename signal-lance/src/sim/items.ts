// R18 (A1): the item table. Moved here from the hangar toy (src/build/data.ts), so the hunt and the toy read the same rows.
// Catalogue rows (claude/signal-lance-catalogue.md): every number is a PLACEHOLDER from the catalogue; where the catalogue
// gives no weight or draw, the toy guessed one (marked "guess"). New content = new rows here, never new code in fit.ts.
// A3: the hunt's stats live on the row too (radar, gun, mortar below); TUNE keeps only the global rules.

export type Loc = 'MAST' | 'ARMS' | 'CORE' | 'BACK' | 'LEGS';
export const LOCS: Loc[] = ['MAST', 'ARMS', 'CORE', 'BACK', 'LEGS'];
export type HP = 'S' | 'W' | 'I' | 'U' | 'M' | 'O';
export type Ch = 'VIS' | 'SND' | 'IR' | 'EM' | 'EF' | 'MAG';
export const CHS: Ch[] = ['VIS', 'SND', 'IR', 'EM', 'EF', 'MAG'];
export type Chassis = 'steel' | 'alloy' | 'composite';

/** Per channel: e = Emit, v = Visibility. Absorb lives on skins and mods (fractions 0..1). */
export type Sig = Partial<Record<Ch, { e?: number; v?: number }>>;
export type Absorb = Partial<Record<Ch, { e?: number; v?: number }>>;

export interface Frame {
  id: string; name: string; cls: string; rated: number; max: number;
  vis: { VIS: number; EM: number; MAG: number };   // base Visibility (spread across the frame's locations)
  slots: Record<Loc, HP[]>;
  chassis: Chassis[];                               // materials this frame comes in
  role: string;
  hits?: number;                                    // R18: base hits before plates (the old PLAYER_HITS / FIELD_TYPES.BASE_HITS). R18: 3 for every hangar frame (= PLAYER_HITS); frames differ by hardpoints, load and visibility, plates add the hits
  field?: boolean;                                  // R18: a field unit's frame (turret, emplacement, patrol): never in a hangar
}

/** R18 (A3): what the hunt reads from a row. Each family has one stats shape. */
export interface RadarStats { range: number; halfAng: number; ap: number; en: number; emit: number; sig: number }
export interface GunStats { rounds: number; range: number; hit: number; snd: number; falloff?: number } // falloff: % lost per tile past HIT_RANGE_FREE (default HIT_RANGE_PER_TILE)
export interface MortarStats { shells: number; ap: number; snd: number; min: number; max: number; scatter: number; perUnc: number }

export interface Item {
  id: string; name: string; family: string;
  hp: HP[];               // hardpoint types it accepts (O always accepts anything, see rules.fits)
  size?: 2;               // takes two hardpoints in the same location
  wt: number; draw: number;
  out?: number;           // reactor output
  pool?: number;          // extra Energy pool (batteries)
  use?: string;           // per-activation cost, display only
  tags: string[];
  sig: Sig;
  effect: string; trade: string;
  mod?: Mod;
  price?: number;         // R21 cp3: market price in credits (the hangar's cheap set has one; the rest come later with item balancing, #76)
  stealth?: Stealth;      // an active stealth system: costs nothing until switched on (see rules.totals)
  radar?: RadarStats;     // R18: range tiles, half-angle degrees, AP + EN per pulse, EMIT added per pulse, signature while on
  gun?: GunStats;         // R18: rounds loaded, range tiles, base to-hit %, shot Sound radius (tiles)
  mortar?: MortarStats;   // R18: shells, AP per lob, launch Sound radius, min / max range, scatter = scatter + fix unc × perUnc (tiles)
}

/**
 * Catalogue §7: stealth costs your EW. While on, every EW and LINK module goes offline, plus anything
 * tagged in `blocks`; the system adds its draw and heat, and hides `abs` across the whole suit.
 */
export interface Stealth { abs: Absorb; draw: number; sig: Sig; blocks?: string[] }

/** A mod changes matching modules in the SAME location (one mod per location). */
export interface Mod {
  tag: string | 'any';
  emitMult?: Partial<Record<Ch, number>>;  // × Emit of matching modules in this location
  drawAdd?: number;                         // flat extra draw
  drawMult?: number;                        // × draw of matching modules
  ratedAdd?: number;                        // change to the frame's rated load
}

export interface Plate { id: string; name: string; hits: number; wt: number; sig: Sig; note: string }
export interface Skin { id: string; name: string; wt: number; draw: number; abs: Absorb; sig: Sig; note: string }

export const CHASSIS: Record<Chassis, { mag: number; rated: number; note: string }> = {
  steel:     { mag: 0,  rated: 0, note: 'cheap, tough, high MAG' },
  alloy:     { mag: -1, rated: 1, note: 'middle (guess: MAG −1, rated +1)' },
  composite: { mag: -2, rated: 2, note: 'light, low MAG, fewer base hits (guess: MAG −2, rated +2)' },
};

const L = (MAST: HP[], ARMS: HP[], CORE: HP[], BACK: HP[], LEGS: HP[]) => ({ MAST, ARMS, CORE, BACK, LEGS });
const ALL: Chassis[] = ['steel', 'alloy', 'composite'];

export const FRAMES: Frame[] = [
  { id: 'wisp', name: 'Wisp', cls: 'Light', rated: 10, max: 13, hits: 3, vis: { VIS: 1, EM: 1, MAG: 2 }, slots: L(['S','S','O'], ['W'], ['I','I'], [], ['M','M']), chassis: ALL, role: 'Scout. Sees far, hits light, folds under fire' },
  { id: 'ferret', name: 'Ferret', cls: 'Light', rated: 9, max: 12, vis: { VIS: 1, EM: 1, MAG: 1 }, slots: L(['S','O'], ['W'], ['I'], ['U'], ['M','M','M']), chassis: ['composite'], role: 'Infiltrator. Quietest frame; tiny reactor space' },
  { id: 'jackal', name: 'Jackal', cls: 'Light', rated: 11, max: 14, vis: { VIS: 2, EM: 2, MAG: 2 }, slots: L(['S'], ['W','W'], ['I','I'], ['U'], ['M','M']), chassis: ALL, role: 'Skirmisher. Hit and fade' },
  { id: 'warden', name: 'Warden', cls: 'Medium', rated: 14, max: 18, hits: 3, vis: { VIS: 3, EM: 3, MAG: 3 }, slots: L(['S','S'], ['W','W'], ['I','I','O'], ['U'], ['M']), chassis: ALL, role: 'Line suit, all-rounder' },
  { id: 'lantern', name: 'Lantern', cls: 'Medium', rated: 13, max: 16, vis: { VIS: 3, EM: 3, MAG: 3 }, slots: L(['S','S','S','O'], ['W'], ['I','I','I'], [], ['M']), chassis: ALL, role: 'EW platform. Big reactor, big ears; one gun' },
  { id: 'sapper', name: 'Sapper', cls: 'Medium', rated: 15, max: 19, vis: { VIS: 3, EM: 2, MAG: 4 }, slots: L(['S'], ['W'], ['I','I'], ['U','U','O'], ['M']), chassis: ALL, role: 'Breacher and demolition' },
  { id: 'bulwark', name: 'Bulwark', cls: 'Heavy', rated: 18, max: 22, hits: 3, vis: { VIS: 5, EM: 4, MAG: 5 }, slots: L(['S'], ['W','W','W'], ['I','I'], ['U'], ['M','M']), chassis: ALL, role: 'Brawler. Loud on every channel' },
  { id: 'mule', name: 'Mule', cls: 'Heavy', rated: 17, max: 22, vis: { VIS: 5, EM: 4, MAG: 5 }, slots: L(['S'], ['W'], ['I','I','O'], ['U','U','U'], ['M']), chassis: ALL, role: 'Fire support: mortar and launcher platform' },
  { id: 'bastion', name: 'Bastion', cls: 'Assault', rated: 22, max: 26, vis: { VIS: 6, EM: 6, MAG: 7 }, slots: L(['S','S'], ['W','W','W'], ['I','I','I'], ['U','U'], ['M','M']), chassis: ['steel', 'alloy'], role: 'Walking fortress. Magnetometers find it from a district away' },
  { id: 'shepherd', name: 'Shepherd', cls: 'Medium', rated: 14, max: 18, vis: { VIS: 3, EM: 4, MAG: 3 }, slots: L(['S','S'], ['W'], ['I','I'], ['U','U','U','O'], ['M']), chassis: ALL, role: 'PLACEHOLDER drone carrier. Sees through its drones; weak alone, and its control links shout on EM' },
  // R18 (A2): the field's frames, so a field unit has a fit like a suit. A turret / emplacement is a frame with no LEGS.
  // Roomy on purpose (FIELD_TYPES and variants say what goes in); rated / max / vis are unused for now.
  { id: 'f_patrol', name: 'Patrol', cls: 'Field', rated: 99, max: 99, vis: { VIS: 3, EM: 3, MAG: 3 }, hits: 0, field: true, slots: L(['S','S'], ['W'], ['I','I','I','I','I','O'], ['U'], ['M']), chassis: ['steel'], role: 'Field patrol' },
  { id: 'f_turret', name: 'Turret', cls: 'Field', rated: 99, max: 99, vis: { VIS: 3, EM: 3, MAG: 3 }, hits: 0, field: true, slots: L(['S','S'], ['W'], ['I','I','I','I','I','O'], ['U'], []), chassis: ['steel'], role: 'Field turret' },
  { id: 'f_empl', name: 'Emplacement', cls: 'Field', rated: 99, max: 99, vis: { VIS: 3, EM: 3, MAG: 3 }, hits: 0, field: true, slots: L(['S','S'], ['W'], ['I','I','I','I','I','O'], ['U'], []), chassis: ['steel'], role: 'Field emplacement' },
  { id: 'wraith', name: 'Wraith', cls: 'Light (prototype)', rated: 10, max: 12, vis: { VIS: 1, EM: 1, MAG: 1 }, slots: L(['S','S','O'], ['W'], ['I','I'], [], ['M','M']), chassis: ['composite'], role: 'Stealth frame; fragile, pricey, rare' },
];

const I = (r: Omit<Item, 'tags' | 'sig'> & { tags?: string[]; sig?: Sig }): Item => ({ tags: [], sig: {}, ...r });

export const ITEMS: Item[] = [
  // §3 Reactors (CORE)
  I({ id: 'cell', name: 'Cell stack', family: 'Reactor', hp: ['I'], wt: 1, draw: 0, out: 8, tags: ['REACTOR'], sig: { EF: { e: 1 } }, effect: 'Output 8', trade: 'Near-silent; starves anything big' }),
  I({ id: 'std', name: 'Std reactor', family: 'Reactor', hp: ['I'], wt: 2, draw: 0, out: 14, tags: ['REACTOR'], sig: { IR: { e: 1 }, EF: { e: 2 } }, effect: 'Output 14', trade: 'Baseline (broker)' }),
  I({ id: 'fuelcell', name: 'Fuel cell', family: 'Reactor', hp: ['I'], wt: 2, draw: 0, out: 12, tags: ['REACTOR'], sig: { EF: { e: 1 }, SND: { e: 1 } }, effect: 'Output 12, cold', trade: 'Runs dry: −2 output per hunt without refuel parts' }),
  I({ id: 'coldburn', price: 120, name: 'Cold-burn', family: 'Reactor', hp: ['I'], wt: 4, draw: 0, out: 15, tags: ['REACTOR'], sig: { EF: { e: 1 } }, effect: 'Output 15', trade: 'Quiet and heavy' }),
  I({ id: 'hotcore', price: 90, name: 'Hot core', family: 'Reactor', hp: ['I'], wt: 3, draw: 0, out: 20, tags: ['REACTOR'], sig: { IR: { e: 4 }, EF: { e: 3 } }, effect: 'Output 20', trade: 'Thermal sights love it' }),
  I({ id: 'twincells', name: 'Twin cells', family: 'Reactor', hp: ['I'], size: 2, wt: 3, draw: 0, out: 16, tags: ['REACTOR'], sig: { EF: { e: 2 } }, effect: 'Output 2 × 8', trade: 'Redundant: one survives a CORE hit' }),
  // §3 Storage and heat
  I({ id: 'battery', price: 40, name: 'Battery', family: 'Storage', hp: ['I', 'U'], wt: 1, draw: 0, pool: 50, tags: ['BATTERY'], effect: 'Pool +50', trade: 'Weight' }), // R18: the old ENERGY_CELL
  I({ id: 'heatsink', name: 'Heat sink', family: 'Storage', hp: ['I'], wt: 1, draw: 0, effect: 'Stores heat: IR emit delayed', trade: 'Full sink = vented spike' }),
  I({ id: 'fins', name: 'Radiator fins', family: 'Storage', hp: ['O'], wt: 1, draw: 0, sig: { IR: { v: 1 } }, effect: 'IR cools 2× faster', trade: 'IR vis +1' }),
  // §4 Sensors
  I({ id: 'lamp', price: 80, name: 'Radar "Lamp"', family: 'Radar', hp: ['S'], wt: 1, draw: 2, use: '2 AP, 25 EN', tags: ['SENSOR', 'EM', 'RADAR'], sig: { EM: { e: 4 } }, effect: 'Range 18, wide cone (today’s radar)', trade: '—',
    radar: { range: 18, halfAng: 50, ap: 2, en: 25, emit: 30, sig: 12 } }), // R18: the old RADAR_RANGE, RADAR_HALF_ANG, AP_RADAR, RADAR_EN, SIGNAL_RADAR, SIG_RADAR
  I({ id: 'needle', name: 'Radar "Needle"', family: 'Radar', hp: ['S'], wt: 1, draw: 3, use: '2 AP, 25 EN', tags: ['SENSOR', 'EM', 'RADAR'], sig: { EM: { e: 7 } }, effect: 'Range 12, narrow cone', trade: 'Narrow' }),
  I({ id: 'whisper', name: 'Radar "Whisper"', family: 'Radar', hp: ['S'], wt: 1, draw: 4, use: '2 AP, 25 EN', tags: ['SENSOR', 'EM', 'RADAR'], sig: { EM: { e: 2 } }, effect: 'Range 6; arrays need grade 2+ to hear it', trade: 'Short, power-hungry' }),
  I({ id: 'emarray', price: 60, name: 'EM array', family: 'Passive', hp: ['S'], wt: 1, draw: 1, tags: ['SENSOR', 'EM', 'PASSIVE'], effect: 'Bearings on EM emitters', trade: '—' }),
  I({ id: 'df', name: 'Direction-finder', family: 'Passive', hp: ['S'], size: 2, wt: 2, draw: 2, tags: ['SENSOR', 'EM'], effect: 'Bearings + type guess', trade: '2 hardpoints' }),
  I({ id: 'rwr', price: 50, name: 'RWR', family: 'Passive', hp: ['S'], wt: 1, draw: 0, tags: ['SENSOR', 'EM'], effect: 'Warns when painted, with bearing', trade: '—' }),
  I({ id: 'acoustic', name: 'Acoustic array', family: 'Passive', hp: ['S'], wt: 1, draw: 1, tags: ['SENSOR', 'ACOUSTIC'], effect: 'Hears SND at +50% radius', trade: 'Deaf inside NOISE' }),
  I({ id: 'thermal', price: 90, name: 'Thermal optics', family: 'Passive', hp: ['S'], wt: 1, draw: 2, tags: ['SENSOR', 'THERMAL'], effect: 'A heat sight: sees hot things in line of sight beyond your eyes (the hotter, the further)', trade: 'Draw 2; a MAST slot' }),
  I({ id: 'lidar', name: 'Lidar', family: 'Active', hp: ['S'], wt: 1, draw: 2, use: '1 AP', tags: ['SENSOR', 'VISUAL'], sig: { EM: { e: 1 }, VIS: { e: 3 } }, effect: 'Exact fix in LoS', trade: 'Laser-warning receivers see you' }),
  I({ id: 'longglass', name: 'Long glass', family: 'Visual', hp: ['S'], wt: 1, draw: 0, tags: ['SENSOR', 'VISUAL'], effect: 'Eyes range +4', trade: 'Arc −30°' }),
  I({ id: 'magneto', name: 'Magnetometer', family: 'Field', hp: ['S'], wt: 1, draw: 0, tags: ['SENSOR', 'MAGNETIC'], effect: 'Senses mass 3–5 tiles, through walls', trade: 'Blind in industrial terrain' }),
  I({ id: 'gradio', name: 'Gradiometer', family: 'Field', hp: ['S'], size: 2, wt: 2, draw: 1, tags: ['SENSOR', 'MAGNETIC'], effect: 'Magnetometer with bearing, +2 range', trade: 'Heavy, 2 hardpoints' }),
  I({ id: 'datalink', name: 'Datalink', family: 'Recon', hp: ['S'], wt: 1, draw: 1, tags: ['EM', 'LINK'], sig: { EM: { e: 2 } }, effect: 'Lance shares contacts', trade: 'Jammable; a lost link reveals its last ping' }),
  // §5 EW
  I({ id: 'mask', price: 70, name: 'Mask', family: 'Jammer', hp: ['S'], wt: 1, draw: 2, use: '1 AP, 20 EN/turn', tags: ['EW', 'EM', 'MASK'], effect: 'Today’s ECM mask', trade: 'Enemy gets a bearing' }),
  I({ id: 'ghost', price: 60, name: 'Ghost projector', family: 'Jammer', hp: ['S'], wt: 1, draw: 0, use: '1 AP, 25 EN', tags: ['EW', 'EM', 'GHOST'], effect: 'EM decoy', trade: '—' }),
  I({ id: 'barrage', name: 'Barrage jammer', family: 'Jammer', hp: ['S'], wt: 2, draw: 4, tags: ['EW', 'EM'], sig: { EM: { e: 9 } }, effect: 'EM sensors below grade 2 blind inside', trade: 'Every EM array hears you' }),
  I({ id: 'spoofer', name: 'Spoofer', family: 'Jammer', hp: ['S'], wt: 1, draw: 3, tags: ['EW', 'EM'], effect: 'Your EM reads as another unit type', trade: 'Only fools EM' }),
  // §6 Weapons
  I({ id: 'autocannon', price: 100, name: 'Autocannon', family: 'Weapon', hp: ['W'], wt: 2, draw: 0, use: '1 AP', tags: ['WEAPON', 'KINETIC', 'GUN'], sig: { SND: { e: 6 }, VIS: { e: 1 } }, effect: 'KIN (today’s gun)', trade: 'Ammo',
    gun: { rounds: 20, range: 12, hit: 75, snd: 12 } }), // R18: the old 2 × AMMO_PER_SLOT, PLAYER_FIRE_RANGE / ENEMY_FIRE_RANGE, HIT_BASE, SOUND_RANGE.SHOT
  // R18 (Jamie): the sniper turret's gun. Field only for now (not in the hangar's cheap set).
  I({ id: 'longgun', name: 'Long gun', family: 'Weapon', hp: ['W'], wt: 3, draw: 0, use: '1 AP', tags: ['WEAPON', 'KINETIC', 'GUN'], sig: { SND: { e: 8 }, VIS: { e: 2 } }, effect: 'KIN, long: range 20, little loss with range', trade: 'Loud crack; few rounds',
    gun: { rounds: 12, range: 20, hit: 75, snd: 16, falloff: 1 } }),
  I({ id: 'carbine', name: 'Carbine', family: 'Weapon', hp: ['W'], wt: 1, draw: 0, use: '1 AP', tags: ['WEAPON', 'KINETIC'], sig: { SND: { e: 3 }, VIS: { e: 1 } }, effect: 'KIN light', trade: 'Weak vs plate' }),
  I({ id: 'carbinesup', name: 'Carbine (suppressed)', family: 'Weapon', hp: ['W'], wt: 1, draw: 0, use: '1 AP', tags: ['WEAPON', 'KINETIC'], sig: { SND: { e: 1 } }, effect: 'KIN light, quiet', trade: 'Weak vs plate' }),
  I({ id: 'marksman', name: 'Marksman rifle', family: 'Weapon', hp: ['W'], wt: 2, draw: 0, use: '1 AP', tags: ['WEAPON', 'KINETIC'], sig: { SND: { e: 7 }, VIS: { e: 1 } }, effect: 'KIN, long', trade: 'One shot per activation' }),
  I({ id: 'coilgun', name: 'Coilgun', family: 'Weapon', hp: ['W'], wt: 2, draw: 1, use: '1 AP, 20 EN', tags: ['WEAPON', 'KINETIC', 'ENERGY'], sig: { SND: { e: 1 }, MAG: { e: 5 }, EM: { e: 1 } }, effect: 'KIN, no powder', trade: 'Magnetometers hear it charge' }),
  I({ id: 'railgun', name: 'Railgun', family: 'Weapon', hp: ['W'], size: 2, wt: 4, draw: 2, use: '1 AP, 40 EN', tags: ['WEAPON', 'KINETIC', 'ENERGY'], sig: { MAG: { e: 8 }, EF: { e: 4 }, IR: { e: 3 } }, effect: 'KIN heavy, pierces cover', trade: 'Huge power and signature' }),
  I({ id: 'pulselaser', name: 'Pulse laser', family: 'Weapon', hp: ['W'], wt: 1, draw: 1, use: '1 AP, 15 EN', tags: ['WEAPON', 'ENERGY'], sig: { IR: { e: 3 }, VIS: { e: 2 } }, effect: 'ENG, to-hit ↑', trade: 'Heat' }),
  I({ id: 'beamlaser', name: 'Beam laser', family: 'Weapon', hp: ['W'], wt: 2, draw: 1, use: '1 AP, 20 EN', tags: ['WEAPON', 'ENERGY'], sig: { IR: { e: 4 }, VIS: { e: 3 } }, effect: 'ENG', trade: 'Hot; the beam points back at you' }),
  I({ id: 'flamer', name: 'Flamer', family: 'Weapon', hp: ['W'], wt: 2, draw: 0, use: '1 AP', tags: ['WEAPON', 'FIRE'], sig: { IR: { e: 5 }, VIS: { e: 5 } }, effect: 'FIR, area', trade: 'Range 2; burns cover' }),
  I({ id: 'grenade', name: 'Grenade launcher', family: 'Weapon', hp: ['U', 'W'], wt: 1, draw: 0, use: '1 AP', tags: ['WEAPON', 'EXPLOSIVE'], sig: { SND: { e: 4 } }, effect: 'EXP, short lob', trade: 'Ammo' }),
  // §6 Utility weapons and §9 utility (BACK)
  I({ id: 'mortar', price: 110, name: 'Light mortar', family: 'Mortar', hp: ['U'], wt: 2, draw: 0, use: '2 AP', tags: ['WEAPON', 'EXPLOSIVE', 'MORTAR'], sig: { SND: { e: 14 } }, effect: 'EXP, indirect (today’s)', trade: '—',
    mortar: { shells: 6, ap: 2, snd: 14, min: 4, max: 18, scatter: 0.5, perUnc: 0.6 } }), // R18: the old MORTAR_SHELLS, AP_MORTAR, SOUND_RANGE.MORTAR, MORTAR_MIN/MAX_RANGE, MORTAR_SCATTER_BASE / _PER_UNC
  I({ id: 'hmortar', name: 'Heavy mortar', family: 'Mortar', hp: ['U'], size: 2, wt: 4, draw: 0, use: '2 AP', tags: ['WEAPON', 'EXPLOSIVE'], sig: { SND: { e: 16 } }, effect: 'EXP, bigger splash', trade: '4 shells' }),
  I({ id: 'atgm', name: 'ATGM (wire)', family: 'Launcher', hp: ['U'], wt: 2, draw: 0, use: '2 AP', tags: ['WEAPON', 'EXPLOSIVE'], sig: { SND: { e: 5 }, VIS: { e: 2 } }, effect: 'EXP heavy, guided', trade: 'Stay still and visible while it flies' }),
  I({ id: 'ammobin', name: 'Ammo bin', family: 'Utility', hp: ['U', 'I'], wt: 1, draw: 0, effect: '+rounds / +shells', trade: 'Explodes on CORE crit' }),
  I({ id: 'repairkit', name: 'Field repair kit', family: 'Utility', hp: ['U'], wt: 1, draw: 0, use: '3 AP, 1 use', effect: 'Restore 1 hit on a part', trade: 'One use' }),
  I({ id: 'uplinkkit', name: 'Uplink kit', family: 'Utility', hp: ['U'], wt: 1, draw: 0, effect: 'Uplink −1 AP', trade: '—' }),
  I({ id: 'smoke', name: 'Smoke', family: 'Counter', hp: ['U'], wt: 1, draw: 0, use: '1 AP, 2 shots', effect: 'Blocks VIS and lidar', trade: 'Thermal sees through' }),
  I({ id: 'chaff', name: 'Chaff', family: 'Counter', hp: ['U'], wt: 1, draw: 0, use: '1 AP, 1 shot', effect: 'Radar fixes inside go fuzzy', trade: 'One-shot' }),
  // §8 Mobility (LEGS)
  I({ id: 'servos', name: 'Std servos', family: 'Mobility', hp: ['M'], wt: 1, draw: 0, tags: ['MOBILITY'], sig: { SND: { e: 2 } }, effect: 'Baseline', trade: '—' }),
  I({ id: 'sprint', name: 'Sprint servos', family: 'Mobility', hp: ['M'], wt: 1, draw: 0, tags: ['MOBILITY'], sig: { SND: { e: 4 }, IR: { e: 1 } }, effect: 'Sprint EN −50%', trade: 'Louder' }),
  I({ id: 'silent', name: 'Silent-step', family: 'Mobility', hp: ['M'], wt: 2, draw: 0, tags: ['MOBILITY'], sig: { SND: { e: 1 } }, effect: 'CREEP +1 tile per AP', trade: 'wt +1' }),
  I({ id: 'stabil', name: 'Stabilisers', family: 'Mobility', hp: ['M'], wt: 2, draw: 0, tags: ['MOBILITY'], sig: { SND: { e: 2 } }, effect: '"Moved" to-hit penalty halved', trade: 'wt +1' }),
  I({ id: 'myomer', name: 'Myomer boost', family: 'Mobility', hp: ['M'], wt: 1, draw: 1, tags: ['MOBILITY', 'ENERGY'], sig: { SND: { e: 2 }, IR: { e: 3 }, EF: { e: 2 } }, effect: '+1 AP per turn while active', trade: 'Fail roll: the leg seizes' }),
  I({ id: 'jump', name: 'Jump pack', family: 'Mobility', hp: ['M'], wt: 2, draw: 0, tags: ['MOBILITY'], sig: { VIS: { e: 5 }, IR: { e: 4 }, SND: { e: 6 } }, effect: 'Jump up and over', trade: 'Fuel' }),
  I({ id: 'magboots', name: 'Magnetic boots', family: 'Mobility', hp: ['M'], wt: 1, draw: 0, tags: ['MOBILITY'], sig: { SND: { e: 2 }, MAG: { e: 3 } }, effect: 'Cling to walls; no knockdown', trade: 'MAG +3' }),
  // §6 Close in (for the Breacher)
  I({ id: 'claw', name: 'Hydraulic claw', family: 'Melee', hp: ['W', 'U'], wt: 2, draw: 0, use: '1 AP', tags: ['WEAPON', 'KINETIC'], sig: { SND: { e: 2 } }, effect: 'KIN, adjacent; breaches walls', trade: 'Must close in' }),
  I({ id: 'vibro', name: 'Vibro-blade', family: 'Melee', hp: ['W', 'U'], wt: 1, draw: 1, use: '1 AP', tags: ['WEAPON', 'KINETIC'], sig: { SND: { e: 2 }, EF: { e: 1 } }, effect: 'KIN, adjacent', trade: 'Must close in' }),
  I({ id: 'demo', name: 'Demo charge', family: 'Utility', hp: ['U'], wt: 1, draw: 0, use: '2 AP, placed', tags: ['EXPLOSIVE'], sig: { SND: { e: 12 } }, effect: 'EXP, timer or remote', trade: 'Placed by hand' }),
  I({ id: 'breach', name: 'Breaching kit', family: 'Utility', hp: ['U'], wt: 1, draw: 0, use: '2 AP', sig: { SND: { e: 8 } }, effect: 'Opens a wall or door', trade: 'Loud' }),
  // §7 Stealth systems (toggled; draw and heat only while on)
  I({ id: 'cloak', name: 'Photonic cloak', family: 'Stealth', hp: ['S'], size: 2, wt: 2, draw: 0, tags: ['STEALTH'], effect: 'While on: VIS −70% (whole suit)', trade: 'Lidar and thermal still see you',
    stealth: { abs: { VIS: { e: 0.7, v: 0.7 } }, draw: 4, sig: { IR: { e: 2 } } } }),
  I({ id: 'stillskin', name: 'Still-skin', family: 'Stealth', hp: ['I'], size: 2, wt: 2, draw: 0, tags: ['STEALTH'], effect: 'While on: all channels −50% (whole suit; best standing still)', trade: 'Freezes you in place',
    stealth: { abs: Object.fromEntries((['VIS', 'SND', 'IR', 'EM', 'EF', 'MAG'] as Ch[]).map(c => [c, { e: 0.5, v: 0.5 }])), draw: 5, sig: { IR: { e: 3 } } } }),
  I({ id: 'nullfield', name: 'Null-field', family: 'Stealth', hp: ['S'], size: 2, wt: 2, draw: 0, tags: ['STEALTH'], effect: 'While on: EM vis −80%, EF −80% (whole suit)', trade: 'No radar of your own while on',
    stealth: { abs: { EM: { v: 0.8 }, EF: { e: 0.8 } }, draw: 6, sig: { IR: { e: 4 } }, blocks: ['RADAR'] } }),
  I({ id: 'thermhold', name: 'Thermal hold', family: 'Stealth', hp: ['I'], wt: 1, draw: 0, tags: ['STEALTH'], effect: 'While on: IR emit to 0 (heat banks)', trade: 'Release = big IR spike',
    stealth: { abs: { IR: { e: 1 } }, draw: 1, sig: {} } }),
  // PLACEHOLDER: drones and drone carriers (catalogue §9b). Rows hold shape only; drones are not units in the sim yet.
  // A drone's own SND/VIS happen where the drone is, not on the suit; what the suit pays is the control link (EM).
  I({ id: 'd_spotter', name: 'Spotter drone bay', family: 'Drone', hp: ['U'], wt: 1, draw: 1, use: '1 AP launch', tags: ['DRONE'], sig: { EM: { e: 2 } }, effect: 'PLACEHOLDER: one-turn eyes elsewhere', trade: 'Drone is SND e2, VIS e1 where it flies' }),
  I({ id: 'd_tether', name: 'Tether drone', family: 'Drone', hp: ['U'], wt: 1, draw: 1, tags: ['DRONE'], sig: { VIS: { v: 1 } }, effect: 'PLACEHOLDER: eyes over buildings, hovering above you', trade: 'The drone marks where you are' }),
  I({ id: 'd_relay', name: 'Relay drone', family: 'Drone', hp: ['U'], wt: 1, draw: 1, use: '1 AP launch', tags: ['DRONE', 'LINK'], sig: { EM: { e: 3 } }, effect: 'PLACEHOLDER: datalink range +6, around corners', trade: 'Jammable; traced back to you' }),
  I({ id: 'd_decoy', name: 'Decoy drone', family: 'Drone', hp: ['U'], wt: 1, draw: 0, use: '1 AP launch, 2 uses', tags: ['DRONE', 'EW'], effect: 'PLACEHOLDER: a moving EM + SND ghost for 2 turns', trade: 'A thermal look shows it is small' }),
  I({ id: 'd_pods', name: 'Sensor pod dispenser', family: 'Drone', hp: ['U'], wt: 1, draw: 0, use: '1 AP, 3 pods', tags: ['DRONE'], effect: 'PLACEHOLDER: drops static pods (SND / IR / MAG) that report until found', trade: 'Pods can be traced back' }),
  I({ id: 'd_strike', name: 'Strike drone', family: 'Drone', hp: ['U'], wt: 2, draw: 0, use: '2 AP launch, 1 use', tags: ['DRONE', 'EXPLOSIVE'], sig: { EM: { e: 2 }, SND: { e: 3 } }, effect: 'PLACEHOLDER: flies to a fix and detonates (EXP)', trade: 'Needs a fix; one use' }),
  I({ id: 'd_hive', name: 'Drone hive', family: 'Drone', hp: ['U'], size: 2, wt: 3, draw: 2, use: '1 AP, 2 drones per launch', tags: ['DRONE'], sig: { EM: { e: 4 }, SND: { e: 2 } }, effect: 'PLACEHOLDER carrier: 4 small drones (spotter or decoy), launches 2 at once', trade: 'Big EM shout on launch' }),
  // §11 Mods (one per location; take the type they modify, or O)
  I({ id: 'm_dronelink', name: 'Drone uplink', family: 'Mod', hp: ['U'], wt: 0, draw: 0, tags: ['MOD'], effect: 'PLACEHOLDER: DRONE here: range +50%, control EM −30%', trade: 'Draw +1', mod: { tag: 'DRONE', emitMult: { EM: 0.7 }, drawAdd: 1 } }),
  I({ id: 'm_cold', price: 50, name: 'Cold processor', family: 'Mod', hp: ['S'], wt: 0, draw: 0, tags: ['MOD'], effect: 'SENSOR here: EM emit −40%', trade: 'Draw +2', mod: { tag: 'SENSOR', emitMult: { EM: 0.6 }, drawAdd: 2 } }),
  I({ id: 'm_baffles', name: 'Baffles', family: 'Mod', hp: ['M'], wt: 0, draw: 0, tags: ['MOD'], effect: 'MOBILITY here: SND emit −1 step (guess −40%)', trade: 'Rated load −1', mod: { tag: 'MOBILITY', emitMult: { SND: 0.6 }, ratedAdd: -1 } }),
  I({ id: 'm_flash', name: 'Flash hider', family: 'Mod', hp: ['W'], wt: 0, draw: 0, tags: ['MOD'], effect: 'KINETIC here: VIS flash −70%', trade: 'Range −1', mod: { tag: 'KINETIC', emitMult: { VIS: 0.3 } } }),
  I({ id: 'm_harness', name: 'Shielded harness', family: 'Mod', hp: ['S', 'W', 'I', 'U', 'M'], wt: 1, draw: 0, tags: ['MOD'], effect: 'Everything here: EF emit −50%', trade: 'wt +1', mod: { tag: 'any', emitMult: { EF: 0.5 } } }),
  I({ id: 'm_overclock', name: 'Overclock', family: 'Mod', hp: ['S', 'W', 'I', 'U', 'M'], wt: 0, draw: 0, tags: ['MOD'], effect: 'Everything here: effect +25%', trade: 'Draw +50%; wears modules faster', mod: { tag: 'any', drawMult: 1.5 } }),
  I({ id: 'm_hardened', name: 'Hardened mount', family: 'Mod', hp: ['S', 'W', 'I', 'U', 'M'], wt: 1, draw: 0, tags: ['MOD'], effect: 'Modules here survive the first part hit', trade: 'wt +1', mod: { tag: 'any' } }),
];

// §10 Armour: one plate + one skin per location (no hardpoint). Plate weights are guesses.
export const PLATES: Plate[] = [
  { id: 'p_steel', name: 'Steel', hits: 3, wt: 2, sig: { MAG: { v: 2 } }, note: 'Cheap, heavy, magnetic' },
  { id: 'p_comp', name: 'Composite', hits: 1, wt: 1, sig: {}, note: 'Light, non-magnetic; weak to EXP' },
  { id: 'p_ceramic', name: 'Ceramic', hits: 2, wt: 2, sig: {}, note: 'KIN −50%; shatters on first EXP' },
  { id: 'p_reactive', name: 'Reactive', hits: 1, wt: 2, sig: { SND: { e: 4 } }, note: 'EXP −50%; bangs when it fires' },
  { id: 'p_reflect', name: 'Reflective', hits: 1, wt: 1, sig: { VIS: { v: 1 } }, note: 'ENG −50%; glints' },
  { id: 'p_lam', name: 'Laminated', hits: 3, wt: 4, sig: { MAG: { v: 3 } }, note: 'KIN, EXP −25%; overload territory' },
  { id: 'p_insul', name: 'Insulated', hits: 1, wt: 2, sig: {}, note: 'SHK immune' },
];

export const SKINS: Skin[] = [
  { id: 's_camo', name: 'Disruptive camo', wt: 0, draw: 0, abs: { VIS: { e: 0.2, v: 0.2 } }, sig: {}, note: 'Wrong district = no effect' },
  { id: 's_adapt', name: 'Adaptive camo', wt: 0, draw: 1, abs: { VIS: { e: 0.6, v: 0.6 } }, sig: {}, note: '−60% still, −20% moving' },
  { id: 's_ghillie', name: 'Ghillie wrap', wt: 1, draw: 0, abs: { VIS: { e: 0.4, v: 0.4 }, IR: { e: 0.2, v: 0.2 } }, sig: {}, note: 'Flammable; tears on rubble' },
  { id: 's_foam', name: 'Foam baffling', wt: 1, draw: 0, abs: { SND: { e: 0.4 } }, sig: { IR: { v: 1 } }, note: 'Traps heat (IR vis +1)' },
  { id: 's_thermal', name: 'Thermal wrap', wt: 1, draw: 0, abs: { IR: { e: 0.5, v: 0.5 } }, sig: {}, note: 'Traps heat: vent spikes' },
  { id: 's_cryo', name: 'Cryo skin', wt: 1, draw: 2, abs: { IR: { e: 0.7, v: 0.7 } }, sig: { EF: { e: 2 } }, note: 'Draw 2, EF +2' },
  { id: 's_ram', name: 'RAM coating', wt: 1, draw: 0, abs: { EM: { v: 0.5 } }, sig: {}, note: 'Radar returns −50%' },
  { id: 's_faraday', name: 'Faraday weave', wt: 1, draw: 0, abs: { EF: { e: 0.6 } }, sig: {}, note: 'Also SHK −50%' },
  { id: 's_mu', name: 'Mu-metal wrap', wt: 2, draw: 0, abs: { MAG: { v: 0.4 } }, sig: {}, note: 'Heavy' },
  { id: 's_multi', name: 'Multispectral', wt: 1, draw: 0, abs: Object.fromEntries((['VIS', 'SND', 'IR', 'EM', 'EF', 'MAG'] as Ch[]).map(c => [c, { e: 0.15, v: 0.15 }])), sig: {}, note: 'Pricey; wears fastest' },
];

export const byId = <T extends { id: string }>(rows: T[], id: string | null | undefined) => rows.find(r => r.id === id);

# Signal Lance: Catalogue

**Updated:** 2026-10-05 (catalogue deep dive with Jamie)
**What this is:** the full equipment catalogue for exosuits and the ship, built on the rulebook in `claude/signal-lance-construction.md`. Breadth was inspired by a survey of the BattleTech/MegaMek equipment catalogue. **Nothing is copied:** every name, number and rule here is our own, and MegaMek (GPL) and BattleTech (someone else's IP) stay reference only.
**Numbers are placeholders** set against today's TUNE (a suit nets ~10 Energy a turn from a pool of 100, radar pulse 25 EN, `SOUND_RANGE.NORMAL` 4 tiles). They show shape and trade-offs, not balance. The runner balances later.
**Gate:** content (Gate 3). Only the cheap test in the construction doc is a Gate 1 candidate.

---

## 0. How to read a row
- **HP**: hardpoint type (S sensor, W weapon, I internal, U utility, M mobility, O open, H hangar; ×2 = takes two).
- **wt / draw**: weight in load points (lp) / idle Energy draw per turn (subtracted from reactor output).
- **use**: AP and/or EN per activation of the item.
- **Sig**: what the item adds to the suit's signature, written as `channel e<emit> v<visibility>`, and Absorb as `−%`. Only non-zero channels are listed. Channel codes below.
- **Tags**: what mods and rules can key on.
- **Trade**: the thing you give up. Every row has one; if a row has no trade, it's a straight upgrade and gets cut.

---

## 1. The six channels
Every item carries **Emit / Visibility / Absorb** in each channel. The hangar shows six raw bars per suit. The debrief explains what caught you.

| Code | Channel | Emit is… | Visibility is… | Passive read | Active read | Range and character |
|---|---|---|---|---|---|---|
| **VIS** | Visual (optical, incl. near-IR EO) | Light: lamps, muzzle flash, jet plume, sparks | Size × contrast × movement | Eyes, EO cameras (need LoS and light) | **Lidar** (precise fix; the beam is seen by laser-warning receivers) | Short–medium, LoS, light level matters (dark districts, smoke, flares) |
| **SND** | Acoustic (today's SOUND) | Noise per activation (moves, shots, launches) | Echo off your hull | Ears, acoustic arrays; **seismic** (only units that moved on the ground) | Acoustic ping / thumper: everything echoes, everyone hears you | Short, ignores walls, one turn |
| **IR** | Thermal | Heat: reactor, firing, sprinting, energy weapons | Hot surface area (frame size) | Thermal optics, IR seekers | None (heat is always on) | Medium, LoS but sees through smoke and dark; **heat persists and cools over turns** |
| **EM** | Electromagnetic (today's EMIT) | Radar, ECM, datalinks, active sensors | Radar cross-section | EM arrays, RWR, direction-finders | **Radar** | Long, builds up |
| **EF** | Electric field | Reactor and myomer current, scales with power in use | — | Field sensor | — | Very short, **through walls**; drops when you power down |
| **MAG** | Magnetic | Coil/rail guns charging, magnetic boots, clamps | **Ferrous mass** (frame + plate) | **Magnetometer, passively, reads Visibility** | — | Short, **through walls**, can't be switched off; blinded in industrial terrain |

**What each channel punishes:**
| Channel | Punishes |
|---|---|
| VIS | Standing in the open, lights, firing in the dark |
| SND | Moving fast, firing loud weapons |
| IR | Running hot: big reactors, energy weapons, sprinting |
| EM | Using active electronics |
| EF | Drawing a lot of power |
| MAG | Being heavy and steel-built |

"Going quiet" is a choice across six axes, not one number.

### Sensor grade vs jammer grade (the counter ladder)
Every sensor and every jammer has a **grade, 1–3**.
- **Jammer grade higher than the sensor:** the sensor is blind inside the jamming bubble.
- **Equal grades:** the sensor works at half range.
- **Sensor grade higher:** it burns through at full range minus one band.

It's a clean ladder with an upgrade path, and you can see where you stand on it from the INTEL.

### Damage types (for plates)
| Type | Sources |
|---|---|
| **KIN** kinetic | Bullets, slugs, coil and rail |
| **EXP** explosive | HE, mortar, missiles, mines |
| **ENG** energy | Lasers, plasma |
| **FIR** fire | Incendiary, flamers; also adds IR emit to the target |
| **SHK** shock | EMP and arc weapons; knocks modules offline instead of dealing hits |

---

## 2. Frames
A frame sets locations, hardpoints, rated/max load, and base Visibility in VIS / EM / MAG (bigger = easier to see, ping and sense). **Chassis material** is a frame variant: **steel** (cheap, tough, high MAG), **alloy** (middle), **composite** (light, low MAG, fewer base hits, pricey).

| Frame | Class | Rated / max | Base vis (VIS / EM / MAG) | MAST | ARMS | CORE | BACK | LEGS | Role and trade |
|---|---|---|---|---|---|---|---|---|---|
| **Wisp** | Light | 10 / 13 | 1 / 1 / 2 | S S O | W | I I | — | M M | Scout. Sees far, hits light, folds under fire |
| **Ferret** | Light | 9 / 12 | 1 / 1 / 1 | S O | W | I | U | M M M | Infiltrator. Composite-only, quietest frame; tiny reactor space |
| **Jackal** | Light | 11 / 14 | 2 / 2 / 2 | S | W W | I I | U | M M | Skirmisher. Hit and fade |
| **Warden** | Medium | 14 / 18 | 3 / 3 / 3 | S S | W W | I I O | U | M | Line suit, all-rounder |
| **Lantern** | Medium | 13 / 16 | 3 / 3 / 3 | S S S O | W | I I I | — | M | EW platform. Big reactor, big ears; one gun |
| **Sapper** | Medium | 15 / 19 | 3 / 2 / 4 | S | W | I I | U U O | M | Breacher and demolition. Melee and charges |
| **Bulwark** | Heavy | 18 / 22 | 5 / 4 / 5 | S | W W W | I I | U | M M | Brawler. Armour and guns; loud on every channel |
| **Mule** | Heavy | 17 / 22 | 5 / 4 / 5 | S | W | I I O | U U U | M | Fire support: mortar and launcher platform |
| **Bastion** | Assault | 22 / 26 | 6 / 6 / 7 | S S | W W W | I I I | U U | M M | Walking fortress. Slow; magnetometers find it from a district away |
| **Wraith** | Light (prototype) | 10 / 12 | 1 / 1 / 1 | S S O | W | I I | — | M M | Stealth frame: built-in cloak mounts (§7); fragile, pricey, rare |

Frames carry **base hits per part** (R12 `PART_SHARE`) and a **reactor size cap** (what reactor fits in CORE).

---

## 3. Power and heat (CORE, I)

### Reactors
| Reactor | wt | Output | Sig | Trade |
|---|---|---|---|---|
| **Cell stack** | 1 | 8 | EF e1 | Near-silent; starves anything big |
| **Std reactor** | 2 | 14 | IR e1, EF e2 | Baseline (broker) |
| **Fuel cell** | 2 | 12 | IR e0, EF e1, SND e1 (pump) | Quiet on heat; runs dry: output −2 per hunt without refuel parts |
| **Cold-burn** | 4 | 15 | IR e0, EF e1 | Quiet and heavy |
| **Hot core** | 3 | 20 | IR e4, EF e3 | Feeds an EW suit; thermal sights love it |
| **Compact core** | 2 (½ slot) | 13 | IR e2, EF e2 | Frees a CORE hardpoint; crit-prone (destroyed by the first CORE hit) |
| **Twin cells** | 3 (×2) | 2 × 8 | EF e1 each | Redundant: one survives a CORE hit; split output |
| **Surge core** | 3 | 16, burst 26 | IR e2 (e6 in burst) | Burst for one turn, then −6 for two turns |

### Storage and heat
| Item | HP | wt | Effect | Trade |
|---|---|---|---|---|
| **Battery** | I/U | 1 | Pool +50 | Weight |
| **Capacitor bank** | I | 1 | Stores up to 40 EN, released in one turn (energy weapons, cloak bursts) | Discharges if CORE is hit |
| **Heat sink** | I | 1 | Stores heat, so IR emit is delayed; vent later | Full sink = vented heat spike; overflow damages CORE |
| **Radiator fins** | O | 1 | IR cools 2× faster | IR v +1 (big hot fins) |
| **Coolant flush** | U | 1 | One-shot: IR to 0 now | 2 uses; SND e2 (hiss) |
| **Power conditioner** | I | 1 | EF e −50% | Draw +1 |

---

## 4. Sensors (S unless noted)

### Visual
| Item | Grade | Effect | Sig and draw | Trade |
|---|---|---|---|---|
| **Wide eyes** | 1 | Eyes arc +40° | — | Range −1 |
| **Long glass** | 1 | Eyes range +4 | — | Arc −30° |
| **Low-light EO** | 2 | Eyes ignore darkness | Draw 1 | Blinded by flares and searchlights |
| **EO mast camera** | 2 | Eyes from 1 tile higher: over low cover | VIS v +1 | Mast hits more likely |
| **Lidar** | 2 | Active visual ping: exact fix in LoS, through light smoke | EM e1, VIS e3 (the beam), draw 2, 1 AP | Laser-warning receivers see you |
| **Laser-warning receiver** | 1 | Warns and bearings when lidar or designators paint you | Draw 1 | — |
| **Searchlight** | U | Lights a cone: +to-hit for the lance at night | VIS e8 | You're the brightest thing on the map |

### Acoustic
| Item | Grade | Effect | Sig and draw | Trade |
|---|---|---|---|---|
| **Acoustic array** | 2 | Hears SND at +50% radius; `SOUND_UNC` −2 | Draw 1 | Deafened inside NOISE zones |
| **Directional mic** | 1 | Narrow cone, double range | — | Cone only |
| **Seismic spike** | U | Planted: hears anything that *moves on the ground* nearby, through walls | One-shot | Blind to still units and jumpers |
| **Thumper (active ping)** | 2 | Every unit within 6 tiles gets a fix | SND e10 | The whole field hears it |
| **Laser microphone** | 1 | Listens through glass and walls along LoS: hears units in a building | VIS e1 (beam) | LoS to the building |

### Thermal
| Item | Grade | Effect | Sig and draw | Trade |
|---|---|---|---|---|
| **Thermal optics** | 2 | Sees IR in LoS through smoke and dark; reach scales with target IR | Draw 2 | Washed out next to fires and vents |
| **IR line scanner** | 1 | Sweeps a strip: lists hot spots, no fix | Draw 1 | Bearing only |
| **Thermal sight** | W-mod | Weapon to-hit vs hot targets ↑ | Draw 1 | Worse vs cold targets |

### EM
| Item | Grade | Effect | Sig and draw | Trade |
|---|---|---|---|---|
| **Radar "Lamp"** | 1 | Range 8, wide cone (today's radar) | EM e4, draw 2, 25 EN | — |
| **Radar "Needle"** | 2 | Range 12, narrow cone | EM e7, draw 3 | Narrow |
| **Radar "Whisper" (LPI)** | 2 | Range 6; enemy arrays need grade 2+ to hear it | EM e2, draw 4 | Short, power-hungry |
| **Fire-control radar** | 2 | Locks one contact: to-hit ↑ while held | EM e6 continuous | The target's RWR screams |
| **EM array** | 1 | Today's passive suite: bearings on EM emitters | Draw 1 | — |
| **Direction-finder** | 2 | Bearings on EM emitters plus a type guess (feeds signature matching) | Draw 2 | 2 hardpoints |
| **RWR** | 1 | Warns when radar paints you, with the painter's bearing | — | — |

### Field (EF and MAG)
| Item | Grade | Effect | Sig and draw | Trade |
|---|---|---|---|---|
| **Field sensor** | 1 | Senses EF within 3 tiles, through walls | Draw 1 | Very short |
| **Magnetometer** | 1 | Senses MAG Visibility (mass) within 3–5 tiles by target mass, through walls | — | Blind in industrial terrain; tiny units invisible |
| **Gradiometer** | 2 | Magnetometer with bearing, +2 range | Draw 1, 2 hardpoints | Heavy |

### Fusion and recon (any S/U)
| Item | HP | Effect | Trade |
|---|---|---|---|
| **Sensor fusion core** | I | Two channels on the same contact merge into one tighter fix | Draw 2 |
| **Mast extender** | S | All MAST sensors +1 tile and over low cover | VIS v +1, mast easier to hit |
| **Remote sensor dispenser** | U | Drops 3 static sensor pods (pick channel: SND / IR / MAG). They report until found | Pods can be found and traced back |
| **Spotter drone** | U | One-turn eyes elsewhere | SND e2 and VIS e1 at the drone |
| **Tether drone** | U | Hovers above you: eyes over buildings | Drone is tethered (it marks where you are) |
| **Datalink** | S | Lance shares contacts instantly | EM e2 per turn; jammable; a lost link reveals its last ping |

---

## 5. Electronic warfare and countermeasures

### Jammers and EW (S)
| Item | Grade | Effect | Sig and draw | Trade |
|---|---|---|---|---|
| **Mask** | 1 | Today's ECM mask (`ECM_MASK_MULT`) | Jam bearing, draw 2, 20 EN/turn | Enemy gets a bearing |
| **Ghost projector** | 1 | Today's ghost (EM decoy) | 25 EN | — |
| **Barrage jammer** | 2 | Bubble: enemy EM sensors below grade 2 blind inside | EM e9 (huge), draw 4 | Every EM array hears you |
| **Spot jammer** | 2 | Blinds one enemy's EM sensors for a turn | EM e5, 15 EN | One target |
| **Comms jammer** | 2 | Enemy units inside can't **call the alarm** (R13) | EM e6 | Loud, and no datalink for you either |
| **Spoofer** | 3 | Your EM reads as another unit type (feeds signature matching) | Draw 3 | Fooled only on EM; other channels give you away |
| **ECCM unit** | 2 | Cancels one enemy jammer in range | Draw 2 | — |
| **Burn-through amp** | mod | +1 grade to radar on this location | Draw +2, EM e +3 | — |

### Countermeasures (U, ammo-limited)
| Item | Channels | Effect | Trade |
|---|---|---|---|
| **Smoke** | VIS, IR (light), lidar | Cloud blocks VIS and lidar; thermal sees through it | 2 shots |
| **Multispectral smoke** | VIS, IR, lidar | Blocks thermal too | 1 shot, pricey |
| **Flares** | IR decoy, VIS light | IR seekers divert; lights the area | Lights you up too |
| **Chaff** | EM | Radar fixes inside become fuzzy (big uncertainty) | One-shot cloud |
| **Acoustic decoy** | SND | Plants a fake sound contact that moves for 2 turns | 2 uses |
| **Heat decoy** | IR | A static fake IR contact | — |
| **Dazzler** | VIS | Blinds one enemy's eyes and EO for a turn | VIS e5 at you |
| **Degausser** | MAG (active) | MAG Visibility −60% while on | Draw 3, EF e +3 (trade one field for another) |

---

## 6. Weapons (ARMS, W unless noted)
| Family | Variants (sidegrades) | Damage | Sig per shot | Trade |
|---|---|---|---|---|
| **Carbine** | Std / suppressed / burst | KIN light | SND 3 (suppressed 1), VIS flash | Weak vs plate |
| **Autocannon** (today's gun) | Std / long-barrel (range) / rapid (2 shots, jams) | KIN | SND 6, VIS flash | Ammo |
| **Machine gun** | Light / heavy | KIN, anti-infantry | SND 5 | Poor vs suits |
| **Marksman rifle** | Std / anti-materiel (×2, hits parts) | KIN | SND 7 | One shot per activation; **aimed shots** (parked #17) |
| **Breacher shotgun** | Slug / flechette | KIN, close | SND 6 | Range 3 |
| **Coilgun** | Std / long | KIN, no powder | SND 1, **MAG e5 charging**, EM e1, 20 EN | Quiet shot, but every magnetometer hears it charge |
| **Railgun** | — (×2) | KIN, heavy, pierces cover | MAG e8, EF e4, IR e3, 40 EN | Huge power and signature |
| **Pulse laser** | Std / short-burst | ENG, to-hit ↑ | IR e3, VIS e2, 15 EN | Heat |
| **Beam laser** | Std / long | ENG | IR e4, VIS e3 (beam), 20 EN | Hot, and the beam points back at you |
| **Plasma projector** | — | ENG + FIR | IR e6, VIS e4 | Very hot, short |
| **Flamer** | — | FIR, area | IR e5, VIS e5 | Range 2; burns cover |
| **Arc projector** | — | SHK: modules offline | EF e5, VIS e3, 15 EN | Range 2 |
| **Grenade launcher** | U or W | EXP, lob (short indirect) | SND 4 | Ammo |
| **Recoilless rifle** | — (×2 or U) | EXP, heavy | SND 9, VIS backblast | Few rounds |
| **ATGM, wire-guided** | U | EXP, heavy; operator guides it (needs LoS whole flight) | SND 5, VIS e2 | Must stay still and visible while it flies |
| **Seeker missiles** | U: IR seeker / radar-homing / **home-on-jam** | EXP | SND 5 | Seeker type decides what it can lock (home-on-jam hunts anyone running ECM) |
| **Light mortar** (today's) | U | EXP, indirect | SND 14 (`SOUND_RANGE.MORTAR`) | — |
| **Heavy mortar** | U ×2 | EXP, bigger splash | SND 16 | 4 shells |
| **Auto-mortar** | U ×2 | 2 lobs per activation | SND 16 | Ammo-hungry, scatter ↑ |
| **Melee kit** | W/U: ram / vibro-blade / hydraulic claw | KIN, adjacent | SND 2 | Must close in; claw also breaches walls |
| **Demo charge** | U | EXP, placed (timer or remote) | SND 12 at blast | Placed by hand |

### Ammo types (fit any compatible weapon)
| Ammo | Effect | Trade |
|---|---|---|
| **AP** | Part hits more likely to break modules | Fewer rounds |
| **HE** | EXP, small splash | Weak vs plate |
| **Flechette** | Anti-infantry; ignores cover graze | Weak vs suits |
| **Incendiary** | FIR: target IR e +3 for 2 turns (marks it for thermal) | Burns salvage |
| **Subsonic** | Weapon SND −50% | Damage −1, range −2 |
| **Tracer** | To-hit ↑ in the dark | VIS e at you and along the line |
| **Tag dart** | No damage; plants an EM emitter on the target (it beacons until removed) | Must hit first |
| **EMP round** | SHK, small | Pricey |
| **Smoke shell / illumination shell** | Mortar or grenade: cloud / light | — |
| **Caseless** | +50% rounds | Jam chance |

---

## 7. Stealth systems (active, toggled)
The rule we keep from the research: **stealth costs your EW.** A suit running an active stealth system can't run a jammer or datalink, gets −1 to its own sensor grades, and makes heat.

| System | HP | Hides | Scales with | Draw / heat | Trade |
|---|---|---|---|---|---|
| **Photonic cloak** | S ×2 | VIS −70% | Range (best far away) | Draw 4, IR e +2 | Lidar and thermal still see you |
| **Still-skin** | I + O | All channels −50% | Movement (best still, gone when sprinting) | Draw 5, IR e +3 | Freezes you in place |
| **Null-field** | S ×2 | EM Visibility −80%, EF e −80% | — | Draw 6, IR e +4 | No radar of your own while on |
| **Thermal hold** | I | IR e to 0 while on | Turns held | Heat banks; release = big IR spike | Must vent eventually |
| **Ghost pattern** | O | VIS: you read as a different unit type | — | Draw 2 | Only fools eyes and EO |

---

## 8. Mobility (LEGS, M)
| Item | Effect | Sig | Trade |
|---|---|---|---|
| **Std servos** | Baseline | SND normal | — |
| **Sprint servos** | Sprint EN −50% | SND +2 sprinting, IR +1 | Louder |
| **Silent-step** | CREEP moves +1 tile per AP | SND −1 step | wt +1 |
| **Stabilisers** | "Moved" to-hit penalty halved | — | wt +1 |
| **Myomer boost** | +1 AP per turn while active | IR e +3, EF e +2 | Fail roll: the leg seizes |
| **Jump pack** | Jump up/over (Gate 3 verticality) | VIS plume e5, IR e4, SND e6 | Fuel |
| **Mechanical leaper** | Short jump, no plume | SND e3 | Short, fixed arc |
| **Grapple line** | Climb to rooftops | SND e1 | Slow, exposed while climbing |
| **Magnetic boots** | Cling to walls and vehicles; no knockdown | MAG e +3 | — |
| **Shock absorbers** | Landing and running SND −1 | — | wt +1 |

---

## 9. Utility and support (BACK, U)
| Item | Effect | Trade |
|---|---|---|
| **Ammo bin** | +rounds or +shells (also I) | Explodes on CORE crit unless contained |
| **Ammo containment** | Ammo explosions vent outward | wt +1 |
| **Mine dispenser** | Lays 3 mines (pressure / MAG-triggered / SND-triggered) | Friendly-fire risk |
| **Breaching kit** | Opens a wall or door (Gate 3 interiors) | SND e8 |
| **Trauma pack** | An operator at *critical* survives +2 turns (Standard death) | One use |
| **Field repair kit** | Restores 1 hit on a part, mid-hunt | 3 AP; 1 use |
| **Uplink kit** | Uplink costs −1 AP (objective) | — |
| **Laser designator** | Marks a contact: mortar and seekers on the lance ignore its uncertainty | VIS e1 beam; laser-warning receivers see it |
| **Salvage rig** | Hold cap +1 for this suit's kills | wt +2 |
| **Extended life support** | No fatigue in hazard districts | wt +1 |

---

## 10. Armour: plate + skin, per location
Each location carries **one plate** (protection) and **one skin** (signature). Plates need a hardpoint only when stacked (a second plate on the same location costs one). Skins are coatings: weight only, no hardpoint. **Skins wear fast**: a Worn skin loses half its Absorb, so skins are a parts-and-logistics sink.

### Plates (protection layer)
| Plate | Hits | Resists | Weak to | Sig | Trade |
|---|---|---|---|---|---|
| **Steel** | +2 | — | — | MAG v +2 | Cheap, heavy, magnetic |
| **Composite** | +1 | — | EXP | MAG v 0 | Light, non-magnetic, pricey |
| **Ceramic** | +2 | KIN −50% | EXP shatters it (lost on the first EXP hit) | MAG v 0 | Brittle |
| **Reactive** | +1 | EXP −50% | — | SND e4 when it fires | Each block spends a tile of reactive |
| **Reflective** | +1 | ENG −50% | KIN | VIS v +1 (glints) | — |
| **Ablative** | +1 | FIR and ENG −50% for the first 2 hits | — | IR v −1 | Strips away |
| **Laminated** | +3 | KIN, EXP −25% | — | MAG v +3 | Very heavy: overload band territory |
| **Spall liner** | +0 | Modules on this location survive the first part hit | — | — | wt +1 |
| **Cage mesh** | +0 | Missiles and grenades: 30% detonate early | — | VIS v +1 | Bulky |
| **Bolt-on slab** | +3 | — | — | MAG v +3 | Shed it mid-hunt (1 AP) to drop the weight |
| **Commercial** | +1 | — | Everything | — | Cheap salvage filler |
| **Hand shield** | W/U | Blocks one arc | — | MAG v +2 | Takes a weapon or utility hardpoint |
| **Insulated** | +1 | SHK immune | — | — | wt +1 |

### Skins (signature layer)
| Skin | Channel | Absorb | Scales with | Trade |
|---|---|---|---|---|
| **Disruptive camo** | VIS | −20% | Static | Cheap; district-themed (wrong district = no effect) |
| **Adaptive camo** | VIS | −60% still, −20% moving | **Movement** | Draw 1; useless sprinting |
| **Ghillie wrap** | VIS, IR | −40%, −20% | Static | Flammable: FIR destroys it; tears on rubble |
| **Foam baffling** | SND | Emit −1 step | Static | IR v +1 (traps heat) |
| **Anechoic tile** | SND | Active pings −70% (echo) | Static | Doesn't hide your own noise |
| **Thermal wrap** | IR | −50% | Static | **Traps heat**: IR builds while worn; vent spikes |
| **Diffuser mesh** | IR | −30%, spreads heat (no spike) | Static | Weaker, but safe |
| **Cryo skin** | IR | −70% | Static | Draw 2, EF e +2 |
| **RAM coating** | EM (vis) | Radar returns −50% | Static | wt +1 per location |
| **Faceted panels** | EM (vis) | Radar returns −70% **from the front arc only** | Facing | Worse than nothing from the side |
| **Faraday weave** | EF | −60%; also SHK −50% | Static | wt +1 |
| **Mu-metal wrap** | MAG (vis) | −40% | Static | Heavy |
| **Multispectral skin** | All | −15% each | Static | Pricey; wears fastest |

**How skins combine:** one skin per location, and Absorb applies to what *that location* contributes. Where you put the RAM matters: the MAST holds the radar and is the most-pinged location. A suit is only as quiet as its loudest location, which is why full stealth is an investment across the whole suit.

---

## 11. Mods (same-location tag effects)
| Mod | Affects (tag) | Effect | Price |
|---|---|---|---|
| **Cold processor** | SENSOR | EM e −40% | Draw +2 |
| **Fire-control computer** | KINETIC | To-hit ↑ on a radar or lidar fix | Draw +1 |
| **Baffles** | MOBILITY | SND one step quieter | Rated load −1 |
| **Capacitor link** | ENERGY | Use cost −25% | Pool −25 |
| **Overclock** | any | Effect +25% | Draw +50%; wears the module a step faster |
| **Hardened mount** | any | Modules survive the first part hit | wt +1 |
| **Flash hider** | KINETIC | VIS flash −70% | Range −1 |
| **Heat exchanger** | ENERGY | Weapon IR → stored in the heat sink | Needs a heat sink |
| **Shielded harness** | any | EF e −50% for modules here | wt +1 |
| **Gyro mount** | WEAPON | Fire after moving with no penalty | Draw +1 |
| **Signal splitter** | SENSOR | One sensor feeds two locations (survives one part loss) | Draw +1 |
| **Quick-release** | any | Shed a module mid-hunt for weight (1 AP) | Module is lost |

---

## 12. Ship catalogue
Same rules at ship scale (construction doc). Weight overload costs **fuel per jump**. Ship signature matters in two places: the **pre-drop listen** (EM) and **flying over hostile districts** (all channels).

### Hulls
| Hull | Class | Rated / max | Bays (H) | Hardpoints | Vis (EM / IR / VIS) | Note |
|---|---|---|---|---|---|---|
| **Courier** | Light | 40 / 48 | 2 | 6 | 2 / 2 / 2 | Start; fast and thin |
| **Runner** | Light | 36 / 44 | 2 | 5 | 1 / 1 / 1 | Smuggler hull: quiet, small hold |
| **Frigate** | Medium | 60 / 72 | 3 | 9 | 4 / 3 / 3 | Mid-campaign milestone |
| **Tender** | Medium | 65 / 80 | 2 | 10 | 4 / 4 / 4 | Workshop hull: fewer bays, more after-mission modules |
| **Carrier** | Heavy | 85 / 100 | 4 | 13 | 6 / 5 / 6 | Late; a big target over hostile districts |
| **Raider** | Heavy | 80 / 92 | 3 | 12 | 3 / 3 / 3 | Late; quiet and fast, expensive refits |

**Sections:** MAST (S), CORE (I), HANGAR (H), HOLD (U), ENGINES (M), QUARTERS (Q, new: crew and operators), plus open hardpoints. Bays are open-able.

### Before the drop (MAST)
| Module | Effect | Sig | Trade |
|---|---|---|---|
| **Wide-band listener** | Contract detail range +2 nodes | EM e2 | Coarse matches |
| **Deep-listen array** | Cleaner signature matches; the **risk dial** (longer listen = cleaner = the field may wake) | EM e6 while listening | Draw |
| **Passive ESM suite** | Matches from enemy emissions only: no risk | — | Blind to quiet fields |
| **Thermal survey pod** | Pre-drop IR map of the drop zone | IR e1 | Day/night dependent |
| **Magnetic survey** | Pre-drop count of heavy units | — | Short range: fly closer (danger) |
| **Recon drone bay** | One pre-drop visual pass | VIS at the drone | Drone can be lost |
| **Broker relay** | More broker jobs visible | EM e1 | — |
| **Encrypted comms** | Faction intel arrives cleaner | — | Draw |

### Drop and recovery (HANGAR, H, U)
| Module | Effect | Trade |
|---|---|---|
| **Suit bay** | Carries one suit | — |
| **Hardened bay** | No condition loss in transit | wt |
| **Quiet drop rig** | Insertion SND and VIS −; the field starts calmer | One suit per turn |
| **Hot drop rails** | The whole lance drops at once, anywhere on the edge | Loud insertion |
| **Decoy pods** | Drop fake insertions elsewhere: the field splits | Consumable |
| **Extraction winch** | Extract from any rooftop zone, not just the edge | Ship EM exposure on pickup |

### After the mission (CORE, HOLD, QUARTERS)
| Module | Effect | Trade |
|---|---|---|
| **Repair bay I / II** | Restores condition per jump; fewer parts per restore | Draw; II is heavy |
| **Machine shop** | Turns salvage into parts (not unlocks) | Slow |
| **Armoury** | Ammo restock without a market (from parts) | wt |
| **Medbay** | Bench time shortened; better *critical* odds | Draw |
| **Cryo bay** | Stabilises *critical* operators indefinitely (buys time to reach a surgeon) | Draw, 1 per cradle |
| **Salvage hold S / M / L** | Salvage cap (heavy when full: fuel) | wt |

### Between missions (ENGINES, CORE)
| Module | Effect | Trade |
|---|---|---|
| **Fuel tanks** | Range | wt |
| **Efficient engines** | Fuel per jump −25% | Slower jumps |
| **Hot engines** | Faster: reach contracts before they expire | IR and EM high over hostile districts |
| **Baffled hull** | Absorbs EM and SND: slip through closed airspace | wt |
| **RAM hull** | EM vis −50% | Pricey |
| **Jammer pod** | Push through closed airspace (forces a fight roll down) | EM e very high: notoriety + |
| **Countermeasure racks** | One free escape from an airspace intercept | Consumable |
| **Hull armour** | Survive intercepts | wt (fuel) |
| **Ship reactor (std / cold / hot)** | Output − draw, as on a suit | Underpowered = modules offline |

### Crew (QUARTERS, Q)
| Module | Effect | Trade |
|---|---|---|
| **Crew quarters** | Crew cap (crew run modules: unmanned modules run at half) | wt |
| **Operator berths** | Operator cap | wt |
| **Training deck** | Trains crew into recruits slowly | Takes crew off duty |
| **Galley and rec** | Fatigue recovers faster | wt |
| **Faction liaison office** | Standing gains +; one faction's intel arrives automatically | That faction's rivals notice |

---

## 13. Makers (faction accents)
Gear has a maker. Markets sell their own maker's stock, gated by standing. The broker sells generic kit anywhere.

| Maker | Accent | Signature tendency | Typical kit |
|---|---|---|---|
| **Corporate security** | Clean, precise, expensive | Low SND, low IR; high draw | LPI radar, adaptive camo, coilguns, cryo skin, composite plate |
| **Foundry clans** | Heavy, loud, tough | High SND and MAG; low draw | Laminated plate, autocannon, heavy mortar, hot cores, steel frames |
| **Undercity syndicates** | Tricks, unreliable | Cheap; arrives Worn | Spoofers, decoys, ghost pattern, tag darts, mines, ghillie wraps |
| **Old Army** | Rugged, dated, reliable | Mid signature, **high MAG** (steel everything); never arrives Failing | Steel frames, std reactors, autocannon, marksman rifle, light mortar, laminated plate, datalinks. Sold by quartermasters who remember your unit: gated by **company reputation**, not district standing, so your backstory becomes a supply line |
| **Broker (neutral)** | Generic "Std" | Average everything | The baseline row of every family; no exclusives; a markup |

Agreed with Jamie (2026-10-05).

**Frames by source:** Broker: Warden, Jackal, Mule (steel only) · Corporate: Wisp, Ferret, Lantern (composite) · Foundry: Bulwark, Bastion (steel/alloy) · Syndicate: Sapper, Jackal variant · Old Army: Warden and Mule variants (steel, reliable) · Contract reward: Wraith.

---

## 14. Size and how it grows
| Section | Rows here | Grows by |
|---|---|---|
| Frames | 10 × 3 chassis materials | Maker variants (each maker's take on a class) |
| Power and heat | 14 | — |
| Sensors | ~30 | Maker variants, grades 1–3 |
| EW and countermeasures | ~16 | Grades |
| Stealth | 5 | Prototypes as contract rewards |
| Weapons | ~22 families, ~40 variants | Calibre and maker variants |
| Ammo | 11 | — |
| Mobility | 10 | — |
| Utility | 10 | — |
| Plates and skins | 13 + 13 | Maker variants |
| Mods | 12 | Rare drops |
| Ship | 6 hulls, ~40 modules | Maker variants |

That's roughly **250 base rows**. With maker variants it reaches the "hundreds" variety target, all from one rulebook. The runner sweeps for dominant and dead builds before anything ships.

// Seeded RNG (mulberry32). Every random roll in the sim goes through rand(), so a run's
// seed (shown in DBG) can be replayed in the headless runner. Never use Math.random in sim/.
let s = 1;
export let seed = 1;
export function setSeed(n: number) { seed = n >>> 0; s = seed; }
// SAVE & QUIT: the generator's exact position, so a resumed hunt rolls what it would have rolled
export function rngState() { return { seed, s }; }
export function setRngState(r: { seed: number; s: number }) { seed = r.seed >>> 0; s = r.s >>> 0; }
export function rand(): number {
  s = (s + 0x6D2B79F5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

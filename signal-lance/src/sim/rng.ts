// Seeded RNG (mulberry32). Every random roll in the sim goes through rand(), so a run's
// seed (shown in DBG) can be replayed in the headless runner. Never use Math.random in sim/.
let s = 1;
export let seed = 1;
export function setSeed(n: number) { seed = n >>> 0; s = seed; }
export function rand(): number {
  s = (s + 0x6D2B79F5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

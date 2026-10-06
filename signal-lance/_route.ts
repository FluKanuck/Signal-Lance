import { canReach, findPath, T, MAP_SRC } from './src/sim/world.ts';
const N = { S: [0, 11], J1: [8, 11], A: [32, 7], B: [24, 16], J2: [40, 11], C: [62, 7], D: [55, 22], X: [70, 12] };
const L = [['S','J1',[]],['J1','A',[[8,7]]],['J1','B',[[6,13],[6,16]]],['A','J2',[[40,7]]],['B','J2',[[36,15]]],['J2','C',[[52,11],[56,7]]],['J2','D',[[46,16],[46,22]]],['C','X',[]],['D','X',[]]];
for (const [k, t] of Object.entries(N)) console.log(k, t, canReach(t[0], t[1]));
const grid = MAP_SRC.map(r => r.split(''));
L.forEach(([a, b, via], li) => {
  const pts = [N[a], ...via, N[b]]; let len = 0; const ch = 'abcdefghi'[li];
  for (let i = 1; i < pts.length; i++) { const p = findPath((pts[i-1][0]+.5)*T, (pts[i-1][1]+.5)*T, (pts[i][0]+.5)*T, (pts[i][1]+.5)*T); if (!p) { console.log('NO PATH', a, b, i); continue; }
    for (let j = 1; j < p.length; j++) { const d = Math.hypot(p[j].x-p[j-1].x, p[j].y-p[j-1].y); len += d/T; for (let s = 0; s <= d; s += 8) { const x = Math.floor((p[j-1].x + (p[j].x-p[j-1].x)*s/(d||1))/T), y = Math.floor((p[j-1].y + (p[j].y-p[j-1].y)*s/(d||1))/T); if (grid[y][x] === '.') grid[y][x] = ch; } } }
  console.log(ch, a, '->', b, len.toFixed(1));
});
grid.forEach((r, y) => console.log(String(y).padStart(2), r.join('')));

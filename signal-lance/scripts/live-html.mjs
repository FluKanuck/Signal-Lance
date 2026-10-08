// R25 "Live toy": signal-lance-live.html is signal-lance.html with the toy's entry, title and a few toy-only styles.
// Run before every live build (npm run build:live), so the two pages never drift apart.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('signal-lance.html', 'utf8');
const CSS = '<style>/* R25 live toy */ body.live #init span{min-width:44px;min-height:40px;font-size:18px;line-height:36px;padding:0 6px}' +
  ' body.live #bEnd.on{background:#2f6b3f;border-color:#7e9;color:#fff}</style>\n';
let out = src.replace('<script type="module" src="/src/main.ts"></script>', '<script type="module" src="/src/main-live.ts"></script>');
out = out.replace(/<title>[^<]*<\/title>/, '<title>Signal Lance Live Toy</title>');
out = out.replace('</style>', '</style>\n' + CSS.trim());
if (out === src || !out.includes('main-live.ts')) throw new Error('live-html: signal-lance.html changed shape');
writeFileSync('signal-lance-live.html', out);
console.log('live-html: signal-lance.html -> signal-lance-live.html');

// R25 "Live toy": signal-lance-live.html is signal-lance.html with the toy's entry, title and a few toy-only styles.
// Run before every live build (npm run build:live), so the two pages never drift apart.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('signal-lance.html', 'utf8');
const CSS = '<style>/* R25 live toy */ body.live #init span{min-width:44px;min-height:40px;font-size:18px;line-height:36px;padding:0 6px}' +
  ' body.live #bEnd.on{background:#2f6b3f;border-color:#7e9;color:#fff}' +
  ' #apBanner{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:3;pointer-events:none;' +
  'font:bold 15px monospace;color:#ff6;background:rgba(0,0,0,.72);border:1px solid #ff6;border-radius:6px;padding:4px 10px;white-space:nowrap}' +
  ' #apBanner[hidden]{display:none} #apRow button{flex:1;min-width:0;font-size:12px}</style>\n';
let out = src.replace('<script type="module" src="/src/main.ts"></script>', '<script type="module" src="/src/main-live.ts"></script>');
out = out.replace(/<title>[^<]*<\/title>/, '<title>Signal Lance Live Toy</title>');
// the auto-pause switches sit under the splash's toggle row (view/live.ts fills them)
const ROW = '<button id="bCoMode">COMPANY: ON</button></div>';
if (!out.includes(ROW)) throw new Error('live-html: the splash toggle row changed');
out = out.replace(ROW, ROW + '\n  <div class="zrow" id="apRow"></div>');
// the auto-pause banner over the map
out = out.replace('<div id="hud"></div>', '<div id="hud"></div>\n<div id="apBanner" hidden></div>');
out = out.replace('</style>', '</style>\n' + CSS.trim());
if (out === src || !out.includes('main-live.ts')) throw new Error('live-html: signal-lance.html changed shape');
writeFileSync('signal-lance-live.html', out);
console.log('live-html: signal-lance.html -> signal-lance-live.html');

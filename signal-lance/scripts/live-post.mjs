// R25 "Live toy": after `vite build --config vite.live.config.ts`: charset first (as pages.mjs does for the game), then a
// copy to docs/live/ for GitHub Pages (https://flukanuck.github.io/Signal-Lance/live/). The game's docs/index.html is untouched.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const f = 'dist/signal-lance-live.html', META = '<meta charset="utf-8">';
writeFileSync(f, META + readFileSync(f, 'utf8').replace(META, ''));
mkdirSync('../docs/live', { recursive: true });
copyFileSync(f, '../docs/live/index.html');
console.log('live-post: dist/signal-lance-live.html -> docs/live/index.html');

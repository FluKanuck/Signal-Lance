// Building toy: vite-plugin-singlefile inlines the script at the top of the file, ahead of <title>.
// The artifact host reads the title from the first 8 KB, so move the script to the end (a module runs deferred anyway).
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'dist/build-toy.html';
const html = readFileSync(f, 'utf8');
const m = html.match(/<script type="module"[^>]*>[\s\S]*?<\/script>\s*/);
if (m) writeFileSync(f, html.replace(m[0], '') + '\n' + m[0].trim() + '\n');
console.log('toy-post: script moved below the page');

// After `vite build`: copy the one-file build to the repo's docs/ folder for GitHub Pages.
// Pages serves docs/ from branch main. The manifest lives in docs/ (static).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../dist/signal-lance.html');
const docs = resolve(here, '../../docs');
// The charset must sit in the first 1024 bytes, but Vite puts the inlined script first. Without it, a server that
// sends no charset shows "·" and "−" as mojibake. Move it to the very start of the built file.
const META = '<meta charset="utf-8">';
writeFileSync(src, META + readFileSync(src, 'utf8').replace(META, ''));
mkdirSync(docs, { recursive: true });
copyFileSync(src, resolve(docs, 'index.html'));
console.log('pages: dist/signal-lance.html -> docs/index.html');

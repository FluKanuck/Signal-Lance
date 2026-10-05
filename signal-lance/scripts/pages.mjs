// After `vite build`: copy the one-file build to the repo's docs/ folder for GitHub Pages.
// Pages serves docs/ from branch claude/signal-lance. The manifest lives in docs/ (static).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../dist/signal-lance.html');
const docs = resolve(here, '../../docs');
mkdirSync(docs, { recursive: true });
copyFileSync(src, resolve(docs, 'index.html'));
console.log('pages: dist/signal-lance.html -> docs/index.html');

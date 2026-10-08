import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file: dist/signal-lance.html (no external assets at runtime).
// Build stamp shown on screen (bottom-left + loadout), so a stale cached page is easy to spot. Vancouver time.
const STAMP = new Date().toLocaleString('sv-SE', { timeZone: 'America/Vancouver' }).slice(5, 16); // "MM-DD HH:MM"
// QA panel: `--mode qa` (npm run build:qa / dev:qa) adds window.__qa for agent playtesters and builds to dist-qa/ (never docs/)
export default defineConfig(({ mode }) => ({
  plugins: [viteSingleFile()],
  define: { __BUILT__: JSON.stringify(STAMP), __MARK__: JSON.stringify('SLBUILD@' + STAMP), __QA__: JSON.stringify(mode === 'qa') }, // R18: the stamp, findable in the published file (new-build check)
  build: { modulePreload: { polyfill: false }, rollupOptions: { input: 'signal-lance.html' }, ...(mode === 'qa' ? { outDir: 'dist-qa' } : {}) },
}));

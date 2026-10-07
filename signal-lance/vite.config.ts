import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file: dist/signal-lance.html (no external assets at runtime).
// Build stamp shown on screen (bottom-left + loadout), so a stale cached page is easy to spot. Vancouver time.
const STAMP = new Date().toLocaleString('sv-SE', { timeZone: 'America/Vancouver' }).slice(5, 16); // "MM-DD HH:MM"
export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __BUILT__: JSON.stringify(STAMP), __MARK__: JSON.stringify('SLBUILD@' + STAMP) }, // R18: the stamp, findable in the published file (new-build check)
  build: { modulePreload: { polyfill: false }, rollupOptions: { input: 'signal-lance.html' } },
});

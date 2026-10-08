import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// R25 "Live toy": one self-contained file, dist/signal-lance-live.html, next to the game's (which it leaves alone).
const STAMP = new Date().toLocaleString('sv-SE', { timeZone: 'America/Vancouver' }).slice(5, 16);
export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __BUILT__: JSON.stringify(STAMP), __MARK__: JSON.stringify('SLBUILD@' + STAMP), __QA__: JSON.stringify(false) },
  build: { emptyOutDir: false, modulePreload: { polyfill: false }, rollupOptions: { input: 'signal-lance-live.html' } },
});

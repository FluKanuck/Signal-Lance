import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Building toy: one self-contained file, dist/build-toy.html (next to the game's, which it leaves alone).
const STAMP = new Date().toLocaleString('sv-SE', { timeZone: 'America/Vancouver' }).slice(5, 16);
export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __BUILT__: JSON.stringify(STAMP) },
  build: { emptyOutDir: false, modulePreload: { polyfill: false }, rollupOptions: { input: 'build-toy.html' } },
});

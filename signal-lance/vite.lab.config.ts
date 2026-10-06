import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Visual lab: one self-contained HTML file, dist-lab/lab.html (published as an artifact).
export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __BUILT__: JSON.stringify('lab') },
  build: { outDir: 'dist-lab', modulePreload: { polyfill: false }, rollupOptions: { input: 'lab.html' } },
});

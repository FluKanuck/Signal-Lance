import { defineConfig } from 'vitest/config';

// Tests cover the pure rules in src/sim/ (no DOM). Kept apart from vite.config.ts so the
// single-file build plugin never runs under test.
export default defineConfig({
  define: { __BUILT__: JSON.stringify('test') },
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});

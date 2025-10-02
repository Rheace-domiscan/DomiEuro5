import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build', '.react-router'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.{ts,tsx}', 'convex/**/*.{ts,tsx}'],
      exclude: [
        'app/**/*.test.{ts,tsx}',
        'convex/**/*.test.{ts,tsx}',
        'convex/_generated/**',
        'app/routes/**', // Routes are integration tested
        '**/*.d.ts',
      ],
      thresholds: {
        // Phase 5 baseline - Convex functions tested via integration, not unit tests
        // Target: Reach 70%+ by Phase 7 when adding client-side coverage
        lines: 42, // Current: 42.94% (lowered due to Convex functions)
        functions: 79, // Current: 79.16%
        branches: 91, // Current: 91.86%
        statements: 42, // Current: 42.94% (lowered due to Convex functions)
      },
    },
  },
  resolve: {
    alias: {
      '~': '/app',
    },
  },
});

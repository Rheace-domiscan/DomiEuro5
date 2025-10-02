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
        // Current baseline - prevent regression, increase as Phase 5+ adds coverage
        // Target: Reach 70%+ by Phase 7, 80%+ by Phase 11
        lines: 51,      // Current: 51.61%
        functions: 72,  // Current: 72.22%
        branches: 90,   // Current: 90.8%
        statements: 51, // Current: 51.61%
      },
    },
  },
  resolve: {
    alias: {
      '~': '/app',
    },
  },
});

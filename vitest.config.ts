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
      include: ['app/lib/**/*.{ts,tsx}', 'convex/**/*.ts'], // Business logic + Convex functions
      exclude: [
        'app/**/*.test.{ts,tsx}',
        'app/routes/**', // Routes are integration tested
        'app/root.tsx', // React Router root, integration tested
        'app/routes.ts', // Route config
        'app/types/**', // Type definitions only
        'app/welcome/**', // UI components, should add separate UI tests
        'app/lib/workos.server.ts', // Config only, no logic
        '**/*.d.ts',
        'convex/_generated/**',
      ],
      thresholds: {
        // HIGH bar for business logic (app/lib/**) - these MUST be well-tested
        // Convex/routes/UI excluded - tested differently
        lines: 90,
        functions: 85,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '~': '/app',
    },
  },
});

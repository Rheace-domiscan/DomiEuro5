/**
 * Vitest Test Setup
 *
 * This file runs before all tests to configure the testing environment.
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test (unmount React components)
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables for tests
process.env.WORKOS_API_KEY = 'test_workos_api_key';
process.env.WORKOS_CLIENT_ID = 'test_workos_client_id';
process.env.WORKOS_REDIRECT_URI = 'http://localhost:5173/auth/callback';
process.env.SESSION_SECRET = 'test_session_secret_32_characters_long!';
process.env.CONVEX_URL = 'https://test.convex.cloud';
process.env.VITE_CONVEX_URL = 'https://test.convex.cloud';

// Extend Vitest matchers
expect.extend({});

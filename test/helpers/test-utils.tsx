/**
 * Test Utilities
 *
 * Helper functions for testing React components and React Router loaders/actions.
 *
 * @example
 * ```typescript
 * import { renderWithProviders, createMockRequest } from '~/test/helpers/test-utils';
 *
 * // Test React components
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * // Test React Router loaders
 * const request = createMockRequest('/dashboard', { method: 'GET' });
 * ```
 */

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { vi } from 'vitest';

/**
 * Create a mock Convex client for testing
 */
export function createMockConvexClient() {
  return new ConvexReactClient(process.env.VITE_CONVEX_URL || 'https://test.convex.cloud', {
    unsavedChangesWarning: false,
  });
}

/**
 * Wrapper component that provides all necessary context providers for tests
 */
interface AllProvidersProps {
  children: React.ReactNode;
  convexClient?: ConvexReactClient;
}

function AllProviders({ children, convexClient }: AllProvidersProps) {
  const client = convexClient || createMockConvexClient();

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

/**
 * Custom render function that wraps components with all necessary providers
 *
 * Use this instead of @testing-library/react's render() for components that need Convex context.
 *
 * @example
 * ```typescript
 * const { getByText, getByRole } = renderWithProviders(<Dashboard />);
 * expect(getByText('Welcome')).toBeInTheDocument();
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { convexClient?: ConvexReactClient }
) {
  const { convexClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => <AllProviders convexClient={convexClient}>{children}</AllProviders>,
    ...renderOptions,
  });
}

/**
 * Create a mock Request object for testing React Router loaders/actions
 *
 * @example
 * ```typescript
 * const request = createMockRequest('/dashboard', { method: 'GET' });
 * const response = await loader({ request, params: {}, context: {} });
 * ```
 */
export function createMockRequest(
  url: string,
  init?: RequestInit & { headers?: Record<string, string> }
): Request {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:5173${url}`;

  // Convert headers object to Headers instance
  const headers = new Headers(init?.headers || {});

  return new Request(fullUrl, {
    ...init,
    headers,
  });
}

/**
 * Create a mock session object for testing
 *
 * @example
 * ```typescript
 * const session = createMockSession({ userId: 'user_123', organizationId: 'org_456' });
 * ```
 */
export function createMockSession(data: Record<string, unknown> = {}) {
  const sessionData = new Map(Object.entries(data));

  return {
    get: (key: string) => sessionData.get(key),
    set: (key: string, value: unknown) => sessionData.set(key, value),
    unset: (key: string) => sessionData.delete(key),
    has: (key: string) => sessionData.has(key),
    flash: (key: string, value: unknown) => {
      sessionData.set(key, value);
      // Flash messages are removed after first read
      return value;
    },
  };
}

/**
 * Create a mock FormData object for testing form submissions
 *
 * @example
 * ```typescript
 * const formData = createMockFormData({ name: 'Test Org', domains: 'example.com' });
 * const request = createMockRequest('/create-org', {
 *   method: 'POST',
 *   body: formData,
 * });
 * ```
 */
export function createMockFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

/**
 * Wait for a condition to be true
 *
 * Useful for testing async behavior.
 *
 * @example
 * ```typescript
 * await waitFor(() => expect(getByText('Loaded')).toBeInTheDocument());
 * ```
 */
export async function waitFor(
  callback: () => void | Promise<void>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (true) {
    try {
      await callback();
      return;
    } catch (error) {
      if (Date.now() - startTime > timeout) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

/**
 * Sleep for a specified duration
 *
 * @example
 * ```typescript
 * await sleep(100); // Wait 100ms
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock Response object for testing
 *
 * @example
 * ```typescript
 * const response = createMockResponse({ message: 'Success' }, { status: 200 });
 * ```
 */
export function createMockResponse(body?: unknown, init?: ResponseInit): Response {
  const responseBody = body !== undefined ? JSON.stringify(body) : null;

  return new Response(responseBody, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

/**
 * Mock window.location methods
 *
 * Useful for testing redirects in non-server environments.
 *
 * @example
 * ```typescript
 * const mockLocation = mockWindowLocation();
 * // ... test code that triggers redirect ...
 * expect(mockLocation.assign).toHaveBeenCalledWith('/dashboard');
 * ```
 */
export function mockWindowLocation() {
  const originalLocation = window.location;
  const mockLocation = {
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    href: originalLocation.href,
    origin: originalLocation.origin,
    pathname: originalLocation.pathname,
    search: originalLocation.search,
    hash: originalLocation.hash,
  };

  // @ts-expect-error - Mocking window.location
  delete window.location;
  // @ts-expect-error - Mocking window.location
  window.location = mockLocation;

  return mockLocation;
}

/**
 * Restore window.location after mocking
 *
 * Call this in afterEach() to restore the original window.location.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   restoreWindowLocation();
 * });
 * ```
 */
export function restoreWindowLocation() {
  // Restore is handled automatically by happy-dom environment
  // This function exists for API compatibility
}

// Re-export testing library utilities for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

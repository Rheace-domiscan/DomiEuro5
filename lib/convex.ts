import { ConvexReactClient } from 'convex/react';

// The deployment URL will be set by environment variable
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL environment variable is required');
}

// TypeScript now knows convexUrl is defined after the check above
export const convex = new ConvexReactClient(convexUrl);

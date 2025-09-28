import { ConvexReactClient } from "convex/react";

// The deployment URL will be set by environment variable
const convexUrl = process.env.CONVEX_URL || "";

if (!convexUrl) {
  console.error("CONVEX_URL environment variable is not set");
}

export const convex = new ConvexReactClient(convexUrl);
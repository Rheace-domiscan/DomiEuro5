import { ConvexReactClient } from "convex/react";

// The deployment URL will be set by environment variable
const convexUrl = import.meta.env.VITE_CONVEX_URL!;

export const convex = new ConvexReactClient(convexUrl);
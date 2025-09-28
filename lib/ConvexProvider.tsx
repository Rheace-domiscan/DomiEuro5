import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { convex } from "./convex";

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
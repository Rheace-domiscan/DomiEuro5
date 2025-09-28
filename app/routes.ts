import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("test-workos", "routes/test-workos.tsx"),
  route("auth/login", "routes/auth/login.tsx"),
  route("auth/callback", "routes/auth/callback.tsx"),
  route("auth/create-organization", "routes/auth/create-organization.tsx"),
  route("auth/logout", "routes/auth/logout.tsx"),
] satisfies RouteConfig;

import { createFileRoute } from "@tanstack/react-router";

// All routing is handled inside the client-only App (react-router-dom).
// This file exists so TanStack Router has a "/" route registered; the
// component renders nothing because __root.tsx mounts <App /> for every URL.
export const Route = createFileRoute("/")({
  component: () => null,
});

import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import appCss from "../styles.css?url";

const App = lazy(() => import("../App"));

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "d5 — Marketplace" },
      { name: "description", content: "d5 marketplace app" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => null,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ClientOnly({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return null;
  return <>{children}</>;
}

function RootComponent() {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}

import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

// Catch-all route: the legacy app keeps its own internal routing table
// (rendered through the react-router-dom compatibility shim), so every
// unmatched path falls back to the same client-only App shell.
const App = lazy(() => import("@/App"));

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "AMSS — ANTOSC Monitoring & Surveillance System" },
      {
        name: "description",
        content:
          "AMSS: monitoramento e vigilância de câmeras — streams ao vivo, eventos, detecção e exportação de gravações.",
      },
      { property: "og:title", content: "AMSS — ANTOSC Monitoring & Surveillance System" },
      {
        property: "og:description",
        content: "Monitoramento e vigilância de câmeras: ao vivo, eventos, detecção e exportações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "icon", href: "/favicon.ico", type: "image/x-icon" }],
  }),
  component: AppShell,
});

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <span className="text-3xl font-bold tracking-tight text-primary">AMSS</span>
        <p className="text-sm text-muted-foreground">Carregando AMSS…</p>
      </div>
    </div>
  );
}

function AppShell() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <LoadingShell />;
  return (
    <Suspense fallback={<LoadingShell />}>
      <App />
    </Suspense>
  );
}

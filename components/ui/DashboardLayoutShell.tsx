"use client";

import { useEffect, useState } from "react";

export default function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <main
      style={{
        marginLeft: isDesktop ? 220 : 0,
        // Bottom padding: 72px nav + safe area inset
        paddingBottom: isDesktop ? 0 : "calc(72px + env(safe-area-inset-bottom, 0px))",
        minHeight: "100vh",
        position: "relative",
        zIndex: 1,
      }}
    >
      {children}
    </main>
  );
}

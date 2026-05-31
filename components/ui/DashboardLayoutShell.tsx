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
        // Bottom padding on mobile for the bottom nav + safe area
        paddingBottom: isDesktop ? 0 : "calc(80px + env(safe-area-inset-bottom, 0px))",
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(137,4,4,0.15) 0%, transparent 70%)",
        // Prevent flash of wrong margin on SSR
        transition: "margin-left 0.0s",
      }}
    >
      {children}
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";

NProgress.configure({ showSpinner: false, trickleSpeed: 100 });

export function NavigationProgress() {
  const pathname = usePathname();

  useEffect(() => {
    NProgress.done();
    return () => {
      NProgress.start();
    };
  }, [pathname]);

  return (
    <style>{`
      #nprogress .bar {
        background: var(--ep-accent) !important;
        height: 3px !important;
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px var(--ep-accent), 0 0 5px var(--ep-accent);
        opacity: 1;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `}</style>
  );
}

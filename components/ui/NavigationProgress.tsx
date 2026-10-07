"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";

NProgress.configure({ showSpinner: false, trickleSpeed: 100 });

export function NavigationProgress() {
  const t = useT();
  const pathname = usePathname();

  useEffect(() => {
    NProgress.done();
    return () => {
      NProgress.start();
    };
  }, [pathname]);

  return (
    <style>{t("\n      #nprogress .bar {\n        background: #E01E1E !important;\n        height: 3px !important;\n        position: fixed;\n        z-index: 9999;\n        top: 0;\n        left: 0;\n        width: 100%;\n      }\n      #nprogress .peg {\n        display: block;\n        position: absolute;\n        right: 0px;\n        width: 100px;\n        height: 100%;\n        box-shadow: 0 0 10px #E01E1E, 0 0 5px #E01E1E;\n        opacity: 1;\n        transform: rotate(3deg) translate(0px, -4px);\n      }\n    ")}</style>
  );
}

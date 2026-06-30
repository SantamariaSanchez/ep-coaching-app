// Force all dashboard routes to be server-rendered (required for auth middleware + Vercel)
export const dynamic = "force-dynamic";

import DashboardNav from "@/components/ui/DashboardNav";
import { NavigationProgress } from "@/components/ui/NavigationProgress";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0D0000" }}>
      <NavigationProgress />
      <DashboardNav>{children}</DashboardNav>
    </div>
  );
}

import DashboardNav from "@/components/ui/DashboardNav";
import { NavigationProgress } from "@/components/ui/NavigationProgress";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D0000",
      }}
    >
      <NavigationProgress />
      <DashboardNav />
      {/* Offset main content by sidebar width on desktop */}
      <main
        style={{
          /* Subtle radial gradient behind all dashboard content */
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(137,4,4,0.15) 0%, transparent 70%)",
          minHeight: "100vh",
        }}
        className="md:ml-[220px] pb-24 md:pb-0"
      >
        {children}
      </main>
    </div>
  );
}

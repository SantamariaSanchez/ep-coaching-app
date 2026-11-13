import ChannelRail from "@/components/messaging/ChannelRail";

// Barre de salons commune à la messagerie et à la communauté (audit 2026-11-13).
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="max-w-2xl mx-auto">
        <ChannelRail space="coach" />
      </div>
      {children}
    </>
  );
}

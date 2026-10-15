import PremiumGate from "@/components/coach/PremiumGate";

// Rubrique réservée à la formule Premium (voir lib/coach-tier.ts).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PremiumGate feature="lives">{children}</PremiumGate>;
}

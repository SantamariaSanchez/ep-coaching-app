import PublicTopBar from "@/components/public/PublicTopBar";

// Barre retour + logo commune aux pages publiques (voir PublicTopBar).
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicTopBar />
      {children}
    </>
  );
}

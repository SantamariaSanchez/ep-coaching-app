export function Skeleton({ className }: { className?: string }) {
  return <div className={`ep-skeleton ${className ?? ""}`} />;
}

export function PageSkeleton() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-9 w-56 mb-1" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-52 mb-4" />
      <Skeleton className="h-72" />
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    </div>
  );
}

// Pages en grille de cartes (formations, recettes, exercices, salles...) —
// même respiration que la grille réelle, pour que rien ne saute au moment
// où le contenu arrive.
export function GridPageSkeleton() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    </div>
  );
}

// Pages à onglets (nutrition, programme...) — jusqu'ici forcées dans
// PageSkeleton (4 cartes stats + 2 blocs), qui ne ressemble pas du tout à
// une vraie barre d'onglets suivie d'un panneau de contenu. La barre
// d'onglets reprend la largeur variable des vrais libellés plutôt que des
// blocs identiques, pour que le premier flash ressemble vraiment à la page.
export function TabbedPageSkeleton() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid rgba(137,4,4,0.15)", paddingBottom: 12 }}>
        {["w-20", "w-16", "w-24", "w-28", "w-20"].map((w, i) => (
          <Skeleton key={i} className={`h-7 ${w}`} />
        ))}
      </div>
      <Skeleton className="h-40 mb-4" />
      <Skeleton className="h-64" />
    </div>
  );
}

// Écrans d'auth/statut à carte centrée étroite (2FA, onboarding, "coach en
// attente"...) — aucune des variantes ci-dessus ne convient : ce sont des
// pages pleine hauteur avec une seule carte au centre, pas une mise en page
// tableau de bord avec titre en haut à gauche.
export function AuthCardSkeleton() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Skeleton className="h-14 w-14 mx-auto mb-5" />
        <Skeleton className="h-6 w-48 mx-auto mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mx-auto mb-6" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-12 mb-4" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
      <Skeleton className="h-12 mt-6" />
    </div>
  );
}

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

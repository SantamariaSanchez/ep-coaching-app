import { Skeleton } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-5 py-4 border-b border-[var(--color-ep-dark-red)]/20 flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="px-4 py-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-36"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

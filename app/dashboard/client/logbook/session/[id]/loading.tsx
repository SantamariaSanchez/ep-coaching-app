import { Skeleton } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-2 w-full" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

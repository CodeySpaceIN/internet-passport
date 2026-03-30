import { SkeletonBlock } from "@/components/app/skeleton-block";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <SkeletonBlock className="h-9 w-64" />
      <SkeletonBlock className="mt-2 h-4 w-80" />
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkeletonBlock key={idx} className="h-24" />
        ))}
      </div>
      <SkeletonBlock className="mt-5 h-[420px]" />
    </div>
  );
}

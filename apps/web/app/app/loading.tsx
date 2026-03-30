import { SkeletonBlock } from "@/components/app/skeleton-block";

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <SkeletonBlock className="h-10 w-72" />
      <SkeletonBlock className="mt-2 h-5 w-96" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </div>
    </div>
  );
}

import { SkeletonBlock } from "@/components/app/skeleton-block";

export default function OrganizationsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <SkeletonBlock className="h-9 w-72" />
      <SkeletonBlock className="mt-2 h-4 w-[28rem]" />
      <SkeletonBlock className="mt-5 h-40" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonBlock key={idx} className="h-[320px]" />
        ))}
      </div>
    </div>
  );
}

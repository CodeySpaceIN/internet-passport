export default function PublicLoading() {
  return (
    <main className="w-full px-6 py-16 lg:px-10 xl:px-14">
      <div className="h-8 w-56 animate-pulse rounded bg-zinc-200" />
      <div className="mt-4 h-4 w-[70%] animate-pulse rounded bg-zinc-200" />
      <div className="mt-2 h-4 w-[55%] animate-pulse rounded bg-zinc-200" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`public-loading-${idx}`}
            className="h-40 animate-pulse rounded-2xl border border-card-border bg-card"
          />
        ))}
      </div>
    </main>
  );
}

export default function PublicTrustNotFound() {
  return (
    <main className="mx-auto min-h-[72vh] w-full max-w-3xl px-4 py-24 md:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Public trust card</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Profile not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          No public trust profile exists for this handle.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Docs Error</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Unable to load this page</h1>
      <p className="mt-2 text-sm text-slate-600">Retry once. If it fails again, check service health and logs.</p>
      <div className="mt-5">
        <Button type="button" variant="outline" onClick={reset}>
          Retry
        </Button>
      </div>
    </main>
  );
}

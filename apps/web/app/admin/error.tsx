"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin Console Error</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Admin console is temporarily unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">Retry the request, then inspect recent audit and API service logs.</p>
      <div className="mt-5">
        <Button type="button" onClick={reset}>
          Retry
        </Button>
      </div>
    </main>
  );
}

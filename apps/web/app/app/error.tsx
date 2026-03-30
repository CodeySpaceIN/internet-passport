"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Workspace Error</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Could not load workspace data</h1>
      <p className="mt-2 text-sm text-slate-600">
        Retry this view. If the issue persists, check the API health endpoint and database connectivity.
      </p>
      <div className="mt-5">
        <Button type="button" onClick={reset}>
          Retry request
        </Button>
      </div>
    </main>
  );
}

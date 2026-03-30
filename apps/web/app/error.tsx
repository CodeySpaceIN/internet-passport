"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Unexpected Error</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        The issue has been logged. Retry the request, and if this keeps happening, check server logs.
      </p>
      <div className="mt-5">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}

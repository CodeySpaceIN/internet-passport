"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Critical Error</p>
          <h1 className="mt-2 text-3xl font-semibold">Internet Passport failed to load</h1>
          <p className="mt-2 text-sm text-slate-600">
            A fatal error occurred. Reload the page and review logs if the issue persists.
          </p>
          <p className="mt-3 text-xs text-slate-500">{error.message}</p>
          <div className="mt-5">
            <Button type="button" onClick={() => window.location.reload()}>
              Reload app
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
